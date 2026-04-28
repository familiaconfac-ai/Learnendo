// ── Learnendo Battle — Setup Modal (Teacher) ──────────────────────────────────
// Flow:
//   Step 1 — CONFIG: scope · difficulty · count · time
//     ├─ ⚡ Quick Battle    → generates questions, calls onStart immediately
//     └─ 📋 Preparar Aula  → generates questions, opens Step 2
//   Step 2 — CURATION: preview list with checkbox / edit / duplicate
//     └─ ✅ Confirmar Lista Final → calls onStart with curated list
//
// Excluded question IDs are persisted in localStorage so the teacher's
// preference survives page refreshes and future sessions.

import React, { useState, useEffect, useMemo } from 'react';
import type { BattleConfig, BattleDifficulty, BattleQuestionKind, BattleScope, BattleQuestion, SavedBattleTemplate } from './battleTypes';
import { getBattleQuestions } from './battleQuestions';
import { buildSavedBattleTemplate, sanitizeBattleQuestion, sanitizeBattleQuestions } from './battleUtils';
import { BOT_AVATAR_OPTIONS, DEFAULT_BOT_AVATAR_ID } from './botAvatars';

// ── Persistence ────────────────────────────────────────────────────────────────
function buildExcludedKey(params: {
  courseId?: string;
  workbookId?: number;
  lessonId?: string;
  scope: BattleScope;
}) {
  const {
    courseId = 'no-course',
    workbookId = 'no-workbook',
    lessonId = 'no-lesson',
    scope,
  } = params;

  return `learnendo_battle_excluded_ids:${courseId}:${workbookId}:${lessonId}:${scope}`;
}

function loadExcluded(storageKey: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function persistExcluded(storageKey: string, ids: Set<string>) {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...ids]));
  } catch { /* storage quota — ignore */ }
}

// ── Constants ─────────────────────────────────────────────────────────────────
type Step = 'config' | 'curate';

interface EditDraft {
  kind: BattleQuestionKind;
  text: string;
  options: string[];
  correctIndexes: number[];
  correctText: string;
  acceptedAnswersText: string;
  promptAudioText: string;
  imageUrl: string;
}

interface Props {
  onStart: (config: BattleConfig, questions: BattleQuestion[]) => void | Promise<void>;
  onSaveTemplate?: (template: SavedBattleTemplate) => void | Promise<void>;
  onClose: () => void;
  defaultLessonId?: string;
  defaultWorkbookId?: number;
  defaultCourseId?: string;
  liveClassId?: string;
  currentUserUid?: string;
  selectedStudents?: Array<{ uid: string; name: string }>;
  initialTemplate?: SavedBattleTemplate | null;
}

const SCOPES: { value: BattleScope; label: string; desc: string }[] = [
  { value: 'current-lesson', label: 'Esta Lição',    desc: 'Só desta lição' },
  { value: 'current-book',   label: 'Livro Inteiro', desc: 'Todas as lições' },
  { value: 'review',         label: 'Revisão',       desc: 'Banco completo' },
];

const DIFFICULTIES: { value: BattleDifficulty; label: string; emoji: string }[] = [
  { value: 'easy',   label: 'Fácil',  emoji: '😊' },
  { value: 'normal', label: 'Normal', emoji: '🎯' },
  { value: 'hard',   label: 'Difícil', emoji: '🔥' },
];

