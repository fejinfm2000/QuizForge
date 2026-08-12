import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="confirm-backdrop">
    <div class="confirm-box">
      <div class="confirm-message">{{ message }}</div>
      <div class="confirm-actions">
        <button (click)="cancel()">Cancel</button>
        <button class="primary" (click)="confirm()">Confirm</button>
      </div>
    </div>
  </div>
  `,
  styles: [
    `.confirm-backdrop { position: fixed; inset:0; display:flex; align-items:center; justify-content:center; background: rgba(0,0,0,0.4); z-index:9999 }
     .confirm-box{ background:var(--surface); color:var(--text-primary); padding:20px; border-radius:8px; max-width:520px; box-shadow:0 6px 20px rgba(0,0,0,0.2)}
     .confirm-message{ margin-bottom:16px }
     .confirm-actions{ text-align:right }
     .confirm-actions button{ margin-left:8px }
     .confirm-actions .primary{ background:var(--accent); color:var(--text-primary); border:none; padding:6px 12px; border-radius:4px }
    `]
})
export class ConfirmModalComponent {
  @Input() message = '';
  @Output() closed = new EventEmitter<boolean>();

  confirm(): void { this.closed.emit(true); }
  cancel(): void { this.closed.emit(false); }
}
