import React, { useEffect, useMemo, useState } from 'react';
import {
  canonicalGrammarFocusLessonId,
  grammarFocusDocumentId,
  emptyGrammarFocusContent,
  GRAMMAR_FOCUS_LANGUAGES,
  GRAMMAR_FOCUS_MAX_BODY_LENGTH,
  GRAMMAR_FOCUS_MAX_TITLE_LENGTH,
  getLocalizedGrammarFocusContent,
  hasGrammarFocusContent,
  normalizeGrammarFocusLanguage,
  validateGrammarFocusContent,
  type GrammarFocusContent,
  type GrammarFocusDocument,
  type GrammarFocusLanguage,
} from '../../models/grammarFocus';
import { assignLegacyGrammarFocus, saveGrammarFocus, subscribeGrammarFocus, subscribeLegacyGrammarFocus } from '../../services/grammarFocusService';
import {
  availableGrammarFocusLanguages, visibleGrammarFocusLanguage,
  legacyGrammarFocusAssignmentError, type LegacyGrammarFocus,
} from '../../models/legacyGrammarFocus';
import { getGrammarFocusActions } from '../../services/grammarFocusPermissions';
import type { UserRole } from '../../services/userRoles';
import { parseControlledMarkdown } from '../../utils/controlledMarkdown';
import { GrammarFocusReportModal } from './GrammarFocusReportModal';

interface GrammarFocusLessonOption {
  id: string;
  lessonNumber: number;
  title?: string;
}

interface GrammarFocusModalProps {
  courseId: string;
  workbookId: number;
  lessonId: string | null;
  lessonNumber: number | null;
  lessonTitle?: string;
  lessons: GrammarFocusLessonOption[];
  workbookOptions?: Array<{ id: number; label: string }>;
  highlightedLessonId?: string | null;
  onSelectWorkbook?: (workbookId: number) => void;
  activeLanguage: string;
  userRole: UserRole;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  workbookTitle?: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  onSelectLesson: (lessonNumber: number) => void;
  onOpenOverview: () => void;
  onClose: () => void;
  onOpenBoard?: (content: { title: string; body: string; lessonNumber: number; grammarDocumentId: string }) => Promise<void>;
  onOpenSlides?: (content: { title: string; body: string; lessonNumber: number; grammarDocumentId: string }) => Promise<void>;
  onOpenPractice?: (lessonId: string) => void;
  onContentViewed?: (title: string, lessonId: string) => void;
}

const LANGUAGE_LABELS: Record<GrammarFocusLanguage, string> = {
  en: 'English',
  pt: 'Português',
  es: 'Español',
};

const COPY = {
  en: {
    grammarNotes: 'Grammar Notes', noNotes: 'No grammar notes available for this lesson yet.',
    noWorkbookNotes: 'Choose the lesson you want to open.', add: 'Add content', edit: 'Edit',
    title: 'Title', content: 'Content', preview: 'Preview', editor: 'Back to editor', cancel: 'Cancel',
    save: 'Save changes', saving: 'Saving...', saved: 'Grammar Focus saved.', all: 'All grammar points',
    close: 'Close', unsaved: 'Discard the unsaved Grammar Focus changes?', loadError: 'Could not load Grammar Focus right now.',
    required: 'Add a title or content in at least one language before saving.',
  },
  pt: {
    grammarNotes: 'Notas gramaticais', noNotes: 'Ainda não há conteúdo gramatical disponível para esta lição.',
    noWorkbookNotes: 'Escolha a lição que deseja abrir.', add: 'Adicionar conteúdo', edit: 'Editar',
    title: 'Título', content: 'Conteúdo', preview: 'Pré-visualizar', editor: 'Voltar ao editor', cancel: 'Cancelar',
    save: 'Salvar alterações', saving: 'Salvando...', saved: 'Grammar Focus salvo.', all: 'Todos os pontos gramaticais',
    close: 'Fechar', unsaved: 'Descartar as alterações não salvas do Grammar Focus?', loadError: 'Não foi possível carregar o Grammar Focus agora.',
    required: 'Adicione um título ou conteúdo em pelo menos um idioma antes de salvar.',
  },
  es: {
    grammarNotes: 'Notas gramaticales', noNotes: 'Todavía no hay contenido gramatical disponible para esta lección.',
    noWorkbookNotes: 'Elige la lección que deseas abrir.', add: 'Agregar contenido', edit: 'Editar',
    title: 'Título', content: 'Contenido', preview: 'Vista previa', editor: 'Volver al editor', cancel: 'Cancelar',
    save: 'Guardar cambios', saving: 'Guardando...', saved: 'Grammar Focus guardado.', all: 'Todos los puntos gramaticales',
    close: 'Cerrar', unsaved: '¿Descartar los cambios no guardados de Grammar Focus?', loadError: 'No se pudo cargar Grammar Focus ahora.',
    required: 'Agrega un título o contenido en al menos un idioma antes de guardar.',
  },
};

