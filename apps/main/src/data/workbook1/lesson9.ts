import { buildLesson, choice, choiceDrill, DrillRow, speak, speakingDrill, write, writingDrill } from './lessonBuilder';

const responses: DrillRow[] = [
  { prompt: 'Hi! I’m Sofia.', answer: 'Hi, Sofia! I’m Ben.' }, { prompt: 'Nice to meet you.', answer: 'Nice to meet you too.' },
  { prompt: 'What’s your name?', answer: 'My name is Lucas.' }, { prompt: 'How old are you?', answer: 'I’m eleven years old.' },
  { prompt: 'Where are you from?', answer: 'I’m from Brazil.' }, { prompt: 'Are you a student?', answer: 'Yes, I am.' },
  { prompt: 'Is she your sister?', answer: 'No, she isn’t. She’s my friend.' }, { prompt: 'What day is it today?', answer: 'It’s Tuesday.' },
  { prompt: 'What’s the date?', answer: 'It’s May third.' }, { prompt: 'When is your birthday?', answer: 'My birthday is in July.' },
  { prompt: 'Could you spell your name?', answer: 'L-U-C-A-S.' }, { prompt: 'What’s your phone number?', answer: 'It’s 555-0182.' },
  { prompt: 'Is this information correct?', answer: 'No, it isn’t. I’m twelve.' }, { prompt: 'Please open your book.', answer: 'Okay, teacher.' },
  { prompt: 'Thank you for your help.', answer: 'You’re welcome.' },
];

const completions: DrillRow[] = [
  { prompt: 'Complete the greeting.', display: 'Hi, ______ Sofia.', answer: "I'm" }, { prompt: 'Complete the introduction.', display: 'My ______ is Lucas.', answer: 'name' },
  { prompt: 'Complete the age question.', display: 'How ______ are you?', answer: 'old' }, { prompt: 'Complete the country question.', display: 'Where are you ______?', answer: 'from' },
  { prompt: 'Complete the student question.', display: '______ you a student?', answer: 'Are' }, { prompt: 'Complete the friend question.', display: '______ she your friend?', answer: 'Is' },
  { prompt: 'Complete the correction.', display: "No, she ______. She's my friend.", answer: "isn't" }, { prompt: 'Complete the day question.', display: 'What ______ is it today?', answer: 'day' },
  { prompt: 'Complete the date question.', display: "What's the ______?", answer: 'date' }, { prompt: 'Complete the birthday question.', display: '______ is your birthday?', answer: 'When' },
  { prompt: 'Complete the spelling request.', display: 'Could you ______ your name?', answer: 'spell' }, { prompt: 'Complete the number question.', display: "What's your phone ______?", answer: 'number' },
  { prompt: 'Complete the confirmation.', display: 'Is this information ______?', answer: 'correct' }, { prompt: 'Complete the classroom request.', display: 'Please ______ your book.', answer: 'open' },
  { prompt: 'Complete the polite reply.', display: "You're ______.", answer: 'welcome' },
];

const speaking: DrillRow[] = [
  { prompt: 'Meet someone.', answer: "Hi, I'm Lucas. Nice to meet you." }, { prompt: 'Ask a name.', answer: "What's your name?" },
  { prompt: 'Give your name.', answer: 'My name is Lucas.' }, { prompt: 'Ask an age.', answer: 'How old are you?' },
  { prompt: 'Give an age.', answer: "I'm eleven years old." }, { prompt: 'Ask a country.', answer: 'Where are you from?' },
  { prompt: 'Give a country.', answer: "I'm from Brazil." }, { prompt: 'Confirm a student.', answer: 'Are you a student?' },
  { prompt: 'Correct a relationship.', answer: "No, she isn't. She's my friend." }, { prompt: 'Ask the day.', answer: 'What day is it today?' },
  { prompt: 'Ask a birthday.', answer: 'When is your birthday?' }, { prompt: 'Request spelling.', answer: 'Could you spell your name?' },
  { prompt: 'Spell a name.', answer: 'L-U-C-A-S.' }, { prompt: 'Exchange a phone number.', answer: "What's your phone number? It's 555-0182." },
  { prompt: 'Ask for repetition in class.', answer: "I don't understand. Could you repeat, please?" },
];

const reading = `On Tuesday, Sofia meets Ben at Learnendo School. “Hi, I’m Sofia,” she says. Ben introduces himself and asks where she is from. Sofia is from Chile, and she is twelve. Ben is not twelve; he is eleven. Sofia spells her last name, R-O-J-A-S, for the class list. Then Ben introduces his friend Maya. Maya is from Mexico, and her birthday is on August ninth. Sofia first thinks Maya is Ben’s sister. Ben corrects her: “No, she isn’t. She’s my friend.” Before class, the students compare phone numbers and confirm the date. It is September third. Their teacher arrives at nine o’clock, and everyone is ready.`;

