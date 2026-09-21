import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || (
  import.meta.env.PROD ? window.location.origin : `http://${window.location.hostname}:5000`
);
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (!import.meta.env.PROD ? API_BASE : '');
const DEFAULT_CONTEST_CODE = 'SPECTRA';
const starterCode = {
  Python: 'def solve():\n    n = int(input())\n    print(n * n)\n\nsolve()\n',
  C: '#include <stdio.h>\nint main(){ int n; scanf("%d", &n); printf("%d\\n", n * n); return 0; }\n',
  Java: 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        System.out.println(n * n);\n    }\n}\n',
};

function App() {
  const [view, setView] = useState('select');
  const [hostEmail, setHostEmail] = useState('admin@spectra.local');
  const [hostPassword, setHostPassword] = useState('Spectra@123');
  const [hostToken, setHostToken] = useState(localStorage.getItem('spectraHostToken') || '');
  const [message, setMessage] = useState('');
  const [contest, setContest] = useState(null);
  const [contests, setContests] = useState([]);
  const [selectedContestCode, setSelectedContestCode] = useState(DEFAULT_CONTEST_CODE);
  const [studentInfo, setStudentInfo] = useState({ participantId: '', name: '', department: '', year: '' });
  const [studentLoginError, setStudentLoginError] = useState('');
  const [joiningContest, setJoiningContest] = useState(false);
  const [joinedParticipant, setJoinedParticipant] = useState(null);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [language, setLanguage] = useState('Python');
  const [code, setCode] = useState('');
  const [runOutput, setRunOutput] = useState('');
  const [result, setResult] = useState('');
  const [completedProblemIds, setCompletedProblemIds] = useState([]);
  const [socket, setSocket] = useState(null);
  const [stats, setStats] = useState({ totalParticipants: 0, active: 0, submitted: 0, completed: 0, violations: 0 });
  const [leaderboard, setLeaderboard] = useState([]);
  const [hostParticipants, setHostParticipants] = useState([]);
  const [contestProblems, setContestProblems] = useState([]);
  const [problemList, setProblemList] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [contestFrozen, setContestFrozen] = useState(false);
  const [violationWarning, setViolationWarning] = useState('');
  const violationCooldownRef = useRef({});

  const formatTime = useCallback((seconds) => {
    const totalSeconds = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  function getDraftKey(problem = selectedProblem, selectedLanguage = language) {
    if (!joinedParticipant || !problem) return '';
    return `spectra-code:${joinedParticipant.contestId}:${joinedParticipant.participantId}:${problem.id}:${selectedLanguage}`;
  }

  function loadProblemCode(problem, selectedLanguage = language) {
    const draftKey = getDraftKey(problem, selectedLanguage);
    setCode(draftKey ? localStorage.getItem(draftKey) || '' : '');
  }

  function persistCode(nextCode) {
    setCode(nextCode);
    const draftKey = getDraftKey();
    if (draftKey) localStorage.setItem(draftKey, nextCode);
  }

  function handleCodeChange(event) {
    persistCode(event.target.value);
  }

  function handleEditorKeyDown(event) {
    if (event.key !== 'Tab' || event.target !== document.activeElement || event.target.tagName !== 'TEXTAREA') {
      return;
    }

    event.preventDefault();

    const textarea = event.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const indentation = '    ';
    const nextValue = `${code.slice(0, start)}${indentation}${code.slice(end)}`;
    const nextCursor = start + indentation.length;

    persistCode(nextValue);

    requestAnimationFrame(() => {
      textarea.selectionStart = nextCursor;
      textarea.selectionEnd = nextCursor;
      textarea.focus();
    });
  }

  const sendViolation = useCallback((eventName) => {
    if (!joinedParticipant || !joinedParticipant.contestId) return;

    const key = `${eventName}:${joinedParticipant.participantId}:${joinedParticipant.contestId}`;
    const now = Date.now();
    const lastTime = violationCooldownRef.current[key] || 0;
    if (now - lastTime < 1500) return;
    violationCooldownRef.current[key] = now;

    const payload = {
      participantId: joinedParticipant.participantId,
      contestId: joinedParticipant.contestId,
      event: eventName,
    };

    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(`${API_BASE}/api/contests/violations`, blob);
      return;
    }

    fetch(`${API_BASE}/api/contests/violations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }).catch(() => {});
  }, [joinedParticipant]);

  useEffect(() => {
    fetchContests();
  }, []);

  useEffect(() => {
    if (view === 'host' && hostToken && contest?.id) {
      loadHostParticipants(contest.id);
    }
  }, [view, hostToken, contest?.id]);

  useEffect(() => {
    if (!SOCKET_URL) return undefined;

    const connection = io(SOCKET_URL, { transports: ['websocket'] });
    setSocket(connection);
    connection.on('dashboard:update', (payload) => {
      if (payload?.stats) setStats(payload.stats);
      if (payload?.leaderboard) setLeaderboard(payload.leaderboard);
    });
    return () => connection.disconnect();
  }, []);

  useEffect(() => {
    if (!joinedParticipant || !contest) {
      setTimeRemaining(0);
      return;
    }

    const durationSeconds = Math.max(0, Number(contest.durationMinutes || 60)) * 60;
    setTimeRemaining(durationSeconds);

    const timer = setInterval(() => {
      setTimeRemaining((current) => {
        if (current <= 1) {
          clearInterval(timer);
          setResult('Contest time ended. Submissions are now closed.');
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [joinedParticipant, contest]);

  useEffect(() => {
    if (!joinedParticipant) return;

    const freezeContest = (warning) => {
      setViolationWarning(warning);
      setContestFrozen(true);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendViolation('TAB_SWITCH');
        freezeContest('Tab switching detected. Your contest has ended and you cannot continue.');
      }
    };

    const onContextMenu = (event) => {
      event.preventDefault();
      sendViolation('RIGHT_CLICK');
    };
    const onCopy = () => sendViolation('COPY');
    const onCut = () => sendViolation('CUT');
    const onPaste = () => sendViolation('PASTE');
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        sendViolation('FULLSCREEN_EXIT');
        freezeContest('Fullscreen exit detected. Your contest has ended and you cannot continue.');
        return;
      }
      if ((event.ctrlKey || event.metaKey) && ['c', 'v', 'x', 'p', 's'].includes(event.key.toLowerCase())) {
        sendViolation('KEYBOARD_SHORTCUT');
      }
    };
    const onFullscreenChange = () => {
      if (document.fullscreenElement === null) {
        sendViolation('FULLSCREEN_EXIT');
        freezeContest('Fullscreen mode exited. Your contest has ended and you cannot continue.');
      }
    };
    const onBeforeUnload = () => sendViolation('PAGE_LEAVE');

    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [joinedParticipant, sendViolation]);

  async function fetchContests() {
    try {
      const response = await fetch(`${API_BASE}/api/contests`);
      const data = await response.json();
      if (data?.contests?.length) {
        setContests(data.contests);
        const defaultCode = data.contests[0].code || DEFAULT_CONTEST_CODE;
        setSelectedContestCode(defaultCode);
        const contestData = await fetch(`${API_BASE}/api/contests/${data.contests[0].id}`);
        const contestPayload = await contestData.json();
        setContest(contestPayload.contest);
        setProblemList(contestPayload.problems || []);
      } else {
        setSelectedContestCode(DEFAULT_CONTEST_CODE);
      }
    } catch (error) {
      setSelectedContestCode(DEFAULT_CONTEST_CODE);
      setMessage('Server is not available. Please start the backend first.');
    }
  }

  async function handleHostLogin(event) {
    event.preventDefault();
    const response = await fetch(`${API_BASE}/api/auth/host/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: hostEmail, password: hostPassword }),
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || 'Login failed');
      return;
    }

    setHostToken(data.token);
    localStorage.setItem('spectraHostToken', data.token);
    setMessage('Host login successful');
    setView('host');
    fetchContests();
  }

  async function loadHostParticipants(contestId = contest?.id) {
    if (!contestId || !hostToken) return;
    const response = await fetch(`${API_BASE}/api/contests/participants/${contestId}`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    if (response.ok) {
      const data = await response.json();
      setHostParticipants(data.participants || []);
    }
  }

  async function handleContestCreate(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get('contestName'),
      code: form.get('contestCode'),
      durationMinutes: Number(form.get('durationMinutes') || 60),
    };

    const response = await fetch(`${API_BASE}/api/contests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || 'Contest creation failed');
      return;
    }

    setContest(data.contest);
    setMessage('Contest created successfully');
    fetchContests();
  }

  async function handleContestJoin(event) {
    event.preventDefault();
    if (joiningContest) return;
    setMessage('');
    const trimmedRegNo = String(studentInfo.participantId || '').trim();
    const trimmedName = String(studentInfo.name || '').trim();
    const trimmedDepartment = String(studentInfo.department || '').trim();
    const trimmedYear = String(studentInfo.year || '').trim();

    if (!/^\d{12}$/.test(trimmedRegNo)) {
      setStudentLoginError('Registration number must contain exactly 12 digits');
      return;
    }

    if (!trimmedName) {
      setStudentLoginError('Student name is required');
      return;
    }

    if (!trimmedDepartment) {
      setStudentLoginError('Department is required');
      return;
    }

    if (!trimmedYear) {
      setStudentLoginError('Year is required');
      return;
    }

    const contestCode = (selectedContestCode || DEFAULT_CONTEST_CODE).trim() || DEFAULT_CONTEST_CODE;

    setStudentLoginError('');
    setJoiningContest(true);
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    try {
      const response = await fetch(`${API_BASE}/api/contests/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: trimmedRegNo,
          name: trimmedName,
          department: trimmedDepartment,
          year: trimmedYear,
          contestCode,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || 'Join failed');
        return;
      }

      setJoinedParticipant(data.participant);
      setContestFrozen(false);
      setViolationWarning('');
      setCompletedProblemIds([]);
      setResult('');
      setMessage('Joined contest successfully');
      await loadContestByCode(contestCode);
    } catch (error) {
      setMessage('Unable to join right now. Please make sure the backend server is running.');
    } finally {
      setJoiningContest(false);
    }
  }

  async function loadContestByCode(code) {
    const response = await fetch(`${API_BASE}/api/contests`);
    const data = await response.json();
    const match = data.contests.find((item) => item.code.toLowerCase() === code.toLowerCase());
    if (!match) return;
    const contestResponse = await fetch(`${API_BASE}/api/contests/${match.id}`);
    const contestPayload = await contestResponse.json();
    setContest(contestPayload.contest);
    setProblemList(contestPayload.problems || []);
    if (contestPayload.problems?.[0]?.problems?.[0]) {
      setSelectedProblem(contestPayload.problems[0].problems[0]);
    }
  }

  async function handleRunSample() {
    if (!selectedProblem) return;
    if (contestFrozen) return;
    if (timeRemaining <= 0) {
      setResult('Contest time ended. Submissions are now closed.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/submissions/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: joinedParticipant?.participantId, contestId: joinedParticipant?.contestId, problemId: selectedProblem.id, language, code }),
      });
      const responseText = await response.text();
      let data = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        data = { error: `Run endpoint returned HTTP ${response.status}` };
      }
      if (!response.ok) {
        setRunOutput('');
        setResult(data.error || 'Test run failed');
        return;
      }

      const detail = data.result?.details?.[0];
      if (data.result?.status === 'ACCEPTED' && detail) {
        setRunOutput(`Input:\n${selectedProblem.sampleInput}\n\nOutput:\n${detail.actual}\n\nExpected:\n${selectedProblem.sampleOutput}\n\nSample test passed`);
        setResult('Sample test passed');
        return;
      }

      setRunOutput(`Sample test failed.\n\nExpected:\n${selectedProblem.sampleOutput}\n\nYour output:\n${detail?.actual || 'No output'}`);
      setResult('Sample test failed');
    } catch (error) {
      setRunOutput('');
      setResult(`Unable to connect to the backend at ${API_BASE}. Please restart the backend server.`);
    }
  }

  async function handleSubmit() {
    if (!joinedParticipant || !selectedProblem) {
      setResult('Join the contest and choose a problem first');
      return;
    }
    if (contestFrozen) return;
    if (timeRemaining <= 0) {
      setResult('Contest time ended. Submissions are now closed.');
      return;
    }

    const response = await fetch(`${API_BASE}/api/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantId: joinedParticipant.participantId,
        contestId: joinedParticipant.contestId,
        problemId: selectedProblem.id,
        language,
        code,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setResult(data.error || 'Submission failed');
      return;
    }

    setRunOutput('');
    if (data.result?.status === 'ACCEPTED') {
      setCompletedProblemIds((current) => current.includes(selectedProblem.id) ? current : [...current, selectedProblem.id]);
    }
    setResult(`Status: ${data.result?.status || 'SUBMITTED'} | Tests: ${data.passed || 0}/${data.total || 0} passed | Score: ${data.score || 0}/${selectedProblem.marks}`);
  }

  const levelGroups = useMemo(() => {
    if (!problemList || problemList.length === 0) return [];
    return problemList;
  }, [problemList]);

  function isLevelUnlocked(levelIndex) {
    if (levelIndex === 0) return true;
    const previousLevel = levelGroups[levelIndex - 1];
    return previousLevel?.problems?.every((problem) => completedProblemIds.includes(problem.id)) || false;
  }

  function selectLevel(level, levelIndex) {
    if (!isLevelUnlocked(levelIndex)) {
      setResult(`Finish all ${levelGroups[levelIndex - 1]?.levelName || 'previous level'} problems to unlock this level.`);
      return;
    }
    loadProblemCode(level.problems[0]);
    setSelectedProblem(level.problems[0]);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand">SPECTRA</div>
          <div className="subtitle">Coding Challenge</div>
        </div>
        {joinedParticipant && <div className="topbar-timer">Time Remaining: {formatTime(timeRemaining)}</div>}
        {view === 'host' && !joinedParticipant && <nav>
          <button className={view === 'student' ? 'active' : ''} onClick={() => setView('student')}>Student</button>
          <button className={view === 'host' ? 'active' : ''} onClick={() => setView('host')}>Host</button>
        </nav>}
      </header>

      <main className="content">
        {view === 'select' ? (
          <section className="panel login-panel role-panel">
            <div className="glass-card role-card">
              <div className="role-kicker">Welcome to</div>
              <h1>SPECTRA Coding Challenge</h1>
              <p>Select how you want to continue.</p>
              <div className="role-options">
                <button className="role-option student-option" onClick={() => setView('student')}>
                  <strong>Student</strong>
                  <span>Join the contest and solve problems</span>
                </button>
                <button className="role-option host-option" onClick={() => setView('host')}>
                  <strong>Host</strong>
                  <span>Manage contests and view results</span>
                </button>
              </div>
            </div>
          </section>
        ) : view === 'host' ? (
          <section className="panel host-panel host-results-panel">
            {!hostToken ? (
              <form onSubmit={handleHostLogin} className="glass-card login-card">
                <h2>Host Login</h2>
                <label className="field-label" htmlFor="host-email">Email</label>
                <input id="host-email" value={hostEmail} onChange={(e) => setHostEmail(e.target.value)} placeholder="Email" />
                <label className="field-label" htmlFor="host-password">Password</label>
                <input id="host-password" type="password" value={hostPassword} onChange={(e) => setHostPassword(e.target.value)} placeholder="Password" />
                <button type="submit">Login</button>
              </form>
            ) : (
              <div className="glass-card host-results-card">
                <div className="host-results-heading">
                  <div><h2>Participant Results</h2><p>{contest?.name || 'SPECTRA Contest'} | Total Participants: {hostParticipants.length}</p></div>
                  <button type="button" onClick={() => loadHostParticipants()}>Refresh</button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead><tr><th>Rank</th><th>Participant</th><th>Registration No.</th><th>Department</th><th>Year</th><th>Status</th><th>Marks</th><th>Total Coding Time</th><th>Question Timing</th></tr></thead>
                    <tbody>
                      {hostParticipants.map((participant, participantIndex) => (
                        <tr key={participant.id}>
                          <td>{participantIndex + 1}</td>
                          <td>{participant.name}</td>
                          <td>{participant.participantId}</td>
                          <td>{participant.department || '-'}</td>
                          <td>{participant.year || '-'}</td>
                          <td>{participant.disqualified ? 'DISQUALIFIED' : participant.status}</td>
                          <td>{participant.score || 0}</td>
                          <td>{Math.floor((participant.totalCodingTimeSeconds || 0) / 60)}m {(participant.totalCodingTimeSeconds || 0) % 60}s</td>
                          <td>{participant.questions?.length ? participant.questions.map((question) => `${question.question}: ${Math.floor(question.timeTakenSeconds / 60)}m ${question.timeTakenSeconds % 60}s (${question.marks} marks)`).join(' | ') : 'Not submitted'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {message && <div className="message">{message}</div>}
          </section>
        ) : (
          <section className={joinedParticipant ? 'panel student-panel contest-panel' : 'panel student-panel login-panel'}>
            {!joinedParticipant ? (
              <form onSubmit={handleContestJoin} className="glass-card join-card login-card">
                <h2>Student Login</h2>
                <label className="field-label" htmlFor="reg-number">Registration Number (12 digits)</label>
                <input id="reg-number" value={studentInfo.participantId} maxLength={12} inputMode="numeric" onChange={(e) => setStudentInfo({ ...studentInfo, participantId: e.target.value.replace(/\D/g, '') })} placeholder="12-digit Registration Number" />
                <label className="field-label" htmlFor="student-name">Student Name</label>
                <input id="student-name" value={studentInfo.name} onChange={(e) => setStudentInfo({ ...studentInfo, name: e.target.value })} placeholder="Student Name" />
                <label className="field-label" htmlFor="department">Department</label>
                <input id="department" value={studentInfo.department} onChange={(e) => setStudentInfo({ ...studentInfo, department: e.target.value })} placeholder="Department" />
                <label className="field-label" htmlFor="year">Year</label>
                <input id="year" value={studentInfo.year} onChange={(e) => setStudentInfo({ ...studentInfo, year: e.target.value })} placeholder="Year" />
                <div className="contest-code-note">Contest code: {selectedContestCode || DEFAULT_CONTEST_CODE}</div>
                {studentLoginError && <div className="error-message">{studentLoginError}</div>}
                {message && <div className={message.startsWith('Joined') ? 'message' : 'error-message'}>{message}</div>}
                <button type="submit" disabled={joiningContest}>{joiningContest ? 'Joining...' : 'Join'}</button>
              </form>
            ) : (
              <>
                <div className="contest-header">
                  <div className="contest-brand-wrap">
                    <div className="brand small">SPECTRA</div>
                    <div className="subtitle">Participant: {joinedParticipant.participantId}</div>
                  </div>
                </div>

                <div className="level-tabs">
                  {levelGroups.map((level, levelIndex) => (
                    <button key={level.levelId} className="tab" disabled={!isLevelUnlocked(levelIndex)} onClick={() => selectLevel(level, levelIndex)}>
                      {level.levelName}{!isLevelUnlocked(levelIndex) ? ' (Locked)' : ''}
                    </button>
                  ))}
                </div>

                <div className="problem-layout">
                  <aside className="problem-list">
                    {levelGroups.map((level) => (
                      <div key={level.levelId} className={`level-block${isLevelUnlocked(levelGroups.indexOf(level)) ? '' : ' locked-level'}`}>
                        <h4>{level.levelName}</h4>
                        {level.problems.map((problem) => (
                          <button key={problem.id} className={selectedProblem?.id === problem.id ? 'problem-btn active' : 'problem-btn'} disabled={!isLevelUnlocked(levelGroups.indexOf(level))} onClick={() => { loadProblemCode(problem); setSelectedProblem(problem); }}>
                            {problem.title}
                          </button>
                        ))}
                      </div>
                    ))}
                  </aside>

                  <div className="workspace">
                    {selectedProblem && (
                      <>
                        <div className="problem-card">
                          <h3>{selectedProblem.title}</h3>
                          <p>{selectedProblem.description}</p>
                          <div className="meta-grid">
                            <div><strong>Input Format</strong><p>{selectedProblem.inputFormat}</p></div>
                            <div><strong>Output Format</strong><p>{selectedProblem.outputFormat}</p></div>
                            <div><strong>Constraints</strong><p>{selectedProblem.constraints}</p></div>
                            <div><strong>Marks</strong><p>{selectedProblem.marks}</p></div>
                          </div>
                          <div className="samples">
                            <div><h5>Sample Input</h5><pre>{selectedProblem.sampleInput}</pre></div>
                            <div><h5>Sample Output</h5><pre>{selectedProblem.sampleOutput}</pre></div>
                          </div>
                        </div>

                        <div className="editor-toolbar">
                          <select value={language} onChange={(e) => { const nextLanguage = e.target.value; setLanguage(nextLanguage); loadProblemCode(selectedProblem, nextLanguage); }} disabled={timeRemaining <= 0}>
                            <option value="Python">Python</option>
                            <option value="C">C</option>
                            <option value="Java">Java</option>
                          </select>
                          <button type="button" onClick={handleRunSample} disabled={contestFrozen}>Run</button>
                          <button type="button" className="primary" onClick={handleSubmit} disabled={contestFrozen || timeRemaining <= 0}>Submit</button>
                        </div>

                        <textarea
                          value={code}
                          onChange={handleCodeChange}
                          onKeyDown={handleEditorKeyDown}
                          disabled={contestFrozen || timeRemaining <= 0}
                          className="code-editor"
                          placeholder="Type your solution here..."
                          spellCheck={false}
                        />

                        <div className="output-box">
                          <h4>Submission Result</h4>
                          <pre>{runOutput || result || 'No results yet.'}</pre>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        )}
      </main>
      {joinedParticipant && contestFrozen && (
        <div className="violation-overlay" role="alertdialog" aria-modal="true">
          <div className="violation-dialog">
            <div className="violation-icon">!</div>
            <h2>Contest Warning</h2>
            <p>{violationWarning}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
