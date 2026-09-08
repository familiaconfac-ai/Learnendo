import React, { createContext, useContext, useMemo } from 'react';
import type { LiveClass, LiveClassSession } from '../../types';

export interface LiveLessonContextValue {
  courseId: string;
  workbookId: number | null;
  lessonId: string | null;
  grammarWorkbookId: number | null;
  grammarLessonNumber: number | null;
}

const LiveLessonContext = createContext<LiveLessonContextValue | null>(null);

export function LiveLessonContextProvider({ liveClass, session, children }: {
  liveClass: LiveClass;
  session: LiveClassSession;
  children: React.ReactNode;
}) {
  const value = useMemo<LiveLessonContextValue>(() => ({
    courseId: session.activeCourseId || liveClass.courseId || 'english',
    workbookId: session.activeWorkbookId ?? liveClass.workbookId ?? null,
    lessonId: session.activeLessonId?.toString() ?? liveClass.lessonId?.toString() ?? null,
    grammarWorkbookId: session.sharedGrammarWorkbookId ?? session.activeWorkbookId ?? liveClass.workbookId ?? null,
    grammarLessonNumber: session.sharedGrammarLessonNumber ?? null,
  }), [liveClass.courseId, liveClass.lessonId, liveClass.workbookId, session.activeCourseId, session.activeLessonId, session.activeWorkbookId, session.sharedGrammarLessonNumber, session.sharedGrammarWorkbookId]);
  return <LiveLessonContext.Provider value={value}>{children}</LiveLessonContext.Provider>;
}

export function useLiveLessonContext() {
  const value = useContext(LiveLessonContext);
  if (!value) throw new Error('useLiveLessonContext must be used inside a LiveLessonContextProvider');
  return value;
}
