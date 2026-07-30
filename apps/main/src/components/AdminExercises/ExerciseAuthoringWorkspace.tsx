import React, { useEffect, useRef, useState } from 'react';
import { COURSE_WORKBOOKS } from '../../courses/courseRegistry';
import type { Exercise, Workbook } from '../../types';
import { normalizeReportedWorkbookId, resolveWorkbookModule, type ReportExerciseLocation } from '../../utils/exerciseReportCurriculum';
import type { ExerciseReport } from '../../services/exerciseReportsService';
import { PracticeSection } from '../UI';
import {
  AUTHORING_TYPES, applyBatch, authoringTypeOf, buildAiPrompt, canonicalFromExercise,
  exerciseFromCanonical, parseExerciseBatch, validateCanonicalExercise,
  type AuthoringType, type BatchMode, type CanonicalExerciseInput,
} from '../../models/exerciseAuthoring';
import {
  getDaySequenceState, listDaySequenceDrafts, publishDaySequence, saveDaySequenceDraft,
  type DaySequenceDraft, type DaySequenceState,
} from '../../services/dayExerciseAuthoringService';

type Mode = 'new' | 'existing' | 'batch';
const COURSE_LABELS: Record<string, string> = { english: 'Inglês', spanish: 'Espanhol', portuguese_native: 'Português', portuguese_foreigners: 'Português para estrangeiros', greek_koine: 'Grego koiné', hebrew_biblical: 'Hebraico bíblico', bible_language_track: 'Trilha bíblica' };
const languageForCourse = (courseId: string) => courseId === 'spanish' ? 'es' : courseId === 'greek_koine' ? 'el' : courseId === 'hebrew_biblical' ? 'he' : courseId.startsWith('portuguese') ? 'pt' : 'en';
const emptyInput = (type: AuthoringType = 'multiple-choice'): CanonicalExerciseInput => ({ type, categoryLabel: '', instruction: '', contentOrder: 'instruction-first', displayValue: '', targetText: '', speechText: '', speechLanguage: 'en-US', correctAnswer: '', acceptedAnswers: [], alternatives: type === 'multiple-choice' ? ['', ''] : [], imageUrl: '', explanation: '', translation: '', responsePlaceholder: '', position: null });

interface Selection { courseId: string; workbookId: number; lessonId: string; dayId: string; }
interface EditState { index: number | null; batchIndex?: number; replacePublishedIndex?: number; input: CanonicalExerciseInput; operation: 'edit' | 'reconstruct' | 'new'; original?: Exercise; }

const TextList: React.FC<{ label: string; values: string[]; onChange: (values: string[]) => void }> = ({ label, values, onChange }) => <label className="block text-sm font-bold">{label}<textarea value={values.join('\n')} onChange={(event) => onChange(event.target.value.split(/\r?\n/))} className="mt-1 min-h-20 w-full rounded-lg border p-2" /></label>;

