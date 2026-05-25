import { useState, useEffect } from 'react';
import type { QuestionReport, QuestionOverride, ExerciseItem, ExerciseItemType, UserRole, ContentStatus, TeacherProfile } from '../../types';
import {
  getReports,
  updateReportStatus,
  getOverrides,
  saveOverride,
  deleteOverride,
} from '../../services/reviewStore';
import { getSession, setRole, isAdminOrEditor, ROLE_LABELS } from '../../services/userSession';
import {
  getTeacherProfiles,
  approveTeacher,
  rejectTeacher,
  countPendingTeachers,
  ROLE_DISPLAY,
  STATUS_DISPLAY,
  LANG_FLAG,
} from '../../services/teacherProfileStore';

// ─── Role Switcher ────────────────────────────────────────────────────────────

function RoleSwitcher({ onChange }: { onChange: () => void }) {
  const roles: UserRole[] = ['viewer', 'teacher', 'verified_editor', 'admin'];
  const current = getSession().role;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Simulate role:</span>
      {roles.map((r) => (
        <button
          key={r}
          onClick={() => { setRole(r); onChange(); }}
          className={[
            'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors',
            current === r
              ? 'bg-indigo-700 border-indigo-500 text-white'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500',
          ].join(' ')}
        >
          {ROLE_LABELS[r]}
        </button>
      ))}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<QuestionReport['status'], string> = {
  open: 'bg-yellow-600/30 text-yellow-300 border-yellow-600/50',
  reviewed: 'bg-blue-600/30 text-blue-300 border-blue-600/50',
  fixed: 'bg-green-600/30 text-green-300 border-green-600/50',
  dismissed: 'bg-gray-700/50 text-gray-400 border-gray-600',
};

const CONTENT_STATUS_COLORS: Record<ContentStatus, string> = {
  draft: 'bg-gray-700/50 text-gray-400 border-gray-600',
  active: 'bg-green-600/30 text-green-300 border-green-600/50',
  flagged: 'bg-yellow-600/30 text-yellow-300 border-yellow-600/50',
  archived: 'bg-red-600/30 text-red-400 border-red-600/50',
};

function Badge({ text, style }: { text: string; style: string }) {
  return (
    <span className={`border rounded px-1.5 py-0.5 text-xs font-semibold ${style}`}>{text}</span>
  );
}

// ─── Inline Question Editor ───────────────────────────────────────────────────

const QUESTION_TYPES: { value: ExerciseItemType; label: string }[] = [
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'fill-in', label: 'Fill-in' },
  { value: 'true-false', label: 'True / False' },
  { value: 'listening', label: '🎧 Listening' },
  { value: 'speaking', label: '🗣️ Speaking' },
];

