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
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  React.useEffect(() => {
    window.evraktron.template.list().then(setTemplates);
  }, []);

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

  const handleBulkDelete = async () => {
    if (!confirm(`${selectedIds.size} adet evrak kalıcı olarak silinecek. Emin misiniz?`)) return;
    
    let successCount = 0;
    for (const id of selectedIds) {
      const res = await window.evraktron.db.deleteEvrak(id);
      if (res) {
        successCount++;
        if (selectedEvrakId === id) setSelectedEvrakId(null);
      }
    }
    
    showToast(`${successCount} evrak silindi`, 'info');
    setSelectedIds(new Set());
    setDirty(true);
    onRefresh();
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-brand-400" />
      : <ChevronDown className="w-3 h-3 text-brand-400" />;
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(sorted.map(ev => ev.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Extract dynamic columns
  const HIDDEN_META_KEYS = ['yil', 'yil_sira_no', 'sira_no', 'dosya_no', 'raf_no', '__template_id'];
  const customCols = new Set<string>();
  const customColLabels: Record<string, string> = {};

  sorted.forEach(ev => {
    try {
      const meta = JSON.parse(ev.metadata || '{}');
      const tId = meta.__template_id;
      const template = templates.find(t => t.id === tId);

      Object.entries(meta).forEach(([k, v]) => {
        if (v && !HIDDEN_META_KEYS.includes(k) && !k.startsWith('__')) {
          customCols.add(k);
          if (!customColLabels[k]) {
            const field = template?.fields?.find((f: any) => f.key === k);
            customColLabels[k] = field ? field.label : k;
          }
        }
      });
    } catch {}
  });

  const dynamicCols = Array.from(customCols);

  // Dinamik "No" başlığı belirleme
  const uniqueTemplates = new Set(sorted.map(e => {
    try { return JSON.parse(e.metadata || '{}').__template_id; }
    catch { return null; }
  }).filter(Boolean));

  let noLabel = 'Evrak No';
  if (uniqueTemplates.size === 1) {
    const tId = Array.from(uniqueTemplates)[0];
    const t = templates.find(tmpl => tmpl.id === tId);
    if (t) {
      const noField = t.fields?.find((f: any) => ['dosya_no', 'ruhsat_no', 'evrak_no'].includes(f.key));
      if (noField) noLabel = noField.label;
      else if (tId === 'ruhsat') noLabel = 'Ruhsat No';
    }
  }

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
    <div className="flex-1 flex flex-col relative h-full">
      {/* Scroll container — overflow-y: auto ile native scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto"
        style={{ contain: 'strict' }}
      >
        <table className="data-table" style={{ width: '100%' }}>
        {/* Thead — sticky kalacak, scroll edilmeyecek */}
        <thead className="sticky top-0 z-10 bg-surface-900 shadow-sm">
          <tr>
            <th className="w-10 px-3 text-center">
              <input 
                type="checkbox" 
                checked={sorted.length > 0 && selectedIds.size === sorted.length}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded bg-surface-800 border-surface-600 checked:bg-brand-500 cursor-pointer"
              />
            </th>
            <ColHeader col="no" label={noLabel} />
            <ColHeader col="klasor" label="Klasör" />
            <ColHeader col="raf_no" label="Raf No" />
            <ColHeader col="tip" label="Tip" />
            <ColHeader col="kurum" label="Kurum" />
            <ColHeader col="tarih" label="Tarih" />
            <ColHeader col="durum" label="Durum" />
            {dynamicCols.map(k => (
              <th key={k} className="text-left text-xs font-semibold text-surface-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">
                {customColLabels[k]}
              </th>
            ))}
            <th className="text-left text-xs font-semibold text-surface-400 uppercase tracking-wider px-3 py-3">Açıklama</th>
            <th className="w-10" />
          </tr>
        </thead>

        <tbody style={{ position: 'relative' }}>
          {/* Virtualizer offset spacer */}
          {virtualItems.length > 0 && virtualItems[0].start > 0 && (
            <tr>
              <td colSpan={10 + dynamicCols.length} style={{ height: `${virtualItems[0].start}px`, padding: 0, border: 'none' }} />
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
                }}
              >
                <td className="w-10 px-3 text-center" onClick={e => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(evrak.id)}
                    onChange={() => handleSelectRow(evrak.id)}
                    className="w-4 h-4 rounded bg-surface-800 border-surface-600 checked:bg-brand-500 cursor-pointer"
                  />
                </td>
                <td className="px-3">
                  <span className="font-mono text-xs text-brand-400">{evrak.no}</span>
                </td>
                <td className="max-w-[120px] truncate text-surface-200 px-3">{evrak.klasor || '—'}</td>
                <td className="max-w-[100px] truncate text-surface-300 px-3">{evrak.raf_no || '—'}</td>
                <td className="px-3">
                  <span className={TIP_COLORS[evrak.tip] || 'badge'}>
                    {TIP_LABELS[evrak.tip] || evrak.tip}
                  </span>
                </td>
                <td className="max-w-[160px] truncate px-3">
                  <div className="text-surface-300">{evrak.kurum || '—'}</div>
                  {evrak.birim && <div className="text-surface-500 text-[10px] uppercase tracking-wider">{evrak.birim}</div>}
                </td>
                <td className="text-surface-400 text-xs font-mono px-3">{formatDate(evrak.tarih)}</td>
                <td className="px-3">
                  <span className={DURUM_COLORS[evrak.durum] || 'badge'}>
                    {DURUM_LABELS[evrak.durum] || evrak.durum}
                  </span>
                </td>
                {dynamicCols.map(k => {
                  let val = '—';
                  try {
                    const metaObj = JSON.parse(evrak.metadata || '{}');
                    if (metaObj[k]) val = metaObj[k];
                  } catch {}
                  return (
                    <td key={k} className="max-w-[150px] truncate text-surface-300 text-xs px-3" title={val}>
                      {val}
                    </td>
                  );
                })}
                <td className="max-w-[200px] truncate text-surface-400 text-xs px-3">
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
              <tr>
                <td colSpan={10 + dynamicCols.length} style={{ height: `${bottomSpace}px`, padding: 0, border: 'none' }} />
              </tr>
            ) : null;
          })()}
        </tbody>
      </table>
      </div>

      {/* Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-surface-800 border border-surface-600 shadow-2xl rounded-full px-5 py-2.5 flex items-center gap-4 z-50 animate-slide-up">
          <span className="text-sm font-medium text-surface-200">
            <strong className="text-brand-400">{selectedIds.size}</strong> evrak seçili
          </span>
          <div className="w-px h-4 bg-surface-600" />
          <button
            onClick={handleBulkDelete}
            className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Seçilenleri Sil
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-surface-400 hover:text-surface-200 font-medium px-2 py-1.5 transition-colors"
          >
            İptal
          </button>
        </div>
      )}
    </div>
  );
}
