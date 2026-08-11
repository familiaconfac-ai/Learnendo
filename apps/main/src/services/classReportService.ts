import { jsPDF } from 'jspdf';
import type { ClassPerformanceReport, ClassReportStudent } from './classReportModel';

const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN = 12;
const CONTENT_W = PAGE_W - (MARGIN * 2);

function formatDate(date: Date) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function setText(doc: jsPDF, size: number, color: string, style: 'normal' | 'bold' = 'normal') {
  doc.setFont('helvetica', style);
  doc.setFontSize(size);
  doc.setTextColor(color);
}

function header(doc: jsPDF, report: ClassPerformanceReport, subtitle: string) {
  doc.setFillColor('#1e40af');
  doc.rect(0, 0, PAGE_W, 28, 'F');
  setText(doc, 17, '#ffffff', 'bold');
  doc.text('LEARNENDO', MARGIN, 12);
  setText(doc, 12, '#dbeafe', 'bold');
  doc.text('Class Performance Report', MARGIN, 21);
  setText(doc, 9, '#ffffff');
  doc.text(report.className, PAGE_W - MARGIN, 12, { align: 'right' });
  setText(doc, 8, '#bfdbfe');
  doc.text(subtitle, PAGE_W - MARGIN, 21, { align: 'right' });
}

function sectionTitle(doc: jsPDF, title: string, y: number) {
  setText(doc, 10, '#1e40af', 'bold');
  doc.text(title.toUpperCase(), MARGIN, y);
  doc.setDrawColor('#cbd5e1');
  doc.line(MARGIN, y + 2, PAGE_W - MARGIN, y + 2);
}

function statCard(doc: jsPDF, label: string, value: string, x: number, y: number, width: number) {
  doc.setFillColor('#f8fafc');
  doc.setDrawColor('#dbeafe');
  doc.roundedRect(x, y, width, 22, 2, 2, 'FD');
  setText(doc, 13, '#1e293b', 'bold');
  doc.text(value, x + 4, y + 10);
  setText(doc, 7.5, '#64748b');
  doc.text(label, x + 4, y + 17);
}

function drawSummaryPage(doc: jsPDF, report: ClassPerformanceReport) {
  header(doc, report, `Up to ${formatDate(report.generatedAt)}`);
  let y = 38;
  sectionTitle(doc, 'Class summary', y);
  y += 8;
  const gap = 4;
  const cardWidth = (CONTENT_W - (gap * 4)) / 5;
  const cards = [
    ['Students', String(report.summary.students)],
    ['Average progress', `${report.summary.averageProgress}%`],
    ['Completed activities', String(report.summary.completedActivities)],
    ['Active recently', String(report.summary.activeRecently)],
    ['Average accuracy', report.summary.attempts > 0 ? `${report.summary.averageAccuracy}%` : 'No data'],
  ];
  cards.forEach(([label, value], index) => statCard(doc, label, value, MARGIN + (index * (cardWidth + gap)), y, cardWidth));

  y += 34;
  sectionTitle(doc, 'Class ranking', y);
  y += 8;
  report.students.slice(0, 3).forEach((student, index) => {
    const width = (CONTENT_W - 8) / 3;
    const x = MARGIN + (index * (width + 4));
    doc.setFillColor(index === 0 ? '#fef3c7' : index === 1 ? '#f1f5f9' : '#ffedd5');
    doc.roundedRect(x, y, width, 28, 2, 2, 'F');
    setText(doc, 13, '#1e293b', 'bold');
    doc.text(`${student.position}${student.position === 1 ? 'st' : student.position === 2 ? 'nd' : 'rd'}`, x + 4, y + 10);
    setText(doc, 10, '#1e293b', 'bold');
    doc.text(doc.splitTextToSize(student.name, width - 32)[0] || 'Student', x + 24, y + 10);
    setText(doc, 8, '#475569');
    doc.text(`${student.score.toFixed(1)} points - ${student.progressPercent}% progress - ${student.completedActivities} completed`, x + 4, y + 21);
  });

  y += report.students.length ? 40 : 10;
  sectionTitle(doc, 'Activity and attention', y);
  y += 8;
  setText(doc, 8.5, '#334155');
  doc.text(`Without recent activity: ${report.summary.withoutRecentActivity}`, MARGIN, y);
  doc.text(`Answer attempts recorded: ${report.summary.attempts}`, MARGIN + 70, y);
  doc.text(`Correct answers: ${report.summary.correctAnswers}`, MARGIN + 140, y);
  doc.text(`Errors recorded: ${report.summary.errors}`, MARGIN + 205, y);
  y += 8;
  const attention = report.students
    .filter((student) => student.needsAttention.length > 0)
    .slice(0, 5);
  if (attention.length === 0) {
    setText(doc, 8.5, '#64748b');
    doc.text('No objective attention indicators are currently available for this class.', MARGIN, y);
    y += 7;
  } else {
    attention.forEach((student) => {
      setText(doc, 8.5, '#7f1d1d', 'bold');
      doc.text(`${student.name}:`, MARGIN, y);
      setText(doc, 8.5, '#475569');
      doc.text(doc.splitTextToSize(student.needsAttention.join('; '), CONTENT_W - 48)[0] || '', MARGIN + 38, y);
      y += 7;
    });
  }

  y += 5;
  sectionTitle(doc, 'Data coverage', y);
  y += 8;
  setText(doc, 8, '#475569');
  const notes = [
    report.rankingCriterion,
    'Completed activities are unique when the saved completion map is available, preventing repeated completion from inflating rank.',
    'Answer attempts and errors are aggregate counters. Attempt-by-attempt order and corrected-after-error status are not reliably stored today.',
    'This shared report intentionally excludes email addresses, account IDs, login details, passwords, and administrative fields.',
  ];
  notes.forEach((note) => {
    const lines = doc.splitTextToSize(note, CONTENT_W - 5);
    doc.text(lines, MARGIN + 3, y);
    y += (lines.length * 4) + 2;
  });
}

