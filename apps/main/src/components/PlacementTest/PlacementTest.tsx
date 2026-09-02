import { requirePlacementIdentity, getPlacementBank } from '../../models/placementIdentity';
import type { UiLanguage } from '../../models/languageContext';
import React, { useMemo, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  PlacementBookScore,
  PlacementConfidence,
  PlacementEvaluation,
  PlacementResponse,
  PlacementQuestion,
  evaluatePlacementTest,
  getPlacementOutcome,
  getQuestionsForLanguage,
  scorePlacementAnswer,
} from '../../data/placementTestQuestions';
import { LessonLanguageCode, PlacementAnswerItem } from '../../types';
import { auth, db, ensureAnonAuth } from '../../services/firebase';
import { speak } from '../../services/ttsService';

type PlacementUILanguage = UiLanguage;
type PlacementStage = 'intro' | 'form' | 'test' | 'final';
type PlacementConfidenceOption = PlacementConfidence;

interface PlacementTestProps {
  currentLanguage?: LessonLanguageCode;
  uiLanguage?: UiLanguage;
  onComplete: (result: PlacementTestCompletionPayload) => void;
  onTriggerConversion?: (reason?: string) => void;
}

export interface PlacementTestCompletionPayload {
  languageCode: 'en';
  bankId: string;
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
  bookScore?: PlacementBookScore;
  reachedBookEnd: boolean;
  isFinalBook: boolean;
}

interface PerformanceRow {
  label: string;
  correct: number;
  total: number;
  percentage: number;
}

const CONFIDENCE_OPTIONS: PlacementConfidenceOption[] = ['sure', 'maybe', 'guess'];

