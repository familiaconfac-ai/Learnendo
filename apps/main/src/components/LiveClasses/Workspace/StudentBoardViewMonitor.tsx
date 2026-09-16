import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { LiveClassPresence } from '../../../types';
import { boardContentFingerprint } from '../../../models/boardControl';
import type { BoardMonitorDocumentState } from '../../../models/boardViewport';
import { restoreDomRange, restoreScrollTop } from './workspaceSelectionAwareness';

interface StudentBoardViewMonitorProps {
  presence: LiveClassPresence[];
  assignedRoster: Array<{ uid: string; label: string; isOnline: boolean }>;
  documentState: BoardMonitorDocumentState | null;
}

type StudentOption = { uid: string; label: string; isOnline: boolean; presence?: LiveClassPresence };

export const StudentBoardViewMonitor: React.FC<StudentBoardViewMonitorProps> = ({
  presence,
  assignedRoster,
  documentState,
}) => {
  const [selectedUid, setSelectedUid] = useState('');
  const [availableWidth, setAvailableWidth] = useState(240);
  const [monitorScrollTop, setMonitorScrollTop] = useState(0);
  const measureRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const students = useMemo<StudentOption[]>(() => {
    const byUid = new Map<string, StudentOption>();
    assignedRoster.forEach((student) => byUid.set(student.uid, { ...student }));
    presence.filter((entry) => entry.role === 'student').forEach((entry) => {
      const existing = byUid.get(entry.uid);
      byUid.set(entry.uid, {
        uid: entry.uid,
        label: existing?.label || entry.name || entry.uid,
        isOnline: entry.isOnline,
        presence: entry,
      });
    });
    return [...byUid.values()].sort((left, right) => Number(right.isOnline) - Number(left.isOnline) || left.label.localeCompare(right.label));
  }, [assignedRoster, presence]);

  useEffect(() => {
    if (selectedUid && !students.some((student) => student.uid === selectedUid)) setSelectedUid('');
  }, [selectedUid, students]);

  useEffect(() => {
    const element = measureRef.current;
    if (!element) return;
    const measure = () => setAvailableWidth(Math.max(1, element.clientWidth));
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    measure();
    return () => observer?.disconnect();
  }, []);

  const selected = students.find((student) => student.uid === selectedUid) ?? null;
  const viewport = selected?.presence?.boardViewport ?? null;
  const frameWidth = Math.max(1, viewport?.boardWidth ?? viewport?.viewportWidth ?? 360);
  const frameHeight = Math.max(1, viewport?.boardHeight ?? viewport?.viewportHeight ?? 640);
  const scale = Math.min(1, availableWidth / frameWidth, 260 / frameHeight);

  useEffect(() => {
    const root = contentRef.current;
    if (!root || !viewport || !documentState || viewport.surfaceMode !== documentState.surfaceMode || viewport.pageId !== documentState.pageId) {
      setMonitorScrollTop(0);
      return;
    }
    const maximum = Math.max(root.scrollHeight - frameHeight, 0);
    const anchor = viewport.scrollAnchor;
    if (anchor && boardContentFingerprint(root.innerHTML) === anchor.fingerprint) {
      const range = restoreDomRange(root, anchor.range);
      if (range) {
        const rect = range.getBoundingClientRect();
        const rootRect = root.getBoundingClientRect();
        const logicalAnchorTop = (rect.top - rootRect.top) / Math.max(scale, 0.001);
        setMonitorScrollTop(Math.max(0, Math.min(maximum, logicalAnchorTop - frameHeight * anchor.viewportRatio)));
        return;
      }
    }
    setMonitorScrollTop(restoreScrollTop(viewport.scrollRatio, root.scrollHeight, frameHeight));
  }, [documentState, frameHeight, scale, viewport]);

  const status = viewport
    ? `${viewport.viewportWidth}×${viewport.viewportHeight} · ${viewport.orientation === 'landscape' ? 'horizontal' : 'vertical'} · ${viewport.expanded ? 'expandida' : 'normal'}`
    : selected?.isOnline ? 'Aguardando dados da lousa' : 'Aluno offline';

  return (
    <section className="flex flex-shrink-0 flex-col gap-2 rounded-xl border border-slate-700 bg-slate-950/70 p-2" data-student-view-monitor>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Visão do aluno</span>
        <select
          value={selectedUid}
          onChange={(event) => setSelectedUid(event.target.value)}
          className="min-w-0 max-w-[65%] rounded border border-slate-600 bg-slate-900 px-1.5 py-1 text-[10px] font-semibold text-white"
          aria-label="Selecionar aluno para monitorar"
        >
          <option value="">{students.length === 0 ? 'Nenhum aluno' : 'Monitorar: selecione'}</option>
          {students.map((student) => (
            <option key={student.uid} value={student.uid}>{student.label}{student.isOnline ? ' · online' : ''}</option>
          ))}
        </select>
      </div>

      <div className="min-h-8 text-[9px] leading-4 text-slate-400">
        <div className="truncate font-bold text-slate-200">{selected?.label ?? 'Selecione um aluno'}</div>
        <div>{status}</div>
        {viewport ? <div>Página {viewport.pageId} · {viewport.surfaceMode === 'slides' ? 'slides' : 'documento'} · rolagem lógica</div> : null}
      </div>

      <div ref={measureRef} className="flex w-full justify-center overflow-hidden rounded-lg bg-slate-900 p-1">
        {viewport && documentState && viewport.pageId === documentState.pageId ? (
          <div
            className="relative overflow-hidden rounded border border-slate-600 bg-white shadow-inner"
            style={{ width: frameWidth * scale, height: frameHeight * scale }}
            aria-label={`Prévia da lousa de ${selected?.label ?? 'aluno'}`}
          >
            <div
              className="pointer-events-none absolute left-0 top-0 origin-top-left overflow-hidden bg-slate-100"
              style={{ width: frameWidth, height: frameHeight, transform: `scale(${scale})` }}
            >
              <div className="relative" style={{ minHeight: Math.max(frameHeight, 1120), transform: `translateY(-${monitorScrollTop}px)` }}>
                <div
                  ref={contentRef}
                  className="min-h-full overflow-hidden bg-white px-6 py-5 text-slate-900"
                  style={{ width: frameWidth, minHeight: Math.max(frameHeight, 1120), fontFamily: 'Arial, sans-serif', fontSize: 16, lineHeight: 1.625 }}
                  dangerouslySetInnerHTML={{ __html: documentState.html }}
                />
                {documentState.items.map((item) => (
                  <div
                    key={item.id}
                    className="absolute overflow-hidden rounded"
                    style={{
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      width: `${item.w}%`,
                      height: `${item.h}%`,
                      background: item.type === 'text' ? (item.styles?.bgColor || '#ffffff') : 'transparent',
                      color: item.styles?.color,
                      fontFamily: item.styles?.fontFamily,
                      fontSize: item.styles?.fontSize,
                      fontWeight: item.styles?.bold ? 700 : undefined,
                      fontStyle: item.styles?.italic ? 'italic' : undefined,
                      textDecoration: item.styles?.underline ? 'underline' : undefined,
                      textAlign: item.styles?.textAlign as React.CSSProperties['textAlign'],
                    }}
                  >
                    {item.type === 'image' ? (
                      <img src={item.assetUrl || item.imageUrl} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <div className="h-full w-full overflow-hidden p-1" dangerouslySetInnerHTML={{ __html: item.content ?? '' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-28 w-full items-center justify-center px-3 text-center text-[10px] leading-4 text-slate-500">
            {selected ? 'A prévia aparece quando o aluno abre esta página da lousa.' : 'Selecione um aluno para acompanhar a visualização.'}
          </div>
        )}
      </div>
      <p className="text-[9px] leading-3 text-slate-500">Prévia reconstruída com o conteúdo compartilhado; não captura a tela do aluno.</p>
    </section>
  );
};
