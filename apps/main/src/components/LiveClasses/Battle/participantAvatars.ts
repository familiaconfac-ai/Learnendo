export interface BattleAvatarOption {
  id: string;
  label: string;
  icon: string;
}

export const BATTLE_PARTICIPANT_AVATARS: BattleAvatarOption[] = [
  { id: 'study-robot', label: 'Robô', icon: '🤖' },
  { id: 'study-owl', label: 'Coruja', icon: '🦉' },
  { id: 'study-rabbit', label: 'Coelho', icon: '🐰' },
  { id: 'study-fox', label: 'Raposa', icon: '🦊' },
  { id: 'study-book', label: 'Livro', icon: '📚' },
  { id: 'study-globe', label: 'Idiomas', icon: '🌍' },
  { id: 'study-rocket', label: 'Foguete', icon: '🚀' },
  { id: 'study-star', label: 'Estrela', icon: '⭐' },
];

const AVATAR_MAP = new Map(BATTLE_PARTICIPANT_AVATARS.map((avatar) => [avatar.id, avatar]));

export function getBattleParticipantAvatar(avatarId?: string): BattleAvatarOption | null {
  return avatarId ? AVATAR_MAP.get(avatarId) ?? null : null;
}

export function isBattleParticipantAvatarId(avatarId: string): boolean {
  return AVATAR_MAP.has(avatarId);
}
