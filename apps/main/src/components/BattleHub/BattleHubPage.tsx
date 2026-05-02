import React, { useEffect, useMemo, useState } from 'react';
import { BattlePracticeView } from '../LiveClasses/Battle/BattlePracticeView';
import { BattleHostView } from '../LiveClasses/Battle/BattleHostView';
import { BattleSetupModal } from '../LiveClasses/Battle/BattleSetupModal';
import type { SavedBattleTemplate, BattleConfig, BattleQuestion, BattleSession, BattleTemplateLanguage } from '../LiveClasses/Battle/battleTypes';
import { createBattleSession, deleteBattleSession, subscribeBattleSession } from '../LiveClasses/Battle/battleService';
import { buildSavedBattleTemplate, getBattleCourseIdForLanguage, getSavedBattleTemplateLanguage } from '../LiveClasses/Battle/battleUtils';
import { appendLiveClassBattleTemplate } from '../../services/liveClassesService';
import {
  listBattleTemplatesByOwner,
  saveBattleTemplateToLibrary,
  type StoredBattleTemplate,
} from '../../services/battleTemplateLibraryService';
import type { LiveClass } from '../../types';

type UILang = 'en' | 'pt' | 'es' | 'el' | 'he';
type SupportedBattleUiLanguage = 'en' | 'pt' | 'es';

function getSupportedBattleUiLanguage(uiLanguage?: UILang): SupportedBattleUiLanguage {
  if (uiLanguage === 'pt' || uiLanguage === 'es') return uiLanguage;
  return 'en';
}

const BATTLE_LANGUAGE_GROUPS: Array<{ value: BattleTemplateLanguage; label: string; dir?: 'ltr' | 'rtl' }> = [
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'português' },
  { value: 'es', label: 'español' },
  { value: 'el', label: 'Ελληνικά' },
  { value: 'he', label: 'עברית', dir: 'rtl' },
];

interface Props {
  uid: string;
  name: string;
  courseId?: string | null;
  workbookId?: number | null;
  lessonId?: string | null;
  uiLanguage?: UILang;
  fire: number;
  ice: number;
  diamonds: number;
  stars: number;
  onOpenLiveClasses?: () => void;
  activeLiveClass?: LiveClass | null;
  onlineParticipants?: Array<{ uid: string; name: string }>;
  onDismiss?: () => void;
  initialSetupTemplate?: SavedBattleTemplate | null;
}

