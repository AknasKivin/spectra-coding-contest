const users = [
  {
    id: 'host-1',
    email: 'admin@spectra.local',
    password: 'Spectra@123',
    name: 'Host Admin',
    role: 'host',
  },
];

const contests = [];
const levels = [];
const problems = [];
const testCases = [];
const participants = [];
const submissions = [];
const violations = [];
const contestSettings = [];

function makeSampleProblems(levelName, levelIndex) {
  const titles = {
    1: ['Square of Number', 'Even or Odd', 'Sum of Digits'],
    2: ['Maximum in Array', 'Prime Number Check', 'Factorial'],
    3: ['Reverse String', 'Second Largest', 'Binary Search'],
  };

  const problemsList = [];
  titles[levelIndex].forEach((title, idx) => {
    const baseMarks = [20, 20, 20][idx] || 20;
    problemsList.push({
      id: `problem-${levelIndex}-${idx + 1}`,
      levelId: `level-${levelIndex}`,
      title,
      description: `Solve the ${title} challenge for ${levelName}.`,
      inputFormat: 'Input as described in the problem statement.',
      outputFormat: 'Print the answer in a single line.',
      constraints: '1 <= n <= 10^5',
      sampleInput: {
        'Square of Number': '5',
        'Even or Odd': '5',
        'Sum of Digits': '123',
        'Maximum in Array': '5\n1 9 3 7 2',
        'Prime Number Check': '5',
        Factorial: '5',
        'Reverse String': 'spectra',
        'Second Largest': '5\n1 9 3 7 2',
        'Binary Search': '5\n1 3 5 7 9\n7',
      }[title],
      sampleOutput: {
        'Square of Number': '25',
        'Even or Odd': 'Odd',
        'Sum of Digits': '6',
        'Maximum in Array': '9',
        'Prime Number Check': 'Prime',
        Factorial: '120',
        'Reverse String': 'artceps',
        'Second Largest': '7',
        'Binary Search': '3',
      }[title],
      marks: baseMarks,
      timeLimit: 1000,
      memoryLimit: 256,
      allowedLanguages: ['C', 'Java', 'Python'],
      hiddenTests: [],
      levelName,
      createdAt: new Date().toISOString(),
    });
  });
  return problemsList;
}

