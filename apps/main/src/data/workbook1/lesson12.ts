import { buildLesson, choice, choiceDrill, DrillRow, speak, speakingDrill, write, writingDrill } from './lessonBuilder';

const pastForms: DrillRow[] = [
  { prompt: 'work', answer: 'worked' }, { prompt: 'talk', answer: 'talked' }, { prompt: 'ask', answer: 'asked' },
  { prompt: 'help', answer: 'helped' }, { prompt: 'play', answer: 'played' }, { prompt: 'call', answer: 'called' },
  { prompt: 'open', answer: 'opened' }, { prompt: 'learn', answer: 'learned' }, { prompt: 'want', answer: 'wanted' },
  { prompt: 'need', answer: 'needed' }, { prompt: 'start', answer: 'started' }, { prompt: 'visit', answer: 'visited' },
  { prompt: 'watch', answer: 'watched' }, { prompt: 'clean', answer: 'cleaned' }, { prompt: 'listen', answer: 'listened' },
];

const spelling: DrillRow[] = pastForms.map((row) => ({ prompt: row.prompt, display: `${row.prompt} → ______`, answer: row.answer }));

const sounds: DrillRow[] = [
  { prompt: 'worked', answer: '/t/' }, { prompt: 'talked', answer: '/t/' }, { prompt: 'asked', answer: '/t/' },
  { prompt: 'helped', answer: '/t/' }, { prompt: 'watched', answer: '/t/' }, { prompt: 'played', answer: '/d/' },
  { prompt: 'called', answer: '/d/' }, { prompt: 'opened', answer: '/d/' }, { prompt: 'learned', answer: '/d/' },
  { prompt: 'cleaned', answer: '/d/' }, { prompt: 'listened', answer: '/d/' }, { prompt: 'wanted', answer: '/ɪd/' },
  { prompt: 'needed', answer: '/ɪd/' }, { prompt: 'started', answer: '/ɪd/' }, { prompt: 'visited', answer: '/ɪd/' },
];

const speakingRows: DrillRow[] = [
  { prompt: '/t/: work', answer: 'I worked yesterday.' }, { prompt: '/t/: talk', answer: 'We talked after class.' },
  { prompt: '/t/: ask', answer: 'She asked a question.' }, { prompt: '/t/: help', answer: 'He helped the teacher.' },
  { prompt: '/t/: watch', answer: 'They watched a class video.' }, { prompt: '/d/: play', answer: 'I played a number game.' },
  { prompt: '/d/: call', answer: 'She called her friend.' }, { prompt: '/d/: open', answer: 'We opened our books.' },
  { prompt: '/d/: learn', answer: 'They learned the months.' }, { prompt: '/d/: clean', answer: 'He cleaned his desk.' },
  { prompt: '/d/: listen', answer: 'I listened to the dialogue.' }, { prompt: '/ɪd/: want', answer: 'Maya wanted a new book.' },
  { prompt: '/ɪd/: need', answer: 'Ben needed help.' }, { prompt: '/ɪd/: start', answer: 'Class started at nine.' },
  { prompt: '/ɪd/: visit', answer: 'We visited the school library.' },
];

const reading = `Yesterday was Monday, September third. The Learnendo students started class at nine o’clock. Ms. Green opened the lesson and asked a question about birthdays. Maya answered first and spelled her name. Ben wanted to practice numbers, so the class played a short number game. Leo talked about the seasons and helped a new student with the calendar. At noon, everyone visited the school library. They looked at books, listened to a short story, and learned new words. After class, Maya called her friend and talked about the good day. The students practiced many regular past verbs. They noticed that the written ending was always -ed in these examples, but its sound was /t/, /d/, or /ɪd/.`;

const rq: DrillRow[] = [
  { prompt: 'What day was yesterday?', answer: 'It was Monday.' }, { prompt: 'What was the date?', answer: 'It was September third.' },
  { prompt: 'What time did class start?', answer: "It started at nine o'clock." }, { prompt: 'Who opened the lesson?', answer: 'Ms. Green.' },
  { prompt: 'What did Ms. Green ask about?', answer: 'Birthdays.' }, { prompt: 'Who answered first?', answer: 'Maya.' },
  { prompt: 'What did Ben want to practice?', answer: 'Numbers.' }, { prompt: 'What game did the class play?', answer: 'A short number game.' },
  { prompt: 'Who helped a new student?', answer: 'Leo.' }, { prompt: 'Where did everyone visit?', answer: 'The school library.' },
  { prompt: 'What did they listen to?', answer: 'A short story.' }, { prompt: 'Who called her friend?', answer: 'Maya.' },
  { prompt: 'What ending did the students see?', answer: '-ed.' }, { prompt: 'What three sounds did they notice?', answer: '/t/, /d/, and /ɪd/.' },
];

