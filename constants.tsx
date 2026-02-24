
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

// --- Unit 1: The Alphabet and Numbers ---

const L1_TRACKS = [
  // Island 1: Alphabet Sound Groups (25 items)
  ...createItems(1, 1, [
    
    { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'A', options: ['H', 'B', 'F', 'L'], correctValue: 'H', isNewVocab: true },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'B', options: ['G', 'F', 'I', 'S'], correctValue: 'G' },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'F', options: ['L', 'A', 'Q', 'O'], correctValue: 'L' },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'I', options: ['Y', 'O', 'U', 'V'], correctValue: 'Y' },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'U', options: ['W', 'M', 'N', 'Z'], correctValue: 'W' },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'S', options: ['X', 'J', 'K', 'R'], correctValue: 'X' },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'O', options: ['O', 'E', 'G', 'T'], correctValue: 'O' },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'J', options: ['K', 'L', 'M', 'N'], correctValue: 'K' },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'C', options: ['D', 'F', 'H', 'J'], correctValue: 'D' },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'P', options: ['T', 'S', 'R', 'Q'], correctValue: 'T' },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'V', options: ['E', 'A', 'I', 'O'], correctValue: 'E' },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'M', options: ['N', 'P', 'Q', 'R'], correctValue: 'N' },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'H', options: ['A', 'E', 'I', 'O'], correctValue: 'A' },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'Y', options: ['I', 'E', 'A', 'U'], correctValue: 'I' },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'Q', options: ['U', 'O', 'A', 'E'], correctValue: 'U' },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'Z', options: ['X', 'Y', 'W', 'V'], correctValue: 'V' },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'G', options: ['B', 'A', 'F', 'L'], correctValue: 'B' },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'K', options: ['J', 'L', 'M', 'N'], correctValue: 'J' },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'D', options: ['C', 'F', 'H', 'J'], correctValue: 'C' },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'T', options: ['P', 'S', 'R', 'Q'], correctValue: 'P' },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'E', options: ['V', 'A', 'I', 'O'], correctValue: 'V' },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'N', options: ['M', 'P', 'Q', 'R'], correctValue: 'M' },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'A', options: ['H', 'E', 'I', 'O'], correctValue: 'H' },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'I', options: ['Y', 'E', 'A', 'U'], correctValue: 'Y' },
  { type: 'multiple-choice', instruction: 'Which letter has the same vowel sound?', audioValue: 'U', options: ['Q', 'O', 'A', 'E'], correctValue: 'Q' }
]),
  // Island 2: Numbers 0-10 Cardinal (15 items)
  ...createItems(1, 2, [
    { type: 'identification', instruction: 'Listen and pick the correct number:', audioValue: 'Zero', options: ['0', '1', '6', '10'], correctValue: '0', isNewVocab: true },
    { type: 'identification', instruction: 'Listen and pick the correct number:', audioValue: 'Three', options: ['2', '3', '7', '13'], correctValue: '3' },
    { type: 'identification', instruction: 'Listen and pick the correct number:', audioValue: 'Eight', options: ['A', '8', 'H', '18'], correctValue: '8' },
    { type: 'writing', instruction: 'Type in words what you hear:', audioValue: 'One', correctValue: 'one' },
    { type: 'writing', instruction: 'Type in words what you hear:', audioValue: 'Two', correctValue: 'two' },
    { type: 'writing', instruction: 'Type in words what you hear:', audioValue: 'Five', correctValue: 'five' },
    { type: 'speaking', instruction: 'Pronounce correctly: Three', displayValue: '3', audioValue: 'Three', correctValue: 'three' },
    { type: 'speaking', instruction: 'Pronounce correctly: Eight', displayValue: '8', audioValue: 'Eight', correctValue: 'eight' },
    { type: 'writing', instruction: 'Math: What is two plus three?', displayValue: 'Math', audioValue: 'What is two plus three', correctValue: '5' },
    { type: 'writing', instruction: 'Type in words what you hear:', audioValue: 'Ten', correctValue: 'ten' },
    { type: 'identification', instruction: 'Listen and pick the correct number:', audioValue: 'Four', options: ['4', '14', '40', '44'], correctValue: '4' },
    { type: 'identification', instruction: 'Listen and pick the correct number:', audioValue: 'Six', options: ['6', '16', '60', '66'], correctValue: '6' },
    { type: 'identification', instruction: 'Listen and pick the correct number:', audioValue: 'Seven', options: ['7', '17', '70', '77'], correctValue: '7' },
    { type: 'identification', instruction: 'Listen and pick the correct number:', audioValue: 'Nine', options: ['9', '19', '90', '99'], correctValue: '9' },
    { type: 'writing', instruction: 'Math: What is five plus five?', displayValue: 'Math', audioValue: 'What is five plus five', correctValue: '10' }
  ]),
  // Island 3: Numbers 11-20 Cardinal (15 items)
  ...createItems(1, 3, [
    { type: 'identification', instruction: 'Listen and pick:', audioValue: 'Eleven', options: ['1', '11', '12', '21'], correctValue: '11', isNewVocab: true },
    { type: 'identification', instruction: 'Listen and pick:', audioValue: 'Twelve', options: ['2', '12', '20', '22'], correctValue: '12' },
    { type: 'identification', instruction: 'Listen and pick:', audioValue: 'Thirteen', options: ['3', '13', '30', '33'], correctValue: '13' },
    { type: 'identification', instruction: 'Listen and pick:', audioValue: 'Fifteen', options: ['5', '15', '50', '55'], correctValue: '15' },
    { type: 'identification', instruction: 'Listen and pick:', audioValue: 'Twenty', options: ['12', '20', '2', '22'], correctValue: '20' },
    { type: 'writing', instruction: 'Math: What is ten plus five?', displayValue: 'Math', audioValue: 'What is ten plus five', correctValue: '15' },
    { type: 'multiple-choice', instruction: 'Review: Which letter has the same vocalic sound as that letter? /ei/', audioValue: 'H', options: ['A', 'B', 'C', 'D'], correctValue: 'A' },
    { type: 'identification', instruction: 'Listen and pick:', audioValue: 'Fourteen', options: ['4', '14', '40', '44'], correctValue: '14' },
    { type: 'identification', instruction: 'Listen and pick:', audioValue: 'Sixteen', options: ['6', '16', '60', '66'], correctValue: '16' },
    { type: 'identification', instruction: 'Listen and pick:', audioValue: 'Seventeen', options: ['7', '17', '70', '77'], correctValue: '17' },
    { type: 'identification', instruction: 'Listen and pick:', audioValue: 'Eighteen', options: ['8', '18', '80', '88'], correctValue: '18' },
    { type: 'identification', instruction: 'Listen and pick:', audioValue: 'Nineteen', options: ['9', '19', '90', '99'], correctValue: '19' },
    { type: 'writing', instruction: 'Math: What is eleven plus nine?', displayValue: 'Math', audioValue: 'What is eleven plus nine', correctValue: '20' },
    { type: 'writing', instruction: 'Math: What is twelve plus one?', displayValue: 'Math', audioValue: 'What is twelve plus one', correctValue: '13' },
    { type: 'writing', instruction: 'Math: What is fifteen plus two?', displayValue: 'Math', audioValue: 'What is fifteen plus two', correctValue: '17' }
  ]),
  // Island 4: Basic Colors (10 items)
  ...createItems(1, 4, [
    { type: 'multiple-choice', instruction: 'Identify the color of the shirt:', displayValue: 'fa-shirt', audioValue: 'Green', options: ['Red', 'Blue', 'Green', 'Yellow'], correctValue: 'Green', isNewVocab: true },
    { type: 'multiple-choice', instruction: 'Identify the color of the car:', displayValue: 'fa-car', audioValue: 'Red', options: ['Red', 'Blue', 'Green', 'Black'], correctValue: 'Red' },
    { type: 'multiple-choice', instruction: 'Identify the color of the sky:', displayValue: 'fa-cloud-sun', audioValue: 'Blue', options: ['Red', 'Blue', 'Green', 'Black'], correctValue: 'Blue' },
    { type: 'identification', instruction: 'What color is it?', displayValue: 'fa-lemon', audioValue: 'Yellow', options: ['Yellow', 'Orange', 'Green', 'Blue'], correctValue: 'Yellow' },
    { type: 'multiple-choice', instruction: 'Identify the color of the grass:', displayValue: 'fa-leaf', audioValue: 'Green', options: ['Green', 'Red', 'Blue', 'Yellow'], correctValue: 'Green' },
    { type: 'multiple-choice', instruction: 'Identify the color of the apple:', displayValue: 'fa-apple-whole', audioValue: 'Red', options: ['Red', 'Green', 'Blue', 'Yellow'], correctValue: 'Red' },
    { type: 'multiple-choice', instruction: 'Identify the color of the ocean:', displayValue: 'fa-water', audioValue: 'Blue', options: ['Blue', 'Red', 'Green', 'Yellow'], correctValue: 'Blue' },
    { type: 'multiple-choice', instruction: 'Identify the color of the sun:', displayValue: 'fa-sun', audioValue: 'Yellow', options: ['Yellow', 'Red', 'Green', 'Blue'], correctValue: 'Yellow' },
    { type: 'writing', instruction: 'Type the color you hear:', audioValue: 'Red', correctValue: 'red' },
    { type: 'writing', instruction: 'Type the color you hear:', audioValue: 'Blue', correctValue: 'blue' }
  ]),
  // Island 5: Secondary Colors (10 items)
  ...createItems(1, 5, [
    { type: 'multiple-choice', instruction: 'Identify the color of the object:', displayValue: 'fa-carrot', audioValue: 'Orange', options: ['Orange', 'Yellow', 'Purple', 'White'], correctValue: 'Orange', isNewVocab: true },
    { type: 'multiple-choice', instruction: 'Identify the color of the phone:', displayValue: 'fa-mobile-screen', audioValue: 'Black', options: ['Black', 'White', 'Purple', 'Blue'], correctValue: 'Black' },
    { type: 'multiple-choice', instruction: 'Identify the color of the cloud:', displayValue: 'fa-cloud', audioValue: 'White', options: ['Black', 'White', 'Purple', 'Blue'], correctValue: 'White' },
    { type: 'multiple-choice', instruction: 'Identify the color of the glass:', displayValue: 'fa-wine-glass', audioValue: 'Purple', options: ['Purple', 'Blue', 'Red', 'Pink'], correctValue: 'Purple' },
    { type: 'multiple-choice', instruction: 'Identify the color of the coal:', displayValue: 'fa-cube', audioValue: 'Black', options: ['Black', 'White', 'Purple', 'Blue'], correctValue: 'Black' },
    { type: 'multiple-choice', instruction: 'Identify the color of the paper:', displayValue: 'fa-file', audioValue: 'White', options: ['Black', 'White', 'Purple', 'Blue'], correctValue: 'White' },
    { type: 'multiple-choice', instruction: 'Identify the color of the grape:', displayValue: 'fa-grapes', audioValue: 'Purple', options: ['Purple', 'Blue', 'Red', 'Pink'], correctValue: 'Purple' },
    { type: 'multiple-choice', instruction: 'Identify the color of the pumpkin:', displayValue: 'fa-ghost', audioValue: 'Orange', options: ['Orange', 'Yellow', 'Purple', 'White'], correctValue: 'Orange' },
    { type: 'writing', instruction: 'Type the color you hear:', audioValue: 'Black', correctValue: 'black' },
    { type: 'writing', instruction: 'Type the color you hear:', audioValue: 'White', correctValue: 'white' }
  ]),
  // Island 6: Math Practice (10 items)
  ...createItems(1, 6, [
    { type: 'writing', instruction: 'Math: What is four times two?', displayValue: 'Math', audioValue: 'What is four times two', correctValue: '8' },
    { type: 'writing', instruction: 'Math: What is ten divided by two?', displayValue: 'Math', audioValue: 'What is ten divided by two', correctValue: '5' },
    { type: 'speaking', instruction: 'Say the result: Eight', displayValue: '8', audioValue: 'Eight', correctValue: 'eight' },
    { type: 'writing', instruction: 'Math: What is three plus seven?', displayValue: 'Math', audioValue: 'What is three plus seven', correctValue: '10' },
    { type: 'writing', instruction: 'Math: What is twenty minus five?', displayValue: 'Math', audioValue: 'What is twenty minus five', correctValue: '15' },
    { type: 'writing', instruction: 'Math: What is six times two?', displayValue: 'Math', audioValue: 'What is six times two', correctValue: '12' },
    { type: 'writing', instruction: 'Math: What is nine divided by three?', displayValue: 'Math', audioValue: 'What is nine divided by three', correctValue: '3' },
    { type: 'writing', instruction: 'Math: What is fifteen plus five?', displayValue: 'Math', audioValue: 'What is fifteen plus five', correctValue: '20' },
    { type: 'writing', instruction: 'Math: What is twelve minus four?', displayValue: 'Math', audioValue: 'What is twelve minus four', correctValue: '8' },
    { type: 'writing', instruction: 'Math: What is five times three?', displayValue: 'Math', audioValue: 'What is five times three', correctValue: '15' }
  ]),
  // Island 7: Final Mastery (15 items)
  ...createItems(1, 7, [
    { type: 'multiple-choice', instruction: 'Which letter has the same vocalic sound as that letter? /ju:/', displayValue: 'Q', options: ['U', 'A', 'E', 'I'], correctValue: 'U' },
    { type: 'writing', instruction: 'Type in words what you hear:', audioValue: 'Nineteen', correctValue: 'nineteen' },
    { type: 'multiple-choice', instruction: 'Identify the color:', displayValue: 'fa-mobile-screen', audioValue: 'Black', options: ['Black', 'White', 'Purple', 'Blue'], correctValue: 'Black' },
    { type: 'speaking', instruction: 'Say the number:', audioValue: 'One hundred', correctValue: '100' },
    { type: 'multiple-choice', instruction: 'Which letter has the same vocalic sound as that letter? /ei/', audioValue: 'A', options: ['H', 'B', 'F', 'L'], correctValue: 'H' },
    { type: 'identification', instruction: 'Listen and pick:', audioValue: 'Twelve', options: ['2', '12', '20', '22'], correctValue: '12' },
    { type: 'multiple-choice', instruction: 'Identify the color of the shirt:', displayValue: 'fa-shirt', audioValue: 'Green', options: ['Red', 'Blue', 'Green', 'Yellow'], correctValue: 'Green' },
    { type: 'writing', instruction: 'Math: What is ten plus ten?', displayValue: 'Math', audioValue: 'What is ten plus ten', correctValue: '20' },
    { type: 'speaking', instruction: 'Say the number:', audioValue: 'Thirteen', correctValue: '13' },
    { type: 'multiple-choice', instruction: 'Identify the color of the car:', displayValue: 'fa-car', audioValue: 'Red', options: ['Red', 'Blue', 'Green', 'Black'], correctValue: 'Red' },
    { type: 'writing', instruction: 'Type in words what you hear:', audioValue: 'Eleven', correctValue: 'eleven' },
    { type: 'identification', instruction: 'Listen and pick:', audioValue: 'Fifteen', options: ['5', '15', '50', '55'], correctValue: '15' },
    { type: 'multiple-choice', instruction: 'Identify the color of the sky:', displayValue: 'fa-cloud-sun', audioValue: 'Blue', options: ['Red', 'Blue', 'Green', 'Black'], correctValue: 'Blue' },
    { type: 'writing', instruction: 'Math: What is eight times two?', displayValue: 'Math', audioValue: 'What is eight times two', correctValue: '16' },
    { type: 'speaking', instruction: 'Say the number:', audioValue: 'Twenty', correctValue: '20' }
  ])
];

// Lesson 2: Vowels
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
