import { Lesson } from "../../types";
import { buildLesson, ChoiceSeed, makeChoices, makeSpeakings, makeWritings, SpeakingSeed, WritingSeed } from "./helpers";
import { buildBlankAudioText, buildFullSentenceFromPrompt, hasBlankPlaceholder } from "../../utils/fillInBlankAudio";

const VOCABULARY_INSTRUCTION = "Listen and choose the correct word.";
const GRAMMAR_INSTRUCTION = "Listen and choose the correct option.";
const RECOGNITION_INSTRUCTION = "Listen and choose the correct answer.";
const SPEAK_REPEAT = "Listen and repeat.";
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

function optionsFor(correct: string, distractors: string[], fallbackOptions: string[] = []): string[] {
  const options = [correct, ...distractors, ...fallbackOptions]
    .map((value) => value?.trim())
    .filter((value, index, values) => Boolean(value) && values.indexOf(value) === index) as string[];
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
  fallbackOptions: string[] = [],
): ChoiceSeed {
  const promptText = display || audio;
  const hasBlank = hasBlankPlaceholder(promptText);
  return {
    display,
    audio,
    audioBeforeAnswer: hasBlank ? buildBlankAudioText(promptText) : undefined,
    correct,
    fullSentenceAfterAnswer: hasBlank ? buildFullSentenceFromPrompt(promptText, correct) : undefined,
    options: optionsFor(correct, distractors, fallbackOptions),
    type,
    accepted,
  };
}

function speaking(display: string, audio: string, correct: string, accepted?: string[]): SpeakingSeed {
  return { display, audio, correct, accepted };
}

function buildVocabularySeeds(vocab: VocabItem[]): ChoiceSeed[] {
  const fallbackTerms = vocab.map((item) => item.term);
  const fallbackClues = vocab.map((item) => item.clue);
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
      undefined,
      fallbackTerms.filter((term) => term !== item.term),
    ),
  );

  const sentenceSeeds = vocab.slice(5, 10).map((item) =>
    choice(
      item.prompt,
      item.prompt,
      item.term,
      item.distractors,
      "multiple-choice",
      undefined,
      fallbackTerms.filter((term) => term !== item.term),
    ),
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
      "multiple-choice",
      undefined,
      fallbackClues.filter((clue) => clue !== item.clue),
    ),
  );

  return [...meaningSeeds, ...sentenceSeeds, ...clueSeeds];
}

function buildGrammarSeeds(grammar: GrammarItem[]): ChoiceSeed[] {
  const fallbackAnswers = grammar.map((item) => item.answer);
  const fallbackSentences = grammar.map((item) => item.fullSentence);
  const baseSeeds = grammar.map((item) =>
    choice(
      item.prompt,
      item.fullSentence,
      item.answer,
      item.options.filter((option) => option !== item.answer),
      "multiple-choice",
      item.accepted,
      fallbackAnswers.filter((answer) => answer !== item.answer),
    ),
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
        "multiple-choice",
        undefined,
        fallbackSentences.filter((sentence) => sentence !== item.correction?.correctSentence),
      );
    });

  return [...baseSeeds, ...correctionSeeds];
}

function buildRecognitionSeeds(listening: ListeningItem[]): ChoiceSeed[] {
  const fallbackSentences = listening.map((item) => item.sentence);
  const fallbackFocusAnswers = listening.map((item) => item.focusAnswer);
  const fallbackMeaningAnswers = listening.map((item) => item.meaningAnswer);
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
      "multiple-choice",
      undefined,
      fallbackSentences.filter((sentence) => sentence !== item.sentence),
    ),
  );

  const focusSeeds = listening.map((item) =>
    choice(
      item.focusQuestion,
      item.sentence,
      item.focusAnswer,
      item.focusDistractors,
      "multiple-choice",
      undefined,
      fallbackFocusAnswers.filter((answer) => answer !== item.focusAnswer),
    ),
  );

  const meaningSeeds = listening.map((item) =>
    choice(
      item.meaningQuestion,
      item.sentence,
      item.meaningAnswer,
      item.meaningDistractors,
      "multiple-choice",
      undefined,
      fallbackMeaningAnswers.filter((answer) => answer !== item.meaningAnswer),
    ),
  );

  return [...sentenceSeeds, ...focusSeeds, ...meaningSeeds];
}

