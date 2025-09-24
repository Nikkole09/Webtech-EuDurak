import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GameState } from '../models/game-state';
import { AuthService } from './auth.service';
import { API_BASE } from './api';

@Injectable({ providedIn: 'root' })
export class GameService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  /** Optionen mit Auth-Headern */
  private opts(): { headers: HttpHeaders } {
    return this.auth.authHeaders();
  }

  getGame(id: string): Observable<GameState> {
    return this.http.get<GameState>(`${API_BASE}/games/${id}`, this.opts());
  }

  play(
    gameId: string,
    payload: { source: 'hand' | 'open' | 'hidden'; cardIds?: string[] }
  ): Observable<GameState> {
    return this.http.post<GameState>(
      `${API_BASE}/games/${gameId}/play`,
      payload,
      this.opts()
    );
  }

  takeStack(gameId: string): Observable<GameState> {
    return this.http.post<GameState>(
      `${API_BASE}/games/${gameId}/take`,
      {},
      this.opts()
    );
  }

  revealHidden(gameId: string, index: number): Observable<GameState> {
    return this.http.post<GameState>(
      `${API_BASE}/games/${gameId}/reveal-hidden`,
      { index },
      this.opts()
    );
  }
}