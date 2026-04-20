import React, { useEffect, useMemo, useState } from 'react';
import { LiveClassInput } from '../../types';
import { getLiveClassAssignableUsers, StudentBasicInfo } from '../../services/teacherDashboard';
import { StudentRosterPicker } from './StudentRosterPicker';

interface LiveClassFormProps {
  initialValue?: Partial<LiveClassInput>;
  onCancel: () => void;
  onSubmit: (input: LiveClassInput) => Promise<void> | void;
  submitting?: boolean;
}

const DEFAULT_FORM: LiveClassInput = {
  title: '',
  teacherName: '',
  courseId: 'english',
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

const clampNumber = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
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
  const [participants, setParticipants] = useState<StudentBasicInfo[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  useEffect(() => {
    setAssignedIdsText((merged.assignedStudentIds ?? []).join(', '));
    setAssignedNamesText((merged.assignedStudentNames ?? []).join(', '));
    setForm(merged);
  }, [merged]);

  useEffect(() => {
    let mounted = true;
    setLoadingParticipants(true);
    getLiveClassAssignableUsers()
      .then((rows) => {
        if (!mounted) return;
        setParticipants(rows);
      })
      .catch((err) => {
        console.warn('[LiveClassForm] unable to load participants:', err);
      })
      .finally(() => {
        if (mounted) setLoadingParticipants(false);
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
  const workbookNumber = clampNumber(Number(form.workbookId ?? 1), 1, 8);
  const unitNumber = clampNumber(Number(form.unitId ?? 1), 1, 16);
  const lessonNumber = clampNumber(Number(form.lessonId ?? 1), 1, 12);

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
      courseId: form.courseId?.trim() ?? 'english',
      groupId: form.groupId?.trim() ?? '',
      groupName: form.groupName?.trim() ?? '',
      meetingLink: form.meetingLink.trim(),
      meetUrl: form.meetUrl?.trim() ?? '',
      presentationUrl: form.presentationUrl?.trim() ?? '',
      whatsappLink: form.whatsappLink?.trim() ?? '',
      description: form.description?.trim() ?? '',
      workbookId: workbookNumber,
      unitId: String(unitNumber),
      lessonId: String(lessonNumber),
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

      <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">
        <span className="font-bold text-white">Course for this class:</span>{' '}
        <span>{form.courseId ?? 'english'}</span>
      </div>

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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">
          <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">Workbook</span>
          <input
            type="number"
            min={1}
            max={8}
            step={1}
            value={workbookNumber}
            onChange={(e) => setField('workbookId', clampNumber(Number(e.target.value) || 1, 1, 8))}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-bold text-white"
          />
        </label>

        <label className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">
          <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">Unit</span>
          <input
            type="number"
            min={1}
            max={16}
            step={1}
            value={unitNumber}
            onChange={(e) => setField('unitId', String(clampNumber(Number(e.target.value) || 1, 1, 16)))}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-bold text-white"
          />
        </label>

        <label className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">
          <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">Lesson</span>
          <input
            type="number"
            min={1}
            max={12}
            step={1}
            value={lessonNumber}
            onChange={(e) => setField('lessonId', String(clampNumber(Number(e.target.value) || 1, 1, 12)))}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-bold text-white"
          />
        </label>
      </div>

      <p className="text-xs text-slate-400">
        Fill workbook, unit, and lesson if you want the `Open Lesson Content` button to open a real lesson during class.
      </p>

      <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200">
        <input
          type="checkbox"
          checked={Boolean(form.isPrivate)}
          onChange={(e) => setField('isPrivate', e.target.checked)}
          className="h-4 w-4"
        />
        Private room (assigned students only)
      </label>

      <StudentRosterPicker
        students={participants}
        loading={loadingParticipants}
        selectedStudentIds={selectedStudentIds}
        onToggleStudent={toggleStudentSelection}
      />

      <textarea
        value={assignedIdsText}
        onChange={(e) => setAssignedIdsText(e.target.value)}
        className="h-20 w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400"
        placeholder="Assigned participant UIDs (comma separated)"
      />

      <textarea
        value={assignedNamesText}
        onChange={(e) => setAssignedNamesText(e.target.value)}
        className="h-20 w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400"
        placeholder="Assigned participant names (comma separated, optional)"
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
