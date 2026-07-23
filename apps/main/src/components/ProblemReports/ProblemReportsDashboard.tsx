import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import {
  EXERCISE_REPORT_CATEGORIES,
  ExerciseReport,
  ExerciseReportFilters,
  ExerciseReportPriority,
  ExerciseReportStatus,
  getExerciseReportCounts,
  isActiveExerciseReport,
  listExerciseReports,
  updateExerciseReport,
} from '../../services/exerciseReportsService';

interface ProblemReportsDashboardProps {
  isAdmin: boolean;
  reviewer: { uid: string; name: string };
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

const emptyFilters: ExerciseReportFilters = {
  status: 'all', priority: 'all', category: 'all', sort: 'newest',
};

const formatDate = (value: any) => value?.toDate?.().toLocaleString('pt-BR') ?? 'Agora';
const value = (content: unknown) => content === null || content === undefined || content === '' ? '—' : String(content);

export const ProblemReportsDashboard: React.FC<ProblemReportsDashboardProps> = ({ isAdmin, reviewer, onBack }) => {
  const [filters, setFilters] = useState<ExerciseReportFilters>(emptyFilters);
  const [reports, setReports] = useState<ExerciseReport[]>([]);
  const [selected, setSelected] = useState<ExerciseReport | null>(null);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [currentStart, setCurrentStart] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [counts, setCounts] = useState({ new: 0, reviewing: 0, resolved: 0, dismissed: 0, total: 0, pending: 0 });

  const load = useCallback(async (targetCursor: QueryDocumentSnapshot<DocumentData> | null = null) => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const [page, nextCounts] = await Promise.all([
        listExerciseReports(filters, targetCursor),
        getExerciseReportCounts(),
      ]);
      setReports(page.reports);
      setCurrentStart(targetCursor);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
      setCounts(nextCounts);
    } catch (loadError) {
      console.error('[ProblemReports] load failed:', loadError);
      setError('Não foi possível carregar os relatórios. Verifique sua permissão de administrador e os índices do Firestore.');
    } finally { setLoading(false); }
  }, [filters, isAdmin]);

  useEffect(() => {
    setCursorHistory([]);
    void load(null);
  }, [load]);

  const options = useMemo(() => ({
    workbooks: [...new Set(reports.map((report) => report.workbookId))].sort((a, b) => a - b),
    lessons: [...new Set(reports.map((report) => report.lessonId))].sort(),
    days: [...new Set(reports.map((report) => report.dayId))].sort(),
  }), [reports]);

  const patchSelected = async (patch: { status?: ExerciseReportStatus; priority?: ExerciseReportPriority; adminNote?: string }) => {
    if (!selected || saving) return;
    setSaving(true);
    setError('');
    try {
      await updateExerciseReport(selected, patch, reviewer);
      const next = { ...selected, ...patch };
      if (isActiveExerciseReport(next)) {
        setSelected(next);
        setReports((current) => current.map((report) => report.reportId === next.reportId ? next : report));
      } else {
        setSelected(null);
        setReports((current) => current.filter((report) => report.reportId !== next.reportId));
        setCounts((current) => ({
          ...current,
          [selected.status]: Math.max(0, current[selected.status] - 1),
          [next.status]: current[next.status] + 1,
          pending: Math.max(0, current.pending - 1),
        }));
      }
      void getExerciseReportCounts().then(setCounts).catch((countError) => {
        console.warn('[ProblemReports] count refresh failed:', countError);
      });
    } catch (saveError) {
      console.error('[ProblemReports] update failed:', saveError);
      setError('Não foi possível salvar a alteração.');
    } finally { setSaving(false); }
  };

  const copyExerciseData = async (report: ExerciseReport) => {
    const data = {
      workbookId: report.workbookId, lessonId: report.lessonId, dayId: report.dayId,
      exerciseId: report.exerciseId, displayedText: report.displayedText,
      expectedAnswer: report.expectedAnswer, studentAnswer: report.studentAnswer,
      problemCategory: report.problemCategory, studentComment: report.studentComment,
    };
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  if (!isAdmin) {
    return <div className="mx-auto max-w-lg p-8 text-center text-white"><p>Acesso restrito a administradores.</p><button onClick={onBack} className="mt-4 rounded-xl bg-blue-600 px-5 py-3">Voltar</button></div>;
  }

  return (
    <div className="min-h-[calc(100vh-124px)] bg-slate-100 px-3 py-5 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Administração</p><h1 className="text-2xl font-black">Relatórios de problemas</h1></div>
          <button onClick={onBack} className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold">Voltar</button>
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
            <select aria-label="Status" value={filters.status} onChange={(event) => setFilters((f) => ({ ...f, status: event.target.value as any }))} className="rounded-xl border p-2"><option value="all">Todos os ativos</option>{(['new', 'reviewing'] as const).map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select>
            <select aria-label="Prioridade" value={filters.priority} onChange={(event) => setFilters((f) => ({ ...f, priority: event.target.value as any }))} className="rounded-xl border p-2"><option value="all">Todas as prioridades</option>{Object.entries(PRIORITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
            <select aria-label="Workbook" value={filters.workbookId ?? ''} onChange={(event) => setFilters((f) => ({ ...f, workbookId: event.target.value ? Number(event.target.value) : null }))} className="rounded-xl border p-2"><option value="">Todos os livros</option>{options.workbooks.map((book) => <option key={book} value={book}>Livro {book}</option>)}</select>
            <select aria-label="Lição" value={filters.lessonId ?? ''} onChange={(event) => setFilters((f) => ({ ...f, lessonId: event.target.value }))} className="rounded-xl border p-2"><option value="">Todas as lições</option>{options.lessons.map((lesson) => <option key={lesson}>{lesson}</option>)}</select>
            <select aria-label="Dia" value={filters.dayId ?? ''} onChange={(event) => setFilters((f) => ({ ...f, dayId: event.target.value }))} className="rounded-xl border p-2"><option value="">Todos os dias</option>{options.days.map((day) => <option key={day}>{day}</option>)}</select>
            <select aria-label="Categoria" value={filters.category} onChange={(event) => setFilters((f) => ({ ...f, category: event.target.value as any }))} className="rounded-xl border p-2"><option value="all">Todas as categorias</option>{EXERCISE_REPORT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select>
            <input aria-label="Data" type="date" value={filters.date ?? ''} onChange={(event) => setFilters((f) => ({ ...f, date: event.target.value }))} className="rounded-xl border p-2" />
            <select aria-label="Ordenação" value={filters.sort} onChange={(event) => setFilters((f) => ({ ...f, sort: event.target.value as any }))} className="rounded-xl border p-2"><option value="newest">Mais recentes</option><option value="oldest">Mais antigos</option><option value="priority">Prioridade</option><option value="workbook">Livro e lição</option></select>
            <input aria-label="Usuário" placeholder="Usuário ou e-mail" value={filters.user ?? ''} onChange={(event) => setFilters((f) => ({ ...f, user: event.target.value }))} className="rounded-xl border p-2" />
            <input aria-label="Texto livre" placeholder="Buscar em texto, ID, resposta..." value={filters.text ?? ''} onChange={(event) => setFilters((f) => ({ ...f, text: event.target.value }))} className="rounded-xl border p-2 sm:col-span-2" />
            <button onClick={() => setFilters(emptyFilters)} className="rounded-xl border border-slate-300 px-4 py-2 font-bold">Limpar filtros</button>
          </div>
        </div>

        {error && <p role="alert" className="mb-4 rounded-xl bg-red-100 p-3 font-bold text-red-800">{error}</p>}
        <div className="space-y-3">
          {loading ? <p className="p-8 text-center">Carregando…</p> : reports.length === 0 ? <p className="rounded-2xl bg-white p-8 text-center text-slate-500">Nenhum relatório encontrado nesta página.</p> : reports.map((report) => (
            <button key={report.reportId} onClick={() => setSelected(report)} className="block w-full rounded-2xl bg-white p-4 text-left shadow-sm transition hover:ring-2 hover:ring-blue-300">
              <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-xs font-black ${STATUS_STYLE[report.status]}`}>{STATUS_LABELS[report.status]}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{PRIORITY_LABELS[report.priority]}</span><span className="ml-auto text-xs text-slate-500">{formatDate(report.createdAt)}</span></div>
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
        <div className="fixed inset-0 z-[1100] overflow-y-auto bg-black/55 p-3 sm:p-8" onClick={() => setSelected(null)}>
          <div className="mx-auto max-w-4xl rounded-3xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-slate-500">{selected.reportId}</p><h2 className="text-xl font-black">Detalhes do relatório</h2></div><button aria-label="Fechar" onClick={() => setSelected(null)} className="rounded-lg bg-slate-100 px-3 py-2 font-black">×</button></div>
            <DetailSection title="Identificação" rows={[
              ['Data e hora', formatDate(selected.createdAt)], ['Status', STATUS_LABELS[selected.status]], ['Prioridade', PRIORITY_LABELS[selected.priority]], ['Usuário', selected.userName || selected.userEmail || selected.userId],
              ['Livro', `${selected.workbookTitle} (${selected.workbookId})`], ['Lição', `${selected.lessonTitle} (${selected.lessonId})`], ['Dia', `${selected.dayNumber ?? ''} (${selected.dayId})`], ['Exercício', selected.exerciseId], ['Tipo', selected.exerciseType], ['Modo', selected.exerciseMode], ['Fase', selected.sessionPhase],
            ]} />
            <DetailSection title="Conteúdo" rows={[
              ['Instrução', selected.instruction], ['Texto exibido', selected.displayedText], ['Texto do áudio', selected.audioText], ['Fonte do áudio', selected.audioSource], ['Alternativas', selected.options.join(' · ')],
              ['Resposta esperada', selected.expectedAnswer], ['Respostas aceitas', selected.acceptedAnswers.join(' · ')], ['Resposta do aluno', selected.studentAnswer], ['Tentativas', selected.attemptCount], ['Categoria', selected.problemCategory], ['Comentário', selected.studentComment],
            ]} />
            <DetailSection title="Contexto técnico" rows={[
              ['Rota', selected.route], ['Versão', selected.appVersion], ['Navegador', selected.browser], ['Sistema operacional', selected.operatingSystem], ['Dispositivo', selected.deviceType], ['Tela', selected.screenSize],
            ]} />
            <div className="mt-5 rounded-2xl bg-slate-50 p-4"><h3 className="font-black">Ações administrativas</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">
              <select value={selected.priority} disabled={saving} onChange={(event) => void patchSelected({ priority: event.target.value as ExerciseReportPriority })} className="rounded-xl border p-3">{Object.entries(PRIORITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
              <button disabled={saving} onClick={() => void copyExerciseData(selected)} className="rounded-xl border border-blue-300 bg-white p-3 font-bold text-blue-700">Copiar dados do exercício</button>
              <button disabled={saving} onClick={() => void patchSelected({ status: 'reviewing' })} className="rounded-xl bg-amber-500 p-3 font-black text-white">Marcar em análise</button>
              <button disabled={saving} onClick={() => void patchSelected({ status: 'resolved' })} className="rounded-xl bg-emerald-600 p-3 font-black text-white">Marcar resolvido</button>
              <button disabled={saving} onClick={() => void patchSelected({ status: 'dismissed' })} className="rounded-xl bg-slate-600 p-3 font-black text-white">Descartar</button>
            </div><label className="mt-4 block text-sm font-bold">Nota administrativa<textarea defaultValue={selected.adminNote} onBlur={(event) => { if (event.target.value !== selected.adminNote) void patchSelected({ adminNote: event.target.value }); }} className="mt-1 min-h-24 w-full rounded-xl border p-3 font-normal" /></label></div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailSection: React.FC<{ title: string; rows: [string, unknown][] }> = ({ title, rows }) => (
  <section className="mt-5"><h3 className="mb-2 border-b pb-2 font-black text-blue-800">{title}</h3><dl className="grid gap-3 sm:grid-cols-2">{rows.map(([label, content]) => <div key={label} className="min-w-0"><dt className="text-xs font-bold uppercase text-slate-500">{label}</dt><dd className="whitespace-pre-wrap break-words text-sm">{value(content)}</dd></div>)}</dl></section>
);
