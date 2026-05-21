import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export const DURUM_LABELS: Record<string, string> = {
  beklemede: 'Beklemede', islemde: 'İşlemde',
  tamamlandi: 'Tamamlandı', iptal: 'İptal',
};

export const TIP_LABELS: Record<string, string> = {
  gelen: 'Gelen', giden: 'Giden', ic: 'Kurum İçi', diger: 'Diğer',
};

export const DURUM_COLORS: Record<string, string> = {
  beklemede: 'status-beklemede', islemde: 'status-islemde',
  tamamlandi: 'status-tamamlandi', iptal: 'status-iptal',
};

export const TIP_COLORS: Record<string, string> = {
  gelen: 'tip-gelen', giden: 'tip-giden', ic: 'tip-ic', diger: 'tip-diger',
};
