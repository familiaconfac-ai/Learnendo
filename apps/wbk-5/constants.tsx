
import { PracticeItem } from './types';

// workbook number used in UI labels
export const WORKBOOK_NUMBER = 5;

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

// TODO: future enhancement - automatically generate L{n}_TRACKS arrays by
// parsing a lesson PDF. The `createItems` helper keeps the format simple for
// scripts to emit. See similar tooling in the build scripts when working on
// Lesson 3 and beyond.


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

// Lesson 2: Vowels and Early Reader
const L2_TRACKS = [
  // Island 1 – Short vs Long Vowels (approx 25 items)
  ...createItems(2, 1, [
    { type: 'multiple-choice', instruction: 'Is the vowel in "cake" short or long?', audioValue: 'cake', options: ['Short','Long'], correctValue: 'Long', isNewVocab: true },
    { type: 'multiple-choice', instruction: 'Is the vowel in "cup" short or long?', audioValue: 'cup', options: ['Short','Long'], correctValue: 'Short' },
    { type: 'writing', instruction: 'Write what you hear:', audioValue: 'cat', correctValue: 'cat' },
    { type: 'writing', instruction: 'Write what you hear:', audioValue: 'bed', correctValue: 'bed' },
    { type: 'writing', instruction: 'Write what you hear:', audioValue: 'bike', correctValue: 'bike' },
    { type: 'writing', instruction: 'Write what you hear:', audioValue: 'note', correctValue: 'note' },
    { type: 'writing', instruction: 'Write what you hear:', audioValue: 'sun', correctValue: 'sun' },
    { type: 'identification', instruction: 'Listen and pick the correct word:', audioValue: 'apple', options: ['apple','orange','tree','sun'], correctValue: 'apple' },
    { type: 'identification', instruction: 'Listen and pick the correct word:', audioValue: 'tree', options: ['rock','tree','water','kite'], correctValue: 'tree' },
    { type: 'identification', instruction: 'Listen and pick the correct word:', audioValue: 'rock', options: ['sun','water','rock','mountain'], correctValue: 'rock' }
  ]),
  // Island 2 – Letter Name vs Vowel Sound (dialogue style)
  ...createItems(2, 2, [
    { type: 'multiple-choice', instruction: 'Teacher: What vowel letter is in "cat"?', audioValue: 'cat', options: ['A','E','I','O','U'], correctValue: 'A', isNewVocab: true },
    { type: 'multiple-choice', instruction: 'Teacher: What is the letter name?', audioValue: 'A', options: ['A','E','I','O','U'], correctValue: 'A' },
    { type: 'multiple-choice', instruction: 'Teacher: What vowel letter is in "bed"?', audioValue: 'bed', options: ['A','E','I','O','U'], correctValue: 'E' },
    { type: 'multiple-choice', instruction: 'Teacher: What is the letter name?', audioValue: 'E', options: ['A','E','I','O','U'], correctValue: 'E' },
    { type: 'multiple-choice', instruction: 'Teacher: What vowel letter is in "bike"?', audioValue: 'bike', options: ['A','E','I','O','U'], correctValue: 'I' },
    { type: 'multiple-choice', instruction: 'Teacher: What is the letter name?', audioValue: 'I', options: ['A','E','I','O','U'], correctValue: 'I' },
    { type: 'multiple-choice', instruction: 'Teacher: What vowel letter is in "note"?', audioValue: 'note', options: ['A','E','I','O','U'], correctValue: 'O' },
    { type: 'multiple-choice', instruction: 'Teacher: What is the letter name?', audioValue: 'O', options: ['A','E','I','O','U'], correctValue: 'O' },
    { type: 'multiple-choice', instruction: 'Teacher: What vowel letter is in "sun"?', audioValue: 'sun', options: ['A','E','I','O','U'], correctValue: 'U' },
    { type: 'multiple-choice', instruction: 'Teacher: What is the letter name?', audioValue: 'U', options: ['A','E','I','O','U'], correctValue: 'U' },
    { type: 'multiple-choice', instruction: 'Teacher: What vowel letter is in "apple"?', audioValue: 'apple', options: ['A','E','I','O','U'], correctValue: 'A' },
    { type: 'multiple-choice', instruction: 'Teacher: What is the letter name?', audioValue: 'A', options: ['A','E','I','O','U'], correctValue: 'A' },
    { type: 'multiple-choice', instruction: 'Teacher: What vowel letter is in "tree"?', audioValue: 'tree', options: ['A','E','I','O','U'], correctValue: 'E' },
    { type: 'multiple-choice', instruction: 'Teacher: What is the letter name?', audioValue: 'E', options: ['A','E','I','O','U'], correctValue: 'E' }
  ]),
  // Island 3 – What is this? (picture recognition)
  ...createItems(2, 3, [
    { type: 'multiple-choice', instruction: 'What is this?', displayValue: 'fa-sun', audioValue: 'sun', options: ['sun','moon','star','cloud'], correctValue: 'sun', isNewVocab: true },
    { type: 'multiple-choice', instruction: 'What is this?', displayValue: 'fa-foot', audioValue: 'toes', options: ['toes','fingers','nose','eyes'], correctValue: 'toes' },
    { type: 'multiple-choice', instruction: 'What is this?', displayValue: 'fa-mountain', audioValue: 'rock', options: ['rock','stone','sand','water'], correctValue: 'rock' },
    { type: 'multiple-choice', instruction: 'What is this?', displayValue: 'fa-tree', audioValue: 'tree', options: ['tree','bush','flower','grass'], correctValue: 'tree' },
    { type: 'multiple-choice', instruction: 'What is this?', displayValue: 'fa-apple-whole', audioValue: 'apple', options: ['apple','orange','banana','grape'], correctValue: 'apple' },
    { type: 'multiple-choice', instruction: 'What is this?', displayValue: 'fa-kite', audioValue: 'kite', options: ['kite','ball','plane','bird'], correctValue: 'kite' },
    { type: 'multiple-choice', instruction: 'What is this?', displayValue: 'fa-orange', audioValue: 'orange', options: ['orange','apple','lemon','grape'], correctValue: 'orange' },
    { type: 'multiple-choice', instruction: 'What is this?', displayValue: 'fa-water', audioValue: 'water', options: ['water','juice','milk','soda'], correctValue: 'water' },
    { type: 'writing', instruction: 'Write what you hear:', audioValue: 'sun', correctValue: 'sun' },
    { type: 'writing', instruction: 'Write what you hear:', audioValue: 'toes', correctValue: 'toes' },
    { type: 'writing', instruction: 'Write what you hear:', audioValue: 'rock', correctValue: 'rock' },
    { type: 'writing', instruction: 'Write what you hear:', audioValue: 'apple', correctValue: 'apple' },
    { type: 'writing', instruction: 'Write what you hear:', audioValue: 'tree', correctValue: 'tree' },
    { type: 'writing', instruction: 'Write what you hear:', audioValue: 'kite', correctValue: 'kite' },
    { type: 'writing', instruction: 'Write what you hear:', audioValue: 'orange', correctValue: 'orange' },
    { type: 'writing', instruction: 'Write what you hear:', audioValue: 'water', correctValue: 'water' }
  ]),
  // Island 4 – Listening and quick identification
  ...createItems(2, 4, [
    { type: 'identification', instruction: 'What is this?', displayValue: 'fa-apple-whole', audioValue: 'apple', options: ['orange','apple','banana','grape'], correctValue: 'apple', isNewVocab: true },
    { type: 'identification', instruction: 'What is this?', displayValue: 'fa-water', audioValue: 'water', options: ['water','juice','milk','soda'], correctValue: 'water' },
    { type: 'speaking', instruction: 'Say the word: apple', audioValue: 'apple', correctValue: 'apple' },
    { type: 'speaking', instruction: 'Say the word: water', audioValue: 'water', correctValue: 'water' },
    { type: 'writing', instruction: 'Write what you hear:', audioValue: 'he', correctValue: 'he' },
    { type: 'writing', instruction: 'Write what you hear:', audioValue: 'me', correctValue: 'me' },
    { type: 'identification', instruction: 'Listen and pick:', audioValue: 'rock', options: ['rock','sand','mountain','stone'], correctValue: 'rock' },
    { type: 'identification', instruction: 'Listen and pick:', audioValue: 'kite', options: ['kite','ball','plane','toy'], correctValue: 'kite' },
    { type: 'speaking', instruction: 'Repeat: rock', audioValue: 'rock', correctValue: 'rock' },
    { type: 'speaking', instruction: 'Repeat: kite', audioValue: 'kite', correctValue: 'kite' }
  ]),
  // Island 5 – Articles practice
  ...createItems(2, 5, [
    { type: 'multiple-choice', instruction:'It is ___ apple', options:['a','an'], correctValue:'an', audioValue:"It's an apple.", isNewVocab:true },
    { type: 'multiple-choice', instruction:'It is ___ kite', options:['a','an'], correctValue:'a', audioValue:"It's a kite." },
    { type: 'multiple-choice', instruction:'He has ___ orange', options:['a','an'], correctValue:'an', audioValue:"He has an orange." },
    { type: 'multiple-choice', instruction:'She takes ___ sun', options:['a','an'], correctValue:'a', audioValue:"She takes a sun." },
    { type: 'multiple-choice', instruction:'We read ___ book', options:['a','an'], correctValue:'a', audioValue:"We read a book." },
    { type: 'multiple-choice', instruction:'I eat ___ apple', options:['a','an'], correctValue:'an', audioValue:"I eat an apple." },
    { type: 'multiple-choice', instruction:'They fly ___ kite', options:['a','an'], correctValue:'a', audioValue:"They fly a kite." },
    { type: 'multiple-choice', instruction:'He found ___ rock', options:['a','an'], correctValue:'a', audioValue:"He found a rock." },
    { type: 'multiple-choice', instruction:'She wears ___ hat', options:['a','an'], correctValue:'a', audioValue:"She wears a hat." },
    { type: 'multiple-choice', instruction:'It is ___ orange in the box', options:['a','an'], correctValue:'an', audioValue:"It's an orange in the box." }
  ]),
  // Island 6 – Speaking practice
  ...createItems(2, 6, [
    { type: 'speaking', instruction: 'Repeat the sentence:', audioValue: 'The sun is shining.', correctValue: 'The sun is shining.' },
    { type: 'speaking', instruction: 'Repeat the sentence:', audioValue: 'A boy plays with a kite.', correctValue: 'A boy plays with a kite.' },
    { type: 'speaking', instruction: 'Repeat the sentence:', audioValue: 'He eats an apple.', correctValue: 'He eats an apple.' },
    { type: 'speaking', instruction: 'Repeat the sentence:', audioValue: 'He drinks water.', correctValue: 'He drinks water.' },
    { type: 'speaking', instruction: 'Repeat the sentence:', audioValue: 'He steps on a rock.', correctValue: 'He steps on a rock.' },
    { type: 'speaking', instruction: 'Repeat the sentence:', audioValue: 'He wiggles his toes.', correctValue: 'He wiggles his toes.' }
  ]),
  // Island 7: Final mastery exercises – dynamic speaking, listening, reading
  ...createItems(2, 7, [
    { type: 'identification', instruction: 'What is this?', displayValue: 'fa-sun', audioValue: 'What is this?', options: ['sun','moon','star','cloud'], correctValue: 'sun' },
    { type: 'speaking', instruction: 'Say: sun', audioValue: 'sun', correctValue: 'sun' },
    { type: 'identification', instruction: 'What is this?', displayValue: 'fa-tree', audioValue: 'What is this?', options: ['tree','bush','flower','rock'], correctValue: 'tree' },
    { type: 'speaking', instruction: 'Say: tree', audioValue: 'tree', correctValue: 'tree' },
    { type: 'identification', instruction: 'What is this?', displayValue: 'fa-apple-whole', audioValue: 'What is this?', options: ['apple','orange','banana','grape'], correctValue: 'apple' },
    { type: 'speaking', instruction: 'Say: apple', audioValue: 'apple', correctValue: 'apple' },
    { type: 'multiple-choice', instruction:'It is ___ apple', options:['a','an'], correctValue:'an', audioValue:'apple' },
    { type: 'identification', instruction: 'What is this?', displayValue: 'fa-foot', audioValue: 'What is this?', options: ['toes','fingers','nose','foot'], correctValue: 'toes' },
    { type: 'speaking', instruction: 'Say: toes', audioValue: 'toes', correctValue: 'toes' },
    { type: 'multiple-choice', instruction:'It is ___ orange', options:['a','an'], correctValue:'an', audioValue:'orange' },
    { type: 'writing', instruction: 'Write what you hear:', audioValue: 'sun', correctValue: 'sun' },
    { type: 'writing', instruction: 'Write what you hear:', audioValue: 'tree', correctValue: 'tree' },
    { type: 'writing', instruction: 'Write what you hear:', audioValue: 'apple', correctValue: 'apple' },
    { type: 'writing', instruction: 'Write what you hear:', audioValue: 'water', correctValue: 'water' },
    { type: 'speaking', instruction: 'Repeat the sentence: The sun is shining.', audioValue: 'The sun is shining.', correctValue: 'The sun is shining.' }
  ])
];

