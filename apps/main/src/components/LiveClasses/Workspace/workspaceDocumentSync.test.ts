import assert from 'node:assert/strict';
import { applyWorkspaceHtmlSnapshot, classifyWorkspaceSnapshotRevision } from './workspaceDocumentSync.ts';

const latest = { revision: 101, html: '<p>NEW</p>' };
assert.deepEqual(applyWorkspaceHtmlSnapshot(latest, { revision: 100, html: '<p>OLD</p>' }), latest);
assert.deepEqual(applyWorkspaceHtmlSnapshot(latest, { revision: 101, html: '<p>OLD</p>' }), latest);
assert.deepEqual(applyWorkspaceHtmlSnapshot(latest, { revision: 102, html: '<p>NEWER</p>' }), { revision: 102, html: '<p>NEWER</p>' });
assert.equal(classifyWorkspaceSnapshotRevision(100, 101), 'ignore-stale');
assert.equal(classifyWorkspaceSnapshotRevision(101, 101), 'ignore-same-revision');
assert.equal(classifyWorkspaceSnapshotRevision(102, 101), 'apply');

console.log('Workspace document revision ordering passed.');
