import { Lesson } from "../../types";
import { buildLesson, ChoiceSeed, makeChoices, makeSpeakings, makeWritings, SpeakingSeed, WritingSeed } from "./helpers";

const VOCABULARY_INSTRUCTION = "Listen and choose the correct word.";
const GRAMMAR_INSTRUCTION = "Listen and choose the correct option.";
const RECOGNITION_INSTRUCTION = "Listen and choose the correct answer.";
const SPEAK_REPEAT = "Listen and repeat.";
const SPEAK_SHORT = "Listen and answer with a short sentence.";
const WRITE_BLANK = "Complete the sentence.";
const READ_INSTRUCTION = "Read and choose the correct answer.";

interface VocabItem {
  term: string;
  clue: string;
  prompt: string;
  distractors: string[];
}

interface GrammarItem {
  prompt: string;
  answer: string;
  options: string[];
  fullSentence: string;
  accepted?: string[];
}

interface FactItem {
  passage: string;
  question: string;
  answer: string;
  distractors: string[];
  accepted?: string[];
}

interface LessonConfig {
  number: number;
  title: string;
  vocab: VocabItem[];
  grammar: GrammarItem[];
  facts: FactItem[];
  writing: WritingSeed[];
}

function optionsFor(correct: string, distractors: string[]): string[] {
  const options = [correct, ...distractors].filter((value, index, values) => value && values.indexOf(value) === index);
  if (options.length < 4) {
    throw new Error(`Exercise "${correct}" needs at least four unique options.`);
  }
  return options.slice(0, 4);
}

function choice(
  display: string,
  audio: string,
  correct: string,
  distractors: string[],
  type: "multiple-choice" | "identification" = "multiple-choice",
  accepted?: string[],
): ChoiceSeed {
  return {
    display,
    audio,
    correct,
    options: optionsFor(correct, distractors),
    type,
    accepted,
  };
}

function speaking(display: string, audio: string, correct: string, accepted?: string[]): SpeakingSeed {
  return { display, audio, correct, accepted };
}

function buildVocabularySeeds(vocab: VocabItem[]): ChoiceSeed[] {
  const meaningSeeds = vocab.map((item, index) =>
    choice(
      `Which word matches this meaning?\n${item.clue}`,
      `Which word matches this meaning? ${item.clue}`,
      item.term,
      [
        vocab[(index + 1) % vocab.length].term,
        vocab[(index + 2) % vocab.length].term,
        vocab[(index + 3) % vocab.length].term,
      ],
      "identification",
    ),
  );

  const sentenceSeeds = vocab.map((item) =>
    choice(item.prompt, item.prompt, item.term, item.distractors),
  );

  const clueSeeds = vocab.slice(0, 5).map((item, index) =>
    choice(
      `What does "${item.term}" mean?`,
      `What does ${item.term} mean?`,
      item.clue,
      [
        vocab[(index + 2) % vocab.length].clue,
        vocab[(index + 4) % vocab.length].clue,
        vocab[(index + 6) % vocab.length].clue,
      ],
    ),
  );

  return [...meaningSeeds, ...sentenceSeeds, ...clueSeeds];
}

function buildGrammarSeeds(grammar: GrammarItem[]): ChoiceSeed[] {
  return grammar.map((item) =>
    choice(item.prompt, item.fullSentence, item.answer, item.options.filter((option) => option !== item.answer), "multiple-choice", item.accepted),
  );
}

function buildRecognitionSeeds(facts: FactItem[]): ChoiceSeed[] {
  return facts.map((item) =>
    choice(item.question, item.question, item.answer, item.distractors, "multiple-choice", item.accepted),
  );
}

function buildReadingSeeds(facts: FactItem[]): ChoiceSeed[] {
  return facts.map((item) =>
    choice(
      `${item.passage}\n\nQuestion: ${item.question}`,
      item.question,
      item.answer,
      item.distractors,
      "multiple-choice",
      item.accepted,
    ),
  );
}

function buildWorkbook4Lesson(config: LessonConfig): Lesson {
  const vocabularyExercises = makeChoices(buildVocabularySeeds(config.vocab), VOCABULARY_INSTRUCTION);
  const grammarExercises = makeChoices(buildGrammarSeeds(config.grammar), GRAMMAR_INSTRUCTION);
  const recognitionExercises = makeChoices(buildRecognitionSeeds(config.facts), RECOGNITION_INSTRUCTION);
  const readingExercises = makeChoices(buildReadingSeeds(config.facts), READ_INSTRUCTION);

  const speakingExercises = [
    ...makeSpeakings(
      config.grammar.slice(0, 5).map((item) => speaking(item.fullSentence, item.fullSentence, item.fullSentence, item.accepted)),
      SPEAK_REPEAT,
    ),
    ...makeSpeakings(
      config.facts.slice(0, 5).map((item) => speaking(item.question, item.question, item.answer, item.accepted)),
      SPEAK_SHORT,
    ),
  ];

  const writingExercises = [
    ...makeWritings(
      config.grammar.slice(5).map((item) => ({
        display: item.prompt,
        audio: item.fullSentence,
        correct: item.answer,
        accepted: item.accepted,
      })),
      WRITE_BLANK,
    ),
    ...makeWritings(config.writing, WRITE_BLANK),
  ];

  const reviewExercises = [
    ...vocabularyExercises.slice(0, 5),
    ...grammarExercises.slice(0, 5),
    ...recognitionExercises.slice(0, 5),
    ...readingExercises.slice(0, 5),
  ];

  return buildLesson(config.number, config.title, [
    { type: "practice", exercises: vocabularyExercises },
    { type: "practice", exercises: grammarExercises },
    { type: "practice", exercises: recognitionExercises },
    { type: "practice", exercises: speakingExercises },
    { type: "practice", exercises: writingExercises },
    { type: "practice", exercises: readingExercises },
    { type: "review", exercises: reviewExercises },
  ]);
}

