import { Exercise, Lesson } from '../../types';
import { lesson1 as englishLesson1 } from '../../data/workbook1/lesson1';
import { lesson2 as englishLesson2 } from '../../data/workbook1/lesson2';
import { lesson3 as englishLesson3 } from '../../data/workbook1/lesson3';
import { lesson4 as englishLesson4 } from '../../data/workbook1/lesson4';
import { lesson5 as englishLesson5 } from '../../data/workbook1/lesson5';

type LanguageKey = 'pt' | 'es' | 'el' | 'he';

interface LanguagePack {
  workbookId: string;
  workbookTitle: string;
  lessonTitles: string[];
  replacements: Array<[string, string]>;
}

// English files are the authoritative source. When a new lesson is added or
// corrected in English, add it here and extend every language pack's lessonTitles
// and replacements accordingly (mirrored multilingual workflow).
const BASE_LESSONS: Lesson[] = [englishLesson1, englishLesson2, englishLesson3, englishLesson4, englishLesson5];

const languagePacks: Record<LanguageKey, LanguagePack> = {
  pt: {
    workbookId: 'pt_wb1',
    workbookTitle: 'Workbook 1 de Português',
    lessonTitles: [
      'Lição 1: Alfabeto e Números',
      'Lição 2: Um Dia na Natureza',
      'Lição 3: Rotina Diária e Atividades',
      'Lição 4: Números Ordinais e Sequência',
      'Lição 5: Placeholder',
    ],
    replacements: [
      // ── Lesson 1: alphabet & number instructions ─────────────────────────
      ['What are you listening to?', 'O que você está ouvindo?'],
      ['Listen and tap the correct color.', 'Escute e toque na cor correta.'],
      ['Listen and pick the correct letter.', 'Escute e escolha a letra correta.'],
      ['Listen and pick the correct number.', 'Escute e escolha o número correto.'],
      ['Listen and repeat exactly as you hear.', 'Escute e repita exatamente como você ouve.'],
      ['What color is it? Answer in a full sentence.', 'Qual é a cor? Responda com uma frase completa.'],
      ['What color is it?', 'Qual é a cor?'],
      ['Answer in a full sentence.', 'Responda com uma frase completa.'],
      ['The teacher asks: ', 'O professor pergunta: '],
      ['The teacher says: ', 'O professor diz: '],
      [' — Choose the correct response.', ' — Escolha a resposta correta.'],
      ['Type in words what you hear.', 'Escreva por extenso o que você ouvir.'],
      // ── Lesson 2: vowels & reading instructions ───────────────────────────
      ['Listen and pick the correct word.', 'Escute e escolha a palavra correta.'],
      ['Teacher: What vowel letter is in ', 'Professor: Qual letra vogal está em '],
      ['Teacher: What is the letter name?', 'Professor: Qual é o nome da letra?'],
      ['Is the vowel in ', 'A vogal em '],
      ['" short or long?', '" e curta ou longa?'],
      // ── Lesson 2: A Day in Nature — Q&A & sentence structures ─────────────
      ['A Day in Nature', 'Um Dia na Natureza'],
      ['What is that?', 'O que é aquilo?'],
      ['What are those?', 'O que são aqueles?'],
      ['This is the ', 'Isto é o '],
      ['This is an ', 'Isto é uma '],
      ['This is a ', 'Isto é um '],
      ['That is a ', 'Aquilo é um '],
      ['Those are ', 'Aqueles são '],
      // ── Lesson 3: daily routines instructions ─────────────────────────────
      ['Listen and pick the correct answer.', 'Escute e escolha a resposta correta.'],
      ['Listen: ', 'Escute: '],
      ['What does Daniel do in the morning?', 'O que Daniel faz de manhã?'],
      ['What does Sarah do before breakfast?', 'O que Sarah faz antes do café da manhã?'],
      ['What does Tom do with his breakfast?', 'O que Tom faz com o cafe da manha?'],
      ['What does Lisa do before school?', 'O que Lisa faz antes da escola?'],
      ['What does Mark do to go to school?', 'Como Mark vai para a escola?'],
      ['Which shows what you do at school?', 'Qual mostra o que você faz na escola?'],
      ['Which shows what you do in the afternoon?', 'Qual mostra o que você faz à tarde?'],
      ['Which shows what you do before bed?', 'Qual mostra o que você faz antes de dormir?'],
      ['What do you do before sleeping?', 'O que você faz antes de dormir?'],
      // ── Lesson 3: reading, comparison & knowledge check ───────────────────
      ['Are they the same or different?', 'São iguais ou diferentes?'],
      ['Read paragraph ', 'Leia o parágrafo '],
      ['Read: ', 'Leia: '],
      ['Question: ', 'Pergunta: '],
      // ── General / originally present ──────────────────────────────────────
      ['Lesson ', 'Lição '],
      ['Which letter has the same vowel sound?', 'Qual letra tem o mesmo som vocálico?'],
      ['Listen and pick the correct number:', 'Escute e escolha o número correto:'],
      ['Type in words what you hear:', 'Escreva por extenso o que você ouvir:'],
      ['Math: What is ', 'Matemática: Quanto é '],
      ['Identify the color of the', 'Identifique a cor do'],
      ['Identify the color:', 'Identifique a cor:'],
      ['Type the color you hear:', 'Escreva a cor que você ouvir:'],
      ['Pronounce correctly:', 'Pronuncie corretamente:'],
      ['Say the number:', 'Diga o número:'],
      ['Say the result:', 'Diga o resultado:'],
      ['What does', 'O que'],
      ['What is this?', 'O que é isto?'],
      ['Write what you hear:', 'Escreva o que você ouvir:'],
      ['Say:', 'Diga:'],
      ['Repeat:', 'Repita:'],
      ['Read and repeat:', 'Leia e repita:'],
      ['Read and write:', 'Leia e escreva:'],
      ['Listen and answer:', 'Escute e responda:'],
      ['Daily Routines and Activities', 'Rotina Diária e Atividades'],
      ['wake up', 'acordar'],
      ['take a shower', 'tomar banho'],
      ['eat breakfast', 'tomar café da manhã'],
      ['get ready for school', 'preparar-se para a escola'],
      ['walk to school', 'ir a pe para a escola'],
      ['study', 'estudar'],
      ['have lunch', 'almoçar'],
      ['go to bed', 'ir para a cama'],
      ['brush your teeth', 'escovar os dentes'],
      ['homework', 'dever de casa'],
      ['television', 'televisão'],
      ['breakfast', 'café da manhã'],
      ['school', 'escola'],
      ['play', 'brincar'],
      ['shower', 'banho'],
      ['wind', 'vento'],
      ['sky', 'céu'],
      ['hot', 'quente'],
      ['sunny', 'ensolarado'],
      ['blows', 'sopra'],
      ['water', 'água'],
      ['tree', 'árvore'],
      ['rock', 'pedra'],
      ['kite', 'pipa'],
      ['sun', 'sol'],
      ['apple', 'maçã'],
      ['orange', 'laranja'],
      ['toes', 'dedos do pe'],
      // ── Math / sentence-level hooks (audioValues in speaking/shadowing/writing) ──
      // These translate sentence fragments that contain lowercase number words,
      // arithmetic operators and sentence starters — none of which are caught by
      // the capitalized single-word entries below (e.g. 'Fifteen' does NOT match
      // the "fifteen" inside "It's fifteen." without case-insensitive replacement).
      ['What is ', 'Quanto é '],          // "What is nine plus nine" → "Quanto é nove mais nove"
      ["It's ", 'É '],                    // "It's fifteen." → "É quinze."
      ['It is ', 'É '],                   // "It is eighteen." → "É dezoito."
      [' plus ', ' mais '],               // arithmetic operators
      [' minus ', ' menos '],
      [' times ', ' vezes '],
      [' divided by ', ' dividido por '],
      ['Zero', 'zero'],
      ['One', 'um'],
      ['Two', 'dois'],
      ['Three', 'tres'],
      ['Four', 'quatro'],
      ['Five', 'cinco'],
      ['Six', 'seis'],
      ['Seven', 'sete'],
      ['Eight', 'oito'],
      ['Nine', 'nove'],
      ['Ten', 'dez'],
      ['Eleven', 'onze'],
      ['Twelve', 'doze'],
      ['Thirteen', 'treze'],
      ['Fourteen', 'quatorze'],
      ['Fifteen', 'quinze'],
      ['Sixteen', 'dezesseis'],
      ['Seventeen', 'dezessete'],
      ['Eighteen', 'dezoito'],
      ['Nineteen', 'dezenove'],
      ['Twenty', 'vinte'],
      ['Red', 'vermelho'],
      ['Blue', 'azul'],
      ['Green', 'verde'],
      ['Yellow', 'amarelo'],
      ['Orange', 'laranja'],
      ['Purple', 'roxo'],
      ['Black', 'preto'],
      ['White', 'branco'],
      ['Pink', 'rosa'],
      ['same', 'igual'],
      ['different', 'diferente'],
      ['Long', 'Longa'],
      ['Short', 'Curta'],
    ],
  },
  es: {
    workbookId: 'es_wb1',
    workbookTitle: 'Workbook 1 de Español',
    lessonTitles: [
      'Lección 1: Alfabeto y Números',
      'Lección 2: Un Día en la Naturaleza',
      'Lección 3: Rutinas Diarias y Actividades',
      'Lección 4: Números Ordinales y Secuencia',
      'Lección 5: Placeholder',
    ],
    replacements: [
      // ── Lesson 1: alphabet & number instructions ─────────────────────────
      ['What are you listening to?', '¿Qué estás escuchando?'],
      ['Listen and tap the correct color.', 'Escucha y toca el color correcto.'],
      ['Listen and pick the correct letter.', 'Escucha y elige la letra correcta.'],
      ['Listen and pick the correct number.', 'Escucha y elige el número correcto.'],
      ['Listen and repeat exactly as you hear.', 'Escucha y repite exactamente lo que oyes.'],
      ['What color is it? Answer in a full sentence.', '¿De qué color es? Responde con una oración completa.'],
      ['What color is it?', '¿De qué color es?'],
      ['Answer in a full sentence.', 'Responde con una oración completa.'],
      ['The teacher asks: ', 'El profesor pregunta: '],
      ['The teacher says: ', 'El profesor dice: '],
      [' — Choose the correct response.', ' — Elige la respuesta correcta.'],
      ['Type in words what you hear.', 'Escribe con palabras lo que oyes.'],
      // ── Lesson 2: vowels & reading instructions ───────────────────────────
      ['Listen and pick the correct word.', 'Escucha y elige la palabra correcta.'],
      ['Teacher: What vowel letter is in ', 'Profesor: ¿Qué letra vocal está en '],
      ['Teacher: What is the letter name?', 'Profesor: ¿Cuál es el nombre de la letra?'],
      ['Is the vowel in ', 'La vocal en '],
      ['" short or long?', '" es corta o larga?'],
      // ── Lesson 2: A Day in Nature — Q&A & sentence structures ─────────────
      ['A Day in Nature', 'Un Día en la Naturaleza'],
      ['What is that?', '¿Qué es eso?'],
      ['What are those?', '¿Qué son esos?'],
      ['This is the ', 'Esto es el '],
      ['This is an ', 'Esto es una '],
      ['This is a ', 'Esto es un '],
      ['That is a ', 'Eso es un '],
      ['Those are ', 'Esos son '],
      // ── Lesson 3: daily routines instructions ─────────────────────────────
      ['Listen and pick the correct answer.', 'Escucha y elige la respuesta correcta.'],
      ['Listen: ', 'Escucha: '],
      ['What does Daniel do in the morning?', '¿Qué hace Daniel en la mañana?'],
      ['What does Sarah do before breakfast?', '¿Qué hace Sarah antes del desayuno?'],
      ['What does Tom do with his breakfast?', '¿Qué hace Tom con su desayuno?'],
      ['What does Lisa do before school?', '¿Qué hace Lisa antes de la escuela?'],
      ['What does Mark do to go to school?', '¿Cómo va Mark a la escuela?'],
      ['Which shows what you do at school?', '¿Cuál muestra lo que haces en la escuela?'],
      ['Which shows what you do in the afternoon?', '¿Cuál muestra lo que haces por la tarde?'],
      ['Which shows what you do before bed?', '¿Cuál muestra lo que haces antes de acostarse?'],
      ['What do you do before sleeping?', '¿Qué haces antes de acostarte?'],
      // ── Lesson 3: reading, comparison & knowledge check ───────────────────
      ['Are they the same or different?', '¿Son iguales o diferentes?'],
      ['Read paragraph ', 'Lee el párrafo '],
      ['Read: ', 'Lee: '],
      ['Question: ', 'Pregunta: '],
      // ── General / originally present ──────────────────────────────────────
      ['Lesson ', 'Lección '],
      ['Which letter has the same vowel sound?', '¿Qué letra tiene el mismo sonido vocálico?'],
      ['Listen and pick the correct number:', 'Escucha y elige el número correcto:'],
      ['Type in words what you hear:', 'Escribe con palabras lo que oyes:'],
      ['Math: What is ', 'Matemáticas: ¿Cuánto es '],
      ['Identify the color of the', 'Identifica el color del'],
      ['Identify the color:', 'Identifica el color:'],
      ['Type the color you hear:', 'Escribe el color que oyes:'],
      ['Pronounce correctly:', 'Pronuncia correctamente:'],
      ['What is this?', '¿Qué es esto?'],
      ['Write what you hear:', 'Escribe lo que oyes:'],
      ['Say:', 'Di:'],
      ['Repeat:', 'Repite:'],
      ['Read and repeat:', 'Lee y repite:'],
      ['Read and write:', 'Lee y escribe:'],
      ['Listen and answer:', 'Escucha y responde:'],
      ['Daily Routines and Activities', 'Rutinas Diarias y Actividades'],
      ['wake up', 'despertarse'],
      ['take a shower', 'ducharse'],
      ['eat breakfast', 'desayunar'],
      ['get ready for school', 'prepararse para la escuela'],
      ['walk to school', 'caminar a la escuela'],
      ['study', 'estudiar'],
      ['have lunch', 'almorzar'],
      ['go to bed', 'acostarse'],
      ['brush your teeth', 'cepillarse los dientes'],
      ['homework', 'tarea'],
      ['television', 'televisión'],
      ['breakfast', 'desayuno'],
      ['school', 'escuela'],
      ['play', 'jugar'],
      ['shower', 'ducha'],
      ['wind', 'viento'],
      ['sky', 'cielo'],
      ['hot', 'caliente'],
      ['sunny', 'soleado'],
      ['blows', 'sopla'],
      ['water', 'agua'],
      ['tree', 'árbol'],
      ['rock', 'roca'],
      ['kite', 'cometa'],
      ['sun', 'sol'],
      ['apple', 'manzana'],
      ['orange', 'naranja'],
      ['toes', 'dedos del pie'],
      // ── Math / sentence-level hooks (audioValues in speaking/shadowing/writing) ──
      ['What is ', '¿Cuánto es '],        // "What is five plus five?" → "¿Cuánto es cinco más cinco?"
      ["It's ", 'Es '],                   // "It's fifteen." → "Es quince."
      ['It is ', 'Es '],
      [' plus ', ' más '],                // arithmetic operators
      [' minus ', ' menos '],
      [' times ', ' por '],
      [' divided by ', ' entre '],
      ['Zero', 'cero'],
      ['One', 'uno'],
      ['Two', 'dos'],
      ['Three', 'tres'],
      ['Four', 'cuatro'],
      ['Five', 'cinco'],
      ['Six', 'seis'],
      ['Seven', 'siete'],
      ['Eight', 'ocho'],
      ['Nine', 'nueve'],
      ['Ten', 'diez'],
      ['Eleven', 'once'],
      ['Twelve', 'doce'],
      ['Thirteen', 'trece'],
      ['Fourteen', 'catorce'],
      ['Fifteen', 'quince'],
      ['Sixteen', 'dieciséis'],
      ['Seventeen', 'diecisiete'],
      ['Eighteen', 'dieciocho'],
      ['Nineteen', 'diecinueve'],
      ['Twenty', 'veinte'],
      ['Red', 'rojo'],
      ['Blue', 'azul'],
      ['Green', 'verde'],
      ['Yellow', 'amarillo'],
      ['Orange', 'naranja'],
      ['Purple', 'morado'],
      ['Black', 'negro'],
      ['White', 'blanco'],
      ['Pink', 'rosa'],
      ['same', 'igual'],
      ['different', 'diferente'],
      ['Long', 'Larga'],
      ['Short', 'Corta'],
    ],
  },
  el: {
    workbookId: 'el_wb1',
    workbookTitle: 'Greek Workbook 1',
    lessonTitles: [
      'Mathima 1: Alfavito kai Arithmoi',
      'Mathima 2: Mia Imera sti Fysi',
      'Mathima 3: Kathimerines Routines kai Drastiriotites',      'Mathima 4: Ordinal Numbers and Sequence',
      'Mathima 5: Placeholder',    ],
    replacements: [
      ['Lesson ', 'Mathima '],
      ['Which letter has the same vowel sound?', 'Poio gramma exei ton idio fthinoggo?'],
      ['Listen and pick the correct number:', 'Akouse kai dialexe ton sosto arithmo:'],
      ['Type in words what you hear:', 'Grapse me lexeis auto pou akous:'],
      ['What is this?', 'Ti einai auto?'],
      ['Write what you hear:', 'Grapse auto pou akous:'],
      ['Say:', 'Pes:'],
      ['Repeat:', 'Epanalave:'],
      ['Read and repeat:', 'Diavase kai epanalave:'],
      ['Listen and answer:', 'Akouse kai apantise:'],
      ['Daily Routines and Activities', 'Kathimerines Routines kai Drastiriotites'],
      ['wake up', 'xypnao'],
      ['take a shower', 'kano ntous'],
      ['eat breakfast', 'troo proino'],
      ['get ready for school', 'etoimazomai gia to scholeio'],
      ['walk to school', 'pao me ta podia sto scholeio'],
      ['study', 'meletao'],
      ['have lunch', 'troo mesimeriano'],
      ['go to bed', 'pao sto krevati'],
      ['brush your teeth', 'vourtsizo ta dontia mou'],
      ['homework', 'ergasia gia to spiti'],
      ['television', 'tileorasi'],
      ['breakfast', 'proino'],
      ['school', 'scholeio'],
      ['play', 'paizo'],
      ['water', 'nero'],
      ['tree', 'dentro'],
      ['rock', 'petra'],
      ['kite', 'aetos'],
      ['sun', 'ilios'],
      ['apple', 'milo'],
      ['orange', 'portokali'],
      ['Red', 'kokkino'],
      ['Blue', 'ble'],
      ['Green', 'prasimo'],
      ['Yellow', 'kitrino'],
      ['Black', 'mavro'],
      ['White', 'lefko'],
    ],
  },
  he: {
    workbookId: 'he_wb1',
    workbookTitle: 'Hebrew Workbook 1',
    lessonTitles: [
      'Shiur 1: Alefbet VeMisparim',
      'Shiur 2: Yom BeHateva',
      'Shiur 3: Seder Yom VePeulot',
      'Shiur 4: Ordinal Numbers and Sequence',
      'Shiur 5: Placeholder',
    ],
    replacements: [
      ['Lesson ', 'Shiur '],
      ['Which letter has the same vowel sound?', 'Eizo otiyot im oto tzelel tnua?'],
      ['Listen and pick the correct number:', 'Hakshiv vevchar et hamispar hanachon:'],
      ['Type in words what you hear:', 'Kteov bemilim ma sheata shomea:'],
      ['What is this?', 'Ma ze?'],
      ['Write what you hear:', 'Kteov ma sheata shomea:'],
      ['Say:', 'Emor:'],
      ['Repeat:', 'Chazor:'],
      ['Read and repeat:', 'Kra vechazor:'],
      ['Listen and answer:', 'Hakshiv veane:'],
      ['Daily Routines and Activities', 'Seder Yom VePeulot'],
      ['wake up', 'mitorer'],
      ['take a shower', 'mitkaleach'],
      ['eat breakfast', 'ochel aruchat boker'],
      ['get ready for school', 'mitkonen lebeit sefer'],
      ['walk to school', 'holech lveit sefer'],
      ['study', 'lomed'],
      ['have lunch', 'ochel tzohorayim'],
      ['go to bed', 'holech lishon'],
      ['brush your teeth', 'tzocheach shinayim'],
      ['homework', 'shiurei bayit'],
      ['television', 'televizya'],
      ['breakfast', 'aruchat boker'],
      ['school', 'beit sefer'],
      ['play', 'mesachek'],
      ['water', 'mayim'],
      ['tree', 'etz'],
      ['rock', 'even'],
      ['kite', 'afifon'],
      ['sun', 'shemesh'],
      ['apple', 'tapuach'],
      ['orange', 'tapuz'],
      ['Red', 'adom'],
      ['Blue', 'kachol'],
      ['Green', 'yarok'],
      ['Yellow', 'tzahov'],
      ['Black', 'shachor'],
      ['White', 'lavan'],
    ],
  },
};

