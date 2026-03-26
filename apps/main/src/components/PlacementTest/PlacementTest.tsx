import React, { useState } from 'react';
import { CEFR_LEVELS, classifyPlacementLevel, getQuestionsForLanguage } from '../../data/placementTestQuestions';
import { LessonLanguageCode } from '../../types';
import { auth, db, ensureAnonAuth } from '../../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { speak } from '../../services/ttsService';

// ── Placement-test UI strings by language ──────────────────────────────────
const PLACEMENT_UI = {
  en: {
    title: 'Placement Test',
    subtitle: 'Discover your English level',
    whatToExpect: 'What to expect:',
    questionsTotal: (n: number) => `✓ ${n} questions total`,
    skills: '✓ Listening, Grammar, Reading & Vocabulary',
    difficulty: '✓ Progressive difficulty (Beginner to C2)',
    duration: '✓ Takes about 15-20 minutes',
    labelName: 'Your Full Name *',
    placeholderName: 'Enter your full name',
    labelWhatsapp: 'WhatsApp Number *',
    placeholderWhatsapp: '55 11 99999-9999',
    whatsappHint: "We'll use this to send you your results",
    disclaimer: 'You will be classified from Beginner to C2 level based on your answers.',
    startBtn: 'Start Test',
    fillIn: 'Fill in name and WhatsApp',
    questionOf: (cur: number, total: number) => `Question ${cur} of ${total}`,
    skillType: { listening: 'Listening', reading: 'Reading', vocabulary: 'Vocabulary', grammar: 'Grammar' },
    playAudio: 'Play Audio',
    playing: 'Playing...',
    playHint: 'Press Play to hear the audio, then choose your answer.',
    back: 'Back',
    next: 'Next',
    finish: 'Finish Test',
    yourLevel: (l: string) => `Your Level: ${l}`,
    yourResults: 'Your Results',
    correctOf: (c: number, t: number) => `${c}/${t} Correct`,
    gotRight: (pct: number) => `You got ${pct}% of questions right`,
    recommended: '📍 Recommended Starting Point',
    contactTeacher: 'Contact Teacher on WhatsApp',
    createAccount: '📧 Create Account',
    startLearning: 'Start Learning',
    idontknow: "I don't know",
    whatsappMessage: (name: string, wa: string, correct: number, total: number, pct: number, level: string, range: string, entry: string) =>
      `Hello! I have just completed the English Placement Test.\n\nName: ${name}\nWhatsApp: ${wa}\nScore: ${correct}/${total} (${pct}%)\nEstimated Level: ${level} — ${range}\nRecommended Starting Point: ${entry}\n\nI completed the placement test and would like to receive my detailed PDF report with my answers, mistakes, and level analysis.`,
    cefrDescription: (level: string) => CEFR_LEVELS[level as keyof typeof CEFR_LEVELS]?.description ?? '',
    cefrRecommendation: (level: string) => CEFR_LEVELS[level as keyof typeof CEFR_LEVELS]?.recommendation ?? '',
    cefrEntryPoint: (level: string) => CEFR_LEVELS[level as keyof typeof CEFR_LEVELS]?.entryPoint ?? '',
  },
  pt: {
    title: 'Teste de Nivelamento',
    subtitle: 'Descubra seu nível de inglês',
    whatToExpect: 'O que esperar:',
    questionsTotal: (n: number) => `✓ ${n} questões no total`,
    skills: '✓ Escuta, Gramática, Leitura e Vocabulário',
    difficulty: '✓ Dificuldade progressiva (Iniciante a C2)',
    duration: '✓ Dura cerca de 15 a 20 minutos',
    labelName: 'Seu nome completo *',
    placeholderName: 'Digite seu nome completo',
    labelWhatsapp: 'Número do WhatsApp *',
    placeholderWhatsapp: '55 11 99999-9999',
    whatsappHint: 'Usaremos isso para enviar seus resultados',
    disclaimer: 'Você será classificado do Iniciante ao nível C2 com base nas suas respostas.',
    startBtn: 'Começar Teste',
    fillIn: 'Preencha nome e WhatsApp',
    questionOf: (cur: number, total: number) => `Questão ${cur} de ${total}`,
    skillType: { listening: 'Escuta', reading: 'Leitura', vocabulary: 'Vocabulário', grammar: 'Gramática' },
    playAudio: 'Reproduzir',
    playing: 'Reproduzindo...',
    playHint: 'Pressione Reproduzir para ouvir o áudio e depois escolha sua resposta.',
    back: 'Voltar',
    next: 'Próximo',
    finish: 'Finalizar Teste',
    yourLevel: (l: string) => `Seu Nível: ${l}`,
    yourResults: 'Seus Resultados',
    correctOf: (c: number, t: number) => `${c}/${t} Corretas`,
    gotRight: (pct: number) => `Você acertou ${pct}% das questões`,
    recommended: '📍 Ponto de Partida Recomendado',
    contactTeacher: 'Contatar Professor no WhatsApp',
    createAccount: '📧 Criar Conta',
    startLearning: 'Começar a Aprender',
    idontknow: 'Não sei.',
    whatsappMessage: (name: string, wa: string, correct: number, total: number, pct: number, level: string, range: string, entry: string) =>
      `Olá! Acabei de completar o Teste de Nivelamento de Inglês.\n\nNome: ${name}\nWhatsApp: ${wa}\nPontuação: ${correct}/${total} (${pct}%)\nNível Estimado: ${level} — ${range}\nPonto de Partida Recomendado: ${entry}\n\nConcluí o teste e gostaria de receber meu relatório PDF detalhado com minhas respostas, erros e análise de nível.`,
    cefrDescription: (level: string) => ({
      Beginner: 'Você está no início da sua jornada no inglês. Foque em palavras básicas, cumprimentos e frases simples.',
      A1: 'Você entende e usa inglês muito básico. Consegue se apresentar e fazer perguntas simples.',
      A2: 'Você lida com situações cotidianas e conversas curtas. Continue construindo confiança com novo vocabulário e tempos verbais.',
      B1: 'Você discute tópicos familiares, expressa opiniões e acompanha pontos principais em conversas claras.',
      B2: 'Você tem sólido domínio do inglês e participa de discussões mais complexas com confiança.',
      C1: 'Você se expressa com fluência e espontaneidade, compreendendo textos e conversas sofisticados.',
      C2: 'Você tem proficiência quase nativa. Entende praticamente tudo e se expressa com precisão.',
    }[level] ?? CEFR_LEVELS[level as keyof typeof CEFR_LEVELS]?.description ?? ''),
    cefrRecommendation: (level: string) => ({
      Beginner: 'Comece do zero: cumprimentos básicos, números e palavras do dia a dia.',
      A1: 'Comece com gramática fundamental: o verbo "to be", pronomes e presente simples.',
      A2: 'Continue com passado simples, can/could, presente contínuo e conversas cotidianas.',
      B1: 'Foque em present perfect, condicionais, verbos modais e leitura de textos mais longos.',
      B2: 'Trabalhe com voz passiva, condicionais avançadas, marcadores discursivos e vocabulário acadêmico.',
      C1: 'Fortaleça modais perfeitos, inversão, vocabulário nuançado e escuta prolongada.',
      C2: 'Desafie-se com conteúdos avançados e especializados em inglês.',
    }[level] ?? CEFR_LEVELS[level as keyof typeof CEFR_LEVELS]?.recommendation ?? ''),
    cefrEntryPoint: (level: string) => CEFR_LEVELS[level as keyof typeof CEFR_LEVELS]?.entryPoint ?? '',
  },
  es: {
    title: 'Prueba de Nivel',
    subtitle: 'Descubre tu nivel de inglés',
    whatToExpect: 'Qué esperar:',
    questionsTotal: (n: number) => `✓ ${n} preguntas en total`,
    skills: '✓ Escucha, Gramática, Lectura y Vocabulario',
    difficulty: '✓ Dificultad progresiva (Principiante a C2)',
    duration: '✓ Dura unos 15-20 minutos',
    labelName: 'Tu nombre completo *',
    placeholderName: 'Escribe tu nombre completo',
    labelWhatsapp: 'Número de WhatsApp *',
    placeholderWhatsapp: '55 11 99999-9999',
    whatsappHint: 'Lo usaremos para enviarte tus resultados',
    disclaimer: 'Serás clasificado desde Principiante hasta el nivel C2 según tus respuestas.',
    startBtn: 'Comenzar Prueba',
    fillIn: 'Completa nombre y WhatsApp',
    questionOf: (cur: number, total: number) => `Pregunta ${cur} de ${total}`,
    skillType: { listening: 'Escucha', reading: 'Lectura', vocabulary: 'Vocabulario', grammar: 'Gramática' },
    playAudio: 'Reproducir',
    playing: 'Reproduciendo...',
    playHint: 'Pulsa Reproducir para escuchar el audio y elige tu respuesta.',
    back: 'Volver',
    next: 'Siguiente',
    finish: 'Finalizar Prueba',
    yourLevel: (l: string) => `Tu Nivel: ${l}`,
    yourResults: 'Tus Resultados',
    correctOf: (c: number, t: number) => `${c}/${t} Correctas`,
    gotRight: (pct: number) => `Respondiste correctamente el ${pct}% de las preguntas`,
    recommended: '📍 Punto de Partida Recomendado',
    contactTeacher: 'Contactar al Profesor por WhatsApp',
    createAccount: '📧 Crear Cuenta',
    startLearning: 'Empezar a Aprender',
    idontknow: 'No sé.',
    whatsappMessage: (name: string, wa: string, correct: number, total: number, pct: number, level: string, range: string, entry: string) =>
      `¡Hola! Acabo de completar la Prueba de Nivel de Inglés.\n\nNombre: ${name}\nWhatsApp: ${wa}\nPuntuación: ${correct}/${total} (${pct}%)\nNivel Estimado: ${level} — ${range}\nPunto de Partida Recomendado: ${entry}\n\nCompletó la prueba y me gustaría recibir mi informe PDF detallado con mis respuestas, errores y análisis de nivel.`,
    cefrDescription: (level: string) => ({
      Beginner: 'Estás al inicio de tu camino en inglés. Concéntrate en palabras básicas, saludos y frases simples.',
      A1: 'Puedes entender y usar inglés muy básico. Puedes presentarte y hacer preguntas simples.',
      A2: 'Manejas situaciones cotidianas y conversaciones cortas. Sigue ganando confianza con vocabulario nuevo y tiempos verbales.',
      B1: 'Puedes hablar de temas familiares, expresar opiniones y seguir los puntos principales en una conversación clara.',
      B2: 'Tienes un buen dominio del inglés y puedes participar en discusiones más complejas con confianza.',
      C1: 'Puedes expresarte con fluidez y espontaneidad, y comprender textos y conversaciones sofisticados.',
      C2: 'Tienes dominio casi nativo. Comprendes prácticamente todo y te expresas con precisión.',
    }[level] ?? CEFR_LEVELS[level as keyof typeof CEFR_LEVELS]?.description ?? ''),
    cefrRecommendation: (level: string) => ({
      Beginner: 'Empieza desde cero: saludos básicos, números y palabras del día a día.',
      A1: 'Comienza con gramática fundamental: el verbo "to be", pronombres y presente simple.',
      A2: 'Continúa con pasado simple, can/could, presente continuo y conversaciones cotidianas.',
      B1: 'Enfócate en el present perfect, condicionales, verbos modales y lectura de textos más largos.',
      B2: 'Trabaja con voz pasiva, condicionales avanzadas, marcadores del discurso y vocabulario académico.',
      C1: 'Fortalece los modales perfectos, la inversión, vocabulario matizado y comprensión auditiva extendida.',
      C2: 'Desafíate con contenido avanzado y especializado en inglés.',
    }[level] ?? CEFR_LEVELS[level as keyof typeof CEFR_LEVELS]?.recommendation ?? ''),
    cefrEntryPoint: (level: string) => CEFR_LEVELS[level as keyof typeof CEFR_LEVELS]?.entryPoint ?? '',
  },
} as const;

