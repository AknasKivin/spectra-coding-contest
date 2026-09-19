import express from 'express';
import { getUserByEmail } from '../data/store.js';
import { createToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/host/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = getUserByEmail(email);

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid host credentials' });
  }

  const token = createToken(user);
  return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

export default router;
