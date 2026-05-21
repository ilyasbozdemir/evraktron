import React from 'react';
import { useAppStore } from '../store/appStore';
import { formatDateTime } from '../lib/utils';
import { FileText, HardDrive, Clock } from 'lucide-react';

export function StatusBar() {
  const { filePath, fileName, lastSaved, evraklar, isDirty, isFileOpen } = useAppStore();

  const baseStyle: React.CSSProperties = {
    height: '24px',
    background: 'var(--bg-overlay)',
    borderTop: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: 'var(--text-muted)',
    userSelect: 'none',
  };

  if (!isFileOpen) return (
    <div style={baseStyle}>
      <span>Dosya açık değil</span>
    </div>
  );

  return (
    <div style={baseStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileText style={{ width: 12, height: 12 }} />
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--text-secondary)',
            maxWidth: 320,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {filePath ?? fileName ?? 'Yeni Dosya'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <HardDrive style={{ width: 12, height: 12 }} />
          <span>{evraklar.length} kayıt</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {isDirty && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#f59e0b', display: 'inline-block',
              animation: 'pulseSoft 2s ease-in-out infinite',
            }} />
            Kaydedilmemiş değişiklikler
          </span>
        )}
        {lastSaved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock style={{ width: 12, height: 12 }} />
            <span>Son kayıt: {formatDateTime(lastSaved)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
