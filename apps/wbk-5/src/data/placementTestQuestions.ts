export interface PlacementQuestion {
  id: string;
  part: number; // 1-4
  levelBand: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  type: 'multiple-choice' | 'listening' | 'reading' | 'vocabulary';
  prompt: string;
  audioText?: string; // Text to be read aloud for listening questions
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
}

export const PLACEMENT_TEST_QUESTIONS: PlacementQuestion[] = [
  // === PART 1: FOUNDATIONS (A1) ===
  // Listening
  {
    id: 'p1_listen_01',
    part: 1,
    levelBand: 'A1',
    type: 'listening',
    prompt: 'Listen to the greeting. What do you hear?',
    audioText: 'Hello. My name is Sarah.',
    options: [
      'The person is introducing themselves',
      'The person is saying goodbye',
      'The person is asking for help',
      'The person is ordering food'
    ],
    correctAnswerIndex: 0,
    explanation: 'The speaker says "My name is Sarah" which is a self-introduction.'
  },
  {
    id: 'p1_listen_02',
    part: 1,
    levelBand: 'A1',
    type: 'listening',
    prompt: 'Listen to the number. Which one do you hear?',
    audioText: 'Seven.',
    options: ['7', '5', '9', '11'],
    correctAnswerIndex: 0,
    explanation: 'The speaker says "seven" which is the number 7.'
  },
  {
    id: 'p1_listen_03',
    part: 1,
    levelBand: 'A1',
    type: 'listening',
    prompt: 'What time is mentioned?',
    audioText: 'It is three o\'clock.',
    options: ['Two o\'clock', 'Three o\'clock', 'Four o\'clock', 'Five o\'clock'],
    correctAnswerIndex: 1,
    explanation: 'The speaker says "three o\'clock."'
  },
  {
    id: 'p1_listen_04',
    part: 1,
    levelBand: 'A1',
    type: 'listening',
    prompt: 'How does the person feel?',
    audioText: 'I am very happy today!',
    options: ['Sad', 'Tired', 'Angry', 'Happy'],
    correctAnswerIndex: 3,
    explanation: 'The speaker says "I am very happy" which clearly shows they are happy.'
  },
  {
    id: 'p1_listen_05',
    part: 1,
    levelBand: 'A1',
    type: 'listening',
    prompt: 'Where is the person?',
    audioText: 'I am at home with my family.',
    options: ['At work', 'At school', 'At home', 'At the park'],
    correctAnswerIndex: 2,
    explanation: 'The speaker says "I am at home with my family".'
  },

  // Grammar/Vocabulary - Part 1
  {
    id: 'p1_grammar_06',
    part: 1,
    levelBand: 'A1',
    type: 'multiple-choice',
    prompt: 'What is the opposite of "big"?',
    options: ['Small', 'Large', 'New', 'Old'],
    correctAnswerIndex: 0,
    explanation: '"Small" is the opposite of "big".'
  },
  {
    id: 'p1_grammar_07',
    part: 1,
    levelBand: 'A1',
    type: 'multiple-choice',
    prompt: 'Choose the correct form: "She ___ a student."',
    options: ['is', 'are', 'am', 'be'],
    correctAnswerIndex: 0,
    explanation: 'With "she" (third person singular), we use "is".'
  },
  {
    id: 'p1_grammar_08',
    part: 1,
    levelBand: 'A1',
    type: 'multiple-choice',
    prompt: 'Which is a pronoun?',
    options: ['He', 'Run', 'Happy', 'Book'],
    correctAnswerIndex: 0,
    explanation: '"He" is a personal pronoun.'
  },
  {
    id: 'p1_grammar_09',
    part: 1,
    levelBand: 'A1',
    type: 'vocabulary',
    prompt: 'What do you use to write on paper?',
    options: ['Knife', 'Cup', 'Door', 'Pen'],
    correctAnswerIndex: 3,
    explanation: 'A pen is used for writing.'
  },
  {
    id: 'p1_grammar_10',
    part: 1,
    levelBand: 'A1',
    type: 'vocabulary',
    prompt: 'Which is a color?',
    options: ['Apple', 'Red', 'Run', 'Book'],
    correctAnswerIndex: 1,
    explanation: '"Red" is a color.'
  },

  // === PART 2: BASIC COMMUNICATION (A2) ===
  // Listening
  {
    id: 'p2_listen_11',
    part: 2,
    levelBand: 'A2',
    type: 'listening',
    prompt: 'What is the person asking?',
    audioText: 'Can you help me find the station?',
    options: ['Can you help with directions?', 'Where is the train?', 'What time is it?', 'How are you?'],
    correctAnswerIndex: 0,
    explanation: 'The person is asking for help finding the station.'
  },
  {
    id: 'p2_listen_12',
    part: 2,
    levelBand: 'A2',
    type: 'listening',
    prompt: 'What does the person like?',
    audioText: 'I like playing football and reading books.',
    options: ['Swimming and dancing', 'Writing and cooking', 'Playing football and reading', 'Drawing and singing'],
    correctAnswerIndex: 2,
    explanation: 'The speaker says they like playing football and reading books.'
  },
  {
    id: 'p2_listen_13',
    part: 2,
    levelBand: 'A2',
    type: 'listening',
    prompt: 'How often does the person exercise?',
    audioText: 'I go to the gym three times a week.',
    options: ['Once a week', 'Twice a week', 'Three times a week', 'Every day'],
    correctAnswerIndex: 2,
    explanation: 'The person says "three times a week".'
  },
  {
    id: 'p2_listen_14',
    part: 2,
    levelBand: 'A2',
    type: 'listening',
    prompt: 'Where does the person work?',
    audioText: 'I work in an office downtown near the big park.',
    options: ['At home', 'In a hospital', 'In an office downtown', 'In a school'],
    correctAnswerIndex: 2,
    explanation: 'The speaker says "I work in an office downtown".'
  },
  {
    id: 'p2_listen_15',
    part: 2,
    levelBand: 'A2',
    type: 'listening',
    prompt: 'What is the person planning to do?',
    audioText: 'Tomorrow I am going to visit my grandmother.',
    options: ['Visit a friend', 'Go to school', 'Visit their grandmother', 'Stay at home'],
    correctAnswerIndex: 2,
    explanation: 'The speaker says "Tomorrow I am going to visit my grandmother".'
  },

  // Grammar/Use of English - Part 2
  {
    id: 'p2_grammar_16',
    part: 2,
    levelBand: 'A2',
    type: 'multiple-choice',
    prompt: 'Complete: "There ___ three chairs in the room."',
    options: ['is', 'am', 'are', 'be'],
    correctAnswerIndex: 2,
    explanation: '"There are" is used with plural nouns (three chairs).'
  },
  {
    id: 'p2_grammar_17',
    part: 2,
    levelBand: 'A2',
    type: 'multiple-choice',
    prompt: 'Which sentence is correct?',
    options: [
      'I can swim very well',
      'I can to swim very well',
      'I can swimming very well',
      'I can swam very well'
    ],
    correctAnswerIndex: 0,
    explanation: 'Modal verb "can" is followed by the base form of the verb.'
  },
  {
    id: 'p2_grammar_18',
    part: 2,
    levelBand: 'A2',
    type: 'multiple-choice',
    prompt: 'What is in the room? Complete the question: "___ any books on the table?"',
    options: ['Do there', 'Does there', 'Are there', 'Is there'],
    correctAnswerIndex: 2,
    explanation: '"Are there" is correct with plural "books".'
  },
  {
    id: 'p2_grammar_19',
    part: 2,
    levelBand: 'A2',
    type: 'vocabulary',
    prompt: 'Which word means "to prepare food for eating"?',
    options: ['Cook', 'Bake', 'Make', 'Fry'],
    correctAnswerIndex: 0,
    explanation: '"Cook" is the general verb for preparing food.'
  },
  {
    id: 'p2_grammar_20',
    part: 2,
    levelBand: 'A2',
    type: 'vocabulary',
    prompt: 'What is the opposite of "cheap"?',
    options: ['Free', 'Rich', 'Poor', 'Expensive'],
    correctAnswerIndex: 3,
    explanation: '"Expensive" is the opposite of "cheap".'
  },

  // === PART 3: INTERMEDIATE (B1/B2) ===
  // Reading
  {
    id: 'p3_reading_21',
    part: 3,
    levelBand: 'B1',
    type: 'reading',
    prompt: 'Read: "Last summer, I visited my uncle in a small village. The weather was warm and sunny every day. In the evenings, we would sit outside and watch the sunset." What was the weather like?',
    options: ['Cold and rainy', 'Cold and cloudy', 'Hot and humid', 'Warm and sunny'],
    correctAnswerIndex: 3,
    explanation: 'The text states "The weather was warm and sunny every day".'
  },
  {
    id: 'p3_reading_22',
    part: 3,
    levelBand: 'B1',
    type: 'reading',
    prompt: 'Read: "Although the movie was quite long, it kept my attention from beginning to end. The actors performed brilliantly and the story was compelling." What is the writer\'s opinion?',
    options: ['The movie was boring', 'The movie was too long', 'The movie was excellent', 'The movie was confusing'],
    correctAnswerIndex: 2,
    explanation: 'The positive phrases "kept my attention," "performed brilliantly," and "compelling" show the writer enjoyed it.'
  },
  {
    id: 'p3_reading_23',
    part: 3,
    levelBand: 'B1',
    type: 'reading',
    prompt: 'Read: "If you want to improve your English, you should practice speaking every day. Many people find that speaking with native speakers helps them gain confidence." What is recommended?',
    options: ['Practicing speaking daily', 'Reading books daily', 'Watching movies', 'Listening to music'],
    correctAnswerIndex: 0,
    explanation: 'The text suggests "practice speaking every day" as a way to improve English.'
  },
  {
    id: 'p3_reading_24',
    part: 3,
    levelBand: 'B2',
    type: 'reading',
    prompt: 'Read: "The phenomenon of social media addiction has become increasingly prevalent among teenagers. While these platforms offer connectivity, excessive usage can lead to mental health issues including anxiety and depression." What is the main concern?',
    options: [
      'Social media is not popular',
      'Teenagers cannot connect online',
      'Excessive social media use may harm mental health',
      'All teenagers are addicted'
    ],
    correctAnswerIndex: 2,
    explanation: 'The passage discusses how excessive social media usage can lead to mental health problems.'
  },
  {
    id: 'p3_reading_25',
    part: 3,
    levelBand: 'B2',
    type: 'reading',
    prompt: 'Read: "The Renaissance was characterized by a renewed interest in classical learning and a shift towards humanism. Artists and scholars of this period sought to combine artistic excellence with intellectual pursuits." What distinguished the Renaissance?',
    options: [
      'Military conquest',
      'Religious isolation',
      'Classical learning and humanism',
      'Agricultural development'
    ],
    correctAnswerIndex: 2,
    explanation: 'The passage mentions "renewed interest in classical learning" and "shift towards humanism" as characteristics.'
  },

  // Grammar - Part 3
  {
    id: 'p3_grammar_26',
    part: 3,
    levelBand: 'B1',
    type: 'multiple-choice',
    prompt: 'Complete: "She ___ been studying English for five years."',
    options: ['is', 'was', 'has', 'do'],
    correctAnswerIndex: 2,
    explanation: 'Present perfect "has been" is used for actions that started in the past and continue to the present.'
  },
  {
    id: 'p3_grammar_27',
    part: 3,
    levelBand: 'B1',
    type: 'multiple-choice',
    prompt: 'Which sentence shows past simple?',
    options: [
      'I am eating lunch',
      'I eat lunch every day',
      'I ate lunch yesterday',
      'I will eat lunch tomorrow'
    ],
    correctAnswerIndex: 2,
    explanation: '"I ate lunch yesterday" uses past simple tense.'
  },
  {
    id: 'p3_grammar_28',
    part: 3,
    levelBand: 'B1',
    type: 'multiple-choice',
    prompt: 'Complete: "The car is more expensive ___ the bicycle."',
    options: ['than', 'as', 'then', 'from'],
    correctAnswerIndex: 0,
    explanation: '"Than" is used in comparatives.'
  },
  {
    id: 'p3_grammar_29',
    part: 3,
    levelBand: 'B2',
    type: 'multiple-choice',
    prompt: 'Complete: "If I ___ known about the party, I would have gone."',
    options: ['had', 'would have', 'did', 'will'],
    correctAnswerIndex: 0,
    explanation: 'Third conditional: "If I had known" (past perfect).'
  },
  {
    id: 'p3_grammar_30',
    part: 3,
    levelBand: 'B2',
    type: 'multiple-choice',
    prompt: 'Which sentence uses passive voice correctly?',
    options: [
      'The letter was written by her',
      'She written the letter',
      'The letter is writing',
      'She was written the letter'
    ],
    correctAnswerIndex: 0,
    explanation: '"The letter was written by her" is correct passive voice.'
  },

  // === PART 4: ADVANCED (B2/C1/C2) ===
  // Grammar & Discourse
  {
    id: 'p4_grammar_31',
    part: 4,
    levelBand: 'B2',
    type: 'multiple-choice',
    prompt: 'Which phrasal verb means "to stop/end a relationship"?',
    options: ['Break up', 'Pick up', 'Give up', 'Make up'],
    correctAnswerIndex: 0,
    explanation: '"Break up" means to end a romantic relationship.'
  },
  {
    id: 'p4_grammar_32',
    part: 4,
    levelBand: 'B2',
    type: 'multiple-choice',
    prompt: 'Complete: "Not only ___ speak three languages, but he also plays the piano."',
    options: ['does', 'do', 'is', 'does his'],
    correctAnswerIndex: 0,
    explanation: 'Inversion after "Not only" requires "does he" (auxiliary + subject).'
  },
  {
    id: 'p4_grammar_33',
    part: 4,
    levelBand: 'C1',
    type: 'multiple-choice',
    prompt: 'Which word best completes: "Despite the difficulties, she continued her studies. ___,  she received a scholarship."',
    options: ['However', 'Although', 'Consequently', 'Nevertheless'],
    correctAnswerIndex: 2,
    explanation: '"Consequently" shows that her persistence resulted in a scholarship.'
  },
  {
    id: 'p4_grammar_34',
    part: 4,
    levelBand: 'C1',
    type: 'reading',
    prompt: 'Read: "The hypothesis that quantum entanglement could facilitate instantaneous communication, while theoretically intriguing, has been conclusively refuted by contemporary physics. The no-communication theorem establishes insurmountable constraints on such applications." What is the primary argument?',
    options: [
      'Quantum entanglement enables faster communication',
      'Quantum communication is theoretically possible but impractical',
      'Quantum entanglement cannot be used for instant communication',
      'Contemporary physics has enabled quantum communication'
    ],
    correctAnswerIndex: 2,
    explanation: 'The text explicitly states the hypothesis "has been conclusively refuted" and describes constraints.'
  },
  {
    id: 'p4_grammar_35',
    part: 4,
    levelBand: 'C2',
    type: 'reading',
    prompt: 'Read: "The obfuscation inherent in postmodern discourse obstructs meaningful hermeneutical engagement with textual primitives. Notwithstanding the proliferation of deconstructionist methodologies, the fundamental epistemological quandaries remain unresolved." What does the author imply?',
    options: [
      'Postmodern discourse is clear and helpful',
      'Deconstructionist methods have solved all philosophical problems',
      'Postmodern complexity persists despite theoretical efforts',
      'Hermeneutics is irrelevant to modern philosophy'
    ],
    correctAnswerIndex: 2,
    explanation: 'The author mentions "obfuscation," "quandaries remain unresolved," and "notwithstanding" which indicates persistence despite efforts.'
  },
  {
    id: 'p4_grammar_36',
    part: 4,
    levelBand: 'B2',
    type: 'vocabulary',
    prompt: 'What does "meticulous" mean?',
    options: ['Careless', 'Quick', 'Loud', 'Very careful and precise'],
    correctAnswerIndex: 3,
    explanation: '"Meticulous" means paying careful attention to detail.'
  },
  {
    id: 'p4_grammar_37',
    part: 4,
    levelBand: 'B2',
    type: 'vocabulary',
    prompt: 'Which word is closest in meaning to "ambiguous"?',
    options: ['Clear', 'Direct', 'Simple', 'Uncertain in meaning'],
    correctAnswerIndex: 3,
    explanation: '"Ambiguous" means unclear or having multiple possible interpretations.'
  },
  {
    id: 'p4_grammar_38',
    part: 4,
    levelBand: 'C1',
    type: 'vocabulary',
    prompt: 'What is a synonym for "elucidate"?',
    options: ['Clarify', 'Confuse', 'Ignore', 'Criticize'],
    correctAnswerIndex: 0,
    explanation: '"Elucidate" means to explain clearly.'
  },
  {
    id: 'p4_grammar_39',
    part: 4,
    levelBand: 'C1',
    type: 'vocabulary',
    prompt: 'Complete: "The company\'s ___ of the scandal damaged its reputation."',
    options: ['Discovery of', 'Concealment of', 'Documentation of', 'Recording of'],
    correctAnswerIndex: 1,
    explanation: '"Concealment of" (hiding the truth) would damage a company\'s reputation. The other options don\'t show wrongdoing.'
  },
  {
    id: 'p4_grammar_40',
    part: 4,
    levelBand: 'C2',
    type: 'vocabulary',
    prompt: 'Which word means "deliberately unclear or dishonest"?',
    options: ['Lucid', 'Pellucid', 'Obfuscatory', 'Perspicuous'],
    correctAnswerIndex: 2,
    explanation: '"Obfuscatory" means tending to deliberately obscure or confuse.'
  }
];

