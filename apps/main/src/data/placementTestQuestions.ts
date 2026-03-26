// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Placement Test — Question bank v2
//
// 50 questions across 5 levels (10 each): A1 · A2 · B1 · B2 · C1/C2
// All questions have "I don't know" as the LAST option.
// "I don't know" is NEVER the correct answer (correctAnswerIndex is always 0–3).
// audioText is NEVER shown in the UI prompt — component reads it only for TTS.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { PLACEMENT_TEST_QUESTIONS_PT } from './placementTestQuestions_pt';
import { PLACEMENT_TEST_QUESTIONS_ES } from './placementTestQuestions_es';

export interface PlacementQuestion {
  id: string;
  part: number; // 1-5
  levelBand: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  type: 'multiple-choice' | 'listening' | 'reading' | 'vocabulary';
  /** Shown to the student as the question text. NEVER include audioText here. */
  prompt: string;
  /** TTS text — read aloud. NEVER rendered in the UI. */
  audioText?: string;
  /** Always 5 options: 4 real + "I don't know" as index 4. */
  options: string[];
  /** Index of the correct answer within options[]. Always 0–3. */
  correctAnswerIndex: number;
  /** Short explanation of why the correct answer is right. Used in PDF/report. */
  explanation?: string;
  /** Grammar or vocabulary topic tested (e.g. "Present Perfect", "Modal Verbs"). Used in PDF/report. */
  grammarTopic?: string;
}

// â”€â”€â”€ HELPER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/** Append "I don't know" to a 4-option list and return a 5-option list. */
function q(
  id: string,
  part: number,
  levelBand: PlacementQuestion['levelBand'],
  type: PlacementQuestion['type'],
  prompt: string,
  opts4: [string, string, string, string],
  correctAnswerIndex: number,
  audioText?: string,
  explanation?: string,
  grammarTopic?: string,
): PlacementQuestion {
  return {
    id, part, levelBand, type, prompt,
    audioText,
    options: [...opts4, "I don't know"],
    correctAnswerIndex,
    explanation,
    grammarTopic,
  };
}

