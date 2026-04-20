import React from 'react';
import { renderBotAvatarIcon } from './botAvatars';

interface Props {
  name: string;
  avatarId?: string;
  isBot?: boolean;
  sizeClassName?: string;
  className?: string;
  showBotBadge?: boolean;
}

export const BattleParticipantAvatar: React.FC<Props> = ({
  name,
  avatarId,
  isBot = false,
  sizeClassName = 'h-8 w-8',
  className = '',
  showBotBadge = false,
}) => {
  const fallbackLetter = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className={`relative flex shrink-0 items-center justify-center rounded-full ${sizeClassName} ${className}`}>
      <div
        className={`flex h-full w-full items-center justify-center rounded-full border text-sm font-bold ${
          isBot
            ? 'border-dashed border-cyan-400/70 bg-cyan-500/10 text-cyan-200'
            : 'border-slate-600 bg-slate-800 text-white'
        }`}
      >
        {isBot ? renderBotAvatarIcon(avatarId) : fallbackLetter}
      </div>
      {isBot && showBotBadge ? (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-cyan-500 px-1.5 py-[1px] text-[8px] font-black uppercase tracking-wide text-slate-950">
          BOT
        </span>
      ) : null}
    </div>
  );
};
