import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GithubService } from './github.service';
import { ExcelService } from './excel.service';
import { ActivityService } from './activity.service';
import { environment } from '../../environments/environment';
import { Quiz, AttendeeResult } from '../models/quiz.models';

@Injectable({ providedIn: 'root' })
export class QuizService {
  private readonly BASE = environment.github.basePath;

  private quizzesSubject = new BehaviorSubject<Quiz[]>([]);
  quizzes$ = this.quizzesSubject.asObservable();

  constructor(
    private github: GithubService,
    private excel: ExcelService
    , private activity: ActivityService
  ) {}

  // ── Quiz Listing ───────────────────────────────────────────────────────────

  async loadQuizzes(): Promise<void> {
    const dirs = await this.github.listDir(this.BASE);
    const quizDirs = dirs.filter(d => d.type === 'dir');

    const quizzes: Quiz[] = [];
    for (const dir of quizDirs) {
      const metaPath = `${dir.path}/quiz.json`;
      const file = await this.github.getFile(metaPath);
      if (file) {
        try {
          const raw = JSON.parse(this.github.decodeBase64(file.content));
          const quiz: Quiz = this.migrateLegacyQuiz(raw);
          quizzes.push(quiz);
        } catch { /* skip malformed */ }
      }
    }
    this.quizzesSubject.next(quizzes);
  }

  async getQuiz(quizId: string): Promise<Quiz | null> {
    const metaPath = `${this.BASE}/${quizId}/quiz.json`;
    const file = await this.github.getFile(metaPath);
    if (!file) return null;
    const raw = JSON.parse(this.github.decodeBase64(file.content));
    return this.migrateLegacyQuiz(raw);
  }

  async getQuizByCode(code: string): Promise<Quiz | null> {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return null;
    let quizzes = this.quizzesSubject.value;
    if (!quizzes.length) {
      await this.loadQuizzes();
      quizzes = this.quizzesSubject.value;
    }
    const found = quizzes.find(q => (q.code || '').trim().toUpperCase() === cleanCode);
    return found ?? null;
  }

  async relinkQuizCode(targetQuizId: string, existingCode: string): Promise<void> {
    const cleanCode = existingCode.trim().toUpperCase();
    if (!cleanCode) throw new Error('Code cannot be empty');
    
    let quizzes = this.quizzesSubject.value;
    if (!quizzes.length) {
      await this.loadQuizzes();
      quizzes = this.quizzesSubject.value;
    }
    
    const targetQuiz = quizzes.find(q => q.id === targetQuizId);
    if (!targetQuiz) throw new Error('Target quiz not found');

    targetQuiz.code = cleanCode;
    await this.uploadQuiz(targetQuiz);
  }

  // ── Upload Quiz ────────────────────────────────────────────────────────────

  async uploadQuiz(quiz: Quiz): Promise<void> {
    const metaPath = `${this.BASE}/${quiz.id}/quiz.json`;
    const existing = await this.github.getFile(metaPath);

    // Ensure minimal metadata
    const now = new Date().toISOString();
    quiz.createdAt = quiz.createdAt || now;
    quiz.updatedAt = now;
    if (!quiz.code) quiz.code = this.generateQuizCode();

    await this.github.putFile(
      metaPath,
      this.github.encodeBase64(JSON.stringify(quiz, null, 2)),
      `Add quiz: ${quiz.title}`,
      existing?.sha
    );

    // Initialise empty attendees file
    const attendeesPath = `${this.BASE}/${quiz.id}/attendees.xlsx`;
    const existingAttendees = await this.github.getFile(attendeesPath);
    if (!existingAttendees) {
      const emptyBytes = this.excel.generateAttendeesExcel([]);
      await this.github.putFile(
        attendeesPath,
        this.github.encodeBinaryBase64(emptyBytes),
        `Init attendees for: ${quiz.title}`
      );
    }

    // Refresh list
    await this.loadQuizzes();
  }

  // ── Migration helpers ─────────────────────────────────────────────────────

