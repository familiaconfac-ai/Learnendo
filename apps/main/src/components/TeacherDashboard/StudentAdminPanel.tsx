import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import type { LiveClassGroup } from '../../types';
import type { TeacherStudentRow } from '../../engine/teacherService';
import { sendPasswordReset } from '../../services/firebase';
import {
  createAdminStudent,
  deleteAdminStudent,
  generateTemporaryPassword,
  getAdminStudentDetails,
  setAdminStudentPassword,
  updateAdminStudent,
  type StudentDeletionResult,
} from '../../services/adminStudents';
import { getLiveClassGroupFromServer, updateLiveClassGroup } from '../../services/liveClassesService';
import { buildClassPerformanceReport } from '../../services/classReportModel';
import { ClassReportModal } from './ClassReportModal';

const fieldClass = 'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-950/55 p-3 sm:p-8" role="dialog" aria-modal="true" aria-label={title}>
      <div className="mx-auto max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-xl font-black text-slate-800">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-xl text-slate-500 hover:bg-slate-100" aria-label="Close">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function findStudentGroup(groups: LiveClassGroup[], uid: string) {
  return groups.find((group) => group.assignedStudentIds.includes(uid)) ?? null;
}

interface StudentAdminPanelProps {
  admin: User;
  student: TeacherStudentRow | null;
  groups: LiveClassGroup[];
  onClose: () => void;
  onDeleted?: (uid: string, result: StudentDeletionResult) => void;
}

