import { Lesson } from "../../types";
import { buildLesson, ChoiceSeed, makeChoices, makeSpeakings, makeWritings, SpeakingSeed, WritingSeed } from "./helpers";
import { buildBlankAudioText, buildFullSentenceFromPrompt, hasBlankPlaceholder } from "../../utils/fillInBlankAudio";

const VOCABULARY_INSTRUCTION = "Listen and choose the correct word.";
const GRAMMAR_INSTRUCTION = "Listen and choose the correct option.";
const RECOGNITION_INSTRUCTION = "Listen and choose the correct answer.";
const SPEAK_REPEAT = "Listen and repeat.";
const SPEAK_MODEL_INSTRUCTION = "Choose the model sentence before saying it aloud.";
const WRITE_BLANK = "Complete the sentence.";
const READ_INSTRUCTION = "Read and choose the correct answer.";

interface VocabItem {
  term: string;
  clue: string;
  prompt: string;
  distractors: string[];
}

interface CorrectionItem {
  wrongSentence: string;
  correctSentence: string;
  options: string[];
}

interface GrammarItem {
  prompt: string;
  answer: string;
  options: string[];
  fullSentence: string;
  accepted?: string[];
  correction?: CorrectionItem;
}

interface ListeningItem {
  sentence: string;
  focusQuestion: string;
  focusAnswer: string;
  focusDistractors: string[];
  meaningQuestion: string;
  meaningAnswer: string;
  meaningDistractors: string[];
}

interface FactItem {
  passage: string;
  question: string;
  answer: string;
  distractors: string[];
  detailQuestion: string;
  detailAnswer: string;
  detailDistractors: string[];
  vocabQuestion: string;
  vocabAnswer: string;
  vocabDistractors: string[];
}

interface PromptItem {
  prompt: string;
  answer: string;
  accepted?: string[];
}

interface WritingTransform {
  display: string;
  audio: string;
  correct: string;
  accepted?: string[];
}

interface LessonConfig {
  number: number;
  title: string;
  vocab: VocabItem[];
  grammar: GrammarItem[];
  listening: ListeningItem[];
  speakingPrompts: PromptItem[];
  writing: WritingTransform[];
  facts: FactItem[];
}

const v = (term: string, clue: string, prompt: string, distractors: string[]): VocabItem => ({
  term,
  clue,
  prompt,
  distractors,
});

const c = (wrongSentence: string, correctSentence: string, options: string[]): CorrectionItem => ({
  wrongSentence,
  correctSentence,
  options,
});

const g = (
  prompt: string,
  answer: string,
  options: string[],
  fullSentence: string,
  correction?: CorrectionItem,
  accepted?: string[],
): GrammarItem => ({
  prompt,
  answer,
  options,
  fullSentence,
  correction,
  accepted,
});

const l = (
  sentence: string,
  focusQuestion: string,
  focusAnswer: string,
  focusDistractors: string[],
  meaningQuestion: string,
  meaningAnswer: string,
  meaningDistractors: string[],
): ListeningItem => ({
  sentence,
  focusQuestion,
  focusAnswer,
  focusDistractors,
  meaningQuestion,
  meaningAnswer,
  meaningDistractors,
});

const f = (
  passage: string,
  question: string,
  answer: string,
  distractors: string[],
  detailQuestion: string,
  detailAnswer: string,
  detailDistractors: string[],
  vocabQuestion: string,
  vocabAnswer: string,
  vocabDistractors: string[],
): FactItem => ({
  passage,
  question,
  answer,
  distractors,
  detailQuestion,
  detailAnswer,
  detailDistractors,
  vocabQuestion,
  vocabAnswer,
  vocabDistractors,
});

const s = (prompt: string, answer: string, accepted?: string[]): PromptItem => ({
  prompt,
  answer,
  accepted,
});

const w = (display: string, audio: string, correct: string, accepted?: string[]): WritingTransform => ({
  display,
  audio,
  correct,
  accepted,
});

function optionsFor(correct: string, distractors: string[]): string[] {
  const options = [correct, ...distractors].filter((value, index, values) => value && values.indexOf(value) === index);
  if (options.length < 4) {
    throw new Error(`Exercise "${correct}" needs at least four unique options.`);
  }
  return options.slice(0, 4);
}

function choice(
  display: string,
  audio: string,
  correct: string,
  distractors: string[],
  type: "multiple-choice" | "identification" = "multiple-choice",
  accepted?: string[],
): ChoiceSeed {
  const promptText = display || audio;
  const hasBlank = hasBlankPlaceholder(promptText);
  return {
    display,
    audio,
    audioBeforeAnswer: hasBlank ? buildBlankAudioText(promptText) : undefined,
    correct,
    fullSentenceAfterAnswer: hasBlank ? buildFullSentenceFromPrompt(promptText, correct) : undefined,
    options: optionsFor(correct, distractors),
    type,
    accepted,
  };
}

function speaking(display: string, audio: string, correct: string, accepted?: string[]): SpeakingSeed {
  return { display, audio, correct, accepted };
}

function buildVocabularySeeds(vocab: VocabItem[]): ChoiceSeed[] {
  const meaningSeeds = vocab.slice(0, 5).map((item, index) =>
    choice(
      `Which word matches this meaning?\n${item.clue}`,
      `Which word matches this meaning? ${item.clue}`,
      item.term,
      [
        vocab[(index + 2) % vocab.length].term,
        vocab[(index + 4) % vocab.length].term,
        vocab[(index + 6) % vocab.length].term,
      ],
      "identification",
    ),
  );

  const sentenceSeeds = vocab.slice(5, 10).map((item) =>
    choice(item.prompt, item.prompt, item.term, item.distractors),
  );

  const clueSeeds = vocab.slice(0, 5).map((item, index) =>
    choice(
      `What does "${item.term}" mean?`,
      `What does ${item.term} mean?`,
      item.clue,
      [
        vocab[(index + 5) % vocab.length].clue,
        vocab[(index + 6) % vocab.length].clue,
        vocab[(index + 7) % vocab.length].clue,
      ],
    ),
  );

  return [...meaningSeeds, ...sentenceSeeds, ...clueSeeds];
}

function buildGrammarSeeds(grammar: GrammarItem[]): ChoiceSeed[] {
  const baseSeeds = grammar.map((item) =>
    choice(item.prompt, item.fullSentence, item.answer, item.options.filter((option) => option !== item.answer), "multiple-choice", item.accepted),
  );

  const correctionSeeds = grammar.slice(0, 5).map((item) => {
    if (!item.correction) {
      throw new Error(`Lesson grammar item "${item.fullSentence}" is missing a correction seed.`);
    }

    return choice(
      `Choose the correct sentence.\n${item.correction.wrongSentence}`,
      item.correction.correctSentence,
      item.correction.correctSentence,
      item.correction.options.filter((option) => option !== item.correction?.correctSentence),
    );
  });

  return [...baseSeeds, ...correctionSeeds];
}

function buildRecognitionSeeds(listening: ListeningItem[]): ChoiceSeed[] {
  const sentenceSeeds = listening.map((item, index) =>
    choice(
      "Which sentence did you hear?",
      item.sentence,
      item.sentence,
      [
        listening[(index + 1) % listening.length].sentence,
        listening[(index + 2) % listening.length].sentence,
        listening[(index + 3) % listening.length].sentence,
      ],
    ),
  );

  const focusSeeds = listening.map((item) =>
    choice(item.focusQuestion, item.sentence, item.focusAnswer, item.focusDistractors),
  );

  const meaningSeeds = listening.map((item) =>
    choice(item.meaningQuestion, item.sentence, item.meaningAnswer, item.meaningDistractors),
  );

  return [...sentenceSeeds, ...focusSeeds, ...meaningSeeds];
}

function buildReadingSeeds(facts: FactItem[]): ChoiceSeed[] {
  const directSeeds = facts.map((item) =>
    choice(`${item.passage}\n\nQuestion: ${item.question}`, item.question, item.answer, item.distractors),
  );

  const detailSeeds = facts.map((item) =>
    choice(`${item.passage}\n\nQuestion: ${item.detailQuestion}`, item.detailQuestion, item.detailAnswer, item.detailDistractors),
  );

  const vocabSeeds = facts.map((item) =>
    choice(`${item.passage}\n\nQuestion: ${item.vocabQuestion}`, item.vocabQuestion, item.vocabAnswer, item.vocabDistractors),
  );

  return [...directSeeds, ...detailSeeds, ...vocabSeeds];
}

function buildSpeakingSequenceExercises(prompts: PromptItem[]): ExerciseInput[] {
  const fallbackAnswers = prompts.map((item) => item.answer);
  const sequence = prompts.flatMap((item) => {
    const recognition = makeChoices([
      choice(
        item.prompt,
        item.answer,
        item.answer,
        fallbackAnswers.filter((answer) => answer !== item.answer),
        "identification",
        item.accepted,
      ),
    ], SPEAK_MODEL_INSTRUCTION, "identification").map((exercise) => ({
      ...exercise,
      instruction: SPEAK_MODEL_INSTRUCTION,
    }));

    const shadowing = makeSpeakings([
      speaking(item.answer, item.answer, item.answer, item.accepted),
    ], SPEAK_REPEAT).map((exercise) => ({
      ...exercise,
      instruction: `Say: ${item.answer}`,
      fullSentenceAfterAnswer: item.answer,
    }));

    return [...recognition, ...shadowing];
  });

  if (sequence.length !== 10) {
    throw new Error(`Speaking sequence must have exactly 10 exercises, got ${sequence.length}.`);
  }

  return sequence;
}

function buildWritingSeeds(grammar: GrammarItem[], writing: WritingTransform[]): WritingSeed[] {
  const grammarSeeds = grammar.map((item) => ({
    display: item.prompt,
    audio: item.fullSentence,
    audioBeforeAnswer: hasBlankPlaceholder(item.prompt) ? buildBlankAudioText(item.prompt) : undefined,
    correct: item.answer,
    accepted: item.accepted,
    fullSentenceAfterAnswer: item.fullSentence,
  }));

  return [
    ...grammarSeeds,
    ...writing.map((item) => ({
      display: item.display,
      audio: item.audio,
      audioBeforeAnswer: hasBlankPlaceholder(item.display) ? buildBlankAudioText(item.display) : undefined,
      correct: item.correct,
      accepted: item.accepted,
      fullSentenceAfterAnswer: item.audio,
    })),
  ];
}

function buildReviewSeeds(vocab: VocabItem[], grammar: GrammarItem[], facts: FactItem[]): ChoiceSeed[] {
  const vocabReview = vocab.slice(0, 5).map((item) =>
    choice(item.prompt, item.prompt, item.term, item.distractors),
  );

  const grammarReview = grammar.slice(0, 5).map((item) =>
    choice(item.prompt, item.fullSentence, item.answer, item.options.filter((option) => option !== item.answer)),
  );

  const factReview = facts.slice(0, 5).map((item) =>
    choice(item.question, item.question, item.answer, item.distractors),
  );

  return [...vocabReview, ...grammarReview, ...factReview];
}

function buildWorkbook7Lesson(config: LessonConfig): Lesson {
  const vocabularyExercises = makeChoices(buildVocabularySeeds(config.vocab), VOCABULARY_INSTRUCTION);
  const grammarExercises = makeChoices(buildGrammarSeeds(config.grammar), GRAMMAR_INSTRUCTION);
  const recognitionExercises = makeChoices(buildRecognitionSeeds(config.listening), RECOGNITION_INSTRUCTION);
  const speakingExercises = buildSpeakingSequenceExercises(config.speakingPrompts);
  const writingExercises = makeWritings(buildWritingSeeds(config.grammar, config.writing), WRITE_BLANK);
  const readingExercises = makeChoices(buildReadingSeeds(config.facts), READ_INSTRUCTION);
  const reviewExercises = makeChoices(buildReviewSeeds(config.vocab, config.grammar, config.facts), READ_INSTRUCTION);

  return buildLesson(config.number, config.title, [
    { type: "practice", exercises: vocabularyExercises },
    { type: "practice", exercises: grammarExercises },
    { type: "practice", exercises: recognitionExercises },
    { type: "practice", exercises: speakingExercises },
    { type: "practice", exercises: writingExercises },
    { type: "practice", exercises: readingExercises },
    { type: "review", exercises: reviewExercises },
  ]);
}

