import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivitiesComponent } from '../activities/activities.component';
import { StatsService } from '../../services/stats.service';
import { QuizService } from '../../services/quiz.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ActivitiesComponent],
  template: `
    <div class="admin-panel">
      <h2>Admin</h2>
      <div class="actions">
        <button (click)="refreshAll()">Refresh Data</button>
        <button (click)="migrate()">Run Quiz Migration</button>
      </div>

      <div style="margin-top:12px">
        <h3>Activities</h3>
        <app-activities></app-activities>
      </div>
    </div>
  `
})
export class AdminComponent {
  constructor(private stats: StatsService, private quiz: QuizService) {}

  async refreshAll(): Promise<void> {
    try { await this.quiz.loadQuizzes(); await this.stats.refresh(); } catch {}
  }

  async migrate(): Promise<void> {
    try { await this.quiz.migrateAndRewriteAllQuizzes(); alert('Migration complete'); } catch (e) { alert('Migration failed: ' + (e as any).message); }
  }
}
