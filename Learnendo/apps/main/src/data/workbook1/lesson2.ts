import { Lesson } from '../../types';

export const lesson2: Lesson = {
  id: "wb1_l2",
  title: "Lesson 2: A Day in Nature",
  days: [
    // ── D1: Introduction (25 items) ──────────────────────────────────────
    {
      id: "wb1_l2_d1",
      type: "practice",
      exercises: [
        // 1–9: Hear the word, pick from options
        { id: 'wb1_l2_d1_e1',  type: 'identification', instruction: 'Listen and pick the correct answer.', audioValue: 'sun',   options: ['sun','moon','star','cloud'],      correctValue: 'sun',   isNewVocab: true, translation: 'Sun = Sol'         },
        { id: 'wb1_l2_d1_e2',  type: 'identification', instruction: 'Listen and pick the correct answer.', audioValue: 'kite',  options: ['kite','ball','plane','bird'],     correctValue: 'kite',  isNewVocab: true, translation: 'Kite = Pipa'       },
        { id: 'wb1_l2_d1_e3',  type: 'identification', instruction: 'Listen and pick the correct answer.', audioValue: 'tree',  options: ['tree','bush','flower','grass'],   correctValue: 'tree',  isNewVocab: true, translation: 'Tree = Arvore'     },
        { id: 'wb1_l2_d1_e4',  type: 'identification', instruction: 'Listen and pick the correct answer.', audioValue: 'apple', options: ['apple','orange','banana','grape'], correctValue: 'apple', isNewVocab: true, translation: 'Apple = Maca'      },
        { id: 'wb1_l2_d1_e5',  type: 'identification', instruction: 'Listen and pick the correct answer.', audioValue: 'rock',  options: ['rock','sand','stone','water'],    correctValue: 'rock',  isNewVocab: true, translation: 'Rock = Pedra'      },
        { id: 'wb1_l2_d1_e6',  type: 'identification', instruction: 'Listen and pick the correct answer.', audioValue: 'water', options: ['water','juice','milk','tea'],     correctValue: 'water', isNewVocab: true, translation: 'Water = Agua'      },
        { id: 'wb1_l2_d1_e7',  type: 'identification', instruction: 'Listen and pick the correct answer.', audioValue: 'wind',  options: ['wind','rain','snow','cloud'],     correctValue: 'wind',  isNewVocab: true, translation: 'Wind = Vento'      },
        { id: 'wb1_l2_d1_e8',  type: 'identification', instruction: 'Listen and pick the correct answer.', audioValue: 'toes',  options: ['toes','feet','hands','eyes'],     correctValue: 'toes',  isNewVocab: true, translation: 'Toes = Dedos'      },
        { id: 'wb1_l2_d1_e9',  type: 'identification', instruction: 'Listen and pick the correct answer.', audioValue: 'sky',   options: ['sky','sea','hill','road'],        correctValue: 'sky',   isNewVocab: true, translation: 'Sky = Ceu'         },
        // 10–13: Q&A patterns — hear the answer sentence, pick the correct sentence
        { id: 'wb1_l2_d1_e10', type: 'multiple-choice', instruction: 'What is this?',  audioValue: 'This is the sun.',  options: ['This is the sun.', 'That is a tree.',   'Those are toes.',  'This is a rock.'],  correctValue: 'This is the sun.',  isNewVocab: true },
        { id: 'wb1_l2_d1_e11', type: 'multiple-choice', instruction: 'What is that?',  audioValue: 'That is a kite.',   options: ['That is a kite.',  'This is an apple.', 'Those are toes.',  'That is a tree.'],  correctValue: 'That is a kite.',   isNewVocab: true },
        { id: 'wb1_l2_d1_e12', type: 'multiple-choice', instruction: 'What are those?',audioValue: 'Those are toes.',   options: ['Those are toes.',  'This is a rock.',   'That is a kite.',  'Those are trees.'], correctValue: 'Those are toes.',   isNewVocab: true },
        { id: 'wb1_l2_d1_e13', type: 'multiple-choice', instruction: 'What is this?',  audioValue: 'This is a tree.',   options: ['This is a tree.',  'Those are trees.',  'That is the tree.','This are trees.'],  correctValue: 'This is a tree.'  },
        // 14–17: See icon, hear full answer sentence, choose the sentence
        { id: 'wb1_l2_d1_e14', type: 'identification', instruction: 'What is this?', displayValue: 'fa-sun',         audioValue: 'This is the sun.',  options: ['This is the sun.',  'That is a kite.',  'Those are toes.',   'This is a rock.'],  correctValue: 'This is the sun.'  },
        { id: 'wb1_l2_d1_e15', type: 'identification', instruction: 'What is that?', displayValue: 'fa-tree',        audioValue: 'That is a tree.',   options: ['This is an apple.', 'That is a tree.',  'Those are rocks.',  'This is the sun.'], correctValue: 'That is a tree.'   },
        { id: 'wb1_l2_d1_e16', type: 'identification', instruction: 'What is this?', displayValue: 'fa-apple-whole', audioValue: 'This is an apple.', options: ['That is a tree.',   'Those are toes.',  'This is an apple.', 'That is a kite.'],  correctValue: 'This is an apple.' },
        { id: 'wb1_l2_d1_e17', type: 'identification', instruction: 'What is that?', displayValue: 'fa-kite',        audioValue: 'That is a kite.',   options: ['This is the sun.',  'Those are rocks.', 'That is a kite.',   'This is water.'],   correctValue: 'That is a kite.'  },
        // 18–21: Dictation — hear word, type it
        { id: 'wb1_l2_d1_e18', type: 'writing', instruction: 'Type in words what you hear.', audioValue: 'sun',   correctValue: 'sun'   },
        { id: 'wb1_l2_d1_e19', type: 'writing', instruction: 'Type in words what you hear.', audioValue: 'kite',  correctValue: 'kite'  },
        { id: 'wb1_l2_d1_e20', type: 'writing', instruction: 'Type in words what you hear.', audioValue: 'rock',  correctValue: 'rock'  },
        { id: 'wb1_l2_d1_e21', type: 'writing', instruction: 'Type in words what you hear.', audioValue: 'toes',  correctValue: 'toes'  },
        // 22–25: Speaking — first exposure to sentence patterns
        { id: 'wb1_l2_d1_e22', type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'This is the sun.',  correctValue: 'This is the sun.'  },
        { id: 'wb1_l2_d1_e23', type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'That is a tree.',   correctValue: 'That is a tree.'  },
        { id: 'wb1_l2_d1_e24', type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'Those are toes.',   correctValue: 'Those are toes.'  },
        { id: 'wb1_l2_d1_e25', type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'This is an apple.', correctValue: 'This is an apple.' },
      ]
    },
    // ── D2: Vocabulary Focus — icons (10 items) ───────────────────────────
    {
      id: "wb1_l2_d2",
      type: "practice",
      exercises: [
        { id: 'wb1_l2_d2_e1',  type: 'identification', instruction: 'What is this?', displayValue: 'fa-sun',         audioValue: 'sun',   options: ['sun','moon','star','cloud'],       correctValue: 'sun',   isNewVocab: true, translation: 'Sun = Sol'    },
        { id: 'wb1_l2_d2_e2',  type: 'identification', instruction: 'What is this?', displayValue: 'fa-kite',        audioValue: 'kite',  options: ['kite','ball','plane','bird'],      correctValue: 'kite',                   translation: 'Kite = Pipa'  },
        { id: 'wb1_l2_d2_e3',  type: 'identification', instruction: 'What is this?', displayValue: 'fa-tree',        audioValue: 'tree',  options: ['tree','bush','flower','rock'],     correctValue: 'tree',                   translation: 'Tree = Arvore'},
        { id: 'wb1_l2_d2_e4',  type: 'identification', instruction: 'What is this?', displayValue: 'fa-apple-whole', audioValue: 'apple', options: ['apple','orange','banana','grape'], correctValue: 'apple',                  translation: 'Apple = Maca' },
        { id: 'wb1_l2_d2_e5',  type: 'identification', instruction: 'What is this?', displayValue: 'fa-mountain',    audioValue: 'rock',  options: ['rock','sand','stone','water'],     correctValue: 'rock',                   translation: 'Rock = Pedra' },
        { id: 'wb1_l2_d2_e6',  type: 'identification', instruction: 'What is this?', displayValue: 'fa-droplet',     audioValue: 'water', options: ['water','juice','milk','tea'],      correctValue: 'water',                  translation: 'Water = Agua' },
        { id: 'wb1_l2_d2_e7',  type: 'identification', instruction: 'What is this?', displayValue: 'fa-wind',        audioValue: 'wind',  options: ['wind','rain','snow','cloud'],      correctValue: 'wind',                   translation: 'Wind = Vento' },
        { id: 'wb1_l2_d2_e8',  type: 'identification', instruction: 'What is this?', displayValue: 'fa-foot',        audioValue: 'toes',  options: ['toes','feet','hands','nose'],      correctValue: 'toes',                   translation: 'Toes = Dedos' },
        { id: 'wb1_l2_d2_e9',  type: 'writing', instruction: 'Type in words what you hear.', audioValue: 'sky',  correctValue: 'sky'  },
        { id: 'wb1_l2_d2_e10', type: 'writing', instruction: 'Type in words what you hear.', audioValue: 'wind', correctValue: 'wind' },
      ]
    },
    // ── D3: Question & Answer Structures (10 items) ───────────────────────
    {
      id: "wb1_l2_d3",
      type: "practice",
      exercises: [
        { id: 'wb1_l2_d3_e1',  type: 'multiple-choice', instruction: 'What is this?',   audioValue: 'This is a rock.',   isNewVocab: true, options: ['This is a rock.',  'That is a rock.',  'Those are rocks.', 'This a rock.'],     correctValue: 'This is a rock.'  },
        { id: 'wb1_l2_d3_e2',  type: 'multiple-choice', instruction: 'What is that?',   audioValue: 'That is a kite.',   isNewVocab: true, options: ['That is a kite.',  'This is a kite.',  'Those are kites.', 'That a kite.'],      correctValue: 'That is a kite.'  },
        { id: 'wb1_l2_d3_e3',  type: 'multiple-choice', instruction: 'What are those?', audioValue: 'Those are toes.',   isNewVocab: true, options: ['Those are toes.',  'This is toes.',    'That are toes.',   'Those toes.'],       correctValue: 'Those are toes.'  },
        { id: 'wb1_l2_d3_e4',  type: 'multiple-choice', instruction: 'What is this?',   audioValue: 'This is an apple.',              options: ['This is an apple.','That is an apple.','Those are apples.','This an apple.'],    correctValue: 'This is an apple.' },
        { id: 'wb1_l2_d3_e5',  type: 'multiple-choice', instruction: 'What is that?',   audioValue: 'That is a tree.',                options: ['That is a tree.',  'This is a tree.',  'Those are trees.', 'That tree.'],        correctValue: 'That is a tree.'  },
        { id: 'wb1_l2_d3_e6',  type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'What is this?',    correctValue: 'What is this?'    },
        { id: 'wb1_l2_d3_e7',  type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'This is an apple.', correctValue: 'This is an apple.' },
        { id: 'wb1_l2_d3_e8',  type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'What is that?',    correctValue: 'What is that?'    },
        { id: 'wb1_l2_d3_e9',  type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'That is a tree.',  correctValue: 'That is a tree.'  },
        { id: 'wb1_l2_d3_e10', type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'Those are toes.',  correctValue: 'Those are toes.'  },
      ]
    },
    // ── D4: Reading — A Day in Nature (10 items) ─────────────────────────
    {
      id: "wb1_l2_d4",
      type: "practice",
      exercises: [
        { id: 'wb1_l2_d4_e1',  type: 'multiple-choice', instruction: 'Read: "It is a sunny day." What kind of day is it?',         displayValue: 'It is a sunny day.',           audioValue: 'It is a sunny day.',           options: ['sunny','rainy','cold','dark'],                                         correctValue: 'sunny',        isNewVocab: true },
        { id: 'wb1_l2_d4_e2',  type: 'multiple-choice', instruction: 'Read: "The sky is blue." What color is the sky?',            displayValue: 'The sky is blue.',             audioValue: 'The sky is blue.',             options: ['blue','red','green','yellow'],                                         correctValue: 'blue',         isNewVocab: true },
        { id: 'wb1_l2_d4_e3',  type: 'multiple-choice', instruction: 'Read: "The kite is red and white." What color is the kite?', displayValue: 'The kite is red and white.',   audioValue: 'The kite is red and white.',   options: ['red and white','blue and green','black and yellow','orange and pink'], correctValue: 'red and white'             },
        { id: 'wb1_l2_d4_e4',  type: 'multiple-choice', instruction: 'Read: "I sit on a rock near a tree." Where do I sit?',       displayValue: 'I sit on a rock near a tree.', audioValue: 'I sit on a rock near a tree.', options: ['on a rock','in a tree','on the grass','near water'],                   correctValue: 'on a rock'                 },
        { id: 'wb1_l2_d4_e5',  type: 'multiple-choice', instruction: 'Read: "I eat an apple." What do I eat?',                     displayValue: 'I eat an apple.',              audioValue: 'I eat an apple.',              options: ['an apple','an orange','a banana','a kite'],                            correctValue: 'an apple'                  },
        { id: 'wb1_l2_d4_e6',  type: 'multiple-choice', instruction: 'Read: "I drink water." What do I drink?',                    displayValue: 'I drink water.',               audioValue: 'I drink water.',               options: ['water','juice','milk','tea'],                                          correctValue: 'water'                     },
        { id: 'wb1_l2_d4_e7',  type: 'multiple-choice', instruction: 'Read: "My toes are hot." How are my toes?',                  displayValue: 'My toes are hot.',             audioValue: 'My toes are hot.',             options: ['hot','cold','wet','small'],                                            correctValue: 'hot',          isNewVocab: true },
        { id: 'wb1_l2_d4_e8',  type: 'multiple-choice', instruction: 'Read: "The wind blows." What does the wind do?',             displayValue: 'The wind blows.',              audioValue: 'The wind blows.',              options: ['blows','rains','shines','falls'],                                      correctValue: 'blows',        isNewVocab: true },
        { id: 'wb1_l2_d4_e9',  type: 'writing', instruction: 'Read: "The sky is blue." What color is the sky? Type the color.', audioValue: 'blue',  correctValue: 'blue'  },
        { id: 'wb1_l2_d4_e10', type: 'writing', instruction: 'Read: "I eat an apple." What do I eat? Type the food.',           audioValue: 'apple', correctValue: 'apple' },
      ]
    },
    // ── D5: Speaking Patterns (10 items) ─────────────────────────────────
    {
      id: "wb1_l2_d5",
      type: "practice",
      exercises: [
        { id: 'wb1_l2_d5_e1',  type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'This is the sun.',               correctValue: 'This is the sun.'              },
        { id: 'wb1_l2_d5_e2',  type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'That is a tree.',                correctValue: 'That is a tree.'               },
        { id: 'wb1_l2_d5_e3',  type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'This is an apple.',              correctValue: 'This is an apple.'             },
        { id: 'wb1_l2_d5_e4',  type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'Those are toes.',                correctValue: 'Those are toes.'               },
        { id: 'wb1_l2_d5_e5',  type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'The kite is red and white.',      correctValue: 'The kite is red and white.'    },
        { id: 'wb1_l2_d5_e6',  type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'It is a sunny day.',             correctValue: 'It is a sunny day.'            },
        { id: 'wb1_l2_d5_e7',  type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'I sit on a rock near a tree.',    correctValue: 'I sit on a rock near a tree.'  },
        { id: 'wb1_l2_d5_e8',  type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'I eat an apple and drink water.', correctValue: 'I eat an apple and drink water.'},
        { id: 'wb1_l2_d5_e9',  type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'My toes are hot.',               correctValue: 'My toes are hot.'              },
        { id: 'wb1_l2_d5_e10', type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'The wind blows.',                correctValue: 'The wind blows.'               },
      ]
    },
    // ── D6: Mixed Review — a/an + identification + speaking (10 items) ────
    {
      id: "wb1_l2_d6",
      type: "practice",
      exercises: [
        { id: 'wb1_l2_d6_e1',  type: 'multiple-choice', instruction: 'It is ___ apple.',     audioValue: "It's an apple.",    options: ['a','an'], correctValue: 'an', isNewVocab: true },
        { id: 'wb1_l2_d6_e2',  type: 'multiple-choice', instruction: 'It is ___ kite.',      audioValue: "It's a kite.",      options: ['a','an'], correctValue: 'a'  },
        { id: 'wb1_l2_d6_e3',  type: 'multiple-choice', instruction: 'It is ___ sunny day.', audioValue: "It's a sunny day.", options: ['a','an'], correctValue: 'a'  },
        { id: 'wb1_l2_d6_e4',  type: 'multiple-choice', instruction: 'I sit on ___ rock.',   audioValue: "I sit on a rock.",  options: ['a','an'], correctValue: 'a'  },
        { id: 'wb1_l2_d6_e5',  type: 'multiple-choice', instruction: 'I eat ___ apple.',     audioValue: "I eat an apple.",   options: ['a','an'], correctValue: 'an' },
        { id: 'wb1_l2_d6_e6',  type: 'identification', instruction: 'Listen and pick the correct answer.', audioValue: 'water', options: ['water','kite','tree','sun'],    correctValue: 'water' },
        { id: 'wb1_l2_d6_e7',  type: 'identification', instruction: 'Listen and pick the correct answer.', audioValue: 'apple', options: ['apple','orange','rock','wind'],  correctValue: 'apple' },
        { id: 'wb1_l2_d6_e8',  type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'What is this?',   correctValue: 'What is this?'   },
        { id: 'wb1_l2_d6_e9',  type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'That is a rock.',  correctValue: 'That is a rock.' },
        { id: 'wb1_l2_d6_e10', type: 'multiple-choice', instruction: 'What are those?', audioValue: 'Those are toes.', options: ['Those are toes.','What is those?','Those is toes.','What are those?'], correctValue: 'Those are toes.' },
      ]
    },
    // ── D7: Full Review Test (25 items) ──────────────────────────────────
    {
      id: "wb1_l2_d7",
      type: "review",
      exercises: [
        // Vocab identification — icons (8)
        { id: 'wb1_l2_d7_e1',  type: 'identification', instruction: 'What is this?', displayValue: 'fa-sun',         audioValue: 'sun',   options: ['sun','moon','star','cloud'],       correctValue: 'sun',   translation: 'Sun = Sol'    },
        { id: 'wb1_l2_d7_e2',  type: 'identification', instruction: 'What is this?', displayValue: 'fa-tree',        audioValue: 'tree',  options: ['tree','bush','flower','grass'],    correctValue: 'tree',  translation: 'Tree = Arvore'},
        { id: 'wb1_l2_d7_e3',  type: 'identification', instruction: 'What is this?', displayValue: 'fa-apple-whole', audioValue: 'apple', options: ['apple','orange','banana','grape'], correctValue: 'apple', translation: 'Apple = Maca' },
        { id: 'wb1_l2_d7_e4',  type: 'identification', instruction: 'What is this?', displayValue: 'fa-kite',        audioValue: 'kite',  options: ['kite','ball','plane','bird'],      correctValue: 'kite',  translation: 'Kite = Pipa'  },
        { id: 'wb1_l2_d7_e5',  type: 'identification', instruction: 'What is this?', displayValue: 'fa-mountain',    audioValue: 'rock',  options: ['rock','sand','water','tree'],      correctValue: 'rock',  translation: 'Rock = Pedra' },
        { id: 'wb1_l2_d7_e6',  type: 'identification', instruction: 'What is this?', displayValue: 'fa-droplet',     audioValue: 'water', options: ['water','juice','milk','tea'],      correctValue: 'water', translation: 'Water = Agua' },
        { id: 'wb1_l2_d7_e7',  type: 'identification', instruction: 'What is this?', displayValue: 'fa-wind',        audioValue: 'wind',  options: ['wind','rain','snow','cloud'],      correctValue: 'wind',  translation: 'Wind = Vento' },
        { id: 'wb1_l2_d7_e8',  type: 'identification', instruction: 'What is this?', displayValue: 'fa-foot',        audioValue: 'toes',  options: ['toes','feet','hands','nose'],      correctValue: 'toes',  translation: 'Toes = Dedos' },
        // Q&A structures (5)
        { id: 'wb1_l2_d7_e9',  type: 'multiple-choice', instruction: 'What is this?',   audioValue: 'This is a rock.',   options: ['This is a rock.', 'That is a rock.',  'Those are rocks.','This rock.'],      correctValue: 'This is a rock.',   translation: 'What is this? = O que e isto?'       },
        { id: 'wb1_l2_d7_e10', type: 'multiple-choice', instruction: 'What is that?',   audioValue: 'That is a tree.',   options: ['That is a tree.', 'This is a tree.',  'Those are trees.','That tree.'],       correctValue: 'That is a tree.',   translation: 'What is that? = O que e aquilo?'     },
        { id: 'wb1_l2_d7_e11', type: 'multiple-choice', instruction: 'What are those?', audioValue: 'Those are toes.',   options: ['Those are toes.', 'This is toes.',    'That are toes.',  'Those toes.'],       correctValue: 'Those are toes.',   translation: 'What are those? = O que sao aqueles?' },
        { id: 'wb1_l2_d7_e12', type: 'multiple-choice', instruction: 'What is this?',   audioValue: 'This is an apple.', options: ['This is an apple.','This is a apple.','That are apple.', 'An apple this is.'], correctValue: 'This is an apple.'                                                          },
        { id: 'wb1_l2_d7_e13', type: 'multiple-choice', instruction: 'It is ___ apple.',audioValue: "It's an apple.",   options: ['a','an'],                                                                        correctValue: 'an'                                                                         },
        // Reading comprehension (5)
        { id: 'wb1_l2_d7_e14', type: 'multiple-choice', instruction: 'Read: "The kite is red and white." What color is the kite?',   displayValue: 'The kite is red and white.',   audioValue: 'The kite is red and white.',   options: ['red and white','blue and green','yellow and black','orange and pink'], correctValue: 'red and white' },
        { id: 'wb1_l2_d7_e15', type: 'multiple-choice', instruction: 'Read: "I sit on a rock near a tree." Where do I sit?',         displayValue: 'I sit on a rock near a tree.', audioValue: 'I sit on a rock near a tree.', options: ['on a rock','near the water','in a tree','on the grass'],                  correctValue: 'on a rock'     },
        { id: 'wb1_l2_d7_e16', type: 'multiple-choice', instruction: 'Read: "My toes are hot." How are my toes?',                    displayValue: 'My toes are hot.',             audioValue: 'My toes are hot.',             options: ['hot','cold','wet','big'],                                              correctValue: 'hot'           },
        { id: 'wb1_l2_d7_e17', type: 'multiple-choice', instruction: 'Read: "The sky is blue." What color is the sky?',              displayValue: 'The sky is blue.',             audioValue: 'The sky is blue.',             options: ['blue','red','green','white'],                                          correctValue: 'blue'          },
        { id: 'wb1_l2_d7_e18', type: 'multiple-choice', instruction: 'Read: "It is a sunny day." What kind of day is it?',           displayValue: 'It is a sunny day.',           audioValue: 'It is a sunny day.',           options: ['sunny','rainy','cold','dark'],                                         correctValue: 'sunny'         },
        // Speaking (5)
        { id: 'wb1_l2_d7_e19', type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'What is this?',      correctValue: 'What is this?'      },
        { id: 'wb1_l2_d7_e20', type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'This is an apple.',  correctValue: 'This is an apple.'  },
        { id: 'wb1_l2_d7_e21', type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'That is a tree.',    correctValue: 'That is a tree.'    },
        { id: 'wb1_l2_d7_e22', type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'Those are toes.',    correctValue: 'Those are toes.'    },
        { id: 'wb1_l2_d7_e23', type: 'speaking', instruction: 'Listen and repeat exactly as you hear.', audioValue: 'It is a sunny day.', correctValue: 'It is a sunny day.' },
        // Writing (2)
        { id: 'wb1_l2_d7_e24', type: 'writing', instruction: 'Type in words what you hear.', audioValue: 'sun',   correctValue: 'sun',   translation: 'Sun = Sol'  },
        { id: 'wb1_l2_d7_e25', type: 'writing', instruction: 'Type in words what you hear.', audioValue: 'apple', correctValue: 'apple', translation: 'Apple = Maca' },
      ]
    }
  ]
};

export const lesson2NewWords: string[] = [
  'sun', 'kite', 'tree', 'apple', 'rock', 'water', 'wind', 'toes', 'sky',
  'What is this?', 'What is that?', 'What are those?',
  'sunny', 'hot', 'blows',
];
