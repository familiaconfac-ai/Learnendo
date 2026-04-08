// ── Learnendo Battle — shared types ───────────────────────────────────────────

export type BattleDifficulty = 'easy' | 'normal' | 'hard';
export type BattleScope = 'current-lesson' | 'current-book' | 'review';
export type BattleStatus = 'idle' | 'lobby' | 'active' | 'showing-answer' | 'finished';

export interface BattleConfig {
  scope: BattleScope;
  difficulty: BattleDifficulty;
  questionCount: number;           // UI offers 5/10/20 but editor can trim to any count
  timePerQuestion: 5 | 10 | 15; // seconds
  courseId?: string;
  workbookId?: number;
  lessonId?: string;
}

export interface BattleQuestion {
  id: string;
  text: string;          // question / prompt shown to students
  options: string[];      // always 4 choices for MVP
  correctIndex: number;   // 0-based index into options
  hint?: string;          // optional extra context
  imageUrl?: string;      // optional image thumbnail shown in editor & question card
}

export interface BattleParticipant {
  uid: string;
  name: string;
  score: number;
  streak: number;
  lastAnswerCorrect: boolean | null;
}

export interface BattleAnswer {
  uid: string;
  name: string;
  optionIndex: number;
  answeredAt: number; // Date.now() ms
}

export interface BattleSession {
  id: string;               // classId for now
  status: BattleStatus;
  config: BattleConfig;
  questions: BattleQuestion[];
  currentQuestionIndex: number;
  questionStartedAt: number; // timestamp ms
  scores: Record<string, BattleParticipant>;
  // answers for the CURRENT question: uid → BattleAnswer
  currentAnswers: Record<string, BattleAnswer>;
  createdAt: number;
  updatedAt: number;
}
