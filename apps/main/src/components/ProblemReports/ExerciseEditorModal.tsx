import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Exercise } from '../../types';
import type { ExerciseReport } from '../../services/exerciseReportsService';
import type { ReportExerciseLocation } from '../../utils/exerciseReportCurriculum';
import {
  getExerciseEditorialState, listExerciseVersions, publishExerciseOverride,
  removePublishedExerciseOverride, restoreExerciseVersion, saveExerciseDraft,
} from '../../services/exerciseOverrideService';
import {
  applyExerciseOverride, EXERCISE_OPTION_LIMITS, normalizeExerciseWorkbookId, parseExerciseOptions,
  validateExerciseOverride, type ExerciseEditorialDocument, type ExerciseIdentity, type ExerciseOverrideFields,
} from '../../models/exerciseOverride';
import { normalizeExerciseChangeReason, validateExerciseChangeReason } from '../../models/exerciseChangeReason';
import { normalizeAnswer } from '../../utils/answerNormalization';
import { describeExerciseSpeechLocale, resolveExerciseSpeechLocale } from '../../utils/exerciseSpeechLocale';
import { speak as speakExerciseText } from '../../services/ttsService';
import { isActiveExerciseReport, listRelatedExerciseReports } from '../../services/exerciseReportsService';
import { describeEditorialFirebaseError, logEditorialFirebaseError } from '../../services/editorialFirebaseError';

interface Props {
  report?: ExerciseReport | null;
  location: ReportExerciseLocation;
  language: string;
  reviewer: { uid: string; name: string };
  onClose: () => void;
  onDraftSaved?: (reopened: boolean) => Promise<void> | void;
  onPublished?: (version: number, resolveReports: false | 'current' | 'all') => Promise<void> | void;
}

const arrayText = (items?: string[]) => (items ?? []).join('\n');
const toArray = (value: string) => value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
const REPORT_STATUS_LABELS = { new: 'Nova', reviewing: 'Em análise', resolved: 'Resolvida', dismissed: 'Descartada' } as const;
const REPORT_STATUS_STYLE = {
  new: 'bg-blue-100 text-blue-800', reviewing: 'bg-amber-100 text-amber-800',
  resolved: 'bg-emerald-100 text-emerald-800', dismissed: 'bg-slate-200 text-slate-700',
} as const;
const stamp = (value: any) => value?.toDate?.().toLocaleString('pt-BR') ?? '—';

