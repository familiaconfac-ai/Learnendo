import { Lesson } from '../../types';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS_OF_YEAR = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ANY_DAY_ANSWERS = DAYS_OF_WEEK.flatMap((day) => [day, `It is ${day}.`, `Today is ${day}.`]);
const ANY_MONTH_ANSWERS = MONTHS_OF_YEAR.flatMap((month) => [month, `It is ${month}.`, `The month is ${month}.`]);

export const lesson7: Lesson = {
  id: 'wb1_l7',
  title: 'Lesson 7: Days, Months, and Dates',
  days: [
    {
      id: 'wb1_l7_d1',
      type: 'practice',
      exercises: [
        {
          id: 'wb1_l7_d1_e1',
          type: 'multiple-choice',
          instruction: 'Choose the day.',
          audioValue: 'Monday',
          options: ['Monday', 'January'],
          correctValue: 'Monday',
          translation: 'segunda-feira',
          isNewVocab: true
        },
        {
          id: 'wb1_l7_d1_e2',
          type: 'multiple-choice',
          instruction: 'Choose the day.',
          audioValue: 'Friday',
          options: ['Friday', 'March'],
          correctValue: 'Friday',
          translation: 'sexta-feira',
          isNewVocab: true
        },
        {
          id: 'wb1_l7_d1_e3',
          type: 'multiple-choice',
          instruction: 'Choose the month.',
          audioValue: 'January',
          options: ['January', 'Tuesday'],
          correctValue: 'January',
          translation: 'janeiro',
          isNewVocab: true
        },
        {
          id: 'wb1_l7_d1_e4',
          type: 'multiple-choice',
          instruction: 'Choose the month.',
          audioValue: 'July',
          options: ['July', 'Sunday'],
          correctValue: 'July',
          translation: 'julho',
          isNewVocab: true
        },
        {
          id: 'wb1_l7_d1_e5',
          type: 'identification',
          instruction: 'Identify the type of word.',
          audioValue: 'Saturday',
          options: ['day', 'month'],
          correctValue: 'day',
          translation: 'sábado',
          isNewVocab: true
        },
        {
          id: 'wb1_l7_d1_e6',
          type: 'identification',
          instruction: 'Identify the type of word.',
          audioValue: 'December',
          options: ['month', 'day'],
          correctValue: 'month',
          translation: 'dezembro',
          isNewVocab: true
        },
        {
          id: 'wb1_l7_d1_e7',
          type: 'speaking',
          instruction: 'Listen and repeat.',
          audioValue: 'Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.',
          correctValue: 'Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.',
          displayValue: 'Monday / Tuesday / Wednesday / Thursday / Friday / Saturday / Sunday',
          isNewVocab: false
        }
      ]
    },
    {
      id: 'wb1_l7_d2',
      type: 'practice',
      exercises: [
        {
          id: 'wb1_l7_d2_e1',
          type: 'multiple-choice',
          instruction: 'Choose the correct sentence.',
          audioValue: 'Today is Monday.',
          options: ['Today is Monday.', 'Today are Monday.'],
          correctValue: 'Today is Monday.',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d2_e2',
          type: 'multiple-choice',
          instruction: 'Choose the correct sentence.',
          audioValue: 'It is Tuesday.',
          options: ['It is Tuesday.', 'It are Tuesday.'],
          correctValue: 'It is Tuesday.',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d2_e3',
          type: 'identification',
          instruction: 'Choose the correct answer.',
          audioValue: 'What day is it today?',
          options: ['It is Wednesday.', 'I am Wednesday.'],
          correctValue: 'It is Wednesday.',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d2_e4',
          type: 'multiple-choice',
          instruction: 'Choose the correct sentence.',
          audioValue: 'The month is April.',
          options: ['The month is April.', 'The month are April.'],
          correctValue: 'The month is April.',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d2_e5',
          type: 'writing',
          instruction: 'Write the missing word.',
          audioValue: 'Today is Friday.',
          correctValue: 'is',
          displayValue: 'Today ______ Friday.',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d2_e6',
          type: 'writing',
          instruction: 'Write the missing word.',
          audioValue: 'It is Sunday.',
          correctValue: 'is',
          displayValue: 'It ______ Sunday.',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d2_e7',
          type: 'speaking',
          instruction: 'Listen and repeat.',
          audioValue: 'What day is it today? It is Monday.',
          correctValue: 'What day is it today? It is Monday.',
          displayValue: 'A: What day is it today?\nB: It is Monday.',
          isNewVocab: false
        }
      ]
    },
    {
      id: 'wb1_l7_d3',
      type: 'practice',
      exercises: [
        {
          id: 'wb1_l7_d3_e1',
          type: 'identification',
          instruction: 'Choose the correct answer.',
          audioValue: 'What day is it today?',
          options: ['It is Monday.', 'It is January.'],
          correctValue: 'It is Monday.',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d3_e2',
          type: 'identification',
          instruction: 'Choose the correct answer.',
          audioValue: 'What month is it?',
          options: ['It is March.', 'It is Tuesday.'],
          correctValue: 'It is March.',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d3_e3',
          type: 'multiple-choice',
          instruction: 'Choose the correct question.',
          audioValue: 'It is Saturday.',
          options: ['What day is it?', 'What month is it?'],
          correctValue: 'What day is it?',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d3_e4',
          type: 'multiple-choice',
          instruction: 'Choose the correct question.',
          audioValue: 'It is October.',
          options: ['What month is it?', 'What day is it?'],
          correctValue: 'What month is it?',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d3_e5',
          type: 'writing',
          instruction: 'Write any day of the week.',
          audioValue: 'What day is it today?',
          correctValue: 'It is Monday.',
          acceptedAnswers: ANY_DAY_ANSWERS,
          audioValueBeforeAnswer: 'Write any day of the week.',
          displayValue: 'What day is it today? ______',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d3_e6',
          type: 'writing',
          instruction: 'Write any month of the year.',
          audioValue: 'What month is it?',
          correctValue: 'It is January.',
          acceptedAnswers: ANY_MONTH_ANSWERS,
          audioValueBeforeAnswer: 'Write any month of the year.',
          displayValue: 'What month is it? ______',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d3_e7',
          type: 'speaking',
          instruction: 'Ask and answer.',
          audioValue: 'What month is it? It is January.',
          correctValue: 'What month is it? It is January.',
          displayValue: 'A: What month is it?\nB: It is January.',
          isNewVocab: false
        }
      ]
    },
    {
      id: 'wb1_l7_d4',
      type: 'practice',
      exercises: [
        {
          id: 'wb1_l7_d4_e1',
          type: 'speaking',
          instruction: 'Listen and repeat the dialogue.',
          audioValue: 'Teacher: What day is it today? Ben: It is Monday. Teacher: What month is it? Anna: It is January. Teacher: What is the date? Lucas: It is January first.',
          correctValue: 'What day is it today? It is Monday. What month is it? It is January. What is the date? It is January first.',
          displayValue: 'Teacher: What day is it today?\nBen: It is Monday.\nTeacher: What month is it?\nAnna: It is January.\nTeacher: What is the date?\nLucas: It is January first.',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d4_e2',
          type: 'identification',
          instruction: 'Choose the correct answer from the dialogue.',
          audioValue: 'What day is it today?',
          options: ['It is Monday.', 'It is January.'],
          correctValue: 'It is Monday.',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d4_e3',
          type: 'identification',
          instruction: 'Choose the correct answer from the dialogue.',
          audioValue: 'What month is it?',
          options: ['It is January.', 'It is Monday.'],
          correctValue: 'It is January.',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d4_e4',
          type: 'multiple-choice',
          instruction: 'Choose the date.',
          audioValue: 'January first',
          options: ['January first', 'Monday first'],
          correctValue: 'January first',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d4_e5',
          type: 'writing',
          instruction: 'Write the missing word.',
          audioValue: 'It is January first.',
          correctValue: 'first',
          displayValue: 'It is January ______.',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d4_e6',
          type: 'writing',
          instruction: 'Write the missing word.',
          audioValue: 'It is February second.',
          correctValue: 'second',
          displayValue: 'It is February ______.',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d4_e7',
          type: 'speaking',
          instruction: 'Say the date.',
          audioValue: 'It is March third.',
          correctValue: 'It is March third.',
          displayValue: 'March 3rd: It is ______.',
          isNewVocab: false
        }
      ]
    },
    {
      id: 'wb1_l7_d5',
      type: 'practice',
      exercises: [
        {
          id: 'wb1_l7_d5_e1',
          type: 'speaking',
          instruction: 'Say any day of the week.',
          audioValue: 'Today is Monday.',
          correctValue: 'Today is Monday.',
          acceptedAnswers: ANY_DAY_ANSWERS,
          audioValueBeforeAnswer: 'Say any day of the week.',
          displayValue: 'Today is ______.',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d5_e2',
          type: 'speaking',
          instruction: 'Say any month of the year.',
          audioValue: 'It is April.',
          correctValue: 'It is April.',
          acceptedAnswers: ANY_MONTH_ANSWERS,
          audioValueBeforeAnswer: 'Say any month of the year.',
          displayValue: 'The month is ______.',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d5_e3',
          type: 'speaking',
          instruction: 'Answer with any day of the week.',
          audioValue: 'What day is it today?',
          correctValue: 'It is Friday.',
          acceptedAnswers: ANY_DAY_ANSWERS,
          audioValueBeforeAnswer: 'Answer with any day of the week.',
          displayValue: 'A: What day is it today?\nB: It is ______.',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d5_e4',
          type: 'speaking',
          instruction: 'Answer with any month of the year.',
          audioValue: 'What month is it?',
          correctValue: 'It is May.',
          acceptedAnswers: ANY_MONTH_ANSWERS,
          audioValueBeforeAnswer: 'Answer with any month of the year.',
          displayValue: 'A: What month is it?\nB: It is ______.',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d5_e5',
          type: 'writing',
          instruction: 'Write any day of the week.',
          audioValue: 'What day is it today?',
          correctValue: 'It is Sunday.',
          acceptedAnswers: ANY_DAY_ANSWERS,
          audioValueBeforeAnswer: 'Write any day of the week.',
          displayValue: 'What day is it today? ______',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d5_e6',
          type: 'writing',
          instruction: 'Write a short answer.',
          audioValue: 'What is the date?',
          correctValue: 'It is June fourth.',
          displayValue: 'What is the date? ______',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d5_e7',
          type: 'speaking',
          instruction: 'Make a short conversation.',
          audioValue: 'Hello! What day is it today? It is Wednesday. What month is it? It is June.',
          correctValue: 'Hello! What day is it today? It is Wednesday. What month is it? It is June.',
          displayValue: 'A: Hello!\nB: Hi!\nA: What day is it today?\nB: It is Wednesday.\nA: What month is it?\nB: It is June.',
          isNewVocab: false
        }
      ]
    },
    {
      id: 'wb1_l7_d6',
      type: 'practice',
      exercises: [
        {
          id: 'wb1_l7_d6_e1',
          type: 'speaking',
          instruction: 'Listen to the text.',
          audioValue: 'Today is Monday. The month is January. Ben is in the classroom. The teacher writes the date on the board. It is January first. Anna says, My birthday is in March. Lucas says, My birthday is in July. The students read the days and the months. They are happy.',
          correctValue: 'Today is Monday. The month is January.',
          displayValue: 'Reading: The Calendar in Class',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d6_e2',
          type: 'multiple-choice',
          instruction: 'Answer the question.',
          audioValue: 'What day is it?',
          options: ['Monday', 'Friday'],
          correctValue: 'Monday',
          acceptedQuestions: ['What day is it today?'],
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d6_e3',
          type: 'multiple-choice',
          instruction: 'Answer the question.',
          audioValue: 'What month is it?',
          options: ['January', 'March'],
          correctValue: 'January',
          acceptedQuestions: ['What month is it now?'],
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d6_e4',
          type: 'multiple-choice',
          instruction: 'Answer the question.',
          audioValue: 'What is the date?',
          options: ['January first', 'March first'],
          correctValue: 'January first',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d6_e5',
          type: 'identification',
          instruction: 'Choose the correct answer.',
          audioValue: 'When is Anna’s birthday?',
          options: ['In March', 'In January'],
          correctValue: 'In March',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d6_e6',
          type: 'identification',
          instruction: 'Choose the correct answer.',
          audioValue: 'When is Lucas’s birthday?',
          options: ['In July', 'In May'],
          correctValue: 'In July',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d6_e7',
          type: 'writing',
          instruction: 'Write the missing word.',
          audioValue: 'The students are happy.',
          correctValue: 'happy',
          displayValue: 'The students are ______.',
          isNewVocab: false
        }
      ]
    },
    {
      id: 'wb1_l7_d7',
      type: 'review',
      exercises: [
        {
          id: 'wb1_l7_d7_e1',
          type: 'multiple-choice',
          instruction: 'Choose the day.',
          audioValue: 'Wednesday',
          options: ['Wednesday', 'April'],
          correctValue: 'Wednesday',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d7_e2',
          type: 'multiple-choice',
          instruction: 'Choose the month.',
          audioValue: 'September',
          options: ['September', 'Saturday'],
          correctValue: 'September',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d7_e3',
          type: 'identification',
          instruction: 'Choose the correct answer.',
          audioValue: 'What day is it today?',
          options: ['It is Thursday.', 'It is August.'],
          correctValue: 'It is Thursday.',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d7_e4',
          type: 'identification',
          instruction: 'Choose the correct answer.',
          audioValue: 'What month is it?',
          options: ['It is November.', 'It is Tuesday.'],
          correctValue: 'It is November.',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d7_e5',
          type: 'writing',
          instruction: 'Complete with any day of the week.',
          audioValue: 'Today is Friday.',
          correctValue: 'Friday',
          acceptedAnswers: ANY_DAY_ANSWERS,
          audioValueBeforeAnswer: 'Complete with any day of the week.',
          displayValue: 'Today is ______.',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d7_e6',
          type: 'writing',
          instruction: 'Complete with any month of the year.',
          audioValue: 'It is December.',
          correctValue: 'December',
          acceptedAnswers: ANY_MONTH_ANSWERS,
          audioValueBeforeAnswer: 'Complete with any month of the year.',
          displayValue: 'It is ______.',
          isNewVocab: false
        },
        {
          id: 'wb1_l7_d7_e7',
          type: 'speaking',
          instruction: 'Final speaking review.',
          audioValue: 'What day is it today? It is Monday. What month is it? It is January. What is the date? It is January first.',
          correctValue: 'What day is it today? It is Monday. What month is it? It is January. What is the date? It is January first.',
          displayValue: 'What day is it today? / It is Monday. / What month is it? / It is January. / What is the date? / It is January first.',
          isNewVocab: false
        }
      ]
    }
  ]
};
