import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ExcelService } from '../../services/excel.service';
import { QuizService } from '../../services/quiz.service';
import { AttendeeResult, Quiz } from '../../models/quiz.models';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss']
})
export class ResultsComponent implements OnInit, OnDestroy {
  result: AttendeeResult | null = null;
  quiz: Quiz | null = null;
  quizId = '';
  history: AttendeeResult[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private excel: ExcelService,
    private quizService: QuizService
  ) {}

  ngOnInit(): void {
    this.quizId = this.route.snapshot.paramMap.get('id')!;
    const raw = sessionStorage.getItem('quiz_result');
    if (raw) {
      this.result = JSON.parse(raw);
    } else {
      this.router.navigate(['/dashboard']);
      return;
    }

    try {
      const historyRaw = localStorage.getItem('quiz_history');
      if (historyRaw) {
        this.history = JSON.parse(historyRaw);
      }
    } catch {
      this.history = [];
    }

    // Load the quiz to get full question details
    this.loadQuizDetails();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadQuizDetails(): Promise<void> {
    if (!this.result) return;
    try {
      this.quiz = await this.quizService.getQuiz(this.result.quizId);
    } catch (error) {
      console.error('Failed to load quiz details:', error);
    }
  }

  getAnswerForQuestion(questionId: string) {
    return this.result?.answers?.find(a => a.questionId === questionId);
  }

  isSelectedOption(questionId: string, optionId: string): boolean {
    const ans = this.getAnswerForQuestion(questionId);
    return !!(ans?.selectedOptionIds && ans.selectedOptionIds.includes(optionId));
  }

  isCorrectOption(questionId: string, optionId: string): boolean {
    const q = this.quiz?.questions.find(item => item.questionId === questionId);
    return !!(q?.correctAnswers && q.correctAnswers.includes(optionId));
  }

  getOptionState(questionId: string, optionId: string): 'correct-selected' | 'wrong-selected' | 'correct-unselected' | 'normal' {
    const selected = this.isSelectedOption(questionId, optionId);
    const correct = this.isCorrectOption(questionId, optionId);

    if (selected && correct) return 'correct-selected';
    if (selected && !correct) return 'wrong-selected';
    if (!selected && correct) return 'correct-unselected';
    return 'normal';
  }

  isInputCorrect(questionId: string): boolean {
    const ans = this.getAnswerForQuestion(questionId);
    return !!ans?.isCorrect;
  }

  get grade(): string {
    return this.getGrade(this.result?.percentage ?? 0);
  }

  get gradeClass(): string {
    return this.getGradeClass(this.result?.percentage ?? 0);
  }

  getGrade(pct: number): string {
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    return 'F';
  }

  getGradeClass(pct: number): string {
    if (pct >= 70) return 'grade-pass';
    if (pct >= 50) return 'grade-average';
    return 'grade-fail';
  }

  get passed(): boolean {
    return (this.result?.percentage ?? 0) >= 50;
  }

  downloadMyResult(): void {
    if (!this.result) return;
    const bytes = this.excel.generateAttendeesExcel([this.result]);
    this.excel.downloadBytes(bytes, `my-result-${this.quizId}.xlsx`);
  }

  goToDashboard(): void {
    sessionStorage.removeItem('quiz_result');
    this.router.navigate(['/dashboard']);
  }
}
