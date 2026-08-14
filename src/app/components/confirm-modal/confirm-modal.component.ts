import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="confirm-backdrop" (click)="cancel()">
    <div class="confirm-box" (click)="$event.stopPropagation()">
      <div class="confirm-message">{{ message }}</div>
      <div class="confirm-actions">
        <button class="btn-cancel" (click)="cancel()">Cancel</button>
        <button class="btn-confirm" (click)="confirm()">Confirm</button>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .confirm-backdrop {
      position: fixed; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9999;
      backdrop-filter: blur(4px);
    }
    .confirm-box {
      background: var(--surface);
      color: var(--text-primary);
      padding: 28px;
      border-radius: 14px;
      max-width: 460px;
      width: 90%;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
      border: 1px solid var(--border);
      animation: slideUp 0.2s ease;
    }
    .confirm-message {
      margin-bottom: 24px;
      font-size: 15px;
      line-height: 1.6;
      color: var(--text-primary);
    }
    .confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .confirm-actions button {
      padding: 9px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }
    .btn-cancel {
      background: var(--surface-hover);
      color: var(--text-primary);
      border: 1px solid var(--border);
    }
    .btn-cancel:hover {
      background: var(--border);
    }
    .btn-confirm {
      background: var(--accent);
      color: #fff;
      border: none;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    }
    .btn-confirm:hover {
      background: var(--accent-hover);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ConfirmModalComponent {
  @Input() message = '';
  @Output() closed = new EventEmitter<boolean>();

  confirm(): void { this.closed.emit(true); }
  cancel(): void { this.closed.emit(false); }
}

