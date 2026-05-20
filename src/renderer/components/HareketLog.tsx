import React, { useEffect, useState } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { Clock, User, ChevronRight } from 'lucide-react';
import type { Hareket } from '../types/electron.d';
import { formatDateTime } from '../lib/utils';

const ISLEM_ICONS: Record<string, string> = {
  olusturuldu: '✨', guncellendi: '✏️', ek_eklendi: '📎', silindi: '🗑️',
};
const ISLEM_LABELS: Record<string, string> = {
  olusturuldu: 'Oluşturuldu', guncellendi: 'Güncellendi',
  ek_eklendi: 'Ek Eklendi', silindi: 'Silindi',
};

export function HareketLog({ evrakId }: { evrakId: number }) {
  const [hareketler, setHareketler] = useState<Hareket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    window.evraktron.db.getHareketler(evrakId).then(rows => {
      setHareketler(rows);
      setLoading(false);
    });
  }, [evrakId]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (hareketler.length === 0) return (
    <div className="flex-1 flex items-center justify-center p-8 text-surface-500 text-sm">
      Henüz hareket kaydı yok
    </div>
  );

  return (
    <ScrollArea.Root className="h-full">
      <ScrollArea.Viewport className="p-4">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-surface-700/50" />

          <div className="space-y-4">
            {hareketler.map((h, i) => (
              <div key={h.id} className="flex gap-3 relative animate-enter" style={{ animationDelay: `${i * 30}ms` }}>
                {/* Dot */}
                <div className="w-10 h-10 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center shrink-0 z-10 text-sm">
                  {ISLEM_ICONS[h.islem_tipi] || '📋'}
                </div>

                {/* Content */}
                <div className="flex-1 card p-3 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-surface-200">
                        {ISLEM_LABELS[h.islem_tipi] || h.islem_tipi}
                      </p>
                      {h.not && (
                        <p className="text-xs text-surface-400 mt-0.5">{h.not}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-surface-500 font-mono">{formatDateTime(h.tarih)}</p>
                      <p className="text-xs text-surface-600 mt-0.5 flex items-center justify-end gap-1">
                        <User className="w-2.5 h-2.5" /> {h.kullanici}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation="vertical">
        <ScrollArea.Thumb className="bg-surface-600/50 rounded-full" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}
