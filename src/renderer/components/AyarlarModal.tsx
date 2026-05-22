import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Settings } from 'lucide-react';
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
