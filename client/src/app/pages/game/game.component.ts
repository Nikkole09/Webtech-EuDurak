import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { CardComponent } from '../../components/card/card.component';
import { GameService } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';
import { GameState, Card, PlayerPublic } from '../../models/game-state';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, CardComponent],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
})
export class GameComponent implements OnInit, OnDestroy {
  gameId!: string;
  state: GameState | null = null;

  // Gegner-Slots fürs Layout
  oppTopLeft:  PlayerPublic | null = null;
  oppTopRight: PlayerPublic | null = null;
  oppBottomRight: PlayerPublic | null = null;

  // Auswahl
  selectedHandIds = new Set<string>();
  selectedOpenIdxs = new Set<number>();
  previewHiddenIndex: number | null = null; // genau eine verdeckte pro Zug

  error = '';
  private sub?: Subscription;
  private pollSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private game: GameService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigateByUrl('/lobbies'); return; }
    this.gameId = id;
    this.refresh();

    // sanftes Auto-Refresh (2s)
    this.pollSub = interval(2000).subscribe(() => this.refresh());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.pollSub?.unsubscribe();
  }

  refresh(id: string = this.gameId): void {
    this.error = '';
    this.sub?.unsubscribe();
    this.sub = this.game.getGame(id).subscribe({
      next: (s) => { this.state = s; this.mapOpponents(s); this.syncSelection(); },
      error: (e) => { this.error = e?.error?.error ?? 'Konnte Spielzustand nicht laden'; }
    });
  }

  private mapOpponents(s: GameState): void {
    this.oppTopLeft = null;
    this.oppTopRight = null;
    this.oppBottomRight = null;
    if (s.others && s.others.length) {
      this.oppTopRight    = s.others[0] ?? null;
      this.oppTopLeft     = s.others[1] ?? null;
      this.oppBottomRight = s.others[2] ?? null;
    }
  }

  // Anzeigename Fallback
  currentTurnName(): string {
    return this.state?.currentTurnUsername
      ?? (this.state?.turnIndex === 0 ? (this.state?.you.username || 'Du')
                                      : (this.state?.others[this.state!.turnIndex - 1]?.username || `Spieler #${this.state?.turnIndex}`));
  }

  /** Hand: Karte togglen */
  toggleHand(c: Card) {
    if (!c?.id) return;
    // Wenn offene Auswahl aktiv ist und Hand gewählt wird → offene Auswahl verwerfen
    if (this.selectedOpenIdxs.size > 0) this.selectedOpenIdxs.clear();

    if (this.selectedHandIds.has(c.id)) this.selectedHandIds.delete(c.id);
    else this.selectedHandIds.add(c.id);
  }

  /** Offen: Karte per Index togglen */
  toggleOpen(i: number) {
    // Wenn Hand-Auswahl aktiv ist und Offen gewählt wird → Hand-Auswahl verwerfen
    if (this.selectedHandIds.size > 0) this.selectedHandIds.clear();

    if (this.selectedOpenIdxs.has(i)) this.selectedOpenIdxs.delete(i);
    else this.selectedOpenIdxs.add(i);
  }

  /** Ein gemeinsamer Button für Hand **oder** Offen */
  playSelectedCombined() {
    if (!this.state) return;

    if (this.selectedHandIds.size > 0) {
      const cardIds = Array.from(this.selectedHandIds);
      this.game.play(this.gameId, { source: 'hand', cardIds }).subscribe({
        next: (s) => { this.state = s; this.mapOpponents(s); this.selectedHandIds.clear(); this.previewHiddenIndex = null; },
        error: (e) => { this.error = e?.error?.error ?? 'Zug nicht möglich'; }
      });
      return;
    }

    if (this.selectedOpenIdxs.size > 0) {
      // IDs aus den gewählten offenen Indizes sammeln
      const ids: string[] = [];
      for (const i of this.selectedOpenIdxs) {
        const card = this.state.you.open[i];
        if (card?.id) ids.push(card.id);
      }
      if (ids.length === 0) return;

      this.game.play(this.gameId, { source: 'open', cardIds: ids }).subscribe({
        next: (s) => { this.state = s; this.mapOpponents(s); this.selectedOpenIdxs.clear(); this.previewHiddenIndex = null; },
        error: (e) => { this.error = e?.error?.error ?? 'Zug nicht möglich'; }
      });
      return;
    }
  }

  /** Verdeckte Karte (Phase 3) einmal pro Zug aufdecken/auswählen */
  flipHidden(i: number) {
    if (!this.state) return;
    if (this.state.phaseForYou !== 'hidden') return;
    if (this.previewHiddenIndex !== null) return; // nur eine pro Zug
    if (i < 0 || i >= this.state.you.hidden.length) return;

    // Serverseitig markieren
    this.game.revealHidden(this.gameId, i).subscribe({
      next: (s) => {
        this.state = s;
        this.mapOpponents(s);
        this.previewHiddenIndex = i;        // visuelles Ausgewählt
        this.selectedHandIds.clear();
        this.selectedOpenIdxs.clear();
      },
      error: (e) => {
        this.error = e?.error?.error ?? 'Konnte verdeckte Karte nicht aufdecken';
      }
    });
  }


  /** Die ausgewählte verdeckte Karte wirklich legen */
  confirmPlayHidden() {
    if (!this.state) return;
    if (this.previewHiddenIndex === null) return;

    // Für hidden verlangt der Server keine cardId; er nimmt die aufgedeckte (revealedHidden) serverseitig
    this.game.play(this.gameId, { source: 'hidden' }).subscribe({
      next: (s) => { this.state = s; this.mapOpponents(s); this.previewHiddenIndex = null; },
      error: (e) => { this.error = e?.error?.error ?? 'Zug nicht möglich'; }
    });
  }

  /** Stapel aufnehmen */
  take(): void {
    this.game.takeStack(this.gameId).subscribe({
      next: (s) => { this.state = s; this.mapOpponents(s); this.selectedHandIds.clear(); this.selectedOpenIdxs.clear(); this.previewHiddenIndex = null; },
      error: (e) => { this.error = e?.error?.error ?? 'Konnte Stapel nicht nehmen'; },
    });
  }

  /** Markierung behalten, wenn Karten noch existieren */
  private syncSelection() {
    if (!this.state) return;
    const idsNow = new Set(this.state.you.hand.map(c => c.id));
    for (const id of Array.from(this.selectedHandIds)) {
      if (!idsNow.has(id)) this.selectedHandIds.delete(id);
    }
    // offene Indizes gegen Länge validieren
    const max = this.state.you.open.length;
    for (const i of Array.from(this.selectedOpenIdxs)) {
      if (i < 0 || i >= max) this.selectedOpenIdxs.delete(i);
    }
    // falls verdeckte Auswahl nicht mehr existiert → zurücksetzen
    if (this.previewHiddenIndex !== null && this.previewHiddenIndex >= this.state.you.hidden.length) {
      this.previewHiddenIndex = null;
    }
  }

  /** Hilfsfunktion für *ngFor */
  range(n: number): number[] {
    const count = Math.max(0, Math.floor(n || 0));
    return Array.from({ length: count }, (_, i) => i);
  }
}
