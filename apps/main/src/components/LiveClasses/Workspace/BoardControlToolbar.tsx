import React from 'react';
import { useUiLanguage } from '../../../i18n/UiLanguageContext';
import type { useBoardControl } from './useBoardControl';

const COPY = {
  en: { students: 'Students', teacher: 'Teacher', following: 'Following', controls: 'has control', resume: 'Continue from this point', waiting: 'Teacher is guiding', offline: 'offline', error: 'Control unavailable; reconnect to continue' },
  pt: { students: 'Alunos', teacher: 'Professor', following: 'Acompanhando', controls: 'está com o controle', resume: 'Continuar deste ponto', waiting: 'Professor está conduzindo', offline: 'offline', error: 'Controle indisponível; reconecte para continuar' },
  es: { students: 'Alumnos', teacher: 'Profesor', following: 'Siguiendo', controls: 'tiene el control', resume: 'Continuar desde este punto', waiting: 'El profesor está guiando', offline: 'sin conexión', error: 'Control no disponible; vuelve a conectarte' },
};
export function BoardControlToolbar({ board, teacher, uid, students }: {
  board: ReturnType<typeof useBoardControl>; teacher: boolean; uid: string;
  students: Array<{ uid: string; label: string; isOnline: boolean }>;
}) {
  const { uiLanguage } = useUiLanguage(); const copy = COPY[uiLanguage];
  const designated = students.find(student => student.uid === board.control?.designatedStudentId);
  const name = students.find(student => student.uid === board.control?.controllerId)?.label ?? copy.teacher;
  return <div data-board-control-ui className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-white px-2 py-1 text-xs text-slate-700">
    {teacher && <label className="font-semibold">{copy.students}: <select aria-label={copy.students} value={board.control?.designatedStudentId ?? ''} disabled={!board.connected}
      onChange={event => void board.designate(event.target.value || null)} className="max-w-44 rounded border p-1">
      <option value="">{copy.teacher}</option>
      {students.map(student => <option key={student.uid} value={student.uid}>{student.label}{student.isOnline ? '' : ` (${copy.offline})`}</option>)}
    </select></label>}
    <span role="status">{name} {copy.controls}{designated && !designated.isOnline ? ` · ${designated.label} (${copy.offline})` : ''}</span>
    {!teacher && board.control?.designatedStudentId === uid && !board.own && <button type="button" onClick={board.intent} className="rounded border px-2 py-1">{board.control.teacherLeaseAt ? copy.waiting : copy.resume}</button>}
    {!teacher && board.control?.designatedStudentId !== uid && <span>{copy.following}</span>}
    {board.error && <span role="alert" className="text-red-700">{copy.error}</span>}
  </div>;
}
