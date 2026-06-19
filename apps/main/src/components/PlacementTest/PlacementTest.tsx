import React, { useMemo, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  CONFIDENCE_LABELS,
  PlacementConfidence,
  PlacementEvaluation,
  PlacementResponse,
  PlacementQuestion,
  evaluatePlacementTest,
  getPlacementOutcome,
  getQuestionsForLanguage,
  scorePlacementAnswer,
} from '../../data/placementTestQuestions';
import { LessonLanguageCode, PlacementAnswerItem, PlacementBlockScore } from '../../types';
import { auth, db, ensureAnonAuth } from '../../services/firebase';
import { speak } from '../../services/ttsService';

type PlacementUILanguage = 'en' | 'pt' | 'es';

interface PlacementTestProps {
  currentLanguage?: LessonLanguageCode;
  onComplete: (result: PlacementTestCompletionPayload) => void;
  onTriggerConversion?: (reason?: string) => void;
}

export interface PlacementTestCompletionPayload {
  percentage: number;
  recommendedBook: number | null;
  recommendedEntryPoint: string;
  level: string;
}

interface ConfirmedResponse {
  question: PlacementQuestion;
  response: PlacementResponse;
  isCorrect: boolean;
  awardedPoints: number;
}

interface FeedbackState {
  confirmed: ConfirmedResponse;
  evaluation: PlacementEvaluation;
  bookScore?: PlacementBlockScore;
  willFinish: boolean;
}

