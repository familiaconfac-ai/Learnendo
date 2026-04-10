import type { BattleStatus } from '../components/LiveClasses/Battle/battleTypes';
import type { LiveClassSession } from '../types';

export type MainStageMode = NonNullable<LiveClassSession['mainStageMode']>;

const ACTIVE_BATTLE_STATUSES: readonly BattleStatus[] = ['lobby', 'active', 'showing-answer'];

/**
 * How old (in ms) a battle session can be before it is considered stale and
 * should NOT be auto-recovered when a user enters the room.
 * 5 minutes covers a student who re-enters mid-battle; anything older is
 * treated as leftover state from a previous class session.
 */
export const BATTLE_STALE_THRESHOLD_MS = 5 * 60 * 1000;

export function getDefaultMainStageMode(): MainStageMode {
  return 'board';
}

export function sanitizeMainStageMode(mode: unknown): MainStageMode {
  if (mode === 'camera') return 'camera';
  if (mode === 'editor') return 'editor';
  return 'board';
}

export function isActiveBattleStatus(status: BattleStatus | null | undefined): boolean {
  return Boolean(status && ACTIVE_BATTLE_STATUSES.includes(status));
}
