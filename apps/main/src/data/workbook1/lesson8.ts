import { buildLesson, choice, speak, write } from './lessonBuilder';

const informal = (standard: string) => ({
  contentOrigin: 'Updated Workbook 1 Lesson 8 PDF',
  pedagogicalTopic: 'informal-aint-recognition',
  coverageObjective: 'Recognize informal ain’t and map it to standard English',
  fullSentenceAfterAnswer: `Standard: ${standard}`,
});

const zooReading = "Today is Tuesday. Ben, Anna, Lucas, and Emily are at the zoo. They are not late. They're ready to explore. The guide says, 'Good morning, everyone. Are you ready?' Ben says, 'Yes, I am. I'm ready.' Anna says, 'I'm ready too. I'm not tired today.' Lucas is happy. He isn't afraid. He is with his friends. Emily is near the giraffes. She isn't at the entrance. She is beside a tall tree. The guide points to a lion and says, 'He's strong.' Then she points to a zebra and says, 'It's beautiful too.' After that, the guide looks at the group and says, 'You're all ready. We're ready to see more animals.' The students smile. They're happy because they can enjoy nature and understand contractions in English.";

export const lesson8 = buildLesson(8, 'Lesson 8: Spoken Patterns', [
  // Day 1 — Affirmative contractions
  { exercises: [
    choice('I am ready.', "I'm ready.", ["I's ready.", 'I ready.', 'I are ready.'], 0, { type: 'identification', instruction: 'Choose the correct contraction.', translation: 'Eu estou pronto(a).', isNewVocab: true }),
    choice('You are with your friends.', "You're with your friends.", ["You's with your friends.", 'You with your friends.', 'You is with your friends.'], 1, { type: 'identification', instruction: 'Choose the correct contraction.', isNewVocab: true }),
    choice('He is the guide.', "He's the guide.", ['He are the guide.', "He'm the guide.", 'He the guide.'], 2, { type: 'identification', instruction: 'Choose the correct contraction.', isNewVocab: true }),
    choice('She is our teacher.', "She's our teacher.", ['She our teacher.', 'She are our teacher.', "She'm our teacher."], 3, { type: 'identification', instruction: 'Choose the correct contraction.', isNewVocab: true }),
    choice('It is a zebra.', "It's a zebra.", ['Its a zebra.', 'It a zebra.', "It're a zebra."], 0, { type: 'identification', instruction: 'Choose the correct contraction.', isNewVocab: true }),
    choice('We are at the zoo.', "We're at the zoo.", ["We's at the zoo.", 'We at the zoo.', 'We is at the zoo.'], 1, { type: 'identification', instruction: 'Choose the correct contraction.', isNewVocab: true }),
    choice('They are happy today.', "They're happy today.", ['They is happy today.', "They's happy today.", 'They happy today.'], 2, { type: 'identification', instruction: 'Choose the correct contraction.', isNewVocab: true }),
    choice("I'm eleven.", 'I am eleven.', ['I is eleven.', 'I are eleven.', 'I eleven.'], 3, { instruction: 'Choose the matching full form.' }),
    choice("You're my friend.", 'You are my friend.', ['You is my friend.', 'You am my friend.', 'You my friend.'], 0, { instruction: 'Choose the matching full form.' }),
    choice("He's strong.", 'He is strong.', ['He are strong.', 'She is strong.', 'He strong.'], 1, { instruction: 'Choose the matching full form.' }),
    choice("She's beside a tall tree.", 'She is beside a tall tree.', ['She are beside a tall tree.', 'He is beside a tall tree.', 'She beside a tall tree.'], 2, { instruction: 'Choose the matching full form.' }),
    write('We are ready to see an animal.', "We're ready to see an animal.", 'Contract the sentence: We are ready to see an animal.', [], { instruction: 'Write the contracted form.' }),
    write('They are at the zoo today.', "They're at the zoo today.", 'Contract the sentence: They are at the zoo today.', [], { instruction: 'Write the contracted form.' }),
    speak("It's Tuesday, and we're ready.", ['It is Tuesday, and we are ready.'], { instruction: 'Listen and repeat the contractions.', assessmentMode: 'shadowing', coverageObjective: 'Affirmative contractions' }),
    speak("I'm Anna. He's Ben, and they're my friends.", ['I am Anna. He is Ben, and they are my friends.'], { instruction: 'Listen and repeat the natural spoken pattern.', assessmentMode: 'shadowing', coverageObjective: 'Affirmative contractions' }),
  ] },

  // Day 2 — Negative contractions
  { exercises: [
    choice('I am not tired.', "I'm not tired.", ["I amn't tired.", "I isn't tired.", "I aren't tired."], 0, { instruction: 'Choose the standard negative form.', isNewVocab: true }),
    choice('You are not late.', "You aren't late.", ["You isn't late.", "You am not late.", 'You not late.'], 1, { instruction: 'Choose the correct negative contraction.', isNewVocab: true }),
    choice('Lucas is not afraid.', "Lucas isn't afraid.", ["Lucas aren't afraid.", 'Lucas not afraid.', "Lucas amn't afraid."], 2, { instruction: 'Choose the correct negative contraction.', isNewVocab: true }),
    choice('Emily is not at the entrance.', "Emily isn't at the entrance.", ["Emily aren't at the entrance.", 'Emily not at the entrance.', 'Emily am not at the entrance.'], 3, { instruction: 'Choose the correct negative contraction.', isNewVocab: true }),
    choice('The lion is not small.', "The lion isn't small.", ["The lion aren't small.", 'The lion not small.', 'The lion am not small.'], 0, { instruction: 'Choose the correct negative contraction.', isNewVocab: true }),
    choice('We are not at school.', "We aren't at school.", ["We isn't at school.", 'We not at school.', 'We am not at school.'], 1, { instruction: 'Choose the correct negative contraction.', isNewVocab: true }),
    choice('They are not tired.', "They aren't tired.", ["They isn't tired.", 'They not tired.', 'They am not tired.'], 2, { instruction: 'Choose the correct negative contraction.', isNewVocab: true }),
    choice("She isn't late.", "She's not late.", ["She aren't late.", "She's no late.", 'She not late.'], 3, { instruction: 'Choose the other standard negative contraction.' }),
    choice("We aren't tired.", "We're not tired.", ["We isn't tired.", "We're no tired.", 'We not tired.'], 0, { instruction: 'Choose the other standard negative contraction.' }),
    choice("They aren't at the entrance.", "They're not at the entrance.", ["They isn't at the entrance.", "They're no at the entrance.", 'They not at the entrance.'], 1, { instruction: 'Choose the other standard negative contraction.' }),
    write('Lucas is not afraid.', "Lucas isn't afraid.", 'Write a correct standard negative form for: Lucas is not afraid.', ['Lucas is not afraid.', "Lucas's not afraid."], { instruction: 'Write a standard negative form.' }),
    write('They are not late.', "They aren't late.", 'Write a correct standard negative form for: They are not late.', ['They are not late.', "They're not late."], { instruction: 'Write a standard negative form.' }),
    write('Emily is not at the entrance.', "Emily isn't at the entrance.", 'Contract the negative: Emily is not at the entrance.', ["Emily's not at the entrance."], { instruction: 'Write a contracted negative form.' }),
    speak("I'm not tired, and Lucas isn't afraid.", ['I am not tired, and Lucas is not afraid.'], { instruction: 'Listen and repeat the standard negatives.', assessmentMode: 'shadowing', coverageObjective: 'Negative contractions' }),
    speak("We aren't late, and they aren't tired.", ['We are not late, and they are not tired.'], { instruction: 'Listen and repeat the standard negatives.', assessmentMode: 'shadowing', coverageObjective: 'Negative contractions' }),
  ] },

  // Day 3 — Questions and short answers
  { exercises: [
    choice('Are you ready?', 'Yes, I am.', ['Yes, I is.', "Yes, I'm.", 'Yes, you are.'], 0, { instruction: 'Choose the correct short answer.' }),
    choice('Are you tired?', "No, I'm not.", ['No, I am.', "No, I isn't.", 'No, you are not.'], 1, { instruction: 'Choose the correct short answer.' }),
    choice('Is Lucas afraid?', "No, he isn't.", ['No, he are not.', "No, he's.", 'No, I am not.'], 2, { instruction: 'Choose the correct short answer.' }),
    choice('Is Emily near a giraffe?', 'Yes, she is.', ['Yes, she are.', 'Yes, he is.', "Yes, she's."], 3, { instruction: 'Choose the correct short answer.' }),
    choice('Is it a beautiful zebra?', 'Yes, it is.', ['Yes, it are.', "Yes, it's.", 'Yes, zebra.'], 0, { instruction: 'Choose the correct short answer.' }),
    choice('Are we late?', "No, we aren't.", ['No, we is not.', "No, we're.", 'No, they are not.'], 1, { instruction: 'Choose the correct short answer.' }),
    choice('Are they at the zoo?', 'Yes, they are.', ['Yes, they is.', "Yes, they're.", 'Yes, we are.'], 2, { instruction: 'Choose the correct short answer.' }),
    write('Are Anna and Ben ready? Yes, they are.', 'Yes, they are.', 'Answer the question: Are Anna and Ben ready?', ['Yes, Anna and Ben are.'], { instruction: 'Write a complete short answer.' }),
    write('Is Lucas afraid? No, he is not.', "No, he isn't.", 'Answer with a standard negative form: Is Lucas afraid?', ['No, he is not.', "No, he's not."], { instruction: 'Write a standard negative answer.' }),
    write('Is Emily near the giraffes? Yes, she is.', 'Yes, she is.', 'Answer the question: Is Emily near the giraffes?', [], { instruction: 'Write a complete short answer.' }),
    write('Are the students late? No, they are not.', "No, they aren't.", 'Answer with a contraction: Are the students late?', ["No, they're not."], { instruction: 'Write a contracted negative answer.' }),
    speak('Are you ready? Yes, I am.', [], { instruction: 'Listen, then ask and answer aloud.', assessmentMode: 'shadowing', coverageObjective: 'Questions and short answers' }),
    speak("Is Lucas afraid? No, he isn't.", ['Is Lucas afraid? No, he is not.'], { instruction: 'Listen, then ask and answer aloud.', assessmentMode: 'shadowing', coverageObjective: 'Questions and short answers' }),
    speak('Is Emily near the giraffes? Yes, she is.', [], { instruction: 'Listen, then ask and answer aloud.', assessmentMode: 'shadowing', coverageObjective: 'Questions and short answers' }),
    speak("Are they late? No, they aren't.", ['Are they late? No, they are not.'], { instruction: 'Listen, then ask and answer aloud.', assessmentMode: 'shadowing', coverageObjective: 'Questions and short answers' }),
  ] },

  // Day 4 — The fixed standard tag: I'm ..., aren't I?
  { exercises: [
    choice("I'm right, ___?", "aren't I?", ["amn't I?", 'do I?', "isn't I?"], 0, { instruction: "Choose the standard question tag after I'm.", coverageObjective: "I'm ..., aren't I?" }),
    choice("I'm late, ___?", "aren't I?", ["amn't I?", "isn't I?", 'are I?'], 1, { instruction: "Choose the standard question tag after I'm.", coverageObjective: "I'm ..., aren't I?" }),
    choice("I'm your friend, ___?", "aren't I?", ["amn't I?", 'are I?', "isn't I?"], 2, { instruction: "Choose the standard question tag after I'm.", coverageObjective: "I'm ..., aren't I?" }),
    choice("I'm in the correct classroom, ___?", "aren't I?", ["amn't I?", "isn't I?", 'are I?'], 3, { instruction: "Choose the standard question tag after I'm.", coverageObjective: "I'm ..., aren't I?" }),
    write("I'm with the group, aren't I?", "aren't I?", "Complete the standard question tag: I'm with the group, ______", [], { instruction: 'Write the fixed standard question tag.' }),
    write("I'm near the entrance, aren't I?", "aren't I?", "Complete the standard question tag: I'm near the entrance, ______", [], { instruction: 'Write the fixed standard question tag.' }),
    choice("Which sentence uses the standard question tag after I'm?", "I'm ready, aren't I?", ["I'm ready, amn't I?", "I'm ready, do I?", "I'm ready, isn't I?"], 2, { instruction: 'Choose the standard English sentence.' }),
    choice("I'm happy, ___?", "aren't I?", ["amn't I?", "isn't I?", 'do I?'], 3, { instruction: "Complete the sentence with the words you learned: aren't I?", translation: 'Eu estou feliz, não estou?', coverageObjective: "I'm ..., aren't I?" }),
    speak("I'm right, aren't I?", [], { instruction: 'Listen and repeat the standard question tag.', assessmentMode: 'shadowing', coverageObjective: "I'm ..., aren't I?" }),
    speak("I'm in the correct classroom, aren't I?", [], { instruction: 'Listen and repeat the standard question tag.', assessmentMode: 'shadowing', coverageObjective: "I'm ..., aren't I?" }),
  ] },

  // Day 5 — Natural listening, dialogues, and shadowing
  { exercises: [
    speak(zooReading, [], { instruction: 'Listen to Reading — At the Zoo, then shadow it.', displayValue: `Reading — At the Zoo\n${zooReading}`, assessmentMode: 'shadowing', coverageObjective: 'Natural spoken contractions' }),
    speak("Guide: Where is Lucas? Anna: He's near the lion. Guide: Is he afraid? Anna: No, he isn't. Guide: Is he happy? Anna: Yes, he is. Lucas: I'm happy today!", [], { instruction: 'Listen to Dialogue 17 — Lucas Isn’t Afraid, then shadow it.', displayValue: "Dialogue 17 — Lucas Isn’t Afraid\nGuide: Where is Lucas?\nAnna: He's near the lion.\nGuide: Is he afraid?\nAnna: No, he isn't.\nGuide: Is he happy?\nAnna: Yes, he is.\nLucas: I'm happy today!", assessmentMode: 'shadowing', coverageObjective: 'Natural spoken contractions' }),
    choice('Is the group ready in Reading — At the Zoo?', 'Yes, it is.', ['No, it is not.', 'Yes, he is.', 'No, she is not.'], 0, { instruction: 'Listen to the dialogue in Reading — At the Zoo and answer.' }),
    choice('Is Anna tired in Reading — At the Zoo?', "No, she isn't.", ['Yes, she is.', 'No, he is not.', 'Yes, they are.'], 1, { instruction: 'Listen to the dialogue in Reading — At the Zoo and answer.' }),
    choice('Is Lucas afraid in Dialogue 17?', "No, he isn't.", ['Yes, he is.', 'No, she is not.', 'Yes, they are.'], 2, { instruction: 'Listen and answer from Dialogue 17.' }),
    choice('I am ready.', "I'm ready.", ["I's ready.", 'I ready.', 'I are ready.'], 3, { instruction: 'Listen and choose the natural spoken form.' }),
    choice('Lucas is not afraid.', "Lucas isn't afraid.", ["Lucas aren't afraid.", 'Lucas not afraid.', 'Lucas am not afraid.'], 0, { instruction: 'Listen and choose the natural spoken form.' }),
    choice('They are not late.', "They aren't late.", ["They isn't late.", 'They not late.', 'They am not late.'], 1, { instruction: 'Listen and choose the standard spoken form.' }),
    choice("I'm your friend, ___?", "aren't I?", ["amn't I?", 'do I?', "isn't I?"], 2, { instruction: 'Listen and choose the standard tag.' }),
    choice('Are you ready?', 'Yes, I am.', ["Yes, I'm.", 'Yes, I is.', 'Yes, you are.'], 3, { instruction: 'Listen and choose the correct short answer.' }),
    speak("You're at the zoo, and I'm ready too.", ['You are at the zoo, and I am ready too.'], { instruction: 'Listen, replay, and shadow the sentence.', assessmentMode: 'shadowing', coverageObjective: 'Natural spoken contractions' }),
    speak("He's the guide, and he's strong.", ['He is the guide, and he is strong.'], { instruction: 'Listen, replay, and shadow the sentence.', assessmentMode: 'shadowing', coverageObjective: 'Natural spoken contractions' }),
    speak("They're near the giraffes, and they aren't late.", ['They are near the giraffes, and they are not late.'], { instruction: 'Listen, replay, and shadow the sentence.', assessmentMode: 'shadowing', coverageObjective: 'Natural spoken contractions' }),
    speak("We're ready to see the animals, aren't we?", ['We are ready to see the animals, are we not?'], { instruction: 'Listen, replay, and shadow the sentence.', assessmentMode: 'shadowing', coverageObjective: 'Natural spoken contractions' }),
    speak("I'm near the entrance, aren't I?", [], { instruction: 'Listen, replay, and shadow the standard tag.', assessmentMode: 'shadowing', coverageObjective: "I'm ..., aren't I?" }),
  ] },

  // Day 6 — Informal “ain't” recognition. The finalizer keeps the first 10 as practice.
  { exercises: [
    choice("I ain't afraid.", 'Informal English.', ['Standard formal English.', 'A question tag.', 'A short answer.'], 0, { instruction: 'Informal English — identify the register you hear.', ...informal("I'm not afraid.") }),
    choice("He ain't at the entrance.", "He isn't at the entrance.", ['He is at the entrance.', "He aren't at the entrance.", "He's not tired."], 1, { instruction: 'Informal English — choose the standard meaning.', ...informal("He isn't at the entrance.") }),
    choice("They ain't tired.", "They aren't tired.", ['They are tired.', "They isn't tired.", "They're not late."], 2, { instruction: 'Informal English — choose the standard equivalent.', ...informal("They aren't tired.") }),
    choice("We ain't late.", "We aren't late.", ['We are late.', "We isn't late.", "We're not ready."], 3, { instruction: 'Informal English — choose the standard equivalent.', ...informal("We aren't late.") }),
    write("I ain't afraid.", "I ain't afraid.", 'Informal Spoken English — listen and transcribe exactly.', [], { instruction: 'Informal English — listen and write exactly what you hear.', ...informal("I'm not afraid.") }),
    choice("Which label belongs to 'I ain't tired'?", 'Informal English.', ['Standard English.', 'Formal writing.', 'A standard question tag.'], 0, { instruction: 'Informal English — classify the sentence.', ...informal("I'm not tired.") }),
    speak("Guide: Are Ben and Anna late? Lucas: No, they ain't. Guide: Are they near the giraffes? Lucas: Yes, they are. Guide: Are they ready to see more animals? Lucas: Yes, they are. Guide: Good. They ain't late, and they're ready.", [], { instruction: 'Informal English — listen to Dialogue 18 and shadow it.', displayValue: "Dialogue 18 — They Ain't Late\nInformal Spoken English\n\nGuide: Are Ben and Anna late?\nLucas: No, they ain't.\nGuide: Are they near the giraffes?\nLucas: Yes, they are.\nGuide: Are they ready to see more animals?\nLucas: Yes, they are.\nGuide: Good. They ain't late, and they're ready.", assessmentMode: 'shadowing', ...informal("No, they aren't. They aren't late, and they're ready.") }),
    choice("In Dialogue 18, what does 'They ain't late' mean?", "They aren't late.", ['They are late.', "They aren't ready.", 'They are at home.'], 1, { instruction: 'Informal English — choose the standard meaning.', ...informal("They aren't late.") }),
    speak("I ain't afraid.", [], { instruction: 'Informal English — listen, replay, and shadow what you hear.', assessmentMode: 'shadowing', ...informal("I'm not afraid.") }),
    speak("They ain't tired.", [], { instruction: 'Informal English — listen, replay, and shadow what you hear.', assessmentMode: 'shadowing', ...informal("They aren't tired.") }),
    choice("He ain't here.", 'Informal English.', ['Standard English.', 'A formal question.', 'A standard short answer.'], 2, { instruction: 'Informal English — identify the register.', ...informal("He isn't here.") }),
    write("We ain't late.", "We ain't late.", 'Informal Spoken English — listen and transcribe exactly.', [], { instruction: 'Informal English — listen and write exactly what you hear.', ...informal("We aren't late.") }),
    speak("He ain't here.", [], { instruction: 'Informal English — listen, replay, and shadow what you hear.', assessmentMode: 'shadowing', ...informal("He isn't here.") }),
    choice("We ain't ready.", "We aren't ready.", ['We are ready.', "We isn't ready.", "We're not late."], 3, { instruction: 'Informal English — choose the standard equivalent.', ...informal("We aren't ready.") }),
    speak("We ain't late, but we're ready.", [], { instruction: 'Informal English — listen, replay, and shadow what you hear.', assessmentMode: 'shadowing', ...informal("We aren't late, but we're ready.") }),
  ] },

  // Authored review pool; finalizeWorkbook1Lesson replaces this with the true 20-item Final Test.
  { type: 'review', exercises: [
    choice('I am ready.', "I'm ready.", ["I's ready.", 'I ready.', 'I are ready.'], 0, { instruction: 'Final Test — choose the contraction.' }),
    choice('She is our teacher.', "She's our teacher.", ['She are our teacher.', 'She our teacher.', "She'm our teacher."], 1, { instruction: 'Final Test — choose the contraction.' }),
    choice('He is not sad.', "He isn't sad.", ["He aren't sad.", 'He not sad.', 'He am not sad.'], 2, { instruction: 'Final Test — choose the standard negative.' }),
    choice('They are not late.', "They aren't late.", ["They isn't late.", 'They not late.', 'They am not late.'], 3, { instruction: 'Final Test — choose the standard negative.' }),
    choice('Are you ready?', 'Yes, I am.', ["Yes, I'm.", 'Yes, I is.', 'Yes, you are.'], 0, { instruction: 'Final Test — choose the short answer.' }),
    choice('Is he sad?', "No, he isn't.", ['Yes, he is.', "No, he's.", 'No, he are not.'], 1, { instruction: 'Final Test — choose the short answer.' }),
    choice("I'm late, ___?", "aren't I?", ["amn't I?", 'do I?', "isn't I?"], 2, { instruction: 'Final Test — choose the standard tag.' }),
    write("I'm your friend, aren't I?", "aren't I?", "Final Test — complete: I'm your friend, ______", []),
    choice("I ain't tired.", 'Informal English.', ['Standard formal English.', 'A question tag.', 'A short answer.'], 0, { instruction: 'Final Test — recognize the register.', ...informal("I'm not tired.") }),
    choice("They ain't ready.", "They aren't ready.", ['They are ready.', "They isn't ready.", "They're late."], 1, { instruction: 'Final Test — choose the standard meaning.', ...informal("They aren't ready.") }),
    write("We're ready.", "We're ready.", 'Final Test — listen and write exactly what you hear.', [], { instruction: 'Listen and write exactly what you hear.' }),
    write("He isn't here.", "He isn't here.", 'Final Test — listen and write exactly what you hear.', [], { instruction: 'Listen and write exactly what you hear.' }),
    speak("They're in class, and they aren't late.", [], { instruction: 'Final Test — listen and shadow.', assessmentMode: 'shadowing' }),
    speak("I'm in the correct classroom, aren't I?", [], { instruction: 'Final Test — listen and shadow.', assessmentMode: 'shadowing' }),
    speak('Are they ready? Yes, they are.', [], { instruction: 'Final Test — ask and answer aloud.', assessmentMode: 'speaking' }),
  ] },
]);
