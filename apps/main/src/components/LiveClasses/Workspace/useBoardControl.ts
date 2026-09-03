import { useCallback, useEffect, useRef, useState } from 'react';
import { acquireBoard, designateBoardStudent, publishBoardView, registerBoardWriter, releaseTeacherBoard, subscribeBoardControl } from '../../../services/boardControlService';
import { canAcquireBoard, ownsBoard, TEACHER_IDLE_MS, TEACHER_LEASE_MS, type BoardControl, type BoardView } from '../../../models/boardControl';

export function useBoardControl(classId: string, uid: string, teacher: boolean) {
  const clientId = useRef(crypto.randomUUID()).current;
  const [control, setControl] = useState<BoardControl | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [armed, setArmed] = useState(false);
  const ref = useRef<BoardControl | null>(null);
  const connectedRef = useRef(false);
  const claiming = useRef<Promise<boolean> | null>(null);
  const pendingView = useRef<{ epoch: number; view: BoardView } | null>(null);
  const publishing = useRef(false);
  const previousDesignation = useRef<string | null | undefined>(undefined);
  const lastIntent = useRef(0);
  const lastRenewal = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const own = connected && (teacher || armed) && ownsBoard(control, uid, clientId);
  const ownRef = useRef(false); ownRef.current = own;
  useEffect(() => {
    previousDesignation.current = undefined; setArmed(false);
    const offline = () => { connectedRef.current = false; setConnected(false); setArmed(false); };
    window.addEventListener('offline', offline);
    const stop = subscribeBoardControl(classId, (next, online) => {
      // A new explicit designation arms an already connected pupil. Refresh/reconnect stays disarmed.
      if (online && previousDesignation.current !== undefined && next?.designatedStudentId === uid && previousDesignation.current !== uid) setArmed(true);
      if (!online || (ref.current?.controllerClientId === clientId && next?.controllerId === uid && next.controllerClientId !== clientId)) setArmed(false);
      previousDesignation.current = next?.designatedStudentId ?? null;
      ref.current = next; setControl(next); connectedRef.current = online; setConnected(online); setError(online ? '' : 'connection');
    }, () => { offline(); setError('connection'); });
    return () => { stop(); window.removeEventListener('offline', offline); if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, [classId, uid]);
  const acquire = useCallback(() => {
    if (claiming.current) return claiming.current;
    claiming.current = acquireBoard(classId, uid, clientId, teacher, ref.current?.view).then(() => { setError(''); return true; })
      .catch(() => { setError('control'); if (!teacher) setArmed(false); return false; }).finally(() => { claiming.current = null; });
    return claiming.current;
  }, [classId, uid, clientId, teacher]);
  const intent = useCallback(() => {
    if (!connectedRef.current) return;
    if (!teacher) {
      if (ref.current?.designatedStudentId !== uid) return;
      if (!canAcquireBoard(ref.current, uid, false, Date.now())) { setArmed(true); return; }
      if (!ownRef.current) void acquire().then(granted => { if (granted) setArmed(true); });
      return;
    }
    lastIntent.current = Date.now();
    if (!ownsBoard(ref.current, uid, clientId) || Date.now() - lastRenewal.current > 900 || !ref.current?.teacherLeaseAt) {
      lastRenewal.current = Date.now(); void acquire();
    }
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      const current = ref.current;
      if (current && Date.now() - lastIntent.current >= TEACHER_IDLE_MS) void releaseTeacherBoard(classId, uid, clientId, current.epoch).catch(() => {});
    }, TEACHER_IDLE_MS + 30);
  }, [teacher, uid, clientId, classId, acquire]);
  useEffect(() => {
    if (!connected || !armed || teacher || own || control?.designatedStudentId !== uid) return;
    const delay = control.teacherLeaseAt ? Math.max(0, control.teacherLeaseAt.toMillis() + TEACHER_LEASE_MS - Date.now() + 50) : 0;
    const timer = setTimeout(() => { void acquire(); }, delay);
    return () => clearTimeout(timer);
  }, [connected, armed, teacher, own, control, uid, acquire]);
  useEffect(() => registerBoardWriter(classId, uid, () => {
    const current = ref.current;
    if (!ownRef.current || !connectedRef.current || !ownsBoard(current, uid, clientId)) throw new Error('Board authority changed');
    return { controlEpoch: current!.epoch, controlClientId: clientId };
  }), [classId, uid, clientId]);
  const publish = useCallback(async (view: BoardView) => {
    const current = ref.current;
    if (!ownRef.current || !current) return;
    pendingView.current = { epoch: current.epoch, view };
    if (publishing.current) return;
    publishing.current = true;
    try {
      while (pendingView.current && ownRef.current) {
        const next = pendingView.current; pendingView.current = null;
        await publishBoardView(classId, uid, clientId, next.epoch, next.view);
      }
    } catch { setError('control'); }
    finally { pendingView.current = null; publishing.current = false; }
  }, [classId, uid, clientId]);
  const designate = useCallback(async (studentId: string | null) => {
    try { await designateBoardStudent(classId, uid, clientId, studentId); setError(''); }
    catch { setError('control'); }
  }, [classId, uid, clientId]);
  return { control, ref, own, ownRef, connected, intent, publish, designate, error, armed, clientId };
}
