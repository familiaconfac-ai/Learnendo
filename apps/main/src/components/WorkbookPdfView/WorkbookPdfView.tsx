import React from 'react';

interface WorkbookPdfViewProps {
  workbookId: number;
  availableWorkbookIds?: number[];
  uiLanguage?: 'en' | 'pt' | 'es';
  courseTitle?: string;
  courseFlag?: string;
  onBack: () => void;
  onOpenTracks: () => void;
  onOpenWorkbookList?: () => void;
  onSelectWorkbook?: (workbookId: number) => void;
}

export const WorkbookPdfView: React.FC<WorkbookPdfViewProps> = ({
  workbookId,
  availableWorkbookIds = [],
  uiLanguage = 'en',
  courseTitle,
  courseFlag,
  onBack,
  onOpenTracks,
  onOpenWorkbookList,
  onSelectWorkbook,
}) => {
  const sortedWorkbookIds = [...availableWorkbookIds].sort((a, b) => a - b);
  const hasWorkbookSwitcher = sortedWorkbookIds.length > 1;
  const workbookLabel = uiLanguage === 'pt' ? 'Caderno' : uiLanguage === 'es' ? 'Libro' : 'Workbook';
  const backLabel = uiLanguage === 'pt' ? 'Cursos' : uiLanguage === 'es' ? 'Cursos' : 'Courses';
  const tracksLabel = uiLanguage === 'pt' ? 'Trilhas' : uiLanguage === 'es' ? 'Rutas' : 'Tracks';
  const pdfLabel = 'PDF';
  const switcherLabel = uiLanguage === 'pt' ? 'Escolha o caderno' : uiLanguage === 'es' ? 'Elige el libro' : 'Choose your workbook';
  const switcherHint = uiLanguage === 'pt'
    ? 'Troque de livro aqui para abrir a pagina certa do PDF.'
    : uiLanguage === 'es'
      ? 'Cambia de libro aqui para abrir la pagina correcta del PDF.'
      : 'Switch books here to open the correct PDF page.';
  const listLabel = uiLanguage === 'pt' ? 'Ver todos os cadernos' : uiLanguage === 'es' ? 'Ver todos los libros' : 'View all workbooks';
  const heroTitle = uiLanguage === 'pt'
    ? `PDF do ${workbookLabel} ${workbookId}`
    : uiLanguage === 'es'
      ? `PDF del ${workbookLabel} ${workbookId}`
      : `${workbookLabel} ${workbookId} PDF`;
  const heroDescription = uiLanguage === 'pt'
    ? 'Leve o conteudo para estudar offline, revisar no papel e acompanhar as trilhas com mais autonomia.'
    : uiLanguage === 'es'
      ? 'Lleva el contenido para estudiar offline, repasar en papel y seguir las rutas con mas autonomia.'
      : 'Take the content offline to study on paper and follow each track with more independence.';
  const ctaLabel = uiLanguage === 'pt'
    ? 'Quero o PDF deste caderno'
    : uiLanguage === 'es'
      ? 'Quiero el PDF de este libro'
      : 'I want this workbook PDF';
  const secondaryLabel = uiLanguage === 'pt'
    ? 'Voltar para as trilhas'
    : uiLanguage === 'es'
      ? 'Volver a las rutas'
      : 'Back to tracks';
  const bullets = uiLanguage === 'pt'
    ? [
        '12 licoes organizadas para acompanhar o app.',
        'Material para imprimir, revisar e anotar.',
        'Ideal para estudar mesmo sem internet.',
      ]
    : uiLanguage === 'es'
      ? [
          '12 lecciones organizadas para acompanar la app.',
          'Material para imprimir, repasar y tomar notas.',
          'Ideal para estudiar incluso sin internet.',
        ]
      : [
          '12 lessons organized to follow the app.',
          'Printable material for review and note-taking.',
          'Useful for studying even when you are offline.',
        ];

  const whatsappText = encodeURIComponent(
    uiLanguage === 'pt'
      ? `Ola! Tenho interesse no PDF do ${workbookLabel} ${workbookId}${courseTitle ? ` de ${courseTitle}` : ''}. Pode me passar os detalhes?`
      : uiLanguage === 'es'
        ? `Hola! Tengo interes en el PDF del ${workbookLabel} ${workbookId}${courseTitle ? ` de ${courseTitle}` : ''}. Me puedes enviar los detalles?`
        : `Hello! I am interested in the ${workbookLabel} ${workbookId} PDF${courseTitle ? ` for ${courseTitle}` : ''}. Can you send me the details?`,
  );
  const whatsappHref = `https://wa.me/5517991010930?text=${whatsappText}`;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-900 pb-28">
      <div className="mx-auto w-full max-w-3xl px-3 pt-6 sm:px-4 sm:pt-8">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-1 text-base font-bold text-white"
          aria-label={backLabel}
        >
          &larr; {backLabel}
        </button>

        <div className="mb-6 flex flex-col items-center sm:mb-8">
          <img
            src={`/islands/workbook${workbookId}.gif`}
            alt={`${workbookLabel} ${workbookId}`}
            style={{ width: '156px' }}
            className="h-[156px] w-[156px] object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.45)]"
          />
          <p className="mt-3 text-center text-sm font-black uppercase tracking-[0.24em] text-yellow-300">
            {workbookLabel} {workbookId}
          </p>
          <div className="mt-4 inline-flex rounded-full border border-white/10 bg-slate-800/90 p-1 shadow-[0_16px_40px_rgba(15,23,42,0.35)]">
            <button
              type="button"
              onClick={onOpenTracks}
              className="rounded-full px-5 py-2 text-sm font-bold text-slate-200 transition hover:bg-slate-700"
            >
              {tracksLabel}
            </button>
            <button
              type="button"
              className="rounded-full bg-yellow-400 px-5 py-2 text-sm font-black text-slate-950 shadow-[0_4px_0_0_#ca8a04]"
              aria-pressed="true"
            >
              {pdfLabel}
            </button>
          </div>
          {hasWorkbookSwitcher && (
            <div className="mt-4 w-full max-w-md rounded-3xl border border-white/10 bg-slate-800/80 px-4 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.35)]">
              <p className="text-center text-[11px] font-black uppercase tracking-[0.22em] text-slate-300">
                {switcherLabel}
              </p>
              <p className="mt-2 text-center text-xs leading-relaxed text-slate-400">
                {switcherHint}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {sortedWorkbookIds.map((id) => {
                  const isCurrentWorkbook = id === workbookId;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onSelectWorkbook?.(id)}
                      className={`min-w-[112px] rounded-full border px-4 py-2 text-sm font-bold transition-all active:scale-95 ${
                        isCurrentWorkbook
                          ? 'border-yellow-300 bg-yellow-400 text-slate-950 shadow-[0_4px_0_0_#ca8a04]'
                          : 'border-slate-500 bg-slate-700 text-slate-100 hover:border-slate-300'
                      }`}
                      aria-pressed={isCurrentWorkbook}
                    >
                      {workbookLabel} {id}
                    </button>
                  );
                })}
              </div>
              {onOpenWorkbookList && (
                <button
                  type="button"
                  onClick={onOpenWorkbookList}
                  className="mx-auto mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-cyan-300 transition hover:text-cyan-200"
                >
                  {listLabel}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-[32px] border border-yellow-300/20 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.18),_rgba(15,23,42,0.92)_58%)] px-5 py-6 shadow-[0_24px_60px_rgba(15,23,42,0.45)] sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-center justify-center gap-3 text-center">
            {courseFlag ? <span className="text-2xl">{courseFlag}</span> : null}
            {courseTitle ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-200">
                {courseTitle}
              </span>
            ) : null}
          </div>
          <h1 className="mt-5 text-center text-3xl font-black text-white sm:text-4xl">
            {heroTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-6 text-slate-200 sm:text-base">
            {heroDescription}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {bullets.map((bullet) => (
              <div
                key={bullet}
                className="rounded-3xl border border-white/10 bg-slate-950/35 px-4 py-4 text-sm font-semibold leading-6 text-slate-100"
              >
                {bullet}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl bg-yellow-400 px-6 py-4 text-center text-sm font-black text-slate-950 shadow-[0_5px_0_0_#ca8a04] transition active:translate-y-1"
            >
              {ctaLabel}
            </a>
            <button
              type="button"
              onClick={onOpenTracks}
              className="rounded-2xl border border-slate-500 bg-slate-800/90 px-6 py-4 text-sm font-bold text-slate-100 transition hover:border-slate-300"
            >
              {secondaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