const ExerciseForm: React.FC<{ value: CanonicalExerciseInput; onChange: (value: CanonicalExerciseInput) => void; lockType?: boolean }> = ({ value, onChange }) => {
  const patch = (change: Partial<CanonicalExerciseInput>) => onChange({ ...value, ...change });
  const choice = value.type === 'multiple-choice' || value.type === 'identification';
  const oral = value.type === 'speaking' || value.type === 'shadowing' || value.type === 'repeat';
  const errors = validateCanonicalExercise(value);
  return <div className="space-y-3">
    <label className="block text-sm font-bold">Tipo de exercício<select value={value.type} onChange={(event) => patch({ type: event.target.value as AuthoringType })} className="mt-1 w-full rounded-lg border p-2">{AUTHORING_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
    <label className="block text-sm font-bold">Categoria/modalidade visual (opcional)<input value={value.categoryLabel ?? ''} onChange={(event) => patch({ categoryLabel: event.target.value })} placeholder="Ex.: LISTENING, SPEAKING, SHADOWING" className="mt-1 w-full rounded-lg border p-2" /></label>
    <label className="block text-sm font-bold">Instrução<textarea value={value.instruction} onChange={(event) => patch({ instruction: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
    <label className="block text-sm font-bold">Texto exibido<textarea value={value.displayValue ?? ''} onChange={(event) => patch({ displayValue: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
    <label className="block text-sm font-bold">Ordem dos textos<select value={value.contentOrder ?? 'instruction-first'} onChange={(event) => patch({ contentOrder: event.target.value as 'instruction-first' | 'display-first' })} className="mt-1 w-full rounded-lg border p-2"><option value="instruction-first">Instrução acima do texto exibido</option><option value="display-first">Texto exibido acima da instrução</option></select></label>
    <label className="block text-sm font-bold">Texto para áudio/TTS (opcional)<input value={value.speechText ?? ''} onChange={(event) => patch({ speechText: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
    <label className="block text-sm font-bold">Idioma da voz<input value={value.speechLanguage ?? ''} onChange={(event) => patch({ speechLanguage: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
    {(oral || value.type === 'writing' || value.type === 'listening') && <label className="block text-sm font-bold">Texto-alvo / resposta<input value={value.targetText ?? value.correctAnswer ?? ''} onChange={(event) => patch({ targetText: event.target.value, correctAnswer: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>}
    {choice && <><TextList label="Alternativas (uma por linha)" values={value.alternatives ?? []} onChange={(alternatives) => patch({ alternatives })} /><label className="block text-sm font-bold">Resposta correta<input value={value.correctAnswer ?? ''} onChange={(event) => patch({ correctAnswer: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label></>}
    {(value.type === 'writing' || value.type === 'listening') && <TextList label="Respostas aceitas" values={value.acceptedAnswers ?? []} onChange={(acceptedAnswers) => patch({ acceptedAnswers })} />}
    <label className="block text-sm font-bold">Imagem HTTPS<input value={value.imageUrl ?? ''} onChange={(event) => patch({ imageUrl: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
    <label className="block text-sm font-bold">Tradução<input value={value.translation ?? ''} onChange={(event) => patch({ translation: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
    <label className="block text-sm font-bold">Explicação<textarea value={value.explanation ?? ''} onChange={(event) => patch({ explanation: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
    <label className="block text-sm font-bold">Placeholder/orientação de resposta (opcional)<input value={value.responsePlaceholder ?? ''} onChange={(event) => patch({ responsePlaceholder: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
    <label className="block text-sm font-bold">Posição no dia (opcional)<input type="number" min={1} value={value.position ?? ''} onChange={(event) => patch({ position: event.target.value ? Number(event.target.value) : null })} placeholder="Vazio acrescenta ao final" className="mt-1 w-full rounded-lg border p-2" /></label>
    {errors.length > 0 && <ul className="list-disc rounded-xl bg-amber-50 p-3 pl-8 text-sm text-amber-900">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}
  </div>;
};

const SandboxModal: React.FC<{ exercise: Exercise; language: string; onClose: () => void }> = ({ exercise, language, onClose }) => {
  const onCloseRef = useRef(onClose);
  const closingRef = useRef(false);
  onCloseRef.current = onClose;
  useEffect(() => {
    window.history?.pushState?.({ learnendoSandbox: true }, '');
    const pop = () => { if (!closingRef.current) onCloseRef.current(); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); closingRef.current = true; if (window.history?.state?.learnendoSandbox) window.history.replaceState(null, ''); onCloseRef.current(); } };
    window.addEventListener('popstate', pop); window.addEventListener('keydown', key);
    return () => { window.removeEventListener('popstate', pop); window.removeEventListener('keydown', key); };
  }, []);
  const close = () => { closingRef.current = true; if (window.history?.state?.learnendoSandbox) window.history.replaceState(null, ''); onCloseRef.current(); };
  return <div role="dialog" aria-modal="true" aria-label="Sandbox do exercício" className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/75 p-3 sm:p-8"><div className="mx-auto max-w-4xl rounded-2xl bg-white p-4 shadow-2xl"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-black">Sandbox do exercício</h2><p className="text-xs text-slate-500">Sem gravação de progresso, domínio, mastery ou conclusão.</p></div><div className="flex gap-2"><button onClick={close} className="rounded-xl border px-3 py-2 font-bold">Voltar ao editor</button><button aria-label="Fechar sandbox" onClick={close} className="rounded-xl bg-slate-900 px-3 py-2 text-xl font-black text-white">×</button></div></div><div className="overflow-hidden rounded-xl border"><PracticeSection item={{ ...exercise, moduleType: 'authoring-sandbox', lessonId: 1 }} onResult={() => undefined} currentIdx={0} totalItems={1} lessonId={1} currentLanguage={language} embedded autoPlayAudio={false} /></div></div></div>;
};

export const ExerciseAuthoringWorkspace: React.FC<{
  reviewer: { uid: string; name: string };
  currentCourseId: string;
  onBack: () => void;
  initial?: { report: ExerciseReport; location: ReportExerciseLocation; courseId: string; intent?: 'existing' | 'new' } | null;
  onPublished?: (result: { version: number; mode: 'new' | 'replace-reported'; report: ExerciseReport }) => Promise<void> | void;
}> = ({ reviewer, currentCourseId, onBack, initial, onPublished }) => {
  const firstBook = Number(Object.keys(COURSE_WORKBOOKS[currentCourseId] ?? COURSE_WORKBOOKS.english)[0] ?? 1);
  const inheritedWorkbookId = initial
    ? normalizeReportedWorkbookId(initial.location.workbook.id) ?? normalizeReportedWorkbookId(initial.report.workbookId)
    : null;
  const [mode, setMode] = useState<Mode>(initial?.intent === 'new' ? 'new' : initial ? 'existing' : 'new');
  const [selection, setSelection] = useState<Selection>({ courseId: initial?.courseId ?? currentCourseId, workbookId: inheritedWorkbookId ?? firstBook, lessonId: initial?.location.lesson.id ?? '', dayId: initial?.location.day.id ?? '' });
  const [workbook, setWorkbook] = useState<Workbook | null>(initial?.location.workbook ?? null);
  const [locationLocked, setLocationLocked] = useState(Boolean(initial));
  const [exercises, setExercises] = useState<Exercise[]>(initial?.location.day.exercises ?? []);
  const [state, setState] = useState<DaySequenceState>({ version: 0, draftRevision: 0, draft: null, published: null });
  const [edit, setEdit] = useState<EditState | null>(null);
  const [sandbox, setSandbox] = useState<Exercise | null>(null);
  const [json, setJson] = useState('');
  const [batchMode, setBatchMode] = useState<BatchMode>('append');
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [batch, setBatch] = useState<CanonicalExerciseInput[]>([]);
  const [batchErrors, setBatchErrors] = useState<string[][]>([]);
  const [reason, setReason] = useState('');
  const [operation, setOperation] = useState<DaySequenceDraft['operation']>('edit');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [focusExerciseId, setFocusExerciseId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DaySequenceDraft[]>([]);
  const [draftSearch, setDraftSearch] = useState(initial?.report.reportId ?? initial?.report.exerciseId ?? '');
  const initialNewOpenedRef = useRef(false);
  const [promptFields, setPromptFields] = useState({ subject: '', objective: '', level: '', quantity: 10, distribution: '3 multiple-choice, 3 listening, 3 shadowing, 1 repeat' });
  const workbookIds = Object.keys(COURSE_WORKBOOKS[selection.courseId] ?? {}).map(Number).sort((a, b) => a - b);
  const filteredDrafts = drafts.filter((draft) => {
    const query = draftSearch.trim().toLocaleLowerCase();
    return !query || [draft.scopeId, draft.relatedReportId, draft.courseId, draft.workbookId, draft.lessonId, draft.dayId, ...draft.exercises.map((item) => item.id)].join(' ').toLocaleLowerCase().includes(query);
  });
  const lesson = workbook?.lessons.find((item) => item.id === selection.lessonId);
  const day = lesson?.days.find((item) => item.id === selection.dayId);
  const baselineExercises = state.draft?.exercises ?? state.published?.exercises ?? day?.exercises ?? [];
  const hasUnsavedChanges = Boolean(edit || batch.length || json.trim()) || JSON.stringify(exercises) !== JSON.stringify(baselineExercises);
  const dirtyRef = useRef(hasUnsavedChanges);
  const sandboxOpenRef = useRef(false);
  const onBackRef = useRef(onBack);
  dirtyRef.current = hasUnsavedChanges;
  sandboxOpenRef.current = Boolean(sandbox);
  onBackRef.current = onBack;

  const requestBack = () => {
    if (dirtyRef.current && !window.confirm('Descartar as alterações não salvas?')) return false;
    if (window.history?.state?.learnendoAuthoring) window.history.replaceState(null, '');
    onBackRef.current();
    return true;
  };
  const closeAfterConfirmedOperation = () => {
    dirtyRef.current = false;
    if (window.history?.state?.learnendoAuthoring) window.history.replaceState(null, '');
    onBackRef.current();
  };

  useEffect(() => {
    window.history?.pushState?.({ learnendoAuthoring: true }, '');
    const onPopState = () => {
      if (sandboxOpenRef.current) return;
      if (dirtyRef.current && !window.confirm('Descartar as alterações não salvas?')) {
        window.history.pushState({ learnendoAuthoring: true }, '');
        return;
      }
      onBackRef.current();
    };
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirtyRef.current) event.preventDefault(); };
    window.addEventListener('popstate', onPopState);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, []);

  useEffect(() => { void listDaySequenceDrafts().then(setDrafts).catch(() => undefined); }, []);

  useEffect(() => {
    const loader = COURSE_WORKBOOKS[selection.courseId]?.[selection.workbookId];
    if (!loader) { setWorkbook(null); setError(`O Livro ${selection.workbookId} não está disponível para ${COURSE_LABELS[selection.courseId] ?? selection.courseId}.`); return; }
    let cancelled = false;
    void loader().then((module) => { if (!cancelled) setWorkbook(resolveWorkbookModule(module as Record<string, unknown>, selection.workbookId)); });
    return () => { cancelled = true; };
  }, [selection.courseId, selection.workbookId]);

  useEffect(() => {
    if (!day) return;
    const identity = { courseId: selection.courseId, language: languageForCourse(selection.courseId), workbookId: selection.workbookId, lessonId: selection.lessonId, dayId: selection.dayId };
    let cancelled = false;
    void getDaySequenceState(identity).then((loaded) => {
      if (cancelled) return;
      setState(loaded); setExercises(loaded.draft?.exercises ?? loaded.published?.exercises ?? day.exercises);
      if (initial?.intent !== 'new' && initial && !edit) {
        const index = (loaded.draft?.exercises ?? loaded.published?.exercises ?? day.exercises).findIndex((item) => item.id === initial.report.exerciseId);
        if (index >= 0) setEdit({ index, input: canonicalFromExercise((loaded.draft?.exercises ?? loaded.published?.exercises ?? day.exercises)[index], index + 1), operation: 'edit', original: (loaded.draft?.exercises ?? loaded.published?.exercises ?? day.exercises)[index] });
      }
      if (initial?.intent === 'new') {
        const localIds = new Set(day.exercises.map((item) => item.id));
        const existingNew = loaded.draft?.relatedReportId === initial.report.reportId
          ? loaded.draft.exercises.find((item) => !localIds.has(item.id))
          : undefined;
        if (existingNew) { setFocusExerciseId(existingNew.id); setNotice(`Rascunho reencontrado no Firestore: ${loaded.draft?.scopeId}. Exercício administrativo: ${existingNew.id}.`); }
        else if (!initialNewOpenedRef.current) {
          initialNewOpenedRef.current = true;
          setEdit({ index: null, input: { ...emptyInput(), speechLanguage: `${languageForCourse(selection.courseId)}-${languageForCourse(selection.courseId).toUpperCase()}`, position: initial.location.exerciseIndex + 1 }, operation: 'new' });
        }
      }
    }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Falha ao carregar o dia.'));
    return () => { cancelled = true; };
  }, [day, selection.courseId, selection.dayId, selection.lessonId, selection.workbookId]);

  const identity = { courseId: selection.courseId, language: languageForCourse(selection.courseId), workbookId: selection.workbookId, lessonId: selection.lessonId, dayId: selection.dayId };
  const selectReady = Boolean(workbook && lesson && day);
  const validBatchCount = batchErrors.filter((items) => items.length === 0).length;
  const invalidBatchCount = batch.length - validBatchCount;

  const commitEdit = () => {
    if (!edit) return;
    const errors = validateCanonicalExercise(edit.input);
    if (errors.length) { setError(errors.join('\n')); return; }
    if (edit.batchIndex != null) {
      const next = [...batch]; next[edit.batchIndex] = edit.input;
      setBatch(next); setBatchErrors(next.map(validateCanonicalExercise)); setEdit(null); setError(''); return;
    }
    if (edit.operation === 'reconstruct' && !confirm(`Substituir exatamente a posição ${(edit.index ?? 0) + 1}, mantendo o ID ${edit.original?.id}?`)) return;
    const next = [...exercises];
    if (edit.replacePublishedIndex != null) {
      if (!confirm('Substituir este exercício por uma duplicação com novo ID? O histórico, progresso e relatórios do ID anterior serão preservados separadamente.')) return;
      next[edit.replacePublishedIndex] = exerciseFromCanonical(edit.input);
    } else if (edit.index == null) {
      const created = exerciseFromCanonical(edit.input);
      setFocusExerciseId(created.id);
      const target = edit.input.position == null ? next.length : Math.max(0, Math.min(next.length, edit.input.position - 1));
      next.splice(target, 0, created);
    }
    else next[edit.index] = exerciseFromCanonical(edit.input, edit.original ?? next[edit.index]);
    setExercises(next); setOperation(edit.replacePublishedIndex != null ? 'replace_positions' : edit.operation === 'new' ? (edit.input.position == null ? 'append' : 'insert_at') : edit.operation); setEdit(null); setNotice(edit.replacePublishedIndex != null ? 'Duplicação com novo ID preparada para substituir a referência anterior.' : edit.operation === 'new' ? `Novo exercício preparado na posição ${edit.input.position ?? next.length}.` : 'Alteração preparada; salve como rascunho ou publique.'); setError('');
  };

  const parseBatch = () => {
    const parsed = parseExerciseBatch(json);
    setError(parsed.errors.join('\n'));
    if (!parsed.document) { setBatch([]); setBatchErrors([]); return; }
    if (parsed.document.courseId !== selection.courseId || parsed.document.bookId !== selection.workbookId || parsed.document.lessonId !== selection.lessonId || parsed.document.dayId !== selection.dayId) setError([parsed.errors.join('\n'), 'O destino do JSON difere dos seletores. Ajuste o JSON ou os seletores.'].filter(Boolean).join('\n'));
    setBatch(parsed.document.exercises); setBatchErrors(parsed.exerciseErrors); setBatchMode(parsed.document.mode); setInsertAt(parsed.document.insertAt);
  };

  const applyReviewedBatch = () => {
    if (!batch.length || invalidBatchCount) { setError('Corrija ou remova todos os exercícios inválidos.'); return; }
    if ((batchMode === 'replace_day' || batchMode === 'replace_positions') && !confirm(batchMode === 'replace_day'
      ? 'Substituir todos os exercícios do dia? Todos receberão novos IDs. O progresso existente continuará armazenado, mas deixará de corresponder aos exercícios substituídos. A versão anterior permanecerá no histórico.'
      : 'Substituir as posições indicadas, preservando os IDs, o progresso correspondente e todos os demais exercícios?')) return;
    try { setExercises(applyBatch(exercises, batch, batchMode, insertAt)); setOperation(batchMode); setNotice(`Lote preparado em modo ${batchMode}. Nada foi salvo automaticamente.`); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao aplicar lote.'); }
  };

  const saveDraft = async (nextExercises: Exercise[] = exercises, nextOperation: DaySequenceDraft['operation'] = operation) => {
    if (!selectReady) { setError('Selecione curso, livro, lição e dia.'); return null; }
    setBusy(true); setError('');
    try {
      const revision = await saveDaySequenceDraft({ identity, exercises: nextExercises, operation: nextOperation, changeReason: reason, relatedReportId: initial?.report.reportId ?? null, updatedBy: reviewer.uid, expectedVersion: state.version, expectedDraftRevision: state.draftRevision });
      const persisted = await getDaySequenceState(identity);
      if (!persisted.draft || persisted.draft.draftRevision !== revision) throw new Error('O Firestore não devolveu o rascunho recém-salvo. Recarregue antes de continuar.');
      setState(persisted); setExercises(persisted.draft.exercises);
      void listDaySequenceDrafts().then(setDrafts).catch(() => undefined);
      setNotice(`Rascunho ${persisted.draft.scopeId} confirmado no Firestore (revisão ${revision})${focusExerciseId ? ` · exercício ${focusExerciseId}` : ''}.`); return revision;
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao salvar rascunho.'); return null; }
    finally { setBusy(false); }
  };

  const saveDraftAndClose = async () => {
    const revision = await saveDraft(exercises, operation);
    if (revision != null) closeAfterConfirmedOperation();
  };

  const publish = async (publishMode: 'new' | 'replace-reported' = 'new') => {
    if (reason.trim().length < 5) { setError('Informe um motivo de publicação com pelo menos 5 caracteres.'); return; }
    let publishExercises = exercises;
    let publishOperation = operation;
    if (publishMode === 'replace-reported') {
      if (!initial || !focusExerciseId) { setError('Não foi possível identificar o exercício novo e o exercício reportado.'); return; }
      const replacement = exercises.find((item) => item.id === focusExerciseId);
      const originalIndex = exercises.findIndex((item) => item.id === initial.report.exerciseId);
      if (!replacement || originalIndex < 0) { setError('O exercício reportado ou seu substituto não está mais nesta sequência.'); return; }
      publishExercises = exercises.filter((item) => item.id !== focusExerciseId);
      const targetIndex = publishExercises.findIndex((item) => item.id === initial.report.exerciseId);
      publishExercises[targetIndex] = replacement;
      publishOperation = 'replace_positions';
    }
    const targetPosition = Math.max(1, publishExercises.findIndex((item) => item.id === focusExerciseId) + 1);
    const action = publishMode === 'replace-reported'
      ? `O exercício novo substituirá ${initial?.report.exerciseId} em:\n\n${COURSE_LABELS[selection.courseId] ?? selection.courseId}\nLivro ${selection.workbookId}\n${lesson?.title ?? selection.lessonId}\nDia ${selection.dayId}\n\nO exercício original deixará de ser apresentado aos alunos e o relatório será resolvido.\n\nDeseja continuar?`
      : `Publicar ${focusExerciseId ?? 'a sequência'} como novo exercício em Livro ${selection.workbookId}, ${selection.lessonId}/${selection.dayId}, posição ${targetPosition}? O exercício reportado permanecerá na sequência.`;
    if (!confirm(action)) return;
    const revision = await saveDraft(publishExercises, publishOperation); if (revision == null) return;
    setBusy(true);
    try {
      const version = await publishDaySequence({
        identity, updatedBy: reviewer.uid, reviewerName: reviewer.name,
        expectedVersion: state.version, expectedDraftRevision: revision,
        resolveReportId: publishMode === 'replace-reported' ? initial?.report.reportId : null,
      });
      const persisted = await getDaySequenceState(identity);
      if (!persisted.published || persisted.published.version !== version) throw new Error('A publicação não pôde ser confirmada após a releitura do Firestore.');
      setState(persisted); setExercises(persisted.published.exercises); void listDaySequenceDrafts().then(setDrafts).catch(() => undefined);
      setNotice(`Dia publicado na versão ${version}. Persistência confirmada por releitura do Firestore.${publishMode === 'replace-reported' ? ' O exercício reportado foi substituído.' : ' O exercício reportado permaneceu inalterado.'}`);
      if (initial && onPublished) {
        try { await onPublished({ version, mode: publishMode, report: initial.report }); }
        catch (cause) { setError(`A publicação foi confirmada na versão ${version}, mas a lista administrativa não pôde ser atualizada: ${cause instanceof Error ? cause.message : 'falha desconhecida'}`); return; }
      }
      closeAfterConfirmedOperation();
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao publicar.'); }
    finally { setBusy(false); }
  };

  const move = (index: number, delta: number) => { const target = index + delta; if (target < 0 || target >= exercises.length) return; const next = [...exercises]; [next[index], next[target]] = [next[target], next[index]]; setExercises(next); setOperation('reorder'); };
  const copyPrompt = async () => { const prompt = buildAiPrompt({ ...identity, bookId: identity.workbookId, ...promptFields }); await navigator.clipboard.writeText(prompt); setNotice('Modelo de prompt copiado.'); };

  return <div className="min-h-[calc(100vh-124px)] bg-slate-100 p-3 text-slate-900 sm:p-6"><div className="mx-auto max-w-7xl space-y-4">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-violet-600">Autoria editorial versionada</p><h1 className="text-2xl font-black">Construtor de exercícios</h1><p className="text-sm text-slate-600">Rascunho privado; publicação atômica da sequência do dia; IDs preservados em edição e reconstrução.</p></div><button onClick={requestBack} className="rounded-xl border bg-white px-4 py-2 font-bold">Voltar</button></header>
    {initial && <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4"><p className="font-black">Criando substituição para:</p><p className="mt-1 text-sm font-bold">{COURSE_LABELS[selection.courseId] ?? selection.courseId} · Livro {selection.workbookId} · {initial.location.lesson.title} · Dia {selection.dayId}</p><p className="font-mono text-sm">Exercício original: {initial.report.exerciseId} · posição {initial.location.exerciseIndex + 1}</p><p className="mt-2 text-xs">Relatório {initial.report.reportId} · {initial.report.problemCategory}: {initial.report.studentComment || 'Sem comentário'}</p><p className="mt-1 text-xs font-bold">O destino fica bloqueado para impedir publicação no lugar errado. Salvar rascunho não altera o exercício original.</p></section>}
    <section className="rounded-2xl bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-black">Rascunhos salvos</h2><p className="text-xs text-slate-500">Pesquise por relatório, curso, livro, lição, dia, ID do exercício ou ID do rascunho.</p></div><input aria-label="Localizar rascunhos" value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Relatório, exercício ou destino" className="rounded-xl border p-2" /></div>{filteredDrafts.length === 0 ? <p className="mt-3 text-sm text-slate-500">Nenhum rascunho correspondente.</p> : <div className="mt-3 grid gap-2 md:grid-cols-2">{filteredDrafts.slice(0, 20).map((draft) => <button key={draft.scopeId} type="button" onClick={() => { setSelection({ courseId: draft.courseId, workbookId: draft.workbookId, lessonId: draft.lessonId, dayId: draft.dayId }); setFocusExerciseId(draft.exercises.find((item) => item.id.startsWith('ex_'))?.id ?? null); setMode('existing'); }} className="rounded-xl border p-3 text-left hover:border-violet-500"><p className="font-mono text-xs font-bold">{draft.scopeId}</p><p className="text-sm">{draft.courseId} · L{draft.workbookId} · {draft.lessonId}/{draft.dayId}</p><p className="text-xs text-slate-500">Relatório: {draft.relatedReportId ?? '—'} · revisão {draft.draftRevision} · {draft.exercises.length} exercícios</p></button>)}</div>}</section>
    <nav className="grid gap-2 sm:grid-cols-3">{([['new', 'Novo exercício'], ['existing', 'Editar exercício existente'], ['batch', 'Criar lote de exercícios']] as const).map(([id, label]) => <button key={id} onClick={() => setMode(id)} className={`rounded-xl px-4 py-3 font-black ${mode === id ? 'bg-violet-600 text-white' : 'border bg-white'}`}>{label}</button>)}</nav>
    <section className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-4">
      <label className="text-sm font-bold">Curso<select disabled={locationLocked} value={selection.courseId} onChange={(event) => { const courseId = event.target.value; setSelection({ courseId, workbookId: Number(Object.keys(COURSE_WORKBOOKS[courseId] ?? {})[0] ?? 1), lessonId: '', dayId: '' }); }} className="mt-1 w-full rounded-lg border p-2 disabled:bg-slate-100">{Object.keys(COURSE_WORKBOOKS).map((id) => <option key={id} value={id}>{COURSE_LABELS[id] ?? id}</option>)}</select></label>
      <label className="text-sm font-bold">Livro<select disabled={locationLocked} value={selection.workbookId} onChange={(event) => setSelection((current) => ({ ...current, workbookId: Number(event.target.value), lessonId: '', dayId: '' }))} className="mt-1 w-full rounded-lg border p-2 disabled:bg-slate-100">{workbookIds.map((id) => <option key={id}>{id}</option>)}</select></label>
      <label className="text-sm font-bold">Lição<select disabled={locationLocked} value={selection.lessonId} onChange={(event) => setSelection((current) => ({ ...current, lessonId: event.target.value, dayId: '' }))} className="mt-1 w-full rounded-lg border p-2 disabled:bg-slate-100"><option value="">Selecione</option>{workbook?.lessons.map((item) => <option key={item.id} value={item.id}>{item.title} ({item.id})</option>)}</select></label>
      <label className="text-sm font-bold">Dia<select disabled={locationLocked} value={selection.dayId} onChange={(event) => setSelection((current) => ({ ...current, dayId: event.target.value }))} className="mt-1 w-full rounded-lg border p-2 disabled:bg-slate-100"><option value="">Selecione</option>{lesson?.days.map((item, index) => <option key={item.id} value={item.id}>Dia {index + 1} ({item.id})</option>)}</select></label>
      {initial && <button type="button" onClick={() => setLocationLocked((locked) => !locked)} className="rounded-xl border px-4 py-2 text-sm font-bold sm:col-span-4">{locationLocked ? 'Alterar localização' : 'Bloquear localização do relatório'}</button>}
    </section>
    {mode === 'new' && <section className="rounded-2xl bg-white p-4 shadow-sm"><h2 className="font-black">Criar manualmente</h2><p className="mb-3 text-sm text-slate-600">O novo exercício será acrescentado ao final com um novo identificador.</p><button disabled={!selectReady} onClick={() => setEdit({ index: null, input: { ...emptyInput(), speechLanguage: `${languageForCourse(selection.courseId)}-${languageForCourse(selection.courseId).toUpperCase()}` }, operation: 'new' })} className="rounded-xl bg-violet-600 px-4 py-2 font-black text-white disabled:opacity-40">Novo exercício</button></section>}
    {mode === 'batch' && <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-black">Importar JSON</h2><p className="text-sm text-slate-600">Validação e revisão obrigatórias; nunca salva automaticamente.</p></div><button disabled={!selectReady} onClick={() => void copyPrompt()} className="rounded-xl border px-4 py-2 font-bold">Copiar modelo de prompt para IA</button></div><div className="grid gap-2 sm:grid-cols-4"><input placeholder="Assunto" value={promptFields.subject} onChange={(event) => setPromptFields((current) => ({ ...current, subject: event.target.value }))} className="rounded-lg border p-2" /><input placeholder="Objetivo pedagógico" value={promptFields.objective} onChange={(event) => setPromptFields((current) => ({ ...current, objective: event.target.value }))} className="rounded-lg border p-2" /><input placeholder="Nível" value={promptFields.level} onChange={(event) => setPromptFields((current) => ({ ...current, level: event.target.value }))} className="rounded-lg border p-2" /><input placeholder="Distribuição" value={promptFields.distribution} onChange={(event) => setPromptFields((current) => ({ ...current, distribution: event.target.value }))} className="rounded-lg border p-2" /></div><textarea value={json} onChange={(event) => setJson(event.target.value)} placeholder='{"schemaVersion":1,...}' className="min-h-52 w-full rounded-xl border p-3 font-mono text-xs" /><button onClick={parseBatch} className="rounded-xl bg-blue-600 px-4 py-2 font-black text-white">Validar e revisar</button>
      {batch.length > 0 && <div className="space-y-3"><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-slate-100 p-2"><b>{batch.length}</b><br />total</div><div className="rounded-lg bg-emerald-50 p-2 text-emerald-800"><b>{validBatchCount}</b><br />válidos</div><div className="rounded-lg bg-red-50 p-2 text-red-800"><b>{invalidBatchCount}</b><br />com erro</div></div>{batch.map((item, index) => <div key={index} className="rounded-xl border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black">#{index + 1} · {item.type} · posição {item.position ?? 'planejada'}</p><div className="flex gap-1"><button disabled={index === 0} onClick={() => { const next = [...batch]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setBatch(next); setBatchErrors(next.map(validateCanonicalExercise)); }} className="rounded border px-2 py-1 disabled:opacity-30">↑</button><button disabled={index === batch.length - 1} onClick={() => { const next = [...batch]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; setBatch(next); setBatchErrors(next.map(validateCanonicalExercise)); }} className="rounded border px-2 py-1 disabled:opacity-30">↓</button><button onClick={() => { const next = [...batch]; next.splice(index, 0, { ...item, position: null }); setBatch(next); setBatchErrors(next.map(validateCanonicalExercise)); }} className="rounded border px-2 py-1">Duplicar</button><button onClick={() => { setBatch(batch.filter((_, i) => i !== index)); setBatchErrors(batchErrors.filter((_, i) => i !== index)); }} className="rounded border px-2 py-1">Remover</button><button onClick={() => setEdit({ index: null, batchIndex: index, input: item, operation: 'new' })} className="rounded border px-2 py-1">Abrir</button></div></div>{batchErrors[index]?.length ? <p className="mt-1 text-sm text-red-700">{batchErrors[index].join(' ')}</p> : <p className="mt-1 text-sm text-emerald-700">Válido</p>}</div>)}<button onClick={applyReviewedBatch} className="rounded-xl bg-emerald-600 px-4 py-2 font-black text-white">Aplicar lote revisado ao rascunho</button></div>}
    </section>}
    {state.draft && <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm"><h2 className="font-black text-amber-950">Rascunhos</h2><p className="mt-1 text-sm text-amber-900">Rascunho reencontrável <span className="font-mono font-bold">{state.draft.scopeId}</span> · revisão {state.draft.draftRevision} · relatório {state.draft.relatedReportId ?? 'não relacionado'}.</p><p className="mt-1 text-xs text-amber-800">Local: {selection.courseId} · Livro {selection.workbookId} · {selection.lessonId} · {selection.dayId}{focusExerciseId ? ` · exercício ${focusExerciseId}` : ''}</p></section>}
    {selectReady && <section className="rounded-2xl bg-white p-4 shadow-sm"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-black">Sequência do dia · {exercises.length} exercícios</h2><p className="text-xs text-slate-500">v{state.version} · revisão de rascunho {state.draftRevision}</p></div></div><div className="space-y-2">{exercises.map((exercise, index) => <div key={exercise.id} className={`flex flex-wrap items-center gap-2 rounded-xl border p-3 ${exercise.id === focusExerciseId ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-100' : ''}`}><span className="w-8 font-black">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate font-bold">{exercise.instruction || '(sem instrução)'}</p><p className="truncate font-mono text-xs text-slate-500">{exercise.id} · {authoringTypeOf(exercise) ?? `${exercise.type} (somente leitura)`}</p></div><button onClick={() => move(index, -1)} disabled={index === 0} className="rounded border px-2 py-1 disabled:opacity-30">↑</button><button onClick={() => move(index, 1)} disabled={index === exercises.length - 1} className="rounded border px-2 py-1 disabled:opacity-30">↓</button>{authoringTypeOf(exercise) && <><button onClick={() => setEdit({ index, input: canonicalFromExercise(exercise, index + 1), operation: 'edit', original: exercise })} className="rounded border px-2 py-1 font-bold">Editar no Construtor</button><button onClick={() => setEdit({ index, input: emptyInput(authoringTypeOf(exercise)!), operation: 'reconstruct', original: exercise })} className="rounded border px-2 py-1 font-bold">Reconstruir</button>{state.published?.exercises.some((item) => item.id === exercise.id) && <button onClick={() => setEdit({ index: null, replacePublishedIndex: index, input: canonicalFromExercise(exercise, index + 1), operation: 'new' })} className="rounded border border-amber-500 px-2 py-1 font-bold text-amber-800">Duplicar como outro tipo</button>}</>}<button onClick={() => setSandbox(exercise)} className="rounded bg-violet-600 px-2 py-1 font-bold text-white">Sandbox</button></div>)}</div></section>}
    <section className="rounded-2xl bg-white p-4 shadow-sm"><label className="block text-sm font-bold">Motivo/observação da publicação<input value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>{focusExerciseId && <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm"><p className="font-black">Destino da publicação</p><p>Exercício novo: {focusExerciseId} · {COURSE_LABELS[selection.courseId] ?? selection.courseId} · Livro {selection.workbookId} · {lesson?.title ?? selection.lessonId} · Dia {selection.dayId}.</p><p>{initial ? `Substituirá ${initial.report.exerciseId} exatamente na posição ${initial.location.exerciseIndex + 1}; o relatório ${initial.report.reportId} será resolvido.` : `Será publicado na posição ${Math.max(1, exercises.findIndex((item) => item.id === focusExerciseId) + 1)}.`}</p></div>}<div className="mt-3 flex flex-wrap gap-2"><button disabled={busy || !focusExerciseId} onClick={() => { const exercise = exercises.find((item) => item.id === focusExerciseId); if (exercise) setSandbox(exercise); }} className="rounded-xl border border-violet-500 px-4 py-2 font-black text-violet-800 disabled:opacity-40">Visualizar exercício</button><button disabled={busy || !selectReady} onClick={() => void saveDraftAndClose()} className="rounded-xl border border-amber-500 px-4 py-2 font-black text-amber-800 disabled:opacity-40">{busy ? 'Salvando...' : 'Salvar rascunho e fechar'}</button>{initial ? focusExerciseId && <button disabled={busy || !selectReady} onClick={() => void publish('replace-reported')} className="rounded-xl bg-red-700 px-4 py-2 font-black text-white disabled:opacity-40">{busy ? 'Publicando...' : 'Publicar substituindo e resolver relatório'}</button> : <button disabled={busy || !selectReady} onClick={() => void publish('new')} className="rounded-xl bg-emerald-600 px-4 py-2 font-black text-white disabled:opacity-40">{busy ? 'Publicando...' : focusExerciseId ? 'Publicar como novo exercício' : 'Publicar sequência'}</button>}</div></section>
    {notice && <p className="rounded-xl bg-emerald-50 p-3 font-bold text-emerald-800">{notice}</p>}{error && <pre className="whitespace-pre-wrap rounded-xl bg-red-50 p-3 font-bold text-red-800">{error}</pre>}
    {edit && <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-950/70 p-3 sm:p-8"><div className="mx-auto max-w-2xl rounded-2xl bg-white p-5"><div className="mb-4 flex justify-between gap-2"><div><h2 className="text-xl font-black">{edit.operation === 'new' ? 'Novo exercício' : edit.operation === 'reconstruct' ? 'Reconstruir este exercício' : 'Editar no Construtor'}</h2>{edit.original && <p className="font-mono text-xs">ID preservado: {edit.original.id} · posição {(edit.index ?? 0) + 1}</p>}</div><button onClick={() => setEdit(null)} className="rounded border px-3 py-2 font-bold">Fechar</button></div><ExerciseForm value={edit.input} lockType={Boolean(edit.original && state.published?.exercises.some((item) => item.id === edit.original?.id))} onChange={(input) => setEdit((current) => current ? { ...current, input } : null)} /><div className="mt-4 flex flex-wrap justify-end gap-2"><button onClick={() => setSandbox(exerciseFromCanonical(edit.input, edit.original))} className="rounded-xl border px-4 py-2 font-bold">Visualizar no sandbox</button><button onClick={() => setEdit(null)} className="rounded-xl border px-4 py-2 font-bold">Cancelar</button><button onClick={commitEdit} className="rounded-xl bg-violet-600 px-4 py-2 font-black text-white">Aplicar alteração</button></div></div></div>}
    {sandbox && <SandboxModal exercise={sandbox} language={identity.language} onClose={() => setSandbox(null)} />}
  </div></div>;
};
