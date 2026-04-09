import type { Player, Team } from '../types';

export const MOCK_PLAYERS: Player[] = [
  { id: 'p1', name: 'You', avatarEmoji: '🧑' },
  { id: 'p2', name: 'Bot Alpha', avatarEmoji: '🤖' },
  { id: 'p3', name: 'Bot Beta', avatarEmoji: '👾' },
];

export const MOCK_TEAMS: Team[] = [
  { id: 't1', name: 'Team Red', color: '#ef4444', playerIds: ['p1'] },
  { id: 't2', name: 'Team Blue', color: '#3b82f6', playerIds: ['p2', 'p3'] },
];
