import React, { useEffect, useState } from 'react';
import { X, Search, FileText, Upload, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../store/appStore';

import type { EvrakTemplate, TemplateField, EvrakTip, EvrakDurum } from '../types/electron.d';

interface NewEvrakModalProps {
  onClose: () => void;
  onCreated: (evrakId: number) => void;
}

export function NewEvrakModal({ onClose, onCreated }: NewEvrakModalProps) {
  const [templates, setTemplates] = useState<EvrakTemplate[]>([]);
  const [selected, setSelected] = useState<EvrakTemplate | null>(null);
  const [step, setStep] = useState<'pick' | 'fill'>('pick');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ totalImported: number; totalErrors: number; sheetResults?: { sheet: string; imported: number; errors: number }[] } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    window.evraktron.template.list().then(setTemplates);
  }, []);

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectTemplate = async (t: EvrakTemplate) => {
    setSelected(t);
    // Pre-fill defaults + auto-increment
    const year = new Date().getFullYear();
    const defaults: Record<string, string> = {};

    const ayarlar = useAppStore.getState().ayarlar;

    for (const field of t.fields) {
      if (field.default === '$CURRENT_YEAR') defaults[field.key] = String(year);
      else if (field.key === 'kurum' && ayarlar.kurum_adi) defaults[field.key] = ayarlar.kurum_adi;
      else if (field.key === 'birim' && ayarlar.varsayilan_birim) defaults[field.key] = ayarlar.varsayilan_birim;
      else if (field.default) defaults[field.key] = field.default;
      else defaults[field.key] = '';
    }

    // Get next sequence number logic removed by user request
    setFormData(defaults);
    setStep('fill');
  };

  const handleFieldChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleCreate = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const meta: Record<string, string> = { __template_id: selected.id };
      
      // Always save numbering fields to metadata so sequence generator can find them later
      if (selected.numbering?.yearField && formData[selected.numbering.yearField]) {
        meta[selected.numbering.yearField] = formData[selected.numbering.yearField];
      }
      if (selected.numbering?.seqField && formData[selected.numbering.seqField]) {
        meta[selected.numbering.seqField] = formData[selected.numbering.seqField];
      }

      for (const field of selected.fields) {
        meta[field.key] = formData[field.key] || '';
      }

      const siraNo = formData['dosya_no'] || formData['yil_sira_no'] || formData['sira_no'];
      if (!siraNo) {
        useAppStore.getState().showToast('Lütfen Dosya / Sıra Numarasını giriniz!', 'error');
        setLoading(false);
        return;
      }
      const docNo = siraNo;

      const ayarlar = useAppStore.getState().ayarlar;

      const evrak = await window.evraktron.db.createEvrak({
        no: docNo,
        tip: (formData['tip'] || selected.defaultTip || 'ic') as EvrakTip,
        kurum: formData['kurum'] ?? ayarlar.kurum_adi ?? '',
        birim: formData['birim'] ?? ayarlar.varsayilan_birim ?? '',
        tarih: formData['tarih'] || new Date().toISOString().split('T')[0],
        durum: (formData['durum'] || selected.defaultDurum || 'beklemede') as EvrakDurum,
        aciklama: formData['aciklama'] || '',
        klasor: formData['klasor'] || '',
        raf_no: formData['raf_no'] || '',
        metadata: JSON.stringify(meta),
      });

      onCreated(evrak.id);
      onClose();
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('UNIQUE constraint failed')) {
        useAppStore.getState().showToast('Bu dosya numarası zaten kullanımda! Başka bir numara girin.', 'error');
      } else {
        useAppStore.getState().showToast('Evrak oluşturulurken hata oluştu.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImportExcel = async () => {
    if (!selected) return;
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const result = await window.evraktron.template.bulkImportExcel(selected.id);
      if (result.success) setBulkResult(result);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkImportJson = async () => {
    if (!selected) return;
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const result = await window.evraktron.template.bulkImportJson(selected.id);
      if (result.success) setBulkResult(result);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDownloadBlank = async () => {
    if (!selected) return;
    await window.evraktron.template.exportBlankExcel(selected.id);
  };

  const widthClass = (w?: string) => ({
    sm: 'col-span-1',
    md: 'col-span-2',
    lg: 'col-span-3',
    full: 'col-span-4',
  }[w || 'md'] || 'col-span-2');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
          <div>
            <h2 className="text-base font-semibold text-surface-100">
              {step === 'pick' ? 'Şablon Seç' : `${selected?.icon} ${selected?.name}`}
            </h2>
            {step === 'fill' && <p className="text-xs text-surface-500 mt-0.5">{selected?.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {step === 'fill' && (
              <>
                <button
                  onClick={() => setBulkMode(m => !m)}
                  className={cn('btn-ghost text-xs gap-1.5', bulkMode && 'text-brand-400')}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Toplu İçe Aktar
                </button>
                <div className="w-px h-5 bg-surface-700" />
              </>
            )}
            {step === 'fill' && (
              <button onClick={() => { setStep('pick'); setBulkMode(false); setBulkResult(null); }} className="btn-ghost text-xs">
                ← Geri
              </button>
            )}
            <button onClick={onClose} className="btn-ghost p-1.5 h-7 w-7">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step: Pick template */}
        {step === 'pick' && (
          <div className="flex flex-col flex-1 overflow-hidden p-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Şablon ara…"
                className="input pl-9 h-8 text-xs w-full"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 content-start">
              {filtered.length === 0 && (
                <div className="col-span-2 flex flex-col items-center justify-center gap-2 py-12 text-surface-500">
                  <FileText className="w-8 h-8 opacity-30" />
                  <p className="text-sm">Şablon bulunamadı</p>
                </div>
              )}
              {filtered.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTemplate(t)}
                  className="text-left p-4 rounded-xl border border-surface-700 hover:border-surface-500 hover:bg-surface-800 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                      style={{ background: (t.color || '#3b82f6') + '22', border: `1px solid ${t.color || '#3b82f6'}44` }}
                    >
                      {t.icon || '📄'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-surface-100 group-hover:text-white">{t.name}</p>
                      {t.description && <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">{t.description}</p>}
                      <p className="text-xs text-surface-600 mt-1">{t.fields.length} alan</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Fill form */}
        {step === 'fill' && selected && !bulkMode && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-4 gap-3">
                {selected.fields.map(field => (
                  <div key={field.key} className={widthClass(field.width)}>
                    <label className="block text-xs font-medium text-surface-400 mb-1.5">
                      {field.label}
                      {field.required && <span className="text-rose-400 ml-0.5">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={formData[field.key] || ''}
                        onChange={e => handleFieldChange(field.key, e.target.value)}
                        className="input h-8 text-xs w-full"
                      >
                        <option value="">Seçin…</option>
                        {(field.options || []).map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={formData[field.key] || ''}
                        onChange={e => handleFieldChange(field.key, e.target.value)}
                        className="input text-xs w-full min-h-[64px] resize-none pt-2"
                        rows={3}
                      />
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                        value={formData[field.key] || ''}
                        onChange={e => handleFieldChange(field.key, e.target.value)}
                        className="input h-8 text-xs w-full"
                        readOnly={field.autoIncrement}
                        placeholder={field.hint || ''}
                      />
                    )}
                    {field.hint && (
                      <p className="text-[10px] text-surface-600 mt-1 leading-tight">{field.hint}</p>
                    )}
                  </div>
                ))}
              </div>


            </div>

            <div className="p-4 border-t border-surface-700 flex justify-end gap-2">
              <button onClick={onClose} className="btn-ghost">İptal</button>
              <button onClick={handleCreate} disabled={loading} className="btn-primary gap-2">
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Evrak Oluştur
              </button>
            </div>
          </div>
        )}

        {/* Bulk Import Mode */}
        {step === 'fill' && selected && bulkMode && (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            <p className="text-sm text-surface-400">
              <strong className="text-surface-200">{selected.name}</strong> şablonunu kullanarak toplu evrak içe aktarabilirsiniz.
            </p>

            {/* Download blank */}
            <div className="p-4 rounded-xl border border-surface-700 bg-surface-800">
              <p className="text-xs font-medium text-surface-300 mb-1">1. Boş şablon indir</p>
              <p className="text-xs text-surface-500 mb-3">Excel şablonunu indirip doldurarak import edin.</p>
              <button onClick={handleDownloadBlank} className="btn-ghost text-xs gap-1.5">
                <Download className="w-3.5 h-3.5" />
                Excel Şablonu İndir
              </button>
            </div>

            {/* Import buttons */}
            <div className="p-4 rounded-xl border border-surface-700 bg-surface-800">
              <p className="text-xs font-medium text-surface-300 mb-3">2. Dolu dosyayı yükle</p>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkImportExcel}
                  disabled={bulkLoading}
                  className="btn-primary text-xs gap-1.5 flex-1 justify-center"
                >
                  {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Excel'den İçe Aktar
                </button>
                <button
                  onClick={handleBulkImportJson}
                  disabled={bulkLoading}
                  className="btn-ghost text-xs gap-1.5 flex-1 justify-center"
                >
                  {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  JSON'dan İçe Aktar
                </button>
              </div>
            </div>

            {/* Result */}
            {bulkResult && (
              <div className={cn(
                'p-4 rounded-xl border',
                bulkResult.totalErrors === 0
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : 'border-amber-500/30 bg-amber-500/10'
              )}>
                <div className="flex items-center gap-2 mb-2">
                  {bulkResult.totalErrors === 0
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    : <AlertCircle className="w-4 h-4 text-amber-400" />
                  }
                  <p className="text-sm font-medium text-surface-200">İçe Aktarma Tamamlandı</p>
                </div>
                <p className="text-xs text-surface-400">
                  ✅ {bulkResult.totalImported} evrak aktarıldı
                  {bulkResult.totalErrors > 0 && ` · ⚠️ ${bulkResult.totalErrors} hata`}
                </p>
                {bulkResult.sheetResults && bulkResult.sheetResults.length > 1 && (
                  <div className="mt-2 space-y-1">
                    {bulkResult.sheetResults.map(s => (
                      <p key={s.sheet} className="text-xs text-surface-500">
                        Sayfa <strong>{s.sheet}</strong>: {s.imported} aktarıldı{s.errors > 0 && `, ${s.errors} hata`}
                      </p>
                    ))}
                  </div>
                )}
                <button onClick={() => { setBulkMode(false); onClose(); }} className="mt-3 btn-ghost text-xs">
                  Kapat
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
