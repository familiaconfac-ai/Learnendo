import React, { useEffect, useMemo, useState } from 'react';
import { COURSE_WORKBOOKS } from '../../courses/courseRegistry';
import type { Workbook } from '../../types';
import { PracticeSection } from '../UI';
import { normalizeReportedWorkbookId, resolveWorkbookModule } from '../../utils/exerciseReportCurriculum';
import { resolveExerciseSpeechLocale } from '../../utils/exerciseSpeechLocale';
import { ExerciseAuthoringWorkspace } from './ExerciseAuthoringWorkspace';
import type { ExerciseReport } from '../../services/exerciseReportsService';
import type { ReportExerciseLocation } from '../../utils/exerciseReportCurriculum';
import { speak } from '../../services/ttsService';
import {
  ADMIN_EXERCISE_COURSES, ADMIN_EXERCISE_LANGUAGES, ADMIN_EXERCISE_SPEECH_LANGUAGES,
  adminExerciseToPracticeExercise, emptyAdminExerciseContent, parseAdminExerciseOptions,
  validateAdminExerciseForPublication, validateExternalImageUrl,
  type AdminExerciseContent, type AdminExerciseDraft, type AdminExerciseState,
  type AdminExerciseVersion,
} from '../../models/adminExercise';
import {
  createAdminExerciseDraft, disableAdminExercise, duplicateAdminExercise, getAdminExerciseState,
  listAdminExercises, listAdminExerciseVersions, publishAdminExercise, reactivateAdminExercise,
  restoreAdminExerciseVersion, saveAdminExerciseDraft, type AdminExerciseDraftInput,
  type AdminExerciseListItem,
} from '../../services/adminExerciseService';

const COURSE_LABELS: Record<string, string> = {
  english: 'Inglês', spanish: 'Espanhol', portuguese_native: 'Português nativo',
  portuguese_foreigners: 'Português para estrangeiros', greek_koine: 'Grego koiné',
  hebrew_biblical: 'Hebraico bíblico', bible_language_track: 'Trilha de línguas bíblicas',
};
const STATUS_LABELS = { draft: 'Rascunho', published: 'Publicado', disabled: 'Desativado' } as const;
const statusClass = { draft: 'bg-amber-100 text-amber-800', published: 'bg-emerald-100 text-emerald-800', disabled: 'bg-red-100 text-red-800' } as const;

interface EditorValue extends AdminExerciseDraftInput {
  exerciseId: string | null;
  baseVersion: number;
  draftRevision: number;
  imageValidation: AdminExerciseDraft['imageValidation'];
}

const courseLanguage = (courseId: string) => courseId === 'spanish' ? 'es' : courseId.startsWith('portuguese') ? 'pt'
  : courseId.startsWith('greek') ? 'el' : courseId.startsWith('hebrew') ? 'he' : 'en';

const newEditorValue = (courseId: string, source?: { report: ExerciseReport; location: ReportExerciseLocation }): EditorValue => {
  const resolvedCourseId = ADMIN_EXERCISE_COURSES.some((item) => item === courseId) ? courseId : 'english';
  const language = courseLanguage(resolvedCourseId);
  const registry = COURSE_WORKBOOKS[resolvedCourseId] ?? COURSE_WORKBOOKS.english;
  const reportedWorkbookId = normalizeReportedWorkbookId(source?.report.workbookId)
    ?? normalizeReportedWorkbookId(source?.location.workbook.id);
  return {
  exerciseId: null, courseId: resolvedCourseId,
  language,
  workbookId: reportedWorkbookId && registry[reportedWorkbookId]
    ? reportedWorkbookId : Number(Object.keys(registry)[0] ?? 1),
  lessonId: source?.location.lesson.id ?? '', dayId: source?.location.day.id ?? '',
  content: emptyAdminExerciseContent(language), changeReason: '', adminNote: '',
  relatedReportId: source?.report.reportId ?? null, imageValidation: null, baseVersion: 0, draftRevision: 0,
}; };

