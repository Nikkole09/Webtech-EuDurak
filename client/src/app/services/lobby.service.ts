import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface Lobby {
  _id: string;
  name: string;
  ownerId: string;
  status: 'open' | 'in-game' | 'closed';
  players: { userId: string; seat: number; ready?: boolean }[];
  currentGameId?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class LobbyService {
  private apiUrl = 'http://localhost:4000/lobbies';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private authHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token ?? ''}`,
    });
  }

  list(): Observable<Lobby[]> {
    return this.http.get<Lobby[]>(this.apiUrl);
  }

  create(name: string): Observable<Lobby> {
    return this.http.post<Lobby>(
      this.apiUrl,
      { name },
      { headers: this.authHeaders() }
    );
  }

  join(id: string): Observable<Lobby> {
    return this.http.patch<Lobby>(
      `${this.apiUrl}/${id}/join`,
      {},
      { headers: this.authHeaders() }
    );
  }

  leave(id: string): Observable<Lobby> {
    return this.http.patch<Lobby>(
      `${this.apiUrl}/${id}/leave`,
      {},
      { headers: this.authHeaders() }
    );
  }

  start(id: string): Observable<{ gameId: string }> {
    return this.http.patch<{ gameId: string }>(
      `${this.apiUrl}/${id}/start`,
      {},
      { headers: this.authHeaders() }
    );
  }

  remove(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(
      `${this.apiUrl}/${id}`,
      { headers: this.authHeaders() }
    );
  }
}
