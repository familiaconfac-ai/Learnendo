import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Exercise } from '../../types';
import type { ExerciseReport } from '../../services/exerciseReportsService';
import type { ReportExerciseLocation } from '../../utils/exerciseReportCurriculum';
import {
  getExerciseEditorialState, listExerciseVersions, publishExerciseOverride,
  removePublishedExerciseOverride, restoreExerciseVersion, saveExerciseDraft,
} from '../../services/exerciseOverrideService';
import { uploadExerciseImage } from '../../services/exerciseImageService';
import { applyExerciseOverride, type ExerciseEditorialDocument, type ExerciseIdentity, type ExerciseOverrideFields } from '../../models/exerciseOverride';
import { normalizeAnswer } from '../../utils/answerNormalization';
import { isActiveExerciseReport, listRelatedExerciseReports } from '../../services/exerciseReportsService';
import { assertEditorialAdminAccess } from '../../services/editorialAccessService';
import { describeEditorialFirebaseError, logEditorialFirebaseError } from '../../services/editorialFirebaseError';

interface Props {
  report?: ExerciseReport | null;
  location: ReportExerciseLocation;
  language: string;
  reviewer: { uid: string; name: string };
  onClose: () => void;
  onPublished?: (version: number, resolveReports: false | 'current' | 'all') => Promise<void> | void;
}

const arrayText = (items?: string[]) => (items ?? []).join('\n');
const toArray = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);
const stamp = (value: any) => value?.toDate?.().toLocaleString('pt-BR') ?? '—';
type UploadPhase = 'idle' | 'selected' | 'uploading' | 'completed' | 'canceled' | 'error';
interface ImageUploadState {
  phase: UploadPhase;
  fileName: string;
  fileSize: number;
  width?: number;
  height?: number;
  previewUrl: string;
  progress: number;
  imagePath?: string;
  message: string;
}
const emptyImageUploadState = (): ImageUploadState => ({
  phase: 'idle', fileName: '', fileSize: 0, previewUrl: '', progress: 0, message: '',
});
const formatFileSize = (bytes: number) => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

function readImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('Não foi possível ler as dimensões da imagem.'));
    image.src = url;
  });
}

