import React, { useEffect, useState } from 'react';
import {
  Plus, Trash2, Download, Upload, X,
  GripVertical, ChevronDown, ChevronUp, Save, Loader2, AlertCircle, Store
} from 'lucide-react';
import { cn } from '../lib/utils';
import { TemplateStoreModal } from './TemplateStoreModal';

interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'json';
  required?: boolean;
  default?: string;
  autoIncrement?: boolean;
  options?: string[];
  width?: 'sm' | 'md' | 'lg' | 'full';
  hint?: string;
  subFields?: TemplateField[];
}

interface EvrakTemplate {
  id?: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  fields: TemplateField[];
  numbering?: {
    pattern?: string;
    autoIncrement?: boolean;
    resetPerYear?: boolean;
    yearField?: string;
    seqField?: string;
  };
  defaultTip?: string;
  defaultDurum?: string;
}

const EMPTY_TEMPLATE: EvrakTemplate = {
  name: '',
  description: '',
  icon: '📄',
  color: '#3b82f6',
  fields: [],
  numbering: { pattern: '{SIRA_NO:04d}', autoIncrement: true, resetPerYear: false },
  defaultTip: 'gelen',
  defaultDurum: 'beklemede',
};

const EMPTY_FIELD: TemplateField = {
  key: '',
  label: '',
  type: 'text',
  required: false,
  width: 'md',
};

const ICONS = ['📄', '🏛️', '✉️', '📋', '🗂️', '📌', '🏗️', '🔑', '📝', '🧾'];
const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

interface TemplateManagerProps {
  onClose: () => void;
}

