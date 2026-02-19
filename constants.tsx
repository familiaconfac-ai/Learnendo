
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
    { type: 'multiple-choice', instruction: 'Which letter sounds like "A" (Group /ei/)?', audioValue: 'A', options: ['H', 'B', 'F'], correctValue: 'H', isNewVocab: true },
    { type: 'multiple-choice', instruction: 'Which letter sounds like "B" (Group /i:/)?', audioValue: 'B', options: ['G', 'F', 'I'], correctValue: 'G' },
    { type: 'multiple-choice', instruction: 'Which letter sounds like "F" (Group /e/)?', audioValue: 'F', options: ['L', 'A', 'Q'], correctValue: 'L' },
    { type: 'multiple-choice', instruction: 'Which letter sounds like "I" (Group /ai/)?', audioValue: 'I', options: ['Y', 'O', 'U'], correctValue: 'Y' }
  ]),
  // Island 2: Numbers 0-10 & Dialogue 1
  ...createItems(1, 2, [
    { type: 'identification', instruction: 'Listen and pick the number:', audioValue: 'Seven', options: ['5', '7', '10', '0'], correctValue: '7', isNewVocab: true },
    { type: 'writing', instruction: 'Spell the number:', displayValue: '7', audioValue: '', correctValue: 'seven' },
    { type: 'dialogue', character: 'teacher', instruction: 'Teacher says:', displayValue: 'What is your first name?', audioValue: 'What is your first name?', correctValue: 'My first name is' },
    { type: 'writing', instruction: 'Complete the student response:', displayValue: 'My first name ___:', audioValue: 'My first name is', correctValue: 'is' }
  ]),
  // Island 3: Numbers 11-20 & Math Plus/Minus
  ...createItems(1, 3, [
    { type: 'identification', instruction: 'Listen and pick:', audioValue: 'Thirteen', options: ['3', '13', '30'], correctValue: '13', isNewVocab: true },
    { type: 'writing', instruction: 'Math: What is nine minus three?', displayValue: '9 - 3 = ?', audioValue: 'What is nine minus three?', correctValue: '6' },
    { type: 'speaking', instruction: 'Spell SIX:', displayValue: '6', audioValue: '', correctValue: 's i x' }
  ]),
  // Island 4: Colors (Part 1)
  ...createItems(1, 4, [
    { type: 'multiple-choice', instruction: 'Choose the color RED:', displayValue: '■', options: ['Red', 'Blue', 'Green'], correctValue: 'Red', isNewVocab: true },
    { type: 'multiple-choice', instruction: 'Choose the color BLUE:', displayValue: '■', options: ['Red', 'Blue', 'Green'], correctValue: 'Blue' },
    { type: 'dialogue', character: 'student', instruction: 'Lucas says:', displayValue: 'My shirt is Green.', audioValue: 'My shirt is green', correctValue: 'green' }
  ]),
  // Island 5: Colors (Part 2) & Spelling
  ...createItems(1, 5, [
    { type: 'multiple-choice', instruction: 'Choose ORANGE:', displayValue: '■', options: ['Orange', 'Yellow', 'Purple'], correctValue: 'Orange', isNewVocab: true },
    { type: 'writing', instruction: 'Spell the color YELLOW:', displayValue: 'Yellow', audioValue: 'Yellow', correctValue: 'y e l l o w' },
    { type: 'identification', instruction: 'Pick BLACK:', audioValue: 'Black', options: ['Black', 'White', 'Purple'], correctValue: 'Black' }
  ]),
  // Island 6: Math Master (Times/Divided)
  ...createItems(1, 6, [
    { type: 'writing', instruction: 'Math: What is four times two?', displayValue: '4 x 2 = ?', audioValue: 'What is four times two?', correctValue: '8' },
    { type: 'writing', instruction: 'Math: What is ten divided by two?', displayValue: '10 / 2 = ?', audioValue: 'What is ten divided by two?', correctValue: '5' },
    { type: 'speaking', instruction: 'Say the result: EIGHT', displayValue: '8', audioValue: '', correctValue: 'eight' }
  ]),
  // Island 7: Final Mastery (All Vocab)
  ...createItems(1, 7, [
    { type: 'multiple-choice', instruction: 'Sound Group /ju:/:', displayValue: 'Q', options: ['U', 'A', 'E'], correctValue: 'U' },
    { type: 'writing', instruction: 'Spell NINETEEN:', audioValue: 'Nineteen', correctValue: 'n i n e t e e n' },
    { type: 'multiple-choice', instruction: 'Color of student Emily\'s shirt?', audioValue: 'Emily what color is your shirt', options: ['Blue', 'Red', 'Green'], correctValue: 'Blue' },
    { type: 'speaking', instruction: 'Say ONE HUNDRED:', displayValue: '100', audioValue: '', correctValue: 'one hundred' }
  ])
];

// Lesson 2: Vowels (Short & Long) - Kept from previous but updated module names
const L2_TRACKS = [
  ...createItems(2, 1, [{ type: 'multiple-choice', instruction: 'Identify the sound (Cat):', displayValue: 'Cat', audioValue: 'Cat', options: ['Short', 'Long'], correctValue: 'Short' }]),
  ...createItems(2, 7, [{ type: 'multiple-choice', instruction: 'Vowel in "Pete":', displayValue: 'Pete', audioValue: 'Pete', options: ['Short', 'Long'], correctValue: 'Long' }])
];

export const PRACTICE_ITEMS: PracticeItem[] = [
  ...L1_TRACKS, ...L2_TRACKS
];

export const MODULE_NAMES: Record<string, string> = {
  'L1_TRACK1': 'The Alphabet groups',
  'L1_TRACK2': 'Numbers 0-10 & Intro',
  'L1_TRACK3': 'Numbers 11-20 & Math',
  'L1_TRACK4': 'Basic Colors',
  'L1_TRACK5': 'Secondary Colors',
  'L1_TRACK6': 'Math Practice',
  'L1_TRACK7': 'Unit 1 Mastery',
  'L2_TRACK1': 'Short/Long Vowels',
  'L2_TRACK7': 'Vowel Mastery'
};

export const GRAMMAR_GUIDES: Record<string, string[]> = {
  'L1_TRACK1': ['Letters are grouped by sound families.', 'A, H, J, K all have the /ei/ sound.'],
  'L1_TRACK4': ['Colors help describe objects like shirts.', 'Example: "The shirt is red."'],
  'L2_TRACK1': ['Short vowels are fast sounds.', 'Long vowels sound like their alphabet name.']
};

export const LESSON_CONFIGS = [
  { id: 1, name: "The Alphabet and Numbers", modules: ['L1_TRACK1', 'L1_TRACK2', 'L1_TRACK3', 'L1_TRACK4', 'L1_TRACK5', 'L1_TRACK6', 'L1_TRACK7'] },
  { id: 2, name: "Vowels (Short & Long)", modules: ['L2_TRACK1', 'L2_TRACK2', 'L2_TRACK3', 'L2_TRACK4', 'L2_TRACK5', 'L2_TRACK6', 'L2_TRACK7'] }
];
