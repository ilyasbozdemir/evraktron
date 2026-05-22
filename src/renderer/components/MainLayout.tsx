import React, { useEffect, useCallback, useState } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as Tooltip from '@radix-ui/react-tooltip';
import {
  LayoutList, Plus, Search, Download, FileText, Settings,
  BarChart2, FolderOpen, Save, Tag, X, Filter, Zap, Clock
} from 'lucide-react';
import type { EvrakTemplate } from '../types/electron.d';
import { useAppStore } from '../store/appStore';
import { EvrakList } from './EvrakList';
import { EvrakDetail } from './EvrakDetail';
import { ExportModal } from './ExportModal';
import { AyarlarModal } from './AyarlarModal';
import { NewEvrakModal } from './NewEvrakModal';
import { TemplateManager } from './TemplateManager';
import { cn } from '../lib/utils';

type SideTab = 'evraklar' | 'istatistikler';

export function MainLayout() {
  const {
    setEvraklar, setLoadingEvraklar, setStats, setSelectedEvrakId, selectedEvrakId,
    searchQuery, setSearchQuery, setDirty, showToast, setLastSaved, setFileSaved, closeFile,
    ayarlar, setAyarlar
  } = useAppStore();

  const [sideTab, setSideTab] = useState<SideTab>('evraklar');
  const [showExport, setShowExport] = useState(false);
  const [showAyarlar, setShowAyarlar] = useState(false);
  const [showNewEvrak, setShowNewEvrak] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  
  // Advanced Search States
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [templates, setTemplates] = useState<EvrakTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [metadataFilters, setMetadataFilters] = useState<Record<string, string>>({});
  
  // Recent Searches
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('evraktron_recent_searches') || '[]');
      setRecentSearches(stored);
    } catch {}
  }, []);

  const addRecentSearch = (query: string) => {
    if (!query || !query.trim()) return;
    const q = query.trim().toLocaleLowerCase('tr-TR');
    
    setRecentSearches(prev => {
      const next = [q, ...prev.filter(x => x !== q)].slice(0, 5);
      localStorage.setItem('evraktron_recent_searches', JSON.stringify(next));
      return next;
    });

    try {
      const counts = JSON.parse(localStorage.getItem('evraktron_search_counts') || '{}');
      counts[q] = (counts[q] || 0) + 1;
      localStorage.setItem('evraktron_search_counts', JSON.stringify(counts));
      window.dispatchEvent(new Event('evraktron_search_stats_updated'));
    } catch {}
  };

  useEffect(() => {
    window.evraktron.template.list().then(setTemplates);
  }, []);

  const loadEvraklar = useCallback(async (query?: string, mf?: Record<string, string>) => {
    setLoadingEvraklar(true);
    try {
      const filters: any = { orderBy: 'created_at', order: 'DESC' };
      const rows = await window.evraktron.db.getEvraklar(filters);
      
      const toTrLower = (s: string) => {
        return (s || '')
          .replace(/I/g, 'ı')
          .replace(/İ/g, 'i')
          .toLocaleLowerCase('tr-TR');
      };
      
      let filtered = rows;

      // 1. Detaylı Arama (metadata alanları bazında arama)
      if (mf && Object.keys(mf).length > 0) {
        filtered = filtered.filter((evrak: any) => {
          try {
            const metaObj = JSON.parse(evrak.metadata || '{}');
            return Object.entries(mf).every(([k, v]) => {
              if (!v || !v.trim()) return true;
              const metaVal = toTrLower(String(metaObj[k] || ''));
              const searchVal = toTrLower(v.trim());
              return metaVal.includes(searchVal);
            });
          } catch {
            return false;
          }
        });
      }
      
      // 2. Genel Arama
      if (query && query.trim()) {
        const terms = query.trim().split(/\s+/).map(toTrLower);
        
        filtered = filtered.filter((evrak: any) => {
          const searchable = toTrLower([
            evrak.no, evrak.kurum, evrak.birim, evrak.aciklama, evrak.metadata, evrak.tarih,
            evrak.tip, evrak.durum, evrak.klasor, evrak.raf_no
          ].map(v => v || '').join(' '));
          
          return terms.every(term => searchable.includes(term));
        });
      }
      
      setEvraklar(filtered);
    } finally {
      setLoadingEvraklar(false);
    }
  }, [setEvraklar, setLoadingEvraklar]);

  const loadStats = useCallback(async () => {
    const s = await window.evraktron.db.getStats();
    setStats(s);
  }, [setStats]);

  const loadAyarlar = useCallback(async () => {
    const a = await window.evraktron.db.getAyarlar();
    setAyarlar(a);
  }, [setAyarlar]);

  useEffect(() => {
    loadEvraklar();
    loadStats();
    loadAyarlar();
  }, [loadEvraklar, loadStats, loadAyarlar]);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => loadEvraklar(searchQuery || undefined, metadataFilters), 250);
    return () => clearTimeout(t);
  }, [searchQuery, metadataFilters, loadEvraklar]);

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

  const handleNewEvrak = useCallback(() => {
    setShowNewEvrak(true);
  }, []);

  const handleEvrakCreated = useCallback(async (evrakId: number) => {
    await loadEvraklar(searchQuery || undefined);
    await loadStats();
    setSelectedEvrakId(evrakId);
    setDirty(true);
  }, [loadEvraklar, loadStats, searchQuery, setSelectedEvrakId, setDirty]);

  const handleSave = useCallback(async () => {
    const result = await window.evraktron.file.save();
    if (result.success) {
      // Yeni dosya ilk kez kaydedildi — gerçek filePath ile store'u güncelle
      if (result.filePath) {
        setFileSaved(result.filePath);
        showToast('Dosya kaydedildi', 'success');
      } else if (result.savedAt) {
        setLastSaved(result.savedAt);
        showToast('Dosya kaydedildi', 'success');
      }
    } else {
      showToast(result.error || 'Kaydetme hatası', 'error');
    }
  }, [setLastSaved, setFileSaved, showToast]);

  const handleCloseFile = useCallback(async () => {
    await handleSave();
    closeFile();
  }, [handleSave, closeFile]);

  return (
    <Tooltip.Provider delayDuration={400}>
      <div
        className="flex flex-1 overflow-hidden"
        style={{ background: 'var(--bg-base)' }}
      >
        {/* ── Sidebar ──────────────────────────────────────── */}
        <aside
          className="w-56 flex flex-col shrink-0"
          style={{
            background: 'var(--bg-overlay)',
            borderRight: '1px solid var(--border-subtle)',
          }}
        >
          {/* Actions */}
          <div
            className="p-3 space-y-1"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <button id="btn-new-evrak" onClick={handleNewEvrak} className="btn-primary w-full justify-center">
              <Plus className="w-4 h-4" />
              Yeni Evrak
            </button>
          </div>

          {/* Nav */}
          <ScrollArea.Root className="flex-1">
            <ScrollArea.Viewport className="p-2">
              <p
                className="text-xs font-semibold uppercase tracking-wider px-2 py-2"
                style={{ color: 'var(--text-muted)' }}
              >
                Görünüm
              </p>
              <nav className="space-y-0.5">
                {[
                  { id: 'evraklar', label: 'Evrak Listesi', icon: LayoutList },
                  { id: 'istatistikler', label: 'İstatistikler', icon: BarChart2 },
                ].map(({ id, label, icon: Icon }) => (
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

              <p
                className="text-xs font-semibold uppercase tracking-wider px-2 pt-4 pb-2"
                style={{ color: 'var(--text-muted)' }}
              >
                Dosya
              </p>
              <nav className="space-y-0.5">
                <button onClick={() => setShowTemplates(true)} className="sidebar-item w-full">
                  <Tag className="w-4 h-4" /> Şablonlar
                </button>
                <button onClick={() => setShowAyarlar(true)} className="sidebar-item w-full text-brand-500 font-medium">
                  <Settings className="w-4 h-4" /> Proje Ayarları
                </button>
                <button onClick={handleSave} className="sidebar-item w-full">
                  <Save className="w-4 h-4" /> Kaydet
                </button>
                <button onClick={() => setShowExport(true)} className="sidebar-item w-full">
                  <Download className="w-4 h-4" /> Dışa Aktar
                </button>
                <button
                  onClick={handleCloseFile}
                  className="sidebar-item w-full"
                  style={{ color: 'rgba(244,63,94,0.7)' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.color = '#f43f5e';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(244,63,94,0.08)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.color = 'rgba(244,63,94,0.7)';
                    (e.currentTarget as HTMLElement).style.background = '';
                  }}
                >
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
        <main
          className="flex-1 flex flex-col overflow-hidden"
          style={{ background: 'var(--bg-base)' }}
        >
          {/* Toolbar */}
          <div
            className="h-12 flex items-center justify-between gap-3 px-4 shrink-0"
            style={{
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-base)',
            }}
          >
            <div className="relative flex-1 max-w-md flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
                <input
                  id="search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addRecentSearch(searchQuery)}
                  onBlur={() => addRecentSearch(searchQuery)}
                  placeholder="Genel Ara… (Ctrl+F)"
                  className="input pl-9 h-8 text-xs w-full"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 transition-colors text-surface-400 hover:text-surface-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button 
                    onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                    className={cn(
                      "btn-ghost h-8 px-2.5", 
                      showAdvancedSearch || Object.keys(metadataFilters).length > 0 ? "bg-brand-500/10 text-brand-400" : ""
                    )}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Detaylı</span>
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="bg-surface-800 text-xs text-surface-200 px-2 py-1 rounded border border-surface-700 shadow-lg z-50">
                    Şablona Göre Detaylı Arama
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>
            
            {/* Quick Stats Summary */}
            <div className="hidden md:flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-800/50 border border-surface-700">
                <BarChart2 className="w-3.5 h-3.5 text-brand-400" />
                <span className="text-surface-300">Toplam: <strong className="text-surface-100">{useAppStore.getState().stats?.total || 0}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-800/50 border border-surface-700">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-surface-300">Bu Hafta: <strong className="text-surface-100">{useAppStore.getState().stats?.lastWeek || 0}</strong></span>
              </div>
            </div>
          </div>

          {/* Advanced Search & Suggestions Area */}
          {(showAdvancedSearch || Object.keys(metadataFilters).length > 0 || !searchQuery) && sideTab === 'evraklar' && (
            <div className="bg-surface-900/50 border-b border-surface-700/30 px-4 py-2 flex flex-col gap-3 shrink-0">
              {/* Quick Filter Suggestions & Recent Searches */}
              {!showAdvancedSearch && Object.keys(metadataFilters).length === 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-1.5 text-surface-500 mr-1 shrink-0">
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Hızlı Şablonlar:</span>
                    </div>
                    {[
                      { label: 'Tümünü Gör', tId: '' },
                      { label: 'Ruhsatlar', tId: 'ruhsat' },
                      { label: 'Yazışmalar', tId: 'yazisma' },
                      { label: 'Genel Evraklar', tId: 'genel' },
                    ].map(q => (
                      <button
                        key={q.label}
                        onClick={() => {
                          setSelectedTemplateId(q.tId);
                          setMetadataFilters({});
                          setShowAdvancedSearch(true);
                        }}
                        className={cn(
                          "px-2.5 py-1 text-xs font-medium rounded-full border transition-colors whitespace-nowrap",
                          selectedTemplateId === q.tId && showAdvancedSearch
                            ? "bg-brand-500/20 border-brand-500 text-brand-400"
                            : "bg-surface-800 border-surface-700 text-surface-300 hover:text-brand-400 hover:border-brand-500/50"
                        )}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>

                  {recentSearches.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                      <div className="flex items-center gap-1.5 text-surface-500 mr-1 shrink-0">
                        <Clock className="w-3 h-3 text-brand-400" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">Son Arananlar:</span>
                      </div>
                      {recentSearches.map(q => (
                        <button
                          key={q}
                          onClick={() => setSearchQuery(q)}
                          className="px-2.5 py-1 text-xs font-medium rounded-full bg-surface-800 border border-surface-700 text-surface-300 hover:text-brand-400 hover:border-brand-500/50 transition-colors whitespace-nowrap"
                        >
                          {q}
                        </button>
                      ))}
                      <button 
                        onClick={() => { setRecentSearches([]); localStorage.removeItem('evraktron_recent_searches'); }}
                        className="px-2 text-[10px] text-surface-500 hover:text-rose-400 ml-auto whitespace-nowrap"
                      >
                        Temizle
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Advanced Filter Panel */}
              {(showAdvancedSearch || Object.keys(metadataFilters).length > 0) && (
                <div className="animate-enter space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-surface-400">Şablon Seçimi:</span>
                    <select
                      className="input h-7 text-xs py-0 w-48"
                      value={selectedTemplateId}
                      onChange={e => {
                        setSelectedTemplateId(e.target.value);
                        setMetadataFilters({});
                      }}
                    >
                      <option value="">-- Tüm Evraklar --</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                      ))}
                    </select>
                    
                    {Object.keys(metadataFilters).length > 0 && (
                      <button 
                        onClick={() => setMetadataFilters({})}
                        className="text-[10px] text-rose-400 hover:text-rose-300 ml-auto flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Filtreleri Temizle
                      </button>
                    )}
                  </div>

                  {selectedTemplateId && (
                    <div className="p-3 bg-surface-950/30 rounded-lg border border-surface-700/50">
                      <p className="text-[10px] font-semibold text-brand-500/80 uppercase tracking-widest mb-2">
                        {templates.find(t => t.id === selectedTemplateId)?.name} Alanlarında Ara (VE bağlacı)
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {templates.find(t => t.id === selectedTemplateId)?.fields.map(f => (
                          <div key={f.key} className="flex-1 min-w-[140px] max-w-[200px]">
                            <input
                              type={f.type === 'number' ? 'number' : 'text'}
                              className="input h-7 text-xs w-full bg-surface-900 border-surface-700 focus:border-brand-500"
                              placeholder={`${f.label} ara...`}
                              value={metadataFilters[f.key] || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setMetadataFilters(prev => {
                                  const next = { ...prev };
                                  if (val) next[f.key] = val;
                                  else delete next[f.key];
                                  return next;
                                });
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Content split */}
          <div className="flex flex-1 overflow-hidden min-h-0">
            <div className={cn('flex flex-col overflow-hidden min-h-0', selectedEvrakId ? 'flex-1' : 'flex-1')}>
              {sideTab === 'evraklar' && (
                <EvrakList
                  onRefresh={() => { loadEvraklar(searchQuery || undefined); loadStats(); }}
                />
              )}
              {sideTab === 'istatistikler' && <StatsPanel />}
            </div>

            {selectedEvrakId && (
              <div
                className="w-[480px] flex flex-col shrink-0"
                style={{
                  borderLeft: '1px solid var(--border-subtle)',
                  background: 'var(--bg-base)',
                }}
              >
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
      {showAyarlar && <AyarlarModal onClose={() => setShowAyarlar(false)} onRefresh={loadAyarlar} />}
      {showNewEvrak && (
        <NewEvrakModal
          onClose={() => setShowNewEvrak(false)}
          onCreated={handleEvrakCreated}
        />
      )}
      {showTemplates && <TemplateManager onClose={() => setShowTemplates(false)} />}
    </Tooltip.Provider>
  );
}

function StatsPanel() {
  const { stats } = useAppStore();
  const [topSearches, setTopSearches] = useState<{query: string, count: number}[]>([]);

  const loadSearchStats = () => {
    try {
      const counts = JSON.parse(localStorage.getItem('evraktron_search_counts') || '{}');
      const sorted = Object.entries(counts)
        .map(([query, count]) => ({ query, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setTopSearches(sorted);
    } catch {}
  };

  useEffect(() => {
    loadSearchStats();
    window.addEventListener('evraktron_search_stats_updated', loadSearchStats);
    return () => window.removeEventListener('evraktron_search_stats_updated', loadSearchStats);
  }, []);

  if (!stats) return <div className="p-6 text-sm" style={{ color: 'var(--text-muted)' }}>Yükleniyor…</div>;

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
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <p className={cn('text-3xl font-bold mt-1', color)}>{value}</p>
            </div>
          ))}
        </div>

        {/* Durum chart */}
        <div className="card p-4 space-y-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Duruma Göre</p>
          {stats.byDurum.map(({ durum, count }) => (
            <div key={durum}>
              <div className="flex justify-between text-xs mb-1">
                <span className="capitalize" style={{ color: 'var(--text-muted)' }}>{durum}</span>
                <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{count}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
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
          <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Tipe Göre</p>
          {stats.byTip.map(({ tip, count }) => (
            <div key={tip}>
              <div className="flex justify-between text-xs mb-1">
                <span className="capitalize" style={{ color: 'var(--text-muted)' }}>{tip}</span>
                <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{count}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                <div
                  className={cn('h-full rounded-full', tipRenkler[tip] || 'bg-surface-500')}
                  style={{ width: `${stats.total ? (count / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Top Searches */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>En Çok Aranan Kelimeler</p>
            <Search className="w-3.5 h-3.5 text-brand-400 opacity-70" />
          </div>
          {topSearches.length > 0 ? (
            <div className="space-y-2">
              {topSearches.map((s, i) => (
                <div key={s.query} className="flex items-center justify-between text-xs bg-surface-800/50 p-2 rounded-lg border border-surface-700/50">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[10px] font-bold text-surface-500 w-4">{i + 1}.</span>
                    <span className="text-surface-200 font-medium truncate">{s.query}</span>
                  </div>
                  <span className="text-[10px] font-mono text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">{s.count} kez</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-surface-500 italic pt-2">Henüz arama verisi yok.</p>
          )}
        </div>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
}
