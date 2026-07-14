import { buildLesson, choice, choiceDrill, DrillRow, speak, speakingDrill, write, writingDrill } from './lessonBuilder';

const timeExamples: DrillRow[] = [
  { prompt: 'January', answer: 'in January' }, { prompt: 'March', answer: 'in March' }, { prompt: 'summer', answer: 'in summer' },
  { prompt: 'winter', answer: 'in winter' }, { prompt: 'the year 2026', answer: 'in 2026' }, { prompt: 'Monday', answer: 'on Monday' },
  { prompt: 'April eighth', answer: 'on April eighth' }, { prompt: 'my birthday', answer: 'on my birthday' },
  { prompt: "seven o'clock", answer: "at seven o'clock" }, { prompt: 'noon', answer: 'at noon' }, { prompt: 'night', answer: 'at night' },
  { prompt: 'Friday morning', answer: 'on Friday morning' }, { prompt: 'September third', answer: 'on September third' },
  { prompt: 'the afternoon', answer: 'in the afternoon' }, { prompt: 'midnight', answer: 'at midnight' },
];

const grammar: DrillRow[] = timeExamples.map((row) => ({ prompt: row.answer, display: row.answer.replace(/^(in|on|at)/, '____'), answer: row.answer.split(' ')[0] }));

const questions: DrillRow[] = [
  { prompt: 'When is the English class?', answer: "It's on Monday at nine o'clock." }, { prompt: 'When is your birthday?', answer: 'It is in July.' },
  { prompt: 'What is your favorite season?', answer: 'My favorite season is summer.' }, { prompt: 'When is the school trip?', answer: 'It is on April eighth.' },
  { prompt: 'When is lunch?', answer: 'It is at noon.' }, { prompt: 'When do you read?', answer: 'I read at night.' },
  { prompt: 'What season follows spring?', answer: 'Summer follows spring.' }, { prompt: 'What season follows fall?', answer: 'Winter follows fall.' },
  { prompt: 'What months are in Northern Hemisphere spring?', answer: 'March, April, and May.' }, { prompt: 'What months are in Northern Hemisphere winter?', answer: 'December, January, and February.' },
  { prompt: 'Is your class in Monday?', answer: 'No. It is on Monday.' }, { prompt: 'Is the party at July?', answer: 'No. It is in July.' },
  { prompt: 'Is dinner on seven o’clock?', answer: "No. It is at seven o'clock." }, { prompt: 'What is the date?', answer: 'It is October second.' },
  { prompt: 'When is the meeting?', answer: 'It is on Friday morning.' },
];

const speakingRows: DrillRow[] = [
  { prompt: 'January', answer: 'My birthday is in January.' }, { prompt: 'summer', answer: 'I like summer.' },
  { prompt: 'winter', answer: 'Winter is cold in this Northern Hemisphere example.' }, { prompt: 'Monday', answer: 'My English class is on Monday.' },
  { prompt: 'April eighth', answer: 'The trip is on April eighth.' }, { prompt: "seven o'clock", answer: "Class starts at seven o'clock." },
  { prompt: 'noon', answer: 'We have lunch at noon.' }, { prompt: 'night', answer: 'I read at night.' },
  { prompt: 'birthday question', answer: 'When is your birthday?' }, { prompt: 'season question', answer: 'What is your favorite season?' },
  { prompt: 'date question', answer: 'What is the date?' }, { prompt: 'class question', answer: 'When is the English class?' },
  { prompt: 'negative correction', answer: "The trip isn't in May. It's in June." }, { prompt: 'contracted time', answer: "It's on Tuesday at nine." },
  { prompt: 'personal schedule', answer: "My birthday is in July, and my class is on Monday at nine o'clock." },
];

const reading = `The Learnendo class makes a calendar for 2026. The examples use seasons in the Northern Hemisphere. Spring is in March, April, and May. The class picnic is on April eighth at noon. Summer is in June, July, and August, and Maya’s birthday is on July twelfth. Fall, or autumn, is in September, October, and November. A school festival is on October second at seven o’clock. Winter is in December, January, and February. Ben likes to read at night in winter. The students know that seasons occur in different months in the Southern Hemisphere, so these month groups are not universal. Their calendar shows months, dates, seasons, and exact times clearly.`;

