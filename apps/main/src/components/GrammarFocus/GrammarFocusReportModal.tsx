import React, { useState } from 'react';
import {
  GRAMMAR_FOCUS_REPORT_CATEGORIES,
  type ExerciseReportCategory,
} from '../../services/exerciseReportsService';
import { createGrammarFocusReport } from '../../services/grammarFocusReportService';

interface GrammarFocusReportModalProps {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  language: string;
  workbookId: number;
  workbookTitle: string;
  lessonId: string;
  lessonTitle: string;
  grammarFocusTitle: string;
  onClose: () => void;
}

export const GrammarFocusReportModal: React.FC<GrammarFocusReportModalProps> = (props) => {
  const [category, setCategory] = useState<ExerciseReportCategory>(GRAMMAR_FOCUS_REPORT_CATEGORIES[0]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!comment.trim() || submitting) return;
    setSubmitting(true);
    setStatus('');
    try {
      const result = await createGrammarFocusReport({
        reporterRole: 'teacher',
        userId: props.userId,
        userName: props.userName,
        userEmail: props.userEmail,
        language: props.language,
        workbookId: props.workbookId,
        workbookTitle: props.workbookTitle,
        lessonId: props.lessonId,
        lessonTitle: props.lessonTitle,
        grammarFocusTitle: props.grammarFocusTitle,
        category,
        comment,
      });
      setStatus(result.duplicate ? 'This report was already received.' : 'Report sent for administrative review.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not send the report right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/60 p-3 sm:items-center sm:p-4" onClick={() => !submitting && props.onClose()}>
      <form onSubmit={submit} onClick={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-wider text-blue-600">Grammar Focus</p><h2 className="text-2xl font-black text-slate-900">Report Grammar Focus</h2></div>
          <button type="button" onClick={props.onClose} aria-label="Close" className="h-10 w-10 rounded-xl bg-slate-100 text-xl font-black text-slate-700">×</button>
        </div>
        <p className="mt-2 text-sm text-slate-600">Workbook {props.workbookId} · {props.lessonTitle}</p>
        <label className="mt-4 block text-sm font-bold text-slate-700">Type<select value={category} onChange={(event) => setCategory(event.target.value as ExerciseReportCategory)} className="mt-1 w-full rounded-xl border bg-white p-3 font-normal">{GRAMMAR_FOCUS_REPORT_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="mt-4 block text-sm font-bold text-slate-700">Comment / Description<textarea required rows={4} maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)} className="mt-1 w-full resize-none rounded-xl border p-3 font-normal" /></label>
        {status && <p role="status" className="mt-3 rounded-xl bg-slate-100 p-3 text-sm font-bold text-slate-700">{status}</p>}
        <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" disabled={submitting} onClick={props.onClose} className="rounded-xl border p-3 font-black text-slate-700">Cancel</button><button type="submit" disabled={submitting || !comment.trim()} className="rounded-xl bg-blue-600 p-3 font-black text-white disabled:opacity-50">{submitting ? 'Sending…' : 'Send report'}</button></div>
      </form>
    </div>
  );
};