export const StudentAdminPanel: React.FC<StudentAdminPanelProps> = ({ admin, student, groups, onClose, onDeleted }) => {
  const isNew = !student;
  const currentGroup = student ? findStudentGroup(groups, student.uid) : null;
  const [name, setName] = useState(student?.displayName ?? '');
  const [email, setEmail] = useState(student?.email ?? '');
  const [groupId, setGroupId] = useState(currentGroup?.id ?? '');
  const [disabled, setDisabled] = useState(false);
  const [password, setPassword] = useState(isNew ? generateTemporaryPassword() : '');
  const [details, setDetails] = useState<{ creationTime: string; lastSignInTime: string | null; emailVerified: boolean; providerIds: string[] } | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'found' | 'not-found'>(isNew ? 'found' : 'loading');
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const clearAllErrors = () => {
    setDetailsError(null);
    setSaveError(null);
    setPasswordError(null);
    setResetError(null);
    setDeleteError(null);
  };

  useEffect(() => {
    let active = true;
    setName(student?.displayName ?? '');
    setEmail(student?.email ?? '');
    setGroupId(student ? (findStudentGroup(groups, student.uid)?.id ?? '') : '');
    setDisabled(false);
    setPassword(student ? '' : generateTemporaryPassword());
    setDetails(null);
    setAuthStatus(student ? 'loading' : 'found');
    setMessage(null);
    setSaveState('idle');
    setDetailsError(null);
    setSaveError(null);
    setPasswordError(null);
    setResetError(null);
    setDeleteError(null);
    setShowDeleteConfirm(false);
    if (!student) return () => { active = false; };
    setBusy(true);
    getAdminStudentDetails(admin, student.uid)
      .then(({ account, authStatus: nextAuthStatus }) => {
        if (!active) return;
        setAuthStatus(nextAuthStatus);
        if (!account) return;
        setName(account.displayName || student.displayName || '');
        setEmail(account.email || student.email || '');
        setDisabled(account.disabled);
        setDetails(account);
      })
      .catch((reason) => {
        if (!active) return;
        setDetailsError(reason instanceof Error ? reason.message : 'Failed to load authentication information.');
      })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [admin, groups, student]);

  const handleSave = async () => {
    clearAllErrors();
    setMessage(null);
    if (!name.trim() || !email.trim()) return setSaveError('Name and email are required.');
    if (isNew && password.length < 6) return setSaveError('The initial password must contain at least 6 characters.');
    setBusy(true);
    setSaveState('saving');
    try {
      if (student) {
        const persisted = await updateAdminStudent(admin, { uid: student.uid, name: name.trim(), email: email.trim(), disabled, groupId: groupId || null });
        setName(persisted.profile.displayName);
        setEmail(persisted.profile.email);
        setDisabled(persisted.account.disabled);
        setSaveState('saved');
        setMessage('Saved and verified in Authentication and Firestore.');
      } else {
        await createAdminStudent(admin, { name: name.trim(), email: email.trim(), password, disabled, groupId: groupId || null });
        setSaveState('saved');
        setMessage('Student created. Copy the initial password before closing.');
      }
    } catch (reason) {
      setSaveState('failed');
      setSaveError(reason instanceof Error ? `Save failed: ${reason.message}` : 'Save failed: unable to update student.');
    } finally {
      setBusy(false);
    }
  };

  const handlePassword = async () => {
    clearAllErrors();
    setMessage(null);
    if (!student || password.length < 6) return setPasswordError('The temporary password must contain at least 6 characters.');
    setBusy(true);
    try {
      await setAdminStudentPassword(admin, student.uid, password);
      setMessage('Temporary password defined. It is shown only in this form so you can copy it.');
    } catch (reason) {
      setPasswordError(reason instanceof Error ? reason.message : 'Failed to set password.');
    } finally {
      setBusy(false);
    }
  };

  const handleResetEmail = async () => {
    clearAllErrors();
    setMessage(null);
    if (!email.trim()) return setResetError('The student has no email address.');
    setBusy(true);
    try {
      await sendPasswordReset(email.trim());
      setMessage(`Password reset sent to ${email.trim()}.`);
    } catch (reason) {
      setResetError(reason instanceof Error ? reason.message : 'Failed to send password reset.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!student) return;
    clearAllErrors();
    setMessage(null);
    setBusy(true);
    try {
      const result = await deleteAdminStudent(admin, student.uid);
      if (!result.completed) {
        const detail = result.issues.map((issue) => `${issue.scope}: ${issue.message}`).join(' ');
        setDeleteError(`Failed to delete student completely.${detail ? ` ${detail}` : ''}`);
        setShowDeleteConfirm(false);
        return;
      }
      onDeleted?.(student.uid, result);
      onClose();
    } catch (reason) {
      setDeleteError(reason instanceof Error ? reason.message : 'Failed to delete student.');
      setShowDeleteConfirm(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title={isNew ? 'New student' : 'Manage student'} onClose={onClose}>
      <div className="space-y-5">
        {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}

        <section className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Name
            <input className={`${fieldClass} mt-1`} value={name} onChange={(event) => { setName(event.target.value); setSaveState('idle'); }} disabled={busy} />
          </label>
          <label className="text-sm font-semibold text-slate-700">Email / login
            <input type="email" className={`${fieldClass} mt-1`} value={email} onChange={(event) => { setEmail(event.target.value); setSaveState('idle'); }} disabled={busy} />
          </label>
          <label className="text-sm font-semibold text-slate-700">Class
            <select className={`${fieldClass} mt-1`} value={groupId} onChange={(event) => setGroupId(event.target.value)} disabled={busy}>
              <option value="">No class</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-3 self-end rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={!disabled} onChange={(event) => setDisabled(!event.target.checked)} disabled={busy || (!isNew && authStatus !== 'found')} /> Active account
          </label>
        </section>

        {isNew ? (
          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <h3 className="font-black text-slate-800">Initial password</h3>
            <div className="mt-2 flex gap-2">
              <input className={fieldClass} value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} />
              <button type="button" onClick={() => setPassword(generateTemporaryPassword())} className="rounded-xl border border-blue-200 bg-white px-3 text-sm font-bold text-blue-700">Generate</button>
              <button type="button" onClick={() => navigator.clipboard.writeText(password)} className="rounded-xl border border-blue-200 bg-white px-3 text-sm font-bold text-blue-700">Copy</button>
            </div>
            <p className="mt-2 text-xs text-slate-500">The password is sent only to Firebase Authentication and is never stored in Firestore.</p>
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <h3 className="font-black text-slate-800">Account</h3>
              {authStatus === 'not-found' && (
                <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-semibold text-amber-800">
                  No matching Firebase Authentication account exists. This Firestore-only student can still be deleted safely.
                </p>
              )}
              {detailsError && <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 font-semibold text-red-700">{detailsError}</p>}
              <div className="mt-2 grid gap-1 sm:grid-cols-2">
                <span>UID: <code className="text-xs">{student.uid}</code></span>
                <span>Email verified: {details?.emailVerified ? 'Yes' : 'No'}</span>
                <span>Created: {details?.creationTime ? new Date(details.creationTime).toLocaleString() : '—'}</span>
                <span>Last login: {details?.lastSignInTime ? new Date(details.lastSignInTime).toLocaleString() : 'Never'}</span>
              </div>
            </section>
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="font-black text-slate-800">Password and access</h3>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input className={fieldClass} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New temporary password" disabled={busy} />
                <button type="button" onClick={() => setPassword(generateTemporaryPassword())} className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-amber-800">Generate</button>
                <button type="button" onClick={() => navigator.clipboard.writeText(password)} disabled={!password} className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-amber-800 disabled:opacity-50">Copy</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => void handlePassword()} disabled={busy || authStatus !== 'found'} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Set temporary password</button>
                <button type="button" onClick={() => void handleResetEmail()} disabled={busy || authStatus !== 'found'} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">Send password reset</button>
              </div>
              {passwordError && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{passwordError}</p>}
              {resetError && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{resetError}</p>}
            </section>
          </>
        )}

        {saveError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{saveError}</div>}
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Close</button>
          <button type="button" onClick={() => void handleSave()} disabled={busy} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : saveState === 'failed' ? 'Save failed' : isNew ? 'Create student' : 'Save'}</button>
        </div>
        {!isNew && student && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <h3 className="font-black text-red-900">Danger zone</h3>
            <p className="mt-1 text-sm text-red-700">Permanently delete this student account and its student-owned administrative data.</p>
            {deleteError && <p className="mt-3 rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700">{deleteError}</p>}
            <button type="button" onClick={() => { clearAllErrors(); setMessage(null); setShowDeleteConfirm(true); }} disabled={busy} className="mt-3 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50">Delete student</button>
          </section>
        )}
      </div>
      {showDeleteConfirm && student && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/65 p-4" role="alertdialog" aria-modal="true" aria-label="Confirm student deletion">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900">Are you sure you want to delete {student.displayName || student.email || student.uid}?</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">This removes the student's account and linked administrative data. Shared curriculum, exercises, books, lessons, and sequences are preserved. This action cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} disabled={busy} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={() => void handleDelete()} disabled={busy} className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50">{busy ? 'Deleting…' : 'Delete student'}</button>
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
};

export const ClassManagementModal: React.FC<{ groups: LiveClassGroup[]; students: TeacherStudentRow[]; onClose: () => void }> = ({ groups, students, onClose }) => {
  const [selectedId, setSelectedId] = useState(groups[0]?.id ?? '');
  const selected = groups.find((group) => group.id === selectedId) ?? null;
  const [memberIds, setMemberIds] = useState<string[]>(selected?.assignedStudentIds ?? []);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    setMemberIds(selected?.assignedStudentIds ?? []);
    setSaveState('idle');
    setError(null);
  }, [selectedId, selected]);

  const reportRows = useMemo(
    () => students.filter((student) => memberIds.includes(student.uid)),
    [memberIds, students],
  );
  const classReport = useMemo(
    () => selected ? buildClassPerformanceReport(selected.name, reportRows) : null,
    [reportRows, selected],
  );

  const save = async () => {
    if (!selected) return;
    setBusy(true);
    setSaveState('saving');
    setError(null);
    const assigned = students.filter((student) => memberIds.includes(student.uid));
    const input = {
      name: selected.name,
      description: selected?.description ?? '',
      whatsappLink: selected?.whatsappLink ?? '',
      assignedStudentIds: assigned.map((student) => student.uid),
      assignedStudentNames: assigned.map((student) => student.displayName || student.email || student.uid),
    };
    try {
      const targetId = selected.id;
      await updateLiveClassGroup(selected.id, input);
      await Promise.all(groups
        .filter((group) => group.id !== targetId && group.assignedStudentIds.some((uid) => memberIds.includes(uid)))
        .map((group) => {
          const kept = group.assignedStudentIds
            .map((uid, index) => ({ uid, name: group.assignedStudentNames[index] ?? uid }))
            .filter((member) => !memberIds.includes(member.uid));
          return updateLiveClassGroup(group.id, {
            name: group.name,
            description: group.description ?? '',
            whatsappLink: group.whatsappLink ?? '',
            assignedStudentIds: kept.map((member) => member.uid),
            assignedStudentNames: kept.map((member) => member.name),
          });
        }));
      const persisted = await getLiveClassGroupFromServer(targetId);
      const expectedIds = [...input.assignedStudentIds].sort();
      const persistedIds = [...persisted.assignedStudentIds].sort();
      if (expectedIds.length !== persistedIds.length || expectedIds.some((uid, index) => uid !== persistedIds[index])) {
        throw new Error('Firestore returned a different class membership after saving.');
      }
      setMemberIds(persisted.assignedStudentIds);
      setSaveState('saved');
    } catch (reason) {
      setSaveState('failed');
      setError(reason instanceof Error ? `Save failed: ${reason.message}` : 'Save failed: unable to save the class.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Manage classes" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <select className={fieldClass} value={selectedId} onChange={(event) => setSelectedId(event.target.value)} aria-label="Select class">
            {groups.length === 0 && <option value="">No classes available</option>}
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </div>
        {selected && <div className="rounded-xl bg-slate-50 px-4 py-3">
          <h3 className="font-black text-slate-800">{selected.name}</h3>
          <p className="text-sm text-slate-500">{memberIds.length} student{memberIds.length !== 1 ? 's' : ''}</p>
        </div>}
        {selected && <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Students</p>
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
            {students.map((student) => (
              <label key={student.uid} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50">
                <input type="checkbox" checked={memberIds.includes(student.uid)} disabled={busy} onChange={(event) => { setSaveState('idle'); setError(null); setMemberIds((current) => event.target.checked ? [...current, student.uid] : current.filter((uid) => uid !== student.uid)); }} />
                <span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-800">{student.displayName || student.email}</span><span className="block truncate text-xs text-slate-500">{student.email}</span></span>
              </label>
            ))}
          </div>
        </div>}
        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-between">
          <button type="button" onClick={() => setShowReport(true)} disabled={!classReport || busy} className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">Class report / PDF</button>
          <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold">Close</button>
          <button onClick={() => void save()} disabled={busy || !selected} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : saveState === 'failed' ? 'Save failed' : 'Save class'}</button>
          </div>
        </div>
      </div>
      {showReport && classReport && <ClassReportModal report={classReport} onClose={() => setShowReport(false)} />}
    </ModalShell>
  );
};
