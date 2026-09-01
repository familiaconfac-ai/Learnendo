import type { UserRole } from './userRoles';

export interface GrammarFocusActions {
  edit: boolean;
  board: boolean;
  slides: boolean;
  practice: boolean;
  report: boolean;
}

export function getGrammarFocusActions(role: UserRole): GrammarFocusActions {
  return {
    edit: role === 'admin',
    board: role === 'teacher' || role === 'admin',
    slides: role === 'teacher' || role === 'admin',
    practice: role === 'teacher' || role === 'admin',
    report: role === 'teacher',
  };
}