  generateDeterministicCode(str: string): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    let code = '';
    hash = Math.abs(hash);
    for (let i = 0; i < 6; i++) {
      code += chars[(hash + i * 7) % chars.length];
    }
    return code;
  }

  migrateLegacyQuiz(raw: any): Quiz {
    if (!raw) return raw;
    const quizId = raw.id || (raw.title && this.slugify(raw.title)) || 'unknown';
    const code = raw.code || this.generateDeterministicCode(quizId);

    if (raw.questions && raw.questions.length && raw.questions[0].optionA !== undefined) {
      const questions = raw.questions.map((q: any, idx: number) => ({
        questionId: (q.id ?? idx).toString(),
        questionText: q.question || q.questionText || '',
        questionType: 'single_choice' as const,
        options: [
          { id: 'A', text: q.optionA || '' },
          { id: 'B', text: q.optionB || '' },
          { id: 'C', text: q.optionC || '' },
          { id: 'D', text: q.optionD || '' }
        ],
        correctAnswers: [q.correctAnswer],
        marks: q.marks || 1
      }));

      return {
        id: quizId,
        title: raw.title || '',
        description: raw.description,
        code: code,
        invigilatorId: raw.invigilatorId || null,
        questions,
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: raw.updatedAt || new Date().toISOString(),
        githubPath: raw.githubPath
      } as Quiz;
    }

    // Assume already in new shape but guarantee code exists
    return {
      ...raw,
      id: quizId,
      code: code
    } as Quiz;
  }

  generateQuizCode(len = 6): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  // ── Attendees ──────────────────────────────────────────────────────────────

  async getAttendees(quizId: string): Promise<AttendeeResult[]> {
    const path = `${this.BASE}/${quizId}/attendees.xlsx`;
    const file = await this.github.getFile(path);
    if (!file) return [];
    const bytes = this.github.decodeBinaryBase64(file.content);
    return this.excel.parseAttendeesExcel(bytes);
  }

  async saveAttendeeResult(result: AttendeeResult): Promise<void> {
    const path = `${this.BASE}/${result.quizId}/attendees.xlsx`;

    // Load existing attendees
    const file = await this.github.getFile(path);
    let attendees: AttendeeResult[] = [];
    if (file) {
      const bytes = this.github.decodeBinaryBase64(file.content);
      attendees = this.excel.parseAttendeesExcel(bytes);
    }

    // If this is a test-mode attempt, do not persist (per spec)
    if (result.isTestMode) {
      return;
    }

    // Enforce single submission per candidate per quiz
    const existing = attendees.find(a => a.email === result.email);
    if (existing) {
      throw new Error('User has already submitted this quiz and multiple submissions are not allowed');
    }

    attendees.push(result);

    const updatedBytes = this.excel.generateAttendeesExcel(attendees);
    await this.github.putFile(
      path,
      this.github.encodeBinaryBase64(updatedBytes),
      `Update attendees for quiz: ${result.quizId} — ${result.email}`,
      file?.sha
    );

    // Log activity
    try {
      await this.activity.log({
        actorEmail: result.email,
        actorRole: 'candidate',
        actionType: 'QUIZ_ATTEMPTED',
        targetId: result.quizId,
        targetType: 'quiz',
        description: `${result.email} attempted quiz ${result.quizId}`
      });
    } catch {
      // Ignore activity logging failures
    }
  }

  async deleteQuiz(quizId: string): Promise<void> {
    const metaPath = `${this.BASE}/${quizId}/quiz.json`;
    const attendeesPath = `${this.BASE}/${quizId}/attendees.xlsx`;

    const metaFile = await this.github.getFile(metaPath);
    if (metaFile) {
      await this.github.deleteFile(metaPath, metaFile.sha, `Delete quiz: ${quizId}`);
    }

    const attendeesFile = await this.github.getFile(attendeesPath);
    if (attendeesFile) {
      await this.github.deleteFile(attendeesPath, attendeesFile.sha, `Delete attendees for: ${quizId}`);
    }

    // Refresh list
    await this.loadQuizzes();
  }

  /**
   * Migrate existing quizzes and rewrite metadata using `migrateLegacyQuiz`.
   * This will read every quiz.json and re-save the migrated shape back to GitHub.
   */
  async migrateAndRewriteAllQuizzes(): Promise<void> {
    const dirs = await this.github.listDir(this.BASE);
    const quizDirs = dirs.filter(d => d.type === 'dir');
    for (const dir of quizDirs) {
      const metaPath = `${dir.path}/quiz.json`;
      const file = await this.github.getFile(metaPath);
      if (!file) continue;
      try {
        const raw = JSON.parse(this.github.decodeBase64(file.content));
        const migrated = this.migrateLegacyQuiz(raw);
        await this.github.putFile(metaPath, this.github.encodeBase64(JSON.stringify(migrated, null, 2)), `Migrate quiz: ${migrated.id}`, file.sha);
      } catch {
        // skip malformed
      }
    }
    // refresh local list
    await this.loadQuizzes();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
