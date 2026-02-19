
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
  // Island 1: Alphabet Sound Groups - 4 options for symmetry
  ...createItems(1, 1, [
    { type: 'multiple-choice', instruction: 'Which letter sounds like "A" (Family /ei/)?', audioValue: 'A', options: ['H', 'B', 'F', 'L'], correctValue: 'H', isNewVocab: true },
    { type: 'multiple-choice', instruction: 'Which letter sounds like "B" (Family /i:/)?', audioValue: 'B', options: ['G', 'F', 'I', 'S'], correctValue: 'G' },
    { type: 'multiple-choice', instruction: 'Which letter sounds like "F" (Family /e/)?', audioValue: 'F', options: ['L', 'A', 'Q', 'O'], correctValue: 'L' },
    { type: 'multiple-choice', instruction: 'Which letter sounds like "I" (Family /ai/)?', audioValue: 'I', options: ['Y', 'O', 'U', 'V'], correctValue: 'Y' },
    { type: 'multiple-choice', instruction: 'Which letter sounds like "U" (Family /ju:/)?', audioValue: 'U', options: ['W', 'M', 'N', 'Z'], correctValue: 'W' },
    { type: 'multiple-choice', instruction: 'Which letter sounds like "S" (Family /e/)?', audioValue: 'S', options: ['X', 'J', 'K', 'R'], correctValue: 'X' },
    { type: 'multiple-choice', instruction: 'Which letter is in a group by itself (/oʊ/)?', audioValue: 'O', options: ['O', 'E', 'G', 'T'], correctValue: 'O' }
  ]),
  // Island 2: Numbers 0-10 & Ordinals (Deep exploration)
  ...createItems(1, 2, [
    { type: 'identification', instruction: 'Listen and pick the correct number:', audioValue: 'Zero', options: ['0', '1', '6', '10'], correctValue: '0', isNewVocab: true },
    { type: 'identification', instruction: 'Listen and pick the correct number:', audioValue: 'Three', options: ['2', '3', 'Tree', '13'], correctValue: '3' },
    { type: 'identification', instruction: 'Listen and pick the correct number:', audioValue: 'Eight', options: ['A', '8', 'H', '18'], correctValue: '8' },
    { type: 'writing', instruction: 'Type the word for this digit:', displayValue: '1st', audioValue: 'First', correctValue: 'first' },
    { type: 'writing', instruction: 'Type the word for this digit:', displayValue: '2nd', audioValue: 'Second', correctValue: 'second' },
    { type: 'writing', instruction: 'Type the word for this number:', displayValue: '5', audioValue: 'Five', correctValue: 'five' },
    { type: 'speaking', instruction: 'Pronounce correctly: THREE (Not Tree)', displayValue: '3', audioValue: 'Three', correctValue: 'three' },
    { type: 'speaking', instruction: 'Pronounce correctly: EIGHT (Not H)', displayValue: '8', audioValue: 'Eight', correctValue: 'eight' },
    { type: 'multiple-choice', instruction: 'Pick the word for 3rd:', displayValue: '3rd', options: ['Third', 'Three', 'Thirteen', 'Thirty'], correctValue: 'Third' },
    { type: 'writing', instruction: 'Type the word for 10:', displayValue: '10', audioValue: 'Ten', correctValue: 'ten' }
  ]),
  // Island 3: Numbers 11-20 Cardinal & Spelling
  ...createItems(1, 3, [
    { type: 'identification', instruction: 'Listen and pick:', audioValue: 'Thirteen', options: ['3', '13', '11', '20'], correctValue: '13', isNewVocab: true },
    { type: 'identification', instruction: 'Listen and pick:', audioValue: 'Twenty', options: ['12', '20', '2', '22'], correctValue: '20' },
    { type: 'writing', instruction: 'Math: What is nine minus three?', displayValue: '9 - 3 = ?', audioValue: 'What is nine minus three?', correctValue: '6' },
    { type: 'writing', instruction: 'Type the word for 11:', displayValue: '11', audioValue: 'Eleven', correctValue: 'eleven' }
  ]),
  // Island 4: Colors (Part 1)
  ...createItems(1, 4, [
    { type: 'multiple-choice', instruction: 'Choose the color RED:', displayValue: '■', options: ['Red', 'Blue', 'Green', 'Yellow'], correctValue: 'Red', isNewVocab: true },
    { type: 'multiple-choice', instruction: 'Choose the color BLUE:', displayValue: '■', options: ['Red', 'Blue', 'Green', 'Black'], correctValue: 'Blue' },
    { type: 'dialogue', character: 'student', instruction: 'Lucas says:', displayValue: 'My shirt is Green.', audioValue: 'My shirt is green', correctValue: 'green' }
  ]),
  // Island 5: Colors (Part 2) & Writing
  ...createItems(1, 5, [
    { type: 'multiple-choice', instruction: 'Choose ORANGE:', displayValue: '■', options: ['Orange', 'Yellow', 'Purple', 'White'], correctValue: 'Orange', isNewVocab: true },
    { type: 'writing', instruction: 'Type the color YELLOW:', displayValue: 'Yellow', audioValue: 'Yellow', correctValue: 'yellow' },
    { type: 'identification', instruction: 'Pick BLACK:', audioValue: 'Black', options: ['Black', 'White', 'Purple', 'Blue'], correctValue: 'Black' }
  ]),
  // Island 6: Math Master (Times/Divided)
  ...createItems(1, 6, [
    { type: 'writing', instruction: 'Math: What is four times two?', displayValue: '4 x 2 = ?', audioValue: 'What is four times two?', correctValue: '8' },
    { type: 'writing', instruction: 'Math: What is ten divided by two?', displayValue: '10 / 2 = ?', audioValue: 'What is ten divided by two?', correctValue: '5' },
    { type: 'speaking', instruction: 'Say the result: EIGHT', displayValue: '8', audioValue: '', correctValue: 'eight' }
  ]),
  // Island 7: Final Mastery (All Vocab)
  ...createItems(1, 7, [
    { type: 'multiple-choice', instruction: 'Sound Group /ju:/:', displayValue: 'Q', options: ['U', 'A', 'E', 'I'], correctValue: 'U' },
    { type: 'writing', instruction: 'Type the word NINETEEN:', displayValue: '19', audioValue: 'Nineteen', correctValue: 'nineteen' },
    { type: 'multiple-choice', instruction: 'Color of student Emily\'s shirt?', audioValue: 'Emily what color is your shirt', options: ['Blue', 'Red', 'Green', 'Yellow'], correctValue: 'Blue' },
    { type: 'speaking', instruction: 'Say ONE HUNDRED:', displayValue: '100', audioValue: '', correctValue: 'one hundred' }
  ])
];

