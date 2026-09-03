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
const scrollWriter = service.slice(
  service.indexOf('export async function saveParticipantScroll'),
  service.indexOf('/** Persist only the current workspace surface mode'),
);

assert.match(canvas, /serializeDomRange\(root, range\)/, 'local Range must be serialized relative to its editor root');
assert.match(overlay, /restoreDomRange\(root, selection\.range\)/, 'remote Range must be reconstructed against the local DOM');
assert.doesNotMatch(overlay, /getSelection|removeAllRanges|addRange/, 'remote decoration must not move the local native selection');
assert.match(awarenessWriter, /participantSelections\.\$\{participantId\}/);
assert.match(awarenessWriter, /selection \?\? deleteField\(\)/, 'collapsed selections must clear awareness');
assert.doesNotMatch(awarenessWriter, /docContent|innerHTML|pages/, 'awareness must not change persisted page HTML');
assert.doesNotMatch(scrollWriter, /docContent|innerHTML|pages/, 'scroll awareness must not change persisted page HTML');
assert.match(canvas, /isSerializedRangeCollapsed\(selection\.range\)/, 'collapsed ranges must render as remote carets');
assert.match(canvas, /applyingRemoteScrollRef\.current \|\| Date\.now\(\) < suppressScrollPublishUntilRef\.current/,
  'applied remote scroll must not be published back');
assert.doesNotMatch(canvas, /if \(viewerIsStudent\) \{[\s\S]{0,500}lastRemoteScrollRatioRef/,
  'student scroll must no longer be forced back to a teacher-only value');
assert.match(canvas, /updateToolbarFromRange\(root, range\)/, 'toolbar state must come from the current native Range');
assert.match(canvas, /summarizeFormattingValues\(sizes\)/, 'mixed and uniform font sizes must be distinguished');
assert.match(canvas, /<option value="mixed" disabled>Mixed<\/option>/);
assert.match(canvas, /if \(!restoreSavedSelection\(\)\) return/, 'formatting must abort instead of expanding when its saved Range is invalid');
assert.doesNotMatch(canvas.match(/const execFmt = useCallback[\s\S]*?const applyFont/)?.[0] ?? '', /captureCurrentSelection\(\);/,
  'formatting must not overwrite the saved editor Range after toolbar focus');
assert.match(canvas, /fontSize: '16px'/, 'toolbar inspection must not resize the whole document root');
assert.match(canvas, /serializedLocalRange[\s\S]+restoredLocalRange/, 'remote content refresh must preserve a valid local caret/selection');

console.log('workspace selection UI tests passed');

assert.match(canvas, /restoreDomRange\(root, selected\.range\)/);
assert.match(canvas, /selection\?\.addRange\(range\)/, 'the authoritative Range must be native, not decoration only');
assert.match(canvas, /if \(!board\.ownRef\.current/, 'followers cannot publish');
assert.match(canvas, /composingRef\.current/, 'IME composition defers remote application');
assert.match(canvas, /view\.pageId !== activePageIdRef\.current/);
assert.match(canvas, /restoreScrollTop\(view\.scrollRatio/);
assert.doesNotMatch(canvas, /newestRemoteScroll|saveParticipantScroll\(/);
