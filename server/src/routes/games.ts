import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware';
import Game from '../models/Game';
const r = Router();
type Suit = 'C' | 'D' | 'H' | 'S';
interface DBCard { id: string; rank: number; suit: Suit; }
interface DBPlayer {
  userId: any;
  username?: string;
  hand: DBCard[];
  open: DBCard[];
  hidden: DBCard[];
  revealedHidden: DBCard | null; 
  finished?: boolean;            
}
interface DBGame {
  _id: any;
  lobbyId: any;
  drawPile: DBCard[];
  discardPile: DBCard[];
  burnedPile?: DBCard[];
  players: DBPlayer[];
  turnIndex: number;
  handSize?: number;
  status?: 'active' | 'ended';
  lastEventMessage?: string;
}
function normalizeStatus(g: DBGame): 'active' | 'ended' {
  if (!g.status) g.status = 'active';
  return g.status;
}
function normalizePlayers(g: DBGame) {
  for (const p of g.players ?? []) {
    if (p.revealedHidden === undefined) p.revealedHidden = null;
    if (p.finished === undefined) p.finished = false;
  }
}
function top<T>(arr: readonly T[]): T | null {
  return arr.length > 0 ? arr[arr.length - 1]! : null;
}
function isTen(c: DBCard | null): boolean {
  return !!c && c.rank === 10;
}
function isFourOfAKind(cards: DBCard[]): boolean {
  if (cards.length < 4) return false;
  const last4 = cards.slice(-4);
  const [c1, c2, c3, c4] = last4;
  return !!(c1 && c2 && c3 && c4) && c1.rank === c2.rank && c2.rank === c3.rank && c3.rank === c4.rank;
}
function drawUpTo(g: DBGame, p: DBPlayer, desired = 3) {
  while (p.hand.length < desired && g.drawPile.length > 0) {
    const c = g.drawPile.pop() as DBCard;
    p.hand.push(c);
  }
}
function toPublicPlayer(p: DBPlayer) {
  return {
    username: p.username ?? 'Unbekannt',
    open: p.open,
    counts: {
      hand: p.hand.length,
      hidden: p.hidden.length,
    },
    finished: !!p.finished, 
  };
}
function meIndex(g: DBGame, userId: string): number {
  return g.players.findIndex(p => String(p.userId) === userId);
}
function requireMe(g: DBGame, userId: string): DBPlayer {
  const idx = meIndex(g, userId);
  if (idx < 0) throw new Error('Player not in this game');
  return g.players[idx]!;
}
type Phase = 'hand' | 'open' | 'hidden';
function phaseForPlayer(p: DBPlayer): Phase {
  if ((p.hand?.length ?? 0) > 0) return 'hand';
  if ((p.open?.length ?? 0) > 0) return 'open';
  return 'hidden';
}
function isTwoOrBeats(base: DBCard | null, c: DBCard): boolean {
  if (!base) return true;
  if (c.rank === 2) return true;
  return c.rank >= base.rank;
}
function isFinished(p: DBPlayer): boolean {
  return (p.hand.length + p.open.length + p.hidden.length) === 0;
}
function applyEndChecks(g: DBGame) {
  for (const p of g.players) {
    if (!p.finished && isFinished(p)) {
      p.finished = true;
    }
  }
  const active = g.players.filter(p => !p.finished);
  if (active.length === 1) {
    const loser = active[0]!;
    g.status = 'ended';
    g.lastEventMessage = `Glückwunsch an alle – ${loser.username ?? '???'} ist der Durak!`;
  }
}
async function buildStateFor(g: DBGame, meId: string) {
  normalizeStatus(g);
  normalizePlayers(g);
  const meIdx = meIndex(g, meId);
  const me = g.players[meIdx] as DBPlayer;
  const current = g.players[g.turnIndex];
  const currentTurnUsername = current?.username ?? `Spieler #${g.turnIndex}`;
  return {
    id: g._id,
    lobbyId: g.lobbyId,
    drawCount: g.drawPile.length,
    burnedCount: (g.burnedPile ?? []).length,
    discardTop: top(g.discardPile),
    turnIndex: g.turnIndex,
    phaseForYou: phaseForPlayer(me),
    currentTurnUsername,
    lastEventMessage: g.lastEventMessage ?? '',
    you: {
      username: me.username ?? 'Du',
      hand: me.hand,
      open: me.open,
      hidden: me.hidden,
      revealedHidden: me.revealedHidden, 
      finished: !!me.finished,
    },
    others: g.players
      .filter((_, i) => i !== meIdx)
      .map(toPublicPlayer),
  };
}
function endTurnToNext(g: DBGame) {
  g.turnIndex = (g.turnIndex + 1) % g.players.length;
}
r.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  const gDoc = await Game.findById(req.params.id);
  if (!gDoc) return res.status(404).json({ error: 'Game nicht gefunden' });
  const g = gDoc.toObject() as unknown as DBGame;
  normalizePlayers(g);
  const meId = req.user!.id;
  const idx = meIndex(g, meId);
  if (idx < 0) return res.status(403).json({ error: 'Du spielst nicht in diesem Game' });
  return res.json(await buildStateFor(g, meId));
});
r.get('/by-lobby/:lobbyId', requireAuth, async (req: AuthRequest, res) => {
  const g = await Game.findOne({ lobbyId: req.params.lobbyId }).select('_id');
  if (!g) return res.status(404).json({ error: 'Kein laufendes Spiel zu dieser Lobby' });
  return res.json({ gameId: g._id });
});
r.post('/:id/reveal-hidden', requireAuth, async (req: AuthRequest, res) => {
  const { index } = (req.body ?? {}) as { index: number };
  const gDoc = await Game.findById(req.params.id);
  if (!gDoc) return res.status(404).json({ error: 'Game nicht gefunden' });
  const g = gDoc.toObject() as unknown as DBGame;
  normalizePlayers(g);
  const meId = req.user!.id;
  const meIdx = meIndex(g, meId);
  if (meIdx < 0) return res.status(403).json({ error: 'Du spielst nicht in diesem Game' });
  const me = g.players[meIdx]!;
  if (g.turnIndex !== meIdx) return res.status(400).json({ error: 'Du bist nicht am Zug' });
  const phase = phaseForPlayer(me);
  if (phase !== 'hidden') return res.status(400).json({ error: 'Du bist nicht in Phase 3 (verdeckt)' });
  if (me.revealedHidden) return res.status(400).json({ error: 'Du hast bereits eine verdeckte Karte aufgedeckt' });
  if (typeof index !== 'number' || index < 0 || index >= me.hidden.length) {
    return res.status(400).json({ error: 'Ungültiger Index' });
  }
  const c = me.hidden[index];
  if (!c) return res.status(400).json({ error: 'Ungültiger Index' });
  me.revealedHidden = c;
  await Game.findByIdAndUpdate(gDoc._id, g, { new: false });
  return res.json(await buildStateFor(g, meId));
});
r.post('/:id/take', requireAuth, async (req: AuthRequest, res) => {
  const gDoc = await Game.findById(req.params.id);
  if (!gDoc) return res.status(404).json({ error: 'Game nicht gefunden' });
  const g = gDoc.toObject() as unknown as DBGame;
  normalizePlayers(g);
  const meId = req.user!.id;
  const me = requireMe(g, meId);
  while (g.discardPile.length) {
    const c = g.discardPile.pop() as DBCard;
    me.hand.push(c);
  }
  if (me.revealedHidden) {
    const c = me.revealedHidden as DBCard;
    me.hand.push(c);
    me.revealedHidden = null;
  }
  drawUpTo(g, me, g.handSize ?? 3);
  endTurnToNext(g);
  g.lastEventMessage = '';
  applyEndChecks(g);
  await Game.findByIdAndUpdate(gDoc._id, g, { new: false });
  return res.json(await buildStateFor(g, meId));
});
r.post('/:id/play', requireAuth, async (req: AuthRequest, res) => {
  const { source, cardIds } = (req.body ?? {}) as { source: 'hand' | 'open' | 'hidden'; cardIds?: string[] };
  if (!source) return res.status(400).json({ error: 'source fehlt' });
  const gDoc = await Game.findById(req.params.id);
  if (!gDoc) return res.status(404).json({ error: 'Game nicht gefunden' });
  const g = gDoc.toObject() as unknown as DBGame;
  normalizePlayers(g);
  const meId = req.user!.id;
  const meIdx = meIndex(g, meId);
  if (meIdx < 0) return res.status(403).json({ error: 'Du spielst nicht in diesem Game' });
  const me = g.players[meIdx]!;
  if (g.turnIndex !== meIdx) return res.status(400).json({ error: 'Du bist nicht am Zug' });
  const myPhase = phaseForPlayer(me);
  if (source !== myPhase) return res.status(400).json({ error: `Falsche Phase (${source}). Du bist in ${myPhase}.` });
  let message = '';
  if (source === 'hand') {
    const ids = Array.isArray(cardIds) ? cardIds : [];
    if (ids.length === 0) return res.status(400).json({ error: 'Keine Karten gewählt' });
    const toPlay: DBCard[] = [];
    for (const id of ids) {
      const c = me.hand.find(x => x.id === id);
      if (!c) return res.status(400).json({ error: `Karte nicht in deiner Hand: ${id}` });
      toPlay.push(c);
    }
    if (toPlay.length === 0) return res.status(400).json({ error: 'Keine gültigen Karten gefunden' });
    const base = top(g.discardPile);
    const baseRank = toPlay[0]!.rank;
    const sameRank = toPlay.every(c => c.rank === baseRank);
    if (!sameRank) return res.status(400).json({ error: 'Alle gelegten Karten müssen denselben Rang haben' });
    const allowed = toPlay.every(c => isTwoOrBeats(base, c));
    if (!allowed) return res.status(400).json({ error: 'Diese Karten dürfen nicht auf die Ablage' });
    for (const c of toPlay) g.discardPile.push(c);
    me.hand = me.hand.filter(h => !toPlay.some(p => p.id === h.id));
  } else if (source === 'open') {
    const ids = Array.isArray(cardIds) ? cardIds : [];
    if (ids.length === 0) return res.status(400).json({ error: 'Keine offenen Karten gewählt' });
    const toPlay: DBCard[] = [];
    for (const id of ids) {
      const c = me.open.find(x => x.id === id);
      if (!c) return res.status(400).json({ error: `Karte nicht in deinen offenen Karten: ${id}` });
      toPlay.push(c);
    }
    if (toPlay.length === 0) return res.status(400).json({ error: 'Keine gültigen Karten gefunden' });
    const base = top(g.discardPile);
    const baseRank = toPlay[0]!.rank;
    const sameRank = toPlay.every(c => c.rank === baseRank);
    if (!sameRank) return res.status(400).json({ error: 'Alle gelegten Karten müssen denselben Rang haben' });
    const allowed = toPlay.every(c => isTwoOrBeats(base, c));
    if (!allowed) return res.status(400).json({ error: 'Diese Karten dürfen nicht auf die Ablage' });
    for (const c of toPlay) g.discardPile.push(c);
    me.open = me.open.filter(h => !toPlay.some(p => p.id === h.id));
  } else if (source === 'hidden') {
    const c = me.revealedHidden; 
    if (!c) return res.status(400).json({ error: 'Du musst erst eine verdeckte Karte aufdecken' });
    const base = top(g.discardPile);
    if (!isTwoOrBeats(base, c)) {
      me.hand.push(c);
      me.revealedHidden = null;
      drawUpTo(g, me, g.handSize ?? 3);
      endTurnToNext(g);
      g.lastEventMessage = '';
      applyEndChecks(g);
      await Game.findByIdAndUpdate(gDoc._id, g, { new: false });
      return res.json(await buildStateFor(g, meId));
    }
    g.discardPile.push(c);
    const hiddenIdx = me.hidden.findIndex(x => x.id === c.id);
    if (hiddenIdx >= 0) me.hidden.splice(hiddenIdx, 1);
    me.revealedHidden = null;
  }
  if (isTen(top(g.discardPile))) {
    g.burnedPile = g.burnedPile ?? [];
    while (g.discardPile.length) g.burnedPile.push(g.discardPile.pop() as DBCard);
    message = 'Die 10 hat den Stapel verbrannt.';
  } else if (isFourOfAKind(g.discardPile)) {
    g.burnedPile = g.burnedPile ?? [];
    while (g.discardPile.length) g.burnedPile.push(g.discardPile.pop() as DBCard);
    message = 'Vier gleiche Karten: Stapel verbrannt.';
  }
  drawUpTo(g, me, g.handSize ?? 3);
  endTurnToNext(g);
  g.lastEventMessage = message;
  applyEndChecks(g);
  await Game.findByIdAndUpdate(gDoc._id, g, { new: false });
  return res.json(await buildStateFor(g, meId));
});
export default r;