function createSeedContest() {
  const contestId = 'contest-demo';
  const sampleContest = {
    id: contestId,
    name: 'SPECTRA Demo Contest',
    code: 'SPECTRA',
    durationMinutes: 60,
    status: 'upcoming',
    startTime: null,
    createdBy: 'host-1',
    createdAt: new Date().toISOString(),
    levels: [],
  };

  contests.push(sampleContest);

  ['Beginner', 'Intermediate', 'Advanced'].forEach((levelName, idx) => {
    const levelId = `level-${idx + 1}`;
    const level = {
      id: levelId,
      contestId,
      name: levelName,
      order: idx + 1,
      createdAt: new Date().toISOString(),
    };
    levels.push(level);
    sampleContest.levels.push(levelId);
    const generated = makeSampleProblems(levelName, idx + 1);
    generated.forEach((problem) => {
      problem.levelId = levelId;
      problem.id = `${levelId}-problem-${problem.title.replace(/\s+/g, '-').toLowerCase()}`;
      problems.push(problem);
      const hiddenTestsByProblem = {
        'Square of Number': [
          { input: '5', output: '25' }, { input: '10', output: '100' }, { input: '20', output: '400' },
          { input: '0', output: '0' }, { input: '15', output: '225' },
        ],
        'Even or Odd': [
          { input: '5', output: 'Odd' }, { input: '10', output: 'Even' }, { input: '20', output: 'Even' },
          { input: '0', output: 'Even' }, { input: '15', output: 'Odd' },
        ],
        'Sum of Digits': [
          { input: '5', output: '5' }, { input: '10', output: '1' }, { input: '20', output: '2' },
          { input: '0', output: '0' }, { input: '15', output: '6' },
        ],
        'Maximum in Array': [
          { input: '5\n1 9 3 7 2', output: '9' }, { input: '4\n8 2 6 4', output: '8' },
          { input: '3\n-2 -5 -1', output: '-1' }, { input: '1\n42', output: '42' }, { input: '5\n10 20 5 15 3', output: '20' },
        ],
        'Prime Number Check': [
          { input: '2', output: 'Prime' }, { input: '5', output: 'Prime' }, { input: '10', output: 'Not Prime' },
          { input: '1', output: 'Not Prime' }, { input: '17', output: 'Prime' },
        ],
        Factorial: [
          { input: '0', output: '1' }, { input: '1', output: '1' }, { input: '5', output: '120' },
          { input: '6', output: '720' }, { input: '10', output: '3628800' },
        ],
        'Reverse String': [
          { input: 'spectra', output: 'artceps' }, { input: 'hello', output: 'olleh' }, { input: 'a', output: 'a' },
          { input: 'coding', output: 'gnidoc' }, { input: 'level', output: 'level' },
        ],
        'Second Largest': [
          { input: '5\n1 9 3 7 2', output: '7' }, { input: '4\n8 2 6 4', output: '6' },
          { input: '3\n-2 -5 -1', output: '-2' }, { input: '4\n10 20 5 15', output: '15' }, { input: '5\n3 3 2 1 4', output: '3' },
        ],
        'Binary Search': [
          { input: '5\n1 3 5 7 9\n7', output: '3' }, { input: '4\n2 4 6 8\n2', output: '0' },
          { input: '5\n1 3 5 7 9\n4', output: '-1' }, { input: '1\n42\n42', output: '0' }, { input: '6\n2 4 6 8 10 12\n10', output: '4' },
        ],
      };
      const hidden = hiddenTestsByProblem[problem.title] || [];
      hidden.forEach((item, index) => {
        const tc = {
          id: `${problem.id}-tc-${index + 1}`,
          problemId: problem.id,
          input: item.input,
          output: item.output,
          isHidden: true,
          createdAt: new Date().toISOString(),
        };
        testCases.push(tc);
        problem.hiddenTests.push(tc.id);
      });
    });
  });

  contestSettings.push({
    contestId,
    violationLimit: 3,
    action: 'warning',
    createdAt: new Date().toISOString(),
  });
}

if (contests.length === 0) {
  createSeedContest();
}

