import React, { useEffect, useState } from 'react';
import { Minus, Square, X, FileText } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { cn } from '../lib/utils';

export function TitleBar() {
  const { fileName, isDirty, theme, setTheme } = useAppStore();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    window.evraktron.window.onMaximized((v) => setIsMaximized(v));
  }, []);

  return (
    <div
      className={cn(
        'titlebar-drag h-[38px] flex items-center justify-between',
        'bg-surface-950/95 border-b border-surface-700/40 select-none'
      )}
    >
      {/* Left: Logo + title */}
      <div className="titlebar-no-drag flex items-center gap-2.5 px-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-brand-600 flex items-center justify-center">
            <FileText className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-surface-200">Evraktron</span>
        </div>
        {fileName && (
          <>
            <span className="text-surface-600">—</span>
            <span className="text-xs text-surface-400 font-mono max-w-[320px] truncate">
              {fileName}
              {isDirty && <span className="ml-1 text-amber-400">●</span>}
            </span>
          </>
        )}
      </div>

      {/* Right: Window controls */}
      <div className="titlebar-no-drag flex items-center">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-8 h-[38px] flex items-center justify-center text-surface-500 hover:text-surface-200 hover:bg-surface-800/50 transition-colors text-xs"
          title={theme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}
        >
          {theme === 'dark' ? '☀' : '🌙'}
        </button>
        <button
          onClick={() => window.evraktron.window.minimize()}
          className="w-[46px] h-[38px] flex items-center justify-center text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => window.evraktron.window.maximize()}
          className="w-[46px] h-[38px] flex items-center justify-center text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-colors"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={() => window.evraktron.window.close()}
          className="w-[46px] h-[38px] flex items-center justify-center text-surface-500 hover:text-white hover:bg-rose-600 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