export const lesson12 = buildLesson(12, 'Lesson 12: Past Tense Regular Verbs', [
  { exercises: pastForms.map((row, index) => choice(row.prompt, row.answer, [`${row.prompt}s`, `${row.prompt}ing`, `${row.prompt}en`], index % 4, { type: 'identification', instruction: 'Choose the regular past form.', isNewVocab: true })) },
  { exercises: writingDrill(spelling, 'Write the regular past form with -ed.') },
  { exercises: sounds.map((row, index) => choice(row.prompt, row.answer, ['/t/', '/d/', '/ɪd/', 'silent'].filter((sound) => sound !== row.answer), index % 4, { instruction: 'Listen to the whole word and choose the sound of -ed.', audioValueBeforeAnswer: row.prompt, fullSentenceAfterAnswer: `${row.prompt}: the -ed ending is pronounced ${row.answer}` })) },
  { exercises: [
    speak("Teacher: What did you do yesterday? Ben: I played a number game and helped Leo. Teacher: Did class start at nine? Ben: Yes. It started at nine.", [], { instruction: 'Listen to Dialogue 1 and repeat.', displayValue: "Dialogue 1 — Yesterday in class\nTeacher: What did you do yesterday?\nBen: I played a number game and helped Leo.\nTeacher: Did class start at nine?\nBen: Yes. It started at nine." }),
    speak("Maya: I visited the library yesterday. Leo: What did you do there? Maya: I looked at books and listened to a story. Leo: I called my friend after class.", [], { instruction: 'Listen to Dialogue 2 and repeat.', displayValue: "Dialogue 2 — After class\nMaya: I visited the library yesterday.\nLeo: What did you do there?\nMaya: I looked at books and listened to a story.\nLeo: I called my friend after class." }),
    choice('What did Ben play?', 'A number game.', ['A phone game.', 'A birthday song.', 'A season video.'], 0),
    choice('Who did Ben help?', 'Leo.', ['Maya.', 'Ms. Green.', 'His sister.'], 1),
    choice('What time did class start?', 'At nine.', ['At noon.', 'At seven.', 'At ten.'], 2),
    choice('Where did Maya go?', 'To the library.', ['To the park.', 'To Mexico.', 'To a party.'], 3),
    choice('What did Maya listen to?', 'A story.', ['A phone number.', 'A birthday date.', 'A teacher’s name.'], 0),
    write('played', 'played', 'Complete: Ben ______ a number game.'),
    write('visited', 'visited', 'Complete: Maya ______ the library.'),
    speak('I looked at books and listened to a story.', [], { instruction: 'Repeat the two /t/ and /d/ past forms.' }),
  ] },
  { exercises: speakingDrill(speakingRows, 'Say the sentence and focus on the final -ed sound.') },
  { exercises: [speak(reading, [], { instruction: 'Listen to and read the complete text.', displayValue: `Reading — Yesterday at Learnendo\n\n${reading}` }), ...choiceDrill(rq, 'Answer from the reading.')] },
  { type: 'review', exercises: [
    ...sounds.slice(0, 8).map((row, index) => choice(row.prompt, row.answer, ['/t/', '/d/', '/ɪd/', 'silent'].filter((sound) => sound !== row.answer), index % 4, { instruction: 'Choose the sound of -ed.' })),
    write('help', 'helped', 'help → ______'), write('play', 'played', 'play → ______'), write('want', 'wanted', 'want → ______'),
    speak('I worked yesterday.', [], { instruction: 'Say the /t/ ending clearly.' }),
    speak('I played a number game.', [], { instruction: 'Say the /d/ ending clearly.' }),
    speak('Class started at nine.', [], { instruction: 'Say the /ɪd/ ending clearly.' }),
    speak('Yesterday, I visited the library, looked at books, and listened to a story.', [], { instruction: 'Complete the final guided account.' }),
  ] },
]);
