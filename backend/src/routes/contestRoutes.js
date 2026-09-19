import express from 'express';
import { requireHost } from '../middleware/auth.js';
import { listContests, createContest, addLevel, addProblem, addProblemTestCase, getContestById, getContestByCode, listProblemsForContest, getContestParticipants, getParticipantReports, calculateContestStats, getResults, getContestLeaderboard, getSettingsForContest, updateSettingsForContest, joinContest, addViolation, getParticipantById } from '../data/store.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ contests: listContests() });
});

router.post('/', requireHost, (req, res) => {
  const { name, code, durationMinutes } = req.body || {};
  const contest = createContest({ name, code, durationMinutes, createdBy: req.user?.id || 'host-1' });
  res.status(201).json({ contest });
});

router.get('/:id', (req, res) => {
  const contest = getContestById(req.params.id);
  if (!contest) return res.status(404).json({ error: 'Contest not found' });
  return res.json({ contest, problems: listProblemsForContest(contest.id) });
});

router.post('/levels', requireHost, (req, res) => {
  const { contestId, name, order } = req.body || {};
  const level = addLevel({ contestId, name, order });
  res.status(201).json({ level });
});

router.post('/problems', requireHost, (req, res) => {
  const { levelId, title, description, inputFormat, outputFormat, constraints, sampleInput, sampleOutput, marks, timeLimit, memoryLimit, allowedLanguages } = req.body || {};
  const problem = addProblem({ levelId, title, description, inputFormat, outputFormat, constraints, sampleInput, sampleOutput, marks, timeLimit, memoryLimit, allowedLanguages });
  res.status(201).json({ problem });
});

router.post('/problems/:id/testcases', requireHost, (req, res) => {
  const { input, output } = req.body || {};
  const testCase = addProblemTestCase({ problemId: req.params.id, input, output });
  res.status(201).json({ testCase });
});

router.post('/join', (req, res) => {
  const { participantId, name, department, year, contestCode } = req.body || {};
  const result = joinContest({ participantId, name, department, year, contestCode });
  if (result.error) return res.status(400).json({ error: result.error });
  return res.json({ participant: result });
});

router.get('/participants/:contestId', requireHost, (req, res) => {
  res.json({ participants: getParticipantReports(req.params.contestId) });
});

router.get('/:contestId/stats', requireHost, (req, res) => {
  res.json({ stats: calculateContestStats(req.params.contestId) });
});

router.post('/violations', (req, res) => {
  const { participantId, contestId, event } = req.body || {};
  const violation = addViolation({ participantId, contestId, event });
  res.status(201).json({ violation });
});

router.get('/results/:contestId', requireHost, (req, res) => {
  const contest = getContestById(req.params.contestId);
  if (!contest) return res.status(404).json({ error: 'Contest not found' });
  return res.json({ results: getResults(req.params.contestId) });
});

router.get('/leaderboard/:contestId', requireHost, (req, res) => {
  return res.json({ leaderboard: getContestLeaderboard(req.params.contestId) });
});

router.get('/export/csv/:contestId', requireHost, (req, res) => {
  const rows = getResults(req.params.contestId);
  const csv = ['participantId,name,score,violations,status'];
  rows.forEach((row) => csv.push(`${row.participantId},${row.name},${row.score},${row.violations},${row.status}`));
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="spectra-results.csv"');
  return res.send(csv.join('\n'));
});

router.get('/export/excel/:contestId', requireHost, (req, res) => {
  const rows = getResults(req.params.contestId);
  const xls = ['participantId\tname\tscore\tviolations\tstatus'];
  rows.forEach((row) => xls.push(`${row.participantId}\t${row.name}\t${row.score}\t${row.violations}\t${row.status}`));
  res.setHeader('Content-Type', 'application/vnd.ms-excel');
  res.setHeader('Content-Disposition', 'attachment; filename="spectra-results.xls"');
  return res.send(xls.join('\n'));
});

router.get('/settings/:contestId', requireHost, (req, res) => {
  res.json({ settings: getSettingsForContest(req.params.contestId) });
});

router.post('/settings/:contestId', requireHost, (req, res) => {
  const settings = updateSettingsForContest(req.params.contestId, req.body || {});
  return res.json({ settings });
});

router.get('/participant/:contestCode/:participantId', (req, res) => {
  const contest = getContestByCode(req.params.contestCode);
  if (!contest) return res.status(404).json({ error: 'Invalid contest code' });
  const participant = getParticipantById(req.params.participantId, contest.id);
  if (!participant) return res.status(404).json({ error: 'Participant not found' });
  return res.json({ participant });
});

export default router;
