import { getPlacementBank } from '../models/placementIdentity.ts';
export type PlacementConfidence = 'sure' | 'maybe' | 'guess';

export interface PlacementQuestion {
  id: string;
  book: number;
  level: string;
  type: 'listening';
  prompt: string;
  audioText: string;
  options: [string, string, string, string];
  correctAnswerIndex: number;
  explanation?: string;
  grammarTopic?: string;
}

export interface PlacementResponse {
  questionId: string;
  answerIndex: number;
  confidence: PlacementConfidence;
}

export interface PlacementBookScore {
  book: number;
  level: string;
  score: number;
  maxScore: number;
  passed: boolean;
  percentage: number;
}

export interface PlacementOutcome {
  label: string;
  description: string;
  recommendation: string;
  entryPoint: string;
  range: string;
}

export interface PlacementEvaluation {
  level: string;
  percentage: number;
  recommendedBook: number | null;
  recommendedEntryPoint: string;
  stoppedAtBook: number | null;
  overallPoints: number;
  maxPoints: number;
  correctAnswers: number;
  totalQuestions: number;
  blockScores: PlacementBookScore[];
  completedAllBooks: boolean;
}

const PASSING_SCORE_PER_BOOK = 4;
const MAX_POINTS_PER_BOOK = 5;
const BALANCED_CORRECT_PATTERN: Array<0 | 1 | 2 | 3> = [0, 2, 3, 1];

export const CONFIDENCE_LABELS: Record<PlacementConfidence, string> = {
  sure: 'Tenho certeza',
  maybe: 'Acho que sei',
  guess: 'Vou chutar',
};

export const CONFIDENCE_SCORES: Record<PlacementConfidence, { correct: number; incorrect: number }> = {
  sure: { correct: 1, incorrect: -0.5 },
  maybe: { correct: 0.7, incorrect: -0.2 },
  guess: { correct: 0.3, incorrect: 0 },
};

const OUTCOME_BY_BOOK: Record<number, PlacementOutcome> = {
  1: {
    label: 'Book 1',
    description: 'You should start with the first Learnendo book and strengthen the foundations of English.',
    recommendation: 'Start in Book 1 and focus on basic identification, numbers, and simple structures.',
    entryPoint: 'Book 1',
    range: 'A1 Initial',
  },
  2: {
    label: 'Book 2',
    description: 'You already handle the first block and are ready for basic daily communication.',
    recommendation: 'Start in Book 2 and reinforce present simple questions, routines, and short answers.',
    entryPoint: 'Book 2',
    range: 'A1 Basic',
  },
  3: {
    label: 'Book 3',
    description: 'You can move into early A2 content with more confidence in past forms.',
    recommendation: 'Start in Book 3 and focus on past simple comprehension and basic translations.',
    entryPoint: 'Book 3',
    range: 'A2 Initial',
  },
  4: {
    label: 'Book 4',
    description: 'You are ready for stronger A2 work, including continuous forms and future plans.',
    recommendation: 'Start in Book 4 and consolidate comparisons, ongoing actions, and future intentions.',
    entryPoint: 'Book 4',
    range: 'A2 Strong',
  },
  5: {
    label: 'Book 5',
    description: 'Your listening already supports early B1 content and longer structures.',
    recommendation: 'Start in Book 5 and deepen present perfect, duration, and first conditional patterns.',
    entryPoint: 'Book 5',
    range: 'B1 Initial',
  },
  6: {
    label: 'Book 6',
    description: 'You are comfortable with B1 material and can move into more nuanced grammar.',
    recommendation: 'Start in Book 6 and work on conditionals, advice, and passive voice.',
    entryPoint: 'Book 6',
    range: 'B1 Strong',
  },
  7: {
    label: 'Book 7',
    description: 'You are ready for B2 structures such as reported ideas and relative clauses.',
    recommendation: 'Start in Book 7 and refine complex past narratives and connectors.',
    entryPoint: 'Book 7',
    range: 'B2 Initial',
  },
  8: {
    label: 'Book 8',
    description: 'You can handle stronger B2 listening and advanced conditional meanings.',
    recommendation: 'Start in Book 8 and strengthen hypotheticals, wishes, and advanced passive structures.',
    entryPoint: 'Book 8',
    range: 'B2 Strong',
  },
  9: {
    label: 'Book 9',
    description: 'You reached the advanced block and should start with Learnendo Book 9.',
    recommendation: 'Start in Book 9 and focus on higher-level inference, nuance, and academic listening.',
    entryPoint: 'Book 9',
    range: 'C1',
  },
};