// Lesson 3: Daily Routines and Activities
const L3_TRACKS = [
  // Island 1: Vocabulary (Daily Routines) - 20 items
  ...createItems(3, 1, [
    { type: 'identification', instruction: 'What does Daniel do in the morning?', displayValue: 'fa-bed', audioValue: 'wake up', options: ['sleep', 'wake up', 'eat', 'walk'], correctValue: 'wake up', isNewVocab: true },
    { type: 'identification', instruction: 'What does Sarah do before breakfast?', displayValue: 'fa-shower', audioValue: 'take a shower', options: ['take a shower', 'cook', 'eat', 'drink'], correctValue: 'take a shower', isNewVocab: true },
    { type: 'identification', instruction: 'What does Tom do with his breakfast?', displayValue: 'fa-utensils', audioValue: 'eat breakfast', options: ['drink milk', 'eat breakfast', 'walk to school', 'play games'], correctValue: 'eat breakfast', isNewVocab: true },
    { type: 'identification', instruction: 'What does Lisa do before school?', displayValue: 'fa-book', audioValue: 'get ready for school', options: ['sleep', 'get ready for school', 'take a shower', 'wake up'], correctValue: 'get ready for school', isNewVocab: true },
    { type: 'identification', instruction: 'What does Mark do to go to school?', displayValue: 'fa-person-walking', audioValue: 'walk to school', options: ['take a shower', 'eat', 'walk to school', 'sleep'], correctValue: 'walk to school', isNewVocab: true },
    { type: 'writing', instruction: 'Type what you hear: I wake up at seven o\'clock.', audioValue: 'wake up', correctValue: 'wake up' },
    { type: 'writing', instruction: 'Type what you hear: She takes a shower.', audioValue: 'shower', correctValue: 'shower' },
    { type: 'writing', instruction: 'Type what you hear: We eat breakfast.', audioValue: 'breakfast', correctValue: 'breakfast' },
    { type: 'writing', instruction: 'Type what you hear: He goes to school.', audioValue: 'school', correctValue: 'school' },
    { type: 'writing', instruction: 'Type what you hear: They play after school.', audioValue: 'play', correctValue: 'play' },
    { type: 'identification', instruction: 'Which shows what you do at school?', displayValue: 'fa-blackboard', audioValue: 'study', options: ['sleep', 'study', 'cook', 'watch TV'], correctValue: 'study', isNewVocab: true },
    { type: 'identification', instruction: 'Which shows what you do in the afternoon?', displayValue: 'fa-clock', audioValue: 'have lunch', options: ['sleep', 'wake up', 'have lunch', 'take a shower'], correctValue: 'have lunch', isNewVocab: true },
    { type: 'identification', instruction: 'Which shows what you do before bed?', displayValue: 'fa-moon', audioValue: 'go to bed', options: ['wake up', 'eat', 'go to bed', 'study'], correctValue: 'go to bed', isNewVocab: true },
    { type: 'speaking', instruction: 'Say: wake up', audioValue: 'wake up', correctValue: 'wake up' },
    { type: 'speaking', instruction: 'Say: take a shower', audioValue: 'take a shower', correctValue: 'take a shower' },
    { type: 'writing', instruction: 'Type what you hear: He does his homework.', audioValue: 'homework', correctValue: 'homework' },
    { type: 'writing', instruction: 'Type what you hear: She watches television.', audioValue: 'television', correctValue: 'television' },
    { type: 'speaking', instruction: 'Say: eat breakfast', audioValue: 'eat breakfast', correctValue: 'eat breakfast' },
    { type: 'identification', instruction: 'What do you do before sleeping?', displayValue: 'fa-brush-teeth', audioValue: 'brush your teeth', options: ['eat', 'brush your teeth', 'study', 'walk'], correctValue: 'brush your teeth', isNewVocab: true },
    { type: 'speaking', instruction: 'Say: go to bed', audioValue: 'go to bed', correctValue: 'go to bed' }
  ]),

  // Island 2: Listening (Comprehension) - 15 items
  ...createItems(3, 2, [
    { type: 'identification', instruction: 'Listen: Daniel wakes up at 7 AM. It is ___ AM.', audioValue: 'Daniel wakes up at seven o\'clock.', options: ['6', '7', '8', '9'], correctValue: '7', isNewVocab: true },
    { type: 'identification', instruction: 'Listen: Sarah takes a shower. She takes a ___.', audioValue: 'Sarah takes a shower after waking up.', options: ['walk', 'shower', 'eat', 'study'], correctValue: 'shower', isNewVocab: true },
    { type: 'identification', instruction: 'Listen: Tom eats breakfast at 7:30. It is ___ thirty.', audioValue: 'Tom eats breakfast at seven thirty.', options: ['7', '7:30', '8', '8:30'], correctValue: '7:30', isNewVocab: true },
    { type: 'identification', instruction: 'Listen: Lisa gets ready for school at 8 AM. What does she do at 8?', audioValue: 'Lisa gets ready for school at 8 o\'clock.', options: ['wake up', 'eat', 'get ready for school', 'take a shower'], correctValue: 'get ready for school', isNewVocab: true },
    { type: 'identification', instruction: 'Listen: Mark walks to school. How does he go to school?', audioValue: 'Mark walks to school every day.', options: ['by car', 'by bus', 'by bike', 'walks'], correctValue: 'walks', isNewVocab: true },
    { type: 'identification', instruction: 'Listen: Emma studies at school from 9 AM to 3 PM. How long does she study?', audioValue: 'Emma studies at school from 9 o\'clock to 3 o\'clock.', options: ['5 hours', '6 hours', '4 hours', '8 hours'], correctValue: '6 hours', isNewVocab: true },
    { type: 'identification', instruction: 'Listen: Daniel has lunch at 12 PM. When does he have lunch?', audioValue: 'Daniel has lunch at 12 o\'clock noon.', options: ['11 AM', '12 PM', '1 PM', '2 PM'], correctValue: '12 PM', isNewVocab: true },
    { type: 'identification', instruction: 'Listen: Sarah plays after school. When does she play?', audioValue: 'Sarah plays after school at 4 o\'clock.', options: ['morning', 'lunch time', 'after school', 'evening'], correctValue: 'after school', isNewVocab: true },
    { type: 'identification', instruction: 'Listen: Tom does his homework at 5 PM. When does he do homework?', audioValue: 'Tom does his homework at 5 o\'clock in the afternoon.', options: ['morning', '12 noon', '3 PM', '5 PM'], correctValue: '5 PM', isNewVocab: true },
    { type: 'identification', instruction: 'Listen: Lisa has dinner at 6:30 PM. When is dinner?', audioValue: 'Lisa has dinner at 6 thirty PM.', options: ['5 PM', '6 PM', '6:30 PM', '7 PM'], correctValue: '6:30 PM', isNewVocab: true },
    { type: 'identification', instruction: 'Listen: Mark watches television at 7 PM. What does he do?', audioValue: 'Mark watches television at 7 o\'clock in the evening.', options: ['study', 'play', 'watch television', 'eat'], correctValue: 'watch television', isNewVocab: true },
    { type: 'identification', instruction: 'Listen: Emma brushes her teeth before bed. What does she do?', audioValue: 'Emma brushes her teeth before going to bed.', options: ['eat', 'study', 'brush teeth', 'play'], correctValue: 'brush teeth', isNewVocab: true },
    { type: 'identification', instruction: 'Listen: Daniel goes to bed at 9 PM. When does he go to bed?', audioValue: 'Daniel goes to bed at 9 o\'clock at night.', options: ['8 PM', '9 PM', '10 PM', '11 PM'], correctValue: '9 PM', isNewVocab: true },
    { type: 'speaking', instruction: 'Repeat: Sarah takes a shower after waking up.', audioValue: 'Sarah takes a shower after waking up.', correctValue: 'Sarah takes a shower after waking up.' },
    { type: 'speaking', instruction: 'Repeat: Tom eats breakfast at 7:30.', audioValue: 'Tom eats breakfast at 7 thirty.', correctValue: 'Tom eats breakfast at 7 thirty.' }
  ]),

  // Island 3: Audio Match (Matching audio with word/number columns) - 12 items
  ...createItems(3, 3, [
    { type: 'identification', instruction: 'Match the audio: You hear "wake up" - which column?', audioValue: 'wake up', options: ['sleep', 'wake up', 'eat', 'walk'], correctValue: 'wake up', isNewVocab: true },
    { type: 'identification', instruction: 'Match the audio: You hear "7 AM" - which column?', audioValue: '7 AM', options: ['6', '7', '8', '9'], correctValue: '7', isNewVocab: true },
    { type: 'identification', instruction: 'Match the audio: You hear "shower" - which column?', audioValue: 'take a shower', options: ['walk', 'eat', 'shower', 'sleep'], correctValue: 'shower' },
    { type: 'identification', instruction: 'Match the audio: You hear "breakfast" - which time?', audioValue: 'breakfast', options: ['7:00', '7:30', '8:00', '8:30'], correctValue: '7:30' },
    { type: 'identification', instruction: 'Match the audio: You hear "study" - which column?', audioValue: 'study', options: ['play', 'study', 'walk', 'eat'], correctValue: 'study' },
    { type: 'identification', instruction: 'Match the audio: You hear "school" - which time?', audioValue: 'school', options: ['7 AM', '9 AM', '3 PM', '9 PM'], correctValue: '9 AM' },
    { type: 'identification', instruction: 'Match the audio: You hear "lunch" - which time?', audioValue: 'lunch', options: ['7 AM', '8 AM', '12 PM', '6 PM'], correctValue: '12 PM' },
    { type: 'identification', instruction: 'Match the audio: You hear "homework" - which column?', audioValue: 'homework', options: ['play', 'homework', 'watch TV', 'sleep'], correctValue: 'homework' },
    { type: 'identification', instruction: 'Match the audio: You hear "dinner" - which time?', audioValue: 'dinner', options: ['12 PM', '3 PM', '6:30 PM', '9 PM'], correctValue: '6:30 PM' },
    { type: 'identification', instruction: 'Match the audio: You hear "television" - which column?', audioValue: 'television', options: ['study', 'watch TV', 'eat', 'walk'], correctValue: 'watch TV', isNewVocab: true },
    { type: 'identification', instruction: 'Match the audio: You hear "bed" - which time?', audioValue: 'bed', options: ['7 AM', '9 PM', '12 PM', '3 PM'], correctValue: '9 PM' },
    { type: 'identification', instruction: 'Match the audio: You hear "walk" - which column?', audioValue: 'walk to school', options: ['car', 'bus', 'walk', 'bike'], correctValue: 'walk' }
  ]),

  // Island 4: Sound Comparison (Same/Different) - 10 items
  ...createItems(3, 4, [
    { type: 'multiple-choice', instruction: 'Are they the same or different? "thirty" vs "thirteen"', audioValue: 'thirty thirteen', options: ['same', 'different'], correctValue: 'different', isNewVocab: true },
    { type: 'multiple-choice', instruction: 'Are they the same or different? "fifty" vs "fifteen"', audioValue: 'fifty fifteen', options: ['same', 'different'], correctValue: 'different' },
    { type: 'multiple-choice', instruction: 'Are they the same or different? "nine" vs "ninety"', audioValue: 'nine ninety', options: ['same', 'different'], correctValue: 'different' },
    { type: 'multiple-choice', instruction: 'Are they the same or different? "walk" vs "talk"', audioValue: 'walk talk', options: ['same', 'different'], correctValue: 'different' },
    { type: 'multiple-choice', instruction: 'Are they the same or different? "ship" vs "sheep"', audioValue: 'ship sheep', options: ['same', 'different'], correctValue: 'different' },
    { type: 'multiple-choice', instruction: 'Are they the same or different? "wake" vs "wake"', audioValue: 'wake wake', options: ['same', 'different'], correctValue: 'same' },
    { type: 'multiple-choice', instruction: 'Are they the same or different? "shower" vs "shower"', audioValue: 'shower shower', options: ['same', 'different'], correctValue: 'same' },
    { type: 'multiple-choice', instruction: 'Are they the same or different? "study" vs "study"', audioValue: 'study study', options: ['same', 'different'], correctValue: 'same' },
    { type: 'multiple-choice', instruction: 'Are they the same or different? "homework" vs "homework"', audioValue: 'homework homework', options: ['same', 'different'], correctValue: 'same' },
    { type: 'multiple-choice', instruction: 'Are they the same or different? "bed" vs "bed"', audioValue: 'bed bed', options: ['same', 'different'], correctValue: 'same' }
  ]),

  // Island 5: Reading (Workbook Text with Translations) - 15 items
  ...createItems(3, 5, [
    { type: 'multiple-choice', instruction: 'Read paragraph 1. Daniel wakes up at 7:00 AM. What time does he wake up?', displayValue: 'Daniel wakes up at 7:00 AM.\n(Daniel acorda às 7:00 da manhã.)', audioValue: 'Daniel wakes up at 7 AM.', options: ['6 AM', '7 AM', '8 AM', '9 AM'], correctValue: '7 AM', isNewVocab: true },
    { type: 'multiple-choice', instruction: 'Read: He takes a shower and gets dressed. What does he do after waking up?', displayValue: 'He takes a shower and gets dressed.\n(Ele toma um banho e se veste.)', audioValue: 'He takes a shower and gets dressed.', options: ['eat', 'sleep', 'take a shower', 'study'], correctValue: 'take a shower' },
    { type: 'multiple-choice', instruction: 'Read: He eats breakfast at 7:30. When is breakfast?', displayValue: 'He eats breakfast at 7:30.\n(Ele toma café às 7:30.)', audioValue: 'breakfast at 7 thirty', options: ['7:00', '7:30', '8:00', '8:30'], correctValue: '7:30' },
    { type: 'multiple-choice', instruction: 'Read: He walks to school at 8:00. How does he go to school?', displayValue: 'He walks to school at 8:00.\n(Ele caminha para a escola às 8:00.)', audioValue: 'walks to school', options: ['by car', 'by bus', 'walks', 'by train'], correctValue: 'walks' },
    { type: 'multiple-choice', instruction: 'Read paragraph 2. At school, Daniel studies English and Math. What classes does he have?', displayValue: 'At school, Daniel studies English and Math.\n(Na escola, Daniel estuda inglês e matemática.)', audioValue: 'English and Math', options: ['Science', 'PE', 'English and Math', 'History'], correctValue: 'English and Math', isNewVocab: true },
    { type: 'writing', instruction: 'Read and write: Daniel has lunch at 12:00. When does he have lunch? Type the time.', audioValue: 'lunch', correctValue: '12' },
    { type: 'writing', instruction: 'Read and write: After school, Daniel plays football. What does he play? Type the sport.', audioValue: 'football', correctValue: 'football' },
    { type: 'multiple-choice', instruction: 'Read paragraph 3. Sarah does her homework at 5:00 PM. When does she do homework?', displayValue: 'Sarah does her homework at 5:00 PM.\n(Sarah faz o dever de casa às 5:00 da tarde.)', audioValue: 'homework at 5 PM', options: ['4 PM', '5 PM', '6 PM', '7 PM'], correctValue: '5 PM', isNewVocab: true },
    { type: 'multiple-choice', instruction: 'Read: She watches television at 7:00 PM. What does Sarah do at 7 PM?', displayValue: 'She watches television at 7:00 PM.\n(Ela assiste televisão às 7:00 da noite.)', audioValue: 'watches television', options: ['study', 'play', 'watch television', 'cook'], correctValue: 'watch television' },
    { type: 'multiple-choice', instruction: 'Read: She has dinner at 6:30 PM. When is dinner for Sarah?', displayValue: 'She has dinner at 6:30 PM.\n(Ela janta às 6:30 da noite.)', audioValue: 'dinner at 6 thirty PM', options: ['6:00', '6:30', '7:00', '7:30'], correctValue: '6:30' },
    { type: 'writing', instruction: 'Read and write: Tom brushes his teeth before bed. What does Tom do before bed? Type one action.', audioValue: 'brushes teeth', correctValue: 'brush' },
    { type: 'multiple-choice', instruction: 'Read paragraph 4. Mark goes to bed at 9:00 PM. When does he sleep?', displayValue: 'Mark goes to bed at 9:00 PM.\n(Mark vai para a cama às 9:00 da noite.)', audioValue: 'bed at 9 PM', options: ['8 PM', '9 PM', '10 PM', '11 PM'], correctValue: '9 PM' },
    { type: 'identification', instruction: 'Read: Daniel has a very busy day! Is his day busy?', displayValue: 'Daniel has a very busy day!\n(Daniel tem um dia muito ocupado!)', audioValue: 'busy day', options: ['lazy', 'busy', 'fun', 'short'], correctValue: 'busy' },
    { type: 'speaking', instruction: 'Read and repeat: Daniel wakes up at 7:00 AM and takes a shower.', audioValue: 'Daniel wakes up at 7 o clock and takes a shower.', correctValue: 'Daniel wakes up at 7 o clock and takes a shower.' },
    { type: 'speaking', instruction: 'Read and repeat: Sarah does homework and watches television.', audioValue: 'Sarah does homework and watches television.', correctValue: 'Sarah does homework and watches television.' }
  ]),

  // Island 6: Check Reading (Reading Comprehension + Speaking) - 12 items
  ...createItems(3, 6, [
    { type: 'speaking', instruction: 'Listen and answer: What time does Daniel wake up?', audioValue: 'What time does Daniel wake up?', displayValue: 'Question: When does Daniel wake up?', correctValue: 'seven o clock' },
    { type: 'speaking', instruction: 'Listen and answer: What does Daniel do after waking up?', audioValue: 'What does Daniel do after waking up?', displayValue: 'Question: What activity after waking up?', correctValue: 'take a shower' },
    { type: 'speaking', instruction: 'Listen and answer: When does Daniel eat breakfast?', audioValue: 'When does Daniel eat breakfast?', displayValue: 'Question: Breakfast time?', correctValue: 'seven thirty' },
    { type: 'speaking', instruction: 'Listen and answer: How does Daniel go to school?', audioValue: 'How does Daniel go to school?', displayValue: 'Question: Transport to school?', correctValue: 'walk' },
    { type: 'speaking', instruction: 'Listen and answer: What time does Daniel have lunch?', audioValue: 'What time does Daniel have lunch?', displayValue: 'Question: Lunch time?', correctValue: 'twelve o clock' },
    { type: 'speaking', instruction: 'Listen and answer: What does Sarah do at 5 PM?', audioValue: 'What does Sarah do at 5 PM?', displayValue: 'Question: Sarah\'s activity at 5 PM?', correctValue: 'do homework' },
    { type: 'speaking', instruction: 'Listen and answer: When does Sarah have dinner?', audioValue: 'When does Sarah have dinner?', displayValue: 'Question: Sarah\'s dinner time?', correctValue: 'six thirty' },
    { type: 'speaking', instruction: 'Listen and answer: What does Sarah watch in the evening?', audioValue: 'What does Sarah watch in the evening?', displayValue: 'Question: Evening activity?', correctValue: 'television' },
    { type: 'speaking', instruction: 'Listen and answer: When does Tom brush his teeth?', audioValue: 'When does Tom brush his teeth?', displayValue: 'Question: When brush teeth?', correctValue: 'before bed' },
    { type: 'speaking', instruction: 'Listen and answer: What time does Mark go to bed?', audioValue: 'What time does Mark go to bed?', displayValue: 'Question: Bedtime?', correctValue: 'nine o clock' },
    { type: 'speaking', instruction: 'Listen and answer: Is Daniel\'s day busy?', audioValue: 'Is Daniel s day busy?', displayValue: 'Question: Is day busy?', correctValue: 'yes' },
    { type: 'speaking', instruction: 'Listen and answer: Name one thing Daniel does at school.', audioValue: 'Name one thing Daniel does at school.', displayValue: 'Question: School activity?', correctValue: 'study english' }
  ]),

  // Island 7: Speaking (Speaking Practice) - 12 items
  ...createItems(3, 7, [
    { type: 'speaking', instruction: 'Say the sentence: I wake up at 7 AM every day.', audioValue: 'I wake up at 7 AM every day.', correctValue: 'I wake up at 7 o clock every day.' },
    { type: 'speaking', instruction: 'Say the sentence: I take a shower after waking up.', audioValue: 'I take a shower after waking up.', correctValue: 'I take a shower after waking up.' },
    { type: 'speaking', instruction: 'Say the sentence: I eat breakfast at 7:30.', audioValue: 'I eat breakfast at 7 thirty.', correctValue: 'I eat breakfast at 7 thirty.' },
    { type: 'speaking', instruction: 'Say the sentence: I walk to school at 8 AM.', audioValue: 'I walk to school at 8 o clock.', correctValue: 'I walk to school at 8 o clock.' },
    { type: 'speaking', instruction: 'Say the sentence: I study English and Math at school.', audioValue: 'I study English and Math at school.', correctValue: 'I study English and Math at school.' },
    { type: 'speaking', instruction: 'Say the sentence: I have lunch at 12 PM.', audioValue: 'I have lunch at 12 o clock.', correctValue: 'I have lunch at 12 o clock.' },
    { type: 'speaking', instruction: 'Say the sentence: I play sports after school.', audioValue: 'I play sports after school.', correctValue: 'I play sports after school.' },
    { type: 'speaking', instruction: 'Say the sentence: I do my homework at 5 PM.', audioValue: 'I do my homework at 5 o clock.', correctValue: 'I do my homework at 5 o clock.' },
    { type: 'speaking', instruction: 'Say the sentence: I have dinner at 6:30 PM.', audioValue: 'I have dinner at 6 thirty PM.', correctValue: 'I have dinner at 6 thirty.' },
    { type: 'speaking', instruction: 'Say the sentence: I watch television at 7 PM.', audioValue: 'I watch television at 7 o clock.', correctValue: 'I watch television at 7 o clock.' },
    { type: 'speaking', instruction: 'Say the sentence: I brush my teeth before bed.', audioValue: 'I brush my teeth before bed.', correctValue: 'I brush my teeth before bed.' },
    { type: 'speaking', instruction: 'Say the sentence: I go to bed at 9 PM.', audioValue: 'I go to bed at 9 o clock.', correctValue: 'I go to bed at 9 o clock.' }
  ]),

  // Island 8: Mastery (Final Review) - 20 items
  ...createItems(3, 8, [
    { type: 'identification', instruction: 'What does "wake up" mean?', displayValue: 'fa-bed', audioValue: 'wake up', options: ['sleep', 'wake up', 'stand up', 'lie down'], correctValue: 'wake up', isNewVocab: true },
    { type: 'identification', instruction: 'What does "take a shower" mean?', displayValue: 'fa-shower', audioValue: 'take a shower', options: ['wash hands', 'wash body', 'drink water', 'put on clothes'], correctValue: 'wash body', isNewVocab: true },
    { type: 'identification', instruction: 'Which is a meal?', audioValue: 'breakfast', options: ['walk', 'study', 'breakfast', 'play'], correctValue: 'breakfast' },
    { type: 'identification', instruction: 'Which is homework?', audioValue: 'homework', options: ['school', 'homework', 'walk', 'shower'], correctValue: 'homework' },
    { type: 'writing', instruction: 'Write: When does Daniel wake up? Type the time (example: 7).', audioValue: '7 AM', correctValue: '7' },
    { type: 'writing', instruction: 'Write: What does Sarah do at 5 PM? Type the activity.', audioValue: 'homework', correctValue: 'homework' },
    { type: 'writing', instruction: 'Write: How does Daniel go to school?', audioValue: 'walk', correctValue: 'walk' },
    { type: 'speaking', instruction: 'Say: My daily routine is very busy.', audioValue: 'My daily routine is very busy.', correctValue: 'My daily routine is very busy.' },
    { type: 'multiple-choice', instruction: 'Which time is 9 PM?', audioValue: 'bedtime', options: ['morning', 'afternoon', 'evening', 'night'], correctValue: 'evening' },
    { type: 'multiple-choice', instruction: 'Which sentence is correct? "I wake up at 7 AM" or "I wake up time 7 AM"?', audioValue: 'sentence', options: ['I wake up at 7 AM', 'I wake up time 7 AM'], correctValue: 'I wake up at 7 AM' },
    { type: 'speaking', instruction: 'Answer: What time do you wake up?', audioValue: 'What time do you wake up?', correctValue: 'I wake up at', displayValue: 'Your wake-up time?' },
    { type: 'speaking', instruction: 'Answer: What is your favorite meal?', audioValue: 'What is your favorite meal?', correctValue: 'breakfast' },
    { type: 'identification', instruction: 'Listen: Daniel wakes at 7, showers, eats at 7:30. What does he do FIRST?', audioValue: 'wake up', options: ['eat', 'shower', 'wake up', 'study'], correctValue: 'wake up' },
    { type: 'multiple-choice', instruction: 'Is this a common daily routine?', audioValue: 'yes', options: ['yes', 'no'], correctValue: 'yes' },
    { type: 'writing', instruction: 'Fill: He eats breakfast at ___ (type time with number only).', audioValue: '7:30', correctValue: '7' },
    { type: 'speaking', instruction: 'Review: Say Daniel\'s afternoon activity.', audioValue: 'Daniel has lunch and plays after school.', correctValue: 'lunch' },
    { type: 'identification', instruction: 'What time is lunch?', audioValue: 'lunch', options: ['7 AM', '9 AM', '12 PM', '3 PM'], correctValue: '12 PM' },
    { type: 'writing', instruction: 'Write: Sarah has dinner at 6:30. Type: breakfast time (7:30) or dinner time (6:30)? Type the word.', audioValue: 'dinner', correctValue: 'dinner' },
    { type: 'speaking', instruction: 'Final test: Say your daily routine in one sentence.', audioValue: 'Tell me your daily routine.', correctValue: 'I wake up' },
    { type: 'identification', instruction: 'Review final: Which is NOT a daily activity?', audioValue: 'astronaut', options: ['wake up', 'eat', 'astronaut', 'sleep'], correctValue: 'astronaut' }
  ])
];

