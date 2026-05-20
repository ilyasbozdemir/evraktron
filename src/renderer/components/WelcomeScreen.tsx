import React, { useCallback } from 'react';
import { FileText, FolderOpen, Zap, Shield, Database, Archive } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export function WelcomeScreen() {
  const { setFileOpen, showToast } = useAppStore();

  const handleNew = useCallback(async () => {
    const result = await window.evraktron.file.new();
    if (result.success && result.filePath) {
      setFileOpen(true, result.filePath);
      showToast('Yeni dosya oluşturuldu', 'success');
    } else if (!result.success && result.error) {
      showToast(result.error, 'error');
    }
  }, [setFileOpen, showToast]);

  const handleOpen = useCallback(async () => {
    const result = await window.evraktron.file.openDialog();
    if (result.success && result.filePath) {
      setFileOpen(true, result.filePath);
      showToast('Dosya açıldı', 'success');
    } else if (!result.success && result.error) {
      showToast(result.error, 'error');
    }
  }, [setFileOpen, showToast]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-surface-900 relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-600/5 rounded-full blur-3xl" />

      <div className="relative z-10 flex flex-col items-center max-w-2xl w-full px-8 animate-fade-in">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow">
            <Archive className="w-10 h-10 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white tracking-tight">Evraktron</h1>
            <p className="mt-2 text-surface-400 text-lg">Portable Evrak Yönetim Sistemi</p>
          </div>
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-2 gap-4 w-full mb-10">
          <button
            id="btn-new-file"
            onClick={handleNew}
            className="group card-hover p-6 flex flex-col items-start gap-3 text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-brand-600/20 border border-brand-500/30 flex items-center justify-center group-hover:bg-brand-600/30 transition-colors">
              <FileText className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <p className="font-semibold text-surface-100">Yeni Dosya</p>
              <p className="text-sm text-surface-500 mt-0.5">Boş .evrak dosyası oluştur</p>
            </div>
            <kbd className="text-xs text-surface-600 font-mono">Ctrl+N</kbd>
          </button>

          <button
            id="btn-open-file"
            onClick={handleOpen}
            className="group card-hover p-6 flex flex-col items-start gap-3 text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center group-hover:bg-violet-600/30 transition-colors">
              <FolderOpen className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="font-semibold text-surface-100">Dosya Aç</p>
              <p className="text-sm text-surface-500 mt-0.5">Mevcut .evrak dosyasını aç</p>
            </div>
            <kbd className="text-xs text-surface-600 font-mono">Ctrl+O</kbd>
          </button>
        </div>

        {/* Features */}
        <div className="w-full glass rounded-xl p-5">
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-4">Özellikler</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Database, label: 'SQLite + FTS5', desc: 'Hızlı tam metin arama' },
              { icon: Shield, label: 'Dosya Kilidi', desc: 'Eş zamanlı erişim koruması' },
              { icon: Zap, label: 'Portable', desc: 'Kurulum gerektirmez' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <Icon className="w-4 h-4 text-brand-400" />
                <p className="text-sm font-medium text-surface-300">{label}</p>
                <p className="text-xs text-surface-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