export const PLACEMENT_TEST_QUESTIONS: PlacementQuestion[] = [

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PART 1 — A1  (questions 1–10)
  // Coverage: verb to be, subject pronouns, basic vocabulary, listening
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  q('a1_01', 1, 'A1', 'listening',
    'Listen and choose what the speaker says.',
    ['Hello! My name is Tom.', 'Goodbye! See you tomorrow.', 'Thank you very much.', 'I am sorry, I don\'t understand.'],
    0,
    'Hello! My name is Tom.',
    '"Hello! My name is Tom." is a greeting and self-introduction.',
    'Listening Comprehension',
  ),

  q('a1_02', 1, 'A1', 'listening',
    'Listen and choose the correct number.',
    ['Fifteen', 'Fifty', 'Fourteen', 'Forty'],
    0,
    'Fifteen.',
    'The speaker says "fifteen" — 15.',
    'Numbers (Listening)',
  ),

  q('a1_03', 1, 'A1', 'multiple-choice',
    'Choose the correct form: "He ___ a teacher."',
    ['is', 'are', 'am', 'be'],
    0,
    undefined,
    '"He" (3rd person singular) takes "is".',
    'Verb To Be',
  ),

  q('a1_04', 1, 'A1', 'multiple-choice',
    '"___ you from Brazil?"',
    ['Are', 'Is', 'Am', 'Be'],
    0,
    undefined,
    '"Are you" is the correct question form with "you".',
    'Verb To Be — Questions',
  ),

  q('a1_05', 1, 'A1', 'multiple-choice',
    'Choose the correct pronoun: "___ is my sister."',
    ['She', 'Her', 'He', 'Him'],
    0,
    undefined,
    '"She" is the subject pronoun for a female.',
    'Subject Pronouns',
  ),

  q('a1_06', 1, 'A1', 'vocabulary',
    'Which word is a DAY of the week?',
    ['April', 'Monday', 'Summer', 'Morning'],
    1,
    undefined,
    'Monday is a day of the week.',
    'Days of the Week',
  ),

  q('a1_07', 1, 'A1', 'vocabulary',
    'What do you use to drink water?',
    ['Plate', 'Fork', 'Glass', 'Pen'],
    2,
    undefined,
    'A glass is used for drinking.',
    'Everyday Vocabulary',
  ),

  q('a1_08', 1, 'A1', 'multiple-choice',
    'Choose the correct negative: "I ___ a doctor."',
    ['am not', 'are not', 'is not', 'not am'],
    0,
    undefined,
    '"I am not" is the correct negative of "I am".',
    'Verb To Be — Negatives',
  ),

  q('a1_09', 1, 'A1', 'listening',
    'Listen and choose where the person is.',
    ['At school', 'At home', 'At the park', 'At work'],
    1,
    'I am at home with my family today.',
    'The speaker says "at home".',
    'Prepositions of Place (Listening)',
  ),

  q('a1_10', 1, 'A1', 'vocabulary',
    'Which word means "the opposite of hot"?',
    ['Big', 'Fast', 'Cold', 'Dark'],
    2,
    undefined,
    'Cold is the opposite of hot.',
    'Antonyms — Basic Adjectives',
  ),

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PART 2 — A2  (questions 11–20)
  // Coverage: there is/are, can/can't, present simple, prepositions, listening
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  q('a2_11', 2, 'A2', 'listening',
    'Listen and choose what the person can do.',
    ['She can drive a car.', 'She can play the guitar.', 'She can speak French.', 'She can swim very well.'],
    3,
    'She can swim very well.',
    'The speaker says "she can swim".',
    'Modal Verbs — Can (Listening)',
  ),

  q('a2_12', 2, 'A2', 'multiple-choice',
    '"___ a supermarket near your house?"',
    ['Is there', 'Are there', 'There is', 'There are'],
    0,
    undefined,
    '"Is there" is used to ask about a single countable noun.',
    'There Is / There Are',
  ),

  q('a2_13', 2, 'A2', 'multiple-choice',
    '"There ___ five students in the room."',
    ['is', 'are', 'am', 'be'],
    1,
    undefined,
    '"There are" is used with plural nouns.',
    'There Is / There Are',
  ),

  q('a2_14', 2, 'A2', 'multiple-choice',
    'Complete: "She ___ coffee every morning."',
    ['drink', 'drinks', 'is drinking', 'drank'],
    1,
    undefined,
    'Present simple 3rd person singular takes -s.',
    'Present Simple — 3rd Person',
  ),

  q('a2_15', 2, 'A2', 'multiple-choice',
    '"I ___ play chess. I never learned."',
    ['can', 'can\'t', 'don\'t', 'won\'t'],
    1,
    undefined,
    '"Can\'t" expresses inability.',
    'Modal Verbs — Can / Cannot',
  ),

  q('a2_16', 2, 'A2', 'vocabulary',
    'Choose the correct preposition: "The cat is ___ the box."',
    ['on', 'in', 'at', 'to'],
    1,
    undefined,
    '"In the box" means inside.',
    'Prepositions of Place',
  ),

  q('a2_17', 2, 'A2', 'listening',
    'Listen and choose how often the person exercises.',
    ['Every day', 'Never', 'Three times a week', 'Once a month'],
    2,
    'I go to the gym three times a week.',
    'The speaker says "three times a week".',
    'Adverbs of Frequency (Listening)',
  ),

  q('a2_18', 2, 'A2', 'multiple-choice',
    'Which question is correct?',
    ['Do she work here?', 'Does she works here?', 'Does she work here?', 'Is she work here?'],
    2,
    undefined,
    '"Does she work?" is correct — 3rd person question with base form.',
    'Present Simple — Questions',
  ),

  q('a2_19', 2, 'A2', 'vocabulary',
    'What is the opposite of "expensive"?',
    ['Rich', 'Large', 'Cheap', 'Slow'],
    2,
    undefined,
    '"Cheap" is the opposite of "expensive".',
    'Antonyms — Adjectives',
  ),

  q('a2_20', 2, 'A2', 'multiple-choice',
    '"They ___ watching TV right now."',
    ['is', 'are', 'be', 'was'],
    1,
    undefined,
    '"They are" + present continuous (-ing).',
    'Present Continuous',
  ),

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PART 3 — B1  (questions 21–30)
  // Coverage: past simple, going to, comparatives, modals, reading, listening
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  q('b1_21', 3, 'B1', 'multiple-choice',
    'Complete: "We ___ to Paris last summer."',
    ['go', 'gone', 'went', 'goes'],
    2,
    undefined,
    '"Went" is the past simple of "go".',
    'Past Simple — Irregular Verbs',
  ),

  q('b1_22', 3, 'B1', 'multiple-choice',
    '"___ you ___ the film last night?"',
    ['Did / see', 'Do / see', 'Did / saw', 'Have / seen'],
    0,
    undefined,
    'Past simple question: "Did + subject + base verb".',
    'Past Simple — Questions',
  ),

  q('b1_23', 3, 'B1', 'multiple-choice',
    '"We ___ going to visit my parents this weekend."',
    ['are', 'is', 'will', 'have'],
    0,
    undefined,
    '"Be going to" = future plan. "We are going to".',
    'Future — Be Going To',
  ),

  q('b1_24', 3, 'B1', 'multiple-choice',
    '"This bag is ___ than that one."',
    ['more heavy', 'heavier', 'heaviest', 'heavy'],
    1,
    undefined,
    'One-syllable adjective → add -er for comparative.',
    'Comparative Adjectives',
  ),

  q('b1_25', 3, 'B1', 'multiple-choice',
    '"You ___ wear a seatbelt. It\'s the law."',
    ['might', 'must', 'should', 'can'],
    1,
    undefined,
    '"Must" expresses obligation (legal requirement).',
    'Modal Verbs — Must / Should',
  ),

  q('b1_26', 3, 'B1', 'listening',
    'Listen and answer: What is the person going to do tomorrow?',
    ['Go to the cinema', 'Visit a friend', 'Go to the gym', 'Stay at home'],
    2,
    'Tomorrow morning I am going to the gym. I want to get fit.',
    'The speaker says "going to the gym".',
    'Future Plans (Listening)',
  ),

  q('b1_27', 3, 'B1', 'reading',
    'Read: "Maria left work early because she had a headache. She went home and rested all afternoon." Why did Maria leave early?',
    ['She was hungry.', 'She had a meeting.', 'She had a headache.', 'She was bored.'],
    2,
    undefined,
    'Text states "because she had a headache".',
    'Reading Comprehension — Cause & Effect',
  ),

  q('b1_28', 3, 'B1', 'multiple-choice',
    '"I ___ my keys. Have you seen them anywhere?"',
    ['lose', 'lost', 'have lost', 'was losing'],
    2,
    undefined,
    'Present perfect ("have lost") for a recent action with present relevance.',
    'Present Perfect',
  ),

  q('b1_29', 3, 'B1', 'vocabulary',
    'Choose the word that best completes: "She gave a very ___ speech — everyone was moved."',
    ['boring', 'powerful', 'silent', 'short'],
    1,
    undefined,
    '"Powerful" fits a speech that moved people.',
    'Vocabulary in Context',
  ),

  q('b1_30', 3, 'B1', 'reading',
    'Read: "If you practise speaking every day, your fluency will improve quickly." What is the condition for improvement?',
    ['Reading every day', 'Studying grammar', 'Practising speaking daily', 'Watching films'],
    2,
    undefined,
    '"If you practise speaking every day" is the condition stated.',
    'Conditional Sentences — First Conditional (Reading)',
  ),

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PART 4 — B2  (questions 31–40)
  // Coverage: present perfect continuous, passive, conditionals, listening, reading
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  q('b2_31', 4, 'B2', 'multiple-choice',
    '"She ___ been working here for ten years."',
    ['have', 'has', 'is', 'was'],
    1,
    undefined,
    'Present perfect: "has been" with 3rd person singular.',
    'Present Perfect',
  ),

  q('b2_32', 4, 'B2', 'multiple-choice',
    '"I ___ waiting for you for an hour! Where were you?"',
    ['have been', 'had been', 'was', 'am'],
    0,
    undefined,
    'Present perfect continuous ("have been waiting") — ongoing action until now.',
    'Present Perfect Continuous',
  ),

  q('b2_33', 4, 'B2', 'multiple-choice',
    '"The report ___ written by the team last week."',
    ['is', 'was', 'were', 'has'],
    1,
    undefined,
    'Passive voice past: "was written".',
    'Passive Voice — Past Simple',
  ),

  q('b2_34', 4, 'B2', 'multiple-choice',
    '"If I ___ more money, I would buy a bigger house."',
    ['have', 'had', 'have had', 'will have'],
    1,
    undefined,
    'Second conditional: "If + past simple, would + base verb".',
    'Second Conditional',
  ),

  q('b2_35', 4, 'B2', 'listening',
    'Listen and choose the main idea of the message.',
    ['The meeting has been cancelled.', 'The meeting has been moved to Thursday.', 'There is no meeting this week.', 'The meeting time has been changed to 2 pm.'],
    1,
    'Hi, just to let you know that Monday\'s meeting has been moved to Thursday at the same time. Please update your calendar.',
    'The speaker says the meeting was moved to Thursday.',
    'Passive Voice (Listening)',
  ),

  q('b2_36', 4, 'B2', 'reading',
    'Read: "Although social media platforms offer connectivity, excessive use has been linked to increased levels of anxiety and reduced attention spans in adolescents." What is the writer\'s concern?',
    ['Social media is not popular among teens.', 'Teens cannot connect with each other.', 'Too much social media may harm teenagers\' wellbeing.', 'Social media should be banned in schools.'],
    2,
    undefined,
    'The text links excessive use to anxiety and reduced attention spans.',
    'Reading Comprehension — Critical Analysis',
  ),

  q('b2_37', 4, 'B2', 'vocabulary',
    'What does "meticulous" mean?',
    ['Careless and rushed', 'Paying very careful attention to detail', 'Loud and aggressive', 'Flexible and easy-going'],
    1,
    undefined,
    '"Meticulous" means very careful and precise.',
    'Advanced Vocabulary',
  ),

  q('b2_38', 4, 'B2', 'multiple-choice',
    '"Not only ___ he speak French, but he also writes it fluently."',
    ['does', 'do', 'is', 'did'],
    0,
    undefined,
    'Inversion after "Not only": auxiliary + subject.',
    'Inversion — Not Only',
  ),

  q('b2_39', 4, 'B2', 'multiple-choice',
    'Choose the sentence where "used to" is correct.',
    ['I used to going to school by bus.', 'She uses to wake up early.', 'They used to live in London when they were children.', 'He use to play football every week.'],
    2,
    undefined,
    '"Used to + base verb" for past habits. Only option C uses this correctly.',
    'Used To — Past Habits',
  ),

  q('b2_40', 4, 'B2', 'vocabulary',
    'Which word is closest in meaning to "ambiguous"?',
    ['Clear and direct', 'Open to more than one interpretation', 'Completely false', 'Strongly opinionated'],
    1,
    undefined,
    '"Ambiguous" means having more than one possible meaning.',
    'Synonyms — Advanced',
  ),

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PART 5 — C1/C2  (questions 41–50)
  // Coverage: modal perfects, inversion, connectors, nuanced reading, listening
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  q('c1_41', 5, 'C1', 'multiple-choice',
    '"If only I ___ harder for the exam. I regret it now."',
    ['study', 'studied', 'had studied', 'would study'],
    2,
    undefined,
    '"If only + past perfect" expresses regret about a past action.',
    'If Only — Past Perfect (Regret)',
  ),

  q('c1_42', 5, 'C1', 'multiple-choice',
    '"You ___ have called me — I was worried about you."',
    ['should', 'must', 'would', 'might'],
    0,
    undefined,
    '"Should have" expresses criticism or regret about a past action.',
    'Modal Perfects — Should Have',
  ),

  q('c1_43', 5, 'C1', 'multiple-choice',
    '"___ the weather been better, we would have gone hiking."',
    ['If', 'Had', 'Should', 'Were'],
    1,
    undefined,
    'Inversion in third conditional: "Had the weather been better" = "If the weather had been better".',
    'Third Conditional — Inversion',
  ),

  q('c1_44', 5, 'C1', 'multiple-choice',
    '"The factory failed to meet safety regulations. ___, it was shut down by the authorities."',
    ['Despite', 'Although', 'Consequently', 'Nevertheless'],
    2,
    undefined,
    '"Consequently" expresses a direct causal result: the violation caused the shutdown. "Despite" requires a noun/gerund phrase, not an independent clause. "Although" must introduce a subordinate clause, not a standalone sentence. "Nevertheless" signals contrast or concession, not cause-and-effect.',
    'Discourse Markers — Cause & Effect',
  ),

  q('c1_45', 5, 'C1', 'listening',
    'Listen and choose the best summary of the speaker\'s argument.',
    [
      'Technology always makes learning easier.',
      'Students should avoid all forms of technology.',
      'Technology can benefit learning when used critically and selectively.',
      'Teachers should use technology instead of books.',
    ],
    2,
    'While technology can certainly enhance learning, it\'s important that students develop the critical skills to evaluate digital information rather than accepting everything they read online. Used wisely, it\'s a powerful tool.',
    'The speaker advocates critical use of technology, not total avoidance or uncritical acceptance.',
    'Extended Listening Comprehension',
  ),

  q('c1_46', 5, 'C1', 'reading',
    'Read: "The no-communication theorem establishes that quantum entanglement, while theoretically intriguing, cannot be exploited to transmit information faster than light, thereby refuting earlier speculation." What is the text\'s main claim?',
    ['Quantum entanglement enables instant communication.', 'Faster-than-light communication is theoretically possible.', 'A theorem rules out using entanglement for faster-than-light information transfer.', 'Quantum physics is too complex to understand.'],
    2,
    undefined,
    'The theorem "refutes" the speculation — it cannot be used for faster-than-light communication.',
    'Reading Comprehension — Academic / Scientific Text',
  ),

  q('c1_47', 5, 'C1', 'vocabulary',
    'What is a synonym for "elucidate"?',
    ['Obscure', 'Clarify', 'Complicate', 'Contradict'],
    1,
    undefined,
    '"Elucidate" means to make something clear.',
    'Advanced Vocabulary — Synonyms',
  ),

  q('c1_48', 5, 'C1', 'vocabulary',
    '"The company\'s ___ of the scandal damaged public trust irreparably."',
    ['documentation', 'discovery', 'concealment', 'analysis'],
    2,
    undefined,
    '"Concealment" (hiding information) would damage trust.',
    'Vocabulary in Context — Advanced',
  ),

  q('c2_49', 5, 'C2', 'reading',
    'Read: "The obfuscation inherent in postmodern discourse obstructs meaningful hermeneutical engagement with textual primitives. Notwithstanding the proliferation of deconstructionist methodologies, fundamental epistemological quandaries remain unresolved." What does the author imply?',
    [
      'Postmodern writing is admirably clear and rigorous.',
      'Deconstruction has solved the major questions of philosophy.',
      'Postmodern complexity prevents genuine understanding and leaves key questions open.',
      'Hermeneutics is no longer a relevant discipline.',
    ],
    2,
    undefined,
    '"Obfuscation", "quandaries remain unresolved", and "notwithstanding" all signal that complexity persists despite theoretical efforts.',
    'Reading Comprehension — Postmodern / Academic Prose',
  ),

  q('c2_50', 5, 'C2', 'vocabulary',
    'Which word means "deliberately unclear or designed to confuse"?',
    ['Pellucid', 'Perspicuous', 'Obfuscatory', 'Lucid'],
    2,
    undefined,
    '"Obfuscatory" means intended to make something unclear or difficult to understand.',
    'Advanced Vocabulary — Register',
  ),
];

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Weighted classification
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Point weight per CEFR band. Higher bands contribute more so easy guessing cannot inflate the result. */
const LEVEL_WEIGHTS: Record<string, number> = {
  A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6,
};

