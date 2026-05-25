import { useCallback } from 'react';
import { tts } from '../services/tts';
import type { TTSGender } from '../services/tts';

/**
 * React hook that wraps the TTS singleton.
 *
 * Usage:
 *   const { play, stop, supported } = useTTS();
 *   play('Hello, what is your name?', 'female', 'en-US');
 */
export function useTTS() {
  const play = useCallback(
    (text: string, gender?: TTSGender, lang?: string) => {
      tts.speak(text, { gender: gender ?? 'female', lang: lang ?? 'en-US' });
    },
    [],
  );

  const stop = useCallback(() => {
    tts.stop();
  }, []);

  return {
    play,
    stop,
    supported: tts.isSupported(),
  };
}
