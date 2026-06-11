import type { BattleStatus } from '../components/LiveClasses/Battle/battleTypes';
export type MainStageMode = 'workspace' | 'camera' | 'battle' | 'trail';

const ACTIVE_BATTLE_STATUSES: readonly BattleStatus[] = ['WAITING', 'PLAYING', 'REVEALED'];

/**
 * How old (in ms) a battle session can be before it is considered stale and
 * should NOT be auto-recovered when a user enters the room.
 * 5 minutes covers a student who re-enters mid-battle; anything older is
 * treated as leftover state from a previous class session.
 */
export const BATTLE_STALE_THRESHOLD_MS = 5 * 60 * 1000;

export function getDefaultMainStageMode(): MainStageMode {
  return 'workspace';
}

export function sanitizeMainStageMode(mode: unknown): MainStageMode {
  if (mode === 'battle') return 'battle';
  if (mode === 'camera') return 'camera';
  if (mode === 'trail') return 'trail';
  return 'workspace';
}

export function isActiveBattleStatus(status: BattleStatus | null | undefined): boolean {
  return Boolean(status && ACTIVE_BATTLE_STATUSES.includes(status));
}
