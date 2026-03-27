/**
 * placementReportService.ts
 *
 * Generates a detailed PDF for a single Placement Test attempt.
 * Always reflects the most recent attempt stored in `student.tests.placement`.
 *
 * Used exclusively by the "Placement" column button in the Teacher Dashboard.
 * The general student report (reportService.ts) shows only a summary.
 *
 * Uses jsPDF (MIT licence) — pure client-side.
 * Output: A4 portrait.
 */

import jsPDF from 'jspdf';
import { TeacherStudentRow } from '../engine/teacherService';
import { PlacementAnswerItem } from '../types';
import { CEFR_LEVELS } from '../data/placementTestQuestions';
import { PLACEMENT_TEST_QUESTIONS_PT } from '../data/placementTestQuestions_pt';

// ─────────────────────────────────────────────────────────────
// Layout constants
// ─────────────────────────────────────────────────────────────

const PAGE_W   = 210;  // A4 mm
const PAGE_H   = 297;
const MARGIN   = 16;
const COL_W    = PAGE_W - MARGIN * 2;
const HALF_W   = COL_W / 2;

// Fast lookup for PT question translations (by question ID)
const ptQuestionMap = new Map(PLACEMENT_TEST_QUESTIONS_PT.map(q => [q.id, q]));

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function col2x(): number { return MARGIN + HALF_W + 6; }

function roundRect(
  doc: jsPDF, x: number, y: number, w: number, h: number, r: number, fill: string,
): void {
  doc.setFillColor(fill);
  doc.roundedRect(x, y, w, h, r, r, 'F');
}

function rule(doc: jsPDF, y: number): void {
  doc.setDrawColor('#e2e8f0');
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
}

function sectionHead(doc: jsPDF, text: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor('#1e40af');
  doc.text(text.toUpperCase(), MARGIN, y);
  rule(doc, y + 2);
  return y + 8;
}

function labelValue(doc: jsPDF, label: string, value: string, x: number, y: number): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor('#64748b');
  doc.text(label, x, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#1e293b');
  doc.text(value, x + 42, y);
}

function progressBar(doc: jsPDF, label: string, pct: number, x: number, y: number, barW: number): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor('#475569');
  doc.text(label, x, y);
  const barX = x + 30;
  const barH = 4;
  roundRect(doc, barX, y - 3.5, barW, barH, 1.5, '#e2e8f0');
  const fillW = Math.max(2, (pct / 100) * barW);
  const fillClr = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  roundRect(doc, barX, y - 3.5, fillW, barH, 1.5, fillClr);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor('#1e293b');
  doc.text(`${pct}%`, barX + barW + 2, y);
}

/** Ensure y does not overflow the page; adds a new page if needed. Returns new y. */
function checkPage(doc: jsPDF, y: number, footerLabel: string, pageLabel: string, needed = 20): number {
  if (y + needed > PAGE_H - 16) {
    doc.addPage();
    // Footer on each page
    addFooter(doc, footerLabel, pageLabel);
    return MARGIN + 8;
  }
  return y;
}