export function TemplateManager({ onClose }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<EvrakTemplate[]>([]);
  const [editing, setEditing] = useState<EvrakTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [expandedField, setExpandedField] = useState<number | null>(null);
  const [showStore, setShowStore] = useState(false);

  const load = () => window.evraktron.template.list().then(setTemplates);

  useEffect(() => { load(); }, []);

  const handleInstallFromStore = async (storeTemplate: any) => {
    await window.evraktron.template.save(storeTemplate);
    await load();
  };

  const handleNew = () => setEditing({ ...EMPTY_TEMPLATE, fields: [] });
  const handleEdit = (t: EvrakTemplate) => setEditing(JSON.parse(JSON.stringify(t)));
  const handleCancelEdit = () => { setEditing(null); setError(''); };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { setError('Şablon adı zorunludur.'); return; }
    setSaving(true);
    setError('');
    try {
      await window.evraktron.template.save(editing);
      await load();
      setEditing(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu şablonu silmek istediğinizden emin misiniz?')) return;
    await window.evraktron.template.delete(id);
    await load();
  };

  const handleImportJson = async () => {
    setImporting(true);
    try {
      const result = await window.evraktron.template.importJson();
      if (result.success) {
        await load();
        if (result.errors?.length) setError(result.errors.join('\n'));
      }
    } finally {
      setImporting(false);
    }
  };

  const handleImportExcelDef = async () => {
    if (!editing) return;
    const result = await window.evraktron.template.importExcelDefinition();
    if (result.success && result.fields) {
      setEditing(prev => prev ? { ...prev, fields: result.fields || [] } : prev);
    }
  };

  const handleExportJson = async () => {
    await window.evraktron.template.exportJson();
  };

  // ── Field helpers ─────────────────────────────────────────────────────────────

  const addField = () => {
    if (!editing) return;
    const f = { ...EMPTY_FIELD };
    setEditing({ ...editing, fields: [...editing.fields, f] });
    setExpandedField(editing.fields.length);
  };

  const removeField = (idx: number) => {
    if (!editing) return;
    const fields = editing.fields.filter((_, i) => i !== idx);
    setEditing({ ...editing, fields });
    setExpandedField(null);
  };

  const updateField = (idx: number, patch: Partial<TemplateField>) => {
    if (!editing) return;
    const fields = editing.fields.map((f, i) => i === idx ? { ...f, ...patch } : f);
    setEditing({ ...editing, fields });
  };

  const moveField = (idx: number, dir: -1 | 1) => {
    if (!editing) return;
    const fields = [...editing.fields];
    const target = idx + dir;
    if (target < 0 || target >= fields.length) return;
    [fields[idx], fields[target]] = [fields[target], fields[idx]];
    setEditing({ ...editing, fields });
    setExpandedField(target);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700 shrink-0">
          <h2 className="text-base font-semibold text-surface-100">Şablon Yönetimi</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleImportJson} disabled={importing} className="btn-ghost text-xs gap-1.5">
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              JSON İmport
            </button>
            <button onClick={handleExportJson} className="btn-ghost text-xs gap-1.5">
              <Download className="w-3.5 h-3.5" />
              JSON Export
            </button>
            <div className="w-px h-5 bg-surface-700" />
            <button onClick={() => setShowStore(true)} className="btn-ghost text-xs gap-1.5 text-violet-400 hover:text-violet-300">
              <Store className="w-3.5 h-3.5" />
              Mağaza
            </button>
            <button onClick={handleNew} className="btn-primary text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Yeni Şablon
            </button>
            <button onClick={onClose} className="btn-ghost p-1.5 h-7 w-7">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Template list */}
          <div className={cn('border-r border-surface-700 flex flex-col overflow-hidden', editing ? 'w-56 shrink-0' : 'flex-1')}>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {templates.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-surface-500">
                  <p className="text-sm">Henüz şablon yok.</p>
                  <button onClick={handleNew} className="btn-primary text-xs gap-1">
                    <Plus className="w-3 h-3" /> Oluştur
                  </button>
                </div>
              )}
              {templates.map(t => (
                <div
                  key={t.id}
                  onClick={() => setEditing(editing?.id === t.id ? null : JSON.parse(JSON.stringify(t)))}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all',
                    editing?.id === t.id
                      ? 'bg-brand-500/15 border border-brand-500/30'
                      : 'hover:bg-surface-800 border border-transparent'
                  )}
                >
                  <span className="text-lg">{t.icon || '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-100 truncate">{t.name}</p>
                    <p className="text-xs text-surface-500 truncate">{t.fields.length} alan</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(t.id!); }}
                      className="btn-ghost p-1 h-6 w-6 text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Editor panel */}
          {editing && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-5">

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="whitespace-pre-wrap">{error}</p>
                  </div>
                )}

                {/* Basic info */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-surface-500">Temel Bilgiler</p>

                  <div className="flex gap-3">
                    {/* Icon picker */}
                    <div>
                      <label className="block text-xs text-surface-400 mb-1.5">İkon</label>
                      <div className="flex flex-wrap gap-1 max-w-[140px]">
                        {ICONS.map(ic => (
                          <button
                            key={ic}
                            onClick={() => setEditing({ ...editing, icon: ic })}
                            className={cn('w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all',
                              editing.icon === ic ? 'bg-brand-500/20 ring-1 ring-brand-500' : 'hover:bg-surface-700')}
                          >
                            {ic}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex-1 space-y-2">
                      <div>
                        <label className="block text-xs text-surface-400 mb-1.5">Şablon Adı <span className="text-rose-400">*</span></label>
                        <input
                          type="text"
                          value={editing.name}
                          onChange={e => setEditing({ ...editing, name: e.target.value })}
                          className="input h-8 text-sm w-full"
                          placeholder="Ruhsat Takibi"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-surface-400 mb-1.5">Açıklama</label>
                        <input
                          type="text"
                          value={editing.description || ''}
                          onChange={e => setEditing({ ...editing, description: e.target.value })}
                          className="input h-8 text-xs w-full"
                          placeholder="Şablon açıklaması…"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Colors */}
                  <div>
                    <label className="block text-xs text-surface-400 mb-1.5">Renk</label>
                    <div className="flex gap-1.5">
                      {COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setEditing({ ...editing, color: c })}
                          className={cn('w-6 h-6 rounded-full transition-all', editing.color === c && 'ring-2 ring-white ring-offset-1 ring-offset-surface-900')}
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Numbering */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-surface-500">Numaralandırma</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-surface-400 mb-1.5">Pattern</label>
                      <input
                        type="text"
                        value={editing.numbering?.pattern || ''}
                        onChange={e => setEditing({ ...editing, numbering: { ...editing.numbering, pattern: e.target.value } })}
                        className="input h-8 text-xs font-mono w-full"
                        placeholder="{YIL}-R-{YIL_SIRA_NO:04d}"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-surface-400 mb-1.5">Yıl Alanı</label>
                      <input
                        type="text"
                        value={editing.numbering?.yearField || ''}
                        onChange={e => setEditing({ ...editing, numbering: { ...editing.numbering, yearField: e.target.value } })}
                        className="input h-8 text-xs w-full"
                        placeholder="yil"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-surface-400 mb-1.5">Sıra No Alanı</label>
                      <input
                        type="text"
                        value={editing.numbering?.seqField || ''}
                        onChange={e => setEditing({ ...editing, numbering: { ...editing.numbering, seqField: e.target.value } })}
                        className="input h-8 text-xs w-full"
                        placeholder="yil_sira_no"
                      />
                    </div>
                    <div className="flex items-end pb-1.5 gap-4">
                      <label className="flex items-center gap-2 text-xs text-surface-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editing.numbering?.autoIncrement ?? true}
                          onChange={e => setEditing({ ...editing, numbering: { ...editing.numbering, autoIncrement: e.target.checked } })}
                          className="rounded"
                        />
                        Oto. artır
                      </label>
                      <label className="flex items-center gap-2 text-xs text-surface-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editing.numbering?.resetPerYear ?? false}
                          onChange={e => setEditing({ ...editing, numbering: { ...editing.numbering, resetPerYear: e.target.checked } })}
                          className="rounded"
                        />
                        Yılda sıfırla
                      </label>
                    </div>
                  </div>
                </div>

                {/* Fields */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-surface-500">Alanlar ({editing.fields.length})</p>
                    <div className="flex gap-1.5">
                      <button onClick={handleImportExcelDef} className="btn-ghost text-xs gap-1">
                        <Upload className="w-3 h-3" /> Excel'den Yükle
                      </button>
                      <button onClick={addField} className="btn-ghost text-xs gap-1">
                        <Plus className="w-3 h-3" /> Alan Ekle
                      </button>
                    </div>
                  </div>

                  {editing.fields.length === 0 && (
                    <div className="text-center py-8 text-surface-500 text-xs border border-dashed border-surface-700 rounded-xl">
                      Henüz alan yok. "Alan Ekle" ile başlayın.
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {editing.fields.map((field, idx) => (
                      <div key={idx} className="border border-surface-700 rounded-xl overflow-hidden">
                        {/* Field header */}
                        <div
                          className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-surface-800 transition-colors"
                          onClick={() => setExpandedField(expandedField === idx ? null : idx)}
                        >
                          <GripVertical className="w-3.5 h-3.5 text-surface-600" />
                          <div className="flex-1 flex items-center gap-2 min-w-0">
                            <span className="text-xs font-medium text-surface-200 truncate">{field.label || '(adsız alan)'}</span>
                            <span className="text-xs text-surface-500 font-mono">{field.key}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-surface-700 text-surface-400">{field.type}</span>
                            {field.required && <span className="text-xs text-rose-400">*</span>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={e => { e.stopPropagation(); moveField(idx, -1); }} disabled={idx === 0} className="btn-ghost p-0.5 h-5 w-5" title="Yukarı">
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button onClick={e => { e.stopPropagation(); moveField(idx, 1); }} disabled={idx === editing.fields.length - 1} className="btn-ghost p-0.5 h-5 w-5" title="Aşağı">
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            <button onClick={e => { e.stopPropagation(); removeField(idx); }} className="btn-ghost p-0.5 h-5 w-5 text-rose-400 hover:bg-rose-500/10" title="Sil">
                              <Trash2 className="w-3 h-3" />
                            </button>
                            {expandedField === idx ? <ChevronUp className="w-3.5 h-3.5 text-surface-500" /> : <ChevronDown className="w-3.5 h-3.5 text-surface-500" />}
                          </div>
                        </div>

                        {/* Field editor */}
                        {expandedField === idx && (
                          <div className="px-4 pb-4 pt-2 border-t border-surface-700 grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-surface-400 mb-1">Anahtar (key)</label>
                              <input type="text" value={field.key} onChange={e => updateField(idx, { key: e.target.value })} className="input h-7 text-xs font-mono w-full" placeholder="alan_adi" />
                            </div>
                            <div>
                              <label className="block text-xs text-surface-400 mb-1">Etiket</label>
                              <input type="text" value={field.label} onChange={e => updateField(idx, { label: e.target.value })} className="input h-7 text-xs w-full" placeholder="Alan Adı" />
                            </div>
                            <div>
                              <label className="block text-xs text-surface-400 mb-1">Tip</label>
                              <select value={field.type} onChange={e => updateField(idx, { type: e.target.value as TemplateField['type'] })} className="input h-7 text-xs w-full">
                                <option value="text">Metin</option>
                                <option value="number">Sayı</option>
                                <option value="date">Tarih</option>
                                <option value="select">Seçim</option>
                                <option value="textarea">Uzun Metin</option>
                                <option value="checkbox">Onay Kutusu</option>
                                <option value="json">Dinamik Liste (JSON)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-surface-400 mb-1">Varsayılan</label>
                              <input type="text" value={field.default || ''} onChange={e => updateField(idx, { default: e.target.value })} className="input h-7 text-xs w-full" placeholder="$CURRENT_YEAR" />
                            </div>
                            <div>
                              <label className="block text-xs text-surface-400 mb-1">Genişlik</label>
                              <select value={field.width || 'md'} onChange={e => updateField(idx, { width: e.target.value as TemplateField['width'] })} className="input h-7 text-xs w-full">
                                <option value="sm">Küçük (1/4)</option>
                                <option value="md">Orta (2/4)</option>
                                <option value="lg">Büyük (3/4)</option>
                                <option value="full">Tam (4/4)</option>
                              </select>
                            </div>
                            <div className="flex items-end pb-1 gap-3">
                              <label className="flex items-center gap-1.5 text-xs text-surface-400 cursor-pointer">
                                <input type="checkbox" checked={field.required || false} onChange={e => updateField(idx, { required: e.target.checked })} />
                                Zorunlu
                              </label>
                              <label className="flex items-center gap-1.5 text-xs text-surface-400 cursor-pointer">
                                <input type="checkbox" checked={field.autoIncrement || false} onChange={e => updateField(idx, { autoIncrement: e.target.checked })} />
                                Oto. artır
                              </label>
                            </div>
                            {field.type === 'select' && (
                              <div className="col-span-3">
                                <label className="block text-xs text-surface-400 mb-1">Seçenekler (virgülle ayırın)</label>
                                <input
                                  type="text"
                                  value={(field.options || []).join(', ')}
                                  onChange={e => updateField(idx, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                  className="input h-7 text-xs w-full"
                                  placeholder="Seçenek 1, Seçenek 2, Seçenek 3"
                                />
                              </div>
                            )}
                            {field.type === 'json' && (
                              <div className="col-span-3">
                                <label className="block text-xs text-surface-400 mb-1">Alt Alanlar (JSON Formatında subFields Dizisi)</label>
                                <textarea
                                  value={field.subFields ? JSON.stringify(field.subFields, null, 2) : '[\n  { "key": "alan1", "label": "Alan 1", "type": "text" }\n]'}
                                  onChange={e => {
                                    try {
                                      const parsed = JSON.parse(e.target.value);
                                      updateField(idx, { subFields: parsed });
                                    } catch {
                                      // ignore invalid JSON while typing
                                    }
                                  }}
                                  className="input text-xs w-full min-h-[96px] font-mono resize-y"
                                  placeholder='[{"key": "isim", "label": "İsim", "type": "text"}]'
                                />
                                <p className="text-[10px] text-surface-500 mt-1">Geçerli bir JSON dizisi girin. Örn: <code className="bg-surface-800 px-1 rounded">[{'{"key":"no","label":"No","type":"text"}'}]</code></p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Save bar */}
              <div className="p-4 border-t border-surface-700 flex justify-end gap-2 shrink-0">
                <button onClick={handleCancelEdit} className="btn-ghost text-sm">İptal</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary text-sm gap-2">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Kaydet
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Template Store Modal */}
      {showStore && (
        <TemplateStoreModal
          installedIds={templates.map(t => t.id!).filter(Boolean)}
          onInstall={handleInstallFromStore}
          onClose={() => setShowStore(false)}
        />
      )}
    </div>
  );
}
