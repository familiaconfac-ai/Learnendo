import React from 'react';
import { getRewardSnapshot } from '../../../../../lab/src/engine/engagement/store';

interface Props {
  className?: string;
}

export const BattleLabIndicators: React.FC<Props> = ({ className = '' }) => {
  const rewards = getRewardSnapshot();
  const items = [
    { icon: '🔥', label: 'Fogo', value: rewards.fire, tone: 'text-orange-300 border-orange-500/25 bg-orange-500/10' },
    { icon: '❄️', label: 'Gelo', value: rewards.ice, tone: 'text-cyan-300 border-cyan-500/25 bg-cyan-500/10' },
    { icon: '💎', label: 'Diamante', value: rewards.diamonds, tone: 'text-sky-300 border-sky-500/25 bg-sky-500/10' },
    { icon: '⭐', label: 'Estrela', value: rewards.stars, tone: 'text-amber-300 border-amber-500/25 bg-amber-500/10' },
  ];

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${className}`.trim()}>
      {items.map((item) => (
        <div
          key={item.label}
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${item.tone}`}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
          <span className="font-black">{item.value}</span>
        </div>
      ))}
    </div>
  );
};
