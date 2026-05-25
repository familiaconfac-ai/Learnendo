import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteVocabularyEntry,
  fetchPhoneticForPhrase,
  listVocabularyEntries,
  translateText,
  updateVocabularyEntry,
  type VocabularyEntryDoc,
} from '../services/vocabularyService';
import { speak } from '../services/ttsService';

type UILang = 'en' | 'pt' | 'es';
type ViewMode = 'list' | 'flashcard';

const LABELS: Record<
  UILang,
  {
    title: string;
    empty: string;
    loading: string;
    error: string;
    deleteConfirm: string;
    flashcardMode: string;
    listMode: string;
    next: string;
    prev: string;
    of: string;
    back: string;
    backToRoom: string;
    wordsCount: (n: number) => string;
    retry: string;
    playAudio: string;
    delete: string;
    translation: string;
    phonetic: string;
    grammar: string;
    original: string;
  }
> = {
  en: {
    title: 'My Vocabulary',
    empty: 'No flashcards saved yet. Select text in the room to save one.',
    loading: 'Loading vocabulary...',
    error: 'Could not load vocabulary. Please try again.',
    deleteConfirm: 'Delete this flashcard?',
    flashcardMode: 'Flashcard',
    listMode: 'List',
    next: 'Next',
    prev: 'Previous',
    of: 'of',
    back: 'Back',
    backToRoom: 'Back to room',
    wordsCount: (n) => `${n} card${n === 1 ? '' : 's'}`,
    retry: 'Retry',
    playAudio: 'Play audio',
    delete: 'Delete',
    translation: 'Translation',
    phonetic: 'Phonetic',
    grammar: 'Grammar',
    original: 'Original',
  },
  pt: {
    title: 'Meu Vocabulario',
    empty: 'Nenhum flashcard salvo ainda. Selecione um texto na sala para salvar.',
    loading: 'Carregando vocabulario...',
    error: 'Nao foi possivel carregar o vocabulario. Tente novamente.',
    deleteConfirm: 'Excluir este flashcard?',
    flashcardMode: 'Flashcard',
    listMode: 'Lista',
    next: 'Proxima',
    prev: 'Anterior',
    of: 'de',
    back: 'Voltar',
    backToRoom: 'Voltar para a sala',
    wordsCount: (n) => `${n} cart${n === 1 ? 'ao' : 'oes'}`,
    retry: 'Tentar novamente',
    playAudio: 'Ouvir audio',
    delete: 'Excluir',
    translation: 'Traducao',
    phonetic: 'Fonetica',
    grammar: 'Gramatica',
    original: 'Original',
  },
  es: {
    title: 'Mi Vocabulario',
    empty: 'Todavia no hay flashcards guardadas. Selecciona un texto en la sala para guardar uno.',
    loading: 'Cargando vocabulario...',
    error: 'No se pudo cargar el vocabulario. Intentalo de nuevo.',
    deleteConfirm: 'Eliminar esta tarjeta?',
    flashcardMode: 'Tarjetas',
    listMode: 'Lista',
    next: 'Siguiente',
    prev: 'Anterior',
    of: 'de',
    back: 'Volver',
    backToRoom: 'Volver a la sala',
    wordsCount: (n) => `${n} tarjeta${n === 1 ? '' : 's'}`,
    retry: 'Reintentar',
    playAudio: 'Escuchar audio',
    delete: 'Eliminar',
    translation: 'Traduccion',
    phonetic: 'Fonetica',
    grammar: 'Gramatica',
    original: 'Original',
  },
};

interface MyVocabularyPageProps {
  userId: string;
  uiLanguage?: UILang;
  onBack: () => void;
}

function getVisibleTranslations(entry: VocabularyEntryDoc, uiLanguage: UILang) {
  const pt = entry.translationPt?.trim() || '';
  const es = entry.translationEs?.trim() || '';
  const fallback = entry.translation?.trim() || '';

  if (uiLanguage === 'es') {
    return {
      primary: es || fallback,
      secondary: pt,
    };
  }

  if (uiLanguage === 'pt') {
    return {
      primary: pt || fallback,
      secondary: es,
    };
  }

  return {
    primary: pt || fallback,
    secondary: es,
  };
}

function isUsefulTranslation(value: string, original: string) {
  const normalizedValue = value.trim().toLowerCase();
  const normalizedOriginal = original.trim().toLowerCase();
  return Boolean(normalizedValue) && normalizedValue !== normalizedOriginal;
}

