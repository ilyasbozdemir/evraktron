import React, { useCallback } from 'react';
import { FileText, FilePlus, FolderOpen, Zap, Shield, Database, Archive } from 'lucide-react';
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
    <div
      className="flex-1 flex flex-col items-center justify-center relative overflow-hidden animate-fade-in"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.03,
          backgroundImage:
            'linear-gradient(var(--text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Glow orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl"
        style={{ background: 'var(--brand-bg)', opacity: 0.05 }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl"
        style={{ background: '#8b5cf6', opacity: 0.05 }}
      />

      <div className="relative z-10 flex flex-col items-center max-w-2xl w-full px-8">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <img 
            src="./icon.png" 
            alt="Evrak Takip Uygulaması Logo" 
            className="w-24 h-24 rounded-3xl object-cover"
            style={{ boxShadow: 'var(--shadow-glow)' }}
          />
          <div className="text-center">
            <h1
              className="text-4xl font-bold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Evrak Takip Uygulaması
            </h1>
            <p className="mt-2 text-lg" style={{ color: 'var(--text-secondary)' }}>
              Portable Evrak Yönetim Sistemi
            </p>
            <p className="mt-4 text-sm max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
              Evraklarınızı projelere ayırarak gruplayın. Örneğin; "Ruhsatlar" için bir proje, "İhaleler" için ayrı bir proje dosyası oluşturabilirsiniz.
            </p>
          </div>
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-2 gap-6 w-full max-w-lg mt-6">
          {/* Yeni Proje */}
          <button
            onClick={handleNew}
            className="relative group p-6 rounded-2xl flex flex-col items-center gap-4 border border-brand-500/20 bg-surface-800/40 hover:bg-surface-800/80 transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <FilePlus className="w-7 h-7 text-brand-400 drop-shadow-sm" />
            </div>
            <div className="relative z-10">
              <p className="font-semibold text-lg text-surface-100">Yeni Proje</p>
              <p className="text-sm text-surface-400 mt-1">Boş .etapp projesi oluştur</p>
            </div>
            <kbd className="relative z-10 mt-auto text-[11px] font-mono text-surface-500 bg-surface-900/60 px-2 py-1 rounded border border-surface-700/50">Ctrl+N</kbd>
          </button>

          {/* Proje Aç */}
          <button
            onClick={handleOpen}
            className="relative group p-6 rounded-2xl flex flex-col items-center gap-4 border border-violet-500/20 bg-surface-800/40 hover:bg-surface-800/80 transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
              <FolderOpen className="w-7 h-7 text-violet-400 drop-shadow-sm" />
            </div>
            <div className="relative z-10">
              <p className="font-semibold text-lg text-surface-100">Proje Aç</p>
              <p className="text-sm text-surface-400 mt-1">Mevcut .etapp projesini aç</p>
            </div>
            <kbd className="relative z-10 mt-auto text-[11px] font-mono text-surface-500 bg-surface-900/60 px-2 py-1 rounded border border-surface-700/50">Ctrl+O</kbd>
          </button>
        </div>

        {/* Features */}
        <div className="w-full max-w-lg mt-10 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px bg-gradient-to-r from-transparent to-surface-700 flex-1" />
            <p className="text-xs font-semibold uppercase tracking-widest text-surface-400">
              Sistem Özellikleri
            </p>
            <div className="h-px bg-gradient-to-l from-transparent to-surface-700 flex-1" />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Database, label: 'SQLite + FTS5', desc: 'Hızlı tam metin arama', color: 'text-blue-400', bg: 'bg-blue-500/10 border border-blue-500/20', hover: 'hover:border-blue-500/40' },
              { icon: Shield,   label: 'Dosya Kilidi', desc: 'Eş zamanlı erişim koruması', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/20', hover: 'hover:border-emerald-500/40' },
              { icon: Zap,      label: 'Windows Uyumlu', desc: 'Sağ tık ve Birlikte Aç desteği', color: 'text-amber-400', bg: 'bg-amber-500/10 border border-amber-500/20', hover: 'hover:border-amber-500/40' },
            ].map(({ icon: Icon, label, desc, color, bg, hover }) => (
              <div key={label} className={`p-4 rounded-xl bg-surface-800/30 flex flex-col items-center text-center gap-2 transition-all duration-300 hover:-translate-y-1 ${hover}`}>
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-1 transition-colors duration-300`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <p className="text-sm font-semibold text-surface-200">
                  {label}
                </p>
                <p className="text-[11px] text-surface-400 leading-tight px-1">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pb-4 flex flex-col items-center justify-center gap-2">
          <p className="text-xs text-surface-400 font-medium tracking-wide">
            Development by{' '}
            <a 
              href="https://ilyasbozdemir.dev" 
              target="_blank"
              rel="noreferrer"
              className="text-brand-400 hover:text-brand-300 transition-colors cursor-pointer font-bold"
            >
              ilyasbozdemir.dev
            </a>
          </p>
          <a 
            href="https://github.com/ilyasbozdemir/evraktron" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[11px] flex items-center gap-1.5 text-surface-500 hover:text-surface-300 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            github.com/ilyasbozdemir/evraktron
          </a>
        </div>
      </div>
    </div>
  );
}
