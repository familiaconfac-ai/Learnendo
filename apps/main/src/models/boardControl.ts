import type { SerializedSelectionRange } from '../components/LiveClasses/Workspace/workspaceSelectionAwareness';

export const TEACHER_IDLE_MS = 2200;
export const TEACHER_LEASE_MS = 5000;
export interface BoardView {
  surfaceMode: 'document' | 'slides';
  pageId: string;
  scrollRatio: number;
  selection: { target: 'document' | 'item'; itemId: string | null; range: SerializedSelectionRange; fingerprint: string } | null;
}
export interface BoardControl {
  designatedStudentId: string | null;
  controllerId: string;
  controllerClientId: string;
  epoch: number;
  teacherLeaseAt: { toMillis(): number } | null;
  view: BoardView | null;
  updatedAt: unknown;
}
export function teacherLeaseActive(control: BoardControl | null, now: number): boolean {
  return !!control?.teacherLeaseAt && now < control.teacherLeaseAt.toMillis() + TEACHER_LEASE_MS;
}
export function canAcquireBoard(control: BoardControl | null, uid: string, teacher: boolean, now: number): boolean {
  return teacher || (!!control && control.designatedStudentId === uid && !teacherLeaseActive(control, now));
}
export function ownsBoard(control: BoardControl | null, uid: string, clientId: string): boolean {
  return !!control && control.controllerId === uid && control.controllerClientId === clientId;
}
export function boardContentFingerprint(html: string): string {
  let hash = 2166136261;
  for (let i = 0; i < html.length; i++) hash = Math.imul(hash ^ html.charCodeAt(i), 16777619);
  return `${html.length}:${hash >>> 0}`;
}
