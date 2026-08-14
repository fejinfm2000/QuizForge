import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { QuizService } from '../../services/quiz.service';
import { ExcelService } from '../../services/excel.service';
import { Quiz, QuizQuestion } from '../../models/quiz.models';
import { TotalMarksPipe } from '../../pipes/total-marks.pipe';
import { environment } from '../../../environments/environment';
import { InvigilatorService } from '../../services/invigilator.service';
import { ActivityService } from '../../services/activity.service';
import { ConfirmService } from '../../services/confirm.service';
import { ThemeService } from '../../services/theme.service';
import { StatsService } from '../../services/stats.service';
import { ActivitiesComponent } from '../activities/activities.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TotalMarksPipe, ActivitiesComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  user$ = this.auth.user$;
  quizzes: Quiz[] = [];

  loading = false;
  uploading = false;
  downloadingId: string | null = null;

  // Admin actions
  invigilatorsList: string[] = [];
  newInvEmail = '';
  activities: any[] = [];
  statsData: Record<string, number> = {};

  // Upload state
  quizTitle = '';
  quizDescription = '';
  selectedFile: File | null = null;
  uploadError = '';
  uploadSuccess = '';
  loadError = '';

  // Candidate Code Entry state
  inputCode = '';
  foundQuiz: Quiz | null = null;
  codeError = '';
  codeSearching = false;

  // Invigilator Filter state ('my' by default per spec 5.3)
  quizFilter: 'my' | 'all' = 'my';

  // Code relink state
  relinkQuiz: Quiz | null = null;
  relinkCodeInput = '';
  relinkError = '';
  relinkSuccess = '';

  // Code Copy / Share state
  copiedQuizId: string | null = null;
  shareModalQuiz: Quiz | null = null;
  shareCopied = false;

  // Invigilator & Relink action busy states
  invigilatorBusy = false;
  isRelinking = false;

  // Tab
  activeTab: 'attend' | 'manage' | 'admin' = 'attend';
  // Invigilator test mode toggle
  isTestMode = false;

  // GitHub config check
  githubConfigured = !!(environment.github.token && environment.github.owner && environment.github.repo
    && environment.github.token !== 'YOUR_GITHUB_PERSONAL_ACCESS_TOKEN');

  currentTheme: 'light' | 'dark' = 'light';

  constructor(
    private auth: AuthService,
    private quizService: QuizService,
    private excel: ExcelService,
    private router: Router
    , private invigilatorService: InvigilatorService
    , private activityService: ActivityService
    , private confirm: ConfirmService
    , public theme: ThemeService
    , private stats: StatsService
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.githubConfigured) {
      await this.loadQuizzes();
      // load invigilators and activities if admin
      if (this.isAdmin) {
        this.loadInvigilators();
        this.loadActivities();
        this.loadStats();
        // subscribe to live updates
        this.activityService.activities$.subscribe(a => this.activities = a.slice(0, 50));
        this.stats.stats$.subscribe(s => this.statsData = s);
      }
    }
    // apply saved theme and subscribe to changes
    try {
      this.theme.setTheme(this.theme.getTheme());
      this.currentTheme = this.theme.getTheme();
      this.theme.theme$.subscribe(t => { this.currentTheme = t; });
    } catch {}
  }

  saveProfile(name: string): void {
    if (!name || !name.trim()) return alert('Enter a name');
    this.auth.updateProfile(name);
    alert('Profile updated');
  }

  openProfile(): void {
    this.router.navigate(['/profile']);
  }

  async loadInvigilators(): Promise<void> {
    try {
      this.invigilatorsList = await this.invigilatorService.list();
    } catch (e) {
      this.invigilatorsList = [];
    }
  }

  async addInvigilator(): Promise<void> {
    const email = this.newInvEmail.trim().toLowerCase();
    if (!email) return alert('Enter an email');
    this.invigilatorBusy = true;
    try {
      await this.invigilatorService.add(email);
      await this.activityService.log({ actorEmail: this.auth.currentUser?.email, actorRole: 'admin', actionType: 'INVIGILATOR_ADDED', description: `Added invigilator ${email}`, targetId: email, targetType: 'invigilator' });
      this.newInvEmail = '';
      await this.loadInvigilators();
    } catch (e: any) {
      alert('Failed to add invigilator: ' + (e?.message ?? e));
    } finally {
      this.invigilatorBusy = false;
    }
  }

  async removeInvigilator(email: string): Promise<void> {
    if (!(await this.confirm.confirm(`Remove invigilator ${email}?`))) return;
    this.invigilatorBusy = true;
    try {
      await this.invigilatorService.remove(email);
      await this.activityService.log({ actorEmail: this.auth.currentUser?.email, actorRole: 'admin', actionType: 'INVIGILATOR_REMOVED', description: `Removed invigilator ${email}`, targetId: email, targetType: 'invigilator' });
      await this.loadInvigilators();
    } catch (e: any) {
      alert('Failed to remove invigilator: ' + (e?.message ?? e));
    } finally {
      this.invigilatorBusy = false;
    }
  }

  async loadActivities(): Promise<void> {
    try {
      this.activities = await this.activityService.getAll();
    } catch {
      this.activities = [];
    }
  }

  async loadStats(): Promise<void> {
    try {
      this.statsData = await this.stats.get();
    } catch {
      this.statsData = {};
    }
  }

  async loadQuizzes(): Promise<void> {
    this.loading = true;
    try {
      await this.quizService.loadQuizzes();
      this.quizService.quizzes$.subscribe(q => this.quizzes = q);
    } catch (e: any) {
      console.error('Failed to load quizzes:', e);
      this.loadError = e?.message ?? 'Failed to load quizzes. Check your GitHub config.';
    } finally {
      this.loading = false;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    this.uploadError = '';
    this.uploadSuccess = '';
  }

  downloadTemplate(): void {
    this.excel.downloadQuizTemplate();
  }

  async uploadQuiz(): Promise<void> {
    this.uploadError = '';
    this.uploadSuccess = '';

    if (!this.quizTitle.trim()) {
      this.uploadError = 'Please enter a quiz title.';
      return;
    }
    if (!this.selectedFile) {
      this.uploadError = 'Please select an Excel file.';
      return;
    }

    this.uploading = true;
    try {
      const questions: QuizQuestion[] = await this.excel.parseQuizExcel(this.selectedFile);
      const id = this.quizService.slugify(this.quizTitle);
      const totalMarks = questions.reduce((s, q) => s + (q.marks || 0), 0);
      const currentUserEmail = this.auth.currentUser?.email || null;

      const quiz: Quiz = {
        id,
        title: this.quizTitle.trim(),
        description: this.quizDescription.trim() || undefined,
        invigilatorId: currentUserEmail,
        questions,
        createdAt: new Date().toISOString(),
        githubPath: `${environment.github.basePath}/${id}/quiz.json`,
        attendeesPath: `${environment.github.basePath}/${id}/attendees.xlsx`
      };

      await this.quizService.uploadQuiz(quiz);
      try {
        await this.activityService.log({
          actorEmail: currentUserEmail || undefined,
          actorRole: this.auth.currentUser?.role,
          actionType: 'QUIZ_UPLOADED',
          targetId: id,
          targetType: 'quiz',
          description: `Uploaded quiz ${quiz.title} (${questions.length} questions)`
        });
      } catch {}

      this.uploadSuccess = `"${quiz.title}" uploaded with ${questions.length} questions (${totalMarks} marks total). Quiz Code: ${quiz.code}`;
      this.quizTitle = '';
      this.quizDescription = '';
      this.selectedFile = null;
      // Reset file input
      const fi = document.getElementById('fileInput') as HTMLInputElement;
      if (fi) fi.value = '';
    } catch (e: any) {
      this.uploadError = e?.message ?? 'Upload failed. Check your GitHub config.';
    } finally {
      this.uploading = false;
    }
  }

  // ── Candidate Quiz Code Lookup ─────────────────────────────────────────────

  async validateQuizCode(): Promise<void> {
    this.codeError = '';
    this.foundQuiz = null;
    const code = this.inputCode.trim().toUpperCase();
    if (!code) {
      this.codeError = 'Please enter a quiz code.';
      return;
    }
    this.codeSearching = true;
    try {
      const quiz = await this.quizService.getQuizByCode(code);
      if (!quiz) {
        this.codeError = `No quiz found with code "${code}". Please check and try again.`;
      } else {
        this.foundQuiz = quiz;
      }
    } catch (e: any) {
      this.codeError = 'Failed to validate code: ' + (e?.message ?? e);
    } finally {
      this.codeSearching = false;
    }
  }

  startQuizFromCode(): void {
    if (!this.foundQuiz) return;
    this.router.navigate(['/quiz', this.foundQuiz.id], { queryParams: { test: this.isTestMode } });
  }

  // ── Quizzes Filtering & Orphan Detection ───────────────────────────────────

  get filteredQuizzes(): Quiz[] {
    if (this.quizFilter === 'all') {
      return this.quizzes;
    }
    const userEmail = (this.auth.currentUser?.email || '').toLowerCase().trim();
    return this.quizzes.filter(q => (q.invigilatorId || '').toLowerCase().trim() === userEmail);
  }

  isOrphaned(quiz: Quiz): boolean {
    if (!quiz.invigilatorId) return true;
    if (this.invigilatorsList.length > 0) {
      return !this.invigilatorsList.map(i => i.toLowerCase()).includes(quiz.invigilatorId.toLowerCase());
    }
    return false;
  }

  // ── Code Re-linking ────────────────────────────────────────────────────────

  openRelinkModal(quiz: Quiz): void {
    this.relinkQuiz = quiz;
    this.relinkCodeInput = quiz.code || '';
    this.relinkError = '';
    this.relinkSuccess = '';
  }

  closeRelinkModal(): void {
    this.relinkQuiz = null;
    this.relinkCodeInput = '';
  }

  async confirmRelinkCode(): Promise<void> {
    if (!this.relinkQuiz || !this.relinkCodeInput.trim()) {
      this.relinkError = 'Please enter a valid quiz code.';
      return;
    }
    this.isRelinking = true;
    try {
      await this.quizService.relinkQuizCode(this.relinkQuiz.id, this.relinkCodeInput.trim());
      this.relinkSuccess = `Code "${this.relinkCodeInput.trim().toUpperCase()}" re-linked to "${this.relinkQuiz.title}".`;
      setTimeout(() => this.closeRelinkModal(), 1500);
    } catch (e: any) {
      this.relinkError = e?.message ?? 'Failed to re-link code.';
    } finally {
      this.isRelinking = false;
    }
  }

  // ── Code Sharing & Copying ──────────────────────────────────────────────────

  async copyQuizCode(quiz: Quiz, event?: Event): Promise<void> {
    if (event) event.stopPropagation();
    const code = quiz.code || '';
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      this.copiedQuizId = quiz.id;
      setTimeout(() => { if (this.copiedQuizId === quiz.id) this.copiedQuizId = null; }, 2000);
    } catch {
      alert(`Quiz Code: ${code}`);
    }
  }

  openShareModal(quiz: Quiz): void {
    this.shareModalQuiz = quiz;
    this.shareCopied = false;
  }

  closeShareModal(): void {
    this.shareModalQuiz = null;
    this.shareCopied = false;
  }

  getShareMessage(quiz: Quiz): string {
    const totalMarks = (quiz.questions || []).reduce((s, q) => s + (q.marks || 0), 0);
    return `🔑 Quiz Code: ${quiz.code}\nQuiz Title: ${quiz.title}\nQuestions: ${quiz.questions.length} | Marks: ${totalMarks}\nUse this code to attend the quiz on QuizForge!`;
  }

  async copyShareMessage(quiz: Quiz): Promise<void> {
    const msg = this.getShareMessage(quiz);
    try {
      await navigator.clipboard.writeText(msg);
      this.shareCopied = true;
      setTimeout(() => this.shareCopied = false, 2500);
    } catch {
      alert(msg);
    }
  }

  attendQuiz(quiz: Quiz): void {
    this.router.navigate(['/quiz', quiz.id], { queryParams: { test: this.isTestMode } });
  }

  async downloadAttendees(quiz: Quiz): Promise<void> {
    this.downloadingId = quiz.id;
    try {
      const attendees = await this.quizService.getAttendees(quiz.id);
      if (attendees.length === 0) {
        alert('No attendees yet for this quiz.');
        return;
      }
      const bytes = this.excel.generateAttendeesExcel(attendees);
      this.excel.downloadBytes(bytes, `${quiz.id}-attendees.xlsx`);
      // increment attendance download counter and log activity
      try {
        await this.stats.increment('attendance_downloads');
      } catch {}
      try {
        await this.activityService.log({ actorEmail: this.auth.currentUser?.email, actorRole: this.auth.currentUser?.role, actionType: 'ATTENDANCE_DOWNLOADED', targetId: quiz.id, targetType: 'quiz', description: `Attendance downloaded for ${quiz.id}` });
      } catch {}
      try { await this.loadStats(); } catch {}
    } catch (e: any) {
      alert('Failed to download attendees: ' + (e?.message ?? e));
    } finally {
      this.downloadingId = null;
    }
  }

  async deleteQuiz(quiz: Quiz): Promise<void> {
    if (!(await this.confirm.confirm(`Are you sure you want to delete "${quiz.title}"? This cannot be undone.`))) {
      return;
    }
    
    this.loading = true;
    try {
      await this.quizService.deleteQuiz(quiz.id);
    } catch (e: any) {
      alert('Failed to delete quiz: ' + (e?.message ?? e));
    } finally {
      this.loading = false;
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  get isAdmin(): boolean {
    return this.auth.isAdmin;
  }

  get isInvigilator(): boolean {
    return this.auth.isInvigilator;
  }

  get quizSlug(): string {
    return this.quizTitle ? this.quizService.slugify(this.quizTitle) : '';
  }
}