const COPY: Record<UILang, {
  title: string;
  subtitle: string;
  configure: string;
  replay: string;
  replayHint: string;
  liveTitle: string;
  liveBody: string;
  liveCta: string;
  empty: string;
  fire: string;
  ice: string;
  diamonds: string;
  stars: string;
  currentSetup: string;
  course: string;
  workbook: string;
  lesson: string;
  currentLesson: string;
  questionsWord: string;
  solo: string;
  botEnabled: string;
  libraryTitle: string;
  libraryBody: string;
  savedCount: (count: number) => string;
  libraryLoading: string;
  libraryEmpty: string;
  editAndUse: string;
  open: string;
  loadLibraryError: string;
}> = {
  en: {
    title: 'Battle Arena',
    subtitle: 'Keep the current Learnendo battle setup, then run the match with the more stable standalone battle engine.',
    configure: 'Configure Battle',
    replay: 'Replay Last Battle',
    replayHint: 'The last battle you configured stays here for quick replay.',
    liveTitle: 'Multiplayer',
    liveBody: 'Teacher-versus-student battles still live inside Live Classes so we preserve the existing classroom flow.',
    liveCta: 'Open Live Classes',
    empty: 'No saved local battle yet. Configure one and start practicing against the bot.',
    fire: 'Fire',
    ice: 'Ice',
    diamonds: 'Diamonds',
    stars: 'Stars',
    currentSetup: 'Current setup',
    course: 'Course',
    workbook: 'Workbook',
    lesson: 'Lesson',
    currentLesson: 'current lesson',
    questionsWord: 'questions',
    solo: 'Solo',
    botEnabled: 'Bot enabled',
    libraryTitle: 'Battle Library',
    libraryBody: 'Save themes like "greetings 1", "greetings 2" and reopen them for other classes.',
    savedCount: (count: number) => `${count} saved`,
    libraryLoading: 'Loading library...',
    libraryEmpty: 'There are no saved battles yet. Open "Prepare Class", build your questions and click "Save".',
    editAndUse: 'Edit and use',
    open: 'Open',
    loadLibraryError: 'Failed to load saved battles.',
  },
  pt: {
    title: 'Arena Battle',
    subtitle: 'Mantém a configuração atual do Learnendo e roda a partida com o motor standalone mais estável.',
    configure: 'Configurar Battle',
    replay: 'Jogar Última Batalha',
    replayHint: 'A última batalha configurada fica salva aqui para replay rápido.',
    liveTitle: 'Multiplayer',
    liveBody: 'As batalhas professor x aluno continuam dentro de Live Classes para preservar o fluxo de sala que já existe.',
    liveCta: 'Abrir Live Classes',
    empty: 'Nenhuma batalha local salva ainda. Configure uma e treine contra o bot.',
    fire: 'Fogo',
    ice: 'Gelo',
    diamonds: 'Diamantes',
    stars: 'Estrelas',
    currentSetup: 'Configuracao atual',
    course: 'Curso',
    workbook: 'Workbook',
    lesson: 'Licao',
    currentLesson: 'licao atual',
    questionsWord: 'perguntas',
    solo: 'Solo',
    botEnabled: 'Bot ativo',
    libraryTitle: 'Biblioteca de Battles',
    libraryBody: 'Salve temas como "greetings 1", "greetings 2" e reabra para outras turmas.',
    savedCount: (count: number) => `${count} salvos`,
    libraryLoading: 'Carregando biblioteca...',
    libraryEmpty: 'Ainda nao ha battles salvos. Abra "Preparar Aula", monte suas perguntas e clique em "Salvar".',
    editAndUse: 'Editar e usar',
    open: 'Abrir',
    loadLibraryError: 'Falha ao carregar battles salvos.',
  },
  es: {
    title: 'Arena Battle',
    subtitle: 'Mantiene la configuración actual de Learnendo y ejecuta la partida con un motor standalone más estable.',
    configure: 'Configurar Battle',
    replay: 'Jugar Última Batalla',
    replayHint: 'La última batalla configurada queda guardada aquí para repetirla rápido.',
    liveTitle: 'Multijugador',
    liveBody: 'Las batallas profesor vs alumno siguen dentro de Live Classes para preservar el flujo de clase existente.',
    liveCta: 'Abrir Live Classes',
    empty: 'Todavía no hay una batalla local guardada. Configura una y practica contra el bot.',
    fire: 'Fuego',
    ice: 'Hielo',
    diamonds: 'Diamantes',
    stars: 'Estrellas',
    currentSetup: 'Configuracion actual',
    course: 'Curso',
    workbook: 'Libro',
    lesson: 'Leccion',
    currentLesson: 'leccion actual',
    questionsWord: 'preguntas',
    solo: 'Solo',
    botEnabled: 'Bot activo',
    libraryTitle: 'Biblioteca de Batallas',
    libraryBody: 'Guarda temas como "greetings 1", "greetings 2" y vuelvelos a abrir para otras clases.',
    savedCount: (count: number) => `${count} guardadas`,
    libraryLoading: 'Cargando biblioteca...',
    libraryEmpty: 'Todavia no hay batallas guardadas. Abre "Preparar clase", arma tus preguntas y pulsa "Guardar".',
    editAndUse: 'Editar y usar',
    open: 'Abrir',
    loadLibraryError: 'No se pudieron cargar las batallas guardadas.',
  },
  el: {
    title: 'Battle Arena',
    subtitle: 'Keep the current Learnendo battle setup, then run the match with the more stable standalone battle engine.',
    configure: 'Configure Battle',
    replay: 'Replay Last Battle',
    replayHint: 'The last battle you configured stays here for quick replay.',
    liveTitle: 'Multiplayer',
    liveBody: 'Teacher-versus-student battles still live inside Live Classes so we preserve the existing classroom flow.',
    liveCta: 'Open Live Classes',
    empty: 'No saved local battle yet. Configure one and start practicing against the bot.',
    fire: 'Fire',
    ice: 'Ice',
    diamonds: 'Diamonds',
    stars: 'Stars',
    currentSetup: 'Current setup',
    course: 'Course',
    workbook: 'Workbook',
    lesson: 'Lesson',
    currentLesson: 'current lesson',
    questionsWord: 'questions',
    solo: 'Solo',
    botEnabled: 'Bot enabled',
    libraryTitle: 'Battle Library',
    libraryBody: 'Save themes like "greetings 1", "greetings 2" and reopen them for other classes.',
    savedCount: (count: number) => `${count} saved`,
    libraryLoading: 'Loading library...',
    libraryEmpty: 'There are no saved battles yet. Open "Prepare Class", build your questions and click "Save".',
    editAndUse: 'Edit and use',
    open: 'Open',
    loadLibraryError: 'Failed to load saved battles.',
  },
  he: {
    title: 'Battle Arena',
    subtitle: 'Keep the current Learnendo battle setup, then run the match with the more stable standalone battle engine.',
    configure: 'Configure Battle',
    replay: 'Replay Last Battle',
    replayHint: 'The last battle you configured stays here for quick replay.',
    liveTitle: 'Multiplayer',
    liveBody: 'Teacher-versus-student battles still live inside Live Classes so we preserve the existing classroom flow.',
    liveCta: 'Open Live Classes',
    empty: 'No saved local battle yet. Configure one and start practicing against the bot.',
    fire: 'Fire',
    ice: 'Ice',
    diamonds: 'Diamonds',
    stars: 'Stars',
    currentSetup: 'Current setup',
    course: 'Course',
    workbook: 'Workbook',
    lesson: 'Lesson',
    currentLesson: 'current lesson',
    questionsWord: 'questions',
    solo: 'Solo',
    botEnabled: 'Bot enabled',
    libraryTitle: 'Battle Library',
    libraryBody: 'Save themes like "greetings 1", "greetings 2" and reopen them for other classes.',
    savedCount: (count: number) => `${count} saved`,
    libraryLoading: 'Loading library...',
    libraryEmpty: 'There are no saved battles yet. Open "Prepare Class", build your questions and click "Save".',
    editAndUse: 'Edit and use',
    open: 'Open',
    loadLibraryError: 'Failed to load saved battles.',
  },
};

