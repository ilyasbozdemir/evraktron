import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { TemplateField } from '../types/electron.d';

interface JsonFieldEditorProps {
  field: TemplateField;
  value: string;
  onChange: (value: string) => void;
}

export function JsonFieldEditor({ field, value, onChange }: JsonFieldEditorProps) {
  const subFields = field.subFields || [];
  
  let items: any[] = [];
  try {
    items = value ? JSON.parse(value) : [];
    if (!Array.isArray(items)) items = [];
  } catch {
    items = [];
  }

  const handleAdd = () => {
    const newItem: any = {};
    subFields.forEach(sf => {
      newItem[sf.key] = sf.default || '';
    });
    onChange(JSON.stringify([...items, newItem]));
  };

  const handleRemove = (index: number) => {
    const next = [...items];
    next.splice(index, 1);
    onChange(JSON.stringify(next));
  };

  const handleChange = (index: number, subKey: string, val: string) => {
    const next = [...items];
    next[index] = { ...next[index], [subKey]: val };
    onChange(JSON.stringify(next));
  };

  return (
    <div className="space-y-2 border border-surface-700/50 rounded-xl p-3 bg-surface-900/30">
      {items.length === 0 && <p className="text-[11px] text-surface-500 text-center py-2">Henüz kayıt eklenmedi.</p>}
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 p-2 border border-surface-700 bg-surface-800 rounded-lg relative group">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {subFields.map(sf => (
              <div key={sf.key}>
                <label className="text-[10px] text-surface-400 mb-0.5 block">{sf.label}</label>
                {sf.type === 'select' ? (
                  <select
                    value={item[sf.key] || ''}
                    onChange={e => handleChange(i, sf.key, e.target.value)}
                    className="input h-7 text-xs w-full bg-surface-900"
                  >
                    <option value="">Seçin…</option>
                    {(sf.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : sf.type === 'textarea' ? (
                  <textarea
                    value={item[sf.key] || ''}
                    onChange={e => handleChange(i, sf.key, e.target.value)}
                    className="input text-xs w-full min-h-[48px] resize-none pt-1.5 bg-surface-900"
                    rows={2}
                    placeholder={sf.hint || sf.label}
                  />
                ) : (
                  <input
                    type={sf.type === 'number' ? 'number' : sf.type === 'date' ? 'date' : 'text'}
                    value={item[sf.key] || ''}
                    onChange={e => handleChange(i, sf.key, e.target.value)}
                    className="input h-7 text-xs w-full bg-surface-900"
                    placeholder={sf.hint || sf.label}
                  />
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => handleRemove(i)}
            className="text-surface-500 hover:text-rose-400 p-1.5 rounded hover:bg-surface-700 mt-[18px] shrink-0 transition-colors"
            title="Kaldır"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="btn-ghost w-full h-8 text-xs text-brand-400 hover:bg-brand-500/10 border border-dashed border-brand-500/30 gap-1.5"
      >
        <Plus className="w-3.5 h-3.5" />
        Yeni {field.label} Ekle
      </button>
    </div>
  );
}
