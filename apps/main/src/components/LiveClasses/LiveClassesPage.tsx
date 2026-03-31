import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { LiveClass, LiveClassInput } from '../../types';
import {
  canAccessLiveClass,
  createLiveClass,
  ensureLiveClassSession,
  getLiveClassMeetLink,
  subscribeLiveClass,
  subscribeLiveClasses,
  updateLiveClass,
} from '../../services/liveClassesService';
import { LiveClassForm } from './LiveClassForm';
import { LiveClassDetailsPage } from './LiveClassDetailsPage';
import { LiveClassRoomPage } from './LiveClassRoomPage';

interface LiveClassesPageProps {
  user: User;
  isTeacher: boolean;
  onOpenClassContent: (liveClass: LiveClass) => void;
  onBack: () => void;
}

const statusClassMap: Record<LiveClass['status'], string> = {
  upcoming: 'bg-amber-500 text-slate-900',
  live: 'bg-emerald-500 text-slate-900',
  finished: 'bg-slate-600 text-white',
};

const upsertLiveClass = (items: LiveClass[], nextItem: LiveClass) => {
  const withoutExisting = items.filter((item) => item.id !== nextItem.id);
  return [...withoutExisting, nextItem].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
};

const buildOptimisticClass = (classId: string, createdBy: string, input: LiveClassInput): LiveClass => {
  const start = new Date(`${input.date}T${input.time}:00`);
  const end = new Date(start.getTime() + (60 * 60 * 1000));
  const now = new Date();
  const status = Number.isNaN(start.getTime()) || now < start
    ? 'upcoming'
    : now <= end
      ? 'live'
      : 'finished';

  return {
    id: classId,
    title: input.title.trim(),
    teacherName: input.teacherName.trim(),
    date: input.date,
    time: input.time,
    meetingLink: input.meetingLink.trim(),
    meetUrl: input.meetUrl?.trim() ?? input.meetingLink.trim(),
    presentationUrl: input.presentationUrl?.trim() ?? '',
    whatsappLink: input.whatsappLink?.trim() ?? '',
    description: input.description?.trim() ?? '',
    workbookId: input.workbookId ?? 1,
    unitId: input.unitId?.trim() ?? '',
    lessonId: input.lessonId?.trim() ?? '',
    isPrivate: input.isPrivate ?? true,
    assignedStudentIds: input.assignedStudentIds ?? [],
    assignedStudentNames: input.assignedStudentNames ?? [],
    status,
    createdBy,
    teacherUid: createdBy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const getRoomClassIdFromPath = (): string => {
  const match = window.location.pathname.match(/^\/live-class\/([^/]+)$/);
  if (!match?.[1]) return '';
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

const openExternalLink = (rawUrl: string) => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return;
  const target = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  window.open(target, '_blank', 'noopener,noreferrer');
};

export const LiveClassesPage: React.FC<LiveClassesPageProps> = ({ user, isTeacher, onOpenClassContent, onBack }) => {
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<LiveClass | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<LiveClass | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [roomClassId, setRoomClassId] = useState<string>(() => getRoomClassIdFromPath());
  const [accessError, setAccessError] = useState('');

  const enterRoom = (liveClass: LiveClass) => {
    const allowed = canAccessLiveClass(liveClass, user.uid, isTeacher);
    if (!allowed) {
      setAccessError('You do not have access to this private classroom.');
      return;
    }
    setAccessError('');
    setSelectedClassId(liveClass.id);
    setSelectedClass(liveClass);
    setRoomClassId(liveClass.id);
    const roomPath = `/live-class/${encodeURIComponent(liveClass.id)}`;
    if (window.location.pathname !== roomPath) {
      window.history.pushState({}, '', roomPath);
    }
  };

  const leaveRoom = () => {
    setRoomClassId('');
    if (window.location.pathname.startsWith('/live-class/')) {
      window.history.pushState({}, '', '/');
    }
  };

  useEffect(() => {
    const unsub = subscribeLiveClasses(
      (nextClasses) => {
        console.log('[LiveClassesPage] received live classes', {
          fetchedCount: nextClasses.length,
          visibleCount: nextClasses.length,
        });
        setClasses(nextClasses);
        setLoading(false);
        setLoadError('');
      },
      (error) => {
        console.warn('[LiveClassesPage] class subscription failed:', error);
        setLoading(false);
        setLoadError('Unable to load live classes right now.');
      },
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!roomClassId || selectedClassId === roomClassId) return;
    setSelectedClassId(roomClassId);
  }, [roomClassId, selectedClassId]);

  useEffect(() => {
    const onPopState = () => {
      setRoomClassId(getRoomClassIdFromPath());
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
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

  const sortedClasses = useMemo(() => classes, [classes]);
  const activeRoomClass = useMemo(() => {
    if (!roomClassId) return null;
    if (selectedClass?.id === roomClassId) return selectedClass;
    return classes.find((item) => item.id === roomClassId) ?? null;
  }, [classes, roomClassId, selectedClass]);

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
        console.log('[LiveClassesPage] creating class', input);
        const classId = await createLiveClass(user.uid, input);
        console.log('[LiveClassesPage] created class id', classId);
        const optimisticClass = buildOptimisticClass(classId, user.uid, input);
        setClasses((prev) => upsertLiveClass(prev, optimisticClass));
        await ensureLiveClassSession(classId);
      }
      setSelectedClassId('');
      setSelectedClass(null);
      closeForm();
    } catch (error) {
      console.warn('[LiveClassesPage] save class failed:', error);
    } finally {
      setSaving(false);
    }
  };

  if (roomClassId && activeRoomClass) {
    return (
      <LiveClassRoomPage
        liveClass={activeRoomClass}
        user={user}
        isTeacher={isTeacher}
        onOpenClassContent={onOpenClassContent}
        onExit={leaveRoom}
      />
    );
  }

  if (selectedClass && !showForm) {
    const hasRoomAccess = canAccessLiveClass(selectedClass, user.uid, isTeacher);
    return (
      <LiveClassDetailsPage
        liveClass={selectedClass}
        user={user}
        isTeacher={isTeacher}
        hasRoomAccess={hasRoomAccess}
        onBack={() => {
          setSelectedClassId('');
          setSelectedClass(null);
        }}
        onEdit={() => openEdit(selectedClass)}
        onEnterRoom={() => enterRoom(selectedClass)}
        onOpenClassContent={() => onOpenClassContent(selectedClass)}
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

      {accessError ? (
        <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-sm font-semibold text-rose-200">
          {accessError}
        </div>
      ) : null}

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
        {loading ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-300">
            Loading live classes...
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-200">
            {loadError}
          </div>
        ) : sortedClasses.length === 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-300">
            No live classes yet. Teachers can create the first session.
          </div>
        ) : (
          sortedClasses.map((liveClass) => (
            <article
              key={liveClass.id}
              onClick={() => {
                setSelectedClassId(liveClass.id);
                setSelectedClass(liveClass);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedClassId(liveClass.id);
                  setSelectedClass(liveClass);
                }
              }}
              className="w-full rounded-2xl border border-slate-700 bg-slate-800 p-4 text-left shadow-lg shadow-blue-500/10 transition hover:border-blue-500"
              role="button"
              tabIndex={0}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-base font-black text-white">{liveClass.title}</h2>
                <span className={`rounded-full px-2 py-1 text-[11px] font-black uppercase ${statusClassMap[liveClass.status]}`}>
                  {liveClass.status}
                </span>
              </div>

              <p className="text-sm font-semibold text-slate-200">{liveClass.teacherName}</p>
              <p className="text-sm text-slate-300">{liveClass.date} • {liveClass.time}</p>

              <div className="my-4 flex justify-center">
                <img src="/logo.png" alt="Learnendo" className="w-24 opacity-70" />
              </div>

              {liveClass.description && (
                <p className="mt-2 max-w-2xl text-lg leading-relaxed text-white">
                  {liveClass.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    enterRoom(liveClass);
                  }}
                  className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-black text-slate-900 shadow-[0_4px_0_0_#059669]"
                >
                  Enter Room
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openExternalLink(getLiveClassMeetLink(liveClass));
                  }}
                  disabled={!getLiveClassMeetLink(liveClass)}
                  className="rounded-xl bg-blue-500 px-3 py-2 text-sm font-black text-white shadow-[0_4px_0_0_#1d4ed8] disabled:opacity-50"
                >
                  Meet
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
};
