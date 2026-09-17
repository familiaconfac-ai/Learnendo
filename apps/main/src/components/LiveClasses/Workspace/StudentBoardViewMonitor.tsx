import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { LiveClassPresence } from '../../../types';
import { boardContentFingerprint } from '../../../models/boardControl';
import { chooseStudentMonitorUid, type BoardMonitorDocumentState } from '../../../models/boardViewport';
import { restoreDomRange, restoreScrollTop } from './workspaceSelectionAwareness';

interface StudentBoardViewMonitorProps {
  presence: LiveClassPresence[];
  assignedRoster: Array<{ uid: string; label: string; isOnline: boolean }>;
  documentState: BoardMonitorDocumentState | null;
}

type StudentOption = { uid: string; label: string; isOnline: boolean; presence?: LiveClassPresence };

const MonitorSelectionOverlay: React.FC<{
  documentState: BoardMonitorDocumentState;
  contentRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  itemRefs: React.RefObject<Map<string, HTMLDivElement>>;
  scale: number;
  scrollTop: number;
}> = ({ documentState, contentRef, canvasRef, itemRefs, scale, scrollTop }) => {
  const [rects, setRects] = useState<Array<{ top: number; left: number; width: number; height: number }>>([]);

  useEffect(() => {
    const selection = documentState.selection;
    const canvas = canvasRef.current;
    const root = selection?.target === 'item'
      ? itemRefs.current.get(selection.itemId ?? '') ?? null
      : contentRef.current;
    if (!selection || !canvas || !root || boardContentFingerprint(root.innerHTML) !== selection.fingerprint) {
      setRects([]);
      return undefined;
    }

    const update = () => {
      const range = restoreDomRange(root, selection.range);
      if (!range) {
        setRects([]);
        return;
      }
      const canvasRect = canvas.getBoundingClientRect();
      const next = Array.from(range.getClientRects())
        .filter((rect) => rect.width > 0 && rect.height > 0)
        .slice(0, 24)
        .map((rect) => ({
          top: (rect.top - canvasRect.top) / Math.max(scale, 0.001),
          left: (rect.left - canvasRect.left) / Math.max(scale, 0.001),
          width: rect.width / Math.max(scale, 0.001),
          height: rect.height / Math.max(scale, 0.001),
        }));
      setRects(next);
    };
    const frame = requestAnimationFrame(update);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(root);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [canvasRef, contentRef, documentState, itemRefs, scale, scrollTop]);

  if (rects.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30" data-student-view-selection>
      {rects.map((rect, index) => (
        <div
          key={`${rect.left}:${rect.top}:${index}`}
          className="absolute rounded-[3px] border border-blue-600/80 bg-blue-500/45 shadow-[0_0_0_1px_rgba(37,99,235,0.18)]"
          style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
        />
      ))}
    </div>
  );
};

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
  const canvasRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const previousControllerIdRef = useRef<string | null>(null);

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
    const controllerId = documentState?.controllerId ?? null;
    const nextUid = chooseStudentMonitorUid(students, selectedUid, controllerId, previousControllerIdRef.current);
    previousControllerIdRef.current = controllerId;
    if (nextUid !== selectedUid) setSelectedUid(nextUid);
  }, [documentState?.controllerId, selectedUid, students]);

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
  const frameWidth = Math.max(1, viewport?.viewportWidth ?? viewport?.boardWidth ?? 360);
  const frameHeight = Math.max(1, viewport?.viewportHeight ?? viewport?.boardHeight ?? 640);
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

      <style>{`
        [data-student-view-monitor] .student-view-scrollbar-hidden,
        [data-student-view-monitor] .student-view-scrollbar-hidden * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        [data-student-view-monitor] .student-view-scrollbar-hidden::-webkit-scrollbar,
        [data-student-view-monitor] .student-view-scrollbar-hidden *::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>
      <div ref={measureRef} className="flex w-full justify-center overflow-hidden rounded-lg bg-slate-900">
        {viewport && documentState && viewport.pageId === documentState.pageId && viewport.surfaceMode === documentState.surfaceMode ? (
          <div
            className="student-view-scrollbar-hidden relative overflow-hidden rounded bg-white shadow-[inset_0_0_0_1px_rgba(71,85,105,1)]"
            style={{ width: frameWidth * scale, height: frameHeight * scale, aspectRatio: `${frameWidth} / ${frameHeight}` }}
            aria-label={`Prévia da lousa de ${selected?.label ?? 'aluno'}`}
          >
            <div
              className="student-view-scrollbar-hidden pointer-events-none absolute left-0 top-0 origin-top-left overflow-hidden bg-slate-100"
              style={{ width: frameWidth, height: frameHeight, transform: `scale(${scale})` }}
            >
              <div ref={canvasRef} className="relative" style={{ minHeight: Math.max(frameHeight, 1120), transform: `translateY(-${monitorScrollTop}px)` }}>
                <div
                  ref={contentRef}
                  className="student-view-scrollbar-hidden min-h-full overflow-hidden bg-white px-6 py-5 text-slate-900"
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
                      <div
                        ref={(element) => {
                          if (element) itemRefs.current.set(item.id, element);
                          else itemRefs.current.delete(item.id);
                        }}
                        className="h-full w-full overflow-hidden p-1"
                        dangerouslySetInnerHTML={{ __html: item.content ?? '' }}
                      />
                    )}
                  </div>
                ))}
                <MonitorSelectionOverlay
                  documentState={documentState}
                  contentRef={contentRef}
                  canvasRef={canvasRef}
                  itemRefs={itemRefs}
                  scale={scale}
                  scrollTop={monitorScrollTop}
                />
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
