// Global Electron API types exposed via contextBridge
export interface FileInfo {
  filePath: string;
  fileName: string;
  size: number;
  manifest: Manifest;
}

export interface Manifest {
  schema_version: string;
  app_version: string;
  created_at: string;
  last_modified: string;
}

export interface Evrak {
  id: number;
  no: string;
  tip: EvrakTip;
  kurum: string;
  birim?: string;
  tarih: string;
  durum: EvrakDurum;
  aciklama: string;
  notlar: string;
  klasor?: string;
  raf_no?: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
}

export type EvrakTip = 'gelen' | 'giden' | 'ic' | 'diger';
export type EvrakDurum = 'beklemede' | 'islemde' | 'tamamlandi' | 'iptal';

export interface Hareket {
  id: number;
  evrak_id: number;
  tarih: string;
  islem_tipi: string;
  kullanici: string;
  not: string;
}

export interface Ek {
  id: number;
  evrak_id: number;
  dosya_yolu: string;
  orijinal_ad: string;
  boyut: number;
  mime_type: string;
  hash: string;
}

export interface Etiket {
  id: number;
  evrak_id: number;
  tag: string;
  renk: string;
  oncelik: number;
}

export interface DbStats {
  total: number;
  byDurum: { durum: string; count: number }[];
  byTip: { tip: string; count: number }[];
  lastWeek: number;
}

export interface EvrakFilters {
  tip?: EvrakTip;
  durum?: EvrakDurum;
  kurum?: string;
  tarihStart?: string;
  tarihEnd?: string;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
  limit?: number;
}

// ── Template types ─────────────────────────────────────────────────────────────

export interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';
  required?: boolean;
  default?: string;
  autoIncrement?: boolean;
  options?: string[];
  width?: 'sm' | 'md' | 'lg' | 'full';
}

export interface TemplateNumbering {
  pattern?: string;
  autoIncrement?: boolean;
  resetPerYear?: boolean;
  yearField?: string;
  seqField?: string;
}

export interface EvrakTemplate {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  fields: TemplateField[];
  numbering?: TemplateNumbering;
  defaultTip?: string;
  defaultDurum?: string;
  statusFlow?: string[];
}

export interface BulkImportResult {
  success: boolean;
  totalImported: number;
  totalErrors: number;
  sheetResults?: { sheet: string; imported: number; errors: number }[];
  error?: string;
}

export interface TemplateImportResult {
  success: boolean;
  imported?: string[];
  errors?: string[];
  fields?: TemplateField[];
  error?: string;
}

// ── ElectronAPI ────────────────────────────────────────────────────────────────

export interface ElectronAPI {
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    onMaximized: (cb: (v: boolean) => void) => void;
  };
  file: {
    new: () => Promise<{ success: boolean; filePath?: string; manifest?: Manifest; error?: string }>;
    open: (filePath: string) => Promise<{ success: boolean; filePath?: string; manifest?: Manifest; error?: string }>;
    openDialog: () => Promise<{ success: boolean; filePath?: string; manifest?: Manifest; error?: string }>;
    save: () => Promise<{ success: boolean; savedAt?: string; filePath?: string; error?: string }>;
    saveAs: () => Promise<{ success: boolean; filePath?: string; error?: string }>;
    getInfo: () => Promise<FileInfo | null>;
    onOpenRequest: (cb: (filePath: string) => void) => void;
  };
  db: {
    getEvraklar: (filters?: EvrakFilters) => Promise<Evrak[]>;
    getEvrak: (id: number) => Promise<Evrak | null>;
    createEvrak: (data: Partial<Evrak>) => Promise<Evrak>;
    updateEvrak: (id: number, data: Partial<Evrak>) => Promise<Evrak>;
    deleteEvrak: (id: number) => Promise<boolean>;
    searchEvrak: (query: string) => Promise<Evrak[]>;
    getHareketler: (evrakId: number) => Promise<Hareket[]>;
    addHareket: (data: Partial<Hareket>) => Promise<Hareket>;
    getEkler: (evrakId: number) => Promise<Ek[]>;
    addEk: (evrakId: number, filePath: string) => Promise<Ek>;
    removeEk: (ekId: number) => Promise<boolean>;
    openEk: (ekId: number) => Promise<boolean>;
    downloadEk: (ekId: number) => Promise<boolean>;
    getEtiketler: (evrakId: number) => Promise<Etiket[]>;
    addEtiket: (data: Partial<Etiket>) => Promise<Etiket>;
    removeEtiket: (id: number) => Promise<boolean>;
    getAyarlar: () => Promise<Record<string, string>>;
    setAyar: (key: string, value: string) => Promise<boolean>;
    getStats: () => Promise<DbStats>;
  };
  template: {
    list: () => Promise<EvrakTemplate[]>;
    get: (id: string) => Promise<EvrakTemplate | null>;
    save: (template: Partial<EvrakTemplate>) => Promise<{ success: boolean; id: string }>;
    delete: (id: string) => Promise<{ success: boolean }>;
    nextNo: (templateId: string, year?: number) => Promise<{ no: string; seq: number }>;
    importJson: () => Promise<TemplateImportResult>;
    exportJson: (ids?: string[]) => Promise<{ success: boolean; filePath?: string; count?: number }>;
    importExcelDefinition: () => Promise<TemplateImportResult>;
    bulkImportExcel: (templateId: string) => Promise<BulkImportResult>;
    bulkImportJson: (templateId: string) => Promise<BulkImportResult>;
    exportBlankExcel: (templateId: string) => Promise<{ success: boolean; filePath?: string }>;
  };
  export: {
    toExcel: (filters?: EvrakFilters) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    toPdf: (filters?: EvrakFilters) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    toCsv: (filters?: EvrakFilters) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  };
  shell: {
    openExternal: (url: string) => Promise<void>;
    showInFolder: (filePath: string) => Promise<void>;
  };
}

declare global {
  interface Window {
    evraktron: ElectronAPI;
  }
}
