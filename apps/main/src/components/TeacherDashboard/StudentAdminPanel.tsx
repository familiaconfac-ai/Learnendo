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
import { buildClassPerformanceReport } from '../../services/classReportModel';
import { getClassComposition } from '../../services/classMembership';
import { buildStudentUpdateChanges } from '../../services/studentUpdateChanges';
import {
  ADMIN_NOTIFICATION_STATUS_LABELS,
  adminNotificationStatusLabel,
  formatAdminNotificationDate,
  getAdminNotificationStatuses,
  sendAdminTestNotification,
  type AdminNotificationResult,
  type AdminNotificationStatus,
} from '../../services/adminNotifications';
import { updateStudentDisplayName } from '../../services/userRoles';
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
  notificationStatus?: AdminNotificationStatus;
  onNotificationStatusChange?: (status: AdminNotificationStatus) => void;
  onClose: () => void;
  onDeleted?: (uid: string, result: StudentDeletionResult) => void;
}

export const StudentAdminPanel: React.FC<StudentAdminPanelProps> = ({ admin, student, groups, notificationStatus, onNotificationStatusChange, onClose, onDeleted }) => {
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
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [notificationResult, setNotificationResult] = useState<AdminNotificationResult | null>(null);
  const [notificationDetails, setNotificationDetails] = useState<AdminNotificationStatus | null>(notificationStatus ?? null);
  const [notificationDetailsLoading, setNotificationDetailsLoading] = useState(Boolean(student));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [baseline, setBaseline] = useState({
    name: student?.displayName?.trim() ?? '',
    email: student?.email?.trim().toLowerCase() ?? '',
    groupId: currentGroup?.id ?? '',
    disabled: null as boolean | null,
  });

  const clearAllErrors = () => {
    setDetailsError(null);
    setSaveError(null);
    setPasswordError(null);
    setResetError(null);
    setDeleteError(null);
    setNotificationError(null);
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
    setNotificationError(null);
    setNotificationResult(null);
    setNotificationDetails(notificationStatus ?? null);
    setNotificationDetailsLoading(Boolean(student));
    setShowDeleteConfirm(false);
    setBaseline({
      name: student?.displayName?.trim() ?? '',
      email: student?.email?.trim().toLowerCase() ?? '',
      groupId: student ? (findStudentGroup(groups, student.uid)?.id ?? '') : '',
      disabled: null,
    });
    if (!student) return () => { active = false; };
    setBusy(true);
    getAdminStudentDetails(admin, student.uid)
      .then(({ account, authStatus: nextAuthStatus }) => {
        if (!active) return;
        setAuthStatus(nextAuthStatus);
        if (!account) return;
        // Firestore drives the name shown by the dashboard; Auth is only a
        // secondary synchronized copy and must not replace that visible source.
        setEmail(account.email || student.email || '');
        setDisabled(account.disabled);
        setDetails(account);
        setBaseline((current) => ({
          ...current,
          email: (account.email || student.email || '').trim().toLowerCase(),
          disabled: account.disabled,
        }));
      })
      .catch((reason) => {
        if (!active) return;
        setDetailsError(reason instanceof Error ? reason.message : 'Failed to load authentication information.');
      })
      .finally(() => { if (active) setBusy(false); });
    getAdminNotificationStatuses(admin, [student.uid], true)
      .then(([status]) => {
        if (!active || !status) return;
        setNotificationDetails(status);
        onNotificationStatusChange?.(status);
      })
      .catch((reason) => {
        if (active) setNotificationError(reason instanceof Error ? reason.message : 'Não foi possível consultar as notificações.');
      })
      .finally(() => { if (active) setNotificationDetailsLoading(false); });
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
        const changes = buildStudentUpdateChanges(student.uid, baseline, { name, email, groupId, disabled });
        if (Object.keys(changes).length === 1) {
          setSaveState('saved');
          setMessage('No changes to save.');
          return;
        }

        const changedFields = Object.keys(changes).filter((field) => field !== 'uid');
        if (changedFields.length === 1 && changes.name) {
          const persistedName = await updateStudentDisplayName(student.uid, changes.name, admin.uid);
          setName(persistedName);
          setBaseline((current) => ({ ...current, name: persistedName }));
          setSaveState('saved');
          setMessage('Saved and verified in Firestore.');
          return;
        }

        const persisted = await updateAdminStudent(admin, changes);
        setName(persisted.profile.displayName);
        setEmail(persisted.profile.email);
        if (persisted.account) setDisabled(persisted.account.disabled);
        setBaseline((current) => ({
          name: persisted.fields.name === 'failed' ? current.name : persisted.profile.displayName,
          email: persisted.fields.email === 'failed' ? current.email : persisted.profile.email.toLowerCase(),
          groupId: persisted.fields.class === 'failed' ? current.groupId : groupId,
          disabled: persisted.fields.disabled === 'failed' ? current.disabled : (persisted.account?.disabled ?? current.disabled),
        }));

        const savedFields = Object.entries(persisted.fields)
          .filter(([, status]) => status === 'saved')
          .map(([field]) => field);
        if (persisted.errors.length > 0) {
          setSaveState('failed');
          const failed = persisted.errors.map((issue) => `${issue.field} [${issue.stage}] ${issue.code}: ${issue.message}`).join(' ');
          if (savedFields.length > 0) setMessage(`Saved: ${savedFields.join(', ')}.`);
          setSaveError(`Some changes failed: ${failed}`);
        } else {
          setSaveState('saved');
          const warning = persisted.warnings.map((issue) => `${issue.stage}: ${issue.code}`).join(', ');
          setMessage(warning
            ? `Saved in the app source of truth. Secondary synchronization warning: ${warning}.`
            : 'Saved and verified in the relevant source of truth.');
        }
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

  const handleTestNotification = async () => {
    if (!student) return;
    setNotificationBusy(true);
    setNotificationError(null);
    setNotificationResult(null);
    try {
      const result = await sendAdminTestNotification(admin, student.uid);
      setNotificationResult(result);
      const [status] = await getAdminNotificationStatuses(admin, [student.uid], true);
      if (status) {
        setNotificationDetails(status);
        onNotificationStatusChange?.(status);
      }
    } catch (reason) {
      setNotificationError(reason instanceof Error ? reason.message : 'Unable to send the test notification.');
    } finally {
      setNotificationBusy(false);
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
            <select className={`${fieldClass} mt-1`} value={groupId} onChange={(event) => { setGroupId(event.target.value); setSaveState('idle'); }} disabled={busy}>
              <option value="">No class</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-3 self-end rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={!disabled} onChange={(event) => { setDisabled(!event.target.checked); setSaveState('idle'); }} disabled={busy || (!isNew && authStatus !== 'found')} /> Active account
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
              <p className="mt-2 text-xs text-slate-500">Email verification is informational in Learnendo today: it does not block login or learning access. Password reset is a separate process.</p>
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
            <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <h3 className="font-black text-slate-800">Push notifications</h3>
              {notificationDetailsLoading && !notificationDetails ? (
                <p className="mt-2 text-sm text-slate-500">Consultando dispositivos…</p>
              ) : notificationDetails ? (
                <div className="mt-3 space-y-3 text-sm text-slate-700">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div><span className="block text-xs text-slate-500">Status</span><b>{adminNotificationStatusLabel(notificationDetails)}</b></div>
                    <div><span className="block text-xs text-slate-500">Dispositivos ativos</span><b>{notificationDetails.activeDeviceCount}</b></div>
                    <div><span className="block text-xs text-slate-500">Última atividade de dispositivo</span><b>{formatAdminNotificationDate(notificationDetails.latestLastSeenAt)}</b></div>
                    <div><span className="block text-xs text-slate-500">Permissão registrada</span><b>{notificationDetails.permission}</b></div>
                  </div>
                  <p className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                    {notificationDetails.kind === 'active' && `O envio alcançará ${notificationDetails.activeDeviceCount} dispositivo${notificationDetails.activeDeviceCount === 1 ? '' : 's'} ativo${notificationDetails.activeDeviceCount === 1 ? '' : 's'}.`}
                    {notificationDetails.kind === 'disabled' && 'O aluno desativou as notificações nas preferências.'}
                    {notificationDetails.kind === 'not-authorized' && 'O aluno ainda não ativou as notificações.'}
                    {notificationDetails.kind === 'no-device' && 'As notificações estão habilitadas, mas não existe dispositivo ativo com token válido.'}
                  </p>
                  {notificationDetails.devices.length > 0 && (
                    <div>
                      <span className="block text-xs font-bold text-slate-500">Dispositivos registrados</span>
                      <div className="mt-1 space-y-1">
                        {notificationDetails.devices.map((device, index) => (
                          <div key={`${device.platform}-${device.lastSeenAt}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs">
                            <span>{device.platform ?? 'Plataforma não informada'}{device.provider ? ` · ${device.provider}` : ''}</span>
                            <span className={device.eligible ? 'font-bold text-emerald-700' : 'font-semibold text-slate-500'}>{device.status} · {formatAdminNotificationDate(device.lastSeenAt)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <span className="block text-xs text-slate-500">Último push</span>
                    <b>{notificationDetails.latestDelivery
                      ? `${notificationDetails.latestDelivery.status} · ${notificationDetails.latestDelivery.successCount}/${notificationDetails.latestDelivery.deviceCount} aceitos pelo provedor · ${formatAdminNotificationDate(notificationDetails.latestDelivery.completedAt)}`
                      : 'Nenhum envio registrado'}</b>
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => void handleTestNotification()}
                disabled={notificationBusy || authStatus !== 'found' || notificationDetails?.kind !== 'active'}
                className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {notificationBusy ? 'Enviando...' : 'Enviar notificação de teste'}
              </button>
              {notificationResult && (
                <p className={`mt-3 rounded-xl border px-3 py-2 text-sm font-semibold ${notificationResult.status === 'sent' ? 'border-emerald-200 bg-white text-emerald-700' : 'border-amber-200 bg-white text-amber-800'}`}>
                  {notificationResult.status === 'sent'
                    ? `Enviada para ${notificationResult.successCount} dispositivo${notificationResult.successCount === 1 ? '' : 's'}.`
                    : notificationResult.status === 'partial'
                      ? `Envio parcial: ${notificationResult.successCount} de ${notificationResult.deviceCount} dispositivos receberam; ${notificationResult.failureCount} falharam.`
                      : notificationResult.status === 'disabled'
                        ? `${ADMIN_NOTIFICATION_STATUS_LABELS.disabled}: o aluno desativou as notificações.`
                        : notificationResult.status === 'no-devices'
                          ? `${ADMIN_NOTIFICATION_STATUS_LABELS['no-device']}: não há destino elegível.`
                          : notificationResult.status === 'duplicate'
                            ? 'Este mesmo pedido de teste já havia sido processado.'
                            : `Falha no envio: nenhum dos ${notificationResult.deviceCount} dispositivos recebeu o teste.`}
                </p>
              )}
              {notificationError && <p className="mt-3 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700">{notificationError}</p>}
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
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (!selected && groups[0]) setSelectedId(groups[0].id);
  }, [groups, selected]);

  const composition = useMemo(
    () => getClassComposition(selected, students),
    [selected, students],
  );
  const classReport = useMemo(
    () => selected ? buildClassPerformanceReport(selected.name, composition.students, new Date(), composition.teacher?.displayName) : null,
    [composition, selected],
  );

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
          <p className="text-sm text-slate-500">{composition.students.length} student{composition.students.length !== 1 ? 's' : ''}</p>
        </div>}
        {selected && composition.teacher && <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Teacher</p>
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-3">
            <span className="block truncate text-sm font-bold text-slate-800">{composition.teacher.displayName || composition.teacher.email}</span>
            <span className="block truncate text-xs text-slate-500">{composition.teacher.email}</span>
          </div>
        </div>}
        {selected && <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Students ({composition.students.length})</p>
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
            {composition.students.length === 0 ? (
              <p className="px-3 py-5 text-center text-sm text-slate-500">No students belong to this class.</p>
            ) : composition.students.map((student) => (
              <div key={student.uid} className="rounded-lg px-3 py-2">
                <span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-800">{student.displayName || student.email}</span><span className="block truncate text-xs text-slate-500">{student.email}</span></span>
              </div>
            ))}
          </div>
        </div>}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-between">
          <button type="button" onClick={() => setShowReport(true)} disabled={!classReport} className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">Class report / PDF</button>
          <button onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold">Close</button>
        </div>
      </div>
      {showReport && classReport && <ClassReportModal report={classReport} onClose={() => setShowReport(false)} />}
    </ModalShell>
  );
};
