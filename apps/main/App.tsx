// App.tsx (COMPLETO) — 1 lição por dia (vira à meia-noite), bypass só com "Martins" NO LOGIN ANÔNIMO,
// e com “anti-translate” (força EN / tenta bloquear tradução automática no Android).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SectionType, PracticeItem, PracticeModuleType, UserProgress, AnswerLog, QState } from './types';
import { PRACTICE_ITEMS, LESSON_CONFIGS } from './constants';
import { PracticeSection, Header, LearningPathView } from './components/UI';
import { saveAssessmentResult } from './services/db';
import { ensureAnonAuth, auth } from './services/firebase';

console.log('Firebase Auth Object:', auth);

const STORAGE_KEY = 'learnendo_v16_mastery';
const BYPASS_KEY = 'Martins';

type ActivePracticeItem = PracticeItem & { __baseId: string };

// result data captured when an island is finished
interface LastResult {
  lessonId: string;
  islandIndex: number;
  totalStars: number;
  diamondPercent: number | null;
  streakCount: number;
  iceCount: number;
  completedAt: string; // ISO date string
}

// ====== DEFAULT_PROGRESS and sanitizeProgress ======
const DEFAULT_PROGRESS: UserProgress = {
  currentLesson: 1,
  // lessonData keyed by lesson id. Each lesson entry ensures the expected shape.
  lessonData: {},
  totalStars: 100,
  streakCount: 0,
  iceCount: 0,
  virtualDayOffset: 0,
  // keep optional fields present but neutral
  bypassActive: false,
  sentToTeacher: false,
};

/**
 * sanitizeProgress(raw)
 * - Returns a fully shaped UserProgress object.
 * - If `raw` is null/undefined returns `DEFAULT_PROGRESS`.
 * - Ensures `lessonData` exists and that each lesson entry contains
 *   `diamond`, `islandScores` (object), `islandCompletionDates` (object) and `islandDiamonds` (object).
 */
const sanitizeProgress = (raw: any): UserProgress => {
  if (!raw) return DEFAULT_PROGRESS;

  const safe: any = { ...DEFAULT_PROGRESS, ...raw };

  // Ensure numeric top-level fields
  if (typeof safe.currentLesson !== 'number' || !Number.isFinite(safe.currentLesson) || safe.currentLesson < 1) safe.currentLesson = DEFAULT_PROGRESS.currentLesson;
  if (typeof safe.totalStars !== 'number' || !Number.isFinite(safe.totalStars) || safe.totalStars < 0) safe.totalStars = DEFAULT_PROGRESS.totalStars;
  if (typeof safe.streakCount !== 'number' || !Number.isFinite(safe.streakCount) || safe.streakCount < 0) safe.streakCount = DEFAULT_PROGRESS.streakCount;
  if (typeof safe.iceCount !== 'number' || !Number.isFinite(safe.iceCount) || safe.iceCount < 0) safe.iceCount = DEFAULT_PROGRESS.iceCount;
  if (typeof safe.virtualDayOffset !== 'number' || !Number.isFinite(safe.virtualDayOffset)) safe.virtualDayOffset = DEFAULT_PROGRESS.virtualDayOffset;

  // Force-disable persisted bypass (security)
  safe.bypassActive = false;

  // Normalize lessonData to an object
  if (!safe.lessonData || typeof safe.lessonData !== 'object' || Array.isArray(safe.lessonData)) {
    safe.lessonData = {};
  }

  // For each lesson entry, ensure expected sub-objects exist
  Object.keys(safe.lessonData).forEach((lid) => {
    const entry = safe.lessonData[lid] || {};
    const normalized: any = {};

    normalized.diamond = typeof entry.diamond === 'number' && Number.isFinite(entry.diamond) ? entry.diamond : 0;

    // islandScores stored as object mapping trackId -> number
    normalized.islandScores = entry.islandScores && typeof entry.islandScores === 'object' && !Array.isArray(entry.islandScores) ? entry.islandScores : {};

    // islandCompletionDates stored as object mapping trackId -> ISO date string
    normalized.islandCompletionDates = entry.islandCompletionDates && typeof entry.islandCompletionDates === 'object' && !Array.isArray(entry.islandCompletionDates) ? entry.islandCompletionDates : {};

    // islandDiamonds stored as object mapping trackId -> boolean
    normalized.islandDiamonds = entry.islandDiamonds && typeof entry.islandDiamonds === 'object' && !Array.isArray(entry.islandDiamonds) ? entry.islandDiamonds : {};

    safe.lessonData[lid] = normalized;
  });

  return safe as UserProgress;
};