const UI = {
  en: {
    introTitle: 'Learnendo Placement Test',
    introSubtitle: 'Discover Your English Level',
    introButton: 'Start Test',
    formTitle: 'Before we start',
    formButton: 'Continue',
    fillIn: 'Fill in your details to continue',
    labelName: 'Your Full Name *',
    placeholderName: 'Enter your full name',
    labelWhatsapp: 'WhatsApp Number *',
    placeholderWhatsapp: '+55 17 99123-4567',
    whatsappHint: 'Use a valid Brazilian number with area code.',
    whatsappError: 'Enter a valid WhatsApp number to continue.',
    progressLabel: (book: number, question: number, total: number) => `Book ${book} - Question ${question} of ${total}`,
    overallProgress: (current: number, total: number) => `${current}/${total} answered`,
    playAudio: 'Play Audio',
    playing: 'Playing...',
    replayHint: 'Replay the audio if needed, then choose the best answer.',
    answerLabel: 'Choose your answer',
    confidenceLabel: 'How confident are you?',
    confirmAnswer: 'Confirm Answer',
    continueQuestion: 'Continue',
    continueTest: 'Continue the test',
    seeFinalResult: 'See final result',
    startLearning: 'Start Learning',
    contactTeacher: 'Contact Teacher',
    createAccount: 'Create Account',
    retakeTest: 'Retake Placement Test',
    partialTitle: 'Current Recommendation',
    partialDescription: (entry: string) => `Your recommended starting point right now is ${entry}.`,
    partialActions: 'You can continue testing or start studying with the recommendation above.',
    correct: 'Correct answer',
    pointsReceived: 'Points received',
    explanation: 'Explanation',
    bookSummary: 'Book Summary',
    resultTitle: 'Final Recommendation',
    resultScore: 'Confidence-weighted score',
    correctAnswers: 'Correct answers',
    blockScores: 'Scores by Book',
    strongAreas: 'Strongest Areas',
    weakAreas: 'Areas to Review',
    advancedTag: 'Advanced / Conversation / C1',
    confidence: {
      sure: 'I am sure',
      maybe: 'I think I know',
      guess: 'I will guess',
    },
    teacherMessage: (
      name: string,
      whatsapp: string,
      result: PlacementEvaluation,
      blockScores: string,
    ) => `Hello! I completed the Learnendo Placement Test.

Name: ${name}
WhatsApp: ${whatsapp}
Recommendation: ${result.recommendedEntryPoint}
Score: ${result.percentage}% (${result.overallPoints}/${result.maxPoints} points)
Correct answers: ${result.correctAnswers}/${result.totalQuestions}
Scores by book: ${blockScores}`,
  },
  pt: {
    introTitle: 'Learnendo Placement Test',
    introSubtitle: 'Discover Your English Level',
    introButton: 'Iniciar Teste',
    formTitle: 'Antes de comecar',
    formButton: 'Continuar',
    fillIn: 'Preencha seus dados para continuar',
    labelName: 'Seu nome completo *',
    placeholderName: 'Digite seu nome completo',
    labelWhatsapp: 'Numero do WhatsApp *',
    placeholderWhatsapp: '+55 17 99123-4567',
    whatsappHint: 'Use um numero brasileiro valido com DDD.',
    whatsappError: 'Digite um WhatsApp valido para continuar.',
    progressLabel: (book: number, question: number, total: number) => `Livro ${book} - Questao ${question} de ${total}`,
    overallProgress: (current: number, total: number) => `${current}/${total} respondidas`,
    playAudio: 'Tocar Audio',
    playing: 'Tocando...',
    replayHint: 'Repita o audio se precisar e depois escolha a melhor resposta.',
    answerLabel: 'Escolha sua resposta',
    confidenceLabel: 'Qual e a sua confianca?',
    confirmAnswer: 'Confirmar Resposta',
    continueQuestion: 'Continuar',
    continueTest: 'Continuar o teste',
    seeFinalResult: 'Ver resultado final',
    startLearning: 'Comecar meus estudos',
    contactTeacher: 'Entrar em contato com o professor',
    createAccount: 'Criar Conta',
    retakeTest: 'Refazer Placement Test',
    partialTitle: 'Nivel recomendado no momento',
    partialDescription: (entry: string) => `Seu nivel recomendado atualmente e ${entry}.`,
    partialActions: 'Voce pode continuar o diagnostico ou iniciar seus estudos com esta recomendacao.',
    correct: 'Resposta correta',
    pointsReceived: 'Pontuacao recebida',
    explanation: 'Explicacao',
    bookSummary: 'Resumo do Livro',
    resultTitle: 'Resultado Final',
    resultScore: 'Pontuacao ponderada por confianca',
    correctAnswers: 'Respostas corretas',
    blockScores: 'Pontuacao por Livro',
    strongAreas: 'Habilidades Mais Fortes',
    weakAreas: 'Habilidades Mais Fracas',
    advancedTag: 'Avancado / Conversacao / C1',
    confidence: {
      sure: 'Tenho certeza',
      maybe: 'Acho que sei',
      guess: 'Vou chutar',
    },
    teacherMessage: (
      name: string,
      whatsapp: string,
      result: PlacementEvaluation,
      blockScores: string,
    ) => `Ola! Conclui o Learnendo Placement Test.

Nome: ${name}
WhatsApp: ${whatsapp}
Recomendacao: ${result.recommendedEntryPoint}
Pontuacao: ${result.percentage}% (${result.overallPoints}/${result.maxPoints} pontos)
Respostas corretas: ${result.correctAnswers}/${result.totalQuestions}
Pontuacao por livro: ${blockScores}`,
  },
  es: {
    introTitle: 'Learnendo Placement Test',
    introSubtitle: 'Discover Your English Level',
    introButton: 'Empezar Test',
    formTitle: 'Antes de empezar',
    formButton: 'Continuar',
    fillIn: 'Completa tus datos para continuar',
    labelName: 'Tu nombre completo *',
    placeholderName: 'Escribe tu nombre completo',
    labelWhatsapp: 'Numero de WhatsApp *',
    placeholderWhatsapp: '+55 17 99123-4567',
    whatsappHint: 'Usa un numero brasileno valido con codigo de area.',
    whatsappError: 'Escribe un WhatsApp valido para continuar.',
    progressLabel: (book: number, question: number, total: number) => `Libro ${book} - Pregunta ${question} de ${total}`,
    overallProgress: (current: number, total: number) => `${current}/${total} respondidas`,
    playAudio: 'Reproducir Audio',
    playing: 'Reproduciendo...',
    replayHint: 'Repite el audio si hace falta y luego elige la mejor respuesta.',
    answerLabel: 'Elige tu respuesta',
    confidenceLabel: 'Que tan seguro estas?',
    confirmAnswer: 'Confirmar Respuesta',
    continueQuestion: 'Continuar',
    continueTest: 'Continuar el test',
    seeFinalResult: 'Ver resultado final',
    startLearning: 'Empezar mis estudios',
    contactTeacher: 'Hablar con el profesor',
    createAccount: 'Crear Cuenta',
    retakeTest: 'Rehacer Placement Test',
    partialTitle: 'Nivel recomendado por ahora',
    partialDescription: (entry: string) => `Tu nivel recomendado actualmente es ${entry}.`,
    partialActions: 'Puedes seguir con el diagnostico o empezar a estudiar con esta recomendacion.',
    correct: 'Respuesta correcta',
    pointsReceived: 'Puntos recibidos',
    explanation: 'Explicacion',
    bookSummary: 'Resumen del Libro',
    resultTitle: 'Resultado Final',
    resultScore: 'Puntuacion ponderada por confianza',
    correctAnswers: 'Respuestas correctas',
    blockScores: 'Puntuacion por Libro',
    strongAreas: 'Habilidades Mas Fuertes',
    weakAreas: 'Habilidades Mas Debiles',
    advancedTag: 'Avanzado / Conversacion / C1',
    confidence: {
      sure: 'Estoy seguro',
      maybe: 'Creo que lo se',
      guess: 'Voy a adivinar',
    },
    teacherMessage: (
      name: string,
      whatsapp: string,
      result: PlacementEvaluation,
      blockScores: string,
    ) => `Hola! Complete el Learnendo Placement Test.

Nombre: ${name}
WhatsApp: ${whatsapp}
Recomendacion: ${result.recommendedEntryPoint}
Puntuacion: ${result.percentage}% (${result.overallPoints}/${result.maxPoints} puntos)
Respuestas correctas: ${result.correctAnswers}/${result.totalQuestions}
Puntuacion por libro: ${blockScores}`,
  },
} as const;