const LEGACY_COPY = {
  en: { label: 'Legacy / unassigned — read only', language: 'Content language', review: 'Review assignment',
    explanation: 'These historical notes have no confirmed curriculum. Their text language does not identify the course. Board/Slides become available after assignment.',
    confirm: 'Confirm assignment', cancel: 'Cancel', assigned: 'Legacy archive — assigned to', raw: 'Original fields',
    empty: 'This document exists but its fields need manual review.', destination: 'Destination',
    notice: 'All available languages will be copied. The original is preserved. Confirm only if this is the correct course and lesson.',
    pending: 'Historical notes are shown above. No official notes have been assigned to this course yet.', exists: 'An official document already exists; automatic replacement is blocked.' },
  pt: { label: 'Legacy / sem curso confirmado — somente leitura', language: 'Idioma do conteúdo', review: 'Revisar atribuição',
    explanation: 'Estas notas antigas não têm currículo confirmado. O idioma do texto não identifica o curso. Board/Slides ficam disponíveis após a atribuição.',
    confirm: 'Confirmar atribuição', cancel: 'Cancelar', assigned: 'Arquivo legado — atribuído a', raw: 'Campos originais',
    empty: 'Este documento existe, mas seus campos precisam de revisão manual.', destination: 'Destino',
    notice: 'Todos os idiomas disponíveis serão copiados. O original será preservado. Confirme somente se este for o curso e a lição corretos.',
    pending: 'As notas antigas estão acima. Ainda não há notas oficiais atribuídas a este curso.', exists: 'Já existe um documento oficial; a substituição automática está bloqueada.' },
  es: { label: 'Legacy / sin curso confirmado — solo lectura', language: 'Idioma del contenido', review: 'Revisar asignación',
    explanation: 'Estas notas anteriores no tienen currículo confirmado. El idioma del texto no identifica el curso. Board/Slides estarán disponibles después de la asignación.',
    confirm: 'Confirmar asignación', cancel: 'Cancelar', assigned: 'Archivo anterior — asignado a', raw: 'Campos originales',
    empty: 'Este documento existe, pero sus campos requieren revisión manual.', destination: 'Destino',
    notice: 'Se copiarán todos los idiomas disponibles. Se conservará el original. Confirma solo si este es el curso y la lección correctos.',
    pending: 'Las notas anteriores se muestran arriba. Aún no hay notas oficiales asignadas a este curso.', exists: 'Ya existe un documento oficial; se bloqueó la sustitución automática.' },
};

