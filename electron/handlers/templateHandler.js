import { dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import { read as xlsxRead, utils as xlsxUtils, writeFile as xlsxWriteFile } from 'xlsx';
import { getAppDb } from '../appDb.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseTemplateRow(row) {
  try {
    const def = JSON.parse(row.definition);
    return { ...def, id: row.id, name: row.name, description: row.description, icon: row.icon, color: row.color };
  } catch {
    return null;
  }
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
    + '_' + Date.now().toString(36);
}

/** Compute next sequence number for a template (year-aware) */
function getNextSeqNo(db, templateId, year, seqField) {
  if (!db) return 1;
  try {
    // Parse metadata of existing evraklar that match template & year
    const rows = db.prepare('SELECT metadata FROM evraklar').all();
    let max = 0;
    for (const row of rows) {
      if (!row.metadata) continue;
      try {
        const meta = JSON.parse(row.metadata);
        if (meta.__template_id !== templateId) continue;
        if (year && meta.yil && String(meta.yil) !== String(year)) continue;
        const seq = parseInt(meta[seqField] || '0', 10);
        if (seq > max) max = seq;
      } catch { /* ignore */ }
    }
    return max + 1;
  } catch {
    return 1;
  }
}

/** Format the document number from template pattern */
function formatDocNo(pattern, meta) {
  return pattern.replace(/\{([^}:]+)(?::([^}]+))?\}/g, (_, key, fmt) => {
    const val = meta[key] ?? meta[key.toLowerCase()] ?? meta[key.toUpperCase()] ?? '';
    if (fmt && fmt.startsWith('0')) {
      const width = parseInt(fmt, 10);
      return String(val).padStart(width, '0');
    }
    return String(val);
  });
}

/** Parse Excel bulk import rows into evrak data array */
function parseExcelBulkRows(worksheet, template) {
  const rows = xlsxUtils.sheet_to_json(worksheet, { defval: '' });
  const fieldKeys = template.fields.map(f => f.key);

  return rows.map((row, idx) => {
    const meta = { __template_id: template.id };
    for (const key of fieldKeys) {
      // Try exact key match, Turkish label match, or case-insensitive
      const field = template.fields.find(f => f.key === key);
      const label = field?.label || key;
      const val = row[key] ?? row[label] ?? row[label.toLowerCase()] ?? '';
      meta[key] = String(val).trim();
    }

    return {
      no: row['no'] || row['No'] || row['Evrak No'] || String(idx + 1),
      tip: row['tip'] || row['Tip'] || template.defaultTip || 'gelen',
      kurum: row['kurum'] || row['Kurum'] || '',
      birim: row['birim'] || row['Birim'] || '',
      tarih: row['tarih'] || row['Tarih'] || new Date().toISOString().split('T')[0],
      durum: row['durum'] || row['Durum'] || template.defaultDurum || 'beklemede',
      aciklama: row['aciklama'] || row['Açıklama'] || row['acıklama'] || '',
      notlar: row['notlar'] || row['Notlar'] || '',
      klasor: row['klasor'] || row['Klasör'] || '',
      raf_no: row['raf_no'] || row['Raf No'] || '',
      metadata: JSON.stringify(meta),
    };
  }).filter(r => r.no); // skip empty rows
}

// ── Handler setup ─────────────────────────────────────────────────────────────

