export type WorkspaceSnapshotDecision = 'apply' | 'ignore-stale' | 'ignore-same-revision';

export interface WorkspaceDocumentSnapshotContext {
  ownsBoard: boolean;
  isLocallyTyping: boolean;
  userId: string;
  localClientId: string;
  currentControlEpoch: number | null;
  docUpdatedBy: string | null;
  snapshotControlClientId: string | null;
  snapshotControlEpoch: number | null;
}

export function classifyWorkspaceSnapshotRevision(
  incomingRevision: number,
  lastAppliedRevision: number,
): WorkspaceSnapshotDecision {
  if (incomingRevision < lastAppliedRevision) return 'ignore-stale';
  if (incomingRevision === lastAppliedRevision) return 'ignore-same-revision';
  return 'apply';
}

export function isSameControllerDocumentSelfEcho({
  ownsBoard,
  userId,
  localClientId,
  currentControlEpoch,
  docUpdatedBy,
  snapshotControlClientId,
  snapshotControlEpoch,
}: WorkspaceDocumentSnapshotContext): boolean {
  return ownsBoard
    && docUpdatedBy === userId
    && snapshotControlClientId === localClientId
    && snapshotControlEpoch === currentControlEpoch;
}

export function shouldApplyWorkspaceDocumentSnapshot(
  context: WorkspaceDocumentSnapshotContext,
): boolean {
  return !context.isLocallyTyping && !isSameControllerDocumentSelfEcho(context);
}

export function applyWorkspaceHtmlSnapshot(
  current: { revision: number; html: string },
  incoming: { revision: number; html: string },
): { revision: number; html: string } {
  return classifyWorkspaceSnapshotRevision(incoming.revision, current.revision) === 'apply'
    ? incoming
    : current;
}
