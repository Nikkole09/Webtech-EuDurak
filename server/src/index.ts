import 'dotenv/config';
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import authRouter from './routes/auth';
import lobbiesRouter from './routes/lobbies';
import gamesRouter from './routes/games';
import { requireAuth, AuthRequest } from './middleware/authMiddleware';

const app = express();

// CORS für Angular-Devserver
app.use(cors({ origin: 'http://localhost:4200', credentials: true }));
app.use(express.json());

// Routen (Reihenfolge egal, aber vor start())
app.use('/auth', authRouter);
app.use('/lobbies', lobbiesRouter);
app.use('/games', gamesRouter);

// Health
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, message: 'API is running (with MongoDB)' });
});

// Test-Secret
app.get('/secret', requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ message: `Hallo ${req.user?.username}, das ist geheim 🤫` });
});

async function start() {
  const port = Number(process.env.PORT) || 4000;

  try {
    if (!process.env.MONGO_URI) throw new Error('No MONGO_URI found');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
  }

  app.listen(port, () => {
    console.log(`🚀 API on http://localhost:${port}`);
  });
}

start();
