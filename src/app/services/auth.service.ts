import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User } from '../models/quiz.models';

import { environment } from '../../environments/environment';
import { InvigilatorService } from './invigilator.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly STORAGE_KEY = 'quiz_user';
  private readonly ADMINS = (environment.github as any).admins || [];
  private readonly INVIGILATORS = (environment.github as any).invigilators || [];

  private userSubject = new BehaviorSubject<User | null>(this.loadUser());

  user$ = this.userSubject.asObservable();

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.userSubject.value;
  }

  constructor(private invigilatorService: InvigilatorService) {
    // bootstrap remote invigilator list and react to changes so roles update live
    this.invigilatorService.list().catch(() => {});
    this.invigilatorService.list$.subscribe(list => {
      // don't downgrade roles on empty list emissions (happens before remote fetch)
      if (!Array.isArray(list) || list.length === 0) return;
      const cur = this.userSubject.value;
      if (!cur) return;
      const lower = cur.email.toLowerCase().trim();
      if (this.ADMINS.includes(lower)) {
        if (cur.role !== 'admin') this.userSubject.next({ ...cur, role: 'admin' });
        return;
      }
      if (list.includes(lower)) {
        if (cur.role !== 'invigilator') this.userSubject.next({ ...cur, role: 'invigilator' });
      } else {
        if (cur.role !== 'candidate') this.userSubject.next({ ...cur, role: 'candidate' });
      }
    });
  }

  async login(email: string, name: string): Promise<void> {
    const lowerEmail = email.toLowerCase().trim();
    let role: 'admin' | 'invigilator' | 'candidate' = this.ADMINS.includes(lowerEmail) ? 'admin' : 'candidate';

    if (role !== 'admin') {
      // check env list first then repo-managed list
      if (this.INVIGILATORS.includes(lowerEmail)) role = 'invigilator';
      else {
        try {
          const remote = await this.invigilatorService.list();
          if (remote.includes(lowerEmail)) role = 'invigilator';
        } catch {
          // ignore failures and default to candidate
        }
      }
    }

    const user: User = { email: lowerEmail, name: name.trim(), role };
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    this.userSubject.next(user);
  }

  logout(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
    this.userSubject.next(null);
  }

  updateProfile(name: string): void {
    const current = this.userSubject.value;
    if (!current) return;
    const updated: User = { ...current, name: name.trim() };
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    this.userSubject.next(updated);
  }

  private loadUser(): User | null {
    try {
      const raw = sessionStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  get isAdmin(): boolean { return this.currentUser?.role === 'admin'; }
  get isInvigilator(): boolean { return this.currentUser?.role === 'invigilator'; }
}
