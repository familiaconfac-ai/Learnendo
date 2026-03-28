export interface Course {
  id: string;
  title: string;
  flag: string;
  category: 'modern' | 'biblical' | 'track';
  description?: string;
}

export interface Exercise {
  id: string;
  type: 'speaking' | 'multiple-choice' | 'writing' | 'identification' | 'dialogue';
  instruction: string;
  displayValue?: string;
  audioValue: string;
  options?: string[];
  correctValue: string;
  translation?: string;
  character?: 'teacher' | 'student';
  isNewVocab?: boolean;
}

export interface Day {
  id: string;
  type: 'practice' | 'review';
  exercises: Exercise[];
}

export interface Lesson {
  id: string;
  title: string;
  days: Day[];
}

export interface Workbook {
  id: number;
  title: string;
  lessons: Lesson[];
}

export interface PlacementAnswerItem {
  questionId: string;
  prompt: string;
  studentAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string | null;
  grammarTopic: string | null;
  levelBand: string;
  skillType: string;
}

export interface TestRecord {
  score: number;
  date: string; // ISO string
  level?: string; // CEFR level, e.g. 'A1', 'B2'
  languageCode?: string; // which language this test was taken in
  /** Full per-question breakdown — populated by PlacementTest component. */
  answerBreakdown?: PlacementAnswerItem[];
  /** Student's full name as entered on the Placement Test form. */
  fullName?: string;
  /** Student's WhatsApp as entered on the Placement Test form. */
  whatsapp?: string;
  /** Number of correct answers. */
  correctAnswers?: number;
  /** Total questions in the test. */
  totalQuestions?: number;
}

export interface UserTestData {
  /**
   * Legacy single placement result (backward compat).
   * New code should prefer `placements[languageCode]`.
   */
  placement?: TestRecord;
  /**
   * Per-language placement results.
   * Key = LessonLanguageCode (e.g. 'en', 'pt', 'es').
   * Populated alongside `placement` so old readers still work.
   */
  placements?: Record<string, TestRecord>;
  lessons?: {
    /** Key format: "W{workbook}L{lesson}", e.g. "W1L3" */
    [key: string]: TestRecord & { workbook: number; lesson: number; day: number };
  };
}

/**
 * Describes one course in which a student has had real activity (exercise, lesson, or placement test).
 * Stored in `progress/{uid}.courses` as a map keyed by courseId.
 * Only actual activity triggers an entry — mere navigation doesn't count.
 */
export interface ActiveCourse {
  /** Matches Course.id (e.g. 'english', 'spanish'). */
  courseId: string;
  /** ISO 639-1 code, if known (e.g. 'en', 'pt', 'es'). */
  languageCode?: string;
  /** ISO timestamp of the most recent real activity in this course. */
  lastActivityAt: string;
  /** Learning position snapshot at the time of last activity. */
  currentWorkbook?: number;
  currentLesson?: number;
  currentDay?: number;
}

export type LiveClassStatus = 'upcoming' | 'live' | 'finished';