const workbook7Configs: LessonConfig[] = [
  {
    number: 73,
    title: "Lesson 73: Should, Had Better and Ought To",
    vocab: [
      v("advice", "an opinion about what someone should do", "She asked for ____ before the interview.", ["traffic", "shelter", "surface"]),
      v("warning", "information about possible danger", "The red sign gave a clear ____.", ["blossom", "reef", "tide"]),
      v("instruction", "directions about how to do something", "Please read the safety ____ carefully.", ["branch", "dolphin", "current"]),
      v("deadline", "the latest time something must be finished", "You should check the project ____ today.", ["orchard", "seahorse", "emotion"]),
      v("consequence", "what happens as a result of an action", "Ignoring the rules can have a serious ____.", ["greeting", "flock", "harvest"]),
      v("be careful", "to act with attention and caution", "You had better ____ near that wet floor.", ["speak English", "borrow money", "cross the ocean"]),
      v("show respect", "to act politely toward someone", "Students ought to ____ to their teachers.", ["grow faster", "watch traffic", "pay later"]),
      v("review the notes", "to read your notes again", "You should ____ before the exam.", ["lend a shelf", "climb the desk", "paint a wallet"]),
      v("ignore the sign", "to pay no attention to a sign or warning", "You had better not ____ at the station.", ["enjoy the museum", "water the flowers", "call your mother"]),
      v("ask for support", "to request help from another person", "You ought to ____ when the task is too big.", ["listen to noise", "freeze the food", "watch the shelf"]),
    ],
    grammar: [
      g("You ___ study every day if you want steady progress.", "should", ["should", "had better", "ought", "would"], "You should study every day if you want steady progress.", c("You ought study every day if you want steady progress.", "You should study every day if you want steady progress.", ["You should study every day if you want steady progress.", "You ought study every day if you want steady progress.", "You should to study every day if you want steady progress.", "You had better studying every day if you want steady progress."])),
      g("You ___ not ignore the instructions.", "should", ["should", "had", "ought", "would"], "You should not ignore the instructions.", c("You should not to ignore the instructions.", "You should not ignore the instructions.", ["You should not ignore the instructions.", "You should not to ignore the instructions.", "You ought not ignore the instructions.", "You had better not ignoring the instructions."]), ["shouldn't"]),
      g("You ___ be careful with that wire.", "had better", ["had better", "should", "ought", "would rather"], "You had better be careful with that wire.", c("You had better to be careful with that wire.", "You had better be careful with that wire.", ["You had better be careful with that wire.", "You had better to be careful with that wire.", "You should be careful with that wire better.", "You had better being careful with that wire."])),
      g("You had better not ___ that switch.", "touch", ["touch", "to touch", "touching", "touched"], "You had better not touch that switch.", c("You had better not to touch that switch.", "You had better not touch that switch.", ["You had better not touch that switch.", "You had better not to touch that switch.", "You should not touching that switch.", "You ought not touched that switch."])),
      g("Students ___ to review the lesson before class.", "ought", ["ought", "should", "had better", "would"], "Students ought to review the lesson before class.", c("Students ought review the lesson before class.", "Students ought to review the lesson before class.", ["Students ought to review the lesson before class.", "Students ought review the lesson before class.", "Students ought to reviewing the lesson before class.", "Students should to review the lesson before class."])),
      g("You ___ ask for help when you feel overwhelmed.", "should", ["should", "had better", "ought", "would"], "You should ask for help when you feel overwhelmed."),
      g("You ___ not wait until the last minute.", "had better", ["had better", "should", "ought", "would"], "You had better not wait until the last minute.", undefined, ["had better not"]),
      g("We ___ to respect other people's time.", "ought", ["ought", "should", "had better", "would"], "We ought to respect other people's time."),
      g("You ___ back up your files tonight, or you may lose them.", "had better", ["had better", "should", "ought", "would"], "You had better back up your files tonight, or you may lose them."),
      g("She ___ take a short break and clear her mind.", "should", ["should", "ought", "had better", "would"], "She should take a short break and clear her mind."),
    ],
    listening: [
      l("You should study every day if you want steady progress.", "What should you do every day?", "study", ["borrow books", "skip class", "watch television"], "Does should express advice or a past memory?", "advice", ["a past memory", "a contrast", "a request"]),
      l("You should not ignore the instructions.", "What should you not ignore?", "the instructions", ["the weather", "the dessert", "the aisle"], "Is this positive or negative advice?", "negative advice", ["a greeting", "a future plan", "a comparison"]),
      l("You had better be careful with that wire.", "What had better be done?", "be careful with the wire", ["lend a wire", "paint the wire", "hide the wire"], "Is had better softer or stronger than should here?", "stronger", ["softer", "the same as a noun", "a past habit"]),
      l("You had better not touch that switch.", "What had better not be touched?", "that switch", ["that cereal", "that notebook", "that flower"], "Which phrase gives a warning?", "had better not", ["ought to", "used to", "however"]),
      l("Students ought to review the lesson before class.", "What ought students to do?", "review the lesson", ["miss the lesson", "borrow a chair", "close the window"], "What kind of advice does ought to often sound like?", "moral or formal advice", ["a joke", "a travel story", "an order from the past"]),
    ],
    speakingPrompts: [
      s("Give one piece of advice with should.", "You should study every day.", ["You should ask for help when you feel overwhelmed."]),
      s("Give one negative advice sentence.", "You should not ignore the instructions.", ["You shouldn't ignore the instructions."]),
      s("Give one strong warning with had better.", "You had better be careful with that wire.", ["You had better back up your files tonight."]),
      s("Give one sentence with had better not.", "You had better not touch that switch.", ["You had better not wait until the last minute."]),
      s("Give one sentence with ought to.", "Students ought to review the lesson before class.", ["We ought to respect other people's time."]),
    ],
    writing: [
      w("You _____ study every day if you want steady progress.", "You should study every day if you want steady progress.", "should"),
      w("You should _____ ignore the instructions.", "You should not ignore the instructions.", "not"),
      w("You _____ better be careful with that wire.", "You had better be careful with that wire.", "had"),
      w("You had better not _____ that switch.", "You had better not touch that switch.", "touch"),
      w("Students _____ to review the lesson before class.", "Students ought to review the lesson before class.", "ought"),
    ],
    facts: [
      f(
        "Mia was preparing for a difficult exam and felt stressed. Her teacher told her that she should review her notes every evening, and her sister said she ought to sleep earlier this week.",
        "What was Mia preparing for?",
        "She was preparing for a difficult exam.",
        ["She was preparing for a wedding cake.", "She was preparing for a beach trip.", "She was preparing for a music video."],
        "What did her teacher say she should do?",
        "Her teacher said she should review her notes every evening.",
        ["Her teacher said she should skip dinner every evening.", "Her teacher said she should lend her books every evening.", "Her teacher said she should change schools every evening."],
        "What did her sister say she ought to do?",
        "Her sister said she ought to sleep earlier this week.",
        ["Her sister said she ought to buy another phone.", "Her sister said she ought to close the library.", "Her sister said she ought to cancel the class."],
      ),
      f(
        "At work, Daniel wanted to save a file later, but his coworker warned him that he had better back it up immediately. A few minutes later, the power went out in the whole building.",
        "What did Daniel want to save later?",
        "He wanted to save a file later.",
        ["He wanted to save a sandwich later.", "He wanted to save a bicycle later.", "He wanted to save a coat later."],
        "What warning did his coworker give?",
        "His coworker warned that he had better back it up immediately.",
        ["His coworker warned that he should buy a printer immediately.", "His coworker warned that he ought to move cities immediately.", "His coworker warned that he would rather paint it immediately."],
        "What happened a few minutes later?",
        "The power went out in the whole building.",
        ["The bus arrived in the whole building.", "The rain stopped in the whole building.", "The class sang in the whole building."],
      ),
      f(
        "Laura felt upset after a disagreement with her friend. Her mother said she should calm down first, and then she ought to speak honestly but respectfully.",
        "Why did Laura feel upset?",
        "She felt upset after a disagreement with her friend.",
        ["She felt upset after winning a prize.", "She felt upset after buying a dessert.", "She felt upset after cleaning a window."],
        "What did her mother say she should do first?",
        "Her mother said she should calm down first.",
        ["Her mother said she should call a taxi first.", "Her mother said she should hide her phone first.", "Her mother said she should leave the country first."],
        "How ought Laura to speak later?",
        "She ought to speak honestly but respectfully.",
        ["She ought to speak loudly but carelessly.", "She ought to speak quickly but rudely.", "She ought to speak silently but angrily."],
      ),
      f(
        "During a science lab, a student reached toward an exposed wire. The teacher quickly said that he had better not touch it because the consequence could be serious.",
        "What did the student reach toward?",
        "He reached toward an exposed wire.",
        ["He reached toward a cereal box.", "He reached toward a library card.", "He reached toward a soccer ball."],
        "What did the teacher quickly say?",
        "The teacher said that he had better not touch it.",
        ["The teacher said that he should buy it.", "The teacher said that he would rather paint it.", "The teacher said that he used to hold it."],
        "Why was the warning serious?",
        "Because the consequence could be serious.",
        ["Because the dessert could be sweet.", "Because the shelf could be heavy.", "Because the weather could be warm."],
      ),
      f(
        "Ethan often tried to solve every problem by himself. His friend reminded him that he should ask for support sometimes and that people ought to help one another.",
        "What did Ethan often try to do?",
        "He often tried to solve every problem by himself.",
        ["He often tried to collect every ticket by himself.", "He often tried to cook every meal by himself.", "He often tried to build every bridge by himself."],
        "What should Ethan do sometimes?",
        "He should ask for support sometimes.",
        ["He should ignore every message sometimes.", "He should hide every book sometimes.", "He should close every door sometimes."],
        "What did the friend say people ought to do?",
        "People ought to help one another.",
        ["People ought to avoid each other.", "People ought to borrow every notebook.", "People ought to cancel each class."],
      ),
    ],
  },
  {
    number: 74,
    title: "Lesson 74: Used To and Would for Past Habits",
    vocab: [
      v("habit", "something you do regularly", "Reading before bed used to be my favorite ____.", ["warning", "shelter", "wire"]),
      v("routine", "the usual order of daily activities", "Her morning ____ used to start at six.", ["contrast", "reef", "surface"]),
      v("childhood", "the time when someone is a child", "During my ____, we played outside every evening.", ["deadline", "borrow", "request"]),
      v("porch", "a covered area at the front of a house", "Grandpa would sit on the ____ after dinner.", ["wallet", "screen", "traffic"]),
      v("neighborhood", "the area where people live near one another", "We used to know everyone in the ____.", ["hypothesis", "switch", "ocean"]),
      v("play outside", "to spend time outdoors in games or activities", "The children would ____ until sunset.", ["pay a bill", "lend a coat", "miss a train"]),
      v("wake up early", "to get out of bed early in the morning", "On farm days, we would ____ without complaining.", ["borrow cereal", "compare colors", "ignore music"]),
      v("visit grandparents", "to go see your grandparents", "Every Sunday, we would ____ together.", ["touch wires", "clean reefs", "drive boats"]),
      v("live near the school", "to have your home close to the school", "She used to ____ when she was eight.", ["study by moonlight", "build a hive", "repair the tide"]),
      v("tell stories", "to speak about past events or imaginary events", "My father would ____ before bedtime.", ["lend lunch", "switch currents", "cancel weather"]),
    ],
    grammar: [
      g("I ___ play outside every day when I was a child.", "used to", ["used to", "would to", "use to", "had better"], "I used to play outside every day when I was a child.", c("I would to play outside every day when I was a child.", "I used to play outside every day when I was a child.", ["I used to play outside every day when I was a child.", "I would to play outside every day when I was a child.", "I use play outside every day when I was a child.", "I used playing outside every day when I was a child."])),
      g("She ___ live near the school before her family moved.", "used to", ["used to", "would", "use to", "ought to"], "She used to live near the school before her family moved.", c("She would live near the school before her family moved.", "She used to live near the school before her family moved.", ["She used to live near the school before her family moved.", "She would live near the school before her family moved.", "She use to lived near the school before her family moved.", "She had better live near the school before her family moved."])),
      g("Every Sunday, we ___ visit our grandparents for lunch.", "would", ["would", "used to", "had better", "should"], "Every Sunday, we would visit our grandparents for lunch.", c("Every Sunday, we used visit our grandparents for lunch.", "Every Sunday, we would visit our grandparents for lunch.", ["Every Sunday, we would visit our grandparents for lunch.", "Every Sunday, we used visit our grandparents for lunch.", "Every Sunday, we would to visit our grandparents for lunch.", "Every Sunday, we had better visit our grandparents for lunch."])),
      g("When I was younger, I ___ wake up early on fishing days.", "would", ["would", "used to", "use to", "ought to"], "When I was younger, I would wake up early on fishing days.", c("When I was younger, I used to wake up early on fishing days.", "When I was younger, I would wake up early on fishing days.", ["When I was younger, I would wake up early on fishing days.", "When I was younger, I used to wake up early on fishing days.", "When I was younger, I would to wake up early on fishing days.", "When I was younger, I should wake up early on fishing days."])),
      g("He didn't ___ to like vegetables when he was little.", "use", ["use", "used", "using", "would"], "He didn't use to like vegetables when he was little.", c("He didn't used to like vegetables when he was little.", "He didn't use to like vegetables when he was little.", ["He didn't use to like vegetables when he was little.", "He didn't used to like vegetables when he was little.", "He didn't would like vegetables when he was little.", "He doesn't use to like vegetables when he was little."])),
      g("Did you ___ to study at night in high school?", "use", ["use", "used", "using", "would"], "Did you use to study at night in high school?"),
      g("My grandmother ___ tell stories on the porch after dinner.", "would", ["would", "used to", "had better", "should"], "My grandmother would tell stories on the porch after dinner."),
      g("We ___ be close friends, but now we live far apart.", "used to", ["used to", "would", "ought to", "had better"], "We used to be close friends, but now we live far apart."),
      g("Every summer, the cousins ___ gather by the river at sunset.", "would", ["would", "used to", "ought to", "had better"], "Every summer, the cousins would gather by the river at sunset."),
      g("I never ___ to enjoy long walks, but now I do.", "used", ["used", "use", "would", "should"], "I never used to enjoy long walks, but now I do."),
    ],
    listening: [
      l("I used to play outside every day when I was a child.", "What did the speaker use to do every day?", "play outside", ["borrow books", "cook dinner", "drive to work"], "Does this sentence describe a past habit or a warning?", "a past habit", ["a warning", "a request", "a contrast"]),
      l("She used to live near the school before her family moved.", "Where did she use to live?", "near the school", ["near the beach", "near the station", "near the office"], "Does used to describe an action or a past state here?", "a past state", ["a future plan", "a formal result", "a strong warning"]),
      l("Every Sunday, we would visit our grandparents for lunch.", "Who would the family visit?", "their grandparents", ["their dentist", "their manager", "their pilot"], "Can would describe a repeated past action here?", "yes", ["no", "only a present state", "only a command"]),
      l("When I was younger, I would wake up early on fishing days.", "When would the speaker wake up early?", "on fishing days", ["on test days", "on movie nights", "on train rides"], "Is would describing a repeated action or a permanent state?", "a repeated action", ["a permanent state", "a wish", "a comparison"]),
      l("He didn't use to like vegetables when he was little.", "What didn't he use to like?", "vegetables", ["music", "sports", "science"], "Is the sentence affirmative or negative?", "negative", ["affirmative", "interrogative", "formal"]),
    ],
    speakingPrompts: [
      s("Say one sentence with used to about childhood.", "I used to play outside every day when I was a child.", ["I used to live near the school."]),
      s("Say one sentence with would for a repeated past action.", "Every Sunday, we would visit our grandparents for lunch.", ["My grandmother would tell stories after dinner."]),
      s("Say one negative sentence with didn't use to.", "He didn't use to like vegetables when he was little.", ["I didn't use to enjoy long walks."]),
      s("Ask one question with did you use to.", "Did you use to study at night in high school?", ["Did you use to wake up early on weekends?"]),
      s("Describe one past state that changed.", "We used to be close friends, but now we live far apart.", ["She used to live near the school before her family moved."]),
    ],
    writing: [
      w("I _____ play outside every day when I was a child.", "I used to play outside every day when I was a child.", "used to"),
      w("She _____ live near the school before her family moved.", "She used to live near the school before her family moved.", "used to"),
      w("Every Sunday, we _____ visit our grandparents for lunch.", "Every Sunday, we would visit our grandparents for lunch.", "would"),
      w("He didn't _____ to like vegetables when he was little.", "He didn't use to like vegetables when he was little.", "use"),
      w("Did you _____ to study at night in high school?", "Did you use to study at night in high school?", "use"),
    ],
    facts: [
      f(
        "Lucas grew up in a quiet neighborhood where everyone knew each other. He used to walk to the bakery every morning, and on weekends he would sit on the porch with his grandfather.",
        "Where did Lucas grow up?",
        "He grew up in a quiet neighborhood.",
        ["He grew up in a noisy airport.", "He grew up on a fishing boat.", "He grew up inside a museum."],
        "What did he use to do every morning?",
        "He used to walk to the bakery every morning.",
        ["He used to fly to school every morning.", "He used to fix computers every morning.", "He used to hide from his neighbors every morning."],
        "What would he do on weekends?",
        "He would sit on the porch with his grandfather.",
        ["He would swim across the river with his teacher.", "He would repair bikes with his dentist.", "He would borrow shoes with his cousin."],
      ),
      f(
        "When Nina was a child, she used to live near her school. She would wake up early, eat quickly, and meet her best friend at the corner every day.",
        "Where did Nina use to live?",
        "She used to live near her school.",
        ["She used to live near the airport.", "She used to live in a hotel.", "She used to live on a mountain road."],
        "What would she do early each day?",
        "She would wake up early.",
        ["She would sleep until noon.", "She would cancel the class.", "She would ignore the bell."],
        "Who would she meet at the corner?",
        "She would meet her best friend at the corner.",
        ["She would meet a pilot at the corner.", "She would meet the principal at the corner.", "She would meet a stranger from the ocean at the corner."],
      ),
      f(
        "On Sundays, our family would visit our grandparents for lunch. My grandmother would serve soup first, and my grandfather would tell stories about his childhood farm.",
        "Who would the family visit on Sundays?",
        "They would visit their grandparents on Sundays.",
        ["They would visit their dentist on Sundays.", "They would visit a museum on Sundays.", "They would visit a train station on Sundays."],
        "What would the grandmother serve first?",
        "She would serve soup first.",
        ["She would serve ice first.", "She would serve cereal first.", "She would serve coffee beans first."],
        "What would the grandfather tell stories about?",
        "He would tell stories about his childhood farm.",
        ["He would tell stories about his rocket trips.", "He would tell stories about his city job.", "He would tell stories about his tennis matches."],
      ),
      f(
        "Marco didn't use to like vegetables when he was younger, but his taste changed slowly. His mother used to cook them in simple ways, and later he would ask for more.",
        "What didn't Marco use to like?",
        "He didn't use to like vegetables.",
        ["He didn't use to like books.", "He didn't use to like music.", "He didn't use to like homework."],
        "Who used to cook the vegetables?",
        "His mother used to cook them.",
        ["His coach used to cook them.", "His neighbor used to cook them.", "His manager used to cook them."],
        "What would Marco ask for later?",
        "He would ask for more later.",
        ["He would ask for a refund later.", "He would ask for a train later.", "He would ask for a window later."],
      ),
      f(
        "Before we moved to the city, we used to know every family on our street. In the evenings, the children would play outside while the adults talked by the gate.",
        "What did the family use to know before moving?",
        "They used to know every family on their street.",
        ["They used to know every train in the city.", "They used to know every fish in the ocean.", "They used to know every pilot in the country."],
        "What would the children do in the evenings?",
        "They would play outside in the evenings.",
        ["They would study law in the evenings.", "They would build shelves in the evenings.", "They would clean buses in the evenings."],
        "What would the adults do by the gate?",
        "They would talk by the gate.",
        ["They would sleep by the gate.", "They would paint by the gate.", "They would dance by the gate."],
      ),
    ],
  },
  {
    number: 75,
    title: "Lesson 75: Other Ways to Use Would",
    vocab: [
      v("request", "a polite or formal ask for something", "Could you make that ____ again more slowly?", ["harvest", "wire", "counter"]),
      v("preference", "what someone likes better", "Her ____ is to study in the morning.", ["warning", "shelter", "reef"]),
      v("offer", "something you say to give help or something useful", "Thank you for your kind ____ to help.", ["contrast", "tide", "switch"]),
      v("hypothetical", "imagined, not real right now", "That example is only ____ at the moment.", ["visible", "borrowed", "polite"]),
      v("option", "one possible choice", "Staying home is another good ____.", ["emotion", "surface", "deadline"]),
      v("would rather", "to prefer one thing over another", "I ____ stay home tonight.", ["may rain", "used to", "listen to"]),
      v("would prefer", "to choose one possibility in a polite way", "She would ____ to sit near the window.", ["take traffic", "lend the sky", "pay a shelf"]),
      v("would like", "to want something politely", "I would ____ a glass of water, please.", ["have a reef", "speak a ticket", "watch a wallet"]),
      v("would help", "to be useful in an imagined or polite context", "That extra hour would ____ a lot.", ["climb calmly", "borrow widely", "freeze politely"]),
      v("soft opinion", "an opinion expressed gently", "That would be a good idea is a ____.", ["wild animal", "deep cave", "cheap ladder"]),
    ],
    grammar: [
      g("___ you help me with this form?", "Would", ["Would", "Did", "Have", "Are"], "Would you help me with this form?", c("Do you would help me with this form?", "Would you help me with this form?", ["Would you help me with this form?", "Do you would help me with this form?", "Would you helped me with this form?", "Did you help me with this form?"])),
      g("Would you ___ some coffee?", "like", ["like", "to like", "liked", "liking"], "Would you like some coffee?", c("Would you likes some coffee?", "Would you like some coffee?", ["Would you like some coffee?", "Would you likes some coffee?", "Would you liking some coffee?", "Would you to like some coffee?"])),
      g("I would rather ___ home tonight.", "stay", ["stay", "to stay", "stayed", "staying"], "I would rather stay home tonight.", c("I would rather to stay home tonight.", "I would rather stay home tonight.", ["I would rather stay home tonight.", "I would rather to stay home tonight.", "I would rather staying home tonight.", "I would rather stayed home tonight."])),
      g("She would prefer ___ in the morning.", "to study", ["to study", "study", "studying", "studied"], "She would prefer to study in the morning.", c("She would prefer study in the morning.", "She would prefer to study in the morning.", ["She would prefer to study in the morning.", "She would prefer study in the morning.", "She would prefer studying in the morning.", "She would prefer studied in the morning."])),
      g("That ___ be a good idea.", "would", ["would", "used to", "ought", "has"], "That would be a good idea.", c("That would is a good idea.", "That would be a good idea.", ["That would be a good idea.", "That would is a good idea.", "That would being a good idea.", "That used to be a good idea."])),
      g("If I had more time, I ___ read more.", "would", ["would", "used to", "should", "had better"], "If I had more time, I would read more."),
      g("We would prefer ___ by email.", "to respond", ["to respond", "respond", "responding", "responded"], "We would prefer to respond by email."),
      g("Would you ___ opening the door for me?", "mind", ["mind", "minds", "minded", "minding"], "Would you mind opening the door for me?"),
      g("I would rather not ___ about that now.", "argue", ["argue", "to argue", "arguing", "argued"], "I would rather not argue about that now."),
      g("That would ___ the problem easier to explain.", "make", ["make", "made", "making", "to make"], "That would make the problem easier to explain."),
    ],
    listening: [
      l("Would you help me with this form?", "What does the speaker want help with?", "this form", ["this ladder", "this dessert", "this airport"], "Is this a command or a polite request?", "a polite request", ["a command", "a past memory", "a contrast"]),
      l("Would you like some coffee?", "What is being offered?", "some coffee", ["some traffic", "some homework", "some branches"], "Does would like sound formal or aggressive?", "formal and polite", ["aggressive", "past only", "incorrect"]),
      l("I would rather stay home tonight.", "What would the speaker rather do?", "stay home", ["drive to work", "borrow a pen", "watch the wire"], "Does would rather express preference or obligation?", "preference", ["obligation", "habit", "warning"]),
      l("She would prefer to study in the morning.", "When would she prefer to study?", "in the morning", ["at midnight", "on the bus", "after the storm"], "Which structure do you hear after would prefer?", "to + verb", ["verb + ing", "past simple", "noun only"]),
      l("If I had more time, I would read more.", "What would the speaker do with more time?", "read more", ["sleep outdoors", "lend books", "climb a tree"], "Is this real now or hypothetical?", "hypothetical", ["real now", "a warning", "a travel order"]),
    ],
    speakingPrompts: [
      s("Make one polite request with would.", "Would you help me with this form?", ["Would you pass me the salt?"]),
      s("Make one offer with would you like.", "Would you like some coffee?", ["Would you like some tea?"]),
      s("State one preference with would rather.", "I would rather stay home tonight.", ["I would rather wait until tomorrow."]),
      s("State one preference with would prefer.", "She would prefer to study in the morning.", ["I would prefer to talk later."]),
      s("Make one hypothetical sentence.", "If I had more time, I would read more.", ["If we had a car, we would leave earlier."]),
    ],
    writing: [
      w("_____ you help me with this form?", "Would you help me with this form?", "Would"),
      w("Would you _____ some coffee?", "Would you like some coffee?", "like"),
      w("I would rather _____ home tonight.", "I would rather stay home tonight.", "stay"),
      w("She would prefer _____ in the morning.", "She would prefer to study in the morning.", "to study"),
      w("If I had more time, I _____ read more.", "If I had more time, I would read more.", "would"),
    ],
    facts: [
      f(
        "At the cafe, Nora spoke very politely to the server. She said she would like some tea, and later she asked whether he would bring an extra spoon.",
        "What would Nora like?",
        "She would like some tea.",
        ["She would like a train ticket.", "She would like a pet bowl.", "She would like a dry branch."],
        "What did she ask the server to bring?",
        "She asked whether he would bring an extra spoon.",
        ["She asked whether he would buy a notebook.", "She asked whether he would close the street.", "She asked whether he would wash her car."],
        "How did Nora speak to the server?",
        "She spoke very politely.",
        ["She spoke very angrily.", "She spoke in total silence.", "She spoke only by writing on the table."],
      ),
      f(
        "Leo and Ana had two free tickets for the evening. Leo would rather stay home and rest, but Ana would prefer to go out for a short concert.",
        "What would Leo rather do?",
        "He would rather stay home and rest.",
        ["He would rather drive all night.", "He would rather borrow money.", "He would rather fix the stage."],
        "What would Ana prefer to do?",
        "She would prefer to go out for a short concert.",
        ["She would prefer to paint the wall.", "She would prefer to close the cafe.", "She would prefer to miss the event."],
        "What did they already have?",
        "They already had two free tickets.",
        ["They already had two free umbrellas.", "They already had two free bicycles.", "They already had two free windows."],
      ),
      f(
        "During the meeting, the manager asked, \"Would you mind sending the report again?\" Her tone was calm, so the request sounded respectful and easy to accept.",
        "What did the manager ask for?",
        "She asked for the report to be sent again.",
        ["She asked for the chairs to be hidden.", "She asked for the road to be closed.", "She asked for the cafe to be painted."],
        "How did her tone sound?",
        "Her tone sounded calm.",
        ["Her tone sounded violent.", "Her tone sounded silent.", "Her tone sounded rushed and broken."],
        "Why was the request easy to accept?",
        "Because it sounded respectful.",
        ["Because it sounded expensive.", "Because it sounded noisy.", "Because it sounded impossible."],
      ),
      f(
        "If Clara had more time after work, she would join a reading club. She says that would be a good way to relax and meet thoughtful people.",
        "What would Clara do if she had more time after work?",
        "She would join a reading club.",
        ["She would buy a second office.", "She would close every library.", "She would lend a ladder."],
        "What does she say that would be?",
        "She says that would be a good way to relax and meet thoughtful people.",
        ["She says that would be a fast way to miss the bus.", "She says that would be a dangerous way to cross the road.", "She says that would be a loud way to break the window."],
        "When would she do it?",
        "She would do it if she had more time after work.",
        ["She would do it if the ocean dried up.", "She would do it if her shoes disappeared.", "She would do it if the shelf became softer."],
      ),
      f(
        "At lunch, Maya offered help to a new classmate. She asked whether he would like to sit with her group, and he smiled because the invitation felt warm and natural.",
        "What did Maya ask the new classmate?",
        "She asked whether he would like to sit with her group.",
        ["She asked whether he would like to drive her bus.", "She asked whether he would like to wash her jacket.", "She asked whether he would like to open her locker."],
        "How did he react?",
        "He smiled.",
        ["He ran away.", "He shouted loudly.", "He ignored the table."],
        "Why did the invitation feel good?",
        "Because it felt warm and natural.",
        ["Because it felt formal and distant.", "Because it felt cold and rude.", "Because it felt confusing and expensive."],
      ),
    ],
  },
  {
    number: 76,
    title: "Lesson 76: Because, So, Due To and Therefore",
    vocab: [
      v("cause", "the reason something happens", "The main ____ of the delay was heavy rain.", ["flock", "porch", "preference"]),
      v("result", "what happens because of something else", "The test score was the ____ of weeks of study.", ["request", "shelf", "surface"]),
      v("delay", "extra waiting time before something happens", "The train left after a long ____.", ["emotion", "reef", "habit"]),
      v("technical issue", "a problem with equipment or technology", "The flight stopped because of a ____.", ["kind greeting", "childhood memory", "polite request"]),
      v("conflict", "a situation where two plans or needs do not fit together", "The meeting changed due to a schedule ____.", ["beak", "tide", "counter"]),
      v("stay home", "to remain at home instead of going out", "I stayed home _____ I was sick.", ["borrow a pen", "lend a chair", "watch a tide"]),
      v("go to bed early", "to sleep earlier than usual", "She was tired, so she went to bed ____.", ["on the bridge", "with a ladder", "inside the reef"]),
      v("due to the rain", "because of the rain, in a more formal way", "The trip was canceled ____.", ["already the tea", "however the shelf", "used to the wire"]),
      v("pass the test", "to get a successful result in a test", "He studied hard; therefore, he could ____.", ["sound polite", "wake late", "lend traffic"]),
      v("reason and result", "the two sides of cause and consequence", "Because and so both connect ____.", ["wings and feathers", "books and tables", "shoes and hats"]),
    ],
    grammar: [
      g("I stayed home ___ I was sick.", "because", ["because", "so", "due to", "therefore"], "I stayed home because I was sick.", c("I stayed home due to I was sick.", "I stayed home because I was sick.", ["I stayed home because I was sick.", "I stayed home due to I was sick.", "I stayed home therefore I was sick.", "I stayed home so I was sick."])),
      g("She was tired, ___ she went to bed early.", "so", ["so", "because", "due to", "therefore"], "She was tired, so she went to bed early.", c("She was tired, because she went to bed early.", "She was tired, so she went to bed early.", ["She was tired, so she went to bed early.", "She was tired, because she went to bed early.", "She was tired due to she went to bed early.", "She was tired therefore she went to bed early."])),
      g("The trip was canceled ___ the rain.", "due to", ["due to", "because", "so", "therefore"], "The trip was canceled due to the rain.", c("The trip was canceled because the rain.", "The trip was canceled due to the rain.", ["The trip was canceled due to the rain.", "The trip was canceled because the rain.", "The trip was canceled so the rain.", "The trip was canceled therefore the rain."])),
      g("He studied hard; ___, he passed the test.", "therefore", ["therefore", "because", "so", "due to"], "He studied hard; therefore, he passed the test.", c("He studied hard; because, he passed the test.", "He studied hard; therefore, he passed the test.", ["He studied hard; therefore, he passed the test.", "He studied hard; because, he passed the test.", "He studied hard; due to, he passed the test.", "He studied hard; so, because he passed the test."])),
      g("___ it rained, we stayed home.", "Because", ["Because", "So", "Due to", "Therefore"], "Because it rained, we stayed home.", c("Due to it rained, we stayed home.", "Because it rained, we stayed home.", ["Because it rained, we stayed home.", "Due to it rained, we stayed home.", "Therefore it rained, we stayed home.", "So it rained, we stayed home."])),
      g("The event was postponed ___ a scheduling conflict.", "due to", ["due to", "because", "so", "therefore"], "The event was postponed due to a scheduling conflict."),
      g("The store was closed, ___ we went somewhere else.", "so", ["so", "because", "due to", "therefore"], "The store was closed, so we went somewhere else."),
      g("I didn't buy the jacket ___ it was too expensive.", "because", ["because", "so", "due to", "therefore"], "I didn't buy the jacket because it was too expensive."),
      g("The roads were icy; ___, driving was dangerous.", "therefore", ["therefore", "because", "so", "due to"], "The roads were icy; therefore, driving was dangerous."),
      g("We had to leave early ___ an emergency at home.", "due to", ["due to", "because", "so", "therefore"], "We had to leave early due to an emergency at home."),
    ],
    listening: [
      l("I stayed home because I was sick.", "Why did the speaker stay home?", "because they were sick", ["because the train was late", "because the shelf was heavy", "because the music was quiet"], "Which connector gives the reason?", "because", ["so", "therefore", "however"]),
      l("She was tired, so she went to bed early.", "What was the result?", "she went to bed early", ["she borrowed a book", "she canceled the sky", "she painted the road"], "Which connector introduces the result?", "so", ["because", "due to", "already"]),
      l("The trip was canceled due to the rain.", "Why was the trip canceled?", "due to the rain", ["due to the shelf", "due to the cereal", "due to the hat"], "Does due to usually come before a noun phrase or a full clause?", "a noun phrase", ["a full clause only", "a question", "an imperative"]),
      l("He studied hard; therefore, he passed the test.", "What happened after he studied hard?", "he passed the test", ["he missed the train", "he closed the cafe", "he forgot the switch"], "Which connector sounds more formal?", "therefore", ["so", "because", "yet"]),
      l("Because it rained, we stayed home.", "What happened first?", "it rained", ["they stayed home", "they borrowed an umbrella", "they sold the tickets"], "What was the result?", "they stayed home", ["they opened the window", "they drove faster", "they watched the tide"]),
    ],
    speakingPrompts: [
      s("Give one sentence with because.", "I stayed home because I was sick.", ["I didn't buy the jacket because it was too expensive."]),
      s("Give one sentence with so.", "She was tired, so she went to bed early.", ["The store was closed, so we went somewhere else."]),
      s("Give one sentence with due to.", "The trip was canceled due to the rain.", ["The event was postponed due to a scheduling conflict."]),
      s("Give one sentence with therefore.", "He studied hard; therefore, he passed the test.", ["The roads were icy; therefore, driving was dangerous."]),
      s("Transform a reason into a result sentence.", "It rained, so we stayed home.", ["The flight was delayed due to a technical issue, so we waited longer."]),
    ],
    writing: [
      w("I stayed home _____ I was sick.", "I stayed home because I was sick.", "because"),
      w("She was tired, _____ she went to bed early.", "She was tired, so she went to bed early.", "so"),
      w("The trip was canceled _____ the rain.", "The trip was canceled due to the rain.", "due to"),
      w("He studied hard; _____, he passed the test.", "He studied hard; therefore, he passed the test.", "therefore"),
      w("_____ it rained, we stayed home.", "Because it rained, we stayed home.", "Because"),
    ],
    facts: [
      f(
        "Emma and Jake planned a countryside trip. Because Jake forgot his wallet, they had to turn back, so they missed the early train and waited for the next one.",
        "Why did Emma and Jake have to turn back?",
        "Because Jake forgot his wallet.",
        ["Because Emma lost her phone.", "Because the river was dry.", "Because the museum was noisy."],
        "What result came after they turned back?",
        "They missed the early train.",
        ["They sold their tickets.", "They closed the station.", "They borrowed a car."],
        "What did they do after that?",
        "They waited for the next train.",
        ["They climbed the roof.", "They canceled breakfast.", "They painted the platform."],
      ),
      f(
        "The company meeting started late due to a technical issue. Therefore, the manager shortened the presentation and sent the rest by email.",
        "Why did the meeting start late?",
        "It started late due to a technical issue.",
        ["It started late due to a birthday cake.", "It started late due to a beach towel.", "It started late due to a song lyric."],
        "What did the manager do therefore?",
        "The manager shortened the presentation.",
        ["The manager canceled the building.", "The manager watered the flowers.", "The manager borrowed a shelf."],
        "How did the team receive the rest?",
        "They received the rest by email.",
        ["They received the rest by boat.", "They received the rest by bicycle.", "They received the rest by train whistle."],
      ),
      f(
        "Lucas felt tired after work, so he went to bed early. Because he rested well, he felt calmer and more focused the next morning.",
        "What did Lucas do because he was tired?",
        "He went to bed early.",
        ["He moved to another city.", "He opened a restaurant.", "He climbed a tree."],
        "Why did he feel calmer the next morning?",
        "Because he rested well.",
        ["Because he borrowed money.", "Because he missed the bus.", "Because he watered the carpet."],
        "How did he feel the next morning?",
        "He felt calmer and more focused.",
        ["He felt colder and louder.", "He felt slower and hungrier only.", "He felt invisible and dry."],
      ),
      f(
        "The school trip was postponed due to heavy rain. The teachers explained the reason clearly; therefore, the students accepted the change without complaining.",
        "Why was the school trip postponed?",
        "It was postponed due to heavy rain.",
        ["It was postponed due to soft music.", "It was postponed due to a clean window.", "It was postponed due to a new pencil."],
        "What did the teachers do?",
        "They explained the reason clearly.",
        ["They hid the reason carefully.", "They forgot the reason completely.", "They borrowed the reason quietly."],
        "What was the result?",
        "The students accepted the change without complaining.",
        ["The students climbed the bus without tickets.", "The students painted the rain without warning.", "The students canceled lunch without telling anyone."],
      ),
      f(
        "Because the report was incomplete, Sofia stayed late at the office. She checked the numbers again, so the final version was accurate and easy to understand.",
        "Why did Sofia stay late at the office?",
        "Because the report was incomplete.",
        ["Because the office was beautiful.", "Because the office sold coffee.", "Because the office had a new elevator."],
        "What did she check again?",
        "She checked the numbers again.",
        ["She checked the clouds again.", "She checked the seats again.", "She checked the oranges again."],
        "What was the result of her work?",
        "The final version was accurate and easy to understand.",
        ["The final version was slower and colder.", "The final version was smaller than a spoon.", "The final version was louder than traffic."],
      ),
    ],
  },
  {
    number: 77,
    title: "Lesson 77: Already, Just and Yet",
    vocab: [
      v("already", "earlier than expected or before now", "I have ____ finished my homework.", ["however", "borrow", "careful"]),
      v("just", "a very short time ago", "She has ____ arrived at the station.", ["therefore", "childhood", "surface"]),
      v("yet", "until now, usually in negatives and questions", "Have you called your mother ____?", ["moreover", "porch", "behavior"]),
      v("finish", "to complete something", "We have already ____ the first task.", ["contrast", "shelf", "wire"]),
      v("arrive", "to reach a place", "The guests have just ____.", ["warning", "branch", "counter"]),
      v("call back", "to return a phone call", "He hasn't ____ me yet.", ["grown up", "crossed over", "turned down"]),
      v("send the email", "to transmit an email to someone", "I have already ____ to the team.", ["lent the station", "painted the wallet", "climbed the tide"]),
      v("check the report", "to review a report carefully", "She has just ____ one more time.", ["borrowed the reef", "closed the current", "watched the ladder"]),
      v("eat lunch", "to have lunch", "They haven't ____ yet because of the meeting.", ["shown respect", "paid attention", "gone shopping"]),
      v("recent action", "something that happened a short time ago", "Just often marks a ____.", ["traffic sign", "group photo", "long branch"]),
    ],
    grammar: [
      g("I have ___ finished my homework.", "already", ["already", "just", "yet", "however"], "I have already finished my homework.", c("I have yet finished my homework.", "I have already finished my homework.", ["I have already finished my homework.", "I have yet finished my homework.", "I have just my homework finished.", "I already have finish my homework."])),
      g("She has ___ arrived.", "just", ["just", "already", "yet", "although"], "She has just arrived.", c("She has yet arrived.", "She has just arrived.", ["She has just arrived.", "She has yet arrived.", "She has arrived justly.", "She just has arrive."])),
      g("They haven't eaten ___", "yet", ["yet", "already", "just", "therefore"], "They haven't eaten yet.", c("They haven't eaten already.", "They haven't eaten yet.", ["They haven't eaten yet.", "They haven't eaten already.", "They haven't yet eaten already.", "They don't have eaten yet."])),
      g("Have you finished ___?", "yet", ["yet", "already", "just", "because"], "Have you finished yet?", c("Have you already finished yet?", "Have you finished yet?", ["Have you finished yet?", "Have you already finished yet?", "Do you have finished yet?", "Have you finish yet?"])),
      g("He has ___ called his mother.", "already", ["already", "just", "yet", "however"], "He has already called his mother.", c("He has yet called his mother.", "He has already called his mother.", ["He has already called his mother.", "He has yet called his mother.", "He already has call his mother.", "He has justly called his mother."])),
      g("We have ___ sent the email to the team.", "already", ["already", "yet", "just", "although"], "We have already sent the email to the team."),
      g("The manager has ___ checked the report.", "just", ["just", "already", "yet", "therefore"], "The manager has just checked the report."),
      g("I haven't replied ___ because I was in class.", "yet", ["yet", "already", "just", "however"], "I haven't replied yet because I was in class."),
      g("Have they arrived ___ or are they still on the bus?", "yet", ["yet", "already", "just", "moreover"], "Have they arrived yet or are they still on the bus?"),
      g("My brother has ___ packed his bag, so we can leave now.", "already", ["already", "yet", "just", "although"], "My brother has already packed his bag, so we can leave now."),
    ],
    listening: [
      l("I have already finished my homework.", "What has the speaker already finished?", "homework", ["the highway", "the reef", "the basket"], "Which word shows earlier-than-expected completion?", "already", ["just", "yet", "still"]),
      l("She has just arrived.", "What has she just done?", "arrived", ["borrowed a pen", "crossed the ocean", "washed the shelf"], "Does just refer to a recent action or a childhood habit?", "a recent action", ["a childhood habit", "a formal result", "a balanced opinion"]),
      l("They haven't eaten yet.", "What haven't they done yet?", "eaten", ["arrived", "studied", "called"], "Is yet here in a positive sentence or a negative sentence?", "a negative sentence", ["a positive sentence", "a command", "a comparison"]),
      l("Have you finished yet?", "What is the speaker asking about?", "finishing", ["driving", "singing", "lending"], "Is yet common in questions?", "yes", ["no", "only in stories", "only in warnings"]),
      l("He has already called his mother.", "Who has he already called?", "his mother", ["his manager", "his driver", "his dentist"], "Which tense do you hear with already?", "present perfect", ["simple past", "future with will", "modal advice"]),
    ],
    speakingPrompts: [
      s("Say one sentence with already.", "I have already finished my homework.", ["He has already called his mother."]),
      s("Say one sentence with just.", "She has just arrived.", ["The manager has just checked the report."]),
      s("Say one negative sentence with yet.", "They haven't eaten yet.", ["I haven't replied yet."]),
      s("Ask one question with yet.", "Have you finished yet?", ["Have they arrived yet?"]),
      s("Make one present perfect sentence about a recent task.", "We have already sent the email to the team.", ["My brother has already packed his bag."]),
    ],
    writing: [
      w("I have _____ finished my homework.", "I have already finished my homework.", "already"),
      w("She has _____ arrived.", "She has just arrived.", "just"),
      w("They haven't eaten _____.", "They haven't eaten yet.", "yet"),
      w("Have you finished _____?", "Have you finished yet?", "yet"),
      w("He has _____ called his mother.", "He has already called his mother.", "already"),
    ],
    facts: [
      f(
        "Julia has already finished her homework, but she hasn't sent it to her teacher yet. She has just checked one answer again because she wants to be sure.",
        "What has Julia already finished?",
        "She has already finished her homework.",
        ["She has already finished a train line.", "She has already finished a bridge repair.", "She has already finished a radio show."],
        "What hasn't she done yet?",
        "She hasn't sent it to her teacher yet.",
        ["She hasn't cooked it for her teacher yet.", "She hasn't hidden it from her teacher yet.", "She hasn't sold it to her teacher yet."],
        "What has she just done?",
        "She has just checked one answer again.",
        ["She has just opened a supermarket again.", "She has just painted a station again.", "She has just climbed a tower again."],
      ),
      f(
        "The guests have just arrived at the station, but the driver hasn't reached the entrance yet. He has already called twice to explain the delay.",
        "Who has just arrived at the station?",
        "The guests have just arrived at the station.",
        ["The shelves have just arrived at the station.", "The clouds have just arrived at the station.", "The ladders have just arrived at the station."],
        "Who hasn't reached the entrance yet?",
        "The driver hasn't reached the entrance yet.",
        ["The teacher hasn't reached the entrance yet.", "The dentist hasn't reached the entrance yet.", "The singer hasn't reached the entrance yet."],
        "How many times has he already called?",
        "He has already called twice.",
        ["He has already called twenty times.", "He has already called next week.", "He has already called in silence."],
      ),
      f(
        "Our team has already sent the first report. We have just started the second one, and we haven't checked the final chart yet.",
        "What has the team already sent?",
        "The team has already sent the first report.",
        ["The team has already sent the first bicycle.", "The team has already sent the first dessert.", "The team has already sent the first mountain."],
        "What have they just started?",
        "They have just started the second report.",
        ["They have just started the second airport.", "They have just started the second river.", "They have just started the second jacket."],
        "What haven't they checked yet?",
        "They haven't checked the final chart yet.",
        ["They haven't checked the final forest yet.", "They haven't checked the final bus stop yet.", "They haven't checked the final blanket yet."],
      ),
      f(
        "Sara hasn't eaten lunch yet because she has just finished a long meeting. However, she has already decided what she wants to order.",
        "Why hasn't Sara eaten lunch yet?",
        "Because she has just finished a long meeting.",
        ["Because she has just fixed a bicycle.", "Because she has just cleaned a window.", "Because she has just crossed a tunnel."],
        "What has she already done?",
        "She has already decided what she wants to order.",
        ["She has already planted what she wants to order.", "She has already borrowed what she wants to order.", "She has already hidden what she wants to order."],
        "How long was the meeting?",
        "It was long.",
        ["It was underwater.", "It was edible.", "It was square."],
      ),
      f(
        "Have you finished the chapter yet? Miguel has already read it, and he has just written a short summary for the class discussion.",
        "What is the question about?",
        "It is about finishing the chapter.",
        ["It is about buying a sandwich.", "It is about driving a truck.", "It is about painting a gate."],
        "Who has already read the chapter?",
        "Miguel has already read it.",
        ["Lena has already read it.", "The cashier has already read it.", "The driver has already read it."],
        "What has Miguel just written?",
        "He has just written a short summary.",
        ["He has just written a long recipe.", "He has just written a train ticket.", "He has just written a sea map."],
      ),
    ],
  },
  {
    number: 78,
    title: "Lesson 78: However to Compare and Contrast Ideas",
    vocab: [
      v("contrast", "a strong difference between two ideas", "The writer uses ____ to compare both options.", ["request", "harvest", "habit"]),
      v("comparison", "the act of showing how things are similar or different", "This ____ helps us understand the topic better.", ["deadline", "wire", "tide"]),
      v("although", "a word used to show contrast in one sentence", "_____ the task was difficult, we finished it.", ["Because", "Therefore", "Already"]),
      v("however", "a connector used to introduce a different idea", "The room was small. _____, it felt comfortable.", ["Used to", "Would", "Yet"]),
      v("but", "a simple connector used for contrast in the same sentence", "I was tired, ____ I kept working.", ["so", "because", "due to"]),
      v("in contrast", "a phrase used to show clear difference", "City life is noisy. _____, the countryside is quiet.", ["In contrast", "Would rather", "Due to the rain"]),
      v("similar", "almost the same", "Their goals are different, but their values are ____.", ["borrowed", "formal", "shallow"]),
      v("different result", "an outcome that is not the same", "She studied a lot; however, the test gave a ____.", ["wire shelf", "bag window", "dress route"]),
      v("two sides", "two different aspects of a topic", "A good discussion often shows ____.", ["fresh water", "quiet music", "small traffic"]),
      v("opposite idea", "an idea that contrasts with another", "However often introduces an ____.", ["kind lunch", "deep shelf", "orange towel"]),
    ],
    grammar: [
      g("The test was difficult, ___ I passed.", "but", ["but", "however", "although", "therefore"], "The test was difficult, but I passed.", c("The test was difficult, however I passed.", "The test was difficult, but I passed.", ["The test was difficult, but I passed.", "The test was difficult, however I passed.", "The test was difficult because I passed.", "The test was difficult, although I passed."])),
      g("The test was difficult. ___, I passed.", "However", ["However", "But", "Because", "So"], "The test was difficult. However, I passed.", c("The test was difficult. But, I passed.", "The test was difficult. However, I passed.", ["The test was difficult. However, I passed.", "The test was difficult. But, I passed.", "The test was difficult. Because, I passed.", "The test was difficult. Therefore, because I passed."])),
      g("___ the test was difficult, I passed.", "Although", ["Although", "However", "But", "Therefore"], "Although the test was difficult, I passed.", c("However the test was difficult, I passed.", "Although the test was difficult, I passed.", ["Although the test was difficult, I passed.", "However the test was difficult, I passed.", "But the test was difficult, I passed.", "Therefore the test was difficult, I passed."])),
      g("She studied a lot. ___, she was still nervous.", "However", ["However", "But", "Because", "So"], "She studied a lot. However, she was still nervous.", c("She studied a lot, however she was still nervous.", "She studied a lot. However, she was still nervous.", ["She studied a lot. However, she was still nervous.", "She studied a lot, however she was still nervous.", "She studied a lot. Because, she was still nervous.", "She studied a lot. So, she was still nervous."])),
      g("I like early mornings, ___ my brother prefers the evening.", "but", ["but", "however", "although", "therefore"], "I like early mornings, but my brother prefers the evening.", c("I like early mornings. But my brother prefers the evening.", "I like early mornings, but my brother prefers the evening.", ["I like early mornings, but my brother prefers the evening.", "I like early mornings. But my brother prefers the evening.", "I like early mornings, however my brother prefers the evening.", "I like early mornings because my brother prefers the evening."])),
      g("The hotel was expensive. However, it ___ close to the station.", "was", ["was", "is", "were", "be"], "The hotel was expensive. However, it was close to the station."),
      g("Although the movie was long, we ___ it.", "enjoyed", ["enjoyed", "enjoy", "would", "therefore"], "Although the movie was long, we enjoyed it."),
      g("Her idea sounded simple, but it ___ effective.", "was", ["was", "is", "were", "be"], "Her idea sounded simple, but it was effective."),
      g("In contrast, the second plan ___ more flexible.", "was", ["was", "were", "be", "would"], "In contrast, the second plan was more flexible."),
      g("The train was late. However, we ___ arrive on time.", "did", ["did", "do", "would", "are"], "The train was late. However, we did arrive on time."),
    ],
    listening: [
      l("The test was difficult, but I passed.", "What happened even though the test was difficult?", "the speaker passed", ["the speaker slept", "the speaker borrowed money", "the speaker canceled the exam"], "Which connector shows contrast in one sentence?", "but", ["however", "therefore", "because"]),
      l("The test was difficult. However, I passed.", "What idea comes after however?", "the speaker passed", ["the speaker left early", "the speaker built a shelf", "the speaker caught a fish"], "Does however usually begin a new sentence or join two clauses with a comma only?", "begin a new sentence", ["join with a comma only", "replace every noun", "mark a past habit"]),
      l("Although the test was difficult, I passed.", "Which connector starts the contrasting clause?", "although", ["but", "yet", "just"], "What was the result despite the difficulty?", "the speaker passed", ["the speaker failed", "the speaker borrowed money", "the speaker stayed home"]),
      l("She studied a lot. However, she was still nervous.", "What was still true after studying a lot?", "she was still nervous", ["she was still asleep", "she was still in another city", "she was still a child"], "Which connector sounds more formal here?", "however", ["but", "so", "already"]),
      l("I like early mornings, but my brother prefers the evening.", "Who prefers the evening?", "the speaker's brother", ["the speaker", "the teacher", "the manager"], "What does but connect?", "two contrasting ideas", ["two equal commands", "two past habits only", "two questions only"]),
    ],
    speakingPrompts: [
      s("Make one sentence with but.", "The test was difficult, but I passed.", ["I was tired, but I kept working."]),
      s("Make one sentence with however.", "The test was difficult. However, I passed.", ["She studied a lot. However, she was still nervous."]),
      s("Make one sentence with although.", "Although the test was difficult, I passed.", ["Although the movie was long, we enjoyed it."]),
      s("Compare two preferences.", "I like early mornings, but my brother prefers the evening.", ["I enjoy city life. However, my sister prefers the countryside."]),
      s("Describe a surprising result.", "Her idea sounded simple, but it was effective.", ["The plan looked risky. However, it worked well."]),
    ],
    writing: [
      w("The test was difficult, _____ I passed.", "The test was difficult, but I passed.", "but"),
      w("The test was difficult. _____, I passed.", "The test was difficult. However, I passed.", "However"),
      w("_____ the test was difficult, I passed.", "Although the test was difficult, I passed.", "Although"),
      w("She studied a lot. _____, she was still nervous.", "She studied a lot. However, she was still nervous.", "However"),
      w("I like early mornings, _____ my brother prefers the evening.", "I like early mornings, but my brother prefers the evening.", "but"),
    ],
    facts: [
      f(
        "Lucas grew up in a peaceful town. However, he later moved to a crowded city as a missionary. Although the city felt overwhelming at first, he found a welcoming church there.",
        "Where did Lucas move later?",
        "He moved to a crowded city later.",
        ["He moved to a reef later.", "He moved to a bakery shelf later.", "He moved to a train station later."],
        "How did the city feel at first?",
        "It felt overwhelming at first.",
        ["It felt empty at first.", "It felt invisible at first.", "It felt underwater at first."],
        "What did he find there?",
        "He found a welcoming church there.",
        ["He found a broken bridge there.", "He found a noisy elevator there.", "He found a frozen orchard there."],
      ),
      f(
        "Marta studied hard for the interview, but she still felt nervous. However, once the conversation started, she answered clearly and calmly.",
        "What did Marta do before the interview?",
        "She studied hard for the interview.",
        ["She ignored the interview.", "She borrowed the interview.", "She painted the interview."],
        "How did she still feel?",
        "She still felt nervous.",
        ["She still felt hungry for oranges only.", "She still felt like a bookshelf.", "She still felt invisible to clouds."],
        "How did she answer once the conversation started?",
        "She answered clearly and calmly.",
        ["She answered loudly and carelessly.", "She answered slowly and angrily.", "She answered by singing only."],
      ),
      f(
        "The hotel was expensive. However, it was clean, quiet, and close to the station. Although we hesitated at first, we chose it in the end.",
        "What was the hotel like besides being expensive?",
        "It was clean, quiet, and close to the station.",
        ["It was noisy, far, and unfinished.", "It was cheap, broken, and crowded.", "It was underwater, dark, and frozen."],
        "What did the group do in the end?",
        "They chose the hotel in the end.",
        ["They built the hotel in the end.", "They painted the hotel in the end.", "They borrowed the hotel in the end."],
        "Did they hesitate at first?",
        "Yes, they hesitated at first.",
        ["No, they slept at first.", "No, they sang at first.", "No, they climbed at first."],
      ),
      f(
        "Sara likes online classes because they are flexible. In contrast, her brother prefers face-to-face classes because he focuses better in a classroom.",
        "Why does Sara like online classes?",
        "Because they are flexible.",
        ["Because they are colder.", "Because they are louder.", "Because they are more expensive."],
        "What does her brother prefer?",
        "He prefers face-to-face classes.",
        ["He prefers airport classes.", "He prefers bridge classes.", "He prefers ocean classes."],
        "Why does he prefer them?",
        "Because he focuses better in a classroom.",
        ["Because he swims better in a classroom.", "Because he paints better in a classroom.", "Because he drives better in a classroom."],
      ),
      f(
        "Although the weather was cold, the volunteers worked outside for hours. They were tired, but they felt proud because the community garden looked beautiful.",
        "What was the weather like?",
        "It was cold.",
        ["It was made of wax.", "It was full of ladders.", "It was written on a shelf."],
        "How long did the volunteers work outside?",
        "They worked outside for hours.",
        ["They worked outside for one second.", "They worked outside for next year.", "They worked outside for a teaspoon."],
        "How did they feel in the end?",
        "They felt proud.",
        ["They felt invisible.", "They felt borrowed.", "They felt canceled."],
      ),
    ],
  },
  {
    number: 79,
    title: "Lesson 79: On the One Hand and On the Other Hand",
    vocab: [
      v("advantage", "a good point or benefit", "Lower cost is one clear ____ of this option.", ["warning", "wire", "counter"]),
      v("drawback", "a negative point or disadvantage", "The biggest ____ is the long commute.", ["request", "porch", "surface"]),
      v("convenient", "easy and practical", "Online classes are often more ____ for busy adults.", ["borrowed", "formal", "wet"]),
      v("isolated", "feeling alone or separated from others", "Some students feel ____ when they study from home.", ["careful", "recent", "quietly"]),
      v("balanced opinion", "an opinion that shows more than one side", "The speaker gave a ____ instead of a simple yes or no.", ["market shelf", "deep river", "tired ladder"]),
      v("on the one hand", "used to introduce one side of an argument", "_____ , this plan saves money.", ["On the one hand", "Therefore", "Used to"]),
      v("on the other hand", "used to introduce the opposite side", "_____ , it takes more time.", ["On the other hand", "Already", "Would rather"]),
      v("city life", "life in a city", "_____ can be exciting but exhausting.", ["City life", "Blank report", "Late umbrella"]),
      v("healthy food", "food that is good for your body", "Some people say _____ is expensive, but others say it is worth it.", ["city life", "sharp traffic", "formal candy"]),
      v("time-saving", "helping you save time", "A short commute is a ____ benefit.", ["polite rain", "borrowed train", "careless shelf"]),
    ],
    grammar: [
      g("___, online classes are convenient.", "On the one hand", ["On the one hand", "On the other hand", "However", "Because"], "On the one hand, online classes are convenient.", c("On the other hand, online classes are convenient.", "On the one hand, online classes are convenient.", ["On the one hand, online classes are convenient.", "On the other hand, online classes are convenient.", "Because, online classes are convenient.", "Used to, online classes are convenient."])),
      g("___, students may feel isolated.", "On the other hand", ["On the other hand", "On the one hand", "Therefore", "Already"], "On the other hand, students may feel isolated.", c("On the one hand, students may feel isolated.", "On the other hand, students may feel isolated.", ["On the other hand, students may feel isolated.", "On the one hand, students may feel isolated.", "Therefore, students may feel isolated.", "Just, students may feel isolated."])),
      g("On the one hand, this option is cheaper. ___, it takes more time.", "On the other hand", ["On the other hand", "Because", "Yet", "Would"], "On the one hand, this option is cheaper. On the other hand, it takes more time.", c("On the one hand, this option is cheaper. Because, it takes more time.", "On the one hand, this option is cheaper. On the other hand, it takes more time.", ["On the one hand, this option is cheaper. On the other hand, it takes more time.", "On the one hand, this option is cheaper. Because, it takes more time.", "On the one hand, this option is cheaper. Yet, it takes more time on the other hand.", "On the one hand, this option is cheaper. Would, it takes more time."])),
      g("On the one hand, city life is exciting. On the other hand, it can be ___", "stressful", ["stressful", "stressed", "stress", "stressfully"], "On the one hand, city life is exciting. On the other hand, it can be stressful.", c("On the one hand, city life is exciting. On the other hand, it can be stressed.", "On the one hand, city life is exciting. On the other hand, it can be stressful.", ["On the one hand, city life is exciting. On the other hand, it can be stressful.", "On the one hand, city life is exciting. On the other hand, it can be stressed.", "On the one hand, city life is exciting. On the other hand, it can stress.", "On the one hand, city life is exciting. On the other hand, it can be stressly."])),
      g("On the one hand, healthy food is expensive. On the other hand, it is ___ for your body.", "better", ["better", "best", "well", "goodly"], "On the one hand, healthy food is expensive. On the other hand, it is better for your body.", c("On the one hand, healthy food is expensive. On the other hand, it is best for your body.", "On the one hand, healthy food is expensive. On the other hand, it is better for your body.", ["On the one hand, healthy food is expensive. On the other hand, it is better for your body.", "On the one hand, healthy food is expensive. On the other hand, it is best for your body.", "On the one hand, healthy food is expensive. On the other hand, it is goodly for your body.", "On the one hand, healthy food is expensive. On the other hand, it is well for your body."])),
      g("On the one hand, travel by bus is cheap. On the other hand, it ___ longer.", "takes", ["takes", "take", "taking", "took"], "On the one hand, travel by bus is cheap. On the other hand, it takes longer."),
      g("On the one hand, working from home is quiet. On the other hand, it can feel ___", "lonely", ["lonely", "alone", "quietly", "silence"], "On the one hand, working from home is quiet. On the other hand, it can feel lonely."),
      g("On the one hand, this app is simple. On the other hand, it offers ___ features.", "useful", ["useful", "use", "used", "usefully"], "On the one hand, this app is simple. On the other hand, it offers useful features."),
      g("On the one hand, homework builds discipline. On the other hand, it can ___ students.", "tire", ["tire", "tired", "tiring", "to tire"], "On the one hand, homework builds discipline. On the other hand, it can tire students."),
      g("On the one hand, the city has many jobs. On the other hand, the rent is ___", "high", ["high", "highly", "higherly", "height"], "On the one hand, the city has many jobs. On the other hand, the rent is high."),
    ],
    listening: [
      l("On the one hand, online classes are convenient.", "What are online classes described as?", "convenient", ["dangerous", "empty", "silent"], "Which phrase introduces the first side?", "on the one hand", ["on the other hand", "however", "yet"]),
      l("On the other hand, students may feel isolated.", "How may some students feel?", "isolated", ["excited", "borrowed", "formal"], "Which phrase introduces the other side?", "on the other hand", ["on the one hand", "therefore", "because"]),
      l("On the one hand, this option is cheaper. On the other hand, it takes more time.", "What is the advantage of the option?", "it is cheaper", ["it is faster", "it is larger", "it is cleaner"], "What is the drawback?", "it takes more time", ["it is too quiet", "it is already closed", "it is full of rain"]),
      l("On the one hand, city life is exciting. On the other hand, it can be stressful.", "How is city life described first?", "exciting", ["boring", "careless", "cheap"], "How is it described second?", "stressful", ["calm", "perfect", "small"]),
      l("On the one hand, healthy food is expensive. On the other hand, it is better for your body.", "What is the cost problem?", "it is expensive", ["it is late", "it is sharp", "it is borrowed"], "What is the benefit?", "it is better for your body", ["it is louder for your body", "it is wider for your body", "it is smaller for your body"]),
    ],
    speakingPrompts: [
      s("Give one balanced opinion about online classes.", "On the one hand, online classes are convenient. On the other hand, students may feel isolated."),
      s("Give one balanced opinion about city life.", "On the one hand, city life is exciting. On the other hand, it can be stressful."),
      s("Give one balanced opinion about healthy food.", "On the one hand, healthy food is expensive. On the other hand, it is better for your body."),
      s("Give one balanced opinion about transport.", "On the one hand, travel by bus is cheap. On the other hand, it takes more time."),
      s("Give one balanced opinion about homework.", "On the one hand, homework builds discipline. On the other hand, it can tire students."),
    ],
    writing: [
      w("_____, online classes are convenient.", "On the one hand, online classes are convenient.", "On the one hand"),
      w("_____, students may feel isolated.", "On the other hand, students may feel isolated.", "On the other hand"),
      w("On the one hand, this option is cheaper. _____, it takes more time.", "On the one hand, this option is cheaper. On the other hand, it takes more time.", "On the other hand"),
      w("On the one hand, city life is exciting. On the other hand, it can be _____.", "On the one hand, city life is exciting. On the other hand, it can be stressful.", "stressful"),
      w("On the one hand, healthy food is expensive. On the other hand, it is _____ for your body.", "On the one hand, healthy food is expensive. On the other hand, it is better for your body.", "better"),
    ],
    facts: [
      f(
        "Clara is thinking about taking online classes next term. On the one hand, the schedule is flexible and time-saving. On the other hand, she worries that she may feel isolated at home.",
        "What is Clara thinking about taking next term?",
        "She is thinking about taking online classes.",
        ["She is thinking about taking a train ticket.", "She is thinking about taking a new ladder.", "She is thinking about taking a river map."],
        "What is one advantage of the schedule?",
        "It is flexible and time-saving.",
        ["It is noisy and expensive.", "It is wet and dangerous.", "It is empty and formal."],
        "What is one worry she has?",
        "She worries that she may feel isolated at home.",
        ["She worries that she may grow wings at home.", "She worries that she may lose the ocean at home.", "She worries that she may borrow the station at home."],
      ),
      f(
        "David likes city life. On the one hand, there are many job opportunities and cultural events. On the other hand, traffic and rent make daily life more stressful.",
        "Why does David like city life?",
        "Because there are many job opportunities and cultural events.",
        ["Because there are many empty caves and quiet storms.", "Because there are many broken shelves and slow trains.", "Because there are many hidden ladders and cold reefs."],
        "What makes daily life more stressful?",
        "Traffic and rent make daily life more stressful.",
        ["Candy and cereal make daily life more stressful.", "Feathers and beaks make daily life more stressful.", "Wax and pollen make daily life more stressful."],
        "Is his opinion balanced or one-sided?",
        "It is balanced.",
        ["It is completely one-sided.", "It is imaginary only.", "It is impossible to know."],
      ),
      f(
        "Marta wants to cook healthier meals. On the one hand, fresh ingredients cost more. On the other hand, she believes good food will help her feel stronger and more focused.",
        "What does Marta want to cook?",
        "She wants to cook healthier meals.",
        ["She wants to cook louder meetings.", "She wants to cook faster tickets.", "She wants to cook wider windows."],
        "What is the drawback of fresh ingredients?",
        "They cost more.",
        ["They sing more.", "They travel more.", "They disappear more."],
        "What does she believe good food will do?",
        "She believes it will help her feel stronger and more focused.",
        ["She believes it will help her feel wetter and smaller.", "She believes it will help her feel borrowed and hidden.", "She believes it will help her feel slower and darker."],
      ),
      f(
        "The family is choosing between bus travel and driving. On the one hand, the bus is cheaper. On the other hand, driving gives them more freedom to stop along the way.",
        "What are the two travel options?",
        "The options are bus travel and driving.",
        ["The options are swimming and flying.", "The options are painting and singing.", "The options are reading and dancing."],
        "Why is the bus attractive?",
        "Because it is cheaper.",
        ["Because it is taller.", "Because it is colder.", "Because it is cleaner only for birds."],
        "What advantage does driving give them?",
        "It gives them more freedom to stop along the way.",
        ["It gives them more wax to carry along the way.", "It gives them more clouds to lend along the way.", "It gives them more ladders to paint along the way."],
      ),
      f(
        "Sara and Leo are discussing homework. On the one hand, they agree that it builds discipline. On the other hand, they think too much homework can reduce rest and family time.",
        "What positive point do Sara and Leo agree on?",
        "They agree that homework builds discipline.",
        ["They agree that homework builds highways.", "They agree that homework builds oceans.", "They agree that homework builds umbrellas."],
        "What negative point do they mention?",
        "Too much homework can reduce rest and family time.",
        ["Too much homework can increase the size of the moon.", "Too much homework can sharpen the rain.", "Too much homework can color the wind."],
        "Are they presenting one side or two sides?",
        "They are presenting two sides.",
        ["They are presenting no sides.", "They are presenting only one side.", "They are presenting a recipe."],
      ),
    ],
  },
  {
    number: 80,
    title: "Lesson 80: Say/Tell, Hear/Listen and Borrow/Lend",
    vocab: [
      v("say", "to speak words, focusing on the message", "She didn't ____ anything about the delay.", ["lend", "borrow", "listen"]),
      v("tell", "to give information to a person directly", "Please ____ me the truth.", ["hear", "say", "arrive"]),
      v("hear", "to receive a sound without trying", "I could ____ a noise outside.", ["lend", "talk", "borrow"]),
      v("listen", "to pay attention to sound on purpose", "Please ____ to the teacher carefully.", ["hear", "say", "tell"]),
      v("borrow", "to take something temporarily from another person", "Can I ____ your pen for a minute?", ["lend", "hear", "speak"]),
      v("lend", "to give something temporarily", "Could you ____ me your pen?", ["borrow", "tell", "watch"]),
      v("a noise", "a sound that may be loud or noticeable", "I heard ____ in the kitchen.", ["a promise", "to advice", "the manager to"]),
      v("the truth", "what is real or honest", "Please tell me ____.", ["to music", "somebody nicely", "a break"]),
      v("to the teacher", "toward the teacher's voice or message", "The students listened ____.", ["a window", "the weather", "for a ladder"]),
      v("a pen", "a common object used in borrow and lend examples", "Can I borrow ____?", ["an opinion", "a contrast", "a result"]),
    ],
    grammar: [
      g("She ___ she was tired.", "said", ["said", "told", "heard", "listened"], "She said she was tired.", c("She told she was tired.", "She said she was tired.", ["She said she was tired.", "She told she was tired.", "She listened she was tired.", "She heard she was tired."])),
      g("She ___ me the truth.", "told", ["told", "said", "heard", "borrowed"], "She told me the truth.", c("She said me the truth.", "She told me the truth.", ["She told me the truth.", "She said me the truth.", "She heard me the truth.", "She borrowed me the truth."])),
      g("I ___ a noise last night.", "heard", ["heard", "listened", "told", "lent"], "I heard a noise last night.", c("I listened a noise last night.", "I heard a noise last night.", ["I heard a noise last night.", "I listened a noise last night.", "I told a noise last night.", "I lent a noise last night."])),
      g("The students ___ to the teacher carefully.", "listened", ["listened", "heard", "said", "borrowed"], "The students listened to the teacher carefully.", c("The students heard to the teacher carefully.", "The students listened to the teacher carefully.", ["The students listened to the teacher carefully.", "The students heard to the teacher carefully.", "The students said to the teacher carefully.", "The students borrowed to the teacher carefully."])),
      g("Can I ___ your pen for a minute?", "borrow", ["borrow", "lend", "say", "hear"], "Can I borrow your pen for a minute?", c("Can I lend your pen for a minute?", "Can I borrow your pen for a minute?", ["Can I borrow your pen for a minute?", "Can I lend your pen for a minute?", "Can I hear your pen for a minute?", "Can I say your pen for a minute?"])),
      g("Could you ___ me your pen?", "lend", ["lend", "borrow", "say", "listen"], "Could you lend me your pen?"),
      g("Did she ___ anything about the meeting?", "say", ["say", "tell", "hear", "lend"], "Did she say anything about the meeting?"),
      g("Please ___ me what happened after class.", "tell", ["tell", "say", "hear", "borrow"], "Please tell me what happened after class."),
      g("I couldn't ___ the announcement because the room was loud.", "hear", ["hear", "listen", "say", "lend"], "I couldn't hear the announcement because the room was loud."),
      g("Try to ___ to the full explanation before you answer.", "listen", ["listen", "hear", "say", "tell"], "Try to listen to the full explanation before you answer."),
    ],
    listening: [
      l("She said she was tired.", "What did she say?", "she was tired", ["she was hungry", "she was rich", "she was early"], "Does say focus on the message or the listener?", "the message", ["the listener", "a borrowed object", "a direction"]),
      l("She told me the truth.", "Who received the truth?", "me", ["the weather", "the station", "the shelf"], "Does tell usually need a person after it?", "yes", ["no", "only with animals", "only in questions"]),
      l("I heard a noise last night.", "What did the speaker hear?", "a noise", ["a notebook", "a cereal box", "a jacket"], "Did the speaker actively focus on the sound or simply receive it?", "simply receive it", ["actively focus on it", "give it away", "borrow it"]),
      l("The students listened to the teacher carefully.", "Who did the students listen to?", "the teacher", ["the bus", "the raincoat", "the mountain"], "Does listen need to before the person or thing?", "yes", ["no", "only in the past", "only with borrow"]),
      l("Can I borrow your pen for a minute?", "What does the speaker want to borrow?", "a pen", ["a song", "a result", "a greeting"], "Is borrow the act of giving or receiving temporarily?", "receiving temporarily", ["giving temporarily", "hearing a sound", "telling a message"]),
    ],
    speakingPrompts: [
      s("Say one sentence with say.", "She said she was tired.", ["He said good morning."]),
      s("Say one sentence with tell.", "She told me the truth.", ["Please tell me what happened."]),
      s("Say one sentence with hear.", "I heard a noise last night.", ["We heard music from the hall."]),
      s("Say one sentence with listen to.", "The students listened to the teacher carefully.", ["Please listen to the full explanation."]),
      s("Make one borrow and lend exchange.", "Can I borrow your pen? Yes, I can lend it to you.", ["Could you lend me your notebook?"]),
    ],
    writing: [
      w("She _____ she was tired.", "She said she was tired.", "said"),
      w("She _____ me the truth.", "She told me the truth.", "told"),
      w("I _____ a noise last night.", "I heard a noise last night.", "heard"),
      w("The students _____ to the teacher carefully.", "The students listened to the teacher carefully.", "listened"),
      w("Can I _____ your pen for a minute?", "Can I borrow your pen for a minute?", "borrow"),
    ],
    facts: [
      f(
        "During class, Emma said she was confused, so the teacher told her the instructions again. Emma listened carefully this time and later said the task was much clearer.",
        "What did Emma say during class?",
        "She said she was confused.",
        ["She said she was a dolphin.", "She said she was a shelf.", "She said she was a train."],
        "What did the teacher tell her?",
        "The teacher told her the instructions again.",
        ["The teacher told her a weather report again.", "The teacher told her a tide map again.", "The teacher told her a ladder color again."],
        "What did Emma do the second time?",
        "She listened carefully.",
        ["She borrowed carefully.", "She painted carefully.", "She canceled carefully."],
      ),
      f(
        "At the library, Leo asked, \"Can I borrow your pen?\" His friend smiled and said, \"Of course. I can lend it to you for the whole lesson.\"",
        "What did Leo want to borrow?",
        "He wanted to borrow a pen.",
        ["He wanted to borrow a train.", "He wanted to borrow a wave.", "He wanted to borrow a wall."],
        "What did his friend say?",
        "His friend said that he could lend it to him.",
        ["His friend said that he could hide it from him.", "His friend said that he could paint it over him.", "His friend said that he could freeze it under him."],
        "For how long could Leo keep it?",
        "For the whole lesson.",
        ["For the whole month.", "For the whole ocean.", "For the whole station platform."],
      ),
      f(
        "Maya heard a strange noise near the door, but nobody else seemed to hear it. She stopped talking and listened carefully until she realized it was only the wind.",
        "What did Maya hear?",
        "She heard a strange noise near the door.",
        ["She heard a strange fruit near the door.", "She heard a strange ladder near the door.", "She heard a strange notebook near the door."],
        "What did she do next?",
        "She listened carefully.",
        ["She borrowed carefully.", "She smiled to the shelf.", "She told the wind a story."],
        "What was the noise in the end?",
        "It was only the wind.",
        ["It was only a bus ticket.", "It was only a desk lamp.", "It was only a bowl of cereal."],
      ),
      f(
        "The manager said the meeting would start late, and later she told the whole team the reason. Because everyone listened, the afternoon went more smoothly.",
        "What did the manager say first?",
        "She said the meeting would start late.",
        ["She said the meeting would swim away.", "She said the meeting would borrow a shelf.", "She said the meeting would grow feathers."],
        "What did she tell the whole team later?",
        "She told them the reason.",
        ["She told them a bicycle later.", "She told them a sandwich later.", "She told them a garden later."],
        "Why did the afternoon go more smoothly?",
        "Because everyone listened.",
        ["Because everyone slept.", "Because everyone painted windows.", "Because everyone climbed trees."],
      ),
      f(
        "Sara forgot her notebook, so she asked, \"Can you lend me one page to copy the homework?\" Her classmate said yes and told her not to worry.",
        "What did Sara forget?",
        "She forgot her notebook.",
        ["She forgot her airport.", "She forgot her weather.", "She forgot her reef."],
        "What did she ask to borrow or use?",
        "She asked for one page to copy the homework.",
        ["She asked for one cloud to copy the homework.", "She asked for one engine to copy the homework.", "She asked for one tide to copy the homework."],
        "What did her classmate tell her?",
        "Her classmate told her not to worry.",
        ["Her classmate told her to close the station.", "Her classmate told her to borrow the wind.", "Her classmate told her to paint the rain."],
      ),
    ],
  },
  {
    number: 81,
    title: "Lesson 81: Describing Emotions and Behaviors",
    vocab: [
      v("bored", "feeling no interest", "I felt ____ during the long speech.", ["boring", "polite", "careless"]),
      v("boring", "causing no interest", "The movie was ____ from the beginning.", ["bored", "calm", "careful"]),
      v("excited", "feeling strong positive energy", "She was ____ about the trip.", ["exciting", "rude", "careless"]),
      v("exciting", "causing strong positive energy", "The news was really ____.", ["excited", "nervous", "polite"]),
      v("confused", "unable to understand clearly", "He looked ____ after the explanation.", ["confusing", "hopeful", "gentle"]),
      v("confusing", "hard to understand", "The directions were ____ to the new students.", ["confused", "careful", "relaxed"]),
      v("worried", "feeling anxious or concerned", "I felt ____ before the interview.", ["worrying", "rude", "boring"]),
      v("relaxed", "calm and free from stress", "After the walk, she felt more ____.", ["relaxing", "careless", "angry"]),
      v("polite", "showing good manners", "He was very ____ with the waiter.", ["nervous", "bored", "silent"]),
      v("careless", "not careful and likely to make mistakes", "That was a ____ mistake.", ["careful", "excited", "interesting"]),
    ],
    grammar: [
      g("I was ___ during the movie.", "bored", ["bored", "boring", "bore", "boredly"], "I was bored during the movie.", c("I was boring during the movie.", "I was bored during the movie.", ["I was bored during the movie.", "I was boring during the movie.", "I was bore during the movie.", "I was boredly during the movie."])),
      g("The movie was ___", "boring", ["boring", "bored", "bore", "boringly"], "The movie was boring.", c("The movie was bored.", "The movie was boring.", ["The movie was boring.", "The movie was bored.", "The movie was bore.", "The movie was boringly."])),
      g("She felt ___ after hearing the good news.", "excited", ["excited", "exciting", "excite", "excitedly"], "She felt excited after hearing the good news.", c("She felt exciting after hearing the good news.", "She felt excited after hearing the good news.", ["She felt excited after hearing the good news.", "She felt exciting after hearing the good news.", "She felt excite after hearing the good news.", "She felt excitedly after hearing the good news."])),
      g("The announcement was ___ for the whole team.", "exciting", ["exciting", "excited", "excite", "excitedly"], "The announcement was exciting for the whole team.", c("The announcement was excited for the whole team.", "The announcement was exciting for the whole team.", ["The announcement was exciting for the whole team.", "The announcement was excited for the whole team.", "The announcement was excite for the whole team.", "The announcement was excitedly for the whole team."])),
      g("He looked ___ after the long explanation.", "confused", ["confused", "confusing", "confuse", "confusedly"], "He looked confused after the long explanation.", c("He looked confusing after the long explanation.", "He looked confused after the long explanation.", ["He looked confused after the long explanation.", "He looked confusing after the long explanation.", "He looked confuse after the long explanation.", "He looked confusedly after the long explanation."])),
      g("The directions were ___ to the new students.", "confusing", ["confusing", "confused", "confuse", "confusedly"], "The directions were confusing to the new students."),
      g("She behaved ___ during the discussion.", "politely", ["politely", "polite", "politeness", "more polite"], "She behaved politely during the discussion."),
      g("They acted ___ and checked the numbers twice.", "carefully", ["carefully", "careful", "careless", "care"], "They acted carefully and checked the numbers twice."),
      g("He felt ___ before the interview, but later he relaxed.", "worried", ["worried", "worrying", "worry", "worriedly"], "He felt worried before the interview, but later he relaxed."),
      g("After the walk, we felt more ___", "relaxed", ["relaxed", "relaxing", "relax", "relaxedly"], "After the walk, we felt more relaxed."),
    ],
    listening: [
      l("I was bored during the movie.", "How did the speaker feel during the movie?", "bored", ["boring", "polite", "careless"], "Does bored describe a feeling or the cause?", "a feeling", ["the cause", "a connector", "a request"]),
      l("The movie was boring.", "What was boring?", "the movie", ["the speaker", "the weather", "the station"], "Does boring describe the feeling or the cause?", "the cause", ["the feeling", "a place", "a person being asked"]),
      l("She felt excited after hearing the good news.", "How did she feel?", "excited", ["exciting", "confusing", "rude"], "Why did she feel that way?", "because of the good news", ["because of the train", "because of the shelf", "because of the soup"]),
      l("The directions were confusing to the new students.", "What were confusing?", "the directions", ["the students", "the corridor", "the breakfast"], "Who had trouble understanding them?", "the new students", ["the old teacher", "the driver", "the manager"]),
      l("She behaved politely during the discussion.", "How did she behave?", "politely", ["bored", "excited", "careless"], "Is politely an adjective or an adverb here?", "an adverb", ["an adjective", "a noun", "a pronoun"]),
    ],
    speakingPrompts: [
      s("Describe a feeling with an -ed adjective.", "I was bored during the movie.", ["She felt excited after the good news."]),
      s("Describe a cause with an -ing adjective.", "The movie was boring.", ["The announcement was exciting."]),
      s("Describe someone after a hard explanation.", "He looked confused after the long explanation.", ["The directions were confusing to the new students."]),
      s("Describe polite behavior.", "She behaved politely during the discussion.", ["He acted politely with the waiter."]),
      s("Describe careful behavior.", "They acted carefully and checked the numbers twice.", ["She responded carefully to the message."]),
    ],
    writing: [
      w("I was _____ during the movie.", "I was bored during the movie.", "bored"),
      w("The movie was _____.", "The movie was boring.", "boring"),
      w("She felt _____ after hearing the good news.", "She felt excited after hearing the good news.", "excited"),
      w("The directions were _____ to the new students.", "The directions were confusing to the new students.", "confusing"),
      w("She behaved _____ during the discussion.", "She behaved politely during the discussion.", "politely"),
    ],
    facts: [
      f(
        "Sarah arrived at church feeling discouraged and worried. A kind woman spoke to her gently, and by the end of the conversation Sarah felt more hopeful and relaxed.",
        "How did Sarah feel when she arrived at church?",
        "She felt discouraged and worried.",
        ["She felt excited and playful.", "She felt hungry and loud.", "She felt invisible and frozen."],
        "How did the woman speak to her?",
        "She spoke to her gently.",
        ["She spoke to her carelessly.", "She spoke to her angrily.", "She spoke to her silently only."],
        "How did Sarah feel by the end?",
        "She felt more hopeful and relaxed.",
        ["She felt more confused and bored.", "She felt more borrowed and formal.", "She felt more narrow and cold."],
      ),
      f(
        "The class watched a boring documentary in the afternoon. Some students looked bored, but the teacher stayed calm and explained the most confusing parts carefully.",
        "What kind of documentary did the class watch?",
        "They watched a boring documentary.",
        ["They watched an exciting shelf.", "They watched a careful notebook.", "They watched a polite tunnel."],
        "How did some students look?",
        "They looked bored.",
        ["They looked exciting.", "They looked borrowed.", "They looked therefore."],
        "How did the teacher explain the difficult parts?",
        "The teacher explained them carefully.",
        ["The teacher explained them carelessly.", "The teacher explained them rudely.", "The teacher explained them underwater."],
      ),
      f(
        "Leo felt excited about his first interview, but he was also worried. He prepared carefully, spoke politely, and left a calm and respectful impression.",
        "What was Leo excited about?",
        "He was excited about his first interview.",
        ["He was excited about his first storm.", "He was excited about his first ladder.", "He was excited about his first reef."],
        "How did he prepare and speak?",
        "He prepared carefully and spoke politely.",
        ["He prepared carelessly and spoke rudely.", "He prepared silently and spoke angrily.", "He prepared slowly and spoke to the ocean."],
        "What kind of impression did he leave?",
        "He left a calm and respectful impression.",
        ["He left a noisy and careless impression.", "He left a frozen and empty impression.", "He left a borrowed and bright impression."],
      ),
      f(
        "Marta felt confused after reading the first version of the report because the language was too technical. However, the revised version was clearer and less confusing.",
        "Why did Marta feel confused?",
        "Because the language in the first version was too technical.",
        ["Because the room was too warm.", "Because the bus was too fast.", "Because the lunch was too sweet."],
        "What changed in the revised version?",
        "It became clearer and less confusing.",
        ["It became colder and wetter.", "It became louder and longer only.", "It became smaller than a pen."],
        "Was the second version easier to understand?",
        "Yes, it was easier to understand.",
        ["No, it was hidden in the tide.", "No, it was borrowed from the station.", "No, it was painted on a tree."],
      ),
      f(
        "At dinner, the waiter remained polite even when one customer sounded rude. His patient behavior helped the whole table relax and enjoy the evening.",
        "How did the waiter remain?",
        "He remained polite.",
        ["He remained bored.", "He remained confusing.", "He remained borrowed."],
        "How did one customer sound?",
        "The customer sounded rude.",
        ["The customer sounded excited.", "The customer sounded careful.", "The customer sounded relaxing."],
        "What effect did the waiter's behavior have?",
        "It helped the whole table relax and enjoy the evening.",
        ["It helped the whole table forget the restaurant.", "It helped the whole table climb the window.", "It helped the whole table borrow the menu."],
      ),
    ],
  },
  {
    number: 82,
    title: "Lesson 82: Starting, Maintaining and Ending Conversations",
    vocab: [
      v("greet", "to say hello and begin a conversation", "It helps to ____ people with a smile.", ["borrow", "compare", "ignore"]),
      v("follow-up question", "a question that continues a conversation", "A good ____ keeps the chat moving.", ["deadline warning", "tide map", "desk shelf"]),
      v("clarify", "to make something easier to understand", "Could you ____ that last point for me?", ["lend", "hear", "contrast"]),
      v("small talk", "light informal conversation", "At first, they made some ____ in line.", ["formal law", "broken traffic", "frozen current"]),
      v("take care", "a polite way to end a conversation", "She smiled and said, \"_____ .\"", ["see you later", "used to", "already"]),
      v("by the way", "used to introduce another connected topic", "_____ , I wanted to ask you something.", ["on the one hand", "due to the rain", "on the shelf"]),
      v("that reminds me", "used to connect a new thought with the current topic", "_____ of another question.", ["by the way", "it borrows me", "it hears me"]),
      v("could you explain that again", "a polite request for clarification", "If you are unsure, ask, \"_____?\"", ["could you repeat that", "would you already it", "did you use to it"]),
      v("nice talking to you", "a friendly phrase to close a conversation", "At the end, say, \"It was _____ .\"", ["good speaking to me", "boring hearing to you", "expensive saying to you"]),
      v("keep the conversation going", "to continue the exchange naturally", "Questions can help you _____ .", ["greet politely", "borrow the direction", "lend the contrast"]),
    ],
    grammar: [
      g("___, I wanted to ask you something.", "By the way", ["By the way", "On the one hand", "Due to", "Already"], "By the way, I wanted to ask you something.", c("Because the way, I wanted to ask you something.", "By the way, I wanted to ask you something.", ["By the way, I wanted to ask you something.", "Because the way, I wanted to ask you something.", "By the way I wanted ask you something.", "Already, I wanted to ask you something."])),
      g("That ___ me of another question.", "reminds", ["reminds", "says", "hears", "borrows"], "That reminds me of another question.", c("That remind me of another question.", "That reminds me of another question.", ["That reminds me of another question.", "That remind me of another question.", "That says me of another question.", "That borrows me of another question."])),
      g("Could you ___ that again?", "explain", ["explain", "explaining", "explained", "to explain"], "Could you explain that again?", c("Could you explained that again?", "Could you explain that again?", ["Could you explain that again?", "Could you explained that again?", "Could you explaining that again?", "Could you to explain that again?"])),
      g("Let me make sure I ___", "understood", ["understood", "understand", "understanding", "to understand"], "Let me make sure I understood.", c("Let me make sure I understanded.", "Let me make sure I understood.", ["Let me make sure I understood.", "Let me make sure I understanded.", "Let me make sure I understanding.", "Let me make sure I to understand."])),
      g("It was nice ___ to you.", "talking", ["talking", "talk", "talked", "to talk"], "It was nice talking to you.", c("It was nice talk to you.", "It was nice talking to you.", ["It was nice talking to you.", "It was nice talk to you.", "It was nice talked to you.", "It was nice to talking to you."])),
      g("How have you ___?", "been", ["been", "be", "was", "are"], "How have you been?"),
      g("Excuse me, can I ___ you something?", "ask", ["ask", "asking", "asked", "to ask"], "Excuse me, can I ask you something?"),
      g("Really? That's ___", "interesting", ["interesting", "interested", "interest", "interestingly"], "Really? That's interesting."),
      g("Well, I'd better get ___.", "going", ["going", "go", "gone", "to go"], "Well, I'd better get going."),
      g("See you ___", "later", ["later", "late", "latest", "lately"], "See you later."),
    ],
    listening: [
      l("By the way, I wanted to ask you something.", "What does the speaker want to do?", "ask something", ["borrow a book", "close a shop", "paint a wall"], "Which phrase introduces a connected new topic?", "by the way", ["that reminds me", "already", "therefore"]),
      l("That reminds me of another question.", "What does the phrase introduce?", "another question", ["another airport", "another bridge", "another apple tree"], "What does reminds mean here?", "it brings a thought back", ["it lends a pen", "it closes a door", "it sends a bus"]),
      l("Could you explain that again?", "What is the speaker asking for?", "clarification", ["transportation", "permission to leave", "a warning sign"], "Is this polite or direct?", "polite", ["rude", "careless", "past only"]),
      l("Let me make sure I understood.", "What is the speaker checking?", "their understanding", ["their jacket", "their train", "their dessert"], "Why might someone say this?", "to confirm meaning", ["to end an argument with no reason", "to compare two cities", "to describe a past habit"]),
      l("It was nice talking to you.", "When is this sentence often used?", "at the end of a conversation", ["at the start of a lesson", "in the middle of homework", "when borrowing a pen only"], "What does this sentence help you do?", "end a conversation politely", ["start an argument", "describe a past habit", "give a weather warning"]),
    ],
    speakingPrompts: [
      s("Start a conversation politely.", "Excuse me, can I ask you something?", ["Hi there, how have you been?"]),
      s("Add a new but connected point.", "By the way, I wanted to ask you something.", ["That reminds me of another question."]),
      s("Ask for clarification politely.", "Could you explain that again?", ["Let me make sure I understood."]),
      s("Show interest in the conversation.", "Really? That's interesting.", ["I see. That makes sense."]),
      s("End a conversation politely.", "It was nice talking to you. See you later.", ["Well, I'd better get going. Take care."]),
    ],
    writing: [
      w("_____, I wanted to ask you something.", "By the way, I wanted to ask you something.", "By the way"),
      w("That _____ me of another question.", "That reminds me of another question.", "reminds"),
      w("Could you _____ that again?", "Could you explain that again?", "explain"),
      w("Let me make sure I _____.", "Let me make sure I understood.", "understood"),
      w("It was nice _____ to you.", "It was nice talking to you.", "talking"),
    ],
    facts: [
      f(
        "Michael had been attending church for weeks but always sat alone. One Sunday, an older man greeted him warmly, asked a few follow-up questions, and ended the conversation by saying he hoped to see Michael again.",
        "How long had Michael been attending church alone?",
        "He had been attending church alone for weeks.",
        ["He had been attending church alone for hours only.", "He had been attending church alone for one train ride.", "He had been attending church alone for a spoonful."],
        "How did the older man begin the interaction?",
        "He greeted Michael warmly and asked follow-up questions.",
        ["He ignored Michael loudly and walked away.", "He borrowed Michael's shoes and laughed.", "He painted Michael's chair and vanished."],
        "How did the man end the conversation?",
        "He said he hoped to see Michael again.",
        ["He said he would close the church forever.", "He said he would take the bench home.", "He said he would swim to the station."],
      ),
      f(
        "At the supermarket, Nina smiled at a stranger and said, \"That's my favorite cereal too.\" The stranger replied kindly, and soon they were talking about breakfast habits and the neighborhood.",
        "What did Nina say first?",
        "She said that it was her favorite cereal too.",
        ["She said that the train was late too.", "She said that the shelf was broken too.", "She said that the storm was frozen too."],
        "How did the stranger reply?",
        "The stranger replied kindly.",
        ["The stranger replied carelessly.", "The stranger replied with total silence forever.", "The stranger replied by climbing a ladder."],
        "What topics did they begin discussing?",
        "They began discussing breakfast habits and the neighborhood.",
        ["They began discussing airport maps and sea currents.", "They began discussing broken shelves and train wheels.", "They began discussing mountain caves and river stones."],
      ),
      f(
        "During a meeting, Leo did not understand one instruction. He politely asked, \"Could you explain that again?\" and then added, \"Let me make sure I understood the deadline correctly.\"",
        "What did Leo not understand?",
        "He did not understand one instruction.",
        ["He did not understand one staircase.", "He did not understand one sandwich.", "He did not understand one bicycle."],
        "What did he ask politely?",
        "He asked if the speaker could explain it again.",
        ["He asked if the speaker could lend him a river.", "He asked if the speaker could paint his coffee.", "He asked if the speaker could hide the station."],
        "What did he want to make sure about?",
        "He wanted to make sure he understood the deadline correctly.",
        ["He wanted to make sure he understood the dessert correctly.", "He wanted to make sure he understood the weather correctly in the ocean.", "He wanted to make sure he understood the shelf correctly in the tunnel."],
      ),
      f(
        "Marta is good at small talk, but she also listens carefully. Because of that, people feel comfortable with her and conversations rarely stop too early.",
        "What is Marta good at?",
        "She is good at small talk.",
        ["She is good at building stations.", "She is good at freezing roads.", "She is good at borrowing clouds."],
        "What else does she do well?",
        "She also listens carefully.",
        ["She also shouts carelessly.", "She also hides instructions.", "She also paints silence."],
        "How do people feel with her?",
        "They feel comfortable with her.",
        ["They feel isolated from her instantly.", "They feel made of wax with her.", "They feel like traffic lights with her."],
      ),
      f(
        "When the conversation was ending, David smiled and said, \"It was nice talking to you. Take care.\" The other person left feeling seen and encouraged.",
        "What did David say when the conversation was ending?",
        "He said, \"It was nice talking to you. Take care.\"",
        ["He said, \"Close the window and borrow the rain.\"", "He said, \"Paint the shelf and climb the soup.\"", "He said, \"Catch the tide and lend the tunnel.\""],
        "How did the other person leave?",
        "They left feeling seen and encouraged.",
        ["They left feeling bored and ignored.", "They left feeling frozen and invisible.", "They left feeling borrowed and silent."],
        "What kind of ending was this?",
        "It was a polite and encouraging ending.",
        ["It was a rude and confusing ending.", "It was an angry and careless ending.", "It was a dangerous and formal ending."],
      ),
    ],
  },
  {
    number: 83,
    title: "Lesson 83: Everyday Verbs with Big Impact",
    vocab: [
      v("make a decision", "to choose after thinking", "You should ____ before the deadline.", ["do a decision", "take a decision", "have a decision"]),
      v("do homework", "to complete school tasks", "The children need to ____ before dinner.", ["make homework", "take homework", "pay homework"]),
      v("take a break", "to stop working for a short rest", "Let's ____ after this section.", ["make a break", "do a break", "have a break off"]),
      v("have a conversation", "to talk with someone", "We should ____ about the plan.", ["make a conversation", "do a conversation", "pay a conversation"]),
      v("get better", "to improve", "Your English will ____ with practice.", ["make better", "do better", "give better"]),
      v("give advice", "to suggest what someone should do", "Teachers often ____ to new students.", ["make advice", "do advice", "pay advice"]),
      v("keep a promise", "to do what you said you would do", "He always tries to ____.", ["make a promise", "lend a promise", "watch a promise"]),
      v("pay attention", "to focus carefully", "Please ____ to the instructions.", ["take attention", "give attention", "do attention"]),
      v("make progress", "to move forward and improve", "She has started to ____ in speaking.", ["do progress", "have progress", "take progress"]),
      v("take notes", "to write key information", "Students often ____ during lectures.", ["make notes", "give notes", "lend notes"]),
    ],
    grammar: [
      g("You need to ___ before the deadline.", "make a decision", ["make a decision", "do a decision", "take a decision", "have a decision"], "You need to make a decision before the deadline.", c("You need to do a decision before the deadline.", "You need to make a decision before the deadline.", ["You need to make a decision before the deadline.", "You need to do a decision before the deadline.", "You need to take a decision before the deadline.", "You need to have a decision before the deadline."])),
      g("The children should ___ before dinner.", "do homework", ["do homework", "make homework", "take homework", "pay homework"], "The children should do homework before dinner.", c("The children should make homework before dinner.", "The children should do homework before dinner.", ["The children should do homework before dinner.", "The children should make homework before dinner.", "The children should take homework before dinner.", "The children should pay homework before dinner."])),
      g("Let's ___ after this section.", "take a break", ["take a break", "make a break", "do a break", "have a rest break"], "Let's take a break after this section.", c("Let's make a break after this section.", "Let's take a break after this section.", ["Let's take a break after this section.", "Let's make a break after this section.", "Let's do a break after this section.", "Let's have a rest break after this section."])),
      g("We should ___ about the plan.", "have a conversation", ["have a conversation", "make a conversation", "do a conversation", "take a conversation"], "We should have a conversation about the plan.", c("We should make a conversation about the plan.", "We should have a conversation about the plan.", ["We should have a conversation about the plan.", "We should make a conversation about the plan.", "We should do a conversation about the plan.", "We should take a conversation about the plan."])),
      g("Teachers often ___ to new students.", "give advice", ["give advice", "make advice", "do advice", "pay advice"], "Teachers often give advice to new students.", c("Teachers often make advice to new students.", "Teachers often give advice to new students.", ["Teachers often give advice to new students.", "Teachers often make advice to new students.", "Teachers often do advice to new students.", "Teachers often pay advice to new students."])),
      g("Your English will ___ with practice.", "get better", ["get better", "make better", "do better", "give better"], "Your English will get better with practice."),
      g("He always tries to ___ even when it is difficult.", "keep a promise", ["keep a promise", "make a promise", "hold a promise", "say a promise"], "He always tries to keep a promise even when it is difficult."),
      g("Please ___ to the instructions.", "pay attention", ["pay attention", "take attention", "give attention", "do attention"], "Please pay attention to the instructions."),
      g("She has started to ___ in speaking.", "make progress", ["make progress", "do progress", "take progress", "have progress"], "She has started to make progress in speaking."),
      g("Students often ___ during lectures.", "take notes", ["take notes", "make notes", "give notes", "lend notes"], "Students often take notes during lectures."),
    ],
    listening: [
      l("You need to make a decision before the deadline.", "What do you need to make?", "a decision", ["a shelf", "a current", "a wave"], "Which collocation is correct?", "make a decision", ["do a decision", "take a decision", "have a decision"]),
      l("The children should do homework before dinner.", "What should the children do?", "homework", ["attention", "a promise", "a conversation"], "Which collocation is correct here?", "do homework", ["make homework", "take homework", "pay homework"]),
      l("Let's take a break after this section.", "What does the speaker suggest?", "taking a break", ["making a break", "hearing a break", "borrowing a break"], "Is take a break a natural collocation?", "yes", ["no", "only in legal language", "only in the past"]),
      l("Teachers often give advice to new students.", "What do teachers often give?", "advice", ["decisions", "tickets", "currents"], "Which verb naturally goes with advice?", "give", ["make", "do", "pay"]),
      l("Please pay attention to the instructions.", "What should you pay?", "attention", ["progress", "rest", "noise"], "Which noun goes with pay here?", "attention", ["conversation", "story", "weather"]),
    ],
    speakingPrompts: [
      s("Say one sentence with make a decision.", "You need to make a decision before the deadline.", ["We should make a decision soon."]),
      s("Say one sentence with do homework.", "The children should do homework before dinner.", ["I usually do homework after class."]),
      s("Say one sentence with take a break.", "Let's take a break after this section.", ["You should take a short break."]),
      s("Say one sentence with give advice.", "Teachers often give advice to new students.", ["My friend gave me good advice."]),
      s("Say one sentence with pay attention.", "Please pay attention to the instructions.", ["You need to pay attention in meetings."]),
    ],
    writing: [
      w("You need to _____ before the deadline.", "You need to make a decision before the deadline.", "make a decision"),
      w("The children should _____ before dinner.", "The children should do homework before dinner.", "do homework"),
      w("Let's _____ after this section.", "Let's take a break after this section.", "take a break"),
      w("Teachers often _____ to new students.", "Teachers often give advice to new students.", "give advice"),
      w("Please _____ to the instructions.", "Please pay attention to the instructions.", "pay attention"),
    ],
    facts: [
      f(
        "At the start of the project, the team had to make a decision quickly. After that, they had a conversation about priorities and took notes so nobody would forget the plan.",
        "What did the team have to make quickly?",
        "They had to make a decision quickly.",
        ["They had to make a shelf quickly.", "They had to make a tide quickly.", "They had to make a tunnel quickly."],
        "What did they have after that?",
        "They had a conversation about priorities.",
        ["They had a storm about priorities.", "They had a ladder about priorities.", "They had a sandwich about priorities."],
        "Why did they take notes?",
        "So nobody would forget the plan.",
        ["So nobody would borrow the sky.", "So nobody would freeze the shelf.", "So nobody would hear the towel."],
      ),
      f(
        "Maya was tired after two hours of study, so she decided to take a break. When she came back, she could pay attention better and started to make real progress again.",
        "What did Maya decide to take?",
        "She decided to take a break.",
        ["She decided to take a shelf.", "She decided to take a storm.", "She decided to take a tunnel."],
        "What could she do better after the break?",
        "She could pay attention better.",
        ["She could borrow attention better.", "She could freeze attention better.", "She could paint attention better."],
        "What did she start to make again?",
        "She started to make real progress again.",
        ["She started to make real traffic again.", "She started to make real wax again.", "She started to make real current again."],
      ),
      f(
        "Mr. Collins often gives advice to students who feel lost at the beginning of the year. He tells them to do homework regularly, ask questions, and keep their promises to themselves.",
        "Who does Mr. Collins often give advice to?",
        "He gives advice to students who feel lost.",
        ["He gives advice to dolphins who feel lost.", "He gives advice to shelves who feel lost.", "He gives advice to storms who feel lost."],
        "What does he tell them to do regularly?",
        "He tells them to do homework regularly.",
        ["He tells them to make homework regularly.", "He tells them to lend homework regularly.", "He tells them to borrow homework regularly."],
        "What promise should they keep?",
        "They should keep their promises to themselves.",
        ["They should keep their promises to the tide.", "They should keep their promises to the shelf.", "They should keep their promises to the traffic light."],
      ),
      f(
        "Leo did not get better in speaking until he started practicing every day. Little by little, he made progress, had more conversations, and felt more confident.",
        "When did Leo start to get better in speaking?",
        "He started to get better when he practiced every day.",
        ["He started to get better when he borrowed the station every day.", "He started to get better when he painted the weather every day.", "He started to get better when he closed the tunnel every day."],
        "What did he make little by little?",
        "He made progress little by little.",
        ["He made ladders little by little.", "He made waves little by little.", "He made shelves little by little."],
        "What else did he have more of?",
        "He had more conversations.",
        ["He had more storms.", "He had more tides.", "He had more blankets."],
      ),
      f(
        "During the lecture, the best students paid attention and took notes. Because of that, they understood the topic faster and could make better decisions later.",
        "What did the best students do during the lecture?",
        "They paid attention and took notes.",
        ["They borrowed attention and gave shelves.", "They painted notes and heard ladders.", "They canceled traffic and took storms."],
        "What did they understand faster?",
        "They understood the topic faster.",
        ["They understood the tunnel faster.", "They understood the cereal faster.", "They understood the staircase faster."],
        "What could they make later?",
        "They could make better decisions later.",
        ["They could make better tides later.", "They could make better ladders later.", "They could make better currents later."],
      ),
    ],
  },
  {
    number: 84,
    title: "Lesson 84: Furthermore, Moreover and In Addition To",
    vocab: [
      v("furthermore", "a formal connector used to add another sentence-level idea", "Exercise is healthy. _____, it improves your focus.", ["Yet", "Because", "Borrow"]),
      v("moreover", "another formal connector used to add supporting information", "The app is free. _____, it offers many exercises.", ["Would", "Already", "Take care"]),
      v("in addition to", "a phrase used before a noun or gerund to add information", "_____ grammar, students practice speaking.", ["In addition to", "However", "Used to"]),
      v("besides", "another word used to add information", "The room is bright. _____, it is quiet.", ["Besides", "Would rather", "Due to"]),
      v("supporting detail", "extra information that strengthens an idea", "A good paragraph needs a clear ____.", ["childhood habit", "weather warning", "table wire"]),
      v("build longer answers", "to add more information in speaking or writing", "These connectors help students ____.", ["organize a paragraph", "lend a contrast", "borrow the rain"]),
      v("formal connector", "a connector that sounds more polished or academic", "Furthermore is a ____.", ["casual phrase", "casual ladder", "hidden shelf"]),
      v("gerund phrase", "a phrase beginning with a verb + ing used like a noun", "In addition to ____ every day, she listens to podcasts.", ["studying", "study", "studied", "to study"]),
      v("paragraph", "a group of connected sentences", "Moreover can make a ____ sound more organized.", ["report", "tide", "gate"]),
      v("extra idea", "an additional point", "Use these expressions to add an ____.", ["supporting detail", "extra storm", "extra shelf"]),
    ],
    grammar: [
      g("Exercise is good for the body. ___, it helps the mind.", "Furthermore", ["Furthermore", "In addition to", "Because", "Used to"], "Exercise is good for the body. Furthermore, it helps the mind.", c("Exercise is good for the body. In addition to, it helps the mind.", "Exercise is good for the body. Furthermore, it helps the mind.", ["Exercise is good for the body. Furthermore, it helps the mind.", "Exercise is good for the body. In addition to, it helps the mind.", "Exercise is good for the body. Because, it helps the mind.", "Exercise is good for the body. Used to, it helps the mind."])),
      g("The app is free. ___, it offers many exercises.", "Moreover", ["Moreover", "In addition to", "Although", "Already"], "The app is free. Moreover, it offers many exercises.", c("The app is free. In addition to, it offers many exercises.", "The app is free. Moreover, it offers many exercises.", ["The app is free. Moreover, it offers many exercises.", "The app is free. In addition to, it offers many exercises.", "The app is free. Although, it offers many exercises.", "The app is free. Already, it offers many exercises."])),
      g("___ grammar, students practice listening and speaking.", "In addition to", ["In addition to", "Furthermore", "However", "Would rather"], "In addition to grammar, students practice listening and speaking.", c("Furthermore grammar, students practice listening and speaking.", "In addition to grammar, students practice listening and speaking.", ["In addition to grammar, students practice listening and speaking.", "Furthermore grammar, students practice listening and speaking.", "However grammar, students practice listening and speaking.", "Would rather grammar, students practice listening and speaking."])),
      g("In addition to ___ every day, she listens to podcasts.", "studying", ["studying", "study", "studied", "to study"], "In addition to studying every day, she listens to podcasts.", c("In addition to study every day, she listens to podcasts.", "In addition to studying every day, she listens to podcasts.", ["In addition to studying every day, she listens to podcasts.", "In addition to study every day, she listens to podcasts.", "In addition to studied every day, she listens to podcasts.", "In addition to to study every day, she listens to podcasts."])),
      g("The hotel is expensive. ___, it is far from the center.", "Besides", ["Besides", "Because", "Already", "Yet"], "The hotel is expensive. Besides, it is far from the center.", c("The hotel is expensive. In addition to, it is far from the center.", "The hotel is expensive. Besides, it is far from the center.", ["The hotel is expensive. Besides, it is far from the center.", "The hotel is expensive. In addition to, it is far from the center.", "The hotel is expensive. Because, it is far from the center.", "The hotel is expensive. Yet, it is far from the center."])),
      g("The explanation was clear. Moreover, it ___ practical.", "was", ["was", "is", "were", "be"], "The explanation was clear. Moreover, it was practical."),
      g("In addition to the report, she ___ a short presentation.", "prepared", ["prepared", "prepare", "preparing", "would"], "In addition to the report, she prepared a short presentation."),
      g("The course is affordable. Furthermore, it ___ flexible.", "is", ["is", "was", "be", "were"], "The course is affordable. Furthermore, it is flexible."),
      g("Besides being polite, he ___ very patient.", "is", ["is", "was", "be", "were"], "Besides being polite, he is very patient."),
      g("Moreover, the team ___ enough time to review the final draft.", "had", ["had", "have", "has", "having"], "Moreover, the team had enough time to review the final draft."),
    ],
    listening: [
      l("Exercise is good for the body. Furthermore, it helps the mind.", "What extra idea is added about exercise?", "it helps the mind", ["it closes the road", "it borrows a shelf", "it paints the rain"], "Which connector adds a formal extra sentence-level idea?", "furthermore", ["because", "yet", "borrow"]),
      l("The app is free. Moreover, it offers many exercises.", "What additional benefit does the app offer?", "it offers many exercises", ["it offers many ladders", "it offers many storms", "it offers many windows"], "Which connector sounds polished and formal?", "moreover", ["still", "just", "take care"]),
      l("In addition to grammar, students practice listening and speaking.", "What do students practice besides grammar?", "listening and speaking", ["traffic and weather", "shelves and wires", "currents and tides"], "What comes after in addition to here?", "a noun", ["a full clause", "a question word", "a modal only"]),
      l("In addition to studying every day, she listens to podcasts.", "What does she do in addition to studying every day?", "she listens to podcasts", ["she borrows a station", "she paints a tunnel", "she closes a current"], "What form comes after in addition to here?", "a gerund", ["a bare infinitive", "a past tense only", "an adjective only"]),
      l("The hotel is expensive. Besides, it is far from the center.", "What second negative point is added?", "it is far from the center", ["it is full of music", "it is painted blue", "it is warm inside"], "Which connector adds another point in a more flexible way?", "besides", ["however", "used to", "therefore"]),
    ],
    speakingPrompts: [
      s("Add a formal extra idea with furthermore.", "Exercise is good for the body. Furthermore, it helps the mind.", ["The course is affordable. Furthermore, it is flexible."]),
      s("Add a supporting point with moreover.", "The app is free. Moreover, it offers many exercises.", ["The explanation was clear. Moreover, it was practical."]),
      s("Use in addition to before a noun.", "In addition to grammar, students practice listening and speaking.", ["In addition to the report, she prepared a short presentation."]),
      s("Use in addition to before a gerund phrase.", "In addition to studying every day, she listens to podcasts.", ["In addition to working full-time, he takes evening classes."]),
      s("Add another point with besides.", "The hotel is expensive. Besides, it is far from the center.", ["Besides being polite, he is very patient."]),
    ],
    writing: [
      w("Exercise is good for the body. _____, it helps the mind.", "Exercise is good for the body. Furthermore, it helps the mind.", "Furthermore"),
      w("The app is free. _____, it offers many exercises.", "The app is free. Moreover, it offers many exercises.", "Moreover"),
      w("_____ grammar, students practice listening and speaking.", "In addition to grammar, students practice listening and speaking.", "In addition to"),
      w("In addition to _____ every day, she listens to podcasts.", "In addition to studying every day, she listens to podcasts.", "studying"),
      w("The hotel is expensive. _____, it is far from the center.", "The hotel is expensive. Besides, it is far from the center.", "Besides"),
    ],
    facts: [
      f(
        "The new language app is easy to use. Furthermore, it gives students daily speaking practice. Moreover, it lets teachers track progress more clearly.",
        "What is one quality of the app?",
        "It is easy to use.",
        ["It is made of metal.", "It is hidden under water.", "It is louder than traffic."],
        "What does it give students furthermore?",
        "It gives students daily speaking practice.",
        ["It gives students daily ladders.", "It gives students daily storms.", "It gives students daily shelves."],
        "What does it allow teachers to do moreover?",
        "It lets teachers track progress more clearly.",
        ["It lets teachers borrow the ocean more clearly.", "It lets teachers close the wind more clearly.", "It lets teachers paint the station more clearly."],
      ),
      f(
        "In addition to grammar, the course includes listening, speaking, and reading. Besides that, students receive feedback every week and can ask questions after class.",
        "What does the course include in addition to grammar?",
        "It includes listening, speaking, and reading.",
        ["It includes ladders, shelves, and tunnels.", "It includes storms, tides, and currents.", "It includes hats, bowls, and blankets."],
        "What else do students receive besides that?",
        "They receive feedback every week.",
        ["They receive weather every week.", "They receive traffic every week.", "They receive paint every week."],
        "When can they ask questions?",
        "They can ask questions after class.",
        ["They can ask questions inside the river.", "They can ask questions before breakfast last year.", "They can ask questions under the shelf."],
      ),
      f(
        "Marta wrote a short report about healthy routines. Furthermore, she prepared examples from real life. In addition to that, she added a short conclusion to make the answer stronger.",
        "What did Marta write?",
        "She wrote a short report about healthy routines.",
        ["She wrote a short report about frozen tunnels.", "She wrote a short report about bright ladders.", "She wrote a short report about silent reefs."],
        "What did she prepare furthermore?",
        "She prepared examples from real life.",
        ["She prepared examples from the ocean floor.", "She prepared examples from the train roof.", "She prepared examples from a candy shelf."],
        "What did she add in addition to that?",
        "She added a short conclusion.",
        ["She added a short tide.", "She added a short storm.", "She added a short station gate."],
      ),
      f(
        "The hotel looked modern and comfortable. Besides, it was close to the station. However, the group still compared prices before making a final decision.",
        "What extra positive point is added about the hotel?",
        "It was close to the station.",
        ["It was close to the volcano.", "It was close to the reef.", "It was close to the wind."],
        "What did the group still do?",
        "They still compared prices before making a final decision.",
        ["They still painted the station before making a final decision.", "They still borrowed the hotel before making a final decision.", "They still climbed the ceiling before making a final decision."],
        "How did the hotel look?",
        "It looked modern and comfortable.",
        ["It looked careful and noisy.", "It looked worried and late.", "It looked watery and hidden."],
      ),
      f(
        "In addition to studying every day, Leo listens to podcasts on the bus. Furthermore, he reviews his notes at night. Because of this routine, his answers are becoming longer and more organized.",
        "What does Leo do in addition to studying every day?",
        "He listens to podcasts on the bus.",
        ["He listens to ladders on the bus.", "He listens to tickets on the bus.", "He listens to shelves on the bus."],
        "What does he do furthermore?",
        "He reviews his notes at night.",
        ["He hides his notes at night.", "He paints his notes at night.", "He lends his notes at night."],
        "What is happening to his answers?",
        "They are becoming longer and more organized.",
        ["They are becoming colder and wetter.", "They are becoming smaller than buttons.", "They are becoming louder than airports."],
      ),
    ],
  },
];

export const workbook7Lessons = workbook7Configs.map(buildWorkbook7Lesson);