function buildStorageKey(uid: string, courseId?: string | null) {
  return `learnendo_battle_hub_last_template:${uid}:${courseId ?? 'default'}`;
}

export const BattleHubPage: React.FC<Props> = ({
  uid,
  name,
  courseId,
  workbookId,
  lessonId,
  uiLanguage = 'en',
  fire,
  ice,
  diamonds,
  stars,
  onOpenLiveClasses,
  activeLiveClass,
  onlineParticipants,
  onDismiss,
  initialSetupTemplate = null,
}) => {
  const copy = COPY[uiLanguage] ?? COPY.en;
  const supportedBattleUiLanguage = getSupportedBattleUiLanguage(uiLanguage);
  const effectiveCourseId = getBattleCourseIdForLanguage(uiLanguage) ?? courseId ?? activeLiveClass?.courseId;
  const effectiveWorkbookId = workbookId ?? activeLiveClass?.workbookId;
  const effectiveLessonId = lessonId ?? activeLiveClass?.lessonId?.toString();
  const storageKey = useMemo(() => buildStorageKey(uid, effectiveCourseId), [effectiveCourseId, uid]);
  const [showSetup, setShowSetup] = useState(() => Boolean(activeLiveClass?.id));
  const [lastTemplate, setLastTemplate] = useState<SavedBattleTemplate | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<SavedBattleTemplate | null>(null);
  const [liveSession, setLiveSession] = useState<BattleSession | null>(null);
  const [setupTemplate, setSetupTemplate] = useState<SavedBattleTemplate | null>(null);
  const [libraryTemplates, setLibraryTemplates] = useState<StoredBattleTemplate[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const groupedLibraryTemplates = useMemo(() => {
    const groups = BATTLE_LANGUAGE_GROUPS.reduce<Record<BattleTemplateLanguage, StoredBattleTemplate[]>>(
      (accumulator, group) => ({
        ...accumulator,
        [group.value]: [],
      }),
      {
        en: [],
        pt: [],
        es: [],
        el: [],
        he: [],
      },
    );

    for (const template of libraryTemplates) {
      groups[getSavedBattleTemplateLanguage(template)].push(template);
    }

    return groups;
  }, [libraryTemplates]);
  const setupCourseId = setupTemplate?.config.courseId ?? effectiveCourseId ?? undefined;
  const setupWorkbookId = setupTemplate?.config.workbookId ?? effectiveWorkbookId ?? undefined;
  const setupLessonId = setupTemplate?.config.lessonId?.toString() ?? effectiveLessonId ?? undefined;

  const handleCloseSetup = () => {
    setShowSetup(false);
    setSetupTemplate(null);

    if (activeLiveClass?.id) {
      onDismiss?.();
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setLastTemplate(raw ? JSON.parse(raw) as SavedBattleTemplate : null);
    } catch {
      setLastTemplate(null);
    }
  }, [storageKey]);

  useEffect(() => {
    let isMounted = true;

    const loadLibrary = async () => {
      setLibraryLoading(true);
      setLibraryError(null);
      try {
        const templates = await listBattleTemplatesByOwner(uid);
        if (isMounted) {
          setLibraryTemplates(templates);
        }
      } catch (error) {
        if (isMounted) {
          setLibraryError(error instanceof Error ? error.message : copy.loadLibraryError);
        }
      } finally {
        if (isMounted) {
          setLibraryLoading(false);
        }
      }
    };

    void loadLibrary();

    return () => {
      isMounted = false;
    };
  }, [copy.loadLibraryError, uid]);

  useEffect(() => {
    if (!activeLiveClass?.id) return;
    setShowSetup(true);
  }, [activeLiveClass?.id]);

  useEffect(() => {
    if (!initialSetupTemplate) return;
    setSetupTemplate(initialSetupTemplate);
    setShowSetup(true);
  }, [initialSetupTemplate]);

  useEffect(() => {
    if (!activeLiveClass?.id) {
      setLiveSession(null);
      return;
    }

    console.info('[BATTLE FIREBASE] teacher listener attach', {
      classId: activeLiveClass.id,
      docPath: `liveClasses/${activeLiveClass.id}/session/battle`,
      teacherUid: uid,
    });

    return subscribeBattleSession(activeLiveClass.id, setLiveSession);
  }, [activeLiveClass?.id, uid]);

  useEffect(() => {
    if (!activeLiveClass?.id) return;

    console.log('[LIVE BATTLE SESSION] loaded', {
      liveClassId: activeLiveClass.id,
      userId: uid,
      role: 'teacher',
      status: liveSession?.status ?? null,
      currentQuestionIndex: liveSession?.currentQuestionIndex ?? null,
      participants: liveSession?.participants ?? null,
      answers: liveSession?.answers ?? liveSession?.currentAnswers ?? null,
    });
  }, [activeLiveClass?.id, liveSession, uid]);

  async function handleSaveTemplate(template: SavedBattleTemplate) {
    const storedTemplate = await saveBattleTemplateToLibrary(uid, template);
    setLibraryTemplates((current) => {
      const withoutSameId = current.filter((entry) => entry.id !== storedTemplate.id);
      return [storedTemplate, ...withoutSameId].sort((left, right) => right.updatedAt - left.updatedAt);
    });

    if (activeLiveClass?.id) {
      await appendLiveClassBattleTemplate(activeLiveClass.id, template);
    }
  }

  async function handleTemplateReady(config: BattleConfig, questions: BattleQuestion[]) {
    console.log('[BATTLE START DEBUG] handler entered');
    const savedTemplate = buildSavedBattleTemplate(
      config,
      questions,
      `${copy.title} • ${new Date().toLocaleDateString(
        uiLanguage === 'pt' ? 'pt-BR' : uiLanguage === 'es' ? 'es-ES' : 'en-US'
      )}`,
    );

    setLastTemplate(savedTemplate);
    try {
      localStorage.setItem(storageKey, JSON.stringify(savedTemplate));
    } catch {
      // Ignore storage quota issues and keep the in-memory template.
    }

    if (activeLiveClass?.id) {
      const normalizedConfig = {
        ...config,
        courseId: effectiveCourseId ?? config.courseId,
        workbookId: effectiveWorkbookId ?? config.workbookId,
        lessonId: effectiveLessonId ?? config.lessonId,
      };

      console.info('[BATTLE FIREBASE] handleTemplateReady:start', {
        liveClassId: activeLiveClass.id,
        docPath: `liveClasses/${activeLiveClass.id}/session/battle`,
        teacherUid: uid,
        includeTeacher: normalizedConfig.includeTeacher,
        includeBot: normalizedConfig.botEnabled,
        questionCount: questions.length,
        participantIds: liveParticipants.map((participant) => participant.uid),
      });

      try {
        console.log('[BATTLE START DEBUG] creating battle session...');
        await createBattleSession(
          activeLiveClass.id,
          normalizedConfig,
          uid,
          name,
          questions,
          liveParticipants.map((participant) => ({
            uid: participant.uid,
            name: participant.name,
            joinedAt: Date.now(),
          })),
        );
        console.info('[BATTLE FIREBASE] handleTemplateReady:success', {
          liveClassId: activeLiveClass.id,
          docPath: `liveClasses/${activeLiveClass.id}/session/battle`,
          teacherUid: uid,
        });
        console.log('[BATTLE START DEBUG] battle session created:', activeLiveClass.id);
        setShowSetup(false);
        return;
      } catch (error) {
        console.error('[BATTLE START DEBUG] start failed:', error);
        console.error('[BATTLE FIREBASE] handleTemplateReady:error', {
          liveClassId: activeLiveClass.id,
          docPath: `liveClasses/${activeLiveClass.id}/session/battle`,
          teacherUid: uid,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }

    setShowSetup(false);
    setActiveTemplate(savedTemplate);
  }

  const liveParticipants = useMemo(() => {
    const sourceParticipants = onlineParticipants
      ?? Object.values(liveSession?.participants ?? {}).map((participant) => ({
        uid: participant.uid,
        name: participant.name,
      }));

    return Array.from(
      new Map(
        sourceParticipants
          .filter((participant) => Boolean(participant?.uid))
          .map((participant) => [participant.uid, participant])
      ).values()
    );
  }, [liveSession?.participants, onlineParticipants]);

  return (
    <div className="min-h-screen bg-slate-900 px-4 pb-28 pt-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/40 p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <div className="text-4xl">⚔️</div>
              <h1 className="mt-3 text-3xl font-black text-white">{copy.title}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-300">{copy.subtitle}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setSetupTemplate(null);
                    setShowSetup(true);
                  }}
                  className="rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 px-5 py-3 text-sm font-black text-white shadow-[0_6px_20px_rgba(234,88,12,0.35)]"
                >
                  {copy.configure}
                </button>
                {lastTemplate ? (
                  <button
                    onClick={() => setActiveTemplate(lastTemplate)}
                    className="rounded-2xl border border-slate-700 bg-slate-950/70 px-5 py-3 text-sm font-black text-slate-100"
                  >
                    {copy.replay}
                  </button>
                ) : null}
              </div>
              <p className="mt-3 text-xs text-slate-500">{copy.replayHint}</p>
            </div>

            <div className="grid w-full max-w-sm grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4">
                <div className="text-xs font-black uppercase tracking-wide text-orange-300">🔥 {copy.fire}</div>
                <div className="mt-2 text-2xl font-black text-white">{fire}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4">
                <div className="text-xs font-black uppercase tracking-wide text-cyan-300">❄️ {copy.ice}</div>
                <div className="mt-2 text-2xl font-black text-white">{ice}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4">
                <div className="text-xs font-black uppercase tracking-wide text-sky-300">💎 {copy.diamonds}</div>
                <div className="mt-2 text-2xl font-black text-white">{diamonds}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4">
                <div className="text-xs font-black uppercase tracking-wide text-amber-300">⭐ {copy.stars}</div>
                <div className="mt-2 text-2xl font-black text-white">{stars}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
          <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-sm font-black uppercase tracking-wide text-orange-300">{copy.currentSetup}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{copy.course}</div>
                <div className="mt-2 text-sm font-semibold text-white">{effectiveCourseId ?? 'english'}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{copy.workbook}</div>
                  <div className="mt-2 text-sm font-semibold text-white">{effectiveWorkbookId ?? 1}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{copy.lesson}</div>
                  <div className="mt-2 text-sm font-semibold text-white">{effectiveLessonId ?? copy.currentLesson}</div>
              </div>
            </div>
            {lastTemplate ? (
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-white">{lastTemplate.title}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {lastTemplate.questions.length} {copy.questionsWord} • {lastTemplate.config.timePerQuestion}s • {lastTemplate.config.botEnabled ? copy.botEnabled : copy.solo}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTemplate(lastTemplate)}
                    className="rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-300"
                  >
                    {copy.replay}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-5 text-sm text-slate-400">
                {copy.empty}
              </div>
            )}
          </article>

          <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-sm font-black uppercase tracking-wide text-cyan-300">{copy.liveTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">{copy.liveBody}</p>
            {onOpenLiveClasses ? (
              <button
                onClick={onOpenLiveClasses}
                className="mt-5 w-full rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-sm font-black text-cyan-200"
              >
                {copy.liveCta}
              </button>
            ) : null}
          </article>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-emerald-300">{copy.libraryTitle}</h2>
              <p className="mt-1 text-sm text-slate-300">
                {copy.libraryBody}
              </p>
            </div>
            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-300">
              {copy.savedCount(libraryTemplates.length)}
            </span>
          </div>

          {libraryLoading ? (
            <p className="mt-4 text-sm text-slate-400">{copy.libraryLoading}</p>
          ) : libraryError ? (
            <p className="mt-4 text-sm text-rose-300">{libraryError}</p>
          ) : libraryTemplates.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">{copy.libraryEmpty}</p>
          ) : (
            <>
            <div className="mt-4 space-y-4">
              {BATTLE_LANGUAGE_GROUPS.map((group) => {
                const templates = groupedLibraryTemplates[group.value];

                return (
                  <article key={group.value} className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-emerald-200" dir={group.dir}>{group.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{copy.savedCount(templates.length)}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-200">
                        {templates.length}
                      </div>
                    </div>

                    {templates.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">{copy.libraryEmpty}</p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {templates.slice(0, 12).map((template) => (
                          <article key={template.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <p className="text-sm font-black text-white">{template.title}</p>
                                <p className="mt-1 text-xs text-slate-400">
                                  {template.questions.length} {copy.questionsWord} - {template.config.timePerQuestion}s - {template.config.botEnabled ? copy.botEnabled : copy.solo}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setSetupTemplate(template);
                                    setShowSetup(true);
                                  }}
                                  className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300"
                                >
                                  {copy.editAndUse}
                                </button>
                                <button
                                  onClick={() => setActiveTemplate(template)}
                                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-bold text-slate-100"
                                >
                                  {copy.open}
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
            {false && <div className="mt-4 space-y-3">
              {libraryTemplates.slice(0, 12).map((template) => (
                <article key={template.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white">{template.title}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {template.questions.length} {copy.questionsWord} • {template.config.timePerQuestion}s • {template.config.botEnabled ? copy.botEnabled : copy.solo}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSetupTemplate(template);
                          setShowSetup(true);
                        }}
                        className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300"
                      >
                        {copy.editAndUse}
                      </button>
                      <button
                        onClick={() => setActiveTemplate(template)}
                        className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-bold text-slate-100"
                      >
                        {copy.open}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>}
            </>
          )}
        </section>
      </div>

      {showSetup ? (
        (() => {
          console.log('[LIVE BATTLE MAP]', {
            role: 'teacher',
            liveClassId: activeLiveClass?.id ?? null,
            component: 'BattleSetupModal',
            handler: 'BattleHubPage.handleTemplateReady',
            source: 'LiveClassRoomPage -> BattleHubPage',
          });
          return (
            <BattleSetupModal
              onStart={handleTemplateReady}
              onSaveTemplate={handleSaveTemplate}
              onClose={handleCloseSetup}
              defaultCourseId={setupCourseId}
              defaultWorkbookId={setupWorkbookId}
              defaultLessonId={setupLessonId}
              liveClassId={activeLiveClass?.id}
              currentUserUid={uid}
              selectedStudents={liveParticipants}
              initialTemplate={setupTemplate}
              uiLanguage={uiLanguage}
            />
          );
        })()
      ) : null}

      {!showSetup && activeLiveClass?.id && liveSession ? (
        (() => {
          console.log('[LIVE BATTLE MAP]', {
            role: 'teacher',
            liveClassId: activeLiveClass.id,
            component: 'BattleHostView',
            handler: 'battleService.startBattle / battleService.submitBattleAnswer',
            source: 'BattleHubPage',
          });
          return (
            <BattleHostView
              session={liveSession}
              classId={activeLiveClass.id}
              teacherUid={uid}
              activeParticipants={liveParticipants}
              uiLanguage={supportedBattleUiLanguage}
              onClose={() => {
                void deleteBattleSession(activeLiveClass.id).finally(() => {
                  setLiveSession(null);
                  onDismiss?.();
                });
              }}
              onNewBattle={() => {
                void deleteBattleSession(activeLiveClass.id).then(() => {
                  setLiveSession(null);
                  setShowSetup(true);
                });
              }}
            />
          );
        })()
      ) : null}

      {activeTemplate ? (
        <BattlePracticeView
          template={activeTemplate}
          uid={uid}
          name={name}
          uiLanguage={supportedBattleUiLanguage}
          onClose={() => setActiveTemplate(null)}
        />
      ) : null}
    </div>
  );
};
