import type { Exercise, Lesson } from '../../types.ts';

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const numberWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen'];
const colors = [
  ['red', 'vermelho'], ['blue', 'azul'], ['green', 'verde'], ['yellow', 'amarelo'], ['orange', 'laranja'],
  ['black', 'preto'], ['white', 'branco'], ['purple', 'roxo'], ['pink', 'rosa'], ['brown', 'marrom'],
] as const;

type Draft = Omit<Exercise, 'id'> & { id: string };

function authored(id: string, exercise: Omit<Draft, 'id'>): Draft {
  return {
    ...exercise,
    id: `wb1_l1_${id}`,
    contentOrigin: 'lesson1Authored',
    pedagogicalTopic: exercise.pedagogicalTopic ?? 'alphabet-and-numbers',
  };
}

function colorOptions(index: number): string[] {
  return [0, 1, 2, 3].map((offset) => colors[(index + offset) % colors.length][0]);
}

const day1: Exercise[] = [
  ...letters.slice(0, 10).map((letter) => authored(`intro_letter_${letter.toLowerCase()}`, {
    type: 'multiple-choice',
    instruction: 'Look at the symbol. Is it a letter or a number?',
    displayValue: letter,
    audioValue: `This is the letter ${letter}.`,
    options: ['letter', 'number'],
    correctValue: 'letter',
    isNewVocab: letter === 'A',
    introducesNewContent: true,
    assessesContent: false,
    prerequisite: 'none',
    pedagogicalTopic: 'alphabet',
  })),
  ...numberWords.slice(1, 6).map((word, index) => authored(`intro_number_${index + 1}`, {
    type: 'multiple-choice',
    instruction: 'Look at the symbol. Is it a letter or a number?',
    displayValue: String(index + 1),
    audioValue: `This is the number ${word}.`,
    options: ['number', 'letter'],
    correctValue: 'number',
    isNewVocab: index === 0,
    introducesNewContent: true,
    assessesContent: false,
    prerequisite: 'none',
    pedagogicalTopic: 'numbers',
  })),
];

const day2: Exercise[] = [
  ...letters.slice(10, 20).map((letter, index) => authored(`recognize_letter_${letter.toLowerCase()}`, {
    type: 'multiple-choice',
    instruction: 'Listen and choose the letter you hear.',
    displayValue: `Letters ${letters[10 + index]}–${letters[Math.min(19, 13 + index)]}`,
    audioValue: letter,
    options: [letter, letters[(10 + index + 1) % 26], letters[(10 + index + 2) % 26], letters[(10 + index + 3) % 26]],
    correctValue: letter,
    introducesNewContent: false,
    assessesContent: true,
    prerequisite: 'visual letter presentation',
    pedagogicalTopic: 'alphabet',
  })),
  ...numberWords.slice(6, 11).map((word, index) => authored(`recognize_number_${index + 6}`, {
    type: 'identification',
    instruction: 'Listen and choose the number you hear.',
    displayValue: 'Numbers 6–10',
    audioValue: word,
    options: [String(index + 6), String((index + 7) % 11), String((index + 8) % 11), String((index + 9) % 11)],
    correctValue: String(index + 6),
    introducesNewContent: false,
    assessesContent: true,
    prerequisite: 'visual number presentation',
    pedagogicalTopic: 'numbers',
  })),
];

const pluralModels = [
  ['A', 'This is the letter A.'],
  ['1', 'This is the number one.'],
  ['A B', 'They are letters.'],
  ['1 2', 'They are numbers.'],
  ['A 1', 'They are a letter and a number.'],
] as const;

const day3: Exercise[] = [
  ...letters.slice(20).map((letter, index) => authored(`write_letter_${letter.toLowerCase()}`, {
    type: 'writing',
    instruction: 'Write the letter you hear.',
    displayValue: `Letter ${index + 21} of 26`,
    audioValue: letter,
    correctValue: letter,
    introducesNewContent: false,
    assessesContent: true,
    prerequisite: 'letter recognition',
    pedagogicalTopic: 'alphabet',
  })),
  ...numberWords.slice(11, 15).map((word, index) => authored(`write_number_${index + 11}`, {
    type: 'writing',
    instruction: 'Write the number word you hear.',
    displayValue: String(index + 11),
    audioValue: word,
    correctValue: word,
    introducesNewContent: false,
    assessesContent: true,
    prerequisite: 'number recognition',
    pedagogicalTopic: 'numbers',
  })),
  ...pluralModels.map(([display, sentence], index) => authored(`structure_${index + 1}`, {
    type: 'multiple-choice',
    instruction: 'Look and choose the sentence that matches.',
    displayValue: display,
    audioValue: sentence,
    options: [sentence, index % 2 ? 'It is a letter.' : 'It is a number.', index < 2 ? 'They are numbers.' : 'This is a letter.'],
    correctValue: sentence,
    introducesNewContent: true,
    assessesContent: false,
    prerequisite: 'letter and number recognition',
    pedagogicalTopic: 'singular-and-plural',
  })),
];

