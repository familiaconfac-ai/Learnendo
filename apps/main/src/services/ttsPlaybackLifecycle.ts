export type TtsPlaybackState = 'idle' | 'loading' | 'playing' | 'completed' | 'error' | 'cancelled';
export type TtsPlaybackMechanism = 'browser' | 'remote' | 'none';
export type TtsPlaybackTerminalState = Extract<TtsPlaybackState, 'completed' | 'error' | 'cancelled'>;

export interface TtsPlaybackResult {
  state: TtsPlaybackTerminalState;
  mechanism: TtsPlaybackMechanism;
  errorCode?: string;
}

export interface TtsPlaybackSession {
  readonly promise: Promise<TtsPlaybackResult>;
  readonly state: TtsPlaybackState;
  readonly settled: boolean;
  transition(state: Extract<TtsPlaybackState, 'loading' | 'playing'>, mechanism?: TtsPlaybackMechanism): void;
  complete(mechanism?: TtsPlaybackMechanism): void;
  fail(errorCode: string, mechanism?: TtsPlaybackMechanism): void;
  cancel(errorCode?: string): void;
}

export function createTtsPlaybackSession(options: {
  onStateChange?: (state: TtsPlaybackState) => void;
  onEnd?: () => void;
  onError?: (errorCode: string) => void;
} = {}): TtsPlaybackSession {
  let current: TtsPlaybackState = 'idle';
  let mechanism: TtsPlaybackMechanism = 'none';
  let resolve!: (result: TtsPlaybackResult) => void;
  const promise = new Promise<TtsPlaybackResult>((done) => { resolve = done; });

  const setState = (state: TtsPlaybackState) => {
    if (current === 'completed' || current === 'error' || current === 'cancelled') return false;
    current = state;
    options.onStateChange?.(state);
    return true;
  };
  const settle = (result: TtsPlaybackResult) => {
    if (!setState(result.state)) return;
    resolve(result);
    if (result.state === 'completed') options.onEnd?.();
    else if (result.state === 'error') options.onError?.(result.errorCode ?? 'unknown');
  };

  return {
    promise,
    get state() { return current; },
    get settled() { return current === 'completed' || current === 'error' || current === 'cancelled'; },
    transition(state, nextMechanism) {
      if (nextMechanism) mechanism = nextMechanism;
      setState(state);
    },
    complete(nextMechanism) { settle({ state: 'completed', mechanism: nextMechanism ?? mechanism }); },
    fail(errorCode, nextMechanism) { settle({ state: 'error', mechanism: nextMechanism ?? mechanism, errorCode }); },
    cancel(errorCode = 'cancelled') { settle({ state: 'cancelled', mechanism, errorCode }); },
  };
}