const rq: DrillRow[] = [
  { prompt: 'What year is on the calendar?', answer: '2026.' }, { prompt: 'Which hemisphere is used for the examples?', answer: 'The Northern Hemisphere.' },
  { prompt: 'Which months are in spring?', answer: 'March, April, and May.' }, { prompt: 'When is the class picnic?', answer: 'On April eighth at noon.' },
  { prompt: 'Which months are in summer?', answer: 'June, July, and August.' }, { prompt: 'When is Maya’s birthday?', answer: 'On July twelfth.' },
  { prompt: 'What is another word for fall?', answer: 'Autumn.' }, { prompt: 'Which months are in fall?', answer: 'September, October, and November.' },
  { prompt: 'When is the school festival?', answer: "On October second at seven o'clock." }, { prompt: 'Which months are in winter?', answer: 'December, January, and February.' },
  { prompt: 'When does Ben read?', answer: 'At night in winter.' }, { prompt: 'Are the season months universal?', answer: 'No, they are not.' },
  { prompt: 'Where can seasons use different months?', answer: 'In the Southern Hemisphere.' }, { prompt: 'What does the calendar show?', answer: 'Months, dates, seasons, and exact times.' },
];

export const lesson10 = buildLesson(10, 'Lesson 10: Months & Seasons', [
  { exercises: choiceDrill(timeExamples, 'Choose the correct time expression.', 'identification') },
  { exercises: writingDrill(grammar, 'Complete with in, on, or at.') },
  { exercises: choiceDrill(questions, 'Choose the answer that matches the question.') },
  { exercises: [
    speak("Maya: When is your birthday? Ben: It's on January fifteenth. Maya: Is it in winter? Ben: In this Northern Hemisphere example, yes, it is.", [], { instruction: 'Listen to Dialogue 1 and repeat.', displayValue: "Dialogue 1 — A birthday\nMaya: When is your birthday?\nBen: It's on January fifteenth.\nMaya: Is it in winter?\nBen: In this Northern Hemisphere example, yes, it is." }),
    speak("Teacher: When is our trip? Leo: It's on April eighth. Teacher: What time? Leo: At seven o'clock. Maya: That's in spring in our Northern Hemisphere calendar.", [], { instruction: 'Listen to Dialogue 2 and repeat.', displayValue: "Dialogue 2 — A class trip\nTeacher: When is our trip?\nLeo: It's on April eighth.\nTeacher: What time?\nLeo: At seven o'clock.\nMaya: That's in spring in our Northern Hemisphere calendar." }),
    choice('When is Ben’s birthday?', 'On January fifteenth.', ['In January fifteen.', 'At January fifteenth.', 'On winter.'], 0),
    choice('What season is used for January in Dialogue 1?', 'Winter.', ['Spring.', 'Summer.', 'Fall.'], 1),
    choice('When is the class trip?', 'On April eighth.', ['In April eighth.', 'At April eighth.', 'On April eight.'], 2),
    choice('What time is the trip?', "At seven o'clock.", ["On seven o'clock.", "In seven o'clock.", 'At seven date.'], 3),
    write("It's on April eighth.", 'on', "Complete: It's ____ April eighth."),
    write("It's at seven o'clock.", 'at', "Complete: It's ____ seven o'clock."),
    speak("It's in spring in this Northern Hemisphere example.", [], { instruction: 'Say the climate statement carefully.' }),
    choice('Why does Maya say “our Northern Hemisphere calendar”?', 'Season months depend on the hemisphere.', ['Every country has the same weather.', 'April is always cold.', 'There are no seasons elsewhere.'], 0),
  ] },
  { exercises: speakingDrill(speakingRows, 'Say the complete time expression or answer.') },
  { exercises: [speak(reading, [], { instruction: 'Listen to and read the complete text.', displayValue: `Reading — Our 2026 Calendar\n\n${reading}` }), ...choiceDrill(rq, 'Answer from the reading.')] },
  { type: 'review', exercises: [
    ...choiceDrill(timeExamples.slice(0, 8), 'Choose the correct time expression.'),
    write('The class is on Monday.', 'on', 'The class is ____ Monday.'), write('My birthday is in July.', 'in', 'My birthday is ____ July.'),
    write("Lunch is at noon.", 'at', 'Lunch is ____ noon.'),
    speak('When is your birthday? My birthday is in July.', [], { instruction: 'Ask and answer.' }),
    speak("When is class? It's on Monday at nine o'clock.", [], { instruction: 'Ask and answer.' }),
    speak("Spring is in March, April, and May in this Northern Hemisphere example.", [], { instruction: 'State the hemisphere clearly.' }),
    choice('Which sentence is correct?', 'The festival is on October second at seven.', ['The festival is in October second.', 'The festival is at October second.', 'The festival is on October at seven.'], 3),
  ] },
]);
