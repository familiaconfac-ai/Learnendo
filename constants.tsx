
import { PracticeItem } from './types';

const createItems = (lesson: number, track: number, items: Partial<PracticeItem>[]): PracticeItem[] => {
  const moduleType = `L${lesson}_TRACK${track}`;
  return items.map((it, idx) => ({
    id: `${moduleType}-${idx}`,
    lessonId: lesson,
    moduleType: moduleType,
    type: it.type || 'writing',
    instruction: it.instruction || '',
    audioValue: it.audioValue || '',
    correctValue: it.correctValue || '',
    displayValue: it.displayValue,
    options: it.options,
    character: it.character,
    isNewVocab: it.isNewVocab
  }));
};

// --- UNIT 1: THE ALPHABET AND NUMBERS ---

const L1_TRACKS = [
  // Island 1: Alphabet Sound Groups
  ...createItems(1, 1, [
    { type: 'multiple-choice', instruction: 'Which letter sounds like "A" (Family /ei/)?', audioValue: 'A', options: ['H', 'B', 'F', 'L'], correctValue: 'H', isNewVocab: true },
    { type: 'multiple-choice', instruction: 'Which letter sounds like "B" (Family /i:/)?', audioValue: 'B', options: ['G', 'F', 'I', 'S'], correctValue: 'G' },
    { type: 'multiple-choice', instruction: 'Which letter sounds like "F" (Family /e/)?', audioValue: 'F', options: ['L', 'A', 'Q', 'O'], correctValue: 'L' },
    { type: 'multiple-choice', instruction: 'Which letter sounds like "I" (Family /ai/)?', audioValue: 'I', options: ['Y', 'O', 'U', 'V'], correctValue: 'Y' },
    { type: 'multiple-choice', instruction: 'Which letter sounds like "U" (Family /ju:/)?', audioValue: 'U', options: ['W', 'M', 'N', 'Z'], correctValue: 'W' },
    { type: 'multiple-choice', instruction: 'Which letter sounds like "S" (Family /e/)?', audioValue: 'S', options: ['X', 'J', 'K', 'R'], correctValue: 'X' },
    { type: 'multiple-choice', instruction: 'Which letter is in a group by itself (/oʊ/)?', audioValue: 'O', options: ['O', 'E', 'G', 'T'], correctValue: 'O' }
  ]),
  // Island 2: Numbers 0-10 Cardinal (Recall training)
  ...createItems(1, 2, [
    { type: 'identification', instruction: 'Listen and pick the correct number:', audioValue: 'Zero', options: ['0', '1', '6', '10'], correctValue: '0', isNewVocab: true },
    { type: 'identification', instruction: 'Listen and pick the correct number:', audioValue: 'Three', options: ['2', '3', 'Tree', '13'], correctValue: '3' },
    { type: 'identification', instruction: 'Listen and pick the correct number:', audioValue: 'Eight', options: ['A', '8', 'H', '18'], correctValue: '8' },
    { type: 'writing', instruction: 'Type in words what you hear:', audioValue: 'One', correctValue: 'one' },
    { type: 'writing', instruction: 'Type in words what you hear:', audioValue: 'Two', correctValue: 'two' },
    { type: 'writing', instruction: 'Type in words what you hear:', audioValue: 'Five', correctValue: 'five' },
    { type: 'speaking', instruction: 'Pronounce correctly: Three (Not tree)', displayValue: '3', audioValue: 'Three', correctValue: 'three' },
    { type: 'speaking', instruction: 'Pronounce correctly: Eight (Not H)', displayValue: '8', audioValue: 'Eight', correctValue: 'eight' },
    { type: 'writing', instruction: 'Math: What is two plus three?', displayValue: 'Math', audioValue: 'What is two plus three', correctValue: '5' },
    { type: 'writing', instruction: 'Type in words what you hear:', audioValue: 'Ten', correctValue: 'ten' }
  ]),
  // Island 3: Numbers 11-20 Cardinal (Recall training)
  ...createItems(1, 3, [
    { type: 'identification', instruction: 'Listen and pick:', audioValue: 'Eleven', options: ['1', '11', '12', '21'], correctValue: '11', isNewVocab: true },
    { type: 'identification', instruction: 'Listen and pick:', audioValue: 'Twelve', options: ['2', '12', '20', '22'], correctValue: '12' },
    { type: 'identification', instruction: 'Listen and pick:', audioValue: 'Thirteen', options: ['3', '13', '30', '33'], correctValue: '13' },
    { type: 'identification', instruction: 'Listen and pick:', audioValue: 'Fifteen', options: ['5', '15', '50', '55'], correctValue: '15' },
    { type: 'identification', instruction: 'Listen and pick:', audioValue: 'Twenty', options: ['12', '20', '2', '22'], correctValue: '20' },
    { type: 'writing', instruction: 'Math: What is ten plus five?', displayValue: 'Math', audioValue: 'What is ten plus five', correctValue: '15' },
    { type: 'multiple-choice', instruction: 'Review: Which letter sounds like "H" (Family /ei/)?', audioValue: 'H', options: ['A', 'B', 'C', 'D'], correctValue: 'A' }
  ]),
  // Island 4: Basic Colors (No color hints in options)
  ...createItems(1, 4, [
    { type: 'multiple-choice', instruction: 'Identify the color of the shirt:', displayValue: 'fa-shirt', audioValue: 'Green', options: ['Red', 'Blue', 'Green', 'Yellow'], correctValue: 'Green', isNewVocab: true },
    { type: 'multiple-choice', instruction: 'Identify the color of the car:', displayValue: 'fa-car', audioValue: 'Red', options: ['Red', 'Blue', 'Green', 'Black'], correctValue: 'Red' },
    { type: 'multiple-choice', instruction: 'Identify the color of the sky:', displayValue: 'fa-cloud-sun', audioValue: 'Blue', options: ['Red', 'Blue', 'Green', 'Black'], correctValue: 'Blue' },
    { type: 'writing', instruction: 'What color is it?', displayValue: 'fa-lemon', audioValue: 'What color is it?', correctValue: 'yellow' }
  ]),
  // Island 5: Secondary Colors (No color hints in options)
  ...createItems(1, 5, [
    { type: 'multiple-choice', instruction: 'Identify the color of the object:', displayValue: 'fa-carrot', audioValue: 'Orange', options: ['Orange', 'Yellow', 'Purple', 'White'], correctValue: 'Orange', isNewVocab: true },
    { type: 'multiple-choice', instruction: 'Identify the color of the phone:', displayValue: 'fa-mobile-screen', audioValue: 'Black', options: ['Black', 'White', 'Purple', 'Blue'], correctValue: 'Black' },
    { type: 'multiple-choice', instruction: 'Identify the color of the cloud:', displayValue: 'fa-cloud', audioValue: 'White', options: ['Black', 'White', 'Purple', 'Blue'], correctValue: 'White' },
    { type: 'writing', instruction: 'What color is it?', displayValue: 'fa-wine-glass', audioValue: 'What color is it?', correctValue: 'purple' }
  ]),
  // Island 6: Math Practice (No visual equations)
  ...createItems(1, 6, [
    { type: 'writing', instruction: 'Math: What is four times two?', displayValue: 'Math', audioValue: 'What is four times two', correctValue: '8' },
    { type: 'writing', instruction: 'Math: What is ten divided by two?', displayValue: 'Math', audioValue: 'What is ten divided by two', correctValue: '5' },
    { type: 'speaking', instruction: 'Say the result: Eight', displayValue: '8', audioValue: 'Eight', correctValue: 'eight' }
  ]),
  // Island 7: Final Mastery
  ...createItems(1, 7, [
    { type: 'multiple-choice', instruction: 'Sound group /ju:/:', displayValue: 'Q', options: ['U', 'A', 'E', 'I'], correctValue: 'U' },
    { type: 'writing', instruction: 'Type in words what you hear:', audioValue: 'Nineteen', correctValue: 'nineteen' },
    { type: 'multiple-choice', instruction: 'Identify the color:', displayValue: 'fa-mobile-screen', audioValue: 'Black', options: ['Black', 'White', 'Purple', 'Blue'], correctValue: 'Black' },
    { type: 'speaking', instruction: 'Say the number:', audioValue: 'One hundred', correctValue: '100' }
  ])
];

