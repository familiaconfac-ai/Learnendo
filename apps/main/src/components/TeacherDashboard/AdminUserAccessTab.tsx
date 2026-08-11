import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  deleteUserAccountRecord,
  subscribeUserAccounts,
  updateUserAccountRole,
  updateUserAssignedTeacher,
  UserAccountProfile,
  UserRole,
} from '../../services/userRoles';
import { updateAdminStudent } from '../../services/adminStudents';

interface AdminUserAccessTabProps {
  user: User;
}

const ROLE_STYLES: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700',
  teacher: 'bg-blue-100 text-blue-700',
  student: 'bg-emerald-100 text-emerald-700',
};

const ROLE_OPTIONS: UserRole[] = ['student', 'teacher', 'admin'];

const formatRole = (role: UserRole) => role.charAt(0).toUpperCase() + role.slice(1);

export const AdminUserAccessTab: React.FC<AdminUserAccessTabProps> = ({ user }) => {
  const [accounts, setAccounts] = useState<UserAccountProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingUid, setSavingUid] = useState<string | null>(null);
  const [profileSaveStates, setProfileSaveStates] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'failed'>>({});
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, { name: string; email: string }>>({});

  useEffect(() => {
    const unsubscribe = subscribeUserAccounts(
      (items) => {
        setAccounts(items);
        setLoading(false);
        setError(null);
      },
      (reason) => {
        console.warn('[AdminUserAccessTab] user subscription failed:', reason);
        setLoading(false);
        setError('Unable to load user roles right now.');
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current };
      for (const account of accounts) {
        if (!next[account.uid]) {
          next[account.uid] = {
            name: account.name || '',
            email: account.email || '',
          };
        }
      }

      for (const uid of Object.keys(next)) {
        if (!accounts.some((account) => account.uid === uid)) {
          delete next[uid];
        }
      }

      return next;
    });
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return accounts;
    return accounts.filter((account) => {
      const haystack = [
        account.name,
        account.email,
        account.uid,
        account.role,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [accounts, search]);

  const counts = useMemo(() => ({
    admins: accounts.filter((item) => item.role === 'admin').length,
    teachers: accounts.filter((item) => item.role === 'teacher').length,
    students: accounts.filter((item) => item.role === 'student').length,
  }), [accounts]);

  const teachers = useMemo(
    () => accounts.filter((account) => account.role === 'teacher' || account.role === 'admin'),
    [accounts],
  );

  const updateDraft = (uid: string, field: 'name' | 'email', value: string) => {
    setProfileSaveStates((current) => ({ ...current, [uid]: 'idle' }));
    setDrafts((current) => ({
      ...current,
      [uid]: {
        name: current[uid]?.name ?? '',
        email: current[uid]?.email ?? '',
        [field]: value,
      },
    }));
  };

  const resetDraft = (account: UserAccountProfile) => {
    setProfileSaveStates((current) => ({ ...current, [account.uid]: 'idle' }));
    setDrafts((current) => ({
      ...current,
      [account.uid]: {
        name: account.name || '',
        email: account.email || '',
      },
    }));
  };

  const handleRoleChange = async (account: UserAccountProfile, role: UserRole) => {
    if (account.role === role) return;

    setSavingUid(account.uid);
    setProfileSaveStates((current) => ({ ...current, [account.uid]: 'saving' }));
    try {
      await updateUserAccountRole(account.uid, role, user.uid);
    } catch (reason) {
      console.warn('[AdminUserAccessTab] role update failed:', reason);
      setError('Unable to update this access level right now.');
    } finally {
      setSavingUid(null);
    }
  };

  const handleTeacherAssignmentChange = async (account: UserAccountProfile, teacherUid: string) => {
    if (account.role !== 'student') return;

    const teacher = teachers.find((item) => item.uid === teacherUid);
    setSavingUid(account.uid);
    try {
      await updateUserAssignedTeacher(
        account.uid,
        teacher ? teacher.uid : null,
        teacher ? teacher.name : null,
        user.uid,
      );
    } catch (reason) {
      console.warn('[AdminUserAccessTab] teacher assignment update failed:', reason);
      setError('Unable to update this teacher assignment right now.');
    } finally {
      setSavingUid(null);
    }
  };

  const handleProfileSave = async (account: UserAccountProfile) => {
    const draft = drafts[account.uid] ?? { name: account.name || '', email: account.email || '' };
    const trimmedName = draft.name.trim();
    const trimmedEmail = draft.email.trim();

    if (!trimmedName) {
      setError('Name cannot be empty.');
      return;
    }
    if (!trimmedEmail) {
      setProfileSaveStates((current) => ({ ...current, [account.uid]: 'failed' }));
      setError('Save failed: email cannot be empty for an Authentication account.');
      return;
    }

    setSavingUid(account.uid);
    try {
      const persisted = await updateAdminStudent(user, {
        uid: account.uid,
        name: trimmedName,
        email: trimmedEmail,
      });
      setAccounts((current) => current.map((item) => item.uid === account.uid ? {
        ...item,
        name: persisted.profile.displayName,
        email: persisted.profile.email,
      } : item));
      setDrafts((current) => ({
        ...current,
        [account.uid]: {
          name: persisted.profile.displayName,
          email: persisted.profile.email,
        },
      }));
      setProfileSaveStates((current) => ({ ...current, [account.uid]: 'saved' }));
      setError(null);
    } catch (reason) {
      console.warn('[AdminUserAccessTab] profile update failed:', reason);
      setProfileSaveStates((current) => ({ ...current, [account.uid]: 'failed' }));
      setError(reason instanceof Error ? `Save failed: ${reason.message}` : 'Save failed: unable to save this user profile right now.');
    } finally {
      setSavingUid(null);
    }
  };

  const handleDelete = async (account: UserAccountProfile) => {
    const confirmed = window.confirm(
      `Delete the dashboard record for "${account.name || account.email || account.uid}"?\n\nThis removes the Firestore user/profile entry and its progress mirror, but it does not delete the Firebase Auth login itself.`,
    );
    if (!confirmed) return;

    setSavingUid(account.uid);
    try {
      await deleteUserAccountRecord(account.uid);
      setError(null);
    } catch (reason) {
      console.warn('[AdminUserAccessTab] user delete failed:', reason);
      setError('Unable to delete this user record right now.');
    } finally {
      setSavingUid(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admins</p>
          <p className="mt-2 text-3xl font-black text-slate-800">{counts.admins}</p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Teachers</p>
          <p className="mt-2 text-3xl font-black text-slate-800">{counts.teachers}</p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Students</p>
          <p className="mt-2 text-3xl font-black text-slate-800">{counts.students}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-800">User Access</h2>
            <p className="mt-1 text-sm text-slate-500">
              Promote teachers, return users to student mode, and keep reserved admins protected.
            </p>
          </div>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email"
            className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-400 sm:max-w-xs"
          />
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            Loading user roles...
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No users matched this search.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3">User</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Current Role</th>
                  <th className="px-3 py-3">Assigned Teacher</th>
                  <th className="px-3 py-3">Access Source</th>
                  <th className="px-3 py-3">Change Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAccounts.map((account) => {
                  const isProtected = account.roleSource === 'reserved-admin';
                  const isSaving = savingUid === account.uid;
                  const profileSaveState = profileSaveStates[account.uid] ?? 'idle';
                  const draft = drafts[account.uid] ?? { name: account.name || '', email: account.email || '' };
                  const hasProfileChanges =
                    draft.name.trim() !== (account.name || '').trim()
                    || draft.email.trim() !== (account.email || '').trim();
                  const canDelete = !isProtected && account.uid !== user.uid;

                  return (
                    <tr key={account.uid}>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={draft.name}
                          disabled={isSaving}
                          onChange={(event) => updateDraft(account.uid, 'name', event.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-800 outline-none focus:border-blue-400"
                        />
                        <div className="text-xs text-slate-500">{account.uid}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        <input
                          type="email"
                          value={draft.email}
                          disabled={isSaving}
                          onChange={(event) => updateDraft(account.uid, 'email', event.target.value)}
                          placeholder="No email"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-slate-700 outline-none focus:border-blue-400"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${ROLE_STYLES[account.role]}`}>
                          {formatRole(account.role)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600">
                        {account.role === 'student' ? (
                          <select
                            value={account.assignedTeacherUid ?? ''}
                            disabled={isSaving}
                            onChange={(event) => void handleTeacherAssignmentChange(account, event.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-blue-400"
                          >
                            <option value="">Unassigned</option>
                            {teachers.map((teacher) => (
                              <option key={teacher.uid} value={teacher.uid}>
                                {teacher.name || teacher.email || teacher.uid}
                              </option>
                            ))}
                          </select>
                        ) : (
                          account.assignedTeacherName || account.assignedTeacherUid || 'Not applicable'
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">
                        {account.roleSource === 'reserved-admin'
                          ? 'Reserved admin'
                          : account.roleSource === 'firestore'
                            ? 'Saved in Firestore'
                            : 'Default student'}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={isSaving || !hasProfileChanges}
                            onClick={() => void handleProfileSave(account)}
                            className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {profileSaveState === 'saving'
                              ? 'Saving...'
                              : profileSaveState === 'saved'
                                ? 'Saved'
                                : profileSaveState === 'failed'
                                  ? 'Save failed'
                                  : 'Save'}
                          </button>
                          <button
                            type="button"
                            disabled={isSaving || !hasProfileChanges}
                            onClick={() => resetDraft(account)}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Reset
                          </button>
                          <button
                            type="button"
                            disabled={isSaving || !canDelete}
                            onClick={() => void handleDelete(account)}
                            className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                            title={canDelete ? 'Delete Firestore profile/progress record' : 'Reserved admins and your own account cannot be deleted here'}
                          >
                            Delete
                          </button>
                          {ROLE_OPTIONS.map((role) => (
                            <button
                              key={role}
                              type="button"
                              disabled={isProtected || isSaving}
                              onClick={() => void handleRoleChange(account, role)}
                              className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                                account.role === role
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              {isSaving && account.role !== role ? 'Saving...' : formatRole(role)}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
