import React, { useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { GRAMMAR_GUIDES } from '../../constants';
import { PracticeSection } from '../UI';
import type { BattleConfig, BattleQuestion, SavedBattleTemplate } from './Battle/battleTypes';
import { buildSavedBattleTemplate, sanitizeBattleQuestion } from './Battle/battleUtils';
import {
  LiveClassSession,
  LiveExerciseAnswerVerdict,
  LiveExerciseBlock,
  LiveExerciseBlockStatus,
  PracticeItem,
  Workbook,
} from '../../types';
import {
  clearExerciseBlockStudentResponse,
  saveExerciseSession,
  setExerciseBlockStudentLock,
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
  teacherPresent?: boolean;
  allowSoloAdvance?: boolean;
  onReturnToWorkspace?: () => void | Promise<void>;
  onOpenSessionPanel?: () => void;
  onOpenBattleTemplate?: (template: SavedBattleTemplate) => void;
}

type TrailUiLanguage = NonNullable<LiveTrailExerciseOverlayProps['uiLanguage']>;
const LIVE_TRAIL_COMPLETE_BLOCK_ID = '__complete__';
const LIVE_TRAIL_VIEWPORT_TOP_OFFSET = 88;
const LIVE_TRAIL_CHROME_TOP_OFFSET = 100;

const TRAIL_COPY = {
  en: {
    liveTrail: 'Live Trail',
    board: 'Board',
    panel: 'Panel',
    previous: 'Previous',
    next: 'Next',
    generateBattle: 'Generate battle',
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
    answerGroups: 'Class answers',
    noGroupedAnswers: 'Waiting for the first student answer.',
    noWrongAnswers: 'No wrong answers on this question.',
    releaseRetry: 'Release retry for wrong answers',
    releasingRetry: 'Releasing...',
    waitingTeacher: 'Waiting for teacher',
  },
  pt: {
    liveTrail: 'Trilha Ao Vivo',
    board: 'Lousa',
    panel: 'Painel',
    previous: 'Anterior',
    next: 'Próxima',
    generateBattle: 'Gerar batalha',
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
    answerGroups: 'Respostas da turma',
    noGroupedAnswers: 'Aguardando a primeira resposta dos alunos.',
    noWrongAnswers: 'Nenhum erro nesta questão.',
    releaseRetry: 'Liberar nova tentativa para quem errou',
    releasingRetry: 'Liberando...',
    waitingTeacher: 'Aguardando o professor',
  },
  es: {
    liveTrail: 'Ruta En Vivo',
    board: 'Pizarra',
    panel: 'Panel',
    previous: 'Anterior',
    next: 'Siguiente',
    generateBattle: 'Generar batalla',
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
    answerGroups: 'Respuestas del grupo',
    noGroupedAnswers: 'Esperando la primera respuesta de los alumnos.',
    noWrongAnswers: 'No hubo errores en esta pregunta.',
    releaseRetry: 'Liberar nuevo intento para quienes fallaron',
    releasingRetry: 'Liberando...',
    waitingTeacher: 'Esperando al profesor',
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

function normalizeComparableAnswer(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:()[\]{}"'`]/g, '')
    .replace(/\s+/g, ' ');
}

function isStudentAnswerCorrect(block: LiveExerciseBlock, answer: string) {
  const normalizedAnswer = normalizeComparableAnswer(answer);
  if (!normalizedAnswer) return false;
  const acceptedAnswers = [
    block.expectedAnswer ?? '',
    ...(block.acceptedAnswers ?? []),
  ]
    .map((item) => normalizeComparableAnswer(item))
    .filter(Boolean);
  return acceptedAnswers.includes(normalizedAnswer);
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

function normalizeBattleOptions(options: string[] | undefined, expectedAnswer: string): string[] {
  const pool = new Set<string>((options ?? []).map((option) => option.trim()).filter(Boolean));
  if (expectedAnswer.trim()) {
    pool.add(expectedAnswer.trim());
  }
  return Array.from(pool);
}

function buildLiveTrailPromptText(block: LiveExerciseBlock): string {
  const prompt = getExercisePrompt(block);
  const lines: string[] = [];
  const instruction = prompt.instruction?.trim();
  const displayValue = prompt.displayValue?.trim();

  if (instruction) {
    lines.push(instruction);
  }

  if (
    displayValue
    && !displayValue.startsWith('fa-')
    && displayValue.toLowerCase() !== instruction?.toLowerCase()
  ) {
    lines.push(displayValue);
  }

  return lines.join('\n').trim();
}

function inferBattleSkill(block: LiveExerciseBlock): BattleQuestion['skill'] {
  if (block.questionType === 'speaking') return 'speaking';
  if (block.questionType === 'writing') return 'writing';
  if (block.sourceAudioValue?.trim()) return 'listening';
  if (block.questionType === 'identification') return 'reading';
  return 'grammar';
}

function inferBattleDifficulty(block: LiveExerciseBlock): BattleQuestion['difficulty'] {
  if (block.questionType === 'speaking') return 'hard';
  if (block.questionType === 'writing') return 'medium';
  return (block.sourceOptions?.length ?? 0) <= 3 ? 'easy' : 'medium';
}

function mapLiveBlockToBattleQuestion(
  block: LiveExerciseBlock,
  context: {
    workbookId: number;
    trailIds: string[];
  },
): BattleQuestion | null {
  const prompt = getExercisePrompt(block);
  const displayValue = prompt.displayValue?.trim() ?? '';
  const displayIsIcon = displayValue.startsWith('fa-');
  const promptAudioText = prompt.audioValue?.trim() || undefined;
  const text = buildLiveTrailPromptText(block);
  const expectedAnswer = block.expectedAnswer?.trim() ?? '';
  const trailId = block.sourceTrailId ?? context.trailIds[0] ?? null;
  const trailNumber = trailId ? getLessonNumberFromId(trailId) : null;

  switch (block.questionType) {
    case 'multiple-choice':
    case 'identification': {
      const options = normalizeBattleOptions(prompt.options, expectedAnswer);
      const correctIndex = options.indexOf(expectedAnswer);
      const shouldUseAudio = Boolean(promptAudioText) && (displayIsIcon || !displayValue);
      return sanitizeBattleQuestion({
        id: block.id,
        kind: shouldUseAudio ? 'audio-choice' : 'multiple-choice',
        text: text || promptAudioText || 'Choose the correct answer.',
        options,
        correctIndex: correctIndex >= 0 ? correctIndex : 0,
        promptAudioText: shouldUseAudio ? promptAudioText : undefined,
        playAudioOnce: shouldUseAudio,
        hint: prompt.translation,
        bookId: context.workbookId,
        trailId,
        trailNumber,
        skill: inferBattleSkill(block),
        difficulty: inferBattleDifficulty(block),
      });
    }
    case 'writing':
      return sanitizeBattleQuestion({
        id: block.id,
        kind: 'audio-open',
        text: text || prompt.instruction || 'Type your answer.',
        correctText: expectedAnswer,
        acceptedAnswers: [expectedAnswer],
        promptAudioText,
        playAudioOnce: Boolean(promptAudioText),
        hint: prompt.translation,
        bookId: context.workbookId,
        trailId,
        trailNumber,
        skill: inferBattleSkill(block),
        difficulty: inferBattleDifficulty(block),
      });
    case 'speaking':
      return sanitizeBattleQuestion({
        id: block.id,
        kind: 'speaking',
        text: text || prompt.instruction || 'Speak your answer.',
        correctText: expectedAnswer,
        acceptedAnswers: [expectedAnswer],
        promptAudioText,
        playAudioOnce: true,
        hint: prompt.translation,
        bookId: context.workbookId,
        trailId,
        trailNumber,
        skill: inferBattleSkill(block),
        difficulty: inferBattleDifficulty(block),
      });
    default:
      return null;
  }
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
  teacherPresent = false,
  allowSoloAdvance = false,
  onReturnToWorkspace,
  onOpenSessionPanel,
  onOpenBattleTemplate,
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
  const [releasingRetry, setReleasingRetry] = useState(false);

  const actorName = getActorName(user);
  const courseId = defaultCourseId ?? 'english';
  const workbookId = session.activeWorkbookId ?? 1;
  const lessonId = session.activeLessonId ?? null;
  const lessonNumber = getLessonNumberFromId(lessonId);
  const courseLanguage = getCourseLanguageCode(courseId);
  const copy = getTrailCopy(uiLanguage);
  const teacherGuidedMode = !isTeacher && teacherPresent && !allowSoloAdvance;
  const [waitingTeacherRelease, setWaitingTeacherRelease] = useState(false);

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
    if (exerciseSession.currentBlockId === LIVE_TRAIL_COMPLETE_BLOCK_ID) return blocks.length;
    const sharedIndex = exerciseSession.currentBlockId
      ? blocks.findIndex((block) => block.id === exerciseSession.currentBlockId)
      : -1;
    if (sharedIndex >= 0) return sharedIndex;
    return 0;
  }, [blocks, exerciseSession.currentBlockId]);

  const currentBlock = useMemo(() => {
    if (blocks.length === 0) return null;
    if (currentBlockIndex >= blocks.length) return null;
    if (currentBlockIndex < 0) return blocks[0] ?? null;
    return blocks[currentBlockIndex] ?? blocks[0] ?? null;
  }, [blocks, currentBlockIndex]);

  const trackedStudents = useMemo(() => {
    if (!currentBlock) return assignedRoster;
    const tracked = new Map<string, { uid: string; label: string; isOnline: boolean }>();
    assignedRoster.forEach((student) => {
      tracked.set(student.uid, student);
    });
    [
      ...Object.keys(currentBlock.responses ?? {}),
      ...Object.keys(currentBlock.responseStatuses ?? {}),
      ...Object.keys(currentBlock.responseVerdicts ?? {}),
      ...Object.keys(currentBlock.responseLocks ?? {}),
    ].forEach((uid) => {
      if (!uid || tracked.has(uid)) return;
      tracked.set(uid, {
        uid,
        label: uid,
        isOnline: false,
      });
    });
    return Array.from(tracked.values());
  }, [assignedRoster, currentBlock]);

  const teacherSummary = useMemo(() => {
    if (!currentBlock || trackedStudents.length === 0) {
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

    const respondedCount = trackedStudents.filter((student) => {
      const response = getStudentResponse(currentBlock, student.uid).trim();
      const status = getStudentStatus(currentBlock, student.uid);
      return Boolean(response) || status !== 'pending';
    }).length;

    const correctCount = trackedStudents.filter((student) => {
      const answer = getStudentResponse(currentBlock, student.uid).trim();
      const verdict = getStudentVerdict(currentBlock, student.uid)
        ?? (answer ? (isStudentAnswerCorrect(currentBlock, answer) ? 'correct' : 'wrong') : null);
      return verdict === 'correct' || verdict === 'correct_second_try';
    }).length;

    const latestStudentAnswer =
      trackedStudents
        .map((student) => ({
          label: student.label,
          answer: getStudentResponse(currentBlock, student.uid).trim(),
          verdict: getStudentVerdict(currentBlock, student.uid)
            ?? (getStudentResponse(currentBlock, student.uid).trim()
              ? (isStudentAnswerCorrect(currentBlock, getStudentResponse(currentBlock, student.uid)) ? 'correct' : 'wrong')
              : null),
          answeredAt: currentBlock.responseAnsweredAt[student.uid] ?? '',
        }))
        .filter((item) => item.answer)
        .sort((left, right) => right.answeredAt.localeCompare(left.answeredAt))[0] ?? null;

    const trackedStudentCount = trackedStudents.length;

    return {
      respondedCount,
      accuracyRate: trackedStudentCount > 0 ? Math.round((correctCount / trackedStudentCount) * 100) : 0,
      pendingCount: Math.max(trackedStudentCount - respondedCount, 0),
      latestStudentAnswer: latestStudentAnswer
        ? {
            label: latestStudentAnswer.label,
            answer: latestStudentAnswer.answer,
            verdict: latestStudentAnswer.verdict,
          }
        : null,
    };
  }, [currentBlock, trackedStudents]);

  const teacherAnswerGroups = useMemo(() => {
    if (!currentBlock || trackedStudents.length === 0) return [];

    const groups = new Map<string, {
      answer: string;
      verdict: LiveExerciseAnswerVerdict | null;
      labels: string[];
    }>();

    trackedStudents.forEach((student) => {
      const answer = getStudentResponse(currentBlock, student.uid).trim();
      const storedVerdict = getStudentVerdict(currentBlock, student.uid);
      const verdict = storedVerdict ?? (answer ? (isStudentAnswerCorrect(currentBlock, answer) ? 'correct' : 'wrong') : null);
      if (!answer || verdict !== 'wrong') return;
      const key = `${verdict ?? 'answered'}::${answer.toLowerCase()}`;
      const existing = groups.get(key);
      if (existing) {
        existing.labels.push(student.label);
        return;
      }
      groups.set(key, {
        answer,
        verdict,
        labels: [student.label],
      });
    });
    return Array.from(groups.values()).sort((left, right) => right.labels.length - left.labels.length);
  }, [currentBlock, trackedStudents]);

  const wrongStudentIds = useMemo(() => {
    if (!currentBlock) return [];
    return trackedStudents
      .filter((student) => {
        const answer = getStudentResponse(currentBlock, student.uid).trim();
        if (!answer) return false;
        const verdict = getStudentVerdict(currentBlock, student.uid);
        if (verdict === 'wrong') return true;
        if (verdict === 'correct' || verdict === 'correct_second_try') return false;
        return !isStudentAnswerCorrect(currentBlock, answer);
      })
      .map((student) => student.uid);
  }, [currentBlock, trackedStudents]);

  const grammarEntries = useMemo(
    () => Object.entries(GRAMMAR_GUIDES).filter(([key]) => key.startsWith(`L${lessonNumber}_`)),
    [lessonNumber],
  );
  const canGenerateBattleFromTrail = isTeacher && currentBlockIndex >= blocks.length - 1 && blocks.length > 0;

  const canEdit = currentBlock
    ? session.sessionStatus === 'active' &&
      !isStudentLocked(currentBlock, user.uid) &&
      getStudentStatus(currentBlock, user.uid) !== 'done'
    : false;

  useEffect(() => {
    if (isTeacher || !currentBlock) return;
    const status = getStudentStatus(currentBlock, user.uid);
    if (status === 'pending' && !isStudentLocked(currentBlock, user.uid)) {
      setWaitingTeacherRelease(false);
      return;
    }
    if (teacherGuidedMode && status === 'done') {
      setWaitingTeacherRelease(true);
    }
  }, [currentBlock, isTeacher, teacherGuidedMode, user.uid]);

  const releaseWrongAnswers = async () => {
    if (!isTeacher || !currentBlock || wrongStudentIds.length === 0) return;
    await Promise.all(
      wrongStudentIds.map((studentUid) =>
        clearExerciseBlockStudentResponse(classId, currentBlock.id, studentUid, user.uid, actorName),
      ),
    );
  };

  const handleReleaseWrongAnswers = async () => {
    if (!isTeacher || !currentBlock || wrongStudentIds.length === 0) return;
    try {
      setSaveError(null);
      setReleasingRetry(true);
      await releaseWrongAnswers();
    } catch {
      setSaveError(copy.syncAnswerError);
    } finally {
      setReleasingRetry(false);
    }
  };

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

  const handleGenerateBattle = () => {
    if (!onOpenBattleTemplate || blocks.length === 0) return;
    const trailIds = Array.from(
      new Set(
        [
          ...(session.activeTrailIds ?? []),
          ...blocks.map((block) => block.sourceTrailId).filter((value): value is string => Boolean(value)),
        ],
      ),
    );
    const questions = blocks
      .map((block) => mapLiveBlockToBattleQuestion(block, {
        workbookId,
        trailIds,
      }))
      .filter((question): question is BattleQuestion => question !== null);

    if (questions.length === 0) {
      setSaveError(copy.loadError);
      return;
    }

    const config: BattleConfig = {
      scope: 'current-lesson',
      difficulty: 'normal',
      questionCount: questions.length,
      timePerQuestion: 10,
      includeTeacher: false,
      botEnabled: false,
      courseId,
      workbookId,
      lessonId: lessonId ?? undefined,
      trailIds,
    };

    const templateTitle = `${lesson?.title || session.activeTrailLabel || copy.liveTrail} • Battle`;
    onOpenBattleTemplate(buildSavedBattleTemplate(config, questions, templateTitle));
  };

  const handleAttempt = async (payload: {
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
        if (teacherGuidedMode && answer) {
          setWaitingTeacherRelease(true);
        }
        const nextStatus: LiveExerciseBlockStatus = teacherGuidedMode
          ? 'done'
          : answer
            ? 'in_progress'
            : 'pending';
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
        if (teacherGuidedMode && answer) {
          await setExerciseBlockStudentLock(
            classId,
            currentBlock.id,
            user.uid,
            true,
            user.uid,
            actorName,
          );
        }
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
    if (teacherGuidedMode && !isTeacher) return;
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
        if (payload.isCorrect && wrongStudentIds.length > 0) {
          setReleasingRetry(true);
          try {
            await releaseWrongAnswers();
          } finally {
            setReleasingRetry(false);
          }
          return;
        }
        if (wrongStudentIds.length > 0) {
          return;
        }
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
        if (teacherGuidedMode && answer) {
          setWaitingTeacherRelease(true);
        }

        const nextBlock = blocks[currentBlockIndex + 1] ?? null;
        if (allowSoloAdvance) {
          await saveExerciseSession(
            classId,
            {
              currentBlockId: nextBlock?.id ?? LIVE_TRAIL_COMPLETE_BLOCK_ID,
            },
            user.uid,
            actorName,
          );
        }
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
          <div
            className="fixed left-3 right-3 z-[135] flex flex-col gap-2 sm:left-4 sm:right-4 sm:flex-row sm:items-start sm:justify-between"
            style={{ top: `calc(env(safe-area-inset-top, 0px) + ${LIVE_TRAIL_CHROME_TOP_OFFSET}px)` }}
          >
            {isTeacher ? (
              <div className="max-w-[520px] rounded-2xl border border-slate-700 bg-slate-950/92 px-3 py-2.5 shadow-2xl backdrop-blur-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300">
                  {lesson?.title || session.activeTrailLabel || copy.liveTrail}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  {copy.question} {Math.max(currentBlockIndex + 1, 1)}/{Math.max(blocks.length, 1)}
                </p>
                <p className="mt-1 text-xs text-slate-200">
                  {copy.answered}: {teacherSummary.respondedCount}/{trackedStudents.length || 0} | {copy.waiting}: {teacherSummary.pendingCount} | {copy.accuracy}: {teacherSummary.accuracyRate}%
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
                <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">
                      {copy.answerGroups}
                    </p>
                    {wrongStudentIds.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          void handleReleaseWrongAnswers();
                        }}
                        disabled={releasingRetry}
                        className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-100 disabled:opacity-40"
                      >
                        {releasingRetry ? copy.releasingRetry : copy.releaseRetry}
                      </button>
                    ) : null}
                  </div>
                  {teacherAnswerGroups.length > 0 ? (
                    <div className="mt-2 space-y-1.5">
                      {teacherAnswerGroups.map((group) => {
                        const verdictLabel = getVerdictCopy(group.verdict, uiLanguage);
                        const verdictClasses =
                          group.verdict === 'correct' || group.verdict === 'correct_second_try'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                            : group.verdict === 'wrong'
                              ? 'border-rose-500/30 bg-rose-500/10 text-rose-100'
                              : 'border-slate-700 bg-slate-800/80 text-slate-100';
                        return (
                          <div
                            key={`${group.verdict ?? 'answered'}:${group.answer}:${group.labels.join('|')}`}
                            className={`rounded-xl border px-2.5 py-2 text-xs ${verdictClasses}`}
                          >
                            <p className="font-black">
                              "{group.answer}" - {verdictLabel}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-200">
                              {group.labels.join(', ')}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">
                      {teacherSummary.respondedCount > 0 ? copy.noWrongAnswers : copy.noGroupedAnswers}
                    </p>
                  )}
                </div>
                {saveError ? <p className="mt-1 text-xs text-rose-200">{saveError}</p> : null}
              </div>
            ) : (
              teacherGuidedMode && !canEdit ? (
                <div className="max-w-[320px] rounded-2xl border border-amber-400/40 bg-slate-950/92 px-3 py-2.5 shadow-2xl backdrop-blur-sm">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-300">
                    {copy.waitingTeacher}
                  </p>
                  <p className="mt-1 text-xs text-slate-200">
                    {lesson?.title || session.activeTrailLabel || copy.liveTrail}
                  </p>
                </div>
              ) : (
                <div className="pointer-events-none h-0" />
              )
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
              {canGenerateBattleFromTrail && onOpenBattleTemplate ? (
                <button
                  type="button"
                  onClick={handleGenerateBattle}
                  className="rounded-2xl border border-orange-400/50 bg-orange-500/20 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-orange-100 shadow-2xl backdrop-blur-sm"
                >
                  {copy.generateBattle}
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
            {vocabMode ? (
              <div className="rounded-2xl border border-cyan-400/30 bg-slate-950/92 px-3 py-2 text-[11px] font-bold text-cyan-100 shadow-2xl backdrop-blur-sm">
                {copy.openTranslatorHint}
              </div>
            ) : null}
          </div>

          <PracticeSection
            item={practiceItem}
            onResult={() => {}}
            currentIdx={Math.max((currentBlock?.order ?? 1) - 1, 0)}
            totalItems={blocks.length}
            lessonId={lessonNumber}
            currentLanguage={courseLanguage}
            uiLanguage={uiLanguage}
            copyLanguage={courseLanguage === 'en' || courseLanguage === 'pt' || courseLanguage === 'es' ? courseLanguage : 'en'}
            onAttempt={handleAttempt}
            onContinue={handleContinue}
            actionLocked={!isTeacher && (!canEdit || (teacherGuidedMode && waitingTeacherRelease))}
            feedbackActionLocked={!isTeacher && teacherGuidedMode && waitingTeacherRelease}
            persistCorrectFooterAction={isTeacher}
            fullScreen={true}
            viewportTopOffset={LIVE_TRAIL_VIEWPORT_TOP_OFFSET}
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