function buildReadingSeeds(facts: FactItem[]): ChoiceSeed[] {
  const fallbackAnswers = facts.map((item) => item.answer);
  const fallbackDetailAnswers = facts.map((item) => item.detailAnswer);
  const fallbackVocabAnswers = facts.map((item) => item.vocabAnswer);
  const directSeeds = facts.map((item) =>
    choice(
      `${item.passage}\n\nQuestion: ${item.question}`,
      item.question,
      item.answer,
      item.distractors,
      "multiple-choice",
      undefined,
      fallbackAnswers.filter((answer) => answer !== item.answer),
    ),
  );

  const detailSeeds = facts.map((item) =>
    choice(
      `${item.passage}\n\nQuestion: ${item.detailQuestion}`,
      item.detailQuestion,
      item.detailAnswer,
      item.detailDistractors,
      "multiple-choice",
      undefined,
      fallbackDetailAnswers.filter((answer) => answer !== item.detailAnswer),
    ),
  );

  const vocabSeeds = facts.map((item) =>
    choice(
      `${item.passage}\n\nQuestion: ${item.vocabQuestion}`,
      item.vocabQuestion,
      item.vocabAnswer,
      item.vocabDistractors,
      "multiple-choice",
      undefined,
      fallbackVocabAnswers.filter((answer) => answer !== item.vocabAnswer),
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
  const fallbackTerms = vocab.map((item) => item.term);
  const fallbackAnswers = grammar.map((item) => item.answer);
  const fallbackFactAnswers = facts.map((item) => item.answer);
  const vocabReview = vocab.slice(0, 5).map((item) =>
    choice(
      item.prompt,
      item.prompt,
      item.term,
      item.distractors,
      "multiple-choice",
      undefined,
      fallbackTerms.filter((term) => term !== item.term),
    ),
  );

  const grammarReview = grammar.slice(0, 5).map((item) =>
    choice(
      item.prompt,
      item.fullSentence,
      item.answer,
      item.options.filter((option) => option !== item.answer),
      "multiple-choice",
      undefined,
      fallbackAnswers.filter((answer) => answer !== item.answer),
    ),
  );

  const factReview = facts.slice(0, 5).map((item) =>
    choice(
      item.question,
      item.question,
      item.answer,
      item.distractors,
      "multiple-choice",
      undefined,
      fallbackFactAnswers.filter((answer) => answer !== item.answer),
    ),
  );

  return [...vocabReview, ...grammarReview, ...factReview];
}

function buildWorkbook8Lesson(config: LessonConfig): Lesson {
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

const workbook8Configs: LessonConfig[] = [
  {
    "number": 85,
    "title": "Lesson 85: If Only I Had Known",
    "vocab": [
      {
        "term": "regret",
        "clue": "sadness about something you did or did not do",
        "prompt": "Daniel felt deep ____ after ignoring the call.",
        "distractors": [
          "ticket",
          "recipe",
          "schedule"
        ]
      },
      {
        "term": "possibility",
        "clue": "something that could happen or could have happened",
        "prompt": "The letter made him think about another ____.",
        "distractors": [
          "umbrella",
          "drawer",
          "corner"
        ]
      },
      {
        "term": "condition",
        "clue": "something that must be true before another thing happens",
        "prompt": "The sentence begins with an if ____.",
        "distractors": [
          "apology",
          "storm",
          "window"
        ]
      },
      {
        "term": "result",
        "clue": "what happens because of a condition",
        "prompt": "The second part of the sentence shows the ____.",
        "distractors": [
          "envelope",
          "silence",
          "handwriting"
        ]
      },
      {
        "term": "apology",
        "clue": "words that show you are sorry",
        "prompt": "The short note sounded like an ____.",
        "distractors": [
          "argument",
          "bus stop",
          "chapter"
        ]
      },
      {
        "term": "pick up",
        "clue": "to answer or lift something",
        "prompt": "If he had ____ the phone, the night might have changed.",
        "distractors": [
          "missed out",
          "written down",
          "looked after"
        ]
      },
      {
        "term": "miss the chance",
        "clue": "to lose an opportunity",
        "prompt": "He realized he had ____ to speak honestly.",
        "distractors": [
          "caught the train",
          "opened the window",
          "paid the bill"
        ]
      },
      {
        "term": "make amends",
        "clue": "to repair harm or apologize",
        "prompt": "She wanted to ____ after years of silence.",
        "distractors": [
          "make a sandwich",
          "make the weather",
          "make a ticket"
        ]
      },
      {
        "term": "turn back time",
        "clue": "to return to the past, usually impossible",
        "prompt": "He wished he could ____.",
        "distractors": [
          "turn off water",
          "turn up late",
          "turn down music"
        ]
      },
      {
        "term": "second chance",
        "clue": "another opportunity to do something better",
        "prompt": "The letter made him hope for a ____.",
        "distractors": [
          "shopping list",
          "front door",
          "short ladder"
        ]
      }
    ],
    "grammar": [
      {
        "prompt": "If I _____ harder, I would have passed the test.",
        "answer": "had studied",
        "options": [
          "had studied",
          "studied",
          "would study",
          "have studied"
        ],
        "fullSentence": "If I had studied harder, I would have passed the test.",
        "correction": {
          "wrongSentence": "If I studied harder, I would have passed the test.",
          "correctSentence": "If I had studied harder, I would have passed the test.",
          "options": [
            "If I had studied harder, I would have passed the test.",
            "If I studied harder, I would have passed the test.",
            "If I would study harder, I would have passed the test.",
            "If I have studied harder, I would have passed the test."
          ]
        }
      },
      {
        "prompt": "If she had called, I _____ answered.",
        "answer": "would have",
        "options": [
          "would have",
          "will have",
          "would",
          "had"
        ],
        "fullSentence": "If she had called, I would have answered.",
        "correction": {
          "wrongSentence": "If she had called, I would answered.",
          "correctSentence": "If she had called, I would have answered.",
          "options": [
            "If she had called, I would have answered.",
            "If she had called, I would answered.",
            "If she called, I would have answered.",
            "If she had call, I would have answered."
          ]
        }
      },
      {
        "prompt": "If they had left earlier, they _____ missed the train.",
        "answer": "wouldn't have",
        "options": [
          "wouldn't have",
          "won't have",
          "didn't",
          "hadn't"
        ],
        "fullSentence": "If they had left earlier, they wouldn't have missed the train.",
        "correction": {
          "wrongSentence": "If they had left earlier, they wouldn't missed the train.",
          "correctSentence": "If they had left earlier, they wouldn't have missed the train.",
          "options": [
            "If they had left earlier, they wouldn't have missed the train.",
            "If they had left earlier, they wouldn't missed the train.",
            "If they left earlier, they wouldn't have missed the train.",
            "If they had leave earlier, they wouldn't have missed the train."
          ]
        }
      },
      {
        "prompt": "If he _____ to the instructions, he would have avoided the mistake.",
        "answer": "had listened",
        "options": [
          "had listened",
          "listened",
          "would listen",
          "has listened"
        ],
        "fullSentence": "If he had listened to the instructions, he would have avoided the mistake.",
        "correction": {
          "wrongSentence": "If he would have listened to the instructions, he would have avoided the mistake.",
          "correctSentence": "If he had listened to the instructions, he would have avoided the mistake.",
          "options": [
            "If he had listened to the instructions, he would have avoided the mistake.",
            "If he would have listened to the instructions, he would have avoided the mistake.",
            "If he listened to the instructions, he would have avoided the mistake.",
            "If he had listen to the instructions, he would have avoided the mistake."
          ]
        }
      },
      {
        "prompt": "If only I _____ the phone that night.",
        "answer": "had answered",
        "options": [
          "had answered",
          "answered",
          "would answer",
          "have answered"
        ],
        "fullSentence": "If only I had answered the phone that night.",
        "correction": {
          "wrongSentence": "If only I answered the phone that night.",
          "correctSentence": "If only I had answered the phone that night.",
          "options": [
            "If only I had answered the phone that night.",
            "If only I answered the phone that night.",
            "If only I would answer the phone that night.",
            "If only I have answered the phone that night."
          ]
        }
      },
      {
        "prompt": "If we had brought a map, we _____ gotten lost.",
        "answer": "wouldn't have",
        "options": [
          "wouldn't have",
          "won't have",
          "didn't",
          "hadn't"
        ],
        "fullSentence": "If we had brought a map, we wouldn't have gotten lost."
      },
      {
        "prompt": "If you had told me the truth, I _____ understood the situation.",
        "answer": "would have",
        "options": [
          "would have",
          "will have",
          "had",
          "would"
        ],
        "fullSentence": "If you had told me the truth, I would have understood the situation."
      },
      {
        "prompt": "If it _____ rained, we would have had the picnic.",
        "answer": "hadn't",
        "options": [
          "hadn't",
          "didn't",
          "wouldn't",
          "hasn't"
        ],
        "fullSentence": "If it hadn't rained, we would have had the picnic."
      },
      {
        "prompt": "She would have stayed if he _____ apologized.",
        "answer": "had",
        "options": [
          "had",
          "has",
          "would",
          "did"
        ],
        "fullSentence": "She would have stayed if he had apologized."
      },
      {
        "prompt": "They _____ won if they had trained more.",
        "answer": "would have",
        "options": [
          "would have",
          "will have",
          "had",
          "would"
        ],
        "fullSentence": "They would have won if they had trained more."
      }
    ],
    "listening": [
      {
        "sentence": "If I had studied harder, I would have passed the test.",
        "focusQuestion": "What condition is mentioned?",
        "focusAnswer": "studying harder",
        "focusDistractors": [
          "leaving earlier",
          "calling later",
          "buying tickets"
        ],
        "meaningQuestion": "Is this about a real past or an imagined past?",
        "meaningAnswer": "an imagined past",
        "meaningDistractors": [
          "a real future",
          "a daily habit",
          "a command"
        ]
      },
      {
        "sentence": "If she had called, I would have answered.",
        "focusQuestion": "What would the speaker have done?",
        "focusAnswer": "answered",
        "focusDistractors": [
          "waited",
          "traveled",
          "forgotten"
        ],
        "meaningQuestion": "What structure do you hear?",
        "meaningAnswer": "third conditional",
        "meaningDistractors": [
          "first conditional",
          "present perfect",
          "passive voice"
        ]
      },
      {
        "sentence": "If they had left earlier, they wouldn't have missed the train.",
        "focusQuestion": "What did they miss?",
        "focusAnswer": "the train",
        "focusDistractors": [
          "the phone",
          "the exam",
          "the letter"
        ],
        "meaningQuestion": "What feeling can this sentence express?",
        "meaningAnswer": "regret",
        "meaningDistractors": [
          "permission",
          "ability",
          "comparison"
        ]
      },
      {
        "sentence": "If only I had answered the phone that night.",
        "focusQuestion": "What does the speaker regret?",
        "focusAnswer": "not answering the phone",
        "focusDistractors": [
          "not buying a book",
          "not taking a bus",
          "not cooking dinner"
        ],
        "meaningQuestion": "What does if only often express?",
        "meaningAnswer": "strong regret",
        "meaningDistractors": [
          "a simple direction",
          "a shopping habit",
          "a neutral fact"
        ]
      },
      {
        "sentence": "They would have won if they had trained more.",
        "focusQuestion": "What result is imagined?",
        "focusAnswer": "they would have won",
        "focusDistractors": [
          "they would have slept",
          "they would have left",
          "they would have paid"
        ],
        "meaningQuestion": "What was missing in the past?",
        "meaningAnswer": "more training",
        "meaningDistractors": [
          "more rain",
          "more noise",
          "more coffee"
        ]
      }
    ],
    "speakingPrompts": [
      {
        "prompt": "Say one third conditional sentence about studying.",
        "answer": "If I had studied harder, I would have passed the test."
      },
      {
        "prompt": "Say one sentence with if only about a missed chance.",
        "answer": "If only I had answered the phone that night."
      },
      {
        "prompt": "Say one negative third conditional sentence.",
        "answer": "If they had left earlier, they wouldn't have missed the train."
      },
      {
        "prompt": "Say one regret about advice.",
        "answer": "If he had listened to the instructions, he would have avoided the mistake."
      },
      {
        "prompt": "Say one sentence about a different result in the past.",
        "answer": "They would have won if they had trained more."
      }
    ],
    "writing": [
      {
        "display": "If I _____ harder, I would have passed the test.",
        "audio": "If I had studied harder, I would have passed the test.",
        "correct": "had studied"
      },
      {
        "display": "If she had called, I _____ answered.",
        "audio": "If she had called, I would have answered.",
        "correct": "would have"
      },
      {
        "display": "If they had left earlier, they _____ missed the train.",
        "audio": "If they had left earlier, they wouldn't have missed the train.",
        "correct": "wouldn't have"
      },
      {
        "display": "If only I _____ the phone that night.",
        "audio": "If only I had answered the phone that night.",
        "correct": "had answered"
      },
      {
        "display": "They _____ won if they had trained more.",
        "audio": "They would have won if they had trained more.",
        "correct": "would have"
      }
    ],
    "facts": [
      {
        "passage": "Daniel ignored an important phone call after an argument. Years later, he received a note that made him think about what might have happened if he had answered.",
        "question": "What did Daniel ignore?",
        "answer": "He ignored an important phone call.",
        "distractors": [
          "He ignored a math test.",
          "He ignored a shopping list.",
          "He ignored a bus ticket."
        ],
        "detailQuestion": "What did the note make him think about?",
        "detailAnswer": "It made him think about what might have happened if he had answered.",
        "detailDistractors": [
          "It made him think about buying a car.",
          "It made him think about cleaning a room.",
          "It made him think about a recipe."
        ],
        "vocabQuestion": "Which word describes his feeling?",
        "vocabAnswer": "regret",
        "vocabDistractors": [
          "celebration",
          "permission",
          "routine"
        ]
      },
      {
        "passage": "Maria missed the scholarship deadline because she did not check her email. If she had checked it earlier, she would have sent the documents on time.",
        "question": "Why did Maria miss the deadline?",
        "answer": "Because she did not check her email.",
        "distractors": [
          "Because she lost her keys.",
          "Because she moved abroad.",
          "Because she forgot her lunch."
        ],
        "detailQuestion": "What would she have done if she had checked earlier?",
        "detailAnswer": "She would have sent the documents on time.",
        "detailDistractors": [
          "She would have sold the documents.",
          "She would have printed a poster.",
          "She would have canceled the class."
        ],
        "vocabQuestion": "What does deadline mean?",
        "vocabAnswer": "the latest time something must be finished",
        "vocabDistractors": [
          "a kind of weather",
          "a school subject",
          "a quiet room"
        ]
      },
      {
        "passage": "Ethan trained only twice before the race and finished last. His coach told him that he might have done better if he had practiced consistently.",
        "question": "How often did Ethan train before the race?",
        "answer": "Only twice.",
        "distractors": [
          "Every day.",
          "For ten years.",
          "Never in his life."
        ],
        "detailQuestion": "What did the coach say?",
        "detailAnswer": "He might have done better if he had practiced consistently.",
        "detailDistractors": [
          "He might have slept longer if he had eaten more.",
          "He might have painted faster if he had run.",
          "He might have traveled if he had cleaned."
        ],
        "vocabQuestion": "What does consistently mean?",
        "vocabAnswer": "regularly and steadily",
        "vocabDistractors": [
          "silently and secretly",
          "quickly and angrily",
          "rarely and carelessly"
        ]
      },
      {
        "passage": "A family got lost in the mountains because they forgot the map. If they had brought it, they would have found the trail before sunset.",
        "question": "Why did the family get lost?",
        "answer": "Because they forgot the map.",
        "distractors": [
          "Because they forgot the picnic.",
          "Because they lost the radio.",
          "Because they sold the car."
        ],
        "detailQuestion": "What would have helped them find the trail?",
        "detailAnswer": "A map would have helped them.",
        "detailDistractors": [
          "A cake would have helped them.",
          "A window would have helped them.",
          "A shirt would have helped them."
        ],
        "vocabQuestion": "What is a trail?",
        "vocabAnswer": "a path through a natural area",
        "vocabDistractors": [
          "a kind of phone",
          "a loud machine",
          "a formal letter"
        ]
      },
      {
        "passage": "Grace apologized months after a painful disagreement. Her friend said that if Grace had spoken sooner, their friendship might have healed more quickly.",
        "question": "What did Grace do months later?",
        "answer": "She apologized.",
        "distractors": [
          "She bought a farm.",
          "She changed schools.",
          "She opened a store."
        ],
        "detailQuestion": "What might have happened if she had spoken sooner?",
        "detailAnswer": "Their friendship might have healed more quickly.",
        "detailDistractors": [
          "Their car might have broken.",
          "Their house might have grown.",
          "Their meal might have burned."
        ],
        "vocabQuestion": "What does healed mean here?",
        "vocabAnswer": "became better after pain",
        "vocabDistractors": [
          "became more expensive",
          "became more colorful",
          "became much louder"
        ]
      }
    ]
  },
  {
    "number": 86,
    "title": "Lesson 86: I Wish Things Were Different",
    "vocab": [
      {
        "term": "wish",
        "clue": "to want reality to be different",
        "prompt": "I ____ I were more confident.",
        "distractors": [
          "warn",
          "borrow",
          "repair"
        ]
      },
      {
        "term": "if only",
        "clue": "a phrase used for strong wishes or regrets",
        "prompt": "____ we lived closer to our family.",
        "distractors": [
          "Even so",
          "Due to",
          "For sure"
        ]
      },
      {
        "term": "present regret",
        "clue": "sadness about a situation that is true now",
        "prompt": "Not knowing how to drive is a ____.",
        "distractors": [
          "ticket counter",
          "garden tool",
          "future habit"
        ]
      },
      {
        "term": "past regret",
        "clue": "sadness about something that happened before now",
        "prompt": "Losing the letter became a ____.",
        "distractors": [
          "present plan",
          "quiet dish",
          "clear sign"
        ]
      },
      {
        "term": "confidence",
        "clue": "the feeling that you can do something well",
        "prompt": "She wishes she had more ____ in meetings.",
        "distractors": [
          "traffic",
          "laundry",
          "shelf"
        ]
      },
      {
        "term": "reconnect",
        "clue": "to contact someone again after time apart",
        "prompt": "Elena wanted to ____ with an old friend.",
        "distractors": [
          "pay attention",
          "cut down",
          "turn off"
        ]
      },
      {
        "term": "swallow pride",
        "clue": "to stop being proud and apologize",
        "prompt": "He needed to ____ after the argument.",
        "distractors": [
          "swallow water",
          "catch a bus",
          "open a window"
        ]
      },
      {
        "term": "reach out",
        "clue": "to contact someone to offer or ask for connection",
        "prompt": "She decided to ____ after years of silence.",
        "distractors": [
          "run out",
          "look down",
          "turn back"
        ]
      },
      {
        "term": "fear of rejection",
        "clue": "worry that someone will not accept you",
        "prompt": "Her ____ kept her from sending the message.",
        "distractors": [
          "map of Spain",
          "morning routine",
          "bank account"
        ]
      },
      {
        "term": "make peace",
        "clue": "to end conflict or accept a situation",
        "prompt": "They hoped to ____ after the misunderstanding.",
        "distractors": [
          "make bread",
          "make noise",
          "make a poster"
        ]
      }
    ],
    "grammar": [
      {
        "prompt": "I wish I _____ how to play the guitar.",
        "answer": "knew",
        "options": [
          "knew",
          "know",
          "had known",
          "would know"
        ],
        "fullSentence": "I wish I knew how to play the guitar.",
        "correction": {
          "wrongSentence": "I wish I know how to play the guitar.",
          "correctSentence": "I wish I knew how to play the guitar.",
          "options": [
            "I wish I knew how to play the guitar.",
            "I wish I know how to play the guitar.",
            "I wish I had knew how to play the guitar.",
            "I wish I would know how to play the guitar."
          ]
        }
      },
      {
        "prompt": "If only she _____ closer.",
        "answer": "lived",
        "options": [
          "lived",
          "lives",
          "had lived",
          "would live"
        ],
        "fullSentence": "If only she lived closer.",
        "correction": {
          "wrongSentence": "If only she lives closer.",
          "correctSentence": "If only she lived closer.",
          "options": [
            "If only she lived closer.",
            "If only she lives closer.",
            "If only she had lived closer now.",
            "If only she would lives closer."
          ]
        }
      },
      {
        "prompt": "I wish I _____ studied harder for the test.",
        "answer": "had",
        "options": [
          "had",
          "have",
          "would",
          "did"
        ],
        "fullSentence": "I wish I had studied harder for the test.",
        "correction": {
          "wrongSentence": "I wish I studied harder for the test yesterday.",
          "correctSentence": "I wish I had studied harder for the test.",
          "options": [
            "I wish I had studied harder for the test.",
            "I wish I studied harder for the test yesterday.",
            "I wish I have studied harder for the test.",
            "I wish I would studied harder for the test."
          ]
        }
      },
      {
        "prompt": "If only we _____ left earlier, we wouldn't have missed the train.",
        "answer": "had",
        "options": [
          "had",
          "have",
          "would",
          "did"
        ],
        "fullSentence": "If only we had left earlier, we wouldn't have missed the train.",
        "correction": {
          "wrongSentence": "If only we left earlier, we wouldn't have missed the train.",
          "correctSentence": "If only we had left earlier, we wouldn't have missed the train.",
          "options": [
            "If only we had left earlier, we wouldn't have missed the train.",
            "If only we left earlier, we wouldn't have missed the train.",
            "If only we have left earlier, we wouldn't have missed the train.",
            "If only we would left earlier, we wouldn't have missed the train."
          ]
        }
      },
      {
        "prompt": "I wish it _____ raining right now.",
        "answer": "weren't",
        "options": [
          "weren't",
          "isn't",
          "wasn't",
          "hadn't"
        ],
        "fullSentence": "I wish it weren't raining right now.",
        "correction": {
          "wrongSentence": "I wish it isn't raining right now.",
          "correctSentence": "I wish it weren't raining right now.",
          "options": [
            "I wish it weren't raining right now.",
            "I wish it isn't raining right now.",
            "I wish it hadn't raining right now.",
            "I wish it doesn't rain right now."
          ]
        },
        "accepted": [
          "were not"
        ]
      },
      {
        "prompt": "She wishes she _____ more confident in meetings.",
        "answer": "were",
        "options": [
          "were",
          "is",
          "had been",
          "would be"
        ],
        "fullSentence": "She wishes she were more confident in meetings."
      },
      {
        "prompt": "I wish I _____ lost my phone yesterday.",
        "answer": "hadn't",
        "options": [
          "hadn't",
          "didn't",
          "wouldn't",
          "haven't"
        ],
        "fullSentence": "I wish I hadn't lost my phone yesterday."
      },
      {
        "prompt": "They wish they _____ tickets earlier.",
        "answer": "had bought",
        "options": [
          "had bought",
          "bought",
          "would buy",
          "have bought"
        ],
        "fullSentence": "They wish they had bought tickets earlier."
      },
      {
        "prompt": "If only you _____ me the truth.",
        "answer": "had told",
        "options": [
          "had told",
          "told",
          "would tell",
          "have told"
        ],
        "fullSentence": "If only you had told me the truth."
      },
      {
        "prompt": "I wish we _____ more photos on our trip.",
        "answer": "had taken",
        "options": [
          "had taken",
          "took",
          "would take",
          "have taken"
        ],
        "fullSentence": "I wish we had taken more photos on our trip."
      }
    ],
    "listening": [
      {
        "sentence": "I wish I knew how to play the guitar.",
        "focusQuestion": "What does the speaker wish?",
        "focusAnswer": "to know how to play the guitar",
        "focusDistractors": [
          "to buy a guitar",
          "to sell a piano",
          "to teach math"
        ],
        "meaningQuestion": "Is this a present or past regret?",
        "meaningAnswer": "present regret",
        "meaningDistractors": [
          "past regret",
          "future plan",
          "reported question"
        ]
      },
      {
        "sentence": "If only she lived closer.",
        "focusQuestion": "What situation does the speaker want to be different?",
        "focusAnswer": "she does not live close",
        "focusDistractors": [
          "she does not study",
          "she did not call",
          "she did not travel"
        ],
        "meaningQuestion": "Which tense follows if only for present regret?",
        "meaningAnswer": "past simple",
        "meaningDistractors": [
          "present simple",
          "future perfect",
          "passive voice"
        ]
      },
      {
        "sentence": "I wish I had studied harder for the test.",
        "focusQuestion": "What does the speaker regret?",
        "focusAnswer": "not studying harder",
        "focusDistractors": [
          "not going shopping",
          "not drinking water",
          "not leaving home"
        ],
        "meaningQuestion": "Which tense follows wish for past regret?",
        "meaningAnswer": "past perfect",
        "meaningDistractors": [
          "present continuous",
          "simple future",
          "imperative"
        ]
      },
      {
        "sentence": "If only we had left earlier, we wouldn't have missed the train.",
        "focusQuestion": "What did they miss?",
        "focusAnswer": "the train",
        "focusDistractors": [
          "the concert",
          "the meeting",
          "the message"
        ],
        "meaningQuestion": "Is the event changeable now?",
        "meaningAnswer": "no",
        "meaningDistractors": [
          "yes",
          "only in the future",
          "only by a rule"
        ]
      },
      {
        "sentence": "I wish it weren't raining right now.",
        "focusQuestion": "What is happening now?",
        "focusAnswer": "it is raining",
        "focusDistractors": [
          "it is snowing",
          "it is sunny",
          "it is dark inside"
        ],
        "meaningQuestion": "What form of be is used in this wish?",
        "meaningAnswer": "were",
        "meaningDistractors": [
          "is",
          "are",
          "has"
        ]
      }
    ],
    "speakingPrompts": [
      {
        "prompt": "Make one present regret with I wish.",
        "answer": "I wish I knew how to play the guitar."
      },
      {
        "prompt": "Make one present regret with if only.",
        "answer": "If only she lived closer."
      },
      {
        "prompt": "Make one past regret with I wish.",
        "answer": "I wish I had studied harder for the test."
      },
      {
        "prompt": "Make one past regret with if only.",
        "answer": "If only we had left earlier."
      },
      {
        "prompt": "Say one wish about confidence.",
        "answer": "I wish I were more confident in meetings."
      }
    ],
    "writing": [
      {
        "display": "I wish I _____ how to play the guitar.",
        "audio": "I wish I knew how to play the guitar.",
        "correct": "knew"
      },
      {
        "display": "If only she _____ closer.",
        "audio": "If only she lived closer.",
        "correct": "lived"
      },
      {
        "display": "I wish I _____ studied harder for the test.",
        "audio": "I wish I had studied harder for the test.",
        "correct": "had"
      },
      {
        "display": "If only we _____ left earlier.",
        "audio": "If only we had left earlier.",
        "correct": "had"
      },
      {
        "display": "I wish it _____ raining right now.",
        "audio": "I wish it weren't raining right now.",
        "correct": "weren't",
        "accepted": [
          "were not"
        ]
      }
    ],
    "facts": [
      {
        "passage": "Elena found an old photograph of her friend Sofia. She wished she had apologized years earlier and wondered whether their friendship could still be restored.",
        "question": "What did Elena find?",
        "answer": "She found an old photograph of Sofia.",
        "distractors": [
          "She found a new passport.",
          "She found a broken phone.",
          "She found a restaurant menu."
        ],
        "detailQuestion": "What did she wish she had done earlier?",
        "detailAnswer": "She wished she had apologized.",
        "detailDistractors": [
          "She wished she had bought a car.",
          "She wished she had cleaned the beach.",
          "She wished she had closed the store."
        ],
        "vocabQuestion": "What does restored mean?",
        "vocabAnswer": "brought back or repaired",
        "vocabDistractors": [
          "made more expensive",
          "hidden quickly",
          "sold cheaply"
        ]
      },
      {
        "passage": "Ben canceled an interview because he was nervous. Later, he said he wished he had gone and that he wished he were more organized.",
        "question": "Why did Ben cancel the interview?",
        "answer": "Because he was nervous.",
        "distractors": [
          "Because he was sick.",
          "Because the office burned.",
          "Because he was traveling."
        ],
        "detailQuestion": "What past regret did he express?",
        "detailAnswer": "He wished he had gone to the interview.",
        "detailDistractors": [
          "He wished he had eaten lunch.",
          "He wished he had written a song.",
          "He wished he had bought shoes."
        ],
        "vocabQuestion": "What present wish did he express?",
        "vocabAnswer": "He wished he were more organized.",
        "vocabDistractors": [
          "He wished he were taller than a tree.",
          "He wished he were at the station.",
          "He wished he were a doctor already."
        ]
      },
      {
        "passage": "After moving to another city, Ana often wished she lived closer to her parents. She also wished she had visited them more before she moved.",
        "question": "Where did Ana move?",
        "answer": "She moved to another city.",
        "distractors": [
          "She moved to another country only.",
          "She moved to a farm.",
          "She moved to a hotel."
        ],
        "detailQuestion": "What present situation does she wish were different?",
        "detailAnswer": "She wishes she lived closer to her parents.",
        "detailDistractors": [
          "She wishes she drove faster.",
          "She wishes she spoke louder.",
          "She wishes she slept less."
        ],
        "vocabQuestion": "What past regret does she have?",
        "vocabAnswer": "She wishes she had visited them more.",
        "vocabDistractors": [
          "She wishes she had painted them.",
          "She wishes she had called the train.",
          "She wishes she had sold the house."
        ]
      },
      {
        "passage": "Carlos lost his phone during a trip. Now he wishes he had taken more photos and kept his bag closed.",
        "question": "What did Carlos lose?",
        "answer": "He lost his phone.",
        "distractors": [
          "He lost his ticket.",
          "He lost his jacket.",
          "He lost his watch."
        ],
        "detailQuestion": "What does he wish he had taken?",
        "detailAnswer": "More photos.",
        "detailDistractors": [
          "More buses.",
          "More letters.",
          "More chairs."
        ],
        "vocabQuestion": "What should he have kept closed?",
        "vocabAnswer": "his bag",
        "vocabDistractors": [
          "his school",
          "his kitchen",
          "his email"
        ]
      },
      {
        "passage": "Mia wanted to reconnect with a cousin, but fear of rejection kept her silent. She wished she were braver and had sent a message sooner.",
        "question": "Why did Mia remain silent?",
        "answer": "Because of fear of rejection.",
        "distractors": [
          "Because of heavy traffic.",
          "Because of a broken chair.",
          "Because of bad weather."
        ],
        "detailQuestion": "What present wish did she have?",
        "detailAnswer": "She wished she were braver.",
        "detailDistractors": [
          "She wished she were colder.",
          "She wished she were quieter only.",
          "She wished she were late."
        ],
        "vocabQuestion": "What past action did she regret not doing?",
        "vocabAnswer": "sending a message sooner",
        "vocabDistractors": [
          "buying a house sooner",
          "learning to cook sooner",
          "fixing the road sooner"
        ]
      }
    ]
  },
  {
    "number": 87,
    "title": "Lesson 87: He Said He Might Come Later",
    "vocab": [
      {
        "term": "reported speech",
        "clue": "saying what someone said without exact quotation",
        "prompt": "We use ____ to repeat someone's message indirectly.",
        "distractors": [
          "compound adjective",
          "city life",
          "daily routine"
        ]
      },
      {
        "term": "direct speech",
        "clue": "the exact words someone said",
        "prompt": "Quotation marks usually show ____.",
        "distractors": [
          "relative clause",
          "past regret",
          "soft opinion"
        ]
      },
      {
        "term": "statement",
        "clue": "a sentence that gives information",
        "prompt": "She said she was tired is a reported ____.",
        "distractors": [
          "command",
          "drawer",
          "noise"
        ]
      },
      {
        "term": "question",
        "clue": "a sentence that asks for information",
        "prompt": "He asked if I was coming is a reported ____.",
        "distractors": [
          "article",
          "habit",
          "wallet"
        ]
      },
      {
        "term": "command",
        "clue": "an instruction telling someone what to do",
        "prompt": "Close the door is a ____.",
        "distractors": [
          "preference",
          "summary",
          "journey"
        ]
      },
      {
        "term": "time shift",
        "clue": "a change from now to then or tomorrow to the next day",
        "prompt": "Reported speech often needs a ____.",
        "distractors": [
          "sound effect",
          "shopping list",
          "green light"
        ]
      },
      {
        "term": "tense shift",
        "clue": "a change such as am to was or will to would",
        "prompt": "Present to past is a ____.",
        "distractors": [
          "polite greeting",
          "strict warning",
          "quiet lunch"
        ]
      },
      {
        "term": "ask if",
        "clue": "to report a yes/no question",
        "prompt": "He asked ____ I was ready.",
        "distractors": [
          "that",
          "who",
          "where"
        ]
      },
      {
        "term": "tell someone to",
        "clue": "to report a command or request",
        "prompt": "She told me ____ wait there.",
        "distractors": [
          "if",
          "that",
          "what"
        ]
      },
      {
        "term": "not to",
        "clue": "used in negative reported commands",
        "prompt": "He told us ____ leave early.",
        "distractors": [
          "that",
          "whether",
          "where"
        ]
      }
    ],
    "grammar": [
      {
        "prompt": "She said that she _____ tired.",
        "answer": "was",
        "options": [
          "was",
          "is",
          "be",
          "were"
        ],
        "fullSentence": "She said that she was tired.",
        "correction": {
          "wrongSentence": "She said that she is tired.",
          "correctSentence": "She said that she was tired.",
          "options": [
            "She said that she was tired.",
            "She said that she is tired.",
            "She said that she be tired.",
            "She said that she were tired."
          ]
        }
      },
      {
        "prompt": "He said he _____ come later.",
        "answer": "would",
        "options": [
          "would",
          "will",
          "has",
          "did"
        ],
        "fullSentence": "He said he would come later.",
        "correction": {
          "wrongSentence": "He said he will come later.",
          "correctSentence": "He said he would come later.",
          "options": [
            "He said he would come later.",
            "He said he will come later.",
            "He said he come later.",
            "He said he had come later tomorrow."
          ]
        }
      },
      {
        "prompt": "She asked if I _____ coming.",
        "answer": "was",
        "options": [
          "was",
          "am",
          "were",
          "be"
        ],
        "fullSentence": "She asked if I was coming.",
        "correction": {
          "wrongSentence": "She asked if was I coming.",
          "correctSentence": "She asked if I was coming.",
          "options": [
            "She asked if I was coming.",
            "She asked if was I coming.",
            "She asked if am I coming.",
            "She asked if I be coming."
          ]
        }
      },
      {
        "prompt": "He asked where I _____.",
        "answer": "lived",
        "options": [
          "lived",
          "live",
          "living",
          "had live"
        ],
        "fullSentence": "He asked where I lived.",
        "correction": {
          "wrongSentence": "He asked where did I live.",
          "correctSentence": "He asked where I lived.",
          "options": [
            "He asked where I lived.",
            "He asked where did I live.",
            "He asked where I live yesterday.",
            "He asked where I living."
          ]
        }
      },
      {
        "prompt": "She told me _____ the door.",
        "answer": "to close",
        "options": [
          "to close",
          "close",
          "closing",
          "closed"
        ],
        "fullSentence": "She told me to close the door.",
        "correction": {
          "wrongSentence": "She told me close the door.",
          "correctSentence": "She told me to close the door.",
          "options": [
            "She told me to close the door.",
            "She told me close the door.",
            "She told me closing the door.",
            "She told me closed the door."
          ]
        }
      },
      {
        "prompt": "He told me _____ leave.",
        "answer": "not to",
        "options": [
          "not to",
          "don't",
          "not",
          "to not"
        ],
        "fullSentence": "He told me not to leave."
      },
      {
        "prompt": "Anna said she _____ already finished the report.",
        "answer": "had",
        "options": [
          "had",
          "has",
          "have",
          "did"
        ],
        "fullSentence": "Anna said she had already finished the report."
      },
      {
        "prompt": "They asked whether we _____ help them.",
        "answer": "could",
        "options": [
          "could",
          "can",
          "will",
          "have"
        ],
        "fullSentence": "They asked whether we could help them."
      },
      {
        "prompt": "Julia said she _____ going to the bookstore.",
        "answer": "was",
        "options": [
          "was",
          "is",
          "were",
          "be"
        ],
        "fullSentence": "Julia said she was going to the bookstore."
      },
      {
        "prompt": "Mark asked what time it _____.",
        "answer": "was",
        "options": [
          "was",
          "is",
          "were",
          "be"
        ],
        "fullSentence": "Mark asked what time it was."
      }
    ],
    "listening": [
      {
        "sentence": "She said that she was tired.",
        "focusQuestion": "What did she say?",
        "focusAnswer": "she was tired",
        "focusDistractors": [
          "she was hungry",
          "she was late",
          "she was ready"
        ],
        "meaningQuestion": "What changed from direct speech?",
        "meaningAnswer": "is became was",
        "meaningDistractors": [
          "is became will",
          "tired became tiring",
          "she became they"
        ]
      },
      {
        "sentence": "He said he would come later.",
        "focusQuestion": "What did he say he would do?",
        "focusAnswer": "come later",
        "focusDistractors": [
          "leave early",
          "call now",
          "buy bread"
        ],
        "meaningQuestion": "What does will often become in reported speech?",
        "meaningAnswer": "would",
        "meaningDistractors": [
          "should",
          "did",
          "has"
        ]
      },
      {
        "sentence": "She asked if I was coming.",
        "focusQuestion": "What kind of question is reported?",
        "focusAnswer": "a yes/no question",
        "focusDistractors": [
          "a command",
          "a comparison",
          "a present regret"
        ],
        "meaningQuestion": "Which word introduces the reported question?",
        "meaningAnswer": "if",
        "meaningDistractors": [
          "that",
          "to",
          "because"
        ]
      },
      {
        "sentence": "He asked where I lived.",
        "focusQuestion": "What did he ask about?",
        "focusAnswer": "where I lived",
        "focusDistractors": [
          "what I ate",
          "when I left",
          "who I called"
        ],
        "meaningQuestion": "Is the reported question in question order?",
        "meaningAnswer": "no",
        "meaningDistractors": [
          "yes",
          "only sometimes",
          "only with will"
        ]
      },
      {
        "sentence": "She told me to close the door.",
        "focusQuestion": "What did she tell the speaker to do?",
        "focusAnswer": "close the door",
        "focusDistractors": [
          "open the book",
          "call a friend",
          "write a letter"
        ],
        "meaningQuestion": "What structure reports a command?",
        "meaningAnswer": "tell someone to",
        "meaningDistractors": [
          "ask if",
          "would rather",
          "not only"
        ]
      }
    ],
    "speakingPrompts": [
      {
        "prompt": "Report this: I am tired.",
        "answer": "She said that she was tired."
      },
      {
        "prompt": "Report this: I will come later.",
        "answer": "He said he would come later."
      },
      {
        "prompt": "Report this yes/no question: Are you coming?",
        "answer": "She asked if I was coming."
      },
      {
        "prompt": "Report this wh-question: Where do you live?",
        "answer": "He asked where I lived."
      },
      {
        "prompt": "Report this command: Close the door.",
        "answer": "She told me to close the door."
      }
    ],
    "writing": [
      {
        "display": "She said that she _____ tired.",
        "audio": "She said that she was tired.",
        "correct": "was"
      },
      {
        "display": "He said he _____ come later.",
        "audio": "He said he would come later.",
        "correct": "would"
      },
      {
        "display": "She asked if I _____ coming.",
        "audio": "She asked if I was coming.",
        "correct": "was"
      },
      {
        "display": "He asked where I _____.",
        "audio": "He asked where I lived.",
        "correct": "lived"
      },
      {
        "display": "She told me _____ the door.",
        "audio": "She told me to close the door.",
        "correct": "to close"
      }
    ],
    "facts": [
      {
        "passage": "Emma told Tom that she was going to Paris the next month. She said she would visit museums and try local food.",
        "question": "Where was Emma going?",
        "answer": "She was going to Paris.",
        "distractors": [
          "She was going to Madrid.",
          "She was going to Rome.",
          "She was going to Lisbon."
        ],
        "detailQuestion": "What did she say she would visit?",
        "detailAnswer": "museums",
        "detailDistractors": [
          "airports",
          "farms",
          "schools"
        ],
        "vocabQuestion": "What phrase reports her words indirectly?",
        "vocabAnswer": "she said she would",
        "vocabDistractors": [
          "she asked to",
          "she rather went",
          "she had better"
        ]
      },
      {
        "passage": "Lucas asked Emma what else she was planning to do. She replied that she had told her friends she would explore Montmartre.",
        "question": "What did Lucas ask about?",
        "answer": "He asked what else she was planning to do.",
        "distractors": [
          "He asked what she wanted to sell.",
          "He asked where the bus was.",
          "He asked why she was angry."
        ],
        "detailQuestion": "What had she told her friends?",
        "detailAnswer": "She had told them she would explore Montmartre.",
        "detailDistractors": [
          "She had told them she would cancel the trip.",
          "She had told them she would buy a house.",
          "She had told them she would paint the cafe."
        ],
        "vocabQuestion": "What is explore?",
        "vocabAnswer": "to travel through and learn about a place",
        "vocabDistractors": [
          "to hide from someone",
          "to repair an object",
          "to repeat a sentence"
        ]
      },
      {
        "passage": "Anna said Julia was going to the bookstore because she needed a grammar book. Mark asked when Julia would be back.",
        "question": "Where was Julia going?",
        "answer": "She was going to the bookstore.",
        "distractors": [
          "She was going to the bakery.",
          "She was going to the station.",
          "She was going to the church."
        ],
        "detailQuestion": "What did Mark ask?",
        "detailAnswer": "He asked when Julia would be back.",
        "detailDistractors": [
          "He asked who closed the door.",
          "He asked why Anna sang.",
          "He asked if the book was blue."
        ],
        "vocabQuestion": "Which tense appears in would be back?",
        "vocabAnswer": "reported future",
        "vocabDistractors": [
          "present perfect",
          "simple present",
          "past habit"
        ]
      },
      {
        "passage": "Leo asked if the group was going to the meeting. Mia said they might go later.",
        "question": "What did Leo ask?",
        "answer": "He asked if the group was going to the meeting.",
        "distractors": [
          "He asked if the group was cooking dinner.",
          "He asked if the group was leaving town.",
          "He asked if the group was playing chess."
        ],
        "detailQuestion": "What did Mia say?",
        "detailAnswer": "She said they might go later.",
        "detailDistractors": [
          "She said they had already eaten.",
          "She said they disliked meetings.",
          "She said they were at home."
        ],
        "vocabQuestion": "What does might express?",
        "vocabAnswer": "possibility",
        "vocabDistractors": [
          "certainty",
          "possession",
          "prohibition"
        ]
      },
      {
        "passage": "The teacher said, 'Do not touch that wire.' Later, the report stated that the teacher had told the student not to touch the wire.",
        "question": "What was the direct command?",
        "answer": "Do not touch that wire.",
        "distractors": [
          "Open the window.",
          "Read the story.",
          "Call your mother."
        ],
        "detailQuestion": "How was it reported?",
        "detailAnswer": "The teacher told the student not to touch the wire.",
        "detailDistractors": [
          "The teacher asked if the wire touched.",
          "The teacher said the wire was touching.",
          "The teacher would rather touch the wire."
        ],
        "vocabQuestion": "What phrase reports a negative command?",
        "vocabAnswer": "not to",
        "vocabDistractors": [
          "if to",
          "that not",
          "would to"
        ]
      }
    ]
  },
  {
    "number": 88,
    "title": "Lesson 88: The Man Whose Car Was Stolen",
    "vocab": [
      {
        "term": "whose",
        "clue": "a relative word showing possession",
        "prompt": "I met a student ____ ideas were brilliant.",
        "distractors": [
          "which",
          "where",
          "when"
        ]
      },
      {
        "term": "in which",
        "clue": "a formal phrase meaning in that place or situation",
        "prompt": "This is the room ____ we met.",
        "distractors": [
          "whose",
          "for whom",
          "with which"
        ]
      },
      {
        "term": "for whom",
        "clue": "a formal phrase meaning for that person",
        "prompt": "She is a teacher ____ I have great respect.",
        "distractors": [
          "whose",
          "in which",
          "that"
        ]
      },
      {
        "term": "with which",
        "clue": "a formal phrase meaning with that thing",
        "prompt": "This is the pen ____ he signed the letter.",
        "distractors": [
          "whose",
          "where",
          "when"
        ]
      },
      {
        "term": "admiration",
        "clue": "deep respect or warm approval",
        "prompt": "Lucas had great ____ for Dr. Ellis.",
        "distractors": [
          "shortcut",
          "deadline",
          "traffic"
        ]
      },
      {
        "term": "faculty profile",
        "clue": "an online page describing a professor or department member",
        "prompt": "He found her ____ on the college website.",
        "distractors": [
          "shopping receipt",
          "bus schedule",
          "table cloth"
        ]
      },
      {
        "term": "encouragement",
        "clue": "words or actions that give hope",
        "prompt": "Her ____ helped him continue writing.",
        "distractors": [
          "equipment",
          "argument",
          "shadow"
        ]
      },
      {
        "term": "purpose",
        "clue": "the reason something exists or is done",
        "prompt": "The essay explored the question of ____.",
        "distractors": [
          "pollen",
          "screen",
          "receipt"
        ]
      },
      {
        "term": "properly thank",
        "clue": "to express gratitude in a complete way",
        "prompt": "He had never ____ his professor.",
        "distractors": [
          "borrowed from",
          "run out of",
          "looked down on"
        ]
      },
      {
        "term": "second chances",
        "clue": "new opportunities after failure or regret",
        "prompt": "The teacher believed in ____.",
        "distractors": [
          "loud rooms",
          "dark shoes",
          "fresh towels"
        ]
      }
    ],
    "grammar": [
      {
        "prompt": "She is the teacher _____ encouragement changed my life.",
        "answer": "whose",
        "options": [
          "whose",
          "who",
          "which",
          "where"
        ],
        "fullSentence": "She is the teacher whose encouragement changed my life.",
        "correction": {
          "wrongSentence": "She is the teacher who encouragement changed my life.",
          "correctSentence": "She is the teacher whose encouragement changed my life.",
          "options": [
            "She is the teacher whose encouragement changed my life.",
            "She is the teacher who encouragement changed my life.",
            "She is the teacher which encouragement changed my life.",
            "She is the teacher where encouragement changed my life."
          ]
        }
      },
      {
        "prompt": "This is the book _____ he wrote his notes.",
        "answer": "in which",
        "options": [
          "in which",
          "whose",
          "for whom",
          "with which"
        ],
        "fullSentence": "This is the book in which he wrote his notes.",
        "correction": {
          "wrongSentence": "This is the book which he wrote his notes.",
          "correctSentence": "This is the book in which he wrote his notes.",
          "options": [
            "This is the book in which he wrote his notes.",
            "This is the book which he wrote his notes.",
            "This is the book whose he wrote his notes.",
            "This is the book for whom he wrote his notes."
          ]
        }
      },
      {
        "prompt": "Dr. Ellis was a professor _____ Lucas had deep admiration.",
        "answer": "for whom",
        "options": [
          "for whom",
          "whose",
          "in which",
          "with which"
        ],
        "fullSentence": "Dr. Ellis was a professor for whom Lucas had deep admiration.",
        "correction": {
          "wrongSentence": "Dr. Ellis was a professor which Lucas had deep admiration.",
          "correctSentence": "Dr. Ellis was a professor for whom Lucas had deep admiration.",
          "options": [
            "Dr. Ellis was a professor for whom Lucas had deep admiration.",
            "Dr. Ellis was a professor which Lucas had deep admiration.",
            "Dr. Ellis was a professor whose Lucas had deep admiration.",
            "Dr. Ellis was a professor in which Lucas had deep admiration."
          ]
        }
      },
      {
        "prompt": "This is the pen _____ he signed the contract.",
        "answer": "with which",
        "options": [
          "with which",
          "whose",
          "in which",
          "for whom"
        ],
        "fullSentence": "This is the pen with which he signed the contract.",
        "correction": {
          "wrongSentence": "This is the pen which he signed the contract.",
          "correctSentence": "This is the pen with which he signed the contract.",
          "options": [
            "This is the pen with which he signed the contract.",
            "This is the pen which he signed the contract.",
            "This is the pen whose he signed the contract.",
            "This is the pen for whom he signed the contract."
          ]
        }
      },
      {
        "prompt": "He found a message _____ he expressed his gratitude.",
        "answer": "in which",
        "options": [
          "in which",
          "whose",
          "for whom",
          "with which"
        ],
        "fullSentence": "He found a message in which he expressed his gratitude.",
        "correction": {
          "wrongSentence": "He found a message where he expressed his gratitude in it.",
          "correctSentence": "He found a message in which he expressed his gratitude.",
          "options": [
            "He found a message in which he expressed his gratitude.",
            "He found a message where he expressed his gratitude in it.",
            "He found a message whose he expressed his gratitude.",
            "He found a message for whom he expressed his gratitude."
          ]
        }
      },
      {
        "prompt": "I met a writer _____ books changed many lives.",
        "answer": "whose",
        "options": [
          "whose",
          "who",
          "where",
          "when"
        ],
        "fullSentence": "I met a writer whose books changed many lives."
      },
      {
        "prompt": "The classroom _____ she taught felt inspiring.",
        "answer": "in which",
        "options": [
          "in which",
          "whose",
          "for whom",
          "with which"
        ],
        "fullSentence": "The classroom in which she taught felt inspiring."
      },
      {
        "prompt": "The students _____ she provided encouragement were grateful.",
        "answer": "for whom",
        "options": [
          "for whom",
          "whose",
          "where",
          "which"
        ],
        "fullSentence": "The students for whom she provided encouragement were grateful."
      },
      {
        "prompt": "The method _____ the research was conducted was precise.",
        "answer": "with which",
        "options": [
          "with which",
          "whose",
          "for whom",
          "when"
        ],
        "fullSentence": "The method with which the research was conducted was precise."
      },
      {
        "prompt": "The man _____ car was stolen called the police.",
        "answer": "whose",
        "options": [
          "whose",
          "who",
          "which",
          "where"
        ],
        "fullSentence": "The man whose car was stolen called the police."
      }
    ],
    "listening": [
      {
        "sentence": "The man whose car was stolen called the police.",
        "focusQuestion": "What was stolen?",
        "focusAnswer": "his car",
        "focusDistractors": [
          "his book",
          "his phone",
          "his bike"
        ],
        "meaningQuestion": "Which relative word shows possession?",
        "meaningAnswer": "whose",
        "meaningDistractors": [
          "which",
          "where",
          "when"
        ]
      },
      {
        "sentence": "This is the book in which he wrote his notes.",
        "focusQuestion": "Where did he write his notes?",
        "focusAnswer": "in the book",
        "focusDistractors": [
          "on the phone",
          "at the station",
          "near the door"
        ],
        "meaningQuestion": "Which phrase sounds formal?",
        "meaningAnswer": "in which",
        "meaningDistractors": [
          "because",
          "used to",
          "not only"
        ]
      },
      {
        "sentence": "She is the teacher for whom I have great respect.",
        "focusQuestion": "Who does the speaker respect?",
        "focusAnswer": "the teacher",
        "focusDistractors": [
          "the student",
          "the doctor",
          "the driver"
        ],
        "meaningQuestion": "What preposition comes before whom?",
        "meaningAnswer": "for",
        "meaningDistractors": [
          "with",
          "in",
          "by"
        ]
      },
      {
        "sentence": "This is the pen with which he signed the contract.",
        "focusQuestion": "What did he use to sign?",
        "focusAnswer": "a pen",
        "focusDistractors": [
          "a key",
          "a phone",
          "a brush"
        ],
        "meaningQuestion": "Which phrase means with that thing?",
        "meaningAnswer": "with which",
        "meaningDistractors": [
          "for whom",
          "whose",
          "where"
        ]
      },
      {
        "sentence": "I met a writer whose books changed many lives.",
        "focusQuestion": "What changed many lives?",
        "focusAnswer": "the writer's books",
        "focusDistractors": [
          "the writer's shoes",
          "the writer's house",
          "the writer's camera"
        ],
        "meaningQuestion": "Whose connects a person to what?",
        "meaningAnswer": "a possession or quality",
        "meaningDistractors": [
          "a future plan",
          "a command",
          "a price"
        ]
      }
    ],
    "speakingPrompts": [
      {
        "prompt": "Make one sentence with whose.",
        "answer": "I met a writer whose books changed many lives."
      },
      {
        "prompt": "Make one sentence with in which.",
        "answer": "This is the room in which we met."
      },
      {
        "prompt": "Make one sentence with for whom.",
        "answer": "She is a teacher for whom I have great respect."
      },
      {
        "prompt": "Make one sentence with with which.",
        "answer": "This is the pen with which he signed the letter."
      },
      {
        "prompt": "Describe a person who encouraged you using a complex relative clause.",
        "answer": "I had a teacher whose encouragement helped me grow."
      }
    ],
    "writing": [
      {
        "display": "She is the teacher _____ encouragement changed my life.",
        "audio": "She is the teacher whose encouragement changed my life.",
        "correct": "whose"
      },
      {
        "display": "This is the book _____ he wrote his notes.",
        "audio": "This is the book in which he wrote his notes.",
        "correct": "in which"
      },
      {
        "display": "Dr. Ellis was a professor _____ Lucas had deep admiration.",
        "audio": "Dr. Ellis was a professor for whom Lucas had deep admiration.",
        "correct": "for whom"
      },
      {
        "display": "This is the pen _____ he signed the contract.",
        "audio": "This is the pen with which he signed the contract.",
        "correct": "with which"
      },
      {
        "display": "The man _____ car was stolen called the police.",
        "audio": "The man whose car was stolen called the police.",
        "correct": "whose"
      }
    ],
    "facts": [
      {
        "passage": "Lucas found an old letter from Dr. Ellis, a professor whose encouragement had shaped his dreams. The letter mentioned a classroom in which he had once spoken honestly.",
        "question": "Who wrote the letter?",
        "answer": "Dr. Ellis wrote the letter.",
        "distractors": [
          "Lucas wrote it to himself.",
          "A driver wrote it.",
          "A stranger wrote it."
        ],
        "detailQuestion": "What had shaped Lucas's dreams?",
        "detailAnswer": "Dr. Ellis's encouragement had shaped his dreams.",
        "detailDistractors": [
          "Her car had shaped his dreams.",
          "Her phone had shaped his dreams.",
          "Her schedule had shaped his dreams."
        ],
        "vocabQuestion": "Which phrase describes the classroom?",
        "vocabAnswer": "in which he had once spoken honestly",
        "vocabDistractors": [
          "whose he had once spoken honestly",
          "for whom he had once spoken honestly",
          "with which he had once spoken honestly"
        ]
      },
      {
        "passage": "A student whose essay impressed the professor later became a writer. The school kept the essay in an archive in which old student work was preserved.",
        "question": "Whose essay impressed the professor?",
        "answer": "The student's essay impressed the professor.",
        "distractors": [
          "The teacher's essay impressed the professor.",
          "The driver's essay impressed the professor.",
          "The mayor's essay impressed the professor."
        ],
        "detailQuestion": "Where was the essay kept?",
        "detailAnswer": "In an archive.",
        "detailDistractors": [
          "In a restaurant.",
          "On a bus.",
          "Under a bridge."
        ],
        "vocabQuestion": "What does preserved mean?",
        "vocabAnswer": "kept safe over time",
        "vocabDistractors": [
          "sold quickly",
          "lost forever",
          "painted red"
        ]
      },
      {
        "passage": "Marta thanked a mentor for whom she had great respect. She used a careful message with which she expressed years of gratitude.",
        "question": "Who did Marta thank?",
        "answer": "She thanked a mentor.",
        "distractors": [
          "She thanked a cashier.",
          "She thanked a stranger.",
          "She thanked a pilot."
        ],
        "detailQuestion": "What did she use to express gratitude?",
        "detailAnswer": "a careful message",
        "detailDistractors": [
          "a loud whistle",
          "a broken plate",
          "a rainy window"
        ],
        "vocabQuestion": "Which phrase means for that person?",
        "vocabAnswer": "for whom",
        "vocabDistractors": [
          "with which",
          "in which",
          "whose"
        ]
      },
      {
        "passage": "The pen with which the agreement was signed became a symbol of peace. The leaders whose names appeared on the document promised to cooperate.",
        "question": "What became a symbol of peace?",
        "answer": "The pen became a symbol of peace.",
        "distractors": [
          "The table became a symbol of peace.",
          "The road became a symbol of peace.",
          "The phone became a symbol of peace."
        ],
        "detailQuestion": "Whose names appeared on the document?",
        "detailAnswer": "the leaders' names",
        "detailDistractors": [
          "the students' names",
          "the drivers' names",
          "the artists' names"
        ],
        "vocabQuestion": "What does cooperate mean?",
        "vocabAnswer": "work together",
        "vocabDistractors": [
          "argue loudly",
          "leave early",
          "forget quickly"
        ]
      },
      {
        "passage": "The town repaired the hall in which many community meetings had taken place. It was a building for which older residents felt deep affection.",
        "question": "What did the town repair?",
        "answer": "The town repaired the hall.",
        "distractors": [
          "The town repaired a train.",
          "The town repaired a boat.",
          "The town repaired a phone."
        ],
        "detailQuestion": "What had taken place in the hall?",
        "detailAnswer": "Many community meetings.",
        "detailDistractors": [
          "Many soccer games.",
          "Many flights.",
          "Many interviews."
        ],
        "vocabQuestion": "Which phrase shows feeling for a thing?",
        "vocabAnswer": "for which",
        "vocabDistractors": [
          "whose",
          "in whom",
          "with whom"
        ]
      }
    ]
  },
  {
    "number": 89,
    "title": "Lesson 89: Rarely Have I Seen That",
    "vocab": [
      {
        "term": "inversion",
        "clue": "a change in normal word order for emphasis",
        "prompt": "Formal English sometimes uses ____ after negative adverbs.",
        "distractors": [
          "receipt",
          "routine",
          "bargain"
        ]
      },
      {
        "term": "emphasis",
        "clue": "special stress or attention",
        "prompt": "The writer used inversion for ____.",
        "distractors": [
          "furniture",
          "weather",
          "snack"
        ]
      },
      {
        "term": "rarely",
        "clue": "not often",
        "prompt": "____ had she shared such a personal story.",
        "distractors": [
          "Always",
          "Soon",
          "Already"
        ]
      },
      {
        "term": "never",
        "clue": "at no time",
        "prompt": "____ had he felt so nervous.",
        "distractors": [
          "Often",
          "Then",
          "Since"
        ]
      },
      {
        "term": "seldom",
        "clue": "not often; rarely",
        "prompt": "____ have we seen such courage.",
        "distractors": [
          "Usually",
          "Tomorrow",
          "Clearly"
        ]
      },
      {
        "term": "hardly",
        "clue": "almost not or only just",
        "prompt": "____ had she finished when applause began.",
        "distractors": [
          "Because",
          "Although",
          "Already"
        ]
      },
      {
        "term": "no sooner",
        "clue": "used with than to show one action immediately after another",
        "prompt": "____ had he arrived than the rain began.",
        "distractors": [
          "No sooner",
          "In addition",
          "On the one hand"
        ]
      },
      {
        "term": "not until",
        "clue": "only at a certain later point",
        "prompt": "____ the end did I understand.",
        "distractors": [
          "Not until",
          "Due to",
          "Even though"
        ]
      },
      {
        "term": "only after",
        "clue": "not before a specific event",
        "prompt": "____ breathing deeply did she begin.",
        "distractors": [
          "Only after",
          "Because of",
          "More than"
        ]
      },
      {
        "term": "auxiliary verb",
        "clue": "a helping verb such as did, had, or was",
        "prompt": "Inversion often moves the ____ before the subject.",
        "distractors": [
          "main noun",
          "shopping bag",
          "adjective order"
        ]
      }
    ],
    "grammar": [
      {
        "prompt": "Never _____ I seen such courage.",
        "answer": "have",
        "options": [
          "have",
          "I have",
          "did",
          "was"
        ],
        "fullSentence": "Never have I seen such courage.",
        "correction": {
          "wrongSentence": "Never I have seen such courage.",
          "correctSentence": "Never have I seen such courage.",
          "options": [
            "Never have I seen such courage.",
            "Never I have seen such courage.",
            "Never did I seen such courage.",
            "Never I saw such courage."
          ]
        }
      },
      {
        "prompt": "Rarely _____ she shared anything so personal.",
        "answer": "had",
        "options": [
          "had",
          "she had",
          "did",
          "has"
        ],
        "fullSentence": "Rarely had she shared anything so personal.",
        "correction": {
          "wrongSentence": "Rarely she had shared anything so personal.",
          "correctSentence": "Rarely had she shared anything so personal.",
          "options": [
            "Rarely had she shared anything so personal.",
            "Rarely she had shared anything so personal.",
            "Rarely did she shared anything so personal.",
            "Rarely has she share anything so personal."
          ]
        }
      },
      {
        "prompt": "Only after the speech ended _____ she leave.",
        "answer": "did",
        "options": [
          "did",
          "had",
          "was",
          "she"
        ],
        "fullSentence": "Only after the speech ended did she leave.",
        "correction": {
          "wrongSentence": "Only after the speech ended she left.",
          "correctSentence": "Only after the speech ended did she leave.",
          "options": [
            "Only after the speech ended did she leave.",
            "Only after the speech ended she left.",
            "Only after the speech ended had she leave.",
            "Only after the speech ended she did leave."
          ]
        }
      },
      {
        "prompt": "No sooner _____ he arrived than the phone rang.",
        "answer": "had",
        "options": [
          "had",
          "did",
          "was",
          "has"
        ],
        "fullSentence": "No sooner had he arrived than the phone rang.",
        "correction": {
          "wrongSentence": "No sooner he had arrived than the phone rang.",
          "correctSentence": "No sooner had he arrived than the phone rang.",
          "options": [
            "No sooner had he arrived than the phone rang.",
            "No sooner he had arrived than the phone rang.",
            "No sooner did he arrived than the phone rang.",
            "No sooner has he arrive than the phone rang."
          ]
        }
      },
      {
        "prompt": "Not until today _____ I understand the problem.",
        "answer": "did",
        "options": [
          "did",
          "had",
          "was",
          "have"
        ],
        "fullSentence": "Not until today did I understand the problem.",
        "correction": {
          "wrongSentence": "Not until today I understood the problem.",
          "correctSentence": "Not until today did I understand the problem.",
          "options": [
            "Not until today did I understand the problem.",
            "Not until today I understood the problem.",
            "Not until today had I understand the problem.",
            "Not until today I did understand the problem."
          ]
        }
      },
      {
        "prompt": "Hardly _____ she finished when the room erupted in applause.",
        "answer": "had",
        "options": [
          "had",
          "did",
          "was",
          "has"
        ],
        "fullSentence": "Hardly had she finished when the room erupted in applause."
      },
      {
        "prompt": "Seldom _____ we felt such focused attention.",
        "answer": "had",
        "options": [
          "had",
          "did",
          "were",
          "have"
        ],
        "fullSentence": "Seldom had we felt such focused attention."
      },
      {
        "prompt": "Only then _____ he realize the truth.",
        "answer": "did",
        "options": [
          "did",
          "had",
          "was",
          "has"
        ],
        "fullSentence": "Only then did he realize the truth."
      },
      {
        "prompt": "Not only _____ she face her fear, but she also inspired others.",
        "answer": "did",
        "options": [
          "did",
          "had",
          "was",
          "has"
        ],
        "fullSentence": "Not only did she face her fear, but she also inspired others."
      },
      {
        "prompt": "Never before _____ her voice sounded so steady.",
        "answer": "had",
        "options": [
          "had",
          "did",
          "was",
          "has"
        ],
        "fullSentence": "Never before had her voice sounded so steady."
      }
    ],
    "listening": [
      {
        "sentence": "Never have I seen such courage.",
        "focusQuestion": "What has the speaker never seen?",
        "focusAnswer": "such courage",
        "focusDistractors": [
          "such weather",
          "such a train",
          "such a river"
        ],
        "meaningQuestion": "What structure is used?",
        "meaningAnswer": "inversion",
        "meaningDistractors": [
          "passive voice",
          "reported speech",
          "preference"
        ]
      },
      {
        "sentence": "Rarely had she shared anything so personal.",
        "focusQuestion": "How often had she shared something so personal?",
        "focusAnswer": "rarely",
        "focusDistractors": [
          "often",
          "every day",
          "always"
        ],
        "meaningQuestion": "Which auxiliary comes before she?",
        "meaningAnswer": "had",
        "meaningDistractors": [
          "did",
          "was",
          "does"
        ]
      },
      {
        "sentence": "Only after the speech ended did she leave.",
        "focusQuestion": "When did she leave?",
        "focusAnswer": "after the speech ended",
        "focusDistractors": [
          "before the speech began",
          "during lunch",
          "at midnight only"
        ],
        "meaningQuestion": "Which auxiliary is used?",
        "meaningAnswer": "did",
        "meaningDistractors": [
          "had",
          "has",
          "will"
        ]
      },
      {
        "sentence": "No sooner had he arrived than the phone rang.",
        "focusQuestion": "What happened after he arrived?",
        "focusAnswer": "the phone rang",
        "focusDistractors": [
          "the train left",
          "the room closed",
          "the class ended"
        ],
        "meaningQuestion": "What word pairs with no sooner?",
        "meaningAnswer": "than",
        "meaningDistractors": [
          "when",
          "because",
          "although"
        ]
      },
      {
        "sentence": "Not until today did I understand the problem.",
        "focusQuestion": "When did the speaker understand?",
        "focusAnswer": "today",
        "focusDistractors": [
          "yesterday",
          "last year",
          "never"
        ],
        "meaningQuestion": "What does not until emphasize?",
        "meaningAnswer": "a later point",
        "meaningDistractors": [
          "a reason",
          "a command",
          "a preference"
        ]
      }
    ],
    "speakingPrompts": [
      {
        "prompt": "Make one inversion sentence with never.",
        "answer": "Never have I seen such courage."
      },
      {
        "prompt": "Make one inversion sentence with rarely.",
        "answer": "Rarely had she shared anything so personal."
      },
      {
        "prompt": "Make one inversion sentence with only after.",
        "answer": "Only after the speech ended did she leave."
      },
      {
        "prompt": "Make one inversion sentence with no sooner.",
        "answer": "No sooner had he arrived than the phone rang."
      },
      {
        "prompt": "Make one inversion sentence with not until.",
        "answer": "Not until today did I understand the problem."
      }
    ],
    "writing": [
      {
        "display": "Never _____ I seen such courage.",
        "audio": "Never have I seen such courage.",
        "correct": "have"
      },
      {
        "display": "Rarely _____ she shared anything so personal.",
        "audio": "Rarely had she shared anything so personal.",
        "correct": "had"
      },
      {
        "display": "Only after the speech ended _____ she leave.",
        "audio": "Only after the speech ended did she leave.",
        "correct": "did"
      },
      {
        "display": "No sooner _____ he arrived than the phone rang.",
        "audio": "No sooner had he arrived than the phone rang.",
        "correct": "had"
      },
      {
        "display": "Not until today _____ I understand the problem.",
        "audio": "Not until today did I understand the problem.",
        "correct": "did"
      }
    ],
    "facts": [
      {
        "passage": "Emily stood at the podium and realized how nervous she was. Not until that moment did she understand the weight of the speech.",
        "question": "Where did Emily stand?",
        "answer": "She stood at the podium.",
        "distractors": [
          "She stood at the station.",
          "She stood in a kitchen.",
          "She stood on a bridge."
        ],
        "detailQuestion": "When did she understand the weight of the speech?",
        "detailAnswer": "Not until she stood at the podium.",
        "detailDistractors": [
          "Before she woke up.",
          "After dinner.",
          "When the bus arrived."
        ],
        "vocabQuestion": "What does podium mean?",
        "vocabAnswer": "a raised place or stand for speaking",
        "vocabDistractors": [
          "a kind of bag",
          "a school subject",
          "a meal"
        ]
      },
      {
        "passage": "Rarely had Emily shared anything so personal. The speech was about her grandmother and the kindness she had learned from her.",
        "question": "What was the speech about?",
        "answer": "her grandmother and kindness",
        "distractors": [
          "a train schedule",
          "a sports game",
          "a recipe"
        ],
        "detailQuestion": "How often had she shared something so personal?",
        "detailAnswer": "rarely",
        "detailDistractors": [
          "often",
          "every morning",
          "always"
        ],
        "vocabQuestion": "What does personal mean?",
        "vocabAnswer": "connected to someone's private life or feelings",
        "vocabDistractors": [
          "connected to machines only",
          "very cheap",
          "made of metal"
        ]
      },
      {
        "passage": "Hardly had she finished the final sentence when the room erupted in applause. The reaction surprised her deeply.",
        "question": "What happened after she finished?",
        "answer": "The room erupted in applause.",
        "distractors": [
          "The lights went out.",
          "The teacher left.",
          "The phone broke."
        ],
        "detailQuestion": "How did the reaction affect her?",
        "detailAnswer": "It surprised her deeply.",
        "detailDistractors": [
          "It bored her completely.",
          "It confused her schedule.",
          "It made her leave."
        ],
        "vocabQuestion": "What does applause mean?",
        "vocabAnswer": "clapping to show approval",
        "vocabDistractors": [
          "a written exam",
          "a quiet note",
          "a difficult route"
        ]
      },
      {
        "passage": "Only after taking a long breath did Marcus begin his testimony. His voice shook at first, but it grew stronger.",
        "question": "When did Marcus begin?",
        "answer": "After taking a long breath.",
        "distractors": [
          "Before opening the door.",
          "After buying food.",
          "Before the lesson."
        ],
        "detailQuestion": "What happened to his voice?",
        "detailAnswer": "It grew stronger.",
        "detailDistractors": [
          "It disappeared.",
          "It became silent forever.",
          "It turned blue."
        ],
        "vocabQuestion": "What is testimony?",
        "vocabAnswer": "a spoken account or statement",
        "vocabDistractors": [
          "a type of money",
          "a small tool",
          "a road sign"
        ]
      },
      {
        "passage": "Not only did the student face her fear, but she also encouraged others to speak honestly.",
        "question": "What did the student face?",
        "answer": "her fear",
        "distractors": [
          "her homework",
          "her bicycle",
          "her lunch"
        ],
        "detailQuestion": "What else did she do?",
        "detailAnswer": "She encouraged others to speak honestly.",
        "detailDistractors": [
          "She told others to leave.",
          "She sold tickets.",
          "She canceled class."
        ],
        "vocabQuestion": "What phrase adds a second strong idea?",
        "vocabAnswer": "not only",
        "vocabDistractors": [
          "if only",
          "used to",
          "due to"
        ]
      }
    ]
  },
  {
    "number": 90,
    "title": "Lesson 90: So Talented a Girl!",
    "vocab": [
      {
        "term": "suggestion",
        "clue": "an idea about what someone could do",
        "prompt": "Why don't you try that new art course is a ____.",
        "distractors": [
          "warning sign",
          "past regret",
          "relative clause"
        ]
      },
      {
        "term": "advice",
        "clue": "an opinion about what someone should do",
        "prompt": "Her friend gave helpful ____.",
        "distractors": [
          "traffic",
          "shelf",
          "weather"
        ]
      },
      {
        "term": "talented",
        "clue": "having natural ability",
        "prompt": "Mia was a ____ artist.",
        "distractors": [
          "careless",
          "borrowed",
          "late"
        ]
      },
      {
        "term": "portfolio",
        "clue": "a collection of work showing your ability",
        "prompt": "The art school asked for a ____.",
        "distractors": [
          "receipt",
          "mirror",
          "ticket"
        ]
      },
      {
        "term": "course",
        "clue": "a series of lessons",
        "prompt": "She searched for an online art ____.",
        "distractors": [
          "storm",
          "wire",
          "clue"
        ]
      },
      {
        "term": "why don't you",
        "clue": "a friendly way to suggest an action",
        "prompt": "____ apply to the program?",
        "distractors": [
          "Had better",
          "Due to",
          "No sooner"
        ]
      },
      {
        "term": "if I were you",
        "clue": "a phrase used to give personal advice",
        "prompt": "____, I'd start with a beginner course.",
        "distractors": [
          "If I were you",
          "Only after",
          "As soon as"
        ]
      },
      {
        "term": "ought to",
        "clue": "a slightly formal way to give advice",
        "prompt": "You ____ follow your dream.",
        "distractors": [
          "used to",
          "would rather",
          "ran out"
        ]
      },
      {
        "term": "cut down on",
        "clue": "to reduce an amount",
        "prompt": "You should ____ screen time at night.",
        "distractors": [
          "look down on",
          "run into",
          "pick on"
        ]
      },
      {
        "term": "follow through",
        "clue": "to complete what you started",
        "prompt": "She wished she had ____ with her application.",
        "distractors": [
          "followed over",
          "followed between",
          "followed under"
        ]
      }
    ],
    "grammar": [
      {
        "prompt": "You _____ apologize to her.",
        "answer": "should",
        "options": [
          "should",
          "would",
          "used to",
          "had"
        ],
        "fullSentence": "You should apologize to her.",
        "correction": {
          "wrongSentence": "You should to apologize to her.",
          "correctSentence": "You should apologize to her.",
          "options": [
            "You should apologize to her.",
            "You should to apologize to her.",
            "You should apologizing to her.",
            "You should apologized to her."
          ]
        }
      },
      {
        "prompt": "You _____ to save money for emergencies.",
        "answer": "ought",
        "options": [
          "ought",
          "should",
          "would",
          "had"
        ],
        "fullSentence": "You ought to save money for emergencies.",
        "correction": {
          "wrongSentence": "You ought save money for emergencies.",
          "correctSentence": "You ought to save money for emergencies.",
          "options": [
            "You ought to save money for emergencies.",
            "You ought save money for emergencies.",
            "You ought saving money for emergencies.",
            "You should to save money for emergencies."
          ]
        }
      },
      {
        "prompt": "_____ try calling him today?",
        "answer": "Why don't you",
        "options": [
          "Why don't you",
          "If I were you",
          "Ought to",
          "Should"
        ],
        "fullSentence": "Why don't you try calling him today?",
        "correction": {
          "wrongSentence": "Why you don't try calling him today?",
          "correctSentence": "Why don't you try calling him today?",
          "options": [
            "Why don't you try calling him today?",
            "Why you don't try calling him today?",
            "Why don't you to try calling him today?",
            "Why don't you trying calling him today?"
          ]
        }
      },
      {
        "prompt": "If I _____ you, I'd take the earlier train.",
        "answer": "were",
        "options": [
          "were",
          "was",
          "am",
          "had"
        ],
        "fullSentence": "If I were you, I'd take the earlier train.",
        "correction": {
          "wrongSentence": "If I was you, I'd take the earlier train.",
          "correctSentence": "If I were you, I'd take the earlier train.",
          "options": [
            "If I were you, I'd take the earlier train.",
            "If I was you, I'd take the earlier train.",
            "If I am you, I'd take the earlier train.",
            "If I had you, I'd take the earlier train."
          ]
        }
      },
      {
        "prompt": "Maybe you _____ take a short break.",
        "answer": "should",
        "options": [
          "should",
          "ought",
          "would",
          "were"
        ],
        "fullSentence": "Maybe you should take a short break.",
        "correction": {
          "wrongSentence": "Maybe you should to take a short break.",
          "correctSentence": "Maybe you should take a short break.",
          "options": [
            "Maybe you should take a short break.",
            "Maybe you should to take a short break.",
            "Maybe you should taking a short break.",
            "Maybe you ought take a short break."
          ]
        }
      },
      {
        "prompt": "You _____ check the weather before planning the picnic.",
        "answer": "should",
        "options": [
          "should",
          "used to",
          "would rather",
          "had"
        ],
        "fullSentence": "You should check the weather before planning the picnic."
      },
      {
        "prompt": "They ought _____ book their tickets early.",
        "answer": "to",
        "options": [
          "to",
          "for",
          "at",
          "with"
        ],
        "fullSentence": "They ought to book their tickets early."
      },
      {
        "prompt": "If I were you, I _____ ask for help.",
        "answer": "would",
        "options": [
          "would",
          "will",
          "had",
          "have"
        ],
        "fullSentence": "If I were you, I would ask for help."
      },
      {
        "prompt": "Why don't you _____ a new hobby?",
        "answer": "try",
        "options": [
          "try",
          "trying",
          "tried",
          "to try"
        ],
        "fullSentence": "Why don't you try a new hobby?"
      },
      {
        "prompt": "She should _____ more confident in her work.",
        "answer": "be",
        "options": [
          "be",
          "is",
          "being",
          "been"
        ],
        "fullSentence": "She should be more confident in her work."
      }
    ],
    "listening": [
      {
        "sentence": "You should apologize to her.",
        "focusQuestion": "What should the person do?",
        "focusAnswer": "apologize",
        "focusDistractors": [
          "travel",
          "wait",
          "study"
        ],
        "meaningQuestion": "What does should express?",
        "meaningAnswer": "advice",
        "meaningDistractors": [
          "past habit",
          "reported speech",
          "possession"
        ]
      },
      {
        "sentence": "You ought to save money for emergencies.",
        "focusQuestion": "What ought the person do?",
        "focusAnswer": "save money",
        "focusDistractors": [
          "spend money",
          "borrow a car",
          "move away"
        ],
        "meaningQuestion": "Does ought to sound a little formal?",
        "meaningAnswer": "yes",
        "meaningDistractors": [
          "no",
          "only in questions",
          "only in stories"
        ]
      },
      {
        "sentence": "Why don't you try calling him today?",
        "focusQuestion": "What is suggested?",
        "focusAnswer": "calling him today",
        "focusDistractors": [
          "emailing tomorrow",
          "waiting a year",
          "leaving early"
        ],
        "meaningQuestion": "Is this a friendly suggestion?",
        "meaningAnswer": "yes",
        "meaningDistractors": [
          "no",
          "a command",
          "a regret"
        ]
      },
      {
        "sentence": "If I were you, I'd take the earlier train.",
        "focusQuestion": "What would the speaker do?",
        "focusAnswer": "take the earlier train",
        "focusDistractors": [
          "miss the train",
          "drive all night",
          "stay home"
        ],
        "meaningQuestion": "What phrase introduces personal advice?",
        "meaningAnswer": "if I were you",
        "meaningDistractors": [
          "not until",
          "for whom",
          "in addition to"
        ]
      },
      {
        "sentence": "Maybe you should take a short break.",
        "focusQuestion": "What softens the advice?",
        "focusAnswer": "maybe",
        "focusDistractors": [
          "never",
          "hardly",
          "therefore"
        ],
        "meaningQuestion": "What is the advice?",
        "meaningAnswer": "take a short break",
        "meaningDistractors": [
          "work harder forever",
          "skip breakfast",
          "ignore the problem"
        ]
      }
    ],
    "speakingPrompts": [
      {
        "prompt": "Give advice with should.",
        "answer": "You should apologize to her."
      },
      {
        "prompt": "Give advice with ought to.",
        "answer": "You ought to save money for emergencies."
      },
      {
        "prompt": "Give a friendly suggestion.",
        "answer": "Why don't you try calling him today?"
      },
      {
        "prompt": "Give advice using if I were you.",
        "answer": "If I were you, I'd take the earlier train."
      },
      {
        "prompt": "Give soft advice with maybe.",
        "answer": "Maybe you should take a short break."
      }
    ],
    "writing": [
      {
        "display": "You _____ apologize to her.",
        "audio": "You should apologize to her.",
        "correct": "should"
      },
      {
        "display": "You _____ to save money for emergencies.",
        "audio": "You ought to save money for emergencies.",
        "correct": "ought"
      },
      {
        "display": "_____ try calling him today?",
        "audio": "Why don't you try calling him today?",
        "correct": "Why don't you"
      },
      {
        "display": "If I _____ you, I'd take the earlier train.",
        "audio": "If I were you, I'd take the earlier train.",
        "correct": "were"
      },
      {
        "display": "Maybe you _____ take a short break.",
        "audio": "Maybe you should take a short break.",
        "correct": "should"
      }
    ],
    "facts": [
      {
        "passage": "Mia found an old notebook with her teenage dreams. Leo had once told her that she should apply to art school, but fear held her back.",
        "question": "What did Mia find?",
        "answer": "She found an old notebook.",
        "distractors": [
          "She found a gold watch.",
          "She found a train ticket.",
          "She found a broken lamp."
        ],
        "detailQuestion": "What had Leo advised her to do?",
        "detailAnswer": "He advised her to apply to art school.",
        "detailDistractors": [
          "He advised her to leave town.",
          "He advised her to stop drawing.",
          "He advised her to sell her notebook."
        ],
        "vocabQuestion": "What held her back?",
        "vocabAnswer": "fear",
        "vocabDistractors": [
          "traffic",
          "rain",
          "hunger"
        ]
      },
      {
        "passage": "A friend told Noah, 'Why don't you practice speaking with a partner?' The suggestion helped him feel less nervous in English class.",
        "question": "What did the friend suggest?",
        "answer": "Practicing speaking with a partner.",
        "distractors": [
          "Buying a new phone.",
          "Closing the school.",
          "Avoiding class."
        ],
        "detailQuestion": "How did the suggestion help?",
        "detailAnswer": "It helped him feel less nervous.",
        "detailDistractors": [
          "It made him angry.",
          "It made him lose time.",
          "It made him stop learning."
        ],
        "vocabQuestion": "What does partner mean?",
        "vocabAnswer": "someone who works or practices with you",
        "vocabDistractors": [
          "a kind of book",
          "a place to shop",
          "a weather tool"
        ]
      },
      {
        "passage": "Clara was always tired because she used her phone late at night. Her brother said she ought to cut down on screen time before bed.",
        "question": "Why was Clara tired?",
        "answer": "Because she used her phone late at night.",
        "distractors": [
          "Because she ran every morning.",
          "Because she studied quietly.",
          "Because she ate early."
        ],
        "detailQuestion": "What did her brother advise?",
        "detailAnswer": "She ought to cut down on screen time.",
        "detailDistractors": [
          "She ought to buy more screens.",
          "She ought to sleep at school.",
          "She ought to ignore him."
        ],
        "vocabQuestion": "What does cut down on mean?",
        "vocabAnswer": "reduce",
        "vocabDistractors": [
          "increase",
          "borrow",
          "hide"
        ]
      },
      {
        "passage": "Elijah wanted to speak in public but felt afraid. His teacher said, 'If I were you, I'd start with a small group.'",
        "question": "What did Elijah want to do?",
        "answer": "speak in public",
        "distractors": [
          "learn to cook",
          "buy a car",
          "open a store"
        ],
        "detailQuestion": "What did the teacher suggest?",
        "detailAnswer": "starting with a small group",
        "detailDistractors": [
          "starting with a huge crowd",
          "canceling all speeches",
          "speaking without preparation"
        ],
        "vocabQuestion": "Why is small group helpful?",
        "vocabAnswer": "It feels less intimidating.",
        "vocabDistractors": [
          "It is always louder.",
          "It requires no people.",
          "It removes all practice."
        ]
      },
      {
        "passage": "Hannah chose to write something kind online instead of joining a cruel joke. Her decision showed that good advice can lead to better choices.",
        "question": "What did Hannah choose to write?",
        "answer": "something kind",
        "distractors": [
          "something cruel",
          "a legal report",
          "a recipe"
        ],
        "detailQuestion": "What did she avoid joining?",
        "detailAnswer": "a cruel joke",
        "detailDistractors": [
          "a Bible study",
          "a family dinner",
          "a music lesson"
        ],
        "vocabQuestion": "What did her decision show?",
        "vocabAnswer": "Good advice can lead to better choices.",
        "vocabDistractors": [
          "Advice is always wrong.",
          "Kindness never matters.",
          "Choices are impossible."
        ]
      }
    ]
  },
  {
    "number": 91,
    "title": "Lesson 91: She Would Rather Stay Home",
    "vocab": [
      {
        "term": "preference",
        "clue": "what someone likes or chooses more",
        "prompt": "Her ____ was to stay home.",
        "distractors": [
          "warning",
          "deadline",
          "shelf"
        ]
      },
      {
        "term": "would rather",
        "clue": "prefer one action over another",
        "prompt": "I ____ cook at home tonight.",
        "distractors": [
          "used to",
          "ought to",
          "ran out"
        ]
      },
      {
        "term": "prefer",
        "clue": "to like one thing more than another",
        "prompt": "Do you ____ tea or coffee?",
        "distractors": [
          "borrow",
          "lend",
          "hear"
        ]
      },
      {
        "term": "specific choice",
        "clue": "a decision for one situation",
        "prompt": "I'd rather stay in tonight is a ____.",
        "distractors": [
          "general habit",
          "relative phrase",
          "time shift"
        ]
      },
      {
        "term": "general habit",
        "clue": "something usually true",
        "prompt": "I prefer reading to watching TV describes a ____.",
        "distractors": [
          "quick accident",
          "lost letter",
          "single command"
        ]
      },
      {
        "term": "than",
        "clue": "used after would rather to compare actions",
        "prompt": "I'd rather walk ____ drive.",
        "distractors": [
          "to",
          "for",
          "with"
        ]
      },
      {
        "term": "to",
        "clue": "used after prefer to compare nouns or gerunds",
        "prompt": "I prefer tea ____ coffee.",
        "distractors": [
          "than",
          "as",
          "by"
        ]
      },
      {
        "term": "stay in",
        "clue": "remain at home",
        "prompt": "Tonight, I'd rather ____.",
        "distractors": [
          "pick on",
          "run out",
          "look down"
        ]
      },
      {
        "term": "go out",
        "clue": "leave home for entertainment",
        "prompt": "Would you rather ____ or stay in?",
        "distractors": [
          "go out",
          "give in",
          "turn down"
        ]
      },
      {
        "term": "choice",
        "clue": "an act of selecting between options",
        "prompt": "The question gives two ____.",
        "distractors": [
          "clocks",
          "clouds",
          "chairs"
        ]
      }
    ],
    "grammar": [
      {
        "prompt": "I would rather _____ home tonight.",
        "answer": "stay",
        "options": [
          "stay",
          "to stay",
          "staying",
          "stayed"
        ],
        "fullSentence": "I would rather stay home tonight.",
        "correction": {
          "wrongSentence": "I would rather to stay home tonight.",
          "correctSentence": "I would rather stay home tonight.",
          "options": [
            "I would rather stay home tonight.",
            "I would rather to stay home tonight.",
            "I would rather staying home tonight.",
            "I would rather stayed home tonight."
          ]
        }
      },
      {
        "prompt": "Would you rather _____ a movie or read a book?",
        "answer": "watch",
        "options": [
          "watch",
          "to watch",
          "watching",
          "watched"
        ],
        "fullSentence": "Would you rather watch a movie or read a book?",
        "correction": {
          "wrongSentence": "Would you rather to watch a movie or read a book?",
          "correctSentence": "Would you rather watch a movie or read a book?",
          "options": [
            "Would you rather watch a movie or read a book?",
            "Would you rather to watch a movie or read a book?",
            "Would you rather watching a movie or read a book?",
            "Would you rather watched a movie or read a book?"
          ]
        }
      },
      {
        "prompt": "I prefer tea _____ coffee.",
        "answer": "to",
        "options": [
          "to",
          "than",
          "for",
          "with"
        ],
        "fullSentence": "I prefer tea to coffee.",
        "correction": {
          "wrongSentence": "I prefer tea than coffee.",
          "correctSentence": "I prefer tea to coffee.",
          "options": [
            "I prefer tea to coffee.",
            "I prefer tea than coffee.",
            "I prefer tea for coffee.",
            "I prefer tea with coffee."
          ]
        }
      },
      {
        "prompt": "She prefers reading _____ watching movies.",
        "answer": "to",
        "options": [
          "to",
          "than",
          "for",
          "with"
        ],
        "fullSentence": "She prefers reading to watching movies.",
        "correction": {
          "wrongSentence": "She prefers reading than watching movies.",
          "correctSentence": "She prefers reading to watching movies.",
          "options": [
            "She prefers reading to watching movies.",
            "She prefers reading than watching movies.",
            "She prefers read to watch movies.",
            "She prefers to reading watching movies."
          ]
        }
      },
      {
        "prompt": "I'd rather cook at home _____ eat out.",
        "answer": "than",
        "options": [
          "than",
          "to",
          "for",
          "with"
        ],
        "fullSentence": "I'd rather cook at home than eat out.",
        "correction": {
          "wrongSentence": "I'd rather cook at home to eat out.",
          "correctSentence": "I'd rather cook at home than eat out.",
          "options": [
            "I'd rather cook at home than eat out.",
            "I'd rather cook at home to eat out.",
            "I'd rather cooking at home than eat out.",
            "I'd rather to cook at home than eat out."
          ]
        }
      },
      {
        "prompt": "Do you prefer traveling by train _____ by car?",
        "answer": "or",
        "options": [
          "or",
          "than",
          "to",
          "with"
        ],
        "fullSentence": "Do you prefer traveling by train or by car?"
      },
      {
        "prompt": "He would rather not _____ about it now.",
        "answer": "talk",
        "options": [
          "talk",
          "to talk",
          "talking",
          "talked"
        ],
        "fullSentence": "He would rather not talk about it now."
      },
      {
        "prompt": "We prefer studying in the morning _____ studying at night.",
        "answer": "to",
        "options": [
          "to",
          "than",
          "for",
          "with"
        ],
        "fullSentence": "We prefer studying in the morning to studying at night."
      },
      {
        "prompt": "She'd rather _____ honestly than hide the truth.",
        "answer": "speak",
        "options": [
          "speak",
          "to speak",
          "speaking",
          "spoken"
        ],
        "fullSentence": "She'd rather speak honestly than hide the truth."
      },
      {
        "prompt": "Would you rather _____ at home or go to the party?",
        "answer": "stay",
        "options": [
          "stay",
          "to stay",
          "staying",
          "stayed"
        ],
        "fullSentence": "Would you rather stay at home or go to the party?"
      }
    ],
    "listening": [
      {
        "sentence": "I would rather stay home tonight.",
        "focusQuestion": "What would the speaker rather do?",
        "focusAnswer": "stay home",
        "focusDistractors": [
          "go out",
          "buy tickets",
          "study late"
        ],
        "meaningQuestion": "Is this a specific choice or a general habit?",
        "meaningAnswer": "a specific choice",
        "meaningDistractors": [
          "a general habit",
          "reported speech",
          "passive voice"
        ]
      },
      {
        "sentence": "Would you rather watch a movie or read a book?",
        "focusQuestion": "What two options are mentioned?",
        "focusAnswer": "watch a movie or read a book",
        "focusDistractors": [
          "cook or clean",
          "drive or walk",
          "sing or dance"
        ],
        "meaningQuestion": "What structure asks for preference?",
        "meaningAnswer": "would you rather",
        "meaningDistractors": [
          "had better",
          "not until",
          "in which"
        ]
      },
      {
        "sentence": "I prefer tea to coffee.",
        "focusQuestion": "What does the speaker prefer?",
        "focusAnswer": "tea",
        "focusDistractors": [
          "coffee",
          "juice",
          "water"
        ],
        "meaningQuestion": "Which word follows prefer in comparisons?",
        "meaningAnswer": "to",
        "meaningDistractors": [
          "than",
          "as",
          "by"
        ]
      },
      {
        "sentence": "She prefers reading to watching movies.",
        "focusQuestion": "What activity does she prefer?",
        "focusAnswer": "reading",
        "focusDistractors": [
          "watching movies",
          "driving",
          "shopping"
        ],
        "meaningQuestion": "What form follows prefer here?",
        "meaningAnswer": "gerund",
        "meaningDistractors": [
          "base verb",
          "past participle",
          "modal"
        ]
      },
      {
        "sentence": "I'd rather cook at home than eat out.",
        "focusQuestion": "What is the alternative?",
        "focusAnswer": "eat out",
        "focusDistractors": [
          "go home",
          "study more",
          "travel"
        ],
        "meaningQuestion": "Which word compares after would rather?",
        "meaningAnswer": "than",
        "meaningDistractors": [
          "to",
          "for",
          "with"
        ]
      }
    ],
    "speakingPrompts": [
      {
        "prompt": "Say one sentence with would rather.",
        "answer": "I would rather stay home tonight."
      },
      {
        "prompt": "Ask one question with would rather.",
        "answer": "Would you rather watch a movie or read a book?"
      },
      {
        "prompt": "Say one sentence with prefer and nouns.",
        "answer": "I prefer tea to coffee."
      },
      {
        "prompt": "Say one sentence with prefer and gerunds.",
        "answer": "She prefers reading to watching movies."
      },
      {
        "prompt": "Compare two choices with than.",
        "answer": "I'd rather cook at home than eat out."
      }
    ],
    "writing": [
      {
        "display": "I would rather _____ home tonight.",
        "audio": "I would rather stay home tonight.",
        "correct": "stay"
      },
      {
        "display": "Would you rather _____ a movie or read a book?",
        "audio": "Would you rather watch a movie or read a book?",
        "correct": "watch"
      },
      {
        "display": "I prefer tea _____ coffee.",
        "audio": "I prefer tea to coffee.",
        "correct": "to"
      },
      {
        "display": "She prefers reading _____ watching movies.",
        "audio": "She prefers reading to watching movies.",
        "correct": "to"
      },
      {
        "display": "I'd rather cook at home _____ eat out.",
        "audio": "I'd rather cook at home than eat out.",
        "correct": "than"
      }
    ],
    "facts": [
      {
        "passage": "Hannah was invited to a loud party, but she said she would rather stay home and reflect quietly.",
        "question": "What was Hannah invited to?",
        "answer": "a loud party",
        "distractors": [
          "a quiet meeting",
          "a short class",
          "a family breakfast"
        ],
        "detailQuestion": "What did she prefer to do?",
        "detailAnswer": "stay home and reflect quietly",
        "detailDistractors": [
          "travel abroad",
          "buy clothes",
          "join the gossip"
        ],
        "vocabQuestion": "What does reflect mean?",
        "vocabAnswer": "think carefully",
        "vocabDistractors": [
          "run quickly",
          "eat slowly",
          "speak loudly"
        ]
      },
      {
        "passage": "Alex prefers coffee to tea in the morning, but Mia would rather drink tea tonight because coffee keeps her awake.",
        "question": "What does Alex prefer?",
        "answer": "coffee",
        "distractors": [
          "tea",
          "juice",
          "milk"
        ],
        "detailQuestion": "Why would Mia rather drink tea tonight?",
        "detailAnswer": "Because coffee keeps her awake.",
        "detailDistractors": [
          "Because tea is loud.",
          "Because coffee is free.",
          "Because water is cold."
        ],
        "vocabQuestion": "Which word follows prefer?",
        "vocabAnswer": "to",
        "vocabDistractors": [
          "than",
          "by",
          "about"
        ]
      },
      {
        "passage": "The family would rather cook together than eat at a flashy restaurant. They prefer meaningful conversation to showing off.",
        "question": "What would the family rather do?",
        "answer": "cook together",
        "distractors": [
          "eat at a flashy restaurant",
          "drive all night",
          "watch a game"
        ],
        "detailQuestion": "What do they prefer to showing off?",
        "detailAnswer": "meaningful conversation",
        "detailDistractors": [
          "loud music",
          "expensive shoes",
          "silent rooms"
        ],
        "vocabQuestion": "What does flashy mean?",
        "vocabAnswer": "trying to attract attention",
        "vocabDistractors": [
          "very quiet",
          "full of books",
          "hard to understand"
        ]
      },
      {
        "passage": "Leo asked whether Sara would rather study alone or with a group. Sara said she prefers studying with a group to studying alone.",
        "question": "What question did Leo ask?",
        "answer": "whether Sara would rather study alone or with a group",
        "distractors": [
          "whether Sara would cook dinner",
          "whether Sara would move away",
          "whether Sara would buy a ticket"
        ],
        "detailQuestion": "What does Sara prefer?",
        "detailAnswer": "studying with a group",
        "detailDistractors": [
          "studying alone",
          "sleeping late",
          "reading novels only"
        ],
        "vocabQuestion": "What structure asks about two options?",
        "vocabAnswer": "would rather",
        "vocabDistractors": [
          "used to",
          "already",
          "for whom"
        ]
      },
      {
        "passage": "Instead of joining an online challenge that mocked a business, Hannah said she would rather write something kind.",
        "question": "What did the online challenge do?",
        "answer": "It mocked a business.",
        "distractors": [
          "It helped a family.",
          "It taught grammar.",
          "It saved money."
        ],
        "detailQuestion": "What would Hannah rather write?",
        "detailAnswer": "something kind",
        "detailDistractors": [
          "something cruel",
          "a business plan",
          "a recipe"
        ],
        "vocabQuestion": "What does mocked mean?",
        "vocabAnswer": "made fun of",
        "vocabDistractors": [
          "protected",
          "repaired",
          "invited"
        ]
      }
    ]
  },
  {
    "number": 92,
    "title": "Lesson 92: What a Complicated-Looking Plan!",
    "vocab": [
      {
        "term": "compound adjective",
        "clue": "two or more words working as one adjective",
        "prompt": "High-risk is a ____.",
        "distractors": [
          "reported question",
          "past regret",
          "bare infinitive"
        ]
      },
      {
        "term": "hyphen",
        "clue": "a short mark used between words",
        "prompt": "Many compound adjectives use a ____.",
        "distractors": [
          "comma",
          "period",
          "quote"
        ]
      },
      {
        "term": "time-sensitive",
        "clue": "depending on correct timing",
        "prompt": "It was a ____ operation.",
        "distractors": [
          "slowly written",
          "coffee warm",
          "rainy late"
        ]
      },
      {
        "term": "high-risk",
        "clue": "dangerous or involving possible loss",
        "prompt": "The team prepared for a ____ mission.",
        "distractors": [
          "deep-blue",
          "smoke-free",
          "five-page"
        ]
      },
      {
        "term": "well-equipped",
        "clue": "having the necessary tools",
        "prompt": "They needed a ____ team.",
        "distractors": [
          "long-term",
          "hand-drawn",
          "kind-hearted"
        ]
      },
      {
        "term": "voice-activated",
        "clue": "controlled by voice",
        "prompt": "The building had ____ lights.",
        "distractors": [
          "blue cotton",
          "Italian leather",
          "fresh cooked"
        ]
      },
      {
        "term": "adjective order",
        "clue": "the natural order of adjectives before a noun",
        "prompt": "English has a preferred ____.",
        "distractors": [
          "question tag",
          "modal rule",
          "future plan"
        ]
      },
      {
        "term": "opinion",
        "clue": "an adjective category showing judgment",
        "prompt": "Beautiful is often an ____ adjective.",
        "distractors": [
          "origin",
          "material",
          "purpose"
        ]
      },
      {
        "term": "material",
        "clue": "what something is made of",
        "prompt": "Leather is a ____ adjective.",
        "distractors": [
          "size",
          "age",
          "shape"
        ]
      },
      {
        "term": "purpose",
        "clue": "the use or function of a noun",
        "prompt": "A running shoe uses a ____ adjective.",
        "distractors": [
          "color",
          "age",
          "origin"
        ]
      }
    ],
    "grammar": [
      {
        "prompt": "They created a _____ plan.",
        "answer": "high-risk",
        "options": [
          "high-risk",
          "high risked",
          "risk-high",
          "highly risk"
        ],
        "fullSentence": "They created a high-risk plan.",
        "correction": {
          "wrongSentence": "They created a high risk plan.",
          "correctSentence": "They created a high-risk plan.",
          "options": [
            "They created a high-risk plan.",
            "They created a high risk plan.",
            "They created a risk-high plan.",
            "They created a highly risk plan."
          ]
        }
      },
      {
        "prompt": "We need a _____ team.",
        "answer": "well-equipped",
        "options": [
          "well-equipped",
          "well equipment",
          "good-equipped",
          "equipped-well"
        ],
        "fullSentence": "We need a well-equipped team.",
        "correction": {
          "wrongSentence": "We need a well equipment team.",
          "correctSentence": "We need a well-equipped team.",
          "options": [
            "We need a well-equipped team.",
            "We need a well equipment team.",
            "We need a good-equipped team.",
            "We need an equipped-well team."
          ]
        }
      },
      {
        "prompt": "She wore a _____ jacket.",
        "answer": "black leather",
        "options": [
          "black leather",
          "leather black",
          "blackly leather",
          "leathered black"
        ],
        "fullSentence": "She wore a black leather jacket.",
        "correction": {
          "wrongSentence": "She wore a leather black jacket.",
          "correctSentence": "She wore a black leather jacket.",
          "options": [
            "She wore a black leather jacket.",
            "She wore a leather black jacket.",
            "She wore a blackly leather jacket.",
            "She wore a leathered black jacket."
          ]
        }
      },
      {
        "prompt": "They attended a _____ meeting.",
        "answer": "two-hour",
        "options": [
          "two-hour",
          "two-hours",
          "hours-two",
          "two houring"
        ],
        "fullSentence": "They attended a two-hour meeting.",
        "correction": {
          "wrongSentence": "They attended a two-hours meeting.",
          "correctSentence": "They attended a two-hour meeting.",
          "options": [
            "They attended a two-hour meeting.",
            "They attended a two-hours meeting.",
            "They attended an hours-two meeting.",
            "They attended a two houring meeting."
          ]
        }
      },
      {
        "prompt": "It was a _____ building.",
        "answer": "high-security",
        "options": [
          "high-security",
          "security-high",
          "highly security",
          "high secure"
        ],
        "fullSentence": "It was a high-security building.",
        "correction": {
          "wrongSentence": "It was a high security building.",
          "correctSentence": "It was a high-security building.",
          "options": [
            "It was a high-security building.",
            "It was a high security building.",
            "It was a security-high building.",
            "It was a highly security building."
          ]
        }
      },
      {
        "prompt": "Olivia used a _____ map.",
        "answer": "hand-drawn",
        "options": [
          "hand-drawn",
          "hand draw",
          "drawn-hand",
          "hand drawing"
        ],
        "fullSentence": "Olivia used a hand-drawn map."
      },
      {
        "prompt": "The team followed a _____ plan.",
        "answer": "well-structured",
        "options": [
          "well-structured",
          "well structure",
          "structured-well",
          "good-structure"
        ],
        "fullSentence": "The team followed a well-structured plan."
      },
      {
        "prompt": "He bought a _____ table.",
        "answer": "large old wooden",
        "options": [
          "large old wooden",
          "wooden old large",
          "old wooden large",
          "wooden large old"
        ],
        "fullSentence": "He bought a large old wooden table."
      },
      {
        "prompt": "They entered a _____ tunnel.",
        "answer": "long dark underground",
        "options": [
          "long dark underground",
          "dark underground long",
          "underground dark long",
          "long underground dark"
        ],
        "fullSentence": "They entered a long dark underground tunnel."
      },
      {
        "prompt": "The system used _____ sensors.",
        "answer": "motion-activated",
        "options": [
          "motion-activated",
          "motion activating",
          "activated-motion",
          "motion activate"
        ],
        "fullSentence": "The system used motion-activated sensors."
      }
    ],
    "listening": [
      {
        "sentence": "They created a high-risk plan.",
        "focusQuestion": "What kind of plan was it?",
        "focusAnswer": "high-risk",
        "focusDistractors": [
          "low-cost",
          "short-term",
          "smoke-free"
        ],
        "meaningQuestion": "What punctuation often appears in compound adjectives?",
        "meaningAnswer": "a hyphen",
        "meaningDistractors": [
          "a question mark",
          "an apostrophe",
          "a colon"
        ]
      },
      {
        "sentence": "We need a well-equipped team.",
        "focusQuestion": "What kind of team is needed?",
        "focusAnswer": "well-equipped",
        "focusDistractors": [
          "poorly trained",
          "small green",
          "old wooden"
        ],
        "meaningQuestion": "What does well-equipped mean?",
        "meaningAnswer": "having necessary tools",
        "meaningDistractors": [
          "very expensive",
          "easy to forget",
          "made of wood"
        ]
      },
      {
        "sentence": "She wore a black leather jacket.",
        "focusQuestion": "Which adjective comes first?",
        "focusAnswer": "black",
        "focusDistractors": [
          "leather",
          "jacket",
          "wore"
        ],
        "meaningQuestion": "What is leather?",
        "meaningAnswer": "material",
        "meaningDistractors": [
          "opinion",
          "size",
          "age"
        ]
      },
      {
        "sentence": "They attended a two-hour meeting.",
        "focusQuestion": "How long was the meeting?",
        "focusAnswer": "two hours",
        "focusDistractors": [
          "two days",
          "two minutes",
          "two years"
        ],
        "meaningQuestion": "What form is used before the noun?",
        "meaningAnswer": "two-hour",
        "meaningDistractors": [
          "two-hours",
          "two houred",
          "two houring"
        ]
      },
      {
        "sentence": "The system used motion-activated sensors.",
        "focusQuestion": "What kind of sensors were used?",
        "focusAnswer": "motion-activated",
        "focusDistractors": [
          "voice-written",
          "hand-silent",
          "rain-made"
        ],
        "meaningQuestion": "What does activated mean?",
        "meaningAnswer": "turned on or controlled",
        "meaningDistractors": [
          "sold cheaply",
          "made softer",
          "spoken slowly"
        ]
      }
    ],
    "speakingPrompts": [
      {
        "prompt": "Describe a risky plan with a compound adjective.",
        "answer": "They created a high-risk plan."
      },
      {
        "prompt": "Describe a prepared team.",
        "answer": "We need a well-equipped team."
      },
      {
        "prompt": "Say one sentence with correct adjective order.",
        "answer": "She wore a black leather jacket."
      },
      {
        "prompt": "Say one sentence with a number compound adjective.",
        "answer": "They attended a two-hour meeting."
      },
      {
        "prompt": "Describe a security system.",
        "answer": "The system used motion-activated sensors."
      }
    ],
    "writing": [
      {
        "display": "They created a _____ plan.",
        "audio": "They created a high-risk plan.",
        "correct": "high-risk"
      },
      {
        "display": "We need a _____ team.",
        "audio": "We need a well-equipped team.",
        "correct": "well-equipped"
      },
      {
        "display": "She wore a _____ jacket.",
        "audio": "She wore a black leather jacket.",
        "correct": "black leather"
      },
      {
        "display": "They attended a _____ meeting.",
        "audio": "They attended a two-hour meeting.",
        "correct": "two-hour"
      },
      {
        "display": "The system used _____ sensors.",
        "audio": "The system used motion-activated sensors.",
        "correct": "motion-activated"
      }
    ],
    "facts": [
      {
        "passage": "Olivia studied a hand-drawn map and explained a time-sensitive plan to her team. The mission involved a high-security building.",
        "question": "What kind of map did Olivia study?",
        "answer": "a hand-drawn map",
        "distractors": [
          "a plastic map",
          "a folded shirt",
          "a golden key"
        ],
        "detailQuestion": "What kind of plan was it?",
        "detailAnswer": "time-sensitive",
        "detailDistractors": [
          "care-free",
          "water-proof",
          "smoke-free"
        ],
        "vocabQuestion": "What kind of building was involved?",
        "vocabAnswer": "a high-security building",
        "vocabDistractors": [
          "a low-cost school",
          "a two-hour room",
          "a blue cotton house"
        ]
      },
      {
        "passage": "The team needed a well-equipped van, a voice-activated device, and a well-structured plan.",
        "question": "What kind of van was needed?",
        "answer": "a well-equipped van",
        "distractors": [
          "a poorly lit van",
          "a red cotton van",
          "a broken glass van"
        ],
        "detailQuestion": "What kind of device was needed?",
        "detailAnswer": "a voice-activated device",
        "detailDistractors": [
          "a hand-painted device",
          "a weather-sensitive spoon",
          "a dog-friendly phone"
        ],
        "vocabQuestion": "What kind of plan was needed?",
        "vocabAnswer": "a well-structured plan",
        "vocabDistractors": [
          "a careless plan",
          "a silent plan",
          "a borrowed plan"
        ]
      },
      {
        "passage": "Elijah wore an old black leather jacket while reviewing the long dark underground route.",
        "question": "What kind of jacket did Elijah wear?",
        "answer": "an old black leather jacket",
        "distractors": [
          "a leather old black jacket",
          "a black old leather ladder",
          "a green cotton map"
        ],
        "detailQuestion": "What kind of route did he review?",
        "detailAnswer": "a long dark underground route",
        "detailDistractors": [
          "a round silver Italian route",
          "a small blue cotton route",
          "a wooden red route"
        ],
        "vocabQuestion": "Which adjective names material?",
        "vocabAnswer": "leather",
        "vocabDistractors": [
          "old",
          "black",
          "long"
        ]
      },
      {
        "passage": "A two-hour meeting helped the team organize the dangerous mission. They agreed that every detail-oriented member had a clear role.",
        "question": "How long was the meeting?",
        "answer": "two hours",
        "distractors": [
          "two minutes",
          "two weeks",
          "two years"
        ],
        "detailQuestion": "What kind of member had a clear role?",
        "detailAnswer": "a detail-oriented member",
        "detailDistractors": [
          "a careless member",
          "a silent member",
          "a hungry member"
        ],
        "vocabQuestion": "What does role mean?",
        "vocabAnswer": "a function or responsibility",
        "vocabDistractors": [
          "a tool",
          "a color",
          "a meal"
        ]
      },
      {
        "passage": "The motion-activated lights created a serious problem, but Clara prepared a custom-built device to disable them briefly.",
        "question": "What created a problem?",
        "answer": "the motion-activated lights",
        "distractors": [
          "the cotton lights",
          "the wooden table",
          "the Italian coffee"
        ],
        "detailQuestion": "What did Clara prepare?",
        "detailAnswer": "a custom-built device",
        "detailDistractors": [
          "a simple lunch",
          "a short letter",
          "a silver chair"
        ],
        "vocabQuestion": "What does disable mean?",
        "vocabAnswer": "make something stop working",
        "vocabDistractors": [
          "make it louder",
          "make it prettier",
          "make it cheaper"
        ]
      }
    ]
  },
  {
    "number": 93,
    "title": "Lesson 93: Running Is What He Loves Most",
    "vocab": [
      {
        "term": "gerund",
        "clue": "an -ing form used like a noun",
        "prompt": "Running can be a ____.",
        "distractors": [
          "modal",
          "article",
          "question"
        ]
      },
      {
        "term": "infinitive",
        "clue": "to plus base verb",
        "prompt": "To run is an ____ phrase.",
        "distractors": [
          "adjective",
          "plural noun",
          "past tense"
        ]
      },
      {
        "term": "subject",
        "clue": "the noun or phrase a sentence is about",
        "prompt": "Swimming is the ____ of the sentence.",
        "distractors": [
          "object",
          "verb",
          "adverb"
        ]
      },
      {
        "term": "nominalization",
        "clue": "turning an action into a noun-like idea",
        "prompt": "Using running as a noun is ____.",
        "distractors": [
          "inversion",
          "preference",
          "borrowing"
        ]
      },
      {
        "term": "discipline",
        "clue": "steady effort and control",
        "prompt": "Training for a marathon requires ____.",
        "distractors": [
          "traffic",
          "sugar",
          "noise"
        ]
      },
      {
        "term": "stamina",
        "clue": "the ability to keep going physically or mentally",
        "prompt": "Long runs improved his ____.",
        "distractors": [
          "receipt",
          "window",
          "keyboard"
        ]
      },
      {
        "term": "to complete",
        "clue": "an infinitive phrase about finishing something",
        "prompt": "____ the race was his goal.",
        "distractors": [
          "Completing",
          "Completed",
          "Complete"
        ]
      },
      {
        "term": "running daily",
        "clue": "a gerund phrase about a habit",
        "prompt": "____ improves health.",
        "distractors": [
          "To running daily",
          "Ran daily",
          "Daily ran"
        ]
      },
      {
        "term": "specific goal",
        "clue": "a clear target or aim",
        "prompt": "To win the race was a ____.",
        "distractors": [
          "general habit",
          "shopping list",
          "funny noise"
        ]
      },
      {
        "term": "general activity",
        "clue": "an action considered broadly",
        "prompt": "Reading is useful describes a ____.",
        "distractors": [
          "specific ticket",
          "past regret",
          "formal command"
        ]
      }
    ],
    "grammar": [
      {
        "prompt": "_____ every morning improves energy.",
        "answer": "Running",
        "options": [
          "Running",
          "To run",
          "Run",
          "Ran"
        ],
        "fullSentence": "Running every morning improves energy.",
        "correction": {
          "wrongSentence": "To running every morning improves energy.",
          "correctSentence": "Running every morning improves energy.",
          "options": [
            "Running every morning improves energy.",
            "To running every morning improves energy.",
            "Run every morning improves energy.",
            "Ran every morning improves energy."
          ]
        }
      },
      {
        "prompt": "_____ a marathon is his goal.",
        "answer": "To run",
        "options": [
          "To run",
          "Running",
          "Run",
          "Ran"
        ],
        "fullSentence": "To run a marathon is his goal.",
        "correction": {
          "wrongSentence": "Run a marathon is his goal.",
          "correctSentence": "To run a marathon is his goal.",
          "options": [
            "To run a marathon is his goal.",
            "Run a marathon is his goal.",
            "To running a marathon is his goal.",
            "Ran a marathon is his goal."
          ]
        }
      },
      {
        "prompt": "_____ regularly improves overall health.",
        "answer": "Exercising",
        "options": [
          "Exercising",
          "To exercising",
          "Exercise",
          "Exercised"
        ],
        "fullSentence": "Exercising regularly improves overall health.",
        "correction": {
          "wrongSentence": "Exercise regularly improves overall health.",
          "correctSentence": "Exercising regularly improves overall health.",
          "options": [
            "Exercising regularly improves overall health.",
            "Exercise regularly improves overall health.",
            "To exercising regularly improves overall health.",
            "Exercised regularly improves overall health."
          ]
        }
      },
      {
        "prompt": "_____ the project on time requires teamwork.",
        "answer": "To complete",
        "options": [
          "To complete",
          "Completing",
          "Complete",
          "Completed"
        ],
        "fullSentence": "To complete the project on time requires teamwork.",
        "correction": {
          "wrongSentence": "Complete the project on time requires teamwork.",
          "correctSentence": "To complete the project on time requires teamwork.",
          "options": [
            "To complete the project on time requires teamwork.",
            "Complete the project on time requires teamwork.",
            "To completing the project on time requires teamwork.",
            "Completed the project on time requires teamwork."
          ]
        }
      },
      {
        "prompt": "_____ late at night helps me focus.",
        "answer": "Studying",
        "options": [
          "Studying",
          "To studying",
          "Study",
          "Studied"
        ],
        "fullSentence": "Studying late at night helps me focus.",
        "correction": {
          "wrongSentence": "To studying late at night helps me focus.",
          "correctSentence": "Studying late at night helps me focus.",
          "options": [
            "Studying late at night helps me focus.",
            "To studying late at night helps me focus.",
            "Study late at night helps me focus.",
            "Studied late at night helps me focus."
          ]
        }
      },
      {
        "prompt": "_____ abroad is her dream.",
        "answer": "To travel",
        "options": [
          "To travel",
          "Traveling",
          "Travel",
          "Traveled"
        ],
        "fullSentence": "To travel abroad is her dream."
      },
      {
        "prompt": "_____ books improves vocabulary.",
        "answer": "Reading",
        "options": [
          "Reading",
          "To reading",
          "Read",
          "Reads"
        ],
        "fullSentence": "Reading books improves vocabulary."
      },
      {
        "prompt": "_____ a new language requires dedication.",
        "answer": "Learning",
        "options": [
          "Learning",
          "To learning",
          "Learn",
          "Learned"
        ],
        "fullSentence": "Learning a new language requires dedication."
      },
      {
        "prompt": "_____ this problem will take time.",
        "answer": "Solving",
        "options": [
          "Solving",
          "To solving",
          "Solve",
          "Solved"
        ],
        "fullSentence": "Solving this problem will take time."
      },
      {
        "prompt": "_____ honest is important.",
        "answer": "Being",
        "options": [
          "Being",
          "To being",
          "Be",
          "Been"
        ],
        "fullSentence": "Being honest is important."
      }
    ],
    "listening": [
      {
        "sentence": "Running every morning improves energy.",
        "focusQuestion": "What improves energy?",
        "focusAnswer": "running every morning",
        "focusDistractors": [
          "sleeping late",
          "buying shoes",
          "driving slowly"
        ],
        "meaningQuestion": "What kind of subject is running?",
        "meaningAnswer": "a gerund",
        "meaningDistractors": [
          "an infinitive",
          "a modal",
          "a passive verb"
        ]
      },
      {
        "sentence": "To run a marathon is his goal.",
        "focusQuestion": "What is his goal?",
        "focusAnswer": "to run a marathon",
        "focusDistractors": [
          "to buy a car",
          "to write a letter",
          "to cook dinner"
        ],
        "meaningQuestion": "Does the infinitive sound more specific?",
        "meaningAnswer": "yes",
        "meaningDistractors": [
          "no",
          "only in questions",
          "only with passive"
        ]
      },
      {
        "sentence": "Exercising regularly improves overall health.",
        "focusQuestion": "What improves health?",
        "focusAnswer": "exercising regularly",
        "focusDistractors": [
          "eating sugar",
          "missing sleep",
          "avoiding water"
        ],
        "meaningQuestion": "What form is exercising?",
        "meaningAnswer": "gerund",
        "meaningDistractors": [
          "past participle",
          "modal",
          "article"
        ]
      },
      {
        "sentence": "To complete the project on time requires teamwork.",
        "focusQuestion": "What requires teamwork?",
        "focusAnswer": "to complete the project on time",
        "focusDistractors": [
          "to ignore the project",
          "to close the office",
          "to sell tickets"
        ],
        "meaningQuestion": "What form starts the subject?",
        "meaningAnswer": "infinitive",
        "meaningDistractors": [
          "gerund",
          "reported speech",
          "inversion"
        ]
      },
      {
        "sentence": "Reading books improves vocabulary.",
        "focusQuestion": "What does reading improve?",
        "focusAnswer": "vocabulary",
        "focusDistractors": [
          "traffic",
          "weather",
          "furniture"
        ],
        "meaningQuestion": "Is reading used as a noun-like subject?",
        "meaningAnswer": "yes",
        "meaningDistractors": [
          "no",
          "only as an adjective",
          "only as a command"
        ]
      }
    ],
    "speakingPrompts": [
      {
        "prompt": "Make one sentence with a gerund as subject.",
        "answer": "Running every morning improves energy."
      },
      {
        "prompt": "Make one sentence with an infinitive as subject.",
        "answer": "To run a marathon is his goal."
      },
      {
        "prompt": "Say one sentence about studying as a subject.",
        "answer": "Studying late at night helps me focus."
      },
      {
        "prompt": "Say one sentence about reading as a subject.",
        "answer": "Reading books improves vocabulary."
      },
      {
        "prompt": "Say one sentence about being honest.",
        "answer": "Being honest is important."
      }
    ],
    "writing": [
      {
        "display": "_____ every morning improves energy.",
        "audio": "Running every morning improves energy.",
        "correct": "Running"
      },
      {
        "display": "_____ a marathon is his goal.",
        "audio": "To run a marathon is his goal.",
        "correct": "To run"
      },
      {
        "display": "_____ regularly improves overall health.",
        "audio": "Exercising regularly improves overall health.",
        "correct": "Exercising"
      },
      {
        "display": "_____ the project on time requires teamwork.",
        "audio": "To complete the project on time requires teamwork.",
        "correct": "To complete"
      },
      {
        "display": "_____ books improves vocabulary.",
        "audio": "Reading books improves vocabulary.",
        "correct": "Reading"
      }
    ],
    "facts": [
      {
        "passage": "Liam loved running through his coastal town at dawn. Running helped him breathe, think, and continue through difficult seasons.",
        "question": "What did Liam love?",
        "answer": "running through his coastal town",
        "distractors": [
          "buying shoes",
          "sleeping late",
          "reading maps"
        ],
        "detailQuestion": "What did running help him do?",
        "detailAnswer": "breathe, think, and continue",
        "detailDistractors": [
          "forget everything",
          "avoid work",
          "lose hope"
        ],
        "vocabQuestion": "What kind of subject is running?",
        "vocabAnswer": "a gerund subject",
        "vocabDistractors": [
          "an infinitive object",
          "a passive subject",
          "a reported command"
        ]
      },
      {
        "passage": "To run the marathon became Liam's specific goal. Training daily demanded discipline and stamina.",
        "question": "What became Liam's specific goal?",
        "answer": "to run the marathon",
        "distractors": [
          "to buy a bike",
          "to sell coffee",
          "to move away"
        ],
        "detailQuestion": "What did training demand?",
        "detailAnswer": "discipline and stamina",
        "detailDistractors": [
          "money and noise",
          "traffic and weather",
          "paper and ink"
        ],
        "vocabQuestion": "What is stamina?",
        "vocabAnswer": "the ability to keep going",
        "vocabDistractors": [
          "a small injury",
          "a short story",
          "a kind of shoe"
        ]
      },
      {
        "passage": "Swimming had once been Liam's passion, but working long shifts made competitive swimming impossible.",
        "question": "What had once been his passion?",
        "answer": "swimming",
        "distractors": [
          "singing",
          "painting",
          "driving"
        ],
        "detailQuestion": "What made it difficult?",
        "detailAnswer": "working long shifts",
        "detailDistractors": [
          "losing his keys",
          "eating breakfast",
          "reading novels"
        ],
        "vocabQuestion": "What form is swimming here?",
        "vocabAnswer": "gerund",
        "vocabDistractors": [
          "modal",
          "preposition",
          "inversion"
        ]
      },
      {
        "passage": "Practicing daily was exhausting, yet to stop would betray his dream.",
        "question": "What was exhausting?",
        "answer": "practicing daily",
        "distractors": [
          "waiting outside",
          "driving home",
          "buying water"
        ],
        "detailQuestion": "What would betray his dream?",
        "detailAnswer": "to stop",
        "detailDistractors": [
          "to continue",
          "to train",
          "to breathe"
        ],
        "vocabQuestion": "What does betray mean here?",
        "vocabAnswer": "go against or abandon",
        "vocabDistractors": [
          "support strongly",
          "explain clearly",
          "win easily"
        ]
      },
      {
        "passage": "Crossing the finish line was not about the prize. To finish was Liam's triumph.",
        "question": "What was not the main point?",
        "answer": "the prize",
        "distractors": [
          "the weather",
          "the crowd",
          "the road"
        ],
        "detailQuestion": "What was Liam's triumph?",
        "detailAnswer": "to finish",
        "detailDistractors": [
          "to stop",
          "to leave",
          "to complain"
        ],
        "vocabQuestion": "What is a triumph?",
        "vocabAnswer": "a great success",
        "vocabDistractors": [
          "a small mistake",
          "a quiet room",
          "a long delay"
        ]
      }
    ]
  },
  {
    "number": 94,
    "title": "Lesson 94: It's Essential That She Be There",
    "vocab": [
      {
        "term": "subjunctive",
        "clue": "a formal verb mood for necessity, demand, or unreal ideas",
        "prompt": "It is essential that she be there uses the ____.",
        "distractors": [
          "comparative",
          "phrasal verb",
          "article"
        ]
      },
      {
        "term": "essential",
        "clue": "absolutely necessary",
        "prompt": "It is ____ that the report be ready.",
        "distractors": [
          "optional",
          "borrowed",
          "quiet"
        ]
      },
      {
        "term": "crucial",
        "clue": "extremely important",
        "prompt": "Her presence was ____ to the meeting.",
        "distractors": [
          "colorful",
          "late",
          "casual"
        ]
      },
      {
        "term": "recommend",
        "clue": "to say what should be done",
        "prompt": "The doctor may ____ that he rest.",
        "distractors": [
          "borrow",
          "listen",
          "prefer"
        ]
      },
      {
        "term": "demand",
        "clue": "to strongly require",
        "prompt": "The board may ____ that the plan be revised.",
        "distractors": [
          "wish",
          "wonder",
          "compare"
        ]
      },
      {
        "term": "base verb",
        "clue": "the simple form of the verb",
        "prompt": "In the subjunctive, use the ____.",
        "distractors": [
          "past ending",
          "plural noun",
          "future marker"
        ]
      },
      {
        "term": "be",
        "clue": "the subjunctive form of is or are",
        "prompt": "It is vital that he ____ ready.",
        "distractors": [
          "is",
          "are",
          "was"
        ]
      },
      {
        "term": "were",
        "clue": "the past subjunctive form for all subjects",
        "prompt": "If I ____ you, I would wait.",
        "distractors": [
          "was",
          "am",
          "be"
        ]
      },
      {
        "term": "necessity",
        "clue": "something needed or required",
        "prompt": "The structure expresses ____.",
        "distractors": [
          "preference",
          "possession",
          "direction"
        ]
      },
      {
        "term": "formal context",
        "clue": "a serious or professional situation",
        "prompt": "The subjunctive is common in a ____.",
        "distractors": [
          "funny joke",
          "shopping list",
          "cartoon scene"
        ]
      }
    ],
    "grammar": [
      {
        "prompt": "It is essential that she _____ there.",
        "answer": "be",
        "options": [
          "be",
          "is",
          "are",
          "was"
        ],
        "fullSentence": "It is essential that she be there.",
        "correction": {
          "wrongSentence": "It is essential that she is there.",
          "correctSentence": "It is essential that she be there.",
          "options": [
            "It is essential that she be there.",
            "It is essential that she is there.",
            "It is essential that she are there.",
            "It is essential that she was there."
          ]
        }
      },
      {
        "prompt": "The manager demands that all staff _____ the training.",
        "answer": "attend",
        "options": [
          "attend",
          "attends",
          "attended",
          "to attend"
        ],
        "fullSentence": "The manager demands that all staff attend the training.",
        "correction": {
          "wrongSentence": "The manager demands that all staff attends the training.",
          "correctSentence": "The manager demands that all staff attend the training.",
          "options": [
            "The manager demands that all staff attend the training.",
            "The manager demands that all staff attends the training.",
            "The manager demands that all staff to attend the training.",
            "The manager demands that all staff attended the training."
          ]
        }
      },
      {
        "prompt": "It is crucial that we _____ ready.",
        "answer": "be",
        "options": [
          "be",
          "are",
          "were",
          "being"
        ],
        "fullSentence": "It is crucial that we be ready.",
        "correction": {
          "wrongSentence": "It is crucial that we are ready.",
          "correctSentence": "It is crucial that we be ready.",
          "options": [
            "It is crucial that we be ready.",
            "It is crucial that we are ready.",
            "It is crucial that we were ready.",
            "It is crucial that we being ready."
          ]
        }
      },
      {
        "prompt": "The teacher requests that students _____ on time.",
        "answer": "arrive",
        "options": [
          "arrive",
          "arrives",
          "arrived",
          "to arrive"
        ],
        "fullSentence": "The teacher requests that students arrive on time.",
        "correction": {
          "wrongSentence": "The teacher requests that students arrives on time.",
          "correctSentence": "The teacher requests that students arrive on time.",
          "options": [
            "The teacher requests that students arrive on time.",
            "The teacher requests that students arrives on time.",
            "The teacher requests that students to arrive on time.",
            "The teacher requests that students arrived on time."
          ]
        }
      },
      {
        "prompt": "If I _____ rich, I would travel the world.",
        "answer": "were",
        "options": [
          "were",
          "was",
          "am",
          "be"
        ],
        "fullSentence": "If I were rich, I would travel the world.",
        "correction": {
          "wrongSentence": "If I was rich, I would travel the world.",
          "correctSentence": "If I were rich, I would travel the world.",
          "options": [
            "If I were rich, I would travel the world.",
            "If I was rich, I would travel the world.",
            "If I am rich, I would travel the world.",
            "If I be rich, I would travel the world."
          ]
        }
      },
      {
        "prompt": "It is recommended that she _____ the proposal.",
        "answer": "review",
        "options": [
          "review",
          "reviews",
          "reviewed",
          "to review"
        ],
        "fullSentence": "It is recommended that she review the proposal."
      },
      {
        "prompt": "The board insists that the project _____ completed.",
        "answer": "be",
        "options": [
          "be",
          "is",
          "are",
          "was"
        ],
        "fullSentence": "The board insists that the project be completed."
      },
      {
        "prompt": "It is vital that he _____ present.",
        "answer": "be",
        "options": [
          "be",
          "is",
          "are",
          "was"
        ],
        "fullSentence": "It is vital that he be present."
      },
      {
        "prompt": "She acts as if she _____ the boss.",
        "answer": "were",
        "options": [
          "were",
          "was",
          "is",
          "be"
        ],
        "fullSentence": "She acts as if she were the boss."
      },
      {
        "prompt": "I wish he _____ more patient.",
        "answer": "were",
        "options": [
          "were",
          "was",
          "is",
          "be"
        ],
        "fullSentence": "I wish he were more patient."
      }
    ],
    "listening": [
      {
        "sentence": "It is essential that she be there.",
        "focusQuestion": "What is essential?",
        "focusAnswer": "that she be there",
        "focusDistractors": [
          "that she is late",
          "that she leaves",
          "that she calls tomorrow"
        ],
        "meaningQuestion": "Which verb form follows essential that?",
        "meaningAnswer": "base verb",
        "meaningDistractors": [
          "third-person s",
          "past simple",
          "future with will"
        ]
      },
      {
        "sentence": "The manager demands that all staff attend the training.",
        "focusQuestion": "What does the manager demand?",
        "focusAnswer": "that all staff attend the training",
        "focusDistractors": [
          "that all staff miss the training",
          "that all staff buy food",
          "that all staff leave early"
        ],
        "meaningQuestion": "Is attend marked with s?",
        "meaningAnswer": "no",
        "meaningDistractors": [
          "yes",
          "only in the past",
          "only in questions"
        ]
      },
      {
        "sentence": "It is crucial that we be ready.",
        "focusQuestion": "What must we be?",
        "focusAnswer": "ready",
        "focusDistractors": [
          "late",
          "silent",
          "angry"
        ],
        "meaningQuestion": "Which form of be is used?",
        "meaningAnswer": "be",
        "meaningDistractors": [
          "are",
          "were",
          "is"
        ]
      },
      {
        "sentence": "If I were rich, I would travel the world.",
        "focusQuestion": "What would the speaker do?",
        "focusAnswer": "travel the world",
        "focusDistractors": [
          "buy a phone",
          "cook dinner",
          "leave early"
        ],
        "meaningQuestion": "Which form is used for unreal situations?",
        "meaningAnswer": "were",
        "meaningDistractors": [
          "was",
          "is",
          "am"
        ]
      },
      {
        "sentence": "The board insists that the project be completed.",
        "focusQuestion": "What does the board insist?",
        "focusAnswer": "that the project be completed",
        "focusDistractors": [
          "that the project disappear",
          "that the project remain late",
          "that the project cost more"
        ],
        "meaningQuestion": "Does this sound formal?",
        "meaningAnswer": "yes",
        "meaningDistractors": [
          "no",
          "only casual",
          "only childish"
        ]
      }
    ],
    "speakingPrompts": [
      {
        "prompt": "Make one sentence with it is essential that.",
        "answer": "It is essential that she be there."
      },
      {
        "prompt": "Make one sentence with demand that.",
        "answer": "The manager demands that all staff attend the training."
      },
      {
        "prompt": "Make one sentence with it is crucial that.",
        "answer": "It is crucial that we be ready."
      },
      {
        "prompt": "Make one unreal sentence with if I were.",
        "answer": "If I were rich, I would travel the world."
      },
      {
        "prompt": "Make one formal recommendation.",
        "answer": "It is recommended that she review the proposal."
      }
    ],
    "writing": [
      {
        "display": "It is essential that she _____ there.",
        "audio": "It is essential that she be there.",
        "correct": "be"
      },
      {
        "display": "The manager demands that all staff _____ the training.",
        "audio": "The manager demands that all staff attend the training.",
        "correct": "attend"
      },
      {
        "display": "It is crucial that we _____ ready.",
        "audio": "It is crucial that we be ready.",
        "correct": "be"
      },
      {
        "display": "If I _____ rich, I would travel the world.",
        "audio": "If I were rich, I would travel the world.",
        "correct": "were"
      },
      {
        "display": "It is recommended that she _____ the proposal.",
        "audio": "It is recommended that she review the proposal.",
        "correct": "review"
      }
    ],
    "facts": [
      {
        "passage": "Dr. Rivera was the only person who had met all the international delegates. The director said it was essential that she be there.",
        "question": "Why was Dr. Rivera important?",
        "answer": "She had met all the international delegates.",
        "distractors": [
          "She owned the building.",
          "She wrote the calendar.",
          "She drove the bus."
        ],
        "detailQuestion": "What did the director say?",
        "detailAnswer": "It was essential that she be there.",
        "detailDistractors": [
          "It was optional that she leave.",
          "It was funny that she wait.",
          "It was strange that she call."
        ],
        "vocabQuestion": "What does essential mean?",
        "vocabAnswer": "absolutely necessary",
        "vocabDistractors": [
          "not useful",
          "very cheap",
          "easy to forget"
        ]
      },
      {
        "passage": "The board insisted that the proposal be completed before noon. Everyone understood the urgency.",
        "question": "What did the board insist?",
        "answer": "that the proposal be completed before noon",
        "distractors": [
          "that lunch be served early",
          "that the room be painted",
          "that tickets be sold"
        ],
        "detailQuestion": "What did everyone understand?",
        "detailAnswer": "the urgency",
        "detailDistractors": [
          "the music",
          "the recipe",
          "the weather"
        ],
        "vocabQuestion": "What does urgency mean?",
        "vocabAnswer": "the need to act quickly",
        "vocabDistractors": [
          "a slow habit",
          "a quiet gift",
          "a kind of map"
        ]
      },
      {
        "passage": "The professor recommended that each student review the data carefully before the presentation.",
        "question": "What did the professor recommend?",
        "answer": "that each student review the data",
        "distractors": [
          "that each student skip the data",
          "that each student hide the notes",
          "that each student buy tickets"
        ],
        "detailQuestion": "What should be reviewed?",
        "detailAnswer": "the data",
        "detailDistractors": [
          "the bus",
          "the kitchen",
          "the phone"
        ],
        "vocabQuestion": "Which verb form is used after recommend that?",
        "vocabAnswer": "base verb",
        "vocabDistractors": [
          "third-person singular",
          "past perfect",
          "gerund only"
        ]
      },
      {
        "passage": "The director demanded that the team be honest about the risks. He believed trust was more important than a perfect report.",
        "question": "What did the director demand?",
        "answer": "that the team be honest about the risks",
        "distractors": [
          "that the team be late",
          "that the team be quiet forever",
          "that the team be outside"
        ],
        "detailQuestion": "What did he believe was important?",
        "detailAnswer": "trust",
        "detailDistractors": [
          "noise",
          "weather",
          "speed only"
        ],
        "vocabQuestion": "What is a risk?",
        "vocabAnswer": "a possible danger",
        "vocabDistractors": [
          "a certain reward",
          "a small object",
          "a free ticket"
        ]
      },
      {
        "passage": "If Dr. Rivera were absent, the team would struggle to answer complex questions. Her knowledge made the presentation stronger.",
        "question": "What would happen if she were absent?",
        "answer": "The team would struggle to answer complex questions.",
        "distractors": [
          "The team would start singing.",
          "The team would finish early.",
          "The team would leave the country."
        ],
        "detailQuestion": "What made the presentation stronger?",
        "detailAnswer": "her knowledge",
        "detailDistractors": [
          "her suitcase",
          "her phone",
          "her coffee"
        ],
        "vocabQuestion": "What does struggle mean?",
        "vocabAnswer": "have difficulty",
        "vocabDistractors": [
          "succeed easily",
          "move quickly",
          "smile politely"
        ]
      }
    ]
  },
  {
    "number": 95,
    "title": "Lesson 95: Pick Up or Pick On?",
    "vocab": [
      {
        "term": "phrasal verb",
        "clue": "a verb plus particle with a special meaning",
        "prompt": "Pick up is a ____.",
        "distractors": [
          "relative clause",
          "passive tense",
          "noun phrase"
        ]
      },
      {
        "term": "pick up",
        "clue": "to collect, lift, or acquire",
        "prompt": "Can you ____ the package?",
        "distractors": [
          "pick on",
          "look down",
          "run out"
        ]
      },
      {
        "term": "pick on",
        "clue": "to bully or treat unfairly",
        "prompt": "The boys kept trying to ____ Jordan.",
        "distractors": [
          "pick up",
          "turn up",
          "catch up"
        ]
      },
      {
        "term": "run out of",
        "clue": "to have none left",
        "prompt": "We ____ paper before printing the report.",
        "distractors": [
          "look down on",
          "pick on",
          "turn up"
        ]
      },
      {
        "term": "look down on",
        "clue": "to think someone is inferior",
        "prompt": "Never ____ people who are learning.",
        "distractors": [
          "run out of",
          "pick up",
          "give in"
        ]
      },
      {
        "term": "catch up with",
        "clue": "to reach the same level or place",
        "prompt": "I need to ____ the class.",
        "distractors": [
          "back down",
          "pick on",
          "look down on"
        ]
      },
      {
        "term": "turn up",
        "clue": "to arrive or appear",
        "prompt": "She ____ just as the meeting started.",
        "distractors": [
          "ran out of",
          "looked down on",
          "picked on"
        ]
      },
      {
        "term": "back down",
        "clue": "to stop defending a position",
        "prompt": "He refused to ____ during the debate.",
        "distractors": [
          "turn up",
          "pick up",
          "run into"
        ]
      },
      {
        "term": "run into",
        "clue": "to meet by chance or encounter a problem",
        "prompt": "I ____ an old friend yesterday.",
        "distractors": [
          "look down on",
          "pick on",
          "back down"
        ]
      },
      {
        "term": "separable",
        "clue": "able to put the object between verb and particle",
        "prompt": "Pick the phone up is a ____ phrasal verb.",
        "distractors": [
          "formal",
          "passive",
          "reported"
        ]
      }
    ],
    "grammar": [
      {
        "prompt": "The boys kept trying to _____ Jordan.",
        "answer": "pick on",
        "options": [
          "pick on",
          "pick up",
          "turn up",
          "run out of"
        ],
        "fullSentence": "The boys kept trying to pick on Jordan.",
        "correction": {
          "wrongSentence": "The boys kept trying to pick up Jordan, meaning bully him.",
          "correctSentence": "The boys kept trying to pick on Jordan.",
          "options": [
            "The boys kept trying to pick on Jordan.",
            "The boys kept trying to pick up Jordan, meaning bully him.",
            "The boys kept trying to run out of Jordan.",
            "The boys kept trying to turn up Jordan."
          ]
        }
      },
      {
        "prompt": "Can you _____ the package on your way home?",
        "answer": "pick up",
        "options": [
          "pick up",
          "pick on",
          "look down on",
          "back down"
        ],
        "fullSentence": "Can you pick up the package on your way home?",
        "correction": {
          "wrongSentence": "Can you pick on the package on your way home?",
          "correctSentence": "Can you pick up the package on your way home?",
          "options": [
            "Can you pick up the package on your way home?",
            "Can you pick on the package on your way home?",
            "Can you look down the package on your way home?",
            "Can you run out the package on your way home?"
          ]
        }
      },
      {
        "prompt": "We have _____ printer paper.",
        "answer": "run out of",
        "options": [
          "run out of",
          "turned up",
          "picked on",
          "looked down on"
        ],
        "fullSentence": "We have run out of printer paper.",
        "correction": {
          "wrongSentence": "We have run out printer paper.",
          "correctSentence": "We have run out of printer paper.",
          "options": [
            "We have run out of printer paper.",
            "We have run out printer paper.",
            "We have picked on printer paper.",
            "We have turned up printer paper."
          ]
        }
      },
      {
        "prompt": "She tends to _____ people who make mistakes.",
        "answer": "look down on",
        "options": [
          "look down on",
          "pick up",
          "turn up",
          "run into"
        ],
        "fullSentence": "She tends to look down on people who make mistakes.",
        "correction": {
          "wrongSentence": "She tends to look down people who make mistakes.",
          "correctSentence": "She tends to look down on people who make mistakes.",
          "options": [
            "She tends to look down on people who make mistakes.",
            "She tends to look down people who make mistakes.",
            "She tends to pick up on people who make mistakes.",
            "She tends to run out of people who make mistakes."
          ]
        }
      },
      {
        "prompt": "He refused to _____ during the debate.",
        "answer": "back down",
        "options": [
          "back down",
          "turn up",
          "pick on",
          "run out of"
        ],
        "fullSentence": "He refused to back down during the debate.",
        "correction": {
          "wrongSentence": "He refused to back up during the debate, meaning surrender.",
          "correctSentence": "He refused to back down during the debate.",
          "options": [
            "He refused to back down during the debate.",
            "He refused to back up during the debate, meaning surrender.",
            "He refused to turn out during the debate.",
            "He refused to run of during the debate."
          ]
        }
      },
      {
        "prompt": "I need to _____ my work after vacation.",
        "answer": "catch up on",
        "options": [
          "catch up on",
          "look down on",
          "pick on",
          "run into"
        ],
        "fullSentence": "I need to catch up on my work after vacation."
      },
      {
        "prompt": "She _____ at the last minute.",
        "answer": "turned up",
        "options": [
          "turned up",
          "picked on",
          "ran out of",
          "looked down on"
        ],
        "fullSentence": "She turned up at the last minute."
      },
      {
        "prompt": "I _____ an old friend at the store.",
        "answer": "ran into",
        "options": [
          "ran into",
          "ran out of",
          "looked down on",
          "backed down"
        ],
        "fullSentence": "I ran into an old friend at the store."
      },
      {
        "prompt": "Please pick _____ the books before you leave.",
        "answer": "up",
        "options": [
          "up",
          "on",
          "down",
          "out"
        ],
        "fullSentence": "Please pick up the books before you leave."
      },
      {
        "prompt": "Don't pick _____ younger students.",
        "answer": "on",
        "options": [
          "on",
          "up",
          "out",
          "down"
        ],
        "fullSentence": "Don't pick on younger students."
      }
    ],
    "listening": [
      {
        "sentence": "The boys kept trying to pick on Jordan.",
        "focusQuestion": "What were the boys doing?",
        "focusAnswer": "bullying Jordan",
        "focusDistractors": [
          "helping Jordan",
          "collecting Jordan",
          "calling Jordan"
        ],
        "meaningQuestion": "Which phrasal verb means bully?",
        "meaningAnswer": "pick on",
        "meaningDistractors": [
          "pick up",
          "run out of",
          "turn up"
        ]
      },
      {
        "sentence": "Can you pick up the package on your way home?",
        "focusQuestion": "What should be collected?",
        "focusAnswer": "the package",
        "focusDistractors": [
          "the homework",
          "the phone",
          "the jacket"
        ],
        "meaningQuestion": "Which phrasal verb means collect?",
        "meaningAnswer": "pick up",
        "meaningDistractors": [
          "pick on",
          "look down on",
          "back down"
        ]
      },
      {
        "sentence": "We have run out of printer paper.",
        "focusQuestion": "What is gone?",
        "focusAnswer": "printer paper",
        "focusDistractors": [
          "coffee",
          "time",
          "money"
        ],
        "meaningQuestion": "What does run out of mean?",
        "meaningAnswer": "have none left",
        "meaningDistractors": [
          "arrive late",
          "bully someone",
          "learn informally"
        ]
      },
      {
        "sentence": "She tends to look down on people who make mistakes.",
        "focusQuestion": "What attitude does she have?",
        "focusAnswer": "she thinks others are inferior",
        "focusDistractors": [
          "she respects others",
          "she helps others",
          "she studies with others"
        ],
        "meaningQuestion": "Which phrasal verb means regard as inferior?",
        "meaningAnswer": "look down on",
        "meaningDistractors": [
          "turn up",
          "pick up",
          "catch up with"
        ]
      },
      {
        "sentence": "He refused to back down during the debate.",
        "focusQuestion": "What did he refuse to do?",
        "focusAnswer": "stop defending his position",
        "focusDistractors": [
          "arrive late",
          "collect the package",
          "lose paper"
        ],
        "meaningQuestion": "Which phrasal verb means stop defending a position?",
        "meaningAnswer": "back down",
        "meaningDistractors": [
          "run into",
          "pick on",
          "turn up"
        ]
      }
    ],
    "speakingPrompts": [
      {
        "prompt": "Say one sentence with pick up meaning collect.",
        "answer": "Can you pick up the package on your way home?"
      },
      {
        "prompt": "Say one sentence with pick on.",
        "answer": "The boys kept trying to pick on Jordan."
      },
      {
        "prompt": "Say one sentence with run out of.",
        "answer": "We have run out of printer paper."
      },
      {
        "prompt": "Say one sentence with look down on.",
        "answer": "She tends to look down on people who make mistakes."
      },
      {
        "prompt": "Say one sentence with back down.",
        "answer": "He refused to back down during the debate."
      }
    ],
    "writing": [
      {
        "display": "The boys kept trying to _____ Jordan.",
        "audio": "The boys kept trying to pick on Jordan.",
        "correct": "pick on"
      },
      {
        "display": "Can you _____ the package on your way home?",
        "audio": "Can you pick up the package on your way home?",
        "correct": "pick up"
      },
      {
        "display": "We have _____ printer paper.",
        "audio": "We have run out of printer paper.",
        "correct": "run out of"
      },
      {
        "display": "She tends to _____ people who make mistakes.",
        "audio": "She tends to look down on people who make mistakes.",
        "correct": "look down on"
      },
      {
        "display": "He refused to _____ during the debate.",
        "audio": "He refused to back down during the debate.",
        "correct": "back down"
      }
    ],
    "facts": [
      {
        "passage": "Jordan was being picked on at school because he liked reading. His sister encouraged him to pick up the courage to speak to a teacher.",
        "question": "Why was Jordan being picked on?",
        "answer": "Because he liked reading.",
        "distractors": [
          "Because he played soccer.",
          "Because he sang loudly.",
          "Because he missed the bus."
        ],
        "detailQuestion": "What did his sister encourage him to pick up?",
        "detailAnswer": "the courage to speak to a teacher",
        "detailDistractors": [
          "a heavy box",
          "a new phone",
          "a school bag"
        ],
        "vocabQuestion": "What does pick on mean?",
        "vocabAnswer": "bully or tease unfairly",
        "vocabDistractors": [
          "collect",
          "arrive",
          "respect"
        ]
      },
      {
        "passage": "The class ran out of time before the final exercise, so the teacher told students to catch up on the activity at home.",
        "question": "What did the class run out of?",
        "answer": "time",
        "distractors": [
          "paper",
          "money",
          "water"
        ],
        "detailQuestion": "What did the teacher tell students to do?",
        "detailAnswer": "catch up on the activity at home",
        "detailDistractors": [
          "ignore the activity",
          "pick on the activity",
          "turn up the activity"
        ],
        "vocabQuestion": "What does catch up on mean?",
        "vocabAnswer": "do missed work or information",
        "vocabDistractors": [
          "lose all of something",
          "think someone is inferior",
          "arrive unexpectedly"
        ]
      },
      {
        "passage": "A student turned up late but apologized honestly. The teacher did not look down on him and helped him join the group.",
        "question": "Who turned up late?",
        "answer": "a student",
        "distractors": [
          "a teacher",
          "a driver",
          "a parent"
        ],
        "detailQuestion": "How did the teacher respond?",
        "detailAnswer": "The teacher helped him join the group.",
        "detailDistractors": [
          "The teacher mocked him.",
          "The teacher left him outside.",
          "The teacher canceled class."
        ],
        "vocabQuestion": "What does turn up mean?",
        "vocabAnswer": "arrive or appear",
        "vocabDistractors": [
          "bully",
          "collect",
          "reduce"
        ]
      },
      {
        "passage": "During the debate, Ana refused to back down when others pressured her unfairly. She stayed calm and explained her point.",
        "question": "What did Ana refuse to do?",
        "answer": "back down",
        "distractors": [
          "pick up",
          "turn up",
          "run out"
        ],
        "detailQuestion": "How did she act?",
        "detailAnswer": "She stayed calm and explained her point.",
        "detailDistractors": [
          "She shouted and left.",
          "She ignored everyone.",
          "She changed the topic."
        ],
        "vocabQuestion": "What does pressured mean?",
        "vocabAnswer": "pushed or urged strongly",
        "vocabDistractors": [
          "praised gently",
          "paid quickly",
          "prepared quietly"
        ]
      },
      {
        "passage": "David ran into an old friend at the library and picked up a book she recommended.",
        "question": "Who did David run into?",
        "answer": "an old friend",
        "distractors": [
          "a new teacher",
          "a bus driver",
          "a stranger at church"
        ],
        "detailQuestion": "What did he pick up?",
        "detailAnswer": "a recommended book",
        "detailDistractors": [
          "a broken chair",
          "a phone call",
          "a street sign"
        ],
        "vocabQuestion": "What does run into mean here?",
        "vocabAnswer": "meet by chance",
        "vocabDistractors": [
          "use all of",
          "look down on",
          "bully"
        ]
      }
    ]
  },
  {
    "number": 96,
    "title": "Lesson 96: A Story Worth Telling",
    "vocab": [
      {
        "term": "reduced clause",
        "clue": "a shorter adjective clause without the relative pronoun",
        "prompt": "The soldier stationed overseas uses a ____.",
        "distractors": [
          "modal verb",
          "reported question",
          "future plan"
        ]
      },
      {
        "term": "present participle",
        "clue": "an -ing form used in a reduced active clause",
        "prompt": "The people waiting outside uses a ____.",
        "distractors": [
          "past participle",
          "bare infinitive",
          "conjunction"
        ]
      },
      {
        "term": "past participle",
        "clue": "a verb form used in reduced passive clauses",
        "prompt": "The letter written decades ago uses a ____.",
        "distractors": [
          "present participle",
          "question word",
          "modal"
        ]
      },
      {
        "term": "worth telling",
        "clue": "valuable enough to tell",
        "prompt": "Their love story was ____.",
        "distractors": [
          "easy asking",
          "late walking",
          "rarely seen"
        ]
      },
      {
        "term": "preserved",
        "clue": "kept safe over time",
        "prompt": "The old letters were ____ in a drawer.",
        "distractors": [
          "destroyed",
          "ignored",
          "borrowed"
        ]
      },
      {
        "term": "cherished",
        "clue": "loved and protected",
        "prompt": "The letters were ____ by the family.",
        "distractors": [
          "canceled",
          "confused",
          "delayed"
        ]
      },
      {
        "term": "stationed overseas",
        "clue": "sent to serve in another country",
        "prompt": "The soldier ____ wrote the letter.",
        "distractors": [
          "waiting outside",
          "painted red",
          "running daily"
        ]
      },
      {
        "term": "written by",
        "clue": "created by a writer",
        "prompt": "The poem ____ Clara became famous.",
        "distractors": [
          "running toward",
          "known as",
          "worth in"
        ]
      },
      {
        "term": "known for",
        "clue": "recognized because of something",
        "prompt": "Ellie was a writer ____ historical research.",
        "distractors": [
          "known for",
          "built by",
          "waiting with"
        ]
      },
      {
        "term": "adapted into",
        "clue": "changed into another form",
        "prompt": "The book was ____ a film.",
        "distractors": [
          "run out of",
          "picked on",
          "turned down"
        ]
      }
    ],
    "grammar": [
      {
        "prompt": "The letter _____ decades ago was still readable.",
        "answer": "written",
        "options": [
          "written",
          "writing",
          "wrote",
          "to write"
        ],
        "fullSentence": "The letter written decades ago was still readable.",
        "correction": {
          "wrongSentence": "The letter writing decades ago was still readable.",
          "correctSentence": "The letter written decades ago was still readable.",
          "options": [
            "The letter written decades ago was still readable.",
            "The letter writing decades ago was still readable.",
            "The letter wrote decades ago was still readable.",
            "The letter to write decades ago was still readable."
          ]
        }
      },
      {
        "prompt": "The people _____ outside need help.",
        "answer": "waiting",
        "options": [
          "waiting",
          "waited",
          "wait",
          "to wait"
        ],
        "fullSentence": "The people waiting outside need help.",
        "correction": {
          "wrongSentence": "The people waited outside need help.",
          "correctSentence": "The people waiting outside need help.",
          "options": [
            "The people waiting outside need help.",
            "The people waited outside need help.",
            "The people wait outside need help.",
            "The people to wait outside need help."
          ]
        }
      },
      {
        "prompt": "The cake _____ yesterday tastes wonderful.",
        "answer": "baked",
        "options": [
          "baked",
          "baking",
          "bake",
          "to bake"
        ],
        "fullSentence": "The cake baked yesterday tastes wonderful.",
        "correction": {
          "wrongSentence": "The cake baking yesterday tastes wonderful.",
          "correctSentence": "The cake baked yesterday tastes wonderful.",
          "options": [
            "The cake baked yesterday tastes wonderful.",
            "The cake baking yesterday tastes wonderful.",
            "The cake bake yesterday tastes wonderful.",
            "The cake to bake yesterday tastes wonderful."
          ]
        }
      },
      {
        "prompt": "The girl _____ on stage is my cousin.",
        "answer": "singing",
        "options": [
          "singing",
          "sung",
          "sang",
          "to sing"
        ],
        "fullSentence": "The girl singing on stage is my cousin.",
        "correction": {
          "wrongSentence": "The girl sung on stage is my cousin.",
          "correctSentence": "The girl singing on stage is my cousin.",
          "options": [
            "The girl singing on stage is my cousin.",
            "The girl sung on stage is my cousin.",
            "The girl sang on stage is my cousin.",
            "The girl to sing on stage is my cousin."
          ]
        }
      },
      {
        "prompt": "This is a story worth _____.",
        "answer": "telling",
        "options": [
          "telling",
          "to tell",
          "tell",
          "told"
        ],
        "fullSentence": "This is a story worth telling.",
        "correction": {
          "wrongSentence": "This is a story worth to tell.",
          "correctSentence": "This is a story worth telling.",
          "options": [
            "This is a story worth telling.",
            "This is a story worth to tell.",
            "This is a story worth tell.",
            "This is a story worth told."
          ]
        }
      },
      {
        "prompt": "The documents _____ by the historian were valuable.",
        "answer": "collected",
        "options": [
          "collected",
          "collecting",
          "collect",
          "to collect"
        ],
        "fullSentence": "The documents collected by the historian were valuable."
      },
      {
        "prompt": "The soldiers _____ in battle were remembered.",
        "answer": "injured",
        "options": [
          "injured",
          "injuring",
          "injure",
          "to injure"
        ],
        "fullSentence": "The soldiers injured in battle were remembered."
      },
      {
        "prompt": "The students _____ for exams looked tired.",
        "answer": "preparing",
        "options": [
          "preparing",
          "prepared",
          "prepare",
          "to prepare"
        ],
        "fullSentence": "The students preparing for exams looked tired."
      },
      {
        "prompt": "The city _____ by war was rebuilt.",
        "answer": "destroyed",
        "options": [
          "destroyed",
          "destroying",
          "destroy",
          "to destroy"
        ],
        "fullSentence": "The city destroyed by war was rebuilt."
      },
      {
        "prompt": "It is a question worth _____.",
        "answer": "asking",
        "options": [
          "asking",
          "to ask",
          "ask",
          "asked"
        ],
        "fullSentence": "It is a question worth asking."
      }
    ],
    "listening": [
      {
        "sentence": "The letter written decades ago was still readable.",
        "focusQuestion": "What was still readable?",
        "focusAnswer": "the letter",
        "focusDistractors": [
          "the book",
          "the poem",
          "the map"
        ],
        "meaningQuestion": "Is written active or passive in meaning?",
        "meaningAnswer": "passive",
        "meaningDistractors": [
          "active",
          "future",
          "modal"
        ]
      },
      {
        "sentence": "The people waiting outside need help.",
        "focusQuestion": "Who needs help?",
        "focusAnswer": "the people waiting outside",
        "focusDistractors": [
          "the teacher",
          "the driver",
          "the writer"
        ],
        "meaningQuestion": "Is waiting active or passive in meaning?",
        "meaningAnswer": "active",
        "meaningDistractors": [
          "passive",
          "reported",
          "conditional"
        ]
      },
      {
        "sentence": "The cake baked yesterday tastes wonderful.",
        "focusQuestion": "When was the cake baked?",
        "focusAnswer": "yesterday",
        "focusDistractors": [
          "today",
          "last year",
          "next week"
        ],
        "meaningQuestion": "Which participle is used?",
        "meaningAnswer": "past participle",
        "meaningDistractors": [
          "present participle",
          "infinitive",
          "modal"
        ]
      },
      {
        "sentence": "The girl singing on stage is my cousin.",
        "focusQuestion": "Who is the speaker's cousin?",
        "focusAnswer": "the girl singing on stage",
        "focusDistractors": [
          "the boy writing letters",
          "the woman cooking",
          "the man driving"
        ],
        "meaningQuestion": "Which participle is used?",
        "meaningAnswer": "present participle",
        "meaningDistractors": [
          "past participle",
          "subjunctive",
          "auxiliary"
        ]
      },
      {
        "sentence": "This is a story worth telling.",
        "focusQuestion": "What is worth telling?",
        "focusAnswer": "the story",
        "focusDistractors": [
          "the meeting",
          "the price",
          "the road"
        ],
        "meaningQuestion": "What form follows worth?",
        "meaningAnswer": "gerund",
        "meaningDistractors": [
          "base verb",
          "past simple",
          "modal"
        ]
      }
    ],
    "speakingPrompts": [
      {
        "prompt": "Make one sentence with a reduced passive clause.",
        "answer": "The letter written decades ago was still readable."
      },
      {
        "prompt": "Make one sentence with a reduced active clause.",
        "answer": "The people waiting outside need help."
      },
      {
        "prompt": "Make one sentence with worth + ing.",
        "answer": "This is a story worth telling."
      },
      {
        "prompt": "Describe students with a reduced clause.",
        "answer": "The students preparing for exams looked tired."
      },
      {
        "prompt": "Describe a city with a reduced clause.",
        "answer": "The city destroyed by war was rebuilt."
      }
    ],
    "writing": [
      {
        "display": "The letter _____ decades ago was still readable.",
        "audio": "The letter written decades ago was still readable.",
        "correct": "written"
      },
      {
        "display": "The people _____ outside need help.",
        "audio": "The people waiting outside need help.",
        "correct": "waiting"
      },
      {
        "display": "The cake _____ yesterday tastes wonderful.",
        "audio": "The cake baked yesterday tastes wonderful.",
        "correct": "baked"
      },
      {
        "display": "The girl _____ on stage is my cousin.",
        "audio": "The girl singing on stage is my cousin.",
        "correct": "singing"
      },
      {
        "display": "This is a story worth _____.",
        "audio": "This is a story worth telling.",
        "correct": "telling"
      }
    ],
    "facts": [
      {
        "passage": "Ellie found a letter written decades ago by a soldier stationed overseas. The letter described ordinary moments preserved by hope.",
        "question": "What did Ellie find?",
        "answer": "a letter written decades ago",
        "distractors": [
          "a new phone",
          "a broken chair",
          "a city map"
        ],
        "detailQuestion": "Who had written it?",
        "detailAnswer": "a soldier stationed overseas",
        "detailDistractors": [
          "a teacher at home",
          "a driver downtown",
          "a singer on stage"
        ],
        "vocabQuestion": "What does preserved mean?",
        "vocabAnswer": "kept safe over time",
        "vocabDistractors": [
          "lost quickly",
          "painted blue",
          "sold cheaply"
        ]
      },
      {
        "passage": "The love letters exchanged by the couple were cherished by their families and reopened over generations.",
        "question": "What was cherished?",
        "answer": "the love letters",
        "distractors": [
          "the bus tickets",
          "the coffee cups",
          "the broken toys"
        ],
        "detailQuestion": "Who cherished them?",
        "detailAnswer": "their families",
        "detailDistractors": [
          "their enemies",
          "their teachers only",
          "their neighbors' pets"
        ],
        "vocabQuestion": "What does exchanged mean?",
        "vocabAnswer": "given and received between people",
        "vocabDistractors": [
          "hidden forever",
          "burned quickly",
          "borrowed silently"
        ]
      },
      {
        "passage": "Ellie, known for historical research, discovered a story worth telling and began collecting photographs.",
        "question": "What was Ellie known for?",
        "answer": "historical research",
        "distractors": [
          "selling cars",
          "cooking desserts",
          "painting roads"
        ],
        "detailQuestion": "What kind of story did she discover?",
        "detailAnswer": "a story worth telling",
        "detailDistractors": [
          "a story worth hiding",
          "a story worth losing",
          "a story worth canceling"
        ],
        "vocabQuestion": "What did she begin collecting?",
        "vocabAnswer": "photographs",
        "vocabDistractors": [
          "tickets",
          "shoes",
          "umbrellas"
        ]
      },
      {
        "passage": "The book published a year later became a tribute to memory and love. Readers touched by the story sent many letters.",
        "question": "What became a tribute to memory and love?",
        "answer": "the book published a year later",
        "distractors": [
          "the house painted red",
          "the song sung loudly",
          "the ticket bought early"
        ],
        "detailQuestion": "Who sent many letters?",
        "detailAnswer": "readers touched by the story",
        "detailDistractors": [
          "drivers stuck in traffic",
          "students closing books",
          "artists drawing maps"
        ],
        "vocabQuestion": "What does tribute mean?",
        "vocabAnswer": "something that honors a person or idea",
        "vocabDistractors": [
          "a cheap object",
          "a loud warning",
          "a private joke"
        ]
      },
      {
        "passage": "The story adapted into a film reached people in several countries. Clara said the soldier would never be forgotten.",
        "question": "What was adapted into a film?",
        "answer": "the story",
        "distractors": [
          "the table",
          "the letter opener",
          "the bus route"
        ],
        "detailQuestion": "Who said the soldier would never be forgotten?",
        "detailAnswer": "Clara",
        "detailDistractors": [
          "Ellie",
          "a director",
          "a teacher"
        ],
        "vocabQuestion": "What does adapted into mean?",
        "vocabAnswer": "changed into another form",
        "vocabDistractors": [
          "removed from memory",
          "hidden inside a drawer",
          "made impossible"
        ]
      }
    ]
  }
];

export const workbook8Lessons = workbook8Configs.map(buildWorkbook8Lesson);