function inferGrammar(text: string, uiLanguage: UILang): { label: string; note: string } {
  const normalized = text.trim().toLowerCase();

  if (normalized.includes('___')) {
    if (uiLanguage === 'es') {
      return { label: 'Completar', note: 'La frase trabaja un espacio en blanco dentro de una estructura ya modelada.' };
    }
    if (uiLanguage === 'pt') {
      return { label: 'Complete', note: 'A frase trabalha uma lacuna dentro de uma estrutura ja modelada.' };
    }
    return { label: 'Fill in the blank', note: 'This sentence focuses on completing the missing part inside a known structure.' };
  }

  if (/\?$/.test(normalized)) {
    if (uiLanguage === 'es') {
      return { label: 'Pregunta', note: 'La estructura esta en forma de pregunta y trabaja el orden del auxiliar.' };
    }
    if (uiLanguage === 'pt') {
      return { label: 'Pergunta', note: 'A estrutura esta em forma de pergunta e trabalha a ordem do auxiliar.' };
    }
    return { label: 'Question form', note: 'This sentence trains question order and the use of an auxiliary verb.' };
  }

  if (/\b(had\s+\w+ed|had\s+\w+en|had\s+lost|had\s+gone|had\s+done|had\s+been)\b/.test(normalized)) {
    if (uiLanguage === 'es') {
      return { label: 'Past perfect', note: 'La frase presenta una accion anterior a otra accion pasada.' };
    }
    if (uiLanguage === 'pt') {
      return { label: 'Past perfect', note: 'A frase apresenta uma acao anterior a outra acao passada.' };
    }
    return { label: 'Past perfect', note: 'The sentence shows an action completed before another past moment.' };
  }

  if (/\b(am|is|are)\b/.test(normalized)) {
    if (uiLanguage === 'es') {
      return { label: 'Verb to be', note: 'La frase practica el uso del verbo to be en presente.' };
    }
    if (uiLanguage === 'pt') {
      return { label: 'Verb to be', note: 'A frase pratica o uso do verbo to be no presente.' };
    }
    return { label: 'Verb to be', note: 'The sentence practices the present form of the verb to be.' };
  }

  if (uiLanguage === 'es') {
    return { label: 'Grammar point', note: 'Usa esta tarjeta para revisar vocabulario y la estructura general de la frase.' };
  }
  if (uiLanguage === 'pt') {
    return { label: 'Ponto gramatical', note: 'Use este cartao para revisar vocabulario e a estrutura geral da frase.' };
  }
  return { label: 'Grammar point', note: 'Use this card to review vocabulary and the overall sentence structure.' };
}

