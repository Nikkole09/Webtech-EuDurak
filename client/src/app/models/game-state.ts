export interface Card {
  id: string;
  rank: number;
  suit: 'C' | 'D' | 'H' | 'S';
}

export interface PlayerSelf {
  username: string;
  hand: Card[];
  open: Card[];
  hidden: Card[];
  revealedHidden?: Card | null;   
  finished?: boolean;             
}

export interface PlayerPublic {
  username: string;
  open: Card[];
  counts: { hand: number; hidden: number };
  finished?: boolean;             
}

export interface GameState {
  id: string;
  lobbyId: string;
  drawCount: number;
  burnedCount: number;
  discardTop: Card | null;
  turnIndex: number;
  phaseForYou: 'hand' | 'open' | 'hidden';
  currentTurnUsername?: string;
  lastEventMessage?: string;
  status?: 'active' | 'ended';

  you: PlayerSelf;
  others: PlayerPublic[];
}
