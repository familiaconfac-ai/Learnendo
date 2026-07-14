import { buildLesson, choice, choiceDrill, DrillRow, speak, speakingDrill, write, writingDrill } from './lessonBuilder';

const questionWords: DrillRow[] = [
  { prompt: '___ is your name?', answer: 'What' }, { prompt: '___ is he?', answer: 'Who' }, { prompt: '___ is she?', answer: 'Who' },
  { prompt: '___ are you from?', answer: 'Where' }, { prompt: '___ is the teacher?', answer: 'Where' }, { prompt: '___ is your birthday?', answer: 'When' },
  { prompt: '___ day is it today?', answer: 'What' }, { prompt: '___ month is it?', answer: 'What' }, { prompt: '___ is the date?', answer: 'What' },
  { prompt: '___ old are you?', answer: 'How' }, { prompt: '___ old is she?', answer: 'How' }, { prompt: '___ is your class?', answer: 'When' },
  { prompt: '___ is from Mexico?', answer: 'Who' }, { prompt: '___ are the students?', answer: 'Where' }, { prompt: '___ season is it?', answer: 'What' },
];

const ordered: DrillRow[] = [
  { prompt: 'name / your / what / is', answer: 'What is your name?' }, { prompt: 'he / who / is', answer: 'Who is he?' },
  { prompt: 'she / who / is', answer: 'Who is she?' }, { prompt: 'from / where / you / are', answer: 'Where are you from?' },
  { prompt: 'teacher / where / the / is', answer: 'Where is the teacher?' }, { prompt: 'birthday / when / your / is', answer: 'When is your birthday?' },
  { prompt: 'today / day / what / it / is', answer: 'What day is it today?' }, { prompt: 'month / what / it / is', answer: 'What month is it?' },
  { prompt: 'date / the / what / is', answer: 'What is the date?' }, { prompt: 'you / how old / are', answer: 'How old are you?' },
  { prompt: 'she / how old / is', answer: 'How old is she?' }, { prompt: 'class / when / the / is', answer: 'When is the class?' },
  { prompt: 'Mexico / who / from / is', answer: 'Who is from Mexico?' }, { prompt: 'students / where / the / are', answer: 'Where are the students?' },
  { prompt: 'season / what / it / is', answer: 'What season is it?' },
];

const qa: DrillRow[] = [
  { prompt: 'What is your name?', answer: 'My name is Maya.' }, { prompt: 'Who is he?', answer: 'He is Leo.' },
  { prompt: 'Who is she?', answer: 'She is my teacher.' }, { prompt: 'Where are you from?', answer: 'I am from Brazil.' },
  { prompt: 'Where is the teacher?', answer: 'She is in the classroom.' }, { prompt: 'When is your birthday?', answer: 'It is in July.' },
  { prompt: 'What day is it today?', answer: 'It is Monday.' }, { prompt: 'What month is it?', answer: 'It is September.' },
  { prompt: 'What is the date?', answer: 'It is September third.' }, { prompt: 'How old are you?', answer: 'I am eleven.' },
  { prompt: 'How old is she?', answer: 'She is twelve.' }, { prompt: 'When is the class?', answer: "It is at nine o'clock." },
  { prompt: 'Who is from Mexico?', answer: 'Maya is from Mexico.' }, { prompt: 'Where are the students?', answer: 'They are at school.' },
  { prompt: 'What season is it?', answer: 'It is spring in this example.' },
];

const speakingRows: DrillRow[] = qa.map((row) => ({ prompt: row.prompt, answer: `${row.prompt} ${row.answer}`, accepted: [row.answer] }));

const reading = `Ms. Green welcomes a new student to the Monday class. His name is Amir, and he is eleven. Maya asks, “Where are you from?” Amir says he is from Egypt. Leo asks, “When is your birthday?” Amir’s birthday is on December second. The students look at the class calendar. It is September third, and their next school event is on October tenth at noon. Amir points to Ms. Green and asks, “Who is she?” Maya answers, “She’s our English teacher.” Then Amir asks where his book is. It is on his desk. At the end, Ms. Green asks, “What questions can you ask now?” The students use what, who, where, when, and how old to learn about their new classmate.`;

