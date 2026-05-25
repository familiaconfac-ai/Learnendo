/**
 * Import section – PDF → Lesson Pack wizard.
 *
 * ─── Flow ─────────────────────────────────────────────────────────────────────
 *
 *  list        → list of already-imported packs + "+" button
 *  upload      → drag-drop / file pick + paste-text fallback
 *  extracting  → spinner while pdfjs extracts text (async)
 *  review      → editable draft: title, lesson number, language, themes, vocab
 *  (save)      → expands items via buildFullLessonItems → saves to localStorage
 *
 * ─── Storage ──────────────────────────────────────────────────────────────────
 *  Key: lab_imported_packs
 *  Shape: LessonPack[] (same as LESSON_PACKS; vocabulary + structures optional)
 *  Consumed by: Exercises/buildPacks, Battle/buildPackList, Packs/LessonsTab
 *
 *  ⚠️  This file is a COMPLETE REWRITE from the MVP text-paste version.
 *
 * PDF extraction uses pdfjs-dist (lazy loaded, CDN worker).
 * Text files (.txt / .md) are read directly via FileReader.
 * Scanned PDFs with no text layer are not supported; user is prompted
 * to paste text manually in that case.
 */

import { useState, useRef } from 'react';
import type { LessonPack, VocabEntry, LanguageCode } from '../../types';
import { parseLessonText, type ParsedDraft } from '../../engine/lessonParser';
import { extractPdfText } from '../../services/pdfExtractor';
import { buildFullLessonItems } from '../../engine/lessonBuilder';
import { buildMultiVariantLesson } from '../../engine/lessonVariants';
import { saveVariantLesson } from '../../services/variantStore';
import { getStorage } from '../../services/storage';

// ─── Storage ──────────────────────────────────────────────────────────────────

export function loadImportedPacks(): LessonPack[] {
  return getStorage().getImportedPacks();
}