function addFooter(doc: jsPDF, reportLabel: string, pageLabel: string): void {
  const footerY = 291;
  doc.setDrawColor('#e2e8f0');
  doc.setLineWidth(0.3);
  doc.line(MARGIN, footerY - 2, PAGE_W - MARGIN, footerY - 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor('#94a3b8');
  doc.text(reportLabel, MARGIN, footerY + 2);
  doc.text(`${pageLabel} ${doc.getNumberOfPages()}`, PAGE_W - MARGIN - 14, footerY + 2);
}

// ─────────────────────────────────────────────────────────────
// Skill breakdown builder
// ─────────────────────────────────────────────────────────────

interface SkillStat {
  correct: number;
  total: number;
}

function buildSkillStats(breakdown: PlacementAnswerItem[]): Record<string, SkillStat> {
  const stats: Record<string, SkillStat> = {};
  for (const item of breakdown) {
    const key = item.skillType;
    if (!stats[key]) stats[key] = { correct: 0, total: 0 };
    stats[key].total++;
    if (item.isCorrect) stats[key].correct++;
  }
  return stats;
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Generate and download a detailed Placement Test PDF report.
 * Always uses the most recent attempt stored in `student.tests.placement`.
 *
 * @param student  Enriched student row from the teacher dashboard
 */
export function generatePlacementReport(student: TeacherStudentRow): void {
  const pt = student.tests?.placement;
  if (!pt) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const isPT = (pt.languageCode ?? 'en') === 'pt';
  const locale = isPT ? 'pt-BR' : 'en-GB';

  // ── Localised string table ────────────────────────────────
  const L = isPT ? {
    footerLabel:    'Learnendo  ·  Relatório de Teste de Nivelamento  ·  Confidencial',
    pageLabel:      'Página',
    headerTitle:    'Teste de Nivelamento  ·  Relatório Detalhado',
    generatedOn:    (d: string) => `Gerado em ${d}  ·  Learnendo`,
    s1:             '1. Informações do Aluno e do Teste',
    lblStudent:     'Aluno',
    lblTestDate:    'Data do Teste',
    lblWhatsApp:    'WhatsApp',
    lblLanguage:    'Idioma',
    s2:             '2. Resumo dos Resultados',
    correctBox:     (c: number, t: number) => `${c} / ${t} correto(s)`,
    entryBox:       'Ponto de Partida Recomendado',
    labelOverall:   'Pontuação geral',
    s3:             '3. Desempenho por Habilidade',
    skillLabels:    { listening: 'Escuta', 'multiple-choice': 'Gramática', reading: 'Compreensão de Leitura', vocabulary: 'Vocabulário' } as Record<string, string>,
    s4:             (wrong: number, tot: number) => `4. Questões Respondidas Incorretamente  (${wrong} de ${tot})`,
    perfect:        'Pontuação perfeita — nenhuma resposta incorreta!',
    yourAnswer:     'Sua resposta:',
    correctAnswer:  'Resposta correta:',
    noAnswer:       'Sem resposta',
    s5:             '5. Registro Completo das Questões',
    tableHeaders:   ['#', 'Questão', 'Resposta do Aluno', 'Resposta Correta', 'Resultado'],
  } : {
    footerLabel:    'Learnendo  ·  Placement Test Report  ·  Confidential',
    pageLabel:      'Page',
    headerTitle:    'Placement Test  ·  Detailed Report',
    generatedOn:    (d: string) => `Generated on ${d}  ·  Learnendo`,
    s1:             '1. Student & Test Information',
    lblStudent:     'Student',
    lblTestDate:    'Test Date',
    lblWhatsApp:    'WhatsApp',
    lblLanguage:    'Language',
    s2:             '2. Result Summary',
    correctBox:     (c: number, t: number) => `${c} / ${t} correct`,
    entryBox:       'Recommended Entry Point',
    labelOverall:   'Overall score',
    s3:             '3. Skill Breakdown',
    skillLabels:    { listening: 'Listening', 'multiple-choice': 'Grammar', reading: 'Reading Comprehension', vocabulary: 'Vocabulary' } as Record<string, string>,
    s4:             (wrong: number, tot: number) => `4. Questions Answered Incorrectly  (${wrong} of ${tot})`,
    perfect:        'Perfect score — no incorrect answers!',
    yourAnswer:     'Your answer:',
    correctAnswer:  'Correct answer:',
    noAnswer:       'No answer',
    s5:             '5. Full Question Log',
    tableHeaders:   ['#', 'Question (prompt)', 'Student Answer', 'Correct Answer', 'Result'],
  };

  const name      = pt.fullName || student.displayName || (isPT ? 'Aluno' : 'Student');
  const level     = pt.level ?? '—';
  const score     = pt.score ?? 0;
  const correct   = pt.correctAnswers ?? 0;
  const total     = pt.totalQuestions ?? 50;
  const today     = new Date().toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
  const testDate  = pt.date
    ? (() => {
        try {
          const d = new Date(pt.date);
          return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
        } catch { return '—'; }
      })()
    : '—';

  const levelInfo = CEFR_LEVELS[level as keyof typeof CEFR_LEVELS];
  const entryPoint = levelInfo?.entryPoint ?? '—';
  const levelRange = levelInfo?.range ?? '—';

  const breakdown: PlacementAnswerItem[] = pt.answerBreakdown ?? [];
  const wrongItems = breakdown.filter(i => !i.isCorrect);
  const skillStats = buildSkillStats(breakdown);

  let y = MARGIN;

  // ── HEADER BANNER ─────────────────────────────────────────
  roundRect(doc, 0, 0, PAGE_W, 40, 0, '#1e3a8a');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor('#ffffff');
  doc.text(L.headerTitle, MARGIN, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor('#bfdbfe');
  doc.text(L.generatedOn(today), MARGIN, 24);
  doc.setFontSize(10.5);
  doc.setTextColor('#ffffff');
  doc.text(name, MARGIN, 35);
  y = 50;

  addFooter(doc, L.footerLabel, L.pageLabel);

  // ── 1. STUDENT & TEST INFO ────────────────────────────────
  y = sectionHead(doc, L.s1, y);
  labelValue(doc, L.lblStudent,   name,               MARGIN,   y);
  labelValue(doc, L.lblTestDate,  testDate,            col2x(), y);
  y += 8;
  labelValue(doc, L.lblWhatsApp,  pt.whatsapp ?? '—', MARGIN,   y);
  labelValue(doc, L.lblLanguage,  pt.languageCode?.toUpperCase() ?? 'EN', col2x(), y);
  y += 12;

  // ── 2. RESULT SUMMARY ────────────────────────────────────
  y = sectionHead(doc, L.s2, y);

  // Level badge
  roundRect(doc, MARGIN, y - 2, 45, 20, 3, '#1e40af');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor('#ffffff');
  doc.text(level, MARGIN + 4, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(levelRange, MARGIN + 4, y + 17);

  // Score box
  roundRect(doc, MARGIN + 50, y - 2, 45, 20, 3, '#0f766e');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor('#ffffff');
  doc.text(`${score}%`, MARGIN + 54, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(L.correctBox(correct, total), MARGIN + 54, y + 17);

  // Entry point box
  roundRect(doc, MARGIN + 100, y - 2, COL_W - 100, 20, 3, '#92400e');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor('#ffffff');
  doc.text(L.entryBox, MARGIN + 104, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(entryPoint, MARGIN + 104, y + 14);

  y += 26;
  progressBar(doc, L.labelOverall, score, MARGIN, y, COL_W - 20);
  y += 14;

  // ── 3. SKILL BREAKDOWN ───────────────────────────────────
  y = checkPage(doc, y, L.footerLabel, L.pageLabel, 40);
  y = sectionHead(doc, L.s3, y);

  const skillOrder = ['listening', 'multiple-choice', 'reading', 'vocabulary'];

  for (const skill of skillOrder) {
    const stat = skillStats[skill];
    if (!stat) continue;
    const pct = Math.round((stat.correct / stat.total) * 100);
    const label = L.skillLabels[skill] ?? skill;
    const detail = `${stat.correct}/${stat.total}`;
    y = checkPage(doc, y, L.footerLabel, L.pageLabel, 12);
    progressBar(doc, `${label} (${detail})`, pct, MARGIN, y, COL_W - 50);
    y += 11;
  }
  y += 4;

  // ── 4. TOP ERRORS (wrong answers) ────────────────────────
  y = checkPage(doc, y, L.footerLabel, L.pageLabel, 20);
  y = sectionHead(doc, L.s4(wrongItems.length, total), y);

  if (wrongItems.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor('#16a34a');
    doc.text(L.perfect, MARGIN, y);
    y += 12;
  } else {
    for (let i = 0; i < wrongItems.length; i++) {
      const item = wrongItems[i];

      // Estimate height needed for this block
      const promptLen = item.prompt.length;
      const promptLines = Math.ceil(promptLen / 90) + 1;
      const explanationLines = item.explanation ? Math.ceil(item.explanation.length / 90) + 1 : 0;
      // PT explanations render in 3 languages — allocate ~3.5× the single-language height
      const explanationBlockH = explanationLines * 5 * (isPT ? 3.5 : 1) + (isPT && item.explanation ? 18 : 0);
      const blockH = 8 + promptLines * 5 + 14 + (item.grammarTopic ? 6 : 0) + explanationBlockH + 6;

      y = checkPage(doc, y, L.footerLabel, L.pageLabel, blockH);

      // Question number + topic badge
      roundRect(doc, MARGIN, y - 3, COL_W, blockH, 3, '#fff7ed');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor('#92400e');
      doc.text(`Q${i + 1}`, MARGIN + 3, y + 3);

      if (item.grammarTopic) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor('#78350f');
        doc.text(`[${item.grammarTopic}]`, MARGIN + 14, y + 3);
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor('#94a3b8');
      doc.text(item.levelBand, PAGE_W - MARGIN - 12, y + 3);

      y += 7;

      // Prompt (wrapped)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor('#1e293b');
      const promptWrapped = doc.splitTextToSize(item.prompt, COL_W - 8);
      doc.text(promptWrapped, MARGIN + 3, y);
      y += promptWrapped.length * 4.5 + 3;

      // Student answer (wrong) — red
      roundRect(doc, MARGIN + 3, y - 3, (COL_W - 10) / 2 - 2, 10, 2, '#fee2e2');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor('#b91c1c');
      doc.text(L.yourAnswer, MARGIN + 6, y + 2);
      doc.setFont('helvetica', 'normal');
      const wrongAns = item.studentAnswer ?? L.noAnswer;
      const wrongWrapped = doc.splitTextToSize(wrongAns, (COL_W - 10) / 2 - 8);
      doc.text(wrongWrapped, MARGIN + 6, y + 6);

      // Correct answer — green
      const cx = MARGIN + 3 + (COL_W - 10) / 2 + 2;
      roundRect(doc, cx, y - 3, (COL_W - 10) / 2 - 2, 10, 2, '#dcfce7');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor('#15803d');
      doc.text(L.correctAnswer, cx + 3, y + 2);
      doc.setFont('helvetica', 'normal');
      const correctWrapped = doc.splitTextToSize(item.correctAnswer, (COL_W - 10) / 2 - 10);
      doc.text(correctWrapped, cx + 3, y + 6);

      y += 14;

      // Explanation
      if (item.explanation) {
        if (isPT) {
          // ── Trilingual explanation block ──────────────────
          const ptTranslations = ptQuestionMap.get(item.questionId)?.explanationTranslations;

          // Nota (Português):
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor('#1e40af');
          doc.text('Nota (Português):', MARGIN + 3, y);
          y += 4;
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor('#475569');
          const ptWrapped = doc.splitTextToSize(item.explanation, COL_W - 10);
          doc.text(ptWrapped, MARGIN + 3, y);
          y += ptWrapped.length * 4 + 3;

          if (ptTranslations) {
            y = checkPage(doc, y, L.footerLabel, L.pageLabel, 14);
            // English:
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor('#166534');
            doc.text('English:', MARGIN + 3, y);
            y += 4;
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(7.5);
            doc.setTextColor('#475569');
            const enWrapped = doc.splitTextToSize(ptTranslations.en, COL_W - 10);
            doc.text(enWrapped, MARGIN + 3, y);
            y += enWrapped.length * 4 + 3;

            y = checkPage(doc, y, L.footerLabel, L.pageLabel, 14);
            // Español:
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor('#7c3aed');
            doc.text('Español:', MARGIN + 3, y);
            y += 4;
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(7.5);
            doc.setTextColor('#475569');
            const esWrapped = doc.splitTextToSize(ptTranslations.es, COL_W - 10);
            doc.text(esWrapped, MARGIN + 3, y);
            y += esWrapped.length * 4 + 2;
          }
        } else {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor('#475569');
          const explWrapped = doc.splitTextToSize(`Note: ${item.explanation}`, COL_W - 10);
          doc.text(explWrapped, MARGIN + 3, y);
          y += explWrapped.length * 4 + 2;
        }
      }

      y += 6;
    }
  }

  // ── 5. SUMMARY TABLE (all questions) ─────────────────────
  if (breakdown.length > 0) {
    y = checkPage(doc, y, L.footerLabel, L.pageLabel, 30);
    y = sectionHead(doc, L.s5, y);

    // Table header
    const colWidths = [10, 88, 30, 30, 16];
    const colX = [MARGIN, MARGIN + 10, MARGIN + 98, MARGIN + 128, MARGIN + 158];
    roundRect(doc, MARGIN, y - 3, COL_W, 8, 1, '#1e40af');
    const headers = L.tableHeaders;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor('#ffffff');
    for (let c = 0; c < headers.length; c++) {
      doc.text(headers[c], colX[c] + 1, y + 2);
    }
    y += 9;

    for (let i = 0; i < breakdown.length; i++) {
      const item = breakdown[i];
      y = checkPage(doc, y, L.footerLabel, L.pageLabel, 8);

      const rowH = 7;
      roundRect(doc, MARGIN, y - 3, COL_W, rowH, 0, i % 2 === 0 ? '#f8fafc' : '#ffffff');

      // Result indicator
      const resultFill = item.isCorrect ? '#dcfce7' : '#fee2e2';
      const resultText = item.isCorrect ? '✓' : '✗';
      const resultColor = item.isCorrect ? '#15803d' : '#b91c1c';
      roundRect(doc, colX[4], y - 2.5, colWidths[4], 6, 1, resultFill);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(resultColor);
      doc.text(resultText, colX[4] + 5, y + 1);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor('#334155');

      // Q number
      doc.text(String(i + 1), colX[0] + 1, y + 1);
      // Prompt (truncated)
      const shortPrompt = item.prompt.length > 65 ? item.prompt.slice(0, 62) + '…' : item.prompt;
      doc.text(shortPrompt, colX[1], y + 1);
      // Student answer (truncated)
      const sAns = (item.studentAnswer ?? '—').slice(0, 22);
      doc.setTextColor(item.isCorrect ? '#334155' : '#b91c1c');
      doc.text(sAns, colX[2], y + 1);
      // Correct answer (truncated)
      const cAns = item.correctAnswer.slice(0, 22);
      doc.setTextColor('#15803d');
      doc.text(cAns, colX[3], y + 1);

      y += 7;
    }
    y += 4;
  }

  // ── DOWNLOAD ──────────────────────────────────────────────
  const safeName = name.replace(/\s+/g, '_');
  const dateSlug = new Date().toISOString().slice(0, 10);
  const filename = `learnendo_placement_${safeName}_${dateSlug}.pdf`;
  doc.save(filename);
}
