import React from 'react';
import { useUiLanguage } from '../../../i18n/UiLanguageContext';
import type { useBoardControl } from './useBoardControl';

const COPY = {
  en: { teacher: 'Teacher', following: 'Following', controls: 'is controlling the Board', waiting: 'Waiting for a student...', take: 'Teacher control', open: 'Open to students', error: 'Control unavailable; reconnect to continue' },
  pt: { teacher: 'Professor', following: 'Acompanhando', controls: 'está controlando a Board', waiting: 'Aguardando um aluno...', take: 'Controle do professor', open: 'Abrir para alunos', error: 'Controle indisponível; reconecte para continuar' },
  es: { teacher: 'Profesor', following: 'Siguiendo', controls: 'controla la Board', waiting: 'Esperando a un alumno...', take: 'Control del profesor', open: 'Abrir a alumnos', error: 'Control no disponible; vuelve a conectarte' },
};
export function BoardControlToolbar({ board, teacher, uid, students, onFullscreen }: {
  board: ReturnType<typeof useBoardControl>; teacher: boolean; uid: string;
  students: Array<{ uid: string; label: string; isOnline: boolean }>;
  onFullscreen?: () => void;
}) {
  const { uiLanguage } = useUiLanguage(); const copy = COPY[uiLanguage];
  const name = board.control?.controllerName || students.find(student => student.uid === board.control?.controllerId)?.label || board.control?.controllerId || copy.teacher;
  return <div data-board-control-ui className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-white px-2 py-1 text-xs text-slate-700">
    {teacher && <div className="flex overflow-hidden rounded border font-bold" aria-label="Board ownership">
      <button type="button" title={copy.take} aria-label={copy.take} disabled={!board.connected} onClick={() => void board.setStudentAcquisition(false)} className={`px-3 py-1 ${!board.control?.acquisitionOpen ? 'bg-slate-900 text-white' : 'bg-white'}`}>T</button>
      <button type="button" title={copy.open} aria-label={copy.open} disabled={!board.connected} onClick={() => void board.setStudentAcquisition(true)} className={`border-l px-3 py-1 ${board.control?.acquisitionOpen ? 'bg-emerald-600 text-white' : 'bg-white'}`}>S</button>
    </div>}
    <span role="status">{board.control?.acquisitionOpen ? copy.waiting : `${name} ${copy.controls}`}</span>
    {!teacher && !board.own && <span>{copy.following}</span>}
    {onFullscreen && <button type="button" onClick={onFullscreen} className="ml-auto rounded border px-2 py-1" aria-label="Board fullscreen" title="Board fullscreen">⛶</button>}
    {board.error && <span role="alert" className="text-red-700">{copy.error}</span>}
  </div>;
}
