import { useCallback, useEffect, useRef, useState } from 'react';
import { acquireBoard, publishBoardView, registerBoardWriter, setBoardStudentAcquisition, subscribeBoardControl } from '../../../services/boardControlService';
import { canAcquireBoard, ownsBoard, type BoardControl, type BoardView } from '../../../models/boardControl';

export function useBoardControl(classId: string, uid: string, displayName: string, teacher: boolean) {
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
  const lastRenewal = useRef(0);
  const own = connected
    && (teacher || armed)
    && (!teacher || !control?.acquisitionOpen)
    && ownsBoard(control, uid, clientId);
  const ownRef = useRef(false); ownRef.current = own;
  useEffect(() => {
    setArmed(false);
    const offline = () => { connectedRef.current = false; setConnected(false); setArmed(false); };
    window.addEventListener('offline', offline);
    const stop = subscribeBoardControl(classId, (next, online) => {
      // Only the current student's UID may rebind its writer after refresh. An open
      // Board is claimed on first intent, never automatically by every observer.
      if (online && !teacher && next?.controllerId === uid && !next.acquisitionOpen) setArmed(true);
      if (!online || (!teacher && (next?.controllerId !== uid || next.acquisitionOpen))) setArmed(false);
      ref.current = next; setControl(next); connectedRef.current = online; setConnected(online); setError(online ? '' : 'connection');
    }, () => { offline(); setError('connection'); });
    return () => { stop(); window.removeEventListener('offline', offline); };
  }, [classId, teacher, uid]);
  const acquire = useCallback(() => {
    if (claiming.current) return claiming.current;
    claiming.current = acquireBoard(classId, uid, clientId, displayName, teacher, ref.current?.view).then(() => { setError(''); return true; })
      .catch(() => { setError('control'); if (!teacher) setArmed(false); return false; }).finally(() => { claiming.current = null; });
    return claiming.current;
  }, [classId, uid, clientId, displayName, teacher]);
  const intent = useCallback(() => {
    if (!connectedRef.current) return;
    if (!teacher) {
      if (!canAcquireBoard(ref.current, uid, false, Date.now())) return;
      if (!ownRef.current) void acquire().then(granted => { if (granted) setArmed(true); });
      return;
    }
    if (ref.current?.acquisitionOpen || ref.current?.controllerId !== uid) return;
    if (!ownsBoard(ref.current, uid, clientId) || Date.now() - lastRenewal.current > 900 || !ref.current?.teacherLeaseAt) {
      lastRenewal.current = Date.now(); void acquire();
    }
  }, [teacher, uid, clientId, classId, acquire]);
  useEffect(() => {
    if (!connected || !armed || teacher || own || control?.controllerId !== uid || control.acquisitionOpen) return;
    void acquire();
  }, [connected, armed, teacher, own, control, uid, acquire]);
  useEffect(() => {
    if (!connected || !teacher || own || control?.acquisitionOpen || (control && control.controllerId !== uid)) return;
    void acquire();
  }, [acquire, connected, control?.acquisitionOpen, own, teacher]);
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
  const setStudentAcquisition = useCallback(async (open: boolean) => {
    try { await setBoardStudentAcquisition(classId, uid, clientId, displayName, open); setError(''); }
    catch { setError('control'); }
  }, [classId, uid, clientId, displayName]);
  return { control, ref, own, ownRef, connected, intent, publish, setStudentAcquisition, error, armed, clientId };
}
