import { useState } from 'react';
import type { SharedPack, ExerciseItem, AppMode, LessonPack } from '../../types';
import { LESSON_PACKS } from '../../data/lessonPacks';
import { buildFullLessonItems } from '../../engine/lessonBuilder';
import { loadImportedPacks } from '../Import';
import {
  getAllPublicPacks,
  getMyPacks,
  saveMyPack,
  copyPublicPack,
  deleteMyPack,
  alreadyCopied,
} from '../../services/sharedPackStore';
import { getEffectiveItem } from '../../services/reviewStore';
import { useQuiz } from '../../engine/useQuiz';
import { buildRanking } from '../../engine/scoring';
import QuizRunner from '../../components/QuizRunner';
import Scoreboard from '../../components/Scoreboard';
import { PackEditorPanel, QuestionFormPanel } from '../../components/MyPackEditor';
import type { AnyQuestion } from '../../engine/scoring';
import { loadVariantLessons, deleteVariantLesson } from '../../services/variantStore';
import { exportLessonAsPdf } from '../../services/exportLessonPdf';
import type { MultiVariantLesson } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LANG_EMOJI: Record<string, string> = {
  en: '🇬🇧', pt: '🇧🇷', es: '🇪🇸', el: '🇬🇷', he: '🇮🇱',
};

function packQuestions(pack: SharedPack): AnyQuestion[] {
  return pack.items.map(
    (item) => getEffectiveItem(item.id, pack.id, item),
  ) as AnyQuestion[];
}

// ─── Pack card ────────────────────────────────────────────────────────────────

