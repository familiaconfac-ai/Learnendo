export type UiLanguage = 'en' | 'pt' | 'es';

const en = {
  student: 'Student', students: 'Students', teacher: 'Teacher', admin: 'Admin',
  workbook: 'Workbook', workbooks: 'Workbooks', courses: 'Courses', lesson: 'Lesson', unit: 'Unit',
  grammar: 'Grammar', grammarFocus: 'Grammar Focus', placement: 'Placement Test',
  teacherDashboard: 'Teacher Dashboard', settings: 'Settings', help: 'Help', logout: 'Logout',
  home: 'Home', back: 'Back', openMenu: 'Open menu', lessonList: 'Go to lesson list',
  guest: 'Guest', guestMode: 'Guest mode', createAccount: 'Create account',
  guestDescription: 'Create an account to save your progress.',
  reports: 'Problem reports', reportProblem: 'Report a problem',
  exercise: 'Exercise', exercises: 'Exercises', done: 'Done', test: 'Test', words: 'words',
  score: 'Score', lessonComplete: 'Lesson Complete', tryAgain: 'Try again',
  currentLesson: 'Current lesson', loading: 'Loading…', loadingLegacy: 'Loading legacy…',
  practice: 'Practice', report: 'Report', opening: 'Opening…', board: 'Board', slides: 'Slides',
  chooseCourse: 'Choose your course', refresh: 'Refresh', retry: 'Retry',
  totalStudents: 'Total Students', needAttention: 'Need Attention', avgAccuracy: 'Average Accuracy',
  ranking: 'Ranking', access: 'Access', registeredStudents: 'Registered students', assignedStudents: 'Assigned students',
};
type Labels = Record<keyof typeof en, string>;
const pt: Labels = {
  student: 'Aluno', students: 'Alunos', teacher: 'Professor', admin: 'Administrador',
  workbook: 'Caderno', workbooks: 'Cadernos', courses: 'Cursos', lesson: 'Lição', unit: 'Unidade',
  grammar: 'Gramática', grammarFocus: 'Gramática', placement: 'Teste de nível',
  teacherDashboard: 'Painel do professor', settings: 'Configurações', help: 'Ajuda', logout: 'Sair',
  home: 'Início', back: 'Voltar', openMenu: 'Abrir menu', lessonList: 'Ir para a lista de lições',
  guest: 'Visitante', guestMode: 'Modo visitante', createAccount: 'Criar conta',
  guestDescription: 'Crie uma conta para salvar seu progresso.',
  reports: 'Relatórios de problemas', reportProblem: 'Reportar problema',
  exercise: 'Exercício', exercises: 'Exercícios', done: 'Feito', test: 'Teste', words: 'palavras',
  score: 'Pontuação', lessonComplete: 'Lição concluída', tryAgain: 'Tentar novamente',
  currentLesson: 'Lição atual', loading: 'Carregando…', loadingLegacy: 'Carregando legado…',
  practice: 'Praticar', report: 'Reportar', opening: 'Abrindo…', board: 'Quadro', slides: 'Slides',
  chooseCourse: 'Escolha seu curso', refresh: 'Atualizar', retry: 'Tentar novamente',
  totalStudents: 'Total de alunos', needAttention: 'Precisam de atenção', avgAccuracy: 'Média de acertos',
  ranking: 'Classificação', access: 'Acesso', registeredStudents: 'Alunos cadastrados', assignedStudents: 'Alunos atribuídos',
};
const es: Labels = {
  student: 'Alumno', students: 'Alumnos', teacher: 'Profesor', admin: 'Administrador',
  workbook: 'Libro', workbooks: 'Libros', courses: 'Cursos', lesson: 'Lección', unit: 'Unidad',
  grammar: 'Gramática', grammarFocus: 'Gramática', placement: 'Prueba de nivel',
  teacherDashboard: 'Panel del profesor', settings: 'Configuración', help: 'Ayuda', logout: 'Salir',
  home: 'Inicio', back: 'Volver', openMenu: 'Abrir menú', lessonList: 'Ir a la lista de lecciones',
  guest: 'Visitante', guestMode: 'Modo visitante', createAccount: 'Crear cuenta',
  guestDescription: 'Crea una cuenta para guardar tu progreso.',
  reports: 'Informes de problemas', reportProblem: 'Reportar un problema',
  exercise: 'Ejercicio', exercises: 'Ejercicios', done: 'Hecho', test: 'Prueba', words: 'palabras',
  score: 'Puntuación', lessonComplete: 'Lección completada', tryAgain: 'Intentar de nuevo',
  currentLesson: 'Lección actual', loading: 'Cargando…', loadingLegacy: 'Cargando legado…',
  practice: 'Practicar', report: 'Reportar', opening: 'Abriendo…', board: 'Pizarra', slides: 'Diapositivas',
  chooseCourse: 'Elige tu curso', refresh: 'Actualizar', retry: 'Reintentar',
  totalStudents: 'Total de alumnos', needAttention: 'Necesitan atención', avgAccuracy: 'Promedio de aciertos',
  ranking: 'Clasificación', access: 'Acceso', registeredStudents: 'Alumnos registrados', assignedStudents: 'Alumnos asignados',
};
export const UI_LABELS: Record<UiLanguage, Labels> = { en, pt, es };
export const normalizeUiLanguage = (value: string): UiLanguage => value === 'pt' || value === 'es' ? value : 'en';
export const getUiLabels = (language: string): Labels => UI_LABELS[normalizeUiLanguage(language)];

// Remove only structural prefixes. Everything after them is curricular text, kept verbatim.
export const curricularLessonTitle = (title: string): string => title
  .replace(/^(?:Workbook|Caderno|Libro)\s*\d+\s*[:—–-]\s*/i, '')
  .replace(/^(?:Lesson|Lição|Lección)\s*\d+(?:\s*[:—–-]\s*|\s*$)/i, '');
export function lessonUiTitle(language: string, number: number, title = ''): string {
  const content = curricularLessonTitle(title);
  return `${getUiLabels(language).lesson} ${number}${content ? `: ${content}` : ''}`;
}
