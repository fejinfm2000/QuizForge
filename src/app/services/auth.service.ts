import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User } from '../models/quiz.models';

import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly STORAGE_KEY = 'quiz_user';
  private readonly ADMINS = (environment.github as any).admins || [];

  private userSubject = new BehaviorSubject<User | null>(this.loadUser());

  user$ = this.userSubject.asObservable();

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.userSubject.value;
  }

  login(email: string, name: string): void {
    const lowerEmail = email.toLowerCase().trim();
    const isAdmin = this.ADMINS.includes(lowerEmail);
    const user: User = { email: lowerEmail, name: name.trim(), isAdmin };
    
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    this.userSubject.next(user);
  }

  logout(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
    this.userSubject.next(null);
  }

  private loadUser(): User | null {
    try {
      const raw = sessionStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