const readingQuestions: DrillRow[] = [
  { prompt: 'When does Sofia meet Ben?', answer: 'On Tuesday.' }, { prompt: 'Where are they?', answer: 'At Learnendo School.' },
  { prompt: 'Where is Sofia from?', answer: 'She is from Chile.' }, { prompt: 'How old is Sofia?', answer: 'She is twelve.' },
  { prompt: 'How old is Ben?', answer: 'He is eleven.' }, { prompt: 'What last name does Sofia spell?', answer: 'R-O-J-A-S.' },
  { prompt: 'Who does Ben introduce?', answer: 'His friend Maya.' }, { prompt: 'Where is Maya from?', answer: 'She is from Mexico.' },
  { prompt: 'When is Maya’s birthday?', answer: 'On August ninth.' }, { prompt: 'Is Maya Ben’s sister?', answer: "No, she isn't." },
  { prompt: 'What do the students compare?', answer: 'Their phone numbers.' }, { prompt: 'What is the date?', answer: 'It is September third.' },
  { prompt: 'What time does the teacher arrive?', answer: "At nine o'clock." }, { prompt: 'Are the students ready?', answer: 'Yes, they are.' },
];

export const lesson9 = buildLesson(9, 'Lesson 9: Practical Speaking', [
  { exercises: choiceDrill(responses, 'Choose the natural response.', 'identification') },
  { exercises: writingDrill(completions, 'Complete the practical speaking pattern.') },
  { exercises: choiceDrill(responses.map((row) => ({ prompt: row.answer, answer: row.prompt })), 'Choose the question or first line that matches the response.') },
  { exercises: [
    speak("Sofia: Hi, I'm Sofia. What's your name? Ben: I'm Ben. Nice to meet you. Sofia: Nice to meet you too. Where are you from? Ben: I'm from Brazil.", [], { instruction: 'Listen to Dialogue 1 and repeat.', displayValue: "Dialogue 1 — Meeting someone\nSofia: Hi, I'm Sofia. What's your name?\nBen: I'm Ben. Nice to meet you.\nSofia: Nice to meet you too. Where are you from?\nBen: I'm from Brazil." }),
    speak("Teacher: Could you spell your name? Lucas: L-U-C-A-S. Teacher: Are you eleven? Lucas: No, I'm not. I'm twelve.", [], { instruction: 'Listen to Dialogue 2 and repeat.', displayValue: "Dialogue 2 — Classroom information\nTeacher: Could you spell your name?\nLucas: L-U-C-A-S.\nTeacher: Are you eleven?\nLucas: No, I'm not. I'm twelve." }),
    speak("Maya: Is she your sister? Ben: No, she isn't. She's my friend. Maya: What's her phone number? Ben: It's 555-0182.", [], { instruction: 'Listen to Dialogue 3 and repeat.', displayValue: "Dialogue 3 — Confirming information\nMaya: Is she your sister?\nBen: No, she isn't. She's my friend.\nMaya: What's her phone number?\nBen: It's 555-0182." }),
    choice('Where is Ben from?', 'He is from Brazil.', ['He is from Mexico.', 'He is twelve.', 'He is a teacher.'], 3, { instruction: 'Answer from Dialogue 1.' }),
    choice('How old is Lucas?', 'He is twelve.', ['He is eleven.', 'He is ten.', 'He is thirteen.'], 0, { instruction: 'Answer from Dialogue 2.' }),
    choice('Is the girl Ben’s sister?', "No, she isn't.", ['Yes, she is.', 'No, he is not.', 'Yes, they are.'], 1, { instruction: 'Answer from Dialogue 3.' }),
    write('L-U-C-A-S.', 'L-U-C-A-S.', 'Write the spelling from Dialogue 2.'),
    write("No, she isn't. She's my friend.", "No, she isn't. She's my friend.", 'Write Ben’s complete correction.', ['No, she is not. She is my friend.']),
    choice('Which line naturally follows “Nice to meet you”?', 'Nice to meet you too.', ['I am eleven.', 'It is Tuesday.', 'Open your book.'], 2),
    speak("What's your phone number? It's 555-0182.", [], { instruction: 'Practice the number exchange.' }),
  ] },
  { exercises: speakingDrill(speaking, 'Use the prompt to say the complete line naturally.') },
  { exercises: [
    speak(reading, [], { instruction: 'Listen to and read the complete interaction.', displayValue: `Reading — A New Classmate\n\n${reading}` }),
    ...choiceDrill(readingQuestions, 'Answer from the reading.'),
  ] },
  { type: 'review', exercises: [
    ...choiceDrill(responses.slice(0, 8), 'Choose the natural response.'),
    write('When is your birthday?', 'My birthday is in July.', 'Write a complete model answer.', ['It is in July.']),
    write('Could you spell your name?', 'L-U-C-A-S.', 'Write the spelling response.'),
    write('Is she your sister?', "No, she isn't. She's my friend.", 'Write a correction.', ['No, she is not. She is my friend.']),
    speak("Hi, I'm Lucas. I'm eleven, and I'm from Brazil.", [], { instruction: 'Give a complete introduction.' }),
    speak("What day is it today? It's Tuesday.", ['What day is it today? It is Tuesday.'], { instruction: 'Ask and answer.' }),
    speak("When is your birthday? My birthday is in July.", [], { instruction: 'Ask and answer.' }),
    speak("Could you spell your name? L-U-C-A-S.", [], { instruction: 'Ask and answer.' }),
  ] },
]);
