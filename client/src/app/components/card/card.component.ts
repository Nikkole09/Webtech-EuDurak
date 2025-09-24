import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card } from '../../models/game-state';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class CardComponent {
  @Input() card?: Card;
  @Input() back = false;
  @Input() selectable = false;
  @Input() selected = false;
  @Output() cardClick = new EventEmitter<void>();

  private normalizeIdForAsset(id: string): string {
    const m = /^(\d+)([CDHS])$/i.exec(id);
    if (!m) return id; 

    const rank = parseInt(m[1], 10);
    const suit = m[2].toUpperCase(); 
    if (rank >= 2 && rank <= 10) return `${rank}${suit}`;

    const face =
      rank === 11 ? 'J' :
      rank === 12 ? 'Q' :
      rank === 13 ? 'K' :
      rank === 14 ? 'A' :
      String(rank);

    return `${face}${suit}`;
  }

  get src(): string {
    if (this.back) return '/assets/cards/back.png';
    if (!this.card?.id) return '/assets/cards/placeholder.png';
    const normalized = this.normalizeIdForAsset(this.card.id.toUpperCase());
    return `/assets/cards/${normalized}.png`;
  }

  get classes() {
    return {
      card: true,
      'is-selectable': this.selectable,
      'is-selected': this.selected
    };
  }

  onClick() {
    if (this.selectable) this.cardClick.emit();
  }
}
