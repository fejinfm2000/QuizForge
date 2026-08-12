import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly KEY = 'ui_theme';

  private themeSubject = new BehaviorSubject<'light' | 'dark'>(this.loadTheme());
  theme$ = this.themeSubject.asObservable();

  constructor() {
    // ensure the document has the correct data-theme attribute on load
    const t = this.themeSubject.value;
    try { document.documentElement.setAttribute('data-theme', t); } catch {}
  }

  private loadTheme(): 'light' | 'dark' {
    const t = sessionStorage.getItem(this.KEY);
    // default to dark unless explicitly set to 'light'
    return (t === 'light') ? 'light' : 'dark';
  }

  getTheme(): 'light' | 'dark' {
    return this.themeSubject.value;
  }

  setTheme(theme: 'light' | 'dark'): void {
    sessionStorage.setItem(this.KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
    this.themeSubject.next(theme);
  }

  toggle(): 'light' | 'dark' {
    const next = this.getTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
    return next;
  }
}
