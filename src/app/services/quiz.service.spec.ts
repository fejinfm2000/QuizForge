import { QuizService } from './quiz.service';
import { GithubService } from './github.service';
import { ExcelService } from './excel.service';
import { ActivityService } from './activity.service';
import { AttendeeResult } from '../models/quiz.models';

class MockGithub {
  private files: Record<string, any> = {};
  async getFile(path: string) {
    return this.files[path] ?? null;
  }
  async putFile(path: string, content: string, message: string, sha?: string) {
    this.files[path] = { content, sha: 'sha1' };
  }
  encodeBinaryBase64(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)); }
  decodeBinaryBase64(b64: string) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }
}

class MockExcel {
  generateAttendeesExcel(results: AttendeeResult[]): Uint8Array {
    const s = JSON.stringify(results);
    const arr = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) arr[i] = s.charCodeAt(i);
    return arr;
  }
  parseAttendeesExcel(bytes: Uint8Array): AttendeeResult[] {
    try {
      const s = String.fromCharCode(...Array.from(bytes));
      return JSON.parse(s || '[]');
    } catch {
      return [];
    }
  }
}

class MockActivity { async log(e: any) {} }

describe('QuizService', () => {
  it('should reject duplicate attendee submissions', async () => {
    const gh = new MockGithub() as any as GithubService;
    const ex = new MockExcel() as any as ExcelService;
    const act = new MockActivity() as any as ActivityService;
    const service = new QuizService(gh, ex, act as any);

    const result: AttendeeResult = {
      email: 'a@b.com', name: 'A', quizId: 'quiz1', quizTitle: 'Quiz1', attemptedAt: new Date().toISOString(),
      totalQuestions: 1, attempted: 1, correct: 1, wrong: 0, skipped: 0, totalMarks: 1, marksEarned: 1, percentage: 100, answers: []
    };

    // first save should succeed
    await service.saveAttendeeResult(result);

    // second save should throw
    let thrown = false;
    try { await service.saveAttendeeResult(result); } catch (e) { thrown = true; }
    expect(thrown).toBe(true);
  });
});
