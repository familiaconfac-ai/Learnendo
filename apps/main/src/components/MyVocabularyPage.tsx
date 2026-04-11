/**
 * MyVocabularyPage
 *
 * Displays all vocabulary words the user saved from the Workspace popup.
 * Supports list view, audio playback, delete, and a flashcard mode.
 *
 * Data source: users/{userId}/vocabulary  (ordered by createdAt DESC)
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  listVocabularyEntries,
  deleteVocabularyEntry,
  VocabularyEntryDoc,
} from '../services/vocabularyService';
import { speak } from '../services/ttsService';

// ── Types & constants ─────────────────────────────────────────────────────────

type UILang = 'en' | 'pt' | 'es';
type ViewMode = 'list' | 'flashcard';

const LABELS: Record<UILang, {
  title: string;
  empty: string;
  loading: string;
  error: string;
  deleteConfirm: string;
  flashcardMode: string;
  listMode: string;
  showTranslation: string;
  next: string;
  prev: string;
  of: string;
  noTranslation: string;
  back: string;
  wordsCount: (n: number) => string;
  retry: string;
  playAudio: string;
  delete: string;
}> = {
  en: {
    title: 'My Vocabulary',
    empty: 'No words saved yet. Select a word in the workspace to get started.',
    loading: 'Loading vocabulary…',
    error: 'Could not load vocabulary. Please try again.',
    deleteConfirm: 'Delete this word?',
    flashcardMode: 'Flashcard',
    listMode: 'List',
    showTranslation: 'Show translation',
    next: 'Next',
    prev: 'Previous',
    of: 'of',
    noTranslation: '(no translation)',
    back: 'Back',
    wordsCount: (n) => `${n} word${n !== 1 ? 's' : ''}`,
    retry: 'Retry',
    playAudio: 'Play audio',
    delete: 'Delete',
  },
  pt: {
    title: 'Meu Vocabulário',
    empty: 'Nenhuma palavra salva ainda. Selecione uma palavra na lousa para começar.',
    loading: 'Carregando vocabulário…',
    error: 'Não foi possível carregar o vocabulário. Tente novamente.',
    deleteConfirm: 'Excluir esta palavra?',
    flashcardMode: 'Flashcard',
    listMode: 'Lista',
    showTranslation: 'Ver tradução',
    next: 'Próxima',
    prev: 'Anterior',
    of: 'de',
    noTranslation: '(sem tradução)',
    back: 'Voltar',
    wordsCount: (n) => `${n} palavra${n !== 1 ? 's' : ''}`,
    retry: 'Tentar novamente',
    playAudio: 'Ouvir',
    delete: 'Excluir',
  },
  es: {
    title: 'Mi Vocabulario',
    empty: 'No hay palabras guardadas aún. Selecciona una palabra en la pizarra para empezar.',
    loading: 'Cargando vocabulario…',
    error: 'No se pudo cargar el vocabulario. Inténtalo de nuevo.',
    deleteConfirm: '¿Eliminar esta palabra?',
    flashcardMode: 'Flashcard',
    listMode: 'Lista',
    showTranslation: 'Ver traducción',
    next: 'Siguiente',
    prev: 'Anterior',
    of: 'de',
    noTranslation: '(sin traducción)',
    back: 'Volver',
    wordsCount: (n) => `${n} palabra${n !== 1 ? 's' : ''}`,
    retry: 'Reintentar',
    playAudio: 'Escuchar',
    delete: 'Eliminar',
  },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface MyVocabularyPageProps {
  userId: string;
  uiLanguage?: UILang;
  onBack: () => void;
}

// ── FlashCard ─────────────────────────────────────────────────────────────────

const FlashCard: React.FC<{
  entry: VocabularyEntryDoc;
  index: number;
  total: number;
  L: (typeof LABELS)[UILang];
  onPrev: () => void;
  onNext: () => void;
}> = ({ entry, index, total, L, onPrev, onNext }) => {
  const [revealed, setRevealed] = useState(false);

  // Reset revealed state when card changes
  useEffect(() => { setRevealed(false); }, [entry.id]);

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4">
      {/* Progress counter */}
      <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">
        {index + 1} {L.of} {total}
      </p>

      {/* Card face */}
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden cursor-pointer select-none"
        style={{ minHeight: '200px' }}
        onClick={() => setRevealed((r) => !r)}
      >
        {/* Word side */}
        <div className="flex flex-col items-center justify-center gap-3 p-8" style={{ minHeight: '200px' }}>
          <span className="text-3xl font-bold text-slate-800 text-center break-words">
            {entry.text}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); speak(entry.text, entry.sourceLang); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition"
          >
            🔊
          </button>

          {/* Translation panel */}
          <div
            className={`mt-2 transition-all duration-300 overflow-hidden ${revealed ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}
          >
            <div className="border-t border-slate-100 pt-3 mt-3 text-center">
              <span className="text-lg text-blue-700 font-medium break-words">
                {entry.translation || L.noTranslation}
              </span>
            </div>
          </div>

          {!revealed && (
            <span className="text-xs text-slate-400 mt-1">{L.showTranslation} →</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={onPrev}
          disabled={index === 0}
          className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition shadow-sm"
        >
          ← {L.prev}
        </button>
        <button
          onClick={onNext}
          disabled={index === total - 1}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-30 transition shadow-sm"
        >
          {L.next} →
        </button>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export const MyVocabularyPage: React.FC<MyVocabularyPageProps> = ({
  userId,
  uiLanguage = 'en',
  onBack,
}) => {
  const L = LABELS[uiLanguage] ?? LABELS.en;

  const [entries, setEntries] = useState<VocabularyEntryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [flashIndex, setFlashIndex] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listVocabularyEntries(userId);
      setEntries(list);
    } catch {
      setError(L.error);
    } finally {
      setLoading(false);
    }
  }, [userId, L.error]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!window.confirm(L.deleteConfirm)) return;
    setDeletingId(id);
    try {
      await deleteVocabularyEntry(userId, id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      // Keep flashcard index in bounds
      setFlashIndex((i) => Math.max(0, Math.min(i, entries.length - 2)));
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 transition"
            aria-label={L.back}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 16 16">
              <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="flex-1 text-base font-bold text-slate-800">{L.title}</h1>
          <span className="text-xs text-slate-400 font-medium">
            {!loading && L.wordsCount(entries.length)}
          </span>
          {/* View mode toggle — only show when there are entries */}
          {entries.length > 0 && !loading && (
            <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {L.listMode}
              </button>
              <button
                onClick={() => { setViewMode('flashcard'); setFlashIndex(0); }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  viewMode === 'flashcard' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {L.flashcardMode}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 pb-20 pt-4">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
            <svg className="w-7 h-7 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <span className="text-sm">{L.loading}</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="mt-8 text-center">
            <p className="text-sm text-red-500 mb-3">{error}</p>
            <button
              onClick={load}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700 transition"
            >
              {L.retry}
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <span className="text-5xl">📖</span>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">{L.empty}</p>
          </div>
        )}

        {/* Flashcard mode */}
        {!loading && !error && entries.length > 0 && viewMode === 'flashcard' && (
          <FlashCard
            entry={entries[flashIndex]}
            index={flashIndex}
            total={entries.length}
            L={L}
            onPrev={() => setFlashIndex((i) => Math.max(0, i - 1))}
            onNext={() => setFlashIndex((i) => Math.min(entries.length - 1, i + 1))}
          />
        )}

        {/* List mode */}
        {!loading && !error && entries.length > 0 && viewMode === 'list' && (
          <ul className="flex flex-col gap-2 pt-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-200 shadow-sm"
              >
                {/* Word + translation */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{entry.text}</p>
                  {entry.translation ? (
                    <p className="text-xs text-slate-500 truncate mt-0.5">{entry.translation}</p>
                  ) : null}
                </div>

                {/* Date badge */}
                {entry.createdAt && (
                  <span className="hidden sm:inline text-[10px] text-slate-300 flex-shrink-0">
                    {entry.createdAt.toDate().toLocaleDateString()}
                  </span>
                )}

                {/* Audio */}
                <button
                  onClick={() => speak(entry.text, entry.sourceLang)}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                  title={L.playAudio}
                  aria-label={L.playAudio}
                >
                  🔊
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(entry.id)}
                  disabled={deletingId === entry.id}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition disabled:opacity-40"
                  title={L.delete}
                  aria-label={L.delete}
                >
                  {deletingId === entry.id
                    ? <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83"/></svg>
                    : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 16 16"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M4 4l1 9h6l1-9"/></svg>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