export const ExerciseEditorModal: React.FC<Props> = ({ report, location, language, reviewer, onClose, onPublished }) => {
  const original = location.day.exercises[location.exerciseIndex];
  const identity: ExerciseIdentity = {
    exerciseId: original.id, workbookId: location.workbook.id, lessonId: location.lesson.id,
    dayId: location.day.id, language, exerciseType: original.type,
  };
  const [fields, setFields] = useState<ExerciseOverrideFields>({});
  const [state, setState] = useState<{ draft: ExerciseEditorialDocument | null; published: ExerciseEditorialDocument | null }>({ draft: null, published: null });
  const [versions, setVersions] = useState<ExerciseEditorialDocument[]>([]);
  const [reason, setReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const [testAnswer, setTestAnswer] = useState('');
  const [testResult, setTestResult] = useState<'correct' | 'incorrect' | ''>('');
  const [imageUpload, setImageUpload] = useState<ImageUploadState>(emptyImageUploadState);
  const [actionLabel, setActionLabel] = useState('');
  const [relatedReports, setRelatedReports] = useState<ExerciseReport[]>([]);
  const uploadTask = useRef<ReturnType<typeof uploadExerciseImage>['task'] | null>(null);
  const previewUrlRef = useRef('');
  const isUploading = imageUpload.phase === 'uploading';
  const controlsBusy = saving || isUploading;

  const hydrate = async (preserveMessages = false) => {
    setLoading(true);
    if (!preserveMessages) setError('');
    try {
      const [next, history, related] = await Promise.all([getExerciseEditorialState(original.id), listExerciseVersions(original.id), listRelatedExerciseReports(original.id)]);
      setState(next); setVersions(history);
      setRelatedReports(related);
      const activePublished = next.published?.status === 'published' || next.published?.status === 'disabled' ? next.published : null;
      const preferred = next.draft ?? activePublished;
      setFields(preferred?.override ?? {}); setReason(preferred?.changeReason ?? ''); setAdminNote(preferred?.adminNote ?? '');
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
  useEffect(() => () => {
    uploadTask.current?.cancel();
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const update = <K extends keyof ExerciseOverrideFields>(key: K, value: ExerciseOverrideFields[K]) => {
    setFields((current) => ({ ...current, [key]: value })); setDirty(true); setNotice('');
  };
  const viewSource = (documentValue: ExerciseEditorialDocument | null) => {
    if (dirty && !window.confirm('Descartar as alterações não salvas e trocar a versão visualizada?')) return;
    setFields(documentValue?.override ?? {}); setReason(documentValue?.changeReason ?? '');
    setAdminNote(documentValue?.adminNote ?? ''); setPreview(true); setDirty(false);
  };
  const effective = useMemo(() => applyExerciseOverride(original, {
    ...identity, status: 'published', version: state.published?.version ?? 0, override: fields,
  }), [original, fields, state.published?.version]);
  const baseVersion = state.published?.version ?? 0;

  const blockWhileUploading = (): boolean => {
    if (!isUploading) return false;
    setError('Aguarde o envio da imagem antes de salvar ou publicar. Você também pode cancelar o upload.');
    return true;
  };

  const saveDraft = async () => {
    if (blockWhileUploading()) return;
    setSaving(true); setActionLabel('Salvando rascunho…'); setError(''); setNotice('');
    try {
      await saveExerciseDraft({ original, identity, fields, changeReason: reason, adminNote, updatedBy: reviewer.uid, baseVersion, relatedReportId: report?.reportId, expectedDraftRevision: state.draft?.draftRevision ?? 0 });
      setNotice('Rascunho salvo com sucesso. Ele não será exibido aos alunos.'); setDirty(false); await hydrate(true);
    } catch (cause) {
      logEditorialFirebaseError('Falha ao salvar rascunho', cause);
      setError(describeEditorialFirebaseError(cause, 'draft'));
    } finally { setSaving(false); setActionLabel(''); }
  };
  const publish = async (resolveReports: false | 'current' | 'all', status: 'published' | 'disabled' = 'published') => {
    if (blockWhileUploading()) return;
    if (!window.confirm(status === 'disabled' ? 'Desativar este exercício para os alunos?' : 'Publicar esta correção agora?')) return;
    setSaving(true); setActionLabel(status === 'disabled' ? 'Desativando exercício…' : 'Publicando correção…'); setError(''); setNotice('');
    let version: number;
    try {
      version = await publishExerciseOverride({ original, identity, fields, changeReason: reason, adminNote, updatedBy: reviewer.uid, baseVersion, relatedReportId: report?.reportId, status, expectedDraftRevision: state.draft?.draftRevision ?? 0 });
      setDirty(false);
      setNotice(status === 'disabled' ? `Exercício desativado com sucesso na versão ${version}.` : `Correção publicada com sucesso na versão ${version}.`);
    } catch (cause) {
      logEditorialFirebaseError('Falha ao publicar correção', cause);
      setError(describeEditorialFirebaseError(cause, 'publish'));
      setSaving(false); setActionLabel('');
      return;
    }

    if (resolveReports) {
      setActionLabel('Correção publicada. Resolvendo relatório…');
      try {
        await onPublished?.(version, resolveReports);
        setNotice(`Correção publicada com sucesso na versão ${version} e relatório(s) resolvido(s).`);
      } catch (cause) {
        logEditorialFirebaseError('Publicação concluída, mas resolução do relatório falhou', cause);
        setError(`A correção foi publicada com sucesso na versão ${version}, mas o relatório não foi resolvido. ${describeEditorialFirebaseError(cause, 'resolve')}`);
      }
    }
    await hydrate(true);
    setSaving(false); setActionLabel('');
  };
  const close = () => {
    if (isUploading && !window.confirm('Há um upload em andamento. Cancelar o envio e fechar o editor?')) return;
    if (dirty && !window.confirm('Descartar as alterações não salvas?')) return;
    uploadTask.current?.cancel();
    onClose();
  };
  const test = () => {
    const candidates = [effective.correctValue, ...(effective.acceptedAnswers ?? [])].map((answer) => normalizeAnswer(answer));
    setTestResult(candidates.includes(normalizeAnswer(testAnswer)) ? 'correct' : 'incorrect');
  };
  const upload = async (file?: File) => {
    if (!file) return;
    if (uploadTask.current) uploadTask.current.cancel();
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setError(''); setNotice('');
    setImageUpload({ phase: 'selected', fileName: file.name, fileSize: file.size, previewUrl, progress: 0, message: 'Imagem selecionada — ainda não enviada.' });
    try {
      const dimensions = await readImageDimensions(previewUrl);
      setImageUpload((current) => ({ ...current, ...dimensions }));
      await assertEditorialAdminAccess(reviewer.uid);
      setImageUpload((current) => ({ ...current, phase: 'uploading', message: 'Iniciando envio para o Firebase Storage…' }));
      const operation = uploadExerciseImage({ file, workbookId: identity.workbookId, lessonId: identity.lessonId, exerciseId: identity.exerciseId, onProgress: (progress) => {
        setImageUpload((current) => ({ ...current, phase: 'uploading', progress, message: `Enviando imagem: ${progress}%.` }));
      } });
      uploadTask.current = operation.task;
      const { imagePath, imageUrl } = await operation.result;
      update('imagePath', imagePath); update('imageUrl', imageUrl);
      setImageUpload((current) => ({ ...current, phase: 'completed', progress: 100, imagePath, message: 'Upload concluído. Esta imagem será usada ao salvar ou publicar.' }));
      setNotice('Upload da imagem concluído com sucesso.');
    } catch (cause) {
      const canceled = (cause as { code?: string })?.code === 'storage/canceled';
      if (!canceled) logEditorialFirebaseError('Falha no upload da imagem', cause);
      const message = describeEditorialFirebaseError(cause, 'upload');
      setImageUpload((current) => ({ ...current, phase: canceled ? 'canceled' : 'error', message }));
      if (!canceled) setError(message);
      else setNotice('Upload cancelado. Nenhuma referência de imagem foi salva.');
    } finally {
      uploadTask.current = null;
    }
  };

  const cancelUpload = () => {
    const canceled = uploadTask.current?.cancel() ?? false;
    if (!canceled) {
      setImageUpload((current) => ({ ...current, phase: 'canceled', message: 'Upload cancelado. Nenhuma referência de imagem foi salva.' }));
      setNotice('Upload cancelado. Nenhuma referência de imagem foi salva.');
    }
  };

  const removeSelectedImage = () => {
    uploadTask.current?.cancel(); uploadTask.current = null;
    update('imageUrl', ''); update('imagePath', '');
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = '';
    setImageUpload(emptyImageUploadState());
  };

  if (loading) return <div className="fixed inset-0 z-[1200] grid place-items-center bg-black/60 text-lg font-black text-white">Carregando editor…</div>;
  return <div className="fixed inset-0 z-[1200] overflow-y-auto bg-black/60 p-2 sm:p-6" onClick={close}>
    <div className="mx-auto max-w-6xl rounded-3xl bg-slate-50 shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <header className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-3xl border-b bg-white p-4 sm:p-6">
        <div><p className="text-xs font-black uppercase tracking-[.2em] text-blue-600">Editar exercício</p><h2 className="text-xl font-black sm:text-2xl">Livro {identity.workbookId} · {location.lesson.title} · {location.day.id}</h2><p className="break-all text-xs text-slate-500">Exercise ID: {identity.exerciseId}</p></div>
        <button onClick={close} disabled={saving} className="rounded-xl bg-slate-100 px-4 py-2 font-black">×</button>
      </header>
      <main className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_360px] sm:p-6">
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2 text-xs font-black"><span className="rounded-full bg-slate-200 px-3 py-1">Conteúdo original</span>{state.draft && <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">Rascunho não publicado</span>}{state.published && <span className={`rounded-full px-3 py-1 ${state.published.status === 'disabled' ? 'bg-red-100 text-red-800' : state.published.status === 'archived' ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'}`}>{state.published.status === 'disabled' ? 'Exercício desativado' : state.published.status === 'archived' ? 'Override arquivado · usando original' : `Versão publicada ${state.published.version}`}</span>}</div>
          <div className="flex flex-wrap gap-2"><button onClick={() => viewSource(null)} className="rounded-xl border px-3 py-2 text-xs font-black">Visualizar exercício original</button>{state.published && state.published.status !== 'archived' && <button onClick={() => viewSource(state.published)} className="rounded-xl border px-3 py-2 text-xs font-black">Visualizar versão publicada</button>}{state.draft && <button onClick={() => viewSource(state.draft)} className="rounded-xl border px-3 py-2 text-xs font-black">Visualizar rascunho</button>}</div>
          {error && <p role="alert" className="whitespace-pre-line rounded-xl bg-red-100 p-3 font-bold text-red-800">{error}</p>}{notice && <p role="status" className="rounded-xl bg-emerald-100 p-3 font-bold text-emerald-800">{notice}</p>}
          <Section title="1 — Identificação"><div className="grid gap-3 sm:grid-cols-2">{Object.entries({ Livro: identity.workbookId, Lição: identity.lessonId, Dia: identity.dayId, Idioma: identity.language, Tipo: identity.exerciseType, ID: identity.exerciseId }).map(([label, content]) => <label key={label} className="text-xs font-bold text-slate-500">{label}<input readOnly value={content} className="mt-1 w-full rounded-xl border bg-slate-100 p-3 text-slate-700" /></label>)}</div></Section>
          <Section title="2 — Conteúdo">
            <Field label="Instrução" value={fields.instruction ?? original.instruction} onChange={(value) => update('instruction', value)} />
            {original.type !== 'speaking' && <Field label="Texto exibido / pergunta" value={fields.displayValue ?? original.displayValue ?? ''} onChange={(value) => update('displayValue', value)} />}
            <Field label={original.type === 'speaking' ? 'Resposta de referência' : 'Resposta principal'} value={fields.correctValue ?? original.correctValue} onChange={(value) => update('correctValue', value)} />
            <Field label="Respostas alternativas aceitas (uma por linha)" area value={arrayText(fields.acceptedAnswers ?? original.acceptedAnswers)} onChange={(value) => update('acceptedAnswers', toArray(value))} />
            {original.type === 'multiple-choice' && <Field label="Alternativas (uma por linha)" area value={arrayText(fields.options ?? original.options)} onChange={(value) => update('options', toArray(value))} />}
            <Field label="Tradução / explicação" area value={fields.translation ?? original.translation ?? ''} onChange={(value) => update('translation', value)} />
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Feedback correto" value={fields.feedbackCorrect ?? original.feedbackCorrect ?? ''} onChange={(value) => update('feedbackCorrect', value)} /><Field label="Feedback incorreto" value={fields.feedbackIncorrect ?? original.feedbackIncorrect ?? ''} onChange={(value) => update('feedbackIncorrect', value)} /></div>
            <p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-900">Normalizações globais preservadas: maiúsculas/minúsculas, espaços, pontuação terminal e apóstrofos são tratados pelo validador central atual.</p>
          </Section>
          <Section title="3 — Mídia">
            {(imageUpload.previewUrl || effective.imageUrl) && <img src={imageUpload.previewUrl || effective.imageUrl} alt={effective.imageAlt || ''} className="mx-auto max-h-[260px] w-full max-w-full rounded-xl object-contain sm:max-h-[360px]" />}
            <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Formatos: PNG, JPEG/JPG ou WEBP · máximo 5 MB. Recomendado: até 1200 × 1200 px e preferencialmente abaixo de 1 MB.</p>
            <div className="flex flex-wrap gap-2"><label className={`rounded-xl bg-blue-600 px-4 py-2 font-bold text-white ${isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>Enviar imagem<input type="file" accept="image/png,image/jpeg,image/webp" disabled={isUploading} className="hidden" onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>{isUploading && <button type="button" onClick={cancelUpload} className="rounded-xl border border-red-300 px-4 py-2 font-bold text-red-700">Cancelar upload</button>}{(imageUpload.phase !== 'idle' || effective.imageUrl) && !isUploading && <button type="button" onClick={removeSelectedImage} className="rounded-xl border px-4 py-2 font-bold">Remover imagem</button>}</div>
            {imageUpload.phase !== 'idle' && <div role={imageUpload.phase === 'error' ? 'alert' : 'status'} className={`rounded-xl border p-3 text-sm ${imageUpload.phase === 'error' ? 'border-red-300 bg-red-50 text-red-800' : imageUpload.phase === 'completed' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-blue-200 bg-blue-50 text-blue-900'}`}><p className="font-black">{imageUpload.message}</p><p className="mt-1 break-all text-xs">{imageUpload.fileName} · {formatFileSize(imageUpload.fileSize)}{imageUpload.width && imageUpload.height ? ` · ${imageUpload.width} × ${imageUpload.height}px` : ''}</p>{imageUpload.imagePath && <p className="mt-1 break-all text-xs">Storage: {imageUpload.imagePath}</p>}{isUploading && <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full bg-blue-600 transition-all" style={{ width: `${Math.max(2, imageUpload.progress)}%` }} /></div>}</div>}
            <Field label="Texto alternativo da imagem" value={fields.imageAlt ?? original.imageAlt ?? ''} onChange={(value) => update('imageAlt', value)} />
            <Field label="Chave / referência de áudio" value={fields.audioValue ?? original.audioValue} onChange={(value) => update('audioValue', value)} />
            <div className="flex gap-2"><button disabled={!effective.audioValue} onClick={() => speechSynthesis.speak(new SpeechSynthesisUtterance(effective.audioValue))} className="rounded-xl border px-4 py-2 font-bold disabled:opacity-40">▶ Reproduzir áudio</button>{effective.audioValue && <button onClick={() => update('audioValue', '')} className="rounded-xl border px-4 py-2 font-bold">Remover referência</button>}</div>
          </Section>
          <Section title="4 — Administração"><Field label="Motivo da alteração (obrigatório ao publicar)" area value={reason} onChange={(value) => { setReason(value); setDirty(true); }} /><Field label="Observação administrativa" area value={adminNote} onChange={(value) => { setAdminNote(value); setDirty(true); }} /><p className="text-sm text-slate-500">Versão base: {baseVersion} · última alteração: {stamp(state.published?.updatedAt)} · responsável: {state.published?.updatedBy || '—'}</p></Section>
        </div>
        <aside className="space-y-5">
          <Section title="Relatórios relacionados"><p className="text-sm text-slate-600">{relatedReports.length} relatório(s), {relatedReports.filter(isActiveExerciseReport).length} aberto(s).</p>{relatedReports.slice(0, 8).map((item) => <p key={item.reportId} className="rounded-lg bg-slate-50 p-2 text-xs"><span className="font-black">{item.status}</span> · {item.problemCategory} · {item.studentComment || 'sem comentário'}</p>)}</Section>
          <Section title="Pré-visualização e teste"><button onClick={() => setPreview((value) => !value)} className="w-full rounded-xl bg-violet-600 p-3 font-black text-white">{preview ? 'Ocultar prévia' : 'Pré-visualizar'}</button>{preview && <div className="mt-3 rounded-2xl bg-slate-900 p-4 text-white"><p className="text-sm font-bold text-cyan-300">{effective.instruction}</p>{effective.imageUrl && <img src={effective.imageUrl} alt={effective.imageAlt || ''} className="my-3 max-h-48 w-full object-contain" />}<p className="my-4 text-lg font-black">{effective.displayValue}</p>{effective.options?.map((option) => <div key={option} className="my-2 rounded-xl bg-slate-700 p-3">{option}</div>)}</div>}<div className="mt-3 flex gap-2"><input aria-label="Resposta de teste" value={testAnswer} onChange={(event) => setTestAnswer(event.target.value)} className="min-w-0 flex-1 rounded-xl border p-3" /><button onClick={test} className="rounded-xl bg-blue-600 px-4 font-black text-white">Testar</button></div>{testResult && <p className={`mt-2 rounded-xl p-3 font-black ${testResult === 'correct' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{testResult === 'correct' ? effective.feedbackCorrect || 'Resposta correta.' : effective.feedbackIncorrect || 'Resposta incorreta.'}</p>}</Section>
          <Section title="Histórico">{versions.length === 0 ? <p className="text-sm text-slate-500">Nenhuma versão publicada.</p> : versions.map((version) => <div key={version.version} className="mb-2 rounded-xl border p-3 text-sm"><p className="font-black">Versão {version.version} · {version.status}</p><p className="text-slate-500">{version.changeReason} · {version.updatedBy}</p><button disabled={saving} onClick={async () => { if (!window.confirm(`Restaurar a versão ${version.version} como uma nova publicação?`)) return; setSaving(true); try { await restoreExerciseVersion(original, version, reviewer.uid); await hydrate(); setNotice('Versão restaurada como nova publicação.'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao restaurar.'); } finally { setSaving(false); } }} className="mt-2 font-bold text-blue-700">Restaurar</button></div>)}</Section>
          {state.published && state.published.status !== 'archived' && <button disabled={saving} onClick={async () => { if (!window.confirm('Remover a correção publicada e voltar ao exercício original? O histórico será preservado.')) return; const why = window.prompt('Motivo da restauração do original:')?.trim(); if (!why) return; setSaving(true); try { await removePublishedExerciseOverride(original.id, reviewer.uid, why); await hydrate(); setNotice('Override removido. O conteúdo local voltou a ser usado.'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao remover override.'); } finally { setSaving(false); } }} className="w-full rounded-xl border border-red-300 p-3 font-black text-red-700">Voltar ao exercício original</button>}
        </aside>
      </main>
      <footer className="sticky bottom-0 z-20 flex flex-wrap justify-end gap-2 rounded-b-3xl border-t bg-white p-4 shadow-[0_-8px_24px_rgba(15,23,42,0.12)]">
        {(error || notice || actionLabel) && <div className={`mb-1 w-full rounded-xl p-3 text-sm font-bold ${error ? 'bg-red-100 text-red-800' : notice ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`} role={error ? 'alert' : 'status'}>{error || notice || actionLabel}</div>}
        {isUploading && <p className="w-full text-right text-xs font-bold text-amber-700">Aguarde o envio da imagem antes de salvar ou publicar.</p>}
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
