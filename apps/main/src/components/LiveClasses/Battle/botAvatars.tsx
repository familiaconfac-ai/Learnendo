import React from 'react';

export type BotAvatarId =
  | 'robot-1'
  | 'robot-2'
  | 'robot-3'
  | 'robot-4'
  | 'robot-5'
  | 'robot-6'
  | 'robot-7'
  | 'robot-8';

export interface BotAvatarOption {
  id: BotAvatarId;
  label: string;
  icon: string;
}

export const DEFAULT_BOT_AVATAR_ID: BotAvatarId = 'robot-1';

export const BOT_AVATAR_OPTIONS: BotAvatarOption[] = [
  { id: 'robot-1', label: 'Cobalto', icon: '🤖' },
  { id: 'robot-2', label: 'Circuito', icon: '🦾' },
  { id: 'robot-3', label: 'Pixel', icon: '👾' },
  { id: 'robot-4', label: 'Orbita', icon: '🛸' },
  { id: 'robot-5', label: 'Turbo', icon: '⚙️' },
  { id: 'robot-6', label: 'Neon', icon: '🛰️' },
  { id: 'robot-7', label: 'Matrix', icon: '🔋' },
  { id: 'robot-8', label: 'Astro', icon: '🚀' },
];

export const BOT_AVATAR_MAP = BOT_AVATAR_OPTIONS.reduce<Record<string, BotAvatarOption>>(
  (accumulator, option) => {
    accumulator[option.id] = option;
    return accumulator;
  },
  {},
);

export function getBotAvatarOption(avatarId?: string): BotAvatarOption {
  return BOT_AVATAR_MAP[avatarId ?? ''] ?? BOT_AVATAR_MAP[DEFAULT_BOT_AVATAR_ID];
}

export function normalizeBotAvatarId(avatarId?: string): BotAvatarId {
  return getBotAvatarOption(avatarId).id;
}

export function renderBotAvatarIcon(avatarId?: string): React.ReactNode {
  return getBotAvatarOption(avatarId).icon;
}
