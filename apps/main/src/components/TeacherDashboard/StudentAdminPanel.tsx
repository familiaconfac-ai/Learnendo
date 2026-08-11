import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import type { LiveClassGroup } from '../../types';
import type { TeacherStudentRow } from '../../engine/teacherService';
import { sendPasswordReset } from '../../services/firebase';
import {
  createAdminStudent,
  generateTemporaryPassword,
  getAdminStudentDetails,
  setAdminStudentPassword,
  updateAdminStudent,
} from '../../services/adminStudents';
import { createLiveClassGroup, updateLiveClassGroup } from '../../services/liveClassesService';

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
}

export const StudentAdminPanel: React.FC<StudentAdminPanelProps> = ({ admin, student, groups, onClose }) => {
  const isNew = !student;
  const currentGroup = student ? findStudentGroup(groups, student.uid) : null;
  const [name, setName] = useState(student?.displayName ?? '');
  const [email, setEmail] = useState(student?.email ?? '');
  const [groupId, setGroupId] = useState(currentGroup?.id ?? '');
  const [disabled, setDisabled] = useState(false);
  const [password, setPassword] = useState(isNew ? generateTemporaryPassword() : '');
  const [details, setDetails] = useState<{ creationTime: string; lastSignInTime: string | null; emailVerified: boolean; providerIds: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!student) return;
    setBusy(true);
    getAdminStudentDetails(admin, student.uid)
      .then((account) => {
        setName(account.displayName || student.displayName || '');
        setEmail(account.email || student.email || '');
        setDisabled(account.disabled);
        setDetails(account);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load account details.'))
      .finally(() => setBusy(false));
  }, [admin, student]);

  const handleSave = async () => {
    setError(null);
    setMessage(null);
    if (!name.trim() || !email.trim()) return setError('Name and email are required.');
    if (isNew && password.length < 6) return setError('The initial password must contain at least 6 characters.');
    setBusy(true);
    try {
      if (student) {
        await updateAdminStudent(admin, { uid: student.uid, name: name.trim(), email: email.trim(), disabled, groupId: groupId || null });
        setMessage('Student account saved in Authentication and Firestore.');
      } else {
        await createAdminStudent(admin, { name: name.trim(), email: email.trim(), password, disabled, groupId: groupId || null });
        setMessage('Student created. Copy the initial password before closing.');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save this student.');
    } finally {
      setBusy(false);
    }
  };

  const handlePassword = async () => {
    if (!student || password.length < 6) return setError('The temporary password must contain at least 6 characters.');
    setBusy(true);
    setError(null);
    try {
      await setAdminStudentPassword(admin, student.uid, password);
      setMessage('Temporary password defined. It is shown only in this form so you can copy it.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update the password.');
    } finally {
      setBusy(false);
    }
  };

  const handleResetEmail = async () => {
    if (!email.trim()) return setError('The student has no email address.');
    setBusy(true);
    setError(null);
    try {
      await sendPasswordReset(email.trim());
      setMessage(`Password reset sent to ${email.trim()}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to send the password reset email.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title={isNew ? 'New student' : 'Manage student'} onClose={onClose}>
      <div className="space-y-5">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
        {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}

        <section className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Name
            <input className={`${fieldClass} mt-1`} value={name} onChange={(event) => setName(event.target.value)} disabled={busy} />
          </label>
          <label className="text-sm font-semibold text-slate-700">Email / login
            <input type="email" className={`${fieldClass} mt-1`} value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} />
          </label>
          <label className="text-sm font-semibold text-slate-700">Class
            <select className={`${fieldClass} mt-1`} value={groupId} onChange={(event) => setGroupId(event.target.value)} disabled={busy}>
              <option value="">No class</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-3 self-end rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={!disabled} onChange={(event) => setDisabled(!event.target.checked)} disabled={busy} /> Active account
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
                <button type="button" onClick={() => void handlePassword()} disabled={busy} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Set temporary password</button>
                <button type="button" onClick={() => void handleResetEmail()} disabled={busy} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">Send password reset</button>
              </div>
            </section>
          </>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Close</button>
          <button type="button" onClick={() => void handleSave()} disabled={busy} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : isNew ? 'Create student' : 'Save changes'}</button>
        </div>
      </div>
    </ModalShell>
  );
};

export const ClassManagementModal: React.FC<{ admin: User; groups: LiveClassGroup[]; students: TeacherStudentRow[]; onClose: () => void }> = ({ admin, groups, students, onClose }) => {
  const [selectedId, setSelectedId] = useState(groups[0]?.id ?? 'new');
  const selected = groups.find((group) => group.id === selectedId) ?? null;
  const [name, setName] = useState(selected?.name ?? '');
  const [memberIds, setMemberIds] = useState<string[]>(selected?.assignedStudentIds ?? []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(selected?.name ?? '');
    setMemberIds(selected?.assignedStudentIds ?? []);
    setMessage(null);
  }, [selectedId, selected]);

  const save = async () => {
    if (!name.trim()) return setMessage('Enter a class name.');
    setBusy(true);
    const assigned = students.filter((student) => memberIds.includes(student.uid));
    const input = {
      name: name.trim(),
      description: selected?.description ?? '',
      whatsappLink: selected?.whatsappLink ?? '',
      assignedStudentIds: assigned.map((student) => student.uid),
      assignedStudentNames: assigned.map((student) => student.displayName || student.email || student.uid),
    };
    try {
      const targetId = selected ? selected.id : await createLiveClassGroup(admin.uid, input);
      if (selected) await updateLiveClassGroup(selected.id, input);
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
      if (!selected) setSelectedId(targetId);
      setMessage('Class saved.');
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Unable to save the class.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Manage classes" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <select className={fieldClass} value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            <option value="new">+ New class</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </div>
        <label className="text-sm font-semibold text-slate-700">Class name
          <input className={`${fieldClass} mt-1`} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Students ({memberIds.length})</p>
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
            {students.map((student) => (
              <label key={student.uid} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50">
                <input type="checkbox" checked={memberIds.includes(student.uid)} onChange={(event) => setMemberIds((current) => event.target.checked ? [...current, student.uid] : current.filter((uid) => uid !== student.uid))} />
                <span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-800">{student.displayName || student.email}</span><span className="block truncate text-xs text-slate-500">{student.email}</span></span>
              </label>
            ))}
          </div>
        </div>
        {message && <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">{message}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold">Close</button>
          <button onClick={() => void save()} disabled={busy} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save class'}</button>
        </div>
      </div>
    </ModalShell>
  );
};