// Lesson 2: Vowels (Expanded)
const L2_TRACKS = [
  ...createItems(2, 1, [
    { type: 'multiple-choice', instruction: 'Identify the short sound:', displayValue: 'Cat', audioValue: 'Cat', options: ['Short A', 'Long A', 'Neutral', 'Hard'], correctValue: 'Short A' },
    { type: 'multiple-choice', instruction: 'Identify the short sound:', displayValue: 'Egg', audioValue: 'Egg', options: ['Short E', 'Long E', 'Neutral', 'Hard'], correctValue: 'Short E' }
  ]),
  ...createItems(2, 7, [{ type: 'multiple-choice', instruction: 'Vowel in "Pete":', displayValue: 'Pete', audioValue: 'Pete', options: ['Short', 'Long', 'Neutral', 'Hard'], correctValue: 'Long' }])
];

export const PRACTICE_ITEMS: PracticeItem[] = [
  ...L1_TRACKS, ...L2_TRACKS
];

export const MODULE_NAMES: Record<string, string> = {
  'L1_TRACK1': 'The Alphabet groups',
  'L1_TRACK2': 'Numbers 0-10 Cardinal',
  'L1_TRACK3': 'Numbers 11-20 Cardinal',
  'L1_TRACK4': 'Basic Colors',
  'L1_TRACK5': 'Secondary Colors',
  'L1_TRACK6': 'Math Practice',
  'L1_TRACK7': 'Unit 1 Mastery',
  'L2_TRACK1': 'Short/Long Vowels',
  'L2_TRACK7': 'Vowel Mastery'
};

