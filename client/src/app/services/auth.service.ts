import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
const API_URL = 'https://webtech-eudurak.onrender.com';
interface LoginResponse {
  token: string;
  username?: string; 
  sub?: string;      
}
@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}
  getToken(): string | null {
    return localStorage.getItem('token');
  }
  private setToken(token: string | null) {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }
  isLoggedIn(): boolean {
    return !!this.getToken();
  }
  logout(): void {
    this.setToken(null);
    localStorage.removeItem('username');
  }
  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_URL}/auth/login`, { username, password })
      .pipe(
        tap((res) => {
          if (res?.token) {
            this.setToken(res.token);
            const name = res.username ?? this.decodeJwt(res.token)?.username ?? '';
            if (name) localStorage.setItem('username', name);
          }
        })
      );
  }
  register(username: string, password: string): Observable<any> {
    return this.http.post(`${API_URL}/auth/register`, { username, password });
  }
  getUsername(): string | null {
    return (
      localStorage.getItem('username') ||
      this.decodeJwt(this.getToken() || '')?.username ||
      null
    );
  }
  getProfile(): { id: string; username: string } | null {
    const token = this.getToken();
    if (!token) return null;
    const payload = this.decodeJwt(token);
    if (!payload) return null;
    return {
      id: payload.sub ?? '',
      username: payload.username ?? localStorage.getItem('username') ?? '',
    };
  }
  private decodeJwt(token: string): any | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decodeURIComponent(escape(json)));
    } catch {
      return null;
    }
  }
  authHeaders(): any {
    const t = this.getToken();
    return t ? { headers: { Authorization: `Bearer ${t}` } } : {};
  }
}