const columns = [
  { label: 'Rank', width: 14 },
  { label: 'Student', width: 42 },
  { label: 'Points', width: 19 },
  { label: 'Progress', width: 20 },
  { label: 'Current position', width: 48 },
  { label: 'Activities', width: 19 },
  { label: 'Answer attempts', width: 18 },
  { label: 'Correct', width: 17 },
  { label: 'Errors', width: 15 },
  { label: 'Average accuracy', width: 18 },
  { label: 'Last activity', width: 43 },
] as const;

function studentCells(student: ClassReportStudent) {
  return [
    String(student.position),
    student.name,
    student.score.toFixed(1),
    `${student.progressPercent}%`,
    student.learningPosition,
    String(student.completedActivities),
    student.attempts > 0 ? String(student.attempts) : '-',
    student.attempts > 0 ? String(student.correctAnswers) : '-',
    student.attempts > 0 ? String(student.errors) : '-',
    student.attempts > 0 ? `${student.accuracy}%` : '-',
    student.lastActivity,
  ];
}

function drawTableHeader(doc: jsPDF, y: number) {
  const headerHeight = 12;
  let x = MARGIN;
  columns.forEach((column) => {
    doc.setFillColor('#1e40af');
    doc.setDrawColor('#ffffff');
    doc.rect(x, y, column.width, headerHeight, 'FD');
    setText(doc, 6.2, '#ffffff', 'bold');
    const label = doc.splitTextToSize(column.label, column.width - 3).slice(0, 2);
    doc.text(label, x + 1.5, y + 4.5);
    x += column.width;
  });
  return y + headerHeight;
}

function drawStudentRow(doc: jsPDF, student: ClassReportStudent, y: number, alternate: boolean) {
  let x = MARGIN;
  const cells = studentCells(student);
  columns.forEach((column, index) => {
    doc.setFillColor(alternate ? '#f8fafc' : '#ffffff');
    doc.setDrawColor('#e2e8f0');
    doc.rect(x, y, column.width, 10, 'FD');
    setText(doc, 6.8, '#1e293b', index === 0 || index === 1 ? 'bold' : 'normal');
    const text = doc.splitTextToSize(cells[index], column.width - 3).slice(0, 2);
    doc.text(text, x + 1.5, y + 4.2);
    x += column.width;
  });
}

function drawStudentTable(doc: jsPDF, report: ClassPerformanceReport) {
  doc.addPage([PAGE_W, PAGE_H], 'landscape');
  header(doc, report, `Student performance - ${formatDate(report.generatedAt)}`);
  let y = 37;
  sectionTitle(doc, 'Student performance', y);
  y = drawTableHeader(doc, y + 5);
  report.students.forEach((student, index) => {
    if (y + 10 > PAGE_H - 13) {
      doc.addPage([PAGE_W, PAGE_H], 'landscape');
      header(doc, report, `Student performance - continued - ${formatDate(report.generatedAt)}`);
      y = drawTableHeader(doc, 35);
    }
    drawStudentRow(doc, student, y, index % 2 === 1);
    y += 10;
  });
  if (report.students.length === 0) {
    setText(doc, 9, '#64748b');
    doc.text('No students are assigned to this class.', MARGIN, y + 10);
  }
}

function addFooters(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor('#e2e8f0');
    doc.line(MARGIN, PAGE_H - 9, PAGE_W - MARGIN, PAGE_H - 9);
    setText(doc, 7, '#94a3b8');
    doc.text('Learnendo - Shareable pedagogical report', MARGIN, PAGE_H - 5);
    doc.text(`Page ${page} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 5, { align: 'right' });
  }
}

export function createClassReportPdf(report: ClassPerformanceReport): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  drawSummaryPage(doc, report);
  drawStudentTable(doc, report);
  addFooters(doc);
  return doc;
}

export function generateClassReportPdf(report: ClassPerformanceReport) {
  const safeClassName = report.className.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'class';
  createClassReportPdf(report).save(`learnendo_class_report_${safeClassName}_${report.generatedAt.toISOString().slice(0, 10)}.pdf`);
}
