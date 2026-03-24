import { Lesson } from '../../types';

export const lesson1: Lesson = {
  id: "wb1_l1",
  title: "Lesson 1: The Alphabet and Numbers",
  days: [
    {
      id: "wb1_l1_d1",
      type: "practice",
      exercises: [
        // Letters (18) — hear the letter, pick what you heard
        { id: 'wb1_l1_d1_e1',  type: 'multiple-choice', instruction: 'What are you listening to?', audioValue: 'A',        options: ['A', 'E', 'H', 'K'],      correctValue: 'A',  isNewVocab: true },
        { id: 'wb1_l1_d1_e2',  type: 'multiple-choice', instruction: 'What are you listening to?', audioValue: 'G',        options: ['G', 'J', 'Z', 'D'],      correctValue: 'G'  },
        { id: 'wb1_l1_d1_e3',  type: 'multiple-choice', instruction: 'What are you listening to?', audioValue: 'D',        options: ['D', 'B', 'T', 'P'],      correctValue: 'D'  },
        { id: 'wb1_l1_d1_e4',  type: 'multiple-choice', instruction: 'What are you listening to?', audioValue: 'I',        options: ['I', 'Y', 'E', 'A'],      correctValue: 'I'  },
        { id: 'wb1_l1_d1_e5',  type: 'multiple-choice', instruction: 'What are you listening to?', audioValue: 'H',        options: ['H', 'A', 'E', 'I'],      correctValue: 'H'  },
        { id: 'wb1_l1_d1_e6',  type: 'multiple-choice', instruction: 'What are you listening to?', audioValue: 'J',        options: ['J', 'G', 'K', 'Z'],      correctValue: 'J'  },
        { id: 'wb1_l1_d1_e7',  type: 'multiple-choice', instruction: 'What are you listening to?', audioValue: 'K',        options: ['K', 'J', 'Q', 'G'],      correctValue: 'K'  },
        { id: 'wb1_l1_d1_e8',  type: 'multiple-choice', instruction: 'What are you listening to?', audioValue: 'Q',        options: ['Q', 'K', 'U', 'O'],      correctValue: 'Q'  },
        { id: 'wb1_l1_d1_e9',  type: 'multiple-choice', instruction: 'What are you listening to?', audioValue: 'R',        options: ['R', 'L', 'W', 'N'],      correctValue: 'R'  },
        { id: 'wb1_l1_d1_e10', type: 'multiple-choice', instruction: 'What are you listening to?', audioValue: 'W',        options: ['W', 'R', 'M', 'V'],      correctValue: 'W'  },
        { id: 'wb1_l1_d1_e11', type: 'multiple-choice', instruction: 'What are you listening to?', audioValue: 'X',        options: ['X', 'Z', 'S', 'K'],      correctValue: 'X'  },
        { id: 'wb1_l1_d1_e12', type: 'multiple-choice', instruction: 'What are you listening to?', audioValue: 'Y',        options: ['Y', 'I', 'E', 'J'],      correctValue: 'Y'  },
        { id: 'wb1_l1_d1_e13', type: 'multiple-choice', instruction: 'What are you listening to?', audioValue: 'E',        options: ['E', 'I', 'A', 'O'],      correctValue: 'E'  },
        { id: 'wb1_l1_d1_e14', type: 'multiple-choice', instruction: 'What are you listening to?', audioValue: 'U',        options: ['U', 'Q', 'O', 'A'],      correctValue: 'U'  },
        { id: 'wb1_l1_d1_e15', type: 'multiple-choice', instruction: 'What are you listening to?', audioValue: 'O',        options: ['O', 'U', 'A', 'E'],      correctValue: 'O'  },
        { id: 'wb1_l1_d1_e16', type: 'multiple-choice', instruction: 'What are you listening to?', audioValue: 'L',        options: ['L', 'R', 'N', 'M'],      correctValue: 'L'  },
        { id: 'wb1_l1_d1_e17', type: 'multiple-choice', instruction: 'What are you listening to?', audioValue: 'M',        options: ['M', 'N', 'W', 'L'],      correctValue: 'M'  },
        { id: 'wb1_l1_d1_e18', type: 'multiple-choice', instruction: 'What are you listening to?', audioValue: 'N',        options: ['N', 'M', 'L', 'R'],      correctValue: 'N'  },
        // Numbers (7) — hear the number word, pick the digit
        { id: 'wb1_l1_d1_e19', type: 'identification',  instruction: 'What are you listening to?', audioValue: 'Zero',     options: ['0', '1', '6', '10'],     correctValue: '0'  },
        { id: 'wb1_l1_d1_e20', type: 'identification',  instruction: 'What are you listening to?', audioValue: 'Three',    options: ['3', '8', '13', '30'],    correctValue: '3'  },
        { id: 'wb1_l1_d1_e21', type: 'identification',  instruction: 'What are you listening to?', audioValue: 'Eight',    options: ['8', '3', '18', '80'],    correctValue: '8'  },
        { id: 'wb1_l1_d1_e22', type: 'identification',  instruction: 'What are you listening to?', audioValue: 'Eleven',   options: ['1', '11', '12', '21'],   correctValue: '11' },
        { id: 'wb1_l1_d1_e23', type: 'identification',  instruction: 'What are you listening to?', audioValue: 'Twelve',   options: ['2', '12', '20', '21'],   correctValue: '12' },
        { id: 'wb1_l1_d1_e24', type: 'identification',  instruction: 'What are you listening to?', audioValue: 'Thirteen', options: ['3', '13', '30', '33'],   correctValue: '13' },
        { id: 'wb1_l1_d1_e25', type: 'identification',  instruction: 'What are you listening to?', audioValue: 'Twenty',   options: ['2', '12', '20', '22'],   correctValue: '20' }
      ]
    },
    {
      id: "wb1_l1_d2",
      type: "practice",
      exercises: [
        // 3 identification: hear number → pick digit
        { id: 'wb1_l1_d2_e1',  type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Fourteen',  options: ['4', '14', '40', '44'],  correctValue: '14', isNewVocab: true },
        { id: 'wb1_l1_d2_e2',  type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Sixteen',   options: ['6', '16', '60', '66'],  correctValue: '16' },
        // Sentence shadowing: hear & repeat a complete sentence
        { id: 'wb1_l1_d2_e3',  type: 'speaking',       instruction: 'Listen and repeat exactly as you hear.', audioValue: "It's fifteen.", correctValue: "it's fifteen" },
        // Dictation writing: write the word you hear
        { id: 'wb1_l1_d2_e4',  type: 'writing',        instruction: 'Type in words what you hear.',        audioValue: 'Ten',       correctValue: 'ten' },
        // Math sentence writing: PLUS (+)
        { id: 'wb1_l1_d2_e5',  type: 'writing',        instruction: 'What is nine plus nine? Answer in a full sentence.',   audioValue: 'What is nine plus nine',    correctValue: 'it is eighteen' },
        // Shadowing the full math question
        { id: 'wb1_l1_d2_e6',  type: 'speaking',       instruction: 'Listen and repeat exactly as you hear.', audioValue: 'What is five plus five?',  correctValue: 'what is five plus five' },
        // identification
        { id: 'wb1_l1_d2_e7',  type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Seventeen', options: ['7', '17', '70', '77'],  correctValue: '17' },
        // Math sentence writing: MINUS (-)
        { id: 'wb1_l1_d2_e8',  type: 'writing',        instruction: 'What is twenty minus one? Answer in a full sentence.',  audioValue: 'What is twenty minus one',  correctValue: 'it is nineteen' },
        // Sentence shadowing
        { id: 'wb1_l1_d2_e9',  type: 'speaking',       instruction: 'Listen and repeat exactly as you hear.', audioValue: "It's twenty.", correctValue: "it's twenty" },
        // Dictation writing
        { id: 'wb1_l1_d2_e10', type: 'writing',        instruction: 'Type in words what you hear.',        audioValue: 'Nineteen',  correctValue: 'nineteen' },
      ]
    },
    {
      id: "wb1_l1_d3",
      type: "practice",
      exercises: [
        // 3 identification: hear number → pick digit
        { id: 'wb1_l1_d3_e1',  type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Eleven',    options: ['1', '11', '12', '21'],  correctValue: '11', isNewVocab: true },
        { id: 'wb1_l1_d3_e2',  type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Twelve',    options: ['2', '12', '20', '22'],  correctValue: '12' },
        // Shadowing the full math question (revisits PLUS)
        { id: 'wb1_l1_d3_e3',  type: 'speaking',       instruction: 'Listen and repeat exactly as you hear.', audioValue: 'What is ten plus five?',    correctValue: 'what is ten plus five' },
        // Math sentence writing: PLUS (different question from shadow e3)
        { id: 'wb1_l1_d3_e4',  type: 'writing',        instruction: 'What is eight plus nine? Answer in a full sentence.',       audioValue: 'What is eight plus nine', correctValue: 'it is seventeen' },
        // identification
        { id: 'wb1_l1_d3_e5',  type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Eighteen',  options: ['8', '18', '80', '88'],  correctValue: '18' },
        // Shadowing: introduces TIMES concept via listening
        { id: 'wb1_l1_d3_e6',  type: 'speaking',       instruction: 'Listen and repeat exactly as you hear.', audioValue: 'What is three times four?', correctValue: 'what is three times four' },
        // Math sentence writing: TIMES (different question from shadow e6)
        { id: 'wb1_l1_d3_e7',  type: 'writing',        instruction: 'What is two times seven? Answer in a full sentence.',  audioValue: 'What is two times seven',  correctValue: 'it is fourteen' },
        // Sentence shadowing: result
        { id: 'wb1_l1_d3_e8',  type: 'speaking',       instruction: 'Listen and repeat exactly as you hear.', audioValue: "It's twelve.", correctValue: "it's twelve" },
        // Math sentence writing: DIVIDED BY
        { id: 'wb1_l1_d3_e9',  type: 'writing',        instruction: 'What is twenty divided by two? Answer in a full sentence.',   audioValue: 'What is twenty divided by two',   correctValue: 'it is ten' },
        // identification
        { id: 'wb1_l1_d3_e10', type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Nineteen',  options: ['9', '19', '90', '99'],  correctValue: '19' },
      ]
    },
    {
      id: "wb1_l1_d4",
      type: "practice",
      exercises: [
        { id: 'wb1_l1_d4_e1',  type: 'identification', instruction: 'Listen and tap the correct color.', audioValue: 'Red',    options: ['Red',    'Blue',   'Green',  'Yellow'],  correctValue: 'Red',    isNewVocab: true, translation: 'Red = Vermelho'    },
        { id: 'wb1_l1_d4_e2',  type: 'identification', instruction: 'Listen and tap the correct color.', audioValue: 'Blue',   options: ['Blue',   'Red',    'Green',  'Yellow'],  correctValue: 'Blue',   isNewVocab: true, translation: 'Blue = Azul'       },
        { id: 'wb1_l1_d4_e3',  type: 'identification', instruction: 'Listen and tap the correct color.', audioValue: 'Green',  options: ['Green',  'Red',    'Blue',   'Yellow'],  correctValue: 'Green',  isNewVocab: true, translation: 'Green = Verde'     },
        { id: 'wb1_l1_d4_e4',  type: 'identification', instruction: 'Listen and tap the correct color.', audioValue: 'Yellow', options: ['Yellow', 'Red',    'Blue',   'Green'],   correctValue: 'Yellow', isNewVocab: true, translation: 'Yellow = Amarelo'  },
        { id: 'wb1_l1_d4_e5',  type: 'identification', instruction: 'Listen and tap the correct color.', audioValue: 'Orange', options: ['Orange', 'Red',    'Yellow', 'Brown'],   correctValue: 'Orange', isNewVocab: true, translation: 'Orange = Laranja'  },
        { id: 'wb1_l1_d4_e6',  type: 'identification', instruction: 'Listen and tap the correct color.', audioValue: 'Black',  options: ['Black',  'White',  'Purple', 'Blue'],    correctValue: 'Black',  isNewVocab: true, translation: 'Black = Preto'     },
        { id: 'wb1_l1_d4_e7',  type: 'identification', instruction: 'Listen and tap the correct color.', audioValue: 'White',  options: ['White',  'Black',  'Yellow', 'Orange'],  correctValue: 'White',  isNewVocab: true, translation: 'White = Branco'    },
        { id: 'wb1_l1_d4_e8',  type: 'identification', instruction: 'Listen and tap the correct color.', audioValue: 'Purple', options: ['Purple', 'Blue',   'Pink',   'Black'],   correctValue: 'Purple', isNewVocab: true, translation: 'Purple = Roxo'     },
        { id: 'wb1_l1_d4_e9',  type: 'identification', instruction: 'Listen and tap the correct color.', audioValue: 'Pink',   options: ['Pink',   'Red',    'Purple', 'White'],   correctValue: 'Pink',   isNewVocab: true, translation: 'Pink = Rosa'       },
        { id: 'wb1_l1_d4_e10', type: 'identification', instruction: 'Listen and tap the correct color.', audioValue: 'Brown',  options: ['Brown',  'Orange', 'Red',    'Black'],   correctValue: 'Brown',  isNewVocab: true, translation: 'Brown = Marrom'    },
      ]
    },
    {
      id: "wb1_l1_d5",
      type: "practice",
      exercises: [
        // Writing: student sees a color swatch and must answer "It is [color]" / "It's [color]"
        // displayValue = bare lowercase color name → rendered as a solid colored square
        // audioValue  = question spoken aloud via TTS
        { id: 'wb1_l1_d5_e1',  type: 'writing', instruction: 'What color is it? Answer in a full sentence.', displayValue: 'orange', audioValue: 'What color is it?', correctValue: 'it is orange',  translation: 'Orange = Laranja'  },
        { id: 'wb1_l1_d5_e2',  type: 'writing', instruction: 'What color is it? Answer in a full sentence.', displayValue: 'black',  audioValue: 'What color is it?', correctValue: 'it is black',   translation: 'Black = Preto'     },
        { id: 'wb1_l1_d5_e3',  type: 'writing', instruction: 'What color is it? Answer in a full sentence.', displayValue: 'purple', audioValue: 'What color is it?', correctValue: 'it is purple',  translation: 'Purple = Roxo'     },
        { id: 'wb1_l1_d5_e4',  type: 'writing', instruction: 'What color is it? Answer in a full sentence.', displayValue: 'pink',   audioValue: 'What color is it?', correctValue: 'it is pink',    translation: 'Pink = Rosa'       },
        { id: 'wb1_l1_d5_e5',  type: 'writing', instruction: 'What color is it? Answer in a full sentence.', displayValue: 'white',  audioValue: 'What color is it?', correctValue: 'it is white',   translation: 'White = Branco'    },
        { id: 'wb1_l1_d5_e6',  type: 'writing', instruction: 'What color is it? Answer in a full sentence.', displayValue: 'brown',  audioValue: 'What color is it?', correctValue: 'it is brown',   translation: 'Brown = Marrom'    },
        { id: 'wb1_l1_d5_e7',  type: 'writing', instruction: 'What color is it? Answer in a full sentence.', displayValue: 'green',  audioValue: 'What color is it?', correctValue: 'it is green',   translation: 'Green = Verde'     },
        { id: 'wb1_l1_d5_e8',  type: 'writing', instruction: 'What color is it? Answer in a full sentence.', displayValue: 'yellow', audioValue: 'What color is it?', correctValue: 'it is yellow',  translation: 'Yellow = Amarelo'  },
        { id: 'wb1_l1_d5_e9',  type: 'writing', instruction: 'What color is it? Answer in a full sentence.', displayValue: 'blue',   audioValue: 'What color is it?', correctValue: 'it is blue',    translation: 'Blue = Azul'       },
        { id: 'wb1_l1_d5_e10', type: 'writing', instruction: 'What color is it? Answer in a full sentence.', displayValue: 'red',    audioValue: 'What color is it?', correctValue: 'it is red',     translation: 'Red = Vermelho'    },
      ]
    },
    {
      id: "wb1_l1_d6",
      type: "practice",
      exercises: [
        { id: 'wb1_l1_d6_e1',  type: 'multiple-choice', instruction: 'The teacher says: "Hello!" — Choose the correct response.', audioValue: 'Hello!', options: ['Hello!', 'Good night!', 'Thank you.', 'Goodbye!'], correctValue: 'Hello!', isNewVocab: true, translation: 'Hello = Olá' },
        { id: 'wb1_l1_d6_e2',  type: 'multiple-choice', instruction: 'The teacher says: "Good morning!" — Choose the correct response.', audioValue: 'Good morning!', options: ['Good night!', 'Good morning!', 'See you later!', 'I am fine.'], correctValue: 'Good morning!', isNewVocab: true, translation: 'Good morning = Bom dia' },
        { id: 'wb1_l1_d6_e3',  type: 'multiple-choice', instruction: 'The teacher asks: "How are you?" — Choose the correct response.', audioValue: 'How are you?', options: ["I'm fine, thank you.", 'My name is Lucas.', 'Good night!', 'Goodbye!'], correctValue: "I'm fine, thank you.", isNewVocab: true, translation: 'Como vai você? = How are you?' },
        { id: 'wb1_l1_d6_e4',  type: 'multiple-choice', instruction: 'The teacher asks: "What is your name?" — Choose the correct response.', audioValue: 'What is your name?', options: ['My name is Lucas.', "I'm fine, thank you.", 'Good morning!', 'Nice to meet you.'], correctValue: 'My name is Lucas.', isNewVocab: true, translation: 'Qual é o seu nome? = What is your name?' },
        { id: 'wb1_l1_d6_e5',  type: 'multiple-choice', instruction: 'The teacher asks: "What is your first name?" — Choose the correct response.', audioValue: 'What is your first name?', options: ['My first name is Lucas.', 'My last name is Silva.', 'My name is Lucas.', "I'm fine."], correctValue: 'My first name is Lucas.', isNewVocab: true, translation: 'Qual é o seu primeiro nome? = What is your first name?' },
        { id: 'wb1_l1_d6_e6',  type: 'multiple-choice', instruction: 'The teacher asks: "What is your last name?" — Choose the correct response.', audioValue: 'What is your last name?', options: ['My last name is Silva.', 'My first name is Lucas.', "I'm fine, thank you.", 'Good afternoon!'], correctValue: 'My last name is Silva.', isNewVocab: true, translation: 'Qual é o seu sobrenome? = What is your last name?' },
        { id: 'wb1_l1_d6_e7',  type: 'multiple-choice', instruction: 'The teacher says: "Nice to meet you." — Choose the correct response.', audioValue: 'Nice to meet you.', options: ['Nice to meet you too.', 'Nice to meet you.', 'Good morning!', 'Goodbye!'], correctValue: 'Nice to meet you too.', isNewVocab: true, translation: 'Prazer em conhecê-lo também = Nice to meet you too' },
        { id: 'wb1_l1_d6_e8',  type: 'multiple-choice', instruction: 'The teacher says: "Good afternoon!" — Choose the correct response.', audioValue: 'Good afternoon!', options: ['Good morning!', 'Good night!', 'Good afternoon!', "I'm fine."], correctValue: 'Good afternoon!', isNewVocab: true, translation: 'Good afternoon = Boa tarde' },
        { id: 'wb1_l1_d6_e9',  type: 'multiple-choice', instruction: 'The teacher says: "Good night!" — Choose the correct response.', audioValue: 'Good night!', options: ['Good morning!', 'Good afternoon!', 'Hello!', 'Good night!'], correctValue: 'Good night!', isNewVocab: true, translation: 'Good night = Boa noite' },
        { id: 'wb1_l1_d6_e10', type: 'multiple-choice', instruction: 'The teacher says: "Good evening." — Choose the correct response.', audioValue: 'Good evening.', options: ['Good morning!', 'Good evening.', 'Good night!', 'Good afternoon!'], correctValue: 'Good evening.', isNewVocab: true, translation: 'Good evening = Boa tarde / Boa noite (ao entardecer)' },
      ]
    },
    {
      id: "wb1_l1_d7",
      type: "review",
      exercises: [
        // --- Alphabet (5) ---
        { id: 'wb1_l1_d7_e1',  type: 'identification', instruction: 'Listen and pick the correct letter.', audioValue: 'A', options: ['A', 'E', 'I', 'O'], correctValue: 'A', translation: 'A = A (como em "Apple")' },
        { id: 'wb1_l1_d7_e6',  type: 'identification', instruction: 'Listen and pick the correct letter.', audioValue: 'B', options: ['B', 'D', 'P', 'V'], correctValue: 'B', translation: 'B = B (como em "Ball")' },
        { id: 'wb1_l1_d7_e11', type: 'identification', instruction: 'Listen and pick the correct letter.', audioValue: 'G', options: ['G', 'J', 'Q', 'C'], correctValue: 'G', translation: 'G = G (como em "Go")' },
        { id: 'wb1_l1_d7_e16', type: 'identification', instruction: 'Listen and pick the correct letter.', audioValue: 'M', options: ['M', 'N', 'W', 'H'], correctValue: 'M', translation: 'M = M (como em "Man")' },
        { id: 'wb1_l1_d7_e21', type: 'identification', instruction: 'Listen and pick the correct letter.', audioValue: 'S', options: ['S', 'F', 'X', 'Z'], correctValue: 'S', translation: 'S = S (como em "Sun")' },
        // --- Numbers (5) ---
        { id: 'wb1_l1_d7_e2',  type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Eighteen',   options: ['8', '18', '80', '88'],   correctValue: '18',  translation: '18 = Dezoito' },
        { id: 'wb1_l1_d7_e7',  type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Twelve',     options: ['2',  '12', '20', '22'],  correctValue: '12',  translation: '12 = Doze' },
        { id: 'wb1_l1_d7_e12', type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Fifteen',    options: ['5',  '15', '50', '55'],  correctValue: '15',  translation: '15 = Quinze' },
        { id: 'wb1_l1_d7_e17', type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Sixteen',    options: ['6',  '14', '16', '61'],  correctValue: '16',  translation: '16 = Dezesseis' },
        { id: 'wb1_l1_d7_e22', type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Twenty',     options: ['2',  '12', '20', '22'],  correctValue: '20',  translation: '20 = Vinte' },
        // --- Colors (5) — color swatch display, sentence-choice ---
        { id: 'wb1_l1_d7_e3',  type: 'multiple-choice', displayValue: 'red',    audioValue: 'What color is it?', instruction: 'What color is it? — Choose the correct response.', options: ["It's red.", "It's orange.", "It's brown.", "It's pink."],   correctValue: "It's red.",    translation: 'Red = Vermelho'   },
        { id: 'wb1_l1_d7_e8',  type: 'multiple-choice', displayValue: 'blue',   audioValue: 'What color is it?', instruction: 'What color is it? — Choose the correct response.', options: ["It's blue.", "It's purple.", "It's green.", "It's black."],  correctValue: "It's blue.",   translation: 'Blue = Azul'      },
        { id: 'wb1_l1_d7_e13', type: 'multiple-choice', displayValue: 'yellow', audioValue: 'What color is it?', instruction: 'What color is it? — Choose the correct response.', options: ["It's yellow.", "It's orange.", "It's white.", "It's green."],  correctValue: "It's yellow.", translation: 'Yellow = Amarelo' },
        { id: 'wb1_l1_d7_e18', type: 'multiple-choice', displayValue: 'purple', audioValue: 'What color is it?', instruction: 'What color is it? — Choose the correct response.', options: ["It's purple.", "It's blue.", "It's pink.", "It's black."],   correctValue: "It's purple.", translation: 'Purple = Roxo'    },
        { id: 'wb1_l1_d7_e23', type: 'multiple-choice', displayValue: 'brown',  audioValue: 'What color is it?', instruction: 'What color is it? — Choose the correct response.', options: ["It's brown.", "It's orange.", "It's red.", "It's black."],   correctValue: "It's brown.",  translation: 'Brown = Marrom'   },
        // --- Greetings / Identity (5) ---
        { id: 'wb1_l1_d7_e4',  type: 'multiple-choice', instruction: 'The teacher says: "Good morning!" — Choose the correct response.', audioValue: 'Good morning!', options: ['Good morning!', 'Good night!', 'Goodbye!', "I'm fine."], correctValue: 'Good morning!', translation: 'Good morning = Bom dia' },
        { id: 'wb1_l1_d7_e9',  type: 'multiple-choice', instruction: 'The teacher asks: "How are you?" — Choose the correct response.', audioValue: 'How are you?', options: ["I'm fine, thank you.", 'Good morning!', 'My name is Lucas.', 'Goodbye!'], correctValue: "I'm fine, thank you.", translation: 'Como vai você? = How are you?' },
        { id: 'wb1_l1_d7_e14', type: 'multiple-choice', instruction: 'The teacher asks: "What is your name?" — Choose the correct response.', audioValue: 'What is your name?', options: ['My name is Lucas.', "I'm fine.", 'Good afternoon!', 'Nice to meet you.'], correctValue: 'My name is Lucas.', translation: 'Qual é o seu nome? = What is your name?' },
        { id: 'wb1_l1_d7_e19', type: 'multiple-choice', instruction: 'The teacher says: "Nice to meet you." — Choose the correct response.', audioValue: 'Nice to meet you.', options: ['Nice to meet you too.', 'Good night!', 'Goodbye!', 'Good morning!'], correctValue: 'Nice to meet you too.', translation: 'Prazer em conhecê-lo = Nice to meet you' },
        { id: 'wb1_l1_d7_e24', type: 'multiple-choice', instruction: 'The teacher says: "Goodbye!" — Choose the correct response.', audioValue: 'Goodbye!', options: ['Goodbye!', 'Hello!', 'Good morning!', "I'm fine, thank you."], correctValue: 'Goodbye!', translation: 'Goodbye = Tchau / Até logo' },
        // --- Math (5) ---
        { id: 'wb1_l1_d7_e5',  type: 'identification', instruction: 'Listen and pick the correct answer.', audioValue: 'What is four plus six?',      options: ['8', '9', '10', '11'],  correctValue: '10', translation: '4 + 6 = 10' },
        { id: 'wb1_l1_d7_e10', type: 'identification', instruction: 'Listen and pick the correct answer.', audioValue: 'What is ten minus three?',    options: ['6', '7', '8', '13'],   correctValue: '7',  translation: '10 - 3 = 7' },
        { id: 'wb1_l1_d7_e15', type: 'identification', instruction: 'Listen and pick the correct answer.', audioValue: 'What is three times four?',   options: ['7', '10', '12', '14'], correctValue: '12', translation: '3 × 4 = 12' },
        { id: 'wb1_l1_d7_e20', type: 'identification', instruction: 'Listen and pick the correct answer.', audioValue: 'What is twenty divided by four?', options: ['4', '5', '6', '8'], correctValue: '5', translation: '20 ÷ 4 = 5' },
        { id: 'wb1_l1_d7_e25', type: 'identification', instruction: 'Listen and pick the correct answer.', audioValue: 'What is fifteen plus five?',  options: ['18', '19', '20', '25'], correctValue: '20', translation: '15 + 5 = 20' },
      ]
    }
  ]
};
