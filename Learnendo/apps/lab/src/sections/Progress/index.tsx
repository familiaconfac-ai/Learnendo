import { useState, useEffect } from 'react';
import type { RewardSnapshot, RankingEntry } from '../../types';
import { getRewardSnapshot } from '../../engine/engagement';
import { getGuestId } from '../../services/guestSession';
import { getGuestName } from '../../services/guestSession';
import { DIAMONDS_PER_EXERCISE, FIRE_WEIGHT, DIAMOND_WEIGHT, ICE_PENALTY } from '../../engine/engagement';

// ─── Simulated leaderboard peers ─────────────────────────────────────────────

const SIMULATED_PEERS: Omit<RankingEntry, 'id'>[] = [
  { name: 'Ana',     avatarEmoji: '👩', stars: 380, fire: 28, diamonds: 84 },
  { name: 'Carlos',  avatarEmoji: '👨', stars: 310, fire: 24, diamonds: 70 },
  { name: 'Sofia',   avatarEmoji: '🧕', stars: 270, fire: 20, diamonds: 70 },
  { name: 'Marcos',  avatarEmoji: '🧑', stars: 190, fire: 14, diamonds: 60 },
  { name: 'Julia',   avatarEmoji: '👧', stars: 120, fire: 10, diamonds: 50 },
  { name: 'Pedro',   avatarEmoji: '🧔', stars:  75, fire:  7, diamonds: 35 },
  { name: 'Leila',   avatarEmoji: '👱', stars:  40, fire:  4, diamonds: 20 },
];

