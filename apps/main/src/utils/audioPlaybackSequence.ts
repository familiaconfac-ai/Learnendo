export interface AwaitableAudioPlayback {
  promise: Promise<unknown>;
}

export function runAfterAudioPlayback(
  playback: AwaitableAudioPlayback | null | undefined,
  action: () => void,
  shouldRun: () => boolean = () => true,
): Promise<void> {
  if (!playback) {
    if (shouldRun()) action();
    return Promise.resolve();
  }

  return playback.promise
    .catch(() => undefined)
    .then(() => {
      if (shouldRun()) action();
    });
}
