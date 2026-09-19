import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

function normalizeOutput(raw = '') {
  return String(raw).replace(/\r\n/g, '\n').trim();
}

function compareOutputs(expected, actual) {
  const normalizedExpected = normalizeOutput(expected);
  const normalizedActual = normalizeOutput(actual);
  return normalizedExpected === normalizedActual;
}

function runLocalLanguageExecution({ language, code, testCases, problem }) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spectra-'));
  const results = [];

  try {
    if (language === 'Python') {
      const filePath = path.join(tempDir, 'main.py');
      fs.writeFileSync(filePath, code);
      const run = (input) => {
        const runtimes = process.platform === 'win32'
          ? [{ command: 'py', args: ['-3', filePath] }, { command: 'python', args: [filePath] }]
          : [{ command: 'python3', args: [filePath] }, { command: 'python', args: [filePath] }];
        let lastError = null;

        for (const runtime of runtimes) {
          try {
            return execFileSync(runtime.command, runtime.args, {
              input: String(input),
              encoding: 'utf8',
              timeout: Number(problem.timeLimit || 1000),
            });
          } catch (error) {
            lastError = error;
            const message = `${error.stdout || ''}${error.stderr || ''}`;
            if (message.includes('not found') || message.includes('not recognized') || message.includes('Microsoft Store')) {
              continue;
            }
            return message || 'RUNTIME ERROR';
          }
        }

        return 'Python 3 is not installed. Install Python 3, enable Add Python to PATH, and restart the backend.';
      };

      testCases.forEach((testCase) => {
        const actualOutput = run(testCase.input);
        results.push({
          passed: compareOutputs(testCase.output, actualOutput),
          expected: testCase.output,
          actual: actualOutput,
        });
      });
    }

    if (language === 'C') {
      const filePath = path.join(tempDir, 'main.c');
      const outPath = path.join(tempDir, 'main');
      fs.writeFileSync(filePath, code);
      try {
        execFileSync('gcc', [filePath, '-O2', '-o', outPath], { timeout: Number(problem.timeLimit || 1000) });
        testCases.forEach((testCase) => {
          try {
            const actualOutput = execFileSync(outPath, { input: String(testCase.input), encoding: 'utf8', timeout: Number(problem.timeLimit || 1000) });
            results.push({
              passed: compareOutputs(testCase.output, actualOutput),
              expected: testCase.output,
              actual: actualOutput,
            });
          } catch (error) {
            results.push({
              passed: false,
              expected: testCase.output,
              actual: error.stdout || error.stderr || 'RUNTIME ERROR',
            });
          }
        });
      } catch (error) {
        return { status: 'COMPILATION ERROR', passed: 0, total: testCases.length, message: error.stderr || error.message };
      }
    }

    if (language === 'Java') {
      const filePath = path.join(tempDir, 'Main.java');
      fs.writeFileSync(filePath, code);
      try {
        execFileSync('javac', [filePath], { cwd: tempDir, timeout: Number(problem.timeLimit || 1000) });
        testCases.forEach((testCase) => {
          try {
            const actualOutput = execFileSync('java', ['-cp', tempDir, 'Main'], { input: String(testCase.input), encoding: 'utf8', timeout: Number(problem.timeLimit || 1000) });
            results.push({
              passed: compareOutputs(testCase.output, actualOutput),
              expected: testCase.output,
              actual: actualOutput,
            });
          } catch (error) {
            results.push({
              passed: false,
              expected: testCase.output,
              actual: error.stdout || error.stderr || 'RUNTIME ERROR',
            });
          }
        });
      } catch (error) {
        return { status: 'COMPILATION ERROR', passed: 0, total: testCases.length, message: error.stderr || error.message };
      }
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  const passedCount = results.filter((item) => item.passed).length;
  const scoreRatio = testCases.length === 0 ? 0 : passedCount / testCases.length;
  const score = Math.round(problem.marks * scoreRatio);

  return {
    status: passedCount === testCases.length ? 'ACCEPTED' : passedCount > 0 ? 'PARTIAL' : 'FAILED',
    passed: passedCount,
    total: testCases.length,
    score,
    details: results,
  };
}

export async function judgeSubmission({ code, language, testCases, problem }) {
  if (!testCases || testCases.length === 0) {
    return { status: 'ACCEPTED', passed: 0, total: 0, score: problem.marks || 0 };
  }

  const dockerAvailable = (() => {
    try {
      execFileSync('docker', ['--version'], { stdio: 'pipe' });
      return true;
    } catch (error) {
      return false;
    }
  })();

  if (!dockerAvailable) {
    return runLocalLanguageExecution({ language, code, testCases, problem });
  }

  const normalizedLanguage = String(language).toLowerCase();
  const compileScripts = {
    python: {
      filename: 'main.py',
      run: 'python /workspace/main.py',
    },
    c: {
      filename: 'main.c',
      run: 'gcc /workspace/main.c -O2 -o /workspace/main && /workspace/main',
    },
    java: {
      filename: 'Main.java',
      run: 'javac /workspace/Main.java && java -cp /workspace Main',
    },
  };

  const script = compileScripts[normalizedLanguage];
  if (!script) {
    return { status: 'COMPILATION ERROR', passed: 0, total: testCases.length, score: 0, message: 'Unsupported language' };
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spectra-docker-'));
  const results = [];

  try {
    fs.writeFileSync(path.join(tempDir, script.filename), code);

    for (const testCase of testCases) {
      const inputPath = path.join(tempDir, 'input.txt');
      fs.writeFileSync(inputPath, String(testCase.input));

      const dockerCommand = [
        'run',
        '--rm',
        '--network=none',
        '--cpus=1.0',
        '--memory=512m',
        '--pids-limit=64',
        '--read-only',
        '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m',
        '-v', `${tempDir}:/workspace:rw`,
        'spectra-judge',
        'bash', '-lc', `cd /workspace && printf '%s' "$(cat input.txt)" | ${script.run}`,
      ];

      try {
        const output = execFileSync('docker', dockerCommand, { encoding: 'utf8', timeout: Number(problem.timeLimit || 1000) + 2000 });
        const passed = compareOutputs(testCase.output, output);
        results.push({ passed, expected: testCase.output, actual: output });
      } catch (error) {
        const actual = (error.stdout || '') + (error.stderr || '') || 'RUNTIME ERROR';
        results.push({ passed: false, expected: testCase.output, actual });
      }
    }
  } catch (error) {
    return { status: 'COMPILATION ERROR', passed: 0, total: testCases.length, score: 0, message: String(error.message) };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  const passedCount = results.filter((item) => item.passed).length;
  const scoreRatio = testCases.length === 0 ? 0 : passedCount / testCases.length;
  const score = Math.round(problem.marks * scoreRatio);

  return {
    status: passedCount === testCases.length ? 'ACCEPTED' : passedCount > 0 ? 'PARTIAL' : 'FAILED',
    passed: passedCount,
    total: testCases.length,
    score,
    details: results,
  };
}
