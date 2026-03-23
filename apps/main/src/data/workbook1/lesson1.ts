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
        { id: 'wb1_l1_d2_e1',  type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Fourteen',  options: ['4', '14', '40', '44'],  correctValue: '14', isNewVocab: true },
        { id: 'wb1_l1_d2_e2',  type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Sixteen',   options: ['6', '16', '60', '66'],  correctValue: '16' },
        { id: 'wb1_l1_d2_e3',  type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Seventeen', options: ['7', '17', '70', '77'],  correctValue: '17' },
        { id: 'wb1_l1_d2_e4',  type: 'writing',        instruction: 'Type in words what you hear.',        audioValue: 'One',                                         correctValue: 'one'      },
        { id: 'wb1_l1_d2_e5',  type: 'writing',        instruction: 'Type in words what you hear.',        audioValue: 'Two',                                         correctValue: 'two'      },
        { id: 'wb1_l1_d2_e6',  type: 'writing',        instruction: 'Type in words what you hear.',        audioValue: 'Five',                                        correctValue: 'five'     },
        { id: 'wb1_l1_d2_e7',  type: 'speaking',       instruction: 'Listen and repeat exactly as you hear.', displayValue: '15', audioValue: 'Fifteen',             correctValue: 'fifteen'  },
        { id: 'wb1_l1_d2_e8',  type: 'speaking',       instruction: 'Listen and repeat exactly as you hear.', displayValue: '19', audioValue: 'Nineteen',            correctValue: 'nineteen' },
        { id: 'wb1_l1_d2_e9',  type: 'writing',        instruction: 'What is nine plus nine? Answer in a full sentence.',          audioValue: 'What is nine plus nine',    correctValue: 'it is eighteen' },
        { id: 'wb1_l1_d2_e10', type: 'writing',        instruction: 'Type in words what you hear.',        audioValue: 'Ten',                                         correctValue: 'ten'      },
        { id: 'wb1_l1_d2_e11', type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Four',  options: ['4', '14', '40', '44'],  correctValue: '4'  },
        { id: 'wb1_l1_d2_e12', type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Six',   options: ['6', '16', '60', '66'],  correctValue: '6'  },
        { id: 'wb1_l1_d2_e13', type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Seven', options: ['7', '17', '70', '77'],  correctValue: '7'  },
        { id: 'wb1_l1_d2_e14', type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Nine',  options: ['9', '19', '90', '99'],  correctValue: '9'  },
        { id: 'wb1_l1_d2_e15', type: 'writing',        instruction: 'What is six plus nine? Answer in a full sentence.',          audioValue: 'What is six plus nine',     correctValue: 'it is fifteen' }
      ]
    },
    {
      id: "wb1_l1_d3",
      type: "practice",
      exercises: [
        { id: 'wb1_l1_d3_e1',  type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Eleven',    options: ['1', '11', '12', '21'],  correctValue: '11', isNewVocab: true },
        { id: 'wb1_l1_d3_e2',  type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Twelve',    options: ['2', '12', '20', '22'],  correctValue: '12' },
        { id: 'wb1_l1_d3_e3',  type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Thirteen',  options: ['3', '13', '30', '33'],  correctValue: '13' },
        { id: 'wb1_l1_d3_e4',  type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Fifteen',   options: ['5', '15', '50', '55'],  correctValue: '15' },
        { id: 'wb1_l1_d3_e5',  type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Twenty',    options: ['12', '20', '2', '22'],  correctValue: '20' },
        { id: 'wb1_l1_d3_e6',  type: 'writing',        instruction: 'What is ten plus five? Answer in a full sentence.',          audioValue: 'What is ten plus five',        correctValue: 'it is fifteen' },
        { id: 'wb1_l1_d3_e7',  type: 'speaking',        instruction: 'Listen and repeat exactly as you hear.',           displayValue: '20', audioValue: 'Twenty',   correctValue: 'twenty'   },
        { id: 'wb1_l1_d3_e8',  type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Fourteen',  options: ['4', '14', '40', '44'],  correctValue: '14' },
        { id: 'wb1_l1_d3_e9',  type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Sixteen',   options: ['6', '16', '60', '66'],  correctValue: '16' },
        { id: 'wb1_l1_d3_e10', type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Seventeen', options: ['7', '17', '70', '77'],  correctValue: '17' },
        { id: 'wb1_l1_d3_e11', type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Eighteen',  options: ['8', '18', '80', '88'],  correctValue: '18' },
        { id: 'wb1_l1_d3_e12', type: 'identification', instruction: 'Listen and pick the correct number.', audioValue: 'Nineteen',  options: ['9', '19', '90', '99'],  correctValue: '19' },
        { id: 'wb1_l1_d3_e13', type: 'writing',        instruction: 'What is eleven plus nine? Answer in a full sentence.',        audioValue: 'What is eleven plus nine',      correctValue: 'it is twenty' },
        { id: 'wb1_l1_d3_e14', type: 'writing',        instruction: 'What is twelve plus one? Answer in a full sentence.',         audioValue: 'What is twelve plus one',       correctValue: 'it is thirteen' },
        { id: 'wb1_l1_d3_e15', type: 'writing',        instruction: 'What is fifteen plus two? Answer in a full sentence.',        audioValue: 'What is fifteen plus two',      correctValue: 'it is seventeen' }
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
        { id: 'wb1_l1_d5_e1', type: 'multiple-choice', instruction: 'Identify the color of the object.',  displayValue: 'fa-carrot',       audioValue: 'Orange', options: ['Orange', 'Yellow', 'Purple', 'White'], correctValue: 'Orange', isNewVocab: true },
        { id: 'wb1_l1_d5_e2', type: 'multiple-choice', instruction: 'Identify the color of the phone.',  displayValue: 'fa-mobile-screen', audioValue: 'Black',  options: ['Black', 'White', 'Purple', 'Blue'],   correctValue: 'Black'  },
        { id: 'wb1_l1_d5_e3', type: 'multiple-choice', instruction: 'Identify the color of the cloud.',  displayValue: 'fa-cloud',        audioValue: 'White',  options: ['Black', 'White', 'Purple', 'Blue'],   correctValue: 'White'  },
        { id: 'wb1_l1_d5_e4', type: 'multiple-choice', instruction: 'Identify the color of the glass.',  displayValue: 'fa-wine-glass',   audioValue: 'Purple', options: ['Purple', 'Blue', 'Red', 'Pink'],      correctValue: 'Purple' },
        { id: 'wb1_l1_d5_e5', type: 'multiple-choice', instruction: 'Identify the color of the coal.',   displayValue: 'fa-cube',         audioValue: 'Black',  options: ['Black', 'White', 'Purple', 'Blue'],   correctValue: 'Black'  },
        { id: 'wb1_l1_d5_e6', type: 'multiple-choice', instruction: 'Identify the color of the paper.',  displayValue: 'fa-file',         audioValue: 'White',  options: ['Black', 'White', 'Purple', 'Blue'],   correctValue: 'White'  },
        { id: 'wb1_l1_d5_e7', type: 'multiple-choice', instruction: 'Identify the color of the grape.',  displayValue: 'fa-grapes',       audioValue: 'Purple', options: ['Purple', 'Blue', 'Red', 'Pink'],      correctValue: 'Purple' },
        { id: 'wb1_l1_d5_e8', type: 'multiple-choice', instruction: 'Identify the color of the pumpkin.',displayValue: 'fa-ghost',        audioValue: 'Orange', options: ['Orange', 'Yellow', 'Purple', 'White'], correctValue: 'Orange' },
        { id: 'wb1_l1_d5_e9', type: 'writing',         instruction: 'Type the color you hear.',                                           audioValue: 'Black',  correctValue: 'black' },
        { id: 'wb1_l1_d5_e10', type: 'writing',        instruction: 'Type the color you hear.',                                           audioValue: 'White',  correctValue: 'white' }
      ]
    },
    {
      id: "wb1_l1_d6",
      type: "practice",
      exercises: [
        { id: 'wb1_l1_d6_e1',  type: 'writing',  instruction: 'What is four times two? Answer in a full sentence.',        audioValue: 'What is four times two',      correctValue: 'it is eight'   },
        { id: 'wb1_l1_d6_e2',  type: 'writing',  instruction: 'What is ten divided by two? Answer in a full sentence.',    audioValue: 'What is ten divided by two',   correctValue: 'it is five'    },
        { id: 'wb1_l1_d6_e3',  type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', displayValue: '8', audioValue: 'Eight', correctValue: 'eight' },
        { id: 'wb1_l1_d6_e4',  type: 'writing',  instruction: 'What is three plus seven? Answer in a full sentence.',      audioValue: 'What is three plus seven',    correctValue: 'it is ten'     },
        { id: 'wb1_l1_d6_e5',  type: 'writing',  instruction: 'What is twenty minus five? Answer in a full sentence.',    audioValue: 'What is twenty minus five',   correctValue: 'it is fifteen' },
        { id: 'wb1_l1_d6_e6',  type: 'writing',  instruction: 'What is six times two? Answer in a full sentence.',         audioValue: 'What is six times two',       correctValue: 'it is twelve'  },
        { id: 'wb1_l1_d6_e7',  type: 'writing',  instruction: 'What is nine divided by three? Answer in a full sentence.', audioValue: 'What is nine divided by three', correctValue: 'it is three'  },
        { id: 'wb1_l1_d6_e8',  type: 'writing',  instruction: 'What is fifteen plus five? Answer in a full sentence.',     audioValue: 'What is fifteen plus five',   correctValue: 'it is twenty'  },
        { id: 'wb1_l1_d6_e9',  type: 'writing',  instruction: 'What is twelve minus four? Answer in a full sentence.',    audioValue: 'What is twelve minus four',   correctValue: 'it is eight'   },
        { id: 'wb1_l1_d6_e10', type: 'writing',  instruction: 'What is five times three? Answer in a full sentence.',      audioValue: 'What is five times three',    correctValue: 'it is fifteen' }
      ]
    },
    {
      id: "wb1_l1_d7",
      type: "review",
      exercises: [
        { id: 'wb1_l1_d7_e1',  type: 'identification',  instruction: 'Listen and pick the correct number.',               audioValue: 'Eighteen', options: ['8', '18', '80', '88'], correctValue: '18' },
        { id: 'wb1_l1_d7_e2',  type: 'writing',         instruction: 'Type in words what you hear.',             audioValue: 'Nineteen', correctValue: 'nineteen' },
        { id: 'wb1_l1_d7_e3',  type: 'multiple-choice', instruction: 'Identify the color.',                      displayValue: 'fa-mobile-screen', audioValue: 'Black',       options: ['Black', 'White', 'Purple', 'Blue'],   correctValue: 'Black' },
        { id: 'wb1_l1_d7_e4',  type: 'speaking',        instruction: 'Listen and repeat exactly as you hear.',   displayValue: '100',    audioValue: 'One hundred', correctValue: '100' },
        { id: 'wb1_l1_d7_e5',  type: 'speaking',        instruction: 'Listen and repeat exactly as you hear.',           displayValue: '14', audioValue: 'Fourteen', correctValue: 'fourteen' },
        { id: 'wb1_l1_d7_e6',  type: 'identification',  instruction: 'Listen and pick the correct number.',      audioValue: 'Twelve',   options: ['2', '12', '20', '22'], correctValue: '12' },
        { id: 'wb1_l1_d7_e7',  type: 'multiple-choice', instruction: 'Identify the color of the shirt.',         displayValue: 'fa-shirt', audioValue: 'Green',      options: ['Red', 'Blue', 'Green', 'Yellow'],     correctValue: 'Green' },
        { id: 'wb1_l1_d7_e8',  type: 'writing',         instruction: 'What is ten plus ten? Answer in a full sentence.',          audioValue: 'What is ten plus ten',    correctValue: 'it is twenty'   },
        { id: 'wb1_l1_d7_e9',  type: 'speaking',        instruction: 'Listen and repeat exactly as you hear.',   displayValue: '13',     audioValue: 'Thirteen',    correctValue: '13' },
        { id: 'wb1_l1_d7_e10', type: 'multiple-choice', instruction: 'Identify the color of the car.',           displayValue: 'fa-car', audioValue: 'Red',         options: ['Red', 'Blue', 'Green', 'Black'],      correctValue: 'Red'  },
        { id: 'wb1_l1_d7_e11', type: 'writing',         instruction: 'Type in words what you hear.',             audioValue: 'Eleven',   correctValue: 'eleven' },
        { id: 'wb1_l1_d7_e12', type: 'identification',  instruction: 'Listen and pick the correct number.',      audioValue: 'Fifteen',  options: ['5', '15', '50', '55'], correctValue: '15' },
        { id: 'wb1_l1_d7_e13', type: 'multiple-choice', instruction: 'Identify the color of the sky.',           displayValue: 'fa-cloud-sun', audioValue: 'Blue',  options: ['Red', 'Blue', 'Green', 'Black'],      correctValue: 'Blue' },
        { id: 'wb1_l1_d7_e14', type: 'writing',         instruction: 'What is eight times two? Answer in a full sentence.',       audioValue: 'What is eight times two', correctValue: 'it is sixteen'  },
        { id: 'wb1_l1_d7_e15', type: 'speaking',        instruction: 'Listen and repeat exactly as you hear.',   displayValue: '20',     audioValue: 'Twenty',      correctValue: '20' }
      ]
    }
  ]
};
