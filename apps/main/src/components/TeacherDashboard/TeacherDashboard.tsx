/**
 * TeacherDashboard.tsx
 *
 * Full teacher dashboard:
 *   Tab 1 — Students table (sortable, searchable, alert badges, PDF download)
 *   Tab 2 — Top-10 ranking leaderboard
 *
 * All data comes from teacherService → courseProgressEngine + alertService + rankingService.
 * No business logic lives in this component.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import {
  subscribeToTeacherData,
  sortRows,
  filterRows,
  TeacherStudentRow,
  SortColumn,
  formatAccuracy,
} from '../../engine/teacherService';
import { rankMedal } from '../../engine/rankingService';
import { AlertType } from '../../engine/alertService';
import { generateStudentReport } from '../../services/reportService';
import { generatePlacementReport } from '../../services/placementReportService';
import { AdminUserAccessTab } from './AdminUserAccessTab';
import type { LiveClassGroup } from '../../types';
import { subscribeLiveClassGroups } from '../../services/liveClassesService';
import { ClassManagementModal, StudentAdminPanel } from './StudentAdminPanel';
import type { StudentDeletionResult } from '../../services/adminStudents';
import { buildClassPerformanceReport } from '../../services/classReportModel';
import { ClassReportModal } from './ClassReportModal';
import { getClassComposition } from '../../services/classMembership';
import {
  adminNotificationStatusLabel,
  getAdminNotificationStatuses,
  type AdminNotificationStatus,
} from '../../services/adminNotifications';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type Tab = 'students' | 'ranking' | 'access';

interface TeacherDashboardProps {
  user: User;
  canManageUsers?: boolean;
  teacherUid?: string | null;
}

// ─────────────────────────────────────────────────────────────
// Alert Badge
// ─────────────────────────────────────────────────────────────

const ALERT_STYLES: Record<AlertType, { bg: string; text: string; icon: string }> = {
  inactive:     { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⏰' },
  low_accuracy: { bg: 'bg-red-100',    text: 'text-red-800',    icon: '📉' },
  high_errors:  { bg: 'bg-pink-100',   text: 'text-pink-800',   icon: '⚠️' },
};

const AlertBadge: React.FC<{ type: AlertType; message: string }> = ({ type, message }) => {
  const s = ALERT_STYLES[type];
  return (
    <span
      title={message}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text} cursor-default`}
    >
      {s.icon} {message}
    </span>
  );
};

const STATUS_STYLES: Record<TeacherStudentRow['dashboardStatus'], string> = {
  Registered: 'bg-slate-100 text-slate-700',
  'Placement Done': 'bg-blue-100 text-blue-700',
  'Not Started': 'bg-amber-100 text-amber-700',
  Active: 'bg-green-100 text-green-700',
};

const rowBackgroundClass = (index: number) => index % 2 === 0 ? 'bg-white' : 'bg-slate-50';

const NOTIFICATION_STATUS_STYLES: Record<AdminNotificationStatus['kind'], string> = {
  active: 'bg-emerald-100 text-emerald-700',
  disabled: 'bg-slate-200 text-slate-700',
  'not-authorized': 'bg-amber-100 text-amber-800',
  'no-device': 'bg-red-100 text-red-700',
};

const NotificationStatusBadge: React.FC<{ status?: AdminNotificationStatus; loading: boolean }> = ({ status, loading }) => {
  if (!status) return <span className="text-xs text-slate-400">{loading ? 'Carregando…' : 'Indisponível'}</span>;
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-bold whitespace-nowrap ${NOTIFICATION_STATUS_STYLES[status.kind]}`}>
      {adminNotificationStatusLabel(status)}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// Sortable column header
// ─────────────────────────────────────────────────────────────

const SortHeader: React.FC<{
  col: SortColumn;
  label: string;
  activeCol: SortColumn;
  dir: 'asc' | 'desc';
  onClick: (col: SortColumn) => void;
}> = ({ col, label, activeCol, dir, onClick }) => (
  <th
    className="px-4 py-3 text-left text-sm font-semibold text-white cursor-pointer select-none hover:bg-blue-700 transition-colors whitespace-nowrap"
    onClick={() => onClick(col)}
  >
    {label}
    {activeCol === col && (
      <span className="ml-1 text-blue-200">{dir === 'asc' ? '↑' : '↓'}</span>
    )}
  </th>
);

// ─────────────────────────────────────────────────────────────
// Students Tab
// ─────────────────────────────────────────────────────────────

const StudentsTab: React.FC<{
  rows: TeacherStudentRow[];
  allRows: TeacherStudentRow[];
  user: User;
  canManageUsers: boolean;
  groups: LiveClassGroup[];
  membershipRows: TeacherStudentRow[];
  selectedGroupId: string;
  onSelectedGroupIdChange: (value: string) => void;
  onStudentDeleted: (uid: string, result: StudentDeletionResult) => void;
}> = ({ rows, allRows, user, canManageUsers, groups, membershipRows, selectedGroupId, onSelectedGroupIdChange, onStudentDeleted }) => {
  const [search, setSearch]         = useState('');
  const [sortCol, setSortCol]       = useState<SortColumn>('score');
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('desc');
  const [generating, setGenerating]           = useState<string | null>(null);
  const [generatingPlacement, setGeneratingPlacement] = useState<string | null>(null);
  const [managedStudent, setManagedStudent] = useState<TeacherStudentRow | null | undefined>(undefined);
  const [showClassManager, setShowClassManager] = useState(false);
  const [showClassReport, setShowClassReport] = useState(false);
  const [notificationStatuses, setNotificationStatuses] = useState<Record<string, AdminNotificationStatus>>({});
  const [notificationStatusesLoading, setNotificationStatusesLoading] = useState(canManageUsers);

  useEffect(() => {
    if (!canManageUsers) return;
    let active = true;
    setNotificationStatusesLoading(true);
    getAdminNotificationStatuses(user, allRows.map((student) => student.uid))
      .then((statuses) => {
        if (!active) return;
        setNotificationStatuses(Object.fromEntries(statuses.map((status) => [status.uid, status])));
      })
      .catch((reason) => {
        if (active) console.warn('[TeacherDashboard] notification status query failed:', reason);
      })
      .finally(() => { if (active) setNotificationStatusesLoading(false); });
    return () => { active = false; };
  }, [allRows, canManageUsers, user]);

  const handleSort = (col: SortColumn) => {
    if (col === sortCol) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const visible = useMemo(
    () => sortRows(filterRows(rows, search), sortCol, sortDir),
    [rows, search, sortCol, sortDir],
  );

  const handlePdf = (student: TeacherStudentRow) => {
    setGenerating(student.uid);
    try {
      generateStudentReport(student);
    } finally {
      setGenerating(null);
    }
  };

  const handlePlacementPdf = (student: TeacherStudentRow) => {
    setGeneratingPlacement(student.uid);
    try {
      generatePlacementReport(student);
    } finally {
      setGeneratingPlacement(null);
    }
  };

  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? null;
  const classComposition = useMemo(
    () => getClassComposition(selectedGroup, membershipRows),
    [membershipRows, selectedGroup],
  );
  const classReport = useMemo(
    () => selectedGroup
      ? buildClassPerformanceReport(selectedGroup.name, classComposition.students, new Date(), classComposition.teacher?.displayName)
      : null,
    [classComposition, selectedGroup],
  );
  const activeRecently = rows.filter((student) => {
    const raw = student.lastActivity as { toDate?: () => Date } | string | number | Date | null | undefined;
    if (!raw) return false;
    const date = typeof raw === 'object' && 'toDate' in raw && typeof raw.toDate === 'function' ? raw.toDate() : new Date(raw as string | number | Date);
    return !Number.isNaN(date.getTime()) && Date.now() - date.getTime() < 2 * 24 * 60 * 60 * 1000;
  }).length;
  const mostAdvanced = rows.length ? [...rows].sort((a, b) => b.score - a.score)[0] : null;
  const needsAttention = rows.length ? [...rows].sort((a, b) => b.alerts.length - a.alerts.length || a.score - b.score)[0] : null;
  const activeNotifications = rows.filter((student) => notificationStatuses[student.uid]?.kind === 'active').length;

  return (
    <div>
      {/* Search, class filter and administrative actions */}
      <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-center">
        <input
          type="search"
          placeholder="Search students…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full lg:max-w-sm px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
        />
        <select
          value={selectedGroupId}
          onChange={(event) => onSelectedGroupIdChange(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 lg:max-w-xs"
          aria-label="Filter by class"
        >
          <option value="all">All students</option>
          {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          {canManageUsers && <option value="ungrouped">No class</option>}
        </select>
        <span className="text-sm text-slate-500 whitespace-nowrap">
          {visible.length} of {rows.length} student{rows.length !== 1 ? 's' : ''}
        </span>
        <div className="flex flex-wrap gap-2 lg:ml-auto">
          {canManageUsers && (
            <button type="button" onClick={() => setShowClassManager(true)} className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50">Classes</button>
          )}
          {selectedGroup && <button type="button" onClick={() => setShowClassReport(true)} className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50">Class report / PDF</button>}
          {canManageUsers && (
            <button type="button" onClick={() => setManagedStudent(null)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">+ New student</button>
          )}
        </div>
      </div>

      {selectedGroupId !== 'all' && (
        <div className="mb-4 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
          <div className="mb-3"><h2 className="font-black text-slate-800">Class: {selectedGroup?.name ?? 'No class'}</h2><p className="text-sm text-slate-500">{rows.length} student{rows.length !== 1 ? 's' : ''}</p></div>
          <div className={`grid grid-cols-2 gap-3 text-sm ${canManageUsers ? 'sm:grid-cols-6' : 'sm:grid-cols-5'}`}>
            <div><span className="block text-xs text-slate-500">Recently active</span><b>{activeRecently}</b></div>
            <div><span className="block text-xs text-slate-500">No recent activity</span><b>{rows.length - activeRecently}</b></div>
            <div><span className="block text-xs text-slate-500">Average progress</span><b>{classReport?.summary.averageProgress ?? 0}%</b></div>
            <div><span className="block text-xs text-slate-500">Most advanced</span><b className="block truncate">{mostAdvanced?.displayName ?? '—'}</b></div>
            <div><span className="block text-xs text-slate-500">Needs attention</span><b className="block truncate">{needsAttention?.alerts.length ? needsAttention.displayName : '—'}</b></div>
            {canManageUsers && <div><span className="block text-xs text-slate-500">Notificações ativas</span><b>{activeNotifications} / {rows.length}</b></div>}
          </div>
          {classReport && classReport.students.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-xs font-bold text-slate-700">
              {classReport.students.slice(0, 3).map((student, index) => (
                <span key={`${student.position}-${student.name}-${index}`} className="rounded-full bg-slate-100 px-3 py-1">
                  {student.position === 1 ? '🥇' : student.position === 2 ? '🥈' : '🥉'} {student.name} - {student.score.toFixed(1)} pts
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center text-slate-500">
          No students match your search.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700">
                <tr>
                  <SortHeader col="name"         label="Student"      activeCol={sortCol} dir={sortDir} onClick={handleSort} />
                  <th className="px-3 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">Status</th>
                  {canManageUsers && <th className="px-3 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">Notificações</th>}
                  <SortHeader col="path"         label="Progress"     activeCol={sortCol} dir={sortDir} onClick={handleSort} />
                  <th className="px-3 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">Work</th>
                  <SortHeader col="lastActivity" label="Active"       activeCol={sortCol} dir={sortDir} onClick={handleSort} />
                  <SortHeader col="alerts"       label="Alerts"       activeCol={sortCol} dir={sortDir} onClick={handleSort} />
                  <th className="px-3 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">PT</th>
                  <th className="px-3 py-3 text-center text-sm font-semibold text-white">PDF</th>
                  {canManageUsers && <th className="px-3 py-3 text-center text-sm font-semibold text-white"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((student, idx) => (
                  <tr
                    key={student.uid}
                    className={`${rowBackgroundClass(idx)} hover:bg-blue-50`}
                  >
                    <td className={`sticky left-0 z-10 px-3 py-3 font-semibold text-slate-800 whitespace-nowrap ${rowBackgroundClass(idx)}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{rankMedal(student.rank)}</span>
                        <div className="min-w-0">
                          <button type="button" onClick={() => canManageUsers && setManagedStudent(student)} className={`max-w-[150px] truncate text-left ${canManageUsers ? 'hover:text-blue-700 hover:underline' : ''}`}>{student.displayName || '—'}</button>
                          <div className="text-[11px] font-medium text-slate-500">{student.selectedCourseLabel}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap align-top">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[student.dashboardStatus]}`}>
                        {student.dashboardStatus}
                      </span>
                    </td>
                    {canManageUsers && (
                      <td className="px-3 py-3 whitespace-nowrap align-top">
                        <NotificationStatusBadge status={notificationStatuses[student.uid]} loading={notificationStatusesLoading} />
                      </td>
                    )}
                    <td className="px-3 py-3 text-slate-700 whitespace-nowrap font-mono text-xs align-top">
                      <div>{student.pathLabel}</div>
                      <div className="mt-1 font-sans text-[11px] font-semibold text-emerald-600">
                        {student.avgAccuracy > 0 ? `✔ ${Math.round(student.avgAccuracy)}%` : '✔ 0%'}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-700 whitespace-nowrap align-top">
                      <div className="font-semibold">{student.lessonsLabel}</div>
                      <div className="text-[11px] text-slate-500">{student.selectedLanguageLabel}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-500 text-xs whitespace-nowrap align-top">
                      {student.lastActivityLabel}
                    </td>
                    <td className="px-3 py-3 align-top">
                      {student.alerts.length === 0 ? (
                        <span className="text-xs text-green-600 font-medium">✓</span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {student.alerts.slice(0, 2).map((a, i) => (
                            <AlertBadge key={i} type={a.type} message={a.message} />
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap align-top">
                      {student.tests?.placement ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-blue-700">{student.tests.placement.level ?? '—'}</span>
                          <span className="text-[11px] text-slate-500">{student.tests.placement.score}%</span>
                          <button
                            onClick={() => handlePlacementPdf(student)}
                            disabled={generatingPlacement === student.uid}
                            title="Download Placement Test PDF"
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-2 py-1 rounded-md text-[11px] font-medium transition-all active:scale-95 mt-0.5"
                          >
                            {generatingPlacement === student.uid ? '…' : '📋 PDF'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">{student.placementLabel}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center align-top">
                      <button
                        onClick={() => handlePdf(student)}
                        disabled={generating === student.uid}
                        title="Download PDF report"
                        className="bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all active:scale-95"
                      >
                        {generating === student.uid ? '…' : '📄 PDF'}
                      </button>
                    </td>
                    {canManageUsers && (
                      <td className="px-3 py-3 text-center align-top">
                        <button type="button" onClick={() => setManagedStudent(student)} title="Manage student" aria-label={`Manage ${student.displayName || student.email || 'student'}`} className="rounded-lg px-3 py-1.5 text-xl font-bold text-slate-500 hover:bg-blue-100 hover:text-blue-700">⋮</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {managedStudent !== undefined && <StudentAdminPanel admin={user} student={managedStudent} groups={groups} notificationStatus={managedStudent ? notificationStatuses[managedStudent.uid] : undefined} onNotificationStatusChange={(status) => setNotificationStatuses((current) => ({ ...current, [status.uid]: status }))} onClose={() => setManagedStudent(undefined)} onDeleted={onStudentDeleted} />}
      {showClassManager && <ClassManagementModal groups={groups} students={membershipRows} onClose={() => setShowClassManager(false)} />}
      {showClassReport && classReport && <ClassReportModal report={classReport} onClose={() => setShowClassReport(false)} />}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Ranking Tab
// ─────────────────────────────────────────────────────────────

/** Course options shown in the RankingTab selector — must match courseId values in Firestore. */
const RANKING_COURSE_OPTIONS = [
  { id: '',                     label: 'All Courses' },
  { id: 'english',              label: '🇺🇸 English' },
  { id: 'portuguese_foreigners',label: '🇧🇷 Portuguese' },
  { id: 'spanish',              label: '🇪🇸 Spanish' },
  { id: 'greek_koine',          label: '🇬🇷 Greek' },
  { id: 'hebrew_biblical',      label: '🇮🇱 Hebrew' },
] as const;

const RankingTab: React.FC<{ rows: TeacherStudentRow[] }> = ({ rows }) => {
  const [courseFilter, setCourseFilter] = useState('');

  // Same dual-check used in subscribeToTeacherData: root courseId (legacy) + courses map (new).
  const filteredRows = useMemo(() => {
    if (!courseFilter) return rows;
    return rows.filter(
      r => r.courseId === courseFilter || r.courses?.[courseFilter] !== undefined,
    );
  }, [rows, courseFilter]);

  const rankingRows = useMemo(
    () => filteredRows.filter((row) => row.dashboardStatus === 'Active' || row.score > 0),
    [filteredRows],
  );

  const top10 = useMemo(
    () => [...rankingRows]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((student, index) => ({ ...student, rank: index + 1 })),
    [rankingRows]
  );

  const podiumColour = (rank: number) => {
    if (rank === 1) return 'bg-yellow-50 border-yellow-300';
    if (rank === 2) return 'bg-slate-50 border-slate-300';
    if (rank === 3) return 'bg-orange-50 border-orange-300';
    return 'bg-white border-slate-200';
  };

  return (
    <div>
      {/* Course selector */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {RANKING_COURSE_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => setCourseFilter(opt.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              courseFilter === opt.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Score = (Stars×2) + (Diamonds×3) + (Accuracy÷10) + (Days×0.2) &nbsp;·&nbsp; Top 10 shown
      </p>
      {top10.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center text-slate-500">
          No students with scores yet.
        </div>
      ) : (
        <div className="space-y-2">
          {top10.map(student => (
            <div
              key={student.uid}
              className={`flex items-center gap-4 rounded-2xl border px-5 py-3 ${podiumColour(student.rank)}`}
            >
              {/* Rank */}
              <div className="w-10 text-center shrink-0">
                {rankMedal(student.rank) ? (
                  <span className="text-2xl">{rankMedal(student.rank)}</span>
                ) : (
                  <span className="text-lg font-bold text-slate-400">#{student.rank}</span>
                )}
              </div>
              {/* Name + email */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 truncate">
                  {student.displayName || '—'}
                </p>
                <p className="text-xs text-slate-500 truncate">{student.email || '—'}</p>
              </div>
              {/* Path */}
              <div className="text-xs font-mono text-slate-500 hidden sm:block whitespace-nowrap">
                {student.pathLabel}
              </div>
              {/* Stat chips */}
              <div className="flex gap-2 text-xs">
                <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-semibold">
                  🔥 {student.totalFire}
                </span>
                <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-semibold">
                  💎 {student.totalDiamonds}
                </span>
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
                  📅 {student.daysCompleted}
                </span>
              </div>
              {/* Score */}
              <div className="text-right w-16 shrink-0">
                <p className="text-xl font-black text-blue-700">{student.score.toFixed(0)}</p>
                <p className="text-xs text-slate-400">pts</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Summary card (internal)
// ─────────────────────────────────────────────────────────────

const SummaryCard: React.FC<{
  emoji: string;
  label: string;
  value: string;
  colour: string;
}> = ({ emoji, label, value, colour }) => (
  <div className="bg-white rounded-2xl shadow-sm px-4 py-4 flex flex-col items-center text-center gap-2 overflow-hidden w-full">
    <div className={`${colour} text-white rounded-xl w-10 h-10 flex items-center justify-center text-lg shrink-0`}>
      {emoji}
    </div>
    <div className="w-full">
      <p className="text-xs text-slate-500 font-medium break-words">{label}</p>
      <p className="text-2xl font-black text-slate-800 leading-tight">{value}</p>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, canManageUsers = false, teacherUid = null }) => {
  const [tab, setTab]               = useState<Tab>('students');
  const [rows, setRows]             = useState<TeacherStudentRow[]>([]);
  const [administrativeRows, setAdministrativeRows] = useState<TeacherStudentRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [groups, setGroups] = useState<LiveClassGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const [deletionMessage, setDeletionMessage] = useState<string | null>(null);

  const handleStudentDeleted = (uid: string, result: StudentDeletionResult) => {
    setRows((current) => current.filter((student) => student.uid !== uid));
    setGroups((current) => current.map((group) => {
      const pairs = group.assignedStudentIds.map((id, index) => ({ id, name: group.assignedStudentNames[index] ?? id }));
      const remaining = pairs.filter((item) => item.id !== uid);
      return remaining.length === pairs.length ? group : {
        ...group,
        assignedStudentIds: remaining.map((item) => item.id),
        assignedStudentNames: remaining.map((item) => item.name),
      };
    }));
    setDeletionMessage(result.auth === 'not-found'
      ? 'Student deleted successfully. No matching Authentication account existed.'
      : 'Student deleted successfully.');
  };

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Use realtime subscription so both the Students table and Ranking tab
    // always reflect the same live data from the flat `progress` collection,
    // identical to the data source used by the student-facing RankScreen.
    const unsub = subscribeToTeacherData((data, context) => {
      setRows(data);
      setAdministrativeRows(context.administrativeRows);
      setLoading(false);
    }, null, canManageUsers ? null : teacherUid, {
      actorUid: user.uid,
      canManageAllClasses: canManageUsers,
    });

    return unsub;
  }, [canManageUsers, refreshKey, teacherUid, user.uid]);

  useEffect(() => {
    return subscribeLiveClassGroups(
      { uid: user.uid, role: canManageUsers ? 'admin' : 'teacher' },
      setGroups,
      (reason) => console.warn('[TeacherDashboard] class subscription failed:', reason),
    );
  }, [canManageUsers, user.uid]);

  const dashboardRows = useMemo(() => {
    if (selectedGroupId === 'all') return rows;
    if (selectedGroupId === 'ungrouped') {
      const assigned = new Set(groups.flatMap((group) => group.assignedStudentIds));
      return rows.filter((student) => !assigned.has(student.uid));
    }
    const group = groups.find((item) => item.id === selectedGroupId);
    if (!group) return rows;
    return getClassComposition(group, rows).students;
  }, [groups, rows, selectedGroupId]);

  const membershipRows = useMemo(
    () => [...rows, ...administrativeRows],
    [administrativeRows, rows],
  );

  // ── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />
          <p className="text-slate-600">Loading students…</p>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-50 p-6">
        <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <p className="text-red-800 font-semibold mb-4">{error}</p>
          <button
            className="bg-red-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-red-700"
            onClick={() => setRefreshKey(k => k + 1)}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Summary stats ─────────────────────────────────────────
  const totalStudents  = dashboardRows.length;
  const alertedCount   = dashboardRows.filter(r => r.alerts.length > 0).length;
  const avgAccuracyAll = totalStudents > 0
    ? Math.round(dashboardRows.reduce((s, r) => s + r.avgAccuracy, 0) / totalStudents)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-50 pb-28 px-4 pt-6">
      <div className="max-w-6xl mx-auto">

        {/* ── Header ──────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-800">📊 Teacher Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">
              {canManageUsers
                ? `${totalStudents} student${totalStudents !== 1 ? 's' : ''} registered`
                : `${totalStudents} assigned student${totalStudents !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            title="Refresh data"
            className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 shadow-sm"
          >
            ↻ Refresh
          </button>
        </div>

        {deletionMessage && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">
            {deletionMessage}
          </div>
        )}

        {/* ── Summary cards ─────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <SummaryCard emoji="🎓" label="Total Students" value={String(totalStudents)} colour="bg-blue-500" />
          <SummaryCard emoji="⚠️" label="Need Attention"  value={String(alertedCount)}  colour="bg-red-500"  />
          <SummaryCard emoji="🎯" label="Avg Accuracy"    value={`${avgAccuracyAll}%`}  colour="bg-green-500" />
        </div>

        {/* ── Tabs ────────────────────────────────────── */}
        <div className="flex gap-1 mb-5 bg-white rounded-xl shadow-sm p-1 w-fit">
          {([
            'students',
            'ranking',
            ...(canManageUsers ? ['access'] : []),
          ] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t === 'students'
                ? '👥 Students'
                : t === 'ranking'
                  ? '🏆 Ranking'
                  : '🔐 Access'}
            </button>
          ))}
        </div>

        {/* ── Tab content ─────────────────────────────── */}
        {tab === 'students' ? (
          <StudentsTab rows={dashboardRows} allRows={rows} membershipRows={membershipRows} user={user} canManageUsers={canManageUsers} groups={groups} selectedGroupId={selectedGroupId} onSelectedGroupIdChange={setSelectedGroupId} onStudentDeleted={handleStudentDeleted} />
        ) : tab === 'ranking' ? (
          <RankingTab rows={dashboardRows} />
        ) : canManageUsers ? (
          <AdminUserAccessTab user={user} />
        ) : null}

      </div>
    </div>
  );
};
