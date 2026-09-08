import { useCallback, useEffect, useRef, useState } from 'react';
import { acquireBoard, publishBoardView, registerBoardWriter, setBoardPresentationMode, setBoardStudentAcquisition, subscribeBoardControl, subscribeBoardPresentation } from '../../../services/boardControlService';
import { canAcquireBoard, ownsBoard, type BoardControl, type BoardView } from '../../../models/boardControl';

type BoardAcquireResult = 'idle' | 'attempting' | 'granted' | 'denied' | 'skipped-disconnected' | 'skipped-closed';

export function useBoardControl(classId: string, uid: string, displayName: string, teacher: boolean, context?: {
  actualRole?: string;
  effectiveRole?: string;
  membershipAssigned?: boolean;
}) {
  const clientId = useRef(crypto.randomUUID()).current;
  const [control, setControl] = useState<BoardControl | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [armed, setArmed] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [acquireDebug, setAcquireDebug] = useState({
    acquireAttempted: false, acquireResult: 'idle' as BoardAcquireResult,
    acquireError: { code: '', message: '' }, eventSource: '',
  });
  const ref = useRef<BoardControl | null>(null);
  const connectedRef = useRef(false);
  const claiming = useRef<Promise<boolean> | null>(null);
  const pendingView = useRef<{ epoch: number; view: BoardView } | null>(null);
  const publishing = useRef(false);
  const lastRenewal = useRef(0);
  const own = connected && (teacher || armed) && (!teacher || !control?.acquisitionOpen) && ownsBoard(control, uid, clientId);
  const ownRef = useRef(false); ownRef.current = own;
  const debugSnapshot = useCallback((extra: Record<string, unknown> = {}) => {
    const current = ref.current;
    const payload = {
      uid, actualRole: context?.actualRole ?? (teacher ? 'teacher' : 'student'),
      effectiveRole: context?.effectiveRole ?? (teacher ? 'teacher' : 'student'), connected: connectedRef.current,
      studentAcquireEnabled: !teacher && connectedRef.current && canAcquireBoard(current, uid, false, Date.now()),
      waitingForStudent: current?.acquisitionOpen === true, controllerId: current?.controllerId ?? null,
      controllerClientId: current?.controllerClientId ?? null, controlEpoch: current?.epoch ?? null,
      clientId, membershipAssigned: context?.membershipAssigned ?? null, ...extra,
    };
    console.info('[BOARD_ACQUIRE_DEBUG]', JSON.stringify(payload));
    return payload;
  }, [clientId, context?.actualRole, context?.effectiveRole, context?.membershipAssigned, teacher, uid]);
  useEffect(() => {
    setArmed(false);
    const offline = () => { connectedRef.current = false; setConnected(false); setArmed(false); };
    window.addEventListener('offline', offline);
    const stop = subscribeBoardControl(classId, (next, online) => {
      if (online && !teacher && next?.controllerId === uid && !next.acquisitionOpen) setArmed(true);
      if (!online || (!teacher && (next?.controllerId !== uid || next.acquisitionOpen))) setArmed(false);
      ref.current = next; setControl(next); connectedRef.current = online; setConnected(online); setError(online ? '' : 'connection');
    }, () => { offline(); setError('connection'); });
    return () => { stop(); window.removeEventListener('offline', offline); };
  }, [classId, teacher, uid]);
  useEffect(() => subscribeBoardPresentation(classId, setPresentationMode, cause => {
    console.warn('[BOARD_PRESENTATION_DEBUG] subscription failed', { classId, code: (cause as { code?: string }).code, message: cause.message });
  }), [classId]);
  useEffect(() => { debugSnapshot({ phase: 'controller-snapshot' }); }, [control, connected, debugSnapshot]);
  const acquire = useCallback((eventSource = 'programmatic') => {
    if (claiming.current) return claiming.current;
    setAcquireDebug({ acquireAttempted: true, acquireResult: 'attempting', acquireError: { code: '', message: '' }, eventSource });
    debugSnapshot({ phase: 'acquire-attempt', eventSource, acquireAttempted: true, acquireResult: 'attempting' });
    claiming.current = acquireBoard(classId, uid, clientId, displayName, teacher, ref.current?.view, transaction => {
      debugSnapshot({ ...transaction, eventSource, acquireAttempted: true, acquireResult: 'attempting' });
    }).then(epoch => {
      setError('');
      setAcquireDebug({ acquireAttempted: true, acquireResult: 'granted', acquireError: { code: '', message: '' }, eventSource });
      debugSnapshot({ phase: 'transaction-committed', eventSource, acquireAttempted: true, acquireResult: 'granted', committedEpoch: epoch });
      return true;
    }).catch((cause: unknown) => {
      const code = typeof cause === 'object' && cause !== null && 'code' in cause ? String((cause as { code: unknown }).code) : '';
      const message = cause instanceof Error ? cause.message : String(cause);
      setError('control'); setAcquireDebug({ acquireAttempted: true, acquireResult: 'denied', acquireError: { code, message }, eventSource });
      debugSnapshot({ phase: 'transaction-failed', eventSource, acquireAttempted: true, acquireResult: 'denied', acquireError: { code, message } });
      if (!teacher) setArmed(false); return false;
    }).finally(() => { claiming.current = null; });
    return claiming.current;
  }, [classId, uid, clientId, displayName, teacher, debugSnapshot]);
  const intent = useCallback((eventSource = 'programmatic') => {
    if (!connectedRef.current) {
      setAcquireDebug(current => ({ ...current, acquireResult: 'skipped-disconnected', eventSource }));
      debugSnapshot({ phase: 'intent-skipped', eventSource, acquireAttempted: false, acquireResult: 'skipped-disconnected' }); return;
    }
    if (!teacher) {
      if (!canAcquireBoard(ref.current, uid, false, Date.now())) {
        setAcquireDebug(current => ({ ...current, acquireResult: 'skipped-closed', eventSource }));
        debugSnapshot({ phase: 'intent-skipped', eventSource, acquireAttempted: false, acquireResult: 'skipped-closed' }); return;
      }
      if (!ownRef.current) void acquire(eventSource).then(granted => { if (granted) setArmed(true); });
      return;
    }
    if (ref.current?.acquisitionOpen || ref.current?.controllerId !== uid) return;
    if (!ownsBoard(ref.current, uid, clientId) || Date.now() - lastRenewal.current > 900 || !ref.current?.teacherLeaseAt) {
      lastRenewal.current = Date.now(); void acquire(eventSource);
    }
  }, [teacher, uid, clientId, acquire, debugSnapshot]);
  useEffect(() => {
    if (!connected || !armed || teacher || own || control?.controllerId !== uid || control.acquisitionOpen) return;
    void acquire('student-rebind');
  }, [connected, armed, teacher, own, control, uid, acquire]);
  useEffect(() => {
    if (!connected || !teacher || own || control?.acquisitionOpen || (control && control.controllerId !== uid)) return;
    void acquire('teacher-initialization');
  }, [acquire, connected, control?.acquisitionOpen, own, teacher]);
  useEffect(() => registerBoardWriter(classId, uid, () => {
    const current = ref.current;
    if (!ownRef.current || !connectedRef.current || !ownsBoard(current, uid, clientId)) throw new Error('Board authority changed');
    return { controlEpoch: current!.epoch, controlClientId: clientId };
  }), [classId, uid, clientId]);
  const publish = useCallback(async (view: BoardView) => {
    const current = ref.current;
    if (!ownRef.current || !current) return;
    pendingView.current = { epoch: current.epoch, view }; if (publishing.current) return; publishing.current = true;
    try {
      while (pendingView.current && ownRef.current) {
        const next = pendingView.current; pendingView.current = null; const startedAt = performance.now();
        await publishBoardView(classId, uid, clientId, next.epoch, next.view);
        console.info('[BOARD_LATENCY_DEBUG]', JSON.stringify({ phase: 'publish-committed', elapsedMs: Math.round((performance.now() - startedAt) * 10) / 10, epoch: next.epoch }));
      }
    } catch { setError('control'); }
    finally { pendingView.current = null; publishing.current = false; }
  }, [classId, uid, clientId]);
  const setStudentAcquisition = useCallback(async (open: boolean) => {
    try { await setBoardStudentAcquisition(classId, uid, clientId, displayName, open); setError(''); } catch { setError('control'); }
  }, [classId, uid, clientId, displayName]);
  const setPresentation = useCallback(async (active: boolean) => {
    if (!teacher) return false;
    try { await setBoardPresentationMode(classId, active); return true; }
    catch (cause) {
      const code = typeof cause === 'object' && cause !== null && 'code' in cause ? String((cause as { code: unknown }).code) : '';
      const message = cause instanceof Error ? cause.message : String(cause);
      console.warn('[BOARD_PRESENTATION_DEBUG] publish failed', { classId, uid, active, code, message }); setError('control'); return false;
    }
  }, [classId, teacher, uid]);
  return {
    control, ref, own, ownRef, connected, intent, publish, setStudentAcquisition, error, armed, clientId,
    presentationMode, setPresentation, acquireDebug, debugSnapshot,
    debugIdentity: {
      actualRole: context?.actualRole ?? (teacher ? 'teacher' : 'student'),
      effectiveRole: context?.effectiveRole ?? (teacher ? 'teacher' : 'student'),
      membershipAssigned: context?.membershipAssigned ?? null,
    },
  };
}