export function LegacyGrammarFocusCard({ source, activeLanguage, courseId, workbookId, lessonId, canAssign, destinationExists, onAssign }: {
  source: LegacyGrammarFocus; activeLanguage: string; courseId: string; workbookId: number; lessonId: string;
  canAssign: boolean; destinationExists: boolean; onAssign: (source: LegacyGrammarFocus) => Promise<void>;
}) {
  const copy = LEGACY_COPY[normalizeGrammarFocusLanguage(activeLanguage)];
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [reviewSource, setReviewSource] = useState<LegacyGrammarFocus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const displayed = reviewSource ?? source;
  const language = visibleGrammarFocusLanguage(displayed.content, selectedLanguage || activeLanguage);
  const languages = availableGrammarFocusLanguages(displayed.content);
  const locale = displayed.content[language];
  const conflict = legacyGrammarFocusAssignmentError(source, courseId, workbookId, lessonId);
  const confirm = async () => {
    if (!reviewSource || busy) return;
    setBusy(true); setError('');
    try { await onAssign(reviewSource); setReviewSource(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); setReviewSource(null); }
    finally { setBusy(false); }
  };
  return <section className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-5" aria-label={copy.label}>
    <h3 className="font-bold">{source.assignment ? `${copy.assigned} ${source.assignment.courseId}` : copy.label}</h3>
    <p className="my-2 text-sm">{source.assignment ? source.assignment.destinationId : copy.explanation}</p>
    <p className="break-all text-xs text-slate-600">grammarFocus/{source.documentId}</p>
    {languages.length > 0 ? <>
      <label className="my-3 block text-sm font-semibold">{copy.language}: <select aria-label={copy.language} value={language} onChange={event => setSelectedLanguage(event.target.value)} className="rounded border p-1">
        {languages.map(value => <option key={value} value={value}>{LANGUAGE_LABELS[value]}</option>)}
      </select></label>
      <h4 className="my-3 text-lg font-bold">{locale.title}</h4><ControlledMarkdown body={locale.body} />
    </> : <p role="status">{copy.empty}</p>}
    {canAssign && <>
      <details className="my-3"><summary>{copy.raw}</summary><pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(displayed.sourceData, null, 2)}</pre></details>
      {!source.assignment && (destinationExists ? <p>{copy.exists}</p> : conflict ? <p role="status">{conflict}</p> : languages.length > 0 && (
        reviewSource ? <div className="mt-4 space-y-3 rounded border border-amber-400 p-3">
          <p className="font-bold">{copy.destination}: {courseId} / Workbook {workbookId} / {lessonId}</p>
          <p>{grammarFocusDocumentId(courseId, workbookId, lessonId)}</p><p>{copy.notice}</p>
          <button type="button" disabled={busy} className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50" onClick={() => void confirm()}>{copy.confirm}</button>{' '}
          <button type="button" disabled={busy} onClick={() => setReviewSource(null)}>{copy.cancel}</button>
        </div> : <button type="button" className="mt-4 rounded border border-amber-500 px-4 py-2 font-bold" onClick={() => { setError(''); setReviewSource(source); }}>{copy.review}</button>
      ))}
    </>}
    {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
  </section>;
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    const token = match[0];
    if (token.startsWith('**')) nodes.push(<strong key={`${match.index}-strong`}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith('*')) nodes.push(<em key={`${match.index}-em`}>{token.slice(1, -1)}</em>);
    else nodes.push(<code key={`${match.index}-code`} className="rounded bg-slate-200 px-1 py-0.5 text-[0.92em]">{token.slice(1, -1)}</code>);
    cursor = match.index + token.length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

const ControlledMarkdown: React.FC<{ body: string }> = ({ body }) => {
  const blocks = useMemo(() => parseControlledMarkdown(body), [body]);
  return (
    <div className="space-y-4 text-sm leading-7 text-slate-700 sm:text-[15px]">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === 'heading') {
          const className = block.level === 1 ? 'text-2xl' : block.level === 2 ? 'text-xl' : 'text-lg';
          return <h4 key={key} className={`${className} font-black text-slate-900`}>{renderInlineMarkdown(block.text)}</h4>;
        }
        if (block.type === 'unordered-list') {
          return <ul key={key} className="ml-5 list-disc space-y-2">{block.items.map((item, itemIndex) => <li key={`${key}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>)}</ul>;
        }
        if (block.type === 'ordered-list') {
          return <ol key={key} className="ml-5 list-decimal space-y-2">{block.items.map((item, itemIndex) => <li key={`${key}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>)}</ol>;
        }
        if (block.type === 'example') {
          return <div key={key} className="rounded-2xl border-l-4 border-blue-500 bg-blue-50 px-4 py-3 font-semibold text-slate-800">{renderInlineMarkdown(block.text)}</div>;
        }
        return <p key={key}>{renderInlineMarkdown(block.text)}</p>;
      })}
    </div>
  );
};