function saveImportedPacks(packs: LessonPack[]) {
  getStorage().setImportedPacks(packs);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LANG_LABELS: Record<LanguageCode, string> = {
  en: 'English', pt: 'Portuguese', es: 'Spanish', el: 'Greek', he: 'Hebrew',
};

type Screen = 'list' | 'upload' | 'extracting' | 'review';

// ─── Sub-component: vocabulary row ────────────────────────────────────────────

function VocabRow({
  entry,
  onChange,
  onDelete,
}: {
  entry: VocabEntry;
  onChange: (v: VocabEntry) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex gap-1.5 items-center">
      <input
        value={entry.word}
        onChange={(e) => onChange({ ...entry, word: e.target.value })}
        placeholder="word / phrase"
        className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500 transition-colors"
      />
      <input
        value={entry.translation}
        onChange={(e) => onChange({ ...entry, translation: e.target.value })}
        placeholder="translation"
        className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500 transition-colors"
      />
      <button
        onClick={onDelete}
        className="shrink-0 w-7 h-7 flex items-center justify-center text-red-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
        aria-label="Remove word"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ImportSection() {
  const [screen, setScreen] = useState<Screen>('list');
  const [packs, setPacks] = useState<LessonPack[]>(loadImportedPacks);

  // Upload screen state
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState('');
  const [extractError, setExtractError] = useState('');
  const [extractStatus, setExtractStatus] = useState('');

  // Review screen — editable draft state
  const [draft, setDraft] = useState<ParsedDraft | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLessonNum, setEditLessonNum] = useState('');
  const [editLang, setEditLang] = useState<LanguageCode>('en');
  const [editThemes, setEditThemes] = useState<string[]>([]);
  const [editVocab, setEditVocab] = useState<VocabEntry[]>([]);
  const [newTheme, setNewTheme] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);

  // ── Pack CRUD ─────────────────────────────────────────────────────────────────

  function deletePack(id: string) {
    const updated = packs.filter((p) => p.id !== id);
    setPacks(updated);
    saveImportedPacks(updated);
  }

  // ── Parse entry point ─────────────────────────────────────────────────────────

  function runParser(text: string, title?: string) {
    const packId = `imp-${Date.now()}`;
    const parsed = parseLessonText(text, {
      packId,
      language: editLang,
      titleHint: title,
    });
    setDraft(parsed);
    setEditTitle(title?.trim() || parsed.suggestedTitle);
    setEditLessonNum(
      parsed.suggestedLessonNumber ? String(parsed.suggestedLessonNumber) : '',
    );
    setEditThemes(parsed.suggestedThemes);
    setEditVocab(parsed.vocabulary.map((v) => ({ ...v })));
    setScreen('review');
  }

  // ── File handler ──────────────────────────────────────────────────────────────

  async function handleFile(file: File) {
    setExtractError('');
    setFileName(file.name);

    if (file.name.toLowerCase().endsWith('.pdf')) {
      setScreen('extracting');
      setExtractStatus(`Reading ${file.name}…`);
      try {
        const result = await extractPdfText(file);
        if (result.fullText.trim().length < 30) {
          setExtractError(
            'This PDF has no selectable text layer (likely a scanned image). ' +
            'Please paste the lesson text manually below.',
          );
          setScreen('upload');
          return;
        }
        setExtractStatus(
          `Got ${result.fullText.length} characters from ${result.pageCount} page(s).`,
        );
        runParser(result.fullText);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setExtractError(
          `Could not extract PDF text (${msg}). ` +
          'Please paste the lesson text manually below.',
        );
        setScreen('upload');
      }
      return;
    }

    // Plain text / markdown
    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string ?? '');
        reader.onerror = () => reject(new Error('File read error'));
        reader.readAsText(file, 'utf-8');
      });
      runParser(text, file.name.replace(/\.[^.]+$/, ''));
    } catch {
      setExtractError('Could not read the file. Please paste the lesson text manually.');
      setScreen('upload');
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────────

  function saveLessonPack() {
    if (!draft) return;
    const id = `imp-${Date.now()}`;
    const cleanVocab = editVocab.filter(
      (v) => v.word.trim().length > 0 && v.translation.trim().length > 0,
    );
    const lessonNumber = editLessonNum ? parseInt(editLessonNum, 10) : undefined;

    const partial: LessonPack = {
      id,
      language: editLang,
      title: editTitle.trim() || 'Imported Lesson',
      description: `Imported${lessonNumber ? ` · L${lessonNumber}` : ''} · ${LANG_LABELS[editLang]}`,
      lessonNumber,
      themes: editThemes.filter(Boolean),
      vocabulary: cleanVocab,
      structures: draft.structures,
      items: draft.exercises,  // raw detected; buildFullLessonItems adds vocab drills
    };

    const expanded = buildFullLessonItems(partial);
    const fullPack: LessonPack = { ...partial, items: expanded };

    const updated = [...packs, fullPack];
    setPacks(updated);
    saveImportedPacks(updated);

    // Build and persist multi-variant lesson (EN base + PT/ES auto-generated stubs)
    saveVariantLesson(buildMultiVariantLesson(fullPack));

    // Reset
    setDraft(null);
    setEditTitle('');
    setEditLessonNum('');
    setEditThemes([]);
    setEditVocab([]);
    setPastedText('');
    setFileName('');
    setScreen('list');
  }

  function startNew() {
    setPastedText('');
    setFileName('');
    setExtractError('');
    setExtractStatus('');
    setDraft(null);
    setScreen('upload');
  }

  // ─── Screen: Extracting ────────────────────────────────────────────────────────

  if (screen === 'extracting') {
    return (
      <div className="flex flex-col items-center justify-center max-w-md mx-auto px-4 py-16 gap-6">
        <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-center space-y-1">
          <p className="font-semibold text-white">Extracting PDF text…</p>
          <p className="text-sm text-gray-400">{fileName}</p>
          {extractStatus && <p className="text-xs text-gray-500 mt-1">{extractStatus}</p>}
        </div>
        <p className="text-xs text-gray-600 text-center max-w-xs">
          Loading PDF worker on first use may take a moment (requires internet connection).
        </p>
      </div>
    );
  }

  // ─── Screen: Upload ────────────────────────────────────────────────────────────

  if (screen === 'upload') {
    return (
      <div className="flex flex-col max-w-md mx-auto px-4 py-4 gap-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setScreen('list')} className="text-sm text-gray-400 hover:text-white">
            ← Back
          </button>
          <h2 className="font-bold text-base flex-1">Import Lesson</h2>
        </div>

        {/* File drop zone */}
        <div
          className="border-2 border-dashed border-gray-700 rounded-2xl p-5 flex flex-col items-center gap-3 text-center hover:border-indigo-600 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
        >
          <span className="text-4xl">📄</span>
          <div>
            <p className="text-sm font-medium text-white">Upload PDF or text file</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Drag & drop, or choose a file (.pdf · .txt · .md)
            </p>
          </div>
          {fileName && (
            <p className="text-xs font-mono text-indigo-400 bg-indigo-950/40 rounded px-2 py-1">
              📎 {fileName}
            </p>
          )}
          <input
            type="file"
            accept=".pdf,.txt,.md"
            ref={fileRef}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition-colors"
          >
            Choose File
          </button>
          {extractError && (
            <div className="text-xs text-amber-400 text-left border border-amber-700/40 bg-amber-950/20 rounded-xl px-3 py-2 w-full">
              ⚠️ {extractError}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-xs text-gray-600">or paste text</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* Text paste */}
        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          rows={8}
          placeholder={'Paste lesson content here…\n\nExample:\nhello – olá\ngoodbye – adeus\n\n1. How do you greet a friend?\n   A) Hello  B) Goodbye  C) Thanks\n   Answer: A'}
          className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500 resize-none font-mono leading-relaxed"
        />

        {/* Language + title */}
        <div className="flex gap-2">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Lesson title (optional)"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <select
            value={editLang}
            onChange={(e) => setEditLang(e.target.value as LanguageCode)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm outline-none"
          >
            {(Object.entries(LANG_LABELS) as [LanguageCode, string][]).map(([code]) => (
              <option key={code} value={code}>{code.toUpperCase()}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => runParser(pastedText, editTitle || undefined)}
          disabled={pastedText.trim().length < 10}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm transition-colors"
        >
          Parse Lesson →
        </button>
      </div>
    );
  }

  // ─── Screen: Review ────────────────────────────────────────────────────────────

  if (screen === 'review' && draft) {
    // Live preview of total exercises (updates as vocab is edited)
    const previewPack: LessonPack = {
      id: 'preview',
      language: editLang,
      title: editTitle,
      description: '',
      vocabulary: editVocab,
      structures: draft.structures,
      items: draft.exercises,
    };
    const totalExercises = buildFullLessonItems(previewPack).length;
    const generatedCount = totalExercises - draft.exercises.length;

    return (
      <div className="flex flex-col max-w-md mx-auto px-4 py-4 gap-4 pb-24">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 pt-1 pb-3 flex items-center gap-2">
          <button onClick={() => setScreen('upload')} className="text-sm text-gray-400 hover:text-white shrink-0">
            ← Back
          </button>
          <h2 className="font-bold text-base flex-1 truncate">Review Draft</h2>
          <button
            onClick={saveLessonPack}
            className="px-4 py-1.5 rounded-xl bg-green-700 hover:bg-green-600 text-sm font-semibold shrink-0"
          >
            Save ✅
          </button>
        </div>

        {/* Warning if empty parse */}
        {draft.vocabulary.length === 0 && draft.exercises.length === 0 && (
          <div className="bg-amber-950/30 border border-amber-700/40 rounded-xl px-3 py-2 text-xs text-amber-400">
            ⚠️ Parser found no vocabulary or exercises. Check text format — or add vocabulary rows manually below.
          </div>
        )}

        {/* Title — Lesson# — Language */}
        <div className="flex gap-2">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Lesson title"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500 font-semibold"
          />
          <input
            type="number"
            min={1}
            max={99}
            value={editLessonNum}
            onChange={(e) => setEditLessonNum(e.target.value)}
            placeholder="L#"
            className="w-14 bg-gray-800 border border-gray-700 rounded-xl px-2 py-2.5 text-sm text-center outline-none focus:border-indigo-500"
          />
          <select
            value={editLang}
            onChange={(e) => setEditLang(e.target.value as LanguageCode)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-2 py-2.5 text-sm outline-none"
          >
            {(Object.entries(LANG_LABELS) as [LanguageCode, string][]).map(([code]) => (
              <option key={code} value={code}>{code.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Themes */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Topics</p>
          <div className="flex flex-wrap gap-1.5">
            {editThemes.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 text-xs bg-indigo-900/40 border border-indigo-700/40 text-indigo-300 rounded-full pl-2.5 pr-1.5 py-1"
              >
                {t}
                <button
                  onClick={() => setEditThemes(editThemes.filter((x) => x !== t))}
                  className="text-indigo-500 hover:text-red-400 transition-colors"
                >
                  ✕
                </button>
              </span>
            ))}
            <input
              value={newTheme}
              onChange={(e) => setNewTheme(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTheme.trim()) {
                  setEditThemes([...editThemes, newTheme.trim()]);
                  setNewTheme('');
                }
              }}
              placeholder="+ topic"
              className="text-xs bg-transparent border border-dashed border-gray-700 rounded-full px-2.5 py-1 outline-none focus:border-indigo-500 text-gray-400 w-20"
            />
          </div>
        </div>

        {/* Vocabulary editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Vocabulary ({editVocab.length} detected)
            </p>
            <button
              onClick={() => setEditVocab([...editVocab, { word: '', translation: '' }])}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              + Add word
            </button>
          </div>
          {editVocab.length === 0 ? (
            <p className="text-xs text-gray-600 italic py-1">
              No vocabulary detected — add words manually to unlock vocab recognition drills.
            </p>
          ) : (
            <div className="space-y-1.5">
              <div className="flex gap-1.5 text-xs text-gray-600 px-0.5">
                <span className="flex-1">word / phrase</span>
                <span className="flex-1">translation</span>
                <span className="w-7" />
              </div>
              {editVocab.map((v, i) => (
                <VocabRow
                  key={i}
                  entry={v}
                  onChange={(updated) => {
                    const next = [...editVocab];
                    next[i] = updated;
                    setEditVocab(next);
                  }}
                  onDelete={() => setEditVocab(editVocab.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          )}
        </div>

        {/* Exercise summary */}
        <div className="bg-gray-800/60 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Exercises</p>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-indigo-400">{totalExercises}</p>
            <p className="text-xs text-gray-400 pb-0.5">total will be generated</p>
          </div>
          <div className="space-y-0.5 text-xs text-gray-500">
            {draft.exercises.length > 0 && (
              <p>📝 {draft.exercises.length} exercises detected from text</p>
            )}
            {generatedCount > 0 && (
              <p>🧠 +{generatedCount} auto-generated (vocab recognition + drills)</p>
            )}
            {draft.structures.length > 0 && (
              <p>🔧 {draft.structures.length} grammar pattern(s) detected</p>
            )}
          </div>
          <p className="text-xs text-gray-600 border-t border-gray-700 pt-2">
            After saving, this lesson appears in Practice, Battle and the Lessons tab.
          </p>
        </div>

        {/* Save button */}
        <button
          onClick={saveLessonPack}
          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] font-bold text-base transition-all"
        >
          Save Lesson Pack
        </button>
      </div>
    );
  }

  // ─── Screen: List (default) ────────────────────────────────────────────────────

  return (
    <div className="flex flex-col max-w-md mx-auto px-4 py-4 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-base">📥 Import Lessons</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Upload a PDF or paste text to create a lesson pack.
          </p>
        </div>
        <button
          onClick={startNew}
          className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition-colors"
        >
          + Import
        </button>
      </div>

      {packs.length === 0 && (
        <div className="border border-dashed border-gray-700 rounded-2xl py-10 text-center text-gray-600 space-y-1">
          <p className="text-3xl">📚</p>
          <p className="text-sm">No imported lessons yet.</p>
          <p className="text-xs">Tap "+ Import" to upload a PDF or paste lesson text.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {packs.map((p) => (
          <div
            key={p.id}
            className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 flex items-start gap-3"
          >
            <span className="text-xl mt-0.5">📥</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{p.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {p.language.toUpperCase()}
                {p.lessonNumber ? ` · L${p.lessonNumber}` : ''}
                {p.vocabulary ? ` · ${p.vocabulary.length} vocab` : ''}
                {` · ${p.items.length} exercises`}
              </p>
              {p.themes && p.themes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {p.themes.slice(0, 3).map((t) => (
                    <span key={t} className="text-xs bg-indigo-950/40 border border-indigo-800/40 text-indigo-500 rounded px-1.5 py-0.5">
                      {t}
                    </span>
                  ))}
                  {p.themes.length > 3 && (
                    <span className="text-xs text-gray-600">+{p.themes.length - 3}</span>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => deletePack(p.id)}
              className="px-2 py-1 rounded-lg bg-red-900/50 hover:bg-red-800 text-xs text-red-300 transition-colors shrink-0"
            >
              🗑
            </button>
          </div>
        ))}
      </div>

      <div className="border border-gray-800 rounded-xl px-4 py-3 text-xs text-gray-500 space-y-2">
        <p className="font-semibold text-gray-400">How it works</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Upload a PDF or paste lesson text</li>
          <li>App detects vocabulary pairs, grammar patterns and exercises</li>
          <li>Review and adjust the draft — add missing vocab if needed</li>
          <li>Lesson appears in <span className="text-gray-400">Practice</span>, <span className="text-gray-400">Battle</span> and the <span className="text-gray-400">Lessons</span> tab</li>
        </ol>
        <p className="text-gray-600">
          PDF must have a selectable text layer. Scanned PDFs are not supported — paste text manually.
        </p>
      </div>
    </div>
  );
}
