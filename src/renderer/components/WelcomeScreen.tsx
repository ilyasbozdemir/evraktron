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
            src="/icon.png" 
            alt="Evrak Takip App Logo" 
            className="w-24 h-24 rounded-3xl object-cover"
            style={{ boxShadow: 'var(--shadow-glow)' }}
          />
          <div className="text-center">
            <h1
              className="text-4xl font-bold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Evrak Takip App
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
        <div className="grid grid-cols-2 gap-4 w-full max-w-lg mt-8">
          {/* Yeni Proje */}
          <button
            onClick={handleNew}
            className="card p-6 flex flex-col items-center gap-4 hover:border-brand-500/50 hover:bg-surface-800/80 transition-all text-center group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-brand-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FilePlus className="w-6 h-6 text-brand-400" />
            </div>
            <div>
              <p className="font-medium text-base" style={{ color: 'var(--text-primary)' }}>
                Yeni Proje
              </p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Boş .etapp projesi oluştur
              </p>
            </div>
            <kbd
              className="text-xs font-mono"
              style={{ color: 'var(--text-disabled)' }}
            >
              Ctrl+N
            </kbd>
          </button>

          {/* Proje Aç */}
          <button
            onClick={handleOpen}
            className="card p-6 flex flex-col items-center gap-4 hover:border-violet-500/50 hover:bg-surface-800/80 transition-all text-center group cursor-pointer"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110"
              style={{
                background: 'rgba(139,92,246,0.12)',
                border: '1px solid rgba(139,92,246,0.25)',
              }}
            >
              <FolderOpen className="w-6 h-6 text-violet-500" />
            </div>
            <div>
              <p className="font-medium text-base" style={{ color: 'var(--text-primary)' }}>
                Proje Aç
              </p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Mevcut .etapp projesini aç
              </p>
            </div>
            <kbd
              className="text-xs font-mono"
              style={{ color: 'var(--text-disabled)' }}
            >
              Ctrl+O
            </kbd>
          </button>
        </div>

        {/* Features */}
        <div className="glass w-full rounded-xl p-5">
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-4"
            style={{ color: 'var(--text-muted)' }}
          >
            Özellikler
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Database, label: 'SQLite + FTS5', desc: 'Hızlı tam metin arama' },
              { icon: Shield,   label: 'Dosya Kilidi', desc: 'Eş zamanlı erişim koruması' },
              { icon: Zap,      label: 'Portable',     desc: 'Kurulum gerektirmez' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <Icon className="w-4 h-4" style={{ color: 'var(--brand-text)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {label}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