function QuestionEditor({
  initial,
  packId,
  onSave,
  onCancel,
}: {
  initial: ExerciseItem;
  packId: string;
  onSave: (override: QuestionOverride) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<ExerciseItemType>(initial.type);
  const [prompt, setPrompt] = useState(initial.prompt);
  const [opts, setOpts] = useState(initial.options?.join('\n') ?? '');
  const [correct, setCorrect] = useState(initial.correctAnswer);
  const [alts, setAlts] = useState(initial.alternatives?.join(', ') ?? '');
  const [explanation, setExplanation] = useState(initial.explanation ?? '');
  const [audioText, setAudioText] = useState(initial.audioText ?? '');
  const [hideText, setHideText] = useState(initial.hideText ?? false);
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>(initial.voiceGender ?? 'female');
  const [lang, setLang] = useState(initial.voiceLang ?? 'en-US');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<ContentStatus>('active');

  const showOptions = type === 'multiple-choice' || type === 'listening';

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || (type !== 'speaking' && !correct.trim())) return;

    const options =
      type === 'true-false'
        ? ['True', 'False']
        : showOptions
        ? opts.split('\n').map((s) => s.trim()).filter(Boolean)
        : undefined;

    const session = getSession();
    const now = Date.now();

    const correctedItem: ExerciseItem = {
      ...initial,
      type,
      prompt: prompt.trim(),
      options,
      correctAnswer: correct.trim() || '__speaking__',
      alternatives: alts ? alts.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      explanation: explanation.trim() || undefined,
      audioText: audioText.trim() || undefined,
      hideText: hideText || undefined,
      voiceGender,
      voiceLang: lang.trim() || 'en-US',
    };

    // Check if an existing override already exists to preserve history
    const existing = getOverrides().find(
      (o) => o.questionId === initial.id && o.packId === packId,
    );

    const historyEntry = {
      editedBy: session.id,
      editedAt: now,
      note: note.trim() || undefined,
      snapshot: initial,
    };

    const override: QuestionOverride = {
      questionId: initial.id,
      packId,
      item: correctedItem,
      version: (existing?.version ?? 0) + 1,
      status,
      createdBy: existing?.createdBy ?? session.id,
      updatedBy: session.id,
      updatedAt: now,
      approvedBy: status === 'active' && session.role === 'admin' ? session.id : existing?.approvedBy,
      editHistory: [...(existing?.editHistory ?? []), historyEntry],
    };

    onSave(override);
  }

  return (
    <form onSubmit={handleSave} className="mt-3 space-y-3 border border-indigo-700/50 rounded-xl p-4 bg-gray-900">
      <p className="text-xs font-bold text-indigo-300 uppercase tracking-wide">✏️ Edit Question</p>

      {/* Type */}
      <div className="flex flex-wrap gap-1.5">
        {QUESTION_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={[
              'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors',
              type === t.value
                ? 'bg-indigo-700 border-indigo-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Prompt */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={2}
        placeholder="Question prompt…"
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-indigo-500"
        required
      />

      {/* Options */}
      {showOptions && (
        <textarea
          value={opts}
          onChange={(e) => setOpts(e.target.value)}
          rows={4}
          placeholder={'Option A\nOption B\nOption C\nOption D'}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-indigo-500"
        />
      )}

      {/* Correct Answer */}
      {type !== 'speaking' && (
        <input
          value={correct}
          onChange={(e) => setCorrect(e.target.value)}
          placeholder="Correct answer…"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          required
        />
      )}

      {/* Alternatives */}
      {(type === 'fill-in' || type === 'listening') && (
        <input
          value={alts}
          onChange={(e) => setAlts(e.target.value)}
          placeholder="Accepted alternatives (comma-separated)"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
        />
      )}

      {/* Explanation */}
      <input
        value={explanation}
        onChange={(e) => setExplanation(e.target.value)}
        placeholder="Explanation (shown after answer)…"
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
      />

      {/* Audio */}
      <div className="grid grid-cols-2 gap-2">
        <input
          value={audioText}
          onChange={(e) => setAudioText(e.target.value)}
          placeholder="Audio text (blank = prompt)"
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
        />
        <input
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          placeholder="Lang (e.g. en-US)"
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-400">
        {/* Voice gender */}
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name="voice" value="female" checked={voiceGender === 'female'} onChange={() => setVoiceGender('female')} className="accent-indigo-500" />
          Female
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name="voice" value="male" checked={voiceGender === 'male'} onChange={() => setVoiceGender('male')} className="accent-indigo-500" />
          Male
        </label>
        {/* Hide text */}
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={hideText} onChange={(e) => setHideText(e.target.checked)} className="accent-indigo-500" />
          Hide text (listening)
        </label>
      </div>

      {/* Override status */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 font-semibold uppercase">Status:</span>
        {(['draft', 'active', 'flagged', 'archived'] as ContentStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={[
              'px-2 py-0.5 rounded text-xs font-semibold border transition-colors',
              status === s ? CONTENT_STATUS_COLORS[s] : 'bg-gray-800 border-gray-700 text-gray-500',
            ].join(' ')}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Edit note */}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Edit note / comment (optional)…"
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
      />

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-400 text-sm hover:bg-gray-700 transition-colors">
          Cancel
        </button>
        <button type="submit" className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors">
          Save Override
        </button>
      </div>
    </form>
  );
}

// ─── Report Card ──────────────────────────────────────────────────────────────

const REASON_LABELS: Record<string, string> = {
  'wrong-answer': 'Wrong answer',
  'bad-translation': 'Bad translation',
  'unclear-prompt': 'Unclear prompt',
  typo: 'Typo / spelling',
  other: 'Other',
};

function ReportCard({
  report,
  onStatusChange,
}: {
  report: QuestionReport;
  onStatusChange: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const canEdit = isAdminOrEditor();

  // Try to find the original item from any loaded pack
  // (Simple lookup — for the lab we use the override store)
  const existingOverride = getOverrides().find(
    (o) => o.questionId === report.questionId && o.packId === (report.packId ?? ''),
  );

  function mark(status: QuestionReport['status']) {
    updateReportStatus(report.id, status);
    onStatusChange();
  }

  function handleSaveOverride(override: QuestionOverride) {
    saveOverride(override);
    mark('fixed');
    setEditing(false);
  }

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${report.status === 'open' ? 'border-yellow-700/60 bg-yellow-950/20' : 'border-gray-700 bg-gray-900/60'}`}>
      {/* Summary row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        <span className="text-lg">{report.status === 'open' ? '⚑' : report.status === 'fixed' ? '✅' : report.status === 'dismissed' ? '—' : '🔵'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium truncate">
            {REASON_LABELS[report.reason] ?? report.reason}
            {report.packId && <span className="text-gray-500 font-normal"> · {report.packId}</span>}
          </p>
          <p className="text-xs text-gray-500 truncate">
            Q: {report.questionId} &nbsp;·&nbsp; {new Date(report.reportedAt).toLocaleDateString()}
          </p>
        </div>
        <Badge text={report.status} style={STATUS_COLORS[report.status]} />
        <span className="text-gray-500 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Details */}
          {report.details && (
            <p className="text-sm text-gray-400 italic">"{report.details}"</p>
          )}

          {/* Override info */}
          {existingOverride && (
            <div className="flex items-center gap-2 text-xs text-indigo-400">
              <span>Override v{existingOverride.version} saved</span>
              <Badge text={existingOverride.status} style={CONTENT_STATUS_COLORS[existingOverride.status]} />
              <span className="text-gray-500">by {existingOverride.updatedBy} · {new Date(existingOverride.updatedAt).toLocaleDateString()}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {report.status !== 'reviewed' && (
              <button onClick={() => mark('reviewed')} className="px-3 py-1 rounded-lg bg-blue-700/40 text-blue-300 text-xs font-semibold hover:bg-blue-700/60 transition-colors border border-blue-700/50">
                Mark Reviewed
              </button>
            )}
            {report.status !== 'fixed' && (
              <button onClick={() => mark('fixed')} className="px-3 py-1 rounded-lg bg-green-700/40 text-green-300 text-xs font-semibold hover:bg-green-700/60 transition-colors border border-green-700/50">
                Mark Fixed
              </button>
            )}
            {report.status !== 'dismissed' && (
              <button onClick={() => mark('dismissed')} className="px-3 py-1 rounded-lg bg-gray-700/60 text-gray-400 text-xs font-semibold hover:bg-gray-600/60 transition-colors border border-gray-600">
                Dismiss
              </button>
            )}
            {report.status === 'dismissed' && (
              <button onClick={() => mark('open')} className="px-3 py-1 rounded-lg bg-yellow-700/40 text-yellow-300 text-xs font-semibold hover:bg-yellow-700/60 transition-colors border border-yellow-700/50">
                Reopen
              </button>
            )}
            {canEdit && !editing && report.packId && (
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1 rounded-lg bg-indigo-700/40 text-indigo-300 text-xs font-semibold hover:bg-indigo-700/60 transition-colors border border-indigo-700/50"
              >
                ✏️ Edit Question
              </button>
            )}
          </div>

          {/* Inline editor — uses report.originalItem snapshot when no override exists */}
          {editing && report.packId && (
            <QuestionEditor
              initial={existingOverride?.item ?? report.originalItem ?? {
                id: report.questionId,
                type: 'multiple-choice',
                prompt: '(No cached text — please retype the question)',
                correctAnswer: '',
              }}
              packId={report.packId}
              onSave={handleSaveOverride}
              onCancel={() => setEditing(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Overrides tab ────────────────────────────────────────────────────────────

function OverridesPanel({ refresh }: { refresh: () => void }) {
  const overrides = getOverrides();
  const canEdit = isAdminOrEditor();

  if (overrides.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-4xl mb-2">📋</p>
        <p>No question overrides saved yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {overrides.map((o) => (
        <div key={`${o.packId}-${o.questionId}`} className="border border-gray-700 rounded-xl p-4 bg-gray-900/60 space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">Q: {o.questionId}</p>
              <p className="text-xs text-gray-500">Pack: {o.packId} · v{o.version} · {new Date(o.updatedAt).toLocaleDateString()}</p>
            </div>
            <Badge text={o.status} style={CONTENT_STATUS_COLORS[o.status]} />
          </div>

          <div className="bg-gray-800 rounded-lg p-3 text-sm space-y-1">
            <p className="text-gray-300"><span className="text-gray-500">Prompt:</span> {o.item.prompt}</p>
            <p className="text-gray-300"><span className="text-gray-500">Correct:</span> {o.item.correctAnswer}</p>
            {o.item.options && (
              <p className="text-gray-400 text-xs">Options: {o.item.options.join(' · ')}</p>
            )}
          </div>

          {o.editHistory.length > 0 && (
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-300">
                {o.editHistory.length} edit{o.editHistory.length > 1 ? 's' : ''} in history
              </summary>
              <ul className="mt-1 space-y-0.5 pl-2">
                {o.editHistory.map((h, i) => (
                  <li key={i}>
                    {new Date(h.editedAt).toLocaleDateString()} by {h.editedBy}
                    {h.note && <span className="italic"> — "{h.note}"</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {canEdit && (
            <button
              onClick={() => { deleteOverride(o.questionId, o.packId); refresh(); }}
              className="text-xs text-red-500 hover:text-red-400 transition-colors"
            >
              Delete override
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Teachers panel ─────────────────────────────────────────────────────────────

const TEACHER_STATUS_COLORS: Record<TeacherProfile['status'], string> = {
  pending: 'bg-yellow-600/30 text-yellow-300 border-yellow-600/50',
  approved: 'bg-green-600/30 text-green-300 border-green-600/50',
  rejected: 'bg-red-600/30 text-red-400 border-red-600/50',
};

function TeachersPanel({ refresh }: { refresh: () => void }) {
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const canAct = isAdminOrEditor();
  const session = getSession();

  function load() { setTeachers(getTeacherProfiles()); }
  useEffect(() => { load(); }, []);

  function handleApprove(id: string) {
    approveTeacher(id, session.id);
    load();
    refresh();
  }

  function handleReject(id: string) {
    rejectTeacher(id, session.id, rejectNote || undefined);
    setRejectNote('');
    setExpanded(null);
    load();
    refresh();
  }

  // Sort: pending first
  const sorted = [...teachers].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return b.createdAt - a.createdAt;
  });

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-4xl mb-2">👨‍🏫</p>
        <p>No teacher profiles yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((t) => (
        <div
          key={t.id}
          className={`border rounded-xl overflow-hidden transition-colors ${
            t.status === 'pending' ? 'border-yellow-700/60 bg-yellow-950/20' : 'border-gray-700 bg-gray-900/60'
          }`}
        >
          {/* Summary row */}
          <button
            onClick={() => setExpanded(expanded === t.id ? null : t.id)}
            className="w-full flex items-center gap-3 p-3 text-left"
          >
            <span className="text-xl">{t.status === 'approved' ? '✅' : t.status === 'rejected' ? '❌' : '⏳'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-semibold">{t.name}</p>
              <p className="text-xs text-gray-500 truncate">
                {t.email ?? 'no email'}
                {t.whatsapp && <span> · {t.whatsapp}</span>}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`border rounded px-1.5 py-0.5 text-xs font-semibold ${TEACHER_STATUS_COLORS[t.status]}`}>
                {STATUS_DISPLAY[t.status]}
              </span>
              <span className="text-xs text-gray-500">{ROLE_DISPLAY[t.role]}</span>
            </div>
            <span className="text-gray-500 text-xs">{expanded === t.id ? '▲' : '▼'}</span>
          </button>

          {expanded === t.id && (
            <div className="px-4 pb-4 space-y-3">
              {/* Languages */}
              <div className="flex flex-wrap gap-1.5">
                {t.languages.map((l) => (
                  <span key={l} className="bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-xs">
                    {LANG_FLAG[l]} {l.toUpperCase()}
                  </span>
                ))}
                {t.canEditBible && (
                  <span className="bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-xs">
                    📖 Bible
                  </span>
                )}
              </div>

              {/* Applied dates */}
              <p className="text-xs text-gray-500">
                Applied {new Date(t.createdAt).toLocaleDateString()}
                {t.approvedAt && ` · ${t.status === 'approved' ? 'Approved' : 'Reviewed'} ${new Date(t.approvedAt).toLocaleDateString()}`}
              </p>

              {t.note && (
                <p className="text-xs text-gray-400 italic">"{t.note}"</p>
              )}

              {/* Admin actions */}
              {canAct && (
                <div className="space-y-2">
                  {t.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(t.id)}
                        className="w-full py-2 rounded-lg bg-green-700/50 hover:bg-green-700/70 text-green-200 text-sm font-semibold transition-colors border border-green-700/60"
                      >
                        ✅ Approve as Verified Editor
                      </button>
                      <div className="flex gap-2">
                        <input
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                          placeholder="Rejection reason (optional)…"
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                        />
                        <button
                          onClick={() => handleReject(t.id)}
                          className="px-3 py-2 rounded-lg bg-red-700/50 hover:bg-red-700/70 text-red-200 text-xs font-semibold transition-colors border border-red-700/60"
                        >
                          Reject
                        </button>
                      </div>
                    </>
                  )}
                  {t.status === 'approved' && (
                    <button
                      onClick={() => { rejectTeacher(t.id, session.id); load(); }}
                      className="text-xs text-red-500 hover:text-red-400 transition-colors"
                    >
                      Revoke approval
                    </button>
                  )}
                  {t.status === 'rejected' && (
                    <button
                      onClick={() => handleApprove(t.id)}
                      className="text-xs text-green-500 hover:text-green-400 transition-colors"
                    >
                      Approve anyway
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Review Section ──────────────────────────────────────────────────────

type Tab = 'reports' | 'overrides' | 'teachers';

export default function ReviewSection() {
  const [tab, setTab] = useState<Tab>('reports');
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [, forceUpdate] = useState(0);

  function refresh() {
    setReports(getReports());
    forceUpdate((n) => n + 1);
  }

  useEffect(() => {
    refresh();
  }, []);

  const openCount = reports.filter((r) => r.status === 'open').length;
  const sortedReports = [...reports].sort((a, b) => {
    if (a.status === 'open' && b.status !== 'open') return -1;
    if (a.status !== 'open' && b.status === 'open') return 1;
    return b.reportedAt - a.reportedAt;
  });

  return (
    <div className="min-h-full pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white flex-1">
            🔍 Review
            {openCount > 0 && (
              <span className="ml-2 bg-red-600 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                {openCount}
              </span>
            )}
          </h1>
        </div>

        <RoleSwitcher onChange={refresh} />

        {/* Tabs */}
        <div className="flex gap-2">
          {(['reports', 'overrides', 'teachers'] as Tab[]).map((t) => {
            const pendingTeachers = t === 'teachers' ? countPendingTeachers() : 0;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={[
                  'flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors border relative',
                  tab === t
                    ? 'bg-indigo-700 border-indigo-500 text-white'
                    : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500',
                ].join(' ')}
              >
                {t === 'reports'
                  ? `Reports${openCount > 0 ? ` (${openCount})` : ''}`
                  : t === 'overrides'
                  ? 'Overrides'
                  : `Teachers${pendingTeachers > 0 ? ` (${pendingTeachers})` : ''}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {tab === 'reports' ? (
          sortedReports.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-4xl mb-2">✅</p>
              <p>No reports yet.</p>
              <p className="text-sm mt-1">Reports from quiz sessions will appear here.</p>
            </div>
          ) : (
            sortedReports.map((r) => (
              <ReportCard key={r.id} report={r} onStatusChange={refresh} />
            ))
          )
        ) : tab === 'overrides' ? (
          <OverridesPanel refresh={refresh} />
        ) : (
          <TeachersPanel refresh={refresh} />
        )}
      </div>
    </div>
  );
}