export const ADVANCED_OUTCOME: PlacementOutcome = {
  label: 'Advanced / Conversation / C1',
  description: 'You successfully finished the full placement and are ready for advanced conversation work.',
  recommendation: 'Continue with advanced conversation, fluency, and C1-level listening and discussion practice.',
  entryPoint: 'Advanced / Conversation / C1',
  range: 'Advanced',
};

function q(
  id: string,
  book: number,
  level: string,
  audioText: string,
  options: [string, string, string, string],
  correctAnswerIndex: number,
  explanation?: string,
  grammarTopic?: string,
): PlacementQuestion {
  return {
    id,
    book,
    level,
    type: 'listening',
    prompt: 'Listen to the audio and choose the best answer.',
    audioText,
    options,
    correctAnswerIndex,
    explanation,
    grammarTopic,
  };
}

const BASE_PLACEMENT_TEST_QUESTIONS: PlacementQuestion[] = [
  q('pt_b1_q1', 1, 'A1 Initial', 'What is your name?', ['My name is John.', 'I am ten years old.', 'I live in Brazil.', 'It is a book.'], 0, 'The audio asks for a name, so the correct answer is a self-introduction.', 'Basic Identification'),
  q('pt_b1_q2', 1, 'A1 Initial', 'How old are you?', ['I am fine.', 'I am twelve years old.', 'My name is Anna.', 'This is a pen.'], 1, 'The question asks about age, so the answer must give an age.', 'Age / To Be'),
  q('pt_b1_q3', 1, 'A1 Initial', 'Is this a letter or a number?', ['It is a letter.', 'I am a student.', 'He likes pizza.', 'She is at home.'], 0, 'The audio asks for a classification, and only one option answers that directly.', 'Basic Classification'),
  q('pt_b1_q4', 1, 'A1 Initial', 'What number is this? Twenty-one.', ['12', '20', '21', '31'], 2, 'The audio clearly says twenty-one.', 'Numbers'),
  q('pt_b1_q5', 1, 'A1 Initial', 'This is an apple.', ['This is a apple.', 'This is an apple.', 'These is an apple.', 'This are an apple.'], 1, 'The correct sentence uses "an" before a vowel sound.', 'Articles'),

  q('pt_b2_q1', 2, 'A1 Basic', 'Do you like pizza?', ['Yes, I do.', 'Yes, I does.', 'Yes, I am.', 'Yes, I like.'], 0, 'Short answers with "do" must match the auxiliary in the question.', 'Present Simple'),
  q('pt_b2_q2', 2, 'A1 Basic', 'Does he play soccer?', ['Yes, he do.', 'Yes, he does.', 'Yes, she does.', 'Yes, he play.'], 1, 'With "does", the correct short answer is "Yes, he does."', 'Present Simple'),
  q('pt_b2_q3', 2, 'A1 Basic', 'Where do you live?', ['I live in Brazil.', 'I am fine.', 'I like apples.', 'He lives here.'], 0, 'The question asks about place, so the answer must say where the speaker lives.', 'Present Simple'),
  q('pt_b2_q4', 2, 'A1 Basic', 'She works at school.', ['Ela trabalha na escola.', 'Ela trabalhou na escola.', 'Ela vai trabalhar na escola.', 'Ela esta trabalhando agora.'], 0, 'The sentence is in the present simple and means she works there in general.', 'Present Simple'),
  q('pt_b2_q5', 2, 'A1 Basic', 'What time do you wake up?', ['I wake up at seven.', 'I am seven.', 'I like seven.', 'I live at seven.'], 0, 'The answer must give a time for the routine.', 'Daily Routines'),

  q('pt_b3_q1', 3, 'A2 Initial', 'What did you do yesterday?', ['I play soccer.', 'I played soccer.', 'I am playing soccer.', 'I have played soccer.'], 1, 'The time marker "yesterday" requires past simple.', 'Past Simple'),
  q('pt_b3_q2', 3, 'A2 Initial', 'Were you at home last night?', ['Yes, I was.', 'Yes, I were.', 'Yes, I am.', 'Yes, I did.'], 0, 'Past questions with "were" take short answers with "was/were".', 'Past Of To Be'),
  q('pt_b3_q3', 3, 'A2 Initial', 'Did she go to school?', ['Yes, she go.', 'Yes, she goes.', 'Yes, she did.', 'Yes, she was.'], 2, 'Past simple yes/no questions use "did" in the short answer.', 'Past Simple'),
  q('pt_b3_q4', 3, 'A2 Initial', 'It rained yesterday.', ['Esta chovendo agora.', 'Choveu ontem.', 'Vai chover amanha.', 'Tem chovido.'], 1, 'The sentence describes a finished action yesterday.', 'Past Simple'),
  q('pt_b3_q5', 3, 'A2 Initial', 'I didn’t watch TV last night.', ['Eu assisti TV ontem.', 'Eu nao assisti TV ontem a noite.', 'Eu nao assisto TV.', 'Eu estou assistindo TV.'], 1, 'The negative in past simple means the speaker did not watch TV last night.', 'Past Simple'),

  q('pt_b4_q1', 4, 'A2 Strong', 'What are you doing now?', ['I study every day.', 'I studied yesterday.', 'I am studying now.', 'I will study tomorrow.'], 2, 'The question asks about an action happening now, so present continuous is needed.', 'Present Continuous'),
  q('pt_b4_q2', 4, 'A2 Strong', 'It is raining now.', ['Esta chovendo agora.', 'Choveu ontem.', 'Vai chover.', 'Chove todos os dias.'], 0, 'The sentence describes an action in progress now.', 'Present Continuous'),
  q('pt_b4_q3', 4, 'A2 Strong', 'I am going to travel tomorrow.', ['Eu viajei ontem.', 'Eu viajo todos os dias.', 'Eu vou viajar amanha.', 'Eu estou viajando agora.'], 2, 'The structure "going to" signals a future plan.', 'Going To'),
  q('pt_b4_q4', 4, 'A2 Strong', 'This car is faster than that car.', ['Este carro e mais rapido que aquele.', 'Este carro e o mais rapido.', 'Aquele carro e mais rapido.', 'Este carro e lento.'], 0, 'The sentence compares two cars using the comparative form.', 'Comparatives'),
  q('pt_b4_q5', 4, 'A2 Strong', 'Have you ever eaten Japanese food?', ['Yes, I did.', 'Yes, I have.', 'Yes, I am.', 'Yes, I eat.'], 1, 'Present perfect questions take answers with "have".', 'Present Perfect'),

  q('pt_b5_q1', 5, 'B1 Initial', 'How long have you lived here?', ['Since 2020.', 'Tomorrow.', 'Yesterday.', 'Every day.'], 0, 'The question asks about duration, and "since 2020" gives a starting point in time.', 'Present Perfect'),
  q('pt_b5_q2', 5, 'B1 Initial', 'I have lived here for five years.', ['Moro aqui ha cinco anos.', 'Morei aqui ontem.', 'Vou morar aqui.', 'Estou morando agora.'], 0, 'The sentence connects the past to the present and expresses duration.', 'Present Perfect'),
  q('pt_b5_q3', 5, 'B1 Initial', 'It has been raining since morning.', ['Choveu de manha.', 'Esta chovendo desde a manha.', 'Vai chover de manha.', 'Chove todos os dias.'], 1, 'The action started in the morning and continues now.', 'Present Perfect'),
  q('pt_b5_q4', 5, 'B1 Initial', 'If it rains tomorrow, I will stay home.', ['Se chover amanha, ficarei em casa.', 'Se chovesse amanha, eu ficaria em casa.', 'Se tivesse chovido, eu teria ficado.', 'Choveu e fiquei em casa.'], 0, 'This is a first conditional about a real future possibility.', 'First Conditional'),
  q('pt_b5_q5', 5, 'B1 Initial', 'She has already finished her homework.', ['Ela ainda nao terminou.', 'Ela ja terminou a licao.', 'Ela vai terminar.', 'Ela esta terminando agora.'], 1, 'The adverb "already" shows the homework is complete.', 'Present Perfect'),

  q('pt_b6_q1', 6, 'B1 Strong', 'What would you do if you won the lottery?', ['I buy a house.', 'I bought a house.', 'I would buy a house.', 'I have bought a house.'], 2, 'The question uses the second conditional, so the answer needs "would".', 'Second Conditional'),
  q('pt_b6_q2', 6, 'B1 Strong', 'If I had more time, I would study more.', ['Se eu tiver mais tempo, estudarei mais.', 'Se eu tivesse mais tempo, eu estudaria mais.', 'Se eu tive mais tempo, estudei.', 'Tenho mais tempo para estudar.'], 1, 'This is a hypothetical present situation, so the translation uses the second conditional.', 'Second Conditional'),
  q('pt_b6_q3', 6, 'B1 Strong', 'You should see a doctor.', ['Voce viu um medico.', 'Voce deveria procurar um medico.', 'Voce vera um medico.', 'Voce esta vendo um medico.'], 1, 'The modal "should" gives advice.', 'Modals'),
  q('pt_b6_q4', 6, 'B1 Strong', 'English is spoken in many countries.', ['Ingles fala muitos paises.', 'Ingles e falado em muitos paises.', 'Ingles falou em muitos paises.', 'Ingles sera falado amanha.'], 1, 'The sentence is in the passive voice.', 'Passive Voice'),
  q('pt_b6_q5', 6, 'B1 Strong', 'This book was written in 1998.', ['Este livro escreveu em 1998.', 'Este livro foi escrito em 1998.', 'Este livro esta escrevendo.', 'Este livro sera escrito.'], 1, 'Past passive uses "was written".', 'Passive Voice'),

  q('pt_b7_q1', 7, 'B2 Initial', 'By the time we arrived, they had already left.', ['Eles sairam depois que chegamos.', 'Eles ja tinham saído quando chegamos.', 'Eles estavam saindo quando chegamos.', 'Eles vao sair quando chegarmos.'], 1, 'Past perfect shows the leaving happened before the arrival.', 'Past Perfect'),
  q('pt_b7_q2', 7, 'B2 Initial', 'She said that she was tired.', ['Ela diz que esta cansada.', 'Ela disse que estava cansada.', 'Ela dira que esta cansada.', 'Ela esta dizendo que cansou.'], 1, 'This sentence reports what she said in the past.', 'Reported Speech'),
  q('pt_b7_q3', 7, 'B2 Initial', 'The man who called you is my teacher.', ['O homem que ligou para voce e meu professor.', 'O homem ligou porque e professor.', 'Meu professor ligara para o homem.', 'O homem chamou meu professor.'], 0, 'The relative clause identifies the man.', 'Relative Clauses'),
  q('pt_b7_q4', 7, 'B2 Initial', 'I had never seen that movie before.', ['Eu nunca tinha visto aquele filme antes.', 'Eu nunca verei aquele filme.', 'Eu nao vejo filmes.', 'Eu tinha visto aquele filme ontem.'], 0, 'The structure expresses a previous experience before another past moment.', 'Past Perfect'),
  q('pt_b7_q5', 7, 'B2 Initial', 'Although it was raining, we went out.', ['Porque estava chovendo, saimos.', 'Embora estivesse chovendo, saimos.', 'Se chover, sairemos.', 'Nao saimos porque choveu.'], 1, 'Although introduces contrast, not cause.', 'Connectors'),

  q('pt_b8_q1', 8, 'B2 Strong', 'If it had stopped raining earlier, we would have gone out.', ['Se parasse de chover, sairiamos.', 'Se tivesse parado de chover mais cedo, teriamos saído.', 'Se parar de chover, vamos sair.', 'Como parou de chover, saimos.'], 1, 'This is a third conditional about an unreal past situation.', 'Third Conditional'),
  q('pt_b8_q2', 8, 'B2 Strong', 'The project would have succeeded if the team had communicated better.', ['O projeto teria dado certo se a equipe tivesse se comunicado melhor.', 'O projeto dara certo se a equipe se comunicar melhor.', 'O projeto deu certo porque a equipe se comunicou.', 'O projeto esta dando certo agora.'], 0, 'The sentence describes a hypothetical past result.', 'Third Conditional'),
  q('pt_b8_q3', 8, 'B2 Strong', 'Despite being tired, he kept working.', ['Apesar de estar cansado, ele continuou trabalhando.', 'Porque estava cansado, parou.', 'Ele continuou porque nao estava cansado.', 'Ele trabalhou para ficar cansado.'], 0, 'Despite introduces contrast with the action that followed.', 'Connectors'),
  q('pt_b8_q4', 8, 'B2 Strong', 'I wish I had studied more.', ['Eu gostaria de estudar mais agora.', 'Eu queria ter estudado mais.', 'Eu estudarei mais.', 'Eu estudo mais todos os dias.'], 1, 'This expresses regret about the past.', 'Wish / Regret'),
  q('pt_b8_q5', 8, 'B2 Strong', 'The decision has been criticized by many experts.', ['A decisao criticou muitos especialistas.', 'A decisao foi criticada por muitos especialistas.', 'Os especialistas decidiram criticar.', 'A decisao criticara os especialistas.'], 1, 'The sentence uses present perfect passive.', 'Passive Voice'),

  q('pt_b9_q1', 9, 'C1', 'The speaker implies that technology can improve communication, but only when people use it intentionally.', ['A tecnologia sempre melhora a comunicacao.', 'A tecnologia nunca ajuda.', 'A tecnologia pode ajudar, mas depende do uso consciente.', 'A comunicacao nao depende de tecnologia.'], 2, 'The key idea is not unlimited benefit but intentional use.', 'Inference'),
  q('pt_b9_q2', 9, 'C1', 'Had I known about the problem, I would have helped you earlier.', ['Se eu soubesse do problema agora, ajudaria.', 'Se eu tivesse sabido do problema, teria ajudado antes.', 'Eu sabia do problema e ajudei.', 'Eu saberei do problema e ajudarei.'], 1, 'This is an inverted third conditional.', 'Advanced Conditionals'),
  q('pt_b9_q3', 9, 'C1', 'Not only did she finish the report, but she also presented it perfectly.', ['Ela nao terminou o relatorio.', 'Ela terminou o relatorio, mas apresentou mal.', 'Ela nao apenas terminou o relatorio, como tambem o apresentou perfeitamente.', 'Ela apresentou o relatorio antes de terminar.'], 2, 'The structure emphasizes two achievements using inversion.', 'Advanced Structure'),
  q('pt_b9_q4', 9, 'C1', 'The issue is far more complicated than it first appears.', ['O problema e mais simples do que parece.', 'O problema e muito mais complicado do que parece inicialmente.', 'O problema apareceu primeiro.', 'O problema nao e complicado.'], 1, 'The sentence highlights hidden complexity.', 'Inference'),
  q('pt_b9_q5', 9, 'C1', 'He tends to avoid confrontation, even when speaking up would be necessary.', ['Ele sempre confronta as pessoas.', 'Ele evita confronto, mesmo quando deveria se posicionar.', 'Ele fala demais em conflitos.', 'Ele nunca evita problemas.'], 1, 'The main idea is avoidance despite the need to speak up.', 'Inference'),
];

