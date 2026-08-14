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
  isTestMode = false;
  alreadyAttempted = false;
  previousAttempt: AttendeeResult | null = null;

  // Quiz state
  currentIndex = 0;
  answers: Map<string, { selectedOptionIds?: string[]; textAnswer?: string }> = new Map();
  submitted = false;
  submitting = false;


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: QuizService,
    private auth: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id')!;
    // read test mode flag from query params
    const testParam = this.route.snapshot.queryParamMap.get('test');
    this.isTestMode = testParam === 'true' || testParam === '1';
    try {
      this.quiz = await this.quizService.getQuiz(id);
      if (!this.quiz) {
        this.error = 'Quiz not found.';
      } else {
        // Init answers map for each question
        this.quiz.questions.forEach(q => this.answers.set(q.questionId, {}));
        
        // Check if user has already attempted this quiz
        this.checkPreviousAttempt(id);
      }
    } catch (e: any) {
      this.error = e?.message ?? 'Failed to load quiz.';
    } finally {
      this.loading = false;
    }
  }

  private checkPreviousAttempt(quizId: string): void {
    try {
      const historyRaw = localStorage.getItem('quiz_history');
      if (!historyRaw) return;

      const history: AttendeeResult[] = JSON.parse(historyRaw);
      const currentUserEmail = this.auth.currentUser?.email;
      
      const previousAttempt = history.find(
        h => h.quizId === quizId && h.email === currentUserEmail && !h.isTestMode
      );

      if (previousAttempt) {
        this.alreadyAttempted = true;
        this.previousAttempt = previousAttempt;
      }
    } catch (error) {
      console.error('Failed to check previous attempts:', error);
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
    this.quiz?.questions.forEach(q => {
      const a = this.answers.get(q.questionId);
      if (!a) return;
      if (q.questionType === 'input_box') { if (a.textAnswer && a.textAnswer.trim().length) count++; }
      else { if (a.selectedOptionIds && a.selectedOptionIds.length) count++; }
    });
    return count;
  }

  // Single choice select
  selectSingle(optId: string): void {
    if (this.submitted || !this.currentQuestion) return;
    this.answers.set(this.currentQuestion.questionId, { selectedOptionIds: [optId] });
  }

  // Multi choice toggle
  toggleMulti(optId: string): void {
    if (this.submitted || !this.currentQuestion) return;
    const qid = this.currentQuestion.questionId;
    const cur = this.answers.get(qid) || {};
    const set = new Set(cur.selectedOptionIds || []);
    if (set.has(optId)) set.delete(optId); else set.add(optId);
    this.answers.set(qid, { ...cur, selectedOptionIds: Array.from(set) });
  }

  setTextAnswer(value: string): void {
    if (this.submitted || !this.currentQuestion) return;
    this.answers.set(this.currentQuestion.questionId, { textAnswer: value });
  }

  getSelectedForCurrent(): string[] {
    const q = this.currentQuestion;
    if (!q) return [];
    const a = this.answers.get(q.questionId);
    return a?.selectedOptionIds ?? [];
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
    if (!q) return false;
    const a = this.answers.get(q.questionId);
    if (!a) return false;
    if (q.questionType === 'input_box') return !!(a.textAnswer && a.textAnswer.trim().length);
    return !!(a.selectedOptionIds && a.selectedOptionIds.length);
  }



  // ── Submit ─────────────────────────────────────────────────────────────────

  async submitQuiz(): Promise<void> {
    if (this.submitting || this.submitted || !this.quiz) return;
    // No timer behavior — quizzes are untimed per spec
    this.submitting = true;

    const user = this.auth.currentUser!;
    const totalMarks = this.quiz.questions.reduce((s, q) => s + (q.marks || 0), 0);

    let marksEarned = 0;
    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    const detailedAnswers: QuizAnswer[] = this.quiz.questions.map(q => {
      const a = this.answers.get(q.questionId) || {};
      let isCorrect = false;
      let earned = 0;

      if (q.questionType === 'single_choice') {
        const sel = a.selectedOptionIds ? a.selectedOptionIds[0] : undefined;
        if (!sel) skipped++;
        else {
          if (q.correctAnswers && q.correctAnswers.includes(sel)) { isCorrect = true; earned = q.marks || 0; correct++; marksEarned += earned; }
          else { wrong++; }
        }
        return { questionId: q.questionId, selectedOptionIds: sel ? [sel] : [], isCorrect, marksEarned: earned } as QuizAnswer;
      }

      if (q.questionType === 'multi_choice') {
        const sels = a.selectedOptionIds || [];
        if (!sels.length) skipped++;
        else {
          const correctSet = new Set(q.correctAnswers || []);
          const selSet = new Set(sels);
          const equal = sels.length === (q.correctAnswers || []).length && sels.every(s => correctSet.has(s));
          if (equal) { isCorrect = true; earned = q.marks || 0; correct++; marksEarned += earned; }
          else { wrong++; }
        }
        return { questionId: q.questionId, selectedOptionIds: sels, isCorrect, marksEarned: earned } as QuizAnswer;
      }

      // input_box
      const text = (a.textAnswer || '').trim();
      if (!text) skipped++;
      else if (q.correctAnswerText && q.correctAnswerText.trim().toLowerCase() === text.toLowerCase()) {
        isCorrect = true; earned = q.marks || 0; correct++; marksEarned += earned;
      } else { wrong++; }
      return { questionId: q.questionId, textAnswer: text, isCorrect, marksEarned: earned } as QuizAnswer;
    });

    const result: AttendeeResult = {
      email: user.email,
      name: user.name || user.email,
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
      answers: detailedAnswers,
      isTestMode: this.isTestMode
    };

    try {
      await this.quizService.saveAttendeeResult(result);
      this.saveToHistory(result);
    } catch (e: any) {
      console.error('Failed to save result to GitHub or duplicate submission:', e);
      if (e?.message && e.message.includes('already submitted')) {
        alert('You have already submitted this quiz — multiple submissions are not allowed.');
      } else {
        alert('Note: Your result could not be saved to the server (GitHub). However, it has been saved to your local history.');
      }
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

}
