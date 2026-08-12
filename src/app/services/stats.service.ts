import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GithubService } from './github.service';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly PATH = 'stats/stats.json';

  private statsSubject = new BehaviorSubject<Record<string, number>>({});
  stats$ = this.statsSubject.asObservable();

  constructor(private github: GithubService) {
    this.refresh().catch(() => {});
  }

  async get(): Promise<Record<string, number>> {
    const file = await this.github.getFile(this.PATH);
    if (!file) return {};
    try {
      return JSON.parse(this.github.decodeBase64(file.content));
    } catch { return {}; }
  }

  async increment(key: string, by = 1): Promise<void> {
    const file = await this.github.getFile(this.PATH);
    let data: Record<string, number> = {};
    if (file) {
      try { data = JSON.parse(this.github.decodeBase64(file.content)); } catch { data = {}; }
    }
    data[key] = (data[key] || 0) + by;
    await this.github.putFile(this.PATH, this.github.encodeBase64(JSON.stringify(data, null, 2)), `Increment stats: ${key}` , file?.sha);
    this.statsSubject.next(data);
  }

  async refresh(): Promise<void> {
    const d = await this.get();
    this.statsSubject.next(d);
  }
}
