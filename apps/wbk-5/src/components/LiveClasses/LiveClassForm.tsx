import React, { useMemo, useState } from 'react';
import { LiveClassInput } from '../../types';

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
  whatsappLink: '',
  description: '',
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
  const [error, setError] = useState<string>('');

  const setField = <K extends keyof LiveClassInput>(key: K, value: LiveClassInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): string => {
    if (!form.title.trim()) return 'Title is required.';
    if (!form.teacherName.trim()) return 'Teacher name is required.';
    if (!form.date) return 'Date is required.';
    if (!form.time) return 'Time is required.';
    if (!form.meetingLink.trim()) return 'Meeting link is required.';
    return '';
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
      whatsappLink: form.whatsappLink?.trim() ?? '',
      description: form.description?.trim() ?? '',
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
