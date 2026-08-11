import React, { useEffect } from 'react';
import type { ClassPerformanceReport } from '../../services/classReportModel';
import { generateClassReportPdf } from '../../services/classReportService';

interface ClassReportModalProps {
  report: ClassPerformanceReport;
  onClose: () => void;
}

const metricClass = 'rounded-xl border border-blue-100 bg-blue-50 p-3';

export const ClassReportModal: React.FC<ClassReportModalProps> = ({ report, onClose }) => {
  useEffect(() => {
    const finishPrinting = () => document.body.classList.remove('class-report-printing');
    window.addEventListener('afterprint', finishPrinting);
    return () => {
      window.removeEventListener('afterprint', finishPrinting);
      finishPrinting();
    };
  }, []);

  const printReport = () => {
    document.body.classList.add('class-report-printing');
    window.setTimeout(() => {
      try {
        window.print();
      } finally {
        document.body.classList.remove('class-report-printing');
      }
    }, 50);
  };

  return (
    <div className="fixed inset-0 z-[220] overflow-y-auto bg-slate-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Class performance report">
      <div className="class-report-print-root mx-auto max-w-6xl rounded-2xl bg-white shadow-2xl">
        <div className="class-report-print-hide sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">Class Performance Report</h2>
            <p className="text-sm text-slate-500">Shareable version - no email addresses, UIDs, or administrative data</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={printReport} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Print</button>
            <button type="button" onClick={() => generateClassReportPdf(report)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Download PDF</button>
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Close</button>
          </div>
        </div>

        <article className="space-y-7 p-5 sm:p-8">
          <header className="rounded-2xl bg-gradient-to-r from-blue-800 to-blue-600 p-6 text-white">
            <p className="text-sm font-bold tracking-[0.2em] text-blue-100">LEARNENDO</p>
            <h1 className="mt-1 text-3xl font-black">Class Performance Report</h1>
            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm text-blue-50">
              <span><b>Class:</b> {report.className}</span>
              <span><b>Students:</b> {report.summary.students}</span>
              <span><b>Period:</b> up to {report.generatedAt.toLocaleDateString('en-GB')}</span>
            </div>
          </header>

          <section>
            <h3 className="mb-3 text-lg font-black text-slate-900">Class summary</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className={metricClass}><span className="text-xs font-semibold text-slate-500">Students</span><b className="block text-2xl text-slate-900">{report.summary.students}</b></div>
              <div className={metricClass}><span className="text-xs font-semibold text-slate-500">Average progress</span><b className="block text-2xl text-slate-900">{report.summary.averageProgress}%</b></div>
              <div className={metricClass}><span className="text-xs font-semibold text-slate-500">Completed activities</span><b className="block text-2xl text-slate-900">{report.summary.completedActivities}</b></div>
              <div className={metricClass}><span className="text-xs font-semibold text-slate-500">Active recently</span><b className="block text-2xl text-slate-900">{report.summary.activeRecently}</b></div>
              <div className={metricClass}><span className="text-xs font-semibold text-slate-500">Average accuracy</span><b className="block text-2xl text-slate-900">{report.summary.attempts > 0 ? `${report.summary.averageAccuracy}%` : 'No data'}</b></div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-lg font-black text-slate-900">Ranking</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {report.students.slice(0, 3).map((student, index) => (
                <div key={`${student.position}-${student.name}-${index}`} className={`rounded-2xl border p-4 ${index === 0 ? 'border-amber-300 bg-amber-50' : index === 1 ? 'border-slate-300 bg-slate-50' : 'border-orange-200 bg-orange-50'}`}>
                  <span className="text-2xl">{student.position === 1 ? '🥇' : student.position === 2 ? '🥈' : '🥉'}</span>
                  <h4 className="mt-2 font-black text-slate-900">{student.position}º {student.name}</h4>
                  <p className="mt-1 text-sm text-slate-600">{student.score.toFixed(1)} points - {student.progressPercent}% progress - {student.completedActivities} completed</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-lg font-black text-slate-900">Student performance</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[1050px] text-left text-xs">
                <thead className="bg-blue-800 text-white"><tr>
                  {['Rank', 'Student', 'Points', 'Progress', 'Current position', 'Completed', 'Attempts', 'Correct', 'Errors', 'Accuracy', 'Last activity'].map((label) => <th key={label} className="px-3 py-3 font-bold">{label}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {report.students.map((student, index) => (
                    <tr key={`${student.position}-${student.name}-${index}`} className="odd:bg-white even:bg-slate-50">
                      <td className="px-3 py-3 font-black">{student.position}º</td>
                      <td className="px-3 py-3 font-bold text-slate-900">{student.name}</td>
                      <td className="px-3 py-3">{student.score.toFixed(1)}</td>
                      <td className="px-3 py-3">{student.progressPercent}%</td>
                      <td className="px-3 py-3 whitespace-nowrap">{student.learningPosition}</td>
                      <td className="px-3 py-3">{student.completedActivities}</td>
                      <td className="px-3 py-3">{student.attempts || '—'}</td>
                      <td className="px-3 py-3">{student.attempts ? student.correctAnswers : '—'}</td>
                      <td className="px-3 py-3">{student.attempts ? student.errors : '—'}</td>
                      <td className="px-3 py-3">{student.attempts ? `${student.accuracy}%` : '—'}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{student.lastActivity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="font-black text-slate-900">Objective attention indicators</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {report.students.some((student) => student.needsAttention.length > 0)
                  ? report.students.filter((student) => student.needsAttention.length > 0).map((student, index) => <p key={`${student.name}-${index}`}><b>{student.name}:</b> {student.needsAttention.join('; ')}</p>)
                  : <p>No objective attention indicators are currently available.</p>}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <h3 className="font-black text-slate-900">Data coverage</h3>
              <p className="mt-2">{report.rankingCriterion}</p>
              <p className="mt-2">Attempts and errors are aggregate counters. Attempt-by-attempt order and corrected-after-error status are not reliably stored today.</p>
              <p className="mt-2">This report contains pedagogical information only.</p>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
};