export function getUserByEmail(email) {
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export function getContestById(id) {
  return contests.find((contest) => contest.id === id);
}

export function getContestByCode(code) {
  return contests.find((contest) => contest.code.toLowerCase() === String(code).toLowerCase());
}

export function listContests() {
  return contests;
}

export function createContest({ name, code, durationMinutes, createdBy }) {
  const contestId = `contest-${Date.now()}`;
  const contest = {
    id: contestId,
    name,
    code,
    durationMinutes: Number(durationMinutes || 60),
    status: 'upcoming',
    startTime: null,
    createdBy,
    createdAt: new Date().toISOString(),
    levels: [],
  };
  contests.push(contest);
  return contest;
}

export function addLevel({ contestId, name, order }) {
  const level = {
    id: `level-${Date.now()}`,
    contestId,
    name,
    order: order || levels.filter((item) => item.contestId === contestId).length + 1,
    createdAt: new Date().toISOString(),
  };
  levels.push(level);
  const contest = getContestById(contestId);
  if (contest) contest.levels.push(level.id);
  return level;
}

export function addProblem({ levelId, title, description, inputFormat, outputFormat, constraints, sampleInput, sampleOutput, marks, timeLimit, memoryLimit, allowedLanguages }) {
  const problem = {
    id: `problem-${Date.now()}`,
    levelId,
    title,
    description,
    inputFormat,
    outputFormat,
    constraints,
    sampleInput,
    sampleOutput,
    marks: Number(marks || 10),
    timeLimit: Number(timeLimit || 1000),
    memoryLimit: Number(memoryLimit || 256),
    allowedLanguages: allowedLanguages || ['C', 'Java', 'Python'],
    hiddenTests: [],
    createdAt: new Date().toISOString(),
  };
  problems.push(problem);
  return problem;
}

export function addProblemTestCase({ problemId, input, output }) {
  const testCase = {
    id: `tc-${Date.now()}`,
    problemId,
    input,
    output,
    isHidden: true,
    createdAt: new Date().toISOString(),
  };
  testCases.push(testCase);
  const problem = problems.find((item) => item.id === problemId);
  if (problem) problem.hiddenTests.push(testCase.id);
  return testCase;
}

export function getLevelById(levelId) {
  return levels.find((level) => level.id === levelId);
}

export function getProblemById(id) {
  return problems.find((problem) => problem.id === id);
}

export function getProblemHiddenTestCases(problemId) {
  return testCases.filter((testCase) => testCase.problemId === problemId && testCase.isHidden);
}

export function joinContest({ participantId, name, department, year, contestCode }) {
  const contest = getContestByCode(contestCode);
  if (!contest) {
    return { error: 'Invalid contest code' };
  }

  const participantExists = participants.find((p) => p.participantId === participantId && p.contestId === contest.id);
  if (participantExists) {
    return { error: 'Participant already joined this contest' };
  }

  const participant = {
    id: `participant-${Date.now()}`,
    participantId,
    name,
    department,
    year,
    contestId: contest.id,
    joinedAt: new Date().toISOString(),
    score: 0,
    status: 'active',
    violations: 0,
    disqualified: false,
    disqualifiedAt: null,
    completed: false,
    startedAt: new Date().toISOString(),
  };

  participants.push(participant);
  return participant;
}

export function getParticipantById(participantId, contestId) {
  return participants.find((participant) => participant.participantId === participantId && participant.contestId === contestId);
}

export function getContestParticipants(contestId) {
  return participants.filter((participant) => participant.contestId === contestId);
}

export function getParticipantReports(contestId) {
  return getContestParticipants(contestId).map((participant) => {
    const participantSubmissions = submissions
      .filter((submission) => submission.participantId === participant.participantId && submission.contestId === contestId);
    const lastSubmission = participantSubmissions.reduce((latest, submission) => (
      !latest || new Date(submission.createdAt) > new Date(latest.createdAt) ? submission : latest
    ), null);
    const endTime = participant.disqualifiedAt || lastSubmission?.createdAt || new Date().toISOString();

    return {
      ...participant,
      totalCodingTimeSeconds: Math.max(0, Math.round((new Date(endTime).getTime() - new Date(participant.startedAt).getTime()) / 1000)),
      questions: participantSubmissions.map((submission) => {
        const problem = getProblemById(submission.problemId);
        const elapsedSeconds = Math.max(0, Math.round((new Date(submission.createdAt).getTime() - new Date(participant.startedAt).getTime()) / 1000));
        return {
          problemId: submission.problemId,
          question: problem?.title || submission.problemId,
          marks: submission.score || 0,
          passed: submission.passed || 0,
          total: submission.total || 0,
          timeTakenSeconds: elapsedSeconds,
          submittedAt: submission.createdAt,
        };
      }),
    };
  }).sort((first, second) => (
    Number(second.score || 0) - Number(first.score || 0)
    || Number(first.totalCodingTimeSeconds || 0) - Number(second.totalCodingTimeSeconds || 0)
    || String(first.name).localeCompare(String(second.name))
  ));
}

export function addViolation({ participantId, contestId, event }) {
  const violation = {
    id: `violation-${Date.now()}`,
    participantId,
    contestId,
    event,
    time: new Date().toISOString(),
  };
  violations.push(violation);
  const participant = getParticipantById(participantId, contestId);
  if (participant) {
    participant.violations = (participant.violations || 0) + 1;
    if (event === 'TAB_SWITCH') {
      participant.disqualified = true;
      participant.disqualifiedAt = violation.time;
      participant.status = 'disqualified';
    }
  }
  return violation;
}

export function listViolations(contestId) {
  return violations.filter((violation) => violation.contestId === contestId);
}

export function createSubmission({ participantId, contestId, problemId, language, code }) {
  const problem = getProblemById(problemId);
  if (!problem) {
    return { error: 'Problem not found' };
  }

  const alreadySubmitted = submissions.find(
    (submission) => submission.participantId === participantId && submission.problemId === problemId && submission.contestId === contestId && submission.status === 'submitted'
  );

  if (alreadySubmitted) {
    return { error: 'Duplicate submission detected' };
  }

  const submission = {
    id: `submission-${Date.now()}`,
    participantId,
    contestId,
    problemId,
    language,
    code,
    status: 'queued',
    score: 0,
    passed: 0,
    total: 0,
    createdAt: new Date().toISOString(),
    result: null,
  };

  submissions.push(submission);
  return submission;
}

export function updateSubmission(submissionId, patch) {
  const existing = submissions.find((submission) => submission.id === submissionId);
  if (!existing) return null;
  Object.assign(existing, patch);
  return existing;
}

export function getSubmissionById(id) {
  return submissions.find((submission) => submission.id === id);
}

export function getContestLeaderboard(contestId) {
  const currentParticipants = getContestParticipants(contestId);
  return currentParticipants
    .map((participant) => ({
      participantId: participant.participantId,
      name: participant.name,
      score: participant.score || 0,
      violations: participant.violations || 0,
      status: participant.status,
      completed: participant.completed,
    }))
    .sort((a, b) => b.score - a.score || a.violations - b.violations);
}

export function calculateContestStats(contestId) {
  const participantList = getContestParticipants(contestId);
  const totalParticipants = participantList.length;
  const active = participantList.filter((participant) => participant.status === 'active').length;
  const submitted = participantList.filter((participant) => participant.status === 'submitted').length;
  const completed = participantList.filter((participant) => participant.completed).length;
  const violationsCount = listViolations(contestId).length;

  return { totalParticipants, active, submitted, completed, violations: violationsCount };
}

export function getResults(contestId) {
  return getContestParticipants(contestId).map((participant) => ({
    participantId: participant.participantId,
    name: participant.name,
    score: participant.score || 0,
    violations: participant.violations || 0,
    status: participant.status,
    completed: participant.completed,
  }));
}

export function getSettingsForContest(contestId) {
  return contestSettings.find((setting) => setting.contestId === contestId) || { contestId, violationLimit: 3, action: 'warning' };
}

export function updateSettingsForContest(contestId, payload) {
  const existing = getSettingsForContest(contestId);
  Object.assign(existing, payload, { contestId });
  if (!contestSettings.some((setting) => setting.contestId === contestId)) {
    contestSettings.push(existing);
  }
  return existing;
}

export function listProblemsForContest(contestId) {
  const contest = getContestById(contestId);
  if (!contest) return [];

  const contestLevelIds = contest.levels;
  const contestLevels = levels.filter((level) => contestLevelIds.includes(level.id));
  const result = [];
  contestLevels.forEach((level) => {
    const levelProblems = problems.filter((problem) => problem.levelId === level.id);
    result.push({ levelId: level.id, levelName: level.name, problems: levelProblems });
  });

  return result;
}

export function getProblemSamples(levelId) {
  return problems.filter((problem) => problem.levelId === levelId);
}

export function addParticipantStatus(contestId, participantId, status) {
  const participant = getParticipantById(participantId, contestId);
  if (participant) participant.status = status;
}

export function updateParticipantScore(contestId, participantId, score) {
  const participant = getParticipantById(participantId, contestId);
  if (participant) participant.score = Number(score || 0);
}

export function getBestScoreForProblem(participantId, contestId, problemId) {
  return submissions
    .filter((submission) => submission.participantId === participantId && submission.contestId === contestId && submission.problemId === problemId)
    .reduce((bestScore, submission) => Math.max(bestScore, Number(submission.score || 0)), 0);
}

export function seedIfEmpty() {
  if (contests.length === 0) createSeedContest();
}
