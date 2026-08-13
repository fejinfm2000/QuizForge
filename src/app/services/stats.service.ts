import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GithubService } from './github.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly PATH = 'stats/stats.json';
  private readonly hasToken = !!(environment.github.token && environment.github.token.trim());

  private statsSubject = new BehaviorSubject<Record<string, number>>({});
  stats$ = this.statsSubject.asObservable();

  constructor(private github: GithubService) {
    if (this.hasToken) {
      this.refresh().catch(() => {});
    }
  }

  async get(): Promise<Record<string, number>> {
    if (!this.hasToken) return {};
    try {
      const file = await this.github.getFile(this.PATH);
      if (!file) return {};
      return JSON.parse(this.github.decodeBase64(file.content));
    } catch {
      return {};
    }
  }

  async increment(key: string, by = 1): Promise<void> {
    if (!this.hasToken) return; // Silently skip when no token
    try {
      const file = await this.github.getFile(this.PATH);
      let data: Record<string, number> = {};
      if (file) {
        try { data = JSON.parse(this.github.decodeBase64(file.content)); } catch { data = {}; }
      }
      data[key] = (data[key] || 0) + by;
      await this.github.putFile(
        this.PATH,
        this.github.encodeBase64(JSON.stringify(data, null, 2)),
        `Increment stats: ${key}`,
        file?.sha
      );
      this.statsSubject.next(data);
    } catch (e) {
      // Stats are non-critical — don't propagate to UI
      console.warn('[StatsService] Failed to increment stat:', e);
    }
  }

  async refresh(): Promise<void> {
    if (!this.hasToken) return;
    try {
      const d = await this.get();
      this.statsSubject.next(d);
    } catch {
      // ignore
    }
  }
}
