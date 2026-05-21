import React, { useEffect, useState } from 'react';
import { Minus, Square, X, FileText, Moon, Sun } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export function TitleBar() {
  const { fileName, isDirty, theme, setTheme } = useAppStore();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    window.evraktron.window.onMaximized((v) => setIsMaximized(v));
  }, []);

  return (
    <div className="titlebar-drag titlebar-base h-[38px] flex items-center justify-between select-none">
      {/* Left: Logo + title */}
      <div className="titlebar-no-drag flex items-center gap-2.5 px-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 flex items-center justify-center">
            <img src="./icon.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Evrak Takip App
          </span>
        </div>
        {fileName && (
          <>
            <span style={{ color: 'var(--text-muted)' }}>—</span>
            <span
              className="text-xs font-mono max-w-[320px] truncate"
              style={{ color: 'var(--text-secondary)' }}
            >
              {fileName}
              {isDirty && <span className="ml-1 text-amber-400">●</span>}
            </span>
          </>
        )}
      </div>

      {/* Right: Window controls */}
      <div className="titlebar-no-drag flex items-center">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-9 h-[38px] flex items-center justify-center transition-colors duration-150"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          title={theme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}
        >
          {theme === 'dark'
            ? <Sun className="w-3.5 h-3.5" />
            : <Moon className="w-3.5 h-3.5" />}
        </button>

        {/* Minimize */}
        <button
          onClick={() => window.evraktron.window.minimize()}
          className="w-[46px] h-[38px] flex items-center justify-center transition-colors duration-150"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.background = 'var(--bg-hover)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = '';
          }}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Maximize */}
        <button
          onClick={() => window.evraktron.window.maximize()}
          className="w-[46px] h-[38px] flex items-center justify-center transition-colors duration-150"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.background = 'var(--bg-hover)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = '';
          }}
        >
          <Square className="w-3 h-3" />
        </button>

        {/* Close */}
        <button
          onClick={() => window.evraktron.window.close()}
          className="w-[46px] h-[38px] flex items-center justify-center transition-colors duration-150"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.background = '#e11d48';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = '';
          }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
