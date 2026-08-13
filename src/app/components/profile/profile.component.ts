import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { QuizService } from '../../services/quiz.service';
import { StatsService } from '../../services/stats.service';
import { InvigilatorService } from '../../services/invigilator.service';
import { Quiz, AttendeeResult } from '../../models/quiz.models';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
  user$ = this.auth.user$;
  currentTheme: 'light' | 'dark' = 'dark';
  lastUpdated = new Date();

  editing = false;
  editedName = '';

  // Dynamic Profile Metrics
  candidateHistory: AttendeeResult[] = [];
  candidateAttemptsCount = 0;
  candidateAvgScore = 0;
  candidateBestScore = 0;
  candidateTotalQuestions = 0;

  invigilatorQuizCount = 0;
  invigilatorSubmissionsCount = 0;
  invigilatorAvgScore = 0;

  adminTotalQuizzes = 0;
  adminTotalAttempts = 0;
  adminActiveInvigilators = 0;
  adminTotalUsers = 0;
  adminDownloadsCount = 0;

  // Loading state
  loading = true;

  // Chart data points (0 to 100 height percentages for SVG bars)
  chartBars: { label: string; heightPct: number; value: string }[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private auth: AuthService,
    private router: Router,
    private theme: ThemeService,
    private quizService: QuizService,
    private statsService: StatsService,
    private invigilatorService: InvigilatorService
  ) {}

  async ngOnInit(): Promise<void> {
    // Subscribe to theme changes
    this.theme.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.currentTheme = theme;
      });

    await this.loadProfileData();
  }

  async loadProfileData(): Promise<void> {
    this.loading = true;
    const user = this.auth.currentUser;
    if (!user) {
      this.loading = false;
      return;
    }

    // Load Candidate local history
    try {
      const historyRaw = localStorage.getItem('quiz_history');
      if (historyRaw) {
        this.candidateHistory = JSON.parse(historyRaw);
        this.candidateAttemptsCount = this.candidateHistory.length;
        if (this.candidateAttemptsCount > 0) {
          const sumPct = this.candidateHistory.reduce((s, h) => s + (h.percentage || 0), 0);
          this.candidateAvgScore = Math.round(sumPct / this.candidateAttemptsCount);
          this.candidateBestScore = Math.round(Math.max(...this.candidateHistory.map(h => h.percentage || 0)));
          this.candidateTotalQuestions = this.candidateHistory.reduce((s, h) => s + (h.totalQuestions || 0), 0);
        }
      }
    } catch {
      this.candidateHistory = [];
    }

    // Load Quiz & System Stats
    try {
      await this.quizService.loadQuizzes();
      const quizzes: Quiz[] = this.quizService['quizzesSubject'].value || [];
      const userEmail = (user.email || '').toLowerCase().trim();

      // Invigilator stats
      const ownedQuizzes = quizzes.filter(q => (q.invigilatorId || '').toLowerCase().trim() === userEmail);
      this.invigilatorQuizCount = ownedQuizzes.length;

      let ownedSubmissions: AttendeeResult[] = [];
      for (const q of ownedQuizzes) {
        const atts = await this.quizService.getAttendees(q.id);
        ownedSubmissions = ownedSubmissions.concat(atts);
      }
      this.invigilatorSubmissionsCount = ownedSubmissions.length;
      if (ownedSubmissions.length > 0) {
        const sumPct = ownedSubmissions.reduce((s, a) => s + (a.percentage || 0), 0);
        this.invigilatorAvgScore = Math.round(sumPct / ownedSubmissions.length);
      }

      // Admin stats
      this.adminTotalQuizzes = quizzes.length;
      let allSubmissions: AttendeeResult[] = [];
      const userEmailsSet = new Set<string>();

      for (const q of quizzes) {
        const atts = await this.quizService.getAttendees(q.id);
        allSubmissions = allSubmissions.concat(atts);
        atts.forEach((a: AttendeeResult) => userEmailsSet.add(a.email.toLowerCase()));
      }

      this.adminTotalAttempts = allSubmissions.length;
      const invList = await this.invigilatorService.list();
      this.adminActiveInvigilators = invList.length;
      invList.forEach((i: string) => userEmailsSet.add(i.toLowerCase()));
      this.adminTotalUsers = Math.max(userEmailsSet.size, 1);

      const stats = await this.statsService.get();
      this.adminDownloadsCount = stats['attendance_downloads'] || 0;

      // Build chart bars based on role
      this.buildChartData(user.role, allSubmissions, ownedSubmissions);

    } catch (e) {
      console.error('Failed to load profile analytics data:', e);
    } finally {
      this.loading = false;
    }
  }

  private buildChartData(role: string = 'candidate', allSubmissions: AttendeeResult[], ownedSubmissions: AttendeeResult[]): void {
    let source: { dateLabel: string; pct: number }[] = [];

    if (role === 'candidate') {
      source = this.candidateHistory.map(h => ({
        dateLabel: new Date(h.attemptedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        pct: h.percentage || 0
      })).slice(0, 7).reverse();
    } else if (role === 'invigilator') {
      source = ownedSubmissions.map(a => ({
        dateLabel: new Date(a.attemptedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        pct: a.percentage || 0
      })).slice(0, 7).reverse();
    } else {
      source = allSubmissions.map(a => ({
        dateLabel: new Date(a.attemptedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        pct: a.percentage || 0
      })).slice(0, 7).reverse();
    }

    if (source.length === 0) {
      // Default placeholder bars for visual appeal
      this.chartBars = [
        { label: 'Mon', heightPct: 40, value: '40%' },
        { label: 'Tue', heightPct: 65, value: '65%' },
        { label: 'Wed', heightPct: 85, value: '85%' },
        { label: 'Thu', heightPct: 50, value: '50%' },
        { label: 'Fri', heightPct: 95, value: '95%' }
      ];
    } else {
      this.chartBars = source.map(s => ({
        label: s.dateLabel,
        heightPct: Math.max(15, Math.round(s.pct)),
        value: `${Math.round(s.pct)}%`
      }));
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  back(): void {
    this.router.navigate(['/dashboard']);
  }

  avatarLetter(): string {
    const u = this.auth.currentUser;
    const ch = u?.name?.charAt(0) || u?.email?.charAt(0) || '';
    return ch.toUpperCase();
  }

  startEdit(): void {
    const u = this.auth.currentUser;
    this.editedName = u?.name || '';
    this.editing = true;
  }

  save(): void {
    if (!this.editedName || !this.editedName.trim()) {
      alert('❌ Please enter a name');
      return;
    }
    this.auth.updateProfile(this.editedName.trim());
    this.lastUpdated = new Date();
    this.editing = false;
    alert('✅ Profile updated successfully!');
  }

  cancel(): void {
    this.editing = false;
    this.editedName = '';
  }

  logout(): void {
    const confirmed = confirm('Are you sure you want to logout?');
    if (confirmed) {
      this.auth.logout();
      this.router.navigate(['/login']);
    }
  }

  sessionActive(): boolean {
    return !!window.sessionStorage.getItem('quiz_user');
  }

  onThemeChange(event: any): void {
    const theme = event.target.value as 'light' | 'dark';
    this.theme.setTheme(theme);
  }
}




