import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware';
import Lobby from '../models/Lobby';
import Game from '../models/Game';
import User from '../models/User';
import { createDeck, shuffle, drawLastN } from '../utils/deck';

const r = Router();
r.post('/', requireAuth, async (req: AuthRequest, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name ist erforderlich' });
  const me = req.user!.id;
  const lobby = await Lobby.create({
    name,
    ownerId: me,
    players: [{ userId: me as any, seat: 0 }],
  });

  res.json(lobby);
});

r.get('/', async (_req, res) => {
  const list = await Lobby.find({ status: { $ne: 'closed' } }).sort('-createdAt');
  res.json(list);
});

r.get('/:id', async (req, res) => {
  const lobby = await Lobby.findById(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json(lobby);
});

r.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const lobby = await Lobby.findById(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Nicht gefunden' });
  if (String(lobby.ownerId) !== req.user!.id) {
    return res.status(403).json({ error: 'Nur der Owner darf löschen' });
  }
  lobby.status = 'closed';
  await lobby.save();
  res.json({ ok: true });
});

r.patch('/:id/join', requireAuth, async (req: AuthRequest, res) => {
  const lobby = await Lobby.findById(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Nicht gefunden' });
  if (lobby.status !== 'open') return res.status(400).json({ error: 'Lobby ist nicht offen' });

  const me = req.user!.id;
  const already = lobby.players.find(p => String(p.userId) === me);
  if (!already) {
    const nextSeat = lobby.players.length;
    lobby.players.push({ userId: me as any, seat: nextSeat });
    await lobby.save();
  }
  res.json(lobby);
});

r.patch('/:id/leave', requireAuth, async (req: AuthRequest, res) => {
  const lobby = await Lobby.findById(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Nicht gefunden' });

  const me = req.user!.id;
  const before = lobby.players.length;
  lobby.players = lobby.players.filter(p => String(p.userId) !== me);

  if (String(lobby.ownerId) === me) {
    lobby.status = 'closed';
  }

  lobby.players.forEach((p, i) => (p.seat = i));

  await lobby.save();
  res.json({ ok: true, playersRemoved: before - lobby.players.length, status: lobby.status });
});
r.patch('/:id/start', requireAuth, async (req: AuthRequest, res) => {
  const lobby = await Lobby.findById(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Nicht gefunden' });

  if (String(lobby.ownerId) !== req.user!.id) {
    return res.status(403).json({ error: 'Nur Owner darf starten' });
  }
  if (lobby.status !== 'open') {
    return res.status(400).json({ error: 'Lobby ist nicht offen' });
  }
  if (!lobby.players || lobby.players.length < 2) {
    return res.status(400).json({ error: 'Mindestens 2 Spieler erforderlich' });
  }

  const deck = shuffle(createDeck());

  const userIds = lobby.players.map(p => p.userId);
  const users = await User.find({ _id: { $in: userIds } }).select('_id username');
  const nameMap = new Map(users.map(u => [String(u._id), u.username]));

  const players = lobby.players.map(p => ({
    userId: p.userId,
    username: nameMap.get(String(p.userId)) || 'Unbekannt',
    hand: [] as any[],
    open: [] as any[],
    hidden: [] as any[],
  }));

  for (const ps of players) ps.hand   = drawLastN(deck, 3);
  for (const ps of players) ps.open   = drawLastN(deck, 3);
  for (const ps of players) ps.hidden = drawLastN(deck, 3);

  const startIdx = Math.floor(Math.random() * players.length);

  const game = await Game.create({
    lobbyId: lobby._id,
    drawPile: deck,
    discardPile: [],
    burnedPile: [],
    players,
    turnIndex: startIdx,
    phase: 'hand',
  });

  lobby.status = 'in-game';
  (lobby as any).currentGameId = game._id;
  await lobby.save();

  res.json({ gameId: game._id });
});

export default r;