const QUESTION_COUNTS = [5, 10, 20] as const;
const TIME_OPTIONS    = [5, 10, 15]  as const;
const QUESTION_KINDS: { value: BattleQuestionKind; label: string }[] = [
  { value: 'multiple-choice', label: 'Objetiva' },
  { value: 'image-choice', label: 'Com imagem' },
  { value: 'audio-choice', label: 'Escuta + alternativas' },
  { value: 'audio-open', label: 'Escuta + escrita' },
  { value: 'speaking', label: 'Speaking' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export const BattleSetupModal: React.FC<Props> = ({
  onStart,
  onSaveTemplate,
  onClose,
  defaultLessonId,
  defaultWorkbookId,
  defaultCourseId,
  liveClassId,
  currentUserUid,
  selectedStudents = [],
  initialTemplate = null,
}) => {

  useEffect(() => {
    console.log('[BATTLE DEBUG] BattleSetupModal mounted', {
      defaultLessonId,
      defaultWorkbookId,
      defaultCourseId,
      step
    });
  }, []);

  // ── Step 1 state ────────────────────────────────────────────────────────
  const [step,            setStep]            = useState<Step>('config');
  const [scope,           setScope]           = useState<BattleScope>('current-lesson');
  const [difficulty,      setDifficulty]      = useState<BattleDifficulty>('normal');
  const [questionCount,   setQuestionCount]   = useState<5 | 10 | 20>(10);
  const [timePerQuestion, setTimePerQuestion] = useState<5 | 10 | 15>(10);
  const [includeTeacher,  setIncludeTeacher]  = useState(false);
  const [botEnabled,      setBotEnabled]      = useState(false);
  const [botAvatarId,     setBotAvatarId]     = useState(DEFAULT_BOT_AVATAR_ID);
  const [botName,         setBotName]         = useState('Bot');

  // ── Step 2 state ────────────────────────────────────────────────────────
  const [questions,    setQuestions]    = useState<BattleQuestion[]>([]);
  const [excludedIds,  setExcludedIds]  = useState<Set<string>>(new Set());
  const [editingIdx,   setEditingIdx]   = useState<number | null>(null);
  const [editDraft,    setEditDraft]    = useState<EditDraft | null>(null);
  const [startError,   setStartError]   = useState<string | null>(null);
  const [startingNow,  setStartingNow]  = useState(false);
  const [saveMessage,  setSaveMessage]  = useState<string | null>(null);
  const exclusionStorageKey = useMemo(
    () => buildExcludedKey({
      courseId: defaultCourseId,
      workbookId: defaultWorkbookId,
      lessonId: defaultLessonId,
      scope,
    }),
    [defaultCourseId, defaultWorkbookId, defaultLessonId, scope]
  );

  // Load persisted exclusions for the current battle context
  useEffect(() => {
    setExcludedIds(loadExcluded(exclusionStorageKey));
  }, [exclusionStorageKey]);

  // Persist whenever exclusions change
  useEffect(() => {
    persistExcluded(exclusionStorageKey, excludedIds);
  }, [excludedIds, exclusionStorageKey]);

  useEffect(() => {
    if (!initialTemplate) return;

    setScope(initialTemplate.config.scope ?? 'current-lesson');
    setDifficulty(initialTemplate.config.difficulty ?? 'normal');
    setQuestionCount(
      initialTemplate.config.questionCount === 5
        ? 5
        : initialTemplate.config.questionCount === 20
          ? 20
          : 10
    );
    setTimePerQuestion(
      initialTemplate.config.timePerQuestion === 5
        ? 5
        : initialTemplate.config.timePerQuestion === 15
          ? 15
          : 10
    );
    setIncludeTeacher(Boolean(initialTemplate.config.includeTeacher));
    setBotEnabled(Boolean(initialTemplate.config.botEnabled));
    setBotAvatarId(initialTemplate.config.botAvatarId || DEFAULT_BOT_AVATAR_ID);
    setBotName(initialTemplate.config.botName?.trim() || 'Bot');
    setQuestions(sanitizeBattleQuestions(initialTemplate.questions));
    setExcludedIds(new Set());
    setEditingIdx(null);
    setEditDraft(null);
    setStartError(null);
    setSaveMessage(null);
    setStep('curate');
  }, [initialTemplate]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  function generateQuestions(selectedScope: BattleScope = scope): BattleQuestion[] {
    return getBattleQuestions({
      questionCount,
      scope: selectedScope,
      courseId: defaultCourseId,
      lessonId: defaultLessonId,
      workbookId: defaultWorkbookId,
    });
  }

  function buildConfig(count: number, selectedScope: BattleScope = scope): BattleConfig {
    return {
      scope: selectedScope,
      difficulty,
      questionCount: count,
      timePerQuestion,
      includeTeacher,
      botEnabled,
      botAvatarId,
      botName: botName.trim() || 'Bot',
      courseId:    defaultCourseId,
      workbookId:  defaultWorkbookId,
      lessonId:    defaultLessonId,
    };
  }

  function resolveLaunchQuestions() {
    const scopeFallbackOrder: BattleScope[] =
      scope === 'current-lesson'
        ? ['current-lesson', 'current-book', 'review']
        : scope === 'current-book'
          ? ['current-book', 'review']
          : ['review'];

    let lastError: unknown = null;

    for (const candidateScope of scopeFallbackOrder) {
      try {
        const generatedQuestions = sanitizeBattleQuestions(generateQuestions(candidateScope));
        if (generatedQuestions.length > 0) {
          return {
            generatedQuestions,
            resolvedScope: candidateScope,
          };
        }
      } catch (error) {
        lastError = error;
        console.error('[BATTLE START DEBUG] start failed:', error);
      }
    }

    if (lastError) {
      throw lastError;
    }

    return {
      generatedQuestions: [],
      resolvedScope: scope,
    };
  }

  function draftToQuestion(baseId: string): BattleQuestion {
    if (!editDraft) {
      return {
        id: baseId,
        kind: 'multiple-choice',
        text: '',
        options: ['', '', '', ''],
        correctIndexes: [0],
        correctIndex: 0,
      };
    }

    const acceptedAnswers = editDraft.acceptedAnswersText
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    const baseQuestion: BattleQuestion = {
      id: baseId,
      kind: editDraft.kind,
      text: editDraft.text,
      ...(editDraft.kind === 'multiple-choice' || editDraft.kind === 'image-choice' || editDraft.kind === 'audio-choice'
        ? {
            options: editDraft.options,
            correctIndexes: editDraft.correctIndexes,
            correctIndex: editDraft.correctIndexes[0] ?? 0,
          }
        : {}),
      ...((editDraft.kind === 'audio-choice' || editDraft.kind === 'audio-open' || editDraft.kind === 'speaking')
        ? {
            promptAudioText: editDraft.promptAudioText || editDraft.text,
            playAudioOnce: true,
          }
        : {}),
      ...(editDraft.kind === 'audio-open' || editDraft.kind === 'speaking'
        ? {
            correctText: editDraft.correctText,
            acceptedAnswers,
          }
        : {}),
      ...(editDraft.imageUrl.trim() ? { imageUrl: editDraft.imageUrl.trim() } : {}),
    };

    return sanitizeBattleQuestion(baseQuestion) ?? baseQuestion;
  }

  function getEffectiveQuestions(): BattleQuestion[] {
    if (editingIdx === null || !editDraft) return questions;

    return questions.map((q, i) =>
      i !== editingIdx ? q : draftToQuestion(q.id)
    );
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  async function runStartFlow(generatedQuestions: BattleQuestion[], config: BattleConfig, source: 'quick' | 'curated') {
    console.log('[BATTLE START DEBUG] handler entered');
    setStartError(null);

    if (startingNow) {
      console.warn('[BATTLE START DEBUG] blocked before start:', {
        motivo: 'already-starting',
        dadosRelevantes: {
          source,
          liveClassId: liveClassId ?? null,
          userUid: currentUserUid ?? null,
        },
      });
      return;
    }

    if (!generatedQuestions || generatedQuestions.length === 0) {
      console.warn('[BATTLE START DEBUG] blocked before start:', {
        motivo: 'no-questions-generated',
        dadosRelevantes: {
          source,
          liveClassId: liveClassId ?? null,
          config,
        },
      });
      setStartError('Nenhuma pergunta válida foi gerada para iniciar a batalha.');
      return;
    }

    setStartingNow(true);

    try {
      console.log('[BATTLE START DEBUG] questions generated:', generatedQuestions?.length, generatedQuestions);
      console.log('[BATTLE START DEBUG] creating battle session...');
      await onStart(config, generatedQuestions);
      console.log('[BATTLE START DEBUG] battle session created:', liveClassId ?? 'local-battle');
    } catch (error) {
      console.error('[BATTLE START DEBUG] start failed:', error);
      setStartError(error instanceof Error ? error.message : 'Falha ao iniciar a batalha.');
    } finally {
      setStartingNow(false);
    }
  }

  /** ⚡ Quick Battle — generate and launch immediately, no curation */
  async function handleQuickBattle() {
    try {
      const previewConfig = buildConfig(questionCount);
      console.log('[BATTLE START DEBUG] generating questions...', previewConfig);
      console.log('[BATTLE FIREBASE] iniciar agora clicked', {
        liveClassId: liveClassId ?? null,
        userUid: currentUserUid ?? null,
        includeTeacher,
        includeBot: botEnabled,
        selectedStudents: selectedStudents.map((student) => ({
          uid: student.uid,
          name: student.name,
        })),
      });

      const { generatedQuestions, resolvedScope } = resolveLaunchQuestions();
      const config = buildConfig(generatedQuestions.length, resolvedScope);

      console.log('[BATTLE DEBUG] Quick Battle triggering onStart', {
        scope: config.scope,
        courseId: config.courseId,
        lessonId: config.lessonId,
        workbookId: config.workbookId,
        questionCount: config.questionCount,
        botEnabled: config.botEnabled,
        includeTeacher: config.includeTeacher,
      });
      await runStartFlow(generatedQuestions, config, 'quick');
    } catch (error) {
      console.error('[BATTLE START DEBUG] start failed:', error);
      setStartError(error instanceof Error ? error.message : 'Falha ao preparar as perguntas da batalha.');
    }
  }

  /** 📋 Preparar Aula — generate and open the curation screen */
  function handleOpenCuration() {
    try {
      const { generatedQuestions } = resolveLaunchQuestions();
      if (generatedQuestions.length === 0) {
        setStartError('Nenhuma pergunta válida foi encontrada para preparar a aula.');
        return;
      }
      setStartError(null);
      setQuestions(generatedQuestions);
      setEditingIdx(null);
      setEditDraft(null);
      setStep('curate');
    } catch (error) {
      console.error('[BATTLE START DEBUG] start failed:', error);
      setStartError(error instanceof Error ? error.message : 'Falha ao preparar as perguntas da batalha.');
    }
  }

  function toggleExclude(id: string) {
    setExcludedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function startEdit(idx: number) {
    const q = questions[idx];
    setEditingIdx(idx);
    setEditDraft({
      kind: q.kind,
      text: q.text,
      options: [...(q.options ?? ['', '', '', ''])],
      correctIndexes: q.correctIndexes?.length ? [...q.correctIndexes] : [q.correctIndex ?? 0],
      correctText: q.correctText ?? '',
      acceptedAnswersText: (q.acceptedAnswers ?? []).join(', '),
      promptAudioText: q.promptAudioText ?? '',
      imageUrl: q.imageUrl ?? '',
    });
  }

  function cancelEdit() {
    setEditingIdx(null);
    setEditDraft(null);
  }

  function saveEdit() {
    if (editingIdx === null || !editDraft) return;
    const currentQuestion = questions[editingIdx];
    const sanitizedQuestion = sanitizeBattleQuestion(draftToQuestion(currentQuestion.id));
    if (!sanitizedQuestion) {
      window.alert('Essa pergunta ficou incompleta. Revise o enunciado e a resposta correta antes de salvar.');
      return;
    }

    setQuestions(questions.map((question, index) => (
      index === editingIdx ? sanitizedQuestion : question
    )));
    setEditingIdx(null);
    setEditDraft(null);
  }

  function addCustomQuestion() {
    const newId = `custom_${Date.now()}`;
    const newQuestion: BattleQuestion = {
      id: newId,
      kind: 'multiple-choice',
      text: 'Nova pergunta',
      options: ['Opção 1', 'Opção 2', 'Opção 3', 'Opção 4'],
      correctIndexes: [0],
      correctIndex: 0,
    };
    setQuestions(prev => [...prev, newQuestion]);
    setEditingIdx(questions.length);
    setEditDraft({
      kind: 'multiple-choice',
      text: 'Nova pergunta',
      options: ['Opção 1', 'Opção 2', 'Opção 3', 'Opção 4'],
      correctIndexes: [0],
      correctText: '',
      acceptedAnswersText: '',
      promptAudioText: '',
      imageUrl: '',
    });
  }

  function duplicateQuestion(idx: number) {
    const original = questions[idx];
    const copy: BattleQuestion = {
      ...original,
      id: `${original.id}_dup_${Date.now()}`,
    };
    setQuestions(prev => {
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }

  /** ✅ Confirmar Lista Final — launch with curated questions */
  async function handleConfirm() {
    const finalQs = sanitizeBattleQuestions(
      getEffectiveQuestions().filter(q => !excludedIds.has(q.id))
    );
    if (finalQs.length === 0) {
      console.warn('[BATTLE START DEBUG] blocked before start:', {
        motivo: 'no-curated-questions-selected',
        dadosRelevantes: {
          liveClassId: liveClassId ?? null,
          userUid: currentUserUid ?? null,
          excludedCount: excludedIds.size,
          totalQuestions: questions.length,
        },
      });
      setStartError('Selecione pelo menos uma pergunta válida para iniciar a batalha.');
      return;
    }
    const config = buildConfig(finalQs.length);
    console.log('[BATTLE START DEBUG] generating questions...', config);
    console.log('[BATTLE FIREBASE] iniciar agora clicked', {
      liveClassId: liveClassId ?? null,
      userUid: currentUserUid ?? null,
      includeTeacher,
      includeBot: botEnabled,
      selectedStudents: selectedStudents.map((student) => ({
        uid: student.uid,
        name: student.name,
      })),
    });
    await runStartFlow(finalQs, config, 'curated');
    console.log('[BATTLE DEBUG] Curated Battle triggering onStart', {
      questionsCount: finalQs.length,
      botEnabled,
      includeTeacher
    });
  }

  const selectedCount = getEffectiveQuestions().filter(q => !excludedIds.has(q.id)).length;

  // ────────────────────────────────────────────────────────────────────────
  // STEP 1 — CONFIG
  // ────────────────────────────────────────────────────────────────────────
  async function handleSaveTemplate() {
    const finalQuestions = sanitizeBattleQuestions(
      getEffectiveQuestions().filter((question) => !excludedIds.has(question.id))
    );

    if (finalQuestions.length === 0) {
      setStartError('Selecione pelo menos uma pergunta valida para salvar o battle.');
      return;
    }

    const suggestedTitle = initialTemplate?.title || `Battle ${new Date().toLocaleDateString('pt-BR')}`;
    const titleInput = window.prompt('Nome do battle salvo:', suggestedTitle);
    const title = titleInput?.trim();

    if (!title) {
      return;
    }

    if (!onSaveTemplate) {
      setSaveMessage('Salvar indisponivel neste modo.');
      return;
    }

    const template = buildSavedBattleTemplate(
      buildConfig(finalQuestions.length),
      finalQuestions,
      title,
    );

    try {
      await onSaveTemplate(template);
      setSaveMessage('Battle salvo na sua biblioteca.');
      setStartError(null);
    } catch (error) {
      console.error('[BATTLE SAVE DEBUG] save failed:', error);
      setSaveMessage(null);
      setStartError(error instanceof Error ? error.message : 'Falha ao salvar o battle.');
    }
  }

  if (step === 'config') {
    return (
      <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="relative mx-4 flex max-h-[90vh] w-full max-w-md flex-col overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">

          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-orange-600/80 to-red-700/80 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚔️</span>
              <div>
                <h2 className="text-lg font-bold text-white">Learnendo Battle</h2>
                <p className="text-xs text-orange-200">Configure a batalha</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none" aria-label="Close">✕</button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {startError ? (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {startError}
              </div>
            ) : null}
            {saveMessage ? (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                {saveMessage}
              </div>
            ) : null}

            {/* Scope */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Fonte das Perguntas
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SCOPES.map(s => (
                  <button key={s.value} onClick={() => setScope(s.value)}
                    className={`p-2 rounded-xl border text-center transition-colors ${
                      scope === s.value
                        ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}>
                    <div className="text-xs font-semibold">{s.label}</div>
                    <div className="text-[10px] mt-0.5 opacity-70">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Dificuldade
              </label>
              <div className="flex gap-2">
                {DIFFICULTIES.map(d => (
                  <button key={d.value} onClick={() => setDifficulty(d.value)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                      difficulty === d.value
                        ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}>
                    {d.emoji} {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Question count */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Nº de Perguntas
              </label>
              <div className="flex gap-2">
                {QUESTION_COUNTS.map(n => (
                  <button key={n} onClick={() => setQuestionCount(n)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-colors ${
                      questionCount === n
                        ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Segundos por Pergunta
              </label>
              <div className="flex gap-2">
                {TIME_OPTIONS.map(t => (
                  <button key={t} onClick={() => setTimePerQuestion(t)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-colors ${
                      timePerQuestion === t
                        ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}>
                    {t}s
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800/40 px-4 py-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTeacher}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    console.log('[BATTLE DEBUG] includeTeacher changed', {
                      checked,
                      previousIncludeTeacher: includeTeacher,
                    });
                    setIncludeTeacher(checked);
                  }}
                  className="mt-1 h-4 w-4 accent-orange-500"
                />
                <div>
                  <div className="text-sm font-semibold text-white">Professor participa da batalha</div>
                  <div className="text-xs text-slate-400">
                    Ative para o professor responder junto com os alunos e entrar no placar.
                  </div>
                </div>
              </label>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800/40 px-4 py-3 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={botEnabled}
                  onChange={(e) => setBotEnabled(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-orange-500"
                />
                <div>
                  <div className="text-sm font-semibold text-white">Ativar Bot</div>
                  <div className="text-xs text-slate-400">
                    Inclui um participante artificial na batalha com avatar e pontuação normal.
                  </div>
                </div>
              </label>

              {botEnabled ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Avatar do Bot
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {BOT_AVATAR_OPTIONS.map((avatar) => (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => setBotAvatarId(avatar.id)}
                          className={`flex flex-col items-center justify-center rounded-xl border px-2 py-3 transition ${
                            botAvatarId === avatar.id
                              ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                              : 'border-slate-700 text-slate-300 hover:border-slate-500'
                          }`}
                          title={avatar.label}
                        >
                          <span className="text-2xl leading-none">{avatar.icon}</span>
                          <span className="mt-1 text-[10px] font-semibold">{avatar.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Nome do Bot
                    </label>
                    <input
                      value={botName}
                      onChange={(event) => setBotName(event.target.value)}
                      placeholder="Bot"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Footer — two launch paths */}
          <div className="sticky bottom-0 z-10 space-y-2 border-t border-slate-800 bg-slate-900 px-6 pb-6 pt-4">
            <button
              onClick={handleOpenCuration}
              disabled={startingNow}
              className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-semibold text-sm transition"
            >
              📋 Preparar Aula → (ver e editar perguntas)
            </button>
            <button
              onClick={() => {
                console.log('[BATTLE START DEBUG] Iniciar Agora clicked');
                void handleQuickBattle();
              }}
              disabled={startingNow}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-base hover:from-orange-400 hover:to-red-500 transition-all shadow-lg"
            >
              ⚡ Iniciar Agora ({questionCount} perguntas)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // STEP 2 — CURATION
  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-orange-600/80 to-red-700/80 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">📋 Preparar Aula</h2>
            <p className="text-xs text-orange-200">
              {selectedCount} de {questions.length} selecionadas · {timePerQuestion}s cada
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={addCustomQuestion}
              title="Adicionar pergunta personalizada"
              className="text-xs text-orange-200 hover:text-white border border-orange-400/40 rounded-lg px-2 py-1 transition"
            >
              + Nova pergunta
            </button>
            <button onClick={() => void handleSaveTemplate()} title="Salvar battle na biblioteca"
              className="text-xs text-orange-200 hover:text-white border border-orange-400/40 rounded-lg px-2 py-1 transition">
              Salvar
            </button>
            <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none ml-1" aria-label="Close">✕</button>
          </div>
        </div>

        {/* Curation list */}
        <div className="flex-1 overflow-y-auto py-3 px-4 space-y-2">
          {startError ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {startError}
            </div>
          ) : null}
          {saveMessage ? (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {saveMessage}
            </div>
          ) : null}
          {questions.map((q, idx) => {
            const excluded  = excludedIds.has(q.id);
            const isEditing = editingIdx === idx;
            return (
              <div key={q.id}
                className={`rounded-xl border transition-all ${
                  excluded
                    ? 'border-slate-700/40 bg-slate-800/20 opacity-40'
                    : 'border-slate-700 bg-slate-800/60'
                }`}>

                {/* Row header */}
                <div className="flex items-start gap-2 px-3 py-2.5">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={!excluded}
                    onChange={() => toggleExclude(q.id)}
                    title={excluded ? 'Incluir esta pergunta' : 'Excluir esta pergunta'}
                    className="mt-1 w-4 h-4 accent-orange-500 cursor-pointer shrink-0"
                  />
                  {/* Number badge */}
                  <span className="shrink-0 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-400 font-bold mt-0.5">
                    {idx + 1}
                  </span>

                  {/* Image thumbnail — shown when imageUrl is set */}
                  {q.imageUrl && (
                    <img
                      src={q.imageUrl}
                      alt="preview"
                      className="shrink-0 w-10 h-10 rounded object-cover border border-slate-600 mt-0.5"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}

                  {/* Question text */}
                  <p className="flex-1 text-sm text-white leading-snug">{q.text}</p>

                  {/* Action buttons */}
                  {!excluded && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => duplicateQuestion(idx)}
                        title="Duplicar pergunta"
                        className="text-xs px-1.5 py-0.5 rounded border border-slate-600 text-slate-500 hover:border-blue-400 hover:text-blue-400 transition"
                      >⧉</button>
                      <button
                        onClick={() => isEditing ? cancelEdit() : startEdit(idx)}
                        className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                          isEditing
                            ? 'border-orange-500 text-orange-400'
                            : 'border-slate-600 text-slate-500 hover:border-slate-400 hover:text-slate-300'
                        }`}
                      >{isEditing ? '✕' : '✏️'}</button>
                    </div>
                  )}
                </div>

                {/* Options mini-preview */}
                {!isEditing && !excluded && q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-2 gap-1 px-3 pb-2.5">
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx}
                        className={`text-[11px] px-2 py-1 rounded border truncate ${
                          (q.correctIndexes ?? [q.correctIndex ?? 0]).includes(optIdx)
                            ? 'border-green-600/60 bg-green-600/10 text-green-400'
                            : 'border-slate-700/60 text-slate-500'
                        }`}>
                        {(q.correctIndexes ?? [q.correctIndex ?? 0]).includes(optIdx) ? '✓ ' : ''}{opt}
                      </div>
                    ))}
                  </div>
                )}

                {!isEditing && !excluded && (!q.options || q.options.length === 0) && (
                  <div className="px-3 pb-2.5">
                    <div className="text-[11px] px-2 py-2 rounded border border-green-600/60 bg-green-600/10 text-green-400">
                      Resposta esperada: {q.correctText || q.acceptedAnswers?.[0] || '—'}
                    </div>
                  </div>
                )}

                {/* Inline editor */}
                {isEditing && editDraft && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-700 space-y-3">

                    {/* Question text field */}
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wide">Texto da pergunta</label>
                      <input
                        value={editDraft.text}
                        onChange={e => setEditDraft(d => d ? { ...d, text: e.target.value } : d)}
                        className="w-full mt-0.5 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wide">Tipo de pergunta</label>
                      <select
                        value={editDraft.kind}
                        onChange={e => setEditDraft(d => d ? { ...d, kind: e.target.value as BattleQuestionKind } : d)}
                        className="w-full mt-0.5 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-orange-500"
                      >
                        {QUESTION_KINDS.map(kind => (
                          <option key={kind.value} value={kind.value}>{kind.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Image URL field */}
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wide">
                        URL da imagem (opcional)
                      </label>
                      <div className="flex gap-2 mt-0.5">
                        <input
                          value={editDraft.imageUrl}
                          onChange={e => setEditDraft(d => d ? { ...d, imageUrl: e.target.value } : d)}
                          placeholder="https://… ou deixe em branco"
                          className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-orange-500 placeholder-slate-500"
                        />
                        {editDraft.imageUrl && (
                          <img
                            src={editDraft.imageUrl}
                            alt="preview"
                            className="w-10 h-10 rounded object-cover border border-slate-600 shrink-0"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                      </div>
                    </div>

                    {(editDraft.kind === 'audio-choice' || editDraft.kind === 'audio-open' || editDraft.kind === 'speaking') && (
                      <>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase tracking-wide">Texto do áudio</label>
                          <input
                            value={editDraft.promptAudioText}
                            onChange={e => setEditDraft(d => d ? { ...d, promptAudioText: e.target.value } : d)}
                            placeholder="Ex.: What is two plus two?"
                            className="w-full mt-0.5 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-orange-500 placeholder-slate-500"
                          />
                        </div>
                        {(editDraft.kind === 'audio-open' || editDraft.kind === 'speaking') && (
                          <>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase tracking-wide">Resposta correta principal</label>
                          <input
                            value={editDraft.correctText}
                            onChange={e => setEditDraft(d => d ? { ...d, correctText: e.target.value } : d)}
                            placeholder={editDraft.kind === 'speaking' ? "Ex.: it's an apple" : 'Ex.: 4'}
                            className="w-full mt-0.5 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-orange-500 placeholder-slate-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase tracking-wide">Variações aceitas</label>
                          <input
                            value={editDraft.acceptedAnswersText}
                            onChange={e => setEditDraft(d => d ? { ...d, acceptedAnswersText: e.target.value } : d)}
                            placeholder="Resposta 1, resposta 2, resposta 3"
                            className="w-full mt-0.5 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-orange-500 placeholder-slate-500"
                          />
                        </div>
                          </>
                        )}
                      </>
                    )}

                    {/* Options editor */}
                    {(editDraft.kind === 'multiple-choice' || editDraft.kind === 'image-choice' || editDraft.kind === 'audio-choice') && (
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wide">
                        Alternativas — marque uma ou mais corretas
                      </label>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Uma correta responde no clique. VÃ¡rias corretas exigem marcar tudo e confirmar.
                      </p>
                      <div className="mt-1 space-y-1.5">
                        {editDraft.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editDraft.correctIndexes.includes(optIdx)}
                              onChange={() => setEditDraft(d => {
                                if (!d) return d;
                                const isCorrect = d.correctIndexes.includes(optIdx);
                                const nextIndexes = isCorrect
                                  ? d.correctIndexes.filter((index) => index !== optIdx)
                                  : [...d.correctIndexes, optIdx].sort((a, b) => a - b);
                                return {
                                  ...d,
                                  correctIndexes: nextIndexes.length > 0 ? nextIndexes : [optIdx],
                                };
                              })}
                              className="accent-green-500 cursor-pointer"
                            />
                            <input
                              value={opt}
                              onChange={e => setEditDraft(d => {
                                if (!d) return d;
                                const opts = [...d.options];
                                opts[optIdx] = e.target.value;
                                return { ...d, options: opts };
                              })}
                              className={`flex-1 bg-slate-700 border rounded px-2 py-1 text-sm text-white outline-none focus:border-orange-500 ${
                                editDraft.correctIndexes.includes(optIdx) ? 'border-green-600' : 'border-slate-600'
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="px-4 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-bold text-white transition"
                      >✓ Salvar</button>
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-300 transition"
                      >Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 flex gap-3 shrink-0">
          <button
            onClick={() => setStep('config')}
            className="px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 font-semibold text-sm hover:border-slate-400 transition"
          >← Voltar</button>
          <button
            onClick={() => {
              console.log('[BATTLE START DEBUG] Iniciar Agora clicked');
              void handleConfirm();
            }}
            disabled={selectedCount === 0 || startingNow}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-sm hover:opacity-90 transition disabled:opacity-40"
          >✅ Confirmar Lista Final ({selectedCount} perguntas)</button>
        </div>
      </div>
    </div>
  );
};