const rq: DrillRow[] = [
  { prompt: 'Who welcomes the new student?', answer: 'Ms. Green.' }, { prompt: 'What is the new student’s name?', answer: 'His name is Amir.' },
  { prompt: 'How old is Amir?', answer: 'He is eleven.' }, { prompt: 'Where is Amir from?', answer: 'He is from Egypt.' },
  { prompt: 'When is Amir’s birthday?', answer: 'It is on December second.' }, { prompt: 'What day is the class?', answer: 'Monday.' },
  { prompt: 'What is the date?', answer: 'It is September third.' }, { prompt: 'When is the next school event?', answer: 'It is on October tenth at noon.' },
  { prompt: 'Who is Ms. Green?', answer: 'She is their English teacher.' }, { prompt: 'Where is Amir’s book?', answer: 'It is on his desk.' },
  { prompt: 'Who asks where the book is?', answer: 'Amir.' }, { prompt: 'What does Ms. Green ask at the end?', answer: 'What questions can you ask now?' },
  { prompt: 'Which question word asks about a person?', answer: 'Who.' }, { prompt: 'Which expression asks about age?', answer: 'How old.' },
];

export const lesson11 = buildLesson(11, 'Lesson 11: Asking Questions', [
  { exercises: questionWords.map((row, index) => choice(row.prompt, row.answer, ['What', 'Who', 'Where', 'When', 'How'].filter((word) => word !== row.answer).slice(index % 2, index % 2 + 3), index % 4, { type: 'identification', instruction: 'Choose the question word.' })) },
  { exercises: writingDrill(ordered, 'Put the words in order and write the complete question.') },
  { exercises: choiceDrill(qa, 'Choose the answer that matches the WH-question.') },
  { exercises: [
    speak("Maya: What's your name? Amir: My name is Amir. Maya: Where are you from? Amir: I'm from Egypt. Maya: How old are you? Amir: I'm eleven.", [], { instruction: 'Listen to Dialogue 1 and repeat.', displayValue: "Dialogue 1 — A new student\nMaya: What's your name?\nAmir: My name is Amir.\nMaya: Where are you from?\nAmir: I'm from Egypt.\nMaya: How old are you?\nAmir: I'm eleven." }),
    speak("Amir: Who is she? Leo: She's Ms. Green. Amir: Where is she? Leo: She's in the classroom. Amir: When is English class? Leo: It's on Monday at nine.", [], { instruction: 'Listen to Dialogue 2 and repeat.', displayValue: "Dialogue 2 — People, place, and time\nAmir: Who is she?\nLeo: She's Ms. Green.\nAmir: Where is she?\nLeo: She's in the classroom.\nAmir: When is English class?\nLeo: It's on Monday at nine." }),
    choice('What is the new student’s name?', 'His name is Amir.', ['He is eleven.', 'He is from Egypt.', 'He is in class.'], 0),
    choice('Where is Amir from?', 'He is from Egypt.', ['He is from Brazil.', 'He is eleven.', 'He is a teacher.'], 1),
    choice('How old is Amir?', 'He is eleven.', ['He is Amir.', 'He is from Egypt.', 'He is in class.'], 2),
    choice('Who is Ms. Green?', 'She is the teacher.', ['She is Amir.', 'She is eleven.', 'She is Monday.'], 3),
    choice('Where is Ms. Green?', 'She is in the classroom.', ['She is on Monday.', 'She is eleven.', 'She is from Egypt.'], 0),
    choice('When is English class?', 'It is on Monday at nine.', ['It is Ms. Green.', 'It is in the classroom.', 'It is eleven.'], 1),
    write('Where are you from?', 'Where are you from?', 'Correct the order: Where / from / are / you'),
    speak('Who is she? She is Ms. Green.', ["Who is she? She's Ms. Green."], { instruction: 'Ask and answer naturally.' }),
  ] },
  { exercises: speakingDrill(speakingRows, 'Ask the WH-question and give the complete answer.') },
  { exercises: [speak(reading, [], { instruction: 'Listen to and read the complete text.', displayValue: `Reading — Questions for Amir\n\n${reading}` }), ...choiceDrill(rq, 'Answer from the reading.')] },
  { type: 'review', exercises: [
    ...choiceDrill(qa.slice(0, 8), 'Choose the answer that matches the question.'),
    write('What is your name?', 'What is your name?', 'Correct: your / what / name / is'),
    write('Where are you from?', 'Where are you from?', 'Correct: are / from / where / you'),
    write('When is your birthday?', 'When is your birthday?', 'Correct: birthday / when / your / is'),
    speak('Who is she? She is my teacher.', ["Who is she? She's my teacher."], { instruction: 'Ask and answer.' }),
    speak('What is the date? It is September third.', ["What's the date? It's September third."], { instruction: 'Ask and answer.' }),
    speak('How old are you? I am eleven.', ["How old are you? I'm eleven."], { instruction: 'Ask and answer.' }),
    speak('Where is the class? It is at Learnendo School.', ["Where's the class? It's at Learnendo School."], { instruction: 'Complete the cumulative review.' }),
  ] },
]);