export const PLACEMENT_TEST_QUESTIONS: PlacementQuestion[] = buildBalancedQuestions(BASE_PLACEMENT_TEST_QUESTIONS);

export function getQuestionsForLanguage(languageCode: string): PlacementQuestion[] {
  return getPlacementBank(languageCode) ? PLACEMENT_TEST_QUESTIONS : [];
}

export function getPlacementOutcomeByBook(book: number): PlacementOutcome {
  return OUTCOME_BY_BOOK[book] ?? OUTCOME_BY_BOOK[1];
}

export function getPlacementOutcome(level: string): PlacementOutcome {
  if (level === ADVANCED_OUTCOME.label) return ADVANCED_OUTCOME;
  const match = Object.values(OUTCOME_BY_BOOK).find((item) => item.label === level || item.entryPoint === level);
  return match ?? OUTCOME_BY_BOOK[1];
}

export function scorePlacementAnswer(
  isCorrect: boolean,
  confidence: PlacementConfidence,
): number {
  const weights = CONFIDENCE_SCORES[confidence];
  return isCorrect ? weights.correct : weights.incorrect;
}

export function evaluatePlacementTest(
  responses: PlacementResponse[],
  questions: PlacementQuestion[] = PLACEMENT_TEST_QUESTIONS,
): PlacementEvaluation {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const groupedScores = new Map<number, PlacementBookScore>();
  let overallPoints = 0;
  let correctAnswers = 0;

  for (const response of responses) {
    const question = byId.get(response.questionId);
    if (!question) continue;

    const isCorrect = response.answerIndex === question.correctAnswerIndex;
    const awardedPoints = scorePlacementAnswer(isCorrect, response.confidence);

    overallPoints += awardedPoints;
    if (isCorrect) correctAnswers += 1;

    const existing = groupedScores.get(question.book) ?? {
      book: question.book,
      level: question.level,
      score: 0,
      maxScore: MAX_POINTS_PER_BOOK,
      passed: false,
      percentage: 0,
    };

    existing.score = roundToOneDecimal(existing.score + awardedPoints);
    groupedScores.set(question.book, existing);
  }

  const attemptedBooks = Array.from(groupedScores.values())
    .sort((left, right) => left.book - right.book)
    .map((block) => ({
      ...block,
      score: roundToOneDecimal(block.score),
      passed: block.score >= PASSING_SCORE_PER_BOOK,
      percentage: buildBookPercentage(block.score, block.maxScore),
    }));

  const completedAllBooks = attemptedBooks.length === 9;
  const recommendedBook = resolveRecommendedBook(attemptedBooks);
  const outcome = recommendedBook === null
    ? ADVANCED_OUTCOME
    : getPlacementOutcomeByBook(recommendedBook);
  const maxPoints = attemptedBooks.length * MAX_POINTS_PER_BOOK;
  const percentage = maxPoints > 0
    ? Math.max(0, Math.round((overallPoints / maxPoints) * 100))
    : 0;

  return {
    level: outcome.label,
    percentage,
    recommendedBook,
    recommendedEntryPoint: outcome.entryPoint,
    stoppedAtBook: attemptedBooks[attemptedBooks.length - 1]?.book ?? null,
    overallPoints: roundToOneDecimal(overallPoints),
    maxPoints,
    correctAnswers,
    totalQuestions: responses.length,
    blockScores: attemptedBooks,
    completedAllBooks,
  };
}