export const PRACTICE_ITEMS: PracticeItem[] = [
  ...L1_TRACKS, ...L2_TRACKS, ...L3_TRACKS
];

export const MODULE_NAMES: Record<string, string> = {
  'L1_TRACK1': 'The Alphabet groups',
  'L1_TRACK2': 'Numbers 0-10 Cardinal',
  'L1_TRACK3': 'Numbers 11-20 Cardinal',
  'L1_TRACK4': 'Basic Colors',
  'L1_TRACK5': 'Secondary Colors',
  'L1_TRACK6': 'Math Practice',
  'L1_TRACK7': 'Unit 1 Mastery',
  'L2_TRACK1': 'Short vs Long Vowels',
  'L2_TRACK2': 'Letter vs Sound Dialogue',
  'L2_TRACK3': 'Picture Vocabulary',
  'L2_TRACK4': 'Vowel Identification',
  'L2_TRACK5': 'Articles a/an',
  'L2_TRACK6': 'Reading & Dialogue',
  'L2_TRACK7': 'Unit 2 Mastery',
  'L3_TRACK1': 'Daily Routine Vocabulary',
  'L3_TRACK2': 'Listening Comprehension',
  'L3_TRACK3': 'Audio Matching',
  'L3_TRACK4': 'Sound Comparison',
  'L3_TRACK5': 'Reading Comprehension',
  'L3_TRACK6': 'Speaking Check',
  'L3_TRACK7': 'Speaking Practice',
  'L3_TRACK8': 'Final Mastery'
};