function replaceText(value: string | undefined, replacements: Array<[string, string]>): string | undefined {
  if (!value) return value;
  let nextValue = value;
  for (const [from, to] of replacements) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Use `from.includes(' ')` — NOT `from.trim().includes(' ')` — so that phrases
    // with leading/trailing spaces (e.g. "It's ", " plus ") are correctly classified
    // as multi-word and get the simple /gi pattern instead of \b...\b.  The \b
    // word-boundary variant can behave unexpectedly when the pattern starts or ends
    // with a non-word character like an apostrophe or a space, causing silent misses.
    const pattern = from.includes(' ')
      ? new RegExp(escaped, 'gi')
      : new RegExp(`\\b${escaped}\\b`, 'gi');
    nextValue = nextValue.replace(pattern, to);
  }
  return nextValue;
}

function transformExercise(exercise: Exercise, replacements: Array<[string, string]>): Exercise {
  return {
    ...exercise,
    instruction: replaceText(exercise.instruction, replacements) || exercise.instruction,
    displayValue: replaceText(exercise.displayValue, replacements),
    audioValue: replaceText(exercise.audioValue, replacements) || exercise.audioValue,
    correctValue: replaceText(exercise.correctValue, replacements) || exercise.correctValue,
    options: exercise.options?.map((option) => replaceText(option, replacements) || option),
  };
}

// Prefix lesson/day/exercise IDs with the language code so that progress keys
// (stored in the Firestore `days` map) are unique per course.  English lessons
// use their original IDs (wb1_l1_d1), PT/ES/etc. get e.g. pt_wb1_l1_d1.
function transformLesson(lesson: Lesson, title: string, langKey: LanguageKey, replacements: Array<[string, string]>): Lesson {
  const prefix = `${langKey}_`;
  return {
    ...lesson,
    id: `${prefix}${lesson.id}`,
    title,
    days: lesson.days.map((day) => ({
      ...day,
      id: `${prefix}${day.id}`,
      exercises: day.exercises.map((exercise) => ({
        ...transformExercise(exercise, replacements),
        id: `${prefix}${exercise.id}`,
      })),
    })),
  };
}

export function buildReplicatedWorkbook1(language: LanguageKey) {
  const pack = languagePacks[language];

  return {
    id: pack.workbookId,
    title: pack.workbookTitle,
    lessons: BASE_LESSONS.map((lesson, index) =>
      transformLesson(lesson, pack.lessonTitles[index], language, pack.replacements),
    ),
  };
}