type PlacementUILang = 'en' | 'pt' | 'es';
const getUI = (lang: string) => {
  if (lang === 'pt') return PLACEMENT_UI.pt;
  if (lang === 'es') return PLACEMENT_UI.es;
  return PLACEMENT_UI.en;
};

interface PlacementTestProps {
  currentLanguage?: LessonLanguageCode;
  onComplete: (score: number, level: string) => void;
  onTriggerConversion?: (reason?: string) => void;
}

export const PlacementTest: React.FC<PlacementTestProps> = ({ currentLanguage = 'en', onComplete, onTriggerConversion }) => {
  // Resolve questions and UI strings for the active language.
  const questions = getQuestionsForLanguage(currentLanguage);
  const ui = getUI(currentLanguage);

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

  const playAudio = (text: string) => {
    speak(text, currentLanguage, {
      rate: 0.9,
      onEnd:   () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false),
    });
    setIsPlayingAudio(true);
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
        const answerBreakdown = finalAnswers.map((ans, i) => ({
          questionId: questions[i].id,
          prompt: questions[i].prompt,
          studentAnswer: ans !== null ? questions[i].options[ans] : null,
          correctAnswer: questions[i].options[questions[i].correctAnswerIndex],
          isCorrect: ans === questions[i].correctAnswerIndex,
          explanation: questions[i].explanation ?? null,
          grammarTopic: questions[i].grammarTopic ?? null,
          levelBand: questions[i].levelBand,
          skillType: questions[i].type,
        }));

        const placementRecord = {
          score: percentage,
          level,
          date: new Date().toISOString(),
          languageCode: currentLanguage,
          correctAnswers: correctCount,
          totalQuestions: questions.length,
          fullName: studentName,
          whatsapp: studentWhatsApp,
          answerBreakdown,
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
      const message = ui.whatsappMessage(
        studentName, studentWhatsApp,
        correctCount, questions.length, percentage,
        level, levelInfo.range,
        ui.cefrEntryPoint(level),
      );
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

            <h1 className="text-3xl font-bold text-blue-900 mb-2">{ui.yourLevel(level)}</h1>
            <p className="text-sm text-slate-500 mb-4">({levelInfo.range})</p>

            <p className="text-slate-700 text-sm leading-relaxed mb-6">{ui.cefrDescription(level)}</p>

            <div className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-200">
              <p className="text-sm font-semibold text-blue-900 mb-2">{ui.yourResults}</p>
              <p className="text-2xl font-bold text-blue-600 mb-1">{ui.correctOf(correctCount, questions.length)}</p>
              <p className="text-xs text-slate-600">{ui.gotRight(percentage)}</p>
            </div>

            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 mb-6">
              <p className="text-sm font-semibold text-amber-900 mb-1">{ui.recommended}</p>
              <p className="text-lg font-bold text-amber-700 mb-2">{ui.cefrEntryPoint(level)}</p>
              <p className="text-xs text-amber-800">{ui.cefrRecommendation(level)}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleContactTeacher}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <i className="fab fa-whatsapp text-xl"></i>
                {ui.contactTeacher}
              </button>

              {auth.currentUser?.isAnonymous && (
                <button
                  onClick={() => onTriggerConversion?.('Create an account to save your placement test score and progress.')}
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
                >
                  {ui.createAccount}
                </button>
              )}

              <button
                onClick={() => onComplete(percentage, level)}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                {ui.startLearning}
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
              <h1 className="text-3xl font-bold text-blue-900 mb-2">{ui.title}</h1>
              <p className="text-slate-500 text-sm">{ui.subtitle}</p>
            </div>

            <div className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-200 text-left">
              <h2 className="font-bold text-blue-900 text-sm mb-3">{ui.whatToExpect}</h2>
              <ul className="text-sm text-slate-700 space-y-2">
                <li>{ui.questionsTotal(questions.length)}</li>
                <li>{ui.skills}</li>
                <li>{ui.difficulty}</li>
                <li>{ui.duration}</li>
              </ul>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">{ui.labelName}</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder={ui.placeholderName}
                  className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">{ui.labelWhatsapp}</label>
                <input
                  type="tel"
                  value={studentWhatsApp}
                  onChange={(e) => setStudentWhatsApp(e.target.value.replace(/\D/g, ''))}
                  placeholder={ui.placeholderWhatsapp}
                  className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">{ui.whatsappHint}</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-6 text-center">{ui.disclaimer}</p>

            <button
              onClick={() => setTestStarted(true)}
              disabled={!isFormValid}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              {isFormValid ? ui.startBtn : ui.fillIn}
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
            <p className="text-sm font-semibold text-slate-700">{ui.questionOf(currentQuestionIndex + 1, questions.length)}</p>
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
              Part {currentQuestion.part} - {ui.skillType[currentQuestion.type as keyof typeof ui.skillType] ?? currentQuestion.type}
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
                {isPlayingAudio ? ui.playing : ui.playAudio}
              </button>
              <p className="text-xs text-slate-400 mt-2 text-center">{ui.playHint}</p>
            </div>
          )}

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              // The "I don't know" option is always last and styled differently.
              const isIDontKnow = index === currentQuestion.options.length - 1 &&
                ["I don't know", 'Não sei.', 'No sé.'].includes(option);
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
            {ui.back}
          </button>
          <button
            onClick={handleNext}
            disabled={selectedAnswer === null}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl disabled:shadow-none transition-all active:scale-95"
          >
            {currentQuestionIndex === questions.length - 1 ? ui.finish : ui.next}
          </button>
        </div>
      </div>
    </div>
  );
};