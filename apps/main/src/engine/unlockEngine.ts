import { UserProgress } from '../types';

export class UnlockEngine {
  static isDayUnlocked(progress: UserProgress, dayId: string): boolean {
    // Check if 24 hours have passed since last completion
    return true; // Placeholder
  }

  static getNextUnlockTime(progress: UserProgress): Date | null {
    // Calculate when next day unlocks
    return null; // Placeholder
  }
}