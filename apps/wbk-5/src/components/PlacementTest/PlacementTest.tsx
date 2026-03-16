import React, { useState, useEffect } from 'react';
import { PLACEMENT_TEST_QUESTIONS, CEFR_LEVELS, PlacementQuestion } from '../../data/placementTestQuestions';

interface PlacementTestProps {
  onComplete: (score: number) => void;
}

export const PlacementTest: React.FC<PlacementTestProps> = ({ onComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(PLACEMENT_TEST_QUESTIONS.length).fill(null));
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const currentQuestion = PLACEMENT_TEST_QUESTIONS[currentQuestionIndex];
  const progress = Math.round(((currentQuestionIndex + 1) / PLACEMENT_TEST_QUESTIONS.length) * 100);

  const playAudio = (text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      speechSynthesis.speak(utterance);
    }
  };

  const classifyLevel = (correctCount: number, totalQuestions: number): { level: string; percentage: number } => {
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    if (percentage < 15) return { level: 'Beginner', percentage };
    if (percentage < 30) return { level: 'A1', percentage };
    if (percentage < 45) return { level: 'A2', percentage };
    if (percentage < 65) return { level: 'B1', percentage };
    if (percentage < 80) return { level: 'B2', percentage };
    if (percentage < 90) return { level: 'C1', percentage };
    return { level: 'C2', percentage };
  };

  const handleSelectAnswer = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
  };

  const handleNext = () => {
    if (selectedAnswer !== null) {
      const newAnswers = [...answers];
      newAnswers[currentQuestionIndex] = selectedAnswer;
      setAnswers(newAnswers);
      setSelectedAnswer(null);

      if (currentQuestionIndex < PLACEMENT_TEST_QUESTIONS.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        handleCompleteTest(newAnswers);
      }
    }
  };

  const handleCompleteTest = (finalAnswers: (number | null)[]) => {
    const correctCount = finalAnswers.reduce((count, answer, index) => {
      if (answer === PLACEMENT_TEST_QUESTIONS[index].correctAnswerIndex) {
        return count + 1;
      }
      return count;
    }, 0);

    const { percentage } = classifyLevel(correctCount, PLACEMENT_TEST_QUESTIONS.length);
    setTestCompleted(true);
    onComplete(percentage);
  };

  if (testCompleted) {
    const correctCount = answers.reduce((count, answer, index) => {
      if (answer === PLACEMENT_TEST_QUESTIONS[index].correctAnswerIndex) {
        return count + 1;
      }
      return count;
    }, 0);
    const { level, percentage } = classifyLevel(correctCount, PLACEMENT_TEST_QUESTIONS.length);
    const levelInfo = CEFR_LEVELS[level as keyof typeof CEFR_LEVELS];

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-50 pb-28 w-full overflow-x-hidden flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full mb-4">
                <span className="text-5xl font-bold text-white">{percentage}%</span>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-blue-900 mb-2">Your Level: {level}</h1>
            <p className="text-sm text-slate-500 mb-4">({levelInfo.range})</p>

            <p className="text-slate-700 text-sm leading-relaxed mb-6">{levelInfo.description}</p>

            <div className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-200">
              <p className="text-sm font-semibold text-blue-900 mb-2">Your Results</p>
              <p className="text-2xl font-bold text-blue-600 mb-1">{correctCount}/{PLACEMENT_TEST_QUESTIONS.length} Correct</p>
              <p className="text-xs text-slate-600">You got {percentage}% of questions right</p>
            </div>

            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 mb-6">
              <p className="text-sm font-semibold text-amber-900 mb-2">Recommended Starting Point</p>
              <p className="text-sm text-amber-800">{levelInfo.recommendation}</p>
            </div>

            <button
              onClick={() => onComplete(percentage)}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              Start Learning
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!testStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-50 pb-28 w-full overflow-x-hidden flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            <div className="mb-6">
              <div className="text-6xl mb-4">📝</div>
              <h1 className="text-3xl font-bold text-blue-900 mb-2">Placement Test</h1>
              <p className="text-slate-500 text-sm">Discover your English level</p>
            </div>

            <div className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-200 text-left">
              <h2 className="font-bold text-blue-900 text-sm mb-3">What to expect:</h2>
              <ul className="text-sm text-slate-700 space-y-2">
                <li>✓ 40 questions total</li>
                <li>✓ Listening, Grammar, Reading & Vocabulary</li>
                <li>✓ Progressive difficulty (Beginner to C2)</li>
                <li>✓ Takes about 15-20 minutes</li>
              </ul>
            </div>

            <p className="text-xs text-slate-500 mb-6">You will be classified from Beginner to C2 level based on your answers.</p>

            <button
              onClick={() => setTestStarted(true)}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              Start Test
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 pb-28 w-full overflow-x-hidden">
      <div className="w-full max-w-full mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-700">Question {currentQuestionIndex + 1} of {PLACEMENT_TEST_QUESTIONS.length}</p>
            <p className="text-sm font-bold text-blue-600">{progress}%</p>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        {/* Question Container */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          {/* Part Badge */}
          <div className="inline-block mb-4">
            <span className="text-xs font-bold text-white bg-blue-500 px-3 py-1 rounded-full">
              Part {currentQuestion.part} - {currentQuestion.type === 'listening' ? 'Listening' : currentQuestion.type === 'reading' ? 'Reading' : currentQuestion.type === 'vocabulary' ? 'Vocabulary' : 'Grammar'}
            </span>
          </div>

          {/* Question Text */}
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-6">{currentQuestion.prompt}</h2>

          {/* Audio Button for Listening Questions */}
          {currentQuestion.type === 'listening' && currentQuestion.audioText && (
            <div className="mb-6">
              <button
                onClick={() => playAudio(currentQuestion.audioText!)}
                disabled={isPlayingAudio}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 disabled:from-slate-300 disabled:to-slate-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                <span className="text-xl">{isPlayingAudio ? '🔊' : '▶️'}</span>
                {isPlayingAudio ? 'Playing...' : 'Play Audio'}
              </button>
            </div>
          )}

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleSelectAnswer(index)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all active:scale-95 ${
                  selectedAnswer === index
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    selectedAnswer === index
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-slate-300'
                  }`}>
                    {selectedAnswer === index && <span className="text-white text-sm font-bold">✓</span>}
                  </div>
                  <span className="text-slate-700 font-medium">{option}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (currentQuestionIndex > 0) {
                setCurrentQuestionIndex(currentQuestionIndex - 1);
                setSelectedAnswer(answers[currentQuestionIndex - 1]);
              }
            }}
            disabled={currentQuestionIndex === 0}
            className="flex-1 border-2 border-slate-300 text-slate-700 font-bold py-3 px-4 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={selectedAnswer === null}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl disabled:shadow-none transition-all active:scale-95"
          >
            {currentQuestionIndex === PLACEMENT_TEST_QUESTIONS.length - 1 ? 'Finish Test' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};