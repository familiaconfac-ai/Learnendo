import React, { useState } from 'react';
import {
  createExerciseReport,
  EXERCISE_REPORT_CATEGORIES,
  type ExerciseReportCategory,
} from '../../services/exerciseReportsService';

interface GeneralProblemReportModalProps {
  onClose: () => void;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  language: string;
  initialWorkbookId?: number | null;
  initialLessonId?: string | null;
  initialDayId?: string | null;
}

const deviceContext = () => {
  const userAgent = navigator.userAgent;
  return {
    browser: /Edg\//.test(userAgent) ? 'Microsoft Edge' : /Chrome\//.test(userAgent) ? 'Chrome' : /Firefox\//.test(userAgent) ? 'Firefox' : /Safari\//.test(userAgent) ? 'Safari' : 'Outro',
    operatingSystem: /Windows/.test(userAgent) ? 'Windows' : /Android/.test(userAgent) ? 'Android' : /iPhone|iPad|iPod/.test(userAgent) ? 'iOS/iPadOS' : /Mac OS/.test(userAgent) ? 'macOS' : /Linux/.test(userAgent) ? 'Linux' : 'Outro',
    deviceType: /Mobi|Android|iPhone/.test(userAgent) ? 'mobile' : /iPad|Tablet/.test(userAgent) ? 'tablet' : 'desktop',
  };
};

export const GeneralProblemReportModal: React.FC<GeneralProblemReportModalProps> = ({
  onClose, userId, userName, userEmail, language, initialWorkbookId, initialLessonId, initialDayId,
}) => {
  const [workbook, setWorkbook] = useState(initialWorkbookId ? String(initialWorkbookId) : '');
  const [lesson, setLesson] = useState(initialLessonId ?? '');
  const [day, setDay] = useState(initialDayId ?? '');
  const [exercise, setExercise] = useState('');
  const [category, setCategory] = useState<ExerciseReportCategory>(EXERCISE_REPORT_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!description.trim() || submitting) return;
    setSubmitting(true);
    setStatus('');
    try {
      const device = deviceContext();
      const workbookId = Number(workbook) || 0;
      const result = await createExerciseReport({
        source: 'hamburger-menu', userId, userName, userEmail, language,
        workbookId, workbookTitle: workbookId ? `Livro ${workbookId}` : 'Não informado',
        lessonId: lesson.trim() || 'not-informed', lessonTitle: lesson.trim() || 'Não informada',
        dayId: day.trim() || 'not-informed', dayNumber: Number(day) || null,
        exerciseId: exercise.trim() || 'not-informed', exerciseType: 'general-report', exerciseMode: null,
        sessionPhase: 'outside-exercise', currentExerciseIndex: -1,
        instruction: '', displayedText: null, audioText: null, audioSource: null, options: [],
        expectedAnswer: '', acceptedAnswers: [], studentAnswer: null, attemptCount: 0,
        problemCategory: category, studentComment: description.trim(),
        route: `${window.location.pathname}${window.location.search}${window.location.hash}`,
        appVersion: import.meta.env.VITE_APP_VERSION ?? '0.0.0', ...device,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
      });
      setStatus(result.duplicate ? `Relatório já recebido (${result.reportId}).` : `Relatório enviado (${result.reportId}).`);
    } catch (error) {
      console.error('[GeneralProblemReport] submission failed:', error);
      setStatus('Não foi possível enviar agora. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center overflow-y-auto bg-black/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4" onClick={() => !submitting && onClose()}>
      <form onSubmit={submit} onClick={(event) => event.stopPropagation()} className="max-h-[min(90dvh,48rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 text-left shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-wider text-blue-600">Ajuda geral</p><h2 className="text-2xl font-black text-slate-900">Reportar problema</h2></div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="h-10 w-10 rounded-xl bg-slate-100 text-xl font-black text-slate-700">×</button>
        </div>
        <p className="mt-2 text-sm text-slate-600">Informe o contexto que souber. Apenas a descrição e a categoria são obrigatórias.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm font-bold text-slate-700">Livro<input inputMode="numeric" value={workbook} onChange={(e) => setWorkbook(e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" placeholder="Ex.: 1" /></label>
          <label className="text-sm font-bold text-slate-700">Lição<input value={lesson} onChange={(e) => setLesson(e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" placeholder="Ex.: lesson4" /></label>
          <label className="text-sm font-bold text-slate-700">Dia<input value={day} onChange={(e) => setDay(e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" placeholder="Ex.: 5" /></label>
          <label className="text-sm font-bold text-slate-700">Exercício<input value={exercise} onChange={(e) => setExercise(e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" placeholder="Se souber" /></label>
        </div>
        <label className="mt-4 block text-sm font-bold text-slate-700">Categoria<select required value={category} onChange={(e) => setCategory(e.target.value as ExerciseReportCategory)} className="mt-1 w-full rounded-xl border bg-white p-3 font-normal">{EXERCISE_REPORT_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="mt-4 block text-sm font-bold text-slate-700">Descrição<textarea required rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full resize-none rounded-xl border p-3 font-normal [overflow-wrap:anywhere]" placeholder="Conte o que aconteceu…" /></label>
        {status && <p role="status" className={`mt-3 rounded-xl p-3 text-sm font-bold ${status.startsWith('Não') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{status}</p>}
        <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" disabled={submitting} onClick={onClose} className="rounded-xl border p-3 font-black text-slate-700">Cancelar</button><button type="submit" disabled={submitting || !description.trim()} className="rounded-xl bg-blue-600 p-3 font-black text-white disabled:opacity-50">{submitting ? 'Enviando…' : 'Enviar relatório'}</button></div>
      </form>
    </div>
  );
};
