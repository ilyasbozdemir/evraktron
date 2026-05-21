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
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--brand-bg), #1d4ed8)',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <Archive className="w-10 h-10 text-white" />
          </div>
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
          </div>
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-2 gap-4 w-full mb-10">
          {/* Yeni Dosya */}
          <button
            id="btn-new-file"
            onClick={handleNew}
            className="card-hover p-6 flex flex-col items-start gap-3 text-left group"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200"
              style={{
                background: 'var(--brand-bg-subtle)',
                border: '1px solid var(--brand-border)',
              }}
            >
              <FileText className="w-5 h-5" style={{ color: 'var(--brand-text)' }} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Yeni Dosya
              </p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Boş .etapp dosyası oluştur
              </p>
            </div>
            <kbd
              className="text-xs font-mono"
              style={{ color: 'var(--text-disabled)' }}
            >
              Ctrl+N
            </kbd>
          </button>

          {/* Dosya Aç */}
          <button
            id="btn-open-file"
            onClick={handleOpen}
            className="card-hover p-6 flex flex-col items-start gap-3 text-left group"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200"
              style={{
                background: 'rgba(139,92,246,0.12)',
                border: '1px solid rgba(139,92,246,0.25)',
              }}
            >
              <FolderOpen className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Dosya Aç
              </p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Mevcut .etapp dosyasını aç
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