// Lesson 2: Vowels (Short & Long)
const L2_TRACKS = [
  ...createItems(2, 1, [{ type: 'multiple-choice', instruction: 'Identify the sound (Cat):', displayValue: 'Cat', audioValue: 'Cat', options: ['Short', 'Long', 'Silent', 'Mixed'], correctValue: 'Short' }]),
  ...createItems(2, 7, [{ type: 'multiple-choice', instruction: 'Vowel in "Pete":', displayValue: 'Pete', audioValue: 'Pete', options: ['Short', 'Long', 'Neutral', 'Hard'], correctValue: 'Long' }])
];

export const PRACTICE_ITEMS: PracticeItem[] = [
  ...L1_TRACKS, ...L2_TRACKS
];

export const MODULE_NAMES: Record<string, string> = {
  'L1_TRACK1': 'The Alphabet groups',
  'L1_TRACK2': 'Numbers 0-10 & Ordinals',
  'L1_TRACK3': 'Numbers 11-20 Cardinal',
  'L1_TRACK4': 'Basic Colors',
  'L1_TRACK5': 'Secondary Colors',
  'L1_TRACK6': 'Math Practice',
  'L1_TRACK7': 'Unit 1 Mastery',
  'L2_TRACK1': 'Short/Long Vowels',
  'L2_TRACK7': 'Vowel Mastery'
};

export const GRAMMAR_GUIDES: Record<string, string[]> = {
  'L1_TRACK1': [
    'Phonetic Families: Patterns in English sounds help us hear letters correctly.',
    'Group /i:/: B, C, D, E, G, P, T, V.',
    'Group /ei/: A, H, J, K.'
  ],
  'L1_TRACK2': [
    'Cardinal Numbers: Used for counting (0, 1, 2, 3...).',
    'Ordinal Numbers: Used for positions (1st - First, 2nd - Second, 3rd - Third).',
    'Careful with Three (3) vs Tree and Eight (8) vs H!'
  ],
  'L1_TRACK4': ['Colors describe objects.', 'Example: "My shirt is blue."'],
  'L2_TRACK1': ['Short vowels are fast sounds.', 'Long vowels sound like their alphabet name.']
};

export const LESSON_CONFIGS = [
  { id: 1, name: "The Alphabet and Numbers", modules: ['L1_TRACK1', 'L1_TRACK2', 'L1_TRACK3', 'L1_TRACK4', 'L1_TRACK5', 'L1_TRACK6', 'L1_TRACK7'] },
  { id: 2, name: "Vowels (Short & Long)", modules: ['L2_TRACK1', 'L2_TRACK2', 'L2_TRACK3', 'L2_TRACK4', 'L2_TRACK5', 'L2_TRACK6', 'L2_TRACK7'] }
];
