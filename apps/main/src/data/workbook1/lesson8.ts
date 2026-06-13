import { Lesson } from '../../types';

export const lesson8: Lesson = {
  id: 'wb1_l8',
  title: 'Lesson 8: Spoken Patterns',
  days: [
    {
      id: 'wb1_l8_d1',
      type: 'practice',
      exercises: [
        { id: 'wb1_l8_d1_e1', type: 'identification', instruction: 'Choose the contraction.', audioValue: 'I am happy.', options: ["I'm happy.", 'I happy.'], correctValue: "I'm happy.", translation: "I'm = eu sou / eu estou", isNewVocab: true },
        { id: 'wb1_l8_d1_e2', type: 'identification', instruction: 'Choose the contraction.', audioValue: 'You are ready.', options: ["You're ready.", 'You ready.'], correctValue: "You're ready.", translation: "You're = você é / está", isNewVocab: true },
        { id: 'wb1_l8_d1_e3', type: 'identification', instruction: 'Choose the contraction.', audioValue: 'He is my friend.', options: ["He's my friend.", 'He are my friend.'], correctValue: "He's my friend.", translation: "He's = ele é / está", isNewVocab: true },
        { id: 'wb1_l8_d1_e4', type: 'identification', instruction: 'Choose the contraction.', audioValue: 'She is at school.', options: ["She's at school.", 'She are at school.'], correctValue: "She's at school.", translation: "She's = ela é / está", isNewVocab: true },
        { id: 'wb1_l8_d1_e5', type: 'identification', instruction: 'Choose the contraction.', audioValue: 'It is Monday.', options: ["It's Monday.", 'Its Monday.'], correctValue: "It's Monday.", translation: "It's = é / está", isNewVocab: true },
        { id: 'wb1_l8_d1_e6', type: 'identification', instruction: 'Choose the contraction.', audioValue: 'We are students.', options: ["We're students.", 'We is students.'], correctValue: "We're students.", translation: "We're = nós somos / estamos", isNewVocab: true },
        { id: 'wb1_l8_d1_e7', type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: "I'm happy. You're ready. He's my friend. She's at school.", correctValue: "I'm happy. You're ready. He's my friend. She's at school." },
      ],
    },
    {
      id: 'wb1_l8_d2',
      type: 'practice',
      exercises: [
        { id: 'wb1_l8_d2_e1', type: 'multiple-choice', instruction: 'Complete the sentence.', audioValue: 'He is not sad.', options: ["He isn't sad.", "He aren't sad."], correctValue: "He isn't sad.", translation: "isn't = não é / não está", isNewVocab: true },
        { id: 'wb1_l8_d2_e2', type: 'multiple-choice', instruction: 'Complete the sentence.', audioValue: 'She is not late.', options: ["She isn't late.", "She aren't late."], correctValue: "She isn't late." },
        { id: 'wb1_l8_d2_e3', type: 'multiple-choice', instruction: 'Complete the sentence.', audioValue: 'We are not at home.', options: ["We aren't at home.", "We isn't at home."], correctValue: "We aren't at home.", translation: "aren't = não são / não estão", isNewVocab: true },
        { id: 'wb1_l8_d2_e4', type: 'multiple-choice', instruction: 'Complete the sentence.', audioValue: 'They are not ready.', options: ["They aren't ready.", "They isn't ready."], correctValue: "They aren't ready." },
        { id: 'wb1_l8_d2_e5', type: 'writing', instruction: 'Write the missing contraction.', audioValue: 'I am not tired.', correctValue: "I'm not", displayValue: '______ tired.' },
        { id: 'wb1_l8_d2_e6', type: 'writing', instruction: 'Write the missing contraction.', audioValue: 'It is not Sunday.', correctValue: "isn't", displayValue: "It ______ Sunday." },
        { id: 'wb1_l8_d2_e7', type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: "I'm not tired. He isn't sad. They aren't ready.", correctValue: "I'm not tired. He isn't sad. They aren't ready." },
      ],
    },
    {
      id: 'wb1_l8_d3',
      type: 'practice',
      exercises: [
        { id: 'wb1_l8_d3_e1', type: 'identification', instruction: 'Choose the correct answer.', audioValue: 'Are you ready?', options: ['Yes, I am.', 'Yes, I is.'], correctValue: 'Yes, I am.' },
        { id: 'wb1_l8_d3_e2', type: 'identification', instruction: 'Choose the correct answer.', audioValue: 'Are you tired?', options: ["No, I'm not.", "No, I aren't."], correctValue: "No, I'm not." },
        { id: 'wb1_l8_d3_e3', type: 'identification', instruction: 'Choose the correct answer.', audioValue: 'Is he happy?', options: ['Yes, he is.', 'Yes, he are.'], correctValue: 'Yes, he is.' },
        { id: 'wb1_l8_d3_e4', type: 'identification', instruction: 'Choose the correct answer.', audioValue: 'Is she late?', options: ["No, she isn't.", "No, she aren't."], correctValue: "No, she isn't." },
        { id: 'wb1_l8_d3_e5', type: 'identification', instruction: 'Choose the correct answer.', audioValue: 'Are they ready?', options: ['Yes, they are.', 'Yes, they is.'], correctValue: 'Yes, they are.' },
        { id: 'wb1_l8_d3_e6', type: 'writing', instruction: 'Answer the question.', audioValue: 'Is he sad?', correctValue: "No, he isn't.", displayValue: 'Is he sad? ______' },
        { id: 'wb1_l8_d3_e7', type: 'speaking', instruction: 'Ask and answer.', audioValue: 'Are you ready? Yes, I am.', correctValue: 'Are you ready? Yes, I am.' },
      ],
    },
    {
      id: 'wb1_l8_d4',
      type: 'practice',
      exercises: [
        { id: 'wb1_l8_d4_e1', type: 'speaking', instruction: 'Listen and repeat the dialogue.', audioValue: "Teacher: Are you ready? Students: Yes, we are. Ben: I'm ready too. Anna: I'm not tired today.", correctValue: "Are you ready? Yes, we are. I'm ready too. I'm not tired today.", displayValue: "Teacher: Are you ready?\nStudents: Yes, we are.\nBen: I'm ready too.\nAnna: I'm not tired today." },
        { id: 'wb1_l8_d4_e2', type: 'multiple-choice', instruction: 'Choose the correct answer from the dialogue.', audioValue: 'Are the students ready?', options: ['Yes, they are.', 'No, they are not.'], correctValue: 'Yes, they are.' },
        { id: 'wb1_l8_d4_e3', type: 'multiple-choice', instruction: 'Choose the correct answer from the dialogue.', audioValue: 'Is Anna tired today?', options: ["No, she isn't.", 'Yes, she is.'], correctValue: "No, she isn't." },
        { id: 'wb1_l8_d4_e4', type: 'writing', instruction: 'Complete the sentence.', audioValue: 'He is here.', correctValue: "He's", displayValue: '______ here.' },
        { id: 'wb1_l8_d4_e5', type: 'writing', instruction: 'Complete the sentence.', audioValue: 'They are in class.', correctValue: "They're", displayValue: '______ in class.' },
        { id: 'wb1_l8_d4_e6', type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: "He's here. They aren't late. They're in class.", correctValue: "He's here. They aren't late. They're in class." },
      ],
    },
    {
      id: 'wb1_l8_d5',
      type: 'practice',
      exercises: [
        { id: 'wb1_l8_d5_e1', type: 'speaking', instruction: 'Say the sentence.', audioValue: "I'm happy.", correctValue: "I'm happy.", displayValue: 'I am happy. -> ______' },
        { id: 'wb1_l8_d5_e2', type: 'speaking', instruction: 'Say the sentence.', audioValue: "You're ready.", correctValue: "You're ready.", displayValue: 'You are ready. -> ______' },
        { id: 'wb1_l8_d5_e3', type: 'speaking', instruction: 'Say the sentence.', audioValue: "He isn't sad.", correctValue: "He isn't sad.", displayValue: 'He is not sad. -> ______' },
        { id: 'wb1_l8_d5_e4', type: 'speaking', instruction: 'Say the sentence.', audioValue: "We aren't at home.", correctValue: "We aren't at home.", displayValue: 'We are not at home. -> ______' },
        { id: 'wb1_l8_d5_e5', type: 'writing', instruction: 'Write a short answer.', audioValue: 'Are you ready?', correctValue: 'Yes, I am.', displayValue: 'Are you ready? ______' },
        { id: 'wb1_l8_d5_e6', type: 'writing', instruction: 'Write a short answer.', audioValue: 'Are you tired?', correctValue: "No, I'm not.", displayValue: 'Are you tired? ______' },
      ],
    },
    {
      id: 'wb1_l8_d6',
      type: 'practice',
      exercises: [
        { id: 'wb1_l8_d6_e1', type: 'speaking', instruction: 'Listen to the text.', audioValue: "Today is Monday. Ben and Anna are in class. They are not late. They're ready for English. Ben says, Yes, I am. I'm ready. Anna says, I'm ready too. I'm not tired today. Lucas is happy. He isn't sad. They're all in class, and they're happy to learn English.", correctValue: "Today is Monday. Ben and Anna are in class. They're ready for English.", displayValue: "Reading: We're Ready" },
        { id: 'wb1_l8_d6_e2', type: 'multiple-choice', instruction: 'Answer the question.', audioValue: 'What day is it?', options: ['Monday', 'Sunday'], correctValue: 'Monday' },
        { id: 'wb1_l8_d6_e3', type: 'multiple-choice', instruction: 'Answer the question.', audioValue: 'Are Ben and Anna in class?', options: ['Yes, they are.', 'No, they are not.'], correctValue: 'Yes, they are.' },
        { id: 'wb1_l8_d6_e4', type: 'multiple-choice', instruction: 'Answer the question.', audioValue: 'Are they late?', options: ['No, they are not.', 'Yes, they are.'], correctValue: 'No, they are not.' },
        { id: 'wb1_l8_d6_e5', type: 'multiple-choice', instruction: 'Answer the question.', audioValue: 'Is Lucas happy?', options: ['Yes, he is.', 'No, he is not.'], correctValue: 'Yes, he is.' },
        { id: 'wb1_l8_d6_e6', type: 'writing', instruction: 'Complete the sentence.', audioValue: 'They are happy to learn English.', correctValue: 'happy', displayValue: 'They are ______ to learn English.' },
      ],
    },
    {
      id: 'wb1_l8_d7',
      type: 'review',
      exercises: [
        { id: 'wb1_l8_d7_e1', type: 'multiple-choice', instruction: 'Choose the contraction.', audioValue: 'We are students.', options: ["We're students.", "We's students."], correctValue: "We're students." },
        { id: 'wb1_l8_d7_e2', type: 'multiple-choice', instruction: 'Choose the negative contraction.', audioValue: 'They are not ready.', options: ["They aren't ready.", "They isn't ready."], correctValue: "They aren't ready." },
        { id: 'wb1_l8_d7_e3', type: 'identification', instruction: 'Choose the correct answer.', audioValue: 'Is she late?', options: ["No, she isn't.", 'Yes, she are.'], correctValue: "No, she isn't." },
        { id: 'wb1_l8_d7_e4', type: 'identification', instruction: 'Choose the correct answer.', audioValue: 'Are you tired?', options: ["No, I'm not.", 'No, I am sad.'], correctValue: "No, I'm not." },
        { id: 'wb1_l8_d7_e5', type: 'writing', instruction: 'Write the missing contraction.', audioValue: 'He is my friend.', correctValue: "He's", displayValue: '______ my friend.' },
        { id: 'wb1_l8_d7_e6', type: 'writing', instruction: 'Write the missing contraction.', audioValue: 'It is not Sunday.', correctValue: "isn't", displayValue: "It ______ Sunday." },
        { id: 'wb1_l8_d7_e7', type: 'speaking', instruction: 'Final speaking review.', audioValue: "I'm happy. You're ready. He isn't sad. We aren't at home. They're in class.", correctValue: "I'm happy. You're ready. He isn't sad. We aren't at home. They're in class." },
      ],
    },
  ],
};
