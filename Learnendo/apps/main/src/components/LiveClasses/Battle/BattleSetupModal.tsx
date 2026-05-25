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
import type { BattleConfig, BattleDifficulty, BattleQuestionKind, BattleScope, BattleQuestion } from './battleTypes';
import { getBattleQuestions } from './battleQuestions';
import { sanitizeBattleQuestion, sanitizeBattleQuestions } from './battleUtils';

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
  onStart: (config: BattleConfig, questions: BattleQuestion[]) => void;
  onClose: () => void;
  defaultLessonId?: string;
  defaultWorkbookId?: number;
  defaultCourseId?: string;
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
  onStart, onClose, defaultLessonId, defaultWorkbookId, defaultCourseId,
}) => {

  // ── Step 1 state ────────────────────────────────────────────────────────
  const [step,            setStep]            = useState<Step>('config');
  const [scope,           setScope]           = useState<BattleScope>('current-lesson');
  const [difficulty,      setDifficulty]      = useState<BattleDifficulty>('normal');
  const [questionCount,   setQuestionCount]   = useState<5 | 10 | 20>(10);
  const [timePerQuestion, setTimePerQuestion] = useState<5 | 10 | 15>(10);
  const [includeTeacher,  setIncludeTeacher]  = useState(false);

  // ── Step 2 state ────────────────────────────────────────────────────────
  const [questions,    setQuestions]    = useState<BattleQuestion[]>([]);
  const [excludedIds,  setExcludedIds]  = useState<Set<string>>(new Set());
  const [editingIdx,   setEditingIdx]   = useState<number | null>(null);
  const [editDraft,    setEditDraft]    = useState<EditDraft | null>(null);
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

  // ── Helpers ─────────────────────────────────────────────────────────────
  function generateQuestions(): BattleQuestion[] {
    return getBattleQuestions({
      questionCount,
      scope,
      lessonId: defaultLessonId,
      workbookId: defaultWorkbookId,
    });
  }

  function buildConfig(count: number): BattleConfig {
    return {
      scope,
      difficulty,
      questionCount: count,
      timePerQuestion,
      includeTeacher,
      courseId:    defaultCourseId,
      workbookId:  defaultWorkbookId,
      lessonId:    defaultLessonId,
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

  /** ⚡ Quick Battle — generate and launch immediately, no curation */
  function handleQuickBattle() {
    const qs = generateQuestions();
    onStart(buildConfig(qs.length), qs);
  }

  /** 📋 Preparar Aula — generate and open the curation screen */
  function handleOpenCuration() {
    const qs = generateQuestions();
    setQuestions(qs);
    setEditingIdx(null);
    setEditDraft(null);
    setStep('curate');
  }

  function handleReshuffle() {
    setQuestions(generateQuestions());
    setEditingIdx(null);
    setEditDraft(null);
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
  function handleConfirm() {
    const finalQs = sanitizeBattleQuestions(
      getEffectiveQuestions().filter(q => !excludedIds.has(q.id))
    );
    if (finalQs.length === 0) return;
    onStart(buildConfig(finalQs.length), finalQs);
  }

  const selectedCount = getEffectiveQuestions().filter(q => !excludedIds.has(q.id)).length;

  // ────────────────────────────────────────────────────────────────────────
  // STEP 1 — CONFIG
  // ────────────────────────────────────────────────────────────────────────
  if (step === 'config') {
    return (
      <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="relative w-full max-w-md mx-4 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-600/80 to-red-700/80">
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
                  onChange={(e) => setIncludeTeacher(e.target.checked)}
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
          </div>

          {/* Footer — two launch paths */}
          <div className="px-6 pb-6 space-y-2">
            <button
              onClick={handleOpenCuration}
              className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-semibold text-sm transition"
            >
              📋 Preparar Aula → (ver e editar perguntas)
            </button>
            <button
              onClick={handleQuickBattle}
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
            <button onClick={handleReshuffle} title="Novo sorteio de perguntas"
              className="text-xs text-orange-200 hover:text-white border border-orange-400/40 rounded-lg px-2 py-1 transition">
              🔀 Novo sorteio
            </button>
            <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none ml-1" aria-label="Close">✕</button>
          </div>
        </div>

        {/* Curation list */}
        <div className="flex-1 overflow-y-auto py-3 px-4 space-y-2">
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
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-sm hover:opacity-90 transition disabled:opacity-40"
          >✅ Confirmar Lista Final ({selectedCount} perguntas)</button>
        </div>
      </div>
    </div>
  );
};