export interface LiveClass {
  id: string;
  title: string;
  teacherName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  meetingLink: string;
  whatsappLink?: string;
  description?: string;
  status: LiveClassStatus;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LiveClassInput {
  title: string;
  teacherName: string;
  date: string;
  time: string;
  meetingLink: string;
  whatsappLink?: string;
  description?: string;
}

export interface LiveClassMessage {
  id: string;
  text: string;
  senderUid: string;
  senderName: string;
  createdAt?: string;
}

export interface LiveClassSession {
  sessionStatus: 'idle' | 'active' | 'paused' | 'ended';
  activeWorkbookId?: number | null;
  activeLessonId?: string | null;
  activeExerciseId?: string | null;
  lastUpdatedBy?: string;
  updatedAt?: string;
}

export interface LiveClassResponse {
  id: string;
  userId: string;
  userName: string;
  workbookId?: number | null;
  lessonId?: string | null;
  exerciseId?: string | null;
  answer: string;
  createdAt?: string;
}

export interface UserProgress {
  userId: string;
  currentCourseId?: string;
  currentWorkbook: number;
  currentLesson: number;
  currentDay: number;
  completedActivities: string[]; // array of day ids (in-memory)
  /** Firestore-persisted map of completed day ids → true.
   *  Stored as a map so individual keys are preserved on every setDoc merge,
   *  avoiding the array-overwrite race condition. */
  days?: Record<string, boolean>;
  lastCompletedDate: string; // ISO date
  placementScore?: number;
  tests?: UserTestData;
}

export enum SectionType {
  COURSES = 'COURSES',
  DASHBOARD = 'DASHBOARD',
  LIVE_CLASSES = 'LIVE_CLASSES',
  WORKBOOK = 'WORKBOOK',
  WORKBOOK_LIST = 'WORKBOOK_LIST',
  LESSON = 'LESSON',
  PRACTICE = 'PRACTICE',
  PLACEMENT_TEST = 'PLACEMENT_TEST',
  PRONUNCIATION = 'PRONUNCIATION',
  SHARE = 'SHARE',
  SETTINGS = 'SETTINGS',
  HELP = 'HELP',
  TEACHER_DASHBOARD = 'TEACHER_DASHBOARD',
  RANK = 'RANK',
}

export interface AnswerLog {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  isFirstTry: boolean;
}

// ── Study profile — describes how the student accesses Learnendo ─────────────
// All fields are optional; populate as enrolment / payment data becomes available.
export interface StudentStudyProfile {
  /** ISO date string of when the student first used the app (e.g. '2026-01-15'). */
  startDate?: string;
  /** Defines the student's subscription / support tier. */
  appAccessType?: 'free' | 'premium' | 'premium-support';
  /** Whether the student has access to printable PDF workbooks. */
  pdfStatus?: 'none' | 'partial' | 'full';
  /** Whether the student has scheduled online classes. */
  onlineClassStatus?: 'none' | 'active';
  /** Primary learning modality for this student. */
  studyMode?: 'self-guided' | 'class-support' | 'intensive';
}

// Old types for compatibility
export enum OldSectionType {
  INFO = 'INFO',
  PATH = 'PATH',
  PRACTICE = 'PRACTICE',
  RESULT = 'RESULT',
  RESULTS = 'RESULTS'
}

export type OldQState = 'pending' | 'correct' | 'wrong';

export type PracticeModuleType = string;

export interface PracticeItem {
  id: string;
  moduleType: PracticeModuleType;
  lessonId: number;
  type: 'speaking' | 'multiple-choice' | 'writing' | 'identification' | 'dialogue';
  instruction: string;
  displayValue?: string;
  audioValue: string;
  options?: string[];
  correctValue: string;
  translation?: string;
  character?: 'teacher' | 'student';
  isNewVocab?: boolean;
}

export interface OldUserProgress {
  currentLesson: number;
  lessonData: {
    [lessonId: number]: {
      diamond: number;
      islandScores: { [trackId: string]: number };
      islandCompletionDates?: { [trackId: string]: string };
      lastCompletionDayKey?: string;
    }
  };
  totalStars: number;
  streakCount: number;
  iceCount: number;
  lastActiveDayKey?: string;
  virtualDayOffset: number;
  bypassActive?: boolean;
  sentToTeacher?: boolean;
}

export type LessonLanguageCode = 'en' | 'pt' | 'es' | 'el' | 'he';

export interface LessonLanguageContent {
  title: string;
  subtitle?: string;
  vocabularyNew?: string[];
  description?: string;
}

export interface ScalableLessonPractice {
  quiz?: Exercise[];
  flashcards?: string[];
  matching?: Exercise[];
  fillBlanks?: Exercise[];
  speaking?: Exercise[];
  listening?: Exercise[];
  audioReview?: string[];
  extraPractice?: Exercise[];
}

export interface ScalableLesson {
  id: string;
  unit: number;
  workbook: number;
  image: string;
  dayImages: string[];
  vocabularyNew: string[];
  languages: Record<LessonLanguageCode, LessonLanguageContent>;
  practice: ScalableLessonPractice;
}

export interface ScalableWorkbook {
  id: number;
  title: string;
  lessons: ScalableLesson[];
}