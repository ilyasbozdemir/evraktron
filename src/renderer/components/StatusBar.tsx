import React from 'react';
import { useAppStore } from '../store/appStore';
import { formatDate, formatDateTime } from '../lib/utils';
import { FileText, Folder, HardDrive, Clock } from 'lucide-react';

export function StatusBar() {
  const { filePath, fileName, lastSaved, evraklar, isDirty, isFileOpen } = useAppStore();

  if (!isFileOpen) return (
    <div className="h-6 bg-surface-950 border-t border-surface-700/30 flex items-center px-4">
      <span className="text-xs text-surface-600">Dosya açık değil</span>
    </div>
  );

  return (
    <div className="h-6 bg-surface-950 border-t border-surface-700/30 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-surface-500">
          <FileText className="w-3 h-3" />
          <span className="font-mono text-surface-400 max-w-[300px] truncate">{filePath}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-surface-500">
          <HardDrive className="w-3 h-3" />
          <span>{evraklar.length} kayıt</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {isDirty && (
          <span className="text-xs text-amber-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Kaydedilmemiş değişiklikler
          </span>
        )}
        {lastSaved && (
          <div className="flex items-center gap-1.5 text-xs text-surface-500">
            <Clock className="w-3 h-3" />
            <span>Son kayıt: {formatDateTime(lastSaved)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
