import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { QuizQuestion, AttendeeResult } from '../models/quiz.models';

@Injectable({ providedIn: 'root' })
export class ExcelService {

  // ── Template Generation ────────────────────────────────────────────────────

  /** Download a blank quiz template for the admin to fill */
  downloadQuizTemplate(): void {
    const headers = [
      'Question',
      'Option A',
      'Option B',
      'Option C',
      'Option D',
      'Correct Answer (A/B/C/D)',
      'Marks'
    ];

    const sample = [
      ['What is the capital of France?', 'London', 'Paris', 'Berlin', 'Madrid', 'B', 1],
      ['2 + 2 = ?', '3', '4', '5', '6', 'B', 1]
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);

    // Column widths
    ws['!cols'] = [{ wch: 50 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 8 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    XLSX.writeFile(wb, 'quiz-template.xlsx');
  }

  // ── Parse Uploaded Quiz Excel ──────────────────────────────────────────────

  parseQuizExcel(file: File): Promise<QuizQuestion[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

          // Skip header row
          const questions: QuizQuestion[] = rows
            .slice(1)
            .filter(r => r[0]) // skip empty rows
            .map((r, i) => ({
              id: i + 1,
              question: String(r[0] ?? '').trim(),
              optionA: String(r[1] ?? '').trim(),
              optionB: String(r[2] ?? '').trim(),
              optionC: String(r[3] ?? '').trim(),
              optionD: String(r[4] ?? '').trim(),
              correctAnswer: String(r[5] ?? 'A').trim().toUpperCase() as 'A' | 'B' | 'C' | 'D',
              marks: Number(r[6]) || 1
            }));

          if (questions.length === 0) {
            reject(new Error('No questions found. Check the template format.'));
          } else {
            resolve(questions);
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsArrayBuffer(file);
    });
  }

  // ── Generate Attendees Excel ───────────────────────────────────────────────

  generateAttendeesExcel(results: AttendeeResult[]): Uint8Array {
    const headers = [
      'Email',
      'Name',
      'Quiz Title',
      'Attempted At',
      'Total Questions',
      'Attempted',
      'Correct',
      'Wrong',
      'Skipped',
      'Total Marks',
      'Marks Earned',
      'Percentage (%)',
      'Grade'
    ];

    const rows = results.map(r => [
      r.email,
      r.name,
      r.quizTitle,
      new Date(r.attemptedAt).toLocaleString(),
      r.totalQuestions,
      r.attempted,
      r.correct,
      r.wrong,
      r.skipped,
      r.totalMarks,
      r.marksEarned,
      r.percentage.toFixed(2),
      this.grade(r.percentage)
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    ws['!cols'] = [
      { wch: 30 }, { wch: 20 }, { wch: 25 }, { wch: 22 },
      { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 8 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Attendees');
    const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Uint8Array(wbOut);
  }

  /** Parse attendees Excel (binary) back to AttendeeResult[] */
  parseAttendeesExcel(bytes: Uint8Array): AttendeeResult[] {
    const wb = XLSX.read(bytes, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

    return rows.slice(1).filter(r => r[0]).map(r => ({
      email: String(r[0] ?? ''),
      name: String(r[1] ?? ''),
      quizId: '',
      quizTitle: String(r[2] ?? ''),
      attemptedAt: String(r[3] ?? ''),
      totalQuestions: Number(r[4]) || 0,
      attempted: Number(r[5]) || 0,
      correct: Number(r[6]) || 0,
      wrong: Number(r[7]) || 0,
      skipped: Number(r[8]) || 0,
      totalMarks: Number(r[9]) || 0,
      marksEarned: Number(r[10]) || 0,
      percentage: Number(r[11]) || 0,
      answers: []
    }));
  }

  /** Trigger browser download */
  downloadBytes(bytes: Uint8Array, filename: string): void {
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private grade(pct: number): string {
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    return 'F';
  }
}
