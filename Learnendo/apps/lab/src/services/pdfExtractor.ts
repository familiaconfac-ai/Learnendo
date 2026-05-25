/**
 * PDF text extraction using pdfjs-dist (lazy loaded).
 *
 * The pdfjs worker is loaded from the unpkg CDN on first use.
 * This avoids bundling the large worker file while keeping setup simple.
 *
 * Requires an internet connection the first time a PDF is processed.
 * Subsequent calls reuse the same configured worker instance.
 */

export interface PdfExtractionResult {
  /** Concatenated text from all pages, separated by \n\n */
  fullText: string;
  /** Per-page text, index 0 = page 1 */
  pageTexts: string[];
  pageCount: number;
}

let workerConfigured = false;

/** Lazy-load pdfjs and configure the CDN worker exactly once. */
async function getPdfJs() {
  // Dynamic import keeps pdfjs-dist out of the initial bundle
  const pdfjs = await import('pdfjs-dist');
  if (!workerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc =
      `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    workerConfigured = true;
  }
  return pdfjs;
}

/**
 * Extracts all text from a PDF file.
 *
 * Each page's text items are joined with a single space; pages are separated
 * by double newlines. The order follows the logical reading order provided
 * by pdfjs (typically left-to-right, top-to-bottom).
 *
 * @throws If the file is encrypted, corrupt, or has no selectable text layer.
 */
export async function extractPdfText(file: File): Promise<PdfExtractionResult> {
  const pdfjs = await getPdfJs();

  const arrayBuffer = await file.arrayBuffer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loadingTask = (pdfjs as any).getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;

  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // TextItem has `str`; TextMarkedContent does not — filter defensively
    type RawItem = { str?: string };
    const pageText = (content.items as RawItem[])
      .filter((item): item is Required<RawItem> =>
        typeof item.str === 'string' && item.str.length > 0,
      )
      .map((item) => item.str)
      .join(' ');

    pageTexts.push(pageText);
  }

  return {
    fullText: pageTexts.join('\n\n'),
    pageTexts,
    pageCount: pdf.numPages as number,
  };
}
