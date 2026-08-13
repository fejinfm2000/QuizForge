import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GithubService } from './github.service';
import { ActivityEntry } from '../models/quiz.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly PATH = 'activities/activities.json';
  private readonly hasToken = !!(environment.github.token && environment.github.token.trim());

  private activitiesSubject = new BehaviorSubject<ActivityEntry[]>([]);
  activities$ = this.activitiesSubject.asObservable();

  constructor(private github: GithubService) {
    if (this.hasToken) {
      this.refresh().catch(() => {});
    }
  }

  private generateId(): string {
    return 'act_' + Math.random().toString(36).slice(2, 10);
  }

  async log(entry: Partial<ActivityEntry>): Promise<void> {
    if (!this.hasToken) return; // Silently skip when no token
    try {
      const file = await this.github.getFile(this.PATH);
      let items: ActivityEntry[] = [];
      if (file) {
        try {
          items = JSON.parse(this.github.decodeBase64(file.content));
        } catch {
          items = [];
        }
      }

      const now = new Date().toISOString();
      const full: ActivityEntry = {
        activityId: this.generateId(),
        timestamp: now,
        actorId: entry.actorId,
        actorEmail: entry.actorEmail,
        actorRole: entry.actorRole,
        actionType: entry.actionType || 'UNKNOWN',
        targetId: entry.targetId,
        targetType: entry.targetType,
        description: entry.description
      };

      items.unshift(full);

      await this.github.putFile(
        this.PATH,
        this.github.encodeBase64(JSON.stringify(items, null, 2)),
        `Add activity: ${full.actionType}`,
        file?.sha
      );

      // update local observable
      this.activitiesSubject.next(items);
    } catch (e) {
      console.warn('[ActivityService] Failed to log activity:', e);
    }
  }

  async getAll(): Promise<ActivityEntry[]> {
    if (!this.hasToken) return [];
    try {
      const file = await this.github.getFile(this.PATH);
      if (!file) return [];
      const items = JSON.parse(this.github.decodeBase64(file.content));
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  }

  async refresh(): Promise<void> {
    if (!this.hasToken) return;
    try {
      const items = await this.getAll();
      this.activitiesSubject.next(items);
    } catch {
      // ignore
    }
  }
}
