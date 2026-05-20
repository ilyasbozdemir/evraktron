import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { Upload, Paperclip, Download, Eye, Trash2, File, Image, FileText } from 'lucide-react';
import type { Ek } from '../types/electron.d';
import { useAppStore } from '../store/appStore';
import { cn, formatBytes, formatDate } from '../lib/utils';

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType === 'application/pdf') return FileText;
  return File;
}

export function AttachmentsTab({ evrakId }: { evrakId: number }) {
  const { showToast, setDirty } = useAppStore();
  const [ekler, setEkler] = useState<Ek[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setEkler(await window.evraktron.db.getEkler(evrakId));
  }, [evrakId]);

  useEffect(() => { load(); }, [load]);

  const addFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    for (const f of arr) {
      await window.evraktron.db.addEk(evrakId, (f as any).path);
    }
    await load();
    setDirty(true);
    showToast(`${arr.length} dosya eklendi`, 'success');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const handleOpen = async (id: number) => {
    const ok = await window.evraktron.db.openEk(id);
    if (!ok) showToast('Dosya açılamadı', 'error');
  };

  const handleDownload = async (id: number) => {
    await window.evraktron.db.downloadEk(id);
  };

  const handleRemove = async (id: number) => {
    await window.evraktron.db.removeEk(id);
    await load();
    setDirty(true);
    showToast('Ek kaldırıldı', 'info');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Drop zone */}
      <div
        ref={dropRef}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn('dropzone mx-4 mt-4 mb-3', isDragging && 'drag-over')}
      >
        <Upload className={cn('w-8 h-8', isDragging ? 'text-brand-400' : 'text-surface-500')} />
        <p className="text-sm font-medium">Dosyaları buraya sürükleyin</p>
        <p className="text-xs text-surface-600">PDF, görsel, Word, Excel vb. desteklenir</p>
      </div>

      {/* List */}
      <ScrollArea.Root className="flex-1">
        <ScrollArea.Viewport className="px-4 pb-4">
          {ekler.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-surface-500 gap-2">
              <Paperclip className="w-8 h-8 opacity-30" />
              <p className="text-sm">Henüz ek yok</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ekler.map(ek => {
                const Icon = getFileIcon(ek.mime_type);
                return (
                  <div key={ek.id} className="card-hover p-3 flex items-center gap-3 group">
                    <div className="w-9 h-9 rounded-lg bg-surface-700/50 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-surface-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-200 truncate">{ek.orijinal_ad}</p>
                      <p className="text-xs text-surface-500 mt-0.5">
                        {formatBytes(ek.boyut)} · {ek.mime_type}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpen(ek.id)} className="btn-ghost h-7 w-7 p-0 flex items-center justify-center" title="Aç">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDownload(ek.id)} className="btn-ghost h-7 w-7 p-0 flex items-center justify-center" title="İndir">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleRemove(ek.id)} className="btn-ghost h-7 w-7 p-0 flex items-center justify-center text-rose-400/60 hover:text-rose-400" title="Kaldır">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  );
}
