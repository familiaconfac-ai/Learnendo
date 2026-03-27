// ─────────────────────────────────────────────────────────────────────────────
// Pronounce practice items — keyed by (courseId, workbookId)
//
// Each item has:
//   text   — what is displayed on screen
//   spoken — what is sent to TTS / speech-recognition (may differ, e.g. digit "3" → "three")
//   type   — 'letter' | 'number' | 'word' | 'phrase'
// ─────────────────────────────────────────────────────────────────────────────

export interface PronounceItem {
  text: string;
  spoken: string;
  type: 'letter' | 'number' | 'word' | 'phrase';
}

type WorkbookMap = Record<number, PronounceItem[]>;
type CourseMap = Record<string, WorkbookMap>;

// ── helpers ──────────────────────────────────────────────────────────────────

const letters = (arr: string[]): PronounceItem[] =>
  arr.map((l) => ({ text: l, spoken: l, type: 'letter' }));

const nums = (pairs: [string, string][]): PronounceItem[] =>
  pairs.map(([text, spoken]) => ({ text, spoken, type: 'number' }));

const words = (arr: string[]): PronounceItem[] =>
  arr.map((w) => ({ text: w, spoken: w, type: 'word' }));

const phrases = (arr: string[]): PronounceItem[] =>
  arr.map((p) => ({ text: p, spoken: p, type: 'phrase' }));

// ─────────────────────────────────────────────────────────────────────────────
// ENGLISH
// ─────────────────────────────────────────────────────────────────────────────

const ENGLISH_WBK1: PronounceItem[] = [
  ...letters(['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z']),
  ...nums([['1','one'],['2','two'],['3','three'],['4','four'],['5','five'],['6','six'],['7','seven'],['8','eight'],['9','nine'],['10','ten']]),
  ...words(['hello','yes','no','please','thank you','sorry','water','food','book','school']),
  ...phrases(['Good morning','Good afternoon','Good evening','Good night','How are you?','I am fine','My name is','Nice to meet you']),
];

const ENGLISH_WBK2: PronounceItem[] = [
  ...nums([['11','eleven'],['12','twelve'],['13','thirteen'],['14','fourteen'],['15','fifteen'],['16','sixteen'],['17','seventeen'],['18','eighteen'],['19','nineteen'],['20','twenty'],['30','thirty'],['40','forty'],['50','fifty'],['100','one hundred']]),
  ...words(['family','mother','father','brother','sister','friend','house','city','street','work']),
  ...phrases(['Where are you from?','I am from Brazil','Do you speak English?','I don\'t understand','Can you repeat please?','What time is it?']),
];

