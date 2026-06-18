import { Lesson } from "../../types";
import { buildLesson, ChoiceSeed, makeChoices, makeSpeakings, makeWritings, SpeakingSeed, WritingSeed } from "./helpers";
import { buildBlankAudioText, buildFullSentenceFromPrompt, hasBlankPlaceholder } from "../../utils/fillInBlankAudio";

const VOCABULARY_INSTRUCTION = "Listen and choose the correct word.";
const GRAMMAR_INSTRUCTION = "Listen and choose the correct option.";
const RECOGNITION_INSTRUCTION = "Listen and choose the correct answer.";
const SPEAK_REPEAT = "Listen and repeat.";
const SPEAK_SHORT = "Listen and answer with a short sentence.";
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
    choice(
      `${item.passage}\n\nQuestion: ${item.question}`,
      item.question,
      item.answer,
      item.distractors,
    ),
  );

  const detailSeeds = facts.map((item) =>
    choice(
      `${item.passage}\n\nQuestion: ${item.detailQuestion}`,
      item.detailQuestion,
      item.detailAnswer,
      item.detailDistractors,
    ),
  );

  const vocabSeeds = facts.map((item) =>
    choice(
      `${item.passage}\n\nQuestion: ${item.vocabQuestion}`,
      item.vocabQuestion,
      item.vocabAnswer,
      item.vocabDistractors,
    ),
  );

  return [...directSeeds, ...detailSeeds, ...vocabSeeds];
}

