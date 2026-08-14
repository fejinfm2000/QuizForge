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
      'QuestionType (single_choice|multi_choice|input_box)',
      'Options (semicolon-separated for choices)',
      'Correct Answers (semicolon/comma-separated option ids)',
      'MaxLength (for input_box)',
      'CorrectAnswerText (for input_box)',
      'Marks'
    ];

    const sample = [
      ['What is the capital of France?', 'single_choice', 'A) London;B) Paris;C) Berlin;D) Madrid', 'B', '', '', 1],
      ['Which of the following are programming languages?', 'multi_choice', 'A) Python;B) HTML;C) Java;D) Photoshop', 'A;C', '', '', 2],
      ['Name the protocol used for web requests', 'input_box', '', '', 100, 'HTTP', 1]
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

          // Skip header row and support legacy template
          const questions: QuizQuestion[] = rows
            .slice(1)
            .filter(r => r[0]) // skip empty rows
            .map((r, i) => {
              const firstData = String(r[1] ?? '').trim();
              // Detect legacy (Option A..D in columns) if second column doesn't contain a questionType
              const isLegacy = ['single_choice','multi_choice','input_box'].indexOf(firstData) === -1 && (r[1] !== undefined && r[2] !== undefined && r[3] !== undefined && r[4] !== undefined);

              if (isLegacy) {
                // legacy mapping
                const opts = [
                  { id: 'A', text: String(r[1] ?? '').trim() },
                  { id: 'B', text: String(r[2] ?? '').trim() },
                  { id: 'C', text: String(r[3] ?? '').trim() },
                  { id: 'D', text: String(r[4] ?? '').trim() }
                ];
                return {
                  questionId: `q-${i+1}`,
                  questionText: String(r[0] ?? '').trim(),
                  questionType: 'single_choice',
                  options: opts,
                  correctAnswers: [String(r[5] ?? 'A').trim().toUpperCase()],
                  marks: Number(r[6]) || 1
                } as QuizQuestion;
              }

              // New template mapping
              const questionText = String(r[0] ?? '').trim();
              const questionType = (String(r[1] ?? 'single_choice').trim() || 'single_choice') as any;
              const optionsRaw = String(r[2] ?? '').trim();
              const options = optionsRaw ? optionsRaw.split(/;|\|/).map((s, idx) => {
                const parts = s.split(')');
                if (parts.length > 1) return { id: parts[0].trim(), text: parts.slice(1).join(')').trim() };
                return { id: String(idx+1), text: s.trim() };
              }) : undefined;

              const correctRaw = String(r[3] ?? '').trim();
              const correctAnswers = correctRaw ? correctRaw.split(/[,;]\s*/).map((s: string) => s.trim()) : undefined;

              const maxLength = Number(r[4]) || undefined;
              const correctAnswerText = String(r[5] ?? '').trim() || undefined;
              const marks = Number(r[6]) || 1;

              return {
                questionId: `q-${i+1}`,
                questionText,
                questionType,
                options,
                correctAnswers,
                maxLength,
                correctAnswerText,
                marks
              } as QuizQuestion;
            });

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
