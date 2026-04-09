import type { LessonPack } from '../types';

// ─── English ─────────────────────────────────────────────────────────────────

export const ENGLISH_LESSON_1: LessonPack = {
  id: 'en-lesson-1',
  language: 'en',
  title: 'English – Everyday Greetings',
  description: 'Basic phrases for daily conversations.',
  items: [
    {
      id: 'en-1-1',
      type: 'multiple-choice',
      prompt: 'Which phrase means "Good morning"?',
      options: ['Good night', 'Good morning', 'See you later', 'How are you?'],
      correctAnswer: 'Good morning',
      explanation: '"Good morning" is used as a greeting before noon.',
    },
    {
      id: 'en-1-2',
      type: 'multiple-choice',
      prompt: 'Complete: "Nice to ___ you."',
      options: ['meet', 'see', 'hear', 'know'],
      correctAnswer: 'meet',
      explanation: '"Nice to meet you" is the standard first-time greeting.',
    },
    {
      id: 'en-1-3',
      type: 'true-false',
      prompt: '"How do you do?" is a formal greeting.',
      options: ['True', 'False'],
      correctAnswer: 'True',
    },
    {
      id: 'en-1-4',
      type: 'multiple-choice',
      prompt: 'What is the response to "How are you?"',
      options: ["I'm fine, thanks.", 'Yes, please.', 'Tomorrow.', 'It was great.'],
      correctAnswer: "I'm fine, thanks.",
    },
    {
      id: 'en-1-5',
      type: 'fill-in',
      prompt: 'Complete: "See you ___!" (a common farewell).',
      correctAnswer: 'later',
      explanation: '"See you later!" is a casual farewell.',
    },
    {
      id: 'en-1-6',
      type: 'multiple-choice',
      prompt: 'Which word means the opposite of "hello"?',
      options: ['Goodbye', 'Please', 'Thank you', 'Sorry'],
      correctAnswer: 'Goodbye',
    },
    {
      id: 'en-1-7',
      type: 'true-false',
      prompt: '"Good evening" is used after sunset.',
      options: ['True', 'False'],
      correctAnswer: 'True',
    },
    {
      id: 'en-1-8',
      type: 'multiple-choice',
      prompt: 'What does "Excuse me" express?',
      options: ['Greeting', 'Apology / getting attention', 'Farewell', 'Agreement'],
      correctAnswer: 'Apology / getting attention',
      explanation: '"Excuse me" is used to politely interrupt or apologise.',
    },
    {
      id: 'en-1-9',
      type: 'fill-in',
      prompt: 'Complete: "___ your name?" (asking for someone\'s name).',
      correctAnswer: "What's",
      explanation: '"What\'s your name?" is the standard way to ask.',
    },
    {
      id: 'en-1-10',
      type: 'multiple-choice',
      prompt: 'Which sentence introduces yourself?',
      options: [
        "I'm Sarah.",
        'Where are you from?',
        'Nice weather today.',
        'See you soon.',
      ],
      correctAnswer: "I'm Sarah.",
      explanation: '"I\'m [name]." is the simplest way to introduce yourself.',
    },
  ],
};

export const ENGLISH_LESSON_2: LessonPack = {
  id: 'en-lesson-2',
  language: 'en',
  title: 'English – Numbers & Time',
  description: 'Counting and telling the time in English.',
  items: [
    {
      id: 'en-2-1',
      type: 'multiple-choice',
      prompt: 'How do you say 15 in English?',
      options: ['Fifty', 'Fifteen', 'Five', 'Fiveteen'],
      correctAnswer: 'Fifteen',
    },
    {
      id: 'en-2-2',
      type: 'fill-in',
      prompt: 'Write the word for the number 3.',
      correctAnswer: 'three',
    },
    {
      id: 'en-2-3',
      type: 'multiple-choice',
      prompt: '"It\'s half past two" means…',
      options: ['2:00', '2:15', '2:30', '2:45'],
      correctAnswer: '2:30',
      explanation: '"Half past" means 30 minutes past the hour.',
    },
    {
      id: 'en-2-4',
      type: 'true-false',
      prompt: '"Quarter to three" means 2:45.',
      options: ['True', 'False'],
      correctAnswer: 'True',
    },
    {
      id: 'en-2-5',
      type: 'multiple-choice',
      prompt: 'What comes after "nineteen" when counting?',
      options: ['Twenty', 'Ninety', 'Twelve', 'Eighteen'],
      correctAnswer: 'Twenty',
    },
    {
      id: 'en-2-6',
      type: 'fill-in',
      prompt: 'Write the number after 99 in words.',
      correctAnswer: 'one hundred',
    },
    {
      id: 'en-2-7',
      type: 'multiple-choice',
      prompt: 'Which is the correct ordinal for 1st?',
      options: ['Oneth', 'First', 'Oneest', 'Oner'],
      correctAnswer: 'First',
    },
    {
      id: 'en-2-8',
      type: 'multiple-choice',
      prompt: '"A.M." refers to…',
      options: ['After midnight – before noon', 'After noon', 'Any moment', 'Midday'],
      correctAnswer: 'After midnight – before noon',
    },
    {
      id: 'en-2-9',
      type: 'true-false',
      prompt: '"Dozen" means twelve.',
      options: ['True', 'False'],
      correctAnswer: 'True',
    },
    {
      id: 'en-2-10',
      type: 'multiple-choice',
      prompt: 'How many days are in a fortnight?',
      options: ['7', '10', '14', '30'],
      correctAnswer: '14',
      explanation: 'A fortnight = two weeks = 14 days.',
    },
  ],
};