function buildSpeakingSeeds(grammar: GrammarItem[], prompts: PromptItem[]): SpeakingSeed[] {
  const repeatSeeds = grammar.slice(0, 5).map((item) =>
    speaking(item.fullSentence, item.fullSentence, item.fullSentence, item.accepted),
  );

  const promptSeeds = prompts.map((item) =>
    speaking(item.prompt, item.prompt, item.answer, item.accepted),
  );

  return [...repeatSeeds, ...promptSeeds];
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

function buildWorkbook5Lesson(config: LessonConfig): Lesson {
  const vocabularyExercises = makeChoices(buildVocabularySeeds(config.vocab), VOCABULARY_INSTRUCTION);
  const grammarExercises = makeChoices(buildGrammarSeeds(config.grammar), GRAMMAR_INSTRUCTION);
  const recognitionExercises = makeChoices(buildRecognitionSeeds(config.listening), RECOGNITION_INSTRUCTION);
  const speakingExercises = makeSpeakings(buildSpeakingSeeds(config.grammar, config.speakingPrompts), SPEAK_REPEAT);
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

const workbook5Configs: LessonConfig[] = [
  {
    number: 49,
    title: "Lesson 49: Yesterday at Home",
    vocab: [
      v("kitchen", "the room where people cook food", "My mother was in the ____ yesterday morning.", ["bedroom", "bathroom", "garden"]),
      v("bedroom", "the room where people sleep", "The children were in the ____ last night.", ["kitchen", "garage", "yard"]),
      v("living room", "the room where people sit and relax together", "We were in the ____ after dinner.", ["bathroom", "balcony", "office"]),
      v("bathroom", "the room with a shower, sink, or toilet", "He was in the ____ because he wanted a shower.", ["kitchen", "bedroom", "hall"]),
      v("tired", "needing rest after work or activity", "She was ____ after the busy afternoon.", ["hungry", "early", "clean"]),
      v("happy", "feeling good and pleased", "They were ____ because the family was together.", ["late", "empty", "cold"]),
      v("hungry", "needing food", "I was ____ before dinner last night.", ["quiet", "ready", "small"]),
      v("thirsty", "needing something to drink", "We were ____ after the long walk home.", ["safe", "warm", "busy"]),
      v("quiet", "without much noise", "The house was very ____ in the evening.", ["full", "bright", "crowded"]),
      v("yesterday", "the day before today", "I was at home ____ afternoon.", ["tomorrow", "today", "soon"]),
    ],
    grammar: [
      g("I ___ at home yesterday.", "was", ["was", "were", "am", "be"], "I was at home yesterday.", c("I were at home yesterday.", "I was at home yesterday.", ["I was at home yesterday.", "I were at home yesterday.", "I am at home yesterday.", "I be at home yesterday."])),
      g("She ___ tired last night.", "was", ["was", "were", "is", "are"], "She was tired last night.", c("She were tired last night.", "She was tired last night.", ["She was tired last night.", "She were tired last night.", "She is tired last night.", "She are tired last night."])),
      g("They ___ in the bedroom.", "were", ["were", "was", "are", "is"], "They were in the bedroom.", c("They was in the bedroom.", "They were in the bedroom.", ["They were in the bedroom.", "They was in the bedroom.", "They are in the bedroom.", "They is in the bedroom."])),
      g("The house ___ quiet in the evening.", "was", ["was", "were", "be", "are"], "The house was quiet in the evening.", c("The house were quiet in the evening.", "The house was quiet in the evening.", ["The house was quiet in the evening.", "The house were quiet in the evening.", "The house are quiet in the evening.", "The house be quiet in the evening."])),
      g("We ___ hungry after school.", "were", ["were", "was", "are", "be"], "We were hungry after school.", c("We was hungry after school.", "We were hungry after school.", ["We were hungry after school.", "We was hungry after school.", "We are hungry after school.", "We be hungry after school."])),
      g("My father ___ in the kitchen.", "was", ["was", "were", "am", "is"], "My father was in the kitchen."),
      g("The children ___ happy at home.", "were", ["were", "was", "is", "am"], "The children were happy at home."),
      g("I ___ thirsty yesterday afternoon.", "was", ["was", "were", "am", "be"], "I was thirsty yesterday afternoon."),
      g("You ___ late yesterday morning.", "were", ["were", "was", "are", "is"], "You were late yesterday morning."),
      g("Anna and Leo ___ in the living room.", "were", ["were", "was", "are", "be"], "Anna and Leo were in the living room."),
    ],
    listening: [
      l("I was at home yesterday.", "Where was the speaker?", "at home", ["at school", "at work", "at the park"], "Which verb do you hear?", "was", ["were", "did", "didn't"]),
      l("She was tired last night.", "How was she?", "tired", ["happy", "early", "busy"], "When did it happen?", "last night", ["this morning", "next week", "tomorrow"]),
      l("They were in the bedroom.", "Where were they?", "in the bedroom", ["in the kitchen", "in the yard", "in the store"], "Which verb do you hear?", "were", ["was", "did", "didn't"]),
      l("We were happy yesterday.", "How were they?", "happy", ["quiet", "sick", "late"], "When did it happen?", "yesterday", ["today", "next month", "tomorrow"]),
      l("The house was quiet in the evening.", "How was the house?", "quiet", ["crowded", "angry", "dirty"], "What part of the day do you hear?", "in the evening", ["in the morning", "at noon", "after lunch"]),
    ],
    speakingPrompts: [
      s("Where were you yesterday?", "I was at home yesterday.", ["I was home yesterday.", "I was at home."]),
      s("How was your day?", "My day was busy.", ["It was busy.", "It was good."]),
      s("Were you tired last night?", "Yes, I was.", ["Yes I was.", "I was."]),
      s("Who was in the kitchen?", "My mother was in the kitchen.", ["Mother was in the kitchen."]),
      s("Were your friends happy?", "Yes, they were.", ["Yes they were.", "They were."]),
    ],
    writing: [
      w("I am tired. -> I ___ tired yesterday.", "I was tired yesterday.", "was"),
      w("They are happy. -> They ___ happy yesterday.", "They were happy yesterday.", "were"),
      w("She is in the kitchen. -> She ___ in the kitchen yesterday.", "She was in the kitchen yesterday.", "was"),
      w("We are at home. -> We ___ at home last night.", "We were at home last night.", "were"),
      w("The room is quiet. -> The room ___ quiet yesterday evening.", "The room was quiet yesterday evening.", "was"),
    ],
    facts: [
      f(
        "Yesterday, Anna was at home. Her mother was in the kitchen, and her father was in the living room. Anna and her brother were tired because the day was busy.",
        "Where was Anna yesterday?",
        "She was at home.",
        ["She was at school.", "She was at the market.", "She was at the park."],
        "Who was in the kitchen?",
        "Her mother was in the kitchen.",
        ["Her brother was in the kitchen.", "Her father was in the kitchen.", "Anna was in the kitchen."],
        "How were Anna and her brother?",
        "They were tired.",
        ["They were angry.", "They were early.", "They were hungry."],
      ),
      f(
        "Last night, the house was quiet. The children were in the bedroom, and the dog was under the table.",
        "How was the house last night?",
        "It was quiet.",
        ["It was loud.", "It was crowded.", "It was empty."],
        "Where were the children?",
        "They were in the bedroom.",
        ["They were in the kitchen.", "They were in the bathroom.", "They were outside."],
        "Where was the dog?",
        "It was under the table.",
        ["It was on the sofa.", "It was in the garden.", "It was by the door."],
      ),
      f(
        "Yesterday afternoon, Leo was thirsty and his sister was hungry. They were at home with their grandmother.",
        "How was Leo yesterday afternoon?",
        "He was thirsty.",
        ["He was late.", "He was quiet.", "He was calm."],
        "How was his sister?",
        "She was hungry.",
        ["She was tired.", "She was ready.", "She was early."],
        "Who were they with?",
        "They were with their grandmother.",
        ["They were with their teacher.", "They were with their cousins.", "They were with their coach."],
      ),
      f(
        "In the evening, Marta was in the bathroom, and her brothers were in the living room. Everyone was ready for dinner.",
        "Where was Marta?",
        "She was in the bathroom.",
        ["She was in the kitchen.", "She was in the bedroom.", "She was in the yard."],
        "Where were her brothers?",
        "They were in the living room.",
        ["They were in the bathroom.", "They were in the garage.", "They were in the office."],
        "Were they ready for dinner?",
        "Yes, everyone was ready.",
        ["No, everyone was late.", "No, everyone was outside.", "No, everyone was asleep."],
      ),
      f(
        "Yesterday morning, the family was busy. The father was late, but the children were happy because they were at home together.",
        "How was the family yesterday morning?",
        "The family was busy.",
        ["The family was angry.", "The family was sick.", "The family was quiet."],
        "Who was late?",
        "The father was late.",
        ["The mother was late.", "The children were late.", "The dog was late."],
        "Why were the children happy?",
        "Because they were at home together.",
        ["Because they were at school.", "Because they were in the park.", "Because they were with the doctor."],
      ),
    ],
  },
  {
    number: 50,
    title: "Lesson 50: A Busy Day",
    vocab: [
      v("busy", "having many things to do", "Laura was very ____ yesterday, so she had no free time.", ["late", "soft", "open"]),
      v("late", "not on time", "Mark was ____ for school last Monday.", ["calm", "near", "clean"]),
      v("early", "before the usual time", "She was ____ for the meeting, not late.", ["worried", "noisy", "full"]),
      v("school", "the place where students study", "They weren't at the ____ because it was Saturday.", ["museum", "kitchen", "hotel"]),
      v("church", "the place where people go to worship", "My grandparents were at ____ in the evening.", ["school", "beach", "yard"]),
      v("supermarket", "the place where people buy food and home products", "We weren't at the ____. We were at home.", ["office", "river", "park"]),
      v("office", "the place where many people work", "My father wasn't in the ____ yesterday morning.", ["garden", "balcony", "school"]),
      v("park", "an outdoor place with grass and trees", "The children weren't at the ____. They were inside.", ["kitchen", "hall", "church"]),
      v("nervous", "worried before something happens", "She was ____ before the test.", ["calm", "empty", "sweet"]),
      v("worried", "thinking something bad may happen", "He was ____ about the busy day.", ["ready", "tiny", "open"]),
    ],
    grammar: [
      g("I ___ at school yesterday.", "wasn't", ["wasn't", "weren't", "didn't", "was"], "I wasn't at school yesterday.", c("I weren't at school yesterday.", "I wasn't at school yesterday.", ["I wasn't at school yesterday.", "I weren't at school yesterday.", "I didn't at school yesterday.", "I wasn't school yesterday."])),
      g("They ___ at home last night.", "weren't", ["weren't", "wasn't", "didn't", "were"], "They weren't at home last night.", c("They wasn't at home last night.", "They weren't at home last night.", ["They weren't at home last night.", "They wasn't at home last night.", "They didn't at home last night.", "They weren't home last night."])),
      g("___ you busy yesterday?", "Were", ["Were", "Was", "Did", "Are"], "Were you busy yesterday?", c("Was you busy yesterday?", "Were you busy yesterday?", ["Were you busy yesterday?", "Was you busy yesterday?", "Did you busy yesterday?", "Are you busy yesterday?"])),
      g("___ he late for the meeting?", "Was", ["Was", "Were", "Did", "Is"], "Was he late for the meeting?", c("Were he late for the meeting?", "Was he late for the meeting?", ["Was he late for the meeting?", "Were he late for the meeting?", "Did he late for the meeting?", "Is he late for the meeting?"])),
      g("No, they ___ ready.", "weren't", ["weren't", "wasn't", "didn't", "aren't"], "No, they weren't ready.", c("No, they wasn't ready.", "No, they weren't ready.", ["No, they weren't ready.", "No, they wasn't ready.", "No, they didn't ready.", "No, they aren't ready."])),
      g("She ___ nervous before class.", "wasn't", ["wasn't", "weren't", "didn't", "was"], "She wasn't nervous before class."),
      g("___ your friends at church?", "Were", ["Were", "Was", "Did", "Are"], "Were your friends at church?"),
      g("He ___ sick yesterday morning.", "wasn't", ["wasn't", "weren't", "didn't", "was"], "He wasn't sick yesterday morning."),
      g("___ Laura at the supermarket?", "Was", ["Was", "Were", "Did", "Is"], "Was Laura at the supermarket?"),
      g("Yes, I ___ busy.", "was", ["was", "were", "did", "am"], "Yes, I was busy."),
    ],
    listening: [
      l("I wasn't late yesterday.", "How was the speaker?", "not late", ["late", "worried", "busy"], "Which structure do you hear?", "negative", ["question", "command", "future"]),
      l("She wasn't at home last night.", "Where wasn't she?", "at home", ["at school", "at church", "at the office"], "Which verb form do you hear?", "wasn't", ["weren't", "was", "were"]),
      l("Were you busy yesterday?", "What kind of sentence is it?", "a question", ["a negative sentence", "a command", "a list"], "Which word starts the sentence?", "Were", ["Was", "Did", "Is"]),
      l("They weren't ready for dinner.", "How were they?", "not ready", ["ready", "early", "happy"], "Which structure do you hear?", "negative", ["affirmative", "present", "future"]),
      l("Was he at church yesterday?", "What place do you hear?", "church", ["office", "school", "restaurant"], "Which word starts the sentence?", "Was", ["Were", "Did", "Are"]),
    ],
    speakingPrompts: [
      s("Were you busy yesterday?", "Yes, I was.", ["Yes I was.", "I was."]),
      s("Was your brother at home last night?", "No, he wasn't.", ["No he wasn't.", "He wasn't."]),
      s("Were your friends ready?", "Yes, they were.", ["Yes they were.", "They were."]),
      s("Was she late for school?", "No, she wasn't.", ["No she wasn't.", "She wasn't."]),
      s("Were you at church yesterday?", "No, I wasn't.", ["No I wasn't.", "I wasn't."]),
    ],
    writing: [
      w("She was tired. -> She ___ tired.", "She wasn't tired.", "wasn't"),
      w("They were at school. -> ___ they at school?", "Were they at school?", "Were"),
      w("Was he late? -> No, he ___ .", "No, he wasn't.", "wasn't"),
      w("We were ready. -> We ___ ready.", "We weren't ready.", "weren't"),
      w("You were busy. -> ___ you busy?", "Were you busy?", "Were"),
    ],
    facts: [
      f(
        "Mark was very busy yesterday. He was at school in the morning and at church in the evening. His brother wasn't with him because he was at home.",
        "Was Mark busy yesterday?",
        "Yes, he was busy.",
        ["No, he wasn't busy.", "No, he was at the park.", "No, he was sick all day."],
        "Where was Mark in the morning?",
        "He was at school.",
        ["He was at home.", "He was at church.", "He was at the office."],
        "Was his brother with him?",
        "No, he wasn't.",
        ["Yes, he was.", "Yes, he was at church.", "No, he was at school."],
      ),
      f(
        "Laura wasn't tired yesterday, but she was nervous before her music class. Her parents were calm and early.",
        "Was Laura tired yesterday?",
        "No, she wasn't.",
        ["Yes, she was.", "Yes, she was very calm.", "No, she was late."],
        "How was Laura before class?",
        "She was nervous.",
        ["She was calm.", "She was sick.", "She was surprised."],
        "How were her parents?",
        "They were calm and early.",
        ["They were late and worried.", "They were nervous and busy.", "They were sick and quiet."],
      ),
      f(
        "Yesterday evening, the children weren't at the park. They were at home because the weather was bad.",
        "Were the children at the park?",
        "No, they weren't.",
        ["Yes, they were.", "Yes, they were at school.", "No, they were at church."],
        "Where were they?",
        "They were at home.",
        ["They were at the office.", "They were at the supermarket.", "They were at school."],
        "Why were they at home?",
        "Because the weather was bad.",
        ["Because dinner was ready.", "Because the park was full.", "Because their teacher was there."],
      ),
      f(
        "Sam was late for work yesterday, but his wife wasn't late for the office. She was ready at seven o'clock.",
        "Was Sam late for work yesterday?",
        "Yes, he was.",
        ["No, he wasn't.", "No, he was sick.", "Yes, she was."],
        "Was his wife late for the office?",
        "No, she wasn't.",
        ["Yes, she was.", "Yes, she was worried.", "No, she was at church."],
        "What time was she ready?",
        "She was ready at seven o'clock.",
        ["She was ready at eight o'clock.", "She was ready at noon.", "She was ready after dinner."],
      ),
      f(
        "The restaurant was full last night, so we weren't there for dinner. We were at home with our grandparents.",
        "Was the restaurant full last night?",
        "Yes, it was.",
        ["No, it wasn't.", "No, it was quiet.", "Yes, they were."],
        "Were we at the restaurant for dinner?",
        "No, we weren't.",
        ["Yes, we were.", "Yes, we were late.", "No, we were at school."],
        "Who were we with at home?",
        "We were with our grandparents.",
        ["We were with our teacher.", "We were with our neighbors.", "We were with our coach."],
      ),
    ],
  },
  {
    number: 51,
    title: "Lesson 51: Regular Verbs in the Past",
    vocab: [
      v("worked", "did a job in the past", "My father ____ at the office yesterday.", ["played", "washed", "closed"]),
      v("cleaned", "made something tidy in the past", "She ____ the room before dinner.", ["visited", "walked", "opened"]),
      v("played", "did a game or sport in the past", "They ____ soccer after school.", ["finished", "listened", "cooked"]),
      v("watched", "looked at a movie or show in the past", "We ____ a movie last night.", ["helped", "washed", "closed"]),
      v("visited", "went to see someone or a place in the past", "I ____ my grandparents on Sunday.", ["worked", "opened", "walked"]),
      v("cooked", "prepared food in the past", "My mother ____ dinner at six.", ["studied", "closed", "listened"]),
      v("studied", "learned something in the past", "Laura ____ English yesterday evening.", ["played", "washed", "opened"]),
      v("helped", "gave support in the past", "He ____ his sister with homework.", ["visited", "walked", "finished"]),
      v("washed", "cleaned with water in the past", "They ____ the dishes after lunch.", ["worked", "listened", "closed"]),
      v("finished", "completed something in the past", "I ____ my project before bed.", ["opened", "cooked", "played"]),
    ],
    grammar: [
      g("She ___ the room yesterday.", "cleaned", ["cleaned", "clean", "cleaning", "cleans"], "She cleaned the room yesterday.", c("She clean the room yesterday.", "She cleaned the room yesterday.", ["She cleaned the room yesterday.", "She clean the room yesterday.", "She cleaning the room yesterday.", "She cleans the room yesterday."])),
      g("They ___ soccer after school.", "played", ["played", "play", "playing", "plays"], "They played soccer after school.", c("They play soccer yesterday.", "They played soccer yesterday.", ["They played soccer yesterday.", "They play soccer yesterday.", "They playing soccer yesterday.", "They plays soccer yesterday."])),
      g("He ___ dinner at home.", "cooked", ["cooked", "cook", "cooking", "cooks"], "He cooked dinner at home.", c("He cook dinner at home yesterday.", "He cooked dinner at home yesterday.", ["He cooked dinner at home yesterday.", "He cook dinner at home yesterday.", "He cooks dinner at home yesterday.", "He cooking dinner at home yesterday."])),
      g("Laura ___ English last night.", "studied", ["studied", "study", "studies", "studying"], "Laura studied English last night.", c("Laura study English last night.", "Laura studied English last night.", ["Laura studied English last night.", "Laura study English last night.", "Laura studies English last night.", "Laura studying English last night."])),
      g("We ___ a movie in the evening.", "watched", ["watched", "watch", "watching", "watches"], "We watched a movie in the evening.", c("We watch a movie in the evening yesterday.", "We watched a movie in the evening yesterday.", ["We watched a movie in the evening yesterday.", "We watch a movie in the evening yesterday.", "We watches a movie in the evening yesterday.", "We watching a movie in the evening yesterday."])),
      g("I ___ my grandparents on Sunday.", "visited", ["visited", "visit", "visiting", "visits"], "I visited my grandparents on Sunday."),
      g("My brother ___ his bike after school.", "washed", ["washed", "wash", "washing", "washes"], "My brother washed his bike after school."),
      g("They ___ the window before the rain.", "closed", ["closed", "close", "closing", "closes"], "They closed the window before the rain."),
      g("She ___ the door at eight o'clock.", "opened", ["opened", "open", "opening", "opens"], "She opened the door at eight o'clock."),
      g("We ___ the lesson before lunch.", "finished", ["finished", "finish", "finishing", "finishes"], "We finished the lesson before lunch."),
    ],
    listening: [
      l("I worked yesterday.", "What action do you hear?", "worked", ["played", "washed", "visited"], "Which time do you hear?", "yesterday", ["tomorrow", "next week", "right now"]),
      l("She cleaned the kitchen.", "What place do you hear?", "the kitchen", ["the office", "the park", "the hotel"], "Which verb form do you hear?", "cleaned", ["clean", "cleans", "cleaning"]),
      l("They watched a movie.", "What did they do?", "They watched a movie.", ["They played soccer.", "They visited a friend.", "They cooked dinner."], "Which structure do you hear?", "past simple", ["present simple", "future", "question"]),
      l("He played soccer after school.", "What sport do you hear?", "soccer", ["tennis", "baseball", "volleyball"], "When did it happen?", "after school", ["before breakfast", "next year", "every morning"]),
      l("Laura studied English last night.", "What did Laura study?", "English", ["music", "science", "history"], "What ending do you hear in the verb?", "-ed", ["-ing", "-s", "no ending"]),
    ],
    speakingPrompts: [
      s("What did you do yesterday? Use worked.", "I worked yesterday.", ["I worked."]),
      s("What did you do last night? Use studied.", "I studied English last night.", ["I studied last night."]),
      s("What did your family do in the evening?", "We watched a movie.", ["We watched a movie yesterday."]),
      s("What did your mother do at home?", "She cooked dinner.", ["She cooked dinner yesterday."]),
      s("Who did you help yesterday?", "I helped my mother.", ["I helped my mom."]),
    ],
    writing: [
      w("I work every day. -> I ___ yesterday.", "I worked yesterday.", "worked"),
      w("She studies English. -> She ___ English last night.", "She studied English last night.", "studied"),
      w("They play soccer. -> They ___ soccer after school.", "They played soccer after school.", "played"),
      w("We watch a movie. -> We ___ a movie in the evening.", "We watched a movie in the evening.", "watched"),
      w("He visits his grandparents. -> He ___ his grandparents on Sunday.", "He visited his grandparents on Sunday.", "visited"),
    ],
    facts: [
      f(
        "Yesterday, Daniel cleaned his room, helped his mother, and studied English. In the evening, he watched a movie with his family.",
        "What did Daniel clean?",
        "He cleaned his room.",
        ["He cleaned the kitchen.", "He cleaned the car.", "He cleaned the yard."],
        "Who did Daniel help?",
        "He helped his mother.",
        ["He helped his teacher.", "He helped his brother.", "He helped his friend."],
        "What did he watch in the evening?",
        "He watched a movie.",
        ["He watched the news.", "He watched a game.", "He watched a lesson."],
      ),
      f(
        "Last Saturday, Paula visited her grandparents, cooked lunch with her grandmother, and washed the dishes after lunch.",
        "Who did Paula visit?",
        "She visited her grandparents.",
        ["She visited her cousins.", "She visited her teacher.", "She visited her neighbor."],
        "What did Paula cook?",
        "She cooked lunch.",
        ["She cooked breakfast.", "She cooked soup.", "She cooked cake."],
        "What did she wash?",
        "She washed the dishes.",
        ["She washed the car.", "She washed the floor.", "She washed the windows."],
      ),
      f(
        "After school, Leo played soccer, walked home, and finished his homework before dinner.",
        "What did Leo play?",
        "He played soccer.",
        ["He played chess.", "He played tennis.", "He played guitar."],
        "How did Leo go home?",
        "He walked home.",
        ["He drove home.", "He flew home.", "He ran home."],
        "What did he finish before dinner?",
        "He finished his homework.",
        ["He finished his project.", "He finished the movie.", "He finished the game."],
      ),
      f(
        "Marta opened the window in the morning, listened to music in the afternoon, and closed the window before bed.",
        "What did Marta open?",
        "She opened the window.",
        ["She opened the door.", "She opened the book.", "She opened the box."],
        "What did she do in the afternoon?",
        "She listened to music.",
        ["She studied math.", "She watched TV.", "She cooked dinner."],
        "What did she close before bed?",
        "She closed the window.",
        ["She closed the store.", "She closed the gate.", "She closed the notebook."],
      ),
      f(
        "The students practiced English, worked in pairs, and finished the lesson early yesterday.",
        "What did the students practice?",
        "They practiced English.",
        ["They practiced music.", "They practiced soccer.", "They practiced painting."],
        "How did they work?",
        "They worked in pairs.",
        ["They worked alone.", "They worked outside.", "They worked at home."],
        "When did they finish the lesson?",
        "They finished it early yesterday.",
        ["They finished it next week.", "They finished it at midnight.", "They finished it after lunch today."],
      ),
    ],
  },
  {
    number: 52,
    title: "Lesson 52: Irregular Verbs in the Past",
    vocab: [
      v("went", "past form of go", "We ____ to school early yesterday.", ["had", "came", "took"]),
      v("had", "past form of have", "She ____ breakfast at seven.", ["went", "ate", "made"]),
      v("saw", "past form of see", "I ____ a bird in the tree.", ["bought", "came", "drank"]),
      v("ate", "past form of eat", "They ____ pizza after the game.", ["took", "went", "made"]),
      v("drank", "past form of drink", "He ____ water after the run.", ["saw", "came", "had"]),
      v("bought", "past form of buy", "My mother ____ fruit at the market.", ["went", "ate", "left"]),
      v("came", "past form of come", "She ____ home late last night.", ["drank", "took", "wrote"]),
      v("took", "past form of take", "He ____ a picture of the beach.", ["came", "had", "ate"]),
      v("made", "past form of make", "They ____ dinner together.", ["went", "saw", "left"]),
      v("left", "past form of leave", "We ____ the house at eight.", ["bought", "spoke", "read"]),
    ],
    grammar: [
      g("I ___ to school yesterday.", "went", ["went", "go", "goed", "gone"], "I went to school yesterday.", c("I goed to school yesterday.", "I went to school yesterday.", ["I went to school yesterday.", "I goed to school yesterday.", "I gone to school yesterday.", "I go to school yesterday."])),
      g("She ___ breakfast at seven.", "had", ["had", "have", "has", "haved"], "She had breakfast at seven.", c("She haved breakfast at seven.", "She had breakfast at seven.", ["She had breakfast at seven.", "She haved breakfast at seven.", "She has breakfast at seven yesterday.", "She have breakfast at seven yesterday."])),
      g("They ___ pizza after class.", "ate", ["ate", "eat", "eated", "eats"], "They ate pizza after class.", c("They eated pizza after class.", "They ate pizza after class.", ["They ate pizza after class.", "They eated pizza after class.", "They eat pizza after class yesterday.", "They eats pizza after class yesterday."])),
      g("He ___ a picture of the park.", "took", ["took", "take", "taked", "takes"], "He took a picture of the park.", c("He taked a picture of the park.", "He took a picture of the park.", ["He took a picture of the park.", "He taked a picture of the park.", "He take a picture of the park yesterday.", "He takes a picture of the park yesterday."])),
      g("My mother ___ fruit at the market.", "bought", ["bought", "buy", "buyed", "buys"], "My mother bought fruit at the market.", c("My mother buyed fruit at the market.", "My mother bought fruit at the market.", ["My mother bought fruit at the market.", "My mother buyed fruit at the market.", "My mother buy fruit at the market yesterday.", "My mother buys fruit at the market yesterday."])),
      g("We ___ water after the game.", "drank", ["drank", "drink", "drinked", "drinks"], "We drank water after the game."),
      g("She ___ home late last night.", "came", ["came", "come", "comed", "comes"], "She came home late last night."),
      g("I ___ my homework before dinner.", "did", ["did", "do", "done", "does"], "I did my homework before dinner."),
      g("They ___ dinner together.", "made", ["made", "make", "maked", "makes"], "They made dinner together."),
      g("We ___ the house at eight.", "left", ["left", "leave", "leaved", "leaves"], "We left the house at eight."),
    ],
    listening: [
      l("I went to the supermarket yesterday.", "Where did the speaker go?", "to the supermarket", ["to the office", "to the park", "to the beach"], "Which irregular verb do you hear?", "went", ["go", "came", "bought"]),
      l("She had lunch at noon.", "What meal did she have?", "lunch", ["breakfast", "dinner", "a snack"], "Which verb do you hear?", "had", ["has", "ate", "drank"]),
      l("They ate fruit after school.", "What did they eat?", "fruit", ["bread", "pizza", "rice"], "Which irregular verb do you hear?", "ate", ["eat", "drank", "went"]),
      l("He bought bread and milk.", "What did he buy?", "bread and milk", ["fruit and juice", "rice and beans", "soap and shampoo"], "Which structure do you hear?", "affirmative past", ["negative past", "question", "present simple"]),
      l("We saw a dog in the street.", "What animal did they see?", "a dog", ["a bird", "a horse", "a fish"], "Which irregular verb do you hear?", "saw", ["see", "went", "came"]),
    ],
    speakingPrompts: [
      s("Where did you go yesterday?", "I went to school yesterday.", ["I went to school."]),
      s("What did you eat yesterday?", "I ate rice and beans yesterday.", ["I ate rice and beans."]),
      s("What did you drink after class?", "I drank water after class.", ["I drank water."]),
      s("What did your mother buy?", "She bought fruit.", ["My mother bought fruit."]),
      s("What did you take on the trip?", "I took many pictures.", ["I took pictures."]),
    ],
    writing: [
      w("I go to church on Sundays. -> I ___ to church yesterday.", "I went to church yesterday.", "went"),
      w("She eats fruit every day. -> She ___ fruit yesterday.", "She ate fruit yesterday.", "ate"),
      w("They buy bread on Mondays. -> They ___ bread yesterday.", "They bought bread yesterday.", "bought"),
      w("We drink water after soccer. -> We ___ water after soccer yesterday.", "We drank water after soccer yesterday.", "drank"),
      w("He takes a picture every trip. -> He ___ a picture yesterday.", "He took a picture yesterday.", "took"),
    ],
    facts: [
      f(
        "Yesterday, Anna went to the supermarket. She bought fruit and bread, then she came home and made dinner.",
        "Where did Anna go yesterday?",
        "She went to the supermarket.",
        ["She went to the school.", "She went to the park.", "She went to the office."],
        "What did she buy?",
        "She bought fruit and bread.",
        ["She bought milk and cheese.", "She bought shoes and socks.", "She bought pencils and books."],
        "What did she make at home?",
        "She made dinner.",
        ["She made coffee.", "She made breakfast.", "She made a cake."],
      ),
      f(
        "Lucas had breakfast at seven, drank coffee, and left the house at eight for work.",
        "What time did Lucas have breakfast?",
        "He had breakfast at seven.",
        ["He had breakfast at six.", "He had breakfast at eight.", "He had breakfast at nine."],
        "What did Lucas drink?",
        "He drank coffee.",
        ["He drank juice.", "He drank tea.", "He drank milk."],
        "What time did he leave the house?",
        "He left the house at eight.",
        ["He left the house at seven.", "He left the house at ten.", "He left the house at noon."],
      ),
      f(
        "Marta saw a bird by the river and took a picture. Later, she came back home and wrote about it.",
        "What did Marta see?",
        "She saw a bird.",
        ["She saw a dog.", "She saw a boat.", "She saw a whale."],
        "What did she take?",
        "She took a picture.",
        ["She took a bus.", "She took a map.", "She took a sandwich."],
        "What did she do at home later?",
        "She wrote about it.",
        ["She cooked dinner.", "She cleaned the room.", "She watched TV."],
      ),
      f(
        "The boys ate pizza after the game, drank water, and met their coach near the bus stop.",
        "What did the boys eat?",
        "They ate pizza.",
        ["They ate fruit.", "They ate bread.", "They ate soup."],
        "What did they drink?",
        "They drank water.",
        ["They drank juice.", "They drank coffee.", "They drank soda."],
        "Who did they meet?",
        "They met their coach.",
        ["They met their teacher.", "They met their cousins.", "They met their doctor."],
      ),
      f(
        "Yesterday evening, we did our homework, made sandwiches, and read a short story before bed.",
        "What did we do first?",
        "We did our homework.",
        ["We made sandwiches.", "We read a story.", "We went outside."],
        "What food did we make?",
        "We made sandwiches.",
        ["We made soup.", "We made rice.", "We made pizza."],
        "What did we read before bed?",
        "We read a short story.",
        ["We read a newspaper.", "We read a map.", "We read a song."],
      ),
    ],
  },
  {
    number: 53,
    title: "Lesson 53: Questions with Did",
    vocab: [
      v("go", "to move from one place to another", "Did you ____ to school yesterday?", ["eat", "buy", "watch"]),
      v("eat", "to have food", "Did she ____ breakfast at home?", ["go", "drink", "study"]),
      v("buy", "to get something by paying money", "Did he ____ bread at the market?", ["take", "see", "call"]),
      v("watch", "to look at a movie, show, or game", "Did they ____ a movie last night?", ["visit", "open", "leave"]),
      v("study", "to learn something", "Did you ____ English yesterday?", ["play", "go", "close"]),
      v("work", "to do a job", "Did your father ____ yesterday morning?", ["eat", "see", "buy"]),
      v("play", "to do a sport or game", "Did the boys ____ soccer after school?", ["watch", "visit", "call"]),
      v("visit", "to go see a person or place", "Did she ____ her grandmother on Sunday?", ["take", "leave", "study"]),
      v("arrive", "to reach a place", "When did the bus ____ at the station?", ["make", "open", "drink"]),
      v("leave", "to go away from a place", "Why did they ____ early?", ["see", "help", "close"]),
    ],
    grammar: [
      g("___ you go to school yesterday?", "Did", ["Did", "Was", "Were", "Do"], "Did you go to school yesterday?", c("Did you went to school yesterday?", "Did you go to school yesterday?", ["Did you go to school yesterday?", "Did you went to school yesterday?", "Do you went to school yesterday?", "Were you go to school yesterday?"])),
      g("What ___ she eat for lunch?", "did", ["did", "was", "were", "does"], "What did she eat for lunch?", c("What did she ate for lunch?", "What did she eat for lunch?", ["What did she eat for lunch?", "What did she ate for lunch?", "What was she eat for lunch?", "What does she ate for lunch?"])),
      g("Did he ___ bread after work?", "buy", ["buy", "bought", "buys", "buying"], "Did he buy bread after work?", c("Did he bought bread after work?", "Did he buy bread after work?", ["Did he buy bread after work?", "Did he bought bread after work?", "Did he buys bread after work?", "Was he buy bread after work?"])),
      g("Where ___ they go after class?", "did", ["did", "were", "was", "do"], "Where did they go after class?", c("Where did they went after class?", "Where did they go after class?", ["Where did they go after class?", "Where did they went after class?", "Where were they go after class?", "Where do they went after class?"])),
      g("When did you ___ home?", "arrive", ["arrive", "arrived", "arrives", "arriving"], "When did you arrive home?", c("When did you arrived home?", "When did you arrive home?", ["When did you arrive home?", "When did you arrived home?", "When were you arrive home?", "When do you arrived home?"])),
      g("Did she ___ her homework?", "finish", ["finish", "finished", "finishes", "finishing"], "Did she finish her homework?"),
      g("Why did he ___ early?", "leave", ["leave", "left", "leaves", "leaving"], "Why did he leave early?"),
      g("Who did they ___ at the station?", "meet", ["meet", "met", "meets", "meeting"], "Who did they meet at the station?"),
      g("Did we ___ the movie last night?", "watch", ["watch", "watched", "watches", "watching"], "Did we watch the movie last night?"),
      g("What did your brother ___ after dinner?", "do", ["do", "did", "does", "doing"], "What did your brother do after dinner?"),
    ],
    listening: [
      l("Did you go home after class?", "What place do you hear?", "home", ["school", "church", "the park"], "Which question word starts the sentence?", "Did", ["Was", "Were", "When"]),
      l("Did she eat breakfast at home?", "What meal do you hear?", "breakfast", ["lunch", "dinner", "a snack"], "Which structure do you hear?", "yes or no question", ["negative sentence", "command", "present sentence"]),
      l("Where did he go yesterday?", "What kind of question is it?", "a wh-question", ["a short answer", "a command", "a negative sentence"], "Which word starts the sentence?", "Where", ["Did", "Was", "No"]),
      l("What did they buy at the market?", "What action do you hear?", "buy", ["eat", "study", "visit"], "Which helping word do you hear?", "did", ["was", "were", "didn't"]),
      l("When did you arrive at school?", "What time idea do you hear?", "when", ["where", "what", "why"], "Which base verb do you hear?", "arrive", ["arrived", "arrives", "arriving"]),
    ],
    speakingPrompts: [
      s("Did you study yesterday?", "Yes, I did.", ["Yes I did.", "I did."]),
      s("Did you eat breakfast today?", "Yes, I did.", ["Yes I did."]),
      s("Where did you go yesterday?", "I went to the supermarket.", ["I went to the store.", "I went to the supermarket yesterday."]),
      s("What did you buy?", "I bought bread.", ["I bought some bread."]),
      s("Did your friend watch a movie?", "No, he didn't.", ["No he didn't.", "He didn't."]),
    ],
    writing: [
      w("You went to school. -> Did you ___ to school?", "Did you go to school?", "go"),
      w("She ate breakfast. -> Did she ___ breakfast?", "Did she eat breakfast?", "eat"),
      w("They watched a movie. -> Did they ___ a movie?", "Did they watch a movie?", "watch"),
      w("He bought bread. -> Did he ___ bread?", "Did he buy bread?", "buy"),
      w("You arrived late. -> When did you ___?", "When did you arrive?", "arrive"),
    ],
    facts: [
      f(
        "Teacher: Did you study yesterday? Student: Yes, I did. I studied English and math. Teacher: Did you finish your homework? Student: No, I didn't.",
        "Did the student study yesterday?",
        "Yes, the student studied yesterday.",
        ["No, the student didn't study.", "No, the student watched TV.", "Yes, the teacher studied yesterday."],
        "What did the student study?",
        "The student studied English and math.",
        ["The student studied music and art.", "The student studied science and history.", "The student studied only math."],
        "Did the student finish the homework?",
        "No, the student didn't finish the homework.",
        ["Yes, the student finished it.", "Yes, the teacher finished it.", "No, the homework was easy."],
      ),
      f(
        "Nina asked her brother, 'Did you go to the market?' He answered, 'Yes, I did. I bought fruit and milk.'",
        "Did Nina's brother go to the market?",
        "Yes, he did.",
        ["No, he didn't.", "Yes, Nina did.", "No, he went to school."],
        "What did he buy?",
        "He bought fruit and milk.",
        ["He bought bread and cheese.", "He bought books and pens.", "He bought juice and rice."],
        "Who asked the question?",
        "Nina asked the question.",
        ["Her teacher asked the question.", "His mother asked the question.", "The cashier asked the question."],
      ),
      f(
        "At dinner, Mom asked, 'What did you do after school?' Ben said, 'I played soccer and then I came home.'",
        "What did Mom ask Ben?",
        "She asked what he did after school.",
        ["She asked where he slept.", "She asked why he was late.", "She asked what he ate for lunch."],
        "What did Ben do after school?",
        "He played soccer.",
        ["He studied English.", "He visited his grandmother.", "He watched a movie."],
        "What did Ben do next?",
        "He came home.",
        ["He went to the store.", "He cooked dinner.", "He cleaned the room."],
      ),
      f(
        "Marta asked, 'Where did you go on Saturday?' Lucas answered, 'I went to my uncle's farm with my parents.'",
        "What day did Marta ask about?",
        "She asked about Saturday.",
        ["She asked about Monday.", "She asked about Friday.", "She asked about Sunday."],
        "Where did Lucas go?",
        "He went to his uncle's farm.",
        ["He went to the beach.", "He went to the zoo.", "He went to the museum."],
        "Who went with Lucas?",
        "His parents went with him.",
        ["His cousins went with him.", "His friends went with him.", "His teacher went with him."],
      ),
      f(
        "The reporter asked, 'When did the train arrive?' The worker said, 'It arrived at six and left again at seven.'",
        "Who asked the question?",
        "The reporter asked the question.",
        ["The driver asked the question.", "The teacher asked the question.", "The doctor asked the question."],
        "When did the train arrive?",
        "It arrived at six.",
        ["It arrived at five.", "It arrived at seven.", "It arrived at eight."],
        "When did it leave again?",
        "It left again at seven.",
        ["It left again at six.", "It left again at nine.", "It left again at noon."],
      ),
    ],
  },
  {
    number: 54,
    title: "Lesson 54: Negative with Didn't",
    vocab: [
      v("go", "to move from one place to another", "I didn't ____ to school yesterday.", ["eat", "buy", "watch"]),
      v("eat", "to have food", "She didn't ____ breakfast this morning.", ["visit", "take", "call"]),
      v("buy", "to get something by paying money", "He didn't ____ bread at the store.", ["study", "see", "drink"]),
      v("watch", "to look at a movie or show", "They didn't ____ TV last night.", ["go", "leave", "help"]),
      v("study", "to learn something", "We didn't ____ English yesterday.", ["play", "buy", "open"]),
      v("clean", "to make something tidy", "Laura didn't ____ her room after school.", ["go", "speak", "drink"]),
      v("help", "to give support", "I didn't ____ my brother with homework.", ["eat", "visit", "see"]),
      v("arrive", "to reach a place", "The bus didn't ____ on time.", ["play", "watch", "buy"]),
      v("leave", "to go away from a place", "They didn't ____ early yesterday.", ["open", "study", "call"]),
      v("call", "to speak to someone by phone", "He didn't ____ me last night.", ["drink", "watch", "work"]),
    ],
    grammar: [
      g("I didn't ___ to school yesterday.", "go", ["go", "went", "goes", "going"], "I didn't go to school yesterday.", c("I didn't went to school yesterday.", "I didn't go to school yesterday.", ["I didn't go to school yesterday.", "I didn't went to school yesterday.", "I don't went to school yesterday.", "I didn't goes to school yesterday."])),
      g("She didn't ___ breakfast at home.", "eat", ["eat", "ate", "eats", "eating"], "She didn't eat breakfast at home.", c("She didn't ate breakfast at home.", "She didn't eat breakfast at home.", ["She didn't eat breakfast at home.", "She didn't ate breakfast at home.", "She doesn't ate breakfast at home.", "She didn't eating breakfast at home."])),
      g("They didn't ___ the movie last night.", "watch", ["watch", "watched", "watches", "watching"], "They didn't watch the movie last night.", c("They didn't watched the movie last night.", "They didn't watch the movie last night.", ["They didn't watch the movie last night.", "They didn't watched the movie last night.", "They weren't watch the movie last night.", "They don't watched the movie last night."])),
      g("He didn't ___ bread after work.", "buy", ["buy", "bought", "buys", "buying"], "He didn't buy bread after work.", c("He didn't bought bread after work.", "He didn't buy bread after work.", ["He didn't buy bread after work.", "He didn't bought bread after work.", "He wasn't buy bread after work.", "He didn't buying bread after work."])),
      g("We didn't ___ yesterday evening.", "study", ["study", "studied", "studies", "studying"], "We didn't study yesterday evening.", c("We didn't studied yesterday evening.", "We didn't study yesterday evening.", ["We didn't study yesterday evening.", "We didn't studied yesterday evening.", "We don't studied yesterday evening.", "We didn't studying yesterday evening."])),
      g("Laura didn't ___ her room after school.", "clean", ["clean", "cleaned", "cleans", "cleaning"], "Laura didn't clean her room after school."),
      g("I didn't ___ my mother with dinner.", "help", ["help", "helped", "helps", "helping"], "I didn't help my mother with dinner."),
      g("The bus didn't ___ on time.", "arrive", ["arrive", "arrived", "arrives", "arriving"], "The bus didn't arrive on time."),
      g("They didn't ___ early from the party.", "leave", ["leave", "left", "leaves", "leaving"], "They didn't leave early from the party."),
      g("He didn't ___ me last night.", "call", ["call", "called", "calls", "calling"], "He didn't call me last night."),
    ],
    listening: [
      l("I didn't go to school yesterday.", "Where didn't the speaker go?", "to school", ["to church", "to work", "to the market"], "Which structure do you hear?", "negative", ["question", "present", "affirmative"]),
      l("She didn't eat breakfast.", "What didn't she do?", "eat breakfast", ["buy bread", "watch TV", "study English"], "Which helping word do you hear?", "didn't", ["did", "wasn't", "weren't"]),
      l("They didn't study last night.", "When didn't they study?", "last night", ["this morning", "next week", "right now"], "Which base verb do you hear?", "study", ["studied", "studies", "studying"]),
      l("He didn't buy bread.", "What didn't he buy?", "bread", ["milk", "fruit", "water"], "Which structure do you hear?", "negative past", ["question", "present simple", "future"]),
      l("We didn't watch TV after dinner.", "What didn't they watch?", "TV", ["a movie", "a game", "the news"], "Which base verb do you hear?", "watch", ["watched", "watches", "watching"]),
    ],
    speakingPrompts: [
      s("What didn't you do yesterday?", "I didn't watch TV yesterday.", ["I didn't watch TV."]),
      s("What didn't you eat last night?", "I didn't eat pizza last night.", ["I didn't eat pizza."]),
      s("Did you go to school yesterday?", "No, I didn't.", ["No I didn't.", "I didn't."]),
      s("Did your friend clean the room?", "No, he didn't.", ["No he didn't.", "He didn't."]),
      s("Did your family study English last night?", "No, we didn't.", ["No we didn't.", "We didn't."]),
    ],
    writing: [
      w("I went to school. -> I didn't ___ to school.", "I didn't go to school.", "go"),
      w("She ate pizza. -> She didn't ___ pizza.", "She didn't eat pizza.", "eat"),
      w("They watched TV. -> They didn't ___ TV.", "They didn't watch TV.", "watch"),
      w("He bought bread. -> He didn't ___ bread.", "He didn't buy bread.", "buy"),
      w("We studied English. -> We didn't ___ English.", "We didn't study English.", "study"),
    ],
    facts: [
      f(
        "Mom asked, 'Did you clean your room?' Ben answered, 'No, I didn't clean it. But I did my homework before dinner.'",
        "Did Ben clean his room?",
        "No, he didn't clean his room.",
        ["Yes, he cleaned his room.", "No, he didn't do his homework.", "Yes, he cleaned the kitchen."],
        "What did Ben do before dinner?",
        "He did his homework before dinner.",
        ["He watched TV before dinner.", "He played soccer before dinner.", "He bought bread before dinner."],
        "Who asked the question?",
        "Mom asked the question.",
        ["The teacher asked the question.", "His brother asked the question.", "The coach asked the question."],
      ),
      f(
        "Yesterday, Laura didn't go to the supermarket because she was sick. She stayed at home and didn't cook dinner.",
        "Did Laura go to the supermarket yesterday?",
        "No, she didn't go to the supermarket.",
        ["Yes, she went to the supermarket.", "No, she went to school.", "Yes, she bought fruit."],
        "Why didn't she go out?",
        "Because she was sick.",
        ["Because she was late.", "Because she was busy at church.", "Because she was in the office."],
        "What didn't she cook?",
        "She didn't cook dinner.",
        ["She didn't cook breakfast.", "She didn't cook lunch.", "She didn't cook soup."],
      ),
      f(
        "The boys didn't watch the game because the TV didn't work. Instead, they played cards in the living room.",
        "Why didn't the boys watch the game?",
        "Because the TV didn't work.",
        ["Because they were at school.", "Because the game was today.", "Because they didn't like cards."],
        "What did they do instead?",
        "They played cards in the living room.",
        ["They cleaned the kitchen.", "They slept in the bedroom.", "They visited the park."],
        "Where did they play cards?",
        "They played cards in the living room.",
        ["They played cards in the garden.", "They played cards in the garage.", "They played cards in the office."],
      ),
      f(
        "Marta didn't call her cousin last night, and she didn't answer her phone either because the battery was dead.",
        "Did Marta call her cousin last night?",
        "No, she didn't call her cousin.",
        ["Yes, she called her cousin.", "No, her cousin called the police.", "Yes, she called her teacher."],
        "Did she answer her phone?",
        "No, she didn't answer her phone.",
        ["Yes, she answered it.", "Yes, she answered in class.", "No, she answered at work."],
        "Why didn't she answer it?",
        "Because the battery was dead.",
        ["Because she was at church.", "Because she was asleep at school.", "Because the phone was new."],
      ),
      f(
        "We didn't leave early from the party because our friends arrived late. We stayed there until ten.",
        "Did we leave early from the party?",
        "No, we didn't leave early.",
        ["Yes, we left at six.", "No, we left before dinner.", "Yes, our friends left early."],
        "Why didn't we leave early?",
        "Because our friends arrived late.",
        ["Because the music was bad.", "Because the bus arrived early.", "Because the house was empty."],
        "How long did we stay?",
        "We stayed there until ten.",
        ["We stayed there until eight.", "We stayed there until midnight.", "We stayed there until lunch."],
      ),
    ],
  },
  {
    number: 55,
    title: "Lesson 55: Past Time Expressions",
    vocab: [
      v("yesterday", "the day before today", "I studied English ____.", ["tomorrow", "soon", "today"]),
      v("last night", "the evening before today", "She called me ____.", ["next month", "right now", "this afternoon"]),
      v("last week", "the week before this one", "They traveled ____.", ["next week", "every week", "this year"]),
      v("two days ago", "two days before today", "He arrived ____.", ["tomorrow morning", "last year", "next Monday"]),
      v("in 2020", "during the year 2020", "We moved to this city ____.", ["on Monday", "at six", "two days ago"]),
      v("on Monday", "during Monday", "I visited my aunt ____.", ["in 2019", "at night", "last month"]),
      v("at seven o'clock", "when the time was seven", "She arrived ____.", ["in July", "on Friday", "last week"]),
      v("last month", "the month before this one", "My family visited us ____.", ["next month", "today", "in class"]),
      v("last year", "the year before this one", "He finished school ____.", ["this morning", "at noon", "two hours ago"]),
      v("when I was a child", "during childhood", "I lived in a small town ____.", ["next year", "on Tuesday", "at ten"]),
    ],
    grammar: [
      g("I studied ___ night.", "last", ["last", "in", "on", "at"], "I studied last night.", c("I studied in last night.", "I studied last night.", ["I studied last night.", "I studied in last night.", "I studied on last night.", "I studied at last night."])),
      g("She was born ___ 2010.", "in", ["in", "on", "at", "last"], "She was born in 2010.", c("She was born on 2010.", "She was born in 2010.", ["She was born in 2010.", "She was born on 2010.", "She was born at 2010.", "She was born last 2010."])),
      g("We traveled ___ Monday.", "on", ["on", "in", "at", "ago"], "We traveled on Monday.", c("We traveled in Monday.", "We traveled on Monday.", ["We traveled on Monday.", "We traveled in Monday.", "We traveled at Monday.", "We traveled ago Monday."])),
      g("He arrived two days ___.", "ago", ["ago", "last", "in", "on"], "He arrived two days ago.", c("He arrived two days last.", "He arrived two days ago.", ["He arrived two days ago.", "He arrived two days last.", "He arrived two days in.", "He arrived two days on."])),
      g("She arrived ___ seven o'clock.", "at", ["at", "in", "on", "last"], "She arrived at seven o'clock.", c("She arrived on seven o'clock.", "She arrived at seven o'clock.", ["She arrived at seven o'clock.", "She arrived on seven o'clock.", "She arrived in seven o'clock.", "She arrived last seven o'clock."])),
      g("My family visited us ___ July last month.", "in", ["in", "on", "at", "ago"], "My family visited us in July last month.", undefined, ["in"]),
      g("I lived in a small town ___ I was a child.", "when", ["when", "on", "at", "last"], "I lived in a small town when I was a child."),
      g("They moved here ___ 2020.", "in", ["in", "on", "at", "ago"], "They moved here in 2020."),
      g("We met our friends ___ Friday evening.", "on", ["on", "in", "at", "last"], "We met our friends on Friday evening."),
      g("The class started ___ nine o'clock.", "at", ["at", "in", "on", "ago"], "The class started at nine o'clock."),
    ],
    listening: [
      l("I studied yesterday.", "When did the speaker study?", "yesterday", ["last month", "next week", "today"], "Which time expression do you hear?", "yesterday", ["tomorrow", "every day", "now"]),
      l("She arrived last night.", "When did she arrive?", "last night", ["this morning", "next year", "on Monday"], "Which structure do you hear?", "past time expression", ["present time", "future time", "a command"]),
      l("They traveled last week.", "When did they travel?", "last week", ["today", "next week", "at noon"], "Which word do you hear before week?", "last", ["next", "this", "every"]),
      l("We moved in 2020.", "In what year did they move?", "2020", ["2018", "2022", "2030"], "Which preposition do you hear?", "in", ["on", "at", "ago"]),
      l("He called me two days ago.", "How many days ago did he call?", "two days ago", ["one day ago", "three weeks ago", "last year"], "Which word ends the time expression?", "ago", ["last", "in", "at"]),
    ],
    speakingPrompts: [
      s("When did you study English?", "I studied English yesterday.", ["I studied English last night."]),
      s("When did you go to church?", "I went to church on Sunday.", ["I went to church last Sunday."]),
      s("When did your family visit you?", "My family visited me last month.", ["They visited me last month."]),
      s("When were you born?", "I was born in 2010.", ["I was born in 2011."]),
      s("When did the class start?", "The class started at seven o'clock.", ["It started at seven o'clock."]),
    ],
    writing: [
      w("I was born ___ 2010.", "I was born in 2010.", "in"),
      w("She arrived ___ seven o'clock.", "She arrived at seven o'clock.", "at"),
      w("They visited us ___ Monday.", "They visited us on Monday.", "on"),
      w("He called me two days ___.", "He called me two days ago.", "ago"),
      w("We traveled ___ last week.", "We traveled last week.", "last"),
    ],
    facts: [
      f(
        "Last week, Julia visited her grandparents. On Monday, she helped her grandmother. On Tuesday, she cooked dinner. Two days ago, she returned home.",
        "When did Julia visit her grandparents?",
        "She visited them last week.",
        ["She visited them yesterday morning.", "She visited them next week.", "She visited them in 2030."],
        "What did she do on Monday?",
        "She helped her grandmother.",
        ["She went to school.", "She bought fruit.", "She played soccer."],
        "When did she return home?",
        "She returned home two days ago.",
        ["She returned home last year.", "She returned home tomorrow.", "She returned home on Friday night."],
      ),
      f(
        "In 2020, Lucas moved to a new city. Last year, he started a new job, and last month he bought a new bike.",
        "When did Lucas move to a new city?",
        "He moved there in 2020.",
        ["He moved there on Monday.", "He moved there at eight.", "He moved there two days ago."],
        "What did he start last year?",
        "He started a new job.",
        ["He started a new class.", "He started a trip.", "He started a new bike."],
        "What did he buy last month?",
        "He bought a new bike.",
        ["He bought a new car.", "He bought a new phone.", "He bought a new book."],
      ),
      f(
        "Yesterday afternoon, Ana called her cousin. At seven o'clock, they met at a restaurant. On Friday, they planned another dinner.",
        "When did Ana call her cousin?",
        "She called her cousin yesterday afternoon.",
        ["She called her cousin last year.", "She called her cousin tomorrow afternoon.", "She called her cousin in 2020."],
        "What time did they meet?",
        "They met at seven o'clock.",
        ["They met at six o'clock.", "They met at nine o'clock.", "They met at noon."],
        "When did they plan another dinner?",
        "They planned it on Friday.",
        ["They planned it on Monday.", "They planned it last night.", "They planned it in 2018."],
      ),
      f(
        "When I was a child, I lived near the beach. Last summer, I went there again with my family.",
        "Where did the writer live as a child?",
        "The writer lived near the beach.",
        ["The writer lived near a river.", "The writer lived in the mountains.", "The writer lived by a museum."],
        "When did the writer go there again?",
        "The writer went there again last summer.",
        ["The writer went there again next summer.", "The writer went there again yesterday morning.", "The writer went there again in 2035."],
        "Who went with the writer?",
        "The writer's family went there too.",
        ["The writer's teacher went there too.", "The writer's doctor went there too.", "The writer's coach went there too."],
      ),
      f(
        "The lesson started at nine o'clock on Monday. Two weeks ago, the class met in a different room.",
        "What time did the lesson start?",
        "It started at nine o'clock.",
        ["It started at eight o'clock.", "It started at ten o'clock.", "It started at noon."],
        "On what day did the lesson start?",
        "It started on Monday.",
        ["It started on Tuesday.", "It started on Friday.", "It started on Sunday."],
        "When did the class meet in a different room?",
        "It met in a different room two weeks ago.",
        ["It met there last year.", "It met there tomorrow.", "It met there in 2040."],
      ),
    ],
  },
  {
    number: 56,
    title: "Lesson 56: Telling a Short Story",
    vocab: [
      v("first", "the action or point that comes at the beginning", "____, I woke up early.", ["Finally", "After that", "Later"]),
      v("then", "the next action after the first one", "I had breakfast. ____, I went to school.", ["First", "Before", "Yesterday"]),
      v("next", "after something else in a sequence", "We finished lunch. ____, we cleaned the table.", ["Before", "Last year", "At noon"]),
      v("after that", "the step that comes after another action", "I studied. ____, I called my friend.", ["In 2020", "First", "At night"]),
      v("finally", "the last action in a sequence", "____, I came back home.", ["Then", "Before", "Yesterday"]),
      v("later", "at a time after the present point in the story", "We rested, and ____ we watched a movie.", ["first", "at seven", "on Monday"]),
      v("wake up", "to stop sleeping", "I ____ at six yesterday morning.", ["came home", "took pictures", "bought fruit"]),
      v("come home", "to return to your house", "After work, I ____ and cooked dinner.", ["woke up", "left school", "played soccer"]),
      v("sleep", "to rest at night", "I was tired, so I went to ____ early.", ["study", "travel", "call"]),
      v("busy day", "a day with many activities", "Yesterday was a ____ for Marcos.", ["quiet room", "new ticket", "small tree"]),
    ],
    grammar: [
      g("___, I woke up early.", "First", ["First", "Finally", "Later", "Yesterday"], "First, I woke up early.", c("Then, I woke up early. Later, it was the first action.", "First, I woke up early.", ["First, I woke up early.", "Then, I woke up early.", "Finally, I woke up early.", "At noon, I woke up early."])),
      g("Then, I ___ breakfast.", "had", ["had", "have", "has", "haved"], "Then, I had breakfast.", c("Then, I haved breakfast.", "Then, I had breakfast.", ["Then, I had breakfast.", "Then, I haved breakfast.", "Then, I have breakfast yesterday.", "Then, I has breakfast yesterday."])),
      g("After that, I ___ to school.", "went", ["went", "go", "goed", "gone"], "After that, I went to school.", c("After that, I goed to school.", "After that, I went to school.", ["After that, I went to school.", "After that, I goed to school.", "After that, I go to school yesterday.", "After that, I gone to school."])),
      g("Finally, I ___ back home.", "came", ["came", "come", "comed", "comes"], "Finally, I came back home.", c("Finally, I comed back home.", "Finally, I came back home.", ["Finally, I came back home.", "Finally, I comed back home.", "Finally, I come back home yesterday.", "Finally, I comes back home yesterday."])),
      g("Yesterday ___ a busy day.", "was", ["was", "were", "is", "be"], "Yesterday was a busy day.", c("Yesterday were a busy day.", "Yesterday was a busy day.", ["Yesterday was a busy day.", "Yesterday were a busy day.", "Yesterday is a busy day.", "Yesterday be a busy day."])),
      g("Next, we ___ the table after lunch.", "cleaned", ["cleaned", "clean", "cleans", "cleaning"], "Next, we cleaned the table after lunch."),
      g("Later, she ___ her friend on the phone.", "called", ["called", "call", "calls", "calling"], "Later, she called her friend on the phone."),
      g("Before bed, I ___ a shower.", "took", ["took", "take", "taked", "takes"], "Before bed, I took a shower."),
      g("In the evening, they ___ a movie.", "watched", ["watched", "watch", "watches", "watching"], "In the evening, they watched a movie."),
      g("At night, he ___ early because he was tired.", "slept", ["slept", "sleep", "sleeped", "sleeps"], "At night, he slept early because he was tired."),
    ],
    listening: [
      l("First, I woke up early.", "What happened first?", "I woke up early.", ["I had breakfast.", "I went to school.", "I came home."], "Which sequence word do you hear?", "First", ["Then", "Finally", "Later"]),
      l("Then, I had breakfast.", "What happened then?", "I had breakfast.", ["I watched a movie.", "I cleaned the table.", "I went to bed."], "Which sequence word do you hear?", "Then", ["First", "After that", "Finally"]),
      l("After that, I went to work.", "Where did the speaker go?", "to work", ["to the beach", "to church", "to the zoo"], "Which sequence word do you hear?", "After that", ["First", "Yesterday", "At night"]),
      l("Finally, I came home.", "How did the day end?", "The speaker came home.", ["The speaker went to school.", "The speaker ate lunch.", "The speaker called a friend."], "Which sequence word do you hear?", "Finally", ["Then", "Later", "Before"]),
      l("Later, we watched a movie.", "What did they watch later?", "a movie", ["the news", "the game", "the lesson"], "Which sequence word do you hear?", "Later", ["First", "Next week", "At noon"]),
    ],
    speakingPrompts: [
      s("Tell me the first thing you did yesterday.", "First, I woke up early.", ["First I woke up early."]),
      s("What did you do after that?", "After that, I went to school.", ["Then I went to school."]),
      s("How did your day end?", "Finally, I came home.", ["I came home finally."]),
      s("What did you do later in the evening?", "Later, I watched a movie.", ["Later I watched a movie."]),
      s("Was yesterday a busy day?", "Yes, it was a busy day.", ["Yes it was.", "It was a busy day."]),
    ],
    writing: [
      w("___, I woke up early.", "First, I woke up early.", "First"),
      w("Then, I ___ breakfast.", "Then, I had breakfast.", "had"),
      w("After that, I ___ to school.", "After that, I went to school.", "went"),
      w("Finally, I ___ home.", "Finally, I came home.", "came"),
      w("Yesterday ___ a busy day.", "Yesterday was a busy day.", "was"),
    ],
    facts: [
      f(
        "Yesterday, Marcos had a very busy day. First, he woke up late. Then, he ran to school. After that, he studied English and math. Finally, he went home and slept early.",
        "Why was Marcos's day busy?",
        "Because he had many activities.",
        ["Because he stayed in bed all day.", "Because he watched TV all morning.", "Because he traveled to another country."],
        "What did Marcos do first?",
        "He woke up late first.",
        ["He studied math first.", "He went home first.", "He slept early first."],
        "How did the day end?",
        "It ended when he went home and slept early.",
        ["It ended when he played soccer.", "It ended when he cooked dinner.", "It ended when he visited a museum."],
      ),
      f(
        "On Saturday, Clara told a short story about her day. First, she cleaned her room. Next, she helped her mother. After that, she visited her grandmother. Finally, she came back home.",
        "What did Clara clean first?",
        "She cleaned her room first.",
        ["She cleaned the kitchen first.", "She cleaned the car first.", "She cleaned the table first."],
        "Who did Clara help next?",
        "She helped her mother next.",
        ["She helped her teacher next.", "She helped her cousin next.", "She helped her coach next."],
        "Who did she visit after that?",
        "She visited her grandmother.",
        ["She visited her dentist.", "She visited her brother.", "She visited her boss."],
      ),
      f(
        "First, the boys played soccer. Then, they drank water. Later, they bought bread, and finally they went home for dinner.",
        "What did the boys do first?",
        "They played soccer first.",
        ["They drank water first.", "They bought bread first.", "They went home first."],
        "What did they do after soccer?",
        "They drank water.",
        ["They studied English.", "They took pictures.", "They watched a movie."],
        "What did they do finally?",
        "They went home for dinner.",
        ["They left for school.", "They visited a farm.", "They slept in class."],
      ),
      f(
        "Marta woke up early and made breakfast. After that, she worked in the garden. In the evening, she called her friend and told the story of her day.",
        "What did Marta make in the morning?",
        "She made breakfast.",
        ["She made lunch.", "She made a ticket.", "She made a picture."],
        "What did she do after breakfast?",
        "She worked in the garden.",
        ["She went to the airport.", "She bought shoes.", "She studied fossils."],
        "What did she do in the evening?",
        "She called her friend.",
        ["She played soccer.", "She slept at work.", "She watched a class."],
      ),
      f(
        "At night, Leo wrote four sentences about his day. He used first, then, after that, and finally to organize the story.",
        "What did Leo write at night?",
        "He wrote four sentences about his day.",
        ["He wrote a shopping list.", "He wrote a song.", "He wrote a recipe."],
        "Which words did Leo use?",
        "He used first, then, after that, and finally.",
        ["He used today, tomorrow, and next week.", "He used who, what, and where.", "He used big, small, and long."],
        "Why did he use those words?",
        "He used them to organize the story.",
        ["He used them to ask questions.", "He used them to talk about the future.", "He used them to describe a color."],
      ),
    ],
  },
  {
    number: 57,
    title: "Lesson 57: A Trip in the Past",
    vocab: [
      v("trip", "a visit to another place", "The family enjoyed the weekend ____.", ["river", "ticket", "guide"]),
      v("hotel", "a place where travelers sleep", "They stayed at a small ____ near the beach.", ["museum", "forest", "bridge"]),
      v("museum", "a place with objects from history, art, or science", "We visited a ____ on Saturday afternoon.", ["suitcase", "map", "ocean"]),
      v("beach", "the sandy place by the sea", "The children played on the ____.", ["airport", "station", "ticket"]),
      v("restaurant", "a place where people buy and eat meals", "They ate dinner at a local ____.", ["picture", "river", "weekend"]),
      v("airport", "the place where airplanes arrive and leave", "Her father waited at the ____ with a suitcase.", ["forest", "hotel", "guide"]),
      v("ticket", "the paper or digital pass for travel", "I bought a bus ____ before the trip.", ["vacation", "map", "park"]),
      v("suitcase", "a travel bag for clothes and personal items", "My clothes were in a blue ____.", ["museum", "restaurant", "guide"]),
      v("picture", "a photo or image", "She took a beautiful ____ of the ocean.", ["ticket", "trip", "city"]),
      v("souvenir", "something you buy to remember a place", "He didn't buy a ____ at the market.", ["hotel", "airport", "vacation"]),
    ],
    grammar: [
      g("We ___ to another city last weekend.", "went", ["went", "go", "goed", "gone"], "We went to another city last weekend.", c("We goed to another city last weekend.", "We went to another city last weekend.", ["We went to another city last weekend.", "We goed to another city last weekend.", "We go to another city last weekend.", "We gone to another city last weekend."])),
      g("I ___ many pictures on the trip.", "took", ["took", "take", "taked", "takes"], "I took many pictures on the trip.", c("I taked many pictures on the trip.", "I took many pictures on the trip.", ["I took many pictures on the trip.", "I taked many pictures on the trip.", "I take many pictures on the trip yesterday.", "I takes many pictures on the trip yesterday."])),
      g("She didn't ___ souvenirs at the museum.", "buy", ["buy", "bought", "buys", "buying"], "She didn't buy souvenirs at the museum.", c("She didn't bought souvenirs at the museum.", "She didn't buy souvenirs at the museum.", ["She didn't buy souvenirs at the museum.", "She didn't bought souvenirs at the museum.", "She didn't buying souvenirs at the museum.", "She doesn't bought souvenirs at the museum."])),
      g("Did they ___ the museum on Sunday?", "visit", ["visit", "visited", "visits", "visiting"], "Did they visit the museum on Sunday?", c("Did they visited the museum on Sunday?", "Did they visit the museum on Sunday?", ["Did they visit the museum on Sunday?", "Did they visited the museum on Sunday?", "Were they visit the museum on Sunday?", "Do they visited the museum on Sunday?"])),
      g("The trip ___ fun and relaxing.", "was", ["was", "were", "is", "be"], "The trip was fun and relaxing.", c("The trip were fun and relaxing.", "The trip was fun and relaxing.", ["The trip was fun and relaxing.", "The trip were fun and relaxing.", "The trip is fun and relaxing yesterday.", "The trip be fun and relaxing."])),
      g("We ___ at a hotel near the park.", "stayed", ["stayed", "stay", "stays", "staying"], "We stayed at a hotel near the park."),
      g("I ___ at a restaurant by the beach.", "ate", ["ate", "eat", "eated", "eats"], "I ate at a restaurant by the beach."),
      g("He ___ the map before lunch.", "opened", ["opened", "open", "opens", "opening"], "He opened the map before lunch."),
      g("They ___ the airport early in the morning.", "left", ["left", "leave", "leaved", "leaves"], "They left the airport early in the morning."),
      g("Did you ___ the trip?", "enjoy", ["enjoy", "enjoyed", "enjoys", "enjoying"], "Did you enjoy the trip?"),
    ],
    listening: [
      l("I traveled last weekend.", "When did the speaker travel?", "last weekend", ["last month", "tomorrow", "next week"], "Which structure do you hear?", "affirmative past", ["negative past", "question", "present simple"]),
      l("We stayed at a hotel.", "Where did they stay?", "at a hotel", ["at a museum", "at the airport", "at the beach"], "Which travel word do you hear?", "hotel", ["ticket", "map", "suitcase"]),
      l("They visited a museum.", "What place did they visit?", "a museum", ["a restaurant", "a park", "a farm"], "Which verb do you hear?", "visited", ["visit", "visits", "visiting"]),
      l("She took many pictures.", "What did she take?", "many pictures", ["a suitcase", "a ticket", "a guide"], "Which irregular verb do you hear?", "took", ["take", "taked", "buy"]),
      l("Did you enjoy the trip?", "What kind of sentence is it?", "a question", ["a negative sentence", "a command", "a story title"], "Which travel word do you hear?", "trip", ["hotel", "airport", "museum"]),
    ],
    speakingPrompts: [
      s("Where did you travel?", "I traveled to another city.", ["I went to another city."]),
      s("Who did you go with?", "I went with my family.", ["I traveled with my family."]),
      s("What did you see there?", "I saw a museum and a park.", ["I saw a museum."]),
      s("What did you eat?", "I ate at a local restaurant.", ["I ate dinner at a local restaurant."]),
      s("Did you enjoy the trip?", "Yes, I did.", ["Yes I did.", "I did."]),
    ],
    writing: [
      w("We went to the beach. -> Did you ___ to the beach?", "Did you go to the beach?", "go"),
      w("I bought souvenirs. -> I didn't ___ souvenirs.", "I didn't buy souvenirs.", "buy"),
      w("She visited a museum. -> Did she ___ a museum?", "Did she visit a museum?", "visit"),
      w("The trip was fun. -> The trip ___ fun.", "The trip was fun.", "was"),
      w("He took pictures. -> He ___ pictures.", "He took pictures.", "took"),
    ],
    facts: [
      f(
        "Last weekend, Clara traveled to a small city with her family. They stayed at a hotel, visited a museum, and ate at a local restaurant. Clara took many pictures, but she didn't buy souvenirs.",
        "Where did Clara travel?",
        "She traveled to a small city.",
        ["She traveled to a farm.", "She traveled to a village by the river.", "She traveled to another country."],
        "Where did Clara's family stay?",
        "They stayed at a hotel.",
        ["They stayed at an airport.", "They stayed at a museum.", "They stayed at a bus station."],
        "Did Clara buy souvenirs?",
        "No, she didn't buy souvenirs.",
        ["Yes, she bought souvenirs.", "No, she didn't take pictures.", "Yes, she bought a suitcase."],
      ),
      f(
        "On Friday night, Leo packed his suitcase and bought a ticket. On Saturday morning, he went to the airport with his uncle.",
        "What did Leo pack?",
        "He packed his suitcase.",
        ["He packed his backpack.", "He packed his lunch.", "He packed his bike."],
        "What did Leo buy?",
        "He bought a ticket.",
        ["He bought a hotel.", "He bought a museum.", "He bought a beach."],
        "Who went to the airport with Leo?",
        "His uncle went with him.",
        ["His teacher went with him.", "His cousin went with him.", "His coach went with him."],
      ),
      f(
        "Marta and her sister went to the beach, took pictures, and ate fish at a restaurant by the ocean.",
        "Where did Marta and her sister go?",
        "They went to the beach.",
        ["They went to the forest.", "They went to the museum.", "They went to the airport."],
        "What did they take?",
        "They took pictures.",
        ["They took a train.", "They took a map.", "They took a guide."],
        "What did they eat?",
        "They ate fish at a restaurant.",
        ["They ate pizza at school.", "They ate soup at the hotel.", "They ate bread at the museum."],
      ),
      f(
        "The trip was short, but it was fun. We walked in the park, visited a museum, and came home on Sunday evening.",
        "How was the trip?",
        "It was short but fun.",
        ["It was long and boring.", "It was noisy and empty.", "It was late and cold."],
        "What did we do in the park?",
        "We walked in the park.",
        ["We slept in the park.", "We bought shoes in the park.", "We cooked dinner in the park."],
        "When did we come home?",
        "We came home on Sunday evening.",
        ["We came home on Monday morning.", "We came home last month.", "We came home at noon on Friday."],
      ),
      f(
        "During the vacation, my parents didn't buy souvenirs, but they bought a map and took many pictures of the old city.",
        "What didn't my parents buy?",
        "They didn't buy souvenirs.",
        ["They didn't buy a map.", "They didn't buy pictures.", "They didn't buy a hotel."],
        "What did they buy?",
        "They bought a map.",
        ["They bought a restaurant.", "They bought an airport.", "They bought a museum."],
        "What did they take?",
        "They took many pictures.",
        ["They took a bus station.", "They took a suitcase home.", "They took the hotel to dinner."],
      ),
    ],
  },
  {
    number: 58,
    title: "Lesson 58: Animals in the Past",
    vocab: [
      v("bird", "an animal with wings and feathers", "The ____ flew over the trees.", ["fish", "lion", "river"]),
      v("fish", "an animal that lives in water", "The ____ swam in the river.", ["dog", "tree", "fossil"]),
      v("lion", "a large wild cat", "The ____ hunted at night.", ["turtle", "whale", "sky"]),
      v("dog", "a common pet that barks", "The ____ ran in the park.", ["bird", "ocean", "scientist"]),
      v("cat", "a common pet that meows", "The ____ slept on the sofa.", ["horse", "reserve", "fossil"]),
      v("forest", "a large area with many trees", "Many animals lived in the ____.", ["ocean", "sky", "ticket"]),
      v("river", "a natural flow of water", "The fish swam in the ____.", ["museum", "guide", "weekend"]),
      v("ocean", "the large sea", "The whale swam in the ____.", ["tree", "station", "map"]),
      v("fossil", "the remains of a very old plant or animal in stone", "Scientists studied the ____.", ["zoo", "picture", "trip"]),
      v("scientist", "a person who studies the natural world", "The ____ found new fossils last year.", ["lion", "cat", "restaurant"]),
    ],
    grammar: [
      g("The bird ___ over the trees.", "flew", ["flew", "fly", "flied", "flies"], "The bird flew over the trees.", c("The bird flied over the trees.", "The bird flew over the trees.", ["The bird flew over the trees.", "The bird flied over the trees.", "The bird fly over the trees yesterday.", "The bird flies over the trees yesterday."])),
      g("The fish ___ in the river.", "swam", ["swam", "swim", "swimed", "swims"], "The fish swam in the river.", c("The fish swimed in the river.", "The fish swam in the river.", ["The fish swam in the river.", "The fish swimed in the river.", "The fish swim in the river yesterday.", "The fish swims in the river yesterday."])),
      g("Scientists ___ the fossils.", "studied", ["studied", "study", "studies", "studying"], "Scientists studied the fossils.", c("Scientists studyed the fossils.", "Scientists studied the fossils.", ["Scientists studied the fossils.", "Scientists studyed the fossils.", "Scientists study the fossils yesterday.", "Scientists studies the fossils yesterday."])),
      g("People ___ the animals in the reserve.", "protected", ["protected", "protect", "protects", "protecting"], "People protected the animals in the reserve.", c("People protect the animals in the reserve yesterday.", "People protected the animals in the reserve.", ["People protected the animals in the reserve.", "People protect the animals in the reserve yesterday.", "People protecting the animals in the reserve.", "People protects the animals in the reserve yesterday."])),
      g("God ___ animals.", "created", ["created", "create", "creates", "creating"], "God created animals.", c("God create animals yesterday.", "God created animals.", ["God created animals.", "God create animals yesterday.", "God creates animals yesterday.", "God creating animals yesterday."])),
      g("The dog ___ in the park.", "ran", ["ran", "run", "runned", "runs"], "The dog ran in the park."),
      g("The cat ___ on the sofa.", "slept", ["slept", "sleep", "sleeped", "sleeps"], "The cat slept on the sofa."),
      g("The turtle ___ slowly near the river.", "walked", ["walked", "walk", "walks", "walking"], "The turtle walked slowly near the river."),
      g("The whale ___ in the ocean.", "swam", ["swam", "swim", "swims", "swimed"], "The whale swam in the ocean."),
      g("The horse ___ near the trees.", "lived", ["lived", "live", "lives", "living"], "The horse lived near the trees."),
    ],
    listening: [
      l("The bird flew in the sky.", "What animal do you hear?", "bird", ["dog", "cat", "fish"], "Which action do you hear?", "flew", ["swam", "ran", "slept"]),
      l("The fish swam in the river.", "Where did the fish swim?", "in the river", ["in the forest", "in the sky", "in the park"], "Which animal do you hear?", "fish", ["lion", "dog", "horse"]),
      l("The lion slept at night.", "What animal do you hear?", "lion", ["whale", "turtle", "bird"], "Which action do you hear?", "slept", ["ran", "studied", "protected"]),
      l("God created animals.", "Who created animals?", "God", ["The scientist", "The teacher", "The farmer"], "Which verb do you hear?", "created", ["create", "creates", "creating"]),
      l("Scientists studied fossils.", "What did scientists study?", "fossils", ["maps", "tickets", "souvenirs"], "Which job do you hear?", "scientists", ["travelers", "cashiers", "drivers"]),
    ],
    speakingPrompts: [
      s("What animal did you see yesterday?", "I saw a bird yesterday.", ["I saw a dog yesterday."]),
      s("Where did the fish swim?", "The fish swam in the river.", ["It swam in the river."]),
      s("What did the bird do?", "The bird flew in the sky.", ["It flew in the sky."]),
      s("What did scientists study?", "They studied fossils.", ["Scientists studied fossils."]),
      s("Who protected the animals?", "People protected the animals.", ["People did."]),
    ],
    writing: [
      w("The bird ___ in the sky.", "The bird flew in the sky.", "flew"),
      w("The turtle ___ slowly.", "The turtle walked slowly.", "walked"),
      w("The whale ___ in the ocean.", "The whale swam in the ocean.", "swam"),
      w("People ___ the forest animals.", "People protected the forest animals.", "protected"),
      w("Scientists ___ the fossils.", "Scientists studied the fossils.", "studied"),
    ],
    facts: [
      f(
        "Yesterday, David visited a zoo. He saw lions, birds, turtles, and monkeys. The birds flew over the trees, and the turtles walked slowly. David learned that animals are part of God's creation.",
        "Where did David go yesterday?",
        "He went to a zoo.",
        ["He went to a museum.", "He went to a hotel.", "He went to a restaurant."],
        "What did the birds do?",
        "They flew over the trees.",
        ["They swam in the river.", "They slept on the sofa.", "They studied fossils."],
        "What did David learn?",
        "He learned that animals are part of God's creation.",
        ["He learned that animals live in hotels.", "He learned that birds cannot fly.", "He learned that turtles run fast."],
      ),
      f(
        "At the reserve, the lion slept under a tree, and the fish swam in a clean river. A scientist took notes about both animals.",
        "Where did the lion sleep?",
        "The lion slept under a tree.",
        ["The lion slept in the ocean.", "The lion slept on a sofa.", "The lion slept in a hotel."],
        "Where did the fish swim?",
        "The fish swam in a clean river.",
        ["The fish swam in the sky.", "The fish swam in a museum.", "The fish swam in a park."],
        "What did the scientist do?",
        "The scientist took notes.",
        ["The scientist bought souvenirs.", "The scientist cooked dinner.", "The scientist played soccer."],
      ),
      f(
        "Last month, people protected a forest near the town. They planted trees and helped birds and turtles live there safely.",
        "What did people protect?",
        "They protected a forest near the town.",
        ["They protected a restaurant.", "They protected a bus station.", "They protected a city hotel."],
        "What did they plant?",
        "They planted trees.",
        ["They planted tickets.", "They planted fossils.", "They planted pictures."],
        "Which animals did they help?",
        "They helped birds and turtles.",
        ["They helped lions and whales.", "They helped dogs and cats only.", "They helped buses and cars."],
      ),
      f(
        "The whale lived in the ocean, but one small fish swam near the river mouth. A child saw both animals in a nature video.",
        "Where did the whale live?",
        "The whale lived in the ocean.",
        ["The whale lived in the forest.", "The whale lived in the bathroom.", "The whale lived in a tree."],
        "Where did the small fish swim?",
        "It swam near the river mouth.",
        ["It swam in the sky.", "It swam in a bedroom.", "It swam in a museum."],
        "Who saw both animals?",
        "A child saw both animals.",
        ["A scientist saw both animals.", "A cashier saw both animals.", "A pilot saw both animals."],
      ),
      f(
        "When the class studied creation, the teacher showed pictures of birds, fish, horses, and fossils. The students asked many questions.",
        "What did the teacher show?",
        "The teacher showed pictures of animals and fossils.",
        ["The teacher showed tickets and maps.", "The teacher showed soup and bread.", "The teacher showed desks and windows."],
        "Which animals were in the pictures?",
        "Birds, fish, and horses were in the pictures.",
        ["Only cats and dogs were in the pictures.", "Only whales were in the pictures.", "Only monkeys were in the pictures."],
        "What did the students do?",
        "The students asked many questions.",
        ["The students left early.", "The students bought souvenirs.", "The students cooked dinner."],
      ),
    ],
  },
  {
    number: 59,
    title: "Lesson 59: Past Simple Review",
    vocab: [
      v("home", "the place where a person lives", "She was at ____ yesterday.", ["school", "museum", "restaurant"]),
      v("tired", "needing rest", "They were ____ after the trip.", ["open", "cheap", "long"]),
      v("cleaned", "made something tidy in the past", "He ____ his room before dinner.", ["went", "ate", "saw"]),
      v("went", "past form of go", "We ____ to the park last week.", ["worked", "watched", "helped"]),
      v("did", "past helper or past form of do", "___ you study yesterday?", ["Was", "Were", "Had"]),
      v("didn't", "negative helper for the past", "I ____ watch TV last night.", ["wasn't", "weren't", "was"]),
      v("yesterday", "the day before today", "My mother cooked dinner ____.", ["tomorrow", "next week", "soon"]),
      v("trip", "a visit to another place", "The family enjoyed the weekend ____.", ["forest", "tree", "fossil"]),
      v("bird", "an animal with wings", "The ____ flew over the river.", ["hotel", "ticket", "office"]),
      v("finally", "the last step in a sequence", "____, we came home.", ["First", "Then", "After that"]),
    ],
    grammar: [
      g("She ___ tired after school.", "was", ["was", "were", "is", "be"], "She was tired after school.", c("She were tired after school.", "She was tired after school.", ["She was tired after school.", "She were tired after school.", "She is tired after school yesterday.", "She be tired after school."])),
      g("They ___ at home last night.", "were", ["were", "was", "are", "be"], "They were at home last night.", c("They was at home last night.", "They were at home last night.", ["They were at home last night.", "They was at home last night.", "They are at home last night.", "They be at home last night."])),
      g("He ___ to school yesterday.", "went", ["went", "go", "goed", "gone"], "He went to school yesterday.", c("He goed to school yesterday.", "He went to school yesterday.", ["He went to school yesterday.", "He goed to school yesterday.", "He go to school yesterday.", "He gone to school yesterday."])),
      g("Did you ___ breakfast this morning?", "eat", ["eat", "ate", "eats", "eating"], "Did you eat breakfast this morning?", c("Did you ate breakfast this morning?", "Did you eat breakfast this morning?", ["Did you eat breakfast this morning?", "Did you ate breakfast this morning?", "Were you eat breakfast this morning?", "Do you ate breakfast this morning?"])),
      g("I didn't ___ TV last night.", "watch", ["watch", "watched", "watches", "watching"], "I didn't watch TV last night.", c("I didn't watched TV last night.", "I didn't watch TV last night.", ["I didn't watch TV last night.", "I didn't watched TV last night.", "I wasn't watch TV last night.", "I don't watched TV last night."])),
      g("We ___ our room before lunch.", "cleaned", ["cleaned", "clean", "cleans", "cleaning"], "We cleaned our room before lunch."),
      g("My parents ___ fruit at the market.", "bought", ["bought", "buy", "buyed", "buys"], "My parents bought fruit at the market."),
      g("Where did she ___ on Sunday?", "go", ["go", "went", "goes", "going"], "Where did she go on Sunday?"),
      g("They didn't ___ early from the party.", "leave", ["leave", "left", "leaves", "leaving"], "They didn't leave early from the party."),
      g("Finally, we ___ back home.", "came", ["came", "come", "comed", "comes"], "Finally, we came back home."),
    ],
    listening: [
      l("I was tired yesterday.", "How was the speaker?", "tired", ["happy", "ready", "hungry"], "Which structure do you hear?", "was", ["were", "did", "didn't"]),
      l("She cleaned the kitchen.", "What did she clean?", "the kitchen", ["the bedroom", "the car", "the table"], "Which structure do you hear?", "regular past", ["question", "negative", "future"]),
      l("They went to the park.", "Where did they go?", "to the park", ["to the airport", "to the zoo", "to the office"], "Which verb do you hear?", "went", ["go", "buy", "watch"]),
      l("Did you eat breakfast?", "What kind of sentence is it?", "a question", ["a negative sentence", "a statement", "a list"], "Which base verb do you hear?", "eat", ["ate", "eats", "eating"]),
      l("I didn't buy bread.", "What didn't the speaker buy?", "bread", ["milk", "fruit", "juice"], "Which structure do you hear?", "negative past", ["affirmative past", "present simple", "future"]),
    ],
    speakingPrompts: [
      s("Where were you yesterday?", "I was at home yesterday.", ["I was home yesterday."]),
      s("What did you do last night?", "I studied English last night.", ["I studied last night."]),
      s("Did you eat breakfast?", "Yes, I did.", ["Yes I did.", "I did."]),
      s("What didn't you do yesterday?", "I didn't watch TV yesterday.", ["I didn't watch TV."]),
      s("Tell me two things you did last week.", "I worked and visited my grandparents.", ["I worked and visited my family."]),
    ],
    writing: [
      w("Did you went? -> Did you ___?", "Did you go?", "go"),
      w("I didn't watched TV. -> I didn't ___ TV.", "I didn't watch TV.", "watch"),
      w("She were tired. -> She ___ tired.", "She was tired.", "was"),
      w("They was at home. -> They ___ at home.", "They were at home.", "were"),
      w("He buyed bread. -> He ___ bread.", "He bought bread.", "bought"),
    ],
    facts: [
      f(
        "Last Saturday, Emma was very busy. She cleaned her room, studied English, went to the supermarket, and bought fruit. In the evening, she didn't watch TV because she was tired.",
        "Was Emma busy last Saturday?",
        "Yes, she was very busy.",
        ["No, she wasn't busy.", "No, she was at the zoo.", "Yes, she was on a trip abroad."],
        "Where did Emma go?",
        "She went to the supermarket.",
        ["She went to the airport.", "She went to the farm.", "She went to the river."],
        "Why didn't Emma watch TV?",
        "Because she was tired.",
        ["Because the TV was new.", "Because she watched a movie.", "Because she left the house."],
      ),
      f(
        "Yesterday, Leo was at home in the morning, but in the afternoon he visited his grandmother and helped her cook lunch.",
        "Where was Leo in the morning?",
        "He was at home.",
        ["He was at school.", "He was at church.", "He was at the market."],
        "Who did Leo visit in the afternoon?",
        "He visited his grandmother.",
        ["He visited his teacher.", "He visited his uncle.", "He visited his coach."],
        "What did he help her do?",
        "He helped her cook lunch.",
        ["He helped her buy shoes.", "He helped her watch TV.", "He helped her paint the house."],
      ),
      f(
        "On Sunday, Marta went to the park with her friends. They ate sandwiches, took pictures, and came home before dark.",
        "Where did Marta go on Sunday?",
        "She went to the park.",
        ["She went to the museum.", "She went to the office.", "She went to the station."],
        "What did they eat?",
        "They ate sandwiches.",
        ["They ate pizza.", "They ate soup.", "They ate fruit only."],
        "When did they come home?",
        "They came home before dark.",
        ["They came home after midnight.", "They came home next week.", "They came home in 2020."],
      ),
      f(
        "The bird flew over the river while the children watched it. Later, they told their parents about the animal.",
        "What flew over the river?",
        "A bird flew over the river.",
        ["A dog flew over the river.", "A whale flew over the river.", "A turtle flew over the river."],
        "Who watched the bird?",
        "The children watched it.",
        ["The scientists watched it.", "The driver watched it.", "The cashier watched it."],
        "What did they do later?",
        "They told their parents about the animal.",
        ["They bought tickets later.", "They ate breakfast later.", "They cleaned the river later."],
      ),
      f(
        "First, we packed our bags. Then, we left home. After that, we traveled to a small city. Finally, we stayed at a hotel.",
        "What did we do first?",
        "We packed our bags first.",
        ["We left home first.", "We stayed at a hotel first.", "We traveled to the city first."],
        "What happened after that?",
        "We traveled to a small city.",
        ["We watched TV.", "We cleaned the kitchen.", "We studied fossils."],
        "Where did we stay finally?",
        "We stayed at a hotel.",
        ["We stayed at a school.", "We stayed at a museum.", "We stayed at a river."],
      ),
    ],
  },
  {
    number: 60,
    title: "Lesson 60: Conversation in the Past",
    vocab: [
      v("How was your weekend?", "a question to ask about the weekend", "____? It was great.", ["What did you do?", "Did you eat?", "Where did you go?"]),
      v("It was great.", "a positive answer about the past", "How was your weekend? ____.", ["I didn't study.", "Did you enjoy it?", "Where did you go?"]),
      v("What did you do?", "a question about past actions", "After 'How was your weekend?', you can ask, '____'", ["It was fine.", "No, I didn't.", "At my grandmother's house."]),
      v("Where did you go?", "a question about past places", "To ask about a past place, say '____'", ["What happened?", "That sounds great.", "I went with my family."]),
      v("Who did you go with?", "a question about company in the past", "You can answer '____' after this question.", ["I went with my cousins.", "It was expensive.", "No, they weren't."]),
      v("Did you enjoy it?", "a question about a past experience", "After a trip story, ask '____'", ["What color was it?", "Where is your school?", "Do you like pizza?"]),
      v("That sounds great.", "a friendly reaction to good news", "Your friend visited family. You can say, '____'", ["Did you call me?", "I didn't eat dinner.", "Who was tired?"]),
      v("Really?", "a short response showing surprise or interest", "Your friend says, 'I saw a whale.' You can answer, '____'", ["I watched TV.", "Last month.", "At the airport."]),
      v("What happened?", "a question to ask for more details", "Your friend says, 'My weekend was strange.' Ask, '____'", ["I was hungry.", "See you tomorrow.", "She bought fruit."]),
      v("I visited my family.", "a complete answer about a past event", "What did you do last weekend? ____.", ["Did you enjoy it?", "How was your weekend?", "Where did they go?"]),
    ],
    grammar: [
      g("How ___ your weekend?", "was", ["was", "were", "did", "is"], "How was your weekend?", c("How were your weekend?", "How was your weekend?", ["How was your weekend?", "How were your weekend?", "How did your weekend?", "How is your weekend yesterday?"])),
      g("What ___ you do last weekend?", "did", ["did", "was", "were", "do"], "What did you do last weekend?", c("What did you did last weekend?", "What did you do last weekend?", ["What did you do last weekend?", "What did you did last weekend?", "What were you do last weekend?", "What do you did last weekend?"])),
      g("I ___ my grandparents.", "visited", ["visited", "visit", "visits", "visiting"], "I visited my grandparents.", c("I visit my grandparents yesterday.", "I visited my grandparents.", ["I visited my grandparents.", "I visit my grandparents yesterday.", "I visits my grandparents yesterday.", "I visiting my grandparents yesterday."])),
      g("Did you ___ anywhere?", "go", ["go", "went", "goes", "going"], "Did you go anywhere?", c("Did you went anywhere?", "Did you go anywhere?", ["Did you go anywhere?", "Did you went anywhere?", "Were you go anywhere?", "Do you went anywhere?"])),
      g("No, I ___ study much.", "didn't", ["didn't", "wasn't", "weren't", "don't"], "No, I didn't study much.", c("No, I didn't studied much.", "No, I didn't study much.", ["No, I didn't study much.", "No, I didn't studied much.", "No, I wasn't study much.", "No, I don't studied much."])),
      g("Yes, I ___ the trip.", "enjoyed", ["enjoyed", "enjoy", "enjoys", "enjoying"], "Yes, I enjoyed the trip."),
      g("Where did she ___ on Sunday?", "go", ["go", "went", "goes", "going"], "Where did she go on Sunday?"),
      g("He ___ to the park with his friends.", "went", ["went", "go", "goed", "gone"], "He went to the park with his friends."),
      g("They ___ lunch and watched an old movie.", "cooked", ["cooked", "cook", "cooks", "cooking"], "They cooked lunch and watched an old movie."),
      g("It ___ great because we talked a lot.", "was", ["was", "were", "did", "is"], "It was great because we talked a lot."),
    ],
    listening: [
      l("How was your weekend?", "What question do you hear?", "How was your weekend?", ["What did you buy?", "Where were you?", "Did you eat breakfast?"], "Which topic do you hear?", "the weekend", ["a color", "a classroom", "a future plan"]),
      l("It was great.", "How was it?", "great", ["bad", "slow", "late"], "Which structure do you hear?", "was", ["were", "did", "didn't"]),
      l("What did you do yesterday?", "What kind of question is it?", "a wh-question", ["a negative sentence", "a short answer", "a command"], "Which helping word do you hear?", "did", ["was", "were", "didn't"]),
      l("I visited my family.", "What did the speaker do?", "visited family", ["watched TV", "studied math", "bought shoes"], "Which verb do you hear?", "visited", ["visit", "visits", "visiting"]),
      l("Did you enjoy it?", "What question do you hear?", "Did you enjoy it?", ["How old are you?", "Where is the bus?", "What color is it?"], "Which kind of answer can follow?", "Yes, I did.", ["No, he was.", "Yes, they were.", "No, she wasn't."]),
    ],
    speakingPrompts: [
      s("How was your weekend?", "It was great.", ["It was good.", "My weekend was great."]),
      s("What did you do yesterday?", "I visited my family.", ["I visited my grandparents."]),
      s("Where did you go last week?", "I went to the park.", ["I went to the museum."]),
      s("Did you watch a movie?", "Yes, I did.", ["Yes I did.", "I did."]),
      s("What didn't you do?", "I didn't study much.", ["I didn't study."]),
    ],
    writing: [
      w("A: How ___ your weekend?", "How was your weekend?", "was"),
      w("B: It ___ great.", "It was great.", "was"),
      w("A: What ___ you do?", "What did you do?", "did"),
      w("B: I ___ my grandparents.", "I visited my grandparents.", "visited"),
      w("B: I didn't ___ much.", "I didn't study much.", "study"),
    ],
    facts: [
      f(
        "Anna: How was your weekend? Lucas: It was great. I visited my grandparents. Anna: Nice! What did you do there? Lucas: We cooked lunch, talked a lot, and watched an old movie. Anna: Did you study English? Lucas: No, I didn't. But I read a short story on Sunday night.",
        "How was Lucas's weekend?",
        "His weekend was great.",
        ["His weekend was terrible.", "His weekend was short.", "His weekend was empty."],
        "What did Lucas do with his grandparents?",
        "He cooked lunch, talked a lot, and watched an old movie.",
        ["He cleaned the airport and slept.", "He bought tickets and left early.", "He studied fossils and swam."],
        "Did Lucas study English?",
        "No, he didn't study English.",
        ["Yes, he studied English all day.", "No, he didn't visit his grandparents.", "Yes, he taught English at home."],
      ),
      f(
        "Marta asked her friend, 'Where did you go yesterday?' Her friend answered, 'I went to the park with my cousins, and we ate sandwiches there.'",
        "Where did Marta's friend go?",
        "The friend went to the park.",
        ["The friend went to the zoo.", "The friend went to school.", "The friend went to a hotel."],
        "Who went with the friend?",
        "The friend went with cousins.",
        ["The friend went with teachers.", "The friend went with doctors.", "The friend went with cashiers."],
        "What did they eat there?",
        "They ate sandwiches there.",
        ["They ate fish there.", "They ate soup there.", "They ate fruit there."],
      ),
      f(
        "On Monday, Ben said, 'My weekend was quiet. I stayed at home, helped my mother, and didn't go anywhere.'",
        "How was Ben's weekend?",
        "His weekend was quiet.",
        ["His weekend was noisy.", "His weekend was expensive.", "His weekend was dangerous."],
        "What did Ben do at home?",
        "He helped his mother.",
        ["He studied fossils.", "He packed a suitcase.", "He drove a bus."],
        "Did Ben go anywhere?",
        "No, he didn't go anywhere.",
        ["Yes, he went to the beach.", "Yes, he went to school.", "No, he didn't stay at home."],
      ),
      f(
        "After church, Julia and Leo talked about last week. Julia went to a museum, and Leo visited his uncle's farm.",
        "When did Julia and Leo talk?",
        "They talked after church.",
        ["They talked before breakfast.", "They talked at midnight.", "They talked next year."],
        "Where did Julia go last week?",
        "She went to a museum.",
        ["She went to a hotel.", "She went to an airport.", "She went to a restaurant."],
        "Where did Leo go?",
        "He visited his uncle's farm.",
        ["He visited his teacher's office.", "He visited a bus station.", "He visited a zoo restaurant."],
      ),
      f(
        "In class, the teacher asked, 'What happened on your trip?' Sofia answered, 'First, we took the bus. Then, we visited a park. Finally, we came home tired but happy.'",
        "What did Sofia do first on the trip?",
        "First, she took the bus.",
        ["First, she cooked lunch.", "First, she bought a whale.", "First, she studied fossils."],
        "What did Sofia visit next?",
        "She visited a park next.",
        ["She visited a zoo next.", "She visited a classroom next.", "She visited an office next."],
        "How did Sofia come home?",
        "She came home tired but happy.",
        ["She came home angry and late.", "She came home by airplane and hungry.", "She came home on Monday morning only."],
      ),
    ],
  },
];

export const workbook5Lessons = workbook5Configs.map(buildWorkbook5Lesson);
