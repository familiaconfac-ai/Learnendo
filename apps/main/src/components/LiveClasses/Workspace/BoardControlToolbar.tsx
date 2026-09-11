import React, { useState } from 'react';
import { useUiLanguage } from '../../../i18n/UiLanguageContext';
import type { useBoardControl } from './useBoardControl';

const COPY = {
  en: { teacher: 'Teacher', following: 'Following', controls: 'is controlling the Board', waiting: 'Waiting for a student...', take: 'Teacher control', open: 'Open to students', error: 'Control unavailable; reconnect to continue' },
  pt: { teacher: 'Professor', following: 'Acompanhando', controls: 'está controlando a Board', waiting: 'Aguardando um aluno...', take: 'Controle do professor', open: 'Abrir para alunos', error: 'Controle indisponível; reconecte para continuar' },
  es: { teacher: 'Profesor', following: 'Siguiendo', controls: 'controla la Board', waiting: 'Esperando a un alumno...', take: 'Control del profesor', open: 'Abrir a alumnos', error: 'Control no disponible; vuelve a conectarte' },
};
export function BoardControlToolbar({ board, teacher, uid, students, canEdit, contentEditable, onFullscreen }: {
  board: ReturnType<typeof useBoardControl>; teacher: boolean; uid: string;
  students: Array<{ uid: string; label: string; isOnline: boolean }>;
  canEdit: boolean;
  contentEditable: boolean;
  onFullscreen?: () => void;
}) {
  const { uiLanguage } = useUiLanguage(); const copy = COPY[uiLanguage];
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const name = board.control?.controllerName || students.find(student => student.uid === board.control?.controllerId)?.label || board.control?.controllerId || copy.teacher;
  const localDebugEnabled = typeof window !== 'undefined' && window.localStorage.getItem('boardDebug') === '1';
  const debugVisible = (!teacher && Boolean(board.error)) || localDebugEnabled;
  const diagnostics = {
    connected: board.connected,
    actualRole: board.debugIdentity.actualRole,
    effectiveRole: board.debugIdentity.effectiveRole,
    membershipAssigned: board.debugIdentity.membershipAssigned,
    acquisitionOpen: board.control?.acquisitionOpen ?? null,
    studentAcquireEnabled: !teacher && board.connected && Boolean(board.control && (board.control.acquisitionOpen || board.control.controllerId === uid)),
    controllerId: board.control?.controllerId ?? null,
    controllerClientId: board.control?.controllerClientId ?? null,
    clientId: board.clientId,
    controlEpoch: board.control?.epoch ?? null,
    armed: board.armed,
    own: board.own,
    canEdit,
    contentEditable,
    acquireAttempted: board.acquireDebug.acquireAttempted,
    acquireResult: board.acquireDebug.acquireResult,
    eventSource: board.acquireDebug.eventSource,
    'acquireError.code': board.acquireDebug.acquireError.code,
    'acquireError.message': board.acquireDebug.acquireError.message,
  };
  const copyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  };
  return <div data-board-control-ui className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-white px-2 py-1 text-xs text-slate-700">
    {teacher && <div className="flex overflow-hidden rounded border font-bold" aria-label="Board ownership">
      <button type="button" title={copy.take} aria-label={copy.take} disabled={!board.connected} onClick={() => void board.setStudentAcquisition(false)} className={`px-3 py-1 ${!board.control?.acquisitionOpen ? 'bg-slate-900 text-white' : 'bg-white'}`}>T</button>
      <button type="button" title={copy.open} aria-label={copy.open} disabled={!board.connected} onClick={() => void board.setStudentAcquisition(true)} className={`border-l px-3 py-1 ${board.control?.acquisitionOpen ? 'bg-emerald-600 text-white' : 'bg-white'}`}>S</button>
    </div>}
    <span role="status">{board.control?.acquisitionOpen ? copy.waiting : `${name} ${copy.controls}`}</span>
    {!teacher && !board.own && <span>{copy.following}</span>}
    {onFullscreen && <button type="button" onClick={onFullscreen} className="ml-auto rounded border px-2 py-1" aria-label="Board fullscreen" title="Board fullscreen">⛶</button>}
    {board.error && <span role="alert" className="text-red-700">{copy.error}</span>}
    {debugVisible && <details data-board-acquire-debug className="w-full rounded border border-slate-300 bg-slate-50 p-2">
      <summary className="cursor-pointer select-none font-semibold text-slate-800">Detalhes do controle</summary>
      <pre className="mt-2 max-h-56 overflow-auto rounded bg-slate-950 p-2 text-[10px] text-emerald-300">{JSON.stringify(diagnostics, null, 2)}</pre>
      <div className="mt-2 flex items-center gap-2">
        <button type="button" onClick={() => void copyDiagnostics()} className="rounded border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700">Copiar diagnóstico</button>
        {copyStatus === 'copied' && <span role="status" className="text-emerald-700">Copiado</span>}
        {copyStatus === 'failed' && <span role="alert" className="text-red-700">Não foi possível copiar</span>}
      </div>
    </details>}
  </div>;
}
