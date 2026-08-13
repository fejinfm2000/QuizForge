import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivityService } from '../../services/activity.service';
import { ThemeService } from '../../services/theme.service';
import { ActivityEntry } from '../../models/quiz.models';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activities.component.html',
  styleUrls: ['./activities.component.scss']
})
export class ActivitiesComponent implements OnInit, OnDestroy {
  entries: ActivityEntry[] = [];
  filtered: ActivityEntry[] = [];
  pageItems: ActivityEntry[] = [];
  page = 1;
  pageSize = 10;
  totalPages = 1;

  qEmail = '';
  qAction = '';
  startDate = '';
  endDate = '';

  currentTheme: 'light' | 'dark' = 'dark';
  private destroy$ = new Subject<void>();

  constructor(
    private activity: ActivityService,
    private theme: ThemeService
  ) {}

  async ngOnInit(): Promise<void> {
    // Subscribe to theme changes
    this.theme.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.currentTheme = theme;
      });

    // Subscribe to activity updates
    this.activity.activities$
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => {
        this.entries = items;
        this.applyFilters();
      });

    // Initial refresh
    try {
      await this.activity.refresh();
    } catch (error) {
      console.error('Failed to refresh activities:', error);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applyFilters(): void {
    this.apply();
  }

  apply(): void {
    this.filtered = this.entries.filter(e => {
      if (this.qEmail && !(e.actorEmail || '').toLowerCase().includes(this.qEmail.toLowerCase())) {
        return false;
      }
      if (this.qAction && !(e.actionType || '').toLowerCase().includes(this.qAction.toLowerCase())) {
        return false;
      }
      if (this.startDate) {
        const itemDate = new Date(e.timestamp).getTime();
        const start = new Date(this.startDate).getTime();
        if (itemDate < start) return false;
      }
      if (this.endDate) {
        const itemDate = new Date(e.timestamp).getTime();
        const end = new Date(this.endDate).setHours(23, 59, 59, 999);
        if (itemDate > end) return false;
      }
      return true;
    });
    this.page = 1;
    this.updatePage();
  }

  clear(): void {
    this.qAction = '';
    this.qEmail = '';
    this.startDate = '';
    this.endDate = '';
    this.apply();
  }

  updatePage(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    const start = (this.page - 1) * this.pageSize;
    this.pageItems = this.filtered.slice(start, start + this.pageSize);
  }

  prev(): void {
    if (this.page > 1) {
      this.page--;
      this.updatePage();
    }
  }

  next(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.updatePage();
    }
  }
}
