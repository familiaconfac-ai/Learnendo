import React, { useEffect, useMemo, useState } from 'react';
import { LiveClassGroupInput } from '../../types';
import { getLiveClassAssignableUsers, StudentBasicInfo } from '../../services/teacherDashboard';
import { StudentRosterPicker } from './StudentRosterPicker';

interface LiveClassGroupFormProps {
  initialValue?: Partial<LiveClassGroupInput>;
  onCancel: () => void;
  onSubmit: (input: LiveClassGroupInput) => Promise<void> | void;
  submitting?: boolean;
}

const DEFAULT_FORM: LiveClassGroupInput = {
  name: '',
  description: '',
  whatsappLink: '',
  assignedStudentIds: [],
  assignedStudentNames: [],
};

const parseCsv = (value: string): string[] => value
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

export const LiveClassGroupForm: React.FC<LiveClassGroupFormProps> = ({
  initialValue,
  onCancel,
  onSubmit,
  submitting = false,
}) => {
  const merged = useMemo(
    () => ({ ...DEFAULT_FORM, ...initialValue }),
    [initialValue],
  );
  const [form, setForm] = useState<LiveClassGroupInput>(merged);
  const [assignedIdsText, setAssignedIdsText] = useState((merged.assignedStudentIds ?? []).join(', '));
  const [assignedNamesText, setAssignedNamesText] = useState((merged.assignedStudentNames ?? []).join(', '));
  const [error, setError] = useState('');
  const [participants, setParticipants] = useState<StudentBasicInfo[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  useEffect(() => {
    setForm(merged);
    setAssignedIdsText((merged.assignedStudentIds ?? []).join(', '));
    setAssignedNamesText((merged.assignedStudentNames ?? []).join(', '));
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
        console.warn('[LiveClassGroupForm] unable to load participants:', err);
      })
      .finally(() => {
        if (mounted) setLoadingParticipants(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setField = <K extends keyof LiveClassGroupInput>(key: K, value: LiveClassGroupInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const selectedStudentIds = useMemo(
    () => new Set(parseCsv(assignedIdsText)),
    [assignedIdsText],
  );

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

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Group name is required.');
      return;
    }

    setError('');
    await onSubmit({
      name: form.name.trim(),
      description: form.description?.trim() ?? '',
      whatsappLink: form.whatsappLink?.trim() ?? '',
      assignedStudentIds: parseCsv(assignedIdsText),
      assignedStudentNames: parseCsv(assignedNamesText),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h2 className="text-lg font-black text-white">Online Group</h2>

      <input
        type="text"
        value={form.name}
        onChange={(event) => setField('name', event.target.value)}
        className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400"
        placeholder="Group name"
      />

      <input
        type="url"
        value={form.whatsappLink ?? ''}
        onChange={(event) => setField('whatsappLink', event.target.value)}
        className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400"
        placeholder="WhatsApp group link (optional)"
      />

      <StudentRosterPicker
        students={participants}
        loading={loadingParticipants}
        selectedStudentIds={selectedStudentIds}
        onToggleStudent={toggleStudentSelection}
      />

      <textarea
        value={assignedIdsText}
        onChange={(event) => setAssignedIdsText(event.target.value)}
        className="h-20 w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400"
        placeholder="Assigned participant UIDs (comma separated)"
      />

      <textarea
        value={assignedNamesText}
        onChange={(event) => setAssignedNamesText(event.target.value)}
        className="h-20 w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400"
        placeholder="Assigned participant names (comma separated)"
      />

      <textarea
        value={form.description ?? ''}
        onChange={(event) => setField('description', event.target.value)}
        className="h-24 w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400"
        placeholder="Notes about this group"
      />

      {error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}

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
          {submitting ? 'Saving...' : 'Save Group'}
        </button>
      </div>
    </form>
  );
};
