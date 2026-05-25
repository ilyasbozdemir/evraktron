import React, { useState, useMemo } from 'react';
import { X, Search, Download, CheckCircle2, Tag, Layers } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  BUILTIN_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type StoreTemplate,
} from '../../_/builtinTemplates';

interface TemplateStoreModalProps {
  installedIds: string[];
  onInstall: (template: StoreTemplate) => Promise<void>;
  onClose: () => void;
}

export function TemplateStoreModal({ installedIds, onInstall, onClose }: TemplateStoreModalProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<StoreTemplate | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);
  const [justInstalled, setJustInstalled] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return BUILTIN_TEMPLATES.filter(t => {
      const matchCat = category === 'all' || t.category === category;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [search, category]);

  const handleInstall = async (t: StoreTemplate) => {
    setInstalling(t.id);
    try {
      await onInstall(t);
      setJustInstalled(prev => new Set([...prev, t.id]));
    } finally {
      setInstalling(null);
    }
  };

  const isInstalled = (id: string) => installedIds.includes(id) || justInstalled.has(id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              🏪
            </div>
            <div>
              <h2 className="text-sm font-semibold text-surface-100">Şablon Mağazası</h2>
              <p className="text-xs text-surface-500">{BUILTIN_TEMPLATES.length} hazır şablon</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 h-7 w-7">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Left: Filters + Grid */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search + Category bar */}
            <div className="px-4 pt-4 pb-3 space-y-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Şablon ara…"
                  className="input h-8 text-sm pl-8"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {TEMPLATE_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                      category === cat.id
                        ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                        : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800 border border-transparent'
                    )}
                  >
                    <span>{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Template grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-surface-500 gap-2">
                  <span className="text-3xl">🔍</span>
                  <p className="text-sm">Sonuç bulunamadı</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {filtered.map(t => {
                  const installed = isInstalled(t.id);
                  const isLoading = installing === t.id;
                  const isActive = selected?.id === t.id;

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelected(isActive ? null : t)}
                      className={cn(
                        'relative p-4 rounded-xl border cursor-pointer transition-all duration-150 group',
                        isActive
                          ? 'border-brand-500/50 bg-brand-500/10'
                          : 'border-surface-700 hover:border-surface-600 hover:bg-surface-800/50'
                      )}
                    >
                      {installed && (
                        <div className="absolute top-3 right-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                          style={{ background: `${t.color}22`, border: `1px solid ${t.color}44` }}
                        >
                          {t.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-100 leading-tight">{t.name}</p>
                          <p className="text-xs text-surface-500 mt-0.5 line-clamp-2 leading-relaxed">{t.description}</p>
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            <span className="text-xs text-surface-600 flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              {t.fields.length} alan
                            </span>
                            {t.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-surface-700 text-surface-400 flex items-center gap-0.5">
                                <Tag className="w-2.5 h-2.5" />{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-surface-700 flex justify-end">
                        {installed ? (
                          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Kurulu
                          </span>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); handleInstall(t); }}
                            disabled={isLoading}
                            className={cn(
                              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                              isLoading
                                ? 'opacity-50 cursor-wait'
                                : 'text-white hover:opacity-90 active:scale-95'
                            )}
                            style={{ background: t.color }}
                          >
                            <Download className="w-3 h-3" />
                            {isLoading ? 'Kuruluyor…' : 'Kur'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Preview panel */}
          {selected && (
            <div className="w-72 border-l border-surface-700 flex flex-col overflow-hidden shrink-0 animate-fade-in">
              <div className="p-4 border-b border-surface-700 shrink-0">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3"
                  style={{ background: `${selected.color}22`, border: `1px solid ${selected.color}44` }}
                >
                  {selected.icon}
                </div>
                <h3 className="text-sm font-semibold text-surface-100">{selected.name}</h3>
                <p className="text-xs text-surface-500 mt-1 leading-relaxed">{selected.description}</p>

                <div className="flex flex-wrap gap-1 mt-3">
                  {selected.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-surface-700 text-surface-400">{tag}</span>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-2">Alanlar ({selected.fields.length})</p>
                {selected.fields.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 border-b border-surface-700/50">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-surface-200">{f.label}</span>
                      {f.required && <span className="text-rose-400 ml-0.5 text-xs">*</span>}
                    </div>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-surface-700 text-surface-500 shrink-0">{f.type}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-surface-700 shrink-0">
                {isInstalled(selected.id) ? (
                  <div className="flex items-center justify-center gap-2 py-2 text-emerald-400 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Kurulu
                  </div>
                ) : (
                  <button
                    onClick={() => handleInstall(selected)}
                    disabled={installing === selected.id}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: selected.color }}
                  >
                    <Download className="w-4 h-4" />
                    {installing === selected.id ? 'Kuruluyor…' : 'Şablonu Kur'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
