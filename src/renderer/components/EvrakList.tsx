import React, { useState } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import {
  ArrowUpDown, MoreHorizontal, Pencil, Trash2, ChevronUp, ChevronDown,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { Evrak } from '../types/electron.d';
import { cn, formatDate, DURUM_LABELS, TIP_LABELS, DURUM_COLORS, TIP_COLORS } from '../lib/utils';

interface EvrakListProps {
  onRefresh: () => void;
}

type SortKey = 'no' | 'tip' | 'kurum' | 'tarih' | 'durum' | 'created_at';

export function EvrakList({ onRefresh }: EvrakListProps) {
  const { evraklar, isLoadingEvraklar, selectedEvrakId, setSelectedEvrakId, showToast, setDirty } = useAppStore();
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = [...evraklar].sort((a, b) => {
    const va = (a[sortKey] ?? '') as string;
    const vb = (b[sortKey] ?? '') as string;
    return sortDir === 'asc' ? va.localeCompare(vb, 'tr') : vb.localeCompare(va, 'tr');
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

  return (
    <ScrollArea.Root className="flex-1">
      <ScrollArea.Viewport className="h-full">
        <table className="data-table">
          <thead>
            <tr>
              <ColHeader col="no" label="No" />
              <ColHeader col="tip" label="Tip" />
              <ColHeader col="kurum" label="Kurum" />
              <ColHeader col="tarih" label="Tarih" />
              <ColHeader col="durum" label="Durum" />
              <th>Açıklama</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((evrak) => (
              <tr
                key={evrak.id}
                onClick={() => setSelectedEvrakId(selectedEvrakId === evrak.id ? null : evrak.id)}
                className={cn(selectedEvrakId === evrak.id && 'selected')}
              >
                <td>
                  <span className="font-mono text-xs text-brand-400">{evrak.no}</span>
                </td>
                <td>
                  <span className={TIP_COLORS[evrak.tip] || 'badge'}>
                    {TIP_LABELS[evrak.tip] || evrak.tip}
                  </span>
                </td>
                <td className="max-w-[160px] truncate text-surface-300">{evrak.kurum || '—'}</td>
                <td className="text-surface-400 text-xs font-mono">{formatDate(evrak.tarih)}</td>
                <td>
                  <span className={DURUM_COLORS[evrak.durum] || 'badge'}>
                    {DURUM_LABELS[evrak.durum] || evrak.durum}
                  </span>
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
            ))}
          </tbody>
        </table>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation="vertical" className="w-1.5 bg-transparent">
        <ScrollArea.Thumb className="bg-surface-600/50 rounded-full" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}