export const GrammarFocusModal: React.FC<GrammarFocusModalProps> = ({
  courseId, workbookId, lessonId, lessonNumber, lessonTitle, lessons, workbookOptions = [], highlightedLessonId, onSelectWorkbook, activeLanguage, userRole, userId, userName, userEmail, workbookTitle,
  scrollRef, onScroll, onSelectLesson, onOpenOverview, onClose,
  onOpenBoard, onOpenSlides, onOpenPractice, onContentViewed,
}) => {
  const displayLanguage = normalizeGrammarFocusLanguage(activeLanguage);
  const canonicalLessonId = lessonId ? canonicalGrammarFocusLessonId(lessonId) : null;
  const copy = COPY[displayLanguage];
  const [documentValue, setDocumentValue] = useState<GrammarFocusDocument | null>(null);
  const [legacyDocuments, setLegacyDocuments] = useState<LegacyGrammarFocus[]>([]);
  const [legacyLoading, setLegacyLoading] = useState(false);
  const [legacyError, setLegacyError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [editorLanguage, setEditorLanguage] = useState<GrammarFocusLanguage>(displayLanguage);
  const [draft, setDraft] = useState<GrammarFocusContent>(emptyGrammarFocusContent);
  const [baseline, setBaseline] = useState<GrammarFocusContent>(emptyGrammarFocusContent);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [openingSurface, setOpeningSurface] = useState<'board' | 'slides' | null>(null);
  const [reporting, setReporting] = useState(false);
  const [readingLanguage, setReadingLanguage] = useState('');
  const actions = getGrammarFocusActions(userRole);

  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(baseline);
  const isOverview = lessonNumber == null || lessonId == null;
  const visibleLanguage = visibleGrammarFocusLanguage(documentValue?.content, readingLanguage || activeLanguage);
  const activeLocale = getLocalizedGrammarFocusContent(documentValue?.content, visibleLanguage);
  const hasDocumentContent = hasGrammarFocusContent(documentValue?.content);
  const hasActiveContent = Boolean(activeLocale.title.trim() || activeLocale.body.trim());

  useEffect(() => {
    if (!lessonId || !hasActiveContent || !onContentViewed) return;
    onContentViewed(activeLocale.title.trim() || lessonTitle || `Lesson ${lessonNumber}`, lessonId);
  }, [activeLocale.title, hasActiveContent, lessonId, lessonNumber, lessonTitle, onContentViewed]);

  useEffect(() => {
    setEditing(false);
    setPreviewing(false);
    setSaveError('');
    setSavedMessage('');
    setReadingLanguage('');
    setEditorLanguage(displayLanguage);
    if (isOverview || !canonicalLessonId) {
      setDocumentValue(null);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setLoadError(false);
    setDocumentValue(null);
    return subscribeGrammarFocus(courseId, workbookId, canonicalLessonId, (next) => {
      setDocumentValue(next);
      setDraft(next?.content ?? emptyGrammarFocusContent());
      setBaseline(next?.content ?? emptyGrammarFocusContent());
      setLoading(false);
    }, () => {
      setLoadError(true);
      setLoading(false);
    });
  }, [courseId, canonicalLessonId, isOverview, workbookId]);

  useEffect(() => {
    setLegacyDocuments([]);
    setLegacyError(false);
    setLegacyLoading(!isOverview);
    if (isOverview || !lessonId) return;
    return subscribeLegacyGrammarFocus(workbookId, lessonId, documents => {
      setLegacyDocuments(documents); setLegacyLoading(false);
    }, () => { setLegacyError(true); setLegacyLoading(false); });
  }, [courseId, workbookId, lessonId, isOverview]);

  const confirmDiscard = () => !dirty || window.confirm(copy.unsaved);
  const requestClose = () => {
    if (confirmDiscard()) onClose();
  };
  const beginEditing = () => {
    if (!actions.edit) return;
    const next = documentValue?.content ?? emptyGrammarFocusContent();
    setDraft(next);
    setBaseline(next);
    setEditorLanguage(displayLanguage);
    setEditing(true);
    setPreviewing(false);
    setSaveError('');
  };
  const cancelEditing = () => {
    if (!confirmDiscard()) return;
    setDraft(baseline);
    setEditing(false);
    setPreviewing(false);
    setSaveError('');
  };
  const updateLocale = (field: 'title' | 'body', value: string) => {
    setDraft((current) => ({
      ...current,
      [editorLanguage]: { ...current[editorLanguage], [field]: value },
    }));
    setSaveError('');
    setSavedMessage('');
  };
  const handleSave = async () => {
    if (!actions.edit) {
      setSaveError('Only administrators can edit official Grammar Focus content.');
      return;
    }
    if (!canonicalLessonId || !userId || saving) return;
    if (!hasGrammarFocusContent(draft)) {
      setSaveError(copy.required);
      return;
    }
    const validationError = validateGrammarFocusContent(draft);
    if (validationError) {
      setSaveError(validationError);
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const saved = await saveGrammarFocus({ courseId, workbookId, lessonId: canonicalLessonId, content: draft, updatedBy: userId });
      setDocumentValue(saved);
      setBaseline(draft);
      setEditing(false);
      setPreviewing(false);
      setSavedMessage(copy.saved);
      window.setTimeout(() => setSavedMessage(''), 4000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : copy.loadError);
    } finally {
      setSaving(false);
    }
  };

  const previewLocale = draft[editorLanguage];
  const openSurface = async (surface: 'board' | 'slides') => {
    if (!lessonNumber || openingSurface) return;
    const handler = surface === 'board' ? onOpenBoard : onOpenSlides;
    if (!handler) return;
    setOpeningSurface(surface);
    setSaveError('');
    try {
      await handler({
        title: activeLocale.title.trim() || lessonTitle || `Lesson ${lessonNumber}`,
        grammarDocumentId: grammarFocusDocumentId(courseId, workbookId, lessonId!),
        body: activeLocale.body,
        lessonNumber,
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not open the classroom workspace.');
    } finally {
      setOpeningSurface(null);
    }
  };
  return (
    <div className="fixed inset-0 z-[1001] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={requestClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="grammar-focus-title" className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[92vh] sm:max-w-5xl sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:px-8 sm:py-5">
          <div className="min-w-0">
            {isOverview && workbookOptions.length > 0 && onSelectWorkbook ? (
              <select value={workbookId} onChange={(event) => onSelectWorkbook(Number(event.target.value))} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-black text-blue-700" aria-label="Workbook">
                {workbookOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            ) : <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-500">{isOverview ? `Workbook ${workbookId}` : `Lesson ${lessonNumber}`}</p>}
            <h2 id="grammar-focus-title" className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">Grammar Focus</h2>
            {!isOverview && <p className="mt-2 truncate text-lg font-semibold text-slate-700 sm:text-xl">{copy.grammarNotes}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!isOverview && lessons.length > 1 && !editing && <button type="button" onClick={onOpenOverview} className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-600 sm:block">{copy.all}</button>}
            <button type="button" onClick={requestClose} className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-2xl text-slate-400 transition hover:text-slate-700" aria-label={copy.close}>×</button>
          </div>
        </header>

        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-7">
          {!isOverview && !editing && <>
            {legacyLoading && <p role="status">Loading legacy…</p>}
            {legacyError && <p role="alert">Legacy: {copy.loadError}</p>}
            {legacyDocuments.map(source => <LegacyGrammarFocusCard key={source.documentId} source={source}
              activeLanguage={activeLanguage} courseId={courseId} workbookId={workbookId} lessonId={lessonId!}
              canAssign={actions.edit && Boolean(userId) && !loading && !loadError && !legacyError}
              destinationExists={Boolean(documentValue)} onAssign={async reviewedSource => {
                await assignLegacyGrammarFocus({ source: reviewedSource, courseId, workbookId, lessonId: lessonId!, updatedBy: userId! });
              }} />)}
          </>}
          {savedMessage && <div role="status" className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{savedMessage}</div>}
          {isOverview ? (
            <div>
              <p className="mb-5 text-sm text-slate-500">{copy.noWorkbookNotes}</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {lessons.map((lesson) => <button type="button" key={lesson.id} onClick={() => onSelectLesson(lesson.lessonNumber)} className={`rounded-3xl border p-5 text-left transition hover:border-blue-300 hover:bg-blue-50 ${highlightedLessonId === lesson.id ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 bg-slate-50'}`}><p className="text-xs font-black uppercase tracking-[0.26em] text-blue-500">Lesson {lesson.lessonNumber}</p><p className="mt-2 text-lg font-bold text-slate-900">{lesson.title || copy.grammarNotes}</p>{highlightedLessonId === lesson.id && <span className="mt-3 inline-block rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white">Current lesson</span>}</button>)}
              </div>
            </div>
          ) : loading ? (
            <div role="status" className="py-10 text-center font-semibold text-slate-500">Loading…</div>
          ) : editing ? (
            <div className="mx-auto max-w-3xl">
              <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="tablist">
                {GRAMMAR_FOCUS_LANGUAGES.map((language) => <button type="button" role="tab" aria-selected={editorLanguage === language} key={language} onClick={() => { setEditorLanguage(language); setPreviewing(false); }} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-black transition ${editorLanguage === language ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{LANGUAGE_LABELS[language]}</button>)}
              </div>
              {previewing ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-7">
                  <h3 className="mb-5 text-2xl font-black text-slate-900">{previewLocale.title || copy.grammarNotes}</h3>
                  {previewLocale.body.trim() ? <ControlledMarkdown body={previewLocale.body} /> : <p className="text-sm text-slate-500">{copy.noNotes}</p>}
                </div>
              ) : (
                <div className="space-y-5">
                  <label className="block text-sm font-black text-slate-700">{copy.title}<input value={previewLocale.title} maxLength={GRAMMAR_FOCUS_MAX_TITLE_LENGTH} onChange={(event) => updateLocale('title', event.target.value)} className="mt-2 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-base font-semibold outline-none transition focus:border-blue-500" /></label>
                  <label className="block text-sm font-black text-slate-700">{copy.content}<textarea value={previewLocale.body} maxLength={GRAMMAR_FOCUS_MAX_BODY_LENGTH} onChange={(event) => updateLocale('body', event.target.value)} rows={16} className="mt-2 min-h-[18rem] w-full resize-y rounded-2xl border-2 border-slate-200 px-4 py-3 font-mono text-sm leading-6 outline-none transition focus:border-blue-500" placeholder="# Title\n\nParagraph with **bold** and *italic*.\n\n- List item\n> Example: This is an example." /><span className="mt-1 block text-right text-xs font-semibold text-slate-400">{previewLocale.body.length}/{GRAMMAR_FOCUS_MAX_BODY_LENGTH}</span></label>
                </div>
              )}
              {saveError && <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{saveError}</div>}
              <div className="sticky bottom-0 mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white py-4 sm:flex-row sm:justify-end">
                <button type="button" disabled={saving} onClick={cancelEditing} className="rounded-2xl border border-slate-300 px-5 py-3 font-black text-slate-600 disabled:opacity-50">{copy.cancel}</button>
                <button type="button" disabled={saving} onClick={() => setPreviewing((value) => !value)} className="rounded-2xl bg-slate-800 px-5 py-3 font-black text-white disabled:opacity-50">{previewing ? copy.editor : copy.preview}</button>
                <button type="button" disabled={saving || !dirty} onClick={() => void handleSave()} className="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-[0_3px_0_0_#1e40af] disabled:opacity-50 disabled:shadow-none">{saving ? copy.saving : copy.save}</button>
              </div>
            </div>
          ) : loadError ? (
            <div className="mx-auto max-w-3xl">
              {actions.edit ? (
                <>
                  <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{copy.loadError}</div>
                  <button type="button" onClick={beginEditing} className="mt-6 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-[0_3px_0_0_#1e40af]">{copy.add}</button>
                </>
              ) : (
                <p className="text-sm text-slate-500">{copy.noNotes}</p>
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-3xl">
              {hasDocumentContent && <label className="mb-3 block text-sm">{LEGACY_COPY[displayLanguage].language}: <select value={visibleLanguage} onChange={event => setReadingLanguage(event.target.value)}>
                {availableGrammarFocusLanguages(documentValue?.content).map(language => <option key={language} value={language}>{LANGUAGE_LABELS[language]}</option>)}
              </select></label>}
              {hasActiveContent ? <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-7"><h3 className="mb-5 text-2xl font-black text-slate-900">{activeLocale.title || lessonTitle || copy.grammarNotes}</h3>{activeLocale.body.trim() && <ControlledMarkdown body={activeLocale.body} />}</div> : <p className="text-sm text-slate-500">{legacyDocuments.length ? LEGACY_COPY[displayLanguage].pending : legacyLoading || legacyError ? '' : copy.noNotes}</p>}
              {saveError && <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{saveError}</div>}
              <div className="mt-6 flex flex-wrap gap-2">
                {actions.edit && <button type="button" onClick={beginEditing} className="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-[0_3px_0_0_#1e40af]">{hasDocumentContent ? copy.edit : copy.add}</button>}
                {actions.board && hasActiveContent && onOpenBoard && <button type="button" disabled={openingSurface !== null} onClick={() => void openSurface('board')} className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 font-black text-blue-700 disabled:opacity-50">{openingSurface === 'board' ? 'Opening...' : 'Board'}</button>}
                {actions.slides && hasActiveContent && onOpenSlides && <button type="button" disabled={openingSurface !== null} onClick={() => void openSurface('slides')} className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3 font-black text-violet-700 disabled:opacity-50">{openingSurface === 'slides' ? 'Opening...' : 'Slides'}</button>}
                {actions.practice && lessonId && onOpenPractice && <button type="button" onClick={() => onOpenPractice(lessonId)} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 font-black text-emerald-700">Practice</button>}
                {actions.report && lessonId && userId && <button type="button" onClick={() => setReporting(true)} className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 font-black text-amber-700">Report</button>}
              </div>
            </div>
          )}
        </div>
      </section>
      {reporting && lessonId && userId && (
        <GrammarFocusReportModal
          courseId={courseId}
          userId={userId}
          userName={userName}
          userEmail={userEmail}
          language={displayLanguage}
          workbookId={workbookId}
          workbookTitle={workbookTitle || `Workbook ${workbookId}`}
          lessonId={lessonId}
          lessonTitle={lessonTitle || `Lesson ${lessonNumber}`}
          grammarFocusTitle={activeLocale.title.trim() || lessonTitle || `Lesson ${lessonNumber}`}
          onClose={() => setReporting(false)}
        />
      )}
    </div>
  );
};
