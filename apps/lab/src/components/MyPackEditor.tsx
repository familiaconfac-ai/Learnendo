import { useState } from 'react';
import type { SharedPack, ExerciseItem, ExerciseItemType } from '../types';

// ─── Question types ───────────────────────────────────────────────────────────

export const QUESTION_TYPES: { value: ExerciseItemType; label: string }[] = [
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'fill-in',         label: 'Fill-in / Typed' },
  { value: 'true-false',      label: 'True / False' },
  { value: 'listening',       label: '🎧 Listening' },
  { value: 'speaking',        label: '🗣️ Speaking' },
];

// ─── Question form ────────────────────────────────────────────────────────────

export function QuestionFormPanel({
  initial,
  onSave,
  onCancel,
}: {
  initial?: ExerciseItem;
  onSave: (item: ExerciseItem) => void;
  onCancel: () => void;
}) {
  const [type, setType]           = useState<ExerciseItemType>(initial?.type ?? 'multiple-choice');
  const [prompt, setPrompt]       = useState(initial?.prompt ?? '');
  const [opts, setOpts]           = useState(initial?.options?.join('\n') ?? '');
  const [correct, setCorrect]     = useState(initial?.correctAnswer ?? '');
  const [alts, setAlts]           = useState(initial?.alternatives?.join(', ') ?? '');
  const [audioText, setAudioText] = useState(initial?.audioText ?? '');
  const [hideText, setHideText]   = useState(initial?.hideText ?? false);
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>(initial?.voiceGender ?? 'female');
  const [lang, setLang]           = useState(initial?.voiceLang ?? 'en-US');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || (type !== 'speaking' && !correct.trim())) return;
    const options =
      type === 'true-false' ? ['True', 'False']
      : type === 'multiple-choice' || type === 'listening'
        ? opts.split('\n').map((s) => s.trim()).filter(Boolean)
        : undefined;
    const item: ExerciseItem = {
      id: initial?.id ?? `cq-${Date.now()}`,
      type,
      prompt: prompt.trim(),
      options,
      correctAnswer: correct.trim(),
      alternatives: alts ? alts.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      audioText: audioText.trim() || undefined,
      hideText: hideText || undefined,
      voiceGender,
      voiceLang: lang.trim() || 'en-US',
    };
    onSave(item);
  }

  const showOptions = type === 'multiple-choice' || type === 'listening';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col max-w-md mx-auto px-4 pb-6 gap-4 pt-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onCancel} className="text-sm text-gray-400 hover:text-white">← Cancel</button>
        <h2 className="font-bold text-base flex-1">{initial ? 'Edit Question' : 'New Question'}</h2>
        <button type="submit" className="px-3 py-1.5 rounded-xl bg-indigo-600 text-sm font-semibold">Save</button>
      </div>

      {/* Type */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Type</label>
        <div className="flex flex-wrap gap-1.5">
          {QUESTION_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={[
                'px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border',
                type === t.value
                  ? 'bg-indigo-700 border-indigo-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Prompt / Question</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
          placeholder="Type the question here…"
          className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 resize-none"
          required
        />
      </div>

      {/* Options */}
      {showOptions && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
            Options (one per line)
          </label>
          <textarea
            value={opts}
            onChange={(e) => setOpts(e.target.value)}
            rows={4}
            placeholder={'Option A\nOption B\nOption C\nOption D'}
            className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 resize-none"
          />
        </div>
      )}

      {/* Correct answer */}
      {type !== 'speaking' && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
            Correct Answer
          </label>
          <input
            value={correct}
            onChange={(e) => setCorrect(e.target.value)}
            placeholder="Exact correct answer…"
            className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500"
            required
          />
        </div>
      )}

      {/* Alternatives */}
      {(type === 'fill-in' || type === 'listening') && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
            Accepted Alternatives (comma-separated)
          </label>
          <input
            value={alts}
            onChange={(e) => setAlts(e.target.value)}
            placeholder="e.g. What is, whats"
            className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>
      )}

      {/* Audio */}
      <div className="flex flex-col gap-2 border border-gray-700 rounded-xl p-3">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">🔊 Audio / TTS</p>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Audio text (leave blank to use prompt)</label>
          <input
            value={audioText}
            onChange={(e) => setAudioText(e.target.value)}
            placeholder="Text to speak aloud…"
            className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex gap-3 items-center">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={hideText}
              onChange={(e) => setHideText(e.target.checked)}
              className="accent-indigo-500"
            />
            Hide text (listening mode)
          </label>
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-xs text-gray-500 shrink-0">Voice</label>
          <select
            value={voiceGender}
            onChange={(e) => setVoiceGender(e.target.value as 'female' | 'male')}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs outline-none"
          >
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
          <input
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            placeholder="en-US"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs outline-none"
          />
        </div>
      </div>
    </form>
  );
}

