import React, { useState } from 'react';
import { Day, UserProgress, LessonLanguageCode } from '../../types';
import { getUnitNumberFromLessonNumber } from '../../utils/workbookUnits';

// PracticeSection lives in UI.tsx and expects the legacy PracticeItem shape.
// We adapt Exercise → PracticeItem here so no changes are needed in UI.tsx.
import { PracticeSection } from '../UI';

interface ExercisePracticeProps {
  day: Day;
  lessonId: string;
  currentLanguage?: LessonLanguageCode;
  progress: UserProgress;
  onComplete: (dayId: string, score: number) => void;
  onBack: () => void;
  /** Total number of days in this lesson — used for the visible exercise header. */
  totalDays?: number;
  onGrammar?: () => void;
}

export const ExercisePractice: React.FC<ExercisePracticeProps> = ({
  day,
  lessonId,
  currentLanguage = 'en',
  onComplete,
  onBack,
  totalDays,
  onGrammar,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  // Guard against onComplete being called multiple times on the last exercise
  const isCompletedRef = React.useRef(false);

  // Parse the day number from the day id (e.g. "w1l1d3" or "d3" → 3)
  const dayNumber = (() => {
    const m = day.id.match(/d(\d+)/);
    return m ? parseInt(m[1], 10) : undefined;
  })();
  const lessonNumber = (() => {
    const m = lessonId.match(/_l(\d+)/i) ?? lessonId.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 1;
  })();
  const unitNumber = getUnitNumberFromLessonNumber(lessonNumber);

  const exercises = day.exercises;

  if (!exercises.length) {
    console.warn(`[ExercisePractice] Day "${day.id}" has no exercises.`);
    return (
      <div className="p-4 text-center">
        <p>No exercises available for this day.</p>
        <button onClick={onBack} className="mt-4 text-blue-500">← Back</button>
      </div>
    );
  }

  if (currentIdx >= exercises.length) {
    // Should not normally render — onComplete fires before this.
    return null;
  }

  const currentExercise = exercises[currentIdx];
  console.log(`[ExercisePractice] Day "${day.id}", exercise ${currentIdx + 1}/${exercises.length}:`, currentExercise.id);

  // Convert Exercise to the PracticeItem shape expected by PracticeSection.
  const practiceItem = {
    ...currentExercise,
    moduleType: `${lessonId}_${day.id}`,
    lessonId: lessonNumber,
  };

  const handleResult = (correct: boolean, _val: string) => {
    const newCorrect = correctCount + (correct ? 1 : 0);
    const nextIdx = currentIdx + 1;

    if (nextIdx >= exercises.length) {
      if (isCompletedRef.current) return; // prevent double-fire on last exercise
      isCompletedRef.current = true;
      const score = Math.round((newCorrect / exercises.length) * 100);
      console.log(`[ExercisePractice] Day "${day.id}" complete. Score: ${score}%`);
      onComplete(day.id, score);
    } else {
      setCorrectCount(newCorrect);
      setCurrentIdx(nextIdx);
    }
  };

  return (
    <>
      <PracticeSection
        item={practiceItem as any}
        onResult={handleResult}
        currentIdx={currentIdx}
        totalItems={exercises.length}
        lessonId={lessonNumber}
        unitNumber={unitNumber}
        onBack={onBack}
        dayNumber={dayNumber}
        totalDays={totalDays}
        currentLanguage={currentLanguage}
      />
    </>
  );
};
