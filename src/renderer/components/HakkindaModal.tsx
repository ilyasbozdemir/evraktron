import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, RefreshCw, Info, Check, Github, ExternalLink, ShieldCheck } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export function HakkindaModal() {
  const { showHakkinda, setShowHakkinda } = useAppStore();

  const [updaterStatus, setUpdaterStatus] = useState<string>('idle'); // idle, checking, available, not-available, downloaded, error
  const [updateVersion, setUpdateVersion] = useState<string>('');
  const [updaterError, setUpdaterError] = useState<string>('');
  const [currentVersion, setCurrentVersion] = useState<string>('...');

  useEffect(() => {
    if (!showHakkinda) return;

    window.evraktron.appVersion().then(setCurrentVersion).catch(console.error);

    const removeListener = window.evraktron.updater.onStatus((data) => {
      setUpdaterStatus(data.status);
      if (data.version) setUpdateVersion(data.version);
      if (data.error) setUpdaterError(data.error);
    });
    return () => {
      removeListener();
    };
  }, [showHakkinda]);

  const handleCheckUpdates = async () => {
    setUpdaterStatus('checking');
    setUpdaterError('');
    try {
      const res = await window.evraktron.updater.check();
      if (!res.success) {
        setUpdaterStatus('error');
        setUpdaterError(res.error || 'Güncelleme kontrolü başarısız.');
      }
    } catch (err: any) {
      setUpdaterStatus('error');
      setUpdaterError(err.message || 'Hata oluştu.');
    }
  };

  const handleQuitAndInstall = async () => {
    try {
      await window.evraktron.updater.quitAndInstall();
    } catch (err: any) {
      alert('Güncelleme yüklenirken hata oluştu: ' + err.message);
    }
  };

  if (!showHakkinda) return null;

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && setShowHakkinda(false)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-55 animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-surface-900 border border-surface-700/50 shadow-2xl rounded-2xl z-55 flex flex-col max-h-[85vh] animate-scale-in overflow-hidden">
          
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800">
            <Dialog.Title className="text-base font-semibold text-surface-50 flex items-center gap-2">
              <Info className="w-5 h-5 text-brand-400" />
              Uygulama Hakkında & Güncelleme
            </Dialog.Title>
            <Dialog.Close className="p-1.5 text-surface-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto">
            {/* Header info */}
            <div className="flex flex-col items-center text-center gap-3">
              <img 
                src="./icon.png" 
                alt="Logo" 
                className="w-16 h-16 rounded-2xl shadow-glass border border-surface-700/30 object-cover" 
              />
              <div>
                <h3 className="text-lg font-bold text-surface-50">Evraktron</h3>
                <p className="text-xs text-surface-400 mt-0.5">Portable Evrak Yönetim Sistemi</p>
                <p className="text-[10px] font-semibold text-brand-400 mt-1 bg-brand-500/10 px-2 py-0.5 rounded-full inline-block">
                  Sürüm: v{currentVersion}
                </p>
              </div>
            </div>

            {/* Auto updater interface */}
            <div className="p-4 bg-surface-950/40 border border-surface-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-surface-100 flex items-center gap-1.5">
                    Güncelleme Denetimi
                  </p>
                  <p className="text-[10px] text-surface-400 leading-normal max-w-[220px]">
                    GitHub Releases üzerinden delta paketleriyle hızlı güncelleme kontrolü.
                  </p>
                </div>
                
                <div className="shrink-0">
                  {updaterStatus === 'downloaded' ? (
                    <button
                      onClick={handleQuitAndInstall}
                      className="btn-primary py-1.5 px-3.5 text-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 border-emerald-500 text-white cursor-pointer shadow-md active:scale-95 transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Yükle
                    </button>
                  ) : (
                    <button
                      onClick={handleCheckUpdates}
                      disabled={updaterStatus === 'checking'}
                      className="btn-secondary py-1.5 px-3.5 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 transition-all"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${updaterStatus === 'checking' ? 'animate-spin' : ''}`} />
                      {updaterStatus === 'checking' ? 'Aranıyor' : 'Denetle'}
                    </button>
                  )}
                </div>
              </div>

              {updaterStatus !== 'idle' && (
                <div className={`p-3 rounded-lg border text-[11px] leading-relaxed flex gap-2 animate-slide-up ${
                  updaterStatus === 'checking' ? 'bg-surface-800/40 border-surface-700 text-surface-300' :
                  updaterStatus === 'available' ? 'bg-brand-500/10 border-brand-500/30 text-brand-400' :
                  updaterStatus === 'downloaded' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-semibold' :
                  updaterStatus === 'not-available' ? 'bg-surface-800/40 border-surface-700 text-surface-300' :
                  'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-brand-400" />
                  <div>
                    {updaterStatus === 'checking' && <span>Yeni yayınlar sorgulanıyor...</span>}
                    {updaterStatus === 'available' && <span>Yeni sürüm ({updateVersion}) bulundu. Arka planda indirme başladı.</span>}
                    {updaterStatus === 'not-available' && <span>Harika! En güncel sürümü kullanıyorsunuz.</span>}
                    {updaterStatus === 'downloaded' && <span>Güncelleme başarıyla indirildi. Yüklemek için "Yükle" butonuna tıklayın.</span>}
                    {updaterStatus === 'error' && <span>Hata: <strong>{updaterError}</strong></span>}
                  </div>
                </div>
              )}
            </div>

            {/* Links and info list */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 p-2 bg-surface-800/30 hover:bg-surface-800/60 rounded-xl transition-colors">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="flex-1 text-surface-300">Geliştirici: İlyas Bozdemir</span>
                <a 
                  href="https://ilyasbozdemir.dev" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-brand-400 hover:text-brand-300 flex items-center gap-0.5"
                >
                  web <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center gap-2 p-2 bg-surface-800/30 hover:bg-surface-800/60 rounded-xl transition-colors">
                <Github className="w-4 h-4 text-slate-300 shrink-0" />
                <span className="flex-1 text-surface-300">Açık Kaynak Kodlu</span>
                <a 
                  href="https://github.com/ilyasbozdemir/evraktron" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-brand-400 hover:text-brand-300 flex items-center gap-0.5"
                >
                  GitHub <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-surface-800 bg-surface-950/50 flex justify-end rounded-b-2xl">
            <button 
              onClick={() => setShowHakkinda(false)} 
              className="btn-secondary text-xs px-4 py-2 cursor-pointer"
            >
              Kapat
            </button>
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
