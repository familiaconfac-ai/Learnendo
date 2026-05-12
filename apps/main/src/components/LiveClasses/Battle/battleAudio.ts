const BATTLE_THEME_CANDIDATES = [
  '/sounds/battle_theme.mp3',
  '/sounds/battle_theme.mp3.mp3',
];

const BATTLE_PODIUM_CANDIDATES = [
  '/sounds/battle_podium.mp3',
  '/sounds/battle_podium.mp3.mp3',
];

export interface ManagedBattleAudio {
  start(): void;
  stop(): void;
  setVolume(value: number): void;
  dispose(): void;
}

function clampVolume(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function createManagedBattleAudio(
  candidates: string[],
  options: { loop: boolean; initialVolume: number },
): ManagedBattleAudio | null {
  try {
    const audio = new Audio();
    let candidateIndex = 0;
    let desiredPlaying = false;
    let disposed = false;

    audio.loop = options.loop;
    audio.preload = 'auto';
    audio.volume = clampVolume(options.initialVolume);

    const applyCandidate = () => {
      audio.src = candidates[candidateIndex] ?? '';
      audio.load();
    };

    const tryPlay = () => {
      if (disposed) return;
      audio.play().catch(() => {
        // Autoplay can fail until the user interacts.
      });
    };

    const onError = () => {
      if (candidateIndex >= candidates.length - 1) return;
      candidateIndex += 1;
      applyCandidate();
      if (desiredPlaying) {
        tryPlay();
      }
    };

    const onCanPlay = () => {
      if (desiredPlaying) {
        tryPlay();
      }
    };

    const unlockPlayback = () => {
      if (desiredPlaying) {
        tryPlay();
      }
    };

    audio.addEventListener('error', onError);
    audio.addEventListener('canplay', onCanPlay);

    if (typeof document !== 'undefined') {
      document.addEventListener('pointerdown', unlockPlayback);
      document.addEventListener('keydown', unlockPlayback);
      document.addEventListener('touchstart', unlockPlayback);
    }

    applyCandidate();

    return {
      start() {
        desiredPlaying = true;
        tryPlay();
      },
      stop() {
        desiredPlaying = false;
        audio.pause();
        audio.currentTime = 0;
      },
      setVolume(value: number) {
        audio.volume = clampVolume(value);
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        desiredPlaying = false;
        audio.pause();
        audio.currentTime = 0;
        audio.removeEventListener('error', onError);
        audio.removeEventListener('canplay', onCanPlay);
        if (typeof document !== 'undefined') {
          document.removeEventListener('pointerdown', unlockPlayback);
          document.removeEventListener('keydown', unlockPlayback);
          document.removeEventListener('touchstart', unlockPlayback);
        }
      },
    };
  } catch {
    return null;
  }
}

export function createBattleThemeAudio(initialVolume: number): ManagedBattleAudio | null {
  return createManagedBattleAudio(BATTLE_THEME_CANDIDATES, {
    loop: true,
    initialVolume,
  });
}

export function createBattlePodiumAudio(initialVolume: number): ManagedBattleAudio | null {
  return createManagedBattleAudio(BATTLE_PODIUM_CANDIDATES, {
    loop: false,
    initialVolume,
  });
}

export function readBattleVolume(storageKey: string, fallback = 0.35): number {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw == null ? NaN : Number(raw);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0.1, Math.min(1, parsed));
  } catch {
    return fallback;
  }
}

export function persistBattleVolume(storageKey: string, value: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, String(Math.max(0.1, Math.min(1, value))));
  } catch {
    // Best effort only.
  }
}
