import type { SerializedSelectionRange } from '../components/LiveClasses/Workspace/workspaceSelectionAwareness';

export interface BoardScrollAnchor {
  range: SerializedSelectionRange;
  viewportRatio: number;
  fingerprint: string;
}

export interface BoardParticipantViewport {
  clientId: string;
  viewportWidth: number;
  viewportHeight: number;
  boardWidth: number;
  boardHeight: number;
  orientation: 'portrait' | 'landscape';
  expanded: boolean;
  nativeFullscreen: boolean;
  surfaceMode: 'document' | 'slides';
  pageId: string;
  scrollRatio: number;
  scrollAnchor: BoardScrollAnchor | null;
  zoom: number;
}

export interface BoardMonitorDocumentState {
  html: string;
  surfaceMode: 'document' | 'slides';
  pageId: string;
  items: Array<{
    id: string;
    type: 'text' | 'image';
    x: number;
    y: number;
    w: number;
    h: number;
    content?: string;
    imageUrl?: string;
    assetUrl?: string;
    styles?: { fontFamily?: string; fontSize?: number; color?: string; bgColor?: string; textAlign?: string; bold?: boolean; italic?: boolean; underline?: boolean };
  }>;
}

export function clampBoardViewportRatio(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function resolveAnchoredScrollTop({
  currentScrollTop,
  anchorViewportTop,
  viewportTop,
  clientHeight,
  viewportRatio,
  maximumScrollTop,
}: {
  currentScrollTop: number;
  anchorViewportTop: number;
  viewportTop: number;
  clientHeight: number;
  viewportRatio: number;
  maximumScrollTop: number;
}): number {
  const desiredViewportTop = viewportTop + clientHeight * clampBoardViewportRatio(viewportRatio);
  return Math.max(0, Math.min(maximumScrollTop, currentScrollTop + anchorViewportTop - desiredViewportTop));
}

export function boardViewportOrientation(width: number, height: number): 'portrait' | 'landscape' {
  return width > height ? 'landscape' : 'portrait';
}
