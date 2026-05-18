import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { LiveClass, LiveClassGroup, LiveClassGroupInput, LiveClassInput } from '../../types';
import {
  canAccessLiveClass,
  createLiveClass,
  createLiveClassGroup,
  deleteLiveClass,
  ensureLiveClassSession,
  filterLiveClassesForViewer,
  subscribeLiveClass,
  subscribeLiveClassGroups,
  subscribeLiveClasses,
  resolveAssignedStudentRoster,
  updateLiveClass,
  updateLiveClassGroup,
} from '../../services/liveClassesService';
import type { UserRole, UserViewMode } from '../../services/userRoles';
import { LiveClassForm } from './LiveClassForm';
import { LiveClassGroupForm } from './LiveClassGroupForm';
import { LiveClassDetailsPage } from './LiveClassDetailsPage';
import { BASE_UI_LANGUAGE_STORAGE_KEY, getScopedStorageItem } from '../../utils/tabScopedStorage';
import { LiveClassRoomPage } from './LiveClassRoomPage';
import { learnendoLogoTransparent } from '../../assets/branding';
import { getLiveClassAssignableUsers, StudentBasicInfo } from '../../services/teacherDashboard';

interface LiveClassesPageProps {
  user: User;
  accountRole: UserRole;
  userRole: UserRole;
  viewMode: UserViewMode;
  canManageClasses: boolean;
  currentCourseId: string;
  uiLanguage?: 'en' | 'pt' | 'es';
  onOpenClassContent: (liveClass: LiveClass) => void;
  onRoomContextChange: (liveClass: LiveClass | null) => void;
  onOpenBattleHub: () => void;
  onBack: () => void;
}

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
    courseId: input.courseId?.trim() ?? 'english',
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

const getForcedTabViewModeFromSearch = (): UserViewMode | null => {
  if (typeof window === 'undefined') return null;
  const requestedMode = new URLSearchParams(window.location.search).get('tabViewMode');
  return requestedMode === 'student' || requestedMode === 'teacher' || requestedMode === 'admin'
    ? requestedMode
    : null;
};

const buildSessionDraftFromGroup = (group: LiveClassGroup, teacherName: string, courseId: string): Partial<LiveClassInput> => ({
  title: group.name,
  teacherName,
  courseId,
  groupId: group.id,
  groupName: group.name,
  whatsappLink: group.whatsappLink ?? '',
  assignedStudentIds: group.assignedStudentIds,
  assignedStudentNames: group.assignedStudentNames,
  isPrivate: true,
});

/**
 * Returns the next expected start time for a LiveClass.
 *
 * - live     → Date(0)  — always sorts first
 * - upcoming → the stored date/time (the actual next occurrence)
 * - recurring (finished) → next occurrence of the same weekday + time from now
 */
const getNextOccurrence = (liveClass: LiveClass): Date => {
  const FAR_FUTURE = new Date(8640000000000000);
  if (liveClass.status === 'live') return new Date(0);
  const stored = new Date(`${liveClass.date}T${liveClass.time}:00`);
  if (liveClass.status === 'upcoming') {
    return Number.isNaN(stored.getTime()) ? FAR_FUTURE : stored;
  }
  // recurring: project to the next same weekday
  if (Number.isNaN(stored.getTime())) return FAR_FUTURE;
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(stored.getHours(), stored.getMinutes(), 0, 0);
  let daysUntil = (stored.getDay() - now.getDay() + 7) % 7;
  if (daysUntil === 0 && candidate.getTime() <= now.getTime()) daysUntil = 7;
  candidate.setDate(candidate.getDate() + daysUntil);
  return candidate;
};