function resolveRecommendedBook(blockScores: PlacementBookScore[]): number | null {
  if (!blockScores.length) return 1;

  let highestConsistentBook = 1;

  for (let index = 0; index < blockScores.length; index += 1) {
    const current = blockScores[index];
    const previous = blockScores[index - 1];
    const rollingAverage = previous
      ? (previous.percentage + current.percentage) / 2
      : current.percentage;

    const currentStrongEnough = current.percentage >= 60;
    const rollingStableEnough = rollingAverage >= 70;

    if (currentStrongEnough && rollingStableEnough) {
      highestConsistentBook = current.book;
    }
  }

  const lastBook = blockScores[blockScores.length - 1];
  if (
    lastBook?.book === 9
    && highestConsistentBook === 9
    && lastBook.percentage >= 80
    && blockScores.filter((block) => block.percentage >= 60).length >= 8
  ) {
    return null;
  }

  return highestConsistentBook;
}

function buildBookPercentage(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((score / maxScore) * 100)));
}

function buildBalancedQuestions(questions: PlacementQuestion[]): PlacementQuestion[] {
  return questions.map((question, index) => moveCorrectAnswerToTarget(question, BALANCED_CORRECT_PATTERN[index % BALANCED_CORRECT_PATTERN.length]));
}

function moveCorrectAnswerToTarget(
  question: PlacementQuestion,
  targetIndex: 0 | 1 | 2 | 3,
): PlacementQuestion {
  if (question.correctAnswerIndex === targetIndex) {
    return {
      ...question,
      options: [...question.options] as [string, string, string, string],
    };
  }

  const nextOptions = [...question.options] as [string, string, string, string];
  const currentCorrect = question.correctAnswerIndex;
  const targetValue = nextOptions[targetIndex];
  nextOptions[targetIndex] = nextOptions[currentCorrect];
  nextOptions[currentCorrect] = targetValue;

  return {
    ...question,
    options: nextOptions,
    correctAnswerIndex: targetIndex,
  };
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export const CEFR_LEVELS = {
  ...Object.fromEntries(
    Object.values(OUTCOME_BY_BOOK).map((outcome) => [
      outcome.label,
      {
        range: outcome.range,
        description: outcome.description,
        recommendation: outcome.recommendation,
        entryPoint: outcome.entryPoint,
      },
    ]),
  ),
  [ADVANCED_OUTCOME.label]: {
    range: ADVANCED_OUTCOME.range,
    description: ADVANCED_OUTCOME.description,
    recommendation: ADVANCED_OUTCOME.recommendation,
    entryPoint: ADVANCED_OUTCOME.entryPoint,
  },
} as const;
