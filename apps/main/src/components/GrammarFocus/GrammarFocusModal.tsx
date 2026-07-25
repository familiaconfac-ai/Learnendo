import React, { useEffect, useMemo, useState } from 'react';
import {
  emptyGrammarFocusContent,
  GRAMMAR_FOCUS_LANGUAGES,
  GRAMMAR_FOCUS_MAX_BODY_LENGTH,
  GRAMMAR_FOCUS_MAX_TITLE_LENGTH,
  hasGrammarFocusContent,
  normalizeGrammarFocusLanguage,
  validateGrammarFocusContent,
  type GrammarFocusContent,
  type GrammarFocusDocument,
  type GrammarFocusLanguage,
} from '../../models/grammarFocus';
import { saveGrammarFocus, subscribeGrammarFocus } from '../../services/grammarFocusService';
import { parseControlledMarkdown } from '../../utils/controlledMarkdown';

interface GrammarFocusLessonOption {
  id: string;
  lessonNumber: number;
  title?: string;
}

interface GrammarFocusModalProps {
  workbookId: number;
  lessonId: string | null;
  lessonNumber: number | null;
  lessonTitle?: string;
  lessons: GrammarFocusLessonOption[];
  activeLanguage: string;
  isAdmin: boolean;
  userId: string | null;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  onSelectLesson: (lessonNumber: number) => void;
  onOpenOverview: () => void;
  onClose: () => void;
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
  workbookId, lessonId, lessonNumber, lessonTitle, lessons, activeLanguage, isAdmin, userId,
  scrollRef, onScroll, onSelectLesson, onOpenOverview, onClose,
}) => {
  const displayLanguage = normalizeGrammarFocusLanguage(activeLanguage);
  const copy = COPY[displayLanguage];
  const [documentValue, setDocumentValue] = useState<GrammarFocusDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [editorLanguage, setEditorLanguage] = useState<GrammarFocusLanguage>(displayLanguage);
  const [draft, setDraft] = useState<GrammarFocusContent>(emptyGrammarFocusContent);
  const [baseline, setBaseline] = useState<GrammarFocusContent>(emptyGrammarFocusContent);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(baseline);
  const isOverview = lessonNumber == null || lessonId == null;
  const activeLocale = documentValue?.content[displayLanguage] ?? { title: '', body: '' };
  const hasDocumentContent = hasGrammarFocusContent(documentValue?.content);
  const hasActiveContent = Boolean(activeLocale.title.trim() || activeLocale.body.trim());

  useEffect(() => {
    setEditing(false);
    setPreviewing(false);
    setSaveError('');
    setSavedMessage('');
    setEditorLanguage(displayLanguage);
    if (isOverview || !lessonId) {
      setDocumentValue(null);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setLoadError('');
    return subscribeGrammarFocus(workbookId, lessonId, (next) => {
      setDocumentValue(next);
      setDraft(next?.content ?? emptyGrammarFocusContent());
      setBaseline(next?.content ?? emptyGrammarFocusContent());
      setLoading(false);
    }, () => {
      setLoadError(copy.loadError);
      setLoading(false);
    });
  }, [copy.loadError, displayLanguage, isOverview, lessonId, workbookId]);

  const confirmDiscard = () => !dirty || window.confirm(copy.unsaved);
  const requestClose = () => {
    if (confirmDiscard()) onClose();
  };
  const beginEditing = () => {
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
    if (!lessonId || !userId || saving) return;
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
      const saved = await saveGrammarFocus({ workbookId, lessonId, content: draft, updatedBy: userId });
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
  return (
    <div className="fixed inset-0 z-[1001] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={requestClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="grammar-focus-title" className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[92vh] sm:max-w-5xl sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:px-8 sm:py-5">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-500">{isOverview ? `Workbook ${workbookId}` : `Lesson ${lessonNumber}`}</p>
            <h2 id="grammar-focus-title" className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">Grammar Focus</h2>
            {!isOverview && <p className="mt-2 truncate text-lg font-semibold text-slate-700 sm:text-xl">{copy.grammarNotes}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!isOverview && lessons.length > 1 && !editing && <button type="button" onClick={onOpenOverview} className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-600 sm:block">{copy.all}</button>}
            <button type="button" onClick={requestClose} className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-2xl text-slate-400 transition hover:text-slate-700" aria-label={copy.close}>×</button>
          </div>
        </header>

        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-7">
          {savedMessage && <div role="status" className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{savedMessage}</div>}
          {isOverview ? (
            <div>
              <p className="mb-5 text-sm text-slate-500">{copy.noWorkbookNotes}</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {lessons.map((lesson) => <button type="button" key={lesson.id} onClick={() => onSelectLesson(lesson.lessonNumber)} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-blue-300 hover:bg-blue-50"><p className="text-xs font-black uppercase tracking-[0.26em] text-blue-500">Lesson {lesson.lessonNumber}</p><p className="mt-2 text-lg font-bold text-slate-900">{lesson.title || copy.grammarNotes}</p></button>)}
              </div>
            </div>
          ) : loading ? (
            <div role="status" className="py-10 text-center font-semibold text-slate-500">Loading…</div>
          ) : loadError ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{loadError}</div>
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
          ) : (
            <div className="mx-auto max-w-3xl">
              {hasActiveContent ? <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-7"><h3 className="mb-5 text-2xl font-black text-slate-900">{activeLocale.title || lessonTitle || copy.grammarNotes}</h3>{activeLocale.body.trim() && <ControlledMarkdown body={activeLocale.body} />}</div> : <p className="text-sm text-slate-500">{copy.noNotes}</p>}
              {isAdmin && <button type="button" onClick={beginEditing} className="mt-6 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-[0_3px_0_0_#1e40af]">{hasDocumentContent ? copy.edit : copy.add}</button>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
