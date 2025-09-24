import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const r = Router();

r.post('/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: 'Username + Passwort (min. 6 Zeichen) erforderlich' });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash });
    res.json({ ok: true, id: user._id, username: user.username });
  } catch (e) {
    res.status(400).json({ error: 'Username schon vergeben?' });
  }
});

r.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ error: 'Ungültige Daten' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Ungültige Daten' });

  const token = jwt.sign({ username }, process.env.JWT_SECRET!, { subject: String(user._id) });
  res.json({ token, user: { id: user._id, username: user.username } });
});

export default r;
