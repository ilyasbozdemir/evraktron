import React, { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { TitleBar } from './components/TitleBar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { MainLayout } from './components/MainLayout';
import { StatusBar } from './components/StatusBar';
import { cn } from './lib/utils';

export default function App() {
  const { isFileOpen, setFileOpen, showToast, toast, theme } = useAppStore();

  useEffect(() => {
    // Set initial class list theme
    document.documentElement.classList.toggle('dark', theme === 'dark');

    // Setup file open request handler (when double clicked .evrak file)
    window.evraktron.file.onOpenRequest(async (filePath) => {
      const result = await window.evraktron.file.open(filePath);
      if (result.success && result.filePath) {
        setFileOpen(true, result.filePath);
        showToast('Dosya başarıyla açıldı', 'success');
      } else if (!result.success && result.error) {
        showToast(result.error, 'error');
      }
    });
  }, [setFileOpen, showToast, theme]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-surface-900 text-surface-100 select-none">
      {/* Custom Title Bar */}
      <TitleBar />

      {/* Main View Container */}
      <div className="flex-1 flex overflow-hidden">
        {isFileOpen ? <MainLayout /> : <WelcomeScreen />}
      </div>

      {/* Custom Status Bar */}
      <StatusBar />

      {/* Elegant Toast alert popup */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-8 right-6 z-50 px-4 py-3 rounded-xl border shadow-glass animate-slide-up flex items-center gap-2 max-w-sm',
            toast.type === 'success' && 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
            toast.type === 'error' && 'bg-rose-500/10 border-rose-500/30 text-rose-400',
            toast.type === 'info' && 'bg-brand-500/10 border-brand-500/30 text-brand-400'
          )}
        >
          <span className="text-xs font-semibold uppercase tracking-wider">{toast.type}:</span>
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
