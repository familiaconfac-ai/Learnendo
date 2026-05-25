// ─── Domain ──────────────────────────────────────────────────────────────────

export type Section = 'home' | 'languages' | 'bible' | 'exercises' | 'battle' | 'contest' | 'import' | 'review' | 'packs' | 'progress';

export type AppMode = 'public' | 'lab';

export type ContentDomain = 'languages' | 'bible';

export type LanguageCode = 'en' | 'pt' | 'es' | 'el' | 'he';

export type BibleCategory = 'book' | 'theme' | 'character' | 'place' | 'general';

// ─── Exercise item types ──────────────────────────────────────────────────────

/**
 * 'multiple-choice' – tap one of the given options
 * 'fill-in'         – type a free-text answer
 * 'true-false'      – binary True/False options
 * 'listening'       – audio plays automatically; text may be hidden
 * 'speaking'        – item shows a prompt to read aloud (mic evaluation future)
 */
export type ExerciseItemType =
  | 'multiple-choice'
  | 'fill-in'
  | 'true-false'
  | 'listening'
  | 'speaking';

export interface ExerciseItem {
  id: string;
  type: ExerciseItemType;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  /** Additional accepted answers (case-insensitive) */
  alternatives?: string[];
  explanation?: string;
  tags?: string[];
  /** Text sent to TTS when audio is played. Falls back to `prompt` if absent. */
  audioText?: string;
  /** If true the prompt text is hidden; student hears audio only */
  hideText?: boolean;
  /** Preferred TTS voice gender for this item */
  voiceGender?: 'male' | 'female';
  /** BCP-47 language tag for TTS (e.g. "en-US", "pt-BR") */
  voiceLang?: string;
}

export interface VocabEntry {
  word: string;
  translation: string;
  type?: 'noun' | 'verb' | 'adjective' | 'phrase' | 'pronoun';
  example?: string;
}

export interface LessonStructure {
  /** Pattern with [POSS], [NAME], [BE] as optional placeholders */
  pattern: string;
  /** Concrete example using the pattern */
  example: string;
  /** Pre-computed pronoun/number expansion variants */
  variants?: string[];
  notes?: string;
}

export interface LessonPack {
  id: string;
  language: LanguageCode;
  title: string;
  description: string;
  items: ExerciseItem[];
  lessonNumber?: number;
  themes?: string[];
  /** Core vocabulary words for this lesson */
  vocabulary?: VocabEntry[];
  /** Grammatical patterns with pronoun/number expansion */
  structures?: LessonStructure[];
}

export interface BibleItem {
  id: string;
  category: BibleCategory;
  question: string;
  options: string[];
  correctAnswer: string;
  reference?: string;
  explanation?: string;
}

export interface QuestionPack {
  id: string;
  title: string;
  category: BibleCategory;
  items: BibleItem[];
}

// ─── Player / Ranking (ready for real users later) ───────────────────────────

export interface Player {
  id: string;
  name: string;
  teamId?: string;
  avatarEmoji?: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  playerIds: string[];
}

// ─── Session / Engine ────────────────────────────────────────────────────────

export type SessionMode = 'exercise' | 'battle';

export interface AnswerResult {
  questionId: string;
  playerId: string;
  answer: string;
  correct: boolean;
  responseTimeMs: number;
  pointsEarned: number;
}

export interface PlayerScore {
  player: Player;
  score: number;
  correctCount: number;
  wrongCount: number;
  totalTimeMs: number;
}

/** Union alias – anything that can appear in a battle or exercise */
export type BattleItem = ExerciseItem | BibleItem;

export interface BattleSession {
  id: string;
  mode: SessionMode;
  packId: string;
  players: Player[];
  teams?: Team[];
  results: AnswerResult[];
  startedAt: number;
  finishedAt?: number;
}

export interface ExerciseSession {
  id: string;
  packId: string;
  playerId: string;
  results: AnswerResult[];
  startedAt: number;
  finishedAt?: number;
}

// ─── Contest Mode ─────────────────────────────────────────────────────────────

export interface ContestTeam {
  id: string;
  name: string;
  color: string;
  textColor: string;
  emoji: string;
}

export interface ContestRoundResult {
  questionId: string;
  teamId: string;
  correct: boolean;
  pointsEarned: number;
}

export interface TeamScore {
  team: ContestTeam;
  score: number;
  correctCount: number;
}

export interface ContestSession {
  id: string;
  packId: string;
  teams: ContestTeam[];
  results: ContestRoundResult[];
  startedAt: number;
  finishedAt?: number;
}

// ─── Custom Battle ────────────────────────────────────────────────────────────

/** A user-assembled question pack stored in localStorage */
export interface CustomPack {
  id: string;
  title: string;
  createdAt: number;
  items: ExerciseItem[];
}

// ─── Review / Editor System ───────────────────────────────────────────────────

export type UserRole = 'viewer' | 'teacher' | 'verified_editor' | 'admin';

export interface LanguagePermissions {
  canEditEnglish: boolean;
  canEditPortuguese: boolean;
  canEditSpanish: boolean;
  canEditGreek: boolean;
  canEditHebrew: boolean;
  canEditBible: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  permissions: LanguagePermissions;
}

export type ContentStatus = 'draft' | 'active' | 'flagged' | 'archived';

export type ReportReason =
  | 'wrong-answer'
  | 'bad-translation'
  | 'unclear-prompt'
  | 'typo'
  | 'other';

