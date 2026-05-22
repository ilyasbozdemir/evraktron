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

  // Seed or update default templates (Ruhsat, Yazışma)
  // We use INSERT OR REPLACE inside, so it safely updates existing default templates with new fields
  seedDefaultTemplates(appDb);

  return appDb;
}

function seedDefaultTemplates(db) {
  const ruhsat = {
    id: 'ruhsat',
    name: 'Ruhsat Takibi',
    description: 'Belediye ruhsat işlemleri için evrak takip şablonu',
    icon: '🏛️',
    color: '#3b82f6',

    fields: [
      // Fiziksel Dosya Bilgileri
      { key: 'dosya_no',       label: 'Dosya No',            type: 'text',     required: true, width: 'sm', hint: 'Örn: 2026/5 veya 142' },
      { key: 'raf_no',         label: 'Raf / Dolap No',      type: 'text',     required: false, width: 'sm' },
      // Basvuru
      { key: 'ruhsat_sahibi',  label: 'Ruhsat Sahibi',      type: 'text',     required: true, width: 'lg' },
      { key: 'ruhsat_turu',    label: 'Ruhsat Turu',        type: 'select',   required: true,
        options: ['Isyeri Acma', 'Yapi Ruhsati', 'Iskan', 'Tadilat', 'Ruhsat Yenileme', 'Diger'], width: 'md' },
      { key: 'cinsi',          label: 'Cinsi',              type: 'text',     required: true,   width: 'md' },
      // Tapu/Konum
      { key: 'parsel_no',      label: 'Parsel No',          type: 'text',     required: false,                           width: 'sm' },
      { key: 'ada_no',         label: 'Ada No',             type: 'text',     required: false,                           width: 'sm' },
      { key: 'adres',          label: 'Adres',              type: 'textarea', required: false,                           width: 'full' },
    ],
    defaultTip: 'ic',
    defaultDurum: 'beklemede',
    statusFlow: ['beklemede', 'islemde', 'onaylandi', 'reddedildi', 'tamamlandi'],
  };

  const yazisma = {
    id: 'yazisma',
    name: 'Yazışma Takibi',
    description: 'Resmi yazışma ve iç yazışma takip şablonu',
    icon: '✉️',
    color: '#8b5cf6',

    fields: [
      // Fiziksel Dosya Bilgileri
      { key: 'dosya_no',       label: 'Dosya No',            type: 'text',     required: true, width: 'sm', hint: 'Örn: 2026/5 veya 142' },
      { key: 'raf_no',         label: 'Raf / Dolap No',      type: 'text',     required: false, width: 'sm' },
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
    INSERT OR REPLACE INTO templates (id, name, description, icon, color, definition)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(ruhsat.id, ruhsat.name, ruhsat.description, ruhsat.icon, ruhsat.color, JSON.stringify(ruhsat));
  stmt.run(yazisma.id, yazisma.name, yazisma.description, yazisma.icon, yazisma.color, JSON.stringify(yazisma));
}
