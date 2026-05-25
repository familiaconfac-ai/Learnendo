import { useState } from 'react';
import type { ReportReason, ExerciseItem } from '../types';
import { addReport } from '../services/reviewStore';
import { isAdminOrEditor, getSession, requestReviewNavigation } from '../services/userSession';

interface Props {
  questionId: string;
  packId?: string;
  /** Original item snapshot — stored in report to enable inline editing later */
  originalItem?: ExerciseItem;
  compact?: boolean;
}

const REASON_LABELS: Record<ReportReason, string> = {
  'wrong-answer': 'Wrong answer',
  'bad-translation': 'Bad translation',
  'unclear-prompt': 'Unclear prompt',
  typo: 'Typo / spelling',
  other: 'Other',
};

const REASONS = Object.keys(REASON_LABELS) as ReportReason[];

export default function ReportButton({ questionId, packId, originalItem, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('wrong-answer');
  const [details, setDetails] = useState('');
  const [sent, setSent] = useState(false);

  const adminOrEditor = isAdminOrEditor();

  function submit() {
    const session = getSession();
    addReport({ questionId, packId, reason, details: details || undefined, reportedBy: session.id, originalItem });
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setOpen(false);
      setDetails('');
      setReason('wrong-answer');
    }, 1500);
  }

  return (
    <div className={`relative ${compact ? 'inline-flex' : 'flex items-center gap-2'}`}>
      {/* Report button */}
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-gray-800"
        title="Report this question"
      >
        ⚑ Report
      </button>

      {/* Edit button — admin / editor only */}
      {adminOrEditor && (
        <button
          onClick={requestReviewNavigation}
          className="text-xs text-gray-500 hover:text-yellow-400 transition-colors px-2 py-1 rounded hover:bg-gray-800"
          title="Edit this question"
        >
          ✏️ Edit
        </button>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {sent ? (
              <div className="text-center py-4">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-green-400 font-semibold">Report sent. Thank you!</p>
              </div>
            ) : (
              <>
                <h3 className="text-white font-bold text-base">Report this question</h3>

                <div className="space-y-1">
                  {REASONS.map((r) => (
                    <label key={r} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="report-reason"
                        value={r}
                        checked={reason === r}
                        onChange={() => setReason(r)}
                        className="accent-red-500"
                      />
                      <span className="text-sm text-gray-300">{REASON_LABELS[r]}</span>
                    </label>
                  ))}
                </div>

                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Optional details…"
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-gray-500"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-400 text-sm hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submit}
                    className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors"
                  >
                    Submit Report
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
