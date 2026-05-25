import type { PlayerScore } from '../types';
import { BrandHero } from './Brand';

interface Props {
  ranking: PlayerScore[];
  onRestart?: () => void;
  showBrand?: boolean;
}

export default function Scoreboard({ ranking, onRestart, showBrand }: Props) {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="flex flex-col gap-4">
      {showBrand && <BrandHero />}
      <h2 className="text-xl font-bold text-center px-4">🏆 Final Results</h2>
      <div className="flex flex-col gap-2 px-4">
        {ranking.map((entry, i) => (
          <div
            key={entry.player.id}
            className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3"
          >
            <span className="text-xl w-8 text-center">{medals[i] ?? `#${i + 1}`}</span>
            <span className="text-xl">{entry.player.avatarEmoji ?? '👤'}</span>
            <div className="flex-1">
              <p className="font-semibold text-sm">{entry.player.name}</p>
              <p className="text-xs text-gray-400">
                {entry.correctCount} correct · {entry.wrongCount} wrong
              </p>
            </div>
            <span className="font-bold text-indigo-300 text-lg">{entry.score}</span>
          </div>
        ))}
      </div>
      {onRestart && (
        <div className="px-4">
          <button
            onClick={onRestart}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold transition-colors"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
