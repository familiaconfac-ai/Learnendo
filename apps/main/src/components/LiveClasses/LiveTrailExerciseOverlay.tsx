import React, { useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { GRAMMAR_GUIDES } from '../../constants';
import { PracticeSection } from '../UI';
import {
  LiveClassSession,
  LiveExerciseAnswerVerdict,
  LiveExerciseBlock,
  LiveExerciseBlockStatus,
  PracticeItem,
  Workbook,
} from '../../types';
import {
  saveExerciseSession,
  subscribeExerciseBlocks,
  subscribeExerciseSession,
  updateExerciseBlockLivePreview,
  updateExerciseBlockResponse,
} from '../../services/liveSessionService';
import {
  loadWorkbookForWhiteboard,
  resolveLessonForWhiteboard,
} from '../../services/liveWhiteboardActivities';
import { speak as ttsSpeakImpl } from '../../services/ttsService';
import {
  fetchPhoneticForPhrase,
  saveVocabularyEntry,
  translateText,
} from '../../services/vocabularyService';

interface LiveTrailExerciseOverlayProps {
  classId: string;
  user: User;
  session: LiveClassSession;
  isTeacher: boolean;
  assignedRoster: Array<{
    uid: string;
    label: string;
    isOnline: boolean;
  }>;
  defaultCourseId?: string | null;
  uiLanguage?: 'en' | 'pt' | 'es';
  onReturnToWorkspace?: () => void | Promise<void>;
  onOpenSessionPanel?: () => void;
}

type TrailUiLanguage = NonNullable<LiveTrailExerciseOverlayProps['uiLanguage']>;

const TRAIL_COPY = {
  en: {
    liveTrail: 'Live Trail',
    board: 'Board',
    panel: 'Panel',
    previous: 'Previous',
    next: 'Next',
    grammar: 'Grammar',
    clickTranslator: 'Click translator',
    question: 'Question',
    answered: 'Answered',
    waiting: 'Waiting',
    accuracy: 'Accuracy',
    latestAnswer: 'Latest answer',
    noAnswersYet: 'No student has answered this question yet.',
    yourDemo: 'Your live demo for students',
    correct: 'correct',
    incorrect: 'incorrect',
    loadingTrail: 'Loading live trail...',
    teacherPreparingTrail: 'Teacher is preparing the trail...',
    trailComplete: 'Trail completed',
    trailCompleteBody: 'You finished all exercises from this live lesson.',
    loadError: 'Could not load the live trail right now.',
    syncAnswerError: 'Could not sync this answer right now.',
    finishAnswerError: 'Could not finish this answer right now.',
    grammarTitle: (lessonNumber: number) => `Lesson ${lessonNumber} Grammar`,
    noGrammar: 'No grammar notes available for this lesson yet.',
    dictionary: 'Dictionary',
    portuguese: 'Portuguese',
    spanish: 'Spanish',
    loading: 'Loading...',
    audio: 'Audio',
    saved: 'Saved',
    saving: 'Saving...',
    saveFlashcard: 'Save flashcard',
    close: 'Close',
    openTranslatorHint: 'Click a word to translate it',
    verdictCorrect: 'got it right',
    verdictWrong: 'got it wrong',
    verdictAnswered: 'answered',
  },
  pt: {
    liveTrail: 'Trilha Ao Vivo',
    board: 'Lousa',
    panel: 'Painel',
    previous: 'Anterior',
    next: 'Próxima',
    grammar: 'Gramática',
    clickTranslator: 'Tradutor por clique',
    question: 'Questão',
    answered: 'Respondidos',
    waiting: 'Aguardando',
    accuracy: 'Acertos',
    latestAnswer: 'Última resposta',
    noAnswersYet: 'Nenhum aluno respondeu esta questão ainda.',
    yourDemo: 'Sua demonstração visível para os alunos',
    correct: 'correta',
    incorrect: 'incorreta',
    loadingTrail: 'Carregando trilha ao vivo...',
    teacherPreparingTrail: 'Professor preparando a trilha...',
    trailComplete: 'Trilha concluída',
    trailCompleteBody: 'Você terminou todos os exercícios desta aula ao vivo.',
    loadError: 'Não foi possível carregar a trilha ao vivo agora.',
    syncAnswerError: 'Não foi possível sincronizar esta resposta agora.',
    finishAnswerError: 'Não foi possível concluir esta resposta agora.',
    grammarTitle: (lessonNumber: number) => `Gramática da Lição ${lessonNumber}`,
    noGrammar: 'Ainda não há notas de gramática para esta lição.',
    dictionary: 'Dicionário',
    portuguese: 'Português',
    spanish: 'Espanhol',
    loading: 'Carregando...',
    audio: 'Áudio',
    saved: 'Salvo',
    saving: 'Salvando...',
    saveFlashcard: 'Salvar flashcard',
    close: 'Fechar',
    openTranslatorHint: 'Clique em uma palavra para traduzir',
    verdictCorrect: 'acertou',
    verdictWrong: 'errou',
    verdictAnswered: 'respondeu',
  },
  es: {
    liveTrail: 'Ruta En Vivo',
    board: 'Pizarra',
    panel: 'Panel',
    previous: 'Anterior',
    next: 'Siguiente',
    grammar: 'Gramática',
    clickTranslator: 'Traductor por clic',
    question: 'Pregunta',
    answered: 'Respondidos',
    waiting: 'Pendientes',
    accuracy: 'Aciertos',
    latestAnswer: 'Última respuesta',
    noAnswersYet: 'Ningún alumno respondió esta pregunta todavía.',
    yourDemo: 'Tu demostración visible para los alumnos',
    correct: 'correcta',
    incorrect: 'incorrecta',
    loadingTrail: 'Cargando ruta en vivo...',
    teacherPreparingTrail: 'El profesor está preparando la ruta...',
    trailComplete: 'Ruta completada',
    trailCompleteBody: 'Terminaste todos los ejercicios de esta clase en vivo.',
    loadError: 'No fue posible cargar la ruta en vivo ahora.',
    syncAnswerError: 'No fue posible sincronizar esta respuesta ahora.',
    finishAnswerError: 'No fue posible concluir esta respuesta ahora.',
    grammarTitle: (lessonNumber: number) => `Gramática de la Lección ${lessonNumber}`,
    noGrammar: 'Todavía no hay notas de gramática para esta lección.',
    dictionary: 'Diccionario',
    portuguese: 'Portugués',
    spanish: 'Español',
    loading: 'Cargando...',
    audio: 'Audio',
    saved: 'Guardado',
    saving: 'Guardando...',
    saveFlashcard: 'Guardar flashcard',
    close: 'Cerrar',
    openTranslatorHint: 'Haz clic en una palabra para traducir',
    verdictCorrect: 'acertó',
    verdictWrong: 'falló',
    verdictAnswered: 'respondió',
  },
} as const;

function getTrailCopy(language: TrailUiLanguage) {
  return TRAIL_COPY[language] ?? TRAIL_COPY.en;
}

function getActorName(user: User) {
  return user.displayName || user.email || 'Learnendo user';
}

function getLessonNumberFromId(lessonId: string | null | undefined) {
  if (!lessonId) return 1;
  const workbookMatch = lessonId.match(/_l(\d+)/i);
  if (workbookMatch) return Number(workbookMatch[1]);
  const match = lessonId.match(/(\d+)/);
  return match ? Number(match[1]) : 1;
}

function getCourseLanguageCode(
  courseId: string | null | undefined,
): 'en' | 'pt' | 'es' | 'el' | 'he' {
  const normalized = (courseId ?? '').trim().toLowerCase();
  if (normalized === 'spanish') return 'es';
  if (normalized === 'portuguese_foreigners' || normalized === 'portuguese_native') return 'pt';
  if (normalized === 'greek_koine') return 'el';
  if (normalized === 'hebrew_biblical') return 'he';
  return 'en';
}

function getStudentResponse(block: LiveExerciseBlock, studentUid: string) {
  return block.responses[studentUid] ?? '';
}

function getStudentStatus(block: LiveExerciseBlock, studentUid: string): LiveExerciseBlockStatus {
  const mappedStatus = block.responseStatuses[studentUid];
  if (mappedStatus) return mappedStatus;
  return getStudentResponse(block, studentUid).trim() ? 'in_progress' : 'pending';
}

function isStudentLocked(block: LiveExerciseBlock, studentUid: string) {
  return Boolean(block.responseLocks[studentUid]);
}

function getStudentVerdict(
  block: LiveExerciseBlock,
  studentUid: string,
): LiveExerciseAnswerVerdict | null {
  return block.responseVerdicts[studentUid] ?? null;
}

function parseLegacyPromptParts(prompt: string) {
  const lines = prompt
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const firstLine = lines[0] ?? '';
  const instruction = firstLine.replace(/^\d+\.\s*/, '').trim();
  const promptLine = lines.find((line) => /^prompt:/i.test(line));
  const optionsLine = lines.find((line) => /^options:/i.test(line));

  return {
    instruction,
    promptValue: promptLine ? promptLine.replace(/^prompt:\s*/i, '').trim() : '',
    options: optionsLine
      ? optionsLine
          .replace(/^options:\s*/i, '')
          .split('/')
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
  };
}

function buildVerdict(
  answer: string,
  isCorrect: boolean,
  attemptNumber: number,
): LiveExerciseAnswerVerdict | undefined {
  if (!answer.trim()) return undefined;
  if (!isCorrect) return 'wrong';
  return attemptNumber > 1 ? 'correct_second_try' : 'correct';
}

function getVerdictCopy(verdict: LiveExerciseAnswerVerdict | null, language: TrailUiLanguage) {
  const copy = getTrailCopy(language);
  if (verdict === 'correct' || verdict === 'correct_second_try') return copy.verdictCorrect;
  if (verdict === 'wrong') return copy.verdictWrong;
  return copy.verdictAnswered;
}

function getExercisePrompt(block: LiveExerciseBlock) {
  const legacyPromptParts = parseLegacyPromptParts(block.prompt);
  return {
    instruction: block.sourceInstruction?.trim() || legacyPromptParts.instruction || block.prompt.trim(),
    displayValue: block.sourceDisplayValue?.trim() || undefined,
    audioValue: block.sourceAudioValue?.trim() || legacyPromptParts.promptValue || '',
    options: (block.sourceOptions?.length ? block.sourceOptions : legacyPromptParts.options) ?? [],
    translation: block.sourceTranslation?.trim() || undefined,
  };
}

function getPracticeItem(block: LiveExerciseBlock, lessonNumber: number): PracticeItem {
  const prompt = getExercisePrompt(block);
  return {
    id: block.id,
    moduleType: `live_${block.sourceLessonId ?? 'lesson'}_${block.sourceTrailId ?? block.id}`,
    lessonId: lessonNumber,
    type: (block.questionType as PracticeItem['type']) || 'writing',
    instruction: prompt.instruction,
    displayValue: prompt.displayValue,
    audioValue: prompt.audioValue,
    options: prompt.options.length ? prompt.options : undefined,
    correctValue: block.expectedAnswer?.trim() || '',
    translation: prompt.translation,
  };
}

function getUniqueQuestionWords(block: LiveExerciseBlock) {
  const prompt = getExercisePrompt(block);
  const rawParts = [
    prompt.instruction,
    prompt.displayValue ?? '',
    prompt.audioValue,
    ...(prompt.options ?? []),
  ].join(' ');

  return Array.from(
    new Set(
      rawParts
        .split(/[^A-Za-zÀ-ÿ'-]+/)
        .map((item) => item.trim())
        .filter((item) => item.length >= 2),
    ),
  ).slice(0, 24);
}

interface TrailTranslatorSelection {
  text: string;
  rect: { top: number; left: number; bottom: number; right: number };
}

interface TrailVocabHelperProps {
  selection: TrailTranslatorSelection;
  courseLanguage: 'en' | 'pt' | 'es' | 'el' | 'he';
  uiLanguage: TrailUiLanguage;
  userId: string;
  onClose: () => void;
}

const TrailVocabHelper: React.FC<TrailVocabHelperProps> = ({
  selection,
  courseLanguage,
  uiLanguage,
  userId,
  onClose,
}) => {
  const [translations, setTranslations] = useState<{ pt: string; es: string }>({ pt: '', es: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [phonetic, setPhonetic] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);
  const copy = getTrailCopy(uiLanguage);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setSaved(false);

    Promise.all([
      translateText(selection.text, courseLanguage, 'pt'),
      translateText(selection.text, courseLanguage, 'es'),
      fetchPhoneticForPhrase(selection.text),
    ])
      .then(([pt, es, nextPhonetic]) => {
        if (!active) return;
        setTranslations({ pt, es });
        setPhonetic(nextPhonetic);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [courseLanguage, selection.text]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown, true);
    return () => document.removeEventListener('mousedown', handlePointerDown, true);
  }, [onClose]);

  const handleSpeak = () => {
    void ttsSpeakImpl(selection.text, courseLanguage);
  };

  const handleSave = async () => {
    if (saving || saved) return;
    setSaving(true);
    const targetLang = uiLanguage === 'es' ? 'es' : 'pt';
    const translation = targetLang === 'es' ? translations.es : translations.pt;
    const entryId = await saveVocabularyEntry(userId, {
      text: selection.text,
      translation,
      sourceLang: courseLanguage,
      targetLang,
      translationPt: translations.pt,
      translationEs: translations.es,
      phonetic,
    });
    setSaving(false);
    if (entryId) setSaved(true);
  };

  const popupWidth = 260;
  const popupHeight = 180;
  const desiredTop =
    selection.rect.top >= popupHeight + 16
      ? selection.rect.top - popupHeight - 8
      : selection.rect.bottom + 8;
  const desiredLeft = selection.rect.left + (selection.rect.right - selection.rect.left) / 2 - popupWidth / 2;
  const top = Math.max(8, Math.min(desiredTop, window.innerHeight - popupHeight - 8));
  const left = Math.max(8, Math.min(desiredLeft, window.innerWidth - popupWidth - 8));

  return (
    <div
      ref={popupRef}
      style={{ top, left, width: popupWidth }}
      className="fixed z-[145] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            {copy.dictionary}
          </p>
          <p className="mt-1 break-words text-lg font-black text-slate-900">{selection.text}</p>
          {phonetic ? <p className="mt-1 text-xs font-semibold text-slate-500">{phonetic}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600"
          aria-label={copy.close}
        >
          x
        </button>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-700">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            {copy.portuguese}
          </p>
          <p className="mt-1">{loading ? copy.loading : translations.pt || selection.text}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            {copy.spanish}
          </p>
          <p className="mt-1">{loading ? copy.loading : translations.es || selection.text}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={handleSpeak}
          className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wide text-white"
        >
          {copy.audio}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || saved}
          className="rounded-2xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white disabled:opacity-50"
        >
          {saved ? copy.saved : saving ? copy.saving : copy.saveFlashcard}
        </button>
      </div>
    </div>
  );
};

export const LiveTrailExerciseOverlay: React.FC<LiveTrailExerciseOverlayProps> = ({
  classId,
  user,
  session,
  isTeacher,
  assignedRoster,
  defaultCourseId,
  uiLanguage = 'pt',
  onReturnToWorkspace,
  onOpenSessionPanel,
}) => {
  const [blocks, setBlocks] = useState<LiveExerciseBlock[]>([]);
  const [blocksError, setBlocksError] = useState<string | null>(null);
  const [exerciseSession, setExerciseSession] = useState<{ currentBlockId: string | null }>({
    currentBlockId: null,
  });
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [loadingWorkbook, setLoadingWorkbook] = useState(false);
  const [showGrammarModal, setShowGrammarModal] = useState(false);
  const [vocabMode, setVocabMode] = useState(false);
  const [selectedVocab, setSelectedVocab] = useState<TrailTranslatorSelection | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const actorName = getActorName(user);
  const courseId = defaultCourseId ?? 'english';
  const workbookId = session.activeWorkbookId ?? 1;
  const lessonId = session.activeLessonId ?? null;
  const lessonNumber = getLessonNumberFromId(lessonId);
  const courseLanguage = getCourseLanguageCode(courseId);
  const copy = getTrailCopy(uiLanguage);

  useEffect(() => {
    setBlocksError(null);
    const unsubscribe = subscribeExerciseSession(
      classId,
      (next) => setExerciseSession({ currentBlockId: next.currentBlockId ?? null }),
      () => setBlocksError(copy.loadError),
    );

    return unsubscribe;
  }, [classId, copy.loadError]);

  useEffect(() => {
    setBlocksError(null);
    const unsubscribe = subscribeExerciseBlocks(
      classId,
      (next) => setBlocks(next),
      () => setBlocksError(copy.loadError),
    );

    return unsubscribe;
  }, [classId, copy.loadError]);

  useEffect(() => {
    let active = true;
    setLoadingWorkbook(true);
    loadWorkbookForWhiteboard(courseId, workbookId)
      .then((nextWorkbook) => {
        if (!active) return;
        setWorkbook(nextWorkbook);
      })
      .catch(() => {
        if (!active) return;
        setWorkbook(null);
      })
      .finally(() => {
        if (active) setLoadingWorkbook(false);
      });

    return () => {
      active = false;
    };
  }, [courseId, workbookId]);

  const lesson = useMemo(
    () => resolveLessonForWhiteboard(workbook, lessonId),
    [lessonId, workbook],
  );

  const currentBlockIndex = useMemo(() => {
    if (blocks.length === 0) return -1;
    const sharedIndex = exerciseSession.currentBlockId
      ? blocks.findIndex((block) => block.id === exerciseSession.currentBlockId)
      : -1;
    if (sharedIndex >= 0) return sharedIndex;
    return 0;
  }, [blocks, exerciseSession.currentBlockId]);

  const currentBlock = useMemo(() => {
    if (blocks.length === 0) return null;
    if (currentBlockIndex < 0) return blocks[0] ?? null;
    return blocks[currentBlockIndex] ?? blocks[0] ?? null;
  }, [blocks, currentBlockIndex]);

  const teacherSummary = useMemo(() => {
    if (!currentBlock || assignedRoster.length === 0) {
      return {
        respondedCount: 0,
        accuracyRate: 0,
        pendingCount: 0,
        latestStudentAnswer: null as null | {
          label: string;
          answer: string;
          verdict: LiveExerciseAnswerVerdict | null;
        },
      };
    }

    const respondedCount = assignedRoster.filter((student) => {
      const response = getStudentResponse(currentBlock, student.uid).trim();
      const status = getStudentStatus(currentBlock, student.uid);
      return Boolean(response) || status !== 'pending';
    }).length;

    const correctCount = assignedRoster.filter((student) => {
      const verdict = getStudentVerdict(currentBlock, student.uid);
      return verdict === 'correct' || verdict === 'correct_second_try';
    }).length;

    const latestStudentAnswer =
      assignedRoster
        .map((student) => ({
          label: student.label,
          answer: getStudentResponse(currentBlock, student.uid).trim(),
          verdict: getStudentVerdict(currentBlock, student.uid),
          answeredAt: currentBlock.responseAnsweredAt[student.uid] ?? '',
        }))
        .filter((item) => item.answer)
        .sort((left, right) => right.answeredAt.localeCompare(left.answeredAt))[0] ?? null;

    return {
      respondedCount,
      accuracyRate: Math.round((correctCount / assignedRoster.length) * 100),
      pendingCount: Math.max(assignedRoster.length - respondedCount, 0),
      latestStudentAnswer: latestStudentAnswer
        ? {
            label: latestStudentAnswer.label,
            answer: latestStudentAnswer.answer,
            verdict: latestStudentAnswer.verdict,
          }
        : null,
    };
  }, [assignedRoster, currentBlock]);

  const grammarEntries = useMemo(
    () => Object.entries(GRAMMAR_GUIDES).filter(([key]) => key.startsWith(`L${lessonNumber}_`)),
    [lessonNumber],
  );

  const canEdit = currentBlock
    ? session.sessionStatus === 'active' &&
      !isStudentLocked(currentBlock, user.uid) &&
      getStudentStatus(currentBlock, user.uid) !== 'done'
    : false;

  useEffect(() => {
    setSelectedVocab(null);
  }, [currentBlock?.id]);

  useEffect(() => {
    if (!vocabMode) {
      setSelectedVocab(null);
    }
  }, [vocabMode]);

  useEffect(() => {
    setSaveError(null);
  }, [currentBlock?.id]);

  const setSharedCurrentBlock = async (blockId: string) => {
    await saveExerciseSession(
      classId,
      {
        currentBlockId: blockId,
      },
      user.uid,
      actorName,
    );
  };

  const handleAttempt = async (payload: {
    answer: string;
    isCorrect: boolean;
    attemptNumber: number;
  }) => {
    if (!currentBlock || (!isTeacher && !canEdit)) return;
    const answer = payload.answer.trim();
    const verdict = buildVerdict(answer, payload.isCorrect, payload.attemptNumber);
    const nextStatus: LiveExerciseBlockStatus = answer ? 'in_progress' : 'pending';

    try {
      setSaveError(null);
      if (isTeacher) {
        await updateExerciseBlockLivePreview(
          classId,
          currentBlock.id,
          {
            answer: payload.answer,
            isCorrect: answer ? payload.isCorrect : null,
            actorUid: user.uid,
            actorName,
          },
          user.uid,
          actorName,
        );
      } else {
        await updateExerciseBlockResponse(
          classId,
          currentBlock.id,
          user.uid,
          payload.answer,
          nextStatus,
          user.uid,
          actorName,
          {
            attempts: answer ? payload.attemptNumber : 0,
            verdict,
            answeredAt: answer ? new Date().toISOString() : undefined,
          },
        );
      }
    } catch {
      setSaveError(copy.syncAnswerError);
    }
  };

  const handleContinue = async (payload: {
    answer: string;
    isCorrect: boolean;
    attemptNumber: number;
  }) => {
    if (!currentBlock || (!isTeacher && !canEdit)) return;
    const answer = payload.answer.trim();
    const verdict = buildVerdict(answer, payload.isCorrect, payload.attemptNumber);

    try {
      setSaveError(null);
      if (isTeacher) {
        await updateExerciseBlockLivePreview(
          classId,
          currentBlock.id,
          {
            answer: payload.answer,
            isCorrect: answer ? payload.isCorrect : null,
            actorUid: user.uid,
            actorName,
          },
          user.uid,
          actorName,
        );
      } else {
        await updateExerciseBlockResponse(
          classId,
          currentBlock.id,
          user.uid,
          payload.answer,
          answer ? 'done' : 'pending',
          user.uid,
          actorName,
          {
            attempts: answer ? payload.attemptNumber : 0,
            verdict,
            answeredAt: answer ? new Date().toISOString() : undefined,
          },
        );
      }

      if (isTeacher) {
        const nextBlock = blocks[currentBlockIndex + 1] ?? null;
        if (nextBlock) {
          await setSharedCurrentBlock(nextBlock.id);
        }
      }
    } catch {
      setSaveError(copy.finishAnswerError);
    }
  };

  if (blocksError) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md rounded-3xl border border-rose-500/30 bg-slate-900 p-6 text-center shadow-2xl">
          <p className="text-sm font-bold text-rose-200">{blocksError}</p>
        </div>
      </div>
    );
  }

  if (loadingWorkbook || blocks.length === 0) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 text-center shadow-2xl">
          <p className="text-sm font-bold text-slate-200">
            {isTeacher ? copy.loadingTrail : copy.teacherPreparingTrail}
          </p>
        </div>
      </div>
    );
  }

  if (!currentBlock && !isTeacher) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md rounded-3xl border border-emerald-500/30 bg-slate-900 p-6 text-center shadow-2xl">
          <p className="text-lg font-black text-emerald-300">{copy.trailComplete}</p>
          <p className="mt-2 text-sm text-slate-200">
            {copy.trailCompleteBody}
          </p>
        </div>
      </div>
    );
  }

  const practiceItem = currentBlock ? getPracticeItem(currentBlock, lessonNumber) : null;

  return (
    <>
      {practiceItem ? (
        <div className="fixed inset-0 z-[120] bg-slate-950">
          <div className="fixed left-3 right-3 top-[58px] z-[135] flex flex-col gap-2 sm:left-4 sm:right-4 sm:top-[70px] sm:flex-row sm:items-start sm:justify-between">
            {isTeacher ? (
              <div className="max-w-[520px] rounded-2xl border border-slate-700 bg-slate-950/92 px-3 py-2.5 shadow-2xl backdrop-blur-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300">
                  {lesson?.title || session.activeTrailLabel || copy.liveTrail}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  {copy.question} {Math.max(currentBlockIndex + 1, 1)}/{Math.max(blocks.length, 1)}
                </p>
                <p className="mt-1 text-xs text-slate-200">
                  {copy.answered}: {teacherSummary.respondedCount}/{assignedRoster.length || 0} | {copy.waiting}: {teacherSummary.pendingCount} | {copy.accuracy}: {teacherSummary.accuracyRate}%
                </p>
                {teacherSummary.latestStudentAnswer ? (
                  <p className="mt-1 max-w-[460px] text-xs text-emerald-200">
                    {copy.latestAnswer}: <span className="font-black">{teacherSummary.latestStudentAnswer.label}</span>{' '}
                    {getVerdictCopy(teacherSummary.latestStudentAnswer.verdict, uiLanguage)} "
                    {teacherSummary.latestStudentAnswer.answer}".
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">
                    {copy.noAnswersYet}
                  </p>
                )}
                {currentBlock.livePreviewAnswer?.trim() ? (
                  <p className="mt-1 max-w-[460px] text-xs text-sky-200">
                    {copy.yourDemo}: "{currentBlock.livePreviewAnswer.trim()}"
                    {currentBlock.livePreviewCorrect == null
                      ? ''
                      : currentBlock.livePreviewCorrect
                        ? ` (${copy.correct})`
                        : ` (${copy.incorrect})`}
                  </p>
                ) : null}
                {saveError ? <p className="mt-1 text-xs text-rose-200">{saveError}</p> : null}
              </div>
            ) : (
              <div className="pointer-events-none h-0" />
            )}

            <div className="flex max-w-full flex-wrap items-center justify-end gap-1.5 sm:gap-2">
              {isTeacher && onReturnToWorkspace ? (
                <button
                  type="button"
                  onClick={() => {
                    void onReturnToWorkspace();
                  }}
                  className="rounded-2xl border border-slate-700 bg-slate-950/92 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-slate-100 shadow-2xl backdrop-blur-sm"
                >
                  {copy.board}
                </button>
              ) : null}
              {isTeacher && onOpenSessionPanel ? (
                <button
                  type="button"
                  onClick={onOpenSessionPanel}
                  className="rounded-2xl border border-slate-700 bg-slate-950/92 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-slate-100 shadow-2xl backdrop-blur-sm"
                >
                  {copy.panel}
                </button>
              ) : null}
              {isTeacher ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const previousBlock = blocks[currentBlockIndex - 1] ?? null;
                      if (previousBlock) {
                        void setSharedCurrentBlock(previousBlock.id);
                      }
                    }}
                    disabled={currentBlockIndex <= 0}
                    title={copy.previous}
                    aria-label={copy.previous}
                    className="flex h-[38px] w-[38px] items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/92 text-sm font-black text-slate-100 shadow-2xl backdrop-blur-sm disabled:opacity-40"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextBlock = blocks[currentBlockIndex + 1] ?? null;
                      if (nextBlock) {
                        void setSharedCurrentBlock(nextBlock.id);
                      }
                    }}
                    disabled={currentBlockIndex < 0 || currentBlockIndex >= blocks.length - 1}
                    title={copy.next}
                    aria-label={copy.next}
                    className="flex h-[38px] w-[38px] items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/92 text-sm font-black text-slate-100 shadow-2xl backdrop-blur-sm disabled:opacity-40"
                  >
                    →
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => setShowGrammarModal(true)}
                className="rounded-2xl border border-slate-700 bg-slate-950/92 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-slate-100 shadow-2xl backdrop-blur-sm"
              >
                {copy.grammar}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedVocab(null);
                  setVocabMode((current) => !current);
                }}
                title={copy.clickTranslator}
                aria-label={copy.clickTranslator}
                className={`flex h-[38px] w-[38px] items-center justify-center rounded-2xl border bg-slate-950/92 shadow-2xl backdrop-blur-sm transition ${
                  vocabMode
                    ? 'border-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.18)]'
                    : 'border-slate-700'
                }`}
              >
                <img src="/apple-touch-icon.png" alt="" className="h-6 w-6 object-contain" />
              </button>
            </div>
          </div>

          <PracticeSection
            item={practiceItem}
            onResult={() => {}}
            currentIdx={Math.max((currentBlock?.order ?? 1) - 1, 0)}
            totalItems={blocks.length}
            lessonId={lessonNumber}
            currentLanguage={courseLanguage}
            uiLanguage={uiLanguage}
            onAttempt={handleAttempt}
            onContinue={handleContinue}
            actionLocked={!isTeacher && !canEdit}
            fullScreen={true}
            clickTranslatorMode={vocabMode}
            onTranslatorWordSelect={({ word, rect }) => {
              if (!vocabMode) return;
              setSelectedVocab({ text: word, rect });
            }}
          />
        </div>
      ) : null}

      {showGrammarModal ? (
        <div
          className="fixed inset-0 z-[140] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setShowGrammarModal(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between rounded-t-3xl border-b border-slate-100 bg-white px-6 py-4">
              <h2 className="text-lg font-bold text-slate-800">{copy.grammarTitle(lessonNumber)}</h2>
              <button
                type="button"
                onClick={() => setShowGrammarModal(false)}
                className="text-2xl leading-none text-slate-400 hover:text-slate-600"
              >
                x
              </button>
            </div>
            <div className="space-y-5 px-6 py-4">
              {grammarEntries.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {copy.noGrammar}
                </p>
              ) : (
                grammarEntries.map(([key, tips]) => (
                  <div key={key}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-500">
                      {key.replace('_', ' > ')}
                    </p>
                    <ul className="space-y-1.5">
                      {tips.map((tip, index) => (
                        <li key={`${key}_${index}`} className="flex gap-2 text-sm text-slate-700">
                          <span className="flex-shrink-0 text-blue-400">-</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {selectedVocab ? (
        <TrailVocabHelper
          selection={selectedVocab}
          courseLanguage={courseLanguage}
          uiLanguage={uiLanguage}
          userId={user.uid}
          onClose={() => setSelectedVocab(null)}
        />
      ) : null}
    </>
  );
};
