import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ExcelService } from '../../services/excel.service';
import { AttendeeResult } from '../../models/quiz.models';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss']
})
export class ResultsComponent implements OnInit {
  result: AttendeeResult | null = null;
  quizId = '';
  history: AttendeeResult[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private excel: ExcelService
  ) {}

  ngOnInit(): void {
    this.quizId = this.route.snapshot.paramMap.get('id')!;
    const raw = sessionStorage.getItem('quiz_result');
    if (raw) {
      this.result = JSON.parse(raw);
    } else {
      this.router.navigate(['/dashboard']);
    }

    try {
      const historyRaw = localStorage.getItem('quiz_history');
      if (historyRaw) {
        this.history = JSON.parse(historyRaw);
      }
    } catch {
      this.history = [];
    }
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