// ─── Portuguese ───────────────────────────────────────────────────────────────

export const PORTUGUESE_LESSON_1: LessonPack = {
  id: 'pt-lesson-1',
  language: 'pt',
  title: 'Português – Cumprimentos',
  description: 'Frases básicas do dia a dia.',
  items: [
    {
      id: 'pt-1-1',
      type: 'multiple-choice',
      prompt: 'O que significa "Bom dia"?',
      options: ['Good night', 'Good morning', 'Good afternoon', 'See you'],
      correctAnswer: 'Good morning',
    },
    {
      id: 'pt-1-2',
      type: 'multiple-choice',
      prompt: 'Como se diz "How are you?" em português?',
      options: ['Boa noite', 'Tudo bem?', 'Até logo', 'Obrigado'],
      correctAnswer: 'Tudo bem?',
    },
    {
      id: 'pt-1-3',
      type: 'true-false',
      prompt: '"Obrigado" é uma forma de agradecimento.',
      options: ['Verdadeiro', 'Falso'],
      correctAnswer: 'Verdadeiro',
    },
    {
      id: 'pt-1-4',
      type: 'multiple-choice',
      prompt: 'Como se diz "Good night" em português?',
      options: ['Bom dia', 'Boa tarde', 'Boa noite', 'Até amanhã'],
      correctAnswer: 'Boa noite',
    },
    {
      id: 'pt-1-5',
      type: 'fill-in',
      prompt: 'Complete: "Meu nome ___ João."',
      correctAnswer: 'é',
      explanation: 'O verbo ser conjugado na 3ª pessoa do singular é "é".',
    },
    {
      id: 'pt-1-6',
      type: 'multiple-choice',
      prompt: 'O que significa "Por favor"?',
      options: ['Thank you', 'Please', 'Sorry', 'Excuse me'],
      correctAnswer: 'Please',
    },
    {
      id: 'pt-1-7',
      type: 'true-false',
      prompt: '"Até logo" e "Tchau" têm sentido parecido.',
      options: ['Verdadeiro', 'Falso'],
      correctAnswer: 'Verdadeiro',
    },
    {
      id: 'pt-1-8',
      type: 'multiple-choice',
      prompt: 'Qual é a resposta mais comum para "Tudo bem?"?',
      options: ['Bom dia', 'Tudo bem, e você?', 'Desculpe', 'Com licença'],
      correctAnswer: 'Tudo bem, e você?',
    },
    {
      id: 'pt-1-9',
      type: 'multiple-choice',
      prompt: 'Como se pergunta o nome de alguém em português?',
      options: [
        'Onde você mora?',
        'Qual é o seu nome?',
        'Quantos anos você tem?',
        'Como você está?',
      ],
      correctAnswer: 'Qual é o seu nome?',
    },
    {
      id: 'pt-1-10',
      type: 'fill-in',
      prompt: 'Complete a despedida: "Até ___!"',
      correctAnswer: 'logo',
      explanation: '"Até logo" significa "See you soon".',
    },
  ],
};

// ─── Spanish ──────────────────────────────────────────────────────────────────

