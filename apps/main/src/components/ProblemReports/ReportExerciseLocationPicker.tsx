import React, { useEffect, useMemo, useState } from 'react';
import { COURSE_WORKBOOKS } from '../../courses/courseRegistry';
import type { Workbook } from '../../types';
import type { ExerciseReport } from '../../services/exerciseReportsService';
import { getExerciseEditorialStatuses } from '../../services/exerciseOverrideService';
import type { ExerciseEditorialStatus } from '../../models/exerciseOverride';
import {
  courseIdForReportLanguage,
  normalizeReportedLocationId,
  reportedWorkbookCandidates,
  resolveWorkbookModule,
  type ReportExerciseLocation,
} from '../../utils/exerciseReportCurriculum';

const COURSE_LABELS: Record<string, string> = {
  english: 'English', spanish: 'Español', portuguese_native: 'Português',
  portuguese_foreigners: 'Português para estrangeiros', greek_koine: 'Grego koiné',
  hebrew_biblical: 'Hebraico bíblico', bible_language_track: 'Trilha bíblica',
};
const STATUS_LABELS: Record<ExerciseEditorialStatus, string> = {
  original: 'original', draft: 'rascunho', published: 'publicado', disabled: 'desativado',
};

export const ReportExerciseLocationPicker: React.FC<{
  report: ExerciseReport;
  currentCourseId: string;
  action: 'existing' | 'new';
  onCancel: () => void;
  onResolve: (location: ReportExerciseLocation, courseId: string) => void;
}> = ({ report, currentCourseId, action, onCancel, onResolve }) => {
  const initialCourseId = courseIdForReportLanguage(report.language, currentCourseId);
  const initialRegistry = COURSE_WORKBOOKS[initialCourseId] ?? COURSE_WORKBOOKS.english;
  const initialWorkbookId = reportedWorkbookCandidates(report, Object.keys(initialRegistry).map(Number))
    .find((workbookId) => Boolean(initialRegistry[workbookId])) ?? Number(Object.keys(initialRegistry)[0] ?? 1);
  const [courseId, setCourseId] = useState(initialCourseId);
  const [workbookId, setWorkbookId] = useState(initialWorkbookId);
  const [lessonId, setLessonId] = useState(normalizeReportedLocationId(report.lessonId));
  const [dayId, setDayId] = useState(normalizeReportedLocationId(report.dayId));
  const [exerciseId, setExerciseId] = useState(normalizeReportedLocationId(report.exerciseId));
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statuses, setStatuses] = useState<Record<string, ExerciseEditorialStatus>>({});
  const registry = COURSE_WORKBOOKS[courseId] ?? {};
  const workbookIds = useMemo(() => Object.keys(registry).map(Number).sort((a, b) => a - b), [registry]);
  const lesson = workbook?.lessons.find((item) => item.id === lessonId);
  const day = lesson?.days.find((item) => item.id === dayId);
  const exerciseIndex = day?.exercises.findIndex((item) => item.id === exerciseId) ?? -1;

  useEffect(() => {
    const loader = registry[workbookId];
    if (!loader) { setWorkbook(null); setError('Livro inválido para o curso selecionado.'); return; }
    let cancelled = false;
    setLoading(true); setError(''); setWorkbook(null);
    void loader().then((module) => {
      if (cancelled) return;
      const resolved = resolveWorkbookModule(module as Record<string, unknown>, workbookId);
      setWorkbook(resolved);
      if (!resolved) setError('Não foi possível carregar o currículo local deste livro.');
    }).catch(() => { if (!cancelled) setError('Não foi possível carregar o currículo local deste livro.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [registry, workbookId]);

  useEffect(() => {
    if (!day) { setStatuses({}); return; }
    let cancelled = false;
    void getExerciseEditorialStatuses(day.exercises.map((exercise) => exercise.id))
      .then((next) => { if (!cancelled) setStatuses(next); })
      .catch(() => { if (!cancelled) setStatuses({}); });
    return () => { cancelled = true; };
  }, [day]);

  const selectCourse = (nextCourseId: string) => {
    const nextRegistry = COURSE_WORKBOOKS[nextCourseId] ?? {};
    setCourseId(nextCourseId);
    setWorkbookId(Number(Object.keys(nextRegistry)[0] ?? 1));
    setLessonId(''); setDayId(''); setExerciseId('');
  };

  const confirm = () => {
    if (!workbook || !lesson || !day || exerciseIndex < 0) {
      setError('Selecione livro, lição, dia e exercício válidos.');
      return;
    }
    onResolve({ workbook, lesson, day, exerciseIndex }, courseId);
  };

  return <div role="dialog" aria-modal="true" className="fixed inset-0 z-[1300] overflow-y-auto bg-slate-950/70 p-3 sm:p-8">
    <div className="mx-auto max-w-4xl rounded-2xl bg-white p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-wider text-blue-600">Localização manual de fallback</p><h2 className="text-xl font-black">{action === 'existing' ? 'Editar exercício existente' : 'Criar novo exercício'}</h2><p className="text-sm text-slate-600">Os dados do relatório não localizaram automaticamente o conteúdo. Selecione no currículo local.</p></div>
        <button type="button" onClick={onCancel} className="rounded-lg border px-3 py-2 font-bold">Fechar</button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm font-bold">Idioma/curso<select value={courseId} onChange={(event) => selectCourse(event.target.value)} className="mt-1 w-full rounded-lg border p-2">{Object.keys(COURSE_WORKBOOKS).map((id) => <option key={id} value={id}>{COURSE_LABELS[id] ?? id}</option>)}</select></label>
        <label className="text-sm font-bold">Livro<select value={workbookId} onChange={(event) => { setWorkbookId(Number(event.target.value)); setLessonId(''); setDayId(''); setExerciseId(''); }} className="mt-1 w-full rounded-lg border p-2">{workbookIds.map((id) => <option key={id} value={id}>Workbook {id}</option>)}</select></label>
        <label className="text-sm font-bold">Lição<select disabled={!workbook || loading} value={lessonId} onChange={(event) => { setLessonId(event.target.value); setDayId(''); setExerciseId(''); }} className="mt-1 w-full rounded-lg border p-2 disabled:bg-slate-100"><option value="">Selecione</option>{workbook?.lessons.map((item) => <option key={item.id} value={item.id}>{item.title} ({item.id})</option>)}</select></label>
        <label className="text-sm font-bold">Dia<select disabled={!lesson} value={dayId} onChange={(event) => { setDayId(event.target.value); setExerciseId(''); }} className="mt-1 w-full rounded-lg border p-2 disabled:bg-slate-100"><option value="">Selecione</option>{lesson?.days.map((item, index) => <option key={item.id} value={item.id}>Day {index + 1} ({item.id})</option>)}</select></label>
        <label className="text-sm font-bold">Exercício<select disabled={!day} value={exerciseId} onChange={(event) => setExerciseId(event.target.value)} className="mt-1 w-full rounded-lg border p-2 disabled:bg-slate-100"><option value="">Selecione</option>{day?.exercises.map((item, index) => <option key={item.id} value={item.id}>{index + 1}. {item.id} · {STATUS_LABELS[statuses[item.id] ?? 'original']}</option>)}</select></label>
      </div>
      {workbook && lesson && day && exerciseIndex >= 0 && <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-900">{COURSE_LABELS[courseId] ?? courseId} · Workbook {workbookId} · {lesson.title} · {day.id} · {exerciseId}</p>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 font-bold text-red-800">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-xl border px-4 py-2 font-bold">Cancelar</button><button type="button" onClick={confirm} disabled={loading || exerciseIndex < 0} className="rounded-xl bg-blue-700 px-4 py-2 font-black text-white disabled:opacity-40">Continuar</button></div>
    </div>
  </div>;
};