export const MODULE_ICONS: Record<string, string> = {
  'L1_TRACK1': 'fa-font',
  'L1_TRACK2': 'fa-list-ol',
  'L1_TRACK3': 'fa-sort-numeric-up',
  'L1_TRACK4': 'fa-palette',
  'L1_TRACK5': 'fa-palette',
  'L1_TRACK6': 'fa-calculator',
  'L1_TRACK7': 'fa-award',
  'L2_TRACK1': 'fa-volume-up',
  'L2_TRACK2': 'fa-comments',
  'L2_TRACK3': 'fa-image',
  'L2_TRACK4': 'fa-search',
  'L2_TRACK5': 'fa-file-alt',
  'L2_TRACK6': 'fa-book-open',
  'L2_TRACK7': 'fa-award',
  'L3_TRACK1': 'fa-list-check',
  'L3_TRACK2': 'fa-ear-listen',
  'L3_TRACK3': 'fa-link',
  'L3_TRACK4': 'fa-equals',
  'L3_TRACK5': 'fa-book-open',
  'L3_TRACK6': 'fa-microphone',
  'L3_TRACK7': 'fa-volume-up',
  'L3_TRACK8': 'fa-trophy'
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
  'L2_TRACK1': ['Practice listening: short vs long vowel sounds.', 'Match words like cat /æ/ and cake /eɪ/.'],
  'L2_TRACK2': ['Answer teacher questions about vowel sounds and letter names.', 'Pairs of questions reinforce both skills.'],
  'L2_TRACK3': ['Recognize vocabulary pictures: sun, toes, rock, tree, apple, kite, orange, water.', 'Spell the words you see.'],
  'L2_TRACK4': ['Name the vowel in a word or say if it is short/long.', 'Focus on words from the lesson.'],
  'L2_TRACK5': ['Choose “a” or “an” in simple sentences.', 'Articles before words beginning with vowel sounds.'],
  'L2_TRACK6': ['Read a short passage and answer questions.', 'Practice simple dialogue responses.'],
  'L3_TRACK1': [
    'Daily routine verbs: wake up, shower, eat, study, play, sleep.',
    'Tell time: at 7 o\'clock, at 7:30, in the morning, in the afternoon.',
    'Prepositions: at (time), to (destination), after, before.'
  ],
  'L3_TRACK2': [
    'Listening for specific details: time, activity, person.',
    'Understand longer sentences and natural speech.'
  ],
  'L3_TRACK3': [
    'Match spoken words with written options.',
    'Speed recognition: identify words in context.'
  ],
  'L3_TRACK4': [
    'Minimal pairs: words with similar sounds.',
    'Develop listening discrimination skills.'
  ],
  'L3_TRACK5': [
    'Read full sentences about daily routines.',
    'Understand sequence of events and time expressions.'
  ],
  'L3_TRACK6': [
    'Comprehend spoken questions about the text.',
    'Answer with complete sentences spoken aloud.'
  ],
  'L3_TRACK7': [
    'Create personal daily routine sentences.',
    'Fluency practice with natural intonation.'
  ],
  'L3_TRACK8': [
    'Review all Lesson 3 skills: vocabulary, listening, speaking.',
    'Apply routine language in new contexts.'
  ]
};

export const LESSON_CONFIGS = [
  { id: 1, name: "The Alphabet and Numbers", modules: ['L1_TRACK1', 'L1_TRACK2', 'L1_TRACK3', 'L1_TRACK4', 'L1_TRACK5', 'L1_TRACK6', 'L1_TRACK7'] },
  { id: 2, name: "Vowels & Early Reader", modules: ['L2_TRACK1','L2_TRACK2','L2_TRACK3','L2_TRACK4','L2_TRACK5','L2_TRACK6','L2_TRACK7'] },
  { id: 3, name: "Daily Routines and Activities", modules: ['L3_TRACK1', 'L3_TRACK2', 'L3_TRACK3', 'L3_TRACK4', 'L3_TRACK5', 'L3_TRACK6', 'L3_TRACK7', 'L3_TRACK8'] }
];
