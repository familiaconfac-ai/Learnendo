import { useEffect, useRef } from 'react';
import type { QuestionState } from '../engine/useQuiz';
import type { AnyQuestion } from '../engine/scoring';
import { useTTS } from '../engine/useTTS';
import type { ExerciseItem } from '../types';
import ReportButton from './ReportButton';

interface Props {
  state: QuestionState;
  onAnswer: (answer: string) => void;
  onNext: () => void;
  /** Pack identifier forwarded to the report form */
  packId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOptions(q: AnyQuestion): string[] {
  if ('options' in q && q.options && q.options.length > 0) return q.options;
  if ('type' in q && q.type === 'true-false') return ['True', 'False'];
  return [];
}

function getPromptText(q: AnyQuestion): string {
  return 'question' in q ? q.question : q.prompt;
}

function asExercise(q: AnyQuestion): ExerciseItem | null {
  return 'type' in q ? (q as ExerciseItem) : null;
}

function getAudioText(q: AnyQuestion): string {
  const ex = asExercise(q);
  return ex?.audioText ?? getPromptText(q);
}

// ─── Audio Button ─────────────────────────────────────────────────────────────

function AudioButton({
  text,
  gender,
  lang,
  label = '🔊',
}: {
  text: string;
  gender?: 'male' | 'female';
  lang?: string;
  label?: string;
}) {
  const { play, supported } = useTTS();
  if (!supported) return null;
  return (
    <button
      onClick={() => play(text, gender, lang)}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs font-medium text-gray-200 transition-colors active:scale-95 shrink-0"
      title="Play audio"
    >
      {label}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function QuizRunner({ state, onAnswer, onNext, packId }: Props) {
  const { question, index, total, answered, lastResult } = state;
  const options = getOptions(question);
  const promptText = getPromptText(question);
  const ex = asExercise(question);
  const isSpeaking = ex?.type === 'speaking';
  const isListening = ex?.type === 'listening';
  const hideText = ex?.hideText ?? false;
  const audioText = getAudioText(question);
  const voiceGender = ex?.voiceGender ?? 'female';
  const voiceLang = ex?.voiceLang ?? 'en-US';

  const { play, supported } = useTTS();

  // Auto-play audio for listening/speaking items when question changes
  const autoPlayedRef = useRef<string>('');
  useEffect(() => {
    if ((isListening || isSpeaking) && supported && !answered) {
      if (autoPlayedRef.current !== question.id) {
        autoPlayedRef.current = question.id;
        const t = setTimeout(() => play(audioText, voiceGender, voiceLang), 300);
        return () => clearTimeout(t);
      }
    }
  }, [question.id, isListening, isSpeaking, answered, audioText, voiceGender, voiceLang, play, supported]);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 shrink-0">{index + 1} / {total}</span>
      </div>

      {/* Question card */}
      <div className="bg-gray-800 rounded-2xl p-4 flex flex-col gap-2">
        {isListening && (
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-400">
            🎧 Listening
          </span>
        )}
        {isSpeaking && (
          <span className="text-xs font-semibold uppercase tracking-wide text-purple-400">
            🗣️ Speaking
          </span>
        )}

        {!hideText && <p className="text-base font-medium leading-snug">{promptText}</p>}
        {hideText && !answered && (
          <p className="text-sm text-gray-500 italic">
            Audio only — tap 🔊 to listen, then choose.
          </p>
        )}
        {hideText && answered && (
          <p className="text-base font-medium leading-snug text-gray-300">{promptText}</p>
        )}

        {/* Audio controls row */}
        {(isListening || isSpeaking || ex?.audioText) && supported && (
          <div className="flex gap-2 flex-wrap mt-1">
            <AudioButton text={audioText} gender={voiceGender} lang={voiceLang} label="🔊 Play" />
            <AudioButton
              text={audioText}
              gender={voiceGender === 'female' ? 'male' : 'female'}
              lang={voiceLang}
              label="🔊 Alt voice"
            />
          </div>
        )}
      </div>

      {/* Speaking: "I read it aloud" completion button */}
      {isSpeaking && !answered && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-gray-500 text-center">
            Tap 🔊 to hear the model, then read it aloud yourself.
          </p>
          <button
            onClick={() => onAnswer('__speaking__')}
            className="w-full py-3 rounded-xl bg-purple-700 hover:bg-purple-600 font-semibold transition-colors active:scale-[0.98]"
          >
            ✅ Done — I read it aloud
          </button>
        </div>
      )}

      {/* Multiple-choice / true-false options */}
      {!isSpeaking && options.length > 0 && (
        <div className="flex flex-col gap-2">
          {options.map((opt) => {
            const isCorrect = opt === question.correctAnswer;
            const wasChosen = opt === lastResult?.answer;
            let cls =
              'w-full text-left px-4 py-3 rounded-xl border transition-colors font-medium text-sm ';
            if (!answered) {
              cls += 'border-gray-700 bg-gray-800 hover:bg-gray-700';
            } else if (isCorrect) {
              cls += 'border-green-500 bg-green-900/40 text-green-300';
            } else if (wasChosen && !lastResult?.correct) {
              cls += 'border-red-500 bg-red-900/40 text-red-300';
            } else {
              cls += 'border-gray-700 bg-gray-800 opacity-50';
            }
            return (
              <button key={opt} className={cls} onClick={() => onAnswer(opt)} disabled={answered}>
                {answered && isCorrect ? '✅ ' : ''}
                {answered && wasChosen && !lastResult?.correct ? '❌ ' : ''}
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {/* Fill-in */}
      {!isSpeaking && options.length === 0 && !answered && (
        <FillIn onAnswer={onAnswer} />
      )}

      {/* Feedback */}
      {answered && lastResult && !isSpeaking && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            lastResult.correct
              ? 'bg-green-900/50 text-green-300 border border-green-700'
              : 'bg-red-900/50 text-red-300 border border-red-700'
          }`}
        >
          {lastResult.correct
            ? `✅ Correct! +${lastResult.pointsEarned} pts`
            : `❌ Wrong. Correct: "${question.correctAnswer}".`}
          {'explanation' in question && question.explanation && (
            <span className="block text-xs opacity-80 mt-1">{question.explanation}</span>
          )}
          {'reference' in question && question.reference && (
            <span className="block text-xs text-indigo-400 mt-1">{String(question.reference)}</span>
          )}
          {'alternatives' in question &&
            Array.isArray(question.alternatives) &&
            (question.alternatives as string[]).length > 0 &&
            !lastResult.correct && (
              <span className="block text-xs opacity-70 mt-1">
                Also accepted: {(question.alternatives as string[]).join(', ')}
              </span>
            )}
          {!lastResult.correct && supported && (
            <div className="mt-2">
              <AudioButton text={question.correctAnswer} gender={voiceGender} lang={voiceLang} label="🔊 Hear correct" />
            </div>
          )}
        </div>
      )}

      {answered && isSpeaking && (
        <div className="rounded-xl px-4 py-3 text-sm bg-purple-900/40 border border-purple-700 text-purple-200">
          🗣️ Keep practicing! Listen again and repeat.
          {supported && (
            <div className="mt-2">
              <AudioButton text={audioText} gender={voiceGender} lang={voiceLang} label="🔊 Listen again" />
            </div>
          )}
        </div>
      )}

      {answered && (
        <div className="flex items-center justify-end px-1">
          <ReportButton questionId={question.id} packId={packId} originalItem={ex ?? undefined} />
        </div>
      )}

      {answered && (
        <button
          onClick={onNext}
          className="mt-1 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold transition-colors"
        >
          Next →
        </button>
      )}
    </div>
  );
}

// ─── Fill-in component ────────────────────────────────────────────────────────

function FillIn({ onAnswer }: { onAnswer: (v: string) => void }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const val = (e.currentTarget.elements.namedItem('ans') as HTMLInputElement).value;
        if (val.trim()) onAnswer(val.trim());
      }}
      className="flex gap-2"
    >
      <input
        name="ans"
        autoFocus
        placeholder="Type your answer…"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500"
      />
      <button
        type="submit"
        className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm transition-colors"
      >
        OK
      </button>
    </form>
  );
}
