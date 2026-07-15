import type { Exercise, Lesson } from '../../types.ts';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
] as const;

const LETTER_CONTRASTS: Record<string, string[]> = {
  A: ['A', 'E', 'H', 'R'], E: ['E', 'A', 'I', 'H'], H: ['H', 'A', 'E', 'R'], R: ['R', 'A', 'L', 'W'],
  B: ['B', 'D', 'P', 'V'], D: ['D', 'B', 'T', 'P'], P: ['P', 'B', 'D', 'V'], V: ['V', 'B', 'P', 'W'],
  G: ['G', 'J', 'K', 'Z'], J: ['J', 'G', 'K', 'Z'], K: ['K', 'J', 'Q', 'G'], Z: ['Z', 'G', 'J', 'S'],
  M: ['M', 'N', 'L', 'W'], N: ['N', 'M', 'L', 'R'], L: ['L', 'M', 'N', 'R'], W: ['W', 'M', 'N', 'R'],
  I: ['I', 'Y', 'E', 'A'], Y: ['Y', 'I', 'E', 'A'], C: ['C', 'G', 'S', 'Z'], F: ['F', 'S', 'V', 'E'],
  O: ['O', 'Q', 'U', 'A'], Q: ['Q', 'O', 'U', 'K'], S: ['S', 'C', 'X', 'Z'], T: ['T', 'D', 'P', 'G'],
  U: ['U', 'Q', 'O', 'V'], X: ['X', 'S', 'Z', 'K'],
};

const NUMBER_CONTRASTS: Record<number, string[]> = {
  0: ['0', '10', '1', '20'], 1: ['1', '7', '11', '10'], 2: ['2', '12', '20', '10'], 3: ['3', '13', '8', '18'],
  4: ['4', '14', '40', '44'], 5: ['5', '15', '50', '55'], 6: ['6', '16', '60', '66'], 7: ['7', '17', '70', '77'],
  8: ['8', '18', '80', '88'], 9: ['9', '19', '90', '99'], 10: ['10', '0', '11', '20'], 11: ['11', '1', '12', '20'],
  12: ['12', '2', '20', '11'], 13: ['13', '3', '30', '18'], 14: ['14', '4', '40', '44'], 15: ['15', '5', '50', '55'],
  16: ['16', '6', '60', '66'], 17: ['17', '7', '70', '77'], 18: ['18', '8', '80', '88'], 19: ['19', '9', '90', '99'],
  20: ['20', '2', '12', '10'],
};

const NUMBER_WORD_CONTRASTS: Record<number, string[]> = {
  11: ['eleven', 'one', 'twelve', 'twenty'], 12: ['twelve', 'two', 'twenty', 'eleven'],
  13: ['thirteen', 'three', 'thirty', 'eighteen'], 14: ['fourteen', 'four', 'forty', 'forty-four'],
  15: ['fifteen', 'five', 'fifty', 'fourteen'], 16: ['sixteen', 'six', 'sixty', 'seventeen'],
  17: ['seventeen', 'seven', 'seventy', 'sixteen'], 18: ['eighteen', 'eight', 'eighty', 'thirteen'],
  19: ['nineteen', 'nine', 'ninety', 'eighteen'], 20: ['twenty', 'two', 'twelve', 'ten'],
};

function authored(id: string, exercise: Omit<Exercise, 'id'>): Exercise {
  return {
    ...exercise,
    id: `wb1_l1_${id}`,
    contentOrigin: 'lesson1Authored',
    introducesNewContent: exercise.introducesNewContent ?? false,
    assessesContent: exercise.assessesContent ?? true,
  };
}

function letterRecognition(letter: string): Exercise {
  return authored(`letter_recognition_${letter.toLowerCase()}`, {
    type: 'multiple-choice',
    instruction: 'Choose the correct letter.',
    audioValue: `${letter}. This is the letter ${letter}.`,
    displayValue: letter,
    options: LETTER_CONTRASTS[letter],
    correctValue: letter,
    fullSentenceAfterAnswer: `This is the letter ${letter}.`,
    pedagogicalTopic: 'alphabet',
    prerequisite: 'none',
    introducesNewContent: true,
    assessesContent: false,
    isNewVocab: letter === 'A',
  });
}