export const ExerciseEditorModal: React.FC<Props> = ({ report, location, language, reviewer, onClose, onDraftSaved, onPublished }) => {
  const original = location.day.exercises[location.exerciseIndex];
  const identity: ExerciseIdentity = {
    exerciseId: original.id, workbookId: normalizeExerciseWorkbookId(location.workbook.id), lessonId: location.lesson.id,
    dayId: location.day.id, language, exerciseType: original.type,
  };
  const [fields, setFields] = useState<ExerciseOverrideFields>({});
  const [optionsText, setOptionsText] = useState('');
  const [state, setState] = useState<{ draft: ExerciseEditorialDocument | null; published: ExerciseEditorialDocument | null }>({ draft: null, published: null });
  const [versions, setVersions] = useState<ExerciseEditorialDocument[]>([]);
  const [changeReason, setChangeReason] = useState('');
  const [changeReasonError, setChangeReasonError] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const [testAnswer, setTestAnswer] = useState('');
  const [testResult, setTestResult] = useState<'correct' | 'incorrect' | ''>('');
  const [actionLabel, setActionLabel] = useState('');
  const [relatedReports, setRelatedReports] = useState<ExerciseReport[]>([]);
  const changeReasonRef = useRef<HTMLTextAreaElement | null>(null);
  const controlsBusy = saving;

  const hydrate = async (preserveMessages = false) => {
    setLoading(true);
    if (!preserveMessages) setError('');
    try {
      const [next, history, related] = await Promise.all([getExerciseEditorialState(original.id), listExerciseVersions(original.id), listRelatedExerciseReports(original.id)]);
      setState(next); setVersions(history);
      setRelatedReports(related);
      const activePublished = next.published?.status === 'published' || next.published?.status === 'disabled' ? next.published : null;
      const preferred = next.draft ?? activePublished;
      setFields(preferred?.override ?? {});
      setOptionsText(arrayText(preferred?.override.options ?? original.options));
      setChangeReason(next.draft?.changeReason ?? '');
      setChangeReasonError('');
      setAdminNote(preferred?.adminNote ?? '');
      setDirty(false);
    } catch (cause) {
      logEditorialFirebaseError('Falha ao carregar editor', cause);
      setError(describeEditorialFirebaseError(cause, 'load'));
    }
    finally { setLoading(false); }
  };
  useEffect(() => { void hydrate(); }, [original.id]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener('beforeunload', beforeUnload); return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  const update = <K extends keyof ExerciseOverrideFields>(key: K, value: ExerciseOverrideFields[K]) => {
    setFields((current) => ({ ...current, [key]: value })); setDirty(true); setNotice('');
  };
  const viewSource = (documentValue: ExerciseEditorialDocument | null) => {
    if (dirty && !window.confirm('Descartar as alterações não salvas e trocar a versão visualizada?')) return;
    setFields(documentValue?.override ?? {});
    setOptionsText(arrayText(documentValue?.override.options ?? original.options));
    setChangeReason(documentValue?.status === 'draft' ? documentValue.changeReason : '');
    setChangeReasonError('');
    setAdminNote(documentValue?.adminNote ?? ''); setPreview(true); setDirty(false);
  };
  const effective = useMemo(() => applyExerciseOverride(original, {
    ...identity, status: 'published', version: state.published?.version ?? 0, override: fields,
  }), [original, fields, state.published?.version]);
  const speechLocale = resolveExerciseSpeechLocale(effective, identity.language, typeof navigator === 'undefined' ? undefined : navigator.language);
  const speechLocaleDescription = describeExerciseSpeechLocale(speechLocale);
  const baseVersion = state.published?.version ?? 0;

  const requireValidChangeReason = (status: 'published' | 'disabled'): string | null => {
    const trimmed = normalizeExerciseChangeReason(changeReason);
    const message = validateExerciseChangeReason(trimmed, status === 'disabled' ? 'disable' : 'publish');
    if (message) {
      setChangeReasonError(message);
      setError(message);
      window.requestAnimationFrame(() => {
        changeReasonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        changeReasonRef.current?.focus({ preventScroll: true });
      });
      return null;
    }
    setChangeReason(trimmed);
    setChangeReasonError('');
    return trimmed;
  };

  const saveDraft = async () => {
    const reopening = report?.status === 'dismissed';
    if (reopening && !window.confirm('Esta denúncia está descartada. Deseja reabri-la e salvar o exercício como rascunho?')) return;
    setSaving(true); setActionLabel('Salvando rascunho…'); setError(''); setNotice('');
    try {
      const draftWarnings = validateExerciseOverride(original, identity, fields);
      const draftAdminNote = reopening
        ? [adminNote.trim(), `[${new Date().toLocaleString('pt-BR')}] Denúncia reaberta para edição em rascunho.`].filter(Boolean).join('\n')
        : adminNote;
      const revision = await saveExerciseDraft({ original, identity, fields, changeReason, adminNote: draftAdminNote, updatedBy: reviewer.uid, baseVersion, relatedReportId: report?.reportId, expectedDraftRevision: state.draft?.draftRevision ?? 0 });
      try {
        await onDraftSaved?.(reopening);
      } catch (cause) {
        logEditorialFirebaseError('Rascunho salvo, mas atualização da denúncia falhou', cause);
        setError(`O rascunho foi salvo, mas o status da denúncia não foi atualizado. ${describeEditorialFirebaseError(cause, 'resolve')}`);
        setDirty(false);
        await hydrate(true);
        return;
      }
      setNotice(draftWarnings.length
        ? `Rascunho ${identity.exerciseId} (revisão ${revision}) confirmado no Firestore, mas ainda não pode ser publicado:\n${draftWarnings.join('\n')}`
        : `Rascunho ${identity.exerciseId} (revisão ${revision}) confirmado no Firestore. Ele não será exibido aos alunos até a publicação.`);
      setDirty(false); await hydrate(true);
    } catch (cause) {
      logEditorialFirebaseError('Falha ao salvar rascunho', cause);
      setError(describeEditorialFirebaseError(cause, 'draft'));
    } finally { setSaving(false); setActionLabel(''); }
  };
  const publish = async (resolveReports: false | 'current' | 'all', status: 'published' | 'disabled' = 'published') => {
    const validatedChangeReason = requireValidChangeReason(status);
    if (!validatedChangeReason) return;
    if (!window.confirm(status === 'disabled' ? 'Desativar este exercício para os alunos?' : 'Publicar esta correção agora?')) return;
    setSaving(true); setActionLabel(status === 'disabled' ? 'Desativando exercício…' : 'Publicando correção…'); setError(''); setNotice('');
    let version: number;
    try {
      version = await publishExerciseOverride({ original, identity, fields, changeReason: validatedChangeReason, adminNote, updatedBy: reviewer.uid, baseVersion, relatedReportId: report?.reportId, status, expectedDraftRevision: state.draft?.draftRevision ?? 0 });
      setDirty(false);
      setNotice(status === 'disabled' ? `Exercício desativado com sucesso na versão ${version}.` : `Correção publicada com sucesso na versão ${version}.`);
    } catch (cause) {
      logEditorialFirebaseError('Falha ao publicar correção', cause);
      setError(describeEditorialFirebaseError(cause, 'publish'));
      setSaving(false); setActionLabel('');
      return;
    }

    if (onPublished) {
      setActionLabel(resolveReports ? 'Correção publicada. Resolvendo relatório…' : 'Correção publicada. Atualizando relatório…');
      try {
        await onPublished(version, resolveReports);
        setNotice(resolveReports
          ? `Correção publicada com sucesso na versão ${version} e relatório(s) resolvido(s).`
          : `Correção publicada com sucesso na versão ${version}. A denúncia permanece em análise.`);
      } catch (cause) {
        logEditorialFirebaseError('Publicação concluída, mas resolução do relatório falhou', cause);
        setError(`A correção foi publicada com sucesso na versão ${version}, mas o status da denúncia não foi atualizado. ${describeEditorialFirebaseError(cause, 'resolve')}`);
      }
    }
    await hydrate(true);
    setSaving(false); setActionLabel('');
  };
  const close = () => {
    if (dirty && !window.confirm('Descartar as alterações não salvas?')) return;
    onClose();
  };
  const test = () => {
    const candidates = [effective.correctValue, ...(effective.acceptedAnswers ?? [])].map((answer) => normalizeAnswer(answer));
    setTestResult(candidates.includes(normalizeAnswer(testAnswer)) ? 'correct' : 'incorrect');
  };
  if (loading) return <div className="fixed inset-0 z-[1200] grid place-items-center bg-black/60 text-lg font-black text-white">Carregando editor…</div>;
  return <div className="fixed inset-0 z-[1200] overflow-y-auto bg-black/60 p-2 sm:p-6" onClick={close}>
    <div className="mx-auto max-w-6xl rounded-3xl bg-slate-50 shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <header className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-3xl border-b bg-white p-4 sm:p-6">
        <div><p className="text-xs font-black uppercase tracking-[.2em] text-blue-600">Editar exercício</p><h2 className="text-xl font-black sm:text-2xl">Livro {identity.workbookId} · {location.lesson.title} · {location.day.id}</h2><p className="break-all text-xs text-slate-500">Exercise ID: {identity.exerciseId}</p></div>
        <button onClick={close} disabled={saving} className="rounded-xl bg-slate-100 px-4 py-2 font-black">×</button>
      </header>
      <main className="grid gap-5 p-4 pb-40 lg:grid-cols-[minmax(0,1fr)_360px] sm:p-6 sm:pb-32">
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2 text-xs font-black">{report && <span className={`rounded-full px-3 py-1 ${REPORT_STATUS_STYLE[report.status]}`}>Denúncia: {REPORT_STATUS_LABELS[report.status]}</span>}<span className={`rounded-full px-3 py-1 ${state.draft ? 'bg-amber-100 text-amber-800' : state.published?.status === 'disabled' ? 'bg-red-100 text-red-800' : state.published?.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>Status editorial: {state.draft ? 'Rascunho' : state.published?.status === 'disabled' ? 'Desativado' : state.published?.status === 'published' ? 'Publicado' : 'Conteúdo original'}</span></div>
          <div className="flex flex-wrap gap-2"><button onClick={() => viewSource(null)} className="rounded-xl border px-3 py-2 text-xs font-black">Visualizar exercício original</button>{state.published && state.published.status !== 'archived' && <button onClick={() => viewSource(state.published)} className="rounded-xl border px-3 py-2 text-xs font-black">Visualizar versão publicada</button>}{state.draft && <button onClick={() => viewSource(state.draft)} className="rounded-xl border px-3 py-2 text-xs font-black">Visualizar rascunho</button>}</div>
          {error && <p role="alert" className="whitespace-pre-line rounded-xl bg-red-100 p-3 font-bold text-red-800">{error}</p>}{notice && <p role="status" className="rounded-xl bg-emerald-100 p-3 font-bold text-emerald-800">{notice}</p>}
          <Section title="1 — Identificação"><div className="grid gap-3 sm:grid-cols-2">{Object.entries({ Livro: identity.workbookId, Lição: identity.lessonId, Dia: identity.dayId, Idioma: identity.language, Tipo: identity.exerciseType, ID: identity.exerciseId }).map(([label, content]) => <label key={label} className="text-xs font-bold text-slate-500">{label}<input readOnly value={content} className="mt-1 w-full rounded-xl border bg-slate-100 p-3 text-slate-700" /></label>)}</div></Section>
          <Section title="2 — Conteúdo">
            <Field label="Instrução" value={fields.instruction ?? original.instruction} onChange={(value) => update('instruction', value)} />
            <Field label="Texto exibido ao aluno (aparece no corpo do exercício)" area value={fields.displayValue ?? original.displayValue ?? ''} onChange={(value) => update('displayValue', value)} />
            <Field label={original.type === 'speaking' ? 'Resposta de referência' : 'Resposta principal'} value={fields.correctValue ?? original.correctValue} onChange={(value) => update('correctValue', value)} />
            <Field label="Respostas alternativas aceitas (uma por linha)" area value={arrayText(fields.acceptedAnswers ?? original.acceptedAnswers)} onChange={(value) => update('acceptedAnswers', toArray(value))} />
            <Field label="Perguntas alternativas aceitas (uma por linha)" area value={arrayText(fields.acceptedQuestions ?? original.acceptedQuestions)} onChange={(value) => update('acceptedQuestions', toArray(value))} />
            {original.type === 'multiple-choice' && <label className="block text-sm font-bold text-slate-700">Alternativas (uma por linha)<textarea aria-label="Alternativas (uma por linha)" value={optionsText} onChange={(event) => { const value = event.target.value; setOptionsText(value); update('options', parseExerciseOptions(value)); }} className="mt-1 min-h-32 max-h-80 w-full resize-y rounded-xl border p-3 font-normal" /><span className="mt-1 block text-xs font-normal text-slate-500">De {EXERCISE_OPTION_LIMITS.min} a {EXERCISE_OPTION_LIMITS.max} alternativas; uma por linha.</span></label>}
            <Field label="Tradução" area value={fields.translation ?? original.translation ?? ''} onChange={(value) => update('translation', value)} />
            <Field label="Explicação" area value={fields.explanation ?? original.explanation ?? ''} onChange={(value) => update('explanation', value)} />
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Feedback correto" value={fields.feedbackCorrect ?? original.feedbackCorrect ?? ''} onChange={(value) => update('feedbackCorrect', value)} /><Field label="Feedback incorreto" value={fields.feedbackIncorrect ?? original.feedbackIncorrect ?? ''} onChange={(value) => update('feedbackIncorrect', value)} /></div>
            <p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-900">Normalizações globais preservadas: maiúsculas/minúsculas, espaços, pontuação terminal e apóstrofos são tratados pelo validador central atual.</p>
          </Section>
          <Section title="3 — Mídia">
            {effective.imageUrl && <img src={effective.imageUrl} alt={effective.imageAlt || ''} className="mx-auto max-h-[260px] w-full max-w-full rounded-xl object-contain sm:max-h-[360px]" />}
            <Field label="URL HTTPS da imagem" value={fields.imageUrl ?? original.imageUrl ?? ''} onChange={(value) => update('imageUrl', value)} />
            <Field label="Texto alternativo da imagem" value={fields.imageAlt ?? original.imageAlt ?? ''} onChange={(value) => update('imageAlt', value)} />
            <Field label="Texto do áudio / TTS" value={fields.audioValue ?? original.audioValue} onChange={(value) => update('audioValue', value)} />
            <Field label="Áudio antes da resposta" value={fields.audioValueBeforeAnswer ?? original.audioValueBeforeAnswer ?? ''} onChange={(value) => update('audioValueBeforeAnswer', value)} />
            <Field label="Frase completa depois da resposta" value={fields.fullSentenceAfterAnswer ?? original.fullSentenceAfterAnswer ?? ''} onChange={(value) => update('fullSentenceAfterAnswer', value)} />
            <p className="rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-900">Idioma da voz: {speechLocaleDescription}</p>
            <div className="flex gap-2"><button disabled={!effective.audioValue} onClick={() => speakExerciseText(effective.audioValue, speechLocale)} className="rounded-xl border px-4 py-2 font-bold disabled:opacity-40">▶ Reproduzir áudio</button>{effective.audioValue && <button onClick={() => update('audioValue', '')} className="rounded-xl border px-4 py-2 font-bold">Remover texto do áudio</button>}</div>
          </Section>
          <Section title="4 — Administração">
            <label className="block scroll-mt-28 text-sm font-bold text-slate-700">
              Motivo da alteração <span className="text-red-600">*</span>
              <textarea
                ref={changeReasonRef}
                value={changeReason}
                aria-invalid={Boolean(changeReasonError)}
                aria-describedby="change-reason-help change-reason-error"
                placeholder="Ex.: Adicionada uma resposta alternativa correta que não estava sendo aceita."
                onChange={(event) => {
                  setChangeReason(event.target.value);
                  setDirty(true);
                  if (event.target.value.trim().length >= 5) setChangeReasonError('');
                }}
                className={`mt-1 min-h-28 w-full rounded-xl border p-3 font-normal outline-none transition ${changeReasonError ? 'border-red-500 bg-red-50 ring-2 ring-red-200' : 'focus:border-blue-500 focus:ring-2 focus:ring-blue-100'}`}
              />
            </label>
            <p id="change-reason-help" className="text-xs text-slate-500">Explique brevemente o que foi corrigido e por quê. Obrigatório ao publicar, desativar ou reativar; opcional no rascunho.</p>
            {changeReasonError && <p id="change-reason-error" role="alert" className="rounded-lg bg-red-100 p-2 text-sm font-bold text-red-800">{changeReasonError}</p>}
            {report?.studentComment?.trim() && <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950"><p className="font-black">Relatório relacionado:</p><p className="mt-1 whitespace-pre-line">“{report.studentComment.trim()}”</p><button type="button" onClick={() => { setChangeReason(report.studentComment.trim()); setChangeReasonError(''); setDirty(true); }} className="mt-2 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-black text-blue-800">Usar descrição do relatório como motivo</button></div>}
            <Field label="Observação administrativa (opcional)" area value={adminNote} onChange={(value) => { setAdminNote(value); setDirty(true); }} />
            <p className="text-sm text-slate-500">Status atual: {state.published?.status ?? 'conteúdo original'} · versão base: {baseVersion} · última atualização: {stamp(state.published?.updatedAt)}</p>
          </Section>
        </div>
        <aside className="space-y-5">
          <Section title="Relatórios relacionados"><p className="text-sm text-slate-600">{relatedReports.length} relatório(s), {relatedReports.filter(isActiveExerciseReport).length} aberto(s).</p>{relatedReports.slice(0, 8).map((item) => <p key={item.reportId} className="rounded-lg bg-slate-50 p-2 text-xs"><span className={`mr-1 rounded-full px-2 py-1 font-black ${REPORT_STATUS_STYLE[item.status]}`}>{REPORT_STATUS_LABELS[item.status]}</span> {item.problemCategory} · {item.studentComment || 'sem comentário'}</p>)}</Section>
          <Section title="Pré-visualização e teste"><button onClick={() => setPreview((value) => !value)} className="w-full rounded-xl bg-violet-600 p-3 font-black text-white">{preview ? 'Ocultar prévia' : 'Pré-visualizar'}</button>{preview && <div className="mt-3 rounded-2xl bg-slate-900 p-4 text-white"><p className="text-sm font-bold text-cyan-300">{effective.instruction}</p>{effective.imageUrl && <img src={effective.imageUrl} alt={effective.imageAlt || ''} className="my-3 max-h-48 w-full object-contain" />}<p className="my-4 text-lg font-black">{effective.displayValue}</p>{effective.options?.map((option) => <div key={option} className="my-2 rounded-xl bg-slate-700 p-3">{option}</div>)}</div>}<div className="mt-3 flex gap-2"><input aria-label="Resposta de teste" value={testAnswer} onChange={(event) => setTestAnswer(event.target.value)} className="min-w-0 flex-1 rounded-xl border p-3" /><button onClick={test} className="rounded-xl bg-blue-600 px-4 font-black text-white">Testar</button></div>{testResult && <p className={`mt-2 rounded-xl p-3 font-black ${testResult === 'correct' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{testResult === 'correct' ? effective.feedbackCorrect || 'Resposta correta.' : effective.feedbackIncorrect || 'Resposta incorreta.'}</p>}</Section>
          <Section title="Histórico">{versions.length === 0 ? <p className="text-sm text-slate-500">Nenhuma versão publicada.</p> : versions.map((version) => <div key={version.version} className="mb-2 rounded-xl border p-3 text-sm"><p className="font-black">Versão {version.version} · {version.status}</p><p className="text-slate-500">{version.changeReason}</p><button disabled={saving} onClick={async () => { if (!window.confirm(`Restaurar a versão ${version.version} como uma nova publicação?`)) return; setSaving(true); try { await restoreExerciseVersion(original, version, reviewer.uid); await hydrate(); setNotice('Versão restaurada como nova publicação.'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao restaurar.'); } finally { setSaving(false); } }} className="mt-2 font-bold text-blue-700">Restaurar</button></div>)}</Section>
          {state.published && state.published.status !== 'archived' && <button disabled={saving} onClick={async () => { if (!window.confirm('Remover a correção publicada e voltar ao exercício original? O histórico será preservado.')) return; const why = window.prompt('Motivo da restauração do original (mínimo 5 caracteres):')?.trim(); if (!why || why.length < 5) { setError('Informe um motivo com pelo menos 5 caracteres para voltar ao conteúdo original.'); return; } setSaving(true); try { await removePublishedExerciseOverride(original.id, reviewer.uid, why); await hydrate(); setNotice('Override removido. O conteúdo local voltou a ser usado.'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao remover override.'); } finally { setSaving(false); } }} className="w-full rounded-xl border border-red-300 p-3 font-black text-red-700">Voltar ao exercício original</button>}
        </aside>
      </main>
      <footer className="sticky bottom-0 z-20 flex flex-wrap justify-end gap-2 rounded-b-3xl border-t bg-white p-4 shadow-[0_-8px_24px_rgba(15,23,42,0.12)]">
        {(error || notice || actionLabel) && <div className={`mb-1 w-full rounded-xl p-3 text-sm font-bold ${error ? 'bg-red-100 text-red-800' : notice ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`} role={error ? 'alert' : 'status'}>{error || notice || actionLabel}</div>}
        <button type="button" onClick={close} disabled={saving} className="rounded-xl border px-4 py-3 font-bold disabled:opacity-40">Cancelar</button>
        <button type="button" onClick={saveDraft} disabled={controlsBusy} className="rounded-xl bg-amber-500 px-4 py-3 font-black text-white disabled:opacity-40">{saving && actionLabel.includes('rascunho') ? 'Salvando…' : 'Salvar rascunho'}</button>
        <button type="button" onClick={() => void publish(false, state.published?.status === 'disabled' ? 'published' : 'disabled')} disabled={controlsBusy} className="rounded-xl border border-red-300 px-4 py-3 font-black text-red-700 disabled:opacity-40">{state.published?.status === 'disabled' ? 'Reativar' : 'Desativar'}</button>
        <button type="button" onClick={() => void publish(false)} disabled={controlsBusy} className="rounded-xl bg-emerald-600 px-4 py-3 font-black text-white disabled:opacity-40">{saving && actionLabel.includes('Publicando') ? 'Publicando…' : 'Publicar correção'}</button>
        {report && <button type="button" onClick={() => void publish('current')} disabled={controlsBusy} className="rounded-xl bg-blue-700 px-4 py-3 font-black text-white disabled:opacity-40">Publicar e resolver atual</button>}
        {relatedReports.filter(isActiveExerciseReport).length > 1 && <button type="button" onClick={() => void publish('all')} disabled={controlsBusy} className="rounded-xl bg-violet-700 px-4 py-3 font-black text-white disabled:opacity-40">Publicar e resolver todos</button>}
      </footer>
    </div>
  </div>;
};

const Section: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => <section className="rounded-2xl bg-white p-4 shadow-sm"><h3 className="mb-4 font-black text-slate-900">{title}</h3><div className="space-y-3">{children}</div></section>;
const Field: React.FC<{ label: string; value: string; area?: boolean; onChange: (value: string) => void }> = ({ label, value, area, onChange }) => <label className="block text-sm font-bold text-slate-700">{label}{area ? <textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-24 w-full rounded-xl border p-3 font-normal" /> : <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" />}</label>;
