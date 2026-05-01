// ── Learnendo Battle — Setup Modal (Teacher) ──────────────────────────────────
// Flow:
//   Step 1 — CONFIG: scope · difficulty · count · time
//     ├─ ⚡ Quick Battle    → generates questions, calls onStart immediately
//     └─ 📋 Preparar Aula  → generates questions, opens Step 2
//   Step 2 — CURATION: preview list with checkbox / edit / duplicate
//     └─ ✅ Confirmar Lista Final → calls onStart with curated list
//
// Excluded question IDs are persisted in localStorage so the teacher's
// preference survives page refreshes and future sessions.

import React, { useState, useEffect, useMemo } from 'react';
import type { BattleConfig, BattleDifficulty, BattleQuestionKind, BattleScope, BattleQuestion, SavedBattleTemplate } from './battleTypes';
import { getBattleQuestions } from './battleQuestions';
import {
  buildSavedBattleTemplate,
  getBattleLanguage,
  getBattleQuestionDuration,
  normalizeBattleDuration,
  sanitizeBattleQuestion,
  sanitizeBattleQuestions,
} from './battleUtils';
import { BOT_AVATAR_OPTIONS, DEFAULT_BOT_AVATAR_ID } from './botAvatars';

// ── Persistence ────────────────────────────────────────────────────────────────
function buildExcludedKey(params: {
  courseId?: string;
  workbookId?: number;
  lessonId?: string;
  scope: BattleScope;
}) {
  const {
    courseId = 'no-course',
    workbookId = 'no-workbook',
    lessonId = 'no-lesson',
    scope,
  } = params;

  return `learnendo_battle_excluded_ids:${courseId}:${workbookId}:${lessonId}:${scope}`;
}

function loadExcluded(storageKey: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function persistExcluded(storageKey: string, ids: Set<string>) {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...ids]));
  } catch { /* storage quota — ignore */ }
}

// ── Constants ─────────────────────────────────────────────────────────────────
type Step = 'config' | 'curate';

interface EditDraft {
  kind: BattleQuestionKind;
  text: string;
  options: string[];
  correctIndexes: number[];
  correctText: string;
  acceptedAnswersText: string;
  promptAudioText: string;
  imageUrl: string;
  durationSeconds: string;
}

interface Props {
  onStart: (config: BattleConfig, questions: BattleQuestion[]) => void | Promise<void>;
  onSaveTemplate?: (template: SavedBattleTemplate) => void | Promise<void>;
  onClose: () => void;
  defaultLessonId?: string;
  defaultWorkbookId?: number;
  defaultCourseId?: string;
  liveClassId?: string;
  currentUserUid?: string;
  selectedStudents?: Array<{ uid: string; name: string }>;
  initialTemplate?: SavedBattleTemplate | null;
  uiLanguage?: 'en' | 'pt' | 'es' | 'el' | 'he';
}

type BattleUILanguage = 'en' | 'pt' | 'es' | 'el' | 'he';

function normalizeBattleUiLanguage(value?: string): BattleUILanguage {
  if (value === 'pt' || value === 'es' || value === 'el' || value === 'he') return value;
  return 'en';
}

function buildSuggestedBattleTitle(language: BattleUILanguage) {
  const localeByLanguage: Record<BattleUILanguage, string> = {
    en: 'en-US',
    pt: 'pt-BR',
    es: 'es-ES',
    el: 'el-GR',
    he: 'he-IL',
  };
  const prefixByLanguage: Record<BattleUILanguage, string> = {
    en: 'Battle',
    pt: 'Battle',
    es: 'Batalla',
    el: 'Μάχη',
    he: 'קרב',
  };
  return `${prefixByLanguage[language]} ${new Date().toLocaleDateString(localeByLanguage[language])}`;
}

const SCOPES: { value: BattleScope; label: string; desc: string }[] = [
  { value: 'current-lesson', label: 'Esta Lição',    desc: 'Só desta lição' },
  { value: 'current-book',   label: 'Livro Inteiro', desc: 'Todas as lições' },
  { value: 'review',         label: 'Revisão',       desc: 'Banco completo' },
];

const DIFFICULTIES: { value: BattleDifficulty; label: string; emoji: string }[] = [
  { value: 'easy',   label: 'Fácil',  emoji: '😊' },
  { value: 'normal', label: 'Normal', emoji: '🎯' },
  { value: 'hard',   label: 'Difícil', emoji: '🔥' },
];

