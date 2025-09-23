import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware';
import Lobby from '../models/Lobby';
import Game from '../models/Game';
import User from '../models/User';
import { createDeck, shuffle, drawLastN } from '../utils/deck';

const r = Router();

/** CREATE: POST /lobbies  { name }  (Owner sofort als Spieler seat 0) */
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

/** READ (list): GET /lobbies (alle außer closed) */
r.get('/', async (_req, res) => {
  const list = await Lobby.find({ status: { $ne: 'closed' } }).sort('-createdAt');
  res.json(list);
});

/** READ (one): GET /lobbies/:id */
r.get('/:id', async (req, res) => {
  const lobby = await Lobby.findById(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json(lobby);
});

/** DELETE (soft): DELETE /lobbies/:id  (nur Owner → status=closed) */
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

/** JOIN: PATCH /lobbies/:id/join  (nur wenn open) */
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

/** LEAVE: PATCH /lobbies/:id/leave */
r.patch('/:id/leave', requireAuth, async (req: AuthRequest, res) => {
  const lobby = await Lobby.findById(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Nicht gefunden' });

  const me = req.user!.id;
  const before = lobby.players.length;
  lobby.players = lobby.players.filter(p => String(p.userId) !== me);

  // wenn Owner geht: Lobby schließen
  if (String(lobby.ownerId) === me) {
    lobby.status = 'closed';
  }

  // Sitze neu durchzählen
  lobby.players.forEach((p, i) => (p.seat = i));

  await lobby.save();
  res.json({ ok: true, playersRemoved: before - lobby.players.length, status: lobby.status });
});

/** START: PATCH /lobbies/:id/start (nur Owner; open; >=2 Spieler) */
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

  // Deck bauen & austeilen (Hand 3, Open 3, Hidden 3)
  const deck = shuffle(createDeck());

  // Usernames auflösen
  const userIds = lobby.players.map(p => p.userId);
  const users = await User.find({ _id: { $in: userIds } }).select('_id username');
  const nameMap = new Map(users.map(u => [String(u._id), u.username]));

  // Spielerzustände vorbereiten
  const players = lobby.players.map(p => ({
    userId: p.userId,
    username: nameMap.get(String(p.userId)) || 'Unbekannt',
    hand: [] as any[],
    open: [] as any[],
    hidden: [] as any[],
  }));

  // austeilen – nur mit drawLastN()
  for (const ps of players) ps.hand   = drawLastN(deck, 3);
  for (const ps of players) ps.open   = drawLastN(deck, 3);
  for (const ps of players) ps.hidden = drawLastN(deck, 3);

  // Zufälliger Startspieler
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
