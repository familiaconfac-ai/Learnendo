import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { GRAMMAR_GUIDES } from '../../constants';
import { PracticeSection } from '../UI';
import { MyVocabularyPage } from '../MyVocabularyPage';
import {
  LiveClassSession,
  LiveExerciseAnswerVerdict,
  LiveExerciseBlock,
  LiveExerciseBlockStatus,
  PracticeItem,
  Workbook,
} from '../../types';
import {
  subscribeExerciseBlocks,
  updateExerciseBlockResponse,
} from '../../services/liveSessionService';
import {
  loadWorkbookForWhiteboard,
  resolveLessonForWhiteboard,
} from '../../services/liveWhiteboardActivities';

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

function getCourseLanguageCode(courseId: string | null | undefined): 'en' | 'pt' | 'es' | 'el' | 'he' {
  const normalized = (courseId ?? '').trim().toLowerCase();
  if (normalized === 'spanish') return 'es';
  if (normalized === 'portuguese_foreigners' || normalized === 'portuguese_native') return 'pt';
  if (normalized === 'greek_koine') return 'el';
  if (normalized === 'hebrew_biblical') return 'he';
  return 'en';
}

function normalizeExerciseAnswer(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
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

function getStudentVerdict(block: LiveExerciseBlock, studentUid: string): LiveExerciseAnswerVerdict | null {
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

function buildVerdict(answer: string, isCorrect: boolean, attemptNumber: number): LiveExerciseAnswerVerdict | undefined {
  if (!answer.trim()) return undefined;
  if (!isCorrect) return 'wrong';
  return attemptNumber > 1 ? 'correct_second_try' : 'correct';
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

export const LiveTrailExerciseOverlay: React.FC<LiveTrailExerciseOverlayProps> = ({
  classId,
  user,
  session,
  isTeacher,
  assignedRoster,
  defaultCourseId,
  uiLanguage = 'pt',
}) => {
  const [blocks, setBlocks] = useState<LiveExerciseBlock[]>([]);
  const [blocksError, setBlocksError] = useState<string | null>(null);
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [loadingWorkbook, setLoadingWorkbook] = useState(false);
  const [showGrammarModal, setShowGrammarModal] = useState(false);
  const [showVocabulary, setShowVocabulary] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const actorName = getActorName(user);
  const courseId = session.activeTrailIds?.length ? (defaultCourseId ?? 'english') : (defaultCourseId ?? 'english');
  const workbookId = session.activeWorkbookId ?? 1;
  const lessonId = session.activeLessonId ?? null;
  const lessonNumber = getLessonNumberFromId(lessonId);
  const courseLanguage = getCourseLanguageCode(courseId);

  useEffect(() => {
    setBlocksError(null);
    const unsubscribe = subscribeExerciseBlocks(
      classId,
      (next) => setBlocks(next),
      () => setBlocksError('Nao foi possivel carregar a trilha ao vivo agora.'),
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

  const allStudentBlocksDone = useMemo(() => {
    if (blocks.length === 0) return false;
    if (isTeacher) {
      if (assignedRoster.length === 0) return false;
      return blocks.every((block) => assignedRoster.every((student) => getStudentStatus(block, student.uid) === 'done'));
    }
    return blocks.every((block) => getStudentStatus(block, user.uid) === 'done');
  }, [assignedRoster, blocks, isTeacher, user.uid]);

  const currentBlock = useMemo(() => {
    if (blocks.length === 0) return null;
    if (isTeacher) {
      return blocks.find((block) => assignedRoster.some((student) => getStudentStatus(block, student.uid) !== 'done'))
        ?? blocks[blocks.length - 1]
        ?? null;
    }
    if (allStudentBlocksDone) return null;
    return blocks.find((block) => getStudentStatus(block, user.uid) !== 'done') ?? blocks[0] ?? null;
  }, [allStudentBlocksDone, assignedRoster, blocks, isTeacher, user.uid]);

  const teacherSummary = useMemo(() => {
    if (!currentBlock || assignedRoster.length === 0) {
      return {
        respondedCount: 0,
        accuracyRate: 0,
        pendingCount: 0,
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

    return {
      respondedCount,
      accuracyRate: Math.round((correctCount / assignedRoster.length) * 100),
      pendingCount: Math.max(assignedRoster.length - respondedCount, 0),
    };
  }, [assignedRoster, currentBlock]);

  const grammarEntries = useMemo(
    () => Object.entries(GRAMMAR_GUIDES).filter(([key]) => key.startsWith(`L${lessonNumber}_`)),
    [lessonNumber],
  );

  const canEdit = currentBlock
    ? session.sessionStatus === 'active' && !isStudentLocked(currentBlock, user.uid)
    : false;

  const handleAttempt = async (payload: { answer: string; isCorrect: boolean; attemptNumber: number }) => {
    if (!currentBlock || (!isTeacher && !canEdit)) return;
    const answer = payload.answer.trim();
    const verdict = buildVerdict(answer, payload.isCorrect, payload.attemptNumber);
    const nextStatus: LiveExerciseBlockStatus = answer ? 'in_progress' : 'pending';

    try {
      setSaveError(null);
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
    } catch {
      setSaveError('Nao foi possivel sincronizar esta resposta agora.');
    }
  };

  const handleContinue = async (payload: { answer: string; isCorrect: boolean; attemptNumber: number }) => {
    if (!currentBlock || (!isTeacher && !canEdit)) return;
    const answer = payload.answer.trim();
    const verdict = buildVerdict(answer, payload.isCorrect, payload.attemptNumber);

    try {
      setSaveError(null);
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
    } catch {
      setSaveError('Nao foi possivel concluir esta resposta agora.');
    }
  };

  if (blocksError) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/92 px-4">
        <div className="max-w-md rounded-3xl border border-rose-500/30 bg-slate-900 p-6 text-center shadow-2xl">
          <p className="text-sm font-bold text-rose-200">{blocksError}</p>
        </div>
      </div>
    );
  }

  if (loadingWorkbook || blocks.length === 0) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/92 px-4">
        <div className="max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 text-center shadow-2xl">
          <p className="text-sm font-bold text-slate-200">Carregando trilha ao vivo...</p>
        </div>
      </div>
    );
  }

  if (!currentBlock && !isTeacher) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/92 px-4">
        <div className="max-w-md rounded-3xl border border-emerald-500/30 bg-slate-900 p-6 text-center shadow-2xl">
          <p className="text-lg font-black text-emerald-300">Trilha concluida</p>
          <p className="mt-2 text-sm text-slate-200">Voce terminou todos os exercicios desta aula ao vivo.</p>
        </div>
      </div>
    );
  }

  const practiceItem = currentBlock ? getPracticeItem(currentBlock, lessonNumber) : null;

  return (
    <>
      {practiceItem ? (
        <div className="fixed inset-0 z-40 bg-slate-950/92">
          <div className="fixed left-4 right-4 top-[76px] z-50 flex items-start justify-between gap-3">
            <div className="rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 shadow-2xl backdrop-blur-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300">
                {lesson?.title || session.activeTrailLabel || 'Live Trail'}
              </p>
              {isTeacher ? (
                <p className="mt-1 text-xs text-slate-200">
                  Respondidos: {teacherSummary.respondedCount}/{assignedRoster.length || 0} · Aguardando: {teacherSummary.pendingCount} · Acertos: {teacherSummary.accuracyRate}%
                </p>
              ) : null}
              {!isTeacher && !canEdit ? (
                <p className="mt-1 text-xs text-amber-200">O professor travou sua resposta neste momento.</p>
              ) : null}
              {saveError ? (
                <p className="mt-1 text-xs text-rose-200">{saveError}</p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowGrammarModal(true)}
                className="rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-100 shadow-2xl backdrop-blur-sm"
              >
                Gramatica
              </button>
              <button
                type="button"
                onClick={() => setShowVocabulary(true)}
                className="rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-100 shadow-2xl backdrop-blur-sm"
              >
                Vocab
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
            onAttempt={handleAttempt}
            onContinue={handleContinue}
            actionLocked={!isTeacher && !canEdit}
          />
        </div>
      ) : null}

      {showGrammarModal ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setShowGrammarModal(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between rounded-t-3xl border-b border-slate-100 bg-white px-6 py-4">
              <h2 className="text-lg font-bold text-slate-800">Lesson {lessonNumber} Grammar</h2>
              <button
                type="button"
                onClick={() => setShowGrammarModal(false)}
                className="text-2xl leading-none text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <div className="space-y-5 px-6 py-4">
              {grammarEntries.length === 0 ? (
                <p className="text-sm text-slate-500">No grammar notes available for this lesson yet.</p>
              ) : (
                grammarEntries.map(([key, tips]) => (
                  <div key={key}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-500">
                      {key.replace('_', ' › ')}
                    </p>
                    <ul className="space-y-1.5">
                      {tips.map((tip, index) => (
                        <li key={`${key}_${index}`} className="flex gap-2 text-sm text-slate-700">
                          <span className="flex-shrink-0 text-blue-400">•</span>
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

      {showVocabulary ? (
        <div className="fixed inset-0 z-[75] bg-slate-950">
          <MyVocabularyPage
            userId={user.uid}
            uiLanguage={uiLanguage}
            onBack={() => setShowVocabulary(false)}
          />
        </div>
      ) : null}
    </>
  );
};
