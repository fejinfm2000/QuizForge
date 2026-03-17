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

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TotalMarksPipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  user$ = this.auth.user$;
  quizzes: Quiz[] = [];

  loading = false;
  uploading = false;
  downloadingId: string | null = null;

  // Upload state
  quizTitle = '';
  quizDescription = '';
  selectedFile: File | null = null;
  uploadError = '';
  uploadSuccess = '';
  loadError = '';

  // Tab
  activeTab: 'attend' | 'manage' = 'attend';

  // GitHub config check
  githubConfigured = !!(environment.github.token && environment.github.owner && environment.github.repo
    && environment.github.token !== 'YOUR_GITHUB_PERSONAL_ACCESS_TOKEN');

  constructor(
    private auth: AuthService,
    private quizService: QuizService,
    private excel: ExcelService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.githubConfigured) {
      await this.loadQuizzes();
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
      const totalMarks = questions.reduce((s, q) => s + q.marks, 0);

      const quiz: Quiz = {
        id,
        title: this.quizTitle.trim(),
        description: this.quizDescription.trim() || undefined,
        questions,
        createdAt: new Date().toISOString(),
        githubPath: `${environment.github.basePath}/${id}/quiz.json`,
        attendeesPath: `${environment.github.basePath}/${id}/attendees.xlsx`
      };

      await this.quizService.uploadQuiz(quiz);
      this.uploadSuccess = `"${quiz.title}" uploaded with ${questions.length} questions (${totalMarks} marks total).`;
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

  attendQuiz(quiz: Quiz): void {
    this.router.navigate(['/quiz', quiz.id]);
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
    } catch (e: any) {
      alert('Failed to download attendees: ' + (e?.message ?? e));
    } finally {
      this.downloadingId = null;
    }
  }

  async deleteQuiz(quiz: Quiz): Promise<void> {
    if (!confirm(`Are you sure you want to delete "${quiz.title}"? This cannot be undone.`)) {
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
    return this.auth.currentUser?.isAdmin ?? false;
  }

  get quizSlug(): string {
    return this.quizTitle ? this.quizService.slugify(this.quizTitle) : '';
  }
}
