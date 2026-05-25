import React from 'react';
import { Day, Lesson } from '../../types';

export interface WhiteboardImportSelection {
  courseId: string;
  workbookId: number;
  lessonId: string;
  exerciseId: string;
}

interface WhiteboardActivityBuilderProps {
  activityPanelOpen: boolean;
  activityMode: 'free' | 'manual-questions' | 'lesson-exercise';
  manualTitle: string;
  manualInstruction: string;
  manualPromptsText: string;
  importSelection: WhiteboardImportSelection;
  courseOptions: Array<{ id: string; label: string }>;
  workbookOptions: Array<{ id: number; label: string }>;
  lessonOptions: Lesson[];
  exerciseOptions: Day[];
  loadingWorkbook: boolean;
  activityError: string;
  selectedLessonTitle?: string;
  selectedExerciseItemCount?: number;
  onToggleOpen: () => void;
  onSelectMode: (mode: 'free' | 'manual-questions' | 'lesson-exercise') => void;
  onManualTitleChange: (value: string) => void;
  onManualInstructionChange: (value: string) => void;
  onManualPromptsTextChange: (value: string) => void;
  onImportSelectionChange: (next: WhiteboardImportSelection) => void;
  onApplyFreeWriting: () => void;
  onApplyManualQuestions: () => void;
  onApplyImportedLesson: () => void;
}

export const WhiteboardActivityBuilder: React.FC<WhiteboardActivityBuilderProps> = ({
  activityPanelOpen,
  activityMode,
  manualTitle,
  manualInstruction,
  manualPromptsText,
  importSelection,
  courseOptions,
  workbookOptions,
  lessonOptions,
  exerciseOptions,
  loadingWorkbook,
  activityError,
  selectedLessonTitle,
  selectedExerciseItemCount,
  onToggleOpen,
  onSelectMode,
  onManualTitleChange,
  onManualInstructionChange,
  onManualPromptsTextChange,
  onImportSelectionChange,
  onApplyFreeWriting,
  onApplyManualQuestions,
  onApplyImportedLesson,
}) => (
  <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-950/70 p-3">
    <button
      type="button"
      onClick={onToggleOpen}
      className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 shadow-[0_4px_0_0_#0891b2]"
    >
      {activityPanelOpen ? 'Close Activity Builder' : 'Add Activity'}
    </button>

    {activityPanelOpen ? (
      <div className="mt-3 space-y-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSelectMode('free')}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              activityMode === 'free'
                ? 'bg-cyan-500 text-slate-950'
                : 'border border-slate-600 text-slate-200'
            }`}
          >
            Free Writing
          </button>
          <button
            type="button"
            onClick={() => onSelectMode('manual-questions')}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              activityMode === 'manual-questions'
                ? 'bg-cyan-500 text-slate-950'
                : 'border border-slate-600 text-slate-200'
            }`}
          >
            Manual Questions
          </button>
          <button
            type="button"
            onClick={() => onSelectMode('lesson-exercise')}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              activityMode === 'lesson-exercise'
                ? 'bg-cyan-500 text-slate-950'
                : 'border border-slate-600 text-slate-200'
            }`}
          >
            Import from Lesson
          </button>
        </div>

        {activityMode === 'free' ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">
              Keep the current collaborative board as a single shared text area.
            </p>
            <button
              type="button"
              onClick={onApplyFreeWriting}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 shadow-[0_4px_0_0_#0891b2]"
            >
              Open Free Writing
            </button>
          </div>
        ) : null}

        {activityMode === 'manual-questions' ? (
          <div className="space-y-3">
            <input
              type="text"
              value={manualTitle}
              onChange={(event) => onManualTitleChange(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Activity title"
            />
            <textarea
              value={manualInstruction}
              onChange={(event) => onManualInstructionChange(event.target.value)}
              className="h-20 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Main instruction for the whole board"
            />
            <textarea
              value={manualPromptsText}
              onChange={(event) => onManualPromptsTextChange(event.target.value)}
              className="h-32 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder={'Write one question per line.\nExample:\nWhat is your name?\nHow are you today?'}
            />
            <button
              type="button"
              onClick={onApplyManualQuestions}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 shadow-[0_4px_0_0_#0891b2]"
            >
              Load Manual Questions
            </button>
          </div>
        ) : null}

        {activityMode === 'lesson-exercise' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-200">
                <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">Course</span>
                <select
                  value={importSelection.courseId}
                  onChange={(event) => {
                    const nextCourseId = event.target.value;
                    onImportSelectionChange({
                      courseId: nextCourseId,
                      workbookId: 0,
                      lessonId: '',
                      exerciseId: '',
                    });
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                >
                  {courseOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-200">
                <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">Workbook</span>
                <select
                  value={String(importSelection.workbookId)}
                  onChange={(event) => onImportSelectionChange({
                    ...importSelection,
                    workbookId: Number(event.target.value) || 1,
                    lessonId: '',
                    exerciseId: '',
                  })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                >
                  {workbookOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-200">
                <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">Lesson</span>
                <select
                  value={importSelection.lessonId}
                  onChange={(event) => onImportSelectionChange({
                    ...importSelection,
                    lessonId: event.target.value,
                    exerciseId: '',
                  })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  disabled={loadingWorkbook || lessonOptions.length === 0}
                >
                  {lessonOptions.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-200">
                <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">Exercise</span>
                <select
                  value={importSelection.exerciseId}
                  onChange={(event) => onImportSelectionChange({
                    ...importSelection,
                    exerciseId: event.target.value,
                  })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  disabled={loadingWorkbook || exerciseOptions.length === 0}
                >
                  {exerciseOptions.map((day, index) => (
                    <option key={day.id} value={day.id}>
                      {`Exercise ${index + 1} (${day.exercises.length} items)`}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {loadingWorkbook ? (
              <p className="text-xs text-slate-400">Loading lesson content...</p>
            ) : null}

            {selectedLessonTitle ? (
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm text-slate-200">
                <p className="font-bold text-white">{selectedLessonTitle}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {selectedExerciseItemCount ?? 0} items will be loaded as collaborative response blocks.
                </p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={onApplyImportedLesson}
              disabled={loadingWorkbook || !selectedLessonTitle}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 shadow-[0_4px_0_0_#0891b2] disabled:opacity-60"
            >
              Load Lesson Activity
            </button>
          </div>
        ) : null}

        {activityError ? (
          <p className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-200">
            {activityError}
          </p>
        ) : null}
      </div>
    ) : null}
  </div>
);
