import { jsPDF } from 'jspdf';
import { LEARNENDO_PROGRAM_EXERCISE_COUNT } from '../models/certification';

export interface CertificatePdfData {
  studentName: string;
  dateLabel: string;
  certificateId?: string;
  preview?: boolean;
}

const NAVY = '#061D4E';
const GOLD = '#C48920';
const PALE_GOLD = '#F4D67C';
const MUTED = '#536273';

function centeredWrappedText(doc: jsPDF, text: string, y: number, width: number, lineHeight: number): number {
  const lines = doc.splitTextToSize(text, width) as string[];
  doc.text(lines, 148.5, y, { align: 'center' });
  return y + lines.length * lineHeight;
}

function drawReferenceRibbons(doc: jsPDF): void {
  doc.setFillColor(NAVY);
  doc.path([
    { op: 'm', c: [5.5, 5.5] }, { op: 'l', c: [84, 5.5] },
    { op: 'c', c: [59, 13, 29, 31, 5.5, 61] }, { op: 'h', c: [] },
  ], 'F');
  doc.setFillColor(GOLD);
  doc.path([
    { op: 'm', c: [5.5, 8.5] }, { op: 'l', c: [75, 8.5] },
    { op: 'c', c: [51, 15, 26, 31, 5.5, 54] }, { op: 'h', c: [] },
  ], 'F');
  doc.setFillColor(NAVY);
  doc.path([
    { op: 'm', c: [5.5, 11.5] }, { op: 'l', c: [63, 11.5] },
    { op: 'c', c: [42, 17, 21, 31, 5.5, 45] }, { op: 'h', c: [] },
  ], 'F');
  doc.setFillColor('#FFFFFF');
  doc.path([
    { op: 'm', c: [5.5, 14.5] }, { op: 'l', c: [51, 14.5] },
    { op: 'c', c: [34, 19, 18, 29, 5.5, 38] }, { op: 'h', c: [] },
  ], 'F');
  doc.setDrawColor(GOLD);
  doc.setLineWidth(1.15);
  doc.path([
    { op: 'm', c: [5.5, 9.5] }, { op: 'l', c: [75, 9.5] },
    { op: 'c', c: [51, 16, 26, 32, 5.5, 55] },
  ], 'S');

  doc.setFillColor(NAVY);
  doc.path([
    { op: 'm', c: [291.5, 204.5] }, { op: 'l', c: [213, 204.5] },
    { op: 'c', c: [238, 197, 268, 179, 291.5, 149] }, { op: 'h', c: [] },
  ], 'F');
  doc.setFillColor(GOLD);
  doc.path([
    { op: 'm', c: [291.5, 201.5] }, { op: 'l', c: [222, 201.5] },
    { op: 'c', c: [246, 195, 271, 179, 291.5, 156] }, { op: 'h', c: [] },
  ], 'F');
  doc.setFillColor(NAVY);
  doc.path([
    { op: 'm', c: [291.5, 198.5] }, { op: 'l', c: [234, 198.5] },
    { op: 'c', c: [255, 193, 276, 179, 291.5, 165] }, { op: 'h', c: [] },
  ], 'F');
  doc.setFillColor('#FFFFFF');
  doc.path([
    { op: 'm', c: [291.5, 195.5] }, { op: 'l', c: [246, 195.5] },
    { op: 'c', c: [263, 191, 279, 181, 291.5, 172] }, { op: 'h', c: [] },
  ], 'F');
  doc.setDrawColor(GOLD);
  doc.setLineWidth(1.15);
  doc.path([
    { op: 'm', c: [291.5, 200.5] }, { op: 'l', c: [222, 200.5] },
    { op: 'c', c: [246, 194, 271, 178, 291.5, 155] },
  ], 'S');
}

function drawAcademicSeal(doc: jsPDF, cx: number, cy: number): void {
  doc.setFillColor(GOLD);
  for (let index = 0; index < 24; index += 1) {
    const angle = (index / 24) * Math.PI * 2;
    const next = ((index + 1) / 24) * Math.PI * 2;
    doc.triangle(
      cx + Math.cos(angle) * 15.5, cy + Math.sin(angle) * 15.5,
      cx + Math.cos(next) * 15.5, cy + Math.sin(next) * 15.5,
      cx + Math.cos((angle + next) / 2) * 19, cy + Math.sin((angle + next) / 2) * 19,
      'F',
    );
  }
  doc.setFillColor(GOLD);
  doc.circle(cx, cy, 16, 'F');
  doc.setDrawColor(PALE_GOLD);
  doc.setLineWidth(1.1);
  doc.setFillColor(NAVY);
  doc.circle(cx, cy, 12.5, 'FD');
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.45);
  doc.circle(cx, cy, 10, 'D');
  // Mortarboard, kept vector for sharp print output.
  doc.setFillColor(PALE_GOLD);
  doc.triangle(cx - 8, cy - 2, cx, cy - 6, cx + 8, cy - 2, 'F');
  doc.triangle(cx - 8, cy - 2, cx, cy + 2, cx + 8, cy - 2, 'F');
  doc.rect(cx - 4.8, cy + 1.3, 9.6, 3.5, 'F');
  doc.setDrawColor(PALE_GOLD);
  doc.setLineWidth(0.55);
  doc.line(cx + 8, cy - 2, cx + 8, cy + 5);
  doc.circle(cx + 8, cy + 5.6, 0.8, 'F');
}

