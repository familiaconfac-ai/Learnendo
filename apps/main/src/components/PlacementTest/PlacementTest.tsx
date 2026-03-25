import React, { useState } from 'react';
import { CEFR_LEVELS, classifyPlacementLevel, getQuestionsForLanguage } from '../../data/placementTestQuestions';
import { LessonLanguageCode } from '../../types';
import { auth, db, ensureAnonAuth } from '../../services/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface PlacementTestProps {
  currentLanguage?: LessonLanguageCode;
  onComplete: (score: number, level: string) => void;
  onTriggerConversion?: (reason?: string) => void;
}

export const PlacementTest: React.FC<PlacementTestProps> = ({ currentLanguage = 'en', onComplete, onTriggerConversion }) => {
  // Resolve questions for the active language. Falls back to English until
  // per-language banks are authored. This is the dispatch point for future content.
  const questions = getQuestionsForLanguage(currentLanguage);

  const [studentName, setStudentName] = useState('');
  const [studentWhatsApp, setStudentWhatsApp] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(questions.length).fill(null));
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = Math.round(((currentQuestionIndex + 1) / questions.length) * 100);

  const getEnglishVoice = (): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    // Priority 1: en-US
    const enUs = voices.find(v => v.lang.startsWith('en-US'));
    if (enUs) return enUs;

    // Priority 2: en-GB
    const enGb = voices.find(v => v.lang.startsWith('en-GB'));
    if (enGb) return enGb;

    // Priority 3: any English voice
    const anyEn = voices.find(v => v.lang.startsWith('en'));
    if (anyEn) return anyEn;

    // Fallback: first voice available
    return voices[0] || null;
  };

  const playAudio = (text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);

      // Select English voice with priority
      const englishVoice = getEnglishVoice();
      if (englishVoice) {
        utterance.voice = englishVoice;
        utterance.lang = englishVoice.lang;
      } else {
        // Fallback if no voice found
        utterance.lang = 'en-US';
      }

      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      speechSynthesis.speak(utterance);
    }
  };

  // classifyPlacementLevel is imported from placementTestQuestions.ts (weighted band scoring)

  const handleSelectAnswer = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
  };

  const handleNext = () => {
    if (selectedAnswer !== null) {
      const newAnswers = [...answers];
      newAnswers[currentQuestionIndex] = selectedAnswer;
      setAnswers(newAnswers);
      setSelectedAnswer(null);

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        handleCompleteTest(newAnswers);
      }
    }
  };

  const handleCompleteTest = async (finalAnswers: (number | null)[]) => {
    const correctCount = finalAnswers.reduce((count, answer, index) => {
      if (answer === questions[index].correctAnswerIndex) {
        return count + 1;
      }
      return count;
    }, 0);

    const { percentage, level } = classifyPlacementLevel(finalAnswers, questions);
    
    // Ensure user is authenticated before saving to Firebase
    let authUser = auth.currentUser;
    if (!authUser) {
      try {
        console.log('[PlacementTest] 🔐 Attempting anonymous authentication...');
        await ensureAnonAuth();
        authUser = auth.currentUser;  // Get the real user that was just authenticated
        if (!authUser) {
          throw new Error('Authentication failed: auth.currentUser is still null after ensureAnonAuth()');
        }
        console.log('[PlacementTest] 🔐 Anonymous authentication successful:', authUser.uid);
      } catch (authError) {
        console.error('[PlacementTest] ❌ Authentication failed:', authError);
        setTestCompleted(true);  // Show result screen even if auth fails
        return;  // Do NOT attempt Firestore write without authenticated user
      }
    }
    
    // Safety check: ensure user is authenticated before any Firestore write
    if (!authUser) {
      console.error('[PlacementTest] ❌ User not authenticated - cannot save to Firebase');
      setTestCompleted(true);  // Show result screen locally
      return;
    }
    
    // Single authoritative write — all downstream consumers (dashboard, PDF) read from here.
    try {
      console.log('[PlacementTest] Saving to Firebase with uid:', authUser.uid);
      if (db) {
        const placementRecord = {
          score: percentage,
          level,
          date: new Date().toISOString(),
          languageCode: currentLanguage,
          correctAnswers: correctCount,
          totalQuestions: questions.length,
          fullName: studentName,
          whatsapp: studentWhatsApp,
        };
        await setDoc(
          doc(db, 'progress', authUser.uid),
          {
            tests: {
              placement: placementRecord,
              placements: { [currentLanguage]: placementRecord },
            },
          },
          { merge: true },
        );
        console.log('[PlacementTest] ✅ Saved to progress/', authUser.uid, { level, percentage });
      }
    } catch (error) {
      console.warn('[PlacementTest] ⚠️ Firebase save failed:', error);
      // Continue showing results even if Firebase fails
    }

    setTestCompleted(true);
    // NOTE: do NOT call onComplete() here — the result screen handles navigation
  };

  if (testCompleted) {
    const correctCount = answers.reduce((count, answer, index) => {
      if (answer === questions[index].correctAnswerIndex) {
        return count + 1;
      }
      return count;
    }, 0);
    const { level, percentage } = classifyPlacementLevel(answers, questions);
    const levelInfo = CEFR_LEVELS[level as keyof typeof CEFR_LEVELS];

    const handleContactTeacher = () => {
      const message = `Hello! I have just completed the Placement Test.
My name is ${studentName}.
My WhatsApp number is ${studentWhatsApp}.
My score was ${correctCount}/${questions.length}.
My estimated level was ${level}.
I would like to receive feedback about my result.`;

      const encodedMessage = encodeURIComponent(message);
      const teacherWhatsAppUrl = `https://wa.me/5517991010930?text=${encodedMessage}`;
      window.open(teacherWhatsAppUrl, '_blank');
    };

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
              <p className="text-2xl font-bold text-blue-600 mb-1">{correctCount}/{questions.length} Correct</p>
              <p className="text-xs text-slate-600">You got {percentage}% of questions right</p>
            </div>

            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 mb-6">
              <p className="text-sm font-semibold text-amber-900 mb-2">Recommended Starting Point</p>
              <p className="text-sm text-amber-800">{levelInfo.recommendation}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleContactTeacher}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <i className="fab fa-whatsapp text-xl"></i>
                Contact Teacher on WhatsApp
              </button>

              {auth.currentUser?.isAnonymous && (
                <button
                  onClick={() => onTriggerConversion?.('Create an account to save your placement test score and progress.')}
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
                >
                  📧 Create Account
                </button>
              )}

              <button
                onClick={() => onComplete(percentage, level)}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                Start Learning
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!testStarted) {
    const isFormValid = studentName.trim() !== '' && studentWhatsApp.trim() !== '';

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-50 pb-28 w-full overflow-x-hidden flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="mb-6 text-center">
              <div className="text-6xl mb-4">📝</div>
              <h1 className="text-3xl font-bold text-blue-900 mb-2">Placement Test</h1>
              <p className="text-slate-500 text-sm">Discover your English level</p>
            </div>

            <div className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-200 text-left">
              <h2 className="font-bold text-blue-900 text-sm mb-3">What to expect:</h2>
              <ul className="text-sm text-slate-700 space-y-2">
                <li>✓ {questions.length} questions total</li>
                <li>✓ Listening, Grammar, Reading & Vocabulary</li>
                <li>✓ Progressive difficulty (Beginner to C2)</li>
                <li>✓ Takes about 15-20 minutes</li>
              </ul>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Your Full Name *</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">WhatsApp Number *</label>
                <input
                  type="tel"
                  value={studentWhatsApp}
                  onChange={(e) => setStudentWhatsApp(e.target.value.replace(/\D/g, ''))}
                  placeholder="55 11 99999-9999"
                  className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">We'll use this to send you your results</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-6 text-center">You will be classified from Beginner to C2 level based on your answers.</p>

            <button
              onClick={() => setTestStarted(true)}
              disabled={!isFormValid}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              {isFormValid ? 'Start Test' : 'Fill in name and WhatsApp'}
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
            <p className="text-sm font-semibold text-slate-700">Question {currentQuestionIndex + 1} of {questions.length}</p>
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
              {/* audioText is NEVER rendered as text — only used for TTS via playAudio() */}
              <button
                onClick={() => playAudio(currentQuestion.audioText!)}
                disabled={isPlayingAudio}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 disabled:from-slate-300 disabled:to-slate-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                <span className="text-xl">{isPlayingAudio ? '🔊' : '▶️'}</span>
                {isPlayingAudio ? 'Playing...' : 'Play Audio'}
              </button>
              <p className="text-xs text-slate-400 mt-2 text-center">Press Play to hear the audio, then choose your answer.</p>
            </div>
          )}

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isIDontKnow = option === "I don't know";
              const isSelected = selectedAnswer === index;
              return (
                <button
                  key={index}
                  onClick={() => handleSelectAnswer(index)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all active:scale-95 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : isIDontKnow
                        ? 'border-slate-200 bg-slate-50 hover:border-slate-400'
                        : 'border-slate-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-slate-300'
                    }`}>
                      {isSelected && <span className="text-white text-sm font-bold">✓</span>}
                    </div>
                    <span className={`font-medium ${isIDontKnow ? 'text-slate-400 italic text-sm' : 'text-slate-700'}`}>
                      {option}
                    </span>
                  </div>
                </button>
              );
            })}
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
            {currentQuestionIndex === questions.length - 1 ? 'Finish Test' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};