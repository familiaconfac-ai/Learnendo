import React, { useEffect, useMemo, useState } from 'react';
import { BattlePracticeView } from '../LiveClasses/Battle/BattlePracticeView';
import { BattleSetupModal } from '../LiveClasses/Battle/BattleSetupModal';
import type { SavedBattleTemplate, BattleConfig, BattleQuestion } from '../LiveClasses/Battle/battleTypes';
import { buildSavedBattleTemplate } from '../LiveClasses/Battle/battleUtils';

type UILang = 'en' | 'pt' | 'es';

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
}) => {
  const copy = COPY[uiLanguage] ?? COPY.en;
  const storageKey = useMemo(() => buildStorageKey(uid, courseId), [courseId, uid]);
  const [showSetup, setShowSetup] = useState(false);
  const [lastTemplate, setLastTemplate] = useState<SavedBattleTemplate | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<SavedBattleTemplate | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setLastTemplate(raw ? JSON.parse(raw) as SavedBattleTemplate : null);
    } catch {
      setLastTemplate(null);
    }
  }, [storageKey]);

  function handleTemplateReady(config: BattleConfig, questions: BattleQuestion[]) {
    const template = buildSavedBattleTemplate(
      config,
      questions,
      `${copy.title} • ${new Date().toLocaleDateString(uiLanguage === 'pt' ? 'pt-BR' : uiLanguage === 'es' ? 'es-ES' : 'en-US')}`,
    );
    setShowSetup(false);
    setLastTemplate(template);
    setActiveTemplate(template);
    try {
      localStorage.setItem(storageKey, JSON.stringify(template));
    } catch {
      // Ignore storage quota issues and keep the in-memory template.
    }
  }

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
                  onClick={() => setShowSetup(true)}
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
            <h2 className="text-sm font-black uppercase tracking-wide text-orange-300">Current setup</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Course</div>
                <div className="mt-2 text-sm font-semibold text-white">{courseId ?? 'english'}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Workbook</div>
                <div className="mt-2 text-sm font-semibold text-white">{workbookId ?? 1}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Lesson</div>
                <div className="mt-2 text-sm font-semibold text-white">{lessonId ?? 'current lesson'}</div>
              </div>
            </div>
            {lastTemplate ? (
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-white">{lastTemplate.title}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {lastTemplate.questions.length} perguntas • {lastTemplate.config.timePerQuestion}s • {lastTemplate.config.botEnabled ? 'bot' : 'solo'}
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
      </div>

      {showSetup ? (
        <BattleSetupModal
          onStart={handleTemplateReady}
          onClose={() => setShowSetup(false)}
          defaultCourseId={courseId ?? undefined}
          defaultWorkbookId={workbookId ?? undefined}
          defaultLessonId={lessonId ?? undefined}
        />
      ) : null}

      {activeTemplate ? (
        <BattlePracticeView
          template={activeTemplate}
          uid={uid}
          name={name}
          onClose={() => setActiveTemplate(null)}
        />
      ) : null}
    </div>
  );
};
