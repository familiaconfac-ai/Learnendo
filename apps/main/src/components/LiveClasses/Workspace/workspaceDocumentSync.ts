export type WorkspaceSnapshotDecision = 'apply' | 'ignore-stale' | 'ignore-same-revision';

export function classifyWorkspaceSnapshotRevision(
  incomingRevision: number,
  lastAppliedRevision: number,
): WorkspaceSnapshotDecision {
  if (incomingRevision < lastAppliedRevision) return 'ignore-stale';
  if (incomingRevision === lastAppliedRevision) return 'ignore-same-revision';
  return 'apply';
}

export function applyWorkspaceHtmlSnapshot(
  current: { revision: number; html: string },
  incoming: { revision: number; html: string },
): { revision: number; html: string } {
  return classifyWorkspaceSnapshotRevision(incoming.revision, current.revision) === 'apply'
    ? incoming
    : current;
}
