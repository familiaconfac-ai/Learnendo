/**
 * English Lesson 1 – Introductions & Names
 *
 * Pedagogical theme: greeting someone, asking & giving names,
 * possessive pronouns (my / your / his / her / their),
 * singular vs plural patterns, formal vs informal register.
 *
 * Items include: multiple-choice, fill-in, true-false, listening (hideText),
 * and speaking (instruction to read aloud). Alternatives allow multiple
 * correct spellings / phrasings to be accepted.
 */
import type { LessonPack } from '../types';

export const EN_LESSON_1_RICH: LessonPack = {
  id: 'en-l1-rich',
  language: 'en',
  title: 'English L1 – Introductions & Names',
  description:
    'Greet someone, ask and give names, use my/your/his/her/their.',
  lessonNumber: 1,
  themes: ['greetings', 'introductions', 'names', 'possessive pronouns', 'singular & plural'],
  vocabulary: [
    { word: 'hello', translation: 'olá', type: 'phrase' },
    { word: 'hi', translation: 'oi', type: 'phrase' },
    { word: 'good morning', translation: 'bom dia', type: 'phrase' },
    { word: 'good afternoon', translation: 'boa tarde', type: 'phrase' },
    { word: 'good evening', translation: 'boa noite (chegando)', type: 'phrase' },
    { word: 'good night', translation: 'boa noite (despedida)', type: 'phrase' },
    { word: 'name', translation: 'nome', type: 'noun' },
    { word: 'nice to meet you', translation: 'prazer em te conhecer', type: 'phrase' },
    { word: 'my', translation: 'meu / minha', type: 'pronoun', example: 'My name is Ana.' },
    { word: 'your', translation: 'seu / sua / teu / tua', type: 'pronoun', example: "What's your name?" },
    { word: 'his', translation: 'dele', type: 'pronoun', example: 'His name is Carlos.' },
    { word: 'her', translation: 'dela', type: 'pronoun', example: 'Her name is Sofia.' },
    { word: 'their', translation: 'deles / delas', type: 'pronoun', example: 'Their names are Ana and Bruno.' },
  ],
  structures: [
    {
      pattern: "What's [POSS] name?",
      example: "What's your name?",
      variants: [
        "What's my name?",
        "What's your name?",
        "What's his name?",
        "What's her name?",
        "What are their names?",
      ],
      notes: 'Use "What ARE … names?" (plural) when asking about more than one person.',
    },
    {
      pattern: '[POSS] name is [NAME].',
      example: 'My name is Ana.',
      variants: [
        'My name is ___.',
        'Your name is ___.',
        'His name is ___.',
        'Her name is ___.',
        'Their names are ___ and ___.',
      ],
      notes: 'For groups: "are" + "names" (plural). "I\'m [NAME]" is an informal alternative to "My name is".',
    },
    {
      pattern: "I'm [NAME].",
      example: "I'm Carlos.",
      variants: [
        "I'm [NAME]. — informal, very common",
        'My name is [NAME]. — slightly more formal',
      ],
      notes: '"I\'m" is the contraction of "I am". Both forms are correct and interchangeable.',
    },
    {
      pattern: 'Nice to meet you!',
      example: 'Nice to meet you!',
      variants: [
        'Nice to meet you!',
        'Nice to meet you too!',
        'Pleased to meet you.',
      ],
      notes: 'Said ONLY when meeting someone for the first time. Reply: "Nice to meet you too!"',
    },
  ],
  items: [
    // ─── Block 1: Basic greetings ───────────────────────────────────────────

    {
      id: 'l1-01',
      type: 'multiple-choice',
      prompt: 'What is the most common informal greeting in English?',
      options: ['Good morning', 'Hi', 'How do you do?', 'Good evening'],
      correctAnswer: 'Hi',
      explanation: '"Hi" is casual and used among friends. "Hello" is slightly more formal.',
      audioText: 'What is the most common informal greeting in English?',
    },
    {
      id: 'l1-02',
      type: 'multiple-choice',
      prompt: 'Which greeting is used only in the morning?',
      options: ['Good night', 'Hello', 'Good morning', 'Good afternoon'],
      correctAnswer: 'Good morning',
      explanation: '"Good morning" is used until around noon.',
      audioText: 'Which greeting is used only in the morning?',
    },
    {
      id: 'l1-03',
      type: 'true-false',
      prompt: '"Good night" can be used as a greeting when meeting someone.',
      options: ['True', 'False'],
      correctAnswer: 'False',
      explanation:
        '"Good night" is a farewell (when leaving or going to sleep), NOT a greeting.',
    },

    // ─── Block 2: Asking for a name ─────────────────────────────────────────

    {
      id: 'l1-04',
      type: 'multiple-choice',
      prompt: 'How do you ask someone\'s name? Choose the correct sentence.',
      options: [
        "What's your name?",
        'Where is your name?',
        'How is your name?',
        'Who your name is?',
      ],
      correctAnswer: "What's your name?",
      audioText: "How do you ask someone's name?",
    },
    {
      id: 'l1-05',
      type: 'fill-in',
      prompt: 'Complete: "___ your name?" (asking for a name)',
      correctAnswer: "What's",
      alternatives: ['What is'],
      explanation: '"What\'s" is the contraction of "What is".',
      audioText: "What _____ your name?",
    },
    {
      id: 'l1-06',
      type: 'multiple-choice',
      prompt: 'Ana is talking to a new student. What does she say?',
      options: [
        "What's your name?",
        "What's his name?",
        "What's her name?",
        "What are their names?",
      ],
      correctAnswer: "What's your name?",
      explanation:
        'She is talking directly TO the student, so she uses "your".',
    },

    // ─── Block 3: Giving a name – I ─────────────────────────────────────────

    {
      id: 'l1-07',
      type: 'multiple-choice',
      prompt: 'How do you introduce yourself? What can you say?',
      options: [
        "My name is Carlos.",
        "His name is Carlos.",
        "Her name is Carlos.",
        "Your name is Carlos.",
      ],
      correctAnswer: "My name is Carlos.",
      explanation:
        '"My" refers to the speaker. Use it when introducing yourself.',
    },
    {
      id: 'l1-08',
      type: 'fill-in',
      prompt: 'Complete the introduction: "___ name is Ana." (she is introducing herself)',
      correctAnswer: 'My',
      explanation: 'The speaker uses "My" to refer to their own name.',
    },
    {
      id: 'l1-09',
      type: 'multiple-choice',
      prompt: 'Which two sentences both introduce the same person correctly?',
      options: [
        "My name is Lena / I'm Lena.",
        "My name is Lena / She's Lena.",
        "I'm Lena / Your name is Lena.",
        "His name is Lena / I'm Lena.",
      ],
      correctAnswer: "My name is Lena / I'm Lena.",
      explanation:
        '"My name is Lena" and "I\'m Lena" are both correct self-introductions.',
    },

    // ─── Block 4: Talking about others ──────────────────────────────────────

    {
      id: 'l1-10',
      type: 'multiple-choice',
      prompt: 'You want to ask about a boy\'s name. What do you say?',
      options: [
        "What's his name?",
        "What's her name?",
        "What's your name?",
        "What's their name?",
      ],
      correctAnswer: "What's his name?",
      explanation: '"His" refers to a male (boy/man).',
      audioText: "What is his name?",
    },
    {
      id: 'l1-11',
      type: 'multiple-choice',
      prompt: 'You want to ask about a girl\'s name. What do you say?',
      options: [
        "What's his name?",
        "What's her name?",
        "What's my name?",
        "What's their name?",
      ],
      correctAnswer: "What's her name?",
      explanation: '"Her" refers to a female (girl/woman).',
    },
    {
      id: 'l1-12',
      type: 'fill-in',
      prompt: '"___ name is Tom." (talking about a boy)',
      correctAnswer: 'His',
      explanation: 'Use "His" when talking about a boy or man.',
    },
    {
      id: 'l1-13',
      type: 'fill-in',
      prompt: '"___ name is Sofia." (talking about a girl)',
      correctAnswer: 'Her',
      explanation: 'Use "Her" when talking about a girl or woman.',
    },

    // ─── Block 5: Plural – their ─────────────────────────────────────────────

    {
      id: 'l1-14',
      type: 'multiple-choice',
      prompt: 'Two students are walking in. You want to ask their names. What do you say?',
      options: [
        "What are their names?",
        "What's his name?",
        "What's your name?",
        "What is their name?",
      ],
      correctAnswer: "What are their names?",
      explanation:
        'When asking about more than one person, use "are" + "names" (plural).',
    },
    {
      id: 'l1-15',
      type: 'true-false',
      prompt: '"Their names are Ana and Bruno" is a correct plural answer.',
      options: ['True', 'False'],
      correctAnswer: 'True',
      explanation: '"Their names are…" correctly introduces two or more people.',
    },
    {
      id: 'l1-16',
      type: 'fill-in',
      prompt:
        '"___ names are Carla and Diego." (two people, talking about them)',
      correctAnswer: 'Their',
      explanation: '"Their" is the plural possessive — used for groups.',
    },

    // ─── Block 6: Listening items ────────────────────────────────────────────

    {
      id: 'l1-17',
      type: 'listening',
      prompt: '(Listen and choose) What is being asked?',
      audioText: "What's your name?",
      hideText: true,
      options: [
        "What's your name?",
        "Where are you from?",
        "How old are you?",
        "What's his name?",
      ],
      correctAnswer: "What's your name?",
      voiceGender: 'female',
      voiceLang: 'en-US',
    },
    {
      id: 'l1-18',
      type: 'listening',
      prompt: '(Listen and choose) What is to be answered here?',
      audioText: "Hi! Nice to meet you. My name is Sarah. What's your name?",
      hideText: true,
      options: [
        "My name is ___. (give your name)",
        'I am from Brazil.',
        'Yes, please.',
        "She's at home.",
      ],
      correctAnswer: 'My name is ___. (give your name)',
      voiceGender: 'female',
      voiceLang: 'en-US',
      explanation:
        'Sarah introduced herself and asked for your name — the natural reply is "My name is…"',
    },

    // ─── Block 7: Speaking items ─────────────────────────────────────────────

    {
      id: 'l1-19',
      type: 'speaking',
      prompt: 'Read this sentence aloud: "Hi! My name is ___. Nice to meet you."',
      audioText: 'Hi! My name is blank. Nice to meet you.',
      correctAnswer: '__speaking__',
      explanation:
        'Practice saying this out loud with a natural speed and clear pronunciation.',
      voiceGender: 'female',
      voiceLang: 'en-US',
    },
    {
      id: 'l1-20',
      type: 'speaking',
      prompt: 'Read aloud: "What\'s your name? — My name is Ana. Nice to meet you, Ana!"',
      audioText: "What's your name? My name is Ana. Nice to meet you, Ana!",
      correctAnswer: '__speaking__',
      explanation:
        'This is a mini-dialogue. Try reading both parts aloud.',
      voiceGender: 'female',
      voiceLang: 'en-US',
    },

    // ─── Block 8: Formal introductions ──────────────────────────────────────

    {
      id: 'l1-21',
      type: 'true-false',
      prompt: '"How do you do?" requires the answer "Fine, thanks."',
      options: ['True', 'False'],
      correctAnswer: 'False',
      explanation:
        'The formal reply to "How do you do?" is also "How do you do?" — it\'s an exchange, not a question about health.',
    },
    {
      id: 'l1-22',
      type: 'multiple-choice',
      prompt: 'What does "Nice to meet you" mean?',
      options: [
        'It is pleasant meeting you for the first time.',
        'I want to fight you.',
        'You look nice today.',
        'I will see you later.',
      ],
      correctAnswer: 'It is pleasant meeting you for the first time.',
      explanation: '"Nice to meet you" is said when being introduced for the first time.',
    },
    {
      id: 'l1-23',
      type: 'fill-in',
      prompt: 'Complete a formal first-time reply: "Nice ___ meet you too!"',
      correctAnswer: 'to',
      explanation: '"Nice to meet you too" is the standard response.',
    },

    // ─── Block 9: Mixed review ────────────────────────────────────────────────

    {
      id: 'l1-24',
      type: 'multiple-choice',
      prompt: 'Marco asks: "What\'s his name?" pointing at a boy. Which answer fits?',
      options: [
        'His name is Pedro.',
        'My name is Pedro.',
        'Your name is Pedro.',
        'Her name is Pedro.',
      ],
      correctAnswer: 'His name is Pedro.',
    },
    {
      id: 'l1-25',
      type: 'multiple-choice',
      prompt: 'Complete: "___ name is Júlia." (talking about a classmate — a girl)',
      options: ['My', 'His', 'Her', 'Their'],
      correctAnswer: 'Her',
    },
    {
      id: 'l1-26',
      type: 'fill-in',
      prompt: '"Hi, I\'m Carlos. ___ to meet you!" (a polite first-meeting phrase)',
      correctAnswer: 'Nice',
      alternatives: ['Pleased', 'Good'],
      explanation: '"Nice to meet you" is the most common phrase.',
    },
    {
      id: 'l1-27',
      type: 'multiple-choice',
      prompt: 'Which sentence correctly introduces TWO people?',
      options: [
        "Their names are Ana and Bruno.",
        "His names are Ana and Bruno.",
        "My names is Ana and Bruno.",
        "Her name are Ana and Bruno.",
      ],
      correctAnswer: "Their names are Ana and Bruno.",
      explanation: '"Their names are…" is correct for introducing two or more people.',
    },
    {
      id: 'l1-28',
      type: 'listening',
      prompt: '(Listen) Which possessive pronoun do you hear?',
      audioText: 'Her name is Olivia.',
      hideText: true,
      options: ['My', 'His', 'Her', 'Their'],
      correctAnswer: 'Her',
      voiceGender: 'female',
      voiceLang: 'en-US',
    },
  ],
};