function numberRecognition(value: number): Exercise {
  const word = NUMBER_WORDS[value];
  // Fourteen keeps the PDF/requested diagnostic digit contrast (4/14/40/44).
  // The remaining teen numbers introduce audio-to-word recognition.
  const choosesWord = value >= 11 && value !== 14;
  return authored(`number_recognition_${value}`, {
    type: 'identification',
    instruction: 'Choose the correct number.',
    audioValue: `${word}. This is the number ${word}.`,
    displayValue: String(value),
    options: choosesWord ? NUMBER_WORD_CONTRASTS[value] : NUMBER_CONTRASTS[value],
    correctValue: choosesWord ? word : String(value),
    fullSentenceAfterAnswer: `This is the number ${word}.`,
    pedagogicalTopic: 'numbers',
    prerequisite: 'none',
    introducesNewContent: true,
    assessesContent: false,
    isNewVocab: value === 0,
  });
}

function letterYesNo(letter: string, index: number): Exercise {
  const isMatch = index % 2 === 0;
  const display = isMatch ? letter : (LETTER_CONTRASTS[letter].find((candidate) => candidate !== letter) ?? LETTERS[(index + 1) % LETTERS.length]);
  return authored(`letter_yes_no_${letter.toLowerCase()}`, {
    type: 'multiple-choice',
    instruction: 'Choose YES or NO.',
    audioValue: `Is this the letter ${letter}?`,
    displayValue: display,
    options: ['YES', 'NO'],
    correctValue: isMatch ? 'YES' : 'NO',
    fullSentenceAfterAnswer: isMatch
      ? `Yes, it is. It is a letter. This is the letter ${letter}.`
      : `No, it is not. It is a letter. This is the letter ${display}.`,
    pedagogicalTopic: 'alphabet',
    prerequisite: `letter ${letter} recognition`,
  });
}

const day1 = LETTERS.slice(0, 15).map(letterRecognition);
const day2 = [...LETTERS.slice(15).map(letterRecognition), ...[0, 1, 2, 3].map(numberRecognition)];
const day3 = Array.from({ length: 15 }, (_, index) => numberRecognition(index + 4));
const day4 = [numberRecognition(19), numberRecognition(20), ...LETTERS.slice(0, 8).map(letterYesNo)];
const day5 = LETTERS.slice(8, 23).map((letter, index) => letterYesNo(letter, index + 8));
const day6 = [
  ...LETTERS.slice(23).map((letter, index) => letterYesNo(letter, index + 23)),
  authored('number_yes_no_14', {
    type: 'multiple-choice', instruction: 'Choose YES or NO.', audioValue: 'Is this the number fourteen?', displayValue: '4',
    options: ['YES', 'NO'], correctValue: 'NO', fullSentenceAfterAnswer: 'No, it is not. This is the number four.',
    pedagogicalTopic: 'numbers', prerequisite: 'number 14 recognition',
  }),
  authored('number_write_7', {
    type: 'writing', instruction: 'Write the number word.', audioValue: 'seven', displayValue: '7', correctValue: 'seven',
    pedagogicalTopic: 'numbers', prerequisite: 'number 7 recognition',
  }),
  authored('number_write_16', {
    type: 'writing', instruction: 'Write the number word.', audioValue: 'sixteen', displayValue: '16', correctValue: 'sixteen',
    pedagogicalTopic: 'numbers', prerequisite: 'number 16 recognition',
  }),
  authored('shadow_letters', {
    type: 'speaking', assessmentMode: 'shadowing', instruction: 'Listen and repeat.', audioValue: 'They are letters.', correctValue: 'They are letters.',
    displayValue: 'A B', pedagogicalTopic: 'singular-and-plural', prerequisite: 'letter recognition',
  }),
  authored('shadow_numbers', {
    type: 'speaking', assessmentMode: 'shadowing', instruction: 'Listen and repeat.', audioValue: 'They are numbers.', correctValue: 'They are numbers.',
    displayValue: '1 2', pedagogicalTopic: 'singular-and-plural', prerequisite: 'number recognition',
  }),
  authored('shadow_number_20', {
    type: 'speaking', assessmentMode: 'shadowing', instruction: 'Listen and repeat.', audioValue: 'This is the number twenty.', correctValue: 'This is the number twenty.',
    displayValue: '20', pedagogicalTopic: 'numbers', prerequisite: 'number 20 recognition',
  }),
  authored('speak_number_12', {
    type: 'speaking', assessmentMode: 'speaking', instruction: 'Listen and answer.', audioValue: 'What is this?', displayValue: '12',
    correctValue: 'It is a number.', acceptedAnswers: ["It's a number."], pedagogicalTopic: 'numbers', prerequisite: 'number recognition and modeled identification',
  }),
];

