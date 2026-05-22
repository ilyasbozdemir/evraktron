import React, { useState, useRef } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowUpDown, MoreHorizontal, Pencil, Trash2, ChevronUp, ChevronDown,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { Evrak } from '../types/electron.d';
import { cn, formatDate, DURUM_LABELS, TIP_LABELS, DURUM_COLORS, TIP_COLORS } from '../lib/utils';

interface EvrakListProps {
  onRefresh: () => void;
}

type SortKey = 'no' | 'tip' | 'kurum' | 'tarih' | 'durum' | 'created_at' | 'klasor' | 'raf_no';

const ROW_HEIGHT = 44; // px — sabit satır yüksekliği

export function EvrakList({ onRefresh }: EvrakListProps) {
  const { evraklar, isLoadingEvraklar, selectedEvrakId, setSelectedEvrakId, showToast, setDirty } = useAppStore();
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Scroll container ref — virtualizer buna bağlanacak
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const sorted = [...evraklar].sort((a, b) => {
    const va = (a[sortKey] ?? '') as string;
    const vb = (b[sortKey] ?? '') as string;
    return sortDir === 'asc' ? va.localeCompare(vb, 'tr') : vb.localeCompare(va, 'tr');
  });

  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10, // ekranın dışında 10 satır daha render et (smooth scroll için)
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleDelete = async (evrak: Evrak, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`"${evrak.no}" evrakını silmek istediğinizden emin misiniz?`)) return;
    await window.evraktron.db.deleteEvrak(evrak.id);
    if (selectedEvrakId === evrak.id) setSelectedEvrakId(null);
    onRefresh();
    setDirty(true);
    showToast('Evrak silindi', 'info');
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-brand-400" />
      : <ChevronDown className="w-3 h-3 text-brand-400" />;
  };

  const ColHeader = ({ col, label }: { col: SortKey; label: string }) => (
    <th onClick={() => handleSort(col)} className="cursor-pointer select-none group">
      <div className="flex items-center gap-1.5 hover:text-surface-200 transition-colors">
        {label}
        <SortIcon col={col} />
      </div>
    </th>
  );

  if (isLoadingEvraklar) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-surface-500">Yükleniyor…</p>
        </div>
      </div>
    );
  }

  if (evraklar.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-surface-500">
        <ArrowUpDown className="w-10 h-10 opacity-20" />
        <p className="text-sm">Henüz kayıt yok. Yeni evrak ekleyin.</p>
      </div>
    );
  }

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();

  return (
    /* Scroll container — overflow-y: auto ile native scroll */
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-auto"
      style={{ contain: 'strict' }}
    >
      <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
        {/* Thead — sticky kalacak, scroll edilmeyecek */}
        <thead className="sticky top-0 z-10 bg-surface-900">
          <tr>
            <ColHeader col="no" label="No" />
            <ColHeader col="klasor" label="Klasör" />
            <ColHeader col="tip" label="Tip" />
            <ColHeader col="kurum" label="Kurum" />
            <ColHeader col="tarih" label="Tarih" />
            <ColHeader col="durum" label="Durum" />
            <th>Özel Alanlar</th>
            <th>Açıklama</th>
            <th className="w-10" />
          </tr>
        </thead>

        <tbody style={{ position: 'relative', height: `${totalHeight}px`, display: 'block' }}>
          {/* Virtualizer offset spacer */}
          {virtualItems.length > 0 && virtualItems[0].start > 0 && (
            <tr style={{ height: `${virtualItems[0].start}px`, display: 'table-row' }}>
              <td colSpan={10} style={{ padding: 0, border: 'none' }} />
            </tr>
          )}

          {virtualItems.map((virtualRow) => {
            const evrak = sorted[virtualRow.index];
            return (
              <tr
                key={evrak.id}
                data-index={virtualRow.index}
                onClick={() => setSelectedEvrakId(selectedEvrakId === evrak.id ? null : evrak.id)}
                className={cn(selectedEvrakId === evrak.id && 'selected')}
                style={{
                  height: `${ROW_HEIGHT}px`,
                  display: 'table-row',
                }}
              >
                <td>
                  <span className="font-mono text-xs text-brand-400">{evrak.no}</span>
                </td>
                <td className="max-w-[120px] truncate text-surface-200">{evrak.klasor || '—'}</td>
                <td>
                  <span className={TIP_COLORS[evrak.tip] || 'badge'}>
                    {TIP_LABELS[evrak.tip] || evrak.tip}
                  </span>
                </td>
                <td className="max-w-[160px] truncate">
                  <div className="text-surface-300">{evrak.kurum || '—'}</div>
                  {evrak.birim && <div className="text-surface-500 text-[10px] uppercase tracking-wider">{evrak.birim}</div>}
                </td>
                <td className="text-surface-400 text-xs font-mono">{formatDate(evrak.tarih)}</td>
                <td>
                  <span className={DURUM_COLORS[evrak.durum] || 'badge'}>
                    {DURUM_LABELS[evrak.durum] || evrak.durum}
                  </span>
                </td>
                <td className="max-w-[200px] truncate text-surface-300 text-xs" title={evrak.metadata || ''}>
                  {(() => {
                    if (!evrak.metadata) return '—';
                    try {
                      const meta = JSON.parse(evrak.metadata);
                      const parts = Object.entries(meta).filter(([_, v]) => v).map(([k, v]) => `${k}: ${v}`);
                      return parts.length > 0 ? parts.join(' • ') : '—';
                    } catch { return '—'; }
                  })()}
                </td>
                <td className="max-w-[200px] truncate text-surface-400 text-xs">
                  {evrak.aciklama || '—'}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button className="btn-ghost p-1.5 h-7 w-7">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        className="bg-surface-800 border border-surface-700 rounded-lg shadow-card p-1 min-w-[140px] animate-scale-in z-50"
                        sideOffset={4}
                      >
                        <DropdownMenu.Item
                          className="flex items-center gap-2 px-3 py-2 text-xs text-surface-200 rounded hover:bg-surface-700 cursor-pointer outline-none"
                          onSelect={() => setSelectedEvrakId(evrak.id)}
                        >
                          <Pencil className="w-3.5 h-3.5" /> Düzenle
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="h-px bg-surface-700 my-1" />
                        <DropdownMenu.Item
                          className="flex items-center gap-2 px-3 py-2 text-xs text-rose-400 rounded hover:bg-rose-500/10 cursor-pointer outline-none"
                          onSelect={(e) => handleDelete(evrak, e as unknown as React.MouseEvent)}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Sil
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </td>
              </tr>
            );
          })}

          {/* Bottom spacer */}
          {virtualItems.length > 0 && (() => {
            const lastItem = virtualItems[virtualItems.length - 1];
            const bottomSpace = totalHeight - lastItem.end;
            return bottomSpace > 0 ? (
              <tr style={{ height: `${bottomSpace}px`, display: 'table-row' }}>
                <td colSpan={10} style={{ padding: 0, border: 'none' }} />
              </tr>
            ) : null;
          })()}
        </tbody>
      </table>
    </div>
  );
}
