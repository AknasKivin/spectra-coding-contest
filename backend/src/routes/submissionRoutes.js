import express from 'express';
import { createSubmission, getSubmissionById, getContestById, getParticipantById, updateSubmission, getProblemById, getProblemHiddenTestCases, updateParticipantScore, getBestScoreForProblem } from '../data/store.js';
import { judgeSubmission } from '../services/judgeService.js';

const router = express.Router();

router.post('/run', async (req, res) => {
  const { participantId, contestId, problemId, language, code } = req.body || {};
  const participant = participantId && contestId ? getParticipantById(participantId, contestId) : null;
  if (participant?.disqualified) {
    return res.status(403).json({ error: 'Participant disqualified. Code execution is closed.' });
  }
  const problem = getProblemById(problemId);

  if (!problem) {
    return res.status(404).json({ error: 'Problem not found' });
  }

  const testCases = [{ input: problem.sampleInput || '', output: problem.sampleOutput || '' }];
  try {
    const result = await judgeSubmission({ code, language, testCases, problem });
    return res.json({ result });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to run code', details: String(error.message || error) });
  }
});

router.post('/', async (req, res) => {
  const { participantId, contestId, problemId, language, code } = req.body || {};
  if (!String(code || '').trim()) {
    return res.status(400).json({ error: 'Please enter your code before submitting' });
  }
  const contest = getContestById(contestId);
  const participant = getParticipantById(participantId, contestId);

  if (!contest || !participant) {
    return res.status(400).json({ error: 'Invalid participant or contest' });
  }
  if (participant.disqualified) {
    return res.status(403).json({ error: 'Participant disqualified. Submissions are closed.' });
  }

  const problem = getProblemById(problemId);
  if (!problem) {
    return res.status(404).json({ error: 'Problem not found' });
  }

  const previousBest = getBestScoreForProblem(participantId, contestId, problemId);

  const action = createSubmission({ participantId, contestId, problemId, language, code });
  if (action.error) {
    return res.status(409).json({ error: action.error });
  }

  const testCases = getProblemHiddenTestCases(problemId);

  try {
    const result = await judgeSubmission({ code, language, testCases, problem });

    const score = Number(result.score || 0);
    const submission = updateSubmission(action.id, {
      status: 'judged',
      score,
      passed: result.passed ?? 0,
      total: result.total ?? 0,
      result: {
        status: result.status,
        passed: result.passed,
        total: result.total,
        score,
        message: result.message || 'Judged successfully',
        details: result.details || [],
      },
    });

    const currentScore = Number(participant.score || 0);
    updateParticipantScore(contestId, participantId, currentScore - previousBest + Math.max(previousBest, score));

    return res.json({
      submission,
      result: submission.result,
      score: submission.score,
      passed: submission.passed,
      total: submission.total,
    });
  } catch (error) {
    const submission = updateSubmission(action.id, {
      status: 'failed',
      result: {
        status: 'SERVER_ERROR',
        passed: 0,
        total: testCases.length,
        score: 0,
        message: 'Judging failed',
      },
    });
    return res.status(500).json({ error: 'Judging failed', submission });
  }
});

router.get('/:id', (req, res) => {
  const submission = getSubmissionById(req.params.id);
  if (!submission) return res.status(404).json({ error: 'Submission not found' });
  return res.json({ submission });
});

export default router;
