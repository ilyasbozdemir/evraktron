import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { X, Settings, Plus, Trash2, Cpu, Sparkles, AlertCircle, Save } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { cn } from '../lib/utils';
import type { Routine, RoutineRule, RoutineAction, EvrakTemplate } from '../types/electron.d';

interface AyarlarModalProps {
  onClose: () => void;
  onRefresh: () => void;
  initialTab?: 'genel' | 'rutinler';
}

const STANDARD_FIELDS = [
  { key: 'no', label: 'Evrak No' },
  { key: 'tip', label: 'Tip' },
  { key: 'durum', label: 'Durum' },
  { key: 'kurum', label: 'Kurum' },
  { key: 'birim', label: 'Birim' },
  { key: 'tarih', label: 'Tarih' },
  { key: 'aciklama', label: 'Açıklama' },
  { key: 'notlar', label: 'Notlar' },
  { key: 'klasor', label: 'Klasör' },
  { key: 'raf_no', label: 'Raf No' },
];

const PRESET_COLORS = [
  '#dc2626', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#ec4899', // Pink
];

export function AyarlarModal({ onClose, onRefresh, initialTab = 'genel' }: AyarlarModalProps) {
  const { ayarlar } = useAppStore();
  const [kurumAdi, setKurumAdi] = useState(ayarlar.kurum_adi || '');
  const [birimAdi, setBirimAdi] = useState(ayarlar.varsayilan_birim || '');
  const [isSaving, setIsSaving] = useState(false);

  // Routines state
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [templateFields, setTemplateFields] = useState<{ key: string; label: string }[]>([]);

  const allFields = [...STANDARD_FIELDS, ...templateFields];

  const loadRoutines = async () => {
    try {
      const list = await window.evraktron.db.getRoutines();
      setRoutines(list);
    } catch (e) {
      console.error('Error loading routines:', e);
    }
  };

  const loadTemplateFields = async () => {
    try {
      const templates = await window.evraktron.template.list();
      const fieldsMap = new Map();
      for (const t of templates) {
        if (t.fields) {
          for (const f of t.fields) {
            if (f.key && f.label) {
              fieldsMap.set(f.key, f.label);
            }
          }
        }
      }
      const list = Array.from(fieldsMap.entries()).map(([key, label]) => ({
        key,
        label: `${label} (${key})`,
      }));
      setTemplateFields(list);
    } catch (e) {
      console.error('Error loading template fields:', e);
    }
  };

  useEffect(() => {
    loadRoutines();
    loadTemplateFields();
  }, []);

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    try {
      await window.evraktron.db.setAyar('kurum_adi', kurumAdi);
      await window.evraktron.db.setAyar('varsayilan_birim', birimAdi);
      
      // Cleanup legacy settings
      await window.evraktron.db.setAyar('varsayilan_klasor', '');
      await window.evraktron.db.setAyar('varsayilan_meta_keys', '');
      
      onRefresh();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const handleNewRoutine = () => {
    const newRoutine: Routine = {
      id: generateId(),
      name: '',
      is_active: 1,
      rules: [
        {
          id: generateId(),
          routine_id: '',
          field_name: 'durum',
          operator: 'eq',
          value: '',
          logic: 'AND',
        },
      ],
      actions: [
        {
          id: generateId(),
          routine_id: '',
          action_type: 'log',
          config: {
            text: 'Otomasyon çalıştı.',
          },
        },
      ],
    };
    setEditingRoutine(newRoutine);
  };

  const handleSaveRoutine = async () => {
    if (!editingRoutine) return;
    if (!editingRoutine.name.trim()) {
      alert('Lütfen rutin adını girin.');
      return;
    }
    if (editingRoutine.rules.length === 0) {
      alert('Lütfen en az bir kural ekleyin.');
      return;
    }
    if (editingRoutine.actions.length === 0) {
      alert('Lütfen en az bir aksiyon ekleyin.');
      return;
    }

    try {
      const success = await window.evraktron.db.saveRoutine(editingRoutine);
      if (success) {
        await loadRoutines();
        setEditingRoutine(null);
      } else {
        alert('Rutin kaydedilirken bir hata oluştu.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRoutine = async (id: string) => {
    if (!confirm('Bu otomasyon rutinini silmek istediğinize emin misiniz?')) return;
    try {
      const success = await window.evraktron.db.deleteRoutine(id);
      if (success) {
        await loadRoutines();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleRoutine = async (routine: Routine) => {
    const updated = { ...routine, is_active: routine.is_active ? 0 : 1 };
    try {
      const success = await window.evraktron.db.saveRoutine(updated);
      if (success) {
        await loadRoutines();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateEditingRoutine = (updated: Partial<Routine>) => {
    setEditingRoutine(prev => (prev ? { ...prev, ...updated } : null));
  };

  const addRule = () => {
    if (!editingRoutine) return;
    const newRule: RoutineRule = {
      id: generateId(),
      routine_id: editingRoutine.id,
      field_name: 'durum',
      operator: 'eq',
      value: '',
      logic: 'AND',
    };
    updateEditingRoutine({ rules: [...editingRoutine.rules, newRule] });
  };

  const removeRule = (id: string) => {
    if (!editingRoutine) return;
    updateEditingRoutine({ rules: editingRoutine.rules.filter(r => r.id !== id) });
  };

  const updateRule = (ruleId: string, updatedFields: Partial<RoutineRule>) => {
    if (!editingRoutine) return;
    const nextRules = editingRoutine.rules.map(r => (r.id === ruleId ? { ...r, ...updatedFields } : r));
    updateEditingRoutine({ rules: nextRules });
  };

  const addAction = () => {
    if (!editingRoutine) return;
    const newAction: RoutineAction = {
      id: generateId(),
      routine_id: editingRoutine.id,
      action_type: 'log',
      config: { text: 'Otomasyon çalıştı.' },
    };
    updateEditingRoutine({ actions: [...editingRoutine.actions, newAction] });
  };

  const removeAction = (id: string) => {
    if (!editingRoutine) return;
    updateEditingRoutine({ actions: editingRoutine.actions.filter(a => a.id !== id) });
  };

  const updateAction = (actionId: string, updatedFields: Partial<RoutineAction>) => {
    if (!editingRoutine) return;
    const nextActions = editingRoutine.actions.map(a => (a.id === actionId ? { ...a, ...updatedFields } : a));
    updateEditingRoutine({ actions: nextActions });
  };

  const updateActionConfig = (actionId: string, key: string, val: string) => {
    if (!editingRoutine) return;
    const action = editingRoutine.actions.find(a => a.id === actionId);
    if (!action) return;
    const nextActions = editingRoutine.actions.map(a =>
      a.id === actionId
        ? {
            ...a,
            config: { ...a.config, [key]: val },
          }
        : a
    );
    updateEditingRoutine({ actions: nextActions });
  };

  const getRuleSummary = (rule: RoutineRule) => {
    const fieldObj = allFields.find(f => f.key === rule.field_name);
    const fieldName = fieldObj ? fieldObj.label : rule.field_name;
    const operatorMap: Record<string, string> = {
      eq: 'Eşittir',
      neq: 'Eşit Değildir',
      contains: 'İçerir',
      gt: 'Büyüktür',
      lt: 'Küçüktür',
      changed: 'Değiştiğinde',
    };
    const op = operatorMap[rule.operator] || rule.operator;

    if (rule.operator === 'changed' && (!rule.value || rule.value.trim() === '')) {
      return `${fieldName} alanı değiştiğinde`;
    }
    return `${fieldName} ${op} "${rule.value}"`;
  };

  const getActionSummary = (action: RoutineAction) => {
    const conf = action.config;
    switch (action.action_type) {
      case 'set_field':
        return `Alanı Güncelle: "${conf.field_name}" değerini "${conf.value}" yap`;
      case 'notify':
        return `Bildirim Göster: "${conf.title}" - "${conf.body}"`;
      case 'tag':
        return `Etiket Ekle: "${conf.tag}"`;
      case 'log':
        return `Geçmişe Kayıt Yaz: "${conf.text}"`;
      default:
        return action.action_type;
    }
  };

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-surface-900 border border-surface-700/50 shadow-2xl rounded-xl z-50 flex flex-col h-[75vh] max-h-[85vh] animate-scale-in">
          
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800 shrink-0">
            <Dialog.Title className="text-base font-semibold text-surface-50 flex items-center gap-2">
              <Settings className="w-5 h-5 text-brand-400" />
              Proje (Dosya) Ayarları
            </Dialog.Title>
            <Dialog.Close className="p-1.5 text-surface-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <Tabs.Root defaultValue={initialTab} className="flex flex-col flex-1 overflow-hidden">
            <Tabs.List className="flex gap-1 px-5 border-b border-surface-800 shrink-0 bg-surface-950/30">
              <Tabs.Trigger
                value="genel"
                className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 border-transparent text-surface-500 hover:text-surface-200 transition-colors data-[state=active]:text-brand-400 data-[state=active]:border-brand-500 focus:outline-none"
              >
                <Settings className="w-4 h-4" />
                Genel Ayarlar
              </Tabs.Trigger>
              <Tabs.Trigger
                value="rutinler"
                className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 border-transparent text-surface-500 hover:text-surface-200 transition-colors data-[state=active]:text-brand-400 data-[state=active]:border-brand-500 focus:outline-none"
              >
                <Cpu className="w-4 h-4" />
                Otomasyon Rutinleri
              </Tabs.Trigger>
            </Tabs.List>

            {/* TAB CONTENT: GENERAL SETTINGS */}
            <Tabs.Content value="genel" className="p-5 space-y-5 flex-1 overflow-y-auto focus:outline-none flex flex-col justify-between">
              <div className="space-y-5">
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

              <div className="pt-4 border-t border-surface-800 flex justify-end gap-3 shrink-0">
                <button onClick={onClose} className="btn-secondary">İptal</button>
                <button onClick={handleSaveGeneral} disabled={isSaving} className="btn-primary">
                  {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </Tabs.Content>

            {/* TAB CONTENT: AUTOMATION ROUTINES */}
            <Tabs.Content value="rutinler" className="flex-1 overflow-hidden flex flex-col focus:outline-none">
              {editingRoutine ? (
                // ──── EDITOR VIEW ────
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="p-5 space-y-5 flex-1 overflow-y-auto">
                    <div className="flex items-center gap-2 pb-2 border-b border-surface-800">
                      <Sparkles className="w-5 h-5 text-brand-400" />
                      <h3 className="text-sm font-semibold text-surface-200">
                        {editingRoutine.name ? 'Rutini Düzenle' : 'Yeni Otomasyon Rutini'}
                      </h3>
                    </div>

                    {/* Routine Name */}
                    <div>
                      <label className="label">Rutin Adı</label>
                      <input
                        className="input"
                        value={editingRoutine.name}
                        onChange={e => updateEditingRoutine({ name: e.target.value })}
                        placeholder="Örn: Ruhsat Onaylandıysa Etiketle ve Bildir"
                      />
                    </div>

                    {/* Rules Builder */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="label m-0">Kural Koşulları (Triggers)</label>
                        <button
                          onClick={addRule}
                          className="btn-ghost text-xs h-7 px-2.5 flex items-center gap-1 text-brand-400 hover:text-brand-300 hover:bg-brand-500/10"
                        >
                          <Plus className="w-3.5 h-3.5" /> Kural Ekle
                        </button>
                      </div>

                      <div className="space-y-2">
                        {editingRoutine.rules.map((rule, idx) => (
                          <div
                            key={rule.id}
                            className="flex items-center gap-2 bg-surface-950/20 p-2.5 rounded-lg border border-surface-800/40"
                          >
                            {idx > 0 ? (
                              <select
                                value={rule.logic}
                                onChange={e => updateRule(rule.id, { logic: e.target.value as 'AND' | 'OR' })}
                                className="input h-8 text-xs py-0 w-24 shrink-0 bg-surface-800 border-surface-700/50"
                              >
                                <option value="AND">VE (AND)</option>
                                <option value="OR">VEYA (OR)</option>
                              </select>
                            ) : (
                              <span className="text-xs text-surface-500 font-medium px-2 py-1 shrink-0">Eğer</span>
                            )}

                            {/* Field */}
                            <select
                              value={rule.field_name}
                              onChange={e => updateRule(rule.id, { field_name: e.target.value })}
                              className="input h-8 text-xs py-0 flex-1 min-w-[120px]"
                            >
                              {allFields.map(f => (
                                <option key={f.key} value={f.key}>{f.label}</option>
                              ))}
                            </select>

                            {/* Operator */}
                            <select
                              value={rule.operator}
                              onChange={e => updateRule(rule.id, { operator: e.target.value as any })}
                              className="input h-8 text-xs py-0 w-32 shrink-0"
                            >
                              <option value="eq">Eşittir</option>
                              <option value="neq">Eşit Değildir</option>
                              <option value="contains">İçerir</option>
                              <option value="gt">Büyüktür</option>
                              <option value="lt">Küçüktür</option>
                              <option value="changed">Değiştiğinde</option>
                            </select>

                            {/* Value (Only show if operator is not 'changed' without value) */}
                            <input
                              className="input h-8 text-xs flex-1 min-w-[100px]"
                              value={rule.value}
                              onChange={e => updateRule(rule.id, { value: e.target.value })}
                              placeholder={rule.operator === 'changed' ? 'Değiştiğinde (isteğe bağlı yeni değer)' : 'Değer...'}
                            />

                            <button
                              onClick={() => removeRule(rule.id)}
                              disabled={editingRoutine.rules.length <= 1}
                              className="p-1.5 text-surface-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions Builder */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <label className="label m-0">Aksiyonlar (Actions)</label>
                        <button
                          onClick={addAction}
                          className="btn-ghost text-xs h-7 px-2.5 flex items-center gap-1 text-brand-400 hover:text-brand-300 hover:bg-brand-500/10"
                        >
                          <Plus className="w-3.5 h-3.5" /> Aksiyon Ekle
                        </button>
                      </div>

                      <div className="space-y-3">
                        {editingRoutine.actions.map((action) => (
                          <div
                            key={action.id}
                            className="bg-surface-950/20 p-3 rounded-lg border border-surface-800/40 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-surface-400 font-semibold uppercase tracking-wider">Aksiyon</span>
                                <select
                                  value={action.action_type}
                                  onChange={e => {
                                    const type = e.target.value as any;
                                    let defaultConfig = {};
                                    if (type === 'set_field') defaultConfig = { field_name: 'durum', value: '' };
                                    if (type === 'notify') defaultConfig = { title: 'Rutin Uyarısı', body: '{{no}} nolu evrak güncellendi.' };
                                    if (type === 'tag') defaultConfig = { tag: '', renk: '#3b82f6' };
                                    if (type === 'log') defaultConfig = { text: 'Otomasyon çalıştı.' };
                                    updateAction(action.id, { action_type: type, config: defaultConfig });
                                  }}
                                  className="input h-7 text-xs py-0 w-44"
                                >
                                  <option value="set_field">Alanı Güncelle</option>
                                  <option value="notify">Bildirim Göster</option>
                                  <option value="tag">Etiket Ekle</option>
                                  <option value="log">Geçmişe Kayıt Yaz</option>
                                </select>
                              </div>
                              <button
                                onClick={() => removeAction(action.id)}
                                disabled={editingRoutine.actions.length <= 1}
                                className="p-1.5 text-surface-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Action Configurations */}
                            <div className="grid grid-cols-2 gap-3 pl-2 border-l border-surface-800">
                              {action.action_type === 'set_field' && (
                                <>
                                  <div>
                                    <label className="text-[10px] text-surface-400 uppercase font-semibold">Hedef Alan</label>
                                    <select
                                      value={action.config.field_name || 'durum'}
                                      onChange={e => updateActionConfig(action.id, 'field_name', e.target.value)}
                                      className="input h-8 text-xs py-0 mt-1"
                                    >
                                      {allFields.map(f => (
                                        <option key={f.key} value={f.key}>{f.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-surface-400 uppercase font-semibold">Yeni Değer</label>
                                    <input
                                      className="input h-8 text-xs mt-1"
                                      value={action.config.value || ''}
                                      onChange={e => updateActionConfig(action.id, 'value', e.target.value)}
                                      placeholder="Yeni değer yazın..."
                                    />
                                  </div>
                                </>
                              )}

                              {action.action_type === 'notify' && (
                                <>
                                  <div className="col-span-2">
                                    <label className="text-[10px] text-surface-400 uppercase font-semibold">Bildirim Başlığı</label>
                                    <input
                                      className="input h-8 text-xs mt-1"
                                      value={action.config.title || ''}
                                      onChange={e => updateActionConfig(action.id, 'title', e.target.value)}
                                      placeholder="Evraktron Uyarısı"
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <label className="text-[10px] text-surface-400 uppercase font-semibold">Bildirim İçeriği</label>
                                    <input
                                      className="input h-8 text-xs mt-1"
                                      value={action.config.body || ''}
                                      onChange={e => updateActionConfig(action.id, 'body', e.target.value)}
                                      placeholder="Örn: {{no}} nolu evrakın durumu {{durum}} yapıldı."
                                    />
                                    <p className="text-[10px] text-surface-500 mt-1">
                                      Şablon değişkenleri (ör. {'{{no}}'}, {'{{durum}}'}, veya custom metadata alanları) otomatik doldurulur.
                                    </p>
                                  </div>
                                </>
                              )}

                              {action.action_type === 'tag' && (
                                <>
                                  <div>
                                    <label className="text-[10px] text-surface-400 uppercase font-semibold">Etiket Metni</label>
                                    <input
                                      className="input h-8 text-xs mt-1"
                                      value={action.config.tag || ''}
                                      onChange={e => updateActionConfig(action.id, 'tag', e.target.value)}
                                      placeholder="Örn: Acil"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-surface-400 uppercase font-semibold">Renk</label>
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                      {PRESET_COLORS.map(c => (
                                        <button
                                          key={c}
                                          type="button"
                                          onClick={() => updateActionConfig(action.id, 'renk', c)}
                                          className={cn(
                                            "w-5 h-5 rounded-full border transition-transform hover:scale-110",
                                            action.config.renk === c ? "border-white scale-105" : "border-transparent"
                                          )}
                                          style={{ backgroundColor: c }}
                                        />
                                      ))}
                                      <input
                                        type="color"
                                        value={action.config.renk || '#3b82f6'}
                                        onChange={e => updateActionConfig(action.id, 'renk', e.target.value)}
                                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent shrink-0 p-0 ml-1"
                                      />
                                    </div>
                                  </div>
                                </>
                              )}

                              {action.action_type === 'log' && (
                                <div className="col-span-2">
                                  <label className="text-[10px] text-surface-400 uppercase font-semibold">Geçmiş Notu (Hareket Log)</label>
                                  <input
                                    className="input h-8 text-xs mt-1"
                                    value={action.config.text || ''}
                                    onChange={e => updateActionConfig(action.id, 'text', e.target.value)}
                                    placeholder="Örn: Evrak durumu onaylandı olarak güncellendi."
                                  />
                                  <p className="text-[10px] text-surface-500 mt-1">
                                    Şablon değişkenleri (ör. {'{{no}}'}, {'{{durum}}'}, veya custom metadata alanları) otomatik doldurulur.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Editor Actions Footer */}
                  <div className="p-4 border-t border-surface-800 bg-surface-950/50 flex justify-end gap-3 shrink-0">
                    <button onClick={() => setEditingRoutine(null)} className="btn-secondary">İptal</button>
                    <button onClick={handleSaveRoutine} className="btn-primary flex items-center gap-1.5">
                      <Save className="w-4 h-4" /> Kaydet
                    </button>
                  </div>
                </div>
              ) : (
                // ──── LIST VIEW ────
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-surface-800 shrink-0">
                    <span className="text-xs text-surface-400">
                      Projeye özel, otomatik kural ve aksiyonlar tanımlayın.
                    </span>
                    <button
                      onClick={handleNewRoutine}
                      className="btn-primary text-xs h-8 px-3 flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Yeni Rutin
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {routines.map((routine) => (
                      <div
                        key={routine.id}
                        className="bg-surface-950/20 border border-surface-800 rounded-xl p-4 space-y-3 hover:border-surface-700/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-surface-200 text-sm">{routine.name}</h4>
                            {routine.is_active ? (
                              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Aktif</span>
                            ) : (
                              <span className="text-[10px] font-semibold text-surface-400 bg-surface-700/10 border border-surface-700/20 px-2 py-0.5 rounded-full">Devre Dışı</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {/* Toggle Switch */}
                            <button
                              onClick={() => handleToggleRoutine(routine)}
                              className={cn(
                                "w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none flex items-center",
                                routine.is_active ? "bg-emerald-500 justify-end" : "bg-surface-750 justify-start"
                              )}
                              title={routine.is_active ? "Devre Dışı Bırak" : "Etkinleştir"}
                            >
                              <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                            </button>

                            <button
                              onClick={() => setEditingRoutine(routine)}
                              className="btn-ghost h-7 text-xs px-2.5 hover:text-brand-400"
                            >
                              Düzenle
                            </button>
                            <button
                              onClick={() => handleDeleteRoutine(routine.id)}
                              className="p-1 text-surface-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Visual summary of rules & actions */}
                        <div className="text-xs space-y-1.5 pl-3 border-l border-surface-800">
                          <div>
                            <span className="text-surface-500 font-semibold uppercase text-[10px] mr-1.5">Koşullar:</span>
                            <span className="text-surface-300 font-medium">
                              {routine.rules.map((r, i) => (
                                <span key={r.id}>
                                  {i > 0 && <span className="text-brand-400 font-bold mx-1.5">{r.logic}</span>}
                                  {getRuleSummary(r)}
                                </span>
                              ))}
                            </span>
                          </div>
                          <div>
                            <span className="text-surface-500 font-semibold uppercase text-[10px] mr-1.5">Aksiyonlar:</span>
                            <span className="text-surface-300 font-medium">
                              {routine.actions.map((act, i) => (
                                <span key={act.id}>
                                  {i > 0 && <span className="text-surface-500 mx-1.5">ve</span>}
                                  {getActionSummary(act)}
                                </span>
                              ))}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {routines.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-surface-800 rounded-xl space-y-3 bg-surface-950/5">
                        <AlertCircle className="w-8 h-8 text-surface-600" />
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-surface-300">Otomasyon Rutini Yok</p>
                          <p className="text-xs text-surface-500 max-w-sm">
                            Evrak oluşturulduğunda veya güncellendiğinde tetiklenecek akıllı otomasyon kuralları ekleyebilirsiniz.
                          </p>
                        </div>
                        <button
                          onClick={handleNewRoutine}
                          className="btn-primary text-xs h-8 px-3 flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> İlk Rutinini Ekle
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Tabs.Content>
          </Tabs.Root>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
