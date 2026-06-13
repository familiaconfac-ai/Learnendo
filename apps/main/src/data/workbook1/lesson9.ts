import { Lesson } from '../../types';

export const lesson9: Lesson = {
  id: 'wb1_l9',
  title: 'Lesson 9: Practical Speaking',
  days: [
    {
      id: 'wb1_l9_d1',
      type: 'practice',
      exercises: [
        { id: 'wb1_l9_d1_e1', type: 'identification', instruction: 'Choose the greeting.', audioValue: 'Good morning!', options: ['Good morning!', 'Goodbye!'], correctValue: 'Good morning!', translation: 'bom dia', isNewVocab: true },
        { id: 'wb1_l9_d1_e2', type: 'identification', instruction: 'Choose the polite expression.', audioValue: 'Please.', options: ['Please.', 'Sorry.'], correctValue: 'Please.', translation: 'por favor', isNewVocab: true },
        { id: 'wb1_l9_d1_e3', type: 'identification', instruction: 'Choose the polite expression.', audioValue: 'Thank you.', options: ['Thank you.', 'Excuse me.'], correctValue: 'Thank you.', translation: 'obrigado / obrigada', isNewVocab: true },
        { id: 'wb1_l9_d1_e4', type: 'identification', instruction: 'Choose the polite expression.', audioValue: "You're welcome.", options: ["You're welcome.", 'See you.'], correctValue: "You're welcome.", translation: 'de nada', isNewVocab: true },
        { id: 'wb1_l9_d1_e5', type: 'identification', instruction: 'Choose the classroom sentence.', audioValue: "I don't understand.", options: ["I don't understand.", 'I am ready.'], correctValue: "I don't understand.", translation: 'eu não entendo', isNewVocab: true },
        { id: 'wb1_l9_d1_e6', type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'Good morning. Please. Thank you. Excuse me.', correctValue: 'Good morning. Please. Thank you. Excuse me.' },
      ],
    },
    {
      id: 'wb1_l9_d2',
      type: 'practice',
      exercises: [
        { id: 'wb1_l9_d2_e1', type: 'writing', instruction: 'Complete the dialogue.', audioValue: 'My name is Ben.', correctValue: 'Ben', displayValue: 'My name is ______.' },
        { id: 'wb1_l9_d2_e2', type: 'writing', instruction: 'Complete the dialogue.', audioValue: 'I am ten years old.', correctValue: 'ten', displayValue: 'I am ______ years old.' },
        { id: 'wb1_l9_d2_e3', type: 'writing', instruction: 'Complete the dialogue.', audioValue: 'I am from Brazil.', correctValue: 'Brazil', displayValue: 'I am from ______.' },
        { id: 'wb1_l9_d2_e4', type: 'multiple-choice', instruction: 'Choose the correct answer.', audioValue: 'Are you a student?', options: ['Yes, I am.', 'My name is Ben.'], correctValue: 'Yes, I am.' },
        { id: 'wb1_l9_d2_e5', type: 'multiple-choice', instruction: 'Choose the correct answer.', audioValue: "I don't understand.", options: ['Please repeat.', 'Goodbye.'], correctValue: 'Please repeat.' },
        { id: 'wb1_l9_d2_e6', type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'What is your name? My name is Ben.', correctValue: 'What is your name? My name is Ben.' },
      ],
    },
    {
      id: 'wb1_l9_d3',
      type: 'practice',
      exercises: [
        { id: 'wb1_l9_d3_e1', type: 'identification', instruction: 'Choose the correct answer.', audioValue: 'What is your name?', options: ['My name is Ben.', 'I am ten years old.'], correctValue: 'My name is Ben.' },
        { id: 'wb1_l9_d3_e2', type: 'identification', instruction: 'Choose the correct answer.', audioValue: 'How old are you?', options: ['I am ten years old.', 'I am from Brazil.'], correctValue: 'I am ten years old.' },
        { id: 'wb1_l9_d3_e3', type: 'identification', instruction: 'Choose the correct answer.', audioValue: 'Where are you from?', options: ['I am from Brazil.', 'Yes, I am.'], correctValue: 'I am from Brazil.' },
        { id: 'wb1_l9_d3_e4', type: 'identification', instruction: 'Choose the correct answer.', audioValue: 'Can you repeat, please?', options: ['Yes, of course.', 'Good job.'], correctValue: 'Yes, of course.' },
        { id: 'wb1_l9_d3_e5', type: 'writing', instruction: 'Answer the question.', audioValue: 'Are you ready?', correctValue: 'Yes, I am.', displayValue: 'Are you ready? ______' },
        { id: 'wb1_l9_d3_e6', type: 'speaking', instruction: 'Ask and answer.', audioValue: 'How are you? I am fine, thank you.', correctValue: 'How are you? I am fine, thank you.' },
      ],
    },
    {
      id: 'wb1_l9_d4',
      type: 'practice',
      exercises: [
        { id: 'wb1_l9_d4_e1', type: 'speaking', instruction: 'Listen and repeat the dialogue.', audioValue: 'Teacher: Good morning. Ben: Good morning, teacher. Teacher: What is your name? Ben: My name is Ben. Teacher: How old are you? Ben: I am ten years old.', correctValue: 'Good morning. My name is Ben. I am ten years old.', displayValue: 'Teacher: Good morning.\nBen: Good morning, teacher.\nTeacher: What is your name?\nBen: My name is Ben.\nTeacher: How old are you?\nBen: I am ten years old.' },
        { id: 'wb1_l9_d4_e2', type: 'multiple-choice', instruction: 'Choose the correct answer from the dialogue.', audioValue: 'What is your name?', options: ['My name is Ben.', 'I am from Brazil.'], correctValue: 'My name is Ben.' },
        { id: 'wb1_l9_d4_e3', type: 'multiple-choice', instruction: 'Choose the correct answer from the dialogue.', audioValue: 'How old are you?', options: ['I am ten years old.', 'Yes, I am.'], correctValue: 'I am ten years old.' },
        { id: 'wb1_l9_d4_e4', type: 'writing', instruction: 'Complete the polite answer.', audioValue: 'Thank you.', correctValue: "You're welcome.", displayValue: 'Thank you. / ______' },
        { id: 'wb1_l9_d4_e5', type: 'writing', instruction: 'Complete the classroom sentence.', audioValue: 'I am finished.', correctValue: 'finished', displayValue: 'I am ______.' },
        { id: 'wb1_l9_d4_e6', type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: "I don't understand. Can you repeat, please?", correctValue: "I don't understand. Can you repeat, please?" },
      ],
    },
    {
      id: 'wb1_l9_d5',
      type: 'practice',
      exercises: [
        { id: 'wb1_l9_d5_e1', type: 'speaking', instruction: 'Say the sentence.', audioValue: 'Hello!', correctValue: 'Hello!' },
        { id: 'wb1_l9_d5_e2', type: 'speaking', instruction: 'Say the sentence.', audioValue: 'My name is Ben.', correctValue: 'My name is Ben.' },
        { id: 'wb1_l9_d5_e3', type: 'speaking', instruction: 'Say the sentence.', audioValue: 'I am from Brazil.', correctValue: 'I am from Brazil.' },
        { id: 'wb1_l9_d5_e4', type: 'speaking', instruction: 'Say the sentence.', audioValue: 'Please repeat.', correctValue: 'Please repeat.' },
        { id: 'wb1_l9_d5_e5', type: 'writing', instruction: 'Write a polite expression.', audioValue: 'Thank you.', correctValue: 'Thank you.' },
        { id: 'wb1_l9_d5_e6', type: 'writing', instruction: 'Write a polite answer.', audioValue: "You're welcome.", correctValue: "You're welcome." },
      ],
    },
    {
      id: 'wb1_l9_d6',
      type: 'practice',
      exercises: [
        { id: 'wb1_l9_d6_e1', type: 'speaking', instruction: 'Listen to the text.', audioValue: "Today is Ben's first day at Learnendo School. He is in the classroom. The teacher smiles and says, Good morning. Ben says, Good morning, teacher. The teacher asks, What is your name? Ben answers, My name is Ben. Then the teacher asks, How old are you? Ben says, I am ten years old. Anna is Ben's classmate. She says, Hi, Ben. Nice to meet you. Ben says, Nice to meet you too. Ben is happy. His teacher and classmates are kind.", correctValue: "Today is Ben's first day at Learnendo School.", displayValue: 'Reading: A New Student' },
        { id: 'wb1_l9_d6_e2', type: 'multiple-choice', instruction: 'Answer the question.', audioValue: "Is today Ben's first day?", options: ['Yes, it is.', 'No, it is not.'], correctValue: 'Yes, it is.' },
        { id: 'wb1_l9_d6_e3', type: 'multiple-choice', instruction: 'Answer the question.', audioValue: 'Where is Ben?', options: ['In the classroom.', 'At home.'], correctValue: 'In the classroom.' },
        { id: 'wb1_l9_d6_e4', type: 'multiple-choice', instruction: 'Answer the question.', audioValue: 'How old is Ben?', options: ['He is ten years old.', 'He is twelve years old.'], correctValue: 'He is ten years old.' },
        { id: 'wb1_l9_d6_e5', type: 'multiple-choice', instruction: 'Answer the question.', audioValue: 'Who is Anna?', options: ["Ben's classmate.", "Ben's teacher."], correctValue: "Ben's classmate." },
        { id: 'wb1_l9_d6_e6', type: 'writing', instruction: 'Complete the sentence.', audioValue: 'Ben is happy.', correctValue: 'happy', displayValue: 'Ben is ______.' },
      ],
    },
    {
      id: 'wb1_l9_d7',
      type: 'review',
      exercises: [
        { id: 'wb1_l9_d7_e1', type: 'multiple-choice', instruction: 'Choose the greeting.', audioValue: 'Good morning!', options: ['Good morning!', 'Goodbye!'], correctValue: 'Good morning!' },
        { id: 'wb1_l9_d7_e2', type: 'multiple-choice', instruction: 'Choose the polite answer.', audioValue: 'Thank you.', options: ["You're welcome.", 'Excuse me.'], correctValue: "You're welcome." },
        { id: 'wb1_l9_d7_e3', type: 'identification', instruction: 'Choose the correct answer.', audioValue: 'What is your name?', options: ['My name is Ben.', 'I am from Brazil.'], correctValue: 'My name is Ben.' },
        { id: 'wb1_l9_d7_e4', type: 'identification', instruction: 'Choose the correct answer.', audioValue: 'Where are you from?', options: ['I am from Brazil.', 'I am ten years old.'], correctValue: 'I am from Brazil.' },
        { id: 'wb1_l9_d7_e5', type: 'writing', instruction: 'Complete the sentence.', audioValue: 'Nice to meet you.', correctValue: 'meet', displayValue: 'Nice to ______ you.' },
        { id: 'wb1_l9_d7_e6', type: 'writing', instruction: 'Complete the sentence.', audioValue: 'Please repeat.', correctValue: 'repeat', displayValue: 'Please ______.' },
        { id: 'wb1_l9_d7_e7', type: 'speaking', instruction: 'Final speaking review.', audioValue: 'Hello. My name is Ben. I am ten years old. I am from Brazil. Thank you. You are welcome.', correctValue: 'Hello. My name is Ben. I am ten years old. I am from Brazil. Thank you. You are welcome.' },
      ],
    },
  ],
};
