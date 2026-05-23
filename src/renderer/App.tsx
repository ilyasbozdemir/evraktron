import React, { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { TitleBar } from './components/TitleBar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { MainLayout } from './components/MainLayout';
import { StatusBar } from './components/StatusBar';
import { DataEditor } from './components/DataEditor';
import { cn } from './lib/utils';

export default function App() {
  const { isFileOpen, setFileOpen, showToast, toast, theme } = useAppStore();

  useEffect(() => {
    // Apply initial theme classes correctly
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
      html.classList.remove('light');
    } else {
      html.classList.add('light');
      html.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    window.evraktron.file.onOpenRequest(async (filePath) => {
      const result = await window.evraktron.file.open(filePath);
      
      // Check if it's a raw data file (JSON, XML, etc.)
      if (result.success && result.isDataFile) {
        setFileOpen(true, filePath);
        // We can pass a flag to store or just use the extension to render an editor
        useAppStore.setState({ isDataMode: true, dataFilePath: filePath });
        showToast('Veri dosyası editör modunda açıldı', 'success');
        return;
      }
      
      if (result.success && result.filePath) {
        useAppStore.setState({ isDataMode: false, dataFilePath: null });
        setFileOpen(true, result.filePath);
        showToast('Dosya başarıyla açıldı', 'success');
      } else if (!result.success && result.error) {
        showToast(result.error, 'error');
      }
    });
  }, [setFileOpen, showToast]);

  const { isDataMode, dataFilePath } = useAppStore();

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-surface-900 text-surface-100 select-none">
      {/* Custom Title Bar */}
      <TitleBar />

      {/* Main View Container */}
      <div className="flex-1 flex overflow-hidden">
        {isFileOpen ? (isDataMode ? <DataEditor filePath={dataFilePath!} /> : <MainLayout />) : <WelcomeScreen />}
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
