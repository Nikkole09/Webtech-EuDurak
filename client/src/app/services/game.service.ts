import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GameState } from '../models/game-state';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class GameService {
  private api = 'https://webtech-eudurak.onrender.com';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private bodyOpts(): { headers: HttpHeaders; observe: 'body' } {
    return {
      headers: this.auth.authHeaders().headers,
      observe: 'body',
    };
  }

  getGame(id: string): Observable<GameState> {
    return this.http.get<GameState>(`${this.api}/games/${id}`, this.bodyOpts());
  }
  play(
    gameId: string,
    payload: { source: 'hand' | 'open' | 'hidden'; cardIds?: string[] }
  ): Observable<GameState> {
    return this.http.post<GameState>(`${this.api}/games/${gameId}/play`, payload, this.bodyOpts());
  }

  takeStack(gameId: string): Observable<GameState> {
    return this.http.post<GameState>(`${this.api}/games/${gameId}/take`, {}, this.bodyOpts());
  }

  revealHidden(gameId: string, index: number): Observable<GameState> {
    return this.http.post<GameState>(`${this.api}/games/${gameId}/reveal-hidden`, { index }, this.bodyOpts());
  }
}