function buildLeaderboard(snapshot: RewardSnapshot): RankingEntry[] {
  const myId = getGuestId();
  const myName = getGuestName() ?? 'You';
  const me: RankingEntry = {
    id: myId,
    name: myName,
    avatarEmoji: '🙋',
    stars: snapshot.stars,
    fire: snapshot.fire,
    diamonds: snapshot.diamonds,
  };

  const peers: RankingEntry[] = SIMULATED_PEERS.map((p, i) => ({
    ...p,
    id: `sim_${i}`,
  }));

  return [...peers, me].sort((a, b) => b.stars - a.stars || b.fire - a.fire);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CycleRow({ days }: { days: (boolean | null)[] }) {
  return (
    <div className="flex gap-2 justify-center">
      {days.map((active, i) => {
        let content: string;
        let cls: string;
        if (active === null) {
          content = `${i + 1}`;
          cls = 'bg-gray-700 text-gray-400 border border-gray-600';
        } else if (active) {
          content = '🔥';
          cls = 'bg-orange-500/20 border border-orange-500/50';
        } else {
          content = '❄️';
          cls = 'bg-blue-900/30 border border-blue-500/30';
        }
        return (
          <div
            key={i}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${cls}`}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}

function StatPill({
  emoji,
  value,
  label,
  color,
}: {
  emoji: string;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className={`flex-1 rounded-2xl border ${color} p-3 text-center`}>
      <div className="text-2xl">{emoji}</div>
      <div className="text-xl font-bold text-white mt-0.5">{value}</div>
      <div className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function LeaderboardRow({
  entry,
  rank,
  isMe,
}: {
  entry: RankingEntry;
  rank: number;
  isMe: boolean;
}) {
  const medalMap: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const rankDisplay = medalMap[rank] ?? `#${rank}`;
  return (
    <div
      className={[
        'flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors',
        isMe
          ? 'bg-indigo-900/50 border-indigo-500/60'
          : 'bg-gray-800/60 border-gray-700/50',
      ].join(' ')}
    >
      <span className="text-base w-8 text-center shrink-0">{rankDisplay}</span>
      <span className="text-xl shrink-0">{entry.avatarEmoji ?? '🧑'}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isMe ? 'text-indigo-300' : 'text-white'}`}>
          {entry.name}{isMe ? ' (you)' : ''}
        </p>
        <p className="text-[11px] text-gray-400">
          🔥 {entry.fire} &nbsp; 💎 {entry.diamonds}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-yellow-400">⭐ {entry.stars}</p>
      </div>
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function Progress() {
  const [snapshot, setSnapshot] = useState<RewardSnapshot>(() => getRewardSnapshot());

  // Refresh snapshot whenever the tab becomes active
  useEffect(() => {
    function refresh() { setSnapshot(getRewardSnapshot()); }
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  const leaderboard = buildLeaderboard(snapshot);
  const myId = getGuestId();
  const myRank = leaderboard.findIndex((e) => e.id === myId) + 1;

  return (
    <div className="flex flex-col gap-5 p-4 max-w-md mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Progress</h1>
        <p className="text-xs text-gray-500 mt-0.5">Your 7-day study cycle</p>
      </div>

      {/* Cycle strip */}
      <div className="bg-gray-800/70 border border-gray-700 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
            This cycle — day {snapshot.currentCycleDay} of 7
          </p>
          <span className="text-xs text-gray-500">Day {snapshot.currentCycleDay}/7</span>
        </div>
        <CycleRow days={snapshot.currentCycleDays} />
        <p className="text-[10px] text-gray-500 text-center">
          🔥 active day · ❄️ missed day · number = upcoming
        </p>
      </div>

      {/* Reward stats */}
      <div className="flex gap-3">
        <StatPill
          emoji="⭐"
          value={snapshot.stars}
          label="Stars"
          color="border-yellow-500/40 bg-yellow-900/10"
        />
        <StatPill
          emoji="🔥"
          value={snapshot.fire}
          label="Fire"
          color="border-orange-500/40 bg-orange-900/10"
        />
        <StatPill
          emoji="💎"
          value={snapshot.diamonds}
          label="Diamonds"
          color="border-cyan-500/40 bg-cyan-900/10"
        />
        <StatPill
          emoji="❄️"
          value={snapshot.ice}
          label="Ice"
          color="border-blue-500/40 bg-blue-900/10"
        />
      </div>

      {/* Reward legend */}
      <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">How points work</p>
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0">🔥</span>
            <div>
              <p className="text-sm font-semibold text-orange-300">Fire (streak)</p>
              <p className="text-xs text-gray-400">You earn 1 fire each day you complete at least one exercise. Keep your streak going!</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0">💎</span>
            <div>
              <p className="text-sm font-semibold text-cyan-300">Diamonds</p>
              <p className="text-xs text-gray-400">You earn {DIAMONDS_PER_EXERCISE} diamonds each time you finish a practice session. More sessions = more diamonds.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0">❄️</span>
            <div>
              <p className="text-sm font-semibold text-blue-300">Ice (missed days)</p>
              <p className="text-xs text-gray-400">Each day you skip in a completed 7-day cycle costs you 1 ice token, which lowers your star score.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0">⭐</span>
            <div>
              <p className="text-sm font-semibold text-yellow-300">Stars (your rank score)</p>
              <p className="text-xs text-gray-400">
                Stars = Fire × {FIRE_WEIGHT} + Diamonds × {DIAMOND_WEIGHT} − Ice × {ICE_PENALTY}.
                Build your streak and practice often to climb the leaderboard.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ranking */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-300">Leaderboard</h2>
          {myRank > 0 && (
            <span className="text-xs text-indigo-400 font-medium">You: #{myRank}</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {leaderboard.map((entry, i) => (
            <LeaderboardRow
              key={entry.id}
              entry={entry}
              rank={i + 1}
              isMe={entry.id === myId}
            />
          ))}
        </div>
      </div>

      {/* No activity hint */}
      {snapshot.fire === 0 && (
        <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-2xl px-4 py-5 text-center space-y-2">
          <p className="text-2xl">✏️</p>
          <p className="text-sm font-semibold text-indigo-200">Start your first session!</p>
          <p className="text-xs text-gray-400">Go to Practice or Battle to earn your first fire and diamonds.</p>
        </div>
      )}
    </div>
  );
}