export const MODULE_ICONS: Record<string, string> = {
  'L1_TRACK1': 'fa-font',
  'L1_TRACK2': 'fa-list-ol',
  'L1_TRACK3': 'fa-sort-numeric-up',
  'L1_TRACK4': 'fa-palette',
  'L1_TRACK5': 'fa-palette',
  'L1_TRACK6': 'fa-calculator',
  'L1_TRACK7': 'fa-award',
  'L2_TRACK1': 'fa-ear-listen',
  'L2_TRACK7': 'fa-award'
};

export const GRAMMAR_GUIDES: Record<string, string[]> = {
  'L1_TRACK1': [
    'Phonetic Families: Patterns in English sounds help us hear letters correctly.',
    'Group /i:/: B, C, D, E, G, P, T, V.',
    'Group /ei/: A, H, J, K.'
  ],
  'L1_TRACK2': [
    'Cardinal Numbers: Used for counting (0, 1, 2, 3...).',
    'Careful with Three (3) vs Tree and Eight (8) vs H!'
  ],
  'L1_TRACK3': [
    'Cardinal Numbers 11-20: Focus on the "teen" endings (13-19).',
    'Review letters alongside numbers to master A1 basics.'
  ],
  'L1_TRACK4': ['Colors describe objects.', 'Identify colors without visual aids for better mastery.'],
  'L1_TRACK5': ['Expand your vocabulary with adjectives and objects.', 'Focus on recalling the name of the color.'],
  'L2_TRACK1': ['Short vowels are fast sounds.', 'Long vowels sound like their alphabet name.']
};

export const LESSON_CONFIGS = [
  { id: 1, name: "The Alphabet and Numbers", modules: ['L1_TRACK1', 'L1_TRACK2', 'L1_TRACK3', 'L1_TRACK4', 'L1_TRACK5', 'L1_TRACK6', 'L1_TRACK7'] },
  { id: 2, name: "Vowels (Short & Long)", modules: ['L2_TRACK1', 'L2_TRACK7'] }
];
