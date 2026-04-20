// ── Learnendo Battle — shared types ───────────────────────────────────────────

export type BattleDifficulty = 'easy' | 'normal' | 'hard';
export type BattleScope = 'current-lesson' | 'current-book' | 'review';
export type BattleStatus = 'idle' | 'lobby' | 'active' | 'showing-answer' | 'finished';
export type BattleQuestionKind = 'multiple-choice' | 'image-choice' | 'audio-choice' | 'audio-open' | 'speaking';

export interface BattleConfig {
  scope: BattleScope;
  difficulty: BattleDifficulty;
  questionCount: number;           // UI offers 5/10/20 but editor can trim to any count
  timePerQuestion: 5 | 10 | 15; // seconds
  includeTeacher?: boolean;
  botEnabled?: boolean;
  botAvatarId?: string;
  botName?: string;
  courseId?: string;
  workbookId?: number;
  lessonId?: string;
}

export interface BattleQuestion {
  id: string;
  kind: BattleQuestionKind;
  text: string;          // question / prompt shown to students
  options?: string[];      // multiple-choice options when applicable
  correctIndex?: number;   // 0-based index into options
  correctIndexes?: number[]; // allows one or more correct alternatives
  correctText?: string;    // expected free-text answer for audio / speaking
  acceptedAnswers?: string[]; // normalized accepted answer variants
  hint?: string;          // optional extra context
  imageUrl?: string;      // optional image thumbnail shown in editor & question card
  promptAudioText?: string; // text spoken via TTS when the question starts
  playAudioOnce?: boolean;  // audio prompt can only be heard once in battle
}

export interface SavedBattleTemplate {
  id: string;
  title: string;
  createdAt: string;
  config: BattleConfig;
  questions: BattleQuestion[];
}

export interface BattleParticipant {
  uid: string;
  name: string;
  score: number;
  streak: number;
  lastAnswerCorrect: boolean | null;
  avatarId?: string;
  isBot?: boolean;
}

export interface BattleRosterParticipant {
  uid: string;
  name: string;
  joinedAt: number;
  avatarId?: string;
  isBot?: boolean;
}

export interface BattleAnswer {
  uid: string;
  name: string;
  optionIndex?: number;
  optionIndexes?: number[];
  responseText?: string;
  isCorrect: boolean;
  answeredAt: number;  // Date.now() ms
  elapsedMs?: number;  // ms from questionStartedAt → answeredAt (for speed ranking)
  roundPoints?: number; // points earned in this round only
  frozenTimeLeft?: number;
}

export interface BattleSession {
  id: string;               // classId for now
  status: BattleStatus;
  config: BattleConfig;
  questions: BattleQuestion[];
  currentQuestionIndex: number;
  questionStartedAt: number; // timestamp ms
  participants?: Record<string, BattleRosterParticipant>;
  roundParticipantIds?: string[];
  scores: Record<string, BattleParticipant>;
  // answers for the CURRENT question: uid → BattleAnswer
  currentAnswers: Record<string, BattleAnswer>;
  createdAt: number;
  updatedAt: number;
}