export const LiveClassesPage: React.FC<LiveClassesPageProps> = ({
  user,
  accountRole,
  userRole,
  viewMode,
  canManageClasses,
  currentCourseId,
  uiLanguage = (() => {
    try {
      const stored = getScopedStorageItem(BASE_UI_LANGUAGE_STORAGE_KEY);
      return stored === 'pt' || stored === 'es' ? stored : 'en';
    } catch {
      return 'en';
    }
  })(),
  onOpenClassContent,
  onRoomContextChange,
  onOpenBattleHub,
  onBack,
}) => {
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
  const [now, setNow] = useState(() => new Date());
  const [participantDirectory, setParticipantDirectory] = useState<StudentBasicInfo[]>([]);
  const teacherDisplayName = user.displayName || user.email || 'Professor';
  const forcedTabViewMode = getForcedTabViewModeFromSearch();
  const isForcedStudentRoomView =
    forcedTabViewMode === 'student' &&
    (accountRole === 'teacher' || accountRole === 'admin');
  const viewerRole = userRole === 'teacher' && !canManageClasses ? 'student' : userRole;
  const viewer = useMemo(() => ({
    uid: user.uid,
    email: user.email,
    name: user.displayName || user.email || '',
    role: viewerRole,
  }), [user.displayName, user.email, user.uid, viewerRole]);

  const enterRoom = (liveClass: LiveClass) => {
    const allowed = canAccessLiveClass(liveClass, viewer);
    if (!allowed && !isForcedStudentRoomView) {
      setAccessError('This classroom is not assigned to this account.');
      return;
    }
    setAccessError('');
    setSelectedClassId(liveClass.id);
    setSelectedClass(liveClass);
    setRoomClassId(liveClass.id);
    const roomPath = `/live-class/${encodeURIComponent(liveClass.id)}${window.location.search}`;
    if (`${window.location.pathname}${window.location.search}` !== roomPath) {
      window.history.pushState({}, '', roomPath);
    }
  };

  const leaveRoom = () => {
    setRoomClassId('');
    if (window.location.pathname.startsWith('/live-class/')) {
      window.history.pushState({}, '', `/${window.location.search}`);
    }
  };

  useEffect(() => {
    const unsub = subscribeLiveClasses(
      viewer,
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
  }, [viewer]);

  useEffect(() => {
    if (!canManageClasses) {
      setGroups([]);
      setGroupsLoading(false);
      setGroupsError('');
      return undefined;
    }

    const unsub = subscribeLiveClassGroups(
      viewer,
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
  }, [canManageClasses, viewer]);

  useEffect(() => {
    if (!canManageClasses) {
      setParticipantDirectory([]);
      return undefined;
    }

    let mounted = true;
    getLiveClassAssignableUsers()
      .then((rows) => {
        if (!mounted) return;
        setParticipantDirectory(rows);
      })
      .catch((error) => {
        console.warn('[LiveClassesPage] participant directory load failed:', error);
      });

    return () => {
      mounted = false;
    };
  }, [canManageClasses]);

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

  const visibleClasses = useMemo(
    () => filterLiveClassesForViewer(classes, viewer),
    [classes, viewer],
  );

  // Keep `now` fresh for countdown display (every 30 s is sufficient)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const sortedClasses = useMemo(
    () => [...visibleClasses].sort((a, b) => getNextOccurrence(a).getTime() - getNextOccurrence(b).getTime()),
    [visibleClasses],
  );

  const getAssignedStudentLabels = useCallback(
    (liveClass: LiveClass) => resolveAssignedStudentRoster(liveClass, participantDirectory).map((student) => student.label),
    [participantDirectory],
  );

  const getCountdown = (liveClass: LiveClass): string | null => {
    if (liveClass.status !== 'upcoming') return null;
    const start = new Date(`${liveClass.date}T${liveClass.time}:00`);
    if (Number.isNaN(start.getTime())) return null;
    const minsUntil = Math.round((start.getTime() - now.getTime()) / 60_000);
    if (minsUntil < 0 || minsUntil > 60) return null;
    if (minsUntil === 0) return 'Starting now';
    return `Starts in ${minsUntil} min`;
  };

  const activeRoomClass = useMemo(() => {
    if (!roomClassId) return null;
    if (selectedClass?.id === roomClassId) return selectedClass;
    return visibleClasses.find((item) => item.id === roomClassId) ?? null;
  }, [roomClassId, selectedClass, visibleClasses]);

  useEffect(() => {
    onRoomContextChange(activeRoomClass ?? null);
  }, [activeRoomClass, onRoomContextChange]);

  useEffect(() => {
    if (!selectedClass) return;
    if (isForcedStudentRoomView) return;
    if (canAccessLiveClass(selectedClass, viewer)) return;
    setSelectedClass(null);
    setSelectedClassId('');
    if (roomClassId === selectedClass.id) {
      leaveRoom();
    }
  }, [isForcedStudentRoomView, roomClassId, selectedClass, viewer]);

  const openCreate = (draft?: Partial<LiveClassInput>) => {
    setEditingClass(null);
    setSessionDraft(draft);
    setShowForm(true);
  };

  const openCreateFromGroup = (group: LiveClassGroup) => {
    setShowGroupForm(false);
    setEditingGroup(null);
    openCreate(buildSessionDraftFromGroup(group, teacherDisplayName, currentCourseId));
  };

  const openEdit = (liveClass: LiveClass) => {
    setEditingClass(liveClass);
    setSessionDraft(undefined);
    setSelectedClassId(liveClass.id);
    setSelectedClass(liveClass);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingClass(null);
    setSessionDraft(undefined);
  };

  const openEditFromRoom = (liveClass: LiveClass) => {
    leaveRoom();
    openEdit(liveClass);
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

  const handleDeleteClass = async (liveClass: LiveClass) => {
    if (!window.confirm(`Delete "${liveClass.title}"?`)) return;

    try {
      await deleteLiveClass(liveClass.id);
      setClasses((prev) => prev.filter((item) => item.id !== liveClass.id));
      setSelectedClassId('');
      setSelectedClass(null);
      setRoomClassId('');
      if (window.location.pathname.startsWith('/live-class/')) {
        window.history.pushState({}, '', '/');
      }
    } catch (error) {
      console.warn('[LiveClassesPage] delete class failed:', error);
    }
  };

  if (roomClassId && activeRoomClass) {
    return (
      <LiveClassRoomPage
        liveClass={activeRoomClass}
        user={user}
        isTeacher={canManageClasses}
        uiLanguage={uiLanguage}
        onOpenClassContent={onOpenClassContent}
        onEditClass={openEditFromRoom}
        onOpenBattleHub={onOpenBattleHub}
        onExit={leaveRoom}
      />
    );
  }

  if (selectedClass && !showForm) {
    const hasRoomAccess = canAccessLiveClass(selectedClass, viewer);
    return (
      <LiveClassDetailsPage
        liveClass={selectedClass}
        participantDirectory={participantDirectory}
        user={user}
        isTeacher={canManageClasses}
        hasRoomAccess={hasRoomAccess}
        onBack={() => {
          setSelectedClassId('');
          setSelectedClass(null);
        }}
        onEdit={() => openEdit(selectedClass)}
        onDelete={() => void handleDeleteClass(selectedClass)}
        onEnterRoom={() => enterRoom(selectedClass)}
        onOpenClassContent={() => onOpenClassContent(selectedClass)}
      />
    );
  }

  const emptyStateText = viewerRole === 'admin'
    ? 'No live sessions yet. Teachers can create the first class.'
    : canManageClasses
      ? 'No classes registered for this teacher yet.'
      : 'No classes are assigned to this account yet.';

  return (
    <div className="min-h-screen bg-slate-900 px-3 pb-28 pt-6 sm:px-4">
      <button onClick={onBack} className="mb-4 text-sm font-bold text-slate-200" type="button">&larr; Back</button>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Live</h1>
          <p className="mt-1 text-sm text-slate-400">
            {viewerRole === 'admin'
              ? 'Admin can review every teacher and every live class.'
                : canManageClasses
                  ? 'Teacher view shows only the classes owned by this account.'
                : 'Student view shows only classes assigned to this email.'}
          </p>
          {viewMode !== 'admin' ? (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-blue-300">
              Viewing as {viewMode}
            </p>
          ) : null}
        </div>
        {canManageClasses ? (
          <button
            type="button"
            onClick={() => openCreate({
              courseId: currentCourseId,
              teacherName: teacherDisplayName,
              isPrivate: true,
            })}
            className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white shadow-[0_4px_0_0_#1d4ed8]"
          >
            + New Class
          </button>
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

      {showGroupForm && canManageClasses ? (
        <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-900 p-3">
          <LiveClassGroupForm
            initialValue={editingGroup ?? undefined}
            onCancel={closeGroupForm}
            onSubmit={handleSaveGroup}
            submitting={savingGroup}
          />
        </div>
      ) : null}

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-300">
            Loading live sessions...
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-200">
            {loadError}
          </div>
        ) : visibleClasses.length === 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6 text-sm text-slate-300">
            {emptyStateText}
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
              <div className="flex items-start gap-3 mb-3">
                <img src={learnendoLogoTransparent} alt="Learnendo" className="h-28 w-auto shrink-0 opacity-80" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-xl font-black leading-tight text-white">{liveClass.title}</h2>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-black uppercase ${
                      liveClass.status === 'live'
                        ? 'bg-emerald-500 text-slate-900'
                        : liveClass.status === 'upcoming'
                          ? 'bg-amber-500 text-slate-900'
                          : 'bg-blue-600 text-white'
                    }`}>
                      {liveClass.status === 'finished' ? 'Recurring' : liveClass.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-300">{liveClass.teacherName}</p>
                  {getCountdown(liveClass) ? (
                    <p className="mt-0.5 text-xs font-bold text-amber-300">⏱ {getCountdown(liveClass)}</p>
                  ) : null}
                  {getAssignedStudentLabels(liveClass).length > 0 ? (
                    <p className="mt-1 text-xs text-slate-400">
                      <span className="font-semibold text-slate-300">Students: </span>
                      {getAssignedStudentLabels(liveClass).join(', ')}
                    </p>
                  ) : null}
                </div>
              </div>

              {liveClass.description ? (
                <p className="mb-3 text-sm leading-relaxed text-white">
                  {liveClass.description}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap justify-end gap-2">
                {canManageClasses ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDeleteClass(liveClass);
                    }}
                    className="rounded-xl border border-rose-500/50 bg-rose-950/30 px-3 py-2 text-sm font-bold text-rose-200"
                  >
                    Delete
                  </button>
                ) : null}
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
                {canManageClasses ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditingClass(liveClass);
                      setSessionDraft(undefined);
                      setShowForm(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="rounded-xl bg-blue-500 px-3 py-2 text-sm font-black text-white shadow-[0_4px_0_0_#1d4ed8]"
                  >
                    Settings
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
};
