import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { LiveClass, LiveClassGroup, LiveClassGroupInput, LiveClassInput } from '../../types';
import {
  canAccessLiveClass,
  createLiveClass,
  createLiveClassGroup,
  ensureLiveClassSession,
  getLiveClassMeetLink,
  subscribeLiveClass,
  subscribeLiveClassGroups,
  subscribeLiveClasses,
  updateLiveClass,
  updateLiveClassGroup,
} from '../../services/liveClassesService';
import { LiveClassForm } from './LiveClassForm';
import { LiveClassGroupForm } from './LiveClassGroupForm';
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
    teacherUid: createdBy,
    groupId: input.groupId?.trim() ?? '',
    groupName: input.groupName?.trim() ?? '',
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

const buildSessionDraftFromGroup = (group: LiveClassGroup, teacherName: string): Partial<LiveClassInput> => ({
  title: group.name,
  teacherName,
  groupId: group.id,
  groupName: group.name,
  whatsappLink: group.whatsappLink ?? '',
  assignedStudentIds: group.assignedStudentIds,
  assignedStudentNames: group.assignedStudentNames,
  isPrivate: true,
});

export const LiveClassesPage: React.FC<LiveClassesPageProps> = ({ user, isTeacher, onOpenClassContent, onBack }) => {
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [groups, setGroups] = useState<LiveClassGroup[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<LiveClass | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingClass, setEditingClass] = useState<LiveClass | null>(null);
  const [editingGroup, setEditingGroup] = useState<LiveClassGroup | null>(null);
  const [sessionDraft, setSessionDraft] = useState<Partial<LiveClassInput> | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [groupsError, setGroupsError] = useState('');
  const [roomClassId, setRoomClassId] = useState<string>(() => getRoomClassIdFromPath());
  const [accessError, setAccessError] = useState('');
  const teacherDisplayName = user.displayName || user.email || '';

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
        setClasses(nextClasses);
        setLoading(false);
        setLoadError('');
      },
      (error) => {
        console.warn('[LiveClassesPage] class subscription failed:', error);
        setLoading(false);
        setLoadError('Unable to load online sessions right now.');
      },
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isTeacher) {
      setGroups([]);
      setGroupsLoading(false);
      setGroupsError('');
      return undefined;
    }

    const unsub = subscribeLiveClassGroups(
      (nextGroups) => {
        setGroups(nextGroups);
        setGroupsLoading(false);
        setGroupsError('');
      },
      (error) => {
        console.warn('[LiveClassesPage] group subscription failed:', error);
        setGroupsLoading(false);
        setGroupsError('Unable to load online groups right now.');
      },
    );

    return () => unsub();
  }, [isTeacher]);

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

  const openCreate = (draft?: Partial<LiveClassInput>) => {
    setEditingClass(null);
    setSessionDraft(draft);
    setShowForm(true);
  };

  const openCreateFromGroup = (group: LiveClassGroup) => {
    setShowGroupForm(false);
    setEditingGroup(null);
    openCreate(buildSessionDraftFromGroup(group, teacherDisplayName));
  };

  const openEdit = (liveClass: LiveClass) => {
    setEditingClass(liveClass);
    setSessionDraft(undefined);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingClass(null);
    setSessionDraft(undefined);
  };

  const openGroupCreate = () => {
    setEditingGroup(null);
    setShowGroupForm(true);
  };

  const openGroupEdit = (group: LiveClassGroup) => {
    setEditingGroup(group);
    setShowGroupForm(true);
  };

  const closeGroupForm = () => {
    setShowGroupForm(false);
    setEditingGroup(null);
  };

  const handleSave = async (input: LiveClassInput) => {
    setSaving(true);
    try {
      if (editingClass) {
        await updateLiveClass(editingClass.id, input);
      } else {
        const classId = await createLiveClass(user.uid, input);
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

  const handleSaveGroup = async (input: LiveClassGroupInput) => {
    setSavingGroup(true);
    try {
      if (editingGroup) {
        await updateLiveClassGroup(editingGroup.id, input);
      } else {
        await createLiveClassGroup(user.uid, input);
      }
      closeGroupForm();
    } catch (error) {
      console.warn('[LiveClassesPage] save group failed:', error);
    } finally {
      setSavingGroup(false);
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
      <button onClick={onBack} className="mb-4 text-sm font-bold text-slate-200" type="button">&larr; Back</button>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Online</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage scheduled classes, open active rooms, and create new meetings.
          </p>
        </div>
        {isTeacher ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openGroupCreate}
              className="rounded-xl border border-slate-500 px-3 py-2 text-xs font-black text-slate-100"
            >
              + New Group
            </button>
            <button
              type="button"
              onClick={() => openCreate({
                teacherName: teacherDisplayName,
                isPrivate: true,
              })}
              className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white shadow-[0_4px_0_0_#1d4ed8]"
            >
              + New Session
            </button>
          </div>
        ) : null}
      </div>

      {accessError ? (
        <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-sm font-semibold text-rose-200">
          {accessError}
        </div>
      ) : null}

      {showForm ? (
        <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-900 p-3">
          <LiveClassForm
            initialValue={editingClass ?? sessionDraft ?? undefined}
            onCancel={closeForm}
            onSubmit={handleSave}
            submitting={saving}
          />
        </div>
      ) : null}

      {showGroupForm && isTeacher ? (
        <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-900 p-3">
          <LiveClassGroupForm
            initialValue={editingGroup ?? undefined}
            onCancel={closeGroupForm}
            onSubmit={handleSaveGroup}
            submitting={savingGroup}
          />
        </div>
      ) : null}

      {isTeacher ? (
        <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-800 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white">Groups</h2>
              <p className="text-sm text-slate-400">
                Reuse the same students for VIP classes, recurring sessions, and quick meetings.
              </p>
            </div>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-300">
              {groups.length} groups
            </span>
          </div>

          {groupsLoading ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
              Loading groups...
            </div>
          ) : groupsError ? (
            <div className="rounded-2xl border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-200">
              {groupsError}
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-900/60 p-4 text-sm text-slate-300">
              No groups yet. Create your first group to save a fixed set of students and reuse it in future sessions.
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <article
                  key={group.id}
                  className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-white">{group.name}</h3>
                      <p className="mt-1 text-sm text-slate-300">
                        {group.assignedStudentNames.length} student{group.assignedStudentNames.length === 1 ? '' : 's'}
                      </p>
                      {group.description ? (
                        <p className="mt-2 text-sm text-slate-400">{group.description}</p>
                      ) : null}
                      {group.assignedStudentNames.length > 0 ? (
                        <p className="mt-2 text-xs text-slate-400">
                          {group.assignedStudentNames.join(', ')}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openCreateFromGroup(group)}
                        className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-black text-white shadow-[0_4px_0_0_#1d4ed8]"
                      >
                        New Session From Group
                      </button>
                      <button
                        type="button"
                        onClick={() => openGroupEdit(group)}
                        className="rounded-xl border border-slate-500 px-3 py-2 text-sm font-bold text-slate-100"
                      >
                        Edit Group
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-300">
            Loading online sessions...
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-200">
            {loadError}
          </div>
        ) : sortedClasses.length === 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-300">
            No online sessions yet. Teachers can create the first session.
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
              {liveClass.groupName ? (
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-blue-300">
                  Group: {liveClass.groupName}
                </p>
              ) : null}

              <div className="my-4 flex justify-center">
                <img src="/logo.png" alt="Learnendo" className="w-24 opacity-70" />
              </div>

              {liveClass.description ? (
                <p className="mt-2 max-w-2xl text-lg leading-relaxed text-white">
                  {liveClass.description}
                </p>
              ) : null}

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
