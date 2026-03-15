import React, { useCallback, useEffect, useRef, useState } from 'react';

interface PronunciationTrainerProps {
  onFinish: () => void;
}

// Difficult sounds for Portuguese speakers + tricky numbers
const ITEMS = ['G', 'Q', 'W', 'X', 'D', 'H', '3', '8', '13', '30'];

// Spoken form for TTS and speech recognition matching
const SPOKEN_LABEL: Record<string, string> = {
  '3': 'Three',
  '8': 'Eight',
  '13': 'Thirteen',
  '30': 'Thirty',
};

const getSpokenLabel = (item: string) => SPOKEN_LABEL[item] ?? item;

const normalize = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

const MAX_ATTEMPTS = 3;

export const PronunciationTrainer: React.FC<PronunciationTrainerProps> = ({ onFinish }) => {
  const [stage, setStage] = useState<'listen-repeat' | 'speech-recognition'>('listen-repeat');
  const [itemIndex, setItemIndex] = useState(0);

  // Stage 1
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const recordingUrlRef = useRef<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Stage 2
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [detectedWord, setDetectedWord] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const item = ITEMS[itemIndex];
  const spokenLabel = getSpokenLabel(item);
  const isNumber = item !== spokenLabel;

  // Keep ref in sync for cleanup
  useEffect(() => {
    recordingUrlRef.current = recordingUrl;
  }, [recordingUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMediaStream();
      try { recognitionRef.current?.abort(); } catch {}
      if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    };
  }, []);

  // Stage 2: auto-play TTS when stage/item changes
  useEffect(() => {
    if (stage !== 'speech-recognition') return;
    setFailedAttempts(0);
    setDetectedWord(null);
    setIsCorrect(null);
    playTTS(spokenLabel);
  }, [stage, itemIndex]); // spokenLabel derives from itemIndex — intentionally omitted

  const stopMediaStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const playTTS = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-US';
    utt.rate = 0.85;
    window.speechSynthesis.speak(utt);
  };

  // Stage 1: recording
  const startRecording = async () => {
    if (isRecording) return;
    clearRecording();
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordingUrl(url);
        recordingUrlRef.current = url;
        stopMediaStream();
        setIsRecording(false);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      // Microphone denied — silently skip
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  };

  const clearRecording = () => {
    if (recordingUrlRef.current) {
      URL.revokeObjectURL(recordingUrlRef.current);
      recordingUrlRef.current = null;
    }
    setRecordingUrl(null);
  };

  const advanceItem = useCallback(() => {
    // Clean up recording URL via ref (avoids stale closure)
    if (recordingUrlRef.current) {
      URL.revokeObjectURL(recordingUrlRef.current);
      recordingUrlRef.current = null;
    }
    setRecordingUrl(null);
    setDetectedWord(null);
    setIsCorrect(null);
    setFailedAttempts(0);

    if (itemIndex >= ITEMS.length - 1) {
      if (stage === 'listen-repeat') {
        setItemIndex(0);
        setStage('speech-recognition');
      } else {
        onFinish();
      }
    } else {
      setItemIndex((i) => i + 1);
    }
  }, [itemIndex, stage, onFinish]);

  // Stage 2: speech recognition
  const startListening = () => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setDetectedWord('(not supported in this browser)');
      setIsCorrect(false);
      setFailedAttempts((n) => n + 1);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const best: string = event.results[0][0].transcript;
      const allTranscripts: string[] = Array.from(event.results[0]).map(
        (r: any) => normalize(r.transcript),
      );
      const target = normalize(spokenLabel);
      const matched = allTranscripts.some((t) => t === target || t.includes(target));
      if (!matched) setFailedAttempts((n) => n + 1);
      setDetectedWord(best);
      setIsCorrect(matched);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setDetectedWord('(could not hear you)');
      setIsCorrect(false);
      setFailedAttempts((n) => n + 1);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    setIsListening(true);
    recognition.start();
  };

  const handleTryAgain = () => {
    setDetectedWord(null);
    setIsCorrect(null);
    playTTS(spokenLabel);
  };

  return (
    <div className="min-h-screen bg-blue-50 pb-32">
      <div className="max-w-[420px] mx-auto px-4 pt-6">
        <h1 className="text-2xl font-bold text-center text-blue-900">Pronunciation Trainer</h1>
        <p className="mt-1 text-center text-[11px] font-bold uppercase tracking-wide text-blue-500">
          {stage === 'listen-repeat' ? 'Stage 1 — Listen & Repeat' : 'Stage 2 — Speech Recognition'}
        </p>
        <p className="mt-1 text-center text-sm text-slate-500">
          Item {itemIndex + 1} of {ITEMS.length}
        </p>

        <div className="mt-6 rounded-3xl bg-white border border-slate-200 p-6 shadow-sm text-center">
          <p className="text-5xl font-black text-slate-800 tracking-wide">{item}</p>
          {isNumber && (
            <p className="mt-1 text-base italic text-slate-400">"{spokenLabel}"</p>
          )}

          {stage === 'listen-repeat' ? (
            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={() => playTTS(spokenLabel)}
                className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#1d4ed8] active:translate-y-0.5"
              >
                Listen
              </button>

              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#047857] active:translate-y-0.5"
                >
                  {recordingUrl ? 'Record again' : 'Record'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-full rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#b45309] active:translate-y-0.5"
                >
                  Stop
                </button>
              )}

              {recordingUrl && (
                <>
                  <audio controls src={recordingUrl} className="w-full" />
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={clearRecording}
                      className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 active:scale-[0.98]"
                    >
                      Try again
                    </button>
                    <button
                      type="button"
                      onClick={advanceItem}
                      className="rounded-2xl bg-blue-500 px-4 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#1d4ed8] active:translate-y-0.5"
                    >
                      Continue
                    </button>
                  </div>
                </>
              )}

              {!recordingUrl && !isRecording && (
                <button
                  type="button"
                  onClick={advanceItem}
                  className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500 active:scale-[0.98]"
                >
                  Skip
                </button>
              )}
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={() => playTTS(spokenLabel)}
                className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#1d4ed8] active:translate-y-0.5"
              >
                Listen again
              </button>

              {detectedWord === null && !isListening && (
                <button
                  type="button"
                  onClick={startListening}
                  className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#047857] active:translate-y-0.5"
                >
                  Speak now
                </button>
              )}

              {isListening && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  Listening...
                </div>
              )}

              {detectedWord !== null && (
                <div
                  className={`rounded-2xl border px-4 py-3 text-center ${
                    isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                  }`}
                >
                  <p className="text-xs text-slate-500">You said:</p>
                  <p className="mt-1 text-lg font-bold text-slate-800">"{detectedWord}"</p>
                  <p className={`mt-1 text-sm font-semibold ${
                    isCorrect ? 'text-green-700' : 'text-red-600'
                  }`}>
                    {isCorrect ? 'Correct!' : 'Not quite — keep trying!'}
                  </p>
                </div>
              )}

              {detectedWord !== null && !isCorrect && failedAttempts < MAX_ATTEMPTS && (
                <button
                  type="button"
                  onClick={handleTryAgain}
                  className="w-full rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#b45309] active:translate-y-0.5"
                >
                  Try again ({MAX_ATTEMPTS - failedAttempts} left)
                </button>
              )}

              {detectedWord !== null && !isListening && (isCorrect || failedAttempts >= MAX_ATTEMPTS) && (
                <button
                  type="button"
                  onClick={advanceItem}
                  className="w-full rounded-2xl bg-blue-500 px-4 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#1d4ed8] active:translate-y-0.5"
                >
                  Continue
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
