import React from 'react';

interface LiveClassRoomShellProps {
  title: string;
  exitLabel: string;
  onExit: () => void;
  mainContent: React.ReactNode;
  desktopSidebar: React.ReactNode;
  mobileFloatingCameras?: React.ReactNode;
  bottomBar: React.ReactNode;
  overlay?: React.ReactNode;
}

export const LiveClassRoomShell: React.FC<LiveClassRoomShellProps> = ({
  title,
  exitLabel,
  onExit,
  mainContent,
  desktopSidebar,
  mobileFloatingCameras,
  bottomBar,
  overlay,
}) => (
  <div className="fixed inset-0 overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900 text-white">
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-2 pb-20 pt-4 sm:px-3 sm:pb-24 sm:pt-5">
      <div className="mb-3 flex flex-shrink-0 items-center justify-between gap-3 px-1 sm:px-2">
        <h1 className="min-w-0 flex-1 truncate text-lg font-black drop-shadow md:text-xl">
          {title}
        </h1>
        <button
          type="button"
          className="rounded-lg px-3 py-1 text-xs font-bold text-rose-400 transition hover:bg-rose-900/20 md:text-sm"
          onClick={onExit}
        >
          {exitLabel}
        </button>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div className="flex h-full min-h-0 items-stretch gap-3 overflow-hidden">
          <div className="min-w-0 flex-1 overflow-hidden">
            {mainContent}
          </div>

          <aside className="hidden h-full w-28 min-w-[7rem] flex-shrink-0 self-stretch overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/90 shadow-xl sm:flex md:w-36 md:min-w-[9rem]">
            {desktopSidebar}
          </aside>
        </div>

        {mobileFloatingCameras ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex justify-end px-1 sm:hidden">
            <div className="pointer-events-auto flex items-end gap-2">
              {mobileFloatingCameras}
            </div>
          </div>
        ) : null}
      </div>
    </div>

    {bottomBar}
    {overlay}
  </div>
);
