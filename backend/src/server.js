import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/authRoutes.js';
import contestRoutes from './routes/contestRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import { initDatabase, isDatabaseReady } from './config/db.js';
import { listContests, calculateContestStats, getContestLeaderboard } from './data/store.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS || '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = Number(process.env.PORT || 5000);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'spectra-backend' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', dbReady: isDatabaseReady() });
});

app.use('/api/auth', authRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/submissions', submissionRoutes);
app.post('/api/violations', async (req, res) => {
  const { participantId, contestId, event } = req.body || {};
  if (!participantId || !contestId || !event) {
    return res.status(400).json({ error: 'Participant, contest, and event are required' });
  }

  const { addViolation } = await import('./data/store.js');
  const violation = addViolation({ participantId, contestId, event });
  return res.status(201).json({ violation });
});

io.on('connection', (socket) => {
  socket.on('host:join', (contestId) => {
    if (contestId) socket.join(contestId);
  });

  socket.on('student:update', (payload) => {
    if (payload?.contestId) socket.to(payload.contestId).emit('contest:update', payload);
  });
});

setInterval(() => {
  listContests().forEach((contest) => {
    io.to(contest.id).emit('dashboard:update', {
      stats: calculateContestStats(contest.id),
      leaderboard: getContestLeaderboard(contest.id),
    });
  });
}, 5000);

initDatabase();

if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`SPECTRA backend running on http://localhost:${PORT}`);
  });
}

export { app };