const UI = {
  en: {
    title: 'General Placement Test',
    subtitle: 'Listening-based adaptive placement for Learnendo Books 1 to 9',
    whatToExpect: 'What to expect:',
    bullets: [
      '45 listening questions, divided into 9 books',
      '5 questions per book with adaptive stopping',
      'You must choose an answer and a confidence level',
      'Audio can be replayed as many times as needed',
    ],
    labelName: 'Your Full Name *',
    placeholderName: 'Enter your full name',
    labelWhatsapp: 'WhatsApp Number *',
    placeholderWhatsapp: '55 11 99999-9999',
    whatsappHint: "We'll use this to send you the result if needed",
    disclaimer: 'This test places you in the best starting Learnendo book based on listening performance.',
    startBtn: 'Start Placement Test',
    fillIn: 'Fill in name and WhatsApp',
    progressLabel: (book: number, question: number, total: number) => `Book ${book} - Question ${question} of ${total}`,
    overallProgress: (current: number, total: number) => `${current}/${total} answered`,
    playAudio: 'Play Audio',
    playing: 'Playing...',
    replayHint: 'Replay the audio if needed, then choose the best answer.',
    answerLabel: 'Choose your answer',
    confidenceLabel: 'How confident are you?',
    confirmAnswer: 'Confirm Answer',
    continue: 'Continue',
    correct: 'Correct answer',
    pointsReceived: 'Points received',
    explanation: 'Explanation',
    bookSummary: 'Book Summary',
    bookPassed: (book: number, score: number) => `You scored ${score.toFixed(1)}/5 in Book ${book} and will continue.`,
    bookStopped: (book: number, score: number) => `You scored ${score.toFixed(1)}/5 in Book ${book}. The test stops here.`,
    resultTitle: 'Recommended Starting Point',
    resultScore: 'Confidence-weighted score',
    correctAnswers: 'Correct answers',
    blockScores: 'Scores by Book',
    startLearning: 'Start Learning',
    contactTeacher: 'Contact Teacher on WhatsApp',
    createAccount: 'Create Account',
    advancedTag: 'Advanced / Conversation / C1',
    confidence: {
      sure: 'I am sure',
      maybe: 'I think I know',
      guess: 'I will guess',
    },
    whatsappMessage: (
      name: string,
      whatsapp: string,
      result: PlacementEvaluation,
      blockScores: string,
    ) => `Hello! I have completed the Learnendo General Placement Test.

Name: ${name}
WhatsApp: ${whatsapp}
Recommendation: ${result.recommendedEntryPoint}
Score: ${result.percentage}% (${result.overallPoints}/${result.maxPoints} points)
Correct answers: ${result.correctAnswers}/${result.totalQuestions}
Scores by book: ${blockScores}`,
  },
  pt: {
    title: 'Placement Test Geral',
    subtitle: 'Teste adaptativo por listening para os Livros 1 a 9 do Learnendo',
    whatToExpect: 'O que esperar:',
    bullets: [
      '45 questoes de listening divididas em 9 livros',
      '5 questoes por livro com parada automatica',
      'Voce precisa escolher resposta e confianca',
      'O audio pode ser repetido quantas vezes precisar',
    ],
    labelName: 'Seu nome completo *',
    placeholderName: 'Digite seu nome completo',
    labelWhatsapp: 'Numero do WhatsApp *',
    placeholderWhatsapp: '55 11 99999-9999',
    whatsappHint: 'Usaremos isso para enviar seu resultado se necessario',
    disclaimer: 'Este teste recomenda o melhor livro inicial do Learnendo com base no seu desempenho em listening.',
    startBtn: 'Comecar Placement Test',
    fillIn: 'Preencha nome e WhatsApp',
    progressLabel: (book: number, question: number, total: number) => `Livro ${book} - Questao ${question} de ${total}`,
    overallProgress: (current: number, total: number) => `${current}/${total} respondidas`,
    playAudio: 'Tocar Audio',
    playing: 'Tocando...',
    replayHint: 'Repita o audio se precisar e depois escolha a melhor resposta.',
    answerLabel: 'Escolha sua resposta',
    confidenceLabel: 'Qual e a sua confianca?',
    confirmAnswer: 'Confirmar Resposta',
    continue: 'Continuar',
    correct: 'Resposta correta',
    pointsReceived: 'Pontuacao recebida',
    explanation: 'Explicacao',
    bookSummary: 'Resumo do Livro',
    bookPassed: (book: number, score: number) => `Voce fez ${score.toFixed(1)}/5 no Livro ${book} e vai continuar.`,
    bookStopped: (book: number, score: number) => `Voce fez ${score.toFixed(1)}/5 no Livro ${book}. O teste para aqui.`,
    resultTitle: 'Livro Recomendado',
    resultScore: 'Pontuacao ponderada por confianca',
    correctAnswers: 'Respostas corretas',
    blockScores: 'Pontuacao por Livro',
    startLearning: 'Comecar a Aprender',
    contactTeacher: 'Falar com Professor no WhatsApp',
    createAccount: 'Criar Conta',
    advancedTag: 'Avancado / Conversacao / C1',
    confidence: {
      sure: 'Tenho certeza',
      maybe: 'Acho que sei',
      guess: 'Vou chutar',
    },
    whatsappMessage: (
      name: string,
      whatsapp: string,
      result: PlacementEvaluation,
      blockScores: string,
    ) => `Ola! Conclui o Placement Test Geral do Learnendo.

Nome: ${name}
WhatsApp: ${whatsapp}
Recomendacao: ${result.recommendedEntryPoint}
Pontuacao: ${result.percentage}% (${result.overallPoints}/${result.maxPoints} pontos)
Respostas corretas: ${result.correctAnswers}/${result.totalQuestions}
Pontuacao por livro: ${blockScores}`,
  },
  es: {
    title: 'Placement Test General',
    subtitle: 'Prueba adaptativa de listening para los Libros 1 al 9 de Learnendo',
    whatToExpect: 'Que esperar:',
    bullets: [
      '45 preguntas de listening divididas en 9 libros',
      '5 preguntas por libro con parada automatica',
      'Debes elegir respuesta y nivel de confianza',
      'El audio puede repetirse todas las veces que necesites',
    ],
    labelName: 'Tu nombre completo *',
    placeholderName: 'Escribe tu nombre completo',
    labelWhatsapp: 'Numero de WhatsApp *',
    placeholderWhatsapp: '55 11 99999-9999',
    whatsappHint: 'Lo usaremos para enviarte el resultado si hace falta',
    disclaimer: 'Esta prueba recomienda el mejor libro inicial de Learnendo segun tu listening.',
    startBtn: 'Empezar Placement Test',
    fillIn: 'Completa nombre y WhatsApp',
    progressLabel: (book: number, question: number, total: number) => `Libro ${book} - Pregunta ${question} de ${total}`,
    overallProgress: (current: number, total: number) => `${current}/${total} respondidas`,
    playAudio: 'Reproducir Audio',
    playing: 'Reproduciendo...',
    replayHint: 'Repite el audio si hace falta y luego elige la mejor respuesta.',
    answerLabel: 'Elige tu respuesta',
    confidenceLabel: 'Que tan seguro estas?',
    confirmAnswer: 'Confirmar Respuesta',
    continue: 'Continuar',
    correct: 'Respuesta correcta',
    pointsReceived: 'Puntos recibidos',
    explanation: 'Explicacion',
    bookSummary: 'Resumen del Libro',
    bookPassed: (book: number, score: number) => `Has conseguido ${score.toFixed(1)}/5 en el Libro ${book} y continuaras.`,
    bookStopped: (book: number, score: number) => `Has conseguido ${score.toFixed(1)}/5 en el Libro ${book}. La prueba termina aqui.`,
    resultTitle: 'Libro Recomendado',
    resultScore: 'Puntuacion ponderada por confianza',
    correctAnswers: 'Respuestas correctas',
    blockScores: 'Puntuacion por Libro',
    startLearning: 'Empezar a Aprender',
    contactTeacher: 'Hablar con el Profesor por WhatsApp',
    createAccount: 'Crear Cuenta',
    advancedTag: 'Avanzado / Conversacion / C1',
    confidence: {
      sure: 'Estoy seguro',
      maybe: 'Creo que lo se',
      guess: 'Voy a adivinar',
    },
    whatsappMessage: (
      name: string,
      whatsapp: string,
      result: PlacementEvaluation,
      blockScores: string,
    ) => `Hola! Complete el Placement Test General de Learnendo.

Nombre: ${name}
WhatsApp: ${whatsapp}
Recomendacion: ${result.recommendedEntryPoint}
Puntuacion: ${result.percentage}% (${result.overallPoints}/${result.maxPoints} puntos)
Respuestas correctas: ${result.correctAnswers}/${result.totalQuestions}
Puntuacion por libro: ${blockScores}`,
  },
} as const;

