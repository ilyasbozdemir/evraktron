import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { Save, X, FileJson, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

interface DataEditorProps {
  filePath: string;
}

export function DataEditor({ filePath }: DataEditorProps) {
  const { showToast, setFileOpen, setDataMode } = useAppStore();
  
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fileName = filePath.split('\\').pop()?.split('/').pop() || 'Dosya';
  const isJson = filePath.endsWith('.json') || filePath.endsWith('.geojson');

  useEffect(() => {
    const loadFile = async () => {
      setIsLoading(true);
      const res = await window.evraktron.file.readText(filePath);
      if (res.success && res.content !== undefined) {
        // If it's json, try to format it nicely
        let text = res.content;
        if (isJson) {
          try {
            text = JSON.stringify(JSON.parse(text), null, 2);
          } catch (e) {
            // Not valid JSON yet, just show raw
          }
        }
        setContent(text);
      } else {
        showToast(res.error || 'Dosya okunamadı', 'error');
      }
      setIsLoading(false);
    };
    loadFile();
  }, [filePath, isJson, showToast]);

  const handleSave = async () => {
    setIsSaving(true);
    let textToSave = content;
    
    if (isJson) {
      try {
        // Validate JSON before saving
        JSON.parse(content);
      } catch (e: any) {
        showToast(`Geçersiz JSON formatı: ${e.message}`, 'error');
        setIsSaving(false);
        return;
      }
    }

    const res = await window.evraktron.file.writeText(filePath, textToSave);
    if (res.success) {
      setIsDirty(false);
      showToast('Dosya kaydedildi', 'success');
    } else {
      showToast(res.error || 'Dosya kaydedilemedi', 'error');
    }
    setIsSaving(false);
  };

  const handleClose = () => {
    if (isDirty) {
      if (!confirm('Kaydedilmemiş değişiklikler var. Çıkmak istediğinize emin misiniz?')) {
        return;
      }
    }
    // Kapat ve Welcome screen'e dön
    setDataMode(false, undefined);
    setFileOpen(false, undefined);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-900 animate-fade-in relative z-10">
      {/* Header */}
      <div className="flex-shrink-0 h-14 border-b border-surface-700/50 bg-surface-900/80 backdrop-blur-md flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <FileJson className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-surface-100 flex items-center gap-2">
              {fileName}
              {isDirty && <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" title="Kaydedilmemiş değişiklikler" />}
            </h2>
            <p className="text-[10px] text-surface-400 truncate max-w-md">{filePath}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-xs text-amber-400/80 mr-2 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Kaydedilmemiş
            </span>
          )}
          
          <button 
            onClick={handleSave} 
            disabled={!isDirty || isSaving || isLoading} 
            className="btn-primary h-8 text-xs px-4"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          
          <div className="w-px h-5 bg-surface-700/50 mx-1" />
          
          <button 
            onClick={handleClose} 
            className="btn-ghost h-8 w-8 p-0 flex items-center justify-center text-surface-400 hover:text-rose-400 hover:bg-rose-500/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative p-6 overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="h-full w-full rounded-xl border border-surface-700/50 bg-surface-950/50 shadow-inner overflow-hidden flex flex-col focus-within:border-brand-500/50 focus-within:ring-1 focus-within:ring-brand-500/50 transition-all">
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setIsDirty(true);
              }}
              spellCheck={false}
              className="flex-1 w-full bg-transparent text-surface-200 text-[13px] font-mono leading-relaxed p-4 resize-none outline-none focus:outline-none"
              placeholder="Dosya içeriği buraya gelecek..."
            />
          </div>
        )}
      </div>
    </div>
  );
}
