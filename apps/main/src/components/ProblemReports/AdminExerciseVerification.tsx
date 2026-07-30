import React, { useEffect, useState } from 'react';
import type { ExerciseReport, ExerciseReportStatus } from '../../services/exerciseReportsService';
import type { ReportExerciseLocation } from '../../utils/exerciseReportCurriculum';
import { PracticeSection } from '../UI';
import { applyExerciseOverride, type PublishedExerciseOverride } from '../../models/exerciseOverride';
import { getExerciseEditorialState } from '../../services/exerciseOverrideService';
import type { Exercise } from '../../types';

export type VerificationVerdict = 'fixed' | 'better-than-expected' | 'not-fixed' | 'needs-improvement';

const VERDICTS: Array<{
  value: VerificationVerdict;
  label: string;
  description: string;
  status: ExerciseReportStatus;
}> = [
  { value: 'fixed', label: 'Problema corrigido', description: 'A correção funciona como esperado.', status: 'resolved' },
  { value: 'better-than-expected', label: 'Melhor que o esperado', description: 'A solução superou o resultado esperado.', status: 'resolved' },
  { value: 'not-fixed', label: 'Problema não corrigido', description: 'O comportamento relatado ainda acontece.', status: 'reviewing' },
  { value: 'needs-improvement', label: 'Corrigido, mas pode melhorar', description: 'O problema principal foi resolvido, porém há outro ajuste necessário.', status: 'reviewing' },
];

interface AdminExerciseVerificationProps {
  report: ExerciseReport;
  location: ReportExerciseLocation;
  saving: boolean;
  error: string;
  onClose: () => void;
  onVerdict: (verdict: VerificationVerdict, note: string, status: ExerciseReportStatus) => Promise<void>;
}

export const AdminExerciseVerification: React.FC<AdminExerciseVerificationProps> = ({
  report, location, saving, error, onClose, onVerdict,
}) => {
  const [lastAttempt, setLastAttempt] = useState<{ answer: string; isCorrect: boolean } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [verdict, setVerdict] = useState<VerificationVerdict>('fixed');
  const [note, setNote] = useState('');
  const originalExercise = location.day.exercises[location.exerciseIndex];
  const [exercise, setExercise] = useState<Exercise>(originalExercise);
  useEffect(() => {
    let cancelled = false;
    setExercise(originalExercise);
    void getExerciseEditorialState(originalExercise.id).then((state) => {
      const published = state.published?.status === 'published' || state.published?.status === 'disabled'
        ? state.published as PublishedExerciseOverride
        : undefined;
      if (!cancelled) setExercise(applyExerciseOverride(originalExercise, published));
    }).catch((cause) => console.warn('[AdminExerciseVerification] Published content could not be resolved.', cause));
    return () => { cancelled = true; };
  }, [originalExercise]);
  const selectedVerdict = VERDICTS.find((item) => item.value === verdict) ?? VERDICTS[0];

  return (
    <div className="fixed inset-0 z-[1200] bg-slate-950">
      <header className="fixed inset-x-0 top-0 z-[1250] border-b border-slate-700 bg-slate-900 px-3 py-2 text-white shadow-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
          <button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-slate-600 px-3 py-2 text-sm font-black disabled:opacity-40">← Relatórios</button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold uppercase tracking-wider text-cyan-300">Verificação administrativa · sem alterar progresso</p>
            <p className="truncate text-sm font-black">{report.exerciseId} · {location.lesson.title} · {location.day.id}</p>
          </div>
          {lastAttempt && <span className={`rounded-full px-3 py-1 text-xs font-black ${lastAttempt.isCorrect ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-slate-950'}`}>{lastAttempt.isCorrect ? 'Resposta aceita' : 'Resposta rejeitada'}</span>}
          <button type="button" onClick={() => setDialogOpen(true)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black">Registrar resultado</button>
        </div>
      </header>

      <PracticeSection
        item={{ ...exercise, moduleType: `${location.lesson.id}_${location.day.id}`, lessonId: 0 } as any}
        onResult={() => undefined}
        onAttempt={({ answer, isCorrect }) => setLastAttempt({ answer, isCorrect })}
        currentIdx={location.exerciseIndex}
        totalItems={location.day.exercises.length}
        lessonId={0}
        currentLanguage={report.language}
        onBack={onClose}
        actionLocked={saving}
        fullScreen
        viewportTopOffset={78}
      />

      {dialogOpen && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center overflow-y-auto bg-black/70 p-4" onClick={() => !saving && setDialogOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="verification-result-title" className="w-full max-w-lg rounded-3xl bg-white p-5 text-slate-900 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h2 id="verification-result-title" className="text-xl font-black">Resultado da verificação</h2>
            <p className="mt-1 text-sm text-slate-600">O resultado será salvo neste relatório e atualizará seu status.</p>
            <div className="mt-4 grid gap-2">
              {VERDICTS.map((item) => (
                <label key={item.value} className={`cursor-pointer rounded-2xl border p-3 ${verdict === item.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                  <input type="radio" name="verification-verdict" value={item.value} checked={verdict === item.value} onChange={() => setVerdict(item.value)} className="mr-2" />
                  <span className="font-black">{item.label}</span>
                  <span className="mt-1 block pl-6 text-xs text-slate-600">{item.description}</span>
                </label>
              ))}
            </div>
            <label className="mt-4 block text-sm font-bold">Observação da verificação
              <textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 min-h-24 w-full rounded-xl border p-3 font-normal" placeholder="Descreva o que você testou ou o que ainda precisa melhorar." />
            </label>
            {lastAttempt && <p className="mt-3 rounded-xl bg-slate-100 p-3 text-xs"><strong>Última resposta testada:</strong> {lastAttempt.answer || '—'} · {lastAttempt.isCorrect ? 'aceita' : 'rejeitada'}</p>}
            {error && <p role="alert" className="mt-3 rounded-xl bg-red-100 p-3 text-sm font-bold text-red-800">{error}</p>}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" disabled={saving} onClick={() => setDialogOpen(false)} className="rounded-xl border p-3 font-black disabled:opacity-40">Cancelar</button>
              <button type="button" disabled={saving} onClick={() => void onVerdict(verdict, [note.trim(), lastAttempt ? `Última resposta: ${lastAttempt.answer || '—'} (${lastAttempt.isCorrect ? 'aceita' : 'rejeitada'}).` : ''].filter(Boolean).join(' '), selectedVerdict.status)} className="rounded-xl bg-blue-600 p-3 font-black text-white disabled:opacity-40">{saving ? 'Salvando…' : 'Salvar resultado'}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
