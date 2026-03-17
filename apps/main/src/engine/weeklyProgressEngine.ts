import {
  createWeeklyProgress,
  getWeeklyProgress,
  recordDailyProgress,
  getWeekCompletionResult,
  savePlacementTestResult,
  WeeklyProgressData,
  WeekCompletionResult,
  DailyProgressData,
} from '../services/db';
import { canAccessDay as pureCanAccessDay } from './unlockEngine';

/**
 * Initialize or get weekly progress for current lesson
 */
export async function initializeWeekIfNeeded(
  uid: string,
  workbookId: number,
  lessonId: number
): Promise<WeeklyProgressData | null> {
  const weekId = `workbook_${workbookId}_lesson_${lessonId}`;
  
  // Check if week already exists
  const existingWeek = await getWeeklyProgress(uid, weekId);
  if (existingWeek) {
    return existingWeek;
  }

  // Create new week starting today
  const today = new Date().toISOString().split('T')[0];
  return await createWeeklyProgress(uid, workbookId, lessonId, today);
}

/**
 * Mark a day as complete and get results
 */
export async function completeDayAndGetResult(
  uid: string,
  workbookId: number,
  lessonId: number,
  dayNumber: number
): Promise<{
  success: boolean;
  fireEarned: boolean;
  iceEarned: boolean;
  fireIconColor: string;
  daysCompleted: number;
  weekComplete: boolean;
  weekResult?: WeekCompletionResult;
}> {
  const weekId = `workbook_${workbookId}_lesson_${lessonId}`;
  const today = new Date().toISOString();

  // Ensure week is initialized
  const week = await initializeWeekIfNeeded(uid, workbookId, lessonId);
  if (!week) {
    return {
      success: false,
      fireEarned: false,
      iceEarned: false,
      fireIconColor: 'gray-400',
      daysCompleted: 0,
      weekComplete: false,
    };
  }

  // Record day completion
  const result = await recordDailyProgress(uid, weekId, dayNumber, today);

  if (!result.isDayComplete) {
    return {
      success: false,
      fireEarned: false,
      iceEarned: false,
      fireIconColor: 'gray-400',
      daysCompleted: 0,
      weekComplete: false,
    };
  }

  // Get updated week data
  const updatedWeek = await getWeeklyProgress(uid, weekId);
  if (!updatedWeek) {
    return {
      success: false,
      fireEarned: false,
      iceEarned: false,
      fireIconColor: 'gray-400',
      daysCompleted: 0,
      weekComplete: false,
    };
  }

  // Determine fire icon color
  let fireIconColor = 'gray-400'; // default no earnings
  if (result.fireEarned) {
    fireIconColor = 'orange-500'; // fire earned (on time)
  } else if (result.iceEarned) {
    fireIconColor = 'blue-400'; // ice earned (late)
  }

  let weekResult: WeekCompletionResult | undefined;
  if (result.isWeekComplete) {
    weekResult = await getWeekCompletionResult(uid, weekId) || undefined;
  }

  return {
    success: true,
    fireEarned: result.fireEarned,
    iceEarned: result.iceEarned,
    fireIconColor,
    daysCompleted: updatedWeek.totalDaysCompleted,
    weekComplete: result.isWeekComplete,
    weekResult,
  };
}

/**
 * Get current week progress display data
 */
export async function getWeekProgressDisplay(
  uid: string,
  workbookId: number,
  lessonId: number
): Promise<{
  daysCompleted: number;
  totalDays: number;
  diamonds: number;
  fire: number;
  ice: number;
  stars: number;
  dayStatuses: Array<{
    dayNumber: number;
    scheduled: string;
    completed: boolean;
    onTime: boolean;
    diamondEarned: boolean;
    fireEarned: boolean;
    iceEarned: boolean;
  }>;
} | null> {
  const weekId = `workbook_${workbookId}_lesson_${lessonId}`;
  const week = await getWeeklyProgress(uid, weekId);

  if (!week) {
    return null;
  }

  return {
    daysCompleted: week.totalDaysCompleted,
    totalDays: 7,
    diamonds: week.diamondsEarned,
    fire: week.fireCount,
    ice: week.iceCount,
    stars: week.starsEarned,
    dayStatuses: week.days.map((day) => ({
      dayNumber: day.dayNumber,
      scheduled: day.scheduledDate,
      completed: day.status !== 'pending',
      onTime: day.status === 'completed_on_time',
      diamondEarned: day.diamondEarned,
      fireEarned: day.fireEarned,
      iceEarned: day.iceEarned,
    })),
  };
}

/**
 * Save placement test with full tracking
 */
export async function saveStudentPlacementTest(
  uid: string,
  fullName: string,
  whatsapp: string,
  percentage: number,
  correctAnswers: number,
  totalQuestions: number,
  estimatedLevel: string,
  isAnonymous: boolean = true
): Promise<{ success: boolean; testId?: string }> {
  const testId = await savePlacementTestResult(
    uid,
    fullName,
    whatsapp,
    percentage,
    correctAnswers,
    totalQuestions,
    estimatedLevel,
    isAnonymous
  );

  return {
    success: !!testId,
    testId: testId || undefined,
  };
}

/**
 * Check if student is allowed to access a day.
 * Uses pure progress-based sequential unlock — no date comparisons.
 */
export async function canAccessDay(
  uid: string,
  workbookId: number,
  lessonId: number,
  dayNumber: number
): Promise<boolean> {
  const weekId = `workbook_${workbookId}_lesson_${lessonId}`;
  const week = await getWeeklyProgress(uid, weekId);

  if (!week) {
    // New week: only day 1 is accessible
    return dayNumber === 1;
  }

  // Derive completed day numbers from Firestore week record
  const completedDays = week.days
    .filter((d) => d.status !== 'pending')
    .map((d) => d.dayNumber);

  return pureCanAccessDay(dayNumber, completedDays);
}
