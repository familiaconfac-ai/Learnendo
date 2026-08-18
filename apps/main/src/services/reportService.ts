/**
 * reportService.ts
 *
 * PDF report generator for the teacher dashboard.
 * Generates a downloadable parent-facing progress report for a single student.
 *
 * Uses jsPDF (MIT licence) — pure client-side, no server needed.
 * Output: A4 portrait, clean layout.
 */

import jsPDF from 'jspdf';
import type { TeacherStudentRow } from '../engine/teacherService';
import type { ActiveCourse, PlacementAnswerItem, StudentStudyProfile } from '../types';
import { formatTime, formatAccuracy, MAX_WORKBOOK, MAX_LESSON, MAX_DAY } from '../engine/progressStatsService';

// Human-readable labels for course IDs used in the Active Courses section.
const COURSE_LABELS: Record<string, string> = {
  'english':               'English',
  'english-native':        'English (Native)',
  'portuguese_foreigners': 'Portuguese',
  'portuguese_native':     'Portuguese (Native)',
  'spanish':               'Spanish',
  'greek_koine':           'Greek (Koine)',
  'hebrew_biblical':       'Hebrew (Biblical)',
};

// ─────────────────────────────────────────────────────────────
// Layout constants
// ─────────────────────────────────────────────────────────────

const PAGE_W   = 210; // A4 mm width
const MARGIN   = 18;
const COL_W    = PAGE_W - MARGIN * 2;
const HALF_W   = COL_W / 2;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function col2x(): number { return MARGIN + HALF_W + 6; }

/** Fill a rounded rect with a solid colour (draw-then-fill technique). */
function roundRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillColour: string,
): void {
  doc.setFillColor(fillColour);
  doc.roundedRect(x, y, w, h, r, r, 'F');
}

/** Thin horizontal rule. */
function rule(doc: jsPDF, y: number): void {
  doc.setDrawColor('#e2e8f0');
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
}

/** Section heading. */
function sectionHead(doc: jsPDF, text: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor('#1e40af');
  doc.text(text.toUpperCase(), MARGIN, y);
  rule(doc, y + 2);
  return y + 8;
}

/** Two-column label + value row. */
function labelValue(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor('#64748b');
  doc.text(label, x, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#1e293b');
  doc.text(value, x + 38, y);
}

/** Coloured stat box (gamification tiles) — text-only, no emoji for PDF compatibility. */
function statBox(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  bgColour: string,
): void {
  roundRect(doc, x, y, 38, 22, 3, bgColour);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor('#ffffff');
  doc.text(value, x + 4, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(label, x + 4, y + 20);
}

/** Progress bar (width proportional to pct 0–100). */
function progressBar(
  doc: jsPDF,
  label: string,
  pct: number,
  x: number,
  y: number,
  barW: number,
): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor('#475569');
  doc.text(label, x, y);

  const barX = x + 28;
  const barH = 4;
  // Track
  roundRect(doc, barX, y - 3.5, barW, barH, 1.5, '#e2e8f0');
  // Fill
  const fillW = Math.max(2, (pct / 100) * barW);
  const fillClr = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  roundRect(doc, barX, y - 3.5, fillW, barH, 1.5, fillClr);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor('#1e293b');
  doc.text(`${pct}%`, barX + barW + 2, y);
}

/** Format an ISO date string as a short relative/absolute label for PDF display. */
function formatRelativeDateShort(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 10);
    const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30)  return `${days}d ago`;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Generate and download a PDF progress report for a student.
 * Triggers a browser download automatically.
 *
 * @param student  Enriched student row from the teacher dashboard
 */
