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

function buildWorkbook6Lesson(config: LessonConfig): Lesson {
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

const workbook6Configs: LessonConfig[] = [
  {
    number: 61,
    title: "Lesson 61: God's Creation",
    vocab: [
      v("creation", "everything that has been made by God", "God's ____ is full of life and beauty.", ["forecast", "journey", "project"]),
      v("creator", "the one who makes something", "The ____ is praised in the final paragraph.", ["visitor", "keeper", "farmer"]),
      v("reserve", "a protected place for animals or plants", "Many animals are cared for in a wildlife ____.", ["aisle", "office", "ticket"]),
      v("habitat", "the natural place where an animal lives", "A jaguar needs a safe ____ to survive.", ["schedule", "feeder", "helmet"]),
      v("species", "a group of animals or plants of the same kind", "This ____ is protected by local scientists.", ["storm", "shampoo", "cage"]),
      v("keeper", "a person who cares for animals", "The ____ feeds the parrots every morning.", ["pilot", "dentist", "cashier"]),
      v("enclosure", "a special area where an animal is kept", "The turtles are safe inside the ____.", ["riverbank", "attic", "basement"]),
      v("fossil", "the remains of an ancient plant or animal in stone", "A dinosaur ____ is displayed in the museum.", ["souvenir", "basket", "ladder"]),
      v("poaching", "illegal hunting of wild animals", "Rangers work hard to stop ____ in the forest.", ["pollination", "migration", "recycling"]),
      v("preserve", "to keep something safe from harm", "People must ____ nature for the future.", ["compare", "ignore", "delay"]),
    ],
    grammar: [
      g("God ___ the world with wisdom.", "creates", ["creates", "create", "is created", "are created"], "God creates the world with wisdom.", c("God create the world with wisdom.", "God creates the world with wisdom.", ["God creates the world with wisdom.", "God create the world with wisdom.", "God is create the world with wisdom.", "God are creating the world with wisdom."])),
      g("The world ___ by God.", "is created", ["is created", "creates", "is create", "are created"], "The world is created by God.", c("The world is create by God.", "The world is created by God.", ["The world is created by God.", "The world is create by God.", "The world are created by God.", "The world creates by God."])),
      g("People ___ nature in many countries.", "protect", ["protect", "protects", "are protected", "is protect"], "People protect nature in many countries.", c("People protects nature in many countries.", "People protect nature in many countries.", ["People protect nature in many countries.", "People protects nature in many countries.", "People are protect nature in many countries.", "People is protected nature in many countries."])),
      g("Nature ___ by many volunteers.", "is protected", ["is protected", "protects", "are protected", "is protect"], "Nature is protected by many volunteers.", c("Nature is protect by many volunteers.", "Nature is protected by many volunteers.", ["Nature is protected by many volunteers.", "Nature is protect by many volunteers.", "Nature are protected by many volunteers.", "Nature protects by many volunteers."])),
      g("Plants ___ by farmers in this region.", "are grown", ["are grown", "grow", "is grown", "are grow"], "Plants are grown by farmers in this region.", c("Plants are grow by farmers in this region.", "Plants are grown by farmers in this region.", ["Plants are grown by farmers in this region.", "Plants are grow by farmers in this region.", "Plants is grown by farmers in this region.", "Plants grow by farmers in this region."])),
      g("Birds ___ in large aviaries.", "are kept", ["are kept", "keep", "is kept", "are keep"], "Birds are kept in large aviaries."),
      g("Scientists ___ rare fossils every year.", "study", ["study", "studies", "are studied", "is studied"], "Scientists study rare fossils every year."),
      g("Rare fossils ___ in museums.", "are displayed", ["are displayed", "display", "is displayed", "are display"], "Rare fossils are displayed in museums."),
      g("Keepers ___ the sea turtles on a strict schedule.", "feed", ["feed", "feeds", "are fed", "is fed"], "Keepers feed the sea turtles on a strict schedule."),
      g("Sea turtles ___ carefully before release.", "are raised", ["are raised", "raise", "is raised", "are raise"], "Sea turtles are raised carefully before release."),
    ],
    listening: [
      l("God creates the world with wisdom.", "Who creates the world?", "God", ["scientists", "keepers", "farmers"], "Which voice do you hear?", "active voice", ["passive voice", "future", "past simple"]),
      l("The world is created by God.", "What is created by God?", "the world", ["the museum", "the classroom", "the market"], "Which voice do you hear?", "passive voice", ["active voice", "future", "question"]),
      l("Nature is protected by volunteers.", "Who protects nature?", "volunteers", ["tourists", "drivers", "cashiers"], "Which structure do you hear?", "is protected", ["protect", "was protected", "has protected"]),
      l("Plants are grown by farmers.", "What is grown by farmers?", "plants", ["fossils", "tickets", "suitcases"], "Is the noun singular or plural?", "plural", ["singular", "uncountable", "a question word"]),
      l("Birds are kept in large aviaries.", "Where are the birds kept?", "in large aviaries", ["in busy offices", "on the highway", "under the bridge"], "Which passive verb do you hear?", "are kept", ["are keeping", "keep", "have kept"]),
    ],
    speakingPrompts: [
      s("Say one active sentence about creation.", "People protect nature.", ["Scientists study nature."]),
      s("Say one passive sentence about conservation.", "Nature is protected by people.", ["Animals are protected by rangers."]),
      s("Who feeds the birds in the reserve?", "The keepers feed the birds.", ["Keepers feed the birds."]),
      s("How are fossils shown to visitors?", "Fossils are displayed in museums.", ["They are displayed in museums."]),
      s("Why should people preserve creation?", "People should preserve creation because it is valuable.", ["Because it is valuable."]),
    ],
    writing: [
      w("God _____ the world with wisdom.", "God creates the world with wisdom.", "creates"),
      w("The world _____ by God.", "The world is created by God.", "is created"),
      w("Nature _____ by volunteers.", "Nature is protected by volunteers.", "is protected"),
      w("Plants _____ by farmers.", "Plants are grown by farmers.", "are grown"),
      w("Fossils _____ in museums.", "Fossils are displayed in museums.", "are displayed"),
    ],
    facts: [
      f(
        "In the beginning, God created the heavens and the earth. Today, many animals are cared for in reserves, where they are studied by experts and protected from danger.",
        "Who created the heavens and the earth?",
        "God created the heavens and the earth.",
        ["Scientists created them.", "Volunteers created them.", "Farmers created them."],
        "Where are many animals cared for today?",
        "They are cared for in reserves.",
        ["They are cared for in offices.", "They are cared for in supermarkets.", "They are cared for in classrooms."],
        "Why are the animals protected there?",
        "They are protected from danger there.",
        ["They are protected from homework there.", "They are protected from tickets there.", "They are protected from music there."],
      ),
      f(
        "When visitors walk through a zoo, they see birds kept in aviaries, reptiles displayed in special enclosures, and sea turtles raised carefully before release.",
        "What do visitors see in aviaries?",
        "They see birds kept in aviaries.",
        ["They see fish kept in aviaries.", "They see fossils kept in aviaries.", "They see buses kept in aviaries."],
        "How are reptiles shown to visitors?",
        "They are displayed in special enclosures.",
        ["They are hidden in kitchens.", "They are sold in offices.", "They are left on trails."],
        "What happens to sea turtles before release?",
        "They are raised carefully before release.",
        ["They are ignored before release.", "They are painted before release.", "They are compared before release."],
      ),
      f(
        "Some forests are cut down, rivers are polluted, and animals are hunted illegally. Yet new conservation programs are developed every year by dedicated teams.",
        "What happens to some forests?",
        "They are cut down.",
        ["They are fed every day.", "They are built by drivers.", "They are sold in museums."],
        "What happens to some rivers?",
        "They are polluted.",
        ["They are cleaned by poaching.", "They are painted by tourists.", "They are compared by birds."],
        "What is developed every year?",
        "New conservation programs are developed every year.",
        ["New highways are developed every year.", "New classrooms are developed every year.", "New tickets are developed every year."],
      ),
      f(
        "Fossils of extinct animals are displayed in museums. Through them, people are reminded of species that once lived on the earth.",
        "Where are fossils displayed?",
        "They are displayed in museums.",
        ["They are displayed in airports.", "They are displayed in pet stores.", "They are displayed in bedrooms."],
        "What do fossils remind people of?",
        "They remind people of extinct species.",
        ["They remind people of new phones.", "They remind people of fresh bread.", "They remind people of train tickets."],
        "Were those species alive in the past?",
        "Yes, they once lived on the earth.",
        ["No, they were never alive.", "No, they were only painted.", "No, they were only planned."],
      ),
      f(
        "A faithful keeper feeds the birds on time, and the birds are observed by scientists every day. In both cases, human care is shown clearly.",
        "Who feeds the birds on time?",
        "A faithful keeper feeds the birds on time.",
        ["A cashier feeds the birds on time.", "A dentist feeds the birds on time.", "A pilot feeds the birds on time."],
        "Who observes the birds every day?",
        "Scientists observe the birds every day.",
        ["Tourists observe the birds every year.", "Drivers observe the birds every hour.", "Children observe the birds every month."],
        "What is shown clearly in both cases?",
        "Human care is shown clearly in both cases.",
        ["Human confusion is shown clearly in both cases.", "Human speed is shown clearly in both cases.", "Human shopping is shown clearly in both cases."],
      ),
    ],
  },
  {
    number: 62,
    title: "Lesson 62: A Trip to the Amazon",
    vocab: [
      v("canopy", "the top layer of branches in a forest", "There are birds singing high in the forest ____.", ["ticket line", "bus station", "street market"]),
      v("rainforest", "a hot, wet forest with many plants and animals", "There is a deep river in the ____.", ["museum hall", "airport gate", "office tower"]),
      v("stream", "a small natural flow of water", "There is a small ____ near the hidden trail.", ["balcony", "freezer", "garage"]),
      v("orchid", "a tropical flower", "There are bright ____ beside the riverbank.", ["tickets", "helmets", "pillows"]),
      v("jaguar", "a large wild cat from the Americas", "There is a silent ____ in the shadows.", ["parrot", "ranger", "sailor"]),
      v("trail", "a path through the forest", "There isn't much noise on the narrow ____.", ["sofa", "feeder", "receipt"]),
      v("butterfly", "an insect with colorful wings", "There are many ____ near the flowers.", ["suitcases", "collars", "buckets"]),
      v("fungi", "organisms such as mushrooms and molds", "There are glowing ____ on the wet trees at night.", ["posters", "toys", "brushes"]),
      v("hammock", "a hanging bed made of cloth or rope", "There is a comfortable ____ by the camp.", ["aquarium", "staircase", "cash register"]),
      v("stillness", "a quiet and calm condition", "There is a special kind of ____ beneath the canopy.", ["argument", "traffic", "engine"]),
    ],
    grammar: [
      g("There ___ a river in the forest.", "is", ["is", "are", "was", "be"], "There is a river in the forest.", c("There are a river in the forest.", "There is a river in the forest.", ["There is a river in the forest.", "There are a river in the forest.", "There be a river in the forest.", "There was a river in the forest."])),
      g("There ___ many animals in the Amazon.", "are", ["are", "is", "was", "be"], "There are many animals in the Amazon.", c("There is many animals in the Amazon.", "There are many animals in the Amazon.", ["There are many animals in the Amazon.", "There is many animals in the Amazon.", "There be many animals in the Amazon.", "There was many animals in the Amazon."])),
      g("There ___ much noise in the morning.", "isn't", ["isn't", "aren't", "doesn't", "weren't"], "There isn't much noise in the morning.", c("There aren't much noise in the morning.", "There isn't much noise in the morning.", ["There isn't much noise in the morning.", "There aren't much noise in the morning.", "There doesn't much noise in the morning.", "There weren't much noise in the morning."])),
      g("___ there birds in the trees?", "Are", ["Are", "Is", "Do", "Does"], "Are there birds in the trees?", c("Is there birds in the trees?", "Are there birds in the trees?", ["Are there birds in the trees?", "Is there birds in the trees?", "Do there birds in the trees?", "Does there birds in the trees?"])),
      g("There ___ a hidden trail near the camp.", "is", ["is", "are", "were", "be"], "There is a hidden trail near the camp.", c("There are a hidden trail near the camp.", "There is a hidden trail near the camp.", ["There is a hidden trail near the camp.", "There are a hidden trail near the camp.", "There be a hidden trail near the camp.", "There were a hidden trail near the camp."])),
      g("There ___ orchids beside the stream.", "are", ["are", "is", "was", "be"], "There are orchids beside the stream."),
      g("There ___ a jaguar in the story.", "is", ["is", "are", "were", "be"], "There is a jaguar in the story."),
      g("There ___ many cars inside the rainforest.", "aren't", ["aren't", "isn't", "don't", "wasn't"], "There aren't many cars inside the rainforest."),
      g("___ there a hammock near the camp?", "Is", ["Is", "Are", "Do", "Did"], "Is there a hammock near the camp?"),
      g("There ___ tiny streams under the canopy.", "are", ["are", "is", "was", "be"], "There are tiny streams under the canopy."),
    ],
    listening: [
      l("There is a river near the camp.", "What is near the camp?", "a river", ["a zoo", "a ticket office", "a classroom"], "Which structure do you hear?", "there is", ["there are", "there isn't", "are there"]),
      l("There are many birds in the trees.", "What is in the trees?", "many birds", ["one jaguar", "a bus", "a suitcase"], "Is the noun singular or plural?", "plural", ["singular", "uncountable", "a question word"]),
      l("There isn't much noise in the morning.", "Is there much noise in the morning?", "No, there isn't much noise.", ["Yes, there is loud music.", "Yes, there are buses.", "No, there are flowers."], "Which negative form do you hear?", "there isn't", ["there aren't", "there wasn't", "there don't"]),
      l("Are there butterflies near the flowers?", "What animal do you hear?", "butterflies", ["turtles", "whales", "lions"], "What kind of sentence is it?", "a question", ["a command", "a negative sentence", "a future plan"]),
      l("There are glowing fungi on the trees at night.", "What glows on the trees?", "fungi", ["pillows", "tickets", "posters"], "When does it happen?", "at night", ["at noon", "next year", "on Monday"]),
    ],
    speakingPrompts: [
      s("Describe one thing in the Amazon with there is.", "There is a river in the forest.", ["There is a hidden trail in the forest."]),
      s("Describe many things in the Amazon with there are.", "There are many birds in the trees.", ["There are bright flowers by the river."]),
      s("Ask about animals in the trees.", "Are there birds in the trees?", ["Are there monkeys in the trees?"]),
      s("Say one negative sentence about noise.", "There isn't much noise in the morning.", ["There isn't much noise under the canopy."]),
      s("Describe the camp area.", "There is a hammock near the camp.", ["There is a small stream near the camp."]),
    ],
    writing: [
      w("There _____ a river in the forest.", "There is a river in the forest.", "is"),
      w("There _____ many animals in the Amazon.", "There are many animals in the Amazon.", "are"),
      w("There _____ much noise in the morning.", "There isn't much noise in the morning.", "isn't"),
      w("_____ there birds in the trees?", "Are there birds in the trees?", "Are"),
      w("There _____ glowing fungi on the trees.", "There are glowing fungi on the trees.", "are"),
    ],
    facts: [
      f(
        "Laura enters the Amazon and feels a deep calm around her. There is a special stillness under the canopy, and there are distant bird calls in the air.",
        "What is under the canopy?",
        "There is a special stillness under the canopy.",
        ["There is a busy highway under the canopy.", "There is a supermarket under the canopy.", "There is a train station under the canopy."],
        "What can be heard in the air?",
        "There are distant bird calls in the air.",
        ["There are loud car horns in the air.", "There are phone alarms in the air.", "There are classroom bells in the air."],
        "How does Laura feel at first?",
        "She feels a deep calm at first.",
        ["She feels late at first.", "She feels hungry for bread at first.", "She feels angry at first."],
      ),
      f(
        "Farther into the forest, there are towering trees, tiny streams, and bright butterflies. There is also a hidden trail that leads to a quiet riverbank.",
        "What tall things are in the forest?",
        "There are towering trees in the forest.",
        ["There are tall buildings in the forest.", "There are towers and buses in the forest.", "There are ladders in the forest."],
        "What small water features are there?",
        "There are tiny streams there.",
        ["There are toy boats there.", "There are kitchen sinks there.", "There are swimming pools there."],
        "What leads to the riverbank?",
        "A hidden trail leads to the riverbank.",
        ["A crowded bus leads to the riverbank.", "An airport gate leads to the riverbank.", "A classroom door leads to the riverbank."],
      ),
      f(
        "At night, there are glowing fungi on the tree trunks and many fireflies above the grass. There is a hammock by the camp where Laura rests.",
        "What glows on the tree trunks?",
        "Glowing fungi glow on the tree trunks.",
        ["Glowing phones glow on the tree trunks.", "Glowing tickets glow on the tree trunks.", "Glowing toys glow on the tree trunks."],
        "What else can be seen above the grass?",
        "Many fireflies can be seen above the grass.",
        ["Many airplanes can be seen above the grass.", "Many helmets can be seen above the grass.", "Many ovens can be seen above the grass."],
        "Where does Laura rest?",
        "She rests in a hammock by the camp.",
        ["She rests in a taxi by the camp.", "She rests in a shop by the camp.", "She rests in a freezer by the camp."],
      ),
      f(
        "Near the water, there are orchids and medicinal plants. There is also a jaguar hidden in the shadows, although Laura sees it only for a moment.",
        "What plants are near the water?",
        "There are orchids and medicinal plants near the water.",
        ["There are carrots and onions near the water.", "There are notebooks and pens near the water.", "There are beds and pillows near the water."],
        "What animal is hidden in the shadows?",
        "A jaguar is hidden in the shadows.",
        ["A dolphin is hidden in the shadows.", "A horse is hidden in the shadows.", "A dog is hidden in the shadows."],
        "Does Laura see the animal for a long time?",
        "No, she sees it only for a moment.",
        ["Yes, she sees it all day.", "Yes, she feeds it at lunch.", "No, she sees it next year."],
      ),
      f(
        "The Amazon feels like a living library. There are stories in every stream, flower, and animal, and there is beauty in every detail.",
        "What does the Amazon feel like?",
        "It feels like a living library.",
        ["It feels like a crowded airport.", "It feels like a noisy mall.", "It feels like a small office."],
        "Where are the stories found?",
        "They are found in every stream, flower, and animal.",
        ["They are found in every ticket and suitcase.", "They are found in every bus and road.", "They are found in every classroom and desk."],
        "What is in every detail?",
        "There is beauty in every detail.",
        ["There is traffic in every detail.", "There is homework in every detail.", "There is weather in every detail."],
      ),
    ],
  },
  {
    number: 63,
    title: "Lesson 63: Visit to the Pet Store",
    vocab: [
      v("adopt", "to take an animal home and care for it", "They are going to ____ a cat next month.", ["pollinate", "compare", "display"]),
      v("treat", "a small special food for a pet", "I will buy a tasty ____ for the dog.", ["fossil", "helmet", "map"]),
      v("shampoo", "soap for washing hair or fur", "She is going to buy pet ____ today.", ["reef", "ticket", "bridge"]),
      v("feeder", "a container or device that gives food", "The store sells an automatic ____ for cats.", ["ladder", "canoe", "bicycle"]),
      v("scratching post", "an item a cat scratches instead of furniture", "The cat is going to use the new ____.", ["stream", "shell", "binoculars"]),
      v("leash", "a strap used to control a dog while walking", "I will buy a strong ____ for the puppy.", ["aviary", "canopy", "coral"]),
      v("collar", "a band placed around an animal's neck", "The blue ____ is going to fit the dog well.", ["ticket", "ladder", "fungi"]),
      v("bowl", "a deep round dish for food or water", "She is going to buy a bigger water ____.", ["branch", "engine", "blanket"]),
      v("toy", "something used for play", "The bird will enjoy a colorful ____.", ["receipt", "button", "storm"]),
      v("aisle", "a space between rows of products", "We are going to walk through the pet food ____.", ["reef", "mountain", "fossil"]),
    ],
    grammar: [
      g("I ___ buy food for my dog.", "will", ["will", "am", "are", "do"], "I will buy food for my dog.", c("I am buy food for my dog.", "I will buy food for my dog.", ["I will buy food for my dog.", "I am buy food for my dog.", "I going to buy food for my dog.", "I will buying food for my dog."])),
      g("She ___ visit the pet store tomorrow.", "is going to", ["is going to", "will to", "goes to", "has to"], "She is going to visit the pet store tomorrow.", c("She will to visit the pet store tomorrow.", "She is going to visit the pet store tomorrow.", ["She is going to visit the pet store tomorrow.", "She will to visit the pet store tomorrow.", "She going to visit the pet store tomorrow.", "She is go to visit the pet store tomorrow."])),
      g("They ___ adopt a cat next month.", "are going to", ["are going to", "will to", "is going to", "do"], "They are going to adopt a cat next month.", c("They is going to adopt a cat next month.", "They are going to adopt a cat next month.", ["They are going to adopt a cat next month.", "They is going to adopt a cat next month.", "They will to adopt a cat next month.", "They are adopt a cat next month."])),
      g("___ you buy a toy for the bird?", "Will", ["Will", "Are", "Do", "Did"], "Will you buy a toy for the bird?", c("Are you buy a toy for the bird?", "Will you buy a toy for the bird?", ["Will you buy a toy for the bird?", "Are you buy a toy for the bird?", "Do you buy a toy for the bird tomorrow?", "Did you buy a toy for the bird tomorrow?"])),
      g("___ you going to take care of the rabbit?", "Are", ["Are", "Will", "Is", "Do"], "Are you going to take care of the rabbit?", c("Will you going to take care of the rabbit?", "Are you going to take care of the rabbit?", ["Are you going to take care of the rabbit?", "Will you going to take care of the rabbit?", "Do you going to take care of the rabbit?", "Is you going to take care of the rabbit?"])),
      g("I think this toy ___ help the puppy.", "will", ["will", "is going to", "are going to", "do"], "I think this toy will help the puppy."),
      g("We ___ buy shampoo this afternoon.", "are going to", ["are going to", "will to", "is going to", "did"], "We are going to buy shampoo this afternoon."),
      g("He ___ not buy the scratching post today.", "will", ["will", "is", "does", "has"], "He will not buy the scratching post today.", ["will not", "won't"]),
      g("The family ___ going to adopt a dog this year.", "isn't", ["isn't", "aren't", "won't", "doesn't"], "The family isn't going to adopt a dog this year."),
      g("The cat ___ probably hide the treat.", "will", ["will", "is going to", "are", "do"], "The cat will probably hide the treat."),
    ],
    listening: [
      l("I will buy food for my dog.", "What will the speaker buy?", "food for the dog", ["a fossil", "a train ticket", "a new chair"], "Which future form do you hear?", "will", ["going to", "did", "has"]),
      l("She is going to visit the pet store.", "Where is she going to visit?", "the pet store", ["the museum", "the airport", "the river"], "Which future form do you hear?", "going to", ["will", "present perfect", "past simple"]),
      l("They are going to adopt a cat.", "What are they going to do?", "adopt a cat", ["clean the office", "study fossils", "pollinate flowers"], "Is it a plan or a quick decision?", "a plan", ["a past event", "a command", "a comparison"]),
      l("Will you buy a toy for the bird?", "What is being asked about?", "buying a toy", ["feeding a jaguar", "building a museum", "closing a road"], "What kind of sentence is it?", "a question", ["a negative sentence", "a reading title", "a glossary item"]),
      l("We aren't going to adopt a dog this year.", "What are they not going to do?", "adopt a dog this year", ["visit the Amazon", "study birds", "buy a bowl"], "Which negative form do you hear?", "aren't going to", ["won't", "didn't", "hasn't"]),
    ],
    speakingPrompts: [
      s("Say one plan with going to.", "I am going to visit the pet store tomorrow.", ["I am going to buy cat food tomorrow."]),
      s("Say one quick decision with will.", "I will buy this toy for the bird.", ["I will buy this bowl."]),
      s("Ask a future question with will.", "Will you buy a treat for the dog?", ["Will you buy a toy?"]),
      s("Ask a future question with going to.", "Are you going to adopt a cat?", ["Are you going to visit the pet store?"]),
      s("Say one future negative sentence.", "We aren't going to adopt a dog this year.", ["I won't buy the scratching post today."]),
    ],
    writing: [
      w("I _____ buy food for my dog.", "I will buy food for my dog.", "will"),
      w("She _____ visit the pet store tomorrow.", "She is going to visit the pet store tomorrow.", "is going to"),
      w("They _____ adopt a cat next month.", "They are going to adopt a cat next month.", "are going to"),
      w("Will you _____ a toy for the bird?", "Will you buy a toy for the bird?", "buy"),
      w("The family isn't _____ to adopt a dog this year.", "The family isn't going to adopt a dog this year.", "going"),
    ],
    facts: [
      f(
        "Laura is going to visit the pet store with her mother. She is going to buy shampoo and treats for her two cats, and she says she will choose different toys for each one.",
        "Who is Laura going to visit the pet store with?",
        "She is going with her mother.",
        ["She is going with her teacher.", "She is going with her dentist.", "She is going with her driver."],
        "What is she going to buy for the cats?",
        "She is going to buy shampoo and treats for the cats.",
        ["She is going to buy fossils and maps for the cats.", "She is going to buy helmets and shoes for the cats.", "She is going to buy cages and rivers for the cats."],
        "What will she choose for each cat?",
        "She will choose different toys for each cat.",
        ["She will choose one river for each cat.", "She will choose one classroom for each cat.", "She will choose one ticket for each cat."],
      ),
      f(
        "At the store, Laura plans to buy one shampoo, but then she sees another brand on sale and says she will take that one instead.",
        "What does Laura plan to buy first?",
        "She plans to buy one shampoo first.",
        ["She plans to buy one fossil first.", "She plans to buy one parrot first.", "She plans to buy one river first."],
        "Why does she change her mind?",
        "She changes her mind because another brand is on sale.",
        ["She changes her mind because the store is closed.", "She changes her mind because the cat is asleep.", "She changes her mind because the bowl is broken."],
        "What does she decide to do?",
        "She decides that she will take the other brand instead.",
        ["She decides that she will leave the store immediately.", "She decides that she will adopt three dogs.", "She decides that she will return next year."],
      ),
      f(
        "The family is going to buy a new bowl because the old one is too small. If the cat keeps eating too quickly, Laura says she will get a slow feeder.",
        "Why are they going to buy a new bowl?",
        "They are going to buy a new bowl because the old one is too small.",
        ["They are going to buy a new bowl because the old one is too heavy.", "They are going to buy a new bowl because the old one is in a museum.", "They are going to buy a new bowl because the old one is blue."],
        "What might Laura buy next?",
        "She might buy a slow feeder next.",
        ["She might buy a bus next.", "She might buy a ladder next.", "She might buy a cactus next."],
        "Why will she buy the feeder?",
        "She will buy it if the cat keeps eating too quickly.",
        ["She will buy it if the forest is noisy.", "She will buy it if the jaguar is hungry.", "She will buy it if the bird is flying."],
      ),
      f(
        "In the accessory aisle, there are collars, leashes, soft beds, and automatic feeders. Laura says one day they are going to adopt a dog, but not this year.",
        "What items are in the accessory aisle?",
        "There are collars, leashes, soft beds, and automatic feeders there.",
        ["There are fossils, ladders, and rocks there.", "There are rivers, trees, and orchids there.", "There are buses, trains, and planes there."],
        "What are they going to adopt one day?",
        "They are going to adopt a dog one day.",
        ["They are going to adopt a whale one day.", "They are going to adopt a forest one day.", "They are going to adopt a museum one day."],
        "Will they do it this year?",
        "No, they will not do it this year.",
        ["Yes, they will do it this year.", "Yes, they are doing it yesterday.", "No, they did it last year."],
      ),
      f(
        "Back at home, Laura predicts that one cat will hide the treat and the other will eat it immediately. Her mother smiles because the plan has worked well.",
        "What does Laura predict about the first cat?",
        "She predicts that the first cat will hide the treat.",
        ["She predicts that the first cat will fly away.", "She predicts that the first cat will build a bridge.", "She predicts that the first cat will study fossils."],
        "What will the other cat do?",
        "The other cat will eat the treat immediately.",
        ["The other cat will plant orchids.", "The other cat will display fossils.", "The other cat will drive a bus."],
        "How does the mother feel?",
        "She feels pleased because the plan has worked well.",
        ["She feels angry because the store is closed.", "She feels worried because the river is loud.", "She feels confused because the trail is hidden."],
      ),
    ],
  },
  {
    number: 64,
    title: "Lesson 64: Endangered Species",
    vocab: [
      v("endangered", "at risk of disappearing forever", "The blue macaw is an ____ species.", ["average", "plastic", "hidden"]),
      v("rare", "not common", "This animal is very ____ in the wild.", ["cheap", "wide", "busy"]),
      v("vulnerable", "easily harmed or attacked", "Young turtles are especially ____ after they hatch.", ["silent", "broken", "closed"]),
      v("population", "all the members of a species in one place", "The jaguar ____ is getting smaller.", ["ticket", "weather", "aisle"]),
      v("habitat loss", "the destruction of the place where an animal lives", "____ is a serious problem for many species.", ["Pet shampoo", "Train travel", "Office work"]),
      v("predator", "an animal that hunts other animals", "The jaguar is a strong ____.", ["tourist", "keeper", "student"]),
      v("macaw", "a large colorful parrot", "The blue ____ is one of the most beautiful birds in Brazil.", ["whale", "frog", "bee"]),
      v("tamarin", "a small monkey from South America", "The golden lion ____ is smaller than many monkeys.", ["reserve", "fossil", "ocean"]),
      v("tapir", "a large South American mammal with a short trunk", "The ____ is heavier than a capybara.", ["ticket", "postcard", "hammock"]),
      v("trafficking", "the illegal buying and selling of something", "Illegal animal ____ harms many birds.", ["recycling", "swimming", "planning"]),
    ],
    grammar: [
      g("The tiger is ___ than the turtle.", "faster", ["faster", "fastest", "more fast", "fast"], "The tiger is faster than the turtle.", c("The tiger is more faster than the turtle.", "The tiger is faster than the turtle.", ["The tiger is faster than the turtle.", "The tiger is more faster than the turtle.", "The tiger is fastest than the turtle.", "The tiger is fast than the turtle."])),
      g("Whales are ___ than dolphins.", "larger", ["larger", "largest", "more large", "large"], "Whales are larger than dolphins.", c("Whales are more larger than dolphins.", "Whales are larger than dolphins.", ["Whales are larger than dolphins.", "Whales are more larger than dolphins.", "Whales are largest than dolphins.", "Whales are large than dolphins."])),
      g("This animal is ___ dangerous than that one.", "more", ["more", "most", "much", "many"], "This animal is more dangerous than that one.", c("This animal is most dangerous than that one.", "This animal is more dangerous than that one.", ["This animal is more dangerous than that one.", "This animal is most dangerous than that one.", "This animal is many dangerous than that one.", "This animal is much dangerous than that one."])),
      g("The blue whale is the ___ animal.", "largest", ["largest", "larger", "most large", "big"], "The blue whale is the largest animal.", c("The blue whale is the larger animal.", "The blue whale is the largest animal.", ["The blue whale is the largest animal.", "The blue whale is the larger animal.", "The blue whale is the most large animal.", "The blue whale is the big animal."])),
      g("This is the ___ endangered species here.", "most", ["most", "more", "much", "many"], "This is the most endangered species here.", c("This is the more endangered species here.", "This is the most endangered species here.", ["This is the most endangered species here.", "This is the more endangered species here.", "This is the much endangered species here.", "This is the many endangered species here."])),
      g("The golden lion tamarin is ___ than most monkeys.", "smaller", ["smaller", "smallest", "more small", "small"], "The golden lion tamarin is smaller than most monkeys."),
      g("The tapir is ___ than a capybara.", "heavier", ["heavier", "heaviest", "more heavy", "heavy"], "The tapir is heavier than a capybara."),
      g("The blue macaw is one of the ___ birds in Brazil.", "most beautiful", ["most beautiful", "more beautiful", "beautifullest", "beautiful"], "The blue macaw is one of the most beautiful birds in Brazil."),
      g("The jaguar is ___ social than the lion.", "less", ["less", "least", "fewer", "little"], "The jaguar is less social than the lion."),
      g("Bad habitat loss creates an even ___ situation.", "worse", ["worse", "worst", "badder", "more bad"], "Bad habitat loss creates an even worse situation."),
    ],
    listening: [
      l("The tiger is faster than the turtle.", "Which animal is faster?", "the tiger", ["the turtle", "the whale", "the macaw"], "Which comparative adjective do you hear?", "faster", ["fastest", "more fast", "fast"]),
      l("Whales are larger than dolphins.", "Which animal is larger?", "whales", ["dolphins", "turtles", "bees"], "Which comparative adjective do you hear?", "larger", ["largest", "more large", "large"]),
      l("The blue whale is the largest animal.", "Which animal is the largest?", "the blue whale", ["the jaguar", "the tapir", "the macaw"], "Do you hear a comparative or a superlative?", "a superlative", ["a comparative", "a question", "a negative sentence"]),
      l("This is the most endangered species here.", "How is the species described?", "the most endangered", ["the least noisy", "the more beautiful", "the smaller"], "Which word do you hear before endangered?", "most", ["more", "much", "many"]),
      l("The jaguar is less social than the lion.", "Which animal is less social?", "the jaguar", ["the lion", "the dolphin", "the turtle"], "Which comparison word do you hear?", "less", ["more", "most", "better"]),
    ],
    speakingPrompts: [
      s("Make one comparative sentence about two animals.", "The tiger is faster than the turtle.", ["The whale is larger than the dolphin."]),
      s("Make one superlative sentence about a sea animal.", "The blue whale is the largest animal.", ["The sailfish is the fastest swimmer."]),
      s("Compare the jaguar and the lion.", "The jaguar is less social than the lion.", ["The jaguar is more silent than the lion."]),
      s("Describe one very rare species.", "The blue macaw is one of the most beautiful birds in Brazil.", ["The golden lion tamarin is one of the rarest monkeys here."]),
      s("Say one sentence with worse or best.", "Habitat loss creates a worse situation for many animals.", ["The reserve offers the best protection here."]),
    ],
    writing: [
      w("The tiger is _____ than the turtle.", "The tiger is faster than the turtle.", "faster"),
      w("Whales are _____ than dolphins.", "Whales are larger than dolphins.", "larger"),
      w("This animal is _____ dangerous than that one.", "This animal is more dangerous than that one.", "more"),
      w("The blue whale is the _____ animal.", "The blue whale is the largest animal.", "largest"),
      w("This is the _____ endangered species here.", "This is the most endangered species here.", "most"),
    ],
    facts: [
      f(
        "The jaguar is the largest wild cat in the Americas. Although the African lion is larger, the jaguar is more elusive and less social than the lion.",
        "Which cat is larger overall, the jaguar or the lion?",
        "The lion is larger overall.",
        ["The jaguar is larger overall.", "They are exactly the same size.", "The turtle is larger overall."],
        "How is the jaguar compared with the lion socially?",
        "The jaguar is less social than the lion.",
        ["The jaguar is more social than the lion.", "The jaguar is the most social animal.", "The jaguar is as social as a bee."],
        "How is the jaguar described in behavior?",
        "It is more elusive than the lion.",
        ["It is more colorful than the lion.", "It is older than the lion by centuries.", "It is slower than the turtle."],
      ),
      f(
        "The golden lion tamarin is smaller than most monkeys, but it is more colorful and more active during the day than many other primates.",
        "How is the tamarin compared with most monkeys in size?",
        "It is smaller than most monkeys.",
        ["It is larger than most monkeys.", "It is heavier than a whale.", "It is the biggest monkey in the world."],
        "How is the tamarin compared in color?",
        "It is more colorful than many other primates.",
        ["It is less colorful than a rock.", "It is the least colorful animal in Brazil.", "It is not colorful at all."],
        "When is it more active?",
        "It is more active during the day.",
        ["It is more active at midnight only.", "It is more active in winter than in summer only.", "It is active only in museums."],
      ),
      f(
        "The giant armadillo is larger than other armadillos and more nocturnal, so it is harder to study in the wild.",
        "How is the giant armadillo compared with other armadillos in size?",
        "It is larger than other armadillos.",
        ["It is smaller than other armadillos.", "It is lighter than butterflies.", "It is the smallest animal there."],
        "How is it compared in activity time?",
        "It is more nocturnal than other armadillos.",
        ["It is more diurnal than a bee.", "It is less active than a chair.", "It is the most colorful animal there."],
        "Why is it harder to study?",
        "It is harder to study because it is more nocturnal.",
        ["It is harder to study because it lives in a pet store.", "It is harder to study because it sings loudly.", "It is harder to study because it is faster than light."],
      ),
      f(
        "The blue macaw is brighter than most parrots and one of the most beautiful birds in South America, but it is rarer than many people imagine.",
        "How is the blue macaw compared in brightness?",
        "It is brighter than most parrots.",
        ["It is darker than most parrots.", "It is the least bright bird in Brazil.", "It is the most silent parrot in the ocean."],
        "How is it compared in beauty?",
        "It is one of the most beautiful birds in South America.",
        ["It is one of the least beautiful birds there.", "It is more dangerous than all birds.", "It is heavier than all whales."],
        "How common is it really?",
        "It is rarer than many people imagine.",
        ["It is more common than flies in summer.", "It is the most common animal in every city.", "It is common only in offices."],
      ),
      f(
        "The tapir is heavier than the capybara and more important for forest regeneration than many people realize, because it spreads seeds through the forest.",
        "Which animal is heavier, the tapir or the capybara?",
        "The tapir is heavier.",
        ["The capybara is heavier.", "They weigh exactly the same.", "The butterfly is heavier."],
        "Why is the tapir important?",
        "It is important because it spreads seeds through the forest.",
        ["It is important because it sells tickets.", "It is important because it paints enclosures.", "It is important because it drives buses."],
        "How do many people understand this role?",
        "Many people do not realize it as much as they should.",
        ["Many people understand it better than every scientist.", "Many people ignore all forests forever.", "Many people think the tapir is a fish."],
      ),
    ],
  },
  {
    number: 65,
    title: "Lesson 65: Insects and Arachnids",
    vocab: [
      v("antenna", "a long thin part on an insect's head", "The butterfly uses its ____ to feel the air.", ["shell", "feather", "fin"]),
      v("sting", "to hurt with a sharp part of the body", "Some bees can ____ when they feel danger.", ["graze", "float", "migrate"]),
      v("web", "a thin net made by a spider", "The spider can build a strong ____ in the corner.", ["reef", "cage", "ladder"]),
      v("hive", "the home of bees", "The bees return to the ____ at sunset.", ["pond", "basket", "helmet"]),
      v("swarm", "a large moving group of insects", "A ____ of bees moved above the flowers.", ["chain", "ticket", "blanket"]),
      v("crawl", "to move close to the ground", "Ants can ____ across the branch in a line.", ["sing", "shine", "boil"]),
      v("bite", "to cut with the teeth or mouth", "Some spiders can ____ if they feel trapped.", ["float", "balance", "paint"]),
      v("harmless", "not dangerous", "Most house spiders are ____ to people.", ["ancient", "frozen", "metal"]),
      v("poisonous", "containing poison that can cause harm", "Teachers explain that some insects are ____.", ["wooden", "silent", "cashless"]),
      v("cocoon", "a soft case around a young insect", "The caterpillar rests inside a ____.", ["receipt", "freezer", "canoe"]),
    ],
    grammar: [
      g("You ___ touch a strange spider with your hands.", "must not", ["must not", "must", "can", "should"], "You must not touch a strange spider with your hands.", c("You must touch a strange spider with your hands.", "You must not touch a strange spider with your hands.", ["You must not touch a strange spider with your hands.", "You must touch a strange spider with your hands.", "You can touching a strange spider with your hands.", "You should not touching a strange spider with your hands."])),
      g("Students ___ stay calm near the hive.", "must", ["must", "must not", "can", "could"], "Students must stay calm near the hive.", c("Students must to stay calm near the hive.", "Students must stay calm near the hive.", ["Students must stay calm near the hive.", "Students must to stay calm near the hive.", "Students can stays calm near the hive.", "Students must not staying calm near the hive."])),
      g("A spider ___ build a web very quickly.", "can", ["can", "must", "must not", "is"], "A spider can build a web very quickly.", c("A spider must build a web very quickly.", "A spider can build a web very quickly.", ["A spider can build a web very quickly.", "A spider must build a web very quickly.", "A spider can builds a web very quickly.", "A spider is build a web very quickly."])),
      g("We ___ leave food open near ants.", "must not", ["must not", "must", "can", "do"], "We must not leave food open near ants.", c("We can not leave food open near ants.", "We must not leave food open near ants.", ["We must not leave food open near ants.", "We can not leave food open near ants.", "We must not leaving food open near ants.", "We do not must leave food open near ants."])),
      g("Visitors ___ read the safety sign before entering.", "must", ["must", "can", "must not", "are"], "Visitors must read the safety sign before entering.", c("Visitors are read the safety sign before entering.", "Visitors must read the safety sign before entering.", ["Visitors must read the safety sign before entering.", "Visitors are read the safety sign before entering.", "Visitors can reads the safety sign before entering.", "Visitors must not readed the safety sign before entering."])),
      g("This beetle ___ fly, but it crawls fast.", "can't", ["can't", "mustn't", "doesn't", "isn't"], "This beetle can't fly, but it crawls fast.", ["can't", "cannot"]),
      g("You ___ wear gloves when you clean the old hive box.", "must", ["must", "must not", "can", "were"], "You must wear gloves when you clean the old hive box."),
      g("Children ___ throw stones at insects.", "must not", ["must not", "must", "can", "did"], "Children must not throw stones at insects."),
      g("Some butterflies ___ travel long distances.", "can", ["can", "must", "must not", "are"], "Some butterflies can travel long distances."),
      g("We ___ be careful with poisonous species.", "must", ["must", "must not", "can", "have"], "We must be careful with poisonous species."),
    ],
    listening: [
      l("You must not touch a strange spider with your hands.", "What must you not touch?", "a strange spider", ["a safe flower", "a wooden table", "a clean window"], "Do you hear permission or prohibition?", "prohibition", ["permission", "a comparison", "a past event"]),
      l("Students must stay calm near the hive.", "Where must students stay calm?", "near the hive", ["near the river", "near the airport", "near the freezer"], "Which modal do you hear?", "must", ["can", "must not", "did"]),
      l("A spider can build a web very quickly.", "What can the spider build?", "a web", ["a bridge", "a suitcase", "a cereal box"], "Does the sentence show ability or obligation?", "ability", ["obligation", "a request", "a memory"]),
      l("We must not leave food open near ants.", "What must we not leave open?", "food", ["books", "helmets", "shoes"], "Which negative modal do you hear?", "must not", ["cannot", "did not", "is not"]),
      l("This beetle can't fly, but it crawls fast.", "What can't the beetle do?", "fly", ["swim", "sting", "sleep"], "What can it do instead?", "crawl fast", ["sing loudly", "grow flowers", "hide eggs"]),
    ],
    speakingPrompts: [
      s("Say one rule with must.", "Visitors must read the safety sign before entering.", ["Students must stay calm near the hive."]),
      s("Say one prohibition with must not.", "Children must not throw stones at insects.", ["You must not touch a strange spider."]),
      s("Say one sentence with can about insects.", "Some butterflies can travel long distances.", ["A spider can build a web quickly."]),
      s("Give one safety instruction.", "We must be careful with poisonous species.", ["You must wear gloves near the hive."]),
      s("Describe one harmless animal.", "Most house spiders are harmless to people.", ["This small spider is harmless."]),
    ],
    writing: [
      w("You _____ touch a strange spider with your hands.", "You must not touch a strange spider with your hands.", "must not"),
      w("Students _____ stay calm near the hive.", "Students must stay calm near the hive.", "must"),
      w("A spider _____ build a web very quickly.", "A spider can build a web very quickly.", "can"),
      w("We _____ leave food open near ants.", "We must not leave food open near ants.", "must not"),
      w("This beetle _____ fly, but it crawls fast.", "This beetle can't fly, but it crawls fast.", "can't", ["can't", "cannot"]),
    ],
    facts: [
      f(
        "Bees play an essential role in nature because they pollinate many plants. Beekeepers must protect the hive, and visitors must not make loud movements near the bees.",
        "Why are bees essential in nature?",
        "They are essential because they pollinate many plants.",
        ["They are essential because they build roads.", "They are essential because they freeze food.", "They are essential because they drive buses."],
        "What must beekeepers do?",
        "They must protect the hive.",
        ["They must paint the ocean.", "They must close the school.", "They must train dolphins."],
        "What must visitors not do near the bees?",
        "They must not make loud movements.",
        ["They must not read books.", "They must not wear shoes.", "They must not visit museums."],
      ),
      f(
        "Spiders can help gardens because they eat many insects. Most garden spiders are harmless, but people must still avoid touching unknown species.",
        "How can spiders help gardens?",
        "They can help by eating many insects.",
        ["They can help by writing reports.", "They can help by carrying water bottles.", "They can help by opening stores."],
        "Are most garden spiders dangerous?",
        "No, most garden spiders are harmless.",
        ["Yes, all garden spiders are extremely dangerous.", "No, most garden spiders are made of metal.", "Yes, they are larger than elephants."],
        "What must people avoid doing?",
        "They must avoid touching unknown species.",
        ["They must avoid planting flowers.", "They must avoid washing their hands.", "They must avoid reading the sign."],
      ),
      f(
        "Ants live and work in organized groups. They can carry food together, and they must protect the nest when danger appears.",
        "How do ants carry food?",
        "They can carry food together.",
        ["They can carry food only at night by boat.", "They can carry food only with human help.", "They can carry food only in winter storms."],
        "What must ants protect?",
        "They must protect the nest.",
        ["They must protect a television.", "They must protect a train station.", "They must protect a shoe store."],
        "When do they protect it?",
        "They protect it when danger appears.",
        ["They protect it when the class ends.", "They protect it when the freezer melts.", "They protect it when the ticket is lost."],
      ),
      f(
        "Butterflies begin life as caterpillars and later rest inside a cocoon or chrysalis. Some species can travel surprising distances during migration.",
        "What do butterflies begin life as?",
        "They begin life as caterpillars.",
        ["They begin life as feathers.", "They begin life as shells.", "They begin life as flowers."],
        "Where do they rest later?",
        "They rest inside a cocoon or chrysalis.",
        ["They rest inside a drawer or suitcase.", "They rest inside a bottle or glass.", "They rest inside a tunnel or airport."],
        "What can some species do during migration?",
        "They can travel surprising distances.",
        ["They can build coral reefs.", "They can teach grammar lessons.", "They can freeze lakes."],
      ),
      f(
        "Scientists teach children that some insects are poisonous and some are not. Students must listen carefully, and they must not collect wild insects without permission.",
        "What difference do scientists teach?",
        "They teach that some insects are poisonous and some are not.",
        ["They teach that all insects are birds.", "They teach that no insects have legs.", "They teach that insects live only in the sea."],
        "How must students listen?",
        "They must listen carefully.",
        ["They must listen angrily.", "They must listen yesterday.", "They must listen with a ladder."],
        "What must students not do without permission?",
        "They must not collect wild insects.",
        ["They must not eat cereal.", "They must not buy shampoo.", "They must not visit the library."],
      ),
    ],
  },
  {
    number: 66,
    title: "Lesson 66: Reptiles and Amphibians",
    vocab: [
      v("scale", "a small hard plate covering a reptile's skin", "A snake has dry ____ on its body.", ["leaf", "wing", "pocket"]),
      v("moist", "slightly wet", "A frog's skin must stay ____.", ["sharp", "dusty", "crowded"]),
      v("venom", "poison injected by biting or stinging", "Some snakes use ____ to catch prey.", ["harmony", "steam", "traffic"]),
      v("camouflage", "colors or patterns that help an animal hide", "The lizard uses ____ to hide on the rock.", ["receipt", "blanket", "ladder"]),
      v("habitat", "the natural home of an animal", "A clean pond is a good ____ for frogs.", ["mirror", "ticket", "engine"]),
      v("tadpole", "the young form of a frog", "A ____ lives in the water before it becomes a frog.", ["parrot", "jaguar", "macaw"]),
      v("shelter", "a safe place to stay", "Turtles may look for ____ under plants.", ["aisle", "coupon", "fossil"]),
      v("burrow", "a hole in the ground used as a home", "Some reptiles rest in a ____ during hot days.", ["receipt", "hive", "ocean"]),
      v("predator", "an animal that hunts other animals", "A large snake can be a strong ____.", ["keeper", "cashier", "customer"]),
      v("wetland", "an area of land covered with water", "Amphibians often live near a ____.", ["mountain road", "bookcase", "stadium"]),
    ],
    grammar: [
      g("A turtle ___ live for many years.", "can", ["can", "could", "may", "should"], "A turtle can live for many years.", c("A turtle should live for many years.", "A turtle can live for many years.", ["A turtle can live for many years.", "A turtle should live for many years.", "A turtle may lives for many years.", "A turtle could living for many years."])),
      g("When she was young, Laura ___ not tell frogs from toads.", "could", ["could", "can", "may", "should"], "When she was young, Laura could not tell frogs from toads.", c("When she was young, Laura can not tell frogs from toads.", "When she was young, Laura could not tell frogs from toads.", ["When she was young, Laura could not tell frogs from toads.", "When she was young, Laura can not tell frogs from toads.", "When she was young, Laura should not tell frogs from toads.", "When she was young, Laura may not told frogs from toads."])),
      g("This snake ___ be dangerous, so keep your distance.", "may", ["may", "can", "should", "must"], "This snake may be dangerous, so keep your distance.", c("This snake can be dangerous, so keep your distance.", "This snake may be dangerous, so keep your distance.", ["This snake may be dangerous, so keep your distance.", "This snake can be dangerous, so keep your distance.", "This snake should be danger, so keep your distance.", "This snake may is dangerous, so keep your distance."])),
      g("You ___ wash your hands after touching the terrarium.", "should", ["should", "might", "can", "could"], "You should wash your hands after touching the terrarium.", c("You can wash your hands after touching the terrarium.", "You should wash your hands after touching the terrarium.", ["You should wash your hands after touching the terrarium.", "You can wash your hands after touching the terrarium.", "You should washing your hands after touching the terrarium.", "You might wash your hands after touching the terrarium."])),
      g("The frog ___ hide under that wet leaf, but I am not sure.", "might", ["might", "can", "could", "should"], "The frog might hide under that wet leaf, but I am not sure.", c("The frog can hide under that wet leaf, but I am not sure.", "The frog might hide under that wet leaf, but I am not sure.", ["The frog might hide under that wet leaf, but I am not sure.", "The frog can hide under that wet leaf, but I am not sure.", "The frog might hides under that wet leaf, but I am not sure.", "The frog should hide under that wet leaf, but I am not sure."])),
      g("Young tadpoles ___ swim as soon as they hatch.", "can", ["can", "could", "may", "should"], "Young tadpoles can swim as soon as they hatch."),
      g("My grandfather ___ catch lizards with his hands when he was a child.", "could", ["could", "can", "may", "should"], "My grandfather could catch lizards with his hands when he was a child."),
      g("Some reptiles ___ stay still for hours to save energy.", "can", ["can", "might", "should", "did"], "Some reptiles can stay still for hours to save energy."),
      g("That bright frog ___ be poisonous.", "might", ["might", "could", "should", "are"], "That bright frog might be poisonous."),
      g("Visitors ___ keep the wetland clean for the animals.", "should", ["should", "can", "may", "could"], "Visitors should keep the wetland clean for the animals."),
    ],
    listening: [
      l("A turtle can live for many years.", "What can a turtle do for many years?", "live", ["hide", "sting", "freeze"], "Which modal shows ability?", "can", ["could", "might", "should"]),
      l("When she was young, Laura could not tell frogs from toads.", "What could Laura not tell?", "frogs from toads", ["turtles from snakes", "bees from flowers", "cats from dogs"], "Does could refer to the present or the past?", "the past", ["the present", "the future", "a command"]),
      l("This snake may be dangerous, so keep your distance.", "What may be dangerous?", "this snake", ["this pond", "this desk", "this cereal"], "Which modal shows possibility?", "may", ["can", "should", "must not"]),
      l("You should wash your hands after touching the terrarium.", "What should you wash?", "your hands", ["your shoes", "your backpack", "your notebook"], "Does should express advice or past ability?", "advice", ["past ability", "certainty", "comparison"]),
      l("The frog might hide under that wet leaf.", "Where might the frog hide?", "under the wet leaf", ["under the bus", "inside the freezer", "over the bridge"], "Which word shows uncertainty?", "might", ["can", "must", "did"]),
    ],
    speakingPrompts: [
      s("Say one sentence with can about a reptile.", "A turtle can live for many years.", ["Some reptiles can stay still for hours."]),
      s("Say one past ability sentence with could.", "My grandfather could catch lizards with his hands when he was a child.", ["Laura could not tell frogs from toads when she was young."]),
      s("Give one careful possibility sentence with may or might.", "That bright frog might be poisonous.", ["This snake may be dangerous."]),
      s("Give one piece of advice with should.", "Visitors should keep the wetland clean for the animals.", ["You should wash your hands after touching the terrarium."]),
      s("Describe one amphibian habitat.", "A clean pond is a good habitat for frogs.", ["Amphibians often live near a wetland."]),
    ],
    writing: [
      w("A turtle _____ live for many years.", "A turtle can live for many years.", "can"),
      w("When she was young, Laura _____ not tell frogs from toads.", "When she was young, Laura could not tell frogs from toads.", "could"),
      w("This snake _____ be dangerous, so keep your distance.", "This snake may be dangerous, so keep your distance.", "may"),
      w("You _____ wash your hands after touching the terrarium.", "You should wash your hands after touching the terrarium.", "should"),
      w("The frog _____ hide under that wet leaf.", "The frog might hide under that wet leaf.", "might"),
    ],
    facts: [
      f(
        "Reptiles usually have dry scales, while amphibians have moist skin. Frogs should stay near water, but many snakes can live in much drier places.",
        "What do reptiles usually have on their bodies?",
        "They usually have dry scales.",
        ["They usually have wet feathers.", "They usually have soft fur.", "They usually have thick shells only."],
        "Where should frogs stay?",
        "They should stay near water.",
        ["They should stay on high buildings.", "They should stay inside cereal boxes.", "They should stay in dry deserts only."],
        "What can many snakes do?",
        "They can live in much drier places.",
        ["They can pollinate flowers.", "They can build spider webs.", "They can sing loudly at night."],
      ),
      f(
        "A tadpole looks very different from an adult frog. At first it can only swim, and later it grows legs and may leave the water for short periods.",
        "What can a tadpole do at first?",
        "It can only swim at first.",
        ["It can only fly at first.", "It can only climb trees at first.", "It can only build nests at first."],
        "What does it grow later?",
        "It grows legs later.",
        ["It grows feathers later.", "It grows scales later.", "It grows horns later."],
        "What may it do after that?",
        "It may leave the water for short periods.",
        ["It may move to the moon.", "It may freeze the pond.", "It may become a spider."],
      ),
      f(
        "Some lizards use camouflage so well that people may not see them at all. They can stay still on a rock for a long time and wait for insects.",
        "Why may people not see some lizards?",
        "People may not see them because they use camouflage well.",
        ["People may not see them because they live underwater only.", "People may not see them because they wear bright clothes.", "People may not see them because they hide in supermarkets."],
        "What can the lizards do on a rock?",
        "They can stay still for a long time.",
        ["They can build a hive on a rock.", "They can write recipes on a rock.", "They can sell tickets on a rock."],
        "What do they wait for?",
        "They wait for insects.",
        ["They wait for buses.", "They wait for snow.", "They wait for recipes."],
      ),
      f(
        "Visitors at a reptile house should read the warnings carefully. Some snakes may have venom, and children should not put their hands inside the glass area.",
        "What should visitors read carefully?",
        "They should read the warnings carefully.",
        ["They should read the menu carefully.", "They should read the weather carefully.", "They should read the receipt carefully."],
        "What may some snakes have?",
        "They may have venom.",
        ["They may have wings.", "They may have feathers.", "They may have wool."],
        "What should children not do?",
        "They should not put their hands inside the glass area.",
        ["They should not eat breakfast.", "They should not open the book.", "They should not wear green shirts."],
      ),
      f(
        "Wetlands are important habitats for frogs, turtles, and many birds. People should protect these places because the animals may lose shelter if the water disappears.",
        "What are wetlands for many animals?",
        "They are important habitats for many animals.",
        ["They are small toy stores for many animals.", "They are only parking areas for many animals.", "They are cereal factories for many animals."],
        "What should people do?",
        "They should protect these places.",
        ["They should dry these places completely.", "They should cover these places with concrete.", "They should close these places every morning."],
        "What may animals lose if the water disappears?",
        "They may lose shelter.",
        ["They may lose homework.", "They may lose train tickets.", "They may lose shampoo."],
      ),
    ],
  },
  {
    number: 67,
    title: "Lesson 67: Invertebrates",
    vocab: [
      v("worm", "a long soft animal with no legs", "A ____ helps break down dead leaves in the soil.", ["falcon", "seal", "pony"]),
      v("snail", "a small slow animal with a shell", "The ____ moves slowly across the wet stone.", ["eagle", "camel", "shark"]),
      v("jellyfish", "a soft sea animal with long tentacles", "A ____ can float near the surface of the water.", ["sparrow", "hamster", "cow"]),
      v("octopus", "a sea animal with eight arms", "The ____ hides between rocks in the reef.", ["giraffe", "beetle", "parrot"]),
      v("tentacle", "a long flexible arm on some sea animals", "The jellyfish moves its ____ in the water.", ["beak", "hoof", "fur"]),
      v("shell", "a hard outer covering", "The snail has carried its ____ all day.", ["ladder", "coupon", "aisle"]),
      v("coral", "a hard structure made by tiny sea animals", "Small fish have lived near the ____ for weeks.", ["wallet", "freezer", "highway"]),
      v("reef", "a ridge of coral or rock under the sea", "Divers have visited the ____ many times.", ["ticket", "forest", "shelf"]),
      v("mollusk", "a soft-bodied animal such as a snail or octopus", "A snail is a type of ____.", ["predator", "reptile", "feather"]),
      v("species", "a group of living things of the same kind", "Scientists have studied this ____ for years.", ["recipe", "receipt", "neighborhood"]),
    ],
    grammar: [
      g("I ___ an octopus in the wild before.", "have seen", ["have seen", "saw", "see", "am seeing"], "I have seen an octopus in the wild before.", c("I saw an octopus in the wild before.", "I have seen an octopus in the wild before.", ["I have seen an octopus in the wild before.", "I saw an octopus in the wild before.", "I have saw an octopus in the wild before.", "I am seen an octopus in the wild before."])),
      g("She ___ never ___ a jellyfish up close.", "has", ["has", "have", "did", "is"], "She has never touched a jellyfish up close.", c("She have never touched a jellyfish up close.", "She has never touched a jellyfish up close.", ["She has never touched a jellyfish up close.", "She have never touched a jellyfish up close.", "She did never touch a jellyfish up close.", "She is never touched a jellyfish up close."])),
      g("We ___ a coral reef twice this year.", "have visited", ["have visited", "visited", "visit", "are visiting"], "We have visited a coral reef twice this year.", c("We visited a coral reef twice this year.", "We have visited a coral reef twice this year.", ["We have visited a coral reef twice this year.", "We visited a coral reef twice this year.", "We have visit a coral reef twice this year.", "We are visited a coral reef twice this year."])),
      g("___ you ever ___ a giant snail?", "Have", ["Have", "Did", "Do", "Are"], "Have you ever found a giant snail?", c("Did you ever found a giant snail?", "Have you ever found a giant snail?", ["Have you ever found a giant snail?", "Did you ever found a giant snail?", "Do you ever found a giant snail?", "Are you ever found a giant snail?"])),
      g("My brother ___ not ___ an octopus before.", "has", ["has", "have", "did", "was"], "My brother has not seen an octopus before.", c("My brother have not seen an octopus before.", "My brother has not seen an octopus before.", ["My brother has not seen an octopus before.", "My brother have not seen an octopus before.", "My brother did not seen an octopus before.", "My brother was not seen an octopus before."])),
      g("They ___ collected shells on this beach many times.", "have", ["have", "has", "did", "do"], "They have collected shells on this beach many times."),
      g("The scientist ___ studied that species for years.", "has", ["has", "have", "did", "is"], "The scientist has studied that species for years."),
      g("I ___ never ___ a jellyfish sting.", "have", ["have", "has", "did", "am"], "I have never felt a jellyfish sting."),
      g("Our class ___ learned a lot about mollusks.", "has", ["has", "have", "did", "was"], "Our class has learned a lot about mollusks."),
      g("Laura and Mia ___ already seen an octopus at the aquarium.", "have", ["have", "has", "did", "are"], "Laura and Mia have already seen an octopus at the aquarium."),
    ],
    listening: [
      l("I have seen an octopus in the wild before.", "What has the speaker seen?", "an octopus", ["a jaguar", "a lizard", "a bee hive"], "Which verb form do you hear?", "have seen", ["saw", "see", "will see"]),
      l("She has never touched a jellyfish up close.", "What has she never touched?", "a jellyfish", ["a turtle", "a cocoon", "a cereal box"], "Which word shows no experience?", "never", ["already", "just", "then"]),
      l("We have visited a coral reef twice this year.", "What have they visited?", "a coral reef", ["a pet store", "a mountain", "a supermarket"], "How many times have they visited it?", "twice", ["once", "three times", "many years ago"]),
      l("Have you ever found a giant snail?", "What is the question about?", "finding a giant snail", ["feeding a dog", "washing a bowl", "buying a ticket"], "Which word asks about life experience?", "ever", ["already", "yesterday", "next"]),
      l("My brother has not seen an octopus before.", "Who has not seen an octopus before?", "my brother", ["my mother", "my teacher", "my cousin"], "Is the sentence affirmative or negative?", "negative", ["affirmative", "comparative", "imperative"]),
    ],
    speakingPrompts: [
      s("Say one experience with have seen.", "I have seen an octopus in the wild before.", ["I have seen a coral reef before."]),
      s("Say one sentence with never.", "She has never touched a jellyfish up close.", ["I have never felt a jellyfish sting."]),
      s("Ask one question with ever.", "Have you ever found a giant snail?", ["Have you ever visited a coral reef?"]),
      s("Say one sentence about your class.", "Our class has learned a lot about mollusks.", ["Our class has studied invertebrates this month."]),
      s("Say one negative present perfect sentence.", "My brother has not seen an octopus before.", ["I have not visited that reef before."]),
    ],
    writing: [
      w("I _____ an octopus in the wild before.", "I have seen an octopus in the wild before.", "have seen"),
      w("She _____ never touched a jellyfish up close.", "She has never touched a jellyfish up close.", "has"),
      w("We _____ visited a coral reef twice this year.", "We have visited a coral reef twice this year.", "have"),
      w("_____ you ever found a giant snail?", "Have you ever found a giant snail?", "Have"),
      w("My brother _____ not seen an octopus before.", "My brother has not seen an octopus before.", "has"),
    ],
    facts: [
      f(
        "Invertebrates do not have backbones, but they play important roles in nature. Earthworms have improved soil quality in many gardens because they break down dead material.",
        "What do invertebrates not have?",
        "They do not have backbones.",
        ["They do not have habitats.", "They do not have species.", "They do not have water."],
        "What have earthworms improved in many gardens?",
        "They have improved soil quality.",
        ["They have improved train stations.", "They have improved freezer doors.", "They have improved traffic lights."],
        "How have they done that?",
        "They have done that by breaking down dead material.",
        ["They have done that by buying groceries.", "They have done that by painting houses.", "They have done that by washing dishes."],
      ),
      f(
        "Snails have lived on Earth for millions of years. Many children have found them after rain, but some people have never noticed the delicate patterns on their shells.",
        "How long have snails lived on Earth?",
        "They have lived on Earth for millions of years.",
        ["They have lived on Earth for two weeks.", "They have lived on Earth since breakfast.", "They have lived on Earth for one school day."],
        "When have many children found snails?",
        "They have found them after rain.",
        ["They have found them during snowstorms only.", "They have found them inside cinemas only.", "They have found them on airplanes only."],
        "What have some people never noticed?",
        "They have never noticed the delicate patterns on snail shells.",
        ["They have never noticed the size of a whale.", "They have never noticed the moon in the sky.", "They have never noticed a bus stop."],
      ),
      f(
        "Octopuses have fascinated scientists for years because they solve simple problems and hide quickly. Divers have also reported that some octopuses change color in seconds.",
        "Why have octopuses fascinated scientists?",
        "They have fascinated scientists because they solve simple problems and hide quickly.",
        ["They have fascinated scientists because they sing beautifully.", "They have fascinated scientists because they build roads.", "They have fascinated scientists because they sell tickets."],
        "Who else has reported something about octopuses?",
        "Divers have reported it.",
        ["Teachers have reported it from classrooms only.", "Cashiers have reported it from stores only.", "Drivers have reported it from buses only."],
        "What have some octopuses changed in seconds?",
        "They have changed color in seconds.",
        ["They have changed species in seconds.", "They have changed oceans in seconds.", "They have changed mountains in seconds."],
      ),
      f(
        "Coral reefs look like colorful rocks, but they have been built by tiny animals. These animals have created shelter for many fish and other sea creatures.",
        "What have tiny animals built?",
        "They have built coral reefs.",
        ["They have built supermarkets.", "They have built airports.", "They have built volcanoes."],
        "What do coral reefs look like?",
        "They look like colorful rocks.",
        ["They look like cereal bowls.", "They look like wooden ladders.", "They look like glass bottles."],
        "What have the reefs created for other animals?",
        "They have created shelter for many fish and other sea creatures.",
        ["They have created homework for many fish.", "They have created train tickets for many fish.", "They have created traffic for many fish."],
      ),
      f(
        "Jellyfish have existed for a very long time, even before dinosaurs. People have studied them carefully, but many visitors have never realized how simple their bodies are.",
        "How long have jellyfish existed?",
        "They have existed for a very long time, even before dinosaurs.",
        ["They have existed only since last summer.", "They have existed for one class period.", "They have existed since yesterday afternoon."],
        "How have people studied jellyfish?",
        "People have studied them carefully.",
        ["People have studied them carelessly from buses.", "People have studied them only in deserts.", "People have studied them only in pet stores."],
        "What have many visitors never realized?",
        "They have never realized how simple jellyfish bodies are.",
        ["They have never realized how loud an octopus is.", "They have never realized how a cash register works.", "They have never realized how to bake bread."],
      ),
    ],
  },
  {
    number: 68,
    title: "Lesson 68: Bees and Pollination",
    vocab: [
      v("pollen", "fine yellow powder from flowers", "Bees carry ____ from flower to flower.", ["steam", "gravel", "plastic"]),
      v("nectar", "sweet liquid inside a flower", "The bee collects ____ for the hive.", ["pepper", "cement", "dust"]),
      v("blossom", "a flower on a tree or plant", "The orchard is full of pink ____.", ["engines", "helmets", "bridges"]),
      v("orchard", "a place where fruit trees grow", "Farmers have planted new trees in the ____.", ["stadium", "hallway", "subway"]),
      v("beekeeper", "a person who takes care of bees", "The ____ has just checked the hive.", ["cashier", "pilot", "clerk"]),
      v("harvest", "the time when crops are collected", "The apple ____ has already started.", ["garage", "receipt", "raincoat"]),
      v("flower bed", "an area planted with flowers", "Children have planted herbs near the ____.", ["freezer", "highway", "elevator"]),
      v("seed", "the small part of a plant that can grow", "Pollination helps each plant produce a ____.", ["coupon", "ticket", "mirror"]),
      v("wax", "a soft substance bees use to build", "Bees have made the cells with ____.", ["paper", "stone", "wool"]),
      v("honeycomb", "the wax structure inside a hive", "The beekeeper has cleaned the old ____.", ["aisle", "balcony", "pillow"]),
    ],
    grammar: [
      g("The beekeeper has ___ checked the hive.", "just", ["just", "yet", "ever", "never"], "The beekeeper has just checked the hive.", c("The beekeeper has yet checked the hive.", "The beekeeper has just checked the hive.", ["The beekeeper has just checked the hive.", "The beekeeper has yet checked the hive.", "The beekeeper has ever checked the hive.", "The beekeeper checked just the hive has."])),
      g("We have ___ finished the flower beds.", "already", ["already", "yet", "ever", "never"], "We have already finished the flower beds.", c("We have yet finished the flower beds.", "We have already finished the flower beds.", ["We have already finished the flower beds.", "We have yet finished the flower beds.", "We have ever finished the flower beds.", "We already have finish the flower beds."])),
      g("Have the bees returned to the hive ___?", "yet", ["yet", "already", "just", "ever"], "Have the bees returned to the hive yet?", c("Have the bees already returned to the hive yet?", "Have the bees returned to the hive yet?", ["Have the bees returned to the hive yet?", "Have the bees already returned to the hive yet?", "The bees have returned to the hive yet.", "Have returned the bees to the hive yet?"])),
      g("Has Laura ___ visited a bee farm?", "ever", ["ever", "already", "just", "never"], "Has Laura ever visited a bee farm?", c("Has Laura never visited a bee farm?", "Has Laura ever visited a bee farm?", ["Has Laura ever visited a bee farm?", "Has Laura never visited a bee farm?", "Did Laura ever visited a bee farm?", "Has Laura visit ever a bee farm?"])),
      g("I have ___ seen bees this active before.", "never", ["never", "ever", "already", "just"], "I have never seen bees this active before.", c("I have ever seen bees this active before.", "I have never seen bees this active before.", ["I have never seen bees this active before.", "I have ever seen bees this active before.", "I never have saw bees this active before.", "I have just seen bees this active before."])),
      g("The farmers have ___ begun the apple harvest.", "already", ["already", "yet", "ever", "never"], "The farmers have already begun the apple harvest."),
      g("She has ___ put on the protective suit.", "just", ["just", "yet", "ever", "never"], "She has just put on the protective suit."),
      g("We haven't collected the honey ___", "yet", ["yet", "already", "just", "ever"], "We haven't collected the honey yet."),
      g("Have you ___ planted flowers for bees?", "ever", ["ever", "already", "just", "never"], "Have you ever planted flowers for bees?"),
      g("The children have ___ forgotten the bee rules.", "never", ["never", "ever", "already", "just"], "The children have never forgotten the bee rules."),
    ],
    listening: [
      l("The beekeeper has just checked the hive.", "Who has checked the hive?", "the beekeeper", ["the pilot", "the cashier", "the diver"], "Which word shows a very recent action?", "just", ["yet", "ever", "never"]),
      l("We have already finished the flower beds.", "What have they finished?", "the flower beds", ["the bridge", "the classroom", "the mountain road"], "Which word shows the action is completed?", "already", ["yet", "ever", "never"]),
      l("Have the bees returned to the hive yet?", "What is the question about?", "the bees returning to the hive", ["the bees crossing the ocean", "the bees buying fruit", "the bees building a bus"], "Which word is common in questions about something expected?", "yet", ["already", "just", "never"]),
      l("Has Laura ever visited a bee farm?", "What experience is being asked about?", "visiting a bee farm", ["living in a cave", "buying a freezer", "washing a reptile"], "Which word asks about life experience?", "ever", ["already", "just", "yet"]),
      l("I have never seen bees this active before.", "What has the speaker never seen before?", "bees this active", ["birds this colorful", "cats this quiet", "fish this slow"], "Which word shows no experience before now?", "never", ["just", "already", "yet"]),
    ],
    speakingPrompts: [
      s("Say one sentence with just.", "The beekeeper has just checked the hive.", ["She has just put on the protective suit."]),
      s("Say one sentence with already.", "We have already finished the flower beds.", ["The farmers have already begun the apple harvest."]),
      s("Ask one question with yet.", "Have the bees returned to the hive yet?", ["Have you collected the honey yet?"]),
      s("Ask one experience question with ever.", "Has Laura ever visited a bee farm?", ["Have you ever planted flowers for bees?"]),
      s("Say one sentence with never.", "I have never seen bees this active before.", ["The children have never forgotten the bee rules."]),
    ],
    writing: [
      w("The beekeeper has _____ checked the hive.", "The beekeeper has just checked the hive.", "just"),
      w("We have _____ finished the flower beds.", "We have already finished the flower beds.", "already"),
      w("Have the bees returned to the hive _____?", "Have the bees returned to the hive yet?", "yet"),
      w("Has Laura _____ visited a bee farm?", "Has Laura ever visited a bee farm?", "ever"),
      w("I have _____ seen bees this active before.", "I have never seen bees this active before.", "never"),
    ],
    facts: [
      f(
        "Bees have just left the hive because the morning flowers are open. They have already found nectar in the orchard, and the beekeeper has watched them carefully.",
        "Why have the bees just left the hive?",
        "They have left because the morning flowers are open.",
        ["They have left because the store is closing.", "They have left because the road is frozen.", "They have left because the bus is late."],
        "What have they already found?",
        "They have already found nectar in the orchard.",
        ["They have already found shells in the desert.", "They have already found cereal in the river.", "They have already found ladders in the forest."],
        "Who has watched them carefully?",
        "The beekeeper has watched them carefully.",
        ["The pilot has watched them carefully.", "The dentist has watched them carefully.", "The diver has watched them carefully."],
      ),
      f(
        "The class has just visited a small bee farm. Some students have already tasted fresh honey, but one student has not entered the honey room yet.",
        "Where has the class just visited?",
        "The class has just visited a small bee farm.",
        ["The class has just visited a cinema.", "The class has just visited a reptile cave.", "The class has just visited a supermarket aisle."],
        "What have some students already tasted?",
        "They have already tasted fresh honey.",
        ["They have already tasted wet leaves.", "They have already tasted river stones.", "They have already tasted bus tires."],
        "What has one student not done yet?",
        "One student has not entered the honey room yet.",
        ["One student has not planted a whale yet.", "One student has not climbed the moon yet.", "One student has not painted the ocean yet."],
      ),
      f(
        "Farmers have planted flowers near vegetable fields because bees help crops grow. They have never considered bees unimportant, since pollination supports each harvest.",
        "Why have farmers planted flowers near the fields?",
        "They have planted them because bees help crops grow.",
        ["They have planted them because birds need chairs.", "They have planted them because cars need fuel.", "They have planted them because roads need color."],
        "How have the farmers viewed bees?",
        "They have never considered bees unimportant.",
        ["They have always considered bees dangerous toys.", "They have never seen a bee in their lives.", "They have considered bees to be large reptiles."],
        "What does pollination support?",
        "Pollination supports each harvest.",
        ["Pollination supports each ticket line.", "Pollination supports each elevator ride.", "Pollination supports each traffic jam."],
      ),
      f(
        "Laura has loved watching bees on blossoms ever since childhood, but she has only just learned how pollen moves from flower to flower.",
        "What has Laura loved since childhood?",
        "She has loved watching bees on blossoms.",
        ["She has loved collecting bus tickets.", "She has loved washing reptiles.", "She has loved closing supermarkets."],
        "What has she just learned?",
        "She has just learned how pollen moves from flower to flower.",
        ["She has just learned how whales climb trees.", "She has just learned how cereal grows underwater.", "She has just learned how ladders pollinate flowers."],
        "Where does pollen move?",
        "It moves from flower to flower.",
        ["It moves from shelf to freezer.", "It moves from tunnel to airport.", "It moves from mountain to desert."],
      ),
      f(
        "Bees have built the honeycomb with wax inside the hive. The children have already seen the pattern, but they have never forgotten how organized the cells look.",
        "What have bees built with wax?",
        "They have built the honeycomb with wax.",
        ["They have built a canoe with wax.", "They have built a refrigerator with wax.", "They have built a helmet with wax."],
        "What have the children already seen?",
        "They have already seen the pattern.",
        ["They have already seen a volcano inside the hive.", "They have already seen a dolphin in the flower bed.", "They have already seen a train in the orchard."],
        "What have they never forgotten?",
        "They have never forgotten how organized the cells look.",
        ["They have never forgotten how loud the flowers sound.", "They have never forgotten how cold the wax tastes.", "They have never forgotten how fast the orchard swims."],
      ),
    ],
  },
  {
    number: 69,
    title: "Lesson 69: The Birds",
    vocab: [
      v("feather", "one of the light parts covering a bird", "A bright blue ____ fell from the macaw.", ["scale", "tentacle", "shell"]),
      v("beak", "the hard mouth part of a bird", "The toucan uses its ____ to pick fruit.", ["hoof", "paw", "fin"]),
      v("nest", "the home birds build for eggs or chicks", "The small bird has been building a ____ in the tree.", ["reef", "aisle", "pocket"]),
      v("wing", "the body part a bird uses to fly", "The injured bird has been resting its ____.", ["wheel", "ladder", "ticket"]),
      v("flock", "a group of birds", "A ____ of parrots has been crossing the sky.", ["drawer", "helmet", "coupon"]),
      v("migrate", "to travel regularly from one region to another", "Some birds have been starting to ____ south.", ["whisper", "boil", "freeze"]),
      v("soar", "to fly high and smoothly", "Eagles can ____ above the valley for hours.", ["crawl", "sting", "dive"]),
      v("branch", "a part growing from the trunk of a tree", "The owl has been waiting on the same ____.", ["receipt", "elevator", "freezer"]),
      v("eggshell", "the hard outer part of an egg", "The chick has broken the ____ slowly.", ["highway", "hive", "fossil"]),
      v("chirp", "to make short high bird sounds", "The baby birds have been starting to ____ at dawn.", ["burrow", "trade", "measure"]),
    ],
    grammar: [
      g("The birds ___ been flying over the lake all morning.", "have", ["have", "has", "are", "did"], "The birds have been flying over the lake all morning.", c("The birds has been flying over the lake all morning.", "The birds have been flying over the lake all morning.", ["The birds have been flying over the lake all morning.", "The birds has been flying over the lake all morning.", "The birds are been flying over the lake all morning.", "The birds have flying over the lake all morning been."])),
      g("The owl ___ been waiting on that branch since sunset.", "has", ["has", "have", "is", "did"], "The owl has been waiting on that branch since sunset.", c("The owl have been waiting on that branch since sunset.", "The owl has been waiting on that branch since sunset.", ["The owl has been waiting on that branch since sunset.", "The owl have been waiting on that branch since sunset.", "The owl is been waiting on that branch since sunset.", "The owl has waiting on that branch since sunset."])),
      g("We ___ been watching the nest for two hours.", "have", ["have", "has", "are", "were"], "We have been watching the nest for two hours.", c("We has been watching the nest for two hours.", "We have been watching the nest for two hours.", ["We have been watching the nest for two hours.", "We has been watching the nest for two hours.", "We are been watching the nest for two hours.", "We have watching the nest for two hours."])),
      g("The chick ___ been chirping since early morning.", "has", ["has", "have", "is", "was"], "The chick has been chirping since early morning.", c("The chick have been chirping since early morning.", "The chick has been chirping since early morning.", ["The chick has been chirping since early morning.", "The chick have been chirping since early morning.", "The chick is been chirping since early morning.", "The chick has been chirp since early morning."])),
      g("Laura and Mia ___ been photographing birds all day.", "have", ["have", "has", "are", "did"], "Laura and Mia have been photographing birds all day.", c("Laura and Mia has been photographing birds all day.", "Laura and Mia have been photographing birds all day.", ["Laura and Mia have been photographing birds all day.", "Laura and Mia has been photographing birds all day.", "Laura and Mia are been photographing birds all day.", "Laura and Mia have photographing birds all day been."])),
      g("The parrots ___ been eating fruit since dawn.", "have", ["have", "has", "are", "were"], "The parrots have been eating fruit since dawn."),
      g("That injured bird ___ been resting its wing for days.", "has", ["has", "have", "is", "did"], "That injured bird has been resting its wing for days."),
      g("A flock of geese ___ been moving south this week.", "has", ["has", "have", "are", "did"], "A flock of geese has been moving south this week."),
      g("The children ___ been listening to the birds in silence.", "have", ["have", "has", "were", "did"], "The children have been listening to the birds in silence."),
      g("The eagle ___ been soaring above the cliffs for an hour.", "has", ["has", "have", "is", "was"], "The eagle has been soaring above the cliffs for an hour."),
    ],
    listening: [
      l("The birds have been flying over the lake all morning.", "What have the birds been doing?", "flying over the lake", ["resting under a desk", "shopping at a store", "sleeping in a freezer"], "Which time expression do you hear?", "all morning", ["last year", "next week", "two months ago"]),
      l("The owl has been waiting on that branch since sunset.", "Where has the owl been waiting?", "on that branch", ["under the bridge", "inside the bus", "beside the shelf"], "Which word shows the starting point?", "since", ["for", "already", "just"]),
      l("We have been watching the nest for two hours.", "What have they been watching?", "the nest", ["the highway", "the cereal box", "the train map"], "Which phrase shows duration?", "for two hours", ["since sunset", "yesterday", "tomorrow"]),
      l("The chick has been chirping since early morning.", "What has the chick been doing?", "chirping", ["swimming", "crawling", "driving"], "Is the action continuing?", "yes", ["no", "only in the past", "only in the future"]),
      l("Laura and Mia have been photographing birds all day.", "Who has been photographing birds?", "Laura and Mia", ["Laura and her teacher", "Mia and the pilot", "the cashier and the driver"], "Which grammar form do you hear?", "present perfect continuous", ["past perfect", "simple past", "there is"]),
    ],
    speakingPrompts: [
      s("Say one sentence with have been and all morning.", "The birds have been flying over the lake all morning.", ["The parrots have been eating fruit all morning."]),
      s("Say one sentence with has been and since.", "The owl has been waiting on that branch since sunset.", ["The chick has been chirping since early morning."]),
      s("Say one sentence with for about birdwatching.", "We have been watching the nest for two hours.", ["The eagle has been soaring above the cliffs for an hour."]),
      s("Describe one continuing action in a nest.", "The chick has been chirping since early morning.", ["The parent bird has been bringing food to the nest."]),
      s("Describe a group activity with birds.", "Laura and Mia have been photographing birds all day.", ["The children have been listening to the birds in silence."]),
    ],
    writing: [
      w("The birds _____ been flying over the lake all morning.", "The birds have been flying over the lake all morning.", "have"),
      w("The owl _____ been waiting on that branch since sunset.", "The owl has been waiting on that branch since sunset.", "has"),
      w("We _____ been watching the nest for two hours.", "We have been watching the nest for two hours.", "have"),
      w("The chick _____ been chirping since early morning.", "The chick has been chirping since early morning.", "has"),
      w("Laura and Mia _____ been photographing birds all day.", "Laura and Mia have been photographing birds all day.", "have"),
    ],
    facts: [
      f(
        "Early this week, Laura and Mia have been visiting a bird reserve every morning. They have been watching a pair of toucans that has been feeding chicks in a nest.",
        "Where have Laura and Mia been going every morning?",
        "They have been visiting a bird reserve every morning.",
        ["They have been visiting a pet store every morning.", "They have been visiting a supermarket every morning.", "They have been visiting a stadium every morning."],
        "What birds have they been watching?",
        "They have been watching a pair of toucans.",
        ["They have been watching a pair of whales.", "They have been watching a pair of lizards.", "They have been watching a pair of turtles."],
        "What has the pair been doing in the nest?",
        "It has been feeding chicks in the nest.",
        ["It has been building a bridge in the nest.", "It has been hiding tickets in the nest.", "It has been freezing fruit in the nest."],
      ),
      f(
        "A flock of parrots has been crossing the valley at the same hour each day. The children have been waiting quietly because they do not want to scare the birds away.",
        "What has been crossing the valley?",
        "A flock of parrots has been crossing the valley.",
        ["A flock of bees has been crossing the valley.", "A train has been crossing the valley.", "A group of customers has been crossing the valley."],
        "When has it been crossing?",
        "It has been crossing at the same hour each day.",
        ["It has been crossing only once a year.", "It has been crossing during midnight storms only.", "It has been crossing after every meal."],
        "Why have the children been waiting quietly?",
        "They have been waiting quietly because they do not want to scare the birds away.",
        ["They have been waiting quietly because they are sleeping.", "They have been waiting quietly because they are counting cereal boxes.", "They have been waiting quietly because the road is closed."],
      ),
      f(
        "An injured hawk has been resting its wing under a tree. A wildlife team has been checking the bird every day and has been giving it food and water.",
        "What has the injured hawk been doing?",
        "It has been resting its wing under a tree.",
        ["It has been building a hive under a tree.", "It has been swimming in the reef.", "It has been selling fruit under a tree."],
        "Who has been checking the bird every day?",
        "A wildlife team has been checking the bird every day.",
        ["A bakery team has been checking the bird every day.", "A bus team has been checking the bird every day.", "A supermarket team has been checking the bird every day."],
        "What has the team been giving the hawk?",
        "It has been giving the hawk food and water.",
        ["It has been giving the hawk shampoo and cereal.", "It has been giving the hawk books and pencils.", "It has been giving the hawk snow and ice."],
      ),
      f(
        "Migrating birds have been following warmer routes as the weather changes. Scientists have been studying these movements for years to understand the new patterns.",
        "What have migrating birds been following?",
        "They have been following warmer routes.",
        ["They have been following supermarket aisles.", "They have been following classroom rules.", "They have been following candy recipes."],
        "Why have scientists been studying these movements?",
        "They have been studying them to understand the new patterns.",
        ["They have been studying them to buy faster buses.", "They have been studying them to close wetland parks.", "They have been studying them to make larger shelves."],
        "How long have scientists been studying them?",
        "They have been studying them for years.",
        ["They have been studying them for ten minutes only.", "They have been studying them since tomorrow.", "They have been studying them for one bus ride."],
      ),
      f(
        "At dawn, the baby birds have been chirping louder each day because they are growing. Their parents have been bringing food again and again from the nearby trees.",
        "Why have the baby birds been chirping louder each day?",
        "They have been chirping louder because they are growing.",
        ["They have been chirping louder because the road is noisy.", "They have been chirping louder because the hive is empty.", "They have been chirping louder because the lake is frozen."],
        "Who has been bringing them food?",
        "Their parents have been bringing them food.",
        ["Their teachers have been bringing them food.", "Their drivers have been bringing them food.", "Their cashiers have been bringing them food."],
        "Where has the food been coming from?",
        "It has been coming from the nearby trees.",
        ["It has been coming from the supermarket freezer.", "It has been coming from the mountain tunnel.", "It has been coming from the parking lot."],
      ),
    ],
  },
  {
    number: 70,
    title: "Lesson 70: Animals Before the Flood",
    vocab: [
      v("ark", "a very large boat built to survive the flood", "Noah had finished the ____ before the rain began.", ["reef", "aisle", "tentacle"]),
      v("flood", "a large amount of water covering land", "The ____ had reached the fields by night.", ["cocoon", "orchard", "honeycomb"]),
      v("storm", "violent weather with strong wind and rain", "Dark clouds had announced the ____.", ["harvest", "receipt", "blossom"]),
      v("pair", "two matching animals or things", "Each ____ of animals had entered the ark.", ["branch", "engine", "coupon"]),
      v("gather", "to come together or collect", "The families had started to ____ food before sunset.", ["sting", "soar", "freeze"]),
      v("warning", "information about danger", "The people had ignored the ____ for years.", ["flower bed", "shell", "beak"]),
      v("obedience", "doing what is right or what you are told", "Noah had shown great ____ to God.", ["traffic", "cement", "plastic"]),
      v("ramp", "a sloping surface used to enter a place", "The animals had climbed the ____ in silence.", ["reef", "wing", "scale"]),
      v("shelter", "a protected place", "The ark had become a safe ____ from the storm.", ["ticket", "freezer", "stadium"]),
      v("rainfall", "the amount of rain that falls", "The heavy ____ had covered the valley quickly.", ["feather", "wax", "pattern"]),
    ],
    grammar: [
      g("By the time the rain started, Noah had ___ the ark.", "finished", ["finished", "finish", "finishing", "finishes"], "By the time the rain started, Noah had finished the ark.", c("By the time the rain started, Noah had finish the ark.", "By the time the rain started, Noah had finished the ark.", ["By the time the rain started, Noah had finished the ark.", "By the time the rain started, Noah had finish the ark.", "By the time the rain started, Noah finished had the ark.", "By the time the rain started, Noah has finished the ark."])),
      g("The animals had ___ the ramp before night came.", "climbed", ["climbed", "climb", "climbing", "climbs"], "The animals had climbed the ramp before night came.", c("The animals had climb the ramp before night came.", "The animals had climbed the ramp before night came.", ["The animals had climbed the ramp before night came.", "The animals had climb the ramp before night came.", "The animals had climbs the ramp before night came.", "The animals have climbed the ramp before night came."])),
      g("People had ___ the warning for many years.", "ignored", ["ignored", "ignore", "ignoring", "ignores"], "People had ignored the warning for many years.", c("People had ignore the warning for many years.", "People had ignored the warning for many years.", ["People had ignored the warning for many years.", "People had ignore the warning for many years.", "People had ignores the warning for many years.", "People have ignored the warning for many years."])),
      g("The family had ___ food before the storm grew stronger.", "gathered", ["gathered", "gather", "gathering", "gathers"], "The family had gathered food before the storm grew stronger.", c("The family had gather food before the storm grew stronger.", "The family had gathered food before the storm grew stronger.", ["The family had gathered food before the storm grew stronger.", "The family had gather food before the storm grew stronger.", "The family had gathers food before the storm grew stronger.", "The family has gathered food before the storm grew stronger."])),
      g("By dawn, the flood had ___ the lower fields.", "reached", ["reached", "reach", "reaching", "reaches"], "By dawn, the flood had reached the lower fields.", c("By dawn, the flood had reach the lower fields.", "By dawn, the flood had reached the lower fields.", ["By dawn, the flood had reached the lower fields.", "By dawn, the flood had reach the lower fields.", "By dawn, the flood had reaches the lower fields.", "By dawn, the flood has reached the lower fields."])),
      g("Noah had ___ obedience before the storm arrived.", "shown", ["shown", "show", "showed", "showing"], "Noah had shown obedience before the storm arrived."),
      g("Each pair had ___ the ark in order.", "entered", ["entered", "enter", "entering", "enters"], "Each pair had entered the ark in order."),
      g("The heavy rainfall had ___ the valley quickly.", "covered", ["covered", "cover", "covering", "covers"], "The heavy rainfall had covered the valley quickly."),
      g("The ark had ___ a safe shelter for the animals.", "become", ["become", "became", "becomes", "becoming"], "The ark had become a safe shelter for the animals."),
      g("The clouds had ___ the storm long before it began.", "announced", ["announced", "announce", "announcing", "announces"], "The clouds had announced the storm long before it began."),
    ],
    listening: [
      l("By the time the rain started, Noah had finished the ark.", "What had Noah finished?", "the ark", ["the orchard", "the hive", "the shelf"], "Which action happened first?", "finishing the ark", ["the rain starting", "the fields flooding", "the animals sleeping"]),
      l("The animals had climbed the ramp before night came.", "What had the animals climbed?", "the ramp", ["the mountain", "the branch", "the ladder"], "Did they climb it before or after night came?", "before", ["after", "during breakfast", "next year"]),
      l("People had ignored the warning for many years.", "What had people ignored?", "the warning", ["the harvest", "the recipe", "the classroom"], "How long had they ignored it?", "for many years", ["for one minute", "since tomorrow", "after lunch"]),
      l("The family had gathered food before the storm grew stronger.", "What had the family gathered?", "food", ["tickets", "wax", "notebooks"], "What happened later?", "the storm grew stronger", ["the flood ended", "the bees returned", "the class began"]),
      l("By dawn, the flood had reached the lower fields.", "What had reached the lower fields?", "the flood", ["the ark", "the flock", "the orchard"], "By what time had it reached them?", "by dawn", ["by next month", "by noon yesterday", "by winter break"]),
    ],
    speakingPrompts: [
      s("Say one sentence with had finished.", "By the time the rain started, Noah had finished the ark.", ["Noah had finished the work before the storm began."]),
      s("Say one sentence with had climbed.", "The animals had climbed the ramp before night came.", ["The birds had climbed inside before the rain began."]),
      s("Say one sentence with had ignored.", "People had ignored the warning for many years.", ["The crowd had ignored the first sign."]),
      s("Say one sentence with had gathered.", "The family had gathered food before the storm grew stronger.", ["They had gathered supplies before the flood reached the road."]),
      s("Say one sentence with by the time.", "By dawn, the flood had reached the lower fields.", ["By the time the storm began, the animals had entered the ark."]),
    ],
    writing: [
      w("By the time the rain started, Noah had _____ the ark.", "By the time the rain started, Noah had finished the ark.", "finished"),
      w("The animals had _____ the ramp before night came.", "The animals had climbed the ramp before night came.", "climbed"),
      w("People had _____ the warning for many years.", "People had ignored the warning for many years.", "ignored"),
      w("The family had _____ food before the storm grew stronger.", "The family had gathered food before the storm grew stronger.", "gathered"),
      w("By dawn, the flood had _____ the lower fields.", "By dawn, the flood had reached the lower fields.", "reached"),
    ],
    facts: [
      f(
        "Before the first heavy rain fell, Noah had already completed the ark. He had followed God's instructions carefully, and his family had prepared food for people and animals.",
        "What had Noah completed before the first heavy rain fell?",
        "He had completed the ark.",
        ["He had completed the orchard.", "He had completed the bridge.", "He had completed the classroom."],
        "Whose instructions had Noah followed?",
        "He had followed God's instructions.",
        ["He had followed the cashier's instructions.", "He had followed the pilot's instructions.", "He had followed the diver's instructions."],
        "What had the family prepared?",
        "They had prepared food for people and animals.",
        ["They had prepared tickets for visitors.", "They had prepared shampoo for birds.", "They had prepared wax for buses."],
      ),
      f(
        "By the time the sky turned black, pairs of animals had entered the ark. Some had walked in quietly, and others had waited near the ramp until their turn came.",
        "What had entered the ark by the time the sky turned black?",
        "Pairs of animals had entered the ark.",
        ["Pairs of teachers had entered the ark.", "Pairs of shelves had entered the ark.", "Pairs of recipes had entered the ark."],
        "How had some animals entered?",
        "Some had walked in quietly.",
        ["Some had flown to the moon quietly.", "Some had driven in buses quietly.", "Some had swum through the highway quietly."],
        "Where had others waited?",
        "They had waited near the ramp.",
        ["They had waited near the freezer.", "They had waited near the ticket office.", "They had waited near the elevator."],
      ),
      f(
        "Many people had ignored the warning for years, even though the signs had become clearer. When the storm finally arrived, they had not prepared a safe shelter.",
        "What had many people done for years?",
        "They had ignored the warning for years.",
        ["They had built honeycombs for years.", "They had planted orchids for years.", "They had studied dolphins for years."],
        "What had become clearer?",
        "The signs had become clearer.",
        ["The shelves had become clearer.", "The cereal had become clearer.", "The tickets had become clearer."],
        "What had they not prepared?",
        "They had not prepared a safe shelter.",
        ["They had not prepared a colorful feather.", "They had not prepared a pet toy.", "They had not prepared a fruit salad."],
      ),
      f(
        "The heavy rainfall had covered the valley before morning. The ark had already become a place of safety while the flood kept rising around it.",
        "What had covered the valley before morning?",
        "The heavy rainfall had covered the valley.",
        ["A flock of birds had covered the valley.", "A candy truck had covered the valley.", "A bee farm had covered the valley."],
        "What had the ark already become?",
        "It had already become a place of safety.",
        ["It had already become a pet store.", "It had already become a flower bed.", "It had already become a sports field."],
        "What kept rising around it?",
        "The flood kept rising around it.",
        ["The cereal kept rising around it.", "The branch kept rising around it.", "The recipe kept rising around it."],
      ),
      f(
        "After the animals had settled inside, the family had finally rested. They had worked for a long time, and the long preparation had given them peace during the storm.",
        "What had the animals done before the family rested?",
        "They had settled inside.",
        ["They had built roads.", "They had climbed mountains.", "They had visited a market."],
        "How long had the family worked?",
        "They had worked for a long time.",
        ["They had worked for five seconds.", "They had worked only in winter nights.", "They had worked for one bus stop."],
        "What had the long preparation given them?",
        "It had given them peace during the storm.",
        ["It had given them tickets during the storm.", "It had given them traffic during the storm.", "It had given them ladders during the storm."],
      ),
    ],
  },
  {
    number: 71,
    title: "Lesson 71: The Balance of Ecosystems",
    vocab: [
      v("balance", "a stable and healthy condition", "Predators help keep the ecosystem in ____.", ["storm", "ticket", "shampoo"]),
      v("chain", "a connected series of things", "A food ____ shows who eats whom.", ["wing", "shelf", "branch"]),
      v("predator", "an animal that hunts other animals", "A wolf is a ____ in its habitat.", ["flower", "cashier", "blossom"]),
      v("prey", "an animal hunted by another animal", "The rabbit can become ____ for larger animals.", ["wax", "pollen", "nectar"]),
      v("forest floor", "the ground layer of a forest", "Many insects live on the ____.", ["ceiling fan", "bus seat", "desk lamp"]),
      v("nutrient", "a substance that helps living things grow", "Dead leaves return ____ to the soil.", ["receipts", "buttons", "signals"]),
      v("decompose", "to break down naturally", "Fungi help plants and animals ____ after death.", ["migrate", "chirp", "boil"]),
      v("recover", "to return to a healthy state", "The wetland has started to ____ after the fire.", ["freeze", "shout", "scratch"]),
      v("disappear", "to stop being seen or to no longer exist there", "If bees vanish, some flowers may ____.", ["collect", "balance", "organize"]),
      v("interaction", "the way two things affect each other", "Scientists studied the ____ between birds and insects.", ["temperature", "garage", "freezer"]),
    ],
    grammar: [
      g("Scientists ___ the forest last year, and they have learned a lot since then.", "studied", ["studied", "have studied", "study", "are studying"], "Scientists studied the forest last year, and they have learned a lot since then.", c("Scientists have studied the forest last year, and they have learned a lot since then.", "Scientists studied the forest last year, and they have learned a lot since then.", ["Scientists studied the forest last year, and they have learned a lot since then.", "Scientists have studied the forest last year, and they have learned a lot since then.", "Scientists study the forest last year, and they have learned a lot since then.", "Scientists studied the forest last year, and they learned a lot since then."])),
      g("The river ___ cleaner since the new rules started.", "has become", ["has become", "became", "becomes", "is becoming"], "The river has become cleaner since the new rules started.", c("The river became cleaner since the new rules started.", "The river has become cleaner since the new rules started.", ["The river has become cleaner since the new rules started.", "The river became cleaner since the new rules started.", "The river has became cleaner since the new rules started.", "The river is become cleaner since the new rules started."])),
      g("We ___ many birds on the trip yesterday.", "saw", ["saw", "have seen", "see", "are seeing"], "We saw many birds on the trip yesterday.", c("We have seen many birds on the trip yesterday.", "We saw many birds on the trip yesterday.", ["We saw many birds on the trip yesterday.", "We have seen many birds on the trip yesterday.", "We seen many birds on the trip yesterday.", "We are seeing many birds on the trip yesterday."])),
      g("People ___ more about pollination in recent years.", "have learned", ["have learned", "learned", "learn", "are learning"], "People have learned more about pollination in recent years.", c("People learned more about pollination in recent years.", "People have learned more about pollination in recent years.", ["People have learned more about pollination in recent years.", "People learned more about pollination in recent years.", "People have learn more about pollination in recent years.", "People are learned more about pollination in recent years."])),
      g("The forest fire ___ a lot of damage in 2023.", "caused", ["caused", "has caused", "cause", "is causing"], "The forest fire caused a lot of damage in 2023.", c("The forest fire has caused a lot of damage in 2023.", "The forest fire caused a lot of damage in 2023.", ["The forest fire caused a lot of damage in 2023.", "The forest fire has caused a lot of damage in 2023.", "The forest fire cause a lot of damage in 2023.", "The forest fire is caused a lot of damage in 2023."])),
      g("The area ___ slowly since the rain returned.", "has recovered", ["has recovered", "recovered", "recovers", "is recovering"], "The area has recovered slowly since the rain returned."),
      g("Researchers ___ this food chain last month.", "mapped", ["mapped", "have mapped", "map", "are mapping"], "Researchers mapped this food chain last month."),
      g("Some species ___ from this region already.", "have disappeared", ["have disappeared", "disappeared", "disappear", "are disappearing"], "Some species have disappeared from this region already."),
      g("Farmers ___ fewer insects this season.", "have noticed", ["have noticed", "noticed", "notice", "are noticing"], "Farmers have noticed fewer insects this season."),
      g("The wolves ___ the deer population for years.", "have controlled", ["have controlled", "controlled", "control", "are controlling"], "The wolves have controlled the deer population for years."),
    ],
    listening: [
      l("Scientists studied the forest last year, and they have learned a lot since then.", "When did scientists study the forest?", "last year", ["since morning", "every Tuesday", "next month"], "Which part is in the present perfect?", "they have learned a lot since then", ["scientists studied the forest last year", "last year", "the forest"]),
      l("The river has become cleaner since the new rules started.", "What has become cleaner?", "the river", ["the freezer", "the bus", "the shelf"], "Which form shows change up to now?", "has become", ["became", "was", "did become"]),
      l("We saw many birds on the trip yesterday.", "When did they see many birds?", "yesterday", ["since 2020", "for years", "already"], "Which tense do you hear?", "simple past", ["present perfect", "future", "passive voice"]),
      l("People have learned more about pollination in recent years.", "What have people learned more about?", "pollination", ["traffic", "candy", "stairs"], "Which time expression matches the present perfect?", "in recent years", ["yesterday morning", "last week only", "in 2019 exactly"]),
      l("The forest fire caused a lot of damage in 2023.", "What caused a lot of damage?", "the forest fire", ["the honeycomb", "the pet bowl", "the cash register"], "Which year is mentioned?", "2023", ["2013", "2030", "2026"]),
    ],
    speakingPrompts: [
      s("Say one sentence in the simple past with a finished time.", "We saw many birds on the trip yesterday.", ["Researchers mapped this food chain last month."]),
      s("Say one sentence in the present perfect with since.", "The river has become cleaner since the new rules started.", ["The area has recovered slowly since the rain returned."]),
      s("Say one sentence in the present perfect with recent years.", "People have learned more about pollination in recent years.", ["Farmers have noticed fewer insects this season."]),
      s("Compare a finished event and a present result.", "The forest fire caused damage in 2023, but the area has recovered slowly since then.", ["Scientists studied the forest last year, and they have learned a lot since then."]),
      s("Describe ecosystem balance.", "Predators have controlled the deer population for years.", ["Dead leaves have returned nutrients to the soil for centuries."]),
    ],
    writing: [
      w("Scientists _____ the forest last year, and they have learned a lot since then.", "Scientists studied the forest last year, and they have learned a lot since then.", "studied"),
      w("The river _____ become cleaner since the new rules started.", "The river has become cleaner since the new rules started.", "has"),
      w("We _____ many birds on the trip yesterday.", "We saw many birds on the trip yesterday.", "saw"),
      w("People _____ learned more about pollination in recent years.", "People have learned more about pollination in recent years.", "have"),
      w("The forest fire _____ a lot of damage in 2023.", "The forest fire caused a lot of damage in 2023.", "caused"),
    ],
    facts: [
      f(
        "A balanced ecosystem depends on many interactions. Predators controlled deer numbers in this forest for years, and as a result young trees have grown more easily.",
        "What does a balanced ecosystem depend on?",
        "It depends on many interactions.",
        ["It depends on only one species.", "It depends on candy prices.", "It depends on bus schedules."],
        "What controlled deer numbers in the forest?",
        "Predators controlled deer numbers.",
        ["Storms controlled deer numbers.", "Cashiers controlled deer numbers.", "Tickets controlled deer numbers."],
        "What has happened as a result?",
        "Young trees have grown more easily.",
        ["Young trees have disappeared completely.", "Young trees have turned into birds.", "Young trees have moved into the city."],
      ),
      f(
        "Researchers studied a wetland in 2024 and recorded many frogs, birds, and insects. Since then, they have returned several times and have noticed that the water is cleaner.",
        "When did researchers study the wetland?",
        "They studied it in 2024.",
        ["They studied it in 2014.", "They studied it next year.", "They studied it every minute."],
        "What have they done since then?",
        "They have returned several times.",
        ["They have sold tickets several times.", "They have closed the ocean several times.", "They have planted mountains several times."],
        "What have they noticed?",
        "They have noticed that the water is cleaner.",
        ["They have noticed that the bridge is sweeter.", "They have noticed that the shelf is larger.", "They have noticed that the road is louder."],
      ),
      f(
        "When bees disappeared from one field last season, farmers harvested less fruit. This year they have planted more flowers, and the bee activity has improved.",
        "What happened when bees disappeared last season?",
        "Farmers harvested less fruit.",
        ["Farmers harvested more coral.", "Farmers built more buses.", "Farmers closed more schools."],
        "What have farmers done this year?",
        "They have planted more flowers.",
        ["They have planted more ladders.", "They have planted more tickets.", "They have planted more shelves."],
        "What has improved?",
        "The bee activity has improved.",
        ["The mountain height has improved.", "The freezer color has improved.", "The notebook price has improved."],
      ),
      f(
        "Fungi and worms have returned nutrients to the forest floor for a very long time. Last month, students observed this process and wrote notes about decomposition.",
        "What have fungi and worms returned to the forest floor?",
        "They have returned nutrients to the forest floor.",
        ["They have returned candy to the forest floor.", "They have returned traffic to the forest floor.", "They have returned shampoo to the forest floor."],
        "When did students observe the process?",
        "They observed it last month.",
        ["They observed it tomorrow.", "They observed it since winter.", "They observed it for many years yesterday."],
        "What did students write notes about?",
        "They wrote notes about decomposition.",
        ["They wrote notes about pet stores.", "They wrote notes about cereal boxes.", "They wrote notes about train stations."],
      ),
      f(
        "Some bird species have disappeared from damaged areas, but they returned after the forest recovered. Local families protected the region for years, and their work has helped the ecosystem heal.",
        "What happened to some bird species in damaged areas?",
        "They disappeared from damaged areas.",
        ["They became larger than whales.", "They turned into insects.", "They moved into supermarkets."],
        "When did they return?",
        "They returned after the forest recovered.",
        ["They returned before the forest existed.", "They returned during the candy sale.", "They returned when the freezer opened."],
        "What has helped the ecosystem heal?",
        "The work of local families has helped it heal.",
        ["The work of local cashiers has helped it heal.", "The work of bus drivers has helped it heal.", "The work of recipe writers has helped it heal."],
      ),
    ],
  },
  {
    number: 72,
    title: "Lesson 72: Marine Life",
    vocab: [
      v("current", "the steady movement of water in the sea", "Strong ocean ____ move small fish together.", ["wings", "stairs", "wallets"]),
      v("depth", "how deep something is", "Divers checked the ____ before entering the water.", ["ticket", "branch", "freezer"]),
      v("dolphin", "a smart sea mammal with a long body", "A ____ has followed the boat for an hour.", ["tamarin", "spider", "eagle"]),
      v("whale", "a very large sea mammal", "The ____ is larger than any fish.", ["bee", "frog", "snail"]),
      v("seahorse", "a small sea animal with a horse-like head", "A tiny ____ has hidden in the sea grass.", ["macaw", "hamster", "jaguar"]),
      v("sea grass", "plants that grow in shallow sea water", "Young fish use ____ as shelter.", ["wax", "pollen", "stone wall"]),
      v("reef", "an area of coral or rock under the sea", "Many creatures have lived near the ____ for years.", ["parking lot", "hallway", "bus stop"]),
      v("tide", "the regular rise and fall of the sea level", "The ____ had gone out before the children found shells.", ["nest", "storm cloud", "price tag"]),
      v("surface", "the top of the water", "The turtle has come up to the ____ for air.", ["cash register", "freezer shelf", "flower bed"]),
      v("conservation", "the protection of nature", "Marine ____ helps keep oceans healthy.", ["competition", "transportation", "translation"]),
    ],
    grammar: [
      g("The dolphin has ___ following the boat for an hour.", "been", ["been", "be", "was", "did"], "The dolphin has been following the boat for an hour.", c("The dolphin has following the boat for an hour.", "The dolphin has been following the boat for an hour.", ["The dolphin has been following the boat for an hour.", "The dolphin has following the boat for an hour.", "The dolphin had been follow the boat for an hour.", "The dolphin is been following the boat for an hour."])),
      g("By the time we arrived, the tide had ___ out.", "gone", ["gone", "go", "went", "going"], "By the time we arrived, the tide had gone out.", c("By the time we arrived, the tide had went out.", "By the time we arrived, the tide had gone out.", ["By the time we arrived, the tide had gone out.", "By the time we arrived, the tide had went out.", "By the time we arrived, the tide has gone out.", "By the time we arrived, the tide had go out."])),
      g("We have ___ visited this reef before.", "already", ["already", "yet", "ever", "never"], "We have already visited this reef before.", c("We have yet visited this reef before.", "We have already visited this reef before.", ["We have already visited this reef before.", "We have yet visited this reef before.", "We have ever visited this reef before.", "We already have visit this reef before."])),
      g("This whale is the ___ animal in the bay today.", "largest", ["largest", "larger", "most large", "large"], "This whale is the largest animal in the bay today.", c("This whale is the larger animal in the bay today.", "This whale is the largest animal in the bay today.", ["This whale is the largest animal in the bay today.", "This whale is the larger animal in the bay today.", "This whale is the most large animal in the bay today.", "This whale is large animal in the bay today."])),
      g("Sea turtles should ___ plastic in the water, but they sometimes mistake it for food.", "avoid", ["avoid", "avoiding", "avoids", "avoided"], "Sea turtles should avoid plastic in the water, but they sometimes mistake it for food.", c("Sea turtles should avoids plastic in the water, but they sometimes mistake it for food.", "Sea turtles should avoid plastic in the water, but they sometimes mistake it for food.", ["Sea turtles should avoid plastic in the water, but they sometimes mistake it for food.", "Sea turtles should avoids plastic in the water, but they sometimes mistake it for food.", "Sea turtles should avoiding plastic in the water, but they sometimes mistake it for food.", "Sea turtles avoid should plastic in the water, but they sometimes mistake it for food."])),
      g("The scientists have ___ studying this reef since March.", "been", ["been", "be", "was", "did"], "The scientists have been studying this reef since March."),
      g("Have you ___ seen a seahorse in the wild?", "ever", ["ever", "already", "yet", "never"], "Have you ever seen a seahorse in the wild?"),
      g("The water has become ___ near the protected beach.", "cleaner", ["cleaner", "cleanest", "more clean", "clean"], "The water has become cleaner near the protected beach."),
      g("By sunrise, the fishing boats had ___ the harbor.", "left", ["left", "leave", "leaving", "leaves"], "By sunrise, the fishing boats had left the harbor."),
      g("Marine conservation has ___ many species survive.", "helped", ["helped", "help", "helping", "helps"], "Marine conservation has helped many species survive."),
    ],
    listening: [
      l("The dolphin has been following the boat for an hour.", "What has the dolphin been doing?", "following the boat", ["building a nest", "buying fruit", "climbing a ramp"], "How long has it been doing that?", "for an hour", ["since last year", "yesterday morning", "next week"]),
      l("By the time we arrived, the tide had gone out.", "What had gone out?", "the tide", ["the reef", "the dolphin", "the boat"], "Which action happened first?", "the tide went out before we arrived", ["we arrived before the tide changed", "the whale sang first", "the reef moved first"]),
      l("We have already visited this reef before.", "What have they already visited?", "this reef", ["this orchard", "this pet store", "this classroom"], "Which word shows completion?", "already", ["yet", "ever", "never"]),
      l("This whale is the largest animal in the bay today.", "Which animal is the largest today?", "this whale", ["this seahorse", "this turtle", "this fish"], "Which type of adjective do you hear?", "a superlative", ["a comparative", "a modal", "a pronoun"]),
      l("Sea turtles should avoid plastic in the water.", "What should sea turtles avoid?", "plastic in the water", ["sea grass", "clean reefs", "small fish"], "Does should express advice or a finished event?", "advice", ["a finished event", "a comparison", "a question"]),
    ],
    speakingPrompts: [
      s("Say one sentence with have been about marine life.", "The dolphin has been following the boat for an hour.", ["The scientists have been studying this reef since March."]),
      s("Say one sentence with had and by the time.", "By the time we arrived, the tide had gone out.", ["By sunrise, the fishing boats had left the harbor."]),
      s("Say one sentence with already or ever.", "We have already visited this reef before.", ["Have you ever seen a seahorse in the wild?"]),
      s("Make one superlative sentence about the ocean.", "This whale is the largest animal in the bay today.", ["The blue whale is the largest animal in the ocean."]),
      s("Give one conservation sentence with should.", "Sea turtles should avoid plastic in the water.", ["People should protect sea grass and coral reefs."]),
    ],
    writing: [
      w("The dolphin has _____ following the boat for an hour.", "The dolphin has been following the boat for an hour.", "been"),
      w("By the time we arrived, the tide had _____ out.", "By the time we arrived, the tide had gone out.", "gone"),
      w("We have _____ visited this reef before.", "We have already visited this reef before.", "already"),
      w("This whale is the _____ animal in the bay today.", "This whale is the largest animal in the bay today.", "largest"),
      w("Sea turtles should _____ plastic in the water.", "Sea turtles should avoid plastic in the water.", "avoid"),
    ],
    facts: [
      f(
        "Marine life depends on healthy reefs, clean water, and safe currents. Scientists have studied one local reef since March, and they have already recorded more young fish there.",
        "What does marine life depend on?",
        "It depends on healthy reefs, clean water, and safe currents.",
        ["It depends on parking lots, stairs, and buses.", "It depends on candy, shelves, and tickets.", "It depends on storms, cashiers, and freezers."],
        "Since when have scientists studied the local reef?",
        "They have studied it since March.",
        ["They have studied it since tomorrow.", "They have studied it since the last century only yesterday.", "They have studied it since breakfast in 2010 exactly."],
        "What have they already recorded there?",
        "They have already recorded more young fish there.",
        ["They have already recorded more ladders there.", "They have already recorded more toy cars there.", "They have already recorded more umbrellas there."],
      ),
      f(
        "By the time the class boat arrived, the tide had gone out and many shells were visible. The students had never seen the reef surface so clearly before.",
        "What had happened by the time the class boat arrived?",
        "The tide had gone out.",
        ["The whale had climbed a tree.", "The sea grass had flown away.", "The harbor had entered the boat."],
        "What became visible?",
        "Many shells became visible.",
        ["Many highways became visible.", "Many pillows became visible.", "Many train seats became visible."],
        "What had the students never seen so clearly before?",
        "They had never seen the reef surface so clearly before.",
        ["They had never seen the supermarket aisle so clearly before.", "They had never seen the candy shelf so clearly before.", "They had never seen the parking lot so clearly before."],
      ),
      f(
        "A dolphin has been following fishing boats in this bay because small fish gather near them. Local guides say they have seen this behavior for many seasons.",
        "Why has the dolphin been following the boats?",
        "It has been following them because small fish gather near them.",
        ["It has been following them because the boats sing loudly.", "It has been following them because the boats sell fruit.", "It has been following them because the boats carry flowers."],
        "Who has seen this behavior for many seasons?",
        "Local guides have seen it for many seasons.",
        ["Local dentists have seen it for many seasons.", "Local cashiers have seen it for many seasons.", "Local pilots have seen it for many seasons."],
        "Where has this happened?",
        "It has happened in this bay.",
        ["It has happened in this supermarket.", "It has happened in this mountain cave.", "It has happened in this classroom."],
      ),
      f(
        "Sea turtles sometimes mistake plastic for food, so conservation groups have taught beach visitors simple rules. Since the campaign began, the beach has become cleaner.",
        "What do sea turtles sometimes mistake plastic for?",
        "They mistake plastic for food.",
        ["They mistake plastic for nectar.", "They mistake plastic for homework.", "They mistake plastic for ladders."],
        "Who has taught simple rules to visitors?",
        "Conservation groups have taught the rules.",
        ["Toy stores have taught the rules.", "Bus stations have taught the rules.", "Office workers have taught the rules."],
        "What has happened since the campaign began?",
        "The beach has become cleaner.",
        ["The beach has become louder than a train.", "The beach has become a supermarket.", "The beach has become a mountain."],
      ),
      f(
        "Seahorses have lived for years in the sea grass near the shore, but storms damaged part of the habitat last winter. Volunteers have planted new sea grass, and small animals have started to return.",
        "Where have seahorses lived for years?",
        "They have lived in the sea grass near the shore.",
        ["They have lived in the honeycomb near the store.", "They have lived in the candy aisle near the road.", "They have lived in the freezer near the stairs."],
        "What damaged part of the habitat last winter?",
        "Storms damaged part of the habitat.",
        ["Customers damaged part of the habitat.", "Recipes damaged part of the habitat.", "Coupons damaged part of the habitat."],
        "What has happened after volunteers planted new sea grass?",
        "Small animals have started to return.",
        ["Large buses have started to return.", "Cereal boxes have started to return.", "Ticket machines have started to return."],
      ),
    ],
  },
];

export const workbook6Lessons = workbook6Configs.map(buildWorkbook6Lesson);