// ====== “Anti-translate” utilities ======
const applyAntiTranslate = () => {
  try {
    // Helps browsers interpret content as English (reduces auto-translate behavior)
    document.documentElement.lang = 'en';

    // Ask Google Translate / Chrome to not translate this page
    const existing = document.querySelector('meta[name="google"]') as HTMLMetaElement | null;
    if (!existing) {
      const meta = document.createElement('meta');
      meta.name = 'google';
      meta.content = 'notranslate';
      document.head.appendChild(meta);
    } else {
      existing.content = 'notranslate';
    }
  } catch {
    // ignore
  }
};

const App: React.FC = () => {
  const [section, setSection] = useState<SectionType>(SectionType.INFO);
  const [student, setStudent] = useState({ name: '' });
  const [authStatus, setAuthStatus] = useState<{ status: 'loading' | 'ok' | 'error'; uid?: string; message?: string }>(
    { status: 'loading' }
  );

  const [progress, setProgress] = useState<UserProgress>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    return sanitizeProgress(parsed);
  });

  const [lastResult, setLastResult] = useState<LastResult | null>(null);

  // ====== Island Run State ======
  const [baseItems, setBaseItems] = useState<ActivePracticeItem[]>([]);
  const [currentBaseIndex, setCurrentBaseIndex] = useState(0);
  const [qState, setQState] = useState<Record<number, QState>>({});
  const [attemptedWrong, setAttemptedWrong] = useState<Record<number, boolean>>({});
  const [logs, setLogs] = useState<AnswerLog[]>([]);
  const [activeModule, setActiveModule] = useState<PracticeModuleType | undefined>();

  // Use ref to avoid async-state timing issues
  const hadAnyMistakeRef = useRef(false);

  // ✅ BYPASS: só quando o aluno digita exatamente "Martins" no login anônimo (não persiste no storage)
  const isAdmin = student.name === BYPASS_KEY;

  // ====== Auth init ======
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const res = await ensureAnonAuth();
        if (mounted) setAuthStatus({ status: 'ok', uid: res.uid });
      } catch (err: any) {
        if (mounted) setAuthStatus({ status: 'error', message: err?.message || 'Auth failure' });
      }
    };

    initAuth();
    return () => {
      mounted = false;
    };
  }, []);

  // ====== Anti-translate ======
  useEffect(() => {
    applyAntiTranslate();
  }, []);

  // ====== Date helper ======
  const getTodayKey = (offset: number = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + (progress.virtualDayOffset || 0) + offset);
    return d.toISOString().split('T')[0];
  };

  // ====== Persist progress (ALWAYS strip bypassActive) ======
  useEffect(() => {
    const safe = { ...progress } as any;
    safe.bypassActive = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  }, [progress]);

  // redirect if result view is active but we have no lastResult
  useEffect(() => {
    if (section === SectionType.RESULT && !lastResult) {
      setSection(SectionType.PATH);
    }
  }, [section, lastResult]);

  // ====== Derived UI stats ======
  const moduleTotal = useMemo(() => baseItems.length, [baseItems.length]);

  const correctCount = useMemo(() => {
    let c = 0;
    for (let i = 0; i < baseItems.length; i++) if (qState[i] === 'correct') c++;
    return c;
  }, [qState, baseItems.length]);

  const progressPercent = useMemo(() => {
    if (!moduleTotal) return 0;
    return Math.round((correctCount / moduleTotal) * 100);
  }, [correctCount, moduleTotal]);

  // ====== Start lesson ======
  // (Mantém o anônimo — se digitar "Martins", vira admin; qualquer outro nome não libera tudo.)
  const startLesson = (name: string) => {
    setStudent({ name: name?.trim() || '' });
    setSection(SectionType.PATH);
  };

  // ====== Start module/island ======
  const startModule = (type: PracticeModuleType) => {
    const items: ActivePracticeItem[] = PRACTICE_ITEMS.filter(i => i.moduleType === type).map((item, idx) => ({
      ...item,
      id: `${type}__${idx}`,
      __baseId: `${type}__${idx}`
    }));

    const init: Record<number, QState> = {};
    for (let i = 0; i < items.length; i++) init[i] = 'pending';

    hadAnyMistakeRef.current = false;

    setBaseItems(items);
    setActiveModule(type);
    setQState(init);
    setAttemptedWrong({});
    setLogs([]);
    setCurrentBaseIndex(0);
    setSection(SectionType.PRACTICE);
  };

  // ====== Core routing: next unfinished ======
  const findNextUnfinished = (state: Record<number, QState>, total: number, from: number) => {
    for (let i = from + 1; i < total; i++) if (state[i] !== 'correct') return i;
    for (let i = 0; i <= from; i++) if (state[i] !== 'correct') return i;
    return null;
  };

  const finalizeIsland = () => {
    console.log("FINALIZE ISLAND CALLED");
    const currentTrack = activeModule!;
    const lessonId = progress.currentLesson;
    const today = getTodayKey();

    // compute islandIndex as existing number of islands completed so far
    const existingScores = progress.lessonData[lessonId]?.islandScores || {};
    const islandIndex = Object.keys(existingScores).length;

    const perfectDiamond = !hadAnyMistakeRef.current;

    // calculate diamond percent inside setter for accurate value
    setProgress(prev => {
      const lessonData = { ...prev.lessonData };

      if (!lessonData[lessonId]) {
        lessonData[lessonId] = { diamond: 0, islandScores: {}, islandCompletionDates: {}, islandDiamonds: {} };
      }

      const currentData = lessonData[lessonId];
      const totalThisIsland = baseItems.length;

      const newScores = { ...currentData.islandScores, [currentTrack]: totalThisIsland };
      const newCompletionDates = { ...(currentData.islandCompletionDates || {}), [currentTrack]: today };
      const newDiamonds = { ...(currentData.islandDiamonds || {}), [currentTrack]: perfectDiamond };

      const lessonConfig = LESSON_CONFIGS.find(l => l.id === lessonId);
      const totalLessonItems =
        lessonConfig && Array.isArray(lessonConfig.modules)
          ? lessonConfig.modules.reduce(
              (acc: number, m) => acc + PRACTICE_ITEMS.filter(i => i.moduleType === m).length,
              0
            )
          : 0;

      const sum = (Object.values(newScores) as number[]).reduce((a, b) => a + (Number(b) || 0), 0);
      const newDiamondPct = totalLessonItems > 0 ? Math.min(100, Math.round((sum / totalLessonItems) * 100)) : 0;

      lessonData[lessonId] = {
        ...currentData,
        islandScores: newScores,
        islandCompletionDates: newCompletionDates,
        islandDiamonds: newDiamonds,
        diamond: newDiamondPct
      };

      // we can set lastResult here too or after setProgress call; we'll set after returning new progress
      return { ...prev, lessonData };
    });

    // capture last result using the current progress values (before new update)
    setLastResult({
      lessonId: String(lessonId),
      islandIndex,
      totalStars: progress.totalStars ?? 0,
      diamondPercent: null, // will compute below if needed
      streakCount: progress.streakCount || 0,
      iceCount: progress.iceCount || 0,
      completedAt: today
    });

    // compute diamond percentage again based on updated data if possible
    const lessonConfig2 = LESSON_CONFIGS.find(l => l.id === lessonId);
    if (lessonConfig2) {
      const scoreSum = Object.values(existingScores).reduce((a, b) => a + (Number(b) || 0), 0) + baseItems.length;
      const totalLessonItems2 =
        lessonConfig2 && Array.isArray(lessonConfig2.modules)
          ? lessonConfig2.modules.reduce(
              (acc: number, m) => acc + PRACTICE_ITEMS.filter(i => i.moduleType === m).length,
              0
            )
          : 0;
      const pct = totalLessonItems2 > 0 ? Math.min(100, Math.round((scoreSum / totalLessonItems2) * 100)) : 0;
      setLastResult(r => r ? { ...r, diamondPercent: pct } : r);
    }

    console.log("SETTING SECTION TO RESULT");
    setSection(SectionType.RESULT);
  };

  const handleResult = (isCorrect: boolean, val: string) => {
    const item = baseItems[currentBaseIndex];
    if (!item) return;

    setLogs(prev => [
      ...prev,
      {
        question: item.instruction,
        userAnswer: val,
        correctAnswer: item.correctValue,
        isCorrect,
        isFirstTry: qState[currentBaseIndex] === 'pending'
      } as any
    ]);

    setQState(prev => {
      const next = { ...prev };

      if (isCorrect) {
        next[currentBaseIndex] = 'correct';
      } else {
        if (next[currentBaseIndex] !== 'wrong') next[currentBaseIndex] = 'wrong';

        hadAnyMistakeRef.current = true;

        // desconta estrela 1x por questão (mantém seu comportamento atual)
        setAttemptedWrong(wPrev => {
          if (wPrev[currentBaseIndex]) return wPrev;
          setProgress(p => ({ ...p, totalStars: Math.max(0, (p.totalStars ?? 100) - 1) }));
          return { ...wPrev, [currentBaseIndex]: true };
        });
      }

      const total = baseItems.length;

      let done = true;
      for (let i = 0; i < total; i++) {
        if (next[i] !== 'correct') {
          done = false;
          break;
        }
      }
      if (done) {
        finalizeIsland();
        return next;
      }

      const nextIdx = findNextUnfinished(next, total, currentBaseIndex);
      if (nextIdx !== null) setCurrentBaseIndex(nextIdx);

      return next;
    });
  };

  // ====== LOCK RULES ======
  // 1) Ilhas: sequência simples (pode fazer todas no mesmo dia)
  const isModuleLocked = (moduleType: PracticeModuleType) => {
    if (isAdmin) return false;

    const lessonId = progress.currentLesson;
    const config = LESSON_CONFIGS.find(l => l.id === lessonId);
    if (!config) return true;

    const idx = config.modules.indexOf(moduleType);
    if (idx === 0) return false;

    const prevModule = config.modules[idx - 1];

    const prevCompletionDay = progress.lessonData[lessonId]?.islandCompletionDates?.[prevModule];
    return !prevCompletionDay;
  };

  // 2) Lições: 1 por dia — só libera próxima depois da meia-noite
  const isLessonLocked = (id: number) => {
    if (isAdmin) return false;
    if (id === 1) return false;

    const prevLessonId = id - 1;
    const prevConfig = LESSON_CONFIGS.find(l => l.id === prevLessonId);
    const lastModule = prevConfig?.modules?.slice(-1)[0];

    const prevCompletedDay = lastModule ? progress.lessonData?.[prevLessonId]?.islandCompletionDates?.[lastModule] : undefined;

    if (!prevCompletedDay) return true;
    if (prevCompletedDay === getTodayKey()) return true;

    return false;
  };

  const getIslandProgressForUI = () => {
    const lessonId = progress.currentLesson;
    const config = LESSON_CONFIGS.find(l => l.id === lessonId);
    if (!config) return [];
    const scores = progress.lessonData[lessonId]?.islandScores || {};
    return config.modules.map(m => (scores as any)[m] || 0);
  };

  return (
    <div className="min-h-screen bg-blue-50 pb-8 flex flex-col items-center notranslate" translate="no">
      <div className="w-full max-w-sm px-4 pt-6 notranslate" translate="no">
        {section !== SectionType.INFO && section !== SectionType.PRACTICE && (
          <Header
            lessonId={progress.currentLesson}
            progress={progress}
          />
        )}

        {/* INFO placeholder (temporário) */}
        {section === SectionType.INFO && (
          <div className="p-6 text-center">
            <button
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black"
              onClick={() => startLesson('')}
            >
              START NOW
            </button>
          </div>
        )}

        {section === SectionType.PATH && (
          <LearningPathView
            progress={progress}
            onSelectModule={startModule}
            moduleNames={{}}
            isModuleLocked={isModuleLocked}
            isLessonLocked={isLessonLocked}
            islandWeights={[10, 10, 10, 10, 10]}
          />
        )}

        {section === SectionType.PRACTICE && baseItems[currentBaseIndex] && (
          <PracticeSection
            item={baseItems[currentBaseIndex]}
            onResult={handleResult}
            currentIdx={currentBaseIndex}
            totalItems={baseItems.length}
            lessonId={progress.currentLesson}
          />
        )}

        {/* RESULTS screen */}
        {section === SectionType.RESULT && (
          <div className="p-6 text-center space-y-4">
            <h2 className="text-2xl font-black text-slate-800 uppercase">Island Complete!</h2>
            <p className="text-lg">Stars: {lastResult?.totalStars ?? progress.totalStars}</p>
            <p className="text-lg">Diamond: {lastResult?.diamondPercent != null ? `${lastResult.diamondPercent}%` : 'N/A'}</p>
            <p className="text-lg">Streak: {lastResult?.streakCount ?? progress.streakCount}</p>
            <p className="text-lg">Ice: {lastResult?.iceCount ?? progress.iceCount}</p>
            <div className="flex flex-col gap-3 mt-4">
              <button onClick={() => setSection(SectionType.PATH)} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase shadow-[0_6px_0_0_#1e40af] active:translate-y-1">Back to Path</button>
              {/* Optional retry: simply re-enter practice using existing activeModule and baseItems */}
              {activeModule && (
                <button onClick={() => setSection(SectionType.PRACTICE)} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase">Retry Island</button>
              )}
            </div>
          </div>
        )}
      </div>

      
    </div>
  );
};

export default App;