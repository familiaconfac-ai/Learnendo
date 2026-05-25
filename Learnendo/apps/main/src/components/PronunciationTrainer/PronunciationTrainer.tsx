import React, { useCallback, useEffect, useRef, useState } from 'react';
import { speak } from '../../services/ttsService';
import { getPronounceItems, getTTSLang, PronounceItem } from '../../data/pronounceItems';

type UILang = 'en' | 'pt' | 'es';

interface PronunciationTrainerProps {
  onFinish: () => void;
  courseId?: string;
  workbookId?: number;
  uiLanguage?: UILang;
}

// ── Localized UI strings ─────────────────────────────────────────────────────

const UI = {
  en: {
    title: 'Pronunciation Trainer',
    stage1: 'Stage 1 — Listen & Repeat',
    stage2: 'Stage 2 — Speech Recognition',
    itemOf: (i: number, total: number) => `Item ${i} of ${total}`,
    listen: 'Listen',
    listenAgain: 'Listen again',
    record: 'Record',
    recordAgain: 'Record again',
    stop: 'Stop',
    skip: 'Skip',
    tryAgain: (left: number) => `Try again (${left} left)`,
    speakNow: 'Speak now',
    listening: 'Listening…',
    youSaid: 'You said:',
    correct: 'Correct!',
    notQuite: 'Not quite — keep trying!',
    continue: 'Continue',
    notSupported: '(not supported in this browser)',
    couldNotHear: '(could not hear you)',
  },
  pt: {
    title: 'Treinamento de Pronúncia',
    stage1: 'Etapa 1 — Ouça e repita',
    stage2: 'Etapa 2 — Reconhecimento de fala',
    itemOf: (i: number, total: number) => `Item ${i} de ${total}`,
    listen: 'Ouvir',
    listenAgain: 'Ouvir novamente',
    record: 'Gravar',
    recordAgain: 'Gravar novamente',
    stop: 'Parar',
    skip: 'Pular',
    tryAgain: (left: number) => `Tentar novamente (${left} restante${left !== 1 ? 's' : ''})`,
    speakNow: 'Falar agora',
    listening: 'Ouvindo…',
    youSaid: 'Você disse:',
    correct: 'Correto!',
    notQuite: 'Quase — continue tentando!',
    continue: 'Continuar',
    notSupported: '(não suportado neste navegador)',
    couldNotHear: '(não consegui ouvir)',
  },
  es: {
    title: 'Entrenamiento de Pronunciación',
    stage1: 'Etapa 1 — Escucha y repite',
    stage2: 'Etapa 2 — Reconocimiento de voz',
    itemOf: (i: number, total: number) => `Ítem ${i} de ${total}`,
    listen: 'Escuchar',
    listenAgain: 'Escuchar de nuevo',
    record: 'Grabar',
    recordAgain: 'Grabar de nuevo',
    stop: 'Detener',
    skip: 'Saltar',
    tryAgain: (left: number) => `Intentar de nuevo (${left} restante${left !== 1 ? 's' : ''})`,
    speakNow: 'Hablar ahora',
    listening: 'Escuchando…',
    youSaid: 'Dijiste:',
    correct: '¡Correcto!',
    notQuite: 'Casi — ¡sigue intentando!',
    continue: 'Continuar',
    notSupported: '(no compatible con este navegador)',
    couldNotHear: '(no pude escucharte)',
  },
};

const MAX_ATTEMPTS = 3;

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]/g, '')
    .trim();

