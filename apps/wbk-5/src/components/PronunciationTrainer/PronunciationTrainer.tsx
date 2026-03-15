import React, { useEffect, useMemo, useRef, useState } from 'react';

interface PronunciationTrainerProps {
  onFinish: () => void;
}

const ITEMS = ['A', 'E', 'I', 'O', 'U', 'Hello', 'World', 'Learnendo'];

export const PronunciationTrainer: React.FC<PronunciationTrainerProps> = ({ onFinish }) => {
  const [index, setIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Record<number, string>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const currentItem = useMemo(() => ITEMS[index], [index]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      Object.values(recordings).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [recordings]);

  const handleListen = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentItem);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const startRecording = async () => {
    if (isRecording) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      setRecordings((prev) => {
        if (prev[index]) URL.revokeObjectURL(prev[index]);
        return { ...prev, [index]: url };
      });
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      streamRef.current = null;
      setIsRecording(false);
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.stop();
  };

  const handleNext = () => {
    if (index >= ITEMS.length - 1) {
      onFinish();
      return;
    }
    setIndex((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-blue-50 pb-32">
      <div className="max-w-[420px] mx-auto px-4 pt-6">
        <h1 className="text-2xl font-bold text-center text-blue-900">Pronunciation Trainer</h1>
        <p className="mt-2 text-center text-sm text-slate-600">Item {index + 1} of {ITEMS.length}</p>

        <div className="mt-8 rounded-3xl bg-white border border-slate-200 p-6 shadow-sm text-center">
          <p className="text-4xl font-black text-slate-800">{currentItem}</p>

          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={handleListen}
              className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#1d4ed8] active:translate-y-0.5"
            >
              🔊 Listen
            </button>

            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#047857] active:translate-y-0.5"
              >
                🎤 Record
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="w-full rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#b45309] active:translate-y-0.5"
              >
                ⏹ Stop
              </button>
            )}

            {recordings[index] && (
              <audio controls src={recordings[index]} className="w-full mt-1" />
            )}

            <button
              type="button"
              onClick={handleNext}
              className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 active:scale-[0.99]"
            >
              {index >= ITEMS.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};