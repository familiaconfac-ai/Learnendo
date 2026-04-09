import type { BattleStatus } from '../components/LiveClasses/Battle/battleTypes';
import type { LiveClassSession } from '../types';

export type MainStageMode = NonNullable<LiveClassSession['mainStageMode']>;

const ACTIVE_BATTLE_STATUSES: readonly BattleStatus[] = ['lobby', 'active', 'showing-answer'];

export function getDefaultMainStageMode(): MainStageMode {
  return 'board';
}

export function sanitizeMainStageMode(mode: unknown): MainStageMode {
  return mode === 'camera' ? 'camera' : 'board';
}

export function isActiveBattleStatus(status: BattleStatus | null | undefined): boolean {
  return Boolean(status && ACTIVE_BATTLE_STATUSES.includes(status));
}