export const PronunciationTrainer: React.FC<PronunciationTrainerProps> = ({
  onFinish,
  courseId = 'english',
  workbookId = 1,
  uiLanguage = 'en',
}) => {
  const ui = UI[uiLanguage] ?? UI.en;
  const ttsLang = getTTSLang(courseId);
  const ITEMS: PronounceItem[] = getPronounceItems(courseId, workbookId);

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
  const spokenLabel = item?.spoken ?? item?.text ?? '';
  const displayText = item?.text ?? '';
  const isNumericDisplay = displayText !== spokenLabel && /^\d+$/.test(displayText);

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
    utt.lang = ttsLang;
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
  }, [itemIndex, stage, onFinish, ITEMS.length]);

  // Stage 2: speech recognition
  const startListening = () => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setDetectedWord(ui.notSupported);
      setIsCorrect(false);
      setFailedAttempts((n) => n + 1);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = ttsLang;
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
      setDetectedWord(ui.couldNotHear);
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

  if (!item) return null;

  return (
    <div className="min-h-screen bg-slate-900 pb-32">
      <div className="max-w-[420px] mx-auto px-4 pt-6">
        <h1 className="text-2xl font-bold text-center text-white">{ui.title}</h1>
        <p className="mt-1 text-center text-[11px] font-bold uppercase tracking-wide text-blue-400">
          {stage === 'listen-repeat' ? ui.stage1 : ui.stage2}
        </p>
        <p className="mt-1 text-center text-sm text-slate-400">
          {ui.itemOf(itemIndex + 1, ITEMS.length)}
        </p>

        <div className="mt-6 rounded-3xl bg-slate-800 border border-slate-700 p-6 shadow-sm text-center">
          <p className="text-5xl font-black text-white tracking-wide">{displayText}</p>
          {isNumericDisplay && (
            <p className="mt-1 text-base italic text-slate-400">"{spokenLabel}"</p>
          )}

          {stage === 'listen-repeat' ? (
            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={() => playTTS(spokenLabel)}
                className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#1d4ed8] active:translate-y-0.5"
              >
                {ui.listen}
              </button>

              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#047857] active:translate-y-0.5"
                >
                  {recordingUrl ? ui.recordAgain : ui.record}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-full rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#b45309] active:translate-y-0.5"
                >
                  {ui.stop}
                </button>
              )}

              {recordingUrl && (
                <>
                  <audio controls src={recordingUrl} className="w-full" />
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={clearRecording}
                      className="rounded-2xl bg-slate-700 px-4 py-3 text-sm font-bold text-slate-200 active:scale-[0.98]"
                    >
                      {ui.tryAgain(MAX_ATTEMPTS)}
                    </button>
                    <button
                      type="button"
                      onClick={advanceItem}
                      className="rounded-2xl bg-blue-500 px-4 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#1d4ed8] active:translate-y-0.5"
                    >
                      {ui.continue}
                    </button>
                  </div>
                </>
              )}

              {!recordingUrl && !isRecording && (
                <button
                  type="button"
                  onClick={advanceItem}
                  className="w-full rounded-2xl bg-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 active:scale-[0.98]"
                >
                  {ui.skip}
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
                {ui.listenAgain}
              </button>

              {detectedWord === null && !isListening && (
                <button
                  type="button"
                  onClick={startListening}
                  className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#047857] active:translate-y-0.5"
                >
                  {ui.speakNow}
                </button>
              )}

              {isListening && (
                <div className="rounded-2xl border border-emerald-700 bg-emerald-900/40 px-4 py-3 text-sm font-semibold text-emerald-300">
                  {ui.listening}
                </div>
              )}

              {detectedWord !== null && (
                <div
                  className={`rounded-2xl border px-4 py-3 text-center ${
                    isCorrect ? 'border-green-700 bg-green-900/40' : 'border-red-700 bg-red-900/40'
                  }`}
                >
                  <p className="text-xs text-slate-400">{ui.youSaid}</p>
                  <p className="mt-1 text-lg font-bold text-white">"{detectedWord}"</p>
                  <p className={`mt-1 text-sm font-semibold ${
                    isCorrect ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {isCorrect ? ui.correct : ui.notQuite}
                  </p>
                </div>
              )}

              {detectedWord !== null && !isCorrect && failedAttempts < MAX_ATTEMPTS && (
                <button
                  type="button"
                  onClick={handleTryAgain}
                  className="w-full rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#b45309] active:translate-y-0.5"
                >
                  {ui.tryAgain(MAX_ATTEMPTS - failedAttempts)}
                </button>
              )}

              {detectedWord !== null && !isListening && (isCorrect || failedAttempts >= MAX_ATTEMPTS) && (
                <button
                  type="button"
                  onClick={advanceItem}
                  className="w-full rounded-2xl bg-blue-500 px-4 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#1d4ed8] active:translate-y-0.5"
                >
                  {ui.continue}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

