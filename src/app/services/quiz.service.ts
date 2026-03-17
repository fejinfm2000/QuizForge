import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GithubService } from './github.service';
import { ExcelService } from './excel.service';
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
          const quiz: Quiz = JSON.parse(this.github.decodeBase64(file.content));
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
    return JSON.parse(this.github.decodeBase64(file.content));
  }

  // ── Upload Quiz ────────────────────────────────────────────────────────────

  async uploadQuiz(quiz: Quiz): Promise<void> {
    const metaPath = `${this.BASE}/${quiz.id}/quiz.json`;
    const existing = await this.github.getFile(metaPath);

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

    // Remove any previous attempt by same email for this quiz (keep latest)
    attendees = attendees.filter(a => a.email !== result.email);
    attendees.push(result);

    const updatedBytes = this.excel.generateAttendeesExcel(attendees);
    await this.github.putFile(
      path,
      this.github.encodeBinaryBase64(updatedBytes),
      `Update attendees for quiz: ${result.quizId} — ${result.email}`,
      file?.sha
    );
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

  // ── Helpers ────────────────────────────────────────────────────────────────

  slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