export function generateStudentReport(student: TeacherStudentRow): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const name      = student.displayName || 'Student';
  const email     = student.email       || '—';
  const wb        = student.currentWorkbook ?? 1;
  const ls        = student.currentLesson   ?? 1;
  const dy        = student.currentDay      ?? 1;
  const today     = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const courseLabel = student.courseId ?? student.languageCode ?? null;
  const profile: StudentStudyProfile = student.studyProfile ?? {};

  let y = MARGIN;

  // ── HEADER BANNER ─────────────────────────────────────────
  roundRect(doc, 0, 0, PAGE_W, 38, 0, '#1e40af');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor('#ffffff');
  doc.text('Student Progress Report', MARGIN, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor('#bfdbfe');
  doc.text(`Generated on ${today} · Learnendo`, MARGIN, 25);
  doc.setFontSize(10);
  doc.setTextColor('#ffffff');
  doc.text(`${name}`, MARGIN, 34);
  y = 48;

  // ── STUDENT INFO ──────────────────────────────────────────
  y = sectionHead(doc, '1. Student Information', y);
  labelValue(doc, 'Name',   name,  MARGIN,    y);
  labelValue(doc, 'Email',  email, col2x(),   y);
  y += 8;  if (courseLabel) {
    labelValue(doc, 'Course / Language', courseLabel, MARGIN, y);
    y += 8;
  }
  // ── PROGRESS ─────────────────────────────────────────────
  y = sectionHead(doc, '2. Learning Position', y);
  labelValue(doc, 'Workbook', `${wb} / ${MAX_WORKBOOK}`, MARGIN,  y);
  labelValue(doc, 'Lesson',   `${ls} / ${MAX_LESSON}`,   col2x(), y);
  y += 8;
  labelValue(doc, 'Exercise', `${dy} / ${MAX_DAY}`,      MARGIN,  y);
  labelValue(doc, 'Rank',     `#${student.rank}`,          col2x(), y);
  y += 8;

  // Overall course progress bar
  const coursePct = Math.round(
    ((wb - 1) * MAX_LESSON * MAX_DAY + (ls - 1) * MAX_DAY + dy) /
    (MAX_WORKBOOK * MAX_LESSON * MAX_DAY) * 100,
  );
  progressBar(doc, 'Overall progress', coursePct, MARGIN, y, COL_W - 20);
  y += 12;

  // ── STATS ─────────────────────────────────────────────────
  y = sectionHead(doc, '3. Performance Statistics', y);
  const exDone  = student.daysCompleted   > 0 ? String(student.daysCompleted)   : '—';
  const timeTdy = student.timeSpentToday  ? formatTime(student.timeSpentToday)  : '—';
  const timeTot = student.totalTimeSpent  > 0 ? formatTime(student.totalTimeSpent) : '—';
  const attempts = student.totalAttempts  > 0 ? String(student.totalAttempts)   : '—';
  const errors   = student.totalErrors    > 0 ? String(student.totalErrors)     : '—';
  labelValue(doc, 'Exercises completed', exDone,   MARGIN,  y);
  labelValue(doc, 'Study time today',    timeTdy,  col2x(), y);
  y += 8;
  labelValue(doc, 'Total study time',   timeTot,  MARGIN,  y);
  labelValue(doc, 'Total responses',    attempts, col2x(), y);
  y += 8;
  labelValue(doc, 'Total errors',       errors,   MARGIN,  y);
  y += 8;
  progressBar(doc, 'Accuracy', student.avgAccuracy, MARGIN, y, COL_W - 20);
  y += 12;

  // ── GAMIFICATION ──────────────────────────────────────────
  y = sectionHead(doc, '4. Gamification Scores', y);
  const boxY = y;
  // 4 boxes in a row
  const boxGap = (COL_W - 4 * 38) / 3;
  statBox(doc, 'Fire',     String(student.totalFire),     MARGIN,                     boxY, '#f97316');
  statBox(doc, 'Ice',      String(student.totalIce),      MARGIN + 38 + boxGap,       boxY, '#0ea5e9');
  statBox(doc, 'Diamonds', String(student.totalDiamonds), MARGIN + 2 * (38 + boxGap), boxY, '#a855f7');
  statBox(doc, 'Stars',    String(student.totalStars),    MARGIN + 3 * (38 + boxGap), boxY, '#eab308');
  y = boxY + 30;

  // Ranking score (formula removed — kept in rankingService.ts)
  roundRect(doc, MARGIN, y, COL_W, 12, 3, '#f1f5f9');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor('#1e293b');
  doc.text(`Ranking score: ${student.score.toFixed(1)}`, MARGIN + 4, y + 8);
  y += 18;

  // ── ALERTS ────────────────────────────────────────────────
  if (student.alerts.length > 0) {
    y = sectionHead(doc, '5. Active Alerts', y);
    const alertColours: Record<string, string> = {
      inactive:     '#fef9c3',
      low_accuracy: '#fee2e2',
      high_errors:  '#fce7f3',
    };
    const alertIcons: Record<string, string> = {
      inactive:     '⏰',
      low_accuracy: '📉',
      high_errors:  '⚠️',
    };
    for (const alert of student.alerts) {
      roundRect(doc, MARGIN, y - 4, COL_W, 10, 2, alertColours[alert.type] ?? '#f8fafc');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor('#1e293b');
      doc.text(`${alertIcons[alert.type] ?? '•'}  ${alert.message}`, MARGIN + 4, y + 2);
      y += 13;
    }
    y += 2;
  }

  // ── TESTS PERFORMANCE ─────────────────────────────────────
  // Always render this section — show "Not Done" when no data exists yet.
  // Students who completed the test before the mirror-to-progress-doc change
  // was deployed will show "Not Done" until their doc is back-filled.
  // Running section counter: sections 1-4 are fixed; 5+ are conditional.
  let nextSection = student.alerts.length > 0 ? 6 : 5;
  {
    y = sectionHead(doc, `${nextSection}. Tests Performance`, y);
    nextSection++;

    if (student.tests?.placement) {
      const pt = student.tests.placement;
      let ptLabel = `${pt.score}%`;
      if (pt.level) ptLabel += ` — ${pt.level}`;
      if (pt.date) {
        try {
          const d = new Date(pt.date);
          if (!isNaN(d.getTime())) {
            ptLabel += ` · ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
          }
        } catch { /* ignore unparseable date */ }
      }
      labelValue(doc, 'Placement Test', ptLabel, MARGIN, y);
    } else {
      labelValue(doc, 'Placement Test', 'Not Done', MARGIN, y);
    }
    y += 8;

    const lessonTests = Object.entries(student.tests?.lessons ?? {});
    for (const [, test] of lessonTests) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor('#1e293b');
      doc.text(
        `W${test.workbook}  L${test.lesson}  →  ${test.score}%`,
        MARGIN + 4,
        y,
      );
      y += 7;
    }
    y += 4;
  }

  // ── ACTIVE COURSES ────────────────────────────────────────
  // Shows every course the student has had real activity in.
  // Falls back to the single current courseId for legacy docs with no courses map.
  const courseEntries: [string, ActiveCourse][] = Object.entries(student.courses ?? {});
  // Fallback for legacy docs: if no courses map but courseId is set, synthesise one entry.
  if (courseEntries.length === 0 && student.courseId) {
    courseEntries.push([student.courseId, {
      courseId: student.courseId,
      languageCode: student.languageCode,
      lastActivityAt: '',
      currentWorkbook: student.currentWorkbook,
      currentLesson:   student.currentLesson,
      currentDay:      student.currentDay,
    }]);
  }
  if (courseEntries.length > 0 && y < 240) {
    y = sectionHead(doc, `${nextSection}. Active Courses`, y);
    nextSection++;

    for (const [, entry] of courseEntries) {
      const courseLabel = COURSE_LABELS[entry.courseId] ?? entry.courseId;
      // Placement result for this course (check per-language map first)
      const lc = entry.languageCode;
      const ptRecord = lc
        ? (student.tests?.placements?.[lc] ?? null)
        : (student.tests?.placement ?? null);
      const placementLabel = ptRecord
        ? `${ptRecord.score}% — ${ptRecord.level ?? ''}`
        : 'Not done';
      const wb  = entry.currentWorkbook ?? 1;
      const ls  = entry.currentLesson   ?? 1;
      const dy  = entry.currentDay      ?? 1;
      const posLabel = `Wbk ${wb}/8 · L${ls}/12 · Ex ${dy}/7`;
      const lastAct = entry.lastActivityAt ? formatRelativeDateShort(entry.lastActivityAt) : '—';

      // Compact row: bg strip + label left, data right
      roundRect(doc, MARGIN, y - 3, COL_W, 14, 2, '#f0f9ff');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor('#1e40af');
      doc.text(courseLabel, MARGIN + 4, y + 3);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor('#1e293b');
      doc.text(`Placement: ${placementLabel}`, col2x(), y + 3);
      doc.setTextColor('#475569');
      doc.text(posLabel, MARGIN + 4, y + 9);
      doc.text(`Last activity: ${lastAct}`, col2x(), y + 9);
      y += 17;
    }
    y += 2;
  }

  // ── STUDY PROFILE ─────────────────────────────────────────
  // Tests Performance is always rendered now, so profile is always one section higher.
  if (y < 250) {
    y = sectionHead(doc, `${nextSection}. Study Profile`, y);
    labelValue(doc, 'Access type',    profile.appAccessType     ?? '—', MARGIN,  y);
    labelValue(doc, 'PDF workbook',   profile.pdfStatus         ?? '—', col2x(), y);
    y += 8;
    labelValue(doc, 'Online classes', profile.onlineClassStatus ?? '—', MARGIN,  y);
    labelValue(doc, 'Study mode',     profile.studyMode         ?? '—', col2x(), y);
    y += 8;
    if (profile.startDate) {
      labelValue(doc, 'Start date', profile.startDate, MARGIN, y);
      y += 8;
    }
  }

  // ── FOOTER ────────────────────────────────────────────────
  const placement = student.tests?.placement;
  if (placement) {
    doc.addPage();
    y = MARGIN;
    y = sectionHead(doc, `${nextSection}. Placement Test`, y);

    const parsedTestDate = placement.date ? new Date(placement.date) : null;
    const testDate = parsedTestDate && !isNaN(parsedTestDate.getTime())
      ? parsedTestDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';
    const bookLevel = placement.recommendedBook
      ? `Book ${placement.recommendedBook}${placement.level ? ` · ${placement.level}` : ''}`
      : (placement.level ?? '—');
    const entryPoint = placement.recommendedEntryPoint ?? bookLevel;

    labelValue(doc, 'Test date', testDate, MARGIN, y);
    labelValue(doc, 'Score', `${placement.score}%`, col2x(), y);
    y += 8;
    labelValue(doc, 'Book / level', bookLevel, MARGIN, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor('#64748b');
    doc.text('Recommended Entry Point', MARGIN, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#1e293b');
    const entryLines = doc.splitTextToSize(entryPoint, COL_W - 48);
    doc.text(entryLines, MARGIN + 48, y);
    y += Math.max(8, entryLines.length * 5 + 3);

    const breakdown: PlacementAnswerItem[] = placement.answerBreakdown ?? [];
    const skillStats = new Map<string, { correct: number; total: number }>();
    for (const answer of breakdown) {
      const stat = skillStats.get(answer.skillType) ?? { correct: 0, total: 0 };
      stat.total += 1;
      if (answer.isCorrect) stat.correct += 1;
      skillStats.set(answer.skillType, stat);
    }

    if (skillStats.size > 0) {
      y = sectionHead(doc, 'Skill Breakdown', y);
      for (const [skill, stat] of skillStats) {
        if (y > 272) {
          doc.addPage();
          y = MARGIN;
        }
        const pct = Math.round((stat.correct / stat.total) * 100);
        const label = skill === 'multiple-choice'
          ? 'Grammar'
          : skill.charAt(0).toUpperCase() + skill.slice(1);
        labelValue(doc, label, `${stat.correct} / ${stat.total} (${pct}%)`, MARGIN, y);
        y += 7;
      }
      y += 3;
    }

    const incorrect = breakdown.filter((answer) => !answer.isCorrect);
    y = sectionHead(doc, `Questions Answered Incorrectly (${incorrect.length})`, y);
    if (incorrect.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor('#16a34a');
      doc.text('No incorrect answers recorded.', MARGIN, y);
    } else {
      incorrect.forEach((answer, index) => {
        const questionLines = doc.splitTextToSize(answer.prompt, COL_W - 8);
        const studentLines = doc.splitTextToSize(answer.studentAnswer ?? 'No answer', COL_W - 35);
        const correctLines = doc.splitTextToSize(answer.correctAnswer, COL_W - 35);
        const noteLines = answer.explanation ? doc.splitTextToSize(answer.explanation, COL_W - 12) : [];
        const requiredHeight = 12 + (questionLines.length + studentLines.length + correctLines.length + noteLines.length) * 4;
        if (y + requiredHeight > 278) {
          doc.addPage();
          y = MARGIN;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor('#1e293b');
        doc.text(`${index + 1}.`, MARGIN, y);
        doc.text(questionLines, MARGIN + 7, y);
        y += questionLines.length * 4.5 + 3;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor('#b91c1c');
        doc.text('Student answer:', MARGIN + 4, y);
        doc.text(studentLines, MARGIN + 35, y);
        y += studentLines.length * 4 + 2;
        doc.setTextColor('#15803d');
        doc.text('Correct answer:', MARGIN + 4, y);
        doc.text(correctLines, MARGIN + 35, y);
        y += correctLines.length * 4 + 2;

        if (noteLines.length > 0) {
          doc.setFont('helvetica', 'italic');
          doc.setTextColor('#475569');
          doc.text('Note:', MARGIN + 4, y);
          doc.text(noteLines, MARGIN + 16, y);
          y += noteLines.length * 4 + 2;
        }
        rule(doc, y);
        y += 6;
      });
    }
  }

  const footerY = 287;
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    rule(doc, footerY - 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor('#94a3b8');
    doc.text('Learnendo  ·  Confidential  ·  For parent/guardian use only', MARGIN, footerY);
    doc.text(`Page ${page}`, PAGE_W - MARGIN - 12, footerY);
  }

  // ── DOWNLOAD ──────────────────────────────────────────────
  const filename = `learnendo_report_${name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