const finalListening: Array<[string, string, string]> = [
  ['letter_a', 'A', 'alphabet'], ['letter_e', 'E', 'alphabet'], ['letter_h', 'H', 'alphabet'], ['letter_z', 'Z', 'alphabet'],
  ['number_0', 'zero', 'numbers'], ['number_4', 'four', 'numbers'], ['number_14', 'fourteen', 'numbers'], ['number_20', 'twenty', 'numbers'],
];
const finalShadowing: Array<[string, string, string]> = [
  ['letter_a', 'This is the letter A.', 'alphabet'], ['letter_z', 'This is the letter Z.', 'alphabet'],
  ['number_0', 'This is the number zero.', 'numbers'], ['number_20', 'This is the number twenty.', 'numbers'],
  ['letters', 'They are letters.', 'singular-and-plural'], ['numbers', 'They are numbers.', 'singular-and-plural'],
];
const finalSpeaking: Array<[string, string, string, string, string]> = [
  ['identify_letter', 'What is this?', 'B', 'It is a letter.', 'alphabet'],
  ['identify_number', 'What is this?', '12', 'It is a number.', 'numbers'],
  ['yes_letter', 'Is this the letter A?', 'A', 'Yes, it is.', 'alphabet'],
  ['no_letter', 'Is this the letter A?', 'E', 'No, it is not.', 'alphabet'],
  ['plural_letters', 'What are they?', 'A B', 'They are letters.', 'singular-and-plural'],
  ['plural_numbers', 'What are they?', '1 2', 'They are numbers.', 'singular-and-plural'],
];

const day7: Exercise[] = [
  ...finalListening.map(([key, audioValue, topic]) => authored(`final_listen_write_${key}`, {
    type: 'writing', assessmentMode: 'listening-writing', coverageObjective: 'Alphabet A-Z and numbers 0-20',
    instruction: 'Listen and write.', audioValue, correctValue: audioValue, pedagogicalTopic: topic,
    prerequisite: 'recognition practice',
  })),
  ...finalShadowing.map(([key, sentence, topic]) => authored(`final_shadow_${key}`, {
    type: 'speaking', assessmentMode: 'shadowing', coverageObjective: 'Alphabet A-Z and numbers 0-20',
    instruction: 'Listen and repeat.', audioValue: sentence, correctValue: sentence, pedagogicalTopic: topic,
    prerequisite: 'modeled sentence in practice',
  })),
  ...finalSpeaking.map(([key, audioValue, displayValue, correctValue, topic]) => authored(`final_speak_${key}`, {
    type: 'speaking', assessmentMode: 'speaking', coverageObjective: 'Alphabet A-Z and numbers 0-20',
    instruction: 'Listen and answer.', audioValue, displayValue, correctValue, pedagogicalTopic: topic,
    prerequisite: 'recognition, Yes/No and oral modeling',
  })),
];

export const lesson1Authored: Lesson = {
  id: 'wb1_l1',
  title: 'Lesson 1: The Alphabet and Numbers',
  days: [day1, day2, day3, day4, day5, day6, day7].map((exercises, index) => ({
    id: `wb1_l1_d${index + 1}`,
    type: index === 6 ? 'review' : 'practice',
    exercises,
  })),
};