function getQuestionNumberInsideBook(question: PlacementQuestion, questions: PlacementQuestion[]): number {
  return questions.filter((item) => item.book === question.book).findIndex((item) => item.id === question.id) + 1;
}

export const PlacementTest: React.FC<PlacementTestProps> = (props) => {
  if (!getPlacementBank(props.currentLanguage ?? 'en')) {
    const copy = { en: 'Placement is currently available only for English.', pt: 'O nivelamento está disponível apenas para inglês no momento.', es: 'La prueba de nivel está disponible solo para inglés por ahora.' };
    return <div role="status" className="p-8 text-center">{copy[props.uiLanguage ?? 'en']}</div>;
  }
  return <EnglishPlacementTest {...props} key={props.currentLanguage ?? 'en'} />;
};

const EnglishPlacementTest: React.FC<PlacementTestProps> = ({
  currentLanguage = 'en',
  uiLanguage = 'en',
  onComplete,
  onTriggerConversion,
}) => {
  const bank = requirePlacementIdentity(currentLanguage);
  const ui = UI[uiLanguage];
  const questions = useMemo(() => getQuestionsForLanguage(currentLanguage), [currentLanguage]);

  const [stage, setStage] = useState<PlacementStage>('intro');
  const [studentName, setStudentName] = useState('');
  const [studentWhatsApp, setStudentWhatsApp] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<PlacementResponse[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [selectedConfidence, setSelectedConfidence] = useState<PlacementConfidence | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [finalResult, setFinalResult] = useState<PlacementEvaluation | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const currentQuestionInBook = currentQuestion ? getQuestionNumberInsideBook(currentQuestion, questions) : 1;
  const answeredCount = responses.length + (feedback ? 1 : 0);
  const overallProgress = Math.round((answeredCount / questions.length) * 100);
  const whatsappValidation = validateWhatsAppNumber(studentWhatsApp);
  const isFormValid = studentName.trim() !== '' && whatsappValidation.valid;

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
    const reachedBookEnd = currentQuestionInBook === 5;
    const bookScore = reachedBookEnd ? evaluation.blockScores[evaluation.blockScores.length - 1] : undefined;

    setFeedback({
      confirmed: {
        question: currentQuestion,
        response,
        isCorrect,
        awardedPoints,
      },
      evaluation,
      bookScore,
      reachedBookEnd,
      isFinalBook: reachedBookEnd && currentQuestion.book === 9,
    });
  };

  const handleContinueQuestion = () => {
    if (!feedback) return;

    const nextResponses = [...responses, feedback.confirmed.response];
    setResponses(nextResponses);
    setFeedback(null);
    setSelectedAnswer(null);
    setSelectedConfidence(null);
    setCurrentQuestionIndex((previous) => previous + 1);
  };

  const handleContinueTest = () => {
    if (!feedback || !feedback.reachedBookEnd) return;

    const nextResponses = [...responses, feedback.confirmed.response];
    if (feedback.isFinalBook) {
      void finalizeTest(nextResponses, feedback.evaluation, true);
      return;
    }

    setResponses(nextResponses);
    setFeedback(null);
    setSelectedAnswer(null);
    setSelectedConfidence(null);
    setCurrentQuestionIndex((previous) => previous + 1);
  };

  const handleStartLearningEarly = () => {
    if (!feedback || !feedback.reachedBookEnd) return;
    const nextResponses = [...responses, feedback.confirmed.response];
    void finalizeTest(nextResponses, feedback.evaluation, false);
  };

  const finalizeTest = async (
    confirmedResponses: PlacementResponse[],
    evaluation: PlacementEvaluation,
    completedAllBooks: boolean,
  ) => {
    const identity = requirePlacementIdentity(currentLanguage);
    const answerBreakdown = buildAnswerBreakdown(confirmedResponses, questions, ui.confidence);
    let attemptNumber = 1;

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
        const resolvedProgressRef = doc(db, 'progress', authUser.uid);
        const progressSnap = await getDoc(resolvedProgressRef);
        const existingPlacement = progressSnap.data()?.tests?.placements?.[bank.languageCode]
          ?? progressSnap.data()?.tests?.placement;
        attemptNumber = typeof existingPlacement?.attemptNumber === 'number'
          ? existingPlacement.attemptNumber + 1
          : 1;

        const placementRecord = {
          score: evaluation.percentage,
          level: evaluation.level,
          date: new Date().toISOString(),
          ...identity,
          correctAnswers: evaluation.correctAnswers,
          totalQuestions: evaluation.totalQuestions,
          fullName: studentName.trim(),
          whatsapp: whatsappValidation.normalized,
          answerBreakdown,
          recommendedBook: evaluation.recommendedBook,
          recommendedEntryPoint: evaluation.recommendedEntryPoint,
          stoppedAtBook: evaluation.stoppedAtBook,
          overallPoints: evaluation.overallPoints,
          maxPoints: evaluation.maxPoints,
          blockScores: evaluation.blockScores,
          attemptNumber,
          completedAllBooks,
        };

        await setDoc(resolvedProgressRef, {
          tests: {
            placement: placementRecord,
            placements: { [identity.languageCode]: placementRecord },
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

    setResponses(confirmedResponses);
    setFeedback(null);
    setSelectedAnswer(null);
    setSelectedConfidence(null);
    setFinalResult({
      ...evaluation,
      completedAllBooks,
    });
    setStage('final');
  };

  const handleContactTeacher = (evaluation: PlacementEvaluation) => {
    const bookSummary = evaluation.blockScores
      .map((block) => `Book ${block.book}: ${block.percentage}%`)
      .join(' | ');
    const text = encodeURIComponent(
      ui.teacherMessage(studentName.trim(), whatsappValidation.normalized || studentWhatsApp.trim(), evaluation, bookSummary),
    );
    window.open(`https://wa.me/5517991010930?text=${text}`, '_blank');
  };

  const resetPlacementTest = (keepIdentity: boolean) => {
    setStage(keepIdentity ? 'form' : 'intro');
    if (!keepIdentity) {
      setStudentName('');
      setStudentWhatsApp('');
    }
    setCurrentQuestionIndex(0);
    setResponses([]);
    setFeedback(null);
    setSelectedAnswer(null);
    setSelectedConfidence(null);
    setIsPlayingAudio(false);
    setFinalResult(null);
  };

  if (stage === 'intro') {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
          <div className="w-full overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.28),_transparent_45%),linear-gradient(135deg,#0f172a,#111827_60%,#020617)] px-8 py-16 text-center">
              <h1 className="text-4xl font-black text-white">{ui.introTitle}</h1>
              <p className="mt-4 text-sm tracking-[0.2em] text-cyan-200">{ui.introSubtitle}</p>
              <button
                type="button"
                onClick={() => setStage('form')}
                className="mt-10 w-full rounded-2xl bg-cyan-400 px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-cyan-300"
              >
                {ui.introButton}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'form') {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-md">
          <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_45%),linear-gradient(135deg,#0f172a,#111827)] px-8 py-10 text-center">
              <h1 className="text-3xl font-black text-white">{ui.introTitle}</h1>
              <p className="mt-4 text-sm text-slate-300">{ui.fillIn}</p>
            </div>

            <div className="space-y-5 p-6">
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
                  onChange={(event) => setStudentWhatsApp(event.target.value)}
                  placeholder={ui.placeholderWhatsapp}
                  className={`w-full rounded-2xl border bg-slate-950 px-4 py-3 text-slate-100 outline-none transition ${
                    studentWhatsApp.trim() && !whatsappValidation.valid
                      ? 'border-rose-400'
                      : 'border-slate-700 focus:border-cyan-400'
                  }`}
                />
                <p className={`mt-2 text-xs ${studentWhatsApp.trim() && !whatsappValidation.valid ? 'text-rose-300' : 'text-slate-400'}`}>
                  {studentWhatsApp.trim() && !whatsappValidation.valid ? ui.whatsappError : ui.whatsappHint}
                </p>
              </div>

              <button
                type="button"
                disabled={!isFormValid}
                onClick={() => setStage('test')}
                className="w-full rounded-2xl bg-cyan-400 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {isFormValid ? ui.formButton : ui.fillIn}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'final' && finalResult) {
    const outcome = getPlacementOutcome(finalResult.recommendedEntryPoint);
    const breakdown = buildAnswerBreakdown(responses, questions, ui.confidence);
    const analytics = buildPerformanceAnalytics(breakdown);

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

              <ResultList
                title={ui.blockScores}
                rows={finalResult.blockScores.map((block) => ({
                  label: `Book ${block.book}`,
                  percentage: block.percentage,
                  detail: `${block.score.toFixed(1)}/${block.maxScore}`,
                }))}
              />

              <ResultList
                title={ui.strongAreas}
                rows={analytics.strongest.map((row) => ({
                  label: row.label,
                  percentage: row.percentage,
                  detail: `${row.correct}/${row.total}`,
                }))}
              />

              <ResultList
                title={ui.weakAreas}
                rows={analytics.weakest.map((row) => ({
                  label: row.label,
                  percentage: row.percentage,
                  detail: `${row.correct}/${row.total}`,
                }))}
              />

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleContactTeacher(finalResult)}
                  className="w-full rounded-2xl bg-emerald-500 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-emerald-400"
                >
                  {ui.contactTeacher}
                </button>

                {auth.currentUser?.isAnonymous && (
                  <button
                    type="button"
                    onClick={() => onTriggerConversion?.('Create an account to save your placement test result, recommendation, and attempts history.')}
                    className="w-full rounded-2xl border border-violet-400/40 bg-violet-500/10 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-violet-100 transition hover:bg-violet-500/20"
                  >
                    {ui.createAccount}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onComplete({ languageCode: bank.languageCode, bankId: bank.bankId,
                    percentage: finalResult.percentage,
                    recommendedBook: finalResult.recommendedBook,
                    recommendedEntryPoint: finalResult.recommendedEntryPoint,
                    level: finalResult.level,
                  })}
                  className="w-full rounded-2xl bg-cyan-400 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-cyan-300"
                >
                  {ui.startLearning}
                </button>

                <button
                  type="button"
                  onClick={() => resetPlacementTest(true)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-slate-200 transition hover:border-slate-500"
                >
                  {ui.retakeTest}
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
              <p className="mt-1 text-sm text-slate-400">{ui.overallProgress(answeredCount, questions.length)}</p>
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
                    {CONFIDENCE_OPTIONS.map((confidence) => (
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

                {feedback.reachedBookEnd && feedback.bookScore ? (
                  <>
                    <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">{ui.partialTitle}</p>
                      <p className="mt-3 text-2xl font-black text-white">{feedback.evaluation.recommendedEntryPoint}</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-300">
                        {ui.partialDescription(feedback.evaluation.recommendedEntryPoint)}
                      </p>
                    </div>

                    <ResultList
                      title={ui.bookSummary}
                      rows={feedback.evaluation.blockScores.map((block) => ({
                        label: `Book ${block.book}`,
                        percentage: block.percentage,
                        detail: `${block.score.toFixed(1)}/${block.maxScore}`,
                      }))}
                    />

                    <p className="text-center text-sm leading-relaxed text-slate-400">{ui.partialActions}</p>

                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={handleStartLearningEarly}
                        className="w-full rounded-2xl bg-cyan-400 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-cyan-300"
                      >
                        {ui.startLearning}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleContactTeacher(feedback.evaluation)}
                        className="w-full rounded-2xl bg-emerald-500 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-emerald-400"
                      >
                        {ui.contactTeacher}
                      </button>

                      <button
                        type="button"
                        onClick={handleContinueTest}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-slate-200 transition hover:border-slate-500"
                      >
                        {feedback.isFinalBook ? ui.seeFinalResult : ui.continueTest}
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleContinueQuestion}
                    className="w-full rounded-2xl bg-cyan-400 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-cyan-300"
                  >
                    {ui.continueQuestion}
                  </button>
                )}
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

function buildPerformanceAnalytics(answerBreakdown: PlacementAnswerItem[]): {
  strongest: PerformanceRow[];
  weakest: PerformanceRow[];
} {
  const stats = new Map<string, { correct: number; total: number }>();

  const register = (label: string, isCorrect: boolean) => {
    const current = stats.get(label) ?? { correct: 0, total: 0 };
    current.total += 1;
    if (isCorrect) current.correct += 1;
    stats.set(label, current);
  };

  for (const item of answerBreakdown) {
    register(item.skillType === 'listening' ? 'Listening' : item.skillType, item.isCorrect);
    if (item.grammarTopic) register(item.grammarTopic, item.isCorrect);
  }

  const rows = Array.from(stats.entries())
    .map(([label, value]) => ({
      label,
      correct: value.correct,
      total: value.total,
      percentage: value.total > 0 ? Math.round((value.correct / value.total) * 100) : 0,
    }))
    .filter((row) => row.total > 0)
    .sort((left, right) => {
      if (right.percentage !== left.percentage) return right.percentage - left.percentage;
      return left.label.localeCompare(right.label);
    });

  return {
    strongest: rows.slice(0, 4),
    weakest: [...rows].sort((left, right) => {
      if (left.percentage !== right.percentage) return left.percentage - right.percentage;
      return left.label.localeCompare(right.label);
    }).slice(0, 4),
  };
}

function validateWhatsAppNumber(value: string): { valid: boolean; normalized: string } {
  const normalized = value.replace(/\D/g, '');
  if (normalized.length < 10) return { valid: false, normalized };
  if (/^(\d)\1+$/.test(normalized)) return { valid: false, normalized };

  const localNumber = normalized.startsWith('55') && normalized.length >= 12
    ? normalized.slice(2)
    : normalized;

  if (!(localNumber.length === 10 || localNumber.length === 11)) {
    return { valid: false, normalized: localNumber };
  }

  const ddd = Number(localNumber.slice(0, 2));
  if (!Number.isFinite(ddd) || ddd < 11 || ddd > 99) {
    return { valid: false, normalized: localNumber };
  }

  const subscriber = localNumber.slice(2);
  if (/^(\d)\1+$/.test(subscriber)) {
    return { valid: false, normalized: localNumber };
  }

  if (localNumber.length === 11 && subscriber[0] !== '9') {
    return { valid: false, normalized: localNumber };
  }

  return { valid: true, normalized: localNumber };
}

function ResultList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; percentage: number; detail: string }>;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">{title}</p>
      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={`${title}_${row.label}`}
            className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3"
          >
            <div>
              <p className="text-sm font-bold text-white">{row.label}</p>
              <p className="text-xs text-slate-400">{row.detail}</p>
            </div>
            <p className="text-sm font-black text-cyan-200">{row.percentage}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
