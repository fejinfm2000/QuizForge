import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="main" style="max-width:820px;margin:28px auto;">
    <div class="card profile-card">
      <div class="card-header profile-header">
        <div class="profile-left">
          <div class="avatar-large">{{ avatarLetter() }}</div>
          <div>
            <ng-container *ngIf="!editing; else editNameTpl">
              <h2 class="profile-name">{{ (user$ | async)?.name || '-' }}</h2>
            </ng-container>
            <ng-template #editNameTpl>
              <input type="text" [(ngModel)]="editedName" />
            </ng-template>
            <div class="profile-email">{{ (user$ | async)?.email }}</div>
          </div>
        </div>
        <div class="profile-actions">
          <button class="btn-secondary" (click)="back()">← Back</button>
          <button class="btn-secondary" *ngIf="!editing" (click)="startEdit()" style="margin-left:8px">Edit</button>
          <button class="btn-primary" *ngIf="editing" (click)="save()" style="margin-left:8px">Save</button>
          <button class="btn-secondary" *ngIf="editing" (click)="cancel()" style="margin-left:8px">Cancel</button>
          <button class="btn-logout" (click)="logout()" style="margin-left:12px">Logout</button>
        </div>
      </div>
      <div class="card-body profile-body">
        <div class="field">
          <label>Role</label>
          <div class="profile-value">{{ (user$ | async)?.role }}</div>
        </div>
        <div class="field" style="margin-top:12px">
          <label>Session</label>
          <div class="profile-value">{{ (sessionActive() ? 'Active' : 'Not signed in') }}</div>
        </div>
        <div style="margin-top:18px">
          <small class="muted">Profile is read-only. To change name or email, log out and sign in with updated details.</small>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .profile-card { max-width: 820px; }
    .profile-header { display:flex; align-items:center; justify-content:space-between; }
    .profile-left { display:flex; align-items:center; gap:16px; }
    .avatar-large { width:72px; height:72px; border-radius:12px; background:var(--accent); color:#fff; display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:700 }
    .profile-name { margin:0; font-size:20px; font-family:'Playfair Display', serif }
    .profile-email { color:var(--text-muted); font-size:13px }
    .profile-body .field .profile-value { min-height:44px }
    .muted { color:var(--text-muted) }
  `]
})
export class ProfileComponent {
  user$ = this.auth.user$;
  constructor(private auth: AuthService, private router: Router) {}
  back(): void { this.router.navigate(['/dashboard']); }
  avatarLetter(): string {
    const u = this.auth.currentUser;
    const ch = u?.name?.charAt(0) || u?.email?.charAt(0) || '';
    return ch.toUpperCase();
  }
  editing = false;
  editedName = '';

  startEdit(): void {
    const u = this.auth.currentUser;
    this.editedName = u?.name || '';
    this.editing = true;
  }

  save(): void {
    if (!this.editedName || !this.editedName.trim()) { alert('Enter a name'); return; }
    this.auth.updateProfile(this.editedName.trim());
    this.editing = false;
    alert('Profile updated');
  }

  cancel(): void {
    this.editing = false;
    this.editedName = '';
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  sessionActive(): boolean { return !!window.sessionStorage.getItem('quiz_user'); }
}




