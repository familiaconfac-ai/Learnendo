import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { LiveClass, LiveClassInput } from '../../types';
import {
  createLiveClass,
  ensureLiveClassSession,
  subscribeLiveClass,
  subscribeLiveClasses,
  updateLiveClass,
} from '../../services/liveClassesService';
import { LiveClassForm } from './LiveClassForm';
import { LiveClassDetailsPage } from './LiveClassDetailsPage';

interface LiveClassesPageProps {
  user: User;
  isTeacher: boolean;
  onBack: () => void;
}

const statusClassMap: Record<LiveClass['status'], string> = {
  upcoming: 'bg-amber-500 text-slate-900',
  live: 'bg-emerald-500 text-slate-900',
  finished: 'bg-slate-600 text-white',
};

export const LiveClassesPage: React.FC<LiveClassesPageProps> = ({ user, isTeacher, onBack }) => {
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<LiveClass | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<LiveClass | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribeLiveClasses(
      setClasses,
      (error) => console.warn('[LiveClassesPage] class subscription failed:', error),
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    const unsub = subscribeLiveClass(
      selectedClassId,
      setSelectedClass,
      (error) => console.warn('[LiveClassesPage] class details subscription failed:', error),
    );
    return () => unsub();
  }, [selectedClassId]);

  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
    [classes],
  );

  const openCreate = () => {
    setEditingClass(null);
    setShowForm(true);
  };

  const openEdit = (liveClass: LiveClass) => {
    setEditingClass(liveClass);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingClass(null);
  };

  const handleSave = async (input: LiveClassInput) => {
    setSaving(true);
    try {
      if (editingClass) {
        await updateLiveClass(editingClass.id, input);
      } else {
        const classId = await createLiveClass(user.uid, input);
        await ensureLiveClassSession(classId);
      }
      closeForm();
    } catch (error) {
      console.warn('[LiveClassesPage] save class failed:', error);
    } finally {
      setSaving(false);
    }
  };

  if (selectedClass && !showForm) {
    return (
      <LiveClassDetailsPage
        liveClass={selectedClass}
        user={user}
        isTeacher={isTeacher}
        onBack={() => {
          setSelectedClassId('');
          setSelectedClass(null);
        }}
        onEdit={() => openEdit(selectedClass)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 px-3 pb-28 pt-6 sm:px-4">
      <button onClick={onBack} className="mb-4 text-sm font-bold text-slate-200" type="button">← Back</button>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Live Classes</h1>
        {isTeacher && (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white shadow-[0_4px_0_0_#1d4ed8]"
          >
            + New Class
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-900 p-3">
          <LiveClassForm
            initialValue={editingClass ?? undefined}
            onCancel={closeForm}
            onSubmit={handleSave}
            submitting={saving}
          />
        </div>
      )}

      <div className="space-y-3">
        {sortedClasses.length === 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-300">
            No live classes yet. Teachers can create the first session.
          </div>
        ) : (
          sortedClasses.map((liveClass) => (
            <button
              type="button"
              key={liveClass.id}
              onClick={() => {
                setSelectedClassId(liveClass.id);
                setSelectedClass(liveClass);
              }}
              className="w-full rounded-2xl border border-slate-700 bg-slate-800 p-4 text-left transition hover:border-blue-500"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-base font-black text-white">{liveClass.title}</h2>
                <span className={`rounded-full px-2 py-1 text-[11px] font-black uppercase ${statusClassMap[liveClass.status]}`}>
                  {liveClass.status}
                </span>
              </div>

              <p className="text-sm text-slate-300">{liveClass.teacherName}</p>
              <p className="text-sm text-slate-300">{liveClass.date} • {liveClass.time}</p>
              {liveClass.description && <p className="mt-2 line-clamp-2 text-sm text-slate-400">{liveClass.description}</p>}
            </button>
          ))
        )}
      </div>
    </div>
  );
};