/**
 * Classify a student's CEFR level using weighted band scoring.
 *
 * - `percentage` = raw % correct (for student display only — NOT used to classify).
 * - `weightedPct` = weighted score / max possible weighted score × 100.
 * - Cutoffs are calibrated so random guessing (20% on 5-option questions) always
 *   lands in Beginner or A1.
 * - "I don't know" (index 4) is never the correct answer, so choosing it always
 *   counts as wrong, reducing the incentive to guess.
 */
export function classifyPlacementLevel(
  answers: (number | null)[],
  questions: PlacementQuestion[],
): { level: string; percentage: number } {
  const correctCount = answers.reduce(
    (n, a, i) => n + (a === questions[i].correctAnswerIndex ? 1 : 0),
    0,
  );
  const rawPercentage = Math.round((correctCount / questions.length) * 100);

  let weightedScore = 0;
  let maxScore = 0;
  questions.forEach((q, i) => {
    const w = LEVEL_WEIGHTS[q.levelBand] ?? 1;
    maxScore += w;
    if (answers[i] === q.correctAnswerIndex) weightedScore += w;
  });
  const weightedPct = maxScore > 0 ? Math.round((weightedScore / maxScore) * 100) : 0;

  // Cutoffs (v2) — more rigorous, calibrated for 5-option questions (random ≈ 20%)
  let level: string;
  if      (weightedPct < 25) level = 'Beginner';
  else if (weightedPct < 41) level = 'A1';
  else if (weightedPct < 56) level = 'A2';
  else if (weightedPct < 71) level = 'B1';
  else if (weightedPct < 83) level = 'B2';
  else if (weightedPct < 93) level = 'C1';
  else                       level = 'C2';

  return { level, percentage: rawPercentage };
}