function editorFromState(state: AdminExerciseState): EditorValue {
  const source = state.draft ?? state.published;
  const content = state.draft?.content ?? (state.published ? {
    instruction: state.published.instruction, displayValue: state.published.displayValue,
    audioValue: state.published.audioValue, speechLanguage: state.published.speechLanguage,
    options: state.published.options, correctValue: state.published.correctValue,
    acceptedAnswers: state.published.acceptedAnswers, translation: state.published.translation,
    imageUrl: state.published.imageUrl, imageAlt: state.published.imageAlt,
    feedbackCorrect: state.published.feedbackCorrect, feedbackIncorrect: state.published.feedbackIncorrect,
    explanation: state.published.explanation,
  } : emptyAdminExerciseContent(state.canonical.language));
  return {
    exerciseId: state.canonical.exerciseId, courseId: source?.courseId ?? state.canonical.courseId,
    language: source?.language ?? state.canonical.language, workbookId: source?.workbookId ?? state.canonical.workbookId,
    lessonId: source?.lessonId ?? state.canonical.lessonId, dayId: source?.dayId ?? state.canonical.dayId,
    content, changeReason: state.draft?.changeReason ?? state.canonical.changeReason,
    adminNote: state.draft?.adminNote ?? state.canonical.adminNote,
    relatedReportId: state.draft?.relatedReportId ?? state.canonical.relatedReportId,
    imageValidation: state.draft?.imageValidation ?? null, baseVersion: state.canonical.currentVersion,
    draftRevision: state.draft?.draftRevision ?? state.canonical.draftRevision,
  };
}

const ImageValidator: React.FC<{
  url: string; validation: AdminExerciseDraft['imageValidation'];
  onChange: (value: AdminExerciseDraft['imageValidation']) => void;
  onRemove: () => void;
}> = ({ url, validation, onChange, onRemove }) => {
  const [status, setStatus] = useState('');
  const [previewFailed, setPreviewFailed] = useState(false);
  useEffect(() => { setPreviewFailed(false); setStatus(''); }, [url]);
  const validate = () => {
    const error = validateExternalImageUrl(url);
    if (error || !url.trim()) { onChange(null); setStatus(error ?? 'Informe uma URL.'); return; }
    setStatus('Carregando imagem…');
    const image = new Image();
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) { onChange(null); setStatus('A imagem não possui dimensões válidas.'); return; }
      onChange({ validatedUrl: url.trim(), validatedAt: new Date().toISOString() });
      setStatus(`Imagem validada: ${image.naturalWidth} × ${image.naturalHeight}px.`);
    };
    image.onerror = () => { onChange(null); setStatus('Não foi possível carregar essa imagem pública.'); };
    image.src = url.trim();
  };
  const isCurrent = !!url.trim() && validation?.validatedUrl === url.trim();
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={validate} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white">Validar imagem</button>
      <button type="button" disabled={!url.trim()} onClick={() => { onChange(null); onRemove(); }} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 disabled:opacity-40">Remover referência</button>
      <span className={`text-sm font-bold ${isCurrent ? 'text-emerald-700' : 'text-amber-700'}`}>{status || (url.trim() ? 'Validação pendente.' : 'Imagem opcional.')}</span>
    </div>
    {isCurrent && !previewFailed && <img src={url} alt="Prévia da imagem externa" onError={() => setPreviewFailed(true)} className="mt-3 max-h-48 rounded-lg border bg-white object-contain" />}
    {previewFailed && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">A prévia deixou de carregar. Valide novamente ou remova a referência.</p>}
  </div>;
};

