// ============================================================
// LESSON 3 – Daily Routines and Activities
// 8 Islands (Vocabulary, Listening, Audio Match, Sound Comparison, 
// Reading, Check Reading, Speaking, Mastery)
// ============================================================

// Add this AFTER the L2_TRACKS definition, before PRACTICE_ITEMS

const L3_TRACKS = [
  // Island 1: Vocabulary (Daily Routines) - 20 items
  // New words highlighted in blue + translations below every sentence
  ...createItems(3, 1, [
    // Sentence format: Full sentence in English with translation
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
  // Male voice: Daniel, Tom, Mark; Female voice: Sarah, Lisa, Emma
  ...createItems(3, 2, [
    { type: 'identification', instruction: 'Listen: Daniel wakes up at 7 AM. What time does he wake up?', audioValue: 'Daniel wakes up at seven o\'clock.', options: ['6 AM', '7 AM', '8 AM', '9 AM'], correctValue: '7 AM', isNewVocab: true },
    { type: 'identification', instruction: 'Listen: Sarah takes a shower after waking up. What does Sarah do?', audioValue: 'Sarah takes a shower after waking up.', options: ['wake up', 'eat', 'take a shower', 'study'], correctValue: 'take a shower', isNewVocab: true },
    { type: 'identification', instruction: 'Listen: Tom eats breakfast at 7:30. When does he eat?', audioValue: 'Tom eats breakfast at seven thirty.', options: ['7 AM', '7:15', '7:30', '8 AM'], correctValue: '7:30', isNewVocab: true },
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
    { type: 'multiple-choice', instruction: 'Are they the same or different? "wake up" vs "wake up"', audioValue: 'wake up wake up', options: ['same', 'different'], correctValue: 'same', isNewVocab: true },
    { type: 'multiple-choice', instruction: 'Are they the same or different? "shower" vs "water"', audioValue: 'shower water', options: ['same', 'different'], correctValue: 'different' },
    { type: 'multiple-choice', instruction: 'Are they the same or different? "breakfast" vs "breakfast"', audioValue: 'breakfast breakfast', options: ['same', 'different'], correctValue: 'same' },
    { type: 'multiple-choice', instruction: 'Are they the same or different? "study" vs "play"', audioValue: 'study play', options: ['same', 'different'], correctValue: 'different' },
    { type: 'multiple-choice', instruction: 'Are they the same or different? "lunch" vs "lunch"', audioValue: 'lunch lunch', options: ['same', 'different'], correctValue: 'same' },
    { type: 'multiple-choice', instruction: 'Are they the same or different? "walk" vs "talk"', audioValue: 'walk talk', options: ['same', 'different'], correctValue: 'different' },
    { type: 'multiple-choice', instruction: 'Are they the same or different? "dinner" vs "dinner"', audioValue: 'dinner dinner', options: ['same', 'different'], correctValue: 'same' },
    { type: 'multiple-choice', instruction: 'Are they the same or different? "television" vs "radio"', audioValue: 'television radio', options: ['same', 'different'], correctValue: 'different' },
    { type: 'multiple-choice', instruction: 'Are they the same or different? "homework" vs "homework"', audioValue: 'homework homework', options: ['same', 'different'], correctValue: 'same' },
    { type: 'multiple-choice', instruction: 'Are they the same or different? "bed" vs "desk"', audioValue: 'bed desk', options: ['same', 'different'], correctValue: 'different' }
  ]),

  // Island 5: Reading (Workbook Text with Translations) - 15 items
  // Full sentences with translations below
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
  // User hears question → speaks answer (compared with correct answer)
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
  // Mixed types: identification, writing, speaking, multiple-choice
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

// Add L3_TRACKS to PRACTICE_ITEMS array (must be done correctly in the main file)
// REPLACE: export const PRACTICE_ITEMS: PracticeItem[] = [ ...L1_TRACKS, ...L2_TRACKS ];
// WITH:    export const PRACTICE_ITEMS: PracticeItem[] = [ ...L1_TRACKS, ...L2_TRACKS, ...L3_TRACKS ];

// ============================================================
// UPDATE MODULE_NAMES to add Lesson 3 entries
// ============================================================

// Add these entries to MODULE_NAMES:
export const L3_MODULE_NAMES = {
  'L3_I1': 'Daily Routine Vocabulary',
  'L3_I2': 'Listening Comprehension',
  'L3_I3': 'Audio Matching',
  'L3_I4': 'Sound Comparison',
  'L3_I5': 'Reading Comprehension',
  'L3_I6': 'Speaking Check',
  'L3_I7': 'Speaking Practice',
  'L3_I8': 'Final Mastery'
};

// Add these entries to MODULE_ICONS:
export const L3_MODULE_ICONS = {
  'L3_I1': 'fa-list-check',
  'L3_I2': 'fa-ear-listen',
  'L3_I3': 'fa-link',
  'L3_I4': 'fa-equals',
  'L3_I5': 'fa-book-open',
  'L3_I6': 'fa-microphone',
  'L3_I7': 'fa-volume-up',
  'L3_I8': 'fa-trophy'
};

// Add these entries to GRAMMAR_GUIDES:
export const L3_GRAMMAR_GUIDES = {
  'L3_I1': [
    'Daily routine verbs: wake up, shower, eat, study, play, sleep.',
    'Tell time: at 7 o\'clock, at 7:30, in the morning, in the afternoon.',
    'Prepositions: at (time), to (destination), after, before.'
  ],
  'L3_I2': [
    'Listening for specific details: time, activity, person.',
    'Understand longer sentences and natural speech.'
  ],
  'L3_I3': [
    'Match spoken words with written options.',
    'Speed recognition: identify words in context.'
  ],
  'L3_I4': [
    'Minimal pairs: words with similar sounds.',
    'Develop listening discrimination skills.'
  ],
  'L3_I5': [
    'Read full sentences about daily routines.',
    'Understand sequence of events and time expressions.'
  ],
  'L3_I6': [
    'Comprehend spoken questions about the text.',
    'Answer with complete sentences spoken aloud.'
  ],
  'L3_I7': [
    'Create personal daily routine sentences.',
    'Fluency practice with natural intonation.'
  ],
  'L3_I8': [
    'Review all Lesson 3 skills: vocabulary, listening, speaking.',
    'Apply routine language in new contexts.'
  ]
};

// ============================================================
// UPDATE LESSON_CONFIGS
// ============================================================

// Current LESSON_CONFIGS generates 7 modules per lesson.
// For Lesson 3, we need 8 modules.
// Replace the LESSON_CONFIGS export with:

export const LESSON_CONFIGS_UPDATED = [
  {
    id: 1,
    title: "The Alphabet and Numbers",
    modules: ["L1_I1", "L1_I2", "L1_I3", "L1_I4", "L1_I5", "L1_I6", "L1_I7"]
  },
  {
    id: 2,
    title: "The Five Vowels",
    modules: ["L2_I1", "L2_I2", "L2_I3", "L2_I4", "L2_I5", "L2_I6", "L2_I7"]
  },
  {
    id: 3,
    title: "Daily Routines and Activities",
    modules: ["L3_I1", "L3_I2", "L3_I3", "L3_I4", "L3_I5", "L3_I6", "L3_I7", "L3_I8"]
  },
  ...Array.from({ length: 9 }, (_, i) => ({
    id: i + 4,
    title: `Lesson ${i + 4}`,
    modules: Array.from({ length: 7 }, (_, j) => `L${i+4}_I${j+1}`)
  }))
];

// ============================================================
// IMPLEMENTATION STEPS
// ============================================================

// 1. Copy the L3_TRACKS array above and paste it AFTER L2_TRACKS in constants.tsx
//    (Keep it indented properly as constant definition)

// 2. Replace the PRACTICE_ITEMS export with:
//    export const PRACTICE_ITEMS: PracticeItem[] = [
//      ...L1_TRACKS, ...L2_TRACKS, ...L3_TRACKS
//    ];

// 3. Update MODULE_NAMES export by adding all L3_MODULE_NAMES entries

// 4. Update MODULE_ICONS export by adding all L3_MODULE_ICONS entries

// 5. Update GRAMMAR_GUIDES export by adding all L3_GRAMMAR_GUIDES entries

// 6. Replace LESSON_CONFIGS export with LESSON_CONFIGS_UPDATED (or modify
//    the logic to handle 8 modules for lesson 3)

// 7. Run npm run lint to check for TypeScript errors

// 8. In both apps/main and apps/wbk-5, apply the same changes to keep them in sync
