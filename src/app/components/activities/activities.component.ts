import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivityService } from '../../services/activity.service';
import { ActivityEntry } from '../../models/quiz.models';

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="activities-panel">
    <div class="filters">
      <input placeholder="Actor email" [(ngModel)]="qEmail" />
      <input placeholder="Action type" [(ngModel)]="qAction" />
      <button (click)="apply()">Filter</button>
      <button (click)="clear()">Clear</button>
    </div>

    <div class="list">
      <div *ngFor="let a of pageItems" class="activity-row">
        <div class="ts">{{ a.timestamp | date:'short' }}</div>
        <div class="meta">{{ a.actionType }} — {{ a.actorEmail }} ({{ a.actorRole }})</div>
        <div class="desc">{{ a.description }}</div>
      </div>
    </div>

    <div class="pager">
      <button (click)="prev()" [disabled]="page===1">Prev</button>
      <span>Page {{ page }} / {{ totalPages }}</span>
      <button (click)="next()" [disabled]="page===totalPages">Next</button>
    </div>
  </div>
  `,
  styles: [
    `.activities-panel { padding:8px }
     .filters input { margin-right:8px }
     .activity-row { padding:8px; border-bottom:1px solid #eee }
     .ts { font-size:12px; color:#666 }
     .meta{ font-weight:600 }
     .desc{ margin-top:4px }
     .pager{ margin-top:8px }
    `]
})
export class ActivitiesComponent implements OnInit {
  entries: ActivityEntry[] = [];
  filtered: ActivityEntry[] = [];
  pageItems: ActivityEntry[] = [];
  page = 1;
  pageSize = 10;
  totalPages = 1;

  qEmail = '';
  qAction = '';

  constructor(private activity: ActivityService) {}

  async ngOnInit(): Promise<void> {
    // subscribe to activity updates
    this.activity.activities$.subscribe(items => {
      this.entries = items;
      this.applyFilters();
    });
    // initial refresh
    try { await this.activity.refresh(); } catch {}
  }

  applyFilters(): void { this.apply(); }

  apply(): void {
    this.filtered = this.entries.filter(e => {
      if (this.qEmail && !(e.actorEmail || '').toLowerCase().includes(this.qEmail.toLowerCase())) return false;
      if (this.qAction && !(e.actionType || '').toLowerCase().includes(this.qAction.toLowerCase())) return false;
      return true;
    });
    this.page = 1;
    this.updatePage();
  }

  clear(): void { this.qAction = this.qEmail = ''; this.apply(); }

  updatePage(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    const start = (this.page - 1) * this.pageSize;
    this.pageItems = this.filtered.slice(start, start + this.pageSize);
  }

  prev(): void { if (this.page > 1) { this.page--; this.updatePage(); } }
  next(): void { if (this.page < this.totalPages) { this.page++; this.updatePage(); } }
}
