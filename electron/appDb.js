import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let appDb = null;

export function getAppDb() {
  if (appDb) return appDb;

  const dbPath = path.join(app.getPath('userData'), 'templates.sqlite');
  appDb = new Database(dbPath);
  appDb.pragma('journal_mode = WAL');

  appDb.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT,
      icon        TEXT DEFAULT '📄',
      color       TEXT DEFAULT '#3b82f6',
      definition  TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed default "Ruhsat" template if empty
  const count = appDb.prepare('SELECT COUNT(*) as c FROM templates').get().c;
  if (count === 0) {
    seedDefaultTemplates(appDb);
  }

  return appDb;
}

function seedDefaultTemplates(db) {
  const ruhsat = {
    id: 'ruhsat',
    name: 'Ruhsat Takibi',
    description: 'Belediye ruhsat işlemleri için evrak takip şablonu',
    icon: '🏛️',
    color: '#3b82f6',
    numbering: {
      pattern: '{YIL}-R-{YIL_SIRA_NO:04d}',
      autoIncrement: true,
      resetPerYear: true,
      yearField: 'yil',
      seqField: 'yil_sira_no',
    },
    fields: [
      { key: 'yil',          label: 'Yıl',              type: 'number', required: true, default: '$CURRENT_YEAR', width: 'sm' },
      { key: 'yil_sira_no',  label: 'Yıldaki Sıra No',  type: 'number', required: true, autoIncrement: true,      width: 'sm' },
      { key: 'genel_dosya_no', label: 'Genel Dosya No', type: 'text',   required: true,                           width: 'md' },
      { key: 'basvuran',     label: 'Başvuran Ad/Ünvan', type: 'text',   required: true,                           width: 'lg' },
      { key: 'ruhsat_turu',  label: 'Ruhsat Türü',       type: 'select', required: true,
        options: ['İşyeri Açma', 'Yapı Ruhsatı', 'İskân', 'Tadilat', 'Diğer'],                                    width: 'md' },
      { key: 'parsel_no',    label: 'Parsel No',          type: 'text',                                             width: 'sm' },
      { key: 'ada_no',       label: 'Ada No',             type: 'text',                                             width: 'sm' },
      { key: 'adres',        label: 'Adres',              type: 'textarea',                                          width: 'full' },
    ],
    defaultTip: 'gelen',
    defaultDurum: 'beklemede',
    statusFlow: ['beklemede', 'islemde', 'onaylandi', 'reddedildi', 'tamamlandi'],
  };

  const yazisma = {
    id: 'yazisma',
    name: 'Yazışma Takibi',
    description: 'Resmi yazışma ve iç yazışma takip şablonu',
    icon: '✉️',
    color: '#8b5cf6',
    numbering: {
      pattern: '{YIL}-Y-{SIRA_NO:04d}',
      autoIncrement: true,
      resetPerYear: true,
      yearField: 'yil',
      seqField: 'sira_no',
    },
    fields: [
      { key: 'yil',       label: 'Yıl',              type: 'number', required: true, default: '$CURRENT_YEAR', width: 'sm' },
      { key: 'sira_no',   label: 'Sıra No',          type: 'number', required: true, autoIncrement: true,      width: 'sm' },
      { key: 'konu',      label: 'Konu',             type: 'text',   required: true,                           width: 'lg' },
      { key: 'gonderen',  label: 'Gönderen',         type: 'text',   required: true,                           width: 'md' },
      { key: 'alici',     label: 'Alıcı',            type: 'text',   required: true,                           width: 'md' },
      { key: 'evrak_tarihi', label: 'Evrak Tarihi',  type: 'date',   required: true,                           width: 'sm' },
      { key: 'gizlilik', label: 'Gizlilik Derecesi', type: 'select',
        options: ['Normal', 'Gizli', 'Çok Gizli'],                                                               width: 'sm' },
    ],
    defaultTip: 'gelen',
    defaultDurum: 'beklemede',
    statusFlow: ['beklemede', 'islemde', 'iletildi', 'yanitlandi', 'tamamlandi'],
  };

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO templates (id, name, description, icon, color, definition)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(ruhsat.id, ruhsat.name, ruhsat.description, ruhsat.icon, ruhsat.color, JSON.stringify(ruhsat));
  stmt.run(yazisma.id, yazisma.name, yazisma.description, yazisma.icon, yazisma.color, JSON.stringify(yazisma));
}
