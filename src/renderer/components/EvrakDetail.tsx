import React, { useEffect, useState, useCallback } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Select from '@radix-ui/react-select';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { X, ChevronDown, Check, Save, Paperclip, Clock, Tag } from 'lucide-react';
import type { Evrak, Hareket, Ek, Etiket, EvrakTemplate } from '../types/electron.d';
import { useAppStore } from '../store/appStore';
import { cn, formatDateTime, formatDate, formatBytes, DURUM_LABELS, TIP_LABELS } from '../lib/utils';
import { AttachmentsTab } from './AttachmentsTab';
import { HareketLog } from './HareketLog';

interface EvrakDetailProps {
  evrakId: number;
  onClose: () => void;
  onRefresh: () => void;
}

const DURUMLAR = ['beklemede', 'islemde', 'tamamlandi', 'iptal'] as const;
const TIPLER   = ['gelen', 'giden', 'ic', 'diger'] as const;

export function EvrakDetail({ evrakId, onClose, onRefresh }: EvrakDetailProps) {
  const { showToast, setDirty, evraklar } = useAppStore();
  const [evrak, setEvrak] = useState<Evrak | null>(null);

  const uniqueKurumlar = React.useMemo(() => Array.from(new Set(evraklar.map(e => e.kurum).filter(Boolean))), [evraklar]);
  const uniqueKlasorler = React.useMemo(() => Array.from(new Set(evraklar.map(e => e.klasor).filter(Boolean))), [evraklar]);
  const [form, setForm] = useState<Partial<Evrak>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [template, setTemplate] = useState<EvrakTemplate | null>(null);

  const metadata = React.useMemo(() => {
    try { return form.metadata ? JSON.parse(form.metadata) : {}; }
    catch { return {}; }
  }, [form.metadata]);

  const updateMetadata = (key: string, value: string) => {
    const next = { ...metadata, [key]: value };
    handleChange('metadata', JSON.stringify(next));
    if (key === 'raf_no') {
      handleChange('raf_no', value);
    }
  };

  const loadEvrak = useCallback(async () => {
    const e = await window.evraktron.db.getEvrak(evrakId);
    if (e) { 
      setEvrak(e); 
      setForm(e); 
      try {
        const meta = JSON.parse(e.metadata || '{}');
        if (meta.__template_id) {
          const t = await window.evraktron.template.get(meta.__template_id);
          setTemplate(t);
        }
      } catch {}
    }
  }, [evrakId]);

  useEffect(() => { loadEvrak(); }, [loadEvrak]);

  const handleChange = (field: keyof Evrak, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await window.evraktron.db.updateEvrak(evrakId, form);
      setEvrak(updated);
      setDirty(true);
      onRefresh();
      showToast('Evrak güncellendi', 'success');
    } catch {
      showToast('Güncelleme hatası', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!evrak) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col h-full animate-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700/30 shrink-0">
        <div>
          <input
            type="text"
            className="input text-xs font-mono w-40 h-7 bg-transparent border-transparent hover:border-surface-600 focus:border-brand-500 px-1 -ml-1 transition-colors"
            value={form.no || ''}
            onChange={e => handleChange('no', e.target.value)}
            placeholder="Evrak No"
          />
          <p className="text-sm font-semibold text-surface-100 mt-0.5 truncate max-w-[300px]">
            {evrak.kurum || 'Kurum belirtilmemiş'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={isSaving} className="btn-primary h-8 text-xs px-3">
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          <button onClick={onClose} className="btn-ghost h-8 w-8 p-0 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="form" className="flex flex-col flex-1 overflow-hidden">
        <Tabs.List className="flex gap-1 px-4 border-b border-surface-700/30 shrink-0 bg-surface-950/30">
          {[
            { value: 'form', label: 'Detay', icon: null },
            { value: 'hareketler', label: 'Hareketler', icon: Clock },
            { value: 'ekler', label: 'Ekler', icon: Paperclip },
            { value: 'etiketler', label: 'Etiketler', icon: Tag },
          ].map(({ value, label, icon: Icon }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 border-transparent',
                'text-surface-500 hover:text-surface-200 transition-colors',
                'data-[state=active]:text-brand-400 data-[state=active]:border-brand-500'
              )}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Form tab */}
        <Tabs.Content value="form" className="flex-1 overflow-hidden flex flex-col focus:outline-none">
          <ScrollArea.Root className="flex-1 h-full w-full">
            <ScrollArea.Viewport className="h-full w-full [&>div]:!block p-4 pb-12 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="label">Tarih</label>
                  <input type="date" className="input" value={form.tarih || ''} onChange={e => handleChange('tarih', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="label">Kurum</label>
                <input list="kurum-list" className="input" value={form.kurum || ''} onChange={e => handleChange('kurum', e.target.value)} placeholder="Kurum adı…" />
                <datalist id="kurum-list">
                  {uniqueKurumlar.map(k => <option key={k} value={k} />)}
                </datalist>
              </div>

              <div>
                <label className="label">Klasör</label>
                <input list="klasor-list" className="input" value={form.klasor || ''} onChange={e => handleChange('klasor', e.target.value)} placeholder="Proje klasörü…" />
                <datalist id="klasor-list">
                  {uniqueKlasorler.map(k => <option key={k} value={k} />)}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Tip Select */}
                <div>
                  <label className="label">Tip</label>
                  <Select.Root value={form.tip || 'gelen'} onValueChange={v => handleChange('tip', v)}>
                    <Select.Trigger className="input flex items-center justify-between">
                      <Select.Value />
                      <Select.Icon><ChevronDown className="w-3.5 h-3.5 text-surface-400" /></Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content className="bg-surface-800 border border-surface-700 rounded-lg shadow-card p-1 z-50 animate-scale-in">
                        <Select.Viewport>
                          {TIPLER.map(t => (
                            <Select.Item key={t} value={t} className="flex items-center gap-2 px-3 py-2 text-xs text-surface-200 rounded hover:bg-surface-700 cursor-pointer outline-none data-[highlighted]:bg-surface-700">
                              <Select.ItemIndicator><Check className="w-3 h-3 text-brand-400" /></Select.ItemIndicator>
                              <Select.ItemText>{TIP_LABELS[t]}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>

                {/* Durum Select */}
                <div>
                  <label className="label">Durum</label>
                  <Select.Root value={form.durum || 'beklemede'} onValueChange={v => handleChange('durum', v)}>
                    <Select.Trigger className="input flex items-center justify-between">
                      <Select.Value />
                      <Select.Icon><ChevronDown className="w-3.5 h-3.5 text-surface-400" /></Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content className="bg-surface-800 border border-surface-700 rounded-lg shadow-card p-1 z-50 animate-scale-in">
                        <Select.Viewport>
                          {DURUMLAR.map(d => (
                            <Select.Item key={d} value={d} className="flex items-center gap-2 px-3 py-2 text-xs text-surface-200 rounded hover:bg-surface-700 cursor-pointer outline-none data-[highlighted]:bg-surface-700">
                              <Select.ItemIndicator><Check className="w-3 h-3 text-brand-400" /></Select.ItemIndicator>
                              <Select.ItemText>{DURUM_LABELS[d]}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>
              </div>

              <div>
                <label className="label">Açıklama</label>
                <textarea
                  className="input resize-none h-20"
                  value={form.aciklama || ''}
                  onChange={e => handleChange('aciklama', e.target.value)}
                  placeholder="Açıklama yazın…"
                />
              </div>

              <div>
                <label className="label">Notlar</label>
                <textarea
                  className="input resize-none h-28"
                  value={form.notlar || ''}
                  onChange={e => handleChange('notlar', e.target.value)}
                  placeholder="İç notlar…"
                />
              </div>

              {/* Template Fields */}
              {template && template.fields && template.fields.length > 0 && (
                <div className="pt-4 border-t border-surface-700/50 mt-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{template.icon || '📄'}</span>
                    <p className="text-xs font-semibold text-surface-400 uppercase tracking-wide">{template.name} Detayları</p>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {template.fields.map(field => {
                      const widthClass = { sm: 'col-span-1', md: 'col-span-2', lg: 'col-span-3', full: 'col-span-4' }[field.width || 'md'] || 'col-span-2';
                      return (
                        <div key={field.key} className={widthClass}>
                          <label className="label">
                            {field.label}
                            {field.required && <span className="text-rose-400 ml-0.5">*</span>}
                          </label>
                          {field.type === 'select' ? (
                            <select
                              value={metadata[field.key] || ''}
                              onChange={e => updateMetadata(field.key, e.target.value)}
                              className="input h-8 text-xs w-full"
                            >
                              <option value="">Seçin…</option>
                              {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          ) : field.type === 'textarea' ? (
                            <textarea
                              value={metadata[field.key] || ''}
                              onChange={e => updateMetadata(field.key, e.target.value)}
                              className="input text-xs w-full min-h-[64px] resize-none pt-2"
                              rows={3}
                            />
                          ) : (
                            <input
                              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                              value={metadata[field.key] || ''}
                              onChange={e => updateMetadata(field.key, e.target.value)}
                              className="input h-8 text-xs w-full"
                              readOnly={field.autoIncrement}
                              placeholder={field.hint || ''}
                            />
                          )}
                          {field.hint && <p className="text-[10px] text-surface-600 mt-1 leading-tight">{field.hint}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Meta */}
              <div className="card p-3 space-y-1.5">
                <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">Meta</p>
                {[
                  ['Oluşturulma', formatDateTime(evrak.created_at)],
                  ['Güncellenme', formatDateTime(evrak.updated_at)],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-xs">
                    <span className="text-surface-500">{l}</span>
                    <span className="text-surface-300 font-mono">{v}</span>
                  </div>
                ))}
              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical">
              <ScrollArea.Thumb className="bg-surface-600/50 rounded-full" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </Tabs.Content>

        <Tabs.Content value="hareketler" className="flex-1 overflow-hidden">
          <HareketLog evrakId={evrakId} />
        </Tabs.Content>

        <Tabs.Content value="ekler" className="flex-1 overflow-hidden">
          <AttachmentsTab evrakId={evrakId} />
        </Tabs.Content>

        <Tabs.Content value="etiketler" className="flex-1 overflow-hidden">
          <EtiketlerTab evrakId={evrakId} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

function EtiketlerTab({ evrakId }: { evrakId: number }) {
  const { showToast, setDirty } = useAppStore();
  const [etiketler, setEtiketler] = useState<Etiket[]>([]);
  const [newTag, setNewTag] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');

  const load = async () => setEtiketler(await window.evraktron.db.getEtiketler(evrakId));
  useEffect(() => { load(); }, [evrakId]);

  const handleAdd = async () => {
    if (!newTag.trim()) return;
    await window.evraktron.db.addEtiket({ evrak_id: evrakId, tag: newTag.trim(), renk: newColor });
    setNewTag('');
    load();
    setDirty(true);
  };

  const handleRemove = async (id: number) => {
    await window.evraktron.db.removeEtiket(id);
    load();
    setDirty(true);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        <input
          className="input flex-1 text-xs"
          value={newTag}
          onChange={e => setNewTag(e.target.value)}
          placeholder="Yeni etiket…"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-9 h-9 rounded cursor-pointer border-0 bg-transparent" />
        <button onClick={handleAdd} className="btn-primary px-3 text-xs">Ekle</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {etiketler.map(et => (
          <span key={et.id} className="badge gap-1.5 pr-1" style={{ backgroundColor: `${et.renk}22`, color: et.renk, borderColor: `${et.renk}44` }}>
            {et.tag}
            <button onClick={() => handleRemove(et.id)} className="hover:text-rose-400 transition-colors">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {etiketler.length === 0 && <p className="text-xs text-surface-500">Etiket yok</p>}
      </div>
    </div>
  );
}
