import React, { useEffect, useMemo, useState } from 'react';
import { LiveClassInput } from '../../types';
import { getAllStudents, StudentBasicInfo } from '../../services/teacherDashboard';

interface LiveClassFormProps {
  initialValue?: Partial<LiveClassInput>;
  onCancel: () => void;
  onSubmit: (input: LiveClassInput) => Promise<void> | void;
  submitting?: boolean;
}

const DEFAULT_FORM: LiveClassInput = {
  title: '',
  teacherName: '',
  date: '',
  time: '',
  meetingLink: '',
  meetUrl: '',
  presentationUrl: '',
  whatsappLink: '',
  description: '',
  workbookId: 1,
  unitId: '',
  lessonId: '',
  isPrivate: true,
  assignedStudentIds: [],
  assignedStudentNames: [],
};

export const LiveClassForm: React.FC<LiveClassFormProps> = ({
  initialValue,
  onCancel,
  onSubmit,
  submitting = false,
}) => {
  const merged = useMemo(
    () => ({ ...DEFAULT_FORM, ...initialValue }),
    [initialValue],
  );
  const [form, setForm] = useState<LiveClassInput>(merged);
  const [assignedIdsText, setAssignedIdsText] = useState((merged.assignedStudentIds ?? []).join(', '));
  const [assignedNamesText, setAssignedNamesText] = useState((merged.assignedStudentNames ?? []).join(', '));
  const [error, setError] = useState<string>('');
  const [students, setStudents] = useState<StudentBasicInfo[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    setAssignedIdsText((merged.assignedStudentIds ?? []).join(', '));
    setAssignedNamesText((merged.assignedStudentNames ?? []).join(', '));
    setForm(merged);
  }, [merged]);

  useEffect(() => {
    let mounted = true;
    setLoadingStudents(true);
    getAllStudents()
      .then((rows) => {
        if (!mounted) return;
        setStudents(rows.filter((student) => !student.isAnonymous));
      })
      .catch((err) => {
        console.warn('[LiveClassForm] unable to load students:', err);
      })
      .finally(() => {
        if (mounted) setLoadingStudents(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setField = <K extends keyof LiveClassInput>(key: K, value: LiveClassInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): string => {
    if (!form.title.trim()) return 'Title is required.';
    if (!form.teacherName.trim()) return 'Teacher name is required.';
    if (!form.date) return 'Date is required.';
    if (!form.time) return 'Time is required.';
    if (form.isPrivate && !assignedIdsText.trim()) return 'Assigned student UIDs are required for private classes.';
    return '';
  };

  const parseCsv = (value: string): string[] => value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const selectedStudentIds = new Set(parseCsv(assignedIdsText));

  const toggleStudentSelection = (student: StudentBasicInfo) => {
    const nextIds = new Set(parseCsv(assignedIdsText));
    const nextNames = new Set(parseCsv(assignedNamesText));

    if (nextIds.has(student.uid)) {
      nextIds.delete(student.uid);
      nextNames.delete(student.name);
    } else {
      nextIds.add(student.uid);
      nextNames.add(student.name);
    }

    setAssignedIdsText(Array.from(nextIds).join(', '));
    setAssignedNamesText(Array.from(nextNames).join(', '));
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const message = validate();
    if (message) {
      setError(message);
      return;
    }

    setError('');
    await onSubmit({
      ...form,
      title: form.title.trim(),
      teacherName: form.teacherName.trim(),
      meetingLink: form.meetingLink.trim(),
      meetUrl: form.meetUrl?.trim() ?? '',
      presentationUrl: form.presentationUrl?.trim() ?? '',
      whatsappLink: form.whatsappLink?.trim() ?? '',
      description: form.description?.trim() ?? '',
      unitId: form.unitId?.trim() ?? '',
      lessonId: form.lessonId?.trim() ?? '',
      assignedStudentIds: parseCsv(assignedIdsText),
      assignedStudentNames: parseCsv(assignedNamesText),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h2 className="text-lg font-black text-white">Live Class Form</h2>

      <input
        type="text"
        value={form.title}
        onChange={(e) => setField('title', e.target.value)}
        className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400"
        placeholder="Class title"
      />

      <input
        type="text"
        value={form.teacherName}
        onChange={(e) => setField('teacherName', e.target.value)}
        className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400"
        placeholder="Teacher name"
      />

      <div className="grid grid-cols-2 gap-3">
        <input
          type="date"
          value={form.date}
          onChange={(e) => setField('date', e.target.value)}
          className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
        />
        <input
          type="time"
          value={form.time}
          onChange={(e) => setField('time', e.target.value)}
          className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
        />
      </div>

      <input
        type="url"
        value={form.meetingLink}
        onChange={(e) => setField('meetingLink', e.target.value)}
        className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400"
        placeholder="Google Meet link"
      />

      <input
        type="url"
        value={form.meetUrl ?? ''}
        onChange={(e) => setField('meetUrl', e.target.value)}
        className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400"
        placeholder="Backup Meet URL (optional)"
      />

      <input
        type="url"
        value={form.presentationUrl ?? ''}
        onChange={(e) => setField('presentationUrl', e.target.value)}
        className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400"
        placeholder="Material link (Google Slides, Canva, PowerPoint Web, YouTube, PDF, image, video)"
      />

      <div className="grid grid-cols-3 gap-3">
        <input
          type="number"
          min={1}
          value={form.workbookId ?? 1}
          onChange={(e) => setField('workbookId', Number(e.target.value) || 1)}
          className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
          placeholder="Workbook"
        />
        <input
          type="text"
          value={form.unitId ?? ''}
          onChange={(e) => setField('unitId', e.target.value)}
          className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400"
          placeholder="Unit"
        />
        <input
          type="text"
          value={form.lessonId ?? ''}
          onChange={(e) => setField('lessonId', e.target.value)}
          className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400"
          placeholder="Lesson"
        />
      </div>

      <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200">
        <input
          type="checkbox"
          checked={Boolean(form.isPrivate)}
          onChange={(e) => setField('isPrivate', e.target.checked)}
          className="h-4 w-4"
        />
        Private room (assigned students only)
      </label>

      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-white">Registered Students</p>
          <span className="text-xs text-slate-400">
            {loadingStudents ? 'Loading...' : `${students.length} available`}
          </span>
        </div>

        {students.length === 0 ? (
          <p className="text-xs text-slate-400">
            No registered students found yet. You can still paste student IDs manually below.
          </p>
        ) : (
          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {students.map((student) => {
              const selected = selectedStudentIds.has(student.uid);
              return (
                <button
                  key={student.uid}
                  type="button"
                  onClick={() => toggleStudentSelection(student)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                    selected
                      ? 'border-blue-500 bg-blue-500/15 text-blue-100'
                      : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{student.name}</p>
                      <p className="truncate text-xs text-slate-400">{student.email ?? student.uid}</p>
                    </div>
                    <span className="text-xs font-black uppercase">
                      {selected ? 'Added' : 'Add'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <textarea
        value={assignedIdsText}
        onChange={(e) => setAssignedIdsText(e.target.value)}
        className="h-20 w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400"
        placeholder="Assigned student UIDs (comma separated)"
      />

      <textarea
        value={assignedNamesText}
        onChange={(e) => setAssignedNamesText(e.target.value)}
        className="h-20 w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400"
        placeholder="Assigned student names (comma separated, optional)"
      />

      <input
        type="url"
        value={form.whatsappLink ?? ''}
        onChange={(e) => setField('whatsappLink', e.target.value)}
        className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400"
        placeholder="WhatsApp group link"
      />

      <textarea
        value={form.description ?? ''}
        onChange={(e) => setField('description', e.target.value)}
        className="h-24 w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400"
        placeholder="Class description"
      />

      {error && <p className="text-sm font-semibold text-red-300">{error}</p>}

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-slate-600 px-4 py-2 text-sm font-bold text-slate-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-[0_4px_0_0_#1d4ed8] disabled:opacity-60"
        >
          {submitting ? 'Saving...' : 'Save Class'}
        </button>
      </div>
    </form>
  );
};
