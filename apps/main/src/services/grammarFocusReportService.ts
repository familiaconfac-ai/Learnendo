import { grammarFocusDocumentId } from '../models/grammarFocus';
import {
  createExerciseReport,
  type ExerciseReportCategory,
} from './exerciseReportsService';
import type { UserRole } from './userRoles';

export interface CreateGrammarFocusReportInput {
  reporterRole: UserRole;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  language: string;
  workbookId: number;
  workbookTitle: string;
  lessonId: string;
  lessonTitle: string;
  grammarFocusTitle: string;
  category: ExerciseReportCategory;
  comment: string;
}

function deviceContext() {
  const userAgent = navigator.userAgent;
  return {
    browser: /Edg\//.test(userAgent) ? 'Microsoft Edge' : /Chrome\//.test(userAgent) ? 'Chrome' : /Firefox\//.test(userAgent) ? 'Firefox' : /Safari\//.test(userAgent) ? 'Safari' : 'Other',
    operatingSystem: /Windows/.test(userAgent) ? 'Windows' : /Android/.test(userAgent) ? 'Android' : /iPhone|iPad|iPod/.test(userAgent) ? 'iOS/iPadOS' : /Mac OS/.test(userAgent) ? 'macOS' : /Linux/.test(userAgent) ? 'Linux' : 'Other',
    deviceType: /Mobi|Android|iPhone/.test(userAgent) ? 'mobile' : /iPad|Tablet/.test(userAgent) ? 'tablet' : 'desktop',
  };
}

export async function createGrammarFocusReport(input: CreateGrammarFocusReportInput) {
  if (input.reporterRole !== 'teacher') {
    throw new Error('Only teachers can report Grammar Focus content.');
  }
  if (!input.comment.trim()) throw new Error('Add a comment before sending the report.');

  return createExerciseReport({
    source: 'grammar-focus',
    reporterRole: input.reporterRole,
    userId: input.userId,
    userName: input.userName,
    userEmail: input.userEmail,
    language: input.language,
    workbookId: input.workbookId,
    workbookTitle: input.workbookTitle,
    lessonId: input.lessonId,
    lessonTitle: input.lessonTitle,
    dayId: 'grammar-focus',
    dayNumber: null,
    exerciseId: grammarFocusDocumentId(input.workbookId, input.lessonId),
    exerciseType: 'grammar-focus',
    exerciseMode: null,
    sessionPhase: 'grammar-focus',
    currentExerciseIndex: -1,
    instruction: input.grammarFocusTitle,
    displayedText: null,
    audioText: null,
    audioSource: null,
    options: [],
    expectedAnswer: '',
    acceptedAnswers: [],
    studentAnswer: null,
    attemptCount: 0,
    problemCategory: input.category,
    studentComment: input.comment.trim(),
    route: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    appVersion: import.meta.env.VITE_APP_VERSION ?? '0.0.0',
    ...deviceContext(),
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
  });
}