export const SPANISH_LESSON_1: LessonPack = {
  id: 'es-lesson-1',
  language: 'es',
  title: 'Español – Saludos Básicos',
  description: 'Frases esenciales para presentarse y saludar.',
  items: [
    {
      id: 'es-1-1',
      type: 'multiple-choice',
      prompt: '¿Qué significa "Buenos días"?',
      options: ['Good night', 'Good afternoon', 'Good morning', 'See you'],
      correctAnswer: 'Good morning',
    },
    {
      id: 'es-1-2',
      type: 'multiple-choice',
      prompt: '¿Cómo se dice "What is your name?" en español?',
      options: [
        '¿Cómo estás?',
        '¿Cuántos años tienes?',
        '¿Cómo te llamas?',
        '¿De dónde eres?',
      ],
      correctAnswer: '¿Cómo te llamas?',
    },
    {
      id: 'es-1-3',
      type: 'true-false',
      prompt: '"Mucho gusto" se usa al conocer a alguien por primera vez.',
      options: ['Verdadero', 'Falso'],
      correctAnswer: 'Verdadero',
      explanation: '"Mucho gusto" ≈ "Nice to meet you".',
    },
    {
      id: 'es-1-4',
      type: 'multiple-choice',
      prompt: '¿Qué significa "Gracias"?',
      options: ['Please', 'Sorry', 'Thank you', 'Excuse me'],
      correctAnswer: 'Thank you',
    },
    {
      id: 'es-1-5',
      type: 'fill-in',
      prompt: 'Completa: "Me ___ María." (My name is María.)',
      correctAnswer: 'llamo',
      explanation: '"Me llamo" uses the reflexive verb "llamarse".',
    },
    {
      id: 'es-1-6',
      type: 'multiple-choice',
      prompt: '¿Cuál es la respuesta correcta a "¿Cómo estás?"?',
      options: ['Sí, gracias.', 'Estoy bien, gracias.', 'Hasta luego.', 'Por favor.'],
      correctAnswer: 'Estoy bien, gracias.',
    },
    {
      id: 'es-1-7',
      type: 'true-false',
      prompt: '"Por favor" se usa para pedir algo amablemente.',
      options: ['Verdadero', 'Falso'],
      correctAnswer: 'Verdadero',
    },
    {
      id: 'es-1-8',
      type: 'multiple-choice',
      prompt: '¿Qué significa "Hasta luego"?',
      options: ['Good morning', 'See you later', 'How are you?', 'I am sorry'],
      correctAnswer: 'See you later',
    },
    {
      id: 'es-1-9',
      type: 'multiple-choice',
      prompt: '"De nada" is a response to…',
      options: ['Hola', 'Gracias', 'Adiós', 'Por favor'],
      correctAnswer: 'Gracias',
      explanation: '"De nada" = "You\'re welcome", said after being thanked.',
    },
    {
      id: 'es-1-10',
      type: 'fill-in',
      prompt: 'Completa: "___ favor, ¿dónde está el baño?" (Please, where is the bathroom?)',
      correctAnswer: 'Por',
    },
  ],
};

// ─── Greek (Biblical / Modern) ────────────────────────────────────────────────

export const GREEK_LESSON_1: LessonPack = {
  id: 'el-lesson-1',
  language: 'el',
  title: 'Greek – The Alphabet & Basics',
  description: 'Essential letters, sounds and common words.',
  items: [
    {
      id: 'el-1-1',
      type: 'multiple-choice',
      prompt: 'Which letter is the Greek equivalent of "A"?',
      options: ['Β (Beta)', 'Α (Alpha)', 'Δ (Delta)', 'Ε (Epsilon)'],
      correctAnswer: 'Α (Alpha)',
    },
    {
      id: 'el-1-2',
      type: 'multiple-choice',
      prompt: 'What sound does "Φ" (Phi) make?',
      options: ['p', 'b', 'f', 'v'],
      correctAnswer: 'f',
      explanation: 'Φ sounds like "f" as in "phone".',
    },
    {
      id: 'el-1-3',
      type: 'true-false',
      prompt: 'The Greek word "λόγος" (logos) means "word" or "reason".',
      options: ['True', 'False'],
      correctAnswer: 'True',
    },
    {
      id: 'el-1-4',
      type: 'multiple-choice',
      prompt: 'What does "ἀγάπη" (agape) mean?',
      options: ['Faith', 'Hope', 'Love', 'Peace'],
      correctAnswer: 'Love',
      explanation: 'ἀγάπη is the highest form of love in the New Testament.',
    },
    {
      id: 'el-1-5',
      type: 'fill-in',
      prompt: 'The first letter of the Greek alphabet is ___.',
      correctAnswer: 'Alpha',
    },
    {
      id: 'el-1-6',
      type: 'multiple-choice',
      prompt: 'The last letter of the Greek alphabet is…',
      options: ['Omega (Ω)', 'Sigma (Σ)', 'Psi (Ψ)', 'Chi (Χ)'],
      correctAnswer: 'Omega (Ω)',
      explanation: 'God says "I am the Alpha and the Omega" (Rev 1:8).',
    },
    {
      id: 'el-1-7',
      type: 'true-false',
      prompt: '"Χριστός" (Christos) means "Anointed One".',
      options: ['True', 'False'],
      correctAnswer: 'True',
    },
    {
      id: 'el-1-8',
      type: 'multiple-choice',
      prompt: 'What does "πίστις" (pistis) mean in Greek?',
      options: ['Grace', 'Faith', 'Truth', 'Light'],
      correctAnswer: 'Faith',
    },
    {
      id: 'el-1-9',
      type: 'multiple-choice',
      prompt: 'How many letters are in the Greek alphabet?',
      options: ['24', '22', '26', '20'],
      correctAnswer: '24',
    },
    {
      id: 'el-1-10',
      type: 'fill-in',
      prompt: '"εὐαγγέλιον" (euangelion) means ___.',
      correctAnswer: 'gospel',
      explanation: 'It literally means "good news" — the root of "evangelical".',
    },
  ],
};

