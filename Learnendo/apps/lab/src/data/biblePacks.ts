import type { QuestionPack } from '../types';

export const BIBLE_GENERAL_PACK: QuestionPack = {
  id: 'bible-general-1',
  title: 'Bible – General Knowledge',
  category: 'general',
  items: [
    {
      id: 'bg-1',
      category: 'general',
      question: 'How many books are in the Bible?',
      options: ['60', '66', '72', '39'],
      correctAnswer: '66',
      explanation: 'The Protestant Bible has 66 books: 39 OT + 27 NT.',
    },
    {
      id: 'bg-2',
      category: 'general',
      question: 'What is the first book of the Bible?',
      options: ['Exodus', 'Psalms', 'Genesis', 'Matthew'],
      correctAnswer: 'Genesis',
      reference: 'Genesis 1:1',
    },
    {
      id: 'bg-3',
      category: 'general',
      question: 'Who wrote most of the Psalms?',
      options: ['Solomon', 'Moses', 'David', 'Isaiah'],
      correctAnswer: 'David',
    },
    {
      id: 'bg-4',
      category: 'character',
      question: 'Who was swallowed by a great fish?',
      options: ['Elijah', 'Jonah', 'Daniel', 'Ezekiel'],
      correctAnswer: 'Jonah',
      reference: 'Jonah 1:17',
    },
    {
      id: 'bg-5',
      category: 'character',
      question: 'Who built the ark?',
      options: ['Abraham', 'Moses', 'Noah', 'Isaac'],
      correctAnswer: 'Noah',
      reference: 'Genesis 6',
    },
    {
      id: 'bg-6',
      category: 'place',
      question: 'Where was Jesus born?',
      options: ['Jerusalem', 'Nazareth', 'Bethlehem', 'Jericho'],
      correctAnswer: 'Bethlehem',
      reference: 'Matthew 2:1',
    },
    {
      id: 'bg-7',
      category: 'theme',
      question: 'What is the theme of the book of Proverbs?',
      options: ['Prophecy', 'Wisdom', 'Law', 'History'],
      correctAnswer: 'Wisdom',
    },
    {
      id: 'bg-8',
      category: 'book',
      question: 'How many Gospels are in the New Testament?',
      options: ['3', '4', '5', '6'],
      correctAnswer: '4',
      explanation: 'Matthew, Mark, Luke, John.',
    },
  ],
};

import { GENESIS_PACK } from './mock/bibleQuestionPack';
export { GENESIS_PACK };

export const QUESTION_PACKS: QuestionPack[] = [BIBLE_GENERAL_PACK, GENESIS_PACK];