function resolveUiLanguage(language: LessonLanguageCode): PlacementUILanguage {
  if (language === 'pt' || language === 'es') return language;
  return 'en';
}

function getQuestionNumberInsideBook(question: PlacementQuestion, questions: PlacementQuestion[]): number {
  return questions.filter((item) => item.book === question.book).findIndex((item) => item.id === question.id) + 1;
}

export const PlacementTest: React.FC<PlacementTestProps> = ({
  currentLanguage = 'en',
  onComplete,
  onTriggerConversion,
}) => {
  const uiLanguage = resolveUiLanguage(currentLanguage);
  const ui = UI[uiLanguage];
  const questions = useMemo(() => getQuestionsForLanguage(currentLanguage), [currentLanguage]);

  const [studentName, setStudentName] = useState('');
  const [studentWhatsApp, setStudentWhatsApp] = useState('');
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<PlacementResponse[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [selectedConfidence, setSelectedConfidence] = useState<PlacementConfidence | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [finalResult, setFinalResult] = useState<PlacementEvaluation | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const currentQuestionInBook = currentQuestion ? getQuestionNumberInsideBook(currentQuestion, questions) : 1;
  const overallProgress = Math.round(((responses.length + (feedback ? 1 : 0)) / questions.length) * 100);
  const isFormValid = studentName.trim() !== '' && studentWhatsApp.trim() !== '';

  const playAudio = (text: string) => {
    setIsPlayingAudio(true);
    speak(text, 'en', {
      rate: 0.92,
      onEnd: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false),
    });
  };

  const handleSubmitAnswer = () => {
    if (!currentQuestion || selectedAnswer === null || !selectedConfidence) return;

    const response: PlacementResponse = {
      questionId: currentQuestion.id,
      answerIndex: selectedAnswer,
      confidence: selectedConfidence,
    };
    const isCorrect = selectedAnswer === currentQuestion.correctAnswerIndex;
    const awardedPoints = scorePlacementAnswer(isCorrect, selectedConfidence);
    const nextResponses = [...responses, response];
    const evaluation = evaluatePlacementTest(nextResponses, questions);
    const bookScore = currentQuestionInBook === 5
      ? evaluation.blockScores[evaluation.blockScores.length - 1]
      : undefined;
    const willFinish = currentQuestionInBook === 5 && (
      (bookScore ? !bookScore.passed : false)
      || currentQuestion.book === 9
    );

    setFeedback({
      confirmed: {
        question: currentQuestion,
        response,
        isCorrect,
        awardedPoints,
      },
      evaluation,
      bookScore,
      willFinish,
    });
  };

  const handleContinue = () => {
    if (!feedback) return;

    const nextResponses = [...responses, feedback.confirmed.response];
    setResponses(nextResponses);
    setFeedback(null);
    setSelectedAnswer(null);
    setSelectedConfidence(null);

    if (feedback.willFinish) {
      void finalizeTest(nextResponses, feedback.evaluation);
      return;
    }

    setCurrentQuestionIndex((previous) => previous + 1);
  };

  const finalizeTest = async (
    confirmedResponses: PlacementResponse[],
    evaluation: PlacementEvaluation,
  ) => {
    const answerBreakdown = buildAnswerBreakdown(
      confirmedResponses,
      questions,
      ui.confidence,
    );

    const placementRecord = {
      score: evaluation.percentage,
      level: evaluation.level,
      date: new Date().toISOString(),
      languageCode: currentLanguage,
      correctAnswers: evaluation.correctAnswers,
      totalQuestions: evaluation.totalQuestions,
      fullName: studentName,
      whatsapp: studentWhatsApp,
      answerBreakdown,
      recommendedBook: evaluation.recommendedBook,
      recommendedEntryPoint: evaluation.recommendedEntryPoint,
      stoppedAtBook: evaluation.stoppedAtBook,
      overallPoints: evaluation.overallPoints,
      maxPoints: evaluation.maxPoints,
      blockScores: evaluation.blockScores,
    };

    let authUser = auth.currentUser;
    if (!authUser) {
      try {
        await ensureAnonAuth();
        authUser = auth.currentUser;
      } catch (error) {
        console.warn('[PlacementTest] Anonymous auth failed during placement save', error);
      }
    }

    if (authUser && db) {
      try {
        const progressRef = doc(db, 'progress', authUser.uid);
        await setDoc(progressRef, {
          tests: {
            placement: placementRecord,
            placements: { [currentLanguage]: placementRecord },
          },
        }, { merge: true });

        const historyRef = doc(db, 'users', authUser.uid, 'placementTests', `placement_${Date.now()}`);
        await setDoc(historyRef, {
          ...placementRecord,
          userId: authUser.uid,
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        console.warn('[PlacementTest] Placement save failed', error);
      }
    }

    setFinalResult(evaluation);
    setTestCompleted(true);
  };

  if (!testStarted) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-md">
          <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.35),_transparent_45%),linear-gradient(135deg,#0f172a,#111827_60%,#020617)] p-8">
              <div className="mb-6 inline-flex rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">
                Learnendo Listening Placement
              </div>
              <h1 className="text-3xl font-black leading-tight text-white">{ui.title}</h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{ui.subtitle}</p>
            </div>

            <div className="space-y-6 p-6">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-cyan-300">{ui.whatToExpect}</h2>
                <ul className="space-y-2 text-sm text-slate-300">
                  {ui.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <span className="mt-0.5 text-cyan-300">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-200">{ui.labelName}</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(event) => setStudentName(event.target.value)}
                    placeholder={ui.placeholderName}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-200">{ui.labelWhatsapp}</label>
                  <input
                    type="tel"
                    value={studentWhatsApp}
                    onChange={(event) => setStudentWhatsApp(event.target.value.replace(/\D/g, ''))}
                    placeholder={ui.placeholderWhatsapp}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
                  />
                  <p className="mt-2 text-xs text-slate-400">{ui.whatsappHint}</p>
                </div>
              </div>

              <p className="text-center text-xs leading-relaxed text-slate-400">{ui.disclaimer}</p>

              <button
                type="button"
                disabled={!isFormValid}
                onClick={() => setTestStarted(true)}
                className="w-full rounded-2xl bg-cyan-400 px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {isFormValid ? ui.startBtn : ui.fillIn}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (testCompleted && finalResult) {
    const outcome = getPlacementOutcome(finalResult.level);
    const blockScoreSummary = finalResult.blockScores
      .map((block) => `${block.book}: ${block.score.toFixed(1)}/${block.maxScore}`)
      .join(' | ');

    const handleContactTeacher = () => {
      const text = encodeURIComponent(
        ui.whatsappMessage(studentName, studentWhatsApp, finalResult, blockScoreSummary),
      );
      window.open(`https://wa.me/5517991010930?text=${text}`, '_blank');
    };

    return (
      <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-md">
          <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.25),_transparent_40%),linear-gradient(135deg,#0f172a,#111827_60%,#020617)] p-8 text-center">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/10 text-4xl font-black text-cyan-200">
                {finalResult.percentage}%
              </div>
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">{ui.resultTitle}</p>
              <h1 className="mt-3 text-3xl font-black text-white">{finalResult.recommendedEntryPoint}</h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{outcome.description}</p>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">{ui.resultScore}</p>
                <p className="mt-3 text-2xl font-black text-white">
                  {finalResult.overallPoints.toFixed(1)} / {finalResult.maxPoints}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {ui.correctAnswers}: {finalResult.correctAnswers}/{finalResult.totalQuestions}
                </p>
              </div>

              <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">{ui.resultTitle}</p>
                <p className="mt-2 text-lg font-black text-white">{outcome.entryPoint}</p>
                <p className="mt-2 text-sm leading-relaxed text-amber-100">{outcome.recommendation}</p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">{ui.blockScores}</p>
                <div className="space-y-3">
                  {finalResult.blockScores.map((block) => (
                    <div
                      key={block.book}
                      className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">Book {block.book}</p>
                        <p className="text-xs text-slate-400">{block.level}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-cyan-200">
                          {block.score.toFixed(1)}/{block.maxScore}
                        </p>
                        <p className={`text-xs font-bold ${block.passed ? 'text-emerald-300' : 'text-amber-300'}`}>
                          {block.passed ? 'Passou / Passed' : 'Parou / Stopped'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleContactTeacher}
                  className="w-full rounded-2xl bg-emerald-500 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-emerald-400"
                >
                  {ui.contactTeacher}
                </button>

                {auth.currentUser?.isAnonymous && (
                  <button
                    type="button"
                    onClick={() => onTriggerConversion?.('Create an account to save your placement test result and recommendation.')}
                    className="w-full rounded-2xl border border-violet-400/40 bg-violet-500/10 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-violet-100 transition hover:bg-violet-500/20"
                  >
                    {ui.createAccount}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onComplete({
                    percentage: finalResult.percentage,
                    recommendedBook: finalResult.recommendedBook,
                    recommendedEntryPoint: finalResult.recommendedEntryPoint,
                    level: finalResult.level,
                  })}
                  className="w-full rounded-2xl bg-cyan-400 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-cyan-300"
                >
                  {ui.startLearning}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto max-w-md">
        <div className="mb-5 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
                {ui.progressLabel(currentQuestion.book, currentQuestionInBook, 5)}
              </p>
              <p className="mt-1 text-sm text-slate-400">{ui.overallProgress(responses.length + 1, questions.length)}</p>
            </div>
            <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm font-black text-cyan-200">
              {overallProgress}%
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
              style={{ width: `${Math.max(overallProgress, 4)}%` }}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900 shadow-2xl">
          <div className="border-b border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_45%),linear-gradient(135deg,#0f172a,#111827)] p-6">
            <div className="mb-4 inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
              Book {currentQuestion.book} · {currentQuestion.level}
            </div>
            <h1 className="text-2xl font-black text-white">{currentQuestion.prompt}</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{ui.replayHint}</p>
          </div>

          <div className="space-y-6 p-6">
            <button
              type="button"
              onClick={() => playAudio(currentQuestion.audioText)}
              disabled={isPlayingAudio}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-4 py-4 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              <span className="text-lg">{isPlayingAudio ? '||' : '>'}</span>
              <span>{isPlayingAudio ? ui.playing : ui.playAudio}</span>
            </button>

            {!feedback ? (
              <>
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">{ui.answerLabel}</p>
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => (
                      <button
                        key={`${currentQuestion.id}_${index}`}
                        type="button"
                        onClick={() => setSelectedAnswer(index)}
                        className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                          selectedAnswer === index
                            ? 'border-cyan-400 bg-cyan-400/10 text-white'
                            : 'border-slate-800 bg-slate-950 text-slate-200 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-black ${
                            selectedAnswer === index
                              ? 'border-cyan-300 bg-cyan-300 text-slate-950'
                              : 'border-slate-600 text-slate-400'
                          }`}>
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span className="text-sm leading-relaxed">{option}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">{ui.confidenceLabel}</p>
                  <div className="grid gap-3">
                    {(Object.keys(CONFIDENCE_LABELS) as PlacementConfidence[]).map((confidence) => (
                      <button
                        key={confidence}
                        type="button"
                        onClick={() => setSelectedConfidence(confidence)}
                        className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                          selectedConfidence === confidence
                            ? 'border-amber-300 bg-amber-300/10 text-amber-100'
                            : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {ui.confidence[confidence]}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={selectedAnswer === null || !selectedConfidence}
                  onClick={handleSubmitAnswer}
                  className="w-full rounded-2xl bg-cyan-400 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {ui.confirmAnswer}
                </button>
              </>
            ) : (
              <>
                <div className={`rounded-3xl border p-5 ${
                  feedback.confirmed.isCorrect
                    ? 'border-emerald-400/30 bg-emerald-400/10'
                    : 'border-amber-400/30 bg-amber-400/10'
                }`}>
                  <p className={`text-xs font-bold uppercase tracking-[0.18em] ${
                    feedback.confirmed.isCorrect ? 'text-emerald-200' : 'text-amber-200'
                  }`}>
                    {feedback.confirmed.isCorrect ? 'Correct / Acertou' : 'Review / Revisar'}
                  </p>
                  <p className="mt-4 text-sm font-bold text-white">{ui.correct}: {feedback.confirmed.question.options[feedback.confirmed.question.correctAnswerIndex]}</p>
                  <p className="mt-3 text-sm text-slate-200">
                    {ui.pointsReceived}: {feedback.confirmed.awardedPoints.toFixed(1)}
                  </p>
                  {feedback.confirmed.question.explanation && (
                    <p className="mt-3 text-sm leading-relaxed text-slate-200">
                      <span className="font-bold text-white">{ui.explanation}: </span>
                      {feedback.confirmed.question.explanation}
                    </p>
                  )}
                </div>

                {feedback.bookScore && (
                  <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">{ui.bookSummary}</p>
                    <p className="mt-3 text-lg font-black text-white">
                      Book {feedback.bookScore.book}: {feedback.bookScore.score.toFixed(1)}/{feedback.bookScore.maxScore}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      {feedback.bookScore.passed
                        ? ui.bookPassed(feedback.bookScore.book, feedback.bookScore.score)
                        : ui.bookStopped(feedback.bookScore.book, feedback.bookScore.score)}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleContinue}
                  className="w-full rounded-2xl bg-cyan-400 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-cyan-300"
                >
                  {ui.continue}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function buildAnswerBreakdown(
  responses: PlacementResponse[],
  questions: PlacementQuestion[],
  confidenceLabels: Record<PlacementConfidence, string>,
): PlacementAnswerItem[] {
  const questionMap = new Map(questions.map((question) => [question.id, question]));

  return responses.map((response) => {
    const question = questionMap.get(response.questionId);
    if (!question) {
      return {
        questionId: response.questionId,
        prompt: '',
        studentAnswer: null,
        correctAnswer: '',
        isCorrect: false,
        explanation: null,
        grammarTopic: null,
        levelBand: '',
        skillType: 'listening',
      };
    }

    const isCorrect = response.answerIndex === question.correctAnswerIndex;
    const awardedPoints = scorePlacementAnswer(isCorrect, response.confidence);

    return {
      questionId: question.id,
      prompt: question.audioText,
      studentAnswer: question.options[response.answerIndex] ?? null,
      correctAnswer: question.options[question.correctAnswerIndex],
      isCorrect,
      explanation: question.explanation ?? null,
      grammarTopic: question.grammarTopic ?? null,
      levelBand: question.level,
      skillType: question.type,
      confidence: confidenceLabels[response.confidence],
      awardedPoints,
      book: question.book,
    };
  });
}