export const CEFR_LEVELS = {
  'Beginner': {
    range: '0-15%',
    description: 'Complete beginner. You are just starting your English journey. Focus on basic vocabulary and simple sentence structures.',
    recommendation: 'Start with Workbook 1: Units 1 and 2'
  },
  'A1': {
    range: '15-30%',
    description: 'Elementary user. You understand very basic English and can introduce yourself. You need to build on fundamentals.',
    recommendation: 'Start with Workbook 1: Units 1 and 2'
  },
  'A2': {
    range: '30-45%',
    description: 'Elementary user. You can handle everyday situations and basic conversations. Continue building confidence.',
    recommendation: 'Start with Workbook 2-3: Focus on present and past simple'
  },
  'B1': {
    range: '45-65%',
    description: 'Intermediate user. You can discuss most topics and express opinions. Your English is becoming more flexible.',
    recommendation: 'Start with Workbook 4-5: Work on continuous tenses and more complex structures'
  },
  'B2': {
    range: '65-80%',
    description: 'Upper-intermediate user. You have a good command of English and can engage in sophisticated discussions.',
    recommendation: 'Start with Workbook 6-7: Focus on perfect tenses, conditionals, and advanced vocabulary'
  },
  'C1': {
    range: '80-90%',
    description: 'Advanced user. You can express yourself fluently and spontaneously. You understand subtle meanings in texts.',
    recommendation: 'Start with Workbook 8: Work on nuances, idioms, and specialized topics'
  },
  'C2': {
    range: '90-100%',
    description: 'Mastery level. You have near-native proficiency. You can understand virtually everything and express yourself with precision.',
    recommendation: 'Challenge yourself with advanced topics and specialized English'
  }
};
