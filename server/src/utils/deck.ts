// server/src/utils/deck.ts

export interface Card {
  id: string;   // z. B. "2H", "JD", "AS"
  rank: number; // 2..14 (11=J, 12=Q, 13=K, 14=A)
  suit: 'C' | 'D' | 'H' | 'S';
}

/** Neues 52er-Deck bauen (IDs passen zu deinen PNGs: 2..10, J, Q, K, A + C/D/H/S) */
export function createDeck(): Card[] {
  const suits: Card['suit'][] = ['C', 'D', 'H', 'S'];
  const ranks = [2,3,4,5,6,7,8,9,10,11,12,13,14];

  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        id: rankToId(rank) + suit,
        rank,
        suit,
      });
    }
  }
  return deck;
}

function rankToId(rank: number): string {
  if (rank <= 10) return String(rank);
  switch (rank) {
    case 11: return 'J';
    case 12: return 'Q';
    case 13: return 'K';
    case 14: return 'A';
    default: return String(rank);
  }
}

/** Fisher–Yates Shuffle (ohne TS-Fehler) */
export function shuffle<T>(a: T[]): T[] {
  let m = a.length;
  while (m > 0) {
    const i = Math.floor(Math.random() * m--);
    const tmp = a[m]!;
    a[m] = a[i]!;
    a[i] = tmp;
  }
  return a;
}

/** Die letzten N Karten vom Stapel ziehen (wie ein „Top-Of-Deck“ am Ende des Arrays) */
export function drawLastN<T>(deck: T[], n: number): T[] {
  if (n <= 0) return [];
  return deck.splice(-n);
}

/** Eine Karte ziehen (Convenience) */
export function drawOne<T>(deck: T[]): T | undefined {
  return deck.pop();
}