const FlashCard: React.FC<{
  entry: VocabularyEntryDoc;
  index: number;
  total: number;
  uiLanguage: UILang;
  labels: (typeof LABELS)[UILang];
  userId: string;
  onPrev: () => void;
  onNext: () => void;
}> = ({ entry, index, total, uiLanguage, labels, userId, onPrev, onNext }) => {
  const [showTranslation, setShowTranslation] = useState(false);
  const [activePanel, setActivePanel] = useState<'phonetic' | 'grammar' | null>(null);
  const [phonetic, setPhonetic] = useState(entry.phonetic?.trim() || '');
  const [phoneticLoading, setPhoneticLoading] = useState(false);
  const [grammarDraft, setGrammarDraft] = useState(entry.grammarNote?.trim() || '');
  const [savingGrammar, setSavingGrammar] = useState(false);
  const [dynamicTranslations, setDynamicTranslations] = useState<{ pt: string; es: string }>({
    pt: entry.translationPt?.trim() || '',
    es: entry.translationEs?.trim() || '',
  });
  const [translationLoading, setTranslationLoading] = useState(false);

  const translations = useMemo(() => getVisibleTranslations({
    ...entry,
    translationPt: dynamicTranslations.pt,
    translationEs: dynamicTranslations.es,
  }, uiLanguage), [dynamicTranslations.es, dynamicTranslations.pt, entry, uiLanguage]);
  const grammar = useMemo(() => {
    const label = entry.grammarLabel?.trim() || '';
    const note = entry.grammarNote?.trim() || '';
    if (label || note) return { label, note };
    return inferGrammar(entry.text, uiLanguage);
  }, [entry, uiLanguage]);

  useEffect(() => {
    setShowTranslation(false);
    setActivePanel(null);
    setPhonetic(entry.phonetic?.trim() || '');
    setGrammarDraft(entry.grammarNote?.trim() || '');
    setDynamicTranslations({
      pt: entry.translationPt?.trim() || '',
      es: entry.translationEs?.trim() || '',
    });
  }, [entry.id, entry.phonetic, entry.grammarNote, entry.translationEs, entry.translationPt]);

  useEffect(() => {
    if (isUsefulTranslation(dynamicTranslations.pt, entry.text) && isUsefulTranslation(dynamicTranslations.es, entry.text)) return;
    let cancelled = false;
    setTranslationLoading(true);
    Promise.all([
      translateText(entry.text, entry.sourceLang, 'pt'),
      translateText(entry.text, entry.sourceLang, 'es'),
    ])
      .then(([pt, es]) => {
        if (!cancelled) {
          setDynamicTranslations({
            pt: isUsefulTranslation(pt, entry.text) ? pt.trim() : dynamicTranslations.pt,
            es: isUsefulTranslation(es, entry.text) ? es.trim() : dynamicTranslations.es,
          });
        }
      })
      .finally(() => {
        if (!cancelled) setTranslationLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dynamicTranslations.es, dynamicTranslations.pt, entry.sourceLang, entry.text]);

  useEffect(() => {
    if (activePanel !== 'phonetic' || phonetic) return;
    let cancelled = false;
    setPhoneticLoading(true);
    fetchPhoneticForPhrase(entry.text)
      .then((result) => {
        if (!cancelled) setPhonetic(result.trim());
      })
      .finally(() => {
        if (!cancelled) setPhoneticLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activePanel, entry.text, phonetic]);

  const saveGrammarNote = useCallback(async () => {
    const nextNote = grammarDraft.trim();
    if (nextNote === (entry.grammarNote?.trim() || '')) return;
    setSavingGrammar(true);
    try {
      await updateVocabularyEntry(userId, entry.id, {
        grammarLabel: grammar.label,
        grammarNote: nextNote,
      });
    } finally {
      setSavingGrammar(false);
    }
  }, [entry.grammarNote, entry.id, grammar.label, grammarDraft, userId]);

  const showCardFront = activePanel === null && !showTranslation;
  const showCardBack = activePanel === null && showTranslation;

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {index + 1} {labels.of} {total}
      </div>

      <div className="relative w-full max-w-xl">
        {activePanel === 'phonetic' && (
          <div className="absolute inset-x-6 top-4 z-20 rounded-2xl border border-purple-100 bg-white/98 p-4 shadow-2xl">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-400">{labels.phonetic}</div>
            <div className="text-lg font-mono leading-relaxed text-purple-700 break-words whitespace-pre-wrap">
              {phoneticLoading ? labels.loading : phonetic || entry.text}
            </div>
          </div>
        )}
        {activePanel === 'grammar' && (
          <div className="absolute inset-x-6 top-4 z-20 rounded-2xl border border-emerald-100 bg-white/98 p-4 shadow-2xl">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">{labels.grammar}</div>
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">{grammar.label}</div>
            <textarea
              value={grammarDraft || grammar.note}
              onChange={(event) => setGrammarDraft(event.target.value)}
              onBlur={() => void saveGrammarNote()}
              className="mt-2 min-h-24 w-full rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-sm leading-relaxed text-slate-600 outline-none transition focus:border-emerald-300 focus:bg-white"
            />
            <div className="mt-2 text-[11px] text-emerald-500">{savingGrammar ? labels.loading : ''}</div>
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="flex min-h-[260px] items-center justify-center px-8 py-10 text-center">
            {showCardFront ? (
              <div className="text-4xl font-bold text-slate-900 break-words">{entry.text}</div>
            ) : showCardBack ? (
              <div className="space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {labels.translation}
                </div>
                <div className="text-3xl font-bold text-blue-700 break-words">
                  {translationLoading ? labels.loading : (translations.primary || entry.text)}
                </div>
                {translations.secondary ? (
                  <div className="text-lg font-medium text-slate-500 break-words">{translations.secondary}</div>
                ) : null}
              </div>
            ) : (
              <div className="h-24" />
            )}
          </div>

          <div className="grid grid-cols-4 border-t border-slate-100 divide-x divide-slate-100">
            <button
              type="button"
              onClick={() => speak(entry.text, entry.sourceLang)}
              className="flex flex-col items-center gap-1 py-3 text-slate-500 transition hover:bg-slate-50"
            >
              <span className="text-base">🔊</span>
              <span className="text-[10px]">{labels.playAudio}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePanel(null);
                setShowTranslation((value) => !value);
              }}
              className={`flex flex-col items-center gap-1 py-3 transition ${
                showTranslation ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span className="text-base">🌐</span>
              <span className="text-[10px]">{labels.translation}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowTranslation(false);
                setActivePanel((value) => (value === 'phonetic' ? null : 'phonetic'));
              }}
              className={`flex flex-col items-center gap-1 py-3 transition ${
                activePanel === 'phonetic' ? 'bg-purple-50 text-purple-700' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span className="text-base">🔤</span>
              <span className="text-[10px]">{labels.phonetic}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowTranslation(false);
                setActivePanel((value) => (value === 'grammar' ? null : 'grammar'));
              }}
              className={`flex flex-col items-center gap-1 py-3 transition ${
                activePanel === 'grammar' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span className="text-base">📘</span>
              <span className="text-[10px]">{labels.grammar}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onPrev}
          disabled={index === 0}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-30"
        >
          ← {labels.prev}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={index === total - 1}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-30"
        >
          {labels.next} →
        </button>
      </div>
    </div>
  );
};

export const MyVocabularyPage: React.FC<MyVocabularyPageProps> = ({
  userId,
  uiLanguage = 'en',
  onBack,
}) => {
  const labels = LABELS[uiLanguage] ?? LABELS.en;
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
      const nextEntries = await listVocabularyEntries(userId);
      setEntries(nextEntries);
    } catch {
      setError(labels.error);
    } finally {
      setLoading(false);
    }
  }, [labels.error, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!window.confirm(labels.deleteConfirm)) return;
    setDeletingId(id);
    try {
      await deleteVocabularyEntry(userId, id);
      setEntries((previous) => previous.filter((entry) => entry.id !== id));
      setFlashIndex((previous) => Math.max(0, Math.min(previous, entries.length - 2)));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex justify-center px-4 pt-4">
        <div className="w-full max-w-3xl">
          <button
            type="button"
            onClick={onBack}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            aria-label={labels.backToRoom}
          >
            <span aria-hidden="true">←</span>
            <span>{labels.backToRoom}</span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-24 pt-20">
        <div className="mb-4 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-slate-900">{labels.title}</h1>
            <p className="text-xs text-slate-400">{!loading ? labels.wordsCount(entries.length) : labels.loading}</p>
          </div>
          {entries.length > 0 && !loading && (
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                {labels.listMode}
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('flashcard');
                  setFlashIndex(0);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  viewMode === 'flashcard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                {labels.flashcardMode}
              </button>
            </div>
          )}
        </div>
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
            <span className="text-sm">{labels.loading}</span>
          </div>
        )}

        {!loading && error && (
          <div className="mt-8 text-center">
            <p className="mb-3 text-sm text-red-500">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-700"
            >
              {labels.retry}
            </button>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <span className="text-5xl">📖</span>
            <p className="max-w-xs text-sm leading-relaxed text-slate-400">{labels.empty}</p>
          </div>
        )}

        {!loading && !error && entries.length > 0 && viewMode === 'flashcard' && (
          <FlashCard
            entry={entries[flashIndex]}
            index={flashIndex}
            total={entries.length}
            uiLanguage={uiLanguage}
            labels={labels}
            userId={userId}
            onPrev={() => setFlashIndex((value) => Math.max(0, value - 1))}
            onNext={() => setFlashIndex((value) => Math.min(entries.length - 1, value + 1))}
          />
        )}

        {!loading && !error && entries.length > 0 && viewMode === 'list' && (
          <ul className="flex flex-col gap-3 pt-2">
            {entries.map((entry, index) => {
              const translations = getVisibleTranslations(entry, uiLanguage);
              return (
                <li
                  key={entry.id}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/30"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setFlashIndex(index);
                    setViewMode('flashcard');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setFlashIndex(index);
                      setViewMode('flashcard');
                    }
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{entry.text}</p>
                    {translations.primary ? (
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {translations.primary}
                        {translations.secondary ? ` · ${translations.secondary}` : ''}
                      </p>
                    ) : null}
                  </div>
                  {entry.createdAt && (
                    <span className="hidden flex-shrink-0 text-[10px] text-slate-300 sm:inline">
                      {entry.createdAt.toDate().toLocaleDateString()}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void speak(entry.text, entry.sourceLang);
                    }}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                    title={labels.playAudio}
                    aria-label={labels.playAudio}
                  >
                    🔊
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDelete(entry.id);
                    }}
                    disabled={deletingId === entry.id}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-400 disabled:opacity-40"
                    title={labels.delete}
                    aria-label={labels.delete}
                  >
                    {deletingId === entry.id ? '…' : '🗑'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