// ─── Hebrew (Biblical) ────────────────────────────────────────────────────────

export const HEBREW_LESSON_1: LessonPack = {
  id: 'he-lesson-1',
  language: 'he',
  title: 'Hebrew – Biblical Basics',
  description: 'Key words and concepts from Biblical Hebrew.',
  items: [
    {
      id: 'he-1-1',
      type: 'multiple-choice',
      prompt: 'What is the first word of the Bible in Hebrew?',
      options: ['שָׁלוֹם (Shalom)', 'בְּרֵאשִׁית (Bereshit)', 'אֱלֹהִים (Elohim)', 'אָמֵן (Amen)'],
      correctAnswer: 'בְּרֵאשִׁית (Bereshit)',
      explanation: '"Bereshit" means "In the beginning" (Genesis 1:1).',
    },
    {
      id: 'he-1-2',
      type: 'multiple-choice',
      prompt: 'What does "שָׁלוֹם" (Shalom) mean?',
      options: ['Amen', 'Praise', 'Peace', 'Lord'],
      correctAnswer: 'Peace',
    },
    {
      id: 'he-1-3',
      type: 'true-false',
      prompt: 'Hebrew is written and read from right to left.',
      options: ['True', 'False'],
      correctAnswer: 'True',
    },
    {
      id: 'he-1-4',
      type: 'multiple-choice',
      prompt: '"אֱלֹהִים" (Elohim) is the Hebrew word for…',
      options: ['Man', 'Earth', 'God', 'Heaven'],
      correctAnswer: 'God',
    },
    {
      id: 'he-1-5',
      type: 'fill-in',
      prompt: '"Hallelujah" comes from Hebrew and means "Praise ___".',
      correctAnswer: 'Yah',
      explanation: '"Hallelu" = praise (plural command); "Yah" = short form of YHWH.',
    },
    {
      id: 'he-1-6',
      type: 'multiple-choice',
      prompt: 'How many letters are in the Hebrew alphabet?',
      options: ['22', '24', '26', '28'],
      correctAnswer: '22',
    },
    {
      id: 'he-1-7',
      type: 'true-false',
      prompt: '"Torah" (תּוֹרָה) means "Law" or "Instruction".',
      options: ['True', 'False'],
      correctAnswer: 'True',
    },
    {
      id: 'he-1-8',
      type: 'multiple-choice',
      prompt: 'What does "אָמֵן" (Amen) express?',
      options: ['A question', 'A farewell', 'Agreement / So be it', 'A greeting'],
      correctAnswer: 'Agreement / So be it',
    },
    {
      id: 'he-1-9',
      type: 'multiple-choice',
      prompt: '"Mashiach" (מָשִׁיחַ) is Hebrew for…',
      options: ['Prophet', 'Priest', 'Messiah / Anointed', 'King'],
      correctAnswer: 'Messiah / Anointed',
    },
    {
      id: 'he-1-10',
      type: 'fill-in',
      prompt: 'The Hebrew word for "love" is אַהֲבָה — pronounced ___.',
      correctAnswer: 'ahavah',
      explanation: 'אַהֲבָה (ahavah) is the primary Hebrew word for love.',
    },
  ],
};

// ─── Re-export mock packs ─────────────────────────────────────────────────────
import { ENGLISH_LESSON_4 } from './mock/languageLessonPack';
export { ENGLISH_LESSON_4 };

import { EN_LESSON_1_RICH } from './lesson1Rich';
export { EN_LESSON_1_RICH };

// ─── Aggregated list ──────────────────────────────────────────────────────────
export const LANGUAGE_PACKS: LessonPack[] = [
  EN_LESSON_1_RICH,
  ENGLISH_LESSON_1,
  ENGLISH_LESSON_2,
  ENGLISH_LESSON_4,
  PORTUGUESE_LESSON_1,
  SPANISH_LESSON_1,
  GREEK_LESSON_1,
  HEBREW_LESSON_1,
];