const OptionsEditor: React.FC<{
  options: string[]; correctValue: string; onChange: (options: string[], correctValue: string) => void;
}> = ({ options, correctValue, onChange }) => {
  const [paste, setPaste] = useState('');
  const duplicates = options.map((item) => item.trim().toLocaleLowerCase())
    .filter((item, index, all) => item && all.indexOf(item) !== index);
  const update = (next: string[]) => onChange(next, next.includes(correctValue) ? correctValue : '');
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= options.length) return;
    const next = [...options]; [next[index], next[target]] = [next[target], next[index]]; update(next);
  };
  return <div className="space-y-2">
    {options.map((option, index) => <div key={index} className="flex items-center gap-2">
      <input aria-label={`Alternativa correta ${index + 1}`} type="radio" checked={correctValue === option && !!option} onChange={() => onChange(options, option)} />
      <input aria-label={`Alternativa ${index + 1}`} value={option} maxLength={500} onChange={(event) => {
        const next = [...options]; next[index] = event.target.value;
        onChange(next, correctValue === option ? event.target.value : correctValue);
      }} className="min-w-0 flex-1 rounded-lg border p-2" />
      <button type="button" aria-label="Mover para cima" onClick={() => move(index, -1)} className="rounded border px-2 py-1">↑</button>
      <button type="button" aria-label="Mover para baixo" onClick={() => move(index, 1)} className="rounded border px-2 py-1">↓</button>
      <button type="button" aria-label="Remover alternativa" onClick={() => update(options.filter((_, itemIndex) => itemIndex !== index))} className="rounded border border-red-200 px-2 py-1 text-red-700">×</button>
    </div>)}
    <button type="button" disabled={options.length >= 10} onClick={() => update([...options, ''])} className="rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-40">Adicionar alternativa</button>
    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
      <textarea aria-label="Colar lista de alternativas" value={paste} onChange={(event) => setPaste(event.target.value)} placeholder="Cole uma alternativa por linha" className="min-h-20 rounded-lg border p-2" />
      <button type="button" onClick={() => { update(parseAdminExerciseOptions(paste)); setPaste(''); }} className="rounded-lg bg-slate-700 px-3 py-2 font-bold text-white">Aplicar lista</button>
    </div>
    {duplicates.length > 0 && <p className="text-sm font-bold text-red-700">Aviso: existem alternativas duplicadas.</p>}
    <p className="text-xs text-slate-500">{options.length}/10 alternativas. Selecione a correta pelo botão circular.</p>
  </div>;
};

const Sandbox: React.FC<{ value: EditorValue }> = ({ value }) => {
  const [key, setKey] = useState(0);
  const exercise = adminExerciseToPracticeExercise({ exerciseId: value.exerciseId ?? 'sandbox', language: value.language }, value.content);
  const item = { ...exercise, moduleType: 'admin-sandbox', lessonId: Number(value.lessonId.replace(/\D/g, '')) || 1 };
  return <div className="rounded-2xl border-2 border-violet-200 bg-white p-3">
    <div className="mb-3 flex items-center justify-between"><div><p className="font-black">Sandbox real</p><p className="text-xs text-slate-500">Sem gravação de progresso, mastery ou conclusão.</p></div><button type="button" onClick={() => setKey((current) => current + 1)} className="rounded-lg border px-3 py-2 font-bold">Reiniciar</button></div>
    <PracticeSection key={key} item={item} onResult={() => undefined} currentIdx={0} totalItems={1}
      lessonId={item.lessonId} currentLanguage={value.language} fullScreen={false} autoPlayAudio={false} />
  </div>;
};

