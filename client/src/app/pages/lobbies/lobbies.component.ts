import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { LobbyService, Lobby } from '../../services/lobby.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-lobbies',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './lobbies.component.html',
  styleUrls: ['./lobbies.component.scss'],
})
export class LobbiesComponent implements OnInit, OnDestroy {
  allLobbies: Lobby[] = [];
  openLobbies: Lobby[] = [];
  myInGameLobby: Lobby | null = null;

  form!: FormGroup<{ name: FormControl<string> }>;

  loading = false;
  error = '';

  username = '';
  myId: string | null = null;

  private poll?: any;

  constructor(
    private lobby: LobbyService,
    private fb: FormBuilder,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const profile = this.auth.getProfile();
    this.username = profile?.username ?? 'Gast';
    this.myId = profile?.id ?? null;

    this.form = this.fb.group({
      name: this.fb.control('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    });

    this.refresh();
    this.poll = setInterval(() => this.refresh(), 2000);
  }

  ngOnDestroy(): void {
    if (this.poll) clearInterval(this.poll);
  }

  get lobbies(): Lobby[] {
    return this.openLobbies;
  }

  isOwner(l: Lobby): boolean {
    return !!this.myId && l.ownerId === this.myId;
  }

  isMember(l: Lobby): boolean {
    if (!this.myId) return false;  return !!l.players?.some(p => p.userId === this.myId);}

  refresh(): void {
    this.loading = true;
    this.error = '';
    this.lobby.list().subscribe({
      next: (list) => {
        this.loading = false;
        this.allLobbies = list;

        this.myInGameLobby =
          this.allLobbies.find(l => this.isMember(l) && l.status === 'in-game' && !!l.currentGameId) ?? null;

        this.openLobbies = this.allLobbies.filter(l => l.status === 'open');
      },
      error: () => {
        this.loading = false;
        this.error = 'Lobbys konnten nicht geladen werden';
      }
    });
  }

  create(): void {
    if (this.form.invalid || this.loading) return;
    const name = this.form.controls.name.value;
    this.loading = true; this.error = '';
    this.lobby.create(name).subscribe({
      next: () => { this.loading = false; this.form.reset(); this.refresh(); },
      error: () => { this.loading = false; this.error = 'Erstellen fehlgeschlagen'; }
    });
  }

  join(id: string): void {
    this.lobby.join(id).subscribe({
      next: () => this.refresh(),
      error: () => this.error = 'Beitreten fehlgeschlagen'
    });
  }

  start(id: string): void {
    if (!this.allLobbies.find(l => l._id === id && this.isOwner(l))) return;
    this.lobby.start(id).subscribe({
      next: (r) => this.router.navigate(['/game', r.gameId]),
      error: () => this.error = 'Start fehlgeschlagen (Owner? ≥ 2 Spieler?)'
    });
  }

  leave(id: string): void {
    this.lobby.leave(id).subscribe({
      next: () => this.refresh(),
      error: () => this.error = 'Verlassen fehlgeschlagen'
    });
  }

  remove(id: string): void {
    this.lobby.remove(id).subscribe({
      next: () => this.refresh(),
      error: () => this.error = 'Löschen fehlgeschlagen'
    });
  }

  goToGame(): void {
    if (this.myInGameLobby?.currentGameId) {
      this.router.navigate(['/game', this.myInGameLobby.currentGameId]);
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