const QUESTION_COUNTS = [5, 10, 20] as const;
const TIME_OPTIONS    = [5, 10, 15, 20]  as const;
const QUESTION_KINDS: { value: BattleQuestionKind; label: string }[] = [
  { value: 'multiple-choice', label: 'Objetiva' },
  { value: 'image-choice', label: 'Com imagem' },
  { value: 'audio-choice', label: 'Escuta + alternativas' },
  { value: 'audio-open', label: 'Escuta + escrita' },
  { value: 'speaking', label: 'Speaking' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export const BattleSetupModal: React.FC<Props> = ({
  onStart,
  onSaveTemplate,
  onClose,
  defaultLessonId,
  defaultWorkbookId,
  defaultCourseId,
  liveClassId,
  currentUserUid,
  selectedStudents = [],
  initialTemplate = null,
  uiLanguage,
}) => {
  const effectiveUiLanguage = normalizeBattleUiLanguage(uiLanguage ?? getBattleLanguage(defaultCourseId));
  const copy = useMemo(() => {
    switch (effectiveUiLanguage) {
      case 'pt':
        return {
          battleName: 'Nome da batalha',
          battleNamePlaceholder: 'Digite o nome da batalha',
          questions: 'perguntas',
          selected: 'selecionadas',
          each: 'cada',
          save: 'Salvar',
          duplicate: 'Duplicar',
          addQuestion: '+ Nova pergunta',
          source: 'Fonte das Perguntas',
          difficulty: 'Dificuldade',
          count: 'Numero de Perguntas',
          seconds: 'Segundos por Pergunta',
          customTime: 'Tempo personalizado',
          customTimeHelp: 'Use este valor como tempo padrao. Na edicao de cada pergunta voce pode colocar um tempo maior.',
          teacherLabel: 'Professor participa da batalha',
          teacherHelp: 'Ative para o professor responder junto com os alunos e entrar no placar.',
          botLabel: 'Ativar Bot',
          botHelp: 'Inclui um participante artificial na batalha com avatar e pontuacao normal.',
          botAvatar: 'Avatar do Bot',
          botName: 'Nome do Bot',
          prepare: 'Preparar Aula -> (ver e editar perguntas)',
          startNow: 'Iniciar Agora',
          back: 'Voltar',
          confirm: 'Confirmar Lista Final',
          noQuestionsStart: 'Nenhuma pergunta valida foi gerada para iniciar a batalha.',
          noQuestionsPrepare: 'Nenhuma pergunta valida foi encontrada para preparar a aula.',
          noQuestionsSelect: 'Selecione pelo menos uma pergunta valida para iniciar a batalha.',
          noQuestionsSave: 'Selecione pelo menos uma pergunta valida para salvar o battle.',
          saveUnavailable: 'Salvar indisponivel neste modo.',
          saveSuccess: 'Battle salvo na sua biblioteca.',
          duplicateSuccess: 'Battle duplicado na sua biblioteca.',
          saveFailure: 'Falha ao salvar o battle.',
          prepareFailure: 'Falha ao preparar as perguntas da batalha.',
          startFailure: 'Falha ao iniciar a batalha.',
          timeLabel: 'Tempo',
          customLabel: 'personalizado',
          defaultLabel: 'padrao',
          expectedAnswer: 'Resposta esperada',
          questionText: 'Texto da pergunta',
          questionType: 'Tipo de pergunta',
          questionTime: 'Tempo desta pergunta (segundos)',
          questionTimePlaceholder: 'Padrao da batalha',
          questionTimeHelp: 'Deixe em branco para usar o tempo padrao da batalha.',
          imageUrl: 'URL da imagem (opcional)',
          imagePlaceholder: 'https://... ou deixe em branco',
          audioText: 'Texto do audio',
          audioPlaceholder: 'Ex.: What is two plus two?',
          correctAnswer: 'Resposta correta principal',
          acceptedAnswers: 'Variacoes aceitas',
          acceptedAnswersPlaceholder: 'Resposta 1, resposta 2, resposta 3',
          optionsLabel: 'Alternativas - marque uma ou mais corretas',
          optionsHelp: 'Uma correta responde no clique. Varias corretas exigem marcar tudo e confirmar.',
          saveQuestion: 'Salvar',
          cancel: 'Cancelar',
          includeQuestion: 'Incluir esta pergunta',
          excludeQuestion: 'Excluir esta pergunta',
          duplicateQuestion: 'Duplicar pergunta',
          editQuestion: 'Editar pergunta',
          closeEditor: 'Fechar editor',
          addQuestionTitle: 'Adicionar pergunta personalizada',
          saveBattleTitle: 'Salvar battle na biblioteca',
          duplicateBattleTitle: 'Duplicar battle salvo',
          choice: 'Objetiva',
          imageChoice: 'Com imagem',
          audioChoice: 'Escuta + alternativas',
          audioOpen: 'Escuta + escrita',
          speaking: 'Speaking',
          currentLesson: 'Esta Licao',
          currentLessonDesc: 'So desta licao',
          currentBook: 'Livro Inteiro',
          currentBookDesc: 'Todas as licoes deste livro',
          review: 'Revisao',
          reviewDesc: 'Licoes ja estudadas neste livro',
          easy: 'Facil',
          normal: 'Normal',
          hard: 'Dificil',
        };
      case 'es':
        return {
          battleName: 'Nombre de la batalla',
          battleNamePlaceholder: 'Escribe el nombre de la batalla',
          questions: 'preguntas',
          selected: 'seleccionadas',
          each: 'cada una',
          save: 'Guardar',
          duplicate: 'Duplicar',
          addQuestion: '+ Nueva pregunta',
          source: 'Fuente de las preguntas',
          difficulty: 'Dificultad',
          count: 'Numero de preguntas',
          seconds: 'Segundos por pregunta',
          customTime: 'Tiempo personalizado',
          customTimeHelp: 'Usa este valor como tiempo predeterminado. En cada pregunta puedes poner un tiempo mayor.',
          teacherLabel: 'El profesor participa en la batalla',
          teacherHelp: 'Activa esto para que el profesor responda con los alumnos y entre en la clasificacion.',
          botLabel: 'Activar Bot',
          botHelp: 'Incluye un participante artificial en la batalla con avatar y puntuacion normal.',
          botAvatar: 'Avatar del Bot',
          botName: 'Nombre del Bot',
          prepare: 'Preparar clase -> (ver y editar preguntas)',
          startNow: 'Iniciar ahora',
          back: 'Volver',
          confirm: 'Confirmar lista final',
          noQuestionsStart: 'No se genero ninguna pregunta valida para iniciar la batalla.',
          noQuestionsPrepare: 'No se encontro ninguna pregunta valida para preparar la clase.',
          noQuestionsSelect: 'Selecciona al menos una pregunta valida para iniciar la batalla.',
          noQuestionsSave: 'Selecciona al menos una pregunta valida para guardar la batalla.',
          saveUnavailable: 'Guardar no esta disponible en este modo.',
          saveSuccess: 'Batalla guardada en tu biblioteca.',
          duplicateSuccess: 'Batalla duplicada en tu biblioteca.',
          saveFailure: 'No se pudo guardar la batalla.',
          prepareFailure: 'No se pudieron preparar las preguntas de la batalla.',
          startFailure: 'No se pudo iniciar la batalla.',
          timeLabel: 'Tiempo',
          customLabel: 'personalizado',
          defaultLabel: 'predeterminado',
          expectedAnswer: 'Respuesta esperada',
          questionText: 'Texto de la pregunta',
          questionType: 'Tipo de pregunta',
          questionTime: 'Tiempo de esta pregunta (segundos)',
          questionTimePlaceholder: 'Predeterminado de la batalla',
          questionTimeHelp: 'Dejalo vacio para usar el tiempo predeterminado de la batalla.',
          imageUrl: 'URL de la imagen (opcional)',
          imagePlaceholder: 'https://... o dejalo vacio',
          audioText: 'Texto del audio',
          audioPlaceholder: 'Ej.: What is two plus two?',
          correctAnswer: 'Respuesta correcta principal',
          acceptedAnswers: 'Variaciones aceptadas',
          acceptedAnswersPlaceholder: 'Respuesta 1, respuesta 2, respuesta 3',
          optionsLabel: 'Alternativas - marca una o mas correctas',
          optionsHelp: 'Una correcta responde al hacer clic. Varias correctas requieren marcarlas todas y confirmar.',
          saveQuestion: 'Guardar',
          cancel: 'Cancelar',
          includeQuestion: 'Incluir esta pregunta',
          excludeQuestion: 'Excluir esta pregunta',
          duplicateQuestion: 'Duplicar pregunta',
          editQuestion: 'Editar pregunta',
          closeEditor: 'Cerrar editor',
          addQuestionTitle: 'Agregar pregunta personalizada',
          saveBattleTitle: 'Guardar batalla en la biblioteca',
          duplicateBattleTitle: 'Duplicar batalla guardada',
          choice: 'Opcion multiple',
          imageChoice: 'Con imagen',
          audioChoice: 'Escucha + opciones',
          audioOpen: 'Escucha + escritura',
          speaking: 'Speaking',
          currentLesson: 'Esta leccion',
          currentLessonDesc: 'Solo esta leccion',
          currentBook: 'Libro completo',
          currentBookDesc: 'Todas las lecciones de este libro',
          review: 'Revision',
          reviewDesc: 'Lecciones ya estudiadas en este libro',
          easy: 'Facil',
          normal: 'Normal',
          hard: 'Dificil',
        };
      case 'el':
        return {
          battleName: 'Ονομα μαχης',
          battleNamePlaceholder: 'Πληκτρολογησε το ονομα της μαχης',
          questions: 'ερωτησεις',
          selected: 'επιλεγμενες',
          each: 'καθε μια',
          save: 'Αποθηκευση',
          duplicate: 'Αντιγραφη',
          addQuestion: '+ Νεα ερωτηση',
          source: 'Πηγη ερωτησεων',
          difficulty: 'Δυσκολια',
          count: 'Αριθμος ερωτησεων',
          seconds: 'Δευτερολεπτα ανα ερωτηση',
          customTime: 'Προσαρμοσμενος χρονος',
          customTimeHelp: 'Χρησιμοποίησε αυτη την τιμη ως προεπιλογη. Σε καθε ερωτηση μπορεις να ορισεις μεγαλυτερο χρονο.',
          teacherLabel: 'Ο καθηγητης συμμετεχει στη μαχη',
          teacherHelp: 'Ενεργοποιησε το για να απαντα ο καθηγητης μαζι με τους μαθητες και να μπαινει στον πινακα.',
          botLabel: 'Ενεργοποιηση Bot',
          botHelp: 'Προσθετει εναν τεχνητο συμμετεχοντα στη μαχη με avatar και κανονικη βαθμολογια.',
          botAvatar: 'Avatar του Bot',
          botName: 'Ονομα Bot',
          prepare: 'Προετοιμασια μαθηματος -> (προβολη και επεξεργασια ερωτησεων)',
          startNow: 'Εναρξη τωρα',
          back: 'Πισω',
          confirm: 'Επιβεβαιωση τελικης λιστας',
          noQuestionsStart: 'Δεν δημιουργηθηκε εγκυρη ερωτηση για να ξεκινησει η μαχη.',
          noQuestionsPrepare: 'Δεν βρεθηκε εγκυρη ερωτηση για την προετοιμασια του μαθηματος.',
          noQuestionsSelect: 'Επιλεξε τουλαχιστον μια εγκυρη ερωτηση για να ξεκινησει η μαχη.',
          noQuestionsSave: 'Επιλεξε τουλαχιστον μια εγκυρη ερωτηση για να αποθηκευσεις τη μαχη.',
          saveUnavailable: 'Η αποθηκευση δεν ειναι διαθεσιμη σε αυτη τη λειτουργια.',
          saveSuccess: 'Η μαχη αποθηκευτηκε στη βιβλιοθηκη σου.',
          duplicateSuccess: 'Η μαχη αντιγραφηκε στη βιβλιοθηκη σου.',
          saveFailure: 'Αποτυχια αποθηκευσης της μαχης.',
          prepareFailure: 'Αποτυχια προετοιμασιας των ερωτησεων της μαχης.',
          startFailure: 'Αποτυχια εκκινησης της μαχης.',
          timeLabel: 'Χρονος',
          customLabel: 'προσαρμοσμενο',
          defaultLabel: 'προεπιλογη',
          expectedAnswer: 'Αναμενομενη απαντηση',
          questionText: 'Κειμενο ερωτησης',
          questionType: 'Τυπος ερωτησης',
          questionTime: 'Χρονος για αυτη την ερωτηση (δευτερολεπτα)',
          questionTimePlaceholder: 'Προεπιλογη μαχης',
          questionTimeHelp: 'Αφησε το κενο για να χρησιμοποιησεις τον προεπιλεγμενο χρονο της μαχης.',
          imageUrl: 'URL εικονας (προαιρετικο)',
          imagePlaceholder: 'https://... ή αφησε το κενο',
          audioText: 'Κειμενο ηχου',
          audioPlaceholder: 'Π.χ.: What is two plus two?',
          correctAnswer: 'Κυρια σωστη απαντηση',
          acceptedAnswers: 'Αποδεκτες παραλλαγες',
          acceptedAnswersPlaceholder: 'Απαντηση 1, απαντηση 2, απαντηση 3',
          optionsLabel: 'Επιλογες - σημειωσε μια ή περισσοτερες σωστες',
          optionsHelp: 'Μια σωστη απαντηση λυνεται με κλικ. Πολλες σωστες απαιτουν ολες τις επιλογες και επιβεβαιωση.',
          saveQuestion: 'Αποθηκευση',
          cancel: 'Ακυρωση',
          includeQuestion: 'Συμπεριλαβε αυτη την ερωτηση',
          excludeQuestion: 'Αποκλεισε αυτη την ερωτηση',
          duplicateQuestion: 'Αντιγραφη ερωτησης',
          editQuestion: 'Επεξεργασια ερωτησης',
          closeEditor: 'Κλεισιμο επεξεργασιας',
          addQuestionTitle: 'Προσθηκη προσαρμοσμενης ερωτησης',
          saveBattleTitle: 'Αποθηκευση μαχης στη βιβλιοθηκη',
          duplicateBattleTitle: 'Αντιγραφη αποθηκευμενης μαχης',
          choice: 'Πολλαπλης επιλογης',
          imageChoice: 'Με εικονα',
          audioChoice: 'Ακροαση + επιλογες',
          audioOpen: 'Ακροαση + γραφη',
          speaking: 'Speaking',
          currentLesson: 'Αυτο το μαθημα',
          currentLessonDesc: 'Μονο αυτο το μαθημα',
          currentBook: 'Ολο το βιβλιο',
          currentBookDesc: 'Ολα τα μαθηματα αυτου του βιβλιου',
          review: 'Επαναληψη',
          reviewDesc: 'Μαθηματα που εχουν ηδη διδαχθει σε αυτο το βιβλιο',
          easy: 'Ευκολο',
          normal: 'Κανονικο',
          hard: 'Δυσκολο',
        };
      case 'he':
        return {
          battleName: 'שם הקרב',
          battleNamePlaceholder: 'הקלד את שם הקרב',
          questions: 'שאלות',
          selected: 'נבחרו',
          each: 'לכל שאלה',
          save: 'שמירה',
          duplicate: 'שכפול',
          addQuestion: '+ שאלה חדשה',
          source: 'מקור השאלות',
          difficulty: 'רמת קושי',
          count: 'מספר שאלות',
          seconds: 'שניות לכל שאלה',
          customTime: 'זמן מותאם',
          customTimeHelp: 'השתמש בערך זה כברירת מחדל. בתוך כל שאלה אפשר להגדיר זמן ארוך יותר.',
          teacherLabel: 'המורה משתתף בקרב',
          teacherHelp: 'הפעל כדי שהמורה יענה יחד עם התלמידים ויופיע בלוח הניקוד.',
          botLabel: 'הפעל Bot',
          botHelp: 'מוסיף משתתף מלאכותי לקרב עם אווטאר וניקוד רגיל.',
          botAvatar: 'אווטאר של ה-Bot',
          botName: 'שם ה-Bot',
          prepare: 'הכנת שיעור -> (צפיה ועריכת שאלות)',
          startNow: 'התחל עכשיו',
          back: 'חזרה',
          confirm: 'אישור הרשימה הסופית',
          noQuestionsStart: 'לא נוצרה שאלה תקינה כדי להתחיל את הקרב.',
          noQuestionsPrepare: 'לא נמצאה שאלה תקינה להכנת השיעור.',
          noQuestionsSelect: 'בחר לפחות שאלה תקינה אחת כדי להתחיל את הקרב.',
          noQuestionsSave: 'בחר לפחות שאלה תקינה אחת כדי לשמור את הקרב.',
          saveUnavailable: 'השמירה לא זמינה במצב הזה.',
          saveSuccess: 'הקרב נשמר בספריה שלך.',
          duplicateSuccess: 'הקרב שוכפל בספריה שלך.',
          saveFailure: 'שמירת הקרב נכשלה.',
          prepareFailure: 'הכנת שאלות הקרב נכשלה.',
          startFailure: 'הפעלת הקרב נכשלה.',
          timeLabel: 'זמן',
          customLabel: 'מותאם',
          defaultLabel: 'ברירת מחדל',
          expectedAnswer: 'תשובה צפויה',
          questionText: 'טקסט השאלה',
          questionType: 'סוג השאלה',
          questionTime: 'זמן לשאלה זו (שניות)',
          questionTimePlaceholder: 'ברירת מחדל של הקרב',
          questionTimeHelp: 'השאר ריק כדי להשתמש בזמן ברירת המחדל של הקרב.',
          imageUrl: 'קישור לתמונה (אופציונלי)',
          imagePlaceholder: 'https://... או השאר ריק',
          audioText: 'טקסט האודיו',
          audioPlaceholder: 'לדוגמה: What is two plus two?',
          correctAnswer: 'תשובה נכונה ראשית',
          acceptedAnswers: 'וריאציות מתקבלות',
          acceptedAnswersPlaceholder: 'תשובה 1, תשובה 2, תשובה 3',
          optionsLabel: 'אפשרויות - סמן תשובה נכונה אחת או יותר',
          optionsHelp: 'תשובה נכונה אחת נענית בלחיצה. כמה תשובות נכונות דורשות סימון של כולן ואישור.',
          saveQuestion: 'שמירה',
          cancel: 'ביטול',
          includeQuestion: 'כלול את השאלה הזאת',
          excludeQuestion: 'אל תכלול את השאלה הזאת',
          duplicateQuestion: 'שכפל שאלה',
          editQuestion: 'ערוך שאלה',
          closeEditor: 'סגור עריכה',
          addQuestionTitle: 'הוסף שאלה מותאמת',
          saveBattleTitle: 'שמור קרב לספריה',
          duplicateBattleTitle: 'שכפל קרב שמור',
          choice: 'בחירה מרובה',
          imageChoice: 'עם תמונה',
          audioChoice: 'האזנה + אפשרויות',
          audioOpen: 'האזנה + כתיבה',
          speaking: 'Speaking',
          currentLesson: 'השיעור הזה',
          currentLessonDesc: 'רק מהשיעור הזה',
          currentBook: 'כל הספר',
          currentBookDesc: 'כל השיעורים בספר הזה',
          review: 'חזרה',
          reviewDesc: 'שיעורים שכבר נלמדו בספר הזה',
          easy: 'קל',
          normal: 'רגיל',
          hard: 'קשה',
        };
      default:
        return {
          battleName: 'Battle Name',
          battleNamePlaceholder: 'Type the battle name',
          questions: 'questions',
          selected: 'selected',
          each: 'each',
          save: 'Save',
          duplicate: 'Duplicate',
          addQuestion: '+ New question',
          source: 'Question Source',
          difficulty: 'Difficulty',
          count: 'Number of Questions',
          seconds: 'Seconds per Question',
          customTime: 'Custom time',
          customTimeHelp: 'Use this as the default time. Inside each question you can set a longer time.',
          teacherLabel: 'Teacher joins the battle',
          teacherHelp: 'Enable this so the teacher answers with the students and appears on the scoreboard.',
          botLabel: 'Enable Bot',
          botHelp: 'Adds an AI participant to the battle with avatar and normal scoring.',
          botAvatar: 'Bot Avatar',
          botName: 'Bot Name',
          prepare: 'Prepare Lesson -> (view and edit questions)',
          startNow: 'Start Now',
          back: 'Back',
          confirm: 'Confirm Final List',
          noQuestionsStart: 'No valid question was generated to start the battle.',
          noQuestionsPrepare: 'No valid question was found to prepare the lesson.',
          noQuestionsSelect: 'Select at least one valid question to start the battle.',
          noQuestionsSave: 'Select at least one valid question to save the battle.',
          saveUnavailable: 'Save is unavailable in this mode.',
          saveSuccess: 'Battle saved to your library.',
          duplicateSuccess: 'Battle duplicated in your library.',
          saveFailure: 'Failed to save the battle.',
          prepareFailure: 'Failed to prepare the battle questions.',
          startFailure: 'Failed to start the battle.',
          timeLabel: 'Time',
          customLabel: 'custom',
          defaultLabel: 'default',
          expectedAnswer: 'Expected answer',
          questionText: 'Question text',
          questionType: 'Question type',
          questionTime: 'Time for this question (seconds)',
          questionTimePlaceholder: 'Battle default',
          questionTimeHelp: 'Leave blank to use the battle default time.',
          imageUrl: 'Image URL (optional)',
          imagePlaceholder: 'https://... or leave blank',
          audioText: 'Audio text',
          audioPlaceholder: 'Ex.: What is two plus two?',
          correctAnswer: 'Main correct answer',
          acceptedAnswers: 'Accepted variations',
          acceptedAnswersPlaceholder: 'Answer 1, answer 2, answer 3',
          optionsLabel: 'Options - mark one or more correct answers',
          optionsHelp: 'One correct answer resolves on click. Multiple correct answers require selecting all and confirming.',
          saveQuestion: 'Save',
          cancel: 'Cancel',
          includeQuestion: 'Include this question',
          excludeQuestion: 'Exclude this question',
          duplicateQuestion: 'Duplicate question',
          editQuestion: 'Edit question',
          closeEditor: 'Close editor',
          addQuestionTitle: 'Add custom question',
          saveBattleTitle: 'Save battle to library',
          duplicateBattleTitle: 'Duplicate saved battle',
          choice: 'Multiple choice',
          imageChoice: 'With image',
          audioChoice: 'Listening + options',
          audioOpen: 'Listening + writing',
          speaking: 'Speaking',
          currentLesson: 'This Lesson',
          currentLessonDesc: 'Only this lesson',
          currentBook: 'Whole Book',
          currentBookDesc: 'All lessons in this workbook',
          review: 'Review',
          reviewDesc: 'Lessons already studied in this workbook',
          easy: 'Easy',
          normal: 'Normal',
          hard: 'Hard',
        };
    }
  }, [effectiveUiLanguage]);
  const scopeOptions = useMemo(
    () => [
      { value: 'current-lesson' as BattleScope, label: copy.currentLesson, desc: copy.currentLessonDesc },
      { value: 'current-book' as BattleScope, label: copy.currentBook, desc: copy.currentBookDesc },
      { value: 'review' as BattleScope, label: copy.review, desc: copy.reviewDesc },
    ],
    [copy],
  );
  const difficultyOptions = useMemo(
    () => [
      { value: 'easy' as BattleDifficulty, label: copy.easy, emoji: '😊' },
      { value: 'normal' as BattleDifficulty, label: copy.normal, emoji: '🎯' },
      { value: 'hard' as BattleDifficulty, label: copy.hard, emoji: '🔥' },
    ],
    [copy],
  );
  const questionKindOptions = useMemo(
    () => [
      { value: 'multiple-choice' as BattleQuestionKind, label: copy.choice },
      { value: 'image-choice' as BattleQuestionKind, label: copy.imageChoice },
      { value: 'audio-choice' as BattleQuestionKind, label: copy.audioChoice },
      { value: 'audio-open' as BattleQuestionKind, label: copy.audioOpen },
      { value: 'speaking' as BattleQuestionKind, label: copy.speaking },
    ],
    [copy],
  );

  useEffect(() => {
    console.log('[BATTLE DEBUG] BattleSetupModal mounted', {
      defaultLessonId,
      defaultWorkbookId,
      defaultCourseId,
      step
    });
  }, []);

  // ── Step 1 state ────────────────────────────────────────────────────────
  const [step,            setStep]            = useState<Step>('config');
  const [scope,           setScope]           = useState<BattleScope>('current-lesson');
  const [difficulty,      setDifficulty]      = useState<BattleDifficulty>('normal');
  const [questionCount,   setQuestionCount]   = useState<5 | 10 | 20>(10);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(10);
  const [includeTeacher,  setIncludeTeacher]  = useState(false);
  const [botEnabled,      setBotEnabled]      = useState(false);
  const [botAvatarId,     setBotAvatarId]     = useState(DEFAULT_BOT_AVATAR_ID);
  const [botName,         setBotName]         = useState('Bot');

  // ── Step 2 state ────────────────────────────────────────────────────────
  const [questions,    setQuestions]    = useState<BattleQuestion[]>([]);
  const [excludedIds,  setExcludedIds]  = useState<Set<string>>(new Set());
  const [editingIdx,   setEditingIdx]   = useState<number | null>(null);
  const [editDraft,    setEditDraft]    = useState<EditDraft | null>(null);
  const [startError,   setStartError]   = useState<string | null>(null);
  const [startingNow,  setStartingNow]  = useState(false);
  const [saveMessage,  setSaveMessage]  = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState(() => initialTemplate?.title?.trim() || buildSuggestedBattleTitle(effectiveUiLanguage));
  const exclusionStorageKey = useMemo(
    () => buildExcludedKey({
      courseId: defaultCourseId,
      workbookId: defaultWorkbookId,
      lessonId: defaultLessonId,
      scope,
    }),
    [defaultCourseId, defaultWorkbookId, defaultLessonId, scope]
  );

  // Load persisted exclusions for the current battle context
  useEffect(() => {
    setExcludedIds(loadExcluded(exclusionStorageKey));
  }, [exclusionStorageKey]);

  // Persist whenever exclusions change
  useEffect(() => {
    persistExcluded(exclusionStorageKey, excludedIds);
  }, [excludedIds, exclusionStorageKey]);

  useEffect(() => {
    if (!initialTemplate) return;

    setScope(initialTemplate.config.scope ?? 'current-lesson');
    setDifficulty(initialTemplate.config.difficulty ?? 'normal');
    setQuestionCount(
      initialTemplate.config.questionCount === 5
        ? 5
        : initialTemplate.config.questionCount === 20
          ? 20
          : 10
    );
    setTimePerQuestion(normalizeBattleDuration(initialTemplate.config.timePerQuestion, 10));
    setIncludeTeacher(Boolean(initialTemplate.config.includeTeacher));
    setBotEnabled(Boolean(initialTemplate.config.botEnabled));
    setBotAvatarId(initialTemplate.config.botAvatarId || DEFAULT_BOT_AVATAR_ID);
    setBotName(initialTemplate.config.botName?.trim() || 'Bot');
    setQuestions(sanitizeBattleQuestions(initialTemplate.questions));
    setExcludedIds(new Set());
    setEditingIdx(null);
    setEditDraft(null);
    setStartError(null);
    setSaveMessage(null);
    setTemplateTitle(initialTemplate.title?.trim() || buildSuggestedBattleTitle(effectiveUiLanguage));
    setStep('curate');
  }, [effectiveUiLanguage, initialTemplate]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  async function generateQuestions(selectedScope: BattleScope = scope): Promise<BattleQuestion[]> {
    return getBattleQuestions({
      questionCount,
      scope: selectedScope,
      difficulty,
      courseId: defaultCourseId,
      lessonId: defaultLessonId,
      workbookId: defaultWorkbookId,
    });
  }

  function buildConfig(count: number, selectedScope: BattleScope = scope): BattleConfig {
    return {
      scope: selectedScope,
      difficulty,
      questionCount: count,
      timePerQuestion: normalizeBattleDuration(timePerQuestion, 10),
      includeTeacher,
      botEnabled,
      botAvatarId,
      botName: botName.trim() || 'Bot',
      courseId:    defaultCourseId,
      workbookId:  defaultWorkbookId,
      lessonId:    defaultLessonId,
    };
  }

  async function resolveLaunchQuestions() {
    try {
      const generatedQuestions = sanitizeBattleQuestions(await generateQuestions(scope));
      return {
        generatedQuestions,
        resolvedScope: scope,
      };
    } catch (error) {
      console.error('[BATTLE START DEBUG] start failed:', error);
      throw error;
    }
  }

  function draftToQuestion(baseId: string): BattleQuestion {
    if (!editDraft) {
      return {
        id: baseId,
        kind: 'multiple-choice',
        text: '',
        options: ['', '', '', ''],
        correctIndexes: [0],
        correctIndex: 0,
      };
    }

    const acceptedAnswers = editDraft.acceptedAnswersText
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    const baseQuestion: BattleQuestion = {
      id: baseId,
      kind: editDraft.kind,
      text: editDraft.text,
      ...(editDraft.kind === 'multiple-choice' || editDraft.kind === 'image-choice' || editDraft.kind === 'audio-choice'
        ? {
            options: editDraft.options,
            correctIndexes: editDraft.correctIndexes,
            correctIndex: editDraft.correctIndexes[0] ?? 0,
          }
        : {}),
      ...((editDraft.kind === 'audio-choice' || editDraft.kind === 'audio-open' || editDraft.kind === 'speaking')
        ? {
            promptAudioText: editDraft.promptAudioText || editDraft.text,
            playAudioOnce: true,
          }
        : {}),
      ...(editDraft.kind === 'audio-open' || editDraft.kind === 'speaking'
        ? {
            correctText: editDraft.correctText,
            acceptedAnswers,
          }
        : {}),
      ...(editDraft.durationSeconds.trim()
        ? { durationSeconds: normalizeBattleDuration(editDraft.durationSeconds) }
        : {}),
      ...(editDraft.imageUrl.trim() ? { imageUrl: editDraft.imageUrl.trim() } : {}),
    };

    return sanitizeBattleQuestion(baseQuestion) ?? baseQuestion;
  }

  function getEffectiveQuestions(): BattleQuestion[] {
    if (editingIdx === null || !editDraft) return questions;

    return questions.map((q, i) =>
      i !== editingIdx ? q : draftToQuestion(q.id)
    );
  }

  async function getPreparedQuestionsForCurrentFlow() {
    const existingQuestions = sanitizeBattleQuestions(
      getEffectiveQuestions().filter((question) => !excludedIds.has(question.id))
    );

    if (existingQuestions.length > 0) {
      return {
        preparedQuestions: existingQuestions,
        resolvedScope: scope,
        source: 'existing' as const,
      };
    }

    const { generatedQuestions, resolvedScope } = await resolveLaunchQuestions();
    return {
      preparedQuestions: generatedQuestions,
      resolvedScope,
      source: 'generated' as const,
    };
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  async function runStartFlow(generatedQuestions: BattleQuestion[], config: BattleConfig, source: 'quick' | 'curated') {
    console.log('[BATTLE START DEBUG] handler entered');
    setStartError(null);

    if (startingNow) {
      console.warn('[BATTLE START DEBUG] blocked before start:', {
        motivo: 'already-starting',
        dadosRelevantes: {
          source,
          liveClassId: liveClassId ?? null,
          userUid: currentUserUid ?? null,
        },
      });
      return;
    }

    if (!generatedQuestions || generatedQuestions.length === 0) {
      console.warn('[BATTLE START DEBUG] blocked before start:', {
        motivo: 'no-questions-generated',
        dadosRelevantes: {
          source,
          liveClassId: liveClassId ?? null,
          config,
        },
      });
      setStartError('Nenhuma pergunta válida foi gerada para iniciar a batalha.');
      return;
    }

    setStartingNow(true);

    try {
      console.log('[BATTLE START DEBUG] questions generated:', generatedQuestions?.length, generatedQuestions);
      console.log('[BATTLE START DEBUG] creating battle session...');
      await onStart(config, generatedQuestions);
      console.log('[BATTLE START DEBUG] battle session created:', liveClassId ?? 'local-battle');
    } catch (error) {
      console.error('[BATTLE START DEBUG] start failed:', error);
      setStartError(error instanceof Error ? error.message : 'Falha ao iniciar a batalha.');
    } finally {
      setStartingNow(false);
    }
  }

  /** ⚡ Quick Battle — generate and launch immediately, no curation */
  async function handleQuickBattle() {
    try {
      const previewConfig = buildConfig(questionCount);
      console.log('[BATTLE START DEBUG] generating questions...', previewConfig);
      console.log('[BATTLE FIREBASE] iniciar agora clicked', {
        liveClassId: liveClassId ?? null,
        userUid: currentUserUid ?? null,
        includeTeacher,
        includeBot: botEnabled,
        selectedStudents: selectedStudents.map((student) => ({
          uid: student.uid,
          name: student.name,
        })),
      });

      const { preparedQuestions, resolvedScope, source } = await getPreparedQuestionsForCurrentFlow();
      const config = buildConfig(preparedQuestions.length, resolvedScope);

      console.log('[BATTLE DEBUG] Quick Battle triggering onStart', {
        questionSource: source,
        scope: config.scope,
        courseId: config.courseId,
        lessonId: config.lessonId,
        workbookId: config.workbookId,
        questionCount: config.questionCount,
        botEnabled: config.botEnabled,
        includeTeacher: config.includeTeacher,
      });
      await runStartFlow(preparedQuestions, config, source === 'existing' ? 'curated' : 'quick');
    } catch (error) {
      console.error('[BATTLE START DEBUG] start failed:', error);
      setStartError(error instanceof Error ? error.message : copy.prepareFailure);
    }
  }

  /** 📋 Preparar Aula — generate and open the curation screen */
  async function handleOpenCuration() {
    try {
      const { preparedQuestions } = await getPreparedQuestionsForCurrentFlow();
      if (preparedQuestions.length === 0) {
        setStartError('Nenhuma pergunta válida foi encontrada para preparar a aula.');
        return;
      }
      setStartError(null);
      setQuestions(preparedQuestions);
      setEditingIdx(null);
      setEditDraft(null);
      setStep('curate');
    } catch (error) {
      console.error('[BATTLE START DEBUG] start failed:', error);
      setStartError(error instanceof Error ? error.message : 'Falha ao preparar as perguntas da batalha.');
    }
  }

  function toggleExclude(id: string) {
    setExcludedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function startEdit(idx: number) {
    const q = questions[idx];
    setEditingIdx(idx);
    setEditDraft({
      kind: q.kind,
      text: q.text,
      options: [...(q.options ?? ['', '', '', ''])],
      correctIndexes: q.correctIndexes?.length ? [...q.correctIndexes] : [q.correctIndex ?? 0],
      correctText: q.correctText ?? '',
      acceptedAnswersText: (q.acceptedAnswers ?? []).join(', '),
      promptAudioText: q.promptAudioText ?? '',
      imageUrl: q.imageUrl ?? '',
      durationSeconds: q.durationSeconds != null ? String(q.durationSeconds) : '',
    });
  }

  function cancelEdit() {
    setEditingIdx(null);
    setEditDraft(null);
  }

  function saveEdit() {
    if (editingIdx === null || !editDraft) return;
    const currentQuestion = questions[editingIdx];
    const sanitizedQuestion = sanitizeBattleQuestion(draftToQuestion(currentQuestion.id));
    if (!sanitizedQuestion) {
      window.alert('Essa pergunta ficou incompleta. Revise o enunciado e a resposta correta antes de salvar.');
      return;
    }

    setQuestions(questions.map((question, index) => (
      index === editingIdx ? sanitizedQuestion : question
    )));
    setEditingIdx(null);
    setEditDraft(null);
  }

  function addCustomQuestion() {
    const newId = `custom_${Date.now()}`;
    const newQuestion: BattleQuestion = {
      id: newId,
      kind: 'multiple-choice',
      text: 'Nova pergunta',
      options: ['Opção 1', 'Opção 2', 'Opção 3', 'Opção 4'],
      correctIndexes: [0],
      correctIndex: 0,
    };
    setQuestions(prev => [...prev, newQuestion]);
    setEditingIdx(questions.length);
    setEditDraft({
      kind: 'multiple-choice',
      text: 'Nova pergunta',
      options: ['Opção 1', 'Opção 2', 'Opção 3', 'Opção 4'],
      correctIndexes: [0],
      correctText: '',
      acceptedAnswersText: '',
      promptAudioText: '',
      imageUrl: '',
      durationSeconds: '',
    });
  }

  function duplicateQuestion(idx: number) {
    const original = questions[idx];
    const copy: BattleQuestion = {
      ...original,
      id: `${original.id}_dup_${Date.now()}`,
    };
    setQuestions(prev => {
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }

  /** ✅ Confirmar Lista Final — launch with curated questions */
  async function handleConfirm() {
    const finalQs = sanitizeBattleQuestions(
      getEffectiveQuestions().filter(q => !excludedIds.has(q.id))
    );
    if (finalQs.length === 0) {
      console.warn('[BATTLE START DEBUG] blocked before start:', {
        motivo: 'no-curated-questions-selected',
        dadosRelevantes: {
          liveClassId: liveClassId ?? null,
          userUid: currentUserUid ?? null,
          excludedCount: excludedIds.size,
          totalQuestions: questions.length,
        },
      });
      setStartError('Selecione pelo menos uma pergunta válida para iniciar a batalha.');
      return;
    }
    const config = buildConfig(finalQs.length);
    console.log('[BATTLE START DEBUG] generating questions...', config);
    console.log('[BATTLE FIREBASE] iniciar agora clicked', {
      liveClassId: liveClassId ?? null,
      userUid: currentUserUid ?? null,
      includeTeacher,
      includeBot: botEnabled,
      selectedStudents: selectedStudents.map((student) => ({
        uid: student.uid,
        name: student.name,
      })),
    });
    await runStartFlow(finalQs, config, 'curated');
    console.log('[BATTLE DEBUG] Curated Battle triggering onStart', {
      questionsCount: finalQs.length,
      botEnabled,
      includeTeacher
    });
  }

  const selectedCount = getEffectiveQuestions().filter(q => !excludedIds.has(q.id)).length;

  // ────────────────────────────────────────────────────────────────────────
  // STEP 1 — CONFIG
  // ────────────────────────────────────────────────────────────────────────
  async function handleSaveTemplate(titleOverride?: string, forceDuplicate = false) {
    try {
      const finalQuestions = step === 'curate'
        ? sanitizeBattleQuestions(
            getEffectiveQuestions().filter((question) => !excludedIds.has(question.id))
          )
        : (await getPreparedQuestionsForCurrentFlow()).preparedQuestions;

      if (finalQuestions.length === 0) {
        setStartError(copy.noQuestionsSave);
        return;
      }

      const title = titleOverride?.trim() || templateTitle.trim() || buildSuggestedBattleTitle(effectiveUiLanguage);
      setTemplateTitle(title);

      if (!onSaveTemplate) {
        setSaveMessage(copy.saveUnavailable);
        return;
      }

      const baseTemplate = buildSavedBattleTemplate(
        buildConfig(finalQuestions.length),
        finalQuestions,
        title,
      );
      const template = initialTemplate && !forceDuplicate
        ? {
            ...baseTemplate,
            id: initialTemplate.id,
            createdAt: initialTemplate.createdAt,
          }
        : baseTemplate;

      await onSaveTemplate(template);
      setSaveMessage(forceDuplicate ? copy.duplicateSuccess : copy.saveSuccess);
      setStartError(null);
    } catch (error) {
      console.error('[BATTLE SAVE DEBUG] save failed:', error);
      setSaveMessage(null);
      setStartError(error instanceof Error ? error.message : copy.saveFailure);
    }
  }

  async function handleDuplicateTemplate() {
    const baseTitle = templateTitle.trim() || initialTemplate?.title?.trim() || buildSuggestedBattleTitle(effectiveUiLanguage);
    await handleSaveTemplate(`${baseTitle} (copia)`, true);
  }

  if (step === 'config') {
    return (
      <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="relative mx-4 flex max-h-[90vh] w-full max-w-md flex-col overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">

          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-orange-600/80 to-red-700/80 px-6 py-4">
            <div className="min-w-0 flex-1 pr-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-100/80">
                {copy.battleName}
              </p>
              <input
                value={templateTitle}
                onChange={(event) => setTemplateTitle(event.target.value)}
                placeholder={copy.battleNamePlaceholder}
                className="mt-1 mb-1 w-full rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-sm font-bold text-white outline-none placeholder:text-orange-100/60 focus:border-white/40"
              />
              <p className="text-xs text-orange-200">
                {questionCount} {copy.questions} · {timePerQuestion}s {copy.each}
              </p>
            </div>
            <div className="hidden">
              <span className="text-2xl">⚔️</span>
              <div>
                <h2 className="text-lg font-bold text-white">Learnendo Battle</h2>
                <p className="text-xs text-orange-200">Configure a batalha</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void handleSaveTemplate()}
                title={copy.saveBattleTitle}
                className="text-xs text-orange-200 hover:text-white border border-orange-400/40 rounded-lg px-2 py-1 transition"
              >
                {copy.save}
              </button>
              <button
                onClick={() => void handleDuplicateTemplate()}
                title={copy.duplicateBattleTitle}
                className="text-xs text-orange-200 hover:text-white border border-orange-400/40 rounded-lg px-2 py-1 transition"
              >
                {copy.duplicate}
              </button>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none" aria-label="Close">✕</button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {startError ? (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {startError}
              </div>
            ) : null}
            {saveMessage ? (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                {saveMessage}
              </div>
            ) : null}

            {/* Scope */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {copy.source}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {scopeOptions.map(s => (
                  <button key={s.value} onClick={() => setScope(s.value)}
                    className={`p-2 rounded-xl border text-center transition-colors ${
                      scope === s.value
                        ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}>
                    <div className="text-xs font-semibold">{s.label}</div>
                    <div className="text-[10px] mt-0.5 opacity-70">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {copy.difficulty}
              </label>
              <div className="flex gap-2">
                {difficultyOptions.map(d => (
                  <button key={d.value} onClick={() => setDifficulty(d.value)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                      difficulty === d.value
                        ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}>
                    {d.emoji} {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Question count */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {copy.count}
              </label>
              <div className="flex gap-2">
                {QUESTION_COUNTS.map(n => (
                  <button key={n} onClick={() => setQuestionCount(n)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-colors ${
                      questionCount === n
                        ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {copy.seconds}
              </label>
              <div className="flex gap-2">
                {TIME_OPTIONS.map(t => (
                  <button key={t} onClick={() => setTimePerQuestion(t)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-colors ${
                      timePerQuestion === t
                        ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}>
                    {t}s
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  {copy.customTime}
                </label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  step={1}
                  value={timePerQuestion}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    if (Number.isFinite(nextValue)) {
                      setTimePerQuestion(nextValue);
                    }
                  }}
                  onBlur={() => setTimePerQuestion((current) => normalizeBattleDuration(current, 10))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-orange-500"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  {copy.customTimeHelp}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800/40 px-4 py-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTeacher}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    console.log('[BATTLE DEBUG] includeTeacher changed', {
                      checked,
                      previousIncludeTeacher: includeTeacher,
                    });
                    setIncludeTeacher(checked);
                  }}
                  className="mt-1 h-4 w-4 accent-orange-500"
                />
                <div>
                  <div className="text-sm font-semibold text-white">{copy.teacherLabel}</div>
                  <div className="text-xs text-slate-400">
                    {copy.teacherHelp}
                  </div>
                </div>
              </label>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800/40 px-4 py-3 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={botEnabled}
                  onChange={(e) => setBotEnabled(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-orange-500"
                />
                <div>
                  <div className="text-sm font-semibold text-white">{copy.botLabel}</div>
                  <div className="text-xs text-slate-400">
                    {copy.botHelp}
                  </div>
                </div>
              </label>

              {botEnabled ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      {copy.botAvatar}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {BOT_AVATAR_OPTIONS.map((avatar) => (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => setBotAvatarId(avatar.id)}
                          className={`flex flex-col items-center justify-center rounded-xl border px-2 py-3 transition ${
                            botAvatarId === avatar.id
                              ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                              : 'border-slate-700 text-slate-300 hover:border-slate-500'
                          }`}
                          title={avatar.label}
                        >
                          <span className="text-2xl leading-none">{avatar.icon}</span>
                          <span className="mt-1 text-[10px] font-semibold">{avatar.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      {copy.botName}
                    </label>
                    <input
                      value={botName}
                      onChange={(event) => setBotName(event.target.value)}
                      placeholder={copy.botName}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Footer — two launch paths */}
          <div className="sticky bottom-0 z-10 space-y-2 border-t border-slate-800 bg-slate-900 px-6 pb-6 pt-4">
            <button
              onClick={handleOpenCuration}
              disabled={startingNow}
              className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-semibold text-sm transition"
            >
              {copy.prepare}
            </button>
            <button
              onClick={() => {
                console.log('[BATTLE START DEBUG] Iniciar Agora clicked');
                void handleQuickBattle();
              }}
              disabled={startingNow}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-base hover:from-orange-400 hover:to-red-500 transition-all shadow-lg"
            >
              {copy.startNow} ({questionCount} {copy.questions})
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // STEP 2 — CURATION
  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-orange-600/80 to-red-700/80 shrink-0">
          <div className="min-w-0 flex-1 pr-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-100/80">
              {copy.battleName}
            </p>
            <input
              value={templateTitle}
              onChange={(event) => setTemplateTitle(event.target.value)}
              placeholder={copy.battleNamePlaceholder}
              className="mt-1 mb-1 w-full rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-sm font-bold text-white outline-none placeholder:text-orange-100/60 focus:border-white/40"
            />
            <p className="text-xs text-orange-200">
              {selectedCount} de {questions.length} selecionadas · {timePerQuestion}s cada
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={addCustomQuestion}
              title={copy.addQuestionTitle}
              className="text-xs text-orange-200 hover:text-white border border-orange-400/40 rounded-lg px-2 py-1 transition"
            >
              {copy.addQuestion}
            </button>
            <button onClick={() => void handleSaveTemplate()} title={copy.saveBattleTitle}
              className="text-xs text-orange-200 hover:text-white border border-orange-400/40 rounded-lg px-2 py-1 transition">
              {copy.save}
            </button>
            <button
              onClick={() => void handleDuplicateTemplate()}
              title={copy.duplicateBattleTitle}
              className="text-xs text-orange-200 hover:text-white border border-orange-400/40 rounded-lg px-2 py-1 transition"
            >
              {copy.duplicate}
            </button>
            <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none ml-1" aria-label="Close">✕</button>
          </div>
        </div>

        {/* Curation list */}
        <div className="flex-1 overflow-y-auto py-3 px-4 space-y-2">
          {startError ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {startError}
            </div>
          ) : null}
          {saveMessage ? (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {saveMessage}
            </div>
          ) : null}
          {questions.map((q, idx) => {
            const excluded  = excludedIds.has(q.id);
            const isEditing = editingIdx === idx;
            return (
              <div key={q.id}
                className={`rounded-xl border transition-all ${
                  excluded
                    ? 'border-slate-700/40 bg-slate-800/20 opacity-40'
                    : 'border-slate-700 bg-slate-800/60'
                }`}>

                {/* Row header */}
                <div className="flex items-start gap-2 px-3 py-2.5">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={!excluded}
                    onChange={() => toggleExclude(q.id)}
                    title={excluded ? copy.includeQuestion : copy.excludeQuestion}
                    className="mt-1 w-4 h-4 accent-orange-500 cursor-pointer shrink-0"
                  />
                  {/* Number badge */}
                  <span className="shrink-0 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-400 font-bold mt-0.5">
                    {idx + 1}
                  </span>

                  {/* Image thumbnail — shown when imageUrl is set */}
                  {q.imageUrl && (
                    <img
                      src={q.imageUrl}
                      alt="preview"
                      className="shrink-0 w-10 h-10 rounded object-cover border border-slate-600 mt-0.5"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}

                  {/* Question text */}
                  <div className="flex-1">
                    <p className="text-sm text-white leading-snug">{q.text}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Tempo: {getBattleQuestionDuration(q, timePerQuestion)}s
                      {q.durationSeconds != null ? ' (personalizado)' : ' (padrÃ£o)'}
                    </p>
                  </div>

                  {/* Action buttons */}
                  {!excluded && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => duplicateQuestion(idx)}
                        title={copy.duplicateQuestion}
                        className="text-xs px-1.5 py-0.5 rounded border border-slate-600 text-slate-500 hover:border-blue-400 hover:text-blue-400 transition"
                      >⧉</button>
                      <button
                        onClick={() => isEditing ? cancelEdit() : startEdit(idx)}
                        className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                          isEditing
                            ? 'border-orange-500 text-orange-400'
                            : 'border-slate-600 text-slate-500 hover:border-slate-400 hover:text-slate-300'
                        }`}
                      >{isEditing ? '✕' : '✏️'}</button>
                    </div>
                  )}
                </div>

                {/* Options mini-preview */}
                {!isEditing && !excluded && q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-2 gap-1 px-3 pb-2.5">
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx}
                        className={`text-[11px] px-2 py-1 rounded border truncate ${
                          (q.correctIndexes ?? [q.correctIndex ?? 0]).includes(optIdx)
                            ? 'border-green-600/60 bg-green-600/10 text-green-400'
                            : 'border-slate-700/60 text-slate-500'
                        }`}>
                        {(q.correctIndexes ?? [q.correctIndex ?? 0]).includes(optIdx) ? '✓ ' : ''}{opt}
                      </div>
                    ))}
                  </div>
                )}

                {!isEditing && !excluded && (!q.options || q.options.length === 0) && (
                  <div className="px-3 pb-2.5">
                    <div className="text-[11px] px-2 py-2 rounded border border-green-600/60 bg-green-600/10 text-green-400">
                      Resposta esperada: {q.correctText || q.acceptedAnswers?.[0] || '—'}
                    </div>
                  </div>
                )}

                {/* Inline editor */}
                {isEditing && editDraft && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-700 space-y-3">

                    {/* Question text field */}
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wide">{copy.questionText}</label>
                      <input
                        value={editDraft.text}
                        onChange={e => setEditDraft(d => d ? { ...d, text: e.target.value } : d)}
                        className="w-full mt-0.5 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wide">{copy.questionType}</label>
                      <select
                        value={editDraft.kind}
                        onChange={e => setEditDraft(d => d ? { ...d, kind: e.target.value as BattleQuestionKind } : d)}
                        className="w-full mt-0.5 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-orange-500"
                      >
                        {questionKindOptions.map(kind => (
                          <option key={kind.value} value={kind.value}>{kind.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wide">
                        Tempo desta pergunta (segundos)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={180}
                        step={1}
                        value={editDraft.durationSeconds}
                        onChange={e => setEditDraft(d => d ? { ...d, durationSeconds: e.target.value } : d)}
                        placeholder={`PadrÃ£o da batalha: ${timePerQuestion}s`}
                        className="w-full mt-0.5 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-orange-500 placeholder-slate-500"
                      />
                      <p className="mt-1 text-[11px] text-slate-400">
                        Deixe em branco para usar o tempo padrÃ£o da batalha.
                      </p>
                    </div>

                    {/* Image URL field */}
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wide">
                        URL da imagem (opcional)
                      </label>
                      <div className="flex gap-2 mt-0.5">
                        <input
                          value={editDraft.imageUrl}
                          onChange={e => setEditDraft(d => d ? { ...d, imageUrl: e.target.value } : d)}
                          placeholder="https://… ou deixe em branco"
                          className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-orange-500 placeholder-slate-500"
                        />
                        {editDraft.imageUrl && (
                          <img
                            src={editDraft.imageUrl}
                            alt="preview"
                            className="w-10 h-10 rounded object-cover border border-slate-600 shrink-0"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                      </div>
                    </div>

                    {(editDraft.kind === 'audio-choice' || editDraft.kind === 'audio-open' || editDraft.kind === 'speaking') && (
                      <>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase tracking-wide">Texto do áudio</label>
                          <input
                            value={editDraft.promptAudioText}
                            onChange={e => setEditDraft(d => d ? { ...d, promptAudioText: e.target.value } : d)}
                            placeholder="Ex.: What is two plus two?"
                            className="w-full mt-0.5 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-orange-500 placeholder-slate-500"
                          />
                        </div>
                        {(editDraft.kind === 'audio-open' || editDraft.kind === 'speaking') && (
                          <>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase tracking-wide">{copy.correctAnswer}</label>
                          <input
                            value={editDraft.correctText}
                            onChange={e => setEditDraft(d => d ? { ...d, correctText: e.target.value } : d)}
                            placeholder={editDraft.kind === 'speaking' ? "Ex.: it's an apple" : 'Ex.: 4'}
                            className="w-full mt-0.5 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-orange-500 placeholder-slate-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase tracking-wide">Variações aceitas</label>
                          <input
                            value={editDraft.acceptedAnswersText}
                            onChange={e => setEditDraft(d => d ? { ...d, acceptedAnswersText: e.target.value } : d)}
                            placeholder={copy.acceptedAnswersPlaceholder}
                            className="w-full mt-0.5 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-orange-500 placeholder-slate-500"
                          />
                        </div>
                          </>
                        )}
                      </>
                    )}

                    {/* Options editor */}
                    {(editDraft.kind === 'multiple-choice' || editDraft.kind === 'image-choice' || editDraft.kind === 'audio-choice') && (
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wide">
                        Alternativas — marque uma ou mais corretas
                      </label>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Uma correta responde no clique. VÃ¡rias corretas exigem marcar tudo e confirmar.
                      </p>
                      <div className="mt-1 space-y-1.5">
                        {editDraft.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editDraft.correctIndexes.includes(optIdx)}
                              onChange={() => setEditDraft(d => {
                                if (!d) return d;
                                const isCorrect = d.correctIndexes.includes(optIdx);
                                const nextIndexes = isCorrect
                                  ? d.correctIndexes.filter((index) => index !== optIdx)
                                  : [...d.correctIndexes, optIdx].sort((a, b) => a - b);
                                return {
                                  ...d,
                                  correctIndexes: nextIndexes.length > 0 ? nextIndexes : [optIdx],
                                };
                              })}
                              className="accent-green-500 cursor-pointer"
                            />
                            <input
                              value={opt}
                              onChange={e => setEditDraft(d => {
                                if (!d) return d;
                                const opts = [...d.options];
                                opts[optIdx] = e.target.value;
                                return { ...d, options: opts };
                              })}
                              className={`flex-1 bg-slate-700 border rounded px-2 py-1 text-sm text-white outline-none focus:border-orange-500 ${
                                editDraft.correctIndexes.includes(optIdx) ? 'border-green-600' : 'border-slate-600'
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="px-4 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-bold text-white transition"
                      >✓ Salvar</button>
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-300 transition"
                      >Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 flex gap-3 shrink-0">
          <button
            onClick={() => setStep('config')}
            className="px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 font-semibold text-sm hover:border-slate-400 transition"
          >← Voltar</button>
          <button
            onClick={() => {
              console.log('[BATTLE START DEBUG] Iniciar Agora clicked');
              void handleConfirm();
            }}
            disabled={selectedCount === 0 || startingNow}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-sm hover:opacity-90 transition disabled:opacity-40"
          >✅ Confirmar Lista Final ({selectedCount} perguntas)</button>
        </div>
      </div>
    </div>
  );
};
