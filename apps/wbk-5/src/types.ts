export interface Exercise {
  id: string;
  type: 'speaking' | 'multiple-choice' | 'writing' | 'identification' | 'dialogue';
  instruction: string;
  displayValue?: string;
  audioValue: string;
  options?: string[];
  correctValue: string;
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

export interface UserProgress {
  userId: string;
  currentWorkbook: number;
  currentLesson: number;
  currentDay: number;
  completedActivities: string[]; // array of day ids
  lastCompletedDate: string; // ISO date
  placementScore?: number;
}

export enum SectionType {
  DASHBOARD = 'DASHBOARD',
  WORKBOOK = 'WORKBOOK',
  LESSON = 'LESSON',
  PLACEMENT_TEST = 'PLACEMENT_TEST',
  PRONUNCIATION = 'PRONUNCIATION',
  SHARE = 'SHARE',
}

export type QState = 'pending' | 'correct' | 'wrong';

export interface AnswerLog {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  isFirstTry: boolean;
}