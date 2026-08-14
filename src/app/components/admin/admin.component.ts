import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivitiesComponent } from '../activities/activities.component';
import { StatsService } from '../../services/stats.service';
import { QuizService } from '../../services/quiz.service';
import { ThemeService } from '../../services/theme.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ActivitiesComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit, OnDestroy {
  currentTheme: 'light' | 'dark' = 'dark';
  isRefreshing = false;
  isMigrating = false;

  private destroy$ = new Subject<void>();

  constructor(
    private stats: StatsService,
    private quiz: QuizService,
    private theme: ThemeService
  ) {}

  ngOnInit(): void {
    // Subscribe to theme changes
    this.theme.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.currentTheme = theme;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async refreshAll(): Promise<void> {
    if (this.isRefreshing) return;

    this.isRefreshing = true;
    try {
      await this.quiz.loadQuizzes();
      await this.stats.refresh();
      alert('✅ Data refreshed successfully!');
    } catch (error) {
      console.error('Refresh failed:', error);
      alert('❌ Failed to refresh data. Check console for details.');
    } finally {
      this.isRefreshing = false;
    }
  }

  async migrate(): Promise<void> {
    if (this.isMigrating) return;

    const confirmed = confirm('⚠️ This will migrate and rewrite all quizzes. Continue?');
    if (!confirmed) return;

    this.isMigrating = true;
    try {
      await this.quiz.migrateAndRewriteAllQuizzes();
      alert('✅ Migration completed successfully!');
    } catch (error) {
      const message = (error as any)?.message || 'Unknown error';
      console.error('Migration failed:', error);
      alert(`❌ Migration failed: ${message}`);
    } finally {
      this.isMigrating = false;
    }
  }
}
