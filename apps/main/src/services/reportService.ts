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
import { TeacherStudentRow } from '../engine/teacherService';
import { StudentStudyProfile } from '../types';
import { formatTime, formatAccuracy, MAX_WORKBOOK, MAX_LESSON, MAX_DAY } from '../engine/progressStatsService';

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

/** Coloured stat box (gamification tiles). */
function statBox(
  doc: jsPDF,
  emoji: string,
  label: string,
  value: string,
  x: number,
  y: number,
  bgColour: string,
): void {
  roundRect(doc, x, y, 38, 22, 3, bgColour);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor('#ffffff');
  doc.text(emoji, x + 4, y + 12);
  doc.setFontSize(11);
  doc.text(value, x + 18, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(label, x + 4, y + 19);
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
  labelValue(doc, 'Exercises completed', String(student.daysCompleted),          MARGIN,  y);
  labelValue(doc, 'Study time today',    formatTime(student.timeSpentToday ?? 0), col2x(), y);
  y += 8;
  labelValue(doc, 'Total study time',   formatTime(student.totalTimeSpent),      MARGIN,  y);
  labelValue(doc, 'Total responses',    String(student.totalAttempts),           col2x(), y);
  y += 8;
  labelValue(doc, 'Total errors',       String(student.totalErrors),             MARGIN,  y);
  y += 8;
  progressBar(doc, 'Accuracy',          student.avgAccuracy, MARGIN, y, COL_W - 20);
  y += 12;

  // ── GAMIFICATION ──────────────────────────────────────────
  y = sectionHead(doc, '4. Gamification Scores', y);
  const boxY = y;
  // 4 boxes in a row
  const boxGap = (COL_W - 4 * 38) / 3;
  statBox(doc, '🔥', 'Fire',     String(student.totalFire),     MARGIN,                       boxY, '#f97316');
  statBox(doc, '❄️',  'Ice',      String(student.totalIce),      MARGIN + 38 + boxGap,         boxY, '#0ea5e9');
  statBox(doc, '💎', 'Diamonds', String(student.totalDiamonds), MARGIN + 2 * (38 + boxGap),   boxY, '#a855f7');
  statBox(doc, '⭐', 'Stars',    String(student.totalStars),    MARGIN + 3 * (38 + boxGap),   boxY, '#eab308');
  y = boxY + 30;

  // Score
  roundRect(doc, MARGIN, y, COL_W, 12, 3, '#f1f5f9');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor('#1e293b');
  doc.text(`Ranking score: ${student.score.toFixed(1)}  ·  Formula: Stars×2 + Diamonds×3 + Accuracy÷10 + Exercises×0.2`, MARGIN + 4, y + 8);
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
  const hasTestData =
    student.tests?.placement ||
    Object.keys(student.tests?.lessons ?? {}).length > 0;

  if (hasTestData) {
    const sectionN = student.alerts.length > 0 ? '6' : '5';
    y = sectionHead(doc, `${sectionN}. Tests Performance`, y);

    if (student.tests?.placement) {
      const ptLabel = student.tests.placement.level
        ? `${student.tests.placement.score}% — ${student.tests.placement.level}`
        : `${student.tests.placement.score}%`;
      labelValue(doc, 'Placement Test', ptLabel, MARGIN, y);
      y += 8;
    }

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

  // ── STUDY PROFILE ─────────────────────────────────────────
  if (y < 250) {
    const profileN = hasTestData
      ? (student.alerts.length > 0 ? '7' : '6')
      : (student.alerts.length > 0 ? '6' : '5');
    y = sectionHead(doc, `${profileN}. Study Profile`, y);
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
  const footerY = 287;
  rule(doc, footerY - 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor('#94a3b8');
  doc.text('Learnendo  ·  Confidential  ·  For parent/guardian use only', MARGIN, footerY);
  doc.text(`Page 1`, PAGE_W - MARGIN - 12, footerY);

  // ── DOWNLOAD ──────────────────────────────────────────────
  const filename = `learnendo_report_${name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
