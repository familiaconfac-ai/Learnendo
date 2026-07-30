import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import {
  EXERCISE_REPORT_CATEGORIES,
  ExerciseReport,
  ExerciseReportFilters,
  ExerciseReportPriority,
  ExerciseReportStatus,
  ExerciseReportVerificationResult,
  getExerciseReportCounts,
  isActiveExerciseReport,
  isVisibleExerciseReport,
  listExerciseReports,
  resolveOpenExerciseReports,
  updateExerciseReport,
} from '../../services/exerciseReportsService';
import { COURSE_WORKBOOKS } from '../../courses/courseRegistry';
import type { Workbook } from '../../types';
import { findReportedExercise, reportedWorkbookCandidates, resolveWorkbookModule, type ReportExerciseLocation } from '../../utils/exerciseReportCurriculum';
import { AdminExerciseVerification, type VerificationVerdict } from './AdminExerciseVerification';
import { ExerciseEditorModal } from './ExerciseEditorModal';
import { deleteExerciseDraft, getExerciseEditorialStatuses } from '../../services/exerciseOverrideService';
import type { ExerciseEditorialStatus } from '../../models/exerciseOverride';
import { AdminExerciseBuilderPage } from '../AdminExercises/AdminExerciseBuilderPage';

interface ProblemReportsDashboardProps {
  isAdmin: boolean;
  reviewer: { uid: string; name: string };
  currentCourseId: string;
  onBack: () => void;
}

const STATUS_LABELS: Record<ExerciseReportStatus, string> = {
  new: 'Novo', reviewing: 'Em análise', resolved: 'Resolvido', dismissed: 'Descartado',
};
const PRIORITY_LABELS: Record<ExerciseReportPriority, string> = {
  low: 'Baixa', normal: 'Normal', high: 'Alta', critical: 'Crítica',
};
const STATUS_STYLE: Record<ExerciseReportStatus, string> = {
  new: 'bg-blue-100 text-blue-800', reviewing: 'bg-amber-100 text-amber-800',
  resolved: 'bg-emerald-100 text-emerald-800', dismissed: 'bg-slate-200 text-slate-700',
};
const VISIBLE_STATUS_FILTERS: ExerciseReportStatus[] = ['new', 'reviewing', 'resolved', 'dismissed'];
const EDITORIAL_STATUS_LABELS: Record<ExerciseEditorialStatus, string> = {
  original: 'Conteúdo original', draft: 'Rascunho', published: 'Publicado', disabled: 'Desativado',
};
const EDITORIAL_STATUS_STYLE: Record<ExerciseEditorialStatus, string> = {
  original: 'bg-slate-100 text-slate-700', draft: 'bg-amber-100 text-amber-800',
  published: 'bg-emerald-100 text-emerald-800', disabled: 'bg-red-100 text-red-800',
};

const emptyFilters: ExerciseReportFilters = {
  status: 'active', priority: 'all', category: 'all', sort: 'newest',
};

const formatDate = (value: any) => value?.toDate?.().toLocaleString('pt-BR') ?? 'Agora';
const value = (content: unknown) => content === null || content === undefined || content === '' ? '—' : String(content);
const VERIFICATION_LABELS: Record<ExerciseReportVerificationResult, string> = {
  'ready-for-verification': 'Correção pronta para verificar',
  fixed: 'Problema corrigido',
  'better-than-expected': 'Melhor que o esperado',
  'not-fixed': 'Problema não corrigido',
  'needs-improvement': 'Corrigido, mas pode melhorar',
};
const LANGUAGE_COURSE: Record<string, string> = {
  en: 'english', es: 'spanish', el: 'greek_koine', he: 'hebrew_biblical', pt: 'portuguese_foreigners',
};
const languageForCourse = (courseId: string): string => {
  if (courseId === 'spanish') return 'es';
  if (courseId === 'greek_koine') return 'el';
  if (courseId === 'hebrew_biblical') return 'he';
  if (courseId.startsWith('portuguese')) return 'pt';
  return 'en';
};