const EditorModal: React.FC<{
  initial: EditorValue; reviewerUid: string; onClose: () => void; onSaved: (exerciseId: string) => void;
}> = ({ initial, reviewerUid, onClose, onSaved }) => {
  const [value, setValue] = useState(initial);
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sandbox, setSandbox] = useState(false);
  const workbookIds = Object.keys(COURSE_WORKBOOKS[value.courseId] ?? {}).map(Number).sort((a, b) => a - b);
  useEffect(() => {
    let cancelled = false; setWorkbook(null);
    const loader = COURSE_WORKBOOKS[value.courseId]?.[value.workbookId];
    if (loader) loader().then((module) => { if (!cancelled) setWorkbook(resolveWorkbookModule(module as Record<string, unknown>, value.workbookId)); });
    return () => { cancelled = true; };
  }, [value.courseId, value.workbookId]);
  const lessons = workbook?.lessons ?? [];
  const days = lessons.find((lesson) => lesson.id === value.lessonId)?.days ?? [];
  const setContent = (patch: Partial<AdminExerciseContent>) => setValue((current) => ({ ...current, content: { ...current.content, ...patch } }));
  const save = async () => {
    setBusy(true); setError('');
    try {
      const input = { ...value, updatedBy: reviewerUid };
      const exerciseId = value.exerciseId
        ? (await saveAdminExerciseDraft({ ...input, exerciseId: value.exerciseId, expectedDraftRevision: value.draftRevision }), value.exerciseId)
        : await createAdminExerciseDraft(input);
      onSaved(exerciseId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  };
  const errors = validateAdminExerciseForPublication({
    identity: { exerciseId: value.exerciseId ?? 'novo', courseId: value.courseId, language: value.language,
      workbookId: value.workbookId, lessonId: value.lessonId, dayId: value.dayId, type: 'multiple-choice' },
    content: value.content, changeReason: value.changeReason,
    imageValidated: !value.content.imageUrl.trim() || value.imageValidation?.validatedUrl === value.content.imageUrl.trim(),
  });
  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/70 p-2 sm:p-6">
    <div className="mx-auto max-w-6xl rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-violet-600">ETAPA 1 · múltipla escolha</p><h2 className="text-2xl font-black">{value.exerciseId ? `Editar ${value.exerciseId}` : 'Novo exercício administrativo'}</h2></div><button type="button" onClick={onClose} className="rounded-lg border px-3 py-2 font-bold">Fechar</button></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <section className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-2">
            <label className="text-sm font-bold">Curso<select value={value.courseId} onChange={(event) => setValue((current) => ({ ...current, courseId: event.target.value, workbookId: Number(Object.keys(COURSE_WORKBOOKS[event.target.value] ?? {})[0] ?? 1), lessonId: '', dayId: '' }))} className="mt-1 w-full rounded-lg border p-2">{ADMIN_EXERCISE_COURSES.map((id) => <option key={id} value={id}>{COURSE_LABELS[id]}</option>)}</select></label>
            <label className="text-sm font-bold">Idioma<select value={value.language} onChange={(event) => setValue((current) => ({ ...current, language: event.target.value }))} className="mt-1 w-full rounded-lg border p-2">{ADMIN_EXERCISE_LANGUAGES.map((id) => <option key={id}>{id}</option>)}</select></label>
            <label className="text-sm font-bold">Livro<select value={value.workbookId} onChange={(event) => setValue((current) => ({ ...current, workbookId: Number(event.target.value), lessonId: '', dayId: '' }))} className="mt-1 w-full rounded-lg border p-2">{workbookIds.map((id) => <option key={id}>{id}</option>)}</select></label>
            <label className="text-sm font-bold">Lição<select value={value.lessonId} onChange={(event) => setValue((current) => ({ ...current, lessonId: event.target.value, dayId: '' }))} className="mt-1 w-full rounded-lg border p-2"><option value="">Selecione</option>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title} ({lesson.id})</option>)}</select></label>
            <label className="text-sm font-bold">Dia<select value={value.dayId} onChange={(event) => setValue((current) => ({ ...current, dayId: event.target.value }))} className="mt-1 w-full rounded-lg border p-2"><option value="">Selecione</option>{days.map((day, index) => <option key={day.id} value={day.id}>Dia {index + 1} ({day.id})</option>)}</select></label>
            <label className="text-sm font-bold">Tipo<input value="multiple-choice" disabled className="mt-1 w-full rounded-lg border bg-slate-100 p-2" /></label>
          </section>
          <section className="space-y-3 rounded-2xl border p-4">
            <label className="block text-sm font-bold">Instrução<textarea value={value.content.instruction} onChange={(event) => setContent({ instruction: event.target.value })} className="mt-1 min-h-20 w-full rounded-lg border p-2" /></label>
            <label className="block text-sm font-bold">Valor exibido<textarea value={value.content.displayValue} onChange={(event) => setContent({ displayValue: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
            <label className="block text-sm font-bold">Texto do áudio<input value={value.content.audioValue} onChange={(event) => setContent({ audioValue: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><label className="text-sm font-bold">Idioma da voz<select value={value.content.speechLanguage} onChange={(event) => setContent({ speechLanguage: event.target.value })} className="mt-1 w-full rounded-lg border p-2">{ADMIN_EXERCISE_SPEECH_LANGUAGES.map((id) => <option key={id}>{id}</option>)}</select></label><button type="button" onClick={() => speak(value.content.audioValue || value.content.instruction, resolveExerciseSpeechLocale({ speechLanguage: value.content.speechLanguage, language: value.language }, value.language))} className="self-end rounded-lg bg-blue-600 px-4 py-2 font-bold text-white">Testar voz</button></div>
          </section>
          <section className="rounded-2xl border p-4"><h3 className="mb-3 font-black">Alternativas</h3><OptionsEditor options={value.content.options} correctValue={value.content.correctValue} onChange={(options, correctValue) => setContent({ options, correctValue })} /></section>
          <section className="space-y-3 rounded-2xl border p-4">
            <label className="block text-sm font-bold">Respostas aceitas (uma por linha)<textarea value={value.content.acceptedAnswers.join('\n')} onChange={(event) => setContent({ acceptedAnswers: event.target.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).slice(0, 100) })} className="mt-1 w-full rounded-lg border p-2" /></label>
            <label className="block text-sm font-bold">Tradução<textarea value={value.content.translation} onChange={(event) => setContent({ translation: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
            <label className="block text-sm font-bold">Feedback correto<textarea value={value.content.feedbackCorrect} onChange={(event) => setContent({ feedbackCorrect: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
            <label className="block text-sm font-bold">Feedback incorreto<textarea value={value.content.feedbackIncorrect} onChange={(event) => setContent({ feedbackIncorrect: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
            <label className="block text-sm font-bold">Explicação<textarea value={value.content.explanation} onChange={(event) => setContent({ explanation: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
          </section>
          <section className="space-y-3 rounded-2xl border p-4">
            <label className="block text-sm font-bold">URL HTTPS da imagem<input value={value.content.imageUrl} maxLength={2048} onChange={(event) => { setContent({ imageUrl: event.target.value }); setValue((current) => ({ ...current, imageValidation: current.imageValidation?.validatedUrl === event.target.value.trim() ? current.imageValidation : null })); }} placeholder="https://…" className="mt-1 w-full rounded-lg border p-2" /></label>
            <label className="block text-sm font-bold">Texto alternativo<input value={value.content.imageAlt} maxLength={500} onChange={(event) => setContent({ imageAlt: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
            <ImageValidator url={value.content.imageUrl} validation={value.imageValidation} onChange={(imageValidation) => setValue((current) => ({ ...current, imageValidation }))} onRemove={() => setContent({ imageUrl: '', imageAlt: '' })} />
          </section>
          <section className="space-y-3 rounded-2xl border p-4">
            <label className="block text-sm font-bold">Motivo da alteração<input value={value.changeReason} onChange={(event) => setValue((current) => ({ ...current, changeReason: event.target.value }))} className="mt-1 w-full rounded-lg border p-2" /></label>
            <label className="block text-sm font-bold">Nota administrativa<textarea value={value.adminNote} onChange={(event) => setValue((current) => ({ ...current, adminNote: event.target.value }))} className="mt-1 w-full rounded-lg border p-2" /></label>
            <label className="block text-sm font-bold">ID de relatório relacionado<input value={value.relatedReportId ?? ''} onChange={(event) => setValue((current) => ({ ...current, relatedReportId: event.target.value || null }))} className="mt-1 w-full rounded-lg border p-2" /></label>
          </section>
        </div>
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className={`rounded-2xl border p-4 ${errors.length ? 'border-amber-300 bg-amber-50' : 'border-emerald-300 bg-emerald-50'}`}><h3 className="font-black">Validação de publicação</h3>{errors.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{errors.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-2 text-sm font-bold text-emerald-700">Conteúdo pronto para publicação.</p>}</div>
          <button type="button" onClick={() => setSandbox((current) => !current)} className="w-full rounded-xl bg-violet-600 px-4 py-3 font-black text-white">{sandbox ? 'Ocultar sandbox' : 'Abrir sandbox real'}</button>
          {sandbox && <Sandbox value={value} />}
        </div>
      </div>
      {error && <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</pre>}
      <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl border px-4 py-3 font-bold">Cancelar</button><button type="button" disabled={busy} onClick={save} className="rounded-xl bg-blue-600 px-5 py-3 font-black text-white disabled:opacity-50">{busy ? 'Salvando…' : 'Salvar rascunho'}</button></div>
    </div>
  </div>;
};

const LegacyAdminExerciseBuilderPage: React.FC<{
  reviewer: { uid: string; name: string }; currentCourseId: string; onBack: () => void;
}> = ({ reviewer, currentCourseId, onBack }) => {
  const [items, setItems] = useState<AdminExerciseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [course, setCourse] = useState('all');
  const [editor, setEditor] = useState<EditorValue | null>(null);
  const [versions, setVersions] = useState<{ item: AdminExerciseListItem; values: AdminExerciseVersion[] } | null>(null);
  const [preview, setPreview] = useState<EditorValue | null>(null);
  const refresh = async () => { setLoading(true); setError(''); try { setItems(await listAdminExercises()); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao carregar.'); } finally { setLoading(false); } };
  useEffect(() => { void refresh(); }, []);
  const filtered = useMemo(() => items.filter((item) => {
    const query = search.trim().toLocaleLowerCase();
    return (status === 'all' || item.status === status || (status === 'draft' && item.hasDraft))
      && (course === 'all' || item.courseId === course)
      && (!query || [item.exerciseId, item.lessonId, item.dayId, item.language, item.adminNote].join(' ').toLocaleLowerCase().includes(query));
  }), [items, search, status, course]);
  const open = async (exerciseId: string, mode: 'edit' | 'preview') => {
    setError(''); try {
      const state = await getAdminExerciseState(exerciseId);
      if (!state) throw new Error('Exercício não encontrado.');
      const value = editorFromState(state);
      if (!state.draft && !state.published) {
        const latest = (await listAdminExerciseVersions(exerciseId))[0];
        if (latest) {
          value.courseId = latest.courseId; value.language = latest.language; value.workbookId = latest.workbookId;
          value.lessonId = latest.lessonId; value.dayId = latest.dayId; value.content = latest.content;
        }
      }
      mode === 'edit' ? setEditor(value) : setPreview(value);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao abrir.'); }
  };
  const action = async (work: () => Promise<unknown>) => { setError(''); try { await work(); await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'A operação falhou.'); } };
  return <div className="min-h-[calc(100vh-124px)] bg-slate-100 px-3 py-5 text-slate-900 sm:px-6"><div className="mx-auto max-w-7xl">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">Administração · ETAPA 1</p><h1 className="text-2xl font-black">Construtor de exercícios</h1><p className="text-sm text-slate-600">Banco separado · somente múltipla escolha · ainda fora da trilha do aluno</p></div><div className="flex gap-2"><button onClick={onBack} className="rounded-xl border bg-white px-4 py-2 font-bold">Relatórios</button><button onClick={() => setEditor(newEditorValue(currentCourseId))} className="rounded-xl bg-violet-600 px-4 py-2 font-black text-white">Novo exercício</button></div></div>
    <div className="mb-4 grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-3"><input aria-label="Buscar exercícios" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por ID, lição, dia…" className="rounded-xl border p-3" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border p-3"><option value="all">Todos os status</option><option value="draft">Com rascunho</option><option value="published">Publicados</option><option value="disabled">Desativados</option></select><select value={course} onChange={(event) => setCourse(event.target.value)} className="rounded-xl border p-3"><option value="all">Todos os cursos</option>{ADMIN_EXERCISE_COURSES.map((id) => <option key={id} value={id}>{COURSE_LABELS[id]}</option>)}</select></div>
    {error && <pre className="mb-4 whitespace-pre-wrap rounded-xl bg-red-50 p-3 font-bold text-red-800">{error}</pre>}
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">ID</th><th className="p-3">Local</th><th className="p-3">Idioma</th><th className="p-3">Status</th><th className="p-3">Versão</th><th className="p-3">Ações</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="p-6 text-center">Carregando…</td></tr> : filtered.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-slate-500">Nenhum exercício encontrado.</td></tr> : filtered.map((item) => <tr key={item.exerciseId} className="border-t align-top"><td className="p-3 font-mono text-xs">{item.exerciseId}{item.hasDraft && <span className="ml-2 rounded bg-amber-100 px-2 py-1 font-sans font-bold text-amber-800">rascunho</span>}</td><td className="p-3">{COURSE_LABELS[item.courseId] ?? item.courseId}<br /><span className="text-xs text-slate-500">L{item.workbookId} · {item.lessonId} · {item.dayId}</span></td><td className="p-3">{item.language}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-black ${statusClass[item.status]}`}>{STATUS_LABELS[item.status]}</span></td><td className="p-3">v{item.currentVersion}</td><td className="p-3"><div className="flex flex-wrap gap-2">
      <button onClick={() => void open(item.exerciseId, 'edit')} className="rounded border px-2 py-1 font-bold">Editar</button><button onClick={() => void open(item.exerciseId, 'preview')} className="rounded border px-2 py-1 font-bold">Testar</button><button onClick={() => void action(() => duplicateAdminExercise(item.exerciseId, reviewer.uid))} className="rounded border px-2 py-1 font-bold">Duplicar</button>
      {item.hasDraft && <button onClick={() => void action(async () => { const state = await getAdminExerciseState(item.exerciseId); if (!state?.draft) throw new Error('Rascunho não encontrado.'); if (!confirm('Publicar esta versão?')) return; await publishAdminExercise({ exerciseId: item.exerciseId, updatedBy: reviewer.uid, baseVersion: item.currentVersion, expectedDraftRevision: state.draft.draftRevision }); })} className="rounded bg-emerald-600 px-2 py-1 font-bold text-white">Publicar</button>}
      {item.status === 'published' && <button onClick={() => void action(async () => { const reason = prompt('Motivo da desativação (mínimo 5 caracteres):'); if (reason == null) return; await disableAdminExercise({ exerciseId: item.exerciseId, updatedBy: reviewer.uid, reason, expectedVersion: item.currentVersion }); })} className="rounded bg-red-600 px-2 py-1 font-bold text-white">Desativar</button>}
      {item.status === 'disabled' && <button onClick={() => void action(async () => { const reason = prompt('Motivo da reativação (mínimo 5 caracteres):'); if (reason == null) return; await reactivateAdminExercise({ exerciseId: item.exerciseId, updatedBy: reviewer.uid, reason, expectedVersion: item.currentVersion }); })} className="rounded bg-blue-600 px-2 py-1 font-bold text-white">Reativar</button>}
      <button onClick={() => void listAdminExerciseVersions(item.exerciseId).then((values) => setVersions({ item, values })).catch((cause) => setError(cause instanceof Error ? cause.message : 'Falha ao carregar histórico.'))} className="rounded border px-2 py-1 font-bold">Histórico</button>
    </div></td></tr>)}</tbody></table></div>
    {editor && <EditorModal initial={editor} reviewerUid={reviewer.uid} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); void refresh(); }} />}
    {preview && <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/70 p-3"><div className="mx-auto max-w-3xl rounded-2xl bg-white p-4"><div className="mb-3 flex justify-between"><h2 className="text-xl font-black">Teste administrativo</h2><button onClick={() => setPreview(null)} className="rounded border px-3 py-2 font-bold">Fechar</button></div><Sandbox value={preview} /></div></div>}
    {versions && <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/70 p-3"><div className="mx-auto max-w-3xl rounded-2xl bg-white p-5"><div className="mb-4 flex justify-between"><div><h2 className="text-xl font-black">Histórico imutável</h2><p className="font-mono text-xs">{versions.item.exerciseId}</p></div><button onClick={() => setVersions(null)} className="rounded border px-3 py-2 font-bold">Fechar</button></div><div className="space-y-3">{versions.values.length === 0 ? <p>Nenhuma versão publicada.</p> : versions.values.map((version) => <div key={version.version} className="rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-black">v{version.version} · {STATUS_LABELS[version.status]}</p><p className="text-sm text-slate-600">{version.changeReason}</p></div><button onClick={() => void action(async () => { const reason = prompt(`Motivo para restaurar a versão ${version.version}:`); if (reason == null) return; await restoreAdminExerciseVersion({ exerciseId: versions.item.exerciseId, sourceVersion: version.version, updatedBy: reviewer.uid, reason, expectedVersion: versions.item.currentVersion }); setVersions(null); })} className="rounded bg-violet-600 px-3 py-2 font-bold text-white">Restaurar</button></div></div>)}</div></div></div>}
  </div></div>;
};

export const AdminExerciseBuilderPage: React.FC<{
  reviewer: { uid: string; name: string };
  currentCourseId: string;
  onBack: () => void;
  initial?: { report: ExerciseReport; location: ReportExerciseLocation; courseId: string } | null;
}> = (props) => <ExerciseAuthoringWorkspace {...props} />;

export const AdminExerciseCreationModal: React.FC<{
  reviewer: { uid: string; name: string };
  courseId: string;
  report: ExerciseReport;
  location: ReportExerciseLocation;
  onClose: () => void;
  onSaved: (exerciseId: string) => void;
}> = ({ reviewer, courseId, report, location, onClose, onSaved }) => {
  const initial = useMemo(
    () => newEditorValue(courseId, { report, location }),
    [courseId, location.day.id, location.lesson.id, location.workbook.id, report.reportId],
  );
  return <EditorModal initial={initial} reviewerUid={reviewer.uid} onClose={onClose} onSaved={onSaved} />;
};

// Mantido temporariamente no bundle como leitor do formato paralelo da ETAPA 1.
// Não é usado na autoria do currículo e pode ser removido somente após uma decisão de migração.
void LegacyAdminExerciseBuilderPage;
