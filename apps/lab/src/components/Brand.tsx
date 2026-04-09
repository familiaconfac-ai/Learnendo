/**
 * BrandHero – large logo block for Home, Lobby, and Results screens.
 * Visually establishes "Learnendo Battle" identity.
 */
export function BrandHero() {
  return (
    <div className="flex flex-col items-center pt-6 pb-2 select-none">
      <img
        src="/logo-battle.png"
        alt="Learnendo Battle"
        className="w-36 h-36 object-contain drop-shadow-[0_4px_24px_rgba(99,102,241,0.5)]"
        draggable={false}
      />
      <p className="mt-2 text-xs tracking-widest text-gray-500 uppercase">
        by&nbsp;
        <img
          src="/logo-learnendo.png"
          alt="Learnendo"
          className="inline-block h-4 object-contain align-middle opacity-60"
        />
      </p>
    </div>
  );
}

/**
 * BrandBar – slim header used during active quiz/battle so the logo
 * doesn't crowd question content.
 */
export function BrandBar() {
  return (
    <div className="flex items-center gap-2 px-4 pt-3 pb-1 select-none">
      <img
        src="/logo-battle.png"
        alt="Battle"
        className="w-7 h-7 object-contain opacity-80"
        draggable={false}
      />
      <span className="text-xs font-semibold tracking-wide text-gray-400">
        Learnendo Battle
      </span>
    </div>
  );
}