/**
 * Return the placement test question bank for a given language code.
 * 'pt' and 'es' return their own pedagogically-adapted banks.
 * All other languages fall back to English.
 */
export function getQuestionsForLanguage(languageCode: string): PlacementQuestion[] {
  switch (languageCode) {
    case 'pt':
      return PLACEMENT_TEST_QUESTIONS_PT;
    case 'es':
      return PLACEMENT_TEST_QUESTIONS_ES;
    case 'en':
    default:
      return PLACEMENT_TEST_QUESTIONS;
  }
}

export const CEFR_LEVELS = {
  'Beginner': {
    range: 'Below A1',
    description: 'You are at the very beginning of your English journey. Focus on basic words, greetings, and simple sentences.',
    recommendation: 'Start at the very beginning — basic greetings, numbers, and everyday words.',
    entryPoint: 'Workbook 1 / Unit 1',
  },
  'A1': {
    range: 'Elementary',
    description: 'You can understand and use very basic English. You can introduce yourself and ask simple questions.',
    recommendation: 'Begin with foundational grammar: the verb "to be", pronouns, and present simple.',
    entryPoint: 'Workbook 1 / Unit 2',
  },
  'A2': {
    range: 'Pre-Intermediate',
    description: 'You can handle everyday situations and short conversations. Keep building confidence with new vocabulary and tenses.',
    recommendation: 'Continue with past simple, can/could, present continuous, and everyday conversations.',
    entryPoint: 'Workbook 2 / Unit 1',
  },
  'B1': {
    range: 'Intermediate',
    description: 'You can discuss familiar topics, express opinions, and follow the main points in clear speech.',
    recommendation: 'Focus on present perfect, conditionals, modal verbs, and reading longer texts.',
    entryPoint: 'Workbook 4 / Unit 1',
  },
  'B2': {
    range: 'Upper-Intermediate',
    description: 'You have a solid command of English and can engage in more complex discussions with confidence.',
    recommendation: 'Work on passive voice, advanced conditionals, discourse markers, and academic vocabulary.',
    entryPoint: 'Workbook 6 / Unit 1',
  },
  'C1': {
    range: 'Advanced',
    description: 'You can express yourself fluently and spontaneously and understand sophisticated texts and conversations.',
    recommendation: 'Strengthen modal perfects, inversion, nuanced vocabulary, and extended listening.',
    entryPoint: 'Workbook 8 / Unit 1',
  },
  'C2': {
    range: 'Mastery',
    description: 'You have near-native proficiency. You can understand virtually anything and express yourself with precision.',
    recommendation: 'Challenge yourself with advanced and specialised English content.',
    entryPoint: 'Advanced & Specialised Content',
  },
};
