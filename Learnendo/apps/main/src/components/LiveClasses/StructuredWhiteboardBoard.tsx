import React from 'react';
import { LiveWhiteboardBlock, LiveWhiteboardState } from '../../types';

interface StructuredWhiteboardBoardProps {
  whiteboard: LiveWhiteboardState;
  blocks: LiveWhiteboardBlock[];
  canManageBoard: boolean;
  canEditBoard: boolean;
  isStudentView: boolean;
  loading: boolean;
  onBlockResponseChange: (blockId: string, value: string) => void;
  onClearBlockResponse: (blockId: string) => void;
}

export const StructuredWhiteboardBoard: React.FC<StructuredWhiteboardBoardProps> = ({
  whiteboard,
  blocks,
  canManageBoard,
  canEditBoard,
  isStudentView,
  loading,
  onBlockResponseChange,
  onClearBlockResponse,
}) => (
  <div className="mt-3 space-y-3">
    <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3">
      <p className="text-xs font-black uppercase tracking-wide text-cyan-300">
        {whiteboard.mode === 'lesson-exercise' ? 'Lesson Exercise Board' : 'Manual Questions'}
      </p>
      <h3 className="mt-1 text-lg font-black text-white">
        {whiteboard.title || 'Live Activity'}
      </h3>
      {whiteboard.instruction ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
          {whiteboard.instruction}
        </p>
      ) : null}
    </div>

    {blocks.length > 0 ? blocks.map((block, index) => (
      <div key={block.id} className="rounded-2xl border border-slate-700 bg-slate-950/80 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Item {index + 1}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-white">
              {block.prompt}
            </p>
          </div>
          {canManageBoard ? (
            <button
              type="button"
              onClick={() => onClearBlockResponse(block.id)}
              className="rounded-xl border border-slate-600 px-3 py-2 text-xs font-bold text-slate-200"
            >
              Clear Response
            </button>
          ) : null}
        </div>

        <textarea
          value={block.response}
          onChange={(event) => onBlockResponseChange(block.id, event.target.value)}
          className={`mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-base leading-relaxed text-white placeholder:text-slate-500 ${isStudentView ? 'min-h-[160px]' : 'min-h-[140px]'}`}
          placeholder={canEditBoard
            ? 'Write the shared answer here...'
            : 'Waiting for the teacher to enable editing...'}
          disabled={loading}
          readOnly={!canEditBoard}
        />
      </div>
    )) : (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 px-4 py-6 text-sm text-slate-400">
        This activity does not have question blocks yet.
      </div>
    )}
  </div>
);
