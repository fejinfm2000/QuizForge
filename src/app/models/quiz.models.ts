// ── Quiz Models ────────────────────────────────────────────────────────────────

export interface QuizQuestion {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  marks: number;
}

export interface Quiz {
  id: string;           // derived from the Excel filename (slug)
  title: string;
  description?: string;
  questions: QuizQuestion[];
  createdAt: string;
  githubPath: string;   // path inside the repo  e.g. quizzes/my-quiz/quiz.json
  attendeesPath: string; // e.g. quizzes/my-quiz/attendees.xlsx
}

// ── Attendee / Result Models ───────────────────────────────────────────────────

export interface QuizAnswer {
  questionId: number;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
  isCorrect: boolean;
  marksEarned: number;
}

export interface AttendeeResult {
  email: string;
  name: string;
  quizId: string;
  quizTitle: string;
  attemptedAt: string;       // ISO date string
  totalQuestions: number;
  attempted: number;
  correct: number;
  wrong: number;
  skipped: number;
  totalMarks: number;
  marksEarned: number;
  percentage: number;
  answers: QuizAnswer[];
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export interface User {
  email: string;
  name: string;
  isAdmin?: boolean;
}

// ── GitHub API helpers ─────────────────────────────────────────────────────────

export interface GitHubFileContent {
  sha: string;
  content: string;   // base64
  encoding: string;
}

export interface GitHubPutPayload {
  message: string;
  content: string;  // base64
  sha?: string;     // required for updates
  branch: string;
}