function drawCalendarIcon(doc: jsPDF, x: number, y: number): void {
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.65);
  doc.roundedRect(x, y, 7, 6.5, 0.7, 0.7, 'D');
  doc.line(x, y + 2, x + 7, y + 2);
  doc.line(x + 1.7, y - 0.8, x + 1.7, y + 1);
  doc.line(x + 5.3, y - 0.8, x + 5.3, y + 1);
  doc.setLineWidth(0.3);
  for (const offsetX of [1.6, 3.5, 5.4]) for (const offsetY of [3.3, 5]) doc.circle(x + offsetX, y + offsetY, 0.18, 'F');
}

export function createCertificatePdf(
  data: CertificatePdfData,
  logoDataUrl?: string,
  signatureDataUrl?: string,
): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({
    title: data.preview ? 'Learnendo Certificate Preview' : `Learnendo Certificate - ${data.studentName}`,
    subject: 'Learnendo English Program Certificate of Completion',
    author: 'Learnendo',
  });

  doc.setFillColor('#FFFFFF');
  doc.rect(0, 0, 297, 210, 'F');
  drawReferenceRibbons(doc);

  doc.setDrawColor(NAVY);
  doc.setLineWidth(1.5);
  doc.rect(4.5, 4.5, 288, 201);
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.55);
  doc.rect(7, 7, 283, 196);
  doc.setLineWidth(0.25);
  doc.rect(9, 9, 279, 192);
  doc.setLineWidth(0.75);
  doc.line(12, 11, 28, 11); doc.line(12, 11, 12, 27);
  doc.line(269, 11, 285, 11); doc.line(285, 11, 285, 27);
  doc.line(12, 197, 28, 197); doc.line(12, 181, 12, 197);
  doc.line(269, 197, 285, 197); doc.line(285, 181, 285, 197);

  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, 'PNG', 250, 15, 30, 30, undefined, 'FAST'); } catch { /* certificate remains usable */ }
  }

  if (data.preview) {
    doc.setFillColor('#EEF2F7');
    doc.roundedRect(119, 14, 59, 7.5, 2, 2, 'F');
    doc.setTextColor(MUTED);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.7);
    doc.text('PREVIEW - NOT AN OFFICIAL CERTIFICATE', 148.5, 19, { align: 'center' });
  }

  doc.setTextColor(NAVY);
  doc.setFont('times', 'bold');
  doc.setFontSize(36);
  doc.text('CERTIFICATE', 148.5, 49, { align: 'center', charSpace: 1.5 });
  doc.setTextColor(GOLD);
  doc.setFontSize(18);
  doc.text('OF COMPLETION', 148.5, 63, { align: 'center' });
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.45);
  doc.line(91, 59.5, 119, 59.5);
  doc.line(178, 59.5, 206, 59.5);

  doc.setTextColor(NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('THIS CERTIFIES THAT', 148.5, 76, { align: 'center', charSpace: 0.9 });

  doc.setFont('times', 'italic');
  doc.setFontSize(30);
  doc.text(data.studentName, 148.5, 96, { align: 'center', maxWidth: 190 });
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.45);
  doc.line(62, 101, 235, 101);
  doc.setFillColor(GOLD);
  doc.circle(62, 101, 1.1, 'F');
  doc.circle(235, 101, 1.1, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(NAVY);
  let y = centeredWrappedText(
    doc,
    `has successfully completed the Learnendo English Program, including ${LEARNENDO_PROGRAM_EXERCISE_COUNT.toLocaleString('en-US')} exercises, and has fulfilled the completion requirements of the course.`,
    114,
    165,
    5.4,
  );
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.35);
  doc.line(99, y + 1.5, 198, y + 1.5);
  doc.setFontSize(9.5);
  y = centeredWrappedText(doc, 'This certificate recognizes dedication, perseverance, and progress in learning English.', y + 8, 150, 5);

  // Date at lower left. Preview intentionally leaves this field blank.
  drawCalendarIcon(doc, 57.5, 151);
  if (data.dateLabel) {
    doc.setFont('times', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(NAVY);
    doc.text(data.dateLabel, 61, 170, { align: 'center' });
  }
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.45);
  doc.line(34, 174, 88, 174);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.7);
  doc.setTextColor(NAVY);
  doc.text('DATE', 61, 181, { align: 'center' });

  drawAcademicSeal(doc, 148.5, 162);

  if (signatureDataUrl) {
    try { doc.addImage(signatureDataUrl, 'PNG', 199, 146, 64, 27.4, undefined, 'FAST'); } catch { /* keep the official signature line empty */ }
  }
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.45);
  doc.line(198, 174, 264, 174);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.7);
  doc.setTextColor(NAVY);
  doc.text('AUTHORIZED SIGNATURE', 231, 181, { align: 'center' });

  if (data.certificateId) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(MUTED);
    doc.setFontSize(5.8);
    doc.text(`Certificate ID: ${data.certificateId}`, 17, 190);
  }

  doc.setFillColor(NAVY);
  doc.rect(75, 187, 147, 10, 'F');
  doc.triangle(69, 187, 75, 192, 69, 197, 'F');
  doc.triangle(228, 187, 222, 192, 228, 197, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#FFFFFF');
  doc.setFontSize(7.8);
  doc.text('LEARNENDO — LEARN ENGLISH WITH CONFIDENCE', 148.5, 193.5, { align: 'center', charSpace: 0.5 });
  return doc;
}

async function imageUrlToDataUrl(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch { return undefined; }
}

export async function downloadCertificatePdf(data: CertificatePdfData): Promise<void> {
  const [logo, signature] = await Promise.all([
    imageUrlToDataUrl('/learnendo-logo-transp.png'),
    imageUrlToDataUrl('/certificate-signature.png'),
  ]);
  const doc = createCertificatePdf(data, logo, signature);
  const safeName = data.studentName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'student';
  doc.save(data.preview ? 'learnendo-certificate-preview.pdf' : `learnendo-certificate-${safeName}.pdf`);
}
