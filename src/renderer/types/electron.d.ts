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
export interface RoutineRule {
  id: string;
  routine_id: string;
  field_name: string;
  operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'changed';
  value: string;
  logic: 'AND' | 'OR';
}

export interface RoutineAction {
  id: string;
  routine_id: string;
  action_type: 'set_field' | 'notify' | 'tag' | 'log';
  config: {
    field_name?: string;
    value?: string;
    title?: string;
    body?: string;
    tag?: string;
    renk?: string;
    text?: string;
  };
}

export interface Routine {
  id: string;
  name: string;
  is_active: number;
  created_at?: string;
  rules: RoutineRule[];
  actions: RoutineAction[];
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
  metadataFilters?: Record<string, string>;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
  limit?: number;
}

// ── Template types ─────────────────────────────────────────────────────────────

// Operatörler — alan tipine göre uygun olanlar UI'da filtrelenir
export type FieldRutinOperator =
  | 'eq'             // eşittir
  | 'neq'            // eşit değil
  | 'contains'       // içeriyorsa
  | 'not_contains'   // içermiyorsa
  | 'starts_with'    // ile başlıyorsa
  | 'gt'             // büyükse
  | 'lt'             // küçükse
  | 'gte'            // büyük veya eşit
  | 'lte'            // küçük veya eşit
  | 'date_lt_today_plus'   // son gün < bugün+N (örn: 30 gün kaldı)
  | 'date_gt_today_plus'   // tarih > bugün+N
  | 'date_eq_today'        // bugün
  | 'date_expired'         // geçmiş tarih
  | 'changed'        // değişti
  | 'is_empty'       // boş
  | 'is_not_empty';  // dolu

export type FieldRutinAksiyon =
  | 'dashboard_uyar'  // İstatistikler panelinde uyarı göster
  | 'os_bildir'       // Windows/macOS OS bildirimi
  | 'etiket_ekle'     // Evraqa etiket ekle
  | 'alan_guncelle'   // Başka bir alanı güncelle
  | 'log_ekle';       // Hareket loguna yaz

export interface FieldRutin {
  name: string;               // "30 Gün Öncesi Uyarısı"
  operator: FieldRutinOperator;
  value?: string | number;    // Koşul değeri (sayı, metin, gün sayısı)
  aksiyon: FieldRutinAksiyon;
  seviye?: 'info' | 'warn' | 'critical'; // Dashboard rengi
  // Aksiyon parametreleri
  etiket?: string;            // etiket_ekle için
  etiketRenk?: string;
  hedefAlan?: string;         // alan_guncelle için
  hedefDeger?: string;
  bildirimBaslik?: string;    // os_bildir için
  bildirimMesaj?: string;
}

// Scan sonucu — hangi evrakın hangi alanının rutini tetiklenmiş
export interface FieldRutinScanResult {
  evrak: { id: number; no: string; kurum: string; aciklama: string };
  fieldKey: string;
  fieldLabel: string;
  rutin: FieldRutin;
  value: string;
  meta?: { kalanGun?: number }; // Tarih alanları için ek bilgi
}

export interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'array' | 'json';
  itemType?: 'object' | 'string' | 'number';
  required?: boolean;
  default?: string;
  autoIncrement?: boolean;
  hint?: string;
  options?: string[];
  width?: 'sm' | 'md' | 'lg' | 'full';
  subFields?: TemplateField[];
  rutinler?: FieldRutin[];     // Alan bazlı kurallar / rutinler
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
    open: (filePath: string) => Promise<{ success: boolean; filePath?: string; manifest?: Manifest; isDataFile?: boolean; error?: string }>;
    openDialog: () => Promise<{ success: boolean; filePath?: string; manifest?: Manifest; error?: string }>;
    save: () => Promise<{ success: boolean; savedAt?: string; filePath?: string; error?: string }>;
    saveAs: () => Promise<{ success: boolean; filePath?: string; error?: string }>;
    readText: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
    writeText: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
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
    getRoutines: () => Promise<Routine[]>;
    saveRoutine: (routine: Routine) => Promise<boolean>;
    deleteRoutine: (id: string) => Promise<boolean>;
    scanFieldRutins: () => Promise<FieldRutinScanResult[]>;
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
    previewBulkExcel: (templateId: string) => Promise<{ success: boolean; filePath?: string; fileName?: string; totalRows?: number; canceled?: boolean; error?: string }>;
    executeBulkExcel: (templateId: string, filePath: string) => Promise<BulkImportResult>;
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
  updater: {
    check: () => Promise<{ success: boolean; error?: string; result?: any }>;
    quitAndInstall: () => Promise<{ success: boolean; error?: string }>;
    setSimulatedVersion: (version: string) => Promise<boolean>;
    onStatus: (cb: (data: { status: string; version?: string; error?: string; info?: any }) => void) => () => void;
  };
  appVersion: () => Promise<string>;
}

declare global {
  interface Window {
    evraktron: ElectronAPI;
  }
}
