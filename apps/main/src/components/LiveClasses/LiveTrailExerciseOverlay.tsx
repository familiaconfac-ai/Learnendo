import React, { useEffect, useMemo, useState } from 'react';
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

function getVerdictCopy(verdict: LiveExerciseAnswerVerdict | null) {
  if (verdict === 'correct' || verdict === 'correct_second_try') return 'acertou';
  if (verdict === 'wrong') return 'errou';
  return 'respondeu';
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

interface TrailVocabHelperProps {
  word: string;
  courseLanguage: 'en' | 'pt' | 'es' | 'el' | 'he';
  userId: string;
  onClose: () => void;
}

const TrailVocabHelper: React.FC<TrailVocabHelperProps> = ({
  word,
  courseLanguage,
  userId,
  onClose,
}) => {
  const [translations, setTranslations] = useState<{ pt: string; es: string }>({ pt: '', es: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [phonetic, setPhonetic] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setSaved(false);

    Promise.all([
      translateText(word, courseLanguage, 'pt'),
      translateText(word, courseLanguage, 'es'),
      fetchPhoneticForPhrase(word),
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
  }, [courseLanguage, word]);

  const handleSpeak = () => {
    void ttsSpeakImpl(word, courseLanguage);
  };

  const handleSave = async () => {
    if (saving || saved) return;
    setSaving(true);
    const targetLang = courseLanguage === 'pt' ? 'es' : 'pt';
    const translation = targetLang === 'pt' ? translations.pt : translations.es;
    const entryId = await saveVocabularyEntry(userId, {
      text: word,
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

  return (
    <div className="fixed inset-0 z-[145] bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute right-4 top-20 w-[320px] rounded-3xl border border-slate-700 bg-white p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Dictionary
            </p>
            <p className="mt-1 break-words text-lg font-black text-slate-900">{word}</p>
            {phonetic ? <p className="mt-1 text-xs font-semibold text-slate-500">{phonetic}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-2 py-1 text-sm font-black text-slate-600"
          >
            x
          </button>
        </div>

        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Portugues
            </p>
            <p className="mt-1">{loading ? 'Carregando...' : translations.pt || word}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Espanol
            </p>
            <p className="mt-1">{loading ? 'Carregando...' : translations.es || word}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSpeak}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wide text-white"
          >
            Audio
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || saved}
            className="rounded-2xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white disabled:opacity-50"
          >
            {saved ? 'Salvo' : saving ? 'Salvando...' : 'Salvar Flashcard'}
          </button>
        </div>
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
  const [selectedVocabWord, setSelectedVocabWord] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const actorName = getActorName(user);
  const courseId = defaultCourseId ?? 'english';
  const workbookId = session.activeWorkbookId ?? 1;
  const lessonId = session.activeLessonId ?? null;
  const lessonNumber = getLessonNumberFromId(lessonId);
  const courseLanguage = getCourseLanguageCode(courseId);

  void uiLanguage;

  useEffect(() => {
    setBlocksError(null);
    const unsubscribe = subscribeExerciseSession(
      classId,
      (next) => setExerciseSession({ currentBlockId: next.currentBlockId ?? null }),
      () => setBlocksError('Nao foi possivel carregar a trilha ao vivo agora.'),
    );

    return unsubscribe;
  }, [classId]);

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

  const questionWords = useMemo(
    () => (currentBlock && vocabMode ? getUniqueQuestionWords(currentBlock) : []),
    [currentBlock, vocabMode],
  );

  useEffect(() => {
    setSelectedVocabWord(null);
  }, [currentBlock?.id]);

  useEffect(() => {
    if (!vocabMode) {
      setSelectedVocabWord(null);
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
      setSaveError('Nao foi possivel sincronizar esta resposta agora.');
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
      setSaveError('Nao foi possivel concluir esta resposta agora.');
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
            {isTeacher ? 'Carregando trilha ao vivo...' : 'Professor preparando a trilha...'}
          </p>
        </div>
      </div>
    );
  }

  if (!currentBlock && !isTeacher) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md rounded-3xl border border-emerald-500/30 bg-slate-900 p-6 text-center shadow-2xl">
          <p className="text-lg font-black text-emerald-300">Trilha concluida</p>
          <p className="mt-2 text-sm text-slate-200">
            Voce terminou todos os exercicios desta aula ao vivo.
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
          <div className="fixed left-4 right-4 top-4 z-[135] flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            {isTeacher ? (
              <div className="max-w-[520px] rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 shadow-2xl backdrop-blur-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300">
                  {lesson?.title || session.activeTrailLabel || 'Live Trail'}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  Questao {Math.max(currentBlockIndex + 1, 1)}/{Math.max(blocks.length, 1)}
                </p>
                <p className="mt-1 text-xs text-slate-200">
                  Respondidos: {teacherSummary.respondedCount}/{assignedRoster.length || 0} | Aguardando: {teacherSummary.pendingCount} | Acertos: {teacherSummary.accuracyRate}%
                </p>
                {teacherSummary.latestStudentAnswer ? (
                  <p className="mt-1 max-w-[460px] text-xs text-emerald-200">
                    Ultima resposta: <span className="font-black">{teacherSummary.latestStudentAnswer.label}</span>{' '}
                    {getVerdictCopy(teacherSummary.latestStudentAnswer.verdict)} com "
                    {teacherSummary.latestStudentAnswer.answer}".
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">
                    Nenhum aluno respondeu esta questao ainda.
                  </p>
                )}
                {currentBlock.livePreviewAnswer?.trim() ? (
                  <p className="mt-1 max-w-[460px] text-xs text-sky-200">
                    Sua demonstracao visivel para os alunos: "{currentBlock.livePreviewAnswer.trim()}"
                    {currentBlock.livePreviewCorrect == null
                      ? ''
                      : currentBlock.livePreviewCorrect
                        ? ' (correta)'
                        : ' (incorreta)'}
                  </p>
                ) : null}
                {saveError ? <p className="mt-1 text-xs text-rose-200">{saveError}</p> : null}
              </div>
            ) : (
              <div className="pointer-events-none h-0" />
            )}

            <div className="flex flex-wrap items-center justify-end gap-2">
              {isTeacher && onReturnToWorkspace ? (
                <button
                  type="button"
                  onClick={() => {
                    void onReturnToWorkspace();
                  }}
                  className="rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-100 shadow-2xl backdrop-blur-sm"
                >
                  Lousa
                </button>
              ) : null}
              {isTeacher && onOpenSessionPanel ? (
                <button
                  type="button"
                  onClick={onOpenSessionPanel}
                  className="rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-100 shadow-2xl backdrop-blur-sm"
                >
                  Painel
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
                    className="rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-100 shadow-2xl backdrop-blur-sm disabled:opacity-40"
                  >
                    Anterior
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
                    className="rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-100 shadow-2xl backdrop-blur-sm disabled:opacity-40"
                  >
                    Proxima
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => setShowGrammarModal(true)}
                className="rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-100 shadow-2xl backdrop-blur-sm"
              >
                Gramatica
              </button>
              <button
                type="button"
                onClick={() => setVocabMode((current) => !current)}
                className="rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-100 shadow-2xl backdrop-blur-sm"
              >
                Vocab
              </button>
            </div>
          </div>

          {vocabMode && questionWords.length > 0 ? (
            <div className="fixed left-4 right-4 top-[88px] z-[134] flex justify-center">
              <div className="flex max-w-4xl flex-wrap items-center justify-center gap-2 rounded-3xl border border-slate-700 bg-slate-950/92 px-4 py-3 shadow-2xl backdrop-blur-sm">
                <span className="mr-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                  Escolha uma palavra
                </span>
                {questionWords.map((word) => (
                  <button
                    key={word}
                    type="button"
                    onClick={() => setSelectedVocabWord(word)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
                      selectedVocabWord === word
                        ? 'border-cyan-300 bg-cyan-500/20 text-cyan-100'
                        : 'border-slate-600 bg-slate-900 text-slate-100 hover:border-cyan-400'
                    }`}
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

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
            fullScreen={true}
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
              <h2 className="text-lg font-bold text-slate-800">Lesson {lessonNumber} Grammar</h2>
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
                  No grammar notes available for this lesson yet.
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

      {selectedVocabWord ? (
        <TrailVocabHelper
          word={selectedVocabWord}
          courseLanguage={courseLanguage}
          userId={user.uid}
          onClose={() => setSelectedVocabWord(null)}
        />
      ) : null}
    </>
  );
};
