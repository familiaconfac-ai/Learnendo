import assert from 'node:assert/strict';
import {
  applyWorkspaceHtmlSnapshot,
  classifyWorkspaceSnapshotRevision,
  shouldApplyWorkspaceDocumentSnapshot,
  type WorkspaceDocumentSnapshotContext,
} from './workspaceDocumentSync.ts';

const latest = { revision: 101, html: '<p>NEW</p>' };
assert.deepEqual(applyWorkspaceHtmlSnapshot(latest, { revision: 100, html: '<p>OLD</p>' }), latest);
assert.deepEqual(applyWorkspaceHtmlSnapshot(latest, { revision: 101, html: '<p>OLD</p>' }), latest);
assert.deepEqual(applyWorkspaceHtmlSnapshot(latest, { revision: 102, html: '<p>NEWER</p>' }), { revision: 102, html: '<p>NEWER</p>' });
assert.equal(classifyWorkspaceSnapshotRevision(100, 101), 'ignore-stale');
assert.equal(classifyWorkspaceSnapshotRevision(101, 101), 'ignore-same-revision');
assert.equal(classifyWorkspaceSnapshotRevision(102, 101), 'apply');

const sameController: WorkspaceDocumentSnapshotContext = {
  ownsBoard: true,
  isLocallyTyping: true,
  userId: 'student-1',
  localClientId: 'student-client-1',
  currentControlEpoch: 7,
  docUpdatedBy: 'student-1',
  snapshotControlClientId: 'student-client-1',
  snapshotControlEpoch: 7,
};

// A. Immediate self-echo cannot replace the controller's live DOM.
assert.equal(shouldApplyWorkspaceDocumentSnapshot(sameController), false);
// B. The same protection remains after the typing guard expires.
assert.equal(shouldApplyWorkspaceDocumentSnapshot({ ...sameController, isLocallyTyping: false }), false);
// C. Followers continue to apply document snapshots.
assert.equal(shouldApplyWorkspaceDocumentSnapshot({ ...sameController, ownsBoard: false, isLocallyTyping: false }), true);
// D. A new controller's snapshot is authoritative.
assert.equal(shouldApplyWorkspaceDocumentSnapshot({ ...sameController, ownsBoard: false, isLocallyTyping: false, docUpdatedBy: 'teacher-1' }), true);
// E. The same UID from another client is not this editor instance's echo.
assert.equal(shouldApplyWorkspaceDocumentSnapshot({ ...sameController, isLocallyTyping: false, snapshotControlClientId: 'student-client-2' }), true);
// F. A snapshot from another control generation remains applicable.
assert.equal(shouldApplyWorkspaceDocumentSnapshot({ ...sameController, isLocallyTyping: false, snapshotControlEpoch: 8 }), true);

const applySnapshot = (dom: string, incoming: string, context: WorkspaceDocumentSnapshotContext) =>
  shouldApplyWorkspaceDocumentSnapshot(context) ? incoming : dom;

// G. Delayed intermediate self-echoes cannot make deleted letters reappear.
let deletingDom = '<p>CASA</p>';
for (const html of ['<p>CAS</p>', '<p>CA</p>', '<p>C</p>', '<p><br></p>']) deletingDom = html;
for (const stale of ['<p>CAS</p>', '<p>CA</p>', '<p>C</p>']) {
  deletingDom = applySnapshot(deletingDom, stale, { ...sameController, isLocallyTyping: false });
  assert.equal(deletingDom, '<p><br></p>');
}

// H. Delayed intermediate self-echoes cannot remove newly typed letters.
let typingDom = '<p>C</p>';
for (const html of ['<p>CA</p>', '<p>CAS</p>', '<p>CASA</p>']) typingDom = html;
for (const stale of ['<p>C</p>', '<p>CA</p>', '<p>CAS</p>']) {
  typingDom = applySnapshot(typingDom, stale, { ...sameController, isLocallyTyping: false });
  assert.equal(typingDom, '<p>CASA</p>');
}

console.log('Workspace document revision ordering passed.');
