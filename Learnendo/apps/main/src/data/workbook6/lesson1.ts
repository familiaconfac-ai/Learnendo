import { Lesson } from '../../types';

// Workbook 6 — Lesson 1
// Level: B2
// Topic: The Differences Among Should, Ought to, and Had Better
// Source: Wbk 6 (B2), Unit 10, Lesson 51
//
// Exercise map (7 exercises = 7 days):
//   Day 1 — Ex 1: Grammar Presentation (teach + guided understanding)  25 pts
//   Day 2 — Ex 2: Reading Comprehension (Serious Advice dialogues)     10 pts
//   Day 3 — Ex 3: Grammar Recognition (choose the right modal)         10 pts
//   Day 4 — Ex 4: Fill in the Blank (controlled writing practice)      10 pts
//   Day 5 — Ex 5: Error Correction + Transformation (writing)          10 pts
//   Day 6 — Ex 6: Scenario-Based Production (Sarah & Tom)              10 pts
//   Day 7 — Ex 7: Final Mixed Test (review — MC + writing + speaking)  25 pts

export const lesson1: Lesson = {
  id: 'wb6_l1',
  title: 'Lesson 1: Should, Ought to, and Had Better',
  days: [
    // ══════════════════════════════════════════════════════════════════
    // DAY 1 · Exercise 1 — Grammar Presentation
    // The teacher introduces each modal, then guided understanding MC
    // items check that the student grasped the key features.
    // Instruction pattern "The teacher says: ..." triggers the app's
    // special dialogue layout (sky-blue LISTENING badge + yellow speech).
    // ══════════════════════════════════════════════════════════════════
    {
      id: 'wb6_l1_d1',
      type: 'practice',
      exercises: [
        // ── Teach: SHOULD ──
        {
          id: 'wb6_l1_d1_e1',
          type: 'multiple-choice',
          instruction:
            'The teacher says: "Should is used to give advice or a recommendation. It is the most common and the gentlest of the three modals. There is no strong warning and no implied consequence. Examples: You should study more if you want to pass the exam. You should see a doctor if you are not feeling well. You should save some money each month." — What is should mainly used for?',
          audioValue:
            'Should is used to give advice or a recommendation. It is the most common and the gentlest of the three modals. There is no strong warning and no implied consequence. Examples: You should study more if you want to pass the exam. You should see a doctor if you are not feeling well.',
          options: [
            'To give gentle advice or a recommendation',
            'To warn of urgent consequences',
            'To express a formal moral duty only',
            'To describe a past obligation',
          ],
          correctValue: 'To give gentle advice or a recommendation',
          isNewVocab: true,
        },
        // ── Teach: OUGHT TO ──
        {
          id: 'wb6_l1_d1_e2',
          type: 'multiple-choice',
          instruction:
            'The teacher says: "Ought to is similar to should, but it often carries a moral or ethical sense. It suggests this is the right or correct thing to do, not just the practical thing. It is slightly more formal than should. Examples: We ought to help those in need. You ought to apologize if you made a mistake. She ought to listen carefully if she wants to understand." — What makes ought to slightly different from should?',
          audioValue:
            'Ought to is similar to should, but it often carries a moral or ethical sense. It suggests this is the right or correct thing to do. Examples: We ought to help those in need. You ought to apologize if you made a mistake.',
          options: [
            'It adds a moral or ethical tone to the recommendation',
            'It is stronger and more urgent than had better',
            'It is used only in formal written English',
            'It always refers to situations in the past',
          ],
          correctValue: 'It adds a moral or ethical tone to the recommendation',
        },
        // ── Teach: HAD BETTER ──
        {
          id: 'wb6_l1_d1_e3',
          type: 'multiple-choice',
          instruction:
            'The teacher says: "Had better is the strongest of the three. It gives serious advice with an implied warning. If the advice is not followed, there will likely be a negative consequence. Examples: You had better study tonight or you will fail the exam. You had better leave now or you will be late. You had better see a doctor right away." — What is the key feature of had better?',
          audioValue:
            'Had better is the strongest of the three. It gives serious advice with an implied warning. If the advice is not followed, there will likely be a negative consequence. Examples: You had better study tonight or you will fail. You had better leave now or you will be late.',
          options: [
            'It gives urgent advice and implies a negative consequence',
            'It is the most polite and gentle form of advice',
            'It is used only when giving moral guidance',
            'It has the same meaning and force as should',
          ],
          correctValue: 'It gives urgent advice and implies a negative consequence',
        },
        // ── Guided understanding: strength scale ──
        {
          id: 'wb6_l1_d1_e4',
          type: 'multiple-choice',
          instruction:
            'From weakest to strongest advice, which order is correct?',
          audioValue:
            'From weakest to strongest advice, which order is correct?',
          options: [
            'should → ought to → had better',
            'had better → should → ought to',
            'ought to → had better → should',
            'had better → ought to → should',
          ],
          correctValue: 'should → ought to → had better',
        },
        // ── Guided understanding: pick the right modal by context ──
        {
          id: 'wb6_l1_d1_e5',
          type: 'multiple-choice',
          instruction:
            'Your friend never eats vegetables. You want to give a casual health tip with no urgency. Which sentence is most appropriate?',
          audioValue:
            'Which sentence gives a casual health tip to a friend with no urgency?',
          options: [
            'You should eat more vegetables.',
            'You had better eat vegetables right now.',
            'You had better to eat more vegetables.',
            'You ought better eat some vegetables.',
          ],
          correctValue: 'You should eat more vegetables.',
        },
        // ── Guided understanding: urgent real-world situation ──
        {
          id: 'wb6_l1_d1_e6',
          type: 'multiple-choice',
          instruction:
            'Your friend has not paid rent and will be evicted today if they do not pay immediately. Which sentence is most appropriate?',
          audioValue:
            'Which sentence gives the most appropriate urgent advice about paying rent to avoid immediate eviction?',
          options: [
            'You should pay your rent when you can.',
            'You ought to eventually pay your rent.',
            'You had better pay your rent right now.',
            'You could pay your rent if you want to.',
          ],
          correctValue: 'You had better pay your rent right now.',
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════
    // DAY 2 · Exercise 2 — Reading Comprehension
    // Questions based on the four "Serious Advice" dialogues.
    // ══════════════════════════════════════════════════════════════════
    {
      id: 'wb6_l1_d2',
      type: 'practice',
      exercises: [
        {
          id: 'wb6_l1_d2_e1',
          type: 'multiple-choice',
          instruction:
            'Read: "Pat has stayed up until 3 AM all week watching horror movies. Jack says: You should not fill your mind with that garbage. You had better start going to bed early and filling your mind with worthwhile things." — What two things does Jack tell Pat he had better start doing?',
          audioValue:
            'What two things does Jack tell Pat he had better start doing?',
          options: [
            'Exercise more and eat better food.',
            'Going to bed early and filling his mind with worthwhile things.',
            'Stop using his phone at night and read books.',
            'Wake up earlier and study for exams.',
          ],
          correctValue: 'Going to bed early and filling his mind with worthwhile things.',
          isNewVocab: true,
        },
        {
          id: 'wb6_l1_d2_e2',
          type: 'multiple-choice',
          instruction:
            'Read: "Ava has been feeling down whenever she hangs out with her friends. Noah says: You should surround yourself with positive people. You had better reconsider who you are spending your time with." — Why does Noah say Ava had better reconsider her friendships?',
          audioValue:
            'Why does Noah say Ava had better reconsider her friendships?',
          options: [
            'Because her friends are making fun of her studies.',
            'Because her friends are bringing her down.',
            'Because she has too many friends and not enough time.',
            'Because her friends are moving to another city.',
          ],
          correctValue: 'Because her friends are bringing her down.',
        },
        {
          id: 'wb6_l1_d2_e3',
          type: 'multiple-choice',
          instruction:
            'Read: "Sophia just got her first paycheck and wants to buy a new phone. Liam says: You ought to think about managing your money first. You should create a budget and decide what is really necessary." — Which modals does Liam use and what is his main point?',
          audioValue:
            'Which modals does Liam use and what is his main point to Sophia?',
          options: [
            'Liam uses had better; his point is that buying a phone is dangerous.',
            'Liam uses ought to and should; his point is to manage money before spending it.',
            'Liam uses should only; his point is that phones are unnecessary.',
            'Liam uses had better; his point is that she will regret the purchase.',
          ],
          correctValue:
            'Liam uses ought to and should; his point is to manage money before spending it.',
        },
        {
          id: 'wb6_l1_d2_e4',
          type: 'multiple-choice',
          instruction:
            'Read: "Ethan feels overwhelmed but does not want to ask for help. Mia says: You ought to remember that it is okay to ask for help. You should reach out to others when you are struggling. You had better seek support now rather than waiting until you are completely burnt out." — In Mia\'s advice, which modal carries the strongest urgency?',
          audioValue:
            'In Mia\'s advice to Ethan, which modal carries the strongest urgency?',
          options: ['should', 'ought to', 'had better', 'could'],
          correctValue: 'had better',
        },
        {
          id: 'wb6_l1_d2_e5',
          type: 'multiple-choice',
          instruction:
            'Looking at all four "Serious Advice" dialogues, which of these problems is NOT mentioned by any of the characters?',
          audioValue:
            'In the four Serious Advice dialogues, which problem is not mentioned?',
          options: [
            'Staying up too late watching horror movies.',
            'Spending time with negative friends.',
            'Not knowing how to speak in public.',
            'Feeling overwhelmed by too many responsibilities.',
          ],
          correctValue: 'Not knowing how to speak in public.',
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════
    // DAY 3 · Exercise 3 — Grammar Recognition
    // Students choose the correct modal based on context and degree.
    // ══════════════════════════════════════════════════════════════════
    {
      id: 'wb6_l1_d3',
      type: 'practice',
      exercises: [
        {
          id: 'wb6_l1_d3_e1',
          type: 'multiple-choice',
          instruction:
            'Choose the best modal: "You ___ exercise regularly if you want to stay healthy." — casual lifestyle recommendation, no warning.',
          audioValue:
            'Choose the best modal for a casual lifestyle recommendation with no warning.',
          options: ['should', 'had better', 'ought better', 'had to'],
          correctValue: 'should',
          isNewVocab: true,
        },
        {
          id: 'wb6_l1_d3_e2',
          type: 'multiple-choice',
          instruction:
            'Choose the best modal: "You ___ leave immediately, or you will miss your flight." — urgent warning with a clear stated consequence.',
          audioValue:
            'Choose the best modal for an urgent warning with a clear stated consequence.',
          options: ['should', 'ought to', 'had better', 'could'],
          correctValue: 'had better',
        },
        {
          id: 'wb6_l1_d3_e3',
          type: 'multiple-choice',
          instruction:
            'Choose the best modal: "We ___ help those who cannot help themselves." — moral or ethical duty.',
          audioValue: 'Choose the best modal for a moral or ethical duty.',
          options: ['had better', 'ought to', 'could better', 'must not'],
          correctValue: 'ought to',
        },
        {
          id: 'wb6_l1_d3_e4',
          type: 'multiple-choice',
          instruction: 'Which sentence is grammatically correct?',
          audioValue: 'Which sentence is grammatically correct?',
          options: [
            'You had better to apologize right now.',
            'You should to apologize right now.',
            'You ought apologize right now.',
            'You had better apologize right now.',
          ],
          correctValue: 'You had better apologize right now.',
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════
    // DAY 4 · Exercise 4 — Fill in the Blank
    // Controlled writing: student types the missing modal word(s).
    // ══════════════════════════════════════════════════════════════════
    {
      id: 'wb6_l1_d4',
      type: 'practice',
      exercises: [
        {
          id: 'wb6_l1_d4_e1',
          type: 'writing',
          instruction:
            'Fill in the blank. "You _____ see a doctor right away — your symptoms might get much worse." Type the modal that gives urgent advice with an implied danger.',
          displayValue:
            'You _____ see a doctor right away — your symptoms might get much worse.',
          audioValue:
            'You blank see a doctor right away. Your symptoms might get much worse.',
          correctValue: 'had better',
          isNewVocab: true,
        },
        {
          id: 'wb6_l1_d4_e2',
          type: 'writing',
          instruction:
            'Fill in the blank. "You _____ save some money each month if you want to buy that car." Type the modal for general lifestyle advice.',
          displayValue:
            'You _____ save some money each month if you want to buy that car.',
          audioValue:
            'You blank save some money each month if you want to buy that car.',
          correctValue: 'should',
        },
        {
          id: 'wb6_l1_d4_e3',
          type: 'writing',
          instruction:
            'Fill in the blank. "We _____ take breaks during long study sessions to avoid burnout." Type the two-word modal that adds a moral or ethical tone.',
          displayValue:
            'We _____ take breaks during long study sessions to avoid burnout.',
          audioValue:
            'We blank take breaks during long study sessions to avoid burnout.',
          correctValue: 'ought to',
        },
        {
          id: 'wb6_l1_d4_e4',
          type: 'writing',
          instruction:
            'Fill in the blank. "You _____ back up your files right now, or you will lose everything." Type the most urgent two-word modal.',
          displayValue:
            'You _____ back up your files right now, or you will lose everything.',
          audioValue:
            'You blank back up your files right now, or you will lose everything.',
          correctValue: 'had better',
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════
    // DAY 5 · Exercise 5 — Error Correction + Sentence Transformation
    // ══════════════════════════════════════════════════════════════════
    {
      id: 'wb6_l1_d5',
      type: 'practice',
      exercises: [
        // ── Error Correction (3 items): common grammar mistakes ──
        {
          id: 'wb6_l1_d5_e1',
          type: 'writing',
          instruction:
            'One grammar error: "You should to apologize if you know you have made a mistake." — Type the corrected full sentence.',
          displayValue:
            'You should to apologize if you know you have made a mistake.',
          audioValue:
            'You should to apologize if you know you have made a mistake.',
          correctValue:
            'you should apologize if you know you have made a mistake',
          isNewVocab: true,
        },
        {
          id: 'wb6_l1_d5_e2',
          type: 'writing',
          instruction:
            'One grammar error: "She ought apologize if she made a mistake." — Type the corrected full sentence.',
          displayValue: 'She ought apologize if she made a mistake.',
          audioValue: 'She ought apologize if she made a mistake.',
          correctValue: 'she ought to apologize if she made a mistake',
        },
        {
          id: 'wb6_l1_d5_e3',
          type: 'writing',
          instruction:
            'One grammar error: "You had better to leave early or else you will be late." — Type the corrected full sentence.',
          displayValue:
            'You had better to leave early or else you will be late.',
          audioValue:
            'You had better to leave early or else you will be late.',
          correctValue: 'you had better leave early or else you will be late',
        },
        // ── Sentence Transformation (3 items) ──
        {
          id: 'wb6_l1_d5_e4',
          type: 'writing',
          instruction:
            'Make the advice more urgent — rewrite using "had better": "You should save your money every month."',
          displayValue:
            'You should save your money every month. → You had better ___',
          audioValue:
            'Rewrite using had better: You should save your money every month.',
          correctValue: 'you had better save your money every month',
        },
        {
          id: 'wb6_l1_d5_e5',
          type: 'writing',
          instruction:
            'Soften the advice — rewrite using "should": "You had better stop eating junk food."',
          displayValue:
            'You had better stop eating junk food. → You should ___',
          audioValue:
            'Rewrite using should: You had better stop eating junk food.',
          correctValue: 'you should stop eating junk food',
        },
        {
          id: 'wb6_l1_d5_e6',
          type: 'writing',
          instruction:
            'Add a moral tone — rewrite using "ought to": "You should help your classmates when they struggle."',
          displayValue:
            'You should help your classmates when they struggle. → You ought to ___',
          audioValue:
            'Rewrite using ought to: You should help your classmates when they struggle.',
          correctValue:
            'you ought to help your classmates when they struggle',
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════
    // DAY 6 · Exercise 6 — Scenario-Based Production
    // Students apply all three modals to the Sarah and Tom scenarios.
    // Mix of writing (fill-in-blank), speaking (repeat model sentences)
    // and one MC context item.
    // ══════════════════════════════════════════════════════════════════
    {
      id: 'wb6_l1_d6',
      type: 'practice',
      exercises: [
        // ── Sarah scenario ──
        {
          id: 'wb6_l1_d6_e1',
          type: 'writing',
          instruction:
            'Read: "Sarah is overwhelmed with schoolwork and refuses to ask for help, thinking she must figure it all out on her own." — Fill in the blank with the correct modal for gentle everyday advice: "Sarah, you _____ talk to your teachers and ask for help."',
          displayValue:
            'Sarah, you _____ talk to your teachers and ask for help.',
          audioValue:
            'Sarah, you blank talk to your teachers and ask for help.',
          correctValue: 'should',
          isNewVocab: true,
        },
        {
          id: 'wb6_l1_d6_e2',
          type: 'writing',
          instruction:
            'Same situation — now use the modal that adds a moral sense of doing the right thing: "You _____ prioritize your tasks and break them into smaller, manageable steps."',
          displayValue:
            'You _____ prioritize your tasks and break them into smaller, manageable steps.',
          audioValue:
            'You blank prioritize your tasks and break them into smaller manageable steps.',
          correctValue: 'ought to',
        },
        {
          id: 'wb6_l1_d6_e3',
          type: 'speaking',
          instruction:
            'Listen and repeat: give Sarah the most urgent advice before she falls too far behind.',
          audioValue:
            'Sarah, you had better reach out to a tutor for extra support before you fall too far behind.',
          correctValue:
            'sarah you had better reach out to a tutor for extra support before you fall too far behind',
        },
        // ── Tom scenario ──
        {
          id: 'wb6_l1_d6_e4',
          type: 'writing',
          instruction:
            'Read: "Tom spends time with friends who negatively influence him and pull him away from his personal goals." — Fill in the blank with the modal that adds a moral sense: "Tom, you _____ set clear boundaries with those who negatively influence you."',
          displayValue:
            'Tom, you _____ set clear boundaries with those who negatively influence you.',
          audioValue:
            'Tom, you blank set clear boundaries with those who negatively influence you.',
          correctValue: 'ought to',
        },
        {
          id: 'wb6_l1_d6_e5',
          type: 'speaking',
          instruction:
            'Listen and repeat: give Tom the most urgent advice about his friendships.',
          audioValue:
            'Tom, you had better reconsider your current friendships before they lead you further away from what you want to achieve.',
          correctValue:
            'tom you had better reconsider your current friendships before they lead you further away from what you want to achieve',
        },
        // ── Context choice ──
        {
          id: 'wb6_l1_d6_e6',
          type: 'multiple-choice',
          instruction:
            'Tom has been saying he will change for months, but his situation keeps getting worse. Which sentence gives the most appropriate advice right now?',
          audioValue:
            'Tom\'s situation keeps getting worse. Which sentence is the most appropriate advice right now?',
          options: [
            'Tom, you should perhaps consider changing someday.',
            'Tom, you had better make changes now before it is too late.',
            'Tom, you ought to eventually improve your habits.',
            'Tom, you could try to change if you feel like it.',
          ],
          correctValue:
            'Tom, you had better make changes now before it is too late.',
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════
    // DAY 7 · Exercise 7 — Final Mixed Test  (type: 'review')
    // Reviews the full lesson: grammar structure, contextual choice,
    // correction, transformation, and fluency.
    // ══════════════════════════════════════════════════════════════════
    {
      id: 'wb6_l1_d7',
      type: 'review',
      exercises: [
        // ── Multiple choice (4) ──
        {
          id: 'wb6_l1_d7_e1',
          type: 'multiple-choice',
          instruction: 'Which sentence uses "had better" correctly?',
          audioValue: 'Which sentence uses had better correctly?',
          options: [
            'You had better to study for the exam.',
            'You had better study for the exam.',
            'You had better studying for the exam.',
            'You better to study for the exam.',
          ],
          correctValue: 'You had better study for the exam.',
          isNewVocab: true,
        },
        {
          id: 'wb6_l1_d7_e2',
          type: 'multiple-choice',
          instruction:
            'Your friend has not slept in two days and has a major exam tomorrow morning. Which advice is the most appropriate?',
          audioValue:
            'Which advice is most appropriate for someone who has not slept in two days?',
          options: [
            'You should probably rest a little tonight.',
            'You ought to try sleeping a bit earlier from now on.',
            'You had better get some rest right now.',
            'You could try sleeping earlier if you feel like it.',
          ],
          correctValue: 'You had better get some rest right now.',
        },
        {
          id: 'wb6_l1_d7_e3',
          type: 'multiple-choice',
          instruction:
            'You want to give a friendly, low-pressure suggestion to a tourist: "You ___ visit the old town while you are here." Choose the best modal.',
          audioValue:
            'Choose the best modal for a friendly low-pressure suggestion.',
          options: ['had better', 'ought better', 'should', 'had to'],
          correctValue: 'should',
        },
        {
          id: 'wb6_l1_d7_e4',
          type: 'multiple-choice',
          instruction: 'Which sentence uses "ought to" correctly?',
          audioValue: 'Which sentence uses ought to correctly?',
          options: [
            'She ought to listen carefully.',
            'She ought listen carefully.',
            'She ought to listening carefully.',
            'She oughts to listen carefully.',
          ],
          correctValue: 'She ought to listen carefully.',
        },
        // ── Writing (3) ──
        {
          id: 'wb6_l1_d7_e5',
          type: 'writing',
          instruction:
            'Fill in the blank with the modal that adds a moral tone: "You _____ listen carefully if you want to understand the instructions."',
          displayValue:
            'You _____ listen carefully if you want to understand the instructions.',
          audioValue:
            'You blank listen carefully if you want to understand the instructions.',
          correctValue: 'ought to',
        },
        {
          id: 'wb6_l1_d7_e6',
          type: 'writing',
          instruction:
            'Fix the grammar error and type the corrected full sentence: "You should to save some money each month."',
          displayValue: 'You should to save some money each month.',
          audioValue: 'You should to save some money each month.',
          correctValue: 'you should save some money each month',
        },
        {
          id: 'wb6_l1_d7_e7',
          type: 'writing',
          instruction:
            'Make the advice more urgent using "had better" — type the new sentence: "You should apologize before it is too late."',
          displayValue:
            'You should apologize before it is too late. → You had better ___',
          audioValue:
            'Rewrite using had better: You should apologize before it is too late.',
          correctValue: 'you had better apologize before it is too late',
        },
        // ── Speaking (1) ──
        {
          id: 'wb6_l1_d7_e8',
          type: 'speaking',
          instruction: 'Listen and repeat exactly.',
          audioValue:
            'You had better seek support now rather than wait until you are completely burnt out.',
          correctValue:
            'you had better seek support now rather than wait until you are completely burnt out',
        },
      ],
    },
  ],
};
