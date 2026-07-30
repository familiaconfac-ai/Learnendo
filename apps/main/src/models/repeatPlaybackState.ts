export type RepeatPlaybackState = 'idle' | 'playingPrompt' | 'readyToRecord' | 'recording' | 'evaluating' | 'feedback' | 'playbackError';
export type RepeatPlaybackEvent = 'reset' | 'playStarted' | 'playCompleted' | 'playFailed' | 'recordStarted' | 'recordCompleted' | 'evaluated' | 'retry';

export function reduceRepeatPlayback(state: RepeatPlaybackState, event: RepeatPlaybackEvent): RepeatPlaybackState {
  if (event === 'reset') return 'idle';
  if (event === 'retry') return state === 'playbackError' ? 'idle' : state;
  if (event === 'playStarted') return state === 'idle' ? 'playingPrompt' : state;
  if (event === 'playCompleted') return state === 'playingPrompt' ? 'readyToRecord' : state;
  if (event === 'playFailed') return state === 'playingPrompt' ? 'playbackError' : state;
  if (event === 'recordStarted') return state === 'readyToRecord' ? 'recording' : state;
  if (event === 'recordCompleted') return state === 'recording' ? 'evaluating' : state;
  if (event === 'evaluated') return state === 'evaluating' ? 'feedback' : state;
  return state;
}

export const repeatMicAvailable = (state: RepeatPlaybackState) => state === 'readyToRecord' || state === 'recording';
