import mongoose, { Schema, Types } from 'mongoose';
export interface DBCard {
  id: string;               
  rank: number;             
  suit: 'C' | 'D' | 'H' | 'S';
}
export interface DBPlayer {
  userId: Types.ObjectId;
  username: string;
  hand: DBCard[];
  open: DBCard[];
  hidden: DBCard[];
  revealedHidden?: DBCard | null;  
  flippedThisTurn?: boolean;       
  finished?: boolean;              
}
export interface DBGame {
  lobbyId: Types.ObjectId;
  drawPile: DBCard[];
  discardPile: DBCard[];
  burnedPile: DBCard[];
  players: DBPlayer[];
  turnIndex: number;
  phase: 'hand' | 'open' | 'hidden';  
  handSize: number;
  lastEventMessage?: string;         
  status?: 'active' | 'ended';
  createdAt: Date;
  updatedAt: Date;
}
const CardSchema = new Schema<DBCard>(
  {
    id: { type: String, required: true },
    rank: { type: Number, required: true },
    suit: { type: String, enum: ['C', 'D', 'H', 'S'], required: true },
  },
  { _id: false }
);
const PlayerSchema = new Schema<DBPlayer>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    hand: { type: [CardSchema], default: [] },
    open: { type: [CardSchema], default: [] },
    hidden: { type: [CardSchema], default: [] },
    revealedHidden: { type: CardSchema, default: null },
    flippedThisTurn: { type: Boolean, default: false },
    finished: { type: Boolean, default: false },
  },
  { _id: false }
);
const GameSchema = new Schema<DBGame>(
  {
    lobbyId: { type: Schema.Types.ObjectId, ref: 'Lobby', required: true },
    drawPile: { type: [CardSchema], default: [] },
    discardPile: { type: [CardSchema], default: [] },
    burnedPile: { type: [CardSchema], default: [] },
    players: { type: [PlayerSchema], required: true },
    turnIndex: { type: Number, default: 0 },
    phase: { type: String, enum: ['hand', 'open', 'hidden'], default: 'hand' },
    handSize: { type: Number, default: 3 },
    lastEventMessage: { type: String, default: '' },
    status: { type: String, enum: ['active', 'ended'], default: 'active' },
  },
  { timestamps: true }
);
export default mongoose.model<DBGame>('Game', GameSchema);
