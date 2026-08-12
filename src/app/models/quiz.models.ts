// ── Quiz Models ────────────────────────────────────────────────────────────────

export type QuestionType = 'single_choice' | 'multi_choice' | 'input_box';

export interface QuestionOption {
  id: string;         // option id e.g. 'A', 'B' or UUID
  text: string;
}

export interface QuizQuestion {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  options?: QuestionOption[];           // for choice questions
  correctAnswers?: string[];            // option ids for single/multi choice
  maxLength?: number;                   // for input_box
  correctAnswerText?: string;           // expected text for input_box (for auto-grading)
  marks?: number;
}

export interface Quiz {
  id: string;           // derived from the Excel filename (slug)
  title: string;
  description?: string;
  code?: string;        // unique quiz code used by candidates
  invigilatorId?: string | null;
  questions: QuizQuestion[];
  createdAt: string;
  updatedAt?: string;
  githubPath?: string;   // path inside the repo  e.g. quizzes/my-quiz/quiz.json
  attendeesPath?: string;
}

// ── Attendee / Result Models ───────────────────────────────────────────────────

export interface QuizAnswer {
  questionId: string;
  selectedOptionIds?: string[]; // for choice types
  textAnswer?: string;          // for input_box
  isCorrect?: boolean;
  marksEarned?: number;
}

export interface AttendeeResult {
  attemptId?: string;
  email: string;
  name: string;
  quizId: string;
  quizTitle?: string;
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
  isTestMode?: boolean;
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export type UserRole = 'candidate' | 'invigilator' | 'admin';

export interface User {
  userId?: string;
  email: string;
  name?: string;
  role?: UserRole;
  invigilatorCode?: string | null; // for invigilators
  createdAt?: string;
}

// Activity / Audit log
export interface ActivityEntry {
  activityId: string;
  timestamp: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: UserRole;
  actionType: string;
  targetId?: string;
  targetType?: string;
  description?: string;
}

// Attempt model (lightweight)
export interface Attempt {
  attemptId: string;
  quizId: string;
  candidateEmail: string;
  answers: QuizAnswer[];
  score?: number;
  submittedAt?: string;
  isTestMode?: boolean;
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
