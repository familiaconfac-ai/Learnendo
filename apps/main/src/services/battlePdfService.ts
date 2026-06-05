import jsPDF from 'jspdf';
import type { BattleQuestion, SavedBattleTemplate } from '../components/LiveClasses/Battle/battleTypes';
import {
  getBattleCorrectAnswerLabel,
  getBattleCorrectIndexes,
  getBattleQuestionDuration,
  getSavedBattleTemplateLanguage,
  repairBattleTextEncoding,
} from '../components/LiveClasses/Battle/battleUtils';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 16;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

type BattlePdfLanguage = 'en' | 'pt' | 'es' | 'el' | 'he';

const PDF_COPY: Record<BattlePdfLanguage, {
  worksheetTitle: string;
  generatedOn: string;
  course: string;
  workbook: string;
  lesson: string;
  questions: string;
  time: string;
  kind: string;
  correctAnswer: string;
  explanation: string;
}> = {
  en: {
    worksheetTitle: 'Battle Worksheet',
    generatedOn: 'Generated on',
    course: 'Course',
    workbook: 'Workbook',
    lesson: 'Lesson',
    questions: 'Questions',
    time: 'Time',
    kind: 'Type',
    correctAnswer: 'Correct answer',
    explanation: 'Explanation',
  },
  pt: {
    worksheetTitle: 'Battle para Imprimir',
    generatedOn: 'Gerado em',
    course: 'Curso',
    workbook: 'Workbook',
    lesson: 'Licao',
    questions: 'Perguntas',
    time: 'Tempo',
    kind: 'Tipo',
    correctAnswer: 'Resposta certa',
    explanation: 'Explicacao',
  },
  es: {
    worksheetTitle: 'Batalla para Imprimir',
    generatedOn: 'Generado en',
    course: 'Curso',
    workbook: 'Workbook',
    lesson: 'Leccion',
    questions: 'Preguntas',
    time: 'Tiempo',
    kind: 'Tipo',
    correctAnswer: 'Respuesta correcta',
    explanation: 'Explicacion',
  },
  el: {
    worksheetTitle: 'Battle Worksheet',
    generatedOn: 'Generated on',
    course: 'Course',
    workbook: 'Workbook',
    lesson: 'Lesson',
    questions: 'Questions',
    time: 'Time',
    kind: 'Type',
    correctAnswer: 'Correct answer',
    explanation: 'Explanation',
  },
  he: {
    worksheetTitle: 'Battle Worksheet',
    generatedOn: 'Generated on',
    course: 'Course',
    workbook: 'Workbook',
    lesson: 'Lesson',
    questions: 'Questions',
    time: 'Time',
    kind: 'Type',
    correctAnswer: 'Correct answer',
    explanation: 'Explanation',
  },
};

function normalizePdfText(value?: string): string {
  return (repairBattleTextEncoding(value) ?? value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugifyFileName(value: string): string {
  const normalized = normalizePdfText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'battle';
}

function ensurePageSpace(doc: jsPDF, y: number, needed = 18): number {
  if (y + needed <= PAGE_HEIGHT - MARGIN) {
    return y;
  }

  doc.addPage();
  return MARGIN;
}

function writeWrappedText(doc: jsPDF, text: string, x: number, y: number, width: number, lineHeight = 5): number {
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function formatQuestionKind(question: BattleQuestion): string {
  switch (question.kind) {
    case 'audio-choice':
      return 'audio-choice';
    case 'audio-open':
      return 'audio-open';
    case 'image-choice':
      return 'image-choice';
    case 'speaking':
      return 'speaking';
    default:
      return 'multiple-choice';
  }
}

export function downloadBattleTemplatePdf(template: SavedBattleTemplate): void {
  const language = getSavedBattleTemplateLanguage(template);
  const copy = PDF_COPY[language] ?? PDF_COPY.en;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const title = normalizePdfText(template.title) || copy.worksheetTitle;
  const generatedOn = new Date().toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US');

  let y = MARGIN;

  doc.setFillColor('#0f172a');
  doc.rect(0, 0, PAGE_WIDTH, 30, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor('#ffffff');
  doc.text(title, MARGIN, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor('#cbd5e1');
  doc.text(`${copy.generatedOn} ${generatedOn}`, MARGIN, 22);
  y = 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor('#111827');
  doc.text(`${copy.course}:`, MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.text(normalizePdfText(template.config.courseId) || '-', MARGIN + 24, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`${copy.workbook}:`, MARGIN + 78, y);
  doc.setFont('helvetica', 'normal');
  doc.text(String(template.config.workbookId ?? '-'), MARGIN + 104, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.text(`${copy.lesson}:`, MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.text(normalizePdfText(template.config.lessonId) || '-', MARGIN + 22, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`${copy.questions}:`, MARGIN + 78, y);
  doc.setFont('helvetica', 'normal');
  doc.text(String(template.questions.length), MARGIN + 106, y);
  y += 10;

  doc.setDrawColor('#cbd5e1');
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 8;

  template.questions.forEach((question, index) => {
    const prompt = normalizePdfText(question.text) || `Question ${index + 1}`;
    const hint = normalizePdfText(question.hint);
    const duration = getBattleQuestionDuration(question, template.config);
    const correctIndexes = getBattleCorrectIndexes(question);

    y = ensurePageSpace(doc, y, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor('#111827');
    y = writeWrappedText(doc, `${index + 1}. ${prompt}`, MARGIN, y, CONTENT_WIDTH, 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor('#475569');
    y = writeWrappedText(
      doc,
      `${copy.kind}: ${formatQuestionKind(question)}   ${copy.time}: ${duration}s`,
      MARGIN,
      y + 1,
      CONTENT_WIDTH,
      4.5,
    );

    (question.options ?? []).forEach((option, optionIndex) => {
      y = ensurePageSpace(doc, y + 1, 10);
      const optionLetter = String.fromCharCode(65 + optionIndex);
      const isCorrect = correctIndexes.includes(optionIndex);
      doc.setFont('helvetica', isCorrect ? 'bold' : 'normal');
      doc.setFontSize(10);
      doc.setTextColor(isCorrect ? '#065f46' : '#1f2937');
      y = writeWrappedText(
        doc,
        `${optionLetter}) ${normalizePdfText(option)}`,
        MARGIN + 4,
        y + 1,
        CONTENT_WIDTH - 4,
        5,
      );
    });

    y = ensurePageSpace(doc, y + 2, 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor('#7c2d12');
    y = writeWrappedText(
      doc,
      `${copy.correctAnswer}: ${normalizePdfText(getBattleCorrectAnswerLabel(question)) || '-'}`,
      MARGIN + 4,
      y + 1,
      CONTENT_WIDTH - 4,
      4.8,
    );

    if (hint) {
      y = ensurePageSpace(doc, y + 2, 10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor('#334155');
      y = writeWrappedText(
        doc,
        `${copy.explanation}: ${hint}`,
        MARGIN + 4,
        y + 1,
        CONTENT_WIDTH - 4,
        4.8,
      );
    }

    y += 5;
    doc.setDrawColor('#e2e8f0');
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 7;
  });

  doc.save(`${slugifyFileName(title)}.pdf`);
}