export function setupTemplateHandlers(ipcMain, state) {

  // List all templates
  ipcMain.handle('template:list', () => {
    const db = getAppDb();
    const rows = db.prepare('SELECT * FROM templates ORDER BY name').all();
    return rows.map(parseTemplateRow).filter(Boolean);
  });

  // Get single template
  ipcMain.handle('template:get', (_e, id) => {
    const db = getAppDb();
    const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
    return row ? parseTemplateRow(row) : null;
  });

  // Save / upsert template
  ipcMain.handle('template:save', (_e, template) => {
    const db = getAppDb();
    const id = template.id || generateId(template.name);
    const def = JSON.stringify({ ...template, id });
    db.prepare(`
      INSERT INTO templates (id, name, description, icon, color, definition)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        icon = excluded.icon,
        color = excluded.color,
        definition = excluded.definition,
        updated_at = datetime('now')
    `).run(id, template.name, template.description || '', template.icon || '📄', template.color || '#3b82f6', def);
    return { success: true, id };
  });

  // Delete template
  ipcMain.handle('template:delete', (_e, id) => {
    const db = getAppDb();
    db.prepare('DELETE FROM templates WHERE id = ?').run(id);
    return { success: true };
  });

  // Get next sequence number for auto-increment
  ipcMain.handle('template:next-no', (_e, templateId, year) => {
    const db = getAppDb();
    const row = db.prepare('SELECT definition FROM templates WHERE id = ?').get(templateId);
    if (!row) return { no: '1', seq: 1 };

    const template = JSON.parse(row.definition);
    const seqField = template.numbering?.seqField || 'sira_no';
    const seq = getNextSeqNo(state.db, templateId, year, seqField);

    const meta = { yil: year || new Date().getFullYear(), [seqField]: seq };
    const pattern = template.numbering?.pattern || '{SIRA_NO}';
    const no = formatDocNo(pattern, meta);

    return { no, seq };
  });

  // ── Import: JSON ─────────────────────────────────────────────────────────────
  ipcMain.handle('template:import-json', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Template JSON Dosyası Seç',
      filters: [{ name: 'JSON Dosyası', extensions: ['json'] }],
      properties: ['openFile', 'multiSelections'],
    });
    if (canceled || !filePaths.length) return { success: false };

    const db = getAppDb();
    const imported = [];
    const errors = [];

    for (const fp of filePaths) {
      try {
        const content = JSON.parse(fs.readFileSync(fp, 'utf-8'));
        const templates = Array.isArray(content) ? content : [content];

        for (const t of templates) {
          if (!t.name || !t.fields) { errors.push(`${path.basename(fp)}: Geçersiz format`); continue; }
          const id = t.id || generateId(t.name);
          const def = JSON.stringify({ ...t, id });
          db.prepare(`
            INSERT INTO templates (id, name, description, icon, color, definition)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name, description = excluded.description,
              icon = excluded.icon, color = excluded.color,
              definition = excluded.definition, updated_at = datetime('now')
          `).run(id, t.name, t.description || '', t.icon || '📄', t.color || '#3b82f6', def);
          imported.push(t.name);
        }
      } catch (e) {
        errors.push(`${path.basename(fp)}: ${e.message}`);
      }
    }

    return { success: true, imported, errors };
  });

  // ── Export: JSON ─────────────────────────────────────────────────────────────
  ipcMain.handle('template:export-json', async (_e, ids) => {
    const db = getAppDb();
    const query = ids?.length
      ? `SELECT * FROM templates WHERE id IN (${ids.map(() => '?').join(',')})`
      : 'SELECT * FROM templates';
    const rows = ids?.length ? db.prepare(query).all(...ids) : db.prepare(query).all();
    const templates = rows.map(r => JSON.parse(r.definition));

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Template\'leri JSON Olarak Dışa Aktar',
      defaultPath: 'evraktron-templates.json',
      filters: [{ name: 'JSON Dosyası', extensions: ['json'] }],
    });
    if (canceled || !filePath) return { success: false };

    fs.writeFileSync(filePath, JSON.stringify(templates, null, 2), 'utf-8');
    return { success: true, filePath, count: templates.length };
  });

  // ── Import: Excel (Template definition) ──────────────────────────────────────
  // Excel'den bir template TANIMI yükle (alan listesi olarak)
  ipcMain.handle('template:import-excel-definition', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Template Tanımı Excel Dosyası Seç',
      filters: [{ name: 'Excel Dosyası', extensions: ['xlsx', 'xls'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths.length) return { success: false };

    try {
      const wb = xlsxRead(fs.readFileSync(filePaths[0]));
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = xlsxUtils.sheet_to_json(ws, { defval: '' });

      const fields = rows.map(row => ({
        key: String(row['key'] || row['Anahtar'] || '').trim().replace(/\s+/g, '_'),
        label: String(row['label'] || row['Etiket'] || row['Ad'] || '').trim(),
        type: String(row['type'] || row['Tip'] || 'text').trim().toLowerCase(),
        required: ['true', '1', 'evet', 'yes'].includes(String(row['required'] || row['Zorunlu'] || '').toLowerCase()),
        default: String(row['default'] || row['Varsayılan'] || '').trim(),
        options: String(row['options'] || row['Seçenekler'] || '').split(',').map(s => s.trim()).filter(Boolean),
        width: String(row['width'] || row['Genişlik'] || 'md').trim(),
      })).filter(f => f.key && f.label);

      return { success: true, fields };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // ── Bulk Import: Excel rows → evraklar (using a template) ────────────────────
  ipcMain.handle('template:bulk-import-excel', async (_e, templateId) => {
    if (!state.db) return { success: false, error: 'Açık dosya yok' };

    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Toplu Evrak Excel Dosyası Seç',
      filters: [{ name: 'Excel Dosyası', extensions: ['xlsx', 'xls'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths.length) return { success: false };

    // Load template
    const appDbInst = getAppDb();
    const tmplRow = appDbInst.prepare('SELECT * FROM templates WHERE id = ?').get(templateId);
    if (!tmplRow) return { success: false, error: 'Template bulunamadı' };
    const template = JSON.parse(tmplRow.definition);

    try {
      const wb = xlsxRead(fs.readFileSync(filePaths[0]));

      let totalImported = 0;
      let totalErrors = 0;
      const sheetResults = [];

      const insert = state.db.prepare(`
        INSERT INTO evraklar (no, tip, kurum, birim, tarih, durum, aciklama, notlar, klasor, raf_no, metadata)
        VALUES (@no, @tip, @kurum, @birim, @tarih, @durum, @aciklama, @notlar, @klasor, @raf_no, @metadata)
      `);
      const addHareket = state.db.prepare(`
        INSERT INTO hareketler (evrak_id, islem_tipi, kullanici, "not")
        VALUES (?, 'olusturuldu', 'Toplu Import', 'Excel\'den toplu olarak içe aktarıldı')
      `);

      const bulkInsert = state.db.transaction((rows) => {
        let ok = 0, err = 0;
        for (const row of rows) {
          try {
            const res = insert.run(row);
            addHareket.run(res.lastInsertRowid);
            ok++;
          } catch (e) {
            console.error('Bulk insert row error:', e.message);
            err++;
          }
        }
        return { ok, err };
      });

      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const evrakRows = parseExcelBulkRows(ws, template);
        if (evrakRows.length === 0) continue;

        const { ok, err } = bulkInsert(evrakRows);
        totalImported += ok;
        totalErrors += err;
        sheetResults.push({ sheet: sheetName, imported: ok, errors: err });
      }

      return { success: true, totalImported, totalErrors, sheetResults };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // ── Bulk Import: JSON array → evraklar ───────────────────────────────────────
  ipcMain.handle('template:bulk-import-json', async (_e, templateId) => {
    if (!state.db) return { success: false, error: 'Açık dosya yok' };

    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Toplu Evrak JSON Dosyası Seç',
      filters: [{ name: 'JSON Dosyası', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths.length) return { success: false };

    const appDbInst = getAppDb();
    const tmplRow = appDbInst.prepare('SELECT * FROM templates WHERE id = ?').get(templateId);
    if (!tmplRow) return { success: false, error: 'Template bulunamadı' };
    const template = JSON.parse(tmplRow.definition);

    try {
      const data = JSON.parse(fs.readFileSync(filePaths[0], 'utf-8'));
      const rows = Array.isArray(data) ? data : (data.evraklar || []);

      const insert = state.db.prepare(`
        INSERT INTO evraklar (no, tip, kurum, birim, tarih, durum, aciklama, notlar, klasor, raf_no, metadata)
        VALUES (@no, @tip, @kurum, @birim, @tarih, @durum, @aciklama, @notlar, @klasor, @raf_no, @metadata)
      `);
      const addHareket = state.db.prepare(`
        INSERT INTO hareketler (evrak_id, islem_tipi, kullanici, "not")
        VALUES (?, 'olusturuldu', 'Toplu Import', 'JSON\'dan toplu olarak içe aktarıldı')
      `);

      const bulkInsert = state.db.transaction((evrakRows) => {
        let ok = 0, err = 0;
        for (const row of evrakRows) {
          try {
            const meta = { __template_id: template.id, ...(typeof row.metadata === 'object' ? row.metadata : {}) };
            const res = insert.run({
              no: row.no || '',
              tip: row.tip || template.defaultTip || 'gelen',
              kurum: row.kurum || '',
              birim: row.birim || '',
              tarih: row.tarih || new Date().toISOString().split('T')[0],
              durum: row.durum || template.defaultDurum || 'beklemede',
              aciklama: row.aciklama || '',
              notlar: row.notlar || '',
              klasor: row.klasor || '',
              raf_no: row.raf_no || '',
              metadata: JSON.stringify(meta),
            });
            addHareket.run(res.lastInsertRowid);
            ok++;
          } catch (e) {
            console.error('JSON bulk row error:', e.message);
            err++;
          }
        }
        return { ok, err };
      });

      const { ok, err } = bulkInsert(rows);
      return { success: true, totalImported: ok, totalErrors: err };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // ── Export template as blank Excel (for bulk import reference) ───────────────
  ipcMain.handle('template:export-blank-excel', async (_e, templateId) => {
    const appDbInst = getAppDb();
    const tmplRow = appDbInst.prepare('SELECT * FROM templates WHERE id = ?').get(templateId);
    if (!tmplRow) return { success: false, error: 'Template bulunamadı' };
    const template = JSON.parse(tmplRow.definition);

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Boş Import Şablonu İndir',
      defaultPath: `${template.id}-import-sablonu.xlsx`,
      filters: [{ name: 'Excel Dosyası', extensions: ['xlsx'] }],
    });
    if (canceled || !filePath) return { success: false };

    // Build header row: standard fields + template custom fields
    const standardHeaders = ['no', 'tip', 'kurum', 'birim', 'tarih', 'durum', 'aciklama', 'klasor', 'raf_no'];
    const templateHeaders = template.fields.map(f => f.key);
    const allHeaders = [...standardHeaders, ...templateHeaders.filter(k => !standardHeaders.includes(k))];

    // Add a sample row with labels as hints
    const labelRow = {};
    for (const h of allHeaders) {
      const field = template.fields.find(f => f.key === h);
      labelRow[h] = field ? `[${field.label}]` : `[${h}]`;
    }

    const ws = xlsxUtils.json_to_sheet([labelRow], { header: allHeaders });
    const wb = xlsxUtils.book_new();
    xlsxUtils.book_append_sheet(wb, ws, template.name);
    xlsxWriteFile(wb, filePath);

    return { success: true, filePath };
  });
}
