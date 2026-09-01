import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import type { UserRole } from '../../services/userRoles';
import {
  getWorkbookOptionsForCourse,
  loadWorkbookForWhiteboard,
} from '../../services/liveWhiteboardActivities';
import type { Workbook } from '../../types';
import { GrammarFocusModal } from './GrammarFocusModal';

export interface GrammarNavigatorSelection {
  workbookId: number;
  workbookTitle: string;
  lessonId: string;
  lessonNumber: number;
  lessonTitle: string;
}

export interface GrammarNavigatorSurfaceContent extends GrammarNavigatorSelection {
  title: string;
  body: string;
}

interface GrammarNavigatorModalProps {
  courseId: string;
  initialWorkbookId: number;
  currentLessonId?: string | null;
  currentLessonNumber?: number | null;
  synchronizedLessonNumber?: number | null;
  activeLanguage: string;
  userRole: UserRole;
  user: User | null;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  onClose: () => void;
  onOpenBoard?: (content: GrammarNavigatorSurfaceContent) => Promise<void>;
  onOpenSlides?: (content: GrammarNavigatorSurfaceContent) => Promise<void>;
  onOpenPractice?: (selection: GrammarNavigatorSelection) => void | Promise<void>;
  onContentViewed?: (title: string, lessonId: string) => void;
  onSelectionChange?: (selection: { workbookId: number; lessonNumber: number | null }) => void;
}

function lessonNumberFromId(lessonId: string, fallback: number) {
  const workbookMatch = lessonId.match(/_l(\d+)/i);
  if (workbookMatch) return Number(workbookMatch[1]);
  const match = lessonId.match(/(\d+)/);
  return match ? Number(match[1]) : fallback;
}

export const GrammarNavigatorModal: React.FC<GrammarNavigatorModalProps> = ({
  courseId,
  initialWorkbookId,
  currentLessonId,
  currentLessonNumber,
  synchronizedLessonNumber,
  activeLanguage,
  userRole,
  user,
  scrollRef,
  onScroll,
  onClose,
  onOpenBoard,
  onOpenSlides,
  onOpenPractice,
  onContentViewed,
  onSelectionChange,
}) => {
  const workbookOptions = useMemo(() => getWorkbookOptionsForCourse(courseId), [courseId]);
  const allowedInitialWorkbook = workbookOptions.some((option) => option.id === initialWorkbookId)
    ? initialWorkbookId
    : workbookOptions[0]?.id ?? 1;
  const [workbookId, setWorkbookId] = useState(allowedInitialWorkbook);
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [selectedLessonNumber, setSelectedLessonNumber] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setWorkbook(null);
    loadWorkbookForWhiteboard(courseId, workbookId).then((next) => {
      if (active) setWorkbook(next);
    }).catch(() => {
      if (active) setWorkbook(null);
    });
    return () => { active = false; };
  }, [courseId, workbookId]);

  useEffect(() => {
    setWorkbookId(allowedInitialWorkbook);
  }, [allowedInitialWorkbook]);

  useEffect(() => {
    if (synchronizedLessonNumber === undefined) return;
    setSelectedLessonNumber(synchronizedLessonNumber);
  }, [synchronizedLessonNumber]);

  const lessons = (workbook?.lessons ?? []).map((lesson, index) => ({
    id: lesson.id,
    lessonNumber: lessonNumberFromId(lesson.id, index + 1),
    title: lesson.title,
  }));
  const selectedLesson = selectedLessonNumber == null
    ? null
    : lessons.find((lesson) => lesson.lessonNumber === selectedLessonNumber) ?? null;
  const highlightedLesson = workbookId === allowedInitialWorkbook
    ? lessons.find((lesson) => lesson.id === currentLessonId)
      ?? lessons.find((lesson) => lesson.lessonNumber === currentLessonNumber)
      ?? null
    : null;

  const selectWorkbook = (nextWorkbookId: number) => {
    if (nextWorkbookId === workbookId) return;
    setWorkbookId(nextWorkbookId);
    setSelectedLessonNumber(null);
    onSelectionChange?.({ workbookId: nextWorkbookId, lessonNumber: null });
  };
  const selectLesson = (lessonNumber: number) => {
    setSelectedLessonNumber(lessonNumber);
    onSelectionChange?.({ workbookId, lessonNumber });
  };
  const openOverview = () => {
    setSelectedLessonNumber(null);
    onSelectionChange?.({ workbookId, lessonNumber: null });
  };
  const selection = selectedLesson ? {
    workbookId,
    workbookTitle: workbook?.title || `Workbook ${workbookId}`,
    lessonId: selectedLesson.id,
    lessonNumber: selectedLesson.lessonNumber,
    lessonTitle: selectedLesson.title || `Lesson ${selectedLesson.lessonNumber}`,
  } : null;

  return (
    <GrammarFocusModal
      workbookId={workbookId}
      lessonId={selectedLesson?.id ?? null}
      lessonNumber={selectedLessonNumber}
      lessonTitle={selectedLesson?.title}
      lessons={lessons}
      workbookOptions={workbookOptions}
      highlightedLessonId={highlightedLesson?.id ?? null}
      onSelectWorkbook={selectWorkbook}
      activeLanguage={activeLanguage}
      userRole={userRole}
      userId={user?.uid ?? null}
      userName={user?.displayName || user?.email || null}
      userEmail={user?.email ?? null}
      workbookTitle={workbook?.title}
      scrollRef={scrollRef}
      onScroll={onScroll}
      onSelectLesson={selectLesson}
      onOpenOverview={openOverview}
      onClose={onClose}
      onOpenBoard={selection && onOpenBoard ? (content) => onOpenBoard({ ...selection, ...content }) : undefined}
      onOpenSlides={selection && onOpenSlides ? (content) => onOpenSlides({ ...selection, ...content }) : undefined}
      onOpenPractice={selection && onOpenPractice ? () => onOpenPractice(selection) : undefined}
      onContentViewed={onContentViewed}
    />
  );
};