const day4: Exercise[] = colors.map(([color, portuguese], index) => authored(`color_intro_${color}`, {
  type: 'multiple-choice',
  instruction: 'Look at the color and choose its written name.',
  displayValue: color,
  audioValue: color,
  options: colorOptions(index),
  correctValue: color,
  translation: `${color} = ${portuguese}`,
  isNewVocab: true,
  introducesNewContent: true,
  assessesContent: false,
  prerequisite: 'none',
  pedagogicalTopic: 'colors',
}));

const day5: Exercise[] = [
  ...colors.map(([color, portuguese]) => authored(`color_visual_write_${color}`, {
    type: 'writing',
    instruction: 'Look at the color and write a full sentence.',
    displayValue: color,
    audioValue: 'What color is it?',
    correctValue: `It is ${color}.`,
    acceptedAnswers: [`It's ${color}.`, `it is ${color}`, `it's ${color}`],
    translation: `${color} = ${portuguese}`,
    introducesNewContent: false,
    assessesContent: true,
    prerequisite: 'visual color presentation',
    pedagogicalTopic: 'colors',
  })),
  ...colors.slice(0, 5).map(([color]) => authored(`color_guided_${color}`, {
    type: 'writing',
    instruction: 'Complete the sentence with the color word.',
    displayValue: `It is ___. (${color} swatch)`,
    audioValue: `It is ${color}.`,
    correctValue: color,
    introducesNewContent: false,
    assessesContent: true,
    prerequisite: 'visual color recognition',
    pedagogicalTopic: 'colors',
  })),
];

const day6: Exercise[] = [
  ...colors.slice(0, 4).map(([color], index) => authored(`color_listen_choose_${color}`, {
    type: 'multiple-choice',
    instruction: 'Listen and choose the color word.',
    audioValue: color,
    options: colorOptions(index),
    correctValue: color,
    introducesNewContent: false,
    assessesContent: true,
    prerequisite: 'visual color writing',
    pedagogicalTopic: 'colors',
  })),
  ...colors.slice(4, 7).map(([color]) => authored(`color_listen_write_${color}`, {
    type: 'writing',
    assessmentMode: 'listening-writing',
    instruction: 'Listen and write exactly what you hear.',
    audioValue: color,
    correctValue: color,
    introducesNewContent: false,
    assessesContent: true,
    prerequisite: 'visual color writing',
    pedagogicalTopic: 'colors',
  })),
  ...colors.slice(7, 10).map(([color]) => authored(`color_shadow_${color}`, {
    type: 'speaking',
    assessmentMode: 'shadowing',
    instruction: 'Listen and repeat exactly what you hear.',
    audioValue: `It is ${color}.`,
    correctValue: `It is ${color}.`,
    introducesNewContent: false,
    assessesContent: true,
    prerequisite: 'color listening and writing',
    pedagogicalTopic: 'colors',
  })),
];

const finalListening = [
  ['letter_a', 'A'], ['letter_g', 'G'], ['number_7', 'seven'], ['number_12', 'twelve'],
  ['color_red', 'red'], ['color_blue', 'blue'], ['color_green', 'green'], ['color_orange', 'orange'],
] as const;
const finalShadowing = [
  'This is the letter A.', 'This is the number one.', 'They are letters.',
  'They are numbers.', 'It is red.', 'It is blue.',
] as const;
const finalSpeaking = [
  ['letter_a', 'What is this symbol?', 'A', 'This is the letter A.'],
  ['number_1', 'What is this symbol?', '1', 'This is the number one.'],
  ['letters', 'What are they?', 'A B', 'They are letters.'],
  ['numbers', 'What are they?', '1 2', 'They are numbers.'],
  ['yellow', 'What color is it?', 'yellow', 'It is yellow.'],
  ['purple', 'What color is it?', 'purple', 'It is purple.'],
] as const;

const day7: Exercise[] = [
  ...finalListening.map(([key, value]) => authored(`final_listen_${key}`, {
    type: 'writing', assessmentMode: 'listening-writing', coverageObjective: 'Alphabet, numbers and colors',
    instruction: 'Listen and write exactly what you hear.', audioValue: value, correctValue: value,
    prerequisite: 'matching practice item', pedagogicalTopic: /color/.test(key) ? 'colors' : /number/.test(key) ? 'numbers' : 'alphabet',
    introducesNewContent: false, assessesContent: true,
  })),
  ...finalShadowing.map((sentence, index) => authored(`final_shadow_${index + 1}`, {
    type: 'speaking', assessmentMode: 'shadowing', coverageObjective: 'Alphabet, numbers and colors',
    instruction: 'Listen and repeat exactly what you hear.', audioValue: sentence, correctValue: sentence,
    prerequisite: 'modeled sentence in practice', pedagogicalTopic: /color/.test(sentence.toLowerCase()) ? 'colors' : 'singular-and-plural',
    introducesNewContent: false, assessesContent: true,
  })),
  ...finalSpeaking.map(([key, question, display, answer]) => authored(`final_speak_${key}`, {
    type: 'speaking', assessmentMode: 'speaking', coverageObjective: 'Alphabet, numbers and colors',
    instruction: 'Listen and answer aloud in English.', audioValue: question, displayValue: display, correctValue: answer,
    prerequisite: 'modeled sentence in practice', pedagogicalTopic: /yellow|purple/.test(key) ? 'colors' : 'singular-and-plural',
    introducesNewContent: false, assessesContent: true,
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