function PackCard({
  pack,
  isOwned,
  onCopy,
  onPlay,
  onEdit,
  onDelete,
}: {
  pack: SharedPack;
  isOwned?: boolean;
  onCopy?: () => void;
  onPlay: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="border border-gray-700 rounded-2xl bg-gray-900/60 overflow-hidden">
      <div className="p-4 space-y-2">
        {/* Header row */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-white leading-snug">{pack.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{pack.description}</p>
          </div>
          {pack.language && (
            <span className="text-lg shrink-0">{LANG_EMOJI[pack.language] ?? '🌐'}</span>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-indigo-400">{pack.items.length} questions</span>
          {/* Origin badge */}
          {isOwned && (
            pack.copiedFrom ? (
              <span className="text-xs bg-amber-900/30 border border-amber-700/40 text-amber-400 rounded px-1.5 py-0.5">📋 Copied</span>
            ) : (
              <span className="text-xs bg-gray-800 border border-gray-700 text-gray-500 rounded px-1.5 py-0.5">🛠️ Created</span>
            )
          )}
          {pack.tags?.map((t) => (
            <span key={t} className="text-xs bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-gray-400">
              {t}
            </span>
          ))}
          {pack.copyCount !== undefined && (
            <span className="text-xs text-gray-500 ml-auto">{pack.copyCount} copies</span>
          )}
        </div>

        {/* Author */}
        <p className="text-xs text-gray-500">
          by <span className="text-gray-400">{pack.author.name}</span>
          {pack.copiedFrom && (
            <span className="text-gray-600"> · copied from <span className="text-gray-500">{pack.copiedFrom.packTitle}</span></span>
          )}
        </p>
      </div>

      {/* Action row */}
      <div className="border-t border-gray-800 flex">
        <button
          onClick={onPlay}
          className="flex-1 py-2.5 text-sm font-semibold text-indigo-400 hover:bg-indigo-950/40 transition-colors"
        >
          ▶ Play
        </button>
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex-1 py-2.5 text-sm font-semibold text-sky-400 hover:bg-sky-950/40 transition-colors border-l border-gray-800"
          >
            ✏️ Edit
          </button>
        )}
        {onCopy && (
          <button
            onClick={onCopy}
            className="flex-1 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-950/40 transition-colors border-l border-gray-800"
          >
            📋 Copy
          </button>
        )}
        {isOwned && onDelete && (
          <button
            onClick={onDelete}
            className="px-4 py-2.5 text-sm text-red-500 hover:text-red-400 hover:bg-red-950/30 transition-colors border-l border-gray-800"
          >
            🗑
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Inline exercise runner ───────────────────────────────────────────────────

const SOLO = { id: 'p1', name: 'You', avatarEmoji: '🧑' };

function PackPlayer({
  pack,
  onBack,
}: {
  pack: SharedPack;
  onBack: () => void;
}) {
  const questions = packQuestions(pack);
  const { state, done, results, answer, next } = useQuiz(questions, SOLO.id);

  if (done) {
    return (
      <div className="p-4">
        <Scoreboard ranking={buildRanking([SOLO], results)} onRestart={onBack} />
      </div>
    );
  }

  if (!state) return null;

  return (
    <div>
      <button onClick={onBack} className="ml-4 mt-4 mb-1 text-sm text-gray-400 hover:text-white">
        ← Back to packs
      </button>
      <QuizRunner state={state} onAnswer={answer} onNext={next} packId={pack.id} />
    </div>
  );
}

// ─── My Packs tab ─────────────────────────────────────────────────────────────

type MyPacksScreen =
  | { view: 'list' }
  | { view: 'editor'; packId: string }
  | { view: 'add-question'; packId: string; editId?: string };

function MyPacksTab({
  onPlay,
  canEdit,
}: {
  onPlay: (p: SharedPack) => void;
  canEdit: boolean;
}) {
  const [screen, setScreen] = useState<MyPacksScreen>({ view: 'list' });
  const [packs, setPacks] = useState<SharedPack[]>(() => getMyPacks());

  function reloadPacks() { setPacks(getMyPacks()); }

  function renamePack(packId: string, title: string) {
    const pack = packs.find((p) => p.id === packId);
    if (!pack) return;
    saveMyPack({ ...pack, title, updatedAt: Date.now() });
    reloadPacks();
  }

  function deletePack(packId: string) {
    deleteMyPack(packId);
    reloadPacks();
    setScreen({ view: 'list' });
  }

  function saveItem(packId: string, item: ExerciseItem) {
    const pack = packs.find((p) => p.id === packId);
    if (!pack) return;
    const exists = pack.items.some((i) => i.id === item.id);
    saveMyPack({
      ...pack,
      items: exists ? pack.items.map((i) => (i.id === item.id ? item : i)) : [...pack.items, item],
      updatedAt: Date.now(),
    });
    reloadPacks();
  }

  function deleteItem(packId: string, itemId: string) {
    const pack = packs.find((p) => p.id === packId);
    if (!pack) return;
    saveMyPack({ ...pack, items: pack.items.filter((i) => i.id !== itemId), updatedAt: Date.now() });
    reloadPacks();
  }

  const currentPack = (id: string) => packs.find((p) => p.id === id);

  if (canEdit && screen.view === 'add-question') {
    const pack = currentPack(screen.packId);
    const editing = screen.editId ? pack?.items.find((i) => i.id === screen.editId) : undefined;
    return (
      <QuestionFormPanel
        initial={editing}
        onSave={(item) => {
          saveItem(screen.packId, item);
          setScreen({ view: 'editor', packId: screen.packId });
        }}
        onCancel={() => setScreen({ view: 'editor', packId: screen.packId })}
      />
    );
  }

  if (canEdit && screen.view === 'editor') {
    const pack = currentPack(screen.packId);
    if (!pack) { setScreen({ view: 'list' }); return null; }
    return (
      <PackEditorPanel
        pack={pack}
        onBack={() => setScreen({ view: 'list' })}
        onRename={(t) => renamePack(pack.id, t)}
        onAddQuestion={() => setScreen({ view: 'add-question', packId: pack.id })}
        onEditQuestion={(id) => setScreen({ view: 'add-question', packId: pack.id, editId: id })}
        onDeleteQuestion={(id) => deleteItem(pack.id, id)}
        onDelete={() => deletePack(pack.id)}
        onPlay={pack.items.length > 0 ? () => onPlay(pack) : undefined}
      />
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  if (packs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 space-y-2">
        <p className="text-4xl">📦</p>
        <p className="font-medium">No saved packs yet.</p>
        <p className="text-sm">
          {canEdit
            ? 'Copy a public pack or create one in Custom Battle.'
            : 'Copy a public pack to save it here.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {packs.map((p) => (
        <PackCard
          key={p.id}
          pack={p}
          isOwned
          onPlay={() => onPlay(p)}
          onEdit={canEdit ? () => setScreen({ view: 'editor', packId: p.id }) : undefined}
          onDelete={canEdit ? () => deletePack(p.id) : undefined}
        />
      ))}
    </div>
  );
}

// ─── Public Packs tab ─────────────────────────────────────────────────────────

function PublicPacksTab({ onPlay }: { onPlay: (p: SharedPack) => void }) {
  const [, refresh] = useState(0);
  const packs = getAllPublicPacks();

  return (
    <div className="space-y-3">
      {packs.map((p) => {
        const copied = alreadyCopied(p.id);
        return (
          <PackCard
            key={p.id}
            pack={p}
            onPlay={() => onPlay(p)}
            onCopy={
              copied
                ? undefined
                : () => { copyPublicPack(p); refresh((n) => n + 1); }
            }
          />
        );
      })}
    </div>
  );
}

// ─── Lesson pack helpers ──────────────────────────────────────────────────────

/** Adapts a LessonPack to SharedPack shape so PackPlayer can play the full expanded set. */
function lessonAsSharedPack(lp: LessonPack): SharedPack {
  return {
    ...lp,
    items: buildFullLessonItems(lp),
    author: { id: 'system', name: 'Learnendo', role: 'admin' as const },
    visibility: 'public' as const,
    createdAt: 0,
    updatedAt: 0,
  };
}

// ─── Lesson pack card (compact list item) ────────────────────────────────────

function LessonPackCard({ pack, onView }: { pack: LessonPack; onView: () => void }) {
  return (
    <div className="border border-indigo-800/40 rounded-2xl bg-indigo-950/20 overflow-hidden">
      <div className="p-4 space-y-2">
        <div className="flex items-start gap-2">
          <span className="text-xl mt-0.5">📚</span>
          <div className="flex-1">
            <p className="font-semibold text-sm text-white leading-snug">{pack.title}</p>
            {pack.lessonNumber && (
              <p className="text-xs text-indigo-400">Lesson {pack.lessonNumber}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">{pack.description}</p>
          </div>
        </div>
        {pack.themes && pack.themes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pack.themes.map((t) => (
              <span
                key={t}
                className="text-xs bg-indigo-900/30 border border-indigo-800/40 text-indigo-400 rounded px-1.5 py-0.5"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {pack.vocabulary && <span>📖 {pack.vocabulary.length} vocab</span>}
          {pack.structures && <span>🔧 {pack.structures.length} patterns</span>}
          <span>✏️ {buildFullLessonItems(pack).length} exercises</span>
        </div>
      </div>
      <div className="border-t border-indigo-800/20 flex">
        <button
          onClick={onView}
          className="flex-1 py-2.5 text-sm font-semibold text-indigo-400 hover:bg-indigo-950/40 transition-colors"
        >
          📖 Study →
        </button>
      </div>
    </div>
  );
}

// ─── Lesson pack detail view ──────────────────────────────────────────────────

function LessonPackView({
  pack,
  onBack,
  onPlay,
  onBattle,
}: {
  pack: LessonPack;
  onBack: () => void;
  onPlay: () => void;
  onBattle?: () => void;
}) {
  const [showVocab, setShowVocab] = useState(true);
  const [showStructures, setShowStructures] = useState(false);
  const fullItemCount = buildFullLessonItems(pack).length;

  return (
    <div className="flex flex-col max-w-md mx-auto px-4 py-4 gap-4">
      <button onClick={onBack} className="text-sm text-gray-400 hover:text-white w-fit">
        ← Back
      </button>

      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="text-3xl mt-1">📚</span>
        <div>
          <h1 className="font-bold text-lg leading-snug text-white">{pack.title}</h1>
          {pack.lessonNumber && (
            <p className="text-xs text-indigo-400">
              Lesson {pack.lessonNumber} · {pack.language.toUpperCase()}
            </p>
          )}
          <p className="text-sm text-gray-400 mt-1">{pack.description}</p>
        </div>
      </div>

      {/* Themes */}
      {pack.themes && pack.themes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pack.themes.map((t) => (
            <span
              key={t}
              className="text-xs bg-indigo-900/40 border border-indigo-700/40 text-indigo-300 rounded-full px-2.5 py-1"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {pack.vocabulary && (
          <div className="bg-gray-800/60 rounded-xl px-2 py-3 text-center">
            <p className="text-xl font-bold text-indigo-400">{pack.vocabulary.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">vocab</p>
          </div>
        )}
        {pack.structures && (
          <div className="bg-gray-800/60 rounded-xl px-2 py-3 text-center">
            <p className="text-xl font-bold text-indigo-400">{pack.structures.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">patterns</p>
          </div>
        )}
        <div className="bg-gray-800/60 rounded-xl px-2 py-3 text-center">
          <p className="text-xl font-bold text-indigo-400">{fullItemCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">exercises</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onPlay}
          className="flex-1 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] font-bold text-base transition-all text-white"
        >
          ✏️ Practice
        </button>
        {onBattle && (
          <button
            onClick={onBattle}
            className="flex-1 py-4 rounded-2xl bg-gray-800 border border-gray-700 hover:bg-gray-700 active:scale-[0.98] font-bold text-base transition-all text-white"
          >
            ⚔️ Battle
          </button>
        )}
      </div>

      {/* Vocabulary */}
      {pack.vocabulary && (
        <div>
          <button
            onClick={() => setShowVocab((v) => !v)}
            className="w-full flex items-center justify-between py-2 text-sm font-semibold text-gray-300 hover:text-white"
          >
            <span>📖 Vocabulary ({pack.vocabulary.length})</span>
            <span>{showVocab ? '▲' : '▼'}</span>
          </button>
          {showVocab && (
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {pack.vocabulary.map((v) => (
                <div key={v.word} className="bg-gray-800 rounded-xl px-3 py-2.5">
                  <p className="text-sm font-medium text-white">{v.word}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{v.translation}</p>
                  {v.type && <p className="text-xs text-indigo-500 mt-0.5">{v.type}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Structures */}
      {pack.structures && (
        <div>
          <button
            onClick={() => setShowStructures((v) => !v)}
            className="w-full flex items-center justify-between py-2 text-sm font-semibold text-gray-300 hover:text-white"
          >
            <span>🔧 Patterns ({pack.structures.length})</span>
            <span>{showStructures ? '▲' : '▼'}</span>
          </button>
          {showStructures && (
            <div className="flex flex-col gap-3 mt-1">
              {pack.structures.map((s, i) => (
                <div key={i} className="bg-gray-800 rounded-xl p-3 space-y-1.5">
                  <p className="text-xs font-mono text-indigo-400 bg-indigo-950/40 rounded px-2 py-1 inline-block">
                    {s.pattern}
                  </p>
                  <p className="text-sm text-white">
                    e.g. <span className="italic">"{s.example}"</span>
                  </p>
                  {s.variants && s.variants.length > 0 && (
                    <div className="space-y-0.5 pl-1">
                      {s.variants.map((v, j) => (
                        <p key={j} className="text-xs text-gray-400">
                          → {v}
                        </p>
                      ))}
                    </div>
                  )}
                  {s.notes && (
                    <p className="text-xs text-amber-400/80 italic border-t border-gray-700 pt-1.5">
                      💡 {s.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Lessons tab ──────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft:          { label: 'Draft',          cls: 'bg-gray-700 text-gray-300 border-gray-600' },
  auto_generated: { label: 'Auto-generated', cls: 'bg-amber-900/50 text-amber-300 border-amber-700/60' },
  reviewed:       { label: 'Reviewed',       cls: 'bg-blue-900/50 text-blue-300 border-blue-700/60' },
  corrected:      { label: 'Corrected',      cls: 'bg-green-900/50 text-green-300 border-green-700/60' },
};

function VariantStatusBadge({ status }: { status: string }) {
  const b = STATUS_BADGE[status] ?? STATUS_BADGE.draft;
  return (
    <span className={`inline-block text-[10px] font-semibold border rounded px-1.5 py-0.5 ${b.cls}`}>
      {b.label}
    </span>
  );
}

const LANG_FLAG: Record<string, string> = {
  en: '🇬🇧', pt: '🇧🇷', es: '🇪🇸', el: '🇬🇷', he: '🇮🇱',
};

function VariantsSection({ onRefresh }: { onRefresh: () => void }) {
  const lessons = loadVariantLessons();
  if (lessons.length === 0) return null;

  function handleDelete(lessonId: string) {
    deleteVariantLesson(lessonId);
    onRefresh();
  }

  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-gray-800" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Imported Variants</span>
        <div className="flex-1 h-px bg-gray-800" />
      </div>
      {lessons.map((mvl: MultiVariantLesson) => (
        <div key={mvl.id} className="border border-amber-800/30 rounded-2xl bg-amber-950/10 overflow-hidden">
          <div className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-white truncate">
                  {mvl.variants[0]?.pack.title ?? 'Imported Lesson'}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Source: {LANG_FLAG[mvl.sourceLanguage] ?? ''} {mvl.sourceLanguage.toUpperCase()}
                  &nbsp;·&nbsp; {mvl.variants.length} variants
                </p>
              </div>
              <button
                onClick={() => handleDelete(mvl.id)}
                title="Delete all variants"
                className="px-2 py-1 rounded-lg text-xs text-red-500 hover:bg-red-950/30 transition-colors shrink-0"
              >
                🗑
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              {mvl.variants.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-2 bg-gray-800/60 rounded-xl px-3 py-2"
                >
                  <span className="text-base shrink-0">{LANG_FLAG[v.language] ?? '🌐'}</span>
                  <span className="text-xs font-medium text-gray-300 w-6 shrink-0">
                    {v.language.toUpperCase()}
                  </span>
                  <VariantStatusBadge status={v.status} />
                  <span className="text-[10px] text-gray-600 flex-1">
                    {v.pack.vocabulary?.length ?? 0} vocab
                    {v.pack.items.length > 0 ? ` · ${v.pack.items.length} exercises` : ''}
                  </span>
                  <button
                    onClick={() => exportLessonAsPdf(v.pack)}
                    title="Export as PDF (opens print dialog)"
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors shrink-0 flex items-center gap-1"
                  >
                    📄 Export
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LessonsTab({
  onView,
  onImport,
  mode,
}: {
  onView: (p: LessonPack) => void;
  onImport?: () => void;
  mode?: AppMode;
}) {
  const [tick, setTick] = useState(0);
  const imported = loadImportedPacks();
  const allLessons = [...LESSON_PACKS, ...imported];

  return (
    <div className="space-y-3">
      {/* Import PDF entry point */}
      {onImport && (
        <button
          onClick={onImport}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-indigo-700/60 bg-indigo-950/20 text-indigo-400 hover:border-indigo-500 hover:bg-indigo-950/40 hover:text-indigo-300 transition-all text-sm font-semibold"
        >
          <span className="text-lg">📄</span>
          Import PDF Lesson
        </button>
      )}

      {allLessons.length === 0 && (
        <div className="text-center py-8 text-gray-500 space-y-2">
          <p className="text-4xl">📚</p>
          <p className="font-medium">No lessons available yet.</p>
          <p className="text-sm">
            {mode === 'lab'
              ? 'Import a PDF lesson to get started.'
              : 'Your teacher will add lessons here soon.'}
          </p>
        </div>
      )}

      {allLessons.map((lp) => (
        <LessonPackCard key={lp.id} pack={lp} onView={() => onView(lp)} />
      ))}

      {/* Variants section — auto-refreshes when tick changes */}
      <VariantsSection key={tick} onRefresh={() => setTick((n) => n + 1)} />
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

type PackTab = 'lessons' | 'my' | 'public';

export default function Packs({ mode = 'public', onImport, onNavigateBattle }: { mode?: AppMode; onImport?: () => void; onNavigateBattle?: (packId: string) => void }) {
  const [tab, setTab] = useState<PackTab>('lessons');
  const [playing, setPlaying] = useState<SharedPack | null>(null);
  const [viewingLesson, setViewingLesson] = useState<LessonPack | null>(null);

  if (playing) {
    return (
      <div className="max-w-md mx-auto min-h-full">
        <PackPlayer
          key={playing.id}
          pack={playing}
          onBack={() => setPlaying(null)}
        />
      </div>
    );
  }

  if (viewingLesson) {
    return (
      <div className="max-w-md mx-auto min-h-full">
        <LessonPackView
          pack={viewingLesson}
          onBack={() => setViewingLesson(null)}
          onPlay={() => {
            setPlaying(lessonAsSharedPack(viewingLesson));
            setViewingLesson(null);
          }}
          onBattle={
            onNavigateBattle
              ? () => {
                  setViewingLesson(null);
                  onNavigateBattle(viewingLesson.id);
                }
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-full pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-4 pt-4 pb-3 space-y-3">
        <h1 className="text-lg font-bold text-white">📦 Packs</h1>

        {/* Tabs */}
        <div className="flex gap-2">
          {(
            [
              ['lessons', '📚 Lessons'],
              ['public', '🌍 Public'],
              ['my', '📦 My'],
            ] as [PackTab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={[
                'flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors border',
                tab === id
                  ? 'bg-indigo-700 border-indigo-500 text-white'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-1">
        {tab === 'lessons' ? (
          <LessonsTab onView={setViewingLesson} onImport={onImport} mode={mode} />
        ) : tab === 'public' ? (
          <PublicPacksTab onPlay={setPlaying} />
        ) : (
          <MyPacksTab onPlay={setPlaying} canEdit={mode === 'lab'} />
        )}
      </div>
    </div>
  );
}