// ─── Pack editor ──────────────────────────────────────────────────────────────

export function PackEditorPanel({
  pack,
  onBack,
  onRename,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onDelete,
  onStartBattle,
  onPlay,
}: {
  pack: SharedPack;
  onBack: () => void;
  onRename: (t: string) => void;
  onAddQuestion: () => void;
  onEditQuestion: (id: string) => void;
  onDeleteQuestion: (id: string) => void;
  onDelete: () => void;
  /** Battle context: show "⚔️ Battle" button */
  onStartBattle?: () => void;
  /** Packs context: show "▶ Play" button */
  onPlay?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(pack.title);

  return (
    <div className="flex flex-col max-w-md mx-auto px-4 pb-6 gap-4 pt-4">
      {/* Title row */}
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-white shrink-0">← Back</button>
        {editing ? (
          <form
            onSubmit={(e) => { e.preventDefault(); onRename(draft); setEditing(false); }}
            className="flex-1 flex gap-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              className="flex-1 bg-gray-800 border border-indigo-500 rounded-xl px-3 py-1.5 text-sm outline-none"
            />
            <button type="submit" className="px-3 py-1.5 rounded-xl bg-indigo-600 text-xs font-semibold">Save</button>
          </form>
        ) : (
          <button onClick={() => setEditing(true)} className="flex-1 text-left font-bold text-base truncate">
            {pack.title} ✏️
          </button>
        )}
      </div>

      {/* Attribution banner */}
      {pack.copiedFrom && (
        <div className="bg-amber-900/20 border border-amber-800/40 rounded-xl px-3 py-2">
          <p className="text-xs text-amber-400">
            Based on <span className="font-semibold">"{pack.copiedFrom.packTitle}"</span>
            {' '}by {pack.copiedFrom.authorName}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {onStartBattle && (
          <button
            onClick={onStartBattle}
            disabled={pack.items.length === 0}
            className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 font-bold text-sm transition-colors"
          >
            ⚔️ Battle ({Math.min(10, pack.items.length)}q)
          </button>
        )}
        {onPlay && (
          <button
            onClick={onPlay}
            disabled={pack.items.length === 0}
            className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 font-bold text-sm transition-colors"
          >
            ▶ Play ({pack.items.length}q)
          </button>
        )}
        <button
          onClick={onAddQuestion}
          className="px-4 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-semibold transition-colors"
        >
          + Add
        </button>
      </div>

      {pack.items.length === 0 && (
        <p className="text-center text-gray-600 text-sm py-6">
          No questions yet. Tap "+ Add" to create one.
        </p>
      )}

      {/* Question list */}
      <div className="flex flex-col gap-2">
        {pack.items.map((item, i) => (
          <div key={item.id} className="bg-gray-800 rounded-xl px-3 py-3 flex items-start gap-2">
            <span className="text-xs text-gray-500 shrink-0 mt-0.5 w-5 text-right">{i + 1}.</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.prompt}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {item.type}
                {item.hideText ? ' · 🎧 hidden' : ''}
                {item.audioText ? ' · 🔊' : ''}
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => onEditQuestion(item.id)}
                className="px-2 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs"
              >
                ✏️
              </button>
              <button
                onClick={() => onDeleteQuestion(item.id)}
                className="px-2 py-1 rounded-lg bg-red-900/60 hover:bg-red-800 text-xs text-red-300"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onDelete}
        className="mt-2 text-xs text-red-500 hover:text-red-400 text-center"
      >
        Delete pack
      </button>
    </div>
  );
}
