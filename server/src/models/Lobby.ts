import mongoose, { Schema, Types } from 'mongoose';

export type LobbyStatus = 'open' | 'in-game' | 'closed';

export interface LobbyPlayer {
  userId: Types.ObjectId;
  seat: number;
}

export interface LobbyDoc extends mongoose.Document {
  name: string;
  ownerId: Types.ObjectId;
  status: LobbyStatus;
  players: LobbyPlayer[];
  currentGameId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const LobbyPlayerSchema = new Schema<LobbyPlayer>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  seat: { type: Number, required: true },
});

const LobbySchema = new Schema<LobbyDoc>(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['open', 'in-game', 'closed'], default: 'open' },
    players: { type: [LobbyPlayerSchema], default: [] },
    // 👇 wichtig: im Schema vorhanden
    currentGameId: { type: Schema.Types.ObjectId, ref: 'Game', default: null },
  },
  { timestamps: true }
);

export default mongoose.model<LobbyDoc>('Lobby', LobbySchema);
