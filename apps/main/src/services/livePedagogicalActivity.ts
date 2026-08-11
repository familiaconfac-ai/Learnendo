import { collection, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { getLatestResponseActivityByStudent, getLatestTimestamp } from '../engine/dashboardMetrics';
import { db } from './firebase';

export interface LiveActivityScope {
  actorUid: string;
  canManageAllClasses: boolean;
}

/**
 * Watches the durable answer-event history for the Live classes visible to the
 * current teacher/admin. These events are learning activity, not room access.
 */
export function subscribeToLivePedagogicalActivity(
  scope: LiveActivityScope,
  onData: (activityByStudent: Map<string, unknown>) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  if (!db) {
    onData(new Map());
    return () => {};
  }

  const responseUnsubscribers = new Map<string, Unsubscribe>();
  const responsesByClass = new Map<string, Array<Record<string, unknown>>>();

  const emit = () => {
    const perClass = Array.from(responsesByClass.values(), (responses) =>
      getLatestResponseActivityByStudent(responses));
    const allStudentIds = new Set(perClass.flatMap((activity) => Array.from(activity.keys())));
    onData(new Map(Array.from(allStudentIds, (uid) => [
      uid,
      getLatestTimestamp(perClass.map((activity) => activity.get(uid))),
    ])));
  };

  const unsubscribeClasses = onSnapshot(
    collection(db, 'liveClasses'),
    (snapshot) => {
      const visibleClassIds = new Set(snapshot.docs
        .filter((classSnapshot) => {
          if (scope.canManageAllClasses) return true;
          const data = classSnapshot.data();
          return data.teacherUid === scope.actorUid || data.createdBy === scope.actorUid;
        })
        .map((classSnapshot) => classSnapshot.id));

      for (const [classId, unsubscribe] of responseUnsubscribers) {
        if (visibleClassIds.has(classId)) continue;
        unsubscribe();
        responseUnsubscribers.delete(classId);
        responsesByClass.delete(classId);
      }

      for (const classId of visibleClassIds) {
        if (responseUnsubscribers.has(classId)) continue;
        responseUnsubscribers.set(classId, onSnapshot(
          collection(db!, 'liveClasses', classId, 'responses'),
          (responsesSnapshot) => {
            responsesByClass.set(classId, responsesSnapshot.docs.map((item) => item.data()));
            emit();
          },
          (error) => {
            responsesByClass.delete(classId);
            emit();
            onError?.(error);
          },
        ));
      }
      emit();
    },
    onError,
  );

  return () => {
    unsubscribeClasses();
    responseUnsubscribers.forEach((unsubscribe) => unsubscribe());
    responseUnsubscribers.clear();
  };
}
