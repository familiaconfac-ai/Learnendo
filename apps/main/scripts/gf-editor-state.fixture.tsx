// Fixture entry: mounts the real GrammarFocusModal (service mocked by esbuild plugin) into #root.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { GrammarFocusModal } from '../src/components/GrammarFocus/GrammarFocusModal';

const root = createRoot(document.getElementById('root')!);
root.render(
  React.createElement(GrammarFocusModal as any, {
    courseId: 'english', workbookId: 3, lessonId: 'wb3_l25', lessonNumber: 25, lessonTitle: 'Lesson 25',
    lessons: [{ id: 'wb3_l25', lessonNumber: 25, title: 'Lesson 25' }],
    activeLanguage: 'pt', userRole: 'admin', userId: 'u1', userName: 'Admin', userEmail: null,
    scrollRef: { current: null }, onScroll: () => {}, onSelectLesson: () => {}, onOpenOverview: () => {}, onClose: () => {},
  }),
);
