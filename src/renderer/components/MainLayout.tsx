import React, { useEffect, useCallback, useState } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as Tooltip from '@radix-ui/react-tooltip';
import {
  LayoutList, Plus, Search, Download, FileText, Settings,
  BarChart2, FolderOpen, Save, Tag, X,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { EvrakList } from './EvrakList';
import { EvrakDetail } from './EvrakDetail';
import { ExportModal } from './ExportModal';
import { cn } from '../lib/utils';

type SideTab = 'evraklar' | 'istatistikler';

export function MainLayout() {
  const {
    setEvraklar, setLoadingEvraklar, setStats, setSelectedEvrakId, selectedEvrakId,
    searchQuery, setSearchQuery, setDirty, showToast, setLastSaved, closeFile,
  } = useAppStore();

  const [sideTab, setSideTab] = useState<SideTab>('evraklar');
  const [showExport, setShowExport] = useState(false);

  const loadEvraklar = useCallback(async (query?: string) => {
    setLoadingEvraklar(true);
    try {
      const rows = query
        ? await window.evraktron.db.searchEvrak(query)
        : await window.evraktron.db.getEvraklar({ orderBy: 'created_at', order: 'DESC' });
      setEvraklar(rows);
    } finally {
      setLoadingEvraklar(false);
    }
  }, [setEvraklar, setLoadingEvraklar]);

  const loadStats = useCallback(async () => {
    const s = await window.evraktron.db.getStats();
    setStats(s);
  }, [setStats]);

  useEffect(() => {
    loadEvraklar();
    loadStats();
  }, [loadEvraklar, loadStats]);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => loadEvraklar(searchQuery || undefined), 250);
    return () => clearTimeout(t);
  }, [searchQuery, loadEvraklar]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        if (e.key === 'n') { e.preventDefault(); handleNewEvrak(); }
        if (e.key === 'f') { e.preventDefault(); document.getElementById('search-input')?.focus(); }
        if (e.key === 's') { e.preventDefault(); handleSave(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleNewEvrak = useCallback(async () => {
    const evrak = await window.evraktron.db.createEvrak({
      no: `EVR-${Date.now()}`,
      tip: 'gelen',
      durum: 'beklemede',
    });
    await loadEvraklar(searchQuery || undefined);
    await loadStats();
    setSelectedEvrakId(evrak.id);
    setDirty(true);
  }, [loadEvraklar, loadStats, searchQuery, setSelectedEvrakId, setDirty]);

  const handleSave = useCallback(async () => {
    const result = await window.evraktron.file.save();
    if (result.success && result.savedAt) {
      setLastSaved(result.savedAt);
      showToast('Dosya kaydedildi', 'success');
    } else {
      showToast(result.error || 'Kaydetme hatası', 'error');
    }
  }, [setLastSaved, showToast]);

  const handleCloseFile = useCallback(async () => {
    await handleSave();
    closeFile();
  }, [handleSave, closeFile]);

  return (
    <Tooltip.Provider delayDuration={400}>
      <div className="flex flex-1 overflow-hidden bg-surface-900">
        {/* ── Sidebar ──────────────────────────────────────── */}
        <aside className="w-56 flex flex-col bg-surface-950/60 border-r border-surface-700/30 shrink-0">
          {/* Actions */}
          <div className="p-3 space-y-1 border-b border-surface-700/30">
            <button id="btn-new-evrak" onClick={handleNewEvrak} className="btn-primary w-full justify-center">
              <Plus className="w-4 h-4" />
              Yeni Evrak
            </button>
          </div>

          {/* Nav */}
          <ScrollArea.Root className="flex-1">
            <ScrollArea.Viewport className="p-2">
              <p className="text-xs text-surface-600 font-semibold uppercase tracking-wider px-2 py-2">Görünüm</p>
              <nav className="space-y-0.5">
                {[
                  { id: 'evraklar', label: 'Evrak Listesi', icon: LayoutList },
                  { id: 'istatistikler', label: 'İstatistikler', icon: BarChart2 },
                ] .map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setSideTab(id as SideTab)}
                    className={cn(sideTab === id ? 'sidebar-item-active' : 'sidebar-item', 'w-full')}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </nav>

              <p className="text-xs text-surface-600 font-semibold uppercase tracking-wider px-2 pt-4 pb-2">Dosya</p>
              <nav className="space-y-0.5">
                <button onClick={handleSave} className="sidebar-item w-full">
                  <Save className="w-4 h-4" /> Kaydet
                </button>
                <button onClick={() => setShowExport(true)} className="sidebar-item w-full">
                  <Download className="w-4 h-4" /> Dışa Aktar
                </button>
                <button onClick={handleCloseFile} className="sidebar-item w-full text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10">
                  <X className="w-4 h-4" /> Dosyayı Kapat
                </button>
              </nav>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical">
              <ScrollArea.Thumb />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </aside>

        {/* ── Main area ────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="h-12 border-b border-surface-700/30 bg-surface-900/80 flex items-center gap-3 px-4 shrink-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
              <input
                id="search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ara… (Ctrl+F)"
                className="input pl-9 h-8 text-xs"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-200">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Content split */}
          <div className="flex flex-1 overflow-hidden">
            <div className={cn('flex flex-col overflow-hidden', selectedEvrakId ? 'flex-1' : 'flex-1')}>
              {sideTab === 'evraklar' && (
                <EvrakList
                  onRefresh={() => { loadEvraklar(searchQuery || undefined); loadStats(); }}
                />
              )}
              {sideTab === 'istatistikler' && <StatsPanel />}
            </div>

            {selectedEvrakId && (
              <div className="w-[480px] border-l border-surface-700/30 bg-surface-900 flex flex-col shrink-0">
                <EvrakDetail
                  evrakId={selectedEvrakId}
                  onClose={() => setSelectedEvrakId(null)}
                  onRefresh={() => { loadEvraklar(searchQuery || undefined); loadStats(); }}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </Tooltip.Provider>
  );
}

function StatsPanel() {
  const { stats } = useAppStore();
  if (!stats) return <div className="p-6 text-surface-500 text-sm">Yükleniyor…</div>;

  const durumRenkler: Record<string, string> = {
    beklemede: 'bg-amber-500', islemde: 'bg-brand-500',
    tamamlandi: 'bg-emerald-500', iptal: 'bg-rose-500',
  };
  const tipRenkler: Record<string, string> = {
    gelen: 'bg-cyan-500', giden: 'bg-violet-500', ic: 'bg-slate-500', diger: 'bg-amber-500',
  };

  return (
    <ScrollArea.Root className="flex-1">
      <ScrollArea.Viewport className="p-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Toplam Evrak', value: stats.total, color: 'text-brand-400' },
            { label: 'Bu Hafta', value: stats.lastWeek, color: 'text-emerald-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-4">
              <p className="text-xs text-surface-500">{label}</p>
              <p className={cn('text-3xl font-bold mt-1', color)}>{value}</p>
            </div>
          ))}
        </div>

        {/* Durum chart */}
        <div className="card p-4 space-y-3">
          <p className="text-sm font-semibold text-surface-300">Duruma Göre</p>
          {stats.byDurum.map(({ durum, count }) => (
            <div key={durum}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-surface-400 capitalize">{durum}</span>
                <span className="text-surface-300 font-mono">{count}</span>
              </div>
              <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', durumRenkler[durum] || 'bg-surface-500')}
                  style={{ width: `${stats.total ? (count / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Tip chart */}
        <div className="card p-4 space-y-3">
          <p className="text-sm font-semibold text-surface-300">Tipe Göre</p>
          {stats.byTip.map(({ tip, count }) => (
            <div key={tip}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-surface-400 capitalize">{tip}</span>
                <span className="text-surface-300 font-mono">{count}</span>
              </div>
              <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', tipRenkler[tip] || 'bg-surface-500')}
                  style={{ width: `${stats.total ? (count / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
}
