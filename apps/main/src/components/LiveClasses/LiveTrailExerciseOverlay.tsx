import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { GRAMMAR_GUIDES } from '../../constants';
import { PracticeSection } from '../UI';
import type { BattleConfig, BattleQuestion, SavedBattleTemplate } from './Battle/battleTypes';
import { buildBattleGeneratedHint, buildSavedBattleTemplate, sanitizeBattleQuestion } from './Battle/battleUtils';
import {
  LiveClassResponse,
  LiveClassSession,
  LiveExerciseAnswerVerdict,
  LiveExerciseBlock,
  LiveExerciseBlockStatus,
  LiveTrailCompletion,
  PracticeItem,
  Workbook,
} from '../../types';
import {
  clearExerciseBlockStudentResponse,
  claimLiveTrailCompletionStatus,
  completeLiveTrailForDecision,
  saveExerciseSession,
  seedExerciseSessionFromLessonTrails,
  setExerciseBlockStudentLock,
  submitLiveResponse,
  subscribeExerciseBlocks,
  subscribeLiveResponses,
  subscribeExerciseSession,
  updateExerciseBlockLivePreview,
  updateExerciseBlockResponse,
  updateLiveSession,
} from '../../services/liveSessionService';
import { buildLiveTrailCompletion } from '../../services/liveTrailTransition';
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
import { BASE_UI_LANGUAGE_STORAGE_KEY, getScopedStorageItem } from '../../utils/tabScopedStorage';
import { expandAcceptedAnswerVariants } from '../../utils/answerVariants';

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
  onStartTrailBattle?: (
    template: SavedBattleTemplate,
    completion: LiveTrailCompletion,
  ) => void | Promise<void>;
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
    startBattle: 'Start Battle',
    skipBattle: 'Skip Battle',
    battleDecisionBody: 'Would you like to start a Battle for this trail?',
    waitingBattleDecision: 'Waiting for the teacher to choose the next step...',
    resumingTrail: 'Resuming the trail flow...',
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
    portuguese: 'Brazilian Portuguese',
    spanish: 'Spanish',
    loading: 'Loading...',
    audio: 'Audio',
    saved: 'Saved',
    saving: 'Saving...',
    saveFlashcard: 'Save flashcard',
    close: 'Close',
    openTranslatorHint: 'Click a word or select a phrase to translate it',
    verdictCorrect: 'got it right',
    verdictWrong: 'got it wrong',
    verdictAnswered: 'answered',
    answerGroups: 'Class answers',
    noGroupedAnswers: 'Waiting for the first student answer.',
    noWrongAnswers: 'No wrong answers on this question.',
    releaseRetry: 'Release retry for wrong answers',
    releasingRetry: 'Releasing...',
    waitingTeacher: 'Waiting for teacher',
    onlineNow: 'Online now',
    noStudentsOnline: 'No students online right now.',
  },
  pt: {
    liveTrail: 'Trilha Ao Vivo',
    board: 'Lousa',
    panel: 'Painel',
    previous: 'Anterior',
    next: 'Próxima',
    startBattle: 'Iniciar Battle',
    skipBattle: 'Pular Battle',
    battleDecisionBody: 'Deseja iniciar um Battle desta trilha?',
    waitingBattleDecision: 'Aguardando o professor escolher a proxima etapa...',
    resumingTrail: 'Retomando o fluxo da trilha...',
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
    portuguese: 'Português (Brasil)',
    spanish: 'Espanhol',
    loading: 'Carregando...',
    audio: 'Áudio',
    saved: 'Salvo',
    saving: 'Salvando...',
    saveFlashcard: 'Salvar flashcard',
    close: 'Fechar',
    openTranslatorHint: 'Clique em uma palavra ou selecione uma frase para traduzir',
    verdictCorrect: 'acertou',
    verdictWrong: 'errou',
    verdictAnswered: 'respondeu',
    answerGroups: 'Respostas da turma',
    noGroupedAnswers: 'Aguardando a primeira resposta dos alunos.',
    noWrongAnswers: 'Nenhum erro nesta questão.',
    releaseRetry: 'Liberar nova tentativa para quem errou',
    releasingRetry: 'Liberando...',
    waitingTeacher: 'Aguardando o professor',
    onlineNow: 'Online agora',
    noStudentsOnline: 'Nenhum aluno online agora.',
  },
  es: {
    liveTrail: 'Ruta En Vivo',
    board: 'Pizarra',
    panel: 'Panel',
    previous: 'Anterior',
    next: 'Siguiente',
    startBattle: 'Iniciar Battle',
    skipBattle: 'Omitir Battle',
    battleDecisionBody: 'Quieres iniciar un Battle de esta ruta?',
    waitingBattleDecision: 'Esperando que el profesor elija el siguiente paso...',
    resumingTrail: 'Reanudando el flujo de la ruta...',
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
    portuguese: 'Portugués (Brasil)',
    spanish: 'Español',
    loading: 'Cargando...',
    audio: 'Audio',
    saved: 'Guardado',
    saving: 'Guardando...',
    saveFlashcard: 'Guardar flashcard',
    close: 'Cerrar',
    openTranslatorHint: 'Haz clic en una palabra o selecciona una frase para traducir',
    verdictCorrect: 'acertó',
    verdictWrong: 'falló',
    verdictAnswered: 'respondió',
    answerGroups: 'Respuestas del grupo',
    noGroupedAnswers: 'Esperando la primera respuesta de los alumnos.',
    noWrongAnswers: 'No hubo errores en esta pregunta.',
    releaseRetry: 'Liberar nuevo intento para quienes fallaron',
    releasingRetry: 'Liberando...',
    waitingTeacher: 'Esperando al profesor',
    onlineNow: 'En linea ahora',
    noStudentsOnline: 'No hay alumnos en linea ahora.',
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

type NormalizedGrammarSection = {
  title: string;
  lines: string[];
};

type NormalizedGrammarGuide = {
  label?: string;
  lessonTitle?: string;
  grammarTitle?: string;
  sections: NormalizedGrammarSection[];
};

const normalizeGrammarGuide = (guide: (typeof GRAMMAR_GUIDES)[string]): NormalizedGrammarGuide => {
  if (Array.isArray(guide)) {
    return {
      sections: [{ title: 'Notes', lines: guide }],
    };
  }

  const lessonTitle = guide.sections.find((section) => section.title === 'Lesson Title')?.lines[0];
  const grammarTitle = guide.sections.find((section) => section.title === 'Grammar Title')?.lines[0];
  const sections = guide.sections.filter(
    (section) => section.title !== 'Lesson Title' && section.title !== 'Grammar Title',
  );

  return {
    label: guide.label,
    lessonTitle,
    grammarTitle,
    sections,
  };
};

const renderInlineFormatting = (text: string): React.ReactNode[] => {
  let nodeKey = 0;

  const parse = (value: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    let index = 0;

    while (index < value.length) {
      if (value.startsWith('**', index)) {
        const end = value.indexOf('**', index + 2);
        if (end !== -1) {
          nodes.push(
            <strong key={`strong-${nodeKey++}`}>
              {parse(value.slice(index + 2, end))}
            </strong>,
          );
          index = end + 2;
          continue;
        }
      }

      if (value[index] === '*') {
        const end = value.indexOf('*', index + 1);
        if (end !== -1) {
          nodes.push(
            <em key={`em-${nodeKey++}`}>
              {parse(value.slice(index + 1, end))}
            </em>,
          );
          index = end + 1;
          continue;
        }
      }

      const nextStrong = value.indexOf('**', index);
      const nextEm = value.indexOf('*', index);
      const nextIndex = [nextStrong, nextEm]
        .filter((candidate) => candidate !== -1)
        .reduce((smallest, candidate) => Math.min(smallest, candidate), value.length);

      nodes.push(value.slice(index, nextIndex));
      index = nextIndex;
    }

    return nodes;
  };

  return parse(text);
};

const getGrammarGuideForLesson = (lessonNumber: number): NormalizedGrammarGuide | null => {
  const grammarKey = `L${lessonNumber}_GRAMMAR`;
  if (!Object.prototype.hasOwnProperty.call(GRAMMAR_GUIDES, grammarKey)) return null;
  return normalizeGrammarGuide(GRAMMAR_GUIDES[grammarKey]);
};

const getGrammarSectionTitle = (title: string): string => {
  if (title === 'Examples by Person or Structure') return 'Examples';
  return title;
};

const shouldRenderGrammarBullets = (section: NormalizedGrammarSection): boolean => {
  if (section.lines.length > 1) return true;
  return ['Main Notes', 'Examples by Person or Structure', 'Questions', 'Negative Sentences', 'Common Mistakes'].includes(section.title);
};

const renderGrammarLine = (line: string, sectionTitle: string): React.ReactNode => {
  if (sectionTitle !== 'Common Mistakes') {
    return renderInlineFormatting(line);
  }

  const match = line.match(/^(Correct|Incorrect):\s*(.*)$/i);
  if (!match) return renderInlineFormatting(line);

  const status = match[1].toLowerCase();
  const content = match[2];
  const statusClass = status === 'correct' ? 'text-blue-600' : 'text-red-600';

  return (
    <>
      <strong className={statusClass}>
        {match[1]}
        :
      </strong>{' '}
      {renderInlineFormatting(content)}
    </>
  );
};

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
  const acceptedAnswers = expandAcceptedAnswerVariants([
    block.expectedAnswer ?? '',
    ...(block.acceptedAnswers ?? []),
  ])
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

function getLatestResponsesForBlock(
  blockId: string | null | undefined,
  responses: LiveClassResponse[],
) {
  if (!blockId) return new Map<string, LiveClassResponse>();
  const latest = new Map<string, LiveClassResponse>();
  responses.forEach((response) => {
    if (response.exerciseId !== blockId) return;
    const existing = latest.get(response.userId);
    if (!existing) {
      latest.set(response.userId, response);
      return;
    }
    const existingCreatedAt = existing.createdAt ?? '';
    const nextCreatedAt = response.createdAt ?? '';
    if (nextCreatedAt.localeCompare(existingCreatedAt) >= 0) {
      latest.set(response.userId, response);
    }
  });
  return latest;
}

function getLatestWrongResponsesForBlock(
  block: LiveExerciseBlock | null,
  responses: LiveClassResponse[],
) {
  const latestWrong = new Map<string, LiveClassResponse>();
  if (!block) return latestWrong;

  responses.forEach((response) => {
    if (response.exerciseId !== block.id) return;
    const answer = response.answer?.trim() ?? '';
    if (!answer || isStudentAnswerCorrect(block, answer)) return;

    const existing = latestWrong.get(response.userId);
    if (!existing) {
      latestWrong.set(response.userId, response);
      return;
    }

    const existingCreatedAt = existing.createdAt ?? '';
    const nextCreatedAt = response.createdAt ?? '';
    if (nextCreatedAt.localeCompare(existingCreatedAt) >= 0) {
      latestWrong.set(response.userId, response);
    }
  });

  return latestWrong;
}

function getResolvedStudentAnswer(
  block: LiveExerciseBlock,
  studentUid: string,
  latestResponsesByUser: Map<string, LiveClassResponse>,
) {
  const blockAnswer = getStudentResponse(block, studentUid).trim();
  if (blockAnswer) return blockAnswer;

  const status = getStudentStatus(block, studentUid);
  const latestResponse = latestResponsesByUser.get(studentUid);
  const latestResponseAnswer = latestResponse?.answer?.trim() ?? '';
  if (!latestResponseAnswer) return '';
  if (status !== 'pending') return latestResponseAnswer;

  const blockUpdatedAt = block.updatedAt ?? '';
  const responseCreatedAt = latestResponse?.createdAt ?? '';
  if (responseCreatedAt && (!blockUpdatedAt || responseCreatedAt.localeCompare(blockUpdatedAt) > 0)) {
    return latestResponseAnswer;
  }

  return '';
}

function getResolvedStudentAnsweredAt(
  block: LiveExerciseBlock,
  studentUid: string,
  latestResponsesByUser: Map<string, LiveClassResponse>,
) {
  const answer = getResolvedStudentAnswer(block, studentUid, latestResponsesByUser);
  if (!answer) return '';

  return currentBlockAnswerTimestamp(block, studentUid) ?? latestResponsesByUser.get(studentUid)?.createdAt ?? '';
}

function currentBlockAnswerTimestamp(block: LiveExerciseBlock, studentUid: string) {
  return block.responseAnsweredAt[studentUid] ?? '';
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
    audioValueBeforeAnswer: block.sourceAudioValueBeforeAnswer?.trim() || undefined,
    fullSentenceAfterAnswer: block.sourceFullSentenceAfterAnswer?.trim() || undefined,
    options: prompt.options.length ? prompt.options : undefined,
    correctValue: block.expectedAnswer?.trim() || '',
    acceptedAnswers: block.acceptedAnswers?.length ? block.acceptedAnswers : undefined,
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
        hint: buildBattleGeneratedHint(text || promptAudioText, expectedAnswer),
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
        hint: buildBattleGeneratedHint(text || promptAudioText, expectedAnswer),
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
        hint: buildBattleGeneratedHint(text || promptAudioText, expectedAnswer),
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
  const isCompactViewport =
    typeof window !== 'undefined'
      ? window.innerWidth < 640 || window.innerHeight < 720
      : false;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setSaved(false);

    Promise.all([
      translateText(selection.text, courseLanguage, 'pt-BR'),
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
    const handlePointerDown = (event: PointerEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [onClose]);

  useEffect(() => {
    void ttsSpeakImpl(selection.text, courseLanguage);
  }, [courseLanguage, selection.text]);

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

  if (isCompactViewport) {
    return (
      <div
        className="fixed inset-0 z-[145] flex items-end bg-slate-950/45 p-3 backdrop-blur-[2px]"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          ref={popupRef}
          className="max-h-[72vh] w-full overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-4 shadow-2xl"
          onPointerDown={(event) => event.stopPropagation()}
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

          <div className="mt-4 space-y-3 text-sm text-slate-700">
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

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleSpeak}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-wide text-white"
            >
              {copy.audio}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || saved}
              className="rounded-2xl bg-blue-600 px-4 py-3 text-xs font-black uppercase tracking-wide text-white disabled:opacity-50"
            >
              {saved ? copy.saved : saving ? copy.saving : copy.saveFlashcard}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
  onStartTrailBattle,
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
  const [liveResponses, setLiveResponses] = useState<LiveClassResponse[]>([]);
  const [retryReleaseVersion, setRetryReleaseVersion] = useState(0);
  const [transitionBusy, setTransitionBusy] = useState(false);
  const [practiceViewportTopOffset, setPracticeViewportTopOffset] = useState(LIVE_TRAIL_VIEWPORT_TOP_OFFSET);
  const previousStudentBlockStateRef = useRef<{
    blockId: string | null;
    status: LiveExerciseBlockStatus;
    locked: boolean;
    response: string;
  } | null>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const grammarModalScrollRef = useRef<HTMLDivElement>(null);
  const applyingRemoteGrammarScrollRef = useRef(false);
  const grammarScrollSyncDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumedTransitionRef = useRef<string | null>(null);

  const actorName = getActorName(user);
  const courseId = defaultCourseId ?? 'english';
  const workbookId = session.activeWorkbookId ?? 1;
  const lessonId = session.activeLessonId ?? null;
  const lessonNumber = getLessonNumberFromId(lessonId);
  const courseLanguage = getCourseLanguageCode(courseId);
  const effectiveUiLanguage: TrailUiLanguage = (() => {
    if (courseLanguage === 'en' || courseLanguage === 'pt' || courseLanguage === 'es') {
      return courseLanguage;
    }
    try {
      const stored = getScopedStorageItem(BASE_UI_LANGUAGE_STORAGE_KEY);
      return stored === 'en' || stored === 'pt' || stored === 'es' ? stored : uiLanguage;
    } catch {
      return uiLanguage;
    }
  })();
  const copy = getTrailCopy(effectiveUiLanguage);
  const teacherGuidedMode = !isTeacher && teacherPresent;
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
    const unsubscribe = subscribeLiveResponses(
      classId,
      (next) => setLiveResponses(next),
      () => undefined,
    );

    return unsubscribe;
  }, [classId]);

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
    liveResponses.forEach((response) => {
      if (response.exerciseId !== currentBlock.id || !response.userId || tracked.has(response.userId)) return;
      tracked.set(response.userId, {
        uid: response.userId,
        label: response.userName || response.userId,
        isOnline: false,
      });
    });
    return Array.from(tracked.values());
  }, [assignedRoster, currentBlock, liveResponses]);

  const latestResponsesByUser = useMemo(
    () => getLatestResponsesForBlock(currentBlock?.id, liveResponses),
    [currentBlock?.id, liveResponses],
  );
  const latestWrongResponsesByUser = useMemo(
    () => getLatestWrongResponsesForBlock(currentBlock, liveResponses),
    [currentBlock, liveResponses],
  );

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
      const response = getResolvedStudentAnswer(currentBlock, student.uid, latestResponsesByUser);
      const status = getStudentStatus(currentBlock, student.uid);
      return Boolean(response) || status !== 'pending';
    }).length;

    const correctCount = trackedStudents.filter((student) => {
      const answer = getResolvedStudentAnswer(currentBlock, student.uid, latestResponsesByUser);
      const verdict = getStudentVerdict(currentBlock, student.uid)
        ?? (answer ? (isStudentAnswerCorrect(currentBlock, answer) ? 'correct' : 'wrong') : null);
      return verdict === 'correct' || verdict === 'correct_second_try';
    }).length;

    const latestStudentAnswer =
      trackedStudents
        .map((student) => ({
          label: student.label,
          answer: latestWrongResponsesByUser.get(student.uid)?.answer?.trim() ?? '',
          verdict: (
            latestWrongResponsesByUser.get(student.uid)?.answer?.trim() ? 'wrong' : null
          ) as LiveExerciseAnswerVerdict | null,
          answeredAt: latestWrongResponsesByUser.get(student.uid)?.createdAt ?? '',
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
  }, [currentBlock, latestResponsesByUser, latestWrongResponsesByUser, trackedStudents]);

  const teacherAnswerGroups = useMemo(() => {
    if (!currentBlock || trackedStudents.length === 0) return [];

    const groups = new Map<string, {
      answer: string;
      verdict: LiveExerciseAnswerVerdict | null;
      labels: string[];
    }>();

    trackedStudents.forEach((student) => {
      const answer = latestWrongResponsesByUser.get(student.uid)?.answer?.trim() ?? '';
      const verdict = (answer ? 'wrong' : null) as LiveExerciseAnswerVerdict | null;
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
  }, [currentBlock, latestWrongResponsesByUser, trackedStudents]);

  const releasableWrongStudentIds = useMemo(() => {
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
  const onlineTrackedStudents = useMemo(
    () => trackedStudents.filter((student) => student.isOnline),
    [trackedStudents],
  );

  const grammarGuide = useMemo(
    () => getGrammarGuideForLesson(lessonNumber),
    [lessonNumber],
  );
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

  useEffect(() => {
    if (isTeacher || !currentBlock) return;
    const nextState = {
      blockId: currentBlock.id,
      status: getStudentStatus(currentBlock, user.uid),
      locked: isStudentLocked(currentBlock, user.uid),
      response: getStudentResponse(currentBlock, user.uid).trim(),
    };
    const previousState = previousStudentBlockStateRef.current;
    if (
      previousState
      && previousState.blockId === nextState.blockId
      && (previousState.status !== 'pending' || previousState.locked || previousState.response)
      && nextState.status === 'pending'
      && !nextState.locked
      && !nextState.response
    ) {
      setRetryReleaseVersion((current) => current + 1);
    }
    previousStudentBlockStateRef.current = nextState;
  }, [currentBlock, isTeacher, user.uid]);

  const releaseWrongAnswers = async () => {
    if (!isTeacher || !currentBlock || releasableWrongStudentIds.length === 0) return;
    await Promise.all(
      releasableWrongStudentIds.map((studentUid) =>
        clearExerciseBlockStudentResponse(classId, currentBlock.id, studentUid, user.uid, actorName),
      ),
    );
  };

  const handleReleaseWrongAnswers = async () => {
    if (!isTeacher || !currentBlock || releasableWrongStudentIds.length === 0) return;
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
    const chromeElement = chromeRef.current;
    if (!chromeElement || typeof window === 'undefined') {
      setPracticeViewportTopOffset(LIVE_TRAIL_VIEWPORT_TOP_OFFSET);
      return;
    }

    const measureOffset = () => {
      const rect = chromeElement.getBoundingClientRect();
      const nextOffset = Math.max(LIVE_TRAIL_VIEWPORT_TOP_OFFSET, Math.ceil(rect.bottom + 12));
      setPracticeViewportTopOffset((current) => (
        Math.abs(current - nextOffset) > 1 ? nextOffset : current
      ));
    };

    measureOffset();
    window.addEventListener('resize', measureOffset);

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => measureOffset());
      observer.observe(chromeElement);
      return () => {
        window.removeEventListener('resize', measureOffset);
        observer.disconnect();
      };
    }

    return () => {
      window.removeEventListener('resize', measureOffset);
    };
  }, [isTeacher, teacherGuidedMode, canEdit, vocabMode, currentBlock?.id, teacherAnswerGroups.length]);

  useEffect(() => {
    if (!vocabMode) {
      setSelectedVocab(null);
    }
  }, [vocabMode]);

  useEffect(() => {
    setSaveError(null);
  }, [currentBlock?.id]);

  const pushSharedGrammarState = useCallback(async (patch: Pick<LiveClassSession, 'sharedGrammarOpen' | 'sharedGrammarLessonNumber' | 'sharedGrammarScrollRatio'>) => {
    try {
      await updateLiveSession(
        classId,
        patch,
        user.uid,
      );
    } catch (error) {
      console.warn('[LiveTrailExerciseOverlay] grammar sync failed:', error);
    }
  }, [classId, user.uid]);

  const openSharedGrammarModal = useCallback(() => {
    setShowGrammarModal(true);
    const element = grammarModalScrollRef.current;
    if (element) {
      applyingRemoteGrammarScrollRef.current = true;
      element.scrollTop = 0;
      window.requestAnimationFrame(() => {
        applyingRemoteGrammarScrollRef.current = false;
      });
    }
    void pushSharedGrammarState({
      sharedGrammarOpen: true,
      sharedGrammarLessonNumber: lessonNumber,
      sharedGrammarScrollRatio: 0,
    });
  }, [lessonNumber, pushSharedGrammarState]);

  const closeSharedGrammarModal = useCallback(() => {
    setShowGrammarModal(false);
    void pushSharedGrammarState({
      sharedGrammarOpen: false,
      sharedGrammarLessonNumber: lessonNumber,
      sharedGrammarScrollRatio: null,
    });
  }, [lessonNumber, pushSharedGrammarState]);

  const handleGrammarModalScroll = useCallback(() => {
    const element = grammarModalScrollRef.current;
    if (!element || applyingRemoteGrammarScrollRef.current || !showGrammarModal) return;

    const maxScroll = element.scrollHeight - element.clientHeight;
    const scrollRatio = maxScroll > 0 ? element.scrollTop / maxScroll : 0;

    if (grammarScrollSyncDebounceRef.current) {
      clearTimeout(grammarScrollSyncDebounceRef.current);
    }

    grammarScrollSyncDebounceRef.current = setTimeout(() => {
      void pushSharedGrammarState({
        sharedGrammarOpen: true,
        sharedGrammarLessonNumber: lessonNumber,
        sharedGrammarScrollRatio: Number.isFinite(scrollRatio) ? Math.max(0, Math.min(1, scrollRatio)) : 0,
      });
    }, 120);
  }, [lessonNumber, pushSharedGrammarState, showGrammarModal]);

  useEffect(() => {
    const remoteOpen = Boolean(session.sharedGrammarOpen);
    const remoteLessonNumber =
      typeof session.sharedGrammarLessonNumber === 'number'
        ? session.sharedGrammarLessonNumber
        : null;
    const matchesLesson = remoteLessonNumber === null || remoteLessonNumber === lessonNumber;
    const shouldOpen = remoteOpen && matchesLesson;

    setShowGrammarModal((current) => (current === shouldOpen ? current : shouldOpen));
  }, [lessonNumber, session.sharedGrammarLessonNumber, session.sharedGrammarOpen]);

  useEffect(() => {
    if (!showGrammarModal) return;
    if (typeof session.sharedGrammarScrollRatio !== 'number') return;

    const element = grammarModalScrollRef.current;
    if (!element) return;

    const maxScroll = element.scrollHeight - element.clientHeight;
    applyingRemoteGrammarScrollRef.current = true;
    element.scrollTop = maxScroll > 0 ? session.sharedGrammarScrollRatio * maxScroll : 0;
    window.requestAnimationFrame(() => {
      applyingRemoteGrammarScrollRef.current = false;
    });
  }, [session.sharedGrammarLessonNumber, session.sharedGrammarScrollRatio, showGrammarModal]);

  useEffect(() => () => {
    if (grammarScrollSyncDebounceRef.current) {
      clearTimeout(grammarScrollSyncDebounceRef.current);
    }
  }, []);

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

  const buildTrailBattleTemplate = (completion: LiveTrailCompletion) => {
    if (blocks.length === 0) return null;
    const trailIds = [completion.completedTrailId];
    const questions = blocks
      .filter((block) => block.sourceTrailId === completion.completedTrailId)
      .map((block) => mapLiveBlockToBattleQuestion(block, {
        workbookId,
        trailIds,
      }))
      .filter((question): question is BattleQuestion => question !== null);

    if (questions.length === 0) {
      setSaveError(copy.loadError);
      return null;
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

    const templateTitle = `${lesson?.title || completion.completedTrailLabel || copy.liveTrail} • Battle`;
    return buildSavedBattleTemplate(config, questions, templateTitle);
  };

  const advanceAfterTrailCompletion = async (completion: LiveTrailCompletion) => {
    if (completion.nextTrailId) {
      const seeded = await seedExerciseSessionFromLessonTrails({
        classId,
        courseId,
        workbookId,
        lessonId: completion.lessonId,
        trailIds: [completion.nextTrailId],
        updatedByUid: user.uid,
        updatedByName: actorName,
      });

      await updateLiveSession(
        classId,
        {
          sessionStatus: 'active',
          activeWorkbookId: workbookId,
          activeLessonId: completion.lessonId,
          activeExerciseId: seeded.trailIds[0] ?? null,
          activeTrailIds: seeded.trailIds,
          activeTrailLabel: seeded.trailLabel,
          trailCompletion: null,
          mainStageMode: 'trail',
        },
        user.uid,
      );
      return;
    }

    await updateLiveSession(
      classId,
      { trailCompletion: null, mainStageMode: 'trail' },
      user.uid,
    );
  };

  const performSkipBattle = async (completion: LiveTrailCompletion) => {
    resumedTransitionRef.current = `${completion.id}:advancing`;
    try {
      setTransitionBusy(true);
      setSaveError(null);
      await advanceAfterTrailCompletion(completion);
    } catch {
      await claimLiveTrailCompletionStatus({
        classId,
        completionId: completion.id,
        from: ['advancing'],
        to: 'awaiting-decision',
        updatedByUid: user.uid,
      }).catch(() => null);
      setSaveError(copy.finishAnswerError);
    } finally {
      setTransitionBusy(false);
    }
  };

  const handleSkipBattle = async () => {
    const completion = session.trailCompletion;
    if (!isTeacher || !completion || completion.status !== 'awaiting-decision') return;
    const claimed = await claimLiveTrailCompletionStatus({
      classId,
      completionId: completion.id,
      from: ['awaiting-decision'],
      to: 'advancing',
      updatedByUid: user.uid,
    });
    if (claimed) await performSkipBattle(claimed);
  };

  const performStartBattle = async (completion: LiveTrailCompletion) => {
    resumedTransitionRef.current = `${completion.id}:starting-battle`;
    const template = buildTrailBattleTemplate(completion);
    if (!template || !onStartTrailBattle) {
      await claimLiveTrailCompletionStatus({
        classId,
        completionId: completion.id,
        from: ['starting-battle'],
        to: 'awaiting-decision',
        updatedByUid: user.uid,
      }).catch(() => null);
      setSaveError(copy.loadError);
      return;
    }
    try {
      setTransitionBusy(true);
      setSaveError(null);
      await onStartTrailBattle(template, completion);
    } catch {
      await claimLiveTrailCompletionStatus({
        classId,
        completionId: completion.id,
        from: ['starting-battle'],
        to: 'awaiting-decision',
        updatedByUid: user.uid,
      }).catch(() => null);
      setSaveError(copy.finishAnswerError);
    } finally {
      setTransitionBusy(false);
    }
  };

  const handleStartBattle = async () => {
    const completion = session.trailCompletion;
    if (!isTeacher || !completion || completion.status !== 'awaiting-decision') return;
    const claimed = await claimLiveTrailCompletionStatus({
      classId,
      completionId: completion.id,
      from: ['awaiting-decision'],
      to: 'starting-battle',
      updatedByUid: user.uid,
    });
    if (claimed) await performStartBattle(claimed);
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
        if (answer) {
          await submitLiveResponse(classId, {
            userId: user.uid,
            userName: actorName,
            workbookId,
            lessonId,
            exerciseId: currentBlock.id,
            answer: payload.answer,
          });
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
        if (nextBlock && nextBlock.sourceTrailId === currentBlock.sourceTrailId) {
          await setSharedCurrentBlock(nextBlock.id);
        } else if (lesson) {
          const currentTrailId = currentBlock.sourceTrailId ?? session.activeTrailIds?.[session.activeTrailIds.length - 1] ?? null;
          if (!currentTrailId) {
            await setSharedCurrentBlock(LIVE_TRAIL_COMPLETE_BLOCK_ID);
            return;
          }
          const completion = buildLiveTrailCompletion({
            lessonId: lesson.id,
            currentTrailId,
            currentTrailLabel: session.activeTrailLabel || currentTrailId,
            lessonDays: lesson.days,
          });
          await completeLiveTrailForDecision(classId, completion, user.uid, actorName);
        } else {
          await setSharedCurrentBlock(LIVE_TRAIL_COMPLETE_BLOCK_ID);
        }
      }
    } catch {
      setSaveError(copy.finishAnswerError);
    }
  };

  useEffect(() => {
    if (!isTeacher || !session.trailCompletion) return;
    const completion = session.trailCompletion;
    if (completion.status !== 'advancing' && completion.status !== 'starting-battle') {
      resumedTransitionRef.current = null;
      return;
    }
    const resumeKey = `${completion.id}:${completion.status}`;
    if (resumedTransitionRef.current === resumeKey) return;
    resumedTransitionRef.current = resumeKey;
    if (completion.status === 'advancing') {
      void performSkipBattle(completion);
    } else {
      void performStartBattle(completion);
    }
  }, [isTeacher, session.trailCompletion]);

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

  if (!currentBlock && session.trailCompletion) {
    const completion = session.trailCompletion;
    const awaitingDecision = completion.status === 'awaiting-decision';
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md rounded-3xl border border-emerald-500/30 bg-slate-900 p-6 text-center shadow-2xl">
          <p className="text-lg font-black text-emerald-300">{copy.trailComplete}</p>
          <p className="mt-2 text-sm text-slate-200">
            {isTeacher
              ? awaitingDecision ? copy.battleDecisionBody : copy.resumingTrail
              : copy.waitingBattleDecision}
          </p>
          {isTeacher && awaitingDecision ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void handleStartBattle()}
                disabled={transitionBusy || !onStartTrailBattle}
                className="rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
              >
                {copy.startBattle}
              </button>
              <button
                type="button"
                onClick={() => void handleSkipBattle()}
                disabled={transitionBusy}
                className="rounded-2xl border border-slate-600 bg-slate-950/70 px-5 py-3 text-sm font-black text-slate-100 disabled:opacity-50"
              >
                {copy.skipBattle}
              </button>
            </div>
          ) : null}
          {saveError ? <p className="mt-4 text-xs font-semibold text-rose-200">{saveError}</p> : null}
        </div>
      </div>
    );
  }

  if (!currentBlock) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md rounded-3xl border border-emerald-500/30 bg-slate-900 p-6 text-center shadow-2xl">
          <p className="text-lg font-black text-emerald-300">{copy.trailComplete}</p>
          <p className="mt-2 text-sm text-slate-200">{copy.trailCompleteBody}</p>
        </div>
      </div>
    );
  }

  const practiceItem = currentBlock ? getPracticeItem(currentBlock, lessonNumber) : null;
  const chromeTopStyle = {
    top: `calc(env(safe-area-inset-top, 0px) + ${LIVE_TRAIL_CHROME_TOP_OFFSET}px)`,
  };
  const liveControls = (
    <>
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
              â†
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
              â†’
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={openSharedGrammarModal}
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
        <div className="pointer-events-none max-w-xs rounded-2xl border border-cyan-400/30 bg-slate-950/92 px-3 py-2 text-center text-[11px] font-bold text-cyan-100 shadow-2xl backdrop-blur-sm sm:text-right">
          {copy.openTranslatorHint}
        </div>
      ) : null}
    </>
  );

  return (
    <>
      {practiceItem ? (
        <div className="fixed inset-0 z-[120] bg-slate-950">
          <div
            ref={chromeRef}
            className="fixed left-3 right-3 z-[135] flex flex-col gap-2 sm:left-4 sm:right-4 sm:flex-row sm:items-start sm:justify-between"
            style={chromeTopStyle}
          >
            {isTeacher ? (
              <div className="max-w-[240px] rounded-2xl border border-slate-700 bg-slate-950/92 px-2.5 py-2 shadow-2xl backdrop-blur-sm md:absolute md:left-0 md:top-0 md:w-full md:max-w-[220px]">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">
                  {lesson?.title || session.activeTrailLabel || copy.liveTrail}
                </p>
                <p className="mt-1 text-[11px] text-slate-300">
                  {copy.question} {Math.max(currentBlockIndex + 1, 1)}/{Math.max(blocks.length, 1)}
                </p>
                <p className="mt-1 text-[11px] text-slate-200">
                  {copy.answered}: {teacherSummary.respondedCount}/{trackedStudents.length || 0} | {copy.waiting}: {teacherSummary.pendingCount} | {copy.accuracy}: {teacherSummary.accuracyRate}%
                </p>
                <div className="mt-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
                      {copy.onlineNow}
                    </p>
                    <p className="text-[11px] font-black text-emerald-100">
                      {onlineTrackedStudents.length}/{trackedStudents.length || 0}
                    </p>
                  </div>
                  {onlineTrackedStudents.length > 0 ? (
                    <div className="mt-2 flex max-h-20 flex-wrap gap-1.5 overflow-y-auto pr-1">
                      {onlineTrackedStudents.map((student) => (
                        <span
                          key={`online:${student.uid}`}
                          className="rounded-full border border-emerald-400/30 bg-slate-900/70 px-2 py-1 text-[10px] font-bold text-emerald-50"
                        >
                          {student.label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] text-emerald-100/70">
                      {copy.noStudentsOnline}
                    </p>
                  )}
                </div>
                <div className="mt-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
                      {copy.answerGroups}
                    </p>
                    {releasableWrongStudentIds.length > 0 ? (
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
                    <div className="mt-2 max-h-20 space-y-1 overflow-y-auto pr-1">
                      {teacherAnswerGroups.map((group) => {
                        const verdictLabel = getVerdictCopy(group.verdict, effectiveUiLanguage);
                        const verdictClasses =
                          group.verdict === 'correct' || group.verdict === 'correct_second_try'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                            : group.verdict === 'wrong'
                              ? 'border-rose-500/30 bg-rose-500/10 text-rose-100'
                              : 'border-slate-700 bg-slate-800/80 text-slate-100';
                        return (
                          <div
                            key={`${group.verdict ?? 'answered'}:${group.answer}:${group.labels.join('|')}`}
                            className={`rounded-xl border px-2 py-1.5 text-[11px] ${verdictClasses}`}
                          >
                            <p className="font-black">
                              "{group.answer}" - {verdictLabel}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-200">
                              {group.labels.join(', ')}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] text-slate-400">
                      {teacherSummary.respondedCount > 0 ? copy.noWrongAnswers : copy.noGroupedAnswers}
                    </p>
                  )}
                </div>
                {saveError ? <p className="mt-1 text-[11px] text-rose-200">{saveError}</p> : null}
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

            <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-1.5 sm:gap-2">
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
                onClick={openSharedGrammarModal}
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
              <div className="pointer-events-none max-w-xs rounded-2xl border border-cyan-400/30 bg-slate-950/92 px-3 py-2 text-center text-[11px] font-bold text-cyan-100 shadow-2xl backdrop-blur-sm sm:text-right">
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
            uiLanguage={effectiveUiLanguage}
            copyLanguage={courseLanguage === 'en' || courseLanguage === 'pt' || courseLanguage === 'es' ? courseLanguage : 'en'}
            onAttempt={handleAttempt}
            onContinue={handleContinue}
            actionLocked={!isTeacher && (!canEdit || (teacherGuidedMode && waitingTeacherRelease))}
            feedbackActionLocked={!isTeacher && teacherGuidedMode && waitingTeacherRelease}
            persistCorrectFooterAction={isTeacher}
            allowContinueWithoutAnswer={isTeacher}
            lockWrongFeedbackImmediately={!isTeacher && teacherGuidedMode}
            retryReleaseVersion={retryReleaseVersion}
            autoPlayAudio={false}
            fullScreen={true}
            viewportTopOffset={practiceViewportTopOffset}
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
          onClick={closeSharedGrammarModal}
        >
          <div
            ref={grammarModalScrollRef}
            onScroll={handleGrammarModalScroll}
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between rounded-t-3xl border-b border-slate-100 bg-white px-6 py-4">
              <h2 className="text-lg font-bold text-slate-800">{copy.grammarTitle(lessonNumber)}</h2>
              <button
                type="button"
                onClick={closeSharedGrammarModal}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label={copy.close}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M6 6L18 18" />
                  <path d="M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="space-y-5 px-6 py-4">
              {!grammarGuide ? (
                <p className="text-sm text-slate-500">
                  {copy.noGrammar}
                </p>
              ) : (
                <>
                  {grammarGuide.grammarTitle ? (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-500">
                        {grammarGuide.lessonTitle || copy.grammar}
                      </p>
                      <p className="mt-1 text-base font-bold text-slate-900">
                        {grammarGuide.grammarTitle}
                      </p>
                    </div>
                  ) : null}
                  {grammarGuide.sections.map((section) => {
                    const useBullets = shouldRenderGrammarBullets(section);

                    return (
                      <div key={section.title}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-500">
                          {getGrammarSectionTitle(section.title)}
                        </p>
                        {useBullets ? (
                          <ul className="space-y-1.5">
                            {section.lines.map((line, index) => (
                              <li key={`${section.title}_${index}`} className="flex gap-2 text-sm text-slate-700">
                                <span className="flex-shrink-0 text-blue-400">-</span>
                                <span>{renderGrammarLine(line, section.title)}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="space-y-2">
                            {section.lines.map((line, index) => (
                              <p key={`${section.title}_${index}`} className="text-sm text-slate-700">
                                {renderGrammarLine(line, section.title)}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {selectedVocab ? (
        <TrailVocabHelper
          selection={selectedVocab}
          courseLanguage={courseLanguage}
            uiLanguage={effectiveUiLanguage}
            userId={user.uid}
          onClose={() => setSelectedVocab(null)}
        />
      ) : null}
    </>
  );
};