export interface QuestionReport {
  id: string;
  questionId: string;
  packId?: string;
  reportedBy: string;
  reportedAt: number;
  reason: ReportReason;
  details?: string;
  status: 'open' | 'reviewed' | 'fixed' | 'dismissed';
  /** Frozen snapshot of the item at the moment the report was filed */
  originalItem?: ExerciseItem;
}

export interface EditHistoryEntry {
  editedBy: string;
  editedAt: number;
  note?: string;
  snapshot: Partial<ExerciseItem>;
}

export interface QuestionOverride {
  questionId: string;
  packId: string;
  item: ExerciseItem;
  version: number;
  status: ContentStatus;
  createdBy: string;
  updatedBy: string;
  updatedAt: number;
  approvedBy?: string;
  editHistory: EditHistoryEntry[];
}

// ─── Teacher Profile ──────────────────────────────────────────────────────────

export type TeacherStatus = 'pending' | 'approved' | 'rejected';

export interface TeacherProfile {
  id: string;
  name: string;
  email?: string;
  whatsapp?: string;
  /** Language codes this teacher is applying to edit */
  languages: LanguageCode[];
  canEditBible: boolean;
  status: TeacherStatus;
  role: UserRole;
  permissions: LanguagePermissions;
  createdAt: number;
  approvedAt?: number;
  approvedBy?: string;
  /** Admin note */
  note?: string;
}

// ─── Shared / Public Packs ────────────────────────────────────────────────────

export type PackVisibility = 'private' | 'public';

export interface PackAuthor {
  id: string;
  name: string;
  role: UserRole;
}

export interface SharedPack {
  id: string;
  title: string;
  description: string;
  language?: LanguageCode;
  tags?: string[];
  items: ExerciseItem[];
  author: PackAuthor;
  visibility: PackVisibility;
  /** Set when this pack was copied from a public pack */
  copiedFrom?: {
    packId: string;
    packTitle: string;
    authorName: string;
  };
  createdAt: number;
  updatedAt: number;
  /** Approximate copy count (display only; mock in lab) */
  copyCount?: number;
}

// ─── Future Identity (Auth-ready stubs) ──────────────────────────────────────

/**
 * Progression path: guest (anonymous) → student (registered) → teacher → verified_teacher
 * These types define the shape for future Firebase/Auth integration without
 * coupling any current code to an auth library.
 */
export type IdentityType = 'guest' | 'student' | 'teacher' | 'verified_teacher';

/** Lightweight profile for an anonymous device session. No auth required. */
export interface GuestProfile {
  /** Stable per-device ID from localStorage (lab_guest_id) */
  id: string;
  type: 'guest';
  displayName: string | null;
  createdAt: number;
}

/**
 * Full identity profile — union shape used once real auth is added.
 * Superset of GuestProfile so migration is additive.
 */
export interface IdentityProfile {
  id: string;
  type: IdentityType;
  displayName: string | null;
  email?: string;
  /** True once email or phone is verified */
  verified?: boolean;
  createdAt: number;
  /** Original guestId if this account was upgraded from a guest session */
  upgradedFromGuestId?: string;
}

// ─── Engagement / Progress ────────────────────────────────────────────────────

/** One calendar day's activity summary */
export interface DailyActivity {
  /** ISO date 'YYYY-MM-DD' */
  date: string;
  exercisesCompleted: number;
  diamondsEarned: number;
}

/**
 * Full engagement profile stored per guest in localStorage.
 * Designed to be forward-compatible with a Firebase document once auth lands.
 */
export interface EngagementProfile {
  /** Matches lab_guest_id */
  guestId: string;
  /**
   * ISO date anchoring the user's 7-day cycle to their first activity day.
   * All cycle indices are computed relative to this date.
   */
  anchorDate: string;
  /** Total fire tokens: 1 per day with study activity */
  fire: number;
  /** Total ice tokens: 1 per day in a cycle that passed without activity */
  ice: number;
  /** Total diamonds: DIAMONDS_PER_EXERCISE earned on each completed exercise session */
  diamonds: number;
  /** Computed score: (fire × FIRE_WEIGHT) + (diamonds × DIAMOND_WEIGHT) − (ice × ICE_PENALTY) */
  stars: number;
  /** ISO date strings where at least one exercise was completed */
  activeDays: string[];
  /** Total exercise sessions ever completed */
  totalExercises: number;
  /** Per-day history (capped to keep localStorage light) */
  history: DailyActivity[];
  /** Unix ms of last write */
  lastUpdated: number;
}

/** Snapshot used by UI components — derived, never stored directly */
export interface RewardSnapshot {
  fire: number;
  ice: number;
  diamonds: number;
  stars: number;
  /** Which day of the current 7-day cycle (1–7) */
  currentCycleDay: number;
  /** 7-element array: true = had activity that day */
  currentCycleDays: (boolean | null)[];
}

export interface RankingEntry {
  id: string;
  name: string;
  avatarEmoji?: string;
  stars: number;
  fire: number;
  diamonds: number;
}

// ─── Multi-variant lesson (PDF import) ───────────────────────────────────────

export type LessonVariantStatus = 'draft' | 'auto_generated' | 'reviewed' | 'corrected';

export interface LessonVariant {
  id: string;
  language: LanguageCode;
  status: LessonVariantStatus;
  /** Full lesson pack; vocabulary/items may be sparse when auto_generated */
  pack: LessonPack;
  origin: 'pdf_import' | 'manual';
}

export interface MultiVariantLesson {
  id: string;
  /** ID of the source LessonPack saved in lab_imported_packs */
  baseLessonId: string;
  sourceLanguage: LanguageCode;
  createdAt: number;
  variants: LessonVariant[];
}

