import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Settings, RefreshCw, Info, Check } from 'lucide-react';
import { useAppStore } from '../store/appStore';

interface AyarlarModalProps {
  onClose: () => void;
  onRefresh: () => void;
}

export function AyarlarModal({ onClose, onRefresh }: AyarlarModalProps) {
  const { ayarlar } = useAppStore();
  const [kurumAdi, setKurumAdi] = useState(ayarlar.kurum_adi || '');
  const [birimAdi, setBirimAdi] = useState(ayarlar.varsayilan_birim || '');
  const [isSaving, setIsSaving] = useState(false);

  // Auto-Updater States
  const [updaterStatus, setUpdaterStatus] = useState<string>('idle'); // idle, checking, available, not-available, downloaded, error
  const [updateVersion, setUpdateVersion] = useState<string>('');
  const [updaterError, setUpdaterError] = useState<string>('');
  const [currentVersion, setCurrentVersion] = useState<string>('...');

  useEffect(() => {
    window.evraktron.appVersion().then(setCurrentVersion).catch(console.error);

    const removeListener = window.evraktron.updater.onStatus((data) => {
      setUpdaterStatus(data.status);
      if (data.version) setUpdateVersion(data.version);
      if (data.error) setUpdaterError(data.error);
    });
    return () => {
      removeListener();
    };
  }, []);

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await window.evraktron.db.setAyar('kurum_adi', kurumAdi);
      await window.evraktron.db.setAyar('varsayilan_birim', birimAdi);
      
      // Cleanup old legacy settings to save DB space/confusion
      await window.evraktron.db.setAyar('varsayilan_klasor', '');
      await window.evraktron.db.setAyar('varsayilan_meta_keys', '');
      
      onRefresh();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-surface-900 border border-surface-700/50 shadow-2xl rounded-xl z-50 flex flex-col max-h-[85vh] animate-scale-in">
          
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800">
            <Dialog.Title className="text-base font-semibold text-surface-50 flex items-center gap-2">
              <Settings className="w-5 h-5 text-brand-400" />
              Proje (Dosya) Ayarları
            </Dialog.Title>
            <Dialog.Close className="p-1.5 text-surface-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <div className="p-5 space-y-5 flex-1 overflow-y-auto">
            <div>
              <label className="label">Varsayılan Kurum Adı</label>
              <input
                className="input"
                value={kurumAdi}
                onChange={e => setKurumAdi(e.target.value)}
                placeholder="Örn: Yapı Denetim A.Ş."
              />
              <p className="text-xs text-surface-400 mt-1.5">
                Yeni evrak oluşturduğunuzda kurum alanı otomatik olarak bu değerle dolar.
              </p>
            </div>

            <div>
              <label className="label">Varsayılan Birim Adı</label>
              <input
                className="input"
                value={birimAdi}
                onChange={e => setBirimAdi(e.target.value)}
                placeholder="Örn: İmar Müdürlüğü"
              />
              <p className="text-xs text-surface-400 mt-1.5">
                Yeni evrak oluşturduğunuzda birim alanı otomatik olarak bu değerle dolar.
              </p>
            </div>

            {/* Uygulama Güncelleme Yönetimi */}
            <div className="pt-4 border-t border-surface-800 space-y-3">
              <label className="text-xs font-semibold text-surface-300 uppercase tracking-wider block">
                Uygulama Güncelleme
              </label>
              
              <div className="p-3.5 bg-surface-950/30 border border-surface-800 rounded-xl flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-surface-100 flex items-center gap-1.5">
                    Mevcut Sürüm:
                    <span className="font-mono text-[10px] bg-surface-800 border border-surface-700 px-1.5 py-0.5 rounded text-surface-300 font-bold">
                      v{currentVersion}
                    </span>
                  </p>
                  <p className="text-[10px] text-surface-400 leading-relaxed max-w-[240px]">
                    Uzak sunucudan yeni yayınlar sorgulanarak kota dostu delta güncellemeleri kontrol edilir.
                  </p>
                </div>
                
                <div className="shrink-0">
                  {updaterStatus === 'downloaded' ? (
                    <button
                      type="button"
                      onClick={handleQuitAndInstall}
                      className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 border-emerald-500 text-white cursor-pointer shadow-md shadow-emerald-500/10 active:scale-95 transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Yükle
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCheckUpdates}
                      disabled={updaterStatus === 'checking'}
                      className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 transition-all"
                    >
                      <RefreshCw className={`w-3 h-3 ${updaterStatus === 'checking' ? 'animate-spin' : ''}`} />
                      {updaterStatus === 'checking' ? 'Denetleniyor' : 'Denetle'}
                    </button>
                  )}
                </div>
              </div>

              {updaterStatus !== 'idle' && (
                <div className={`p-3 rounded-xl border text-[11px] leading-relaxed flex gap-2 animate-slide-up ${
                  updaterStatus === 'checking' ? 'bg-surface-800/40 border-surface-800 text-surface-300' :
                  updaterStatus === 'available' ? 'bg-brand-500/10 border-brand-500/30 text-brand-400' :
                  updaterStatus === 'downloaded' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-semibold' :
                  updaterStatus === 'not-available' ? 'bg-surface-800/40 border-surface-800 text-surface-300' :
                  'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-brand-400" />
                  <div>
                    {updaterStatus === 'checking' && <span>Yeni yayınlar sorgulanıyor...</span>}
                    {updaterStatus === 'available' && <span>Yeni bir sürüm bulundu ({updateVersion}). Arka planda indirme başlatıldı.</span>}
                    {updaterStatus === 'not-available' && <span>Harika! En güncel sürümü kullanıyorsunuz.</span>}
                    {updaterStatus === 'downloaded' && <span>Güncelleme başarıyla indirildi. Lütfen "Yükle" butonuna basın.</span>}
                    {updaterStatus === 'error' && <span>Hata: <strong>{updaterError}</strong></span>}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-surface-800 bg-surface-950/50 flex justify-end gap-3 rounded-b-xl">
            <button onClick={onClose} className="btn-secondary">İptal</button>
            <button onClick={handleSave} disabled={isSaving} className="btn-primary">
              {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
