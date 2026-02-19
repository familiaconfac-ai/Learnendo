
export enum SectionType {
  INFO = 'INFO',
  PATH = 'PATH',
  PRACTICE = 'PRACTICE',
  RESULTS = 'RESULTS'
}

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
  character?: 'teacher' | 'student';
  isNewVocab?: boolean;
}

export interface AnswerLog {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  isFirstTry: boolean;
}

export interface UserProgress {
  currentLesson: number;
  unlockedModules: PracticeModuleType[];
  completedModules: PracticeModuleType[];
  totalPoints: number;
  streakCount: number;
  lastCompletionDate?: string; 
  startDate?: string;
  sentToTeacher?: boolean;
  bypassActive?: boolean;
}