export const ProblemReportsDashboard: React.FC<ProblemReportsDashboardProps> = ({ isAdmin, reviewer, currentCourseId, onBack }) => {
  const [adminView, setAdminView] = useState<'reports' | 'exercise-builder'>('reports');
  const [filters, setFilters] = useState<ExerciseReportFilters>(emptyFilters);
  const [editorialFilter, setEditorialFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [reports, setReports] = useState<ExerciseReport[]>([]);
  const [editorialStatuses, setEditorialStatuses] = useState<Record<string, ExerciseEditorialStatus>>({});
  const [selected, setSelected] = useState<ExerciseReport | null>(null);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [currentStart, setCurrentStart] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const [statusNotice, setStatusNotice] = useState('');
  const actionInFlightRef = useRef(false);
  const [counts, setCounts] = useState({ new: 0, reviewing: 0, resolved: 0, dismissed: 0, total: 0, pending: 0 });
  const [catalogWorkbook, setCatalogWorkbook] = useState<Workbook | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [verification, setVerification] = useState<{ report: ExerciseReport; location: ReportExerciseLocation } | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationSaving, setVerificationSaving] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [editor, setEditor] = useState<{ report: ExerciseReport | null; location: ReportExerciseLocation; language: string } | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');

  const load = useCallback(async (targetCursor: QueryDocumentSnapshot<DocumentData> | null = null) => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const [page, nextCounts] = await Promise.all([
        listExerciseReports(filters, targetCursor),
        getExerciseReportCounts(),
      ]);
      const nextEditorialStatuses = await getExerciseEditorialStatuses(page.reports.map((report) => report.exerciseId));
      setEditorialStatuses(nextEditorialStatuses);
      setReports(editorialFilter === 'all'
        ? page.reports
        : page.reports.filter((report) => nextEditorialStatuses[report.exerciseId] === editorialFilter));
      setCurrentStart(targetCursor);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
      setCounts(nextCounts);
    } catch (loadError) {
      console.error('[ProblemReports] load failed:', loadError);
      setError('Não foi possível carregar os relatórios. Verifique sua permissão de administrador e os índices do Firestore.');
    } finally { setLoading(false); }
  }, [editorialFilter, filters, isAdmin]);

  useEffect(() => {
    setCursorHistory([]);
    void load(null);
  }, [load]);

  const courseRegistry = COURSE_WORKBOOKS[currentCourseId] ?? COURSE_WORKBOOKS.english;
  const workbookIds = useMemo(
    () => Object.keys(courseRegistry).map(Number).sort((left, right) => left - right),
    [courseRegistry],
  );

  useEffect(() => {
    const workbookId = filters.workbookId;
    if (!workbookId) {
      setCatalogWorkbook(null);
      setCatalogLoading(false);
      return;
    }
    const loader = courseRegistry[workbookId];
    if (!loader) {
      setCatalogWorkbook(null);
      return;
    }
    let cancelled = false;
    setCatalogLoading(true);
    void loader()
      .then((module) => {
        if (!cancelled) setCatalogWorkbook(resolveWorkbookModule(module as Record<string, unknown>, workbookId));
      })
      .catch((catalogError) => {
        console.error('[ProblemReports] curriculum catalog failed:', catalogError);
        if (!cancelled) setCatalogWorkbook(null);
      })
      .finally(() => { if (!cancelled) setCatalogLoading(false); });
    return () => { cancelled = true; };
  }, [courseRegistry, filters.workbookId]);

  const lessonOptions = catalogWorkbook?.lessons ?? [];
  const selectedCatalogLesson = lessonOptions.find((lesson) => lesson.id === filters.lessonId);
  const dayOptions = selectedCatalogLesson?.days ?? [];

  const patchSelected = async (
    patch: { status?: ExerciseReportStatus; priority?: ExerciseReportPriority; adminNote?: string; verificationResult?: ExerciseReportVerificationResult; verificationNote?: string; resolutionVersion?: number; resolutionType?: 'editorial' | 'code'; requiresCodeChange?: boolean },
    closeAfterSuccess = false,
  ) => {
    if (!selected || saving || actionInFlightRef.current) return;
    actionInFlightRef.current = true;
    setSaving(true);
    setError('');
    try {
      await updateExerciseReport(selected, patch, reviewer);
      const next = { ...selected, ...patch };
      const staysInCurrentFilter = isVisibleExerciseReport(next)
        && (filters.status === 'all' || !filters.status
          || (filters.status === 'active' ? isActiveExerciseReport(next) : filters.status === next.status))
        && (editorialFilter === 'all' || editorialStatuses[next.exerciseId] === editorialFilter);
      setReports((current) => staysInCurrentFilter
        ? current.map((report) => report.reportId === next.reportId ? next : report)
        : current.filter((report) => report.reportId !== next.reportId));
      if (patch.status && patch.status !== selected.status) {
        const wasPending = isActiveExerciseReport(selected);
        const isPending = isActiveExerciseReport(next);
        setCounts((current) => ({
          ...current,
          [selected.status]: Math.max(0, current[selected.status] - 1),
          [next.status]: current[next.status] + 1,
          pending: Math.max(0, current.pending + Number(isPending) - Number(wasPending)),
        }));
      }
      if (closeAfterSuccess) {
        setSelected(null);
        setStatusNotice(next.status === 'resolved'
          ? 'Problema marcado como corrigido e removido da lista.'
          : `Relatório atualizado para ${STATUS_LABELS[next.status]}.`);
      } else {
        setSelected(next);
      }
      void getExerciseReportCounts().then(setCounts).catch((countError) => {
        console.warn('[ProblemReports] count refresh failed:', countError);
      });
    } catch (saveError) {
      console.error('[ProblemReports] update failed:', saveError);
      setError('Não foi possível salvar a alteração.');
    } finally {
      actionInFlightRef.current = false;
      setSaving(false);
    }
  };

  const resolveSelectedWithoutPublishing = async () => {
    if (!selected) return;
    const justification = window.prompt('Justificativa administrativa para resolver sem publicar (mínimo 5 caracteres):')?.trim();
    if (!justification || justification.length < 5) {
      setError('Informe uma justificativa administrativa com pelo menos 5 caracteres.');
      return;
    }
    await patchSelected({
      status: 'resolved',
      adminNote: [selected.adminNote, `[${new Date().toLocaleString('pt-BR')}] Resolvido sem publicação: ${justification}`].filter(Boolean).join('\n'),
    }, true);
  };

  const dismissSelected = async () => {
    if (!selected) return;
    const hasDraft = editorialStatuses[selected.exerciseId] === 'draft';
    let deleteDraft = false;
    if (hasDraft) {
      const choice = window.prompt('Este exercício possui um rascunho. O que deseja fazer?\n1 — Descartar apenas a denúncia e manter o rascunho\n2 — Descartar a denúncia e excluir o rascunho\nCancelar — não alterar nada')?.trim().toLowerCase();
      if (!choice || choice === 'cancelar') return;
      if (choice !== '1' && choice !== '2') {
        setError('Escolha 1, 2 ou Cancelar.');
        return;
      }
      deleteDraft = choice === '2';
    }
    if (deleteDraft) {
      setSaving(true);
      try {
        await deleteExerciseDraft(selected.exerciseId, reviewer.uid);
        const refreshedStatus = await getExerciseEditorialStatuses([selected.exerciseId]);
        setEditorialStatuses((current) => ({ ...current, ...refreshedStatus }));
      } catch (cause) {
        console.error('[ProblemReports] draft delete failed:', cause);
        setError('Não foi possível excluir o rascunho. A denúncia não foi descartada.');
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    await patchSelected({ status: 'dismissed' }, true);
  };

  const openExerciseVerification = async (report: ExerciseReport) => {
    if (verificationLoading) return;
    setVerificationLoading(true);
    setVerificationError('');
    setError('');
    try {
      const inferredCourse = LANGUAGE_COURSE[report.language] ?? currentCourseId;
      const courseCandidates = [...new Set([inferredCourse, currentCourseId, 'english'])];
      let location: ReportExerciseLocation | null = null;
      for (const courseId of courseCandidates) {
        const registry = COURSE_WORKBOOKS[courseId] ?? {};
        const workbookCandidates = reportedWorkbookCandidates(report, Object.keys(registry).map(Number));
        for (const workbookId of workbookCandidates) {
          const loader = registry[workbookId];
          if (!loader) continue;
          const module = await loader();
          const workbook = resolveWorkbookModule(module as Record<string, unknown>, workbookId);
          if (!workbook) continue;
          location = findReportedExercise(workbook, report);
          if (location) break;
        }
        if (location) break;
      }
      if (!location) {
        setError('Não foi possível localizar este exercício na versão atual do currículo. Confira o ID e o livro registrados.');
        return;
      }
      setSelected(null);
      setVerification({ report, location });
    } catch (verificationLoadError) {
      console.error('[ProblemReports] exercise verification load failed:', verificationLoadError);
      setError('Não foi possível abrir o exercício para verificação. Tente novamente.');
    } finally {
      setVerificationLoading(false);
    }
  };

  const openExerciseEditor = async (report: ExerciseReport) => {
    if (verificationLoading) return;
    setVerificationLoading(true);
    setError('');
    try {
      const inferredCourse = LANGUAGE_COURSE[report.language] ?? currentCourseId;
      const courseCandidates = [...new Set([inferredCourse, currentCourseId, 'english'])];
      let location: ReportExerciseLocation | null = null;
      for (const courseId of courseCandidates) {
        const registry = COURSE_WORKBOOKS[courseId] ?? {};
        for (const workbookId of reportedWorkbookCandidates(report, Object.keys(registry).map(Number))) {
          const loader = registry[workbookId];
          if (!loader) continue;
          const workbook = resolveWorkbookModule(await loader() as Record<string, unknown>, workbookId);
          if (workbook) location = findReportedExercise(workbook, report);
          if (location) break;
        }
        if (location) break;
      }
      if (!location) throw new Error('Exercício não localizado no currículo atual.');
      setSelected(null);
      setEditor({ report, location, language: report.language || 'en' });
      setAdminView('exercise-builder');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível abrir o editor.');
    } finally {
      setVerificationLoading(false);
    }
  };

  const catalogMatches = useMemo(() => {
    const search = catalogSearch.trim().toLowerCase();
    if (!catalogWorkbook || search.length < 2) return [];
    const matches: ReportExerciseLocation[] = [];
    for (const lesson of catalogWorkbook.lessons) {
      if (filters.lessonId && lesson.id !== filters.lessonId) continue;
      for (const day of lesson.days) {
        if (filters.dayId && day.id !== filters.dayId) continue;
        day.exercises.forEach((exercise, exerciseIndex) => {
          if (matches.length >= 30) return;
          if ([exercise.id, exercise.type, exercise.instruction, exercise.displayValue, exercise.correctValue]
            .join(' ').toLowerCase().includes(search)) matches.push({ workbook: catalogWorkbook, lesson, day, exerciseIndex });
        });
      }
    }
    return matches;
  }, [catalogSearch, catalogWorkbook, filters.dayId, filters.lessonId]);

  const saveVerificationVerdict = async (
    verdict: VerificationVerdict,
    note: string,
    status: ExerciseReportStatus,
  ) => {
    if (!verification || verificationSaving) return;
    setVerificationSaving(true);
    setVerificationError('');
    const report = verification.report;
    const verificationNote = note.trim();
    const logEntry = `[${new Date().toLocaleString('pt-BR')}] Verificação: ${VERIFICATION_LABELS[verdict]}.${verificationNote ? ` ${verificationNote}` : ''}`;
    try {
      await updateExerciseReport(report, {
        status,
        verificationResult: verdict,
        verificationNote,
        adminNote: [report.adminNote?.trim(), logEntry].filter(Boolean).join('\n'),
      }, reviewer);
      setVerification(null);
      setStatusNotice(status === 'resolved'
        ? `Verificação salva: ${VERIFICATION_LABELS[verdict]}. O relatório foi removido da lista.`
        : `Verificação salva: ${VERIFICATION_LABELS[verdict]}.`);
      await load(currentStart);
    } catch (verificationSaveError) {
      console.error('[ProblemReports] verification save failed:', verificationSaveError);
      setVerificationError('Não foi possível salvar o resultado. O exercício continua aberto para uma nova tentativa.');
    } finally {
      setVerificationSaving(false);
    }
  };

  const copyExerciseData = async (report: ExerciseReport) => {
    if (copyStatus === 'copying') return;
    setCopyStatus('copying');
    const data = {
      reportId: report.reportId, status: report.status, priority: report.priority,
      workbookId: report.workbookId, workbookTitle: report.workbookTitle,
      lessonId: report.lessonId, lessonTitle: report.lessonTitle,
      dayId: report.dayId, dayNumber: report.dayNumber, exerciseId: report.exerciseId,
      exerciseType: report.exerciseType, exerciseMode: report.exerciseMode,
      instruction: report.instruction, displayedText: report.displayedText,
      audioText: report.audioText, audioSource: report.audioSource,
      options: report.options, expectedAnswer: report.expectedAnswer,
      acceptedAnswers: report.acceptedAnswers, studentAnswer: report.studentAnswer,
      attemptCount: report.attemptCount, problemCategory: report.problemCategory,
      studentComment: report.studentComment, route: report.route,
      appVersion: report.appVersion, browser: report.browser,
      operatingSystem: report.operatingSystem, deviceType: report.deviceType,
      screenSize: report.screenSize, userId: report.userId,
      userName: report.userName, userEmail: report.userEmail,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopyStatus('copied');
    } catch (copyError) {
      console.error('[ProblemReports] copy failed:', copyError);
      setCopyStatus('error');
    }
  };

  if (!isAdmin) {
    return <div className="mx-auto max-w-lg p-8 text-center text-white"><p>Acesso restrito a administradores.</p><button onClick={onBack} className="mt-4 rounded-xl bg-blue-600 px-5 py-3">Voltar</button></div>;
  }

  if (adminView === 'exercise-builder') {
    return <AdminExerciseBuilderPage reviewer={reviewer} currentCourseId={currentCourseId}
      initial={editor ? { report: editor.report!, location: editor.location, courseId: LANGUAGE_COURSE[editor.language] ?? currentCourseId } : null}
      onBack={() => { setEditor(null); setAdminView('reports'); }} />;
  }

  return (
    <div className="min-h-[calc(100vh-124px)] bg-slate-100 px-3 py-5 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Administração</p><h1 className="text-2xl font-black">Relatórios de problemas</h1></div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setAdminView('exercise-builder')} className="rounded-xl bg-violet-600 px-4 py-2 font-black text-white">Construtor de exercícios</button>
            <button onClick={onBack} className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold">Voltar</button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {([
            ['Novos', counts.new, 'text-blue-700'], ['Em análise', counts.reviewing, 'text-amber-700'],
            ['Resolvidos', counts.resolved, 'text-emerald-700'], ['Descartados', counts.dismissed, 'text-slate-600'],
            ['Total', counts.total, 'text-violet-700'],
          ] as const).map(([label, count, color]) => <div key={label} className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-bold text-slate-500">{label}</p><p className={`text-2xl font-black ${color}`}>{count}</p></div>)}
        </div>

        <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select aria-label="Status" value={editorialFilter === 'all' ? filters.status : editorialFilter} onChange={(event) => { const selectedFilter = event.target.value; if (selectedFilter === 'draft' || selectedFilter === 'published') { setEditorialFilter(selectedFilter); setFilters((current) => ({ ...current, status: 'all' })); } else { setEditorialFilter('all'); setFilters((current) => ({ ...current, status: selectedFilter as ExerciseReportFilters['status'] })); } }} className="rounded-xl border p-2"><option value="active">Pendências ativas</option><option value="all">Todas</option>{VISIBLE_STATUS_FILTERS.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}<option value="draft">Com rascunho</option><option value="published">Com correção publicada</option></select>
            <select aria-label="Prioridade" value={filters.priority} onChange={(event) => setFilters((f) => ({ ...f, priority: event.target.value as any }))} className="rounded-xl border p-2"><option value="all">Todas as prioridades</option>{Object.entries(PRIORITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
            <select aria-label="Workbook" value={filters.workbookId ?? ''} onChange={(event) => setFilters((current) => ({ ...current, workbookId: event.target.value ? Number(event.target.value) : null, lessonId: '', dayId: '' }))} className="rounded-xl border p-2"><option value="">Todos os livros</option>{workbookIds.map((book) => <option key={book} value={book}>Livro {book}</option>)}</select>
            <select aria-label="Lição" disabled={!filters.workbookId || catalogLoading} value={filters.lessonId ?? ''} onChange={(event) => setFilters((current) => ({ ...current, lessonId: event.target.value, dayId: '' }))} className="rounded-xl border p-2 disabled:bg-slate-100 disabled:text-slate-400"><option value="">{catalogLoading ? 'Carregando lições…' : filters.workbookId ? 'Todas as lições' : 'Selecione um livro'}</option>{lessonOptions.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title || lesson.id} ({lesson.id})</option>)}</select>
            <select aria-label="Dia" disabled={!filters.lessonId} value={filters.dayId ?? ''} onChange={(event) => setFilters((current) => ({ ...current, dayId: event.target.value }))} className="rounded-xl border p-2 disabled:bg-slate-100 disabled:text-slate-400"><option value="">{filters.lessonId ? 'Todos os dias' : 'Selecione uma lição'}</option>{dayOptions.map((day, index) => <option key={day.id} value={day.id}>Dia {index + 1} ({day.id})</option>)}</select>
            <select aria-label="Categoria" value={filters.category} onChange={(event) => setFilters((f) => ({ ...f, category: event.target.value as any }))} className="rounded-xl border p-2"><option value="all">Todas as categorias</option>{EXERCISE_REPORT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select>
            <input aria-label="Data" type="date" value={filters.date ?? ''} onChange={(event) => setFilters((f) => ({ ...f, date: event.target.value }))} className="rounded-xl border p-2" />
            <select aria-label="Ordenação" value={filters.sort} onChange={(event) => setFilters((f) => ({ ...f, sort: event.target.value as any }))} className="rounded-xl border p-2"><option value="newest">Mais recentes</option><option value="oldest">Mais antigos</option><option value="priority">Prioridade</option><option value="workbook">Livro e lição</option></select>
            <input aria-label="Usuário" placeholder="Usuário ou e-mail" value={filters.user ?? ''} onChange={(event) => setFilters((f) => ({ ...f, user: event.target.value }))} className="rounded-xl border p-2" />
            <input aria-label="Texto livre" placeholder="Buscar em texto, ID, resposta..." value={filters.text ?? ''} onChange={(event) => setFilters((f) => ({ ...f, text: event.target.value }))} className="rounded-xl border p-2 sm:col-span-2" />
            <button onClick={() => { setEditorialFilter('all'); setFilters(emptyFilters); }} className="rounded-xl border border-slate-300 px-4 py-2 font-bold">Limpar filtros</button>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <h2 className="font-black">Localizar exercício sem relatório</h2>
          <p className="mt-1 text-sm text-slate-600">Selecione um livro acima e busque por ID, tipo, enunciado ou resposta. No máximo 30 resultados são mostrados.</p>
          <input aria-label="Localizar exercício" disabled={!catalogWorkbook} value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} placeholder={catalogWorkbook ? 'Digite pelo menos 2 caracteres…' : 'Selecione um livro primeiro'} className="mt-3 w-full rounded-xl border p-3 disabled:bg-slate-100" />
          {catalogMatches.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{catalogMatches.map((location) => {
            const exercise = location.day.exercises[location.exerciseIndex];
            return <button key={`${location.day.id}:${exercise.id}`} onClick={() => setEditor({ report: null, location, language: languageForCourse(currentCourseId) })} className="rounded-xl bg-white p-3 text-left shadow-sm hover:ring-2 hover:ring-blue-300"><p className="break-all text-xs font-black text-blue-700">{exercise.id}</p><p className="text-sm font-bold">{location.lesson.title} · {location.day.id} · {exercise.type}</p><p className="line-clamp-1 text-xs text-slate-500">{exercise.displayValue || exercise.instruction || exercise.correctValue}</p></button>;
          })}</div>}
        </div>

        {error && <p role="alert" className="mb-4 rounded-xl bg-red-100 p-3 font-bold text-red-800">{error}</p>}
        {statusNotice && <p role="status" className="mb-4 rounded-xl bg-emerald-100 p-3 font-bold text-emerald-800">{statusNotice}</p>}
        <div className="space-y-3">
          {loading ? <p className="p-8 text-center">Carregando…</p> : reports.length === 0 ? <p className="rounded-2xl bg-white p-8 text-center text-slate-500">Nenhum relatório encontrado nesta página.</p> : reports.map((report) => (
            <button key={report.reportId} onClick={() => { setCopyStatus('idle'); setStatusNotice(''); setSelected(report); }} className="block w-full rounded-2xl bg-white p-4 text-left shadow-sm transition hover:ring-2 hover:ring-blue-300">
              <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-xs font-black ${STATUS_STYLE[report.status]}`}>Denúncia: {STATUS_LABELS[report.status]}</span><span className={`rounded-full px-2 py-1 text-xs font-black ${EDITORIAL_STATUS_STYLE[editorialStatuses[report.exerciseId] ?? 'original']}`}>Exercício: {EDITORIAL_STATUS_LABELS[editorialStatuses[report.exerciseId] ?? 'original']}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{PRIORITY_LABELS[report.priority]}</span>{report.verificationResult && <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-black text-violet-800">{VERIFICATION_LABELS[report.verificationResult]}</span>}<span className="ml-auto text-xs text-slate-500">{formatDate(report.createdAt)}</span></div>
              <p className="mt-2 font-black">{report.workbookTitle || `Livro ${report.workbookId}`} · {report.lessonTitle || report.lessonId} · dia {report.dayNumber ?? report.dayId}</p>
              <p className="text-sm text-slate-600">{report.exerciseId} · {report.problemCategory}</p>
              <p className="mt-2 line-clamp-2 text-sm">{report.displayedText || report.instruction}</p>
              {report.studentComment && <p className="mt-1 line-clamp-2 text-sm italic text-slate-600">“{report.studentComment}”</p>}
              <p className="mt-2 text-xs text-slate-500">{report.userName || report.userEmail || report.userId}</p>
            </button>
          ))}
        </div>

        <div className="mt-5 flex justify-between">
          <button disabled={cursorHistory.length === 0 || loading} onClick={() => { const history = [...cursorHistory]; const previous = history.pop() ?? null; setCursorHistory(history); void load(previous); }} className="rounded-xl border bg-white px-4 py-2 font-bold disabled:opacity-40">Anterior</button>
          <button disabled={!hasMore || loading || !cursor} onClick={() => { setCursorHistory((history) => [...history, currentStart]); void load(cursor); }} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-40">Próxima</button>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[1100] overflow-y-auto bg-black/55 p-3 sm:p-8" onClick={() => { if (!saving) setSelected(null); }}>
          <div className="mx-auto max-w-4xl rounded-3xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-slate-500">{selected.reportId}</p><h2 className="text-xl font-black">Detalhes do relatório</h2></div><button aria-label="Fechar" disabled={saving} onClick={() => setSelected(null)} className="rounded-lg bg-slate-100 px-3 py-2 font-black disabled:opacity-40">×</button></div>
            {error && <p role="alert" className="mt-4 rounded-xl bg-red-100 p-3 font-bold text-red-800">{error}</p>}
            <DetailSection title="Identificação" rows={[
              ['Data e hora', formatDate(selected.createdAt)], ['Status da denúncia', STATUS_LABELS[selected.status]], ['Status editorial', EDITORIAL_STATUS_LABELS[editorialStatuses[selected.exerciseId] ?? 'original']], ['Prioridade', PRIORITY_LABELS[selected.priority]], ['Usuário', selected.userName || selected.userEmail || selected.userId],
              ['Livro', `${selected.workbookTitle} (${selected.workbookId})`], ['Lição', `${selected.lessonTitle} (${selected.lessonId})`], ['Dia', `${selected.dayNumber ?? ''} (${selected.dayId})`], ['Exercício', selected.exerciseId], ['Tipo', selected.exerciseType], ['Modo', selected.exerciseMode], ['Fase', selected.sessionPhase],
            ]} />
            <DetailSection title="Exercício relacionado" rows={[
              ['Instrução', selected.instruction], ['Texto exibido', selected.displayedText], ['Texto do áudio', selected.audioText], ['Fonte do áudio', selected.audioSource], ['Alternativas', selected.options.join(' · ')],
              ['Resposta esperada', selected.expectedAnswer], ['Respostas aceitas', selected.acceptedAnswers.join(' · ')], ['Resposta do aluno', selected.studentAnswer], ['Tentativas', selected.attemptCount], ['Categoria', selected.problemCategory], ['Comentário', selected.studentComment],
            ]} />
            <DetailSection title="Contexto técnico" rows={[
              ['Rota', selected.route], ['Versão', selected.appVersion], ['Navegador', selected.browser], ['Sistema operacional', selected.operatingSystem], ['Dispositivo', selected.deviceType], ['Tela', selected.screenSize],
            ]} />
            {selected.verificationResult && <DetailSection title="Última verificação administrativa" rows={[
              ['Resultado', VERIFICATION_LABELS[selected.verificationResult]], ['Observação', selected.verificationNote], ['Verificado por', selected.verifiedBy], ['Data da verificação', formatDate(selected.verifiedAt)],
            ]} />}
            <div className="mt-5 rounded-2xl bg-slate-50 p-4"><h3 className="font-black">Ações administrativas</h3>
            {saving && <p role="status" className="mt-2 font-bold text-blue-700">Salvando alteração…</p>}
            {copyStatus === 'copying' && <p role="status" className="mt-2 font-bold text-blue-700">Copiando dados…</p>}
            {copyStatus === 'copied' && <p role="status" className="mt-2 font-bold text-emerald-700">Dados copiados.</p>}
            {copyStatus === 'error' && <p role="alert" className="mt-2 font-bold text-red-700">Não foi possível copiar. Tente novamente.</p>}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button disabled={saving || verificationLoading} onClick={() => void openExerciseVerification(selected)} className="rounded-xl bg-violet-700 p-3 font-black text-white disabled:opacity-50 sm:col-span-2">{verificationLoading ? 'Abrindo exercício…' : 'Abrir exercício para verificar'}</button>
              {/* Compatibilidade do fluxo antes rotulado "Editar exercício": agora abre a autoria completa. */}
              <button disabled={saving || verificationLoading} onClick={() => void openExerciseEditor(selected)} className="rounded-xl bg-blue-700 p-3 font-black text-white disabled:opacity-50 sm:col-span-2">Corrigir no Construtor</button>
              <p className="text-xs text-slate-500 sm:col-span-2">Abre exatamente o exercício reportado, sem exigir os anteriores e sem alterar o progresso do aluno.</p>
              <button disabled={saving} onClick={() => void patchSelected({ status: 'reviewing', verificationResult: 'ready-for-verification', verificationNote: 'Correção publicada e aguardando validação administrativa.' }, true)} className="rounded-xl border border-violet-400 bg-white p-3 font-black text-violet-800 disabled:opacity-50 sm:col-span-2">Marcar correção pronta para verificar</button>
              <select value={selected.priority} disabled={saving} onChange={(event) => void patchSelected({ priority: event.target.value as ExerciseReportPriority })} className="rounded-xl border p-3">{Object.entries(PRIORITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
              <button disabled={saving || copyStatus === 'copying'} onClick={() => void copyExerciseData(selected)} className="rounded-xl border border-blue-300 bg-white p-3 font-bold text-blue-700 disabled:opacity-50">{copyStatus === 'copying' ? 'Copiando…' : copyStatus === 'copied' ? 'Copiado' : 'Copiar dados do exercício'}</button>
              {selected.status === 'new' && <button disabled={saving} onClick={() => void patchSelected({ status: 'reviewing' }, true)} className="rounded-xl bg-amber-500 p-3 font-black text-white">Marcar em análise</button>}
              {selected.status === 'reviewing' && <button disabled={saving} onClick={() => void patchSelected({ status: 'new' }, true)} className="rounded-xl border border-blue-400 bg-white p-3 font-black text-blue-700">Retirar de análise</button>}
              {isActiveExerciseReport(selected) && <button disabled={saving} onClick={() => void resolveSelectedWithoutPublishing()} className="rounded-xl bg-emerald-600 p-3 font-black text-white">Resolver sem publicar</button>}
              {isActiveExerciseReport(selected) && <button disabled={saving} onClick={() => void dismissSelected()} className="rounded-xl bg-slate-600 p-3 font-black text-white">Descartar denúncia</button>}
              {isActiveExerciseReport(selected) && <button disabled={saving} onClick={() => void patchSelected({ status: 'reviewing', requiresCodeChange: true, resolutionType: 'code', adminNote: [selected.adminNote, 'Requer alteração de código.'].filter(Boolean).join('\n') }, true)} className="rounded-xl border border-orange-400 bg-white p-3 font-black text-orange-800 sm:col-span-2">Requer alteração de código</button>}
              {!isActiveExerciseReport(selected) && <button disabled={saving} onClick={() => void patchSelected({ status: 'new' }, true)} className="rounded-xl bg-blue-600 p-3 font-black text-white">Reabrir como novo</button>}
            </div><label className="mt-4 block text-sm font-bold">Nota administrativa<textarea defaultValue={selected.adminNote} onBlur={(event) => { if (event.target.value !== selected.adminNote) void patchSelected({ adminNote: event.target.value }); }} className="mt-1 min-h-24 w-full rounded-xl border p-3 font-normal" /></label></div>
          </div>
        </div>
      )}
      {verification && <AdminExerciseVerification
        report={verification.report}
        location={verification.location}
        saving={verificationSaving}
        error={verificationError}
        onClose={() => {
          if (verificationSaving) return;
          setVerification(null);
          setVerificationError('');
        }}
        onVerdict={saveVerificationVerdict}
      />}
      {editor && <ExerciseEditorModal
        report={editor.report}
        location={editor.location}
        language={editor.language}
        reviewer={reviewer}
        onClose={() => setEditor(null)}
        onDraftSaved={async (reopened) => {
          if (editor.report && editor.report.status !== 'reviewing') {
            const nextAdminNote = reopened
              ? [editor.report.adminNote, `[${new Date().toLocaleString('pt-BR')}] Denúncia reaberta para edição em rascunho.`].filter(Boolean).join('\n')
              : editor.report.adminNote;
            await updateExerciseReport(editor.report, { status: 'reviewing', adminNote: nextAdminNote }, reviewer);
            setEditor((current) => current?.report ? { ...current, report: { ...current.report, status: 'reviewing', adminNote: nextAdminNote } } : current);
          }
          await load(currentStart);
        }}
        onPublished={async (version, resolveReports) => {
          if (resolveReports === 'all') {
            const count = await resolveOpenExerciseReports(editor.location.day.exercises[editor.location.exerciseIndex].id, version, reviewer);
            setStatusNotice(`Correção ${version} publicada e ${count} relatório(s) resolvido(s).`);
          } else if (editor.report) {
            if (resolveReports === 'current') {
              await updateExerciseReport(editor.report, {
                status: 'resolved', resolutionVersion: version, resolutionType: 'editorial',
                adminNote: [editor.report.adminNote, `Resolvido pela versão editorial ${version}.`].filter(Boolean).join('\n'),
              }, reviewer);
              setStatusNotice(`Correção ${version} publicada e relatório resolvido.`);
            } else if (editor.report.status !== 'reviewing') {
              await updateExerciseReport(editor.report, { status: 'reviewing' }, reviewer);
              setStatusNotice(`Correção ${version} publicada; denúncia mantida em análise.`);
            }
          }
          await load(currentStart);
        }}
      />}
    </div>
  );
};

const DetailSection: React.FC<{ title: string; rows: [string, unknown][] }> = ({ title, rows }) => (
  <section className="mt-5"><h3 className="mb-2 border-b pb-2 font-black text-blue-800">{title}</h3><dl className="grid gap-3 sm:grid-cols-2">{rows.map(([label, content]) => <div key={label} className="min-w-0"><dt className="text-xs font-bold uppercase text-slate-500">{label}</dt><dd className="whitespace-pre-wrap break-words text-sm">{value(content)}</dd></div>)}</dl></section>
);