const workbook4Configs: LessonConfig[] = [
  {
    number: 37,
    title: "Lesson 37: Supermarket",
    vocab: [
      { term: "shopping cart", clue: "the basket on wheels you push in a supermarket", prompt: "Mrs. McMartin puts the apples in the ____.", distractors: ["receipt", "cashier", "label"] },
      { term: "cashier", clue: "the person who takes your money at checkout", prompt: "The ____ smiles and gives her the total.", distractors: ["customer", "shelf", "aisle"] },
      { term: "aisle", clue: "the long space between rows of products", prompt: "Rice is in aisle three, not in the dairy ____.", distractors: ["receipt", "aisle light", "checkout"] },
      { term: "receipt", clue: "the paper that shows what you paid for", prompt: "She keeps the ____ in her bag after she pays.", distractors: ["bargain", "cashier", "shelf"] },
      { term: "shelf", clue: "a flat place where products stay in the store", prompt: "The cereal is on the top ____.", distractors: ["receipt", "customer", "checkout"] },
      { term: "bargain", clue: "a good price for something you want to buy", prompt: "The oranges are a ____ today, so she buys two bags.", distractors: ["cashier", "label", "cart"] },
      { term: "checkout", clue: "the place where you pay for your items", prompt: "The family waits near the ____ with bread and milk.", distractors: ["aisle", "shelf", "customer"] },
      { term: "label", clue: "the printed information on a product", prompt: "She reads the ____ before she buys the soup.", distractors: ["receipt", "bargain", "cashier"] },
      { term: "loaf", clue: "one whole piece of bread", prompt: "She buys one ____ of whole grain bread.", distractors: ["cart", "aisle", "receipt"] },
      { term: "customer", clue: "a person who buys things in a store", prompt: "The ____ asks for a fresh loaf of bread.", distractors: ["cashier", "shelf", "label"] },
    ],
    grammar: [
      { prompt: "Mrs. McMartin ___ to the supermarket every Monday.", answer: "goes", options: ["goes", "go", "going", "went"], fullSentence: "Mrs. McMartin goes to the supermarket every Monday." },
      { prompt: "She ___ the labels before she buys canned soup.", answer: "reads", options: ["reads", "read", "reading", "readed"], fullSentence: "She reads the labels before she buys canned soup." },
      { prompt: "The cashier ___ the receipt after the payment.", answer: "prints", options: ["prints", "print", "printing", "printed"], fullSentence: "The cashier prints the receipt after the payment." },
      { prompt: "A smart shopper ___ a list before leaving home.", answer: "makes", options: ["makes", "make", "is make", "made"], fullSentence: "A smart shopper makes a list before leaving home." },
      { prompt: "The children ___ the cart near the fruit aisle.", answer: "push", options: ["push", "pushes", "pushing", "pushed"], fullSentence: "The children push the cart near the fruit aisle." },
      { prompt: "This is the ___ shopping list.", answer: "customer's", options: ["customer's", "customers", "customer", "customers'"], fullSentence: "This is the customer's shopping list." },
      { prompt: "The color ___ the loaf is golden brown.", answer: "of", options: ["of", "for", "with", "at"], fullSentence: "The color of the loaf is golden brown." },
      { prompt: "We can see the ___ office near the entrance.", answer: "manager's", options: ["manager's", "managers", "manager", "managers'"], fullSentence: "We can see the manager's office near the entrance." },
      { prompt: "The top ___ the shelf is hard to reach.", answer: "of", options: ["of", "to", "in", "from"], fullSentence: "The top of the shelf is hard to reach." },
      { prompt: "That is my ___ favorite aisle.", answer: "father's", options: ["father's", "fathers", "father", "fathers'"], fullSentence: "That is my father's favorite aisle." },
    ],
    facts: [
      { passage: "Mrs. McMartin goes to the supermarket after breakfast. She starts in the fruit aisle and ends at checkout.", question: "Where does Mrs. McMartin end her trip?", answer: "She ends her trip at checkout.", distractors: ["She ends her trip in the parking lot.", "She ends her trip at the butcher shop.", "She ends her trip in the bakery at home."] },
      { passage: "Customer: Excuse me, where is the olive oil? Clerk: It is on the middle shelf in aisle five.", question: "Where is the olive oil?", answer: "It is on the middle shelf in aisle five.", distractors: ["It is in the freezer near the ice cream.", "It is on the counter by the cashier.", "It is under the shopping cart."] },
      { passage: "Mrs. McMartin checks the bread label because she wants fewer preservatives.", question: "Why does she check the bread label?", answer: "She checks it because she wants fewer preservatives.", distractors: ["She checks it because she wants more sugar.", "She checks it because she lost her list.", "She checks it because the cashier asks her to sing."] },
      { passage: "Her son carries the receipt while she puts the milk in a reusable bag.", question: "Who carries the receipt?", answer: "Her son carries the receipt.", distractors: ["Her daughter carries the receipt.", "The cashier carries the receipt home.", "The butcher carries the receipt."] },
      { passage: "There is a bargain on apples today, so the family buys two kilos.", question: "Why do they buy two kilos of apples?", answer: "They buy two kilos because the apples are a bargain.", distractors: ["They buy two kilos because the apples are free at school.", "They buy two kilos because the cashier needs them.", "They buy two kilos because the apples are on the floor."] },
      { passage: "Mrs. McMartin's husband likes the bakery aisle because it smells warm and fresh.", question: "Why does he like the bakery aisle?", answer: "He likes it because it smells warm and fresh.", distractors: ["He likes it because it sells shampoo.", "He likes it because it is empty and dark.", "He likes it because it has fishing boats."] },
      { passage: "At checkout, the cashier asks, 'Do you need a bag?' Mrs. McMartin answers, 'No, I have two reusable bags.'", question: "How many reusable bags does Mrs. McMartin have?", answer: "She has two reusable bags.", distractors: ["She has one reusable bag.", "She has no reusable bags.", "She has five reusable bags in the freezer."] },
      { passage: "The shopping cart is full of rice, beans, yogurt, and one loaf of bread.", question: "What is in the cart?", answer: "There is rice, beans, yogurt, and one loaf of bread in the cart.", distractors: ["There are only flowers and soap in the cart.", "There is a bicycle and a notebook in the cart.", "There are no groceries in the cart."] },
      { passage: "The manager's office is next to the customer service desk near the front door.", question: "Where is the manager's office?", answer: "It is next to the customer service desk near the front door.", distractors: ["It is inside the freezer section.", "It is behind the bakery truck at school.", "It is under the fruit shelf."] },
      { passage: "Mrs. McMartin always makes a shopping list on Sunday night.", question: "When does she make her shopping list?", answer: "She makes her shopping list on Sunday night.", distractors: ["She makes it on Friday morning.", "She makes it during gym class.", "She makes it after the movie every midnight."] },
    ],
    writing: [
      { display: "Complete: She keeps the ____ after she pays for the groceries.", audio: "She keeps the receipt after she pays for the groceries.", correct: "receipt" },
      { display: "Complete: The loaf is on the top ____ the shelf.", audio: "The loaf is on the top of the shelf.", correct: "of" },
      { display: "Complete: Mrs. McMartin ___ a list before she goes shopping.", audio: "Mrs. McMartin makes a list before she goes shopping.", correct: "makes" },
      { display: "Complete: The ____ helps customers at checkout.", audio: "The cashier helps customers at checkout.", correct: "cashier" },
      { display: "Complete: That is the ____ bag near the cart.", audio: "That is the customer's bag near the cart.", correct: "customer's" },
    ],
  },
  {
    number: 38,
    title: "Lesson 38: Fruits and Veggies",
    vocab: [
      { term: "apple", clue: "a round fruit that can be red or green", prompt: "She puts one ____ in her lunch bag.", distractors: ["rice", "lettuce", "spinach"] },
      { term: "banana", clue: "a long yellow fruit", prompt: "The child eats a ____ before soccer practice.", distractors: ["carrot", "garlic", "broccoli"] },
      { term: "carrot", clue: "a long orange vegetable", prompt: "We need one ____ for the soup.", distractors: ["grapes", "rice", "spinach"] },
      { term: "lettuce", clue: "green leaves used in salads", prompt: "There is fresh ____ in the salad bowl.", distractors: ["apple", "garlic", "banana"] },
      { term: "spinach", clue: "dark green leaves often cooked or used in salads", prompt: "The omelet has cheese and ____.", distractors: ["grapes", "carrot", "banana"] },
      { term: "rice", clue: "small grains eaten with many meals", prompt: "We need some ____ for dinner tonight.", distractors: ["apple", "grape", "tomato"] },
      { term: "garlic", clue: "a strong-smelling ingredient used in cooking", prompt: "She cuts one clove of ____.", distractors: ["banana", "lettuce", "pear"] },
      { term: "bunch", clue: "a group of fruit or vegetables together", prompt: "He buys a ____ of grapes for the picnic.", distractors: ["bottle", "slice", "carton"] },
      { term: "clove", clue: "one small part inside a head of garlic", prompt: "Please add one ____ of garlic to the pan.", distractors: ["bunch", "receipt", "aisle"] },
      { term: "broccoli", clue: "a green vegetable with a thick stem and small tops", prompt: "The soup has carrots and ____.", distractors: ["soda", "cake", "chocolate"] },
    ],
    grammar: [
      { prompt: "We need ___ apples for the pie.", answer: "a few", options: ["a few", "a little", "much", "an"], fullSentence: "We need a few apples for the pie." },
      { prompt: "There is ___ spinach in the fridge.", answer: "some", options: ["some", "many", "two", "a few"], fullSentence: "There is some spinach in the fridge." },
      { prompt: "How ___ rice do you want?", answer: "much", options: ["much", "many", "an", "a few"], fullSentence: "How much rice do you want?" },
      { prompt: "She buys ___ bananas every Saturday.", answer: "three", options: ["three", "much", "a little", "some of"], fullSentence: "She buys three bananas every Saturday." },
      { prompt: "There are ___ carrots in the basket.", answer: "many", options: ["many", "much", "a little", "any of"], fullSentence: "There are many carrots in the basket." },
      { prompt: "We need ___ olive oil for the salad.", answer: "a little", options: ["a little", "a few", "many", "three"], fullSentence: "We need a little olive oil for the salad." },
      { prompt: "Do you have ___ garlic at home?", answer: "any", options: ["any", "many", "an", "a few"], fullSentence: "Do you have any garlic at home?" },
      { prompt: "Mrs. McMartin buys ___ bunch of grapes.", answer: "a", options: ["a", "an", "some", "many"], fullSentence: "Mrs. McMartin buys a bunch of grapes." },
      { prompt: "There are ___ pineapples on the table.", answer: "two", options: ["two", "much", "a little", "some"], fullSentence: "There are two pineapples on the table." },
      { prompt: "He wants ___ lettuce for his sandwich.", answer: "some", options: ["some", "several", "many", "four"], fullSentence: "He wants some lettuce for his sandwich." },
    ],
    facts: [
      { passage: "At the farmer's market, Mrs. McMartin buys bananas, carrots, lettuce, and rice.", question: "What does Mrs. McMartin buy at the market?", answer: "She buys bananas, carrots, lettuce, and rice.", distractors: ["She buys soap, milk, and towels.", "She buys candy, soda, and shampoo.", "She buys only frozen pizza."] },
      { passage: "Seller: Do you want a bunch of grapes? Mrs. McMartin: Yes, and one head of garlic too.", question: "What does Mrs. McMartin want?", answer: "She wants a bunch of grapes and one head of garlic.", distractors: ["She wants a bottle of soda and a cake.", "She wants a toothbrush and a towel.", "She wants three cartons of yogurt only."] },
      { passage: "There is some spinach in the basket, but there are only two carrots.", question: "How many carrots are in the basket?", answer: "There are only two carrots in the basket.", distractors: ["There are ten carrots in the basket.", "There is only one carrot in the basket.", "There are no carrots in the basket."] },
      { passage: "The family uses a little olive oil and some garlic for dinner.", question: "What do they use for dinner?", answer: "They use a little olive oil and some garlic.", distractors: ["They use many apples and one notebook.", "They use some shampoo and a spoon.", "They use no ingredients at all."] },
      { passage: "Laura counts three apples and four bananas before lunch.", question: "What does Laura count?", answer: "She counts three apples and four bananas.", distractors: ["She counts three towels and four mirrors.", "She counts one loaf and one receipt.", "She counts only one orange."] },
      { passage: "Customer: Is there any broccoli today? Seller: Yes, there is fresh broccoli near the tomatoes.", question: "Where is the broccoli?", answer: "It is near the tomatoes.", distractors: ["It is in the freezer.", "It is under the sink.", "It is behind the school bus."] },
      { passage: "Mrs. McMartin says that rice is uncountable, but apples are countable.", question: "Which noun is uncountable in the sentence?", answer: "Rice is uncountable.", distractors: ["Apples are uncountable.", "Tomatoes are uncountable.", "Carrots are uncountable in that sentence."] },
      { passage: "The children wash the grapes and cut the pineapple after the market trip.", question: "What do the children do after the market trip?", answer: "They wash the grapes and cut the pineapple.", distractors: ["They freeze the milk and wash the floor.", "They open a can and clean the mirror.", "They buy shampoo and eat candy bars."] },
      { passage: "There are a few tomatoes on the shelf, but there is not much lettuce left.", question: "What is almost finished?", answer: "The lettuce is almost finished.", distractors: ["The tomatoes are almost finished.", "The rice is almost finished.", "The bananas are almost finished."] },
      { passage: "Mrs. McMartin puts one clove of garlic in the sauce and keeps the rest for later.", question: "How much garlic does she put in the sauce?", answer: "She puts one clove of garlic in the sauce.", distractors: ["She puts one bunch of garlic in the sauce.", "She puts three pineapples in the sauce.", "She puts no garlic in the sauce."] },
    ],
    writing: [
      { display: "Complete: We need ____ rice for dinner.", audio: "We need some rice for dinner.", correct: "some" },
      { display: "Complete: There are only two ____ in the basket.", audio: "There are only two carrots in the basket.", correct: "carrots" },
      { display: "Complete: Mrs. McMartin buys a ____ of grapes.", audio: "Mrs. McMartin buys a bunch of grapes.", correct: "bunch" },
      { display: "Complete: Please add one ____ of garlic to the sauce.", audio: "Please add one clove of garlic to the sauce.", correct: "clove" },
      { display: "Complete: How ____ rice do you want?", audio: "How much rice do you want?", correct: "much" },
    ],
  },
  {
    number: 39,
    title: "Lesson 39: The Butcher Shop",
    vocab: [
      { term: "beef", clue: "meat that comes from a cow", prompt: "The family buys ____ for hamburgers.", distractors: ["grapes", "soap", "yogurt"] },
      { term: "lamb", clue: "meat that comes from a young sheep", prompt: "The butcher shows her fresh ____ for Sunday lunch.", distractors: ["spinach", "soda", "bread"] },
      { term: "sausage", clue: "seasoned meat in a long skin", prompt: "He cooks one ____ with onions.", distractors: ["receipt", "apple", "carton"] },
      { term: "tray", clue: "a flat container used to carry or show food", prompt: "The chicken is on a clean ____.", distractors: ["label", "bunch", "aisle"] },
      { term: "counter", clue: "the long table where a worker serves customers", prompt: "Mrs. McMartin waits at the butcher ____.", distractors: ["receipt", "recipe", "mirror"] },
      { term: "apron", clue: "a piece of clothing that protects your clothes while you work", prompt: "The butcher wears a white ____.", distractors: ["towel", "shelf", "gum"] },
      { term: "order", clue: "the food or items a customer asks for", prompt: "The butcher prepares her ____ in five minutes.", distractors: ["label", "sink", "checkout"] },
      { term: "knife", clue: "a tool used to cut meat or vegetables", prompt: "He uses a sharp ____ to cut the beef.", distractors: ["bottle", "basket", "soap"] },
      { term: "poultry", clue: "birds such as chicken and turkey used for food", prompt: "Turkey is a kind of ____.", distractors: ["grain", "candy", "dairy"] },
      { term: "slice", clue: "a thin piece cut from a larger food", prompt: "She asks for one ____ of ham for the sandwich.", distractors: ["bunch", "carton", "receipt"] },
    ],
    grammar: [
      { prompt: "The butcher sees Laura and greets ___.", answer: "her", options: ["her", "she", "hers", "herself"], fullSentence: "The butcher sees Laura and greets her." },
      { prompt: "Mrs. McMartin buys the chicken and puts ___ in the bag.", answer: "it", options: ["it", "its", "they", "them"], fullSentence: "Mrs. McMartin buys the chicken and puts it in the bag." },
      { prompt: "The butcher gives the children sausages because he likes ___.", answer: "them", options: ["them", "they", "their", "theirs"], fullSentence: "The butcher gives the children sausages because he likes them." },
      { prompt: "I need two slices of ham. Can you cut ___, please?", answer: "them", options: ["them", "they", "their", "theirs"], fullSentence: "I need two slices of ham. Can you cut them, please?" },
      { prompt: "The apron is dirty, so the butcher washes ___.", answer: "it", options: ["it", "its", "him", "them"], fullSentence: "The apron is dirty, so the butcher washes it." },
      { prompt: "The butcher knows Mrs. McMartin, so he always helps ___.", answer: "her", options: ["her", "she", "herself", "hers"], fullSentence: "The butcher knows Mrs. McMartin, so he always helps her." },
      { prompt: "We need fresh lamb. Please show ___ the best cut.", answer: "us", options: ["us", "we", "our", "ours"], fullSentence: "We need fresh lamb. Please show us the best cut." },
      { prompt: "The children ask for chicken, and Mrs. McMartin buys ___ for dinner.", answer: "it", options: ["it", "its", "them", "their"], fullSentence: "The children ask for chicken, and Mrs. McMartin buys it for dinner." },
      { prompt: "I like these sausages. Can you weigh ___?", answer: "them", options: ["them", "they", "their", "theirs"], fullSentence: "I like these sausages. Can you weigh them?" },
      { prompt: "The butcher gives my husband a recipe because he knows ___.", answer: "him", options: ["him", "he", "his", "himself"], fullSentence: "The butcher gives my husband a recipe because he knows him." },
    ],
    facts: [
      { passage: "Butcher: Good morning. Customer: I need one kilo of chicken and two sausages, please.", question: "What does the customer need?", answer: "The customer needs one kilo of chicken and two sausages.", distractors: ["The customer needs one loaf of bread and milk.", "The customer needs shampoo and soap.", "The customer needs a bag of rice only."] },
      { passage: "The butcher puts the lamb on a tray and shows it to Mrs. McMartin.", question: "What does the butcher put on a tray?", answer: "He puts the lamb on a tray.", distractors: ["He puts lettuce on a tray.", "He puts a toothbrush on a tray.", "He puts cereal on a tray."] },
      { passage: "Mrs. McMartin likes the sausages, so she buys them for lunch.", question: "Why does she buy the sausages?", answer: "She buys them because she likes them.", distractors: ["She buys them because the cashier asks her to.", "She buys them because they are not food.", "She buys them because they are frozen towels."] },
      { passage: "The butcher sees Laura at the counter and gives her a friendly smile.", question: "Who does the butcher give a friendly smile to?", answer: "He gives Laura a friendly smile.", distractors: ["He gives a friendly smile to the shelf.", "He gives a friendly smile to the mirror.", "He gives a friendly smile to no one."] },
      { passage: "Customer: Can you cut the beef now? Butcher: Yes, I can cut it right away.", question: "What can the butcher cut right away?", answer: "He can cut the beef right away.", distractors: ["He can cut the apples right away.", "He can cut the shampoo right away.", "He can cut the yogurt right away."] },
      { passage: "The white apron is clean because the butcher washes it every afternoon.", question: "Why is the apron clean?", answer: "It is clean because the butcher washes it every afternoon.", distractors: ["It is clean because Laura paints it blue.", "It is clean because nobody wears it.", "It is clean because it stays in the freezer."] },
      { passage: "Mrs. McMartin asks the butcher for a thin slice of ham for her son's sandwich.", question: "What does she ask for?", answer: "She asks for a thin slice of ham.", distractors: ["She asks for a bunch of grapes.", "She asks for a carton of yogurt.", "She asks for a new mirror."] },
      { passage: "The children watch the butcher, and he shows them how he weighs the order.", question: "What does he show them?", answer: "He shows them how he weighs the order.", distractors: ["He shows them how he grows rice.", "He shows them how he paints the shelf.", "He shows them how he freezes soap."] },
      { passage: "At the counter, Mrs. McMartin pays for the chicken and carries it home in a cooler bag.", question: "What does she carry home?", answer: "She carries the chicken home in a cooler bag.", distractors: ["She carries the cereal home in a towel.", "She carries the mirror home in a basket.", "She carries no food home."] },
      { passage: "The butcher knows Mr. McMartin, so he gives him a discount on beef today.", question: "Why does the butcher give him a discount?", answer: "He gives him a discount because he knows him.", distractors: ["He gives him a discount because he forgot the money.", "He gives him a discount because the beef is a toy.", "He gives him a discount because he is late for school."] },
    ],
    writing: [
      { display: "Complete: The butcher helps ____ at the counter.", audio: "The butcher helps her at the counter.", correct: "her" },
      { display: "Complete: Mrs. McMartin buys the chicken and carries ____ home.", audio: "Mrs. McMartin buys the chicken and carries it home.", correct: "it" },
      { display: "Complete: We need fresh lamb. Please show ____ the best cut.", audio: "We need fresh lamb. Please show us the best cut.", correct: "us" },
      { display: "Complete: The butcher cuts the sausages and weighs ____.", audio: "The butcher cuts the sausages and weighs them.", correct: "them" },
      { display: "Complete: The clean white ____ protects the butcher's clothes.", audio: "The clean white apron protects the butcher's clothes.", correct: "apron" },
    ],
  },
  {
    number: 40,
    title: "Lesson 40: Dairy Section",
    vocab: [
      { term: "milk", clue: "a white drink from cows or other animals", prompt: "There is fresh ____ in the fridge.", distractors: ["rice", "broccoli", "gum"] },
      { term: "yogurt", clue: "a soft dairy food often eaten with fruit", prompt: "Laura eats strawberry ____ for breakfast.", distractors: ["beef", "soap", "cereal bar"] },
      { term: "butter", clue: "a soft yellow dairy product used on bread", prompt: "There is some ____ on the toast.", distractors: ["receipt", "lettuce", "lollipop"] },
      { term: "cheese", clue: "a dairy product made from milk", prompt: "The sandwich has tomato and ____.", distractors: ["grapes", "shampoo", "soup"] },
      { term: "cream", clue: "the thick part of milk used in desserts or sauces", prompt: "She adds some ____ to the soup.", distractors: ["aisle", "gum", "mirror"] },
      { term: "carton", clue: "a paper container for milk or juice", prompt: "There is a ____ of milk on the table.", distractors: ["clove", "slice", "bunch"] },
      { term: "bottle", clue: "a container made of glass or plastic for liquids", prompt: "There are two ____ of yogurt drink in the cooler.", distractors: ["aprons", "trays", "labels"] },
      { term: "fridge", clue: "the cold machine where food stays fresh", prompt: "The cheese is in the ____.", distractors: ["aisle", "counter", "receipt"] },
      { term: "shelf", clue: "the flat place where products are arranged", prompt: "There are three yogurts on the top ____.", distractors: ["carton", "bag", "knife"] },
      { term: "egg", clue: "an oval food that comes from a chicken", prompt: "There is an ____ next to the butter.", distractors: ["apple", "mirror", "receipt"] },
    ],
    grammar: [
      { prompt: "There ___ a carton of milk in the fridge.", answer: "is", options: ["is", "are", "do", "does"], fullSentence: "There is a carton of milk in the fridge." },
      { prompt: "There ___ three yogurts on the shelf.", answer: "are", options: ["are", "is", "does", "be"], fullSentence: "There are three yogurts on the shelf." },
      { prompt: "___ there any cheese in the bag?", answer: "Is", options: ["Is", "Are", "Do", "Does"], fullSentence: "Is there any cheese in the bag?" },
      { prompt: "___ there two bottles of kefir on the counter?", answer: "Are", options: ["Are", "Is", "Do", "Does"], fullSentence: "Are there two bottles of kefir on the counter?" },
      { prompt: "There ___ not any butter in this basket.", answer: "is", options: ["is", "are", "do", "does"], fullSentence: "There is not any butter in this basket." },
      { prompt: "There ___ a clean spoon next to the yogurt.", answer: "is", options: ["is", "are", "do", "does"], fullSentence: "There is a clean spoon next to the yogurt." },
      { prompt: "There ___ two eggs and one bottle of milk on the tray.", answer: "are", options: ["are", "is", "does", "be"], fullSentence: "There are two eggs and one bottle of milk on the tray." },
      { prompt: "___ there a dairy aisle in this supermarket?", answer: "Is", options: ["Is", "Are", "Do", "Does"], fullSentence: "Is there a dairy aisle in this supermarket?" },
      { prompt: "There ___ some cream in the small carton.", answer: "is", options: ["is", "are", "do", "does"], fullSentence: "There is some cream in the small carton." },
      { prompt: "___ there many yogurt cups left?", answer: "Are", options: ["Are", "Is", "Do", "Does"], fullSentence: "Are there many yogurt cups left?" },
    ],
    facts: [
      { passage: "Mrs. McMartin stands in the dairy section with milk, yogurt, and cheese in her basket.", question: "What is in her basket?", answer: "There is milk, yogurt, and cheese in her basket.", distractors: ["There is only candy in her basket.", "There are towels and soap in her basket.", "There is frozen pizza and shampoo in her basket."] },
      { passage: "Customer: Is there any butter today? Clerk: Yes, there is fresh butter on the middle shelf.", question: "Where is the butter?", answer: "It is on the middle shelf.", distractors: ["It is under the sink.", "It is in the candy aisle.", "It is outside the supermarket."] },
      { passage: "There are four yogurt cups in the fridge, but there is only one bottle of milk left.", question: "How many bottles of milk are left?", answer: "There is only one bottle of milk left.", distractors: ["There are four bottles of milk left.", "There are no bottles of milk left.", "There are three bottles of milk left."] },
      { passage: "The cheese is next to the eggs, and the cream is in the small carton.", question: "Where is the cheese?", answer: "It is next to the eggs.", distractors: ["It is in the freezer.", "It is behind the cashier.", "It is under the tray."] },
      { passage: "Mrs. McMartin checks the shelf because there are many kinds of yogurt there.", question: "Why does she check the shelf?", answer: "She checks it because there are many kinds of yogurt there.", distractors: ["She checks it because there is no light in the store.", "She checks it because she wants a new mirror.", "She checks it because the bread is in the sink."] },
      { passage: "There is a dairy aisle near the bakery, and there are two workers in that section.", question: "How many workers are in that section?", answer: "There are two workers in that section.", distractors: ["There is one worker in that section.", "There are five workers in that section.", "There are no workers in that section."] },
      { passage: "The family needs eggs for breakfast, so Laura puts a box of eggs in the cart.", question: "Why does Laura put eggs in the cart?", answer: "She puts eggs in the cart because the family needs them for breakfast.", distractors: ["She puts eggs in the cart because they are toys.", "She puts eggs in the cart because the butcher asks her to.", "She puts eggs in the cart because they are on the mirror."] },
      { passage: "Customer: Are there any yogurt drinks today? Clerk: Yes, there are two bottles near the cold door.", question: "How many yogurt drinks are there?", answer: "There are two yogurt drinks near the cold door.", distractors: ["There is one yogurt drink near the cold door.", "There are five yogurt drinks near the cold door.", "There are no yogurt drinks there."] },
      { passage: "There is some cream for the soup, but there is not any butter for the bread.", question: "What is missing?", answer: "There is not any butter for the bread.", distractors: ["There is not any milk for the soup.", "There are not any apples for the pie.", "There is not any rice for the salad."] },
      { passage: "The little boy asks, 'Is there a spoon for my yogurt?' His mother says, 'Yes, there is one in my bag.'", question: "Where is the spoon?", answer: "There is one spoon in his mother's bag.", distractors: ["There is one spoon on the roof.", "There is one spoon in the butcher's truck.", "There is no spoon anywhere."] },
    ],
    writing: [
      { display: "Complete: There ____ a carton of milk in the fridge.", audio: "There is a carton of milk in the fridge.", correct: "is" },
      { display: "Complete: There ____ three yogurts on the shelf.", audio: "There are three yogurts on the shelf.", correct: "are" },
      { display: "Complete: ____ there any cheese in the bag?", audio: "Is there any cheese in the bag?", correct: "Is" },
      { display: "Complete: There is some ____ in the small carton.", audio: "There is some cream in the small carton.", correct: "cream" },
      { display: "Complete: There are two ____ near the cold door.", audio: "There are two bottles near the cold door.", correct: "bottles" },
    ],
  },
  {
    number: 41,
    title: "Lesson 41: Carbonated Beverages",
    vocab: [
      { term: "soda", clue: "a sweet carbonated drink", prompt: "At the party, the children drink orange ____.", distractors: ["lettuce", "oats", "soap"] },
      { term: "sparkling water", clue: "water with bubbles", prompt: "Mrs. McMartin prefers ____ to cola.", distractors: ["beef", "spinach", "garlic"] },
      { term: "juice", clue: "a drink made from fruit", prompt: "She serves cold grape ____ with lunch.", distractors: ["counter", "mirror", "label"] },
      { term: "blender", clue: "a machine used to mix fruit drinks", prompt: "Laura uses the ____ to make smoothies.", distractors: ["carton", "receipt", "shelf"] },
      { term: "smoothie", clue: "a thick fruit drink mixed in a blender", prompt: "The banana ____ tastes fresh and sweet.", distractors: ["tray", "knife", "order"] },
      { term: "straw", clue: "a thin tube used for drinking", prompt: "He drinks the soda with a paper ____.", distractors: ["apron", "bunch", "slice"] },
      { term: "can", clue: "a metal container for drinks or food", prompt: "There is a cold ____ of cola on the table.", distractors: ["clove", "cart", "loaf"] },
      { term: "flavor", clue: "the taste of a food or drink", prompt: "My favorite ____ is lemon.", distractors: ["aisle", "counter", "receipt"] },
      { term: "party", clue: "a celebration with friends or family", prompt: "They open the soda only at a birthday ____.", distractors: ["mirror", "recipe", "label"] },
      { term: "mineral water", clue: "water from a spring, often sold in bottles", prompt: "Mr. McMartin orders cold ____ with lunch.", distractors: ["chocolate", "sausage", "rice"] },
    ],
    grammar: [
      { prompt: "Mrs. McMartin ___ fresh juice to soda.", answer: "prefers", options: ["prefers", "prefer", "preferring", "preferred"], fullSentence: "Mrs. McMartin prefers fresh juice to soda." },
      { prompt: "The children ___ fruit smoothies after soccer.", answer: "like", options: ["like", "likes", "liked", "is like"], fullSentence: "The children like fruit smoothies after soccer." },
      { prompt: "My husband ___ sparkling water with dinner.", answer: "loves", options: ["loves", "love", "loving", "loved"], fullSentence: "My husband loves sparkling water with dinner." },
      { prompt: "I ___ lemon soda, but I drink it only at parties.", answer: "like", options: ["like", "likes", "am like", "liked"], fullSentence: "I like lemon soda, but I drink it only at parties." },
      { prompt: "Laura and Eric ___ juice to cola on school days.", answer: "prefer", options: ["prefer", "prefers", "preferred", "preferring"], fullSentence: "Laura and Eric prefer juice to cola on school days." },
      { prompt: "She prefers ___ water to soda.", answer: "sparkling", options: ["sparkling", "sparkle", "sparkled", "sparkles"], fullSentence: "She prefers sparkling water to soda." },
      { prompt: "We ___ smoothies because they taste fresh.", answer: "love", options: ["love", "loves", "loved", "loving"], fullSentence: "We love smoothies because they taste fresh." },
      { prompt: "My brother ___ orange soda more than grape soda.", answer: "likes", options: ["likes", "like", "liked", "liking"], fullSentence: "My brother likes orange soda more than grape soda." },
      { prompt: "They prefer homemade juice ___ carbonated drinks.", answer: "to", options: ["to", "for", "with", "at"], fullSentence: "They prefer homemade juice to carbonated drinks." },
      { prompt: "Mrs. McMartin ___ to make smoothies in the blender.", answer: "likes", options: ["likes", "like", "liked", "liking"], fullSentence: "Mrs. McMartin likes to make smoothies in the blender." },
    ],
    facts: [
      { passage: "Mrs. McMartin makes fruit smoothies on hot afternoons, and the children love them.", question: "What do the children love?", answer: "The children love the fruit smoothies.", distractors: ["The children love canned soup.", "The children love frozen peas.", "The children love soap bubbles."] },
      { passage: "At birthday parties, the family drinks soda, but on weekdays they prefer juice and mineral water.", question: "What do they drink on weekdays?", answer: "They drink juice and mineral water on weekdays.", distractors: ["They drink only soda on weekdays.", "They drink only coffee on weekdays.", "They drink no liquids on weekdays."] },
      { passage: "Laura puts ice, mango, and yogurt in the blender for a smoothie.", question: "What does Laura put in the blender?", answer: "She puts ice, mango, and yogurt in the blender.", distractors: ["She puts shampoo, soap, and towels in the blender.", "She puts bread, beef, and cheese in the blender.", "She puts no ingredients in the blender."] },
      { passage: "Mr. McMartin prefers sparkling water to cola because it is lighter.", question: "Why does he prefer sparkling water?", answer: "He prefers it because it is lighter.", distractors: ["He prefers it because it is sweeter than cake.", "He prefers it because it is made of candy.", "He prefers it because it is frozen solid."] },
      { passage: "The children use paper straws with their orange soda at the party.", question: "What kind of straws do the children use?", answer: "They use paper straws.", distractors: ["They use wooden spoons.", "They use metal trays.", "They use no straws at all."] },
      { passage: "My sister likes grape juice, but I prefer apple juice.", question: "What do I prefer?", answer: "I prefer apple juice.", distractors: ["I prefer grape soda.", "I prefer sparkling soup.", "I prefer no drink."] },
      { passage: "There is one cold can of lemon soda on the table for the guests.", question: "What is on the table?", answer: "There is one cold can of lemon soda on the table.", distractors: ["There are five bowls of cereal on the table.", "There is one towel on the table for the shower.", "There is one loaf of bread in the sink."] },
      { passage: "Mrs. McMartin likes the fresh flavor of homemade smoothies.", question: "What does she like about homemade smoothies?", answer: "She likes their fresh flavor.", distractors: ["She likes their loud color only.", "She likes their heavy cans.", "She likes their frozen wrappers."] },
      { passage: "At lunch, Eric chooses mineral water, but his cousin chooses orange soda.", question: "What does Eric choose at lunch?", answer: "Eric chooses mineral water at lunch.", distractors: ["Eric chooses orange soda at lunch.", "Eric chooses hot soup at lunch.", "Eric chooses no drink at lunch."] },
      { passage: "The family loves juice, but they rarely buy soda for the house.", question: "What do they rarely buy for the house?", answer: "They rarely buy soda for the house.", distractors: ["They rarely buy apples for the house.", "They rarely buy milk for the house.", "They rarely buy towels for the house."] },
    ],
    writing: [
      { display: "Complete: Mrs. McMartin ____ fresh juice to soda.", audio: "Mrs. McMartin prefers fresh juice to soda.", correct: "prefers" },
      { display: "Complete: We ____ smoothies because they taste fresh.", audio: "We love smoothies because they taste fresh.", correct: "love" },
      { display: "Complete: They prefer homemade juice ____ carbonated drinks.", audio: "They prefer homemade juice to carbonated drinks.", correct: "to" },
      { display: "Complete: Laura uses the ____ to make smoothies.", audio: "Laura uses the blender to make smoothies.", correct: "blender" },
      { display: "Complete: The children use paper ____ with their orange soda.", audio: "The children use paper straws with their orange soda.", correct: "straws" },
    ],
  },
  {
    number: 42,
    title: "Lesson 42: Frozen Foods",
    vocab: [
      { term: "freezer", clue: "the cold part where frozen food stays hard", prompt: "The ice cream is in the ____.", distractors: ["sink", "mirror", "counter"] },
      { term: "frozen peas", clue: "small green vegetables kept very cold", prompt: "She adds ____ to the rice.", distractors: ["shampoo", "candy bars", "soap"] },
      { term: "nuggets", clue: "small pieces of chicken covered and cooked", prompt: "The children sometimes eat chicken ____.", distractors: ["cloves", "labels", "trays"] },
      { term: "leftovers", clue: "food that remains after a meal", prompt: "We eat the ____ for lunch the next day.", distractors: ["aisles", "mirrors", "aprons"] },
      { term: "takeout", clue: "food you buy cooked and carry home", prompt: "They rarely order ____ on weekdays.", distractors: ["receipt", "garlic", "soap"] },
      { term: "weekly menu", clue: "a plan for meals during the week", prompt: "Mrs. McMartin writes a ____ every Sunday.", distractors: ["party favor", "shopping cart", "label"] },
      { term: "package", clue: "a container or wrapping around food", prompt: "She reads the ____ before buying frozen fish.", distractors: ["bunch", "clove", "slice"] },
      { term: "recipe", clue: "instructions for making a dish", prompt: "Laura follows a new ____ after school.", distractors: ["receipt", "mirror", "apron"] },
      { term: "healthy habit", clue: "a good routine that helps your body", prompt: "Planning meals is a ____ for the family.", distractors: ["carbonated drink", "shopping label", "metal can"] },
      { term: "meal plan", clue: "another phrase for a weekly food plan", prompt: "The ____ helps them avoid fast food.", distractors: ["paper straw", "gift bag", "fruit shake"] },
    ],
    grammar: [
      { prompt: "Mrs. McMartin ___ plans the weekly menu on Sunday.", answer: "always", options: ["always", "never", "rarely", "hardly ever"], fullSentence: "Mrs. McMartin always plans the weekly menu on Sunday." },
      { prompt: "The family ___ orders takeout on weekdays.", answer: "rarely", options: ["rarely", "always", "usually", "often"], fullSentence: "The family rarely orders takeout on weekdays." },
      { prompt: "Laura ___ helps in the kitchen after school.", answer: "often", options: ["often", "never", "hardly ever", "once"], fullSentence: "Laura often helps in the kitchen after school." },
      { prompt: "They ___ skip dinner together.", answer: "never", options: ["never", "always", "often", "usually"], fullSentence: "They never skip dinner together." },
      { prompt: "Mrs. McMartin ___ buys frozen nuggets for quick lunches.", answer: "sometimes", options: ["sometimes", "always", "never", "hardly"], fullSentence: "Mrs. McMartin sometimes buys frozen nuggets for quick lunches." },
      { prompt: "The children ___ eat leftovers the next day.", answer: "usually", options: ["usually", "never", "yesterday", "an"], fullSentence: "The children usually eat leftovers the next day." },
      { prompt: "We ___ keep ice cream in the freezer in summer.", answer: "often", options: ["often", "none", "rare", "any"], fullSentence: "We often keep ice cream in the freezer in summer." },
      { prompt: "My father ___ forgets the meal plan because it is on the fridge.", answer: "hardly ever", options: ["hardly ever", "always", "often", "sometimesly"], fullSentence: "My father hardly ever forgets the meal plan because it is on the fridge." },
      { prompt: "Laura is ___ excited to try a new recipe.", answer: "usually", options: ["usually", "many", "few", "much"], fullSentence: "Laura is usually excited to try a new recipe." },
      { prompt: "The family ___ eats fast food when the weekly menu is ready.", answer: "seldom", options: ["seldom", "always", "daily", "every"], fullSentence: "The family seldom eats fast food when the weekly menu is ready." },
    ],
    facts: [
      { passage: "Mrs. McMartin always plans the weekly menu on Sunday night.", question: "When does Mrs. McMartin plan the weekly menu?", answer: "She plans it on Sunday night.", distractors: ["She plans it on Friday morning.", "She plans it once a year.", "She never plans it."] },
      { passage: "The children often help with the recipe, but they rarely order takeout on weekdays.", question: "What do they rarely order on weekdays?", answer: "They rarely order takeout on weekdays.", distractors: ["They rarely order apples on weekdays.", "They rarely order milk on weekdays.", "They rarely order breakfast on weekdays."] },
      { passage: "There is ice cream in the freezer, and there are frozen peas near the chicken nuggets.", question: "Where are the frozen peas?", answer: "They are near the chicken nuggets.", distractors: ["They are under the sink.", "They are in the candy bag.", "They are on the bathroom shelf."] },
      { passage: "Laura usually eats leftovers for lunch after a busy school day.", question: "What does Laura usually eat for lunch?", answer: "She usually eats leftovers for lunch.", distractors: ["She usually eats candy for lunch.", "She usually eats soap for lunch.", "She usually eats nothing for lunch."] },
      { passage: "The family never skips dinner together because they like to talk at the table.", question: "Why do they never skip dinner together?", answer: "They never skip dinner together because they like to talk at the table.", distractors: ["They never skip dinner together because they sleep in the kitchen.", "They never skip dinner together because they dislike food.", "They never skip dinner together because the freezer is noisy."] },
      { passage: "Mrs. McMartin sometimes buys frozen nuggets for quick lunches after soccer practice.", question: "Why does she sometimes buy frozen nuggets?", answer: "She buys them for quick lunches after soccer practice.", distractors: ["She buys them for a birthday cake.", "She buys them to wash the dishes.", "She buys them to feed the mirror."] },
      { passage: "My father hardly ever forgets the meal plan because it stays on the fridge door.", question: "Why does he hardly ever forget the meal plan?", answer: "He hardly ever forgets it because it stays on the fridge door.", distractors: ["He hardly ever forgets it because it is under his pillow.", "He hardly ever forgets it because he never reads.", "He hardly ever forgets it because it is in the freezer bag."] },
      { passage: "The package says the frozen fish must stay cold until dinner time.", question: "What does the package say about the fish?", answer: "It says the fish must stay cold until dinner time.", distractors: ["It says the fish must stay on the shelf.", "It says the fish must stay sweet like candy.", "It says the fish must stay in the bathroom."] },
      { passage: "Laura is usually excited to try a new recipe with her mother after school.", question: "How does Laura usually feel about a new recipe?", answer: "She is usually excited to try a new recipe.", distractors: ["She is usually angry to try a new recipe.", "She is usually asleep during the recipe.", "She is usually bored by the shopping cart."] },
      { passage: "The family seldom eats fast food when the meal plan is ready.", question: "When does the family seldom eat fast food?", answer: "They seldom eat fast food when the meal plan is ready.", distractors: ["They seldom eat fast food when there is no food at all.", "They seldom eat fast food when the cashier sings.", "They seldom eat fast food when the mirror breaks."] },
    ],
    writing: [
      { display: "Complete: Mrs. McMartin ____ plans the weekly menu on Sunday.", audio: "Mrs. McMartin always plans the weekly menu on Sunday.", correct: "always" },
      { display: "Complete: The family ____ orders takeout on weekdays.", audio: "The family rarely orders takeout on weekdays.", correct: "rarely" },
      { display: "Complete: The children usually eat ____ for lunch the next day.", audio: "The children usually eat leftovers for lunch the next day.", correct: "leftovers" },
      { display: "Complete: There is ice cream in the ____.", audio: "There is ice cream in the freezer.", correct: "freezer" },
      { display: "Complete: Laura is usually excited to try a new ____.", audio: "Laura is usually excited to try a new recipe.", correct: "recipe" },
    ],
  },
  {
    number: 43,
    title: "Lesson 43: Canned Goods",
    vocab: [
      { term: "can", clue: "a metal container for food", prompt: "There is a red ____ of soup in the pantry.", distractors: ["bowl", "soap", "towel"] },
      { term: "lid", clue: "the top part that closes a container", prompt: "He removes the ____ before heating the soup.", distractors: ["label", "basket", "mirror"] },
      { term: "beans", clue: "small seeds often eaten in meals", prompt: "Mrs. McMartin opens a can of ____ for lunch.", distractors: ["shampoo", "yogurt", "gum"] },
      { term: "corn", clue: "yellow vegetable kernels from a plant", prompt: "The salad has tomato and canned ____.", distractors: ["soap", "rice bag", "toothbrush"] },
      { term: "soup", clue: "a hot liquid meal", prompt: "The family eats tomato ____ on rainy nights.", distractors: ["mirror", "party", "receipt"] },
      { term: "tuna", clue: "a fish often sold in cans", prompt: "She makes sandwiches with canned ____.", distractors: ["oats", "broccoli", "soda"] },
      { term: "pantry", clue: "the place where dry food is stored at home", prompt: "The cans stay in the kitchen ____.", distractors: ["sink", "apron", "freezer"] },
      { term: "can opener", clue: "a tool used to open cans", prompt: "My father uses a ____ to open the beans.", distractors: ["blender", "straw", "carton"] },
      { term: "shelf life", clue: "the time a food can stay good before it expires", prompt: "Canned soup has a long ____.", distractors: ["shopping cart", "paper straw", "fruit shake"] },
      { term: "tomato sauce", clue: "a red sauce made from tomatoes", prompt: "She adds canned ____ to the pasta.", distractors: ["cream cheese", "sparkling water", "peanut candy"] },
    ],
    grammar: [
      { prompt: "Mrs. McMartin usually ___ canned beans on Mondays.", answer: "buys", options: ["buys", "buy", "bought", "buying"], fullSentence: "Mrs. McMartin usually buys canned beans on Mondays." },
      { prompt: "Yesterday, she ___ a can of corn after work.", answer: "bought", options: ["bought", "buys", "buy", "buying"], fullSentence: "Yesterday, she bought a can of corn after work." },
      { prompt: "The family often ___ soup for lunch in winter.", answer: "eats", options: ["eats", "eat", "ate", "eating"], fullSentence: "The family often eats soup for lunch in winter." },
      { prompt: "Last night, Laura ___ tuna sandwiches for dinner.", answer: "made", options: ["made", "makes", "make", "making"], fullSentence: "Last night, Laura made tuna sandwiches for dinner." },
      { prompt: "My father usually ___ the cans in the pantry.", answer: "keeps", options: ["keeps", "keep", "kept", "keeping"], fullSentence: "My father usually keeps the cans in the pantry." },
      { prompt: "This morning, he ___ the can opener on the counter.", answer: "left", options: ["left", "leaves", "leave", "leaving"], fullSentence: "This morning, he left the can opener on the counter." },
      { prompt: "Do you usually ___ tomato sauce with pasta?", answer: "eat", options: ["eat", "ate", "eats", "eating"], fullSentence: "Do you usually eat tomato sauce with pasta?" },
      { prompt: "Did Mrs. McMartin ___ canned corn yesterday?", answer: "buy", options: ["buy", "bought", "buys", "buying"], fullSentence: "Did Mrs. McMartin buy canned corn yesterday?" },
      { prompt: "The children ___ tuna sandwiches on Fridays.", answer: "have", options: ["have", "has", "had", "having"], fullSentence: "The children have tuna sandwiches on Fridays." },
      { prompt: "Last weekend, they ___ vegetable soup at home.", answer: "had", options: ["had", "have", "has", "having"], fullSentence: "Last weekend, they had vegetable soup at home." },
    ],
    facts: [
      { passage: "Mrs. McMartin usually buys canned beans on Monday, but yesterday she bought canned corn.", question: "What did she buy yesterday?", answer: "She bought canned corn yesterday.", distractors: ["She bought canned beans yesterday.", "She bought shampoo yesterday.", "She bought no food yesterday."] },
      { passage: "Laura makes tuna sandwiches on Friday, and last night she made tomato soup too.", question: "What did Laura make last night?", answer: "She made tomato soup last night.", distractors: ["She made chocolate bars last night.", "She made frozen peas last night.", "She made no dinner last night."] },
      { passage: "My father keeps the cans in the pantry, but this morning he left the can opener on the counter.", question: "Where did he leave the can opener?", answer: "He left it on the counter.", distractors: ["He left it in the freezer.", "He left it in the bathroom.", "He left it under the car."] },
      { passage: "The family often eats soup in winter, and last weekend they had vegetable soup after church.", question: "What did they have last weekend?", answer: "They had vegetable soup last weekend.", distractors: ["They had fruit candy last weekend.", "They had sparkling water only last weekend.", "They had shampoo last weekend."] },
      { passage: "Customer: Do you usually eat canned tuna? Laura: Yes, but yesterday I ate fresh fish.", question: "What did Laura eat yesterday?", answer: "She ate fresh fish yesterday.", distractors: ["She ate canned tuna yesterday.", "She ate only bread yesterday.", "She ate nothing yesterday."] },
      { passage: "Canned soup has a long shelf life, so Mrs. McMartin keeps two cans for busy days.", question: "Why does she keep two cans of soup?", answer: "She keeps them for busy days.", distractors: ["She keeps them for the bathroom shelf.", "She keeps them to wash dishes.", "She keeps them for the dog to read."] },
      { passage: "Did Mrs. McMartin buy tomato sauce yesterday? Yes, she bought two cans after work.", question: "How many cans of tomato sauce did she buy?", answer: "She bought two cans of tomato sauce.", distractors: ["She bought one can of tomato sauce.", "She bought five cans of tomato sauce.", "She bought no tomato sauce."] },
      { passage: "The pantry is full today because Mr. McMartin organized it last night.", question: "Why is the pantry full today?", answer: "It is full because Mr. McMartin organized it last night.", distractors: ["It is full because the cashier lives there.", "It is full because the mirror is inside.", "It is full because the freezer melted."] },
      { passage: "On Fridays, the children have tuna sandwiches, but last Friday they had bean soup instead.", question: "What did they have last Friday?", answer: "They had bean soup last Friday.", distractors: ["They had tuna sandwiches last Friday.", "They had cereal only last Friday.", "They had candy soup last Friday."] },
      { passage: "Mrs. McMartin usually checks the lids, and yesterday she checked every label too.", question: "What did she check yesterday too?", answer: "She checked every label yesterday too.", distractors: ["She checked every towel yesterday too.", "She checked every notebook yesterday too.", "She checked no labels yesterday."] },
    ],
    writing: [
      { display: "Complete: Yesterday, she ____ a can of corn after work.", audio: "Yesterday, she bought a can of corn after work.", correct: "bought" },
      { display: "Complete: Mrs. McMartin usually ____ canned beans on Mondays.", audio: "Mrs. McMartin usually buys canned beans on Mondays.", correct: "buys" },
      { display: "Complete: My father uses a can ____ to open the beans.", audio: "My father uses a can opener to open the beans.", correct: "opener" },
      { display: "Complete: Last weekend, they ____ vegetable soup at home.", audio: "Last weekend, they had vegetable soup at home.", correct: "had" },
      { display: "Complete: Canned soup has a long shelf ____.", audio: "Canned soup has a long shelf life.", correct: "life" },
    ],
  },
  {
    number: 44,
    title: "Lesson 44: Candy",
    vocab: [
      { term: "gummy bears", clue: "small soft candies shaped like bears", prompt: "Her favorite candy is ____.", distractors: ["whole grains", "frozen peas", "olive oil"] },
      { term: "lollipop", clue: "a hard candy on a stick", prompt: "The child holds a red ____ at the party.", distractors: ["yogurt", "receipt", "can opener"] },
      { term: "chocolate bar", clue: "a flat sweet bar made from chocolate", prompt: "He buys one dark ____ after lunch.", distractors: ["shelf life", "paper straw", "cereal bowl"] },
      { term: "mint", clue: "a small candy with a fresh taste", prompt: "There is a ____ in my pocket after dinner.", distractors: ["carrot", "carton", "tray"] },
      { term: "chewing gum", clue: "a sweet thing you chew but do not swallow", prompt: "Please do not bring ____ to class.", distractors: ["rice", "butter", "broccoli"] },
      { term: "wrapper", clue: "the paper or plastic around candy", prompt: "The ____ goes in the trash, not on the table.", distractors: ["aisle", "counter", "bagel"] },
      { term: "gift bag", clue: "a small bag used to hold a present", prompt: "The candy is inside a blue ____.", distractors: ["freezer", "shelf", "mirror"] },
      { term: "party favor", clue: "a small gift given to guests at a party", prompt: "Each child gets a sweet ____.", distractors: ["weekly menu", "meal plan", "shopping cart"] },
      { term: "hard candy", clue: "candy that stays firm and dissolves slowly", prompt: "Grandpa likes lemon ____ after lunch.", distractors: ["lettuce", "sausage", "soap"] },
      { term: "sweet tooth", clue: "a strong liking for sweet food", prompt: "My brother has a real ____.", distractors: ["cold shelf", "paper label", "fruit aisle"] },
    ],
    grammar: [
      { prompt: "This is ___ candy bag.", answer: "my", options: ["my", "me", "mine", "I"], fullSentence: "This is my candy bag." },
      { prompt: "Laura shares ___ gummy bears with her cousin.", answer: "her", options: ["her", "she", "hers", "herself"], fullSentence: "Laura shares her gummy bears with her cousin." },
      { prompt: "Mr. McMartin keeps ___ chocolate bar in the drawer.", answer: "his", options: ["his", "him", "he", "himself"], fullSentence: "Mr. McMartin keeps his chocolate bar in the drawer." },
      { prompt: "We put the party favors in ___ gift bags.", answer: "our", options: ["our", "us", "ours", "we"], fullSentence: "We put the party favors in our gift bags." },
      { prompt: "The children show ___ wrappers to the teacher.", answer: "their", options: ["their", "them", "theirs", "they"], fullSentence: "The children show their wrappers to the teacher." },
      { prompt: "Is this ___ lollipop or mine?", answer: "your", options: ["your", "you", "yours", "yourself"], fullSentence: "Is this your lollipop or mine?" },
      { prompt: "The twins open ___ candy at the same time.", answer: "their", options: ["their", "them", "they", "theirs"], fullSentence: "The twins open their candy at the same time." },
      { prompt: "Mrs. McMartin carries ___ mint in her purse.", answer: "her", options: ["her", "she", "herself", "hers"], fullSentence: "Mrs. McMartin carries her mint in her purse." },
      { prompt: "Do you know ___ favorite candy flavor?", answer: "his", options: ["his", "him", "he", "himself"], fullSentence: "Do you know his favorite candy flavor?" },
      { prompt: "This table has ___ wrappers on it, not ours.", answer: "their", options: ["their", "our", "my", "your"], fullSentence: "This table has their wrappers on it, not ours." },
    ],
    facts: [
      { passage: "Laura puts her gummy bears in a small gift bag for the party.", question: "What does Laura put in the gift bag?", answer: "She puts her gummy bears in the gift bag.", distractors: ["She puts her shampoo in the gift bag.", "She puts her broccoli in the gift bag.", "She puts her rice in the gift bag."] },
      { passage: "Mr. McMartin keeps his chocolate bar in the top drawer at work.", question: "Where does Mr. McMartin keep his chocolate bar?", answer: "He keeps it in the top drawer at work.", distractors: ["He keeps it in the freezer at work.", "He keeps it under the car at work.", "He keeps it in the bathroom at work."] },
      { passage: "Our party favors have mints and lollipops inside each blue bag.", question: "What is inside each blue bag?", answer: "There are mints and lollipops inside each blue bag.", distractors: ["There are eggs and cheese inside each blue bag.", "There are mirrors and towels inside each blue bag.", "There is only rice inside each blue bag."] },
      { passage: "The children throw their wrappers in the trash after the birthday song.", question: "What do the children throw in the trash?", answer: "They throw their wrappers in the trash.", distractors: ["They throw their notebooks in the trash.", "They throw their apples in the trash.", "They throw their shoes in the trash."] },
      { passage: "Customer: Is this your lollipop? Boy: No, it is his lollipop, not mine.", question: "Whose lollipop is it?", answer: "It is his lollipop.", distractors: ["It is her lollipop.", "It is our lollipop.", "It is no one's lollipop."] },
      { passage: "Mrs. McMartin carries her mint in her purse because she likes a fresh taste after lunch.", question: "Why does she carry a mint?", answer: "She carries it because she likes a fresh taste after lunch.", distractors: ["She carries it because it is a homework tool.", "She carries it because it cleans the sink.", "She carries it because it is a frozen vegetable."] },
      { passage: "The twins open their candy together and share it with their friends.", question: "Who do the twins share the candy with?", answer: "They share it with their friends.", distractors: ["They share it with the freezer.", "They share it with no one.", "They share it with the shopping cart."] },
      { passage: "Do you know his favorite candy flavor? Yes, his favorite flavor is lemon.", question: "What is his favorite candy flavor?", answer: "His favorite candy flavor is lemon.", distractors: ["His favorite candy flavor is rice.", "His favorite candy flavor is mint soap.", "His favorite candy flavor is tuna."] },
      { passage: "Our teacher says that our candy must stay in our bags during class.", question: "Where must the candy stay during class?", answer: "It must stay in our bags during class.", distractors: ["It must stay on the desks during class.", "It must stay in the sink during class.", "It must stay in the parking lot during class."] },
      { passage: "The family has a sweet tooth, but they save their candy for special days.", question: "When do they save their candy for?", answer: "They save their candy for special days.", distractors: ["They save their candy for breakfast every day.", "They save their candy for the freezer shelf.", "They save their candy for the shower."] },
    ],
    writing: [
      { display: "Complete: Laura shares ____ gummy bears with her cousin.", audio: "Laura shares her gummy bears with her cousin.", correct: "her" },
      { display: "Complete: We put the party favors in ____ gift bags.", audio: "We put the party favors in our gift bags.", correct: "our" },
      { display: "Complete: The children throw ____ wrappers in the trash.", audio: "The children throw their wrappers in the trash.", correct: "their" },
      { display: "Complete: Is this ____ lollipop or mine?", audio: "Is this your lollipop or mine?", correct: "your" },
      { display: "Complete: Mr. McMartin keeps ____ chocolate bar in the drawer.", audio: "Mr. McMartin keeps his chocolate bar in the drawer.", correct: "his" },
    ],
  },
  {
    number: 45,
    title: "Lesson 45: Personal Hygiene",
    vocab: [
      { term: "soap", clue: "something you use to wash your hands or body", prompt: "There is new lavender ____ by the sink.", distractors: ["soda", "rice", "cereal"] },
      { term: "shampoo", clue: "liquid used to wash your hair", prompt: "She uses lemon ____ in the shower.", distractors: ["tuna", "milk", "mint"] },
      { term: "toothbrush", clue: "the tool you use to clean your teeth", prompt: "My blue ____ is next to the toothpaste.", distractors: ["ladle", "receipt", "cart"] },
      { term: "towel", clue: "the cloth you use to dry your body or hands", prompt: "He hangs the clean ____ behind the door.", distractors: ["wrapper", "tray", "lid"] },
      { term: "mirror", clue: "the glass you look into", prompt: "She checks her hair in the ____.", distractors: ["pantry", "freezer", "aisle"] },
      { term: "lotion", clue: "cream used to make skin soft", prompt: "Mrs. McMartin uses hand ____ after washing the dishes.", distractors: ["beans", "rice", "corn"] },
      { term: "comb", clue: "a tool used to arrange your hair", prompt: "Eric keeps a black ____ in his backpack.", distractors: ["straw", "carton", "slice"] },
      { term: "sink", clue: "the place where water comes out for washing", prompt: "There is toothpaste near the bathroom ____.", distractors: ["shelf life", "party favor", "gift bag"] },
      { term: "razor", clue: "a tool used to shave", prompt: "Mr. McMartin keeps his ____ in a dry place.", distractors: ["loaf", "grape", "sausage"] },
      { term: "deodorant", clue: "a product used to keep the body smelling fresh", prompt: "She puts on ____ before leaving home.", distractors: ["garlic", "broccoli", "tomato sauce"] },
    ],
    grammar: [
      { prompt: "I wash ___ before breakfast.", answer: "myself", options: ["myself", "me", "my", "mine"], fullSentence: "I wash myself before breakfast." },
      { prompt: "Please dry ___ with this clean towel.", answer: "yourself", options: ["yourself", "you", "your", "yours"], fullSentence: "Please dry yourself with this clean towel." },
      { prompt: "Mr. McMartin shaves ___ every morning.", answer: "himself", options: ["himself", "him", "his", "he"], fullSentence: "Mr. McMartin shaves himself every morning." },
      { prompt: "Laura looks at ___ in the mirror.", answer: "herself", options: ["herself", "her", "hers", "she"], fullSentence: "Laura looks at herself in the mirror." },
      { prompt: "The cat cleans ___ after dinner.", answer: "itself", options: ["itself", "it", "its", "it is"], fullSentence: "The cat cleans itself after dinner." },
      { prompt: "We remind ___ to brush our teeth at night.", answer: "ourselves", options: ["ourselves", "us", "our", "ours"], fullSentence: "We remind ourselves to brush our teeth at night." },
      { prompt: "The twins dress ___ quickly for school.", answer: "themselves", options: ["themselves", "them", "their", "theirs"], fullSentence: "The twins dress themselves quickly for school." },
      { prompt: "Can I cut my hair ___? No, I need help.", answer: "myself", options: ["myself", "me", "mine", "I"], fullSentence: "Can I cut my hair myself? No, I need help.", accepted: ["myself"] },
      { prompt: "You should carry a toothbrush with ___ on trips.", answer: "you", options: ["you", "yourself", "your", "yours"], fullSentence: "You should carry a toothbrush with you on trips." },
      { prompt: "Mrs. McMartin tells the children to wash ___ after soccer.", answer: "themselves", options: ["themselves", "them", "their", "they"], fullSentence: "Mrs. McMartin tells the children to wash themselves after soccer." },
    ],
    facts: [
      { passage: "Mrs. McMartin washes her face, brushes her teeth, and puts on deodorant before work.", question: "What does Mrs. McMartin do before work?", answer: "She washes her face, brushes her teeth, and puts on deodorant before work.", distractors: ["She eats candy and goes back to bed.", "She opens cans and watches TV.", "She buys soda and frozen pizza."] },
      { passage: "Laura looks at herself in the mirror and combs her hair slowly.", question: "Who does Laura look at in the mirror?", answer: "Laura looks at herself in the mirror.", distractors: ["Laura looks at her cousin in the mirror.", "Laura looks at the cashier in the mirror.", "Laura looks at nobody in the mirror."] },
      { passage: "After soccer, the twins wash themselves and change their shirts.", question: "What do the twins do after soccer?", answer: "They wash themselves and change their shirts.", distractors: ["They eat soup and sleep on the floor.", "They buy candy and skip dinner.", "They freeze their towels and laugh."] },
      { passage: "Mr. McMartin keeps his razor, soap, and comb in the bathroom cabinet.", question: "What does Mr. McMartin keep in the bathroom cabinet?", answer: "He keeps his razor, soap, and comb there.", distractors: ["He keeps his cereal, juice, and tuna there.", "He keeps his shopping cart there.", "He keeps no items there."] },
      { passage: "Mother: Please dry yourself with this towel. Child: Thank you, Mom.", question: "What does the mother tell the child to do?", answer: "She tells the child to dry himself or herself with the towel.", distractors: ["She tells the child to eat the towel.", "She tells the child to throw the towel away.", "She tells the child to wash the mirror with candy."] },
      { passage: "The little cat cleans itself after drinking milk from the bowl.", question: "What does the cat do after drinking milk?", answer: "The cat cleans itself after drinking milk.", distractors: ["The cat opens the fridge after drinking milk.", "The cat buys shampoo after drinking milk.", "The cat paints the towel after drinking milk."] },
      { passage: "We remind ourselves to brush our teeth before bed every night.", question: "What do we remind ourselves to do?", answer: "We remind ourselves to brush our teeth before bed.", distractors: ["We remind ourselves to buy soda before bed.", "We remind ourselves to skip dinner before bed.", "We remind ourselves to hide the soap before bed."] },
      { passage: "Eric carries a toothbrush with him on school trips.", question: "What does Eric carry on school trips?", answer: "He carries a toothbrush with him on school trips.", distractors: ["He carries a freezer with him on school trips.", "He carries a butcher with him on school trips.", "He carries no bag on school trips."] },
      { passage: "Mrs. McMartin uses lotion after washing the dishes because her hands feel dry.", question: "Why does she use lotion?", answer: "She uses lotion because her hands feel dry.", distractors: ["She uses lotion because her hands feel cold like ice cream.", "She uses lotion because her hands are made of candy.", "She uses lotion because the shelf is empty."] },
      { passage: "The children dress themselves quickly when the school bus is near.", question: "When do the children dress themselves quickly?", answer: "They dress themselves quickly when the school bus is near.", distractors: ["They dress themselves quickly when dinner is in the freezer forever.", "They dress themselves quickly when the soap sings.", "They dress themselves quickly when they are already asleep."] },
    ],
    writing: [
      { display: "Complete: Laura looks at ____ in the mirror.", audio: "Laura looks at herself in the mirror.", correct: "herself" },
      { display: "Complete: The twins wash ____ after soccer.", audio: "The twins wash themselves after soccer.", correct: "themselves" },
      { display: "Complete: Please dry ____ with this towel.", audio: "Please dry yourself with this towel.", correct: "yourself" },
      { display: "Complete: Mr. McMartin shaves ____ every morning.", audio: "Mr. McMartin shaves himself every morning.", correct: "himself" },
      { display: "Complete: She uses ____ after washing the dishes.", audio: "She uses lotion after washing the dishes.", correct: "lotion" },
    ],
  },
  {
    number: 46,
    title: "Lesson 46: Cereal & Whole Grains",
    vocab: [
      { term: "oats", clue: "grain flakes often used for breakfast", prompt: "He eats warm ____ with banana slices.", distractors: ["candy", "soap", "beef"] },
      { term: "cereal", clue: "a common breakfast food served in a bowl", prompt: "There is dry ____ in the blue box.", distractors: ["tuna", "toothbrush", "wrapper"] },
      { term: "whole grain bread", clue: "bread made with all parts of the grain", prompt: "Mrs. McMartin makes toast with ____.", distractors: ["sparkling water", "sausage", "hard candy"] },
      { term: "fiber", clue: "a nutrient that helps digestion", prompt: "Whole grains have a lot of ____.", distractors: ["ice", "sugar water", "shelf"] },
      { term: "bowl", clue: "a deep dish used for cereal or soup", prompt: "Laura pours milk into the ____.", distractors: ["receipt", "mirror", "apron"] },
      { term: "spoon", clue: "the tool used to eat cereal or soup", prompt: "He eats the oats with a metal ____.", distractors: ["knife", "towel", "label"] },
      { term: "nutrients", clue: "healthy substances in food", prompt: "Whole grains give the body important ____.", distractors: ["wrappers", "bargains", "counters"] },
      { term: "energy", clue: "the strength you need to work and move", prompt: "A good breakfast gives you ____ for the day.", distractors: ["mirror", "receipt", "party"] },
      { term: "breakfast", clue: "the first meal of the day", prompt: "Cereal is a common ____ food.", distractors: ["bathroom", "afternoon", "party favor"] },
      { term: "label", clue: "the printed information on a food box", prompt: "She reads the cereal ____ before buying it.", distractors: ["comb", "tray", "slice"] },
    ],
    grammar: [
      { prompt: "You ___ eat breakfast before school.", answer: "should", options: ["should", "must not", "did", "is"], fullSentence: "You should eat breakfast before school." },
      { prompt: "Children ___ wash their hands before breakfast.", answer: "must", options: ["must", "should not", "were", "did"], fullSentence: "Children must wash their hands before breakfast." },
      { prompt: "We ___ skip breakfast every day.", answer: "should not", options: ["should not", "must", "is", "did"], fullSentence: "We should not skip breakfast every day.", accepted: ["shouldn't"] },
      { prompt: "You ___ read the label if you have allergies.", answer: "must", options: ["must", "should not", "did", "was"], fullSentence: "You must read the label if you have allergies." },
      { prompt: "He ___ eat too much candy before school.", answer: "should not", options: ["should not", "must", "can of", "are"], fullSentence: "He should not eat too much candy before school.", accepted: ["shouldn't"] },
      { prompt: "The cereal box says you ___ keep it in a dry place.", answer: "must", options: ["must", "should not", "was", "did"], fullSentence: "The cereal box says you must keep it in a dry place." },
      { prompt: "Laura ___ choose whole grain bread for lunch.", answer: "should", options: ["should", "must not", "did", "were"], fullSentence: "Laura should choose whole grain bread for lunch." },
      { prompt: "You ___ leave milk on the table for hours.", answer: "must not", options: ["must not", "should", "did", "was"], fullSentence: "You must not leave milk on the table for hours.", accepted: ["mustn't"] },
      { prompt: "We ___ use a clean spoon for the cereal.", answer: "should", options: ["should", "must not", "were", "did"], fullSentence: "We should use a clean spoon for the cereal." },
      { prompt: "The children ___ eat more whole grains in the week.", answer: "should", options: ["should", "must not", "did", "was"], fullSentence: "The children should eat more whole grains in the week." },
    ],
    facts: [
      { passage: "Mrs. McMartin serves oats, fruit, and milk for breakfast on school days.", question: "What does she serve for breakfast on school days?", answer: "She serves oats, fruit, and milk for breakfast on school days.", distractors: ["She serves candy and soda for breakfast on school days.", "She serves frozen fish for breakfast on school days.", "She serves no breakfast on school days."] },
      { passage: "The cereal box says you must keep it closed after breakfast.", question: "What must you do with the cereal box after breakfast?", answer: "You must keep it closed after breakfast.", distractors: ["You must leave it open after breakfast.", "You must put it in the sink after breakfast.", "You must throw it away after breakfast."] },
      { passage: "Laura should read the label because she wants more fiber and less sugar.", question: "Why should Laura read the label?", answer: "She should read it because she wants more fiber and less sugar.", distractors: ["She should read it because it is a birthday card.", "She should read it because it is a map to the freezer.", "She should read it because it is a mirror."] },
      { passage: "The children must wash their hands before they touch the bread.", question: "What must the children do before they touch the bread?", answer: "They must wash their hands first.", distractors: ["They must open a can first.", "They must skip breakfast first.", "They must eat candy first."] },
      { passage: "Whole grain bread gives the family energy, and oats give them fiber too.", question: "What do whole grain bread and oats give the family?", answer: "They give the family energy and fiber.", distractors: ["They give the family soap and towels.", "They give the family only wrappers.", "They give the family no nutrients."] },
      { passage: "You should use a clean spoon for cereal and a dry bowl for oats.", question: "What should you use for cereal?", answer: "You should use a clean spoon for cereal.", distractors: ["You should use a sharp knife for cereal.", "You should use a can opener for cereal.", "You should use a towel for cereal."] },
      { passage: "Mrs. McMartin says the children should not skip breakfast before a test.", question: "What should the children not do before a test?", answer: "They should not skip breakfast before a test.", distractors: ["They should not read the label before a test.", "They should not wash their hands before a test.", "They should not drink water before a test."] },
      { passage: "You must not leave milk on the table because it gets warm quickly.", question: "Why must you not leave milk on the table?", answer: "You must not leave it there because it gets warm quickly.", distractors: ["You must not leave it there because it turns into candy.", "You must not leave it there because the shelf is tired.", "You must not leave it there because cereal can sing."] },
      { passage: "At breakfast, Eric chooses cereal, but his sister chooses whole grain toast.", question: "What does Eric choose at breakfast?", answer: "He chooses cereal at breakfast.", distractors: ["He chooses candy at breakfast.", "He chooses tomato soup at breakfast.", "He chooses no food at breakfast."] },
      { passage: "Good nutrients help the body, so Mrs. McMartin wants the family to eat more whole grains.", question: "Why does she want the family to eat more whole grains?", answer: "She wants that because good nutrients help the body.", distractors: ["She wants that because whole grains are toys.", "She wants that because whole grains clean mirrors.", "She wants that because whole grains melt like ice cream."] },
    ],
    writing: [
      { display: "Complete: You ____ eat breakfast before school.", audio: "You should eat breakfast before school.", correct: "should" },
      { display: "Complete: Children ____ wash their hands before breakfast.", audio: "Children must wash their hands before breakfast.", correct: "must" },
      { display: "Complete: We ____ skip breakfast every day.", audio: "We should not skip breakfast every day.", correct: "should not", accepted: ["shouldn't"] },
      { display: "Complete: Whole grains give the body important ____.", audio: "Whole grains give the body important nutrients.", correct: "nutrients" },
      { display: "Complete: You must not leave ____ on the table for hours.", audio: "You must not leave milk on the table for hours.", correct: "milk" },
    ],
  },
  {
    number: 47,
    title: "Lesson 47: Meals & Recipes",
    vocab: [
      { term: "recipe", clue: "instructions for cooking a dish", prompt: "Laura follows a pasta ____ on Friday.", distractors: ["receipt", "mirror", "apron"] },
      { term: "ingredients", clue: "the foods you need to make a dish", prompt: "Please check the ____ before we start cooking.", distractors: ["wrappers", "customers", "shelves"] },
      { term: "pan", clue: "a flat piece of cookware for the stove", prompt: "Heat the onions in a small ____.", distractors: ["carton", "gift bag", "freezer"] },
      { term: "oven", clue: "the hot kitchen machine used for baking", prompt: "Put the chicken in the ____ for forty minutes.", distractors: ["sink", "mirror", "counter"] },
      { term: "stir", clue: "to move food around with a spoon", prompt: "Please ____ the soup for two minutes.", distractors: ["label", "count", "dry"] },
      { term: "chop", clue: "to cut food into pieces", prompt: "First, ____ the carrots and onions.", distractors: ["freeze", "open", "taste"] },
      { term: "boil", clue: "to cook in very hot water", prompt: "Then, ____ the pasta for ten minutes.", distractors: ["wrap", "prefer", "carry"] },
      { term: "bake", clue: "to cook in the oven", prompt: "Next, ____ the bread until it is golden.", distractors: ["push", "shave", "brush"] },
      { term: "serve", clue: "to give food to people at the table", prompt: "Finally, ____ the soup with bread.", distractors: ["skip", "wash", "plan"] },
      { term: "finally", clue: "the last step in a sequence", prompt: "____, add cheese and serve the pasta.", distractors: ["Often", "Yesterday", "Usually"] },
    ],
    grammar: [
      { prompt: "___, wash the tomatoes and the lettuce.", answer: "First", options: ["First", "Finally", "Yesterday", "Usually"], fullSentence: "First, wash the tomatoes and the lettuce." },
      { prompt: "___, chop the onions and carrots.", answer: "Then", options: ["Then", "Never", "Last week", "Often"], fullSentence: "Then, chop the onions and carrots." },
      { prompt: "___, put the vegetables in the pan.", answer: "Next", options: ["Next", "Mine", "Rarely", "Did"], fullSentence: "Next, put the vegetables in the pan." },
      { prompt: "___ that, add water and stir the soup.", answer: "After", options: ["After", "Before", "Much", "Them"], fullSentence: "After that, add water and stir the soup.", accepted: ["After that"] },
      { prompt: "___, serve the meal with bread.", answer: "Finally", options: ["Finally", "Yesterday", "Rarely", "My"], fullSentence: "Finally, serve the meal with bread." },
      { prompt: "First, ___ the carrots into small pieces.", answer: "chop", options: ["chop", "chops", "chopped", "chopping"], fullSentence: "First, chop the carrots into small pieces." },
      { prompt: "Then, ___ the pasta for ten minutes.", answer: "boil", options: ["boil", "boils", "boiled", "boiling"], fullSentence: "Then, boil the pasta for ten minutes." },
      { prompt: "Next, ___ the sauce in a pan.", answer: "heat", options: ["heat", "heats", "heated", "heating"], fullSentence: "Next, heat the sauce in a pan." },
      { prompt: "After that, ___ the soup slowly.", answer: "stir", options: ["stir", "stirs", "stirred", "stirring"], fullSentence: "After that, stir the soup slowly." },
      { prompt: "Finally, ___ the dish to the family.", answer: "serve", options: ["serve", "serves", "served", "serving"], fullSentence: "Finally, serve the dish to the family." },
    ],
    facts: [
      { passage: "Laura reads the recipe before dinner. First, she washes the vegetables.", question: "What does Laura do first?", answer: "First, she washes the vegetables.", distractors: ["First, she serves the meal.", "First, she eats the dessert.", "First, she leaves the kitchen."] },
      { passage: "Then, she chops the onions and carrots on a wooden board.", question: "What does she do then?", answer: "Then, she chops the onions and carrots.", distractors: ["Then, she freezes the bread.", "Then, she opens a candy bag.", "Then, she brushes her teeth."] },
      { passage: "Next, Laura heats the pan and adds a little oil.", question: "What does Laura heat next?", answer: "She heats the pan next.", distractors: ["She heats the freezer next.", "She heats the mirror next.", "She heats the shopping cart next."] },
      { passage: "After that, she boils the pasta and stirs the sauce slowly.", question: "What does she boil after that?", answer: "She boils the pasta after that.", distractors: ["She boils the candy after that.", "She boils the towel after that.", "She boils the receipt after that."] },
      { passage: "Finally, she serves the pasta with cheese and fresh salad.", question: "What does she do finally?", answer: "Finally, she serves the pasta with cheese and fresh salad.", distractors: ["Finally, she hides the ingredients.", "Finally, she buys new shoes.", "Finally, she skips the meal."] },
      { passage: "The ingredients for the soup are carrots, onions, tomatoes, and water.", question: "What are the ingredients for the soup?", answer: "The ingredients are carrots, onions, tomatoes, and water.", distractors: ["The ingredients are candy, soda, and shampoo.", "The ingredients are towels, mirrors, and soap.", "The ingredients are cereal boxes only."] },
      { passage: "Mother: Can you stir the soup? Laura: Yes, after I chop the carrots.", question: "What will Laura do after she chops the carrots?", answer: "She will stir the soup after she chops the carrots.", distractors: ["She will eat the pan after she chops the carrots.", "She will wash the mirror after she chops the carrots.", "She will freeze the recipe after she chops the carrots."] },
      { passage: "The bread bakes in the oven while the soup cooks on the stove.", question: "Where does the bread bake?", answer: "The bread bakes in the oven.", distractors: ["The bread bakes in the sink.", "The bread bakes in the freezer.", "The bread bakes on the shelf."] },
      { passage: "Laura checks the recipe because she wants the steps in the correct order.", question: "Why does Laura check the recipe?", answer: "She checks it because she wants the steps in the correct order.", distractors: ["She checks it because she wants a shopping discount.", "She checks it because she wants to wash the oven.", "She checks it because she lost the spoon in the bathroom."] },
      { passage: "The family smiles when Laura serves the meal, because it smells warm and fresh.", question: "Why does the family smile?", answer: "They smile because the meal smells warm and fresh.", distractors: ["They smile because the freezer is empty.", "They smile because the towel is wet.", "They smile because the candy is hidden."] },
    ],
    writing: [
      { display: "Complete: ____, wash the tomatoes and the lettuce.", audio: "First, wash the tomatoes and the lettuce.", correct: "First" },
      { display: "Complete: Then, ____ the onions and carrots.", audio: "Then, chop the onions and carrots.", correct: "chop" },
      { display: "Complete: Next, heat the ____ and add a little oil.", audio: "Next, heat the pan and add a little oil.", correct: "pan" },
      { display: "Complete: After that, ____ the pasta for ten minutes.", audio: "After that, boil the pasta for ten minutes.", correct: "boil" },
      { display: "Complete: Finally, ____ the dish to the family.", audio: "Finally, serve the dish to the family.", correct: "serve" },
    ],
  },
  {
    number: 48,
    title: "Lesson 48: Review & Conversation",
    vocab: [
      { term: "receipt", clue: "the paper from the store after payment", prompt: "Please keep the ____ in the drawer.", distractors: ["oats", "soap", "grapes"] },
      { term: "vegetables", clue: "foods like carrots, broccoli, and lettuce", prompt: "There are fresh ____ on the kitchen table.", distractors: ["candies", "mirrors", "deodorants"] },
      { term: "yogurt", clue: "a soft dairy food", prompt: "Laura mixes fruit with cold ____.", distractors: ["beef", "gum", "rice cooker"] },
      { term: "canned soup", clue: "soup sold in a can", prompt: "On busy days, they heat ____ for lunch.", distractors: ["whole grain bread", "toothbrush", "paper straw"] },
      { term: "shampoo", clue: "the liquid used to wash hair", prompt: "There is mint ____ in the shower.", distractors: ["tomato sauce", "soda", "corn"] },
      { term: "oats", clue: "grain flakes for breakfast", prompt: "He eats warm ____ with milk and banana.", distractors: ["sausage", "candy bar", "butcher knife"] },
      { term: "recipe", clue: "instructions for a dish", prompt: "The family follows a soup ____ together.", distractors: ["receipt", "checkout", "label"] },
      { term: "sparkling water", clue: "water with bubbles", prompt: "Mr. McMartin prefers ____ to cola.", distractors: ["lamb", "soap", "cereal"] },
      { term: "gift bag", clue: "a small bag for a present", prompt: "The party candy is in a pink ____.", distractors: ["pantry", "freezer", "counter"] },
      { term: "mirror", clue: "the glass you use to see yourself", prompt: "Laura smiles at herself in the ____.", distractors: ["recipe", "aisle", "basket"] },
    ],
    grammar: [
      { prompt: "Mrs. McMartin usually ___ vegetables on Monday.", answer: "buys", options: ["buys", "buy", "bought", "buying"], fullSentence: "Mrs. McMartin usually buys vegetables on Monday." },
      { prompt: "Yesterday, she ___ canned soup after work.", answer: "bought", options: ["bought", "buys", "buy", "buying"], fullSentence: "Yesterday, she bought canned soup after work." },
      { prompt: "There ___ two yogurts on the shelf today.", answer: "are", options: ["are", "is", "do", "does"], fullSentence: "There are two yogurts on the shelf today." },
      { prompt: "My brother ___ sparkling water to soda.", answer: "prefers", options: ["prefers", "prefer", "preferred", "preferring"], fullSentence: "My brother prefers sparkling water to soda." },
      { prompt: "Laura looks at ___ in the mirror before class.", answer: "herself", options: ["herself", "her", "hers", "she"], fullSentence: "Laura looks at herself in the mirror before class." },
      { prompt: "You ___ eat breakfast before school.", answer: "should", options: ["should", "must not", "did", "were"], fullSentence: "You should eat breakfast before school." },
      { prompt: "First, ___ the vegetables for the soup.", answer: "chop", options: ["chop", "chops", "chopped", "chopping"], fullSentence: "First, chop the vegetables for the soup." },
      { prompt: "This is ___ gift bag for the party candy.", answer: "our", options: ["our", "us", "ours", "we"], fullSentence: "This is our gift bag for the party candy." },
      { prompt: "Mrs. McMartin ___ reads the label before she buys cereal.", answer: "always", options: ["always", "never", "rarely", "hardly ever"], fullSentence: "Mrs. McMartin always reads the label before she buys cereal." },
      { prompt: "The top ___ the shelf is hard to reach.", answer: "of", options: ["of", "to", "for", "at"], fullSentence: "The top of the shelf is hard to reach." },
    ],
    facts: [
      { passage: "At the supermarket, Mrs. McMartin buys vegetables, yogurt, oats, and one can of soup.", question: "What does she buy at the supermarket?", answer: "She buys vegetables, yogurt, oats, and one can of soup.", distractors: ["She buys shampoo, a mirror, and candy only.", "She buys no food at the supermarket.", "She buys only frozen fish at the supermarket."] },
      { passage: "My brother prefers sparkling water to soda, but my cousin loves orange soda at parties.", question: "What does my brother prefer?", answer: "He prefers sparkling water to soda.", distractors: ["He prefers orange soda to water.", "He prefers no drink at all.", "He prefers hot soup to water."] },
      { passage: "Laura looks at herself in the mirror, brushes her hair, and washes her hands before breakfast.", question: "What does Laura do before breakfast?", answer: "She looks at herself in the mirror, brushes her hair, and washes her hands.", distractors: ["She buys candy and skips school.", "She opens cans and freezes bread.", "She takes no care of herself."] },
      { passage: "Yesterday, Mrs. McMartin bought canned soup because the family came home late.", question: "Why did she buy canned soup yesterday?", answer: "She bought it because the family came home late.", distractors: ["She bought it because the party was in the bathroom.", "She bought it because the mirror was hungry.", "She bought it because the cereal box was empty."] },
      { passage: "There are two yogurts on the shelf, and there is one carton of milk in the fridge.", question: "How many yogurts are on the shelf?", answer: "There are two yogurts on the shelf.", distractors: ["There is one yogurt on the shelf.", "There are four yogurts on the shelf.", "There are no yogurts on the shelf."] },
      { passage: "The children should eat breakfast before school, and they must wash their hands first.", question: "What must the children do first?", answer: "They must wash their hands first.", distractors: ["They must eat candy first.", "They must open a can first.", "They must skip breakfast first."] },
      { passage: "First, Laura chops the vegetables. Then, she boils the soup. Finally, she serves it with bread.", question: "What does Laura do finally?", answer: "Finally, she serves the soup with bread.", distractors: ["Finally, she throws the bread away.", "Finally, she freezes the soup.", "Finally, she skips dinner."] },
      { passage: "Our gift bag has lollipops and gummy bears, and our wrappers go in the trash.", question: "What is in our gift bag?", answer: "There are lollipops and gummy bears in our gift bag.", distractors: ["There are towels and soap in our gift bag.", "There is tuna and corn in our gift bag.", "There are no sweets in our gift bag."] },
      { passage: "Mrs. McMartin always reads the label on the cereal box because she wants more fiber.", question: "Why does she read the cereal label?", answer: "She reads it because she wants more fiber.", distractors: ["She reads it because she wants more candy.", "She reads it because she wants more shampoo.", "She reads it because she wants more canned tuna."] },
      { passage: "The top of the shelf is hard to reach, so Mr. McMartin gets the oats for Laura.", question: "Why does Mr. McMartin get the oats?", answer: "He gets the oats because the top of the shelf is hard to reach.", distractors: ["He gets the oats because the fridge is full of candy.", "He gets the oats because the mirror is broken.", "He gets the oats because the party is tomorrow."] },
    ],
    writing: [
      { display: "Complete: Yesterday, she ____ canned soup after work.", audio: "Yesterday, she bought canned soup after work.", correct: "bought" },
      { display: "Complete: My brother ____ sparkling water to soda.", audio: "My brother prefers sparkling water to soda.", correct: "prefers" },
      { display: "Complete: Laura looks at ____ in the mirror before class.", audio: "Laura looks at herself in the mirror before class.", correct: "herself" },
      { display: "Complete: First, ____ the vegetables for the soup.", audio: "First, chop the vegetables for the soup.", correct: "chop" },
      { display: "Complete: There ____ two yogurts on the shelf today.", audio: "There are two yogurts on the shelf today.", correct: "are" },
    ],
  },
];

export const workbook4Lessons: Lesson[] = workbook4Configs.map(buildWorkbook4Lesson);
