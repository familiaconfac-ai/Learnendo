import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const canvas = await readFile(new URL('../src/components/LiveClasses/Workspace/WorkspaceCanvas.tsx', import.meta.url), 'utf8');
const service = await readFile(new URL('../src/services/workspaceService.ts', import.meta.url), 'utf8');

const overlay = canvas.slice(
  canvas.indexOf('const RemoteSelectionOverlay'),
  canvas.indexOf('interface StableFloatingBlockProps'),
);
const awarenessWriter = service.slice(
  service.indexOf('export async function saveParticipantSelection'),
  service.indexOf('/** Persist only the current workspace surface mode'),
);

assert.match(canvas, /serializeDomRange\(root, range\)/, 'local Range must be serialized relative to its editor root');
assert.match(overlay, /restoreDomRange\(root, selection\.range\)/, 'remote Range must be reconstructed against the local DOM');
assert.doesNotMatch(overlay, /getSelection|removeAllRanges|addRange/, 'remote decoration must not move the local native selection');
assert.match(awarenessWriter, /participantSelections\.\$\{participantId\}/);
assert.match(awarenessWriter, /selection \?\? deleteField\(\)/, 'collapsed selections must clear awareness');
assert.doesNotMatch(awarenessWriter, /docContent|innerHTML|pages/, 'awareness must not change persisted page HTML');
assert.match(canvas, /selection\.pageId === remoteCurrentPageId/, 'only selections from the active page may render');
assert.match(canvas, /\[activePageId, clearPublishedSelection, surfaceMode\]/, 'page and surface changes must clear awareness');
assert.match(canvas, /selection\.updatedBy !== userId/, 'a participant must never render their own remote decoration');

console.log('workspace selection UI tests passed');
