import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuizService } from '../../services/quiz.service';
import { AuthService } from '../../services/auth.service';
import { Quiz, QuizQuestion, QuizAnswer, AttendeeResult } from '../../models/quiz.models';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './quiz.component.html',
  styleUrls: ['./quiz.component.scss']
})
export class QuizComponent implements OnInit {
  quiz: Quiz | null = null;
  loading = true;
  error = '';

  // Quiz state
  currentIndex = 0;
  answers: Map<number, 'A' | 'B' | 'C' | 'D' | null> = new Map();
  submitted = false;
  submitting = false;

  // Timer
  timeLeft = 0;
  timerInterval: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: QuizService,
    private auth: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id')!;
    try {
      this.quiz = await this.quizService.getQuiz(id);
      if (!this.quiz) {
        this.error = 'Quiz not found.';
      } else {
        // Init all answers to null
        this.quiz.questions.forEach(q => this.answers.set(q.id, null));
        // 90 seconds per question
        this.timeLeft = this.quiz.questions.length * 90;
        this.startTimer();
      }
    } catch (e: any) {
      this.error = e?.message ?? 'Failed to load quiz.';
    } finally {
      this.loading = false;
    }
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  get currentQuestion(): QuizQuestion | null {
    return this.quiz?.questions[this.currentIndex] ?? null;
  }

  get progress(): number {
    if (!this.quiz) return 0;
    return ((this.currentIndex + 1) / this.quiz.questions.length) * 100;
  }

  get answeredCount(): number {
    let count = 0;
    this.answers.forEach(v => { if (v !== null) count++; });
    return count;
  }

  selectOption(opt: 'A' | 'B' | 'C' | 'D'): void {
    if (this.submitted || !this.currentQuestion) return;
    this.answers.set(this.currentQuestion.id, opt);
  }

  getSelected(): 'A' | 'B' | 'C' | 'D' | null {
    return this.currentQuestion ? (this.answers.get(this.currentQuestion.id) ?? null) : null;
  }

  goTo(index: number): void {
    if (index >= 0 && index < (this.quiz?.questions.length ?? 0)) {
      this.currentIndex = index;
    }
  }

  prev(): void { this.goTo(this.currentIndex - 1); }
  next(): void { this.goTo(this.currentIndex + 1); }

  isAnswered(index: number): boolean {
    const q = this.quiz?.questions[index];
    return q ? this.answers.get(q.id) !== null : false;
  }

  // ── Timer ──────────────────────────────────────────────────────────────────

  startTimer(): void {
    this.timerInterval = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        this.submitQuiz();
      }
    }, 1000);
  }

  get timerDisplay(): string {
    const m = Math.floor(this.timeLeft / 60).toString().padStart(2, '0');
    const s = (this.timeLeft % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  get timerWarning(): boolean { return this.timeLeft < 60; }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async submitQuiz(): Promise<void> {
    if (this.submitting || this.submitted || !this.quiz) return;
    clearInterval(this.timerInterval);
    this.submitting = true;

    const user = this.auth.currentUser!;
    const totalMarks = this.quiz.questions.reduce((s, q) => s + q.marks, 0);

    let marksEarned = 0;
    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    const detailedAnswers: QuizAnswer[] = this.quiz.questions.map(q => {
      const selected = this.answers.get(q.id) ?? null;
      const isCorrect = selected === q.correctAnswer;
      const earned = isCorrect ? q.marks : 0;

      if (selected === null) skipped++;
      else if (isCorrect) { correct++; marksEarned += earned; }
      else wrong++;

      return {
        questionId: q.id,
        selectedOption: selected,
        isCorrect,
        marksEarned: earned
      };
    });

    const result: AttendeeResult = {
      email: user.email,
      name: user.name,
      quizId: this.quiz.id,
      quizTitle: this.quiz.title,
      attemptedAt: new Date().toISOString(),
      totalQuestions: this.quiz.questions.length,
      attempted: correct + wrong,
      correct,
      wrong,
      skipped,
      totalMarks,
      marksEarned,
      percentage: totalMarks > 0 ? (marksEarned / totalMarks) * 100 : 0,
      answers: detailedAnswers
    };

    try {
      await this.quizService.saveAttendeeResult(result);
      this.saveToHistory(result);
    } catch (e: any) {
      console.error('Failed to save result to GitHub:', e);
      alert('Note: Your result could not be saved to the server (GitHub). However, it has been saved to your local history.');
      this.saveToHistory(result);
    }

    // Store result in session for results page
    sessionStorage.setItem('quiz_result', JSON.stringify(result));
    this.submitted = true;
    this.submitting = false;
    this.router.navigate(['/results', this.quiz.id]);
  }

  private saveToHistory(result: AttendeeResult): void {
    try {
      const historyRaw = localStorage.getItem('quiz_history') || '[]';
      const history: AttendeeResult[] = JSON.parse(historyRaw);
      // Keep only latest 10 attempts to avoid filling localStorage
      history.unshift(result);
      if (history.length > 10) history.pop();
      localStorage.setItem('quiz_history', JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save to local history:', e);
    }
  }

  ngOnDestroy(): void {
    clearInterval(this.timerInterval);
  }
}
