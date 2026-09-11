import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const canvas = await readFile(new URL('../src/components/LiveClasses/Workspace/WorkspaceCanvas.tsx', import.meta.url), 'utf8');
const service = await readFile(new URL('../src/services/workspaceService.ts', import.meta.url), 'utf8');
const controlHook = await readFile(new URL('../src/components/LiveClasses/Workspace/useBoardControl.ts', import.meta.url), 'utf8');
const controlToolbar = await readFile(new URL('../src/components/LiveClasses/Workspace/BoardControlToolbar.tsx', import.meta.url), 'utf8');

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
const documentWriter = service.slice(
  service.indexOf('export async function saveDocContent'),
  service.indexOf('/** Persist scroll ratio'),
);
const itemWriter = service.slice(
  service.indexOf('export async function saveWorkspace('),
  service.indexOf('/** Persist a single floating item'),
);

assert.match(canvas, /serializeDomRange\(root, range\)/, 'local Range must be serialized relative to its editor root');
assert.match(overlay, /restoreDomRange\(root, selection\.range\)/, 'remote Range must be reconstructed against the local DOM');
assert.doesNotMatch(overlay, /getSelection|removeAllRanges|addRange/, 'remote decoration must not move the local native selection');
assert.match(awarenessWriter, /participantSelections\.\$\{participantId\}/);
assert.match(awarenessWriter, /selection \?\? deleteField\(\)/, 'collapsed selections must clear awareness');
assert.doesNotMatch(awarenessWriter, /docContent|innerHTML|pages/, 'awareness must not change persisted page HTML');
assert.doesNotMatch(scrollWriter, /docContent|innerHTML|pages/, 'scroll awareness must not change persisted page HTML');
assert.match(documentWriter, /currentPageId,/, 'document saves must identify the active page');
assert.match(itemWriter, /commitBoardWorkspace\(classId, payload, 'items'\)/, 'item saves must preserve the committed document HTML');
assert.match(canvas, /classifyWorkspaceSnapshotRevision/, 'workspace snapshots must use monotonic revision ordering');
assert.match(canvas, /const nextDocContent = remoteState\.docContent/, 'the live surface document must be authoritative over a stale page mirror');
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
assert.match(canvas, /reconstructRemoteSelection\(/, 'the controller selection must be reconstructed for followers');
assert.match(canvas, /boardContentFingerprint\(root\.innerHTML\) !== selected\.fingerprint/, 'selection must wait until the local HTML fingerprint matches');
assert.match(canvas, /contentEditable=\{board\.own && viewerCanEditSharedDocument\}/, 'the document editor must follow effective ownership');
assert.match(canvas, /requestFullscreen\(\)/, 'Board fullscreen should use the native API when available');
assert.match(canvas, /orientation\.lock\('landscape'\)/, 'Board fullscreen should request landscape as best effort');
assert.match(canvas, /onTouchStartCapture=/, 'touch-only mobile browsers must reach the acquire intent');
assert.match(canvas, /board\.intent\('touchstart'\)/, 'the mobile event source must be observable');
assert.match(canvas, /forcedStudentPresentation/, 'teacher presentation must force the student CSS layout');
assert.match(canvas, /Toque para tela cheia/, 'native fullscreen permission must have a local-gesture fallback');
assert.match(controlHook, /next\?\.controllerId === uid && !next\.acquisitionOpen/, 'the current student must rebind after refresh/reconnect');
assert.match(controlHook, /acquireError: \{ code, message \}/, 'acquire failures must preserve the Firebase code and message');
assert.match(controlHook, /!teacher \|\| !control\?\.acquisitionOpen/, 'teacher editing must stop while S is waiting');
assert.match(controlToolbar, />T<\/[a-z]+>/, 'the teacher takeover control must remain visible');
assert.match(controlToolbar, />S<\/[a-z]+>/, 'the open acquisition control must remain visible');
assert.doesNotMatch(controlToolbar, /<select/, 'individual student designation must be removed');
assert.match(controlToolbar, /!teacher && Boolean\(board\.error\)/, 'student control errors must reveal diagnostics without a URL flag');
assert.doesNotMatch(controlToolbar, /URLSearchParams|window\.location\.search/, 'Board diagnostics must not depend on the current URL');
assert.match(controlToolbar, /Detalhes do controle/, 'the in-Board diagnostic panel must be expandable');
assert.match(controlToolbar, /Copiar diagnóstico/, 'the diagnostic payload must be copyable on the affected device');
for (const field of ['connected', 'actualRole', 'effectiveRole', 'membershipAssigned', 'acquisitionOpen', 'studentAcquireEnabled', 'controllerId', 'controllerClientId', 'clientId', 'controlEpoch', 'armed', 'own', 'canEdit', 'contentEditable', 'acquireAttempted', 'acquireResult', 'eventSource', 'acquireError.code', 'acquireError.message']) {
  assert.ok(controlToolbar.includes(field), `Board diagnostics must include ${field}`);
}
assert.match(service, /snap\.metadata\.hasPendingWrites/, 'pending local snapshots must not restore stale HTML');
assert.match(service, /workspaceMutationSeq/, 'workspace writes must carry an ordering token');

console.log('workspace selection UI tests passed');

assert.match(canvas, /restoreDomRange\(root, selected\.range\)/);
assert.match(canvas, /selection\?\.addRange\(range\)/, 'the authoritative Range must be native, not decoration only');
assert.match(canvas, /if \(!board\.ownRef\.current/, 'followers cannot publish');
assert.match(canvas, /composingRef\.current/, 'IME composition defers remote application');
assert.match(canvas, /view\.pageId !== activePageIdRef\.current/);
assert.match(canvas, /restoreScrollTop\(view\.scrollRatio/);
assert.doesNotMatch(canvas, /newestRemoteScroll|saveParticipantScroll\(/);