const ENGLISH_WBK3: PronounceItem[] = [
  ...words(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday','January','February','March','April','May','June','July','August','September','October','November','December']),
  ...phrases(['What day is today?','It is Monday','What month is it?','My birthday is in July','See you tomorrow','Have a good weekend']),
];

// WBK 4–8 stubs — extend with real curriculum content as lessons are built
const ENGLISH_WBK_STUB = (n: number): PronounceItem[] => [
  ...phrases([`Workbook ${n} practice coming soon`]),
];

// ─────────────────────────────────────────────────────────────────────────────
// PORTUGUESE (portuguese_foreigners & portuguese_native)
// ─────────────────────────────────────────────────────────────────────────────

const PT_WBK1: PronounceItem[] = [
  ...letters(['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z']),
  ...nums([['1','um'],['2','dois'],['3','três'],['4','quatro'],['5','cinco'],['6','seis'],['7','sete'],['8','oito'],['9','nove'],['10','dez']]),
  ...words(['olá','sim','não','por favor','obrigado','desculpe','água','comida','livro','escola']),
  ...phrases(['Bom dia','Boa tarde','Boa noite','Tudo bem?','Tudo bem.','Meu nome é...','Prazer em conhecer','Como vai você?']),
];

const PT_WBK2: PronounceItem[] = [
  ...nums([['11','onze'],['12','doze'],['13','treze'],['14','quatorze'],['15','quinze'],['16','dezesseis'],['17','dezessete'],['18','dezoito'],['19','dezenove'],['20','vinte'],['30','trinta'],['40','quarenta'],['50','cinquenta'],['100','cem']]),
  ...words(['família','mãe','pai','irmão','irmã','amigo','casa','cidade','rua','trabalho']),
  ...phrases(['De onde você é?','Eu sou do Brasil','Você fala português?','Não entendo','Pode repetir, por favor?','Que horas são?']),
];

const PT_WBK3: PronounceItem[] = [
  ...words(['segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado','domingo','janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']),
  ...phrases(['Que dia é hoje?','Hoje é segunda-feira','Qual é o mês?','Meu aniversário é em julho','Até amanhã','Bom fim de semana']),
];

const PT_WBK_STUB = (n: number): PronounceItem[] => [
  ...phrases([`Conteúdo do Caderno ${n} em breve`]),
];

// ─────────────────────────────────────────────────────────────────────────────
// SPANISH
// ─────────────────────────────────────────────────────────────────────────────

const ES_WBK1: PronounceItem[] = [
  ...letters(['A','B','C','D','E','F','G','H','I','J','K','L','M','N','Ñ','O','P','Q','R','S','T','U','V','W','X','Y','Z']),
  ...nums([['1','uno'],['2','dos'],['3','tres'],['4','cuatro'],['5','cinco'],['6','seis'],['7','siete'],['8','ocho'],['9','nueve'],['10','diez']]),
  ...words(['hola','sí','no','por favor','gracias','perdón','agua','comida','libro','escuela']),
  ...phrases(['Buenos días','Buenas tardes','Buenas noches','¿Cómo estás?','Estoy bien','Me llamo...','Mucho gusto','¿De dónde eres?']),
];

const ES_WBK2: PronounceItem[] = [
  ...nums([['11','once'],['12','doce'],['13','trece'],['14','catorce'],['15','quince'],['16','dieciséis'],['17','diecisiete'],['18','dieciocho'],['19','diecinueve'],['20','veinte'],['30','treinta'],['40','cuarenta'],['50','cincuenta'],['100','cien']]),
  ...words(['familia','madre','padre','hermano','hermana','amigo','casa','ciudad','calle','trabajo']),
  ...phrases(['¿De dónde eres?','Soy de Brasil','¿Hablas español?','No entiendo','¿Puedes repetir, por favor?','¿Qué hora es?']),
];

const ES_WBK3: PronounceItem[] = [
  ...words(['lunes','martes','miércoles','jueves','viernes','sábado','domingo','enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']),
  ...phrases(['¿Qué día es hoy?','Hoy es lunes','¿En qué mes estamos?','Mi cumpleaños es en julio','Hasta mañana','¡Buen fin de semana!']),
];

const ES_WBK_STUB = (n: number): PronounceItem[] => [
  ...phrases([`Contenido del Libro ${n} próximamente`]),
];

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP TABLE
// ─────────────────────────────────────────────────────────────────────────────

const PRONOUNCE_DATA: CourseMap = {
  english: {
    1: ENGLISH_WBK1,
    2: ENGLISH_WBK2,
    3: ENGLISH_WBK3,
    4: ENGLISH_WBK_STUB(4),
    5: ENGLISH_WBK_STUB(5),
    6: ENGLISH_WBK_STUB(6),
    7: ENGLISH_WBK_STUB(7),
    8: ENGLISH_WBK_STUB(8),
  },
  portuguese_foreigners: {
    1: PT_WBK1,
    2: PT_WBK2,
    3: PT_WBK3,
    4: PT_WBK_STUB(4),
    5: PT_WBK_STUB(5),
    6: PT_WBK_STUB(6),
    7: PT_WBK_STUB(7),
    8: PT_WBK_STUB(8),
  },
  portuguese_native: {
    1: PT_WBK1,
    2: PT_WBK2,
    3: PT_WBK3,
    4: PT_WBK_STUB(4),
    5: PT_WBK_STUB(5),
    6: PT_WBK_STUB(6),
    7: PT_WBK_STUB(7),
    8: PT_WBK_STUB(8),
  },
  spanish: {
    1: ES_WBK1,
    2: ES_WBK2,
    3: ES_WBK3,
    4: ES_WBK_STUB(4),
    5: ES_WBK_STUB(5),
    6: ES_WBK_STUB(6),
    7: ES_WBK_STUB(7),
    8: ES_WBK_STUB(8),
  },
};

// Default fallback — first 10 English letters + basic phrases
const FALLBACK: PronounceItem[] = [
  ...letters(['A','B','C','D','E','F','G','H','I','J']),
  ...phrases(['Hello','Good morning','Thank you']),
];

/** Returns the pronounce practice items for the given course and workbook. */
export function getPronounceItems(courseId: string, workbookId: number): PronounceItem[] {
  return PRONOUNCE_DATA[courseId]?.[workbookId] ?? FALLBACK;
}

/** BCP-47 language tag used for TTS and speech recognition. */
export function getTTSLang(courseId: string): string {
  if (courseId === 'portuguese_foreigners' || courseId === 'portuguese_native') return 'pt-BR';
  if (courseId === 'spanish') return 'es-ES';
  if (courseId === 'greek_koine') return 'el-GR';
  if (courseId === 'hebrew_biblical') return 'he-IL';
  return 'en-US';
}
