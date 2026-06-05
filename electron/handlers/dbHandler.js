import { shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { evaluateRoutines, evaluateFieldRutinler, scanAllFieldRutins } from './routineEvaluator';
import { getAppDb } from '../appDb';


function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const m = {
    '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain', '.csv': 'text/csv',
  };
  return m[ext] || 'application/octet-stream';
}

function setupDbHandlers(ipcMain, state, setState) {
  // ── EVRAKLAR ──────────────────────────────────────────────────────────────
  ipcMain.handle('db:evraklar:list', (_e, filters = {}) => {
    if (!state.db) return [];
    let sql = 'SELECT * FROM evraklar WHERE 1=1';
    const p = [];
    if (filters.tip)        { sql += ' AND tip = ?';          p.push(filters.tip); }
    if (filters.durum)      { sql += ' AND durum = ?';        p.push(filters.durum); }
    if (filters.kurum)      { sql += ' AND kurum LIKE ?';     p.push(`%${filters.kurum}%`); }
    if (filters.tarihStart) { sql += ' AND tarih >= ?';       p.push(filters.tarihStart); }
    if (filters.tarihEnd)   { sql += ' AND tarih <= ?';       p.push(filters.tarihEnd); }
    
    // Custom metadata / Template field filters
    if (filters.metadataFilters) {
      for (const [key, value] of Object.entries(filters.metadataFilters)) {
        if (value && value.trim()) {
          // json_extract(metadata, '$.key') LIKE '%value%'
          sql += ` AND json_extract(metadata, ?) LIKE ?`;
          p.push(`$.${key}`, `%${value.trim()}%`);
        }
      }
    }

    const ob = ['no','tip','kurum','tarih','durum','created_at'].includes(filters.orderBy) ? filters.orderBy : 'created_at';
    sql += ` ORDER BY ${ob} ${filters.order === 'ASC' ? 'ASC' : 'DESC'}`;
    if (filters.limit) { sql += ' LIMIT ?'; p.push(filters.limit); }
    return state.db.prepare(sql).all(...p);
  });

  ipcMain.handle('db:evraklar:get', (_e, id) => {
    if (!state.db) return null;
    return state.db.prepare('SELECT * FROM evraklar WHERE id = ?').get(id);
  });

  ipcMain.handle('db:evraklar:search', (_e, query) => {
    if (!state.db || !query?.trim()) return [];
    
    // FTS5 multiple terms processing (e.g. "Ruhsat 2020" -> '"Ruhsat" "2020"*')
    const terms = query.trim().split(/\s+/);
    const ftsQuery = terms.map((t, i) => i === terms.length - 1 ? `"${t}"*` : `"${t}"`).join(' AND ');

    return state.db.prepare(`
      SELECT e.* FROM evraklar_fts
      JOIN evraklar e ON e.id = evraklar_fts.rowid
      WHERE evraklar_fts MATCH ? ORDER BY rank
    `).all(ftsQuery);
  });

  ipcMain.handle('db:evraklar:create', (_e, data) => {
    if (!state.db) return null;
    const res = state.db.prepare(`
      INSERT INTO evraklar (no, tip, kurum, birim, tarih, durum, aciklama, notlar, klasor, raf_no, metadata)
      VALUES (@no, @tip, @kurum, @birim, @tarih, @durum, @aciklama, @notlar, @klasor, @raf_no, @metadata)
    `).run({ no:'', tip:'gelen', kurum:'', birim:'', tarih: new Date().toISOString().split('T')[0],
              durum:'beklemede', aciklama:'', notlar:'', klasor: '', raf_no: '', metadata: '', ...data });
    state.db.prepare(`INSERT INTO hareketler (evrak_id, islem_tipi, kullanici, "not") VALUES (?, 'olusturuldu', 'Kullanıcı', 'Evrak oluşturuldu')`).run(res.lastInsertRowid);
    
    const doc = state.db.prepare('SELECT * FROM evraklar WHERE id = ?').get(res.lastInsertRowid);
    try {
      evaluateRoutines(state.db, doc, null);
      // Alan rutinleri: şablonu bul
      try {
        const meta = JSON.parse(doc.metadata || '{}');
        const templateId = meta._templateId;
        if (templateId) {
          const appDb = getAppDb();
          const tmplRow = appDb.prepare('SELECT definition FROM templates WHERE id = ?').get(templateId);
          if (tmplRow) {
            const template = JSON.parse(tmplRow.definition);
            evaluateFieldRutinler(state.db, doc, null, template);
          }
        }
      } catch (ferr) {
        console.error('Error evaluating field rutins on create:', ferr);
      }
    } catch (err) {
      console.error('Error evaluating routines on create:', err);
    }

    return state.db.prepare('SELECT * FROM evraklar WHERE id = ?').get(res.lastInsertRowid);
  });

  ipcMain.handle('db:evraklar:update', (_e, id, data) => {
    if (!state.db) return null;
    const prevDoc = state.db.prepare('SELECT * FROM evraklar WHERE id = ?').get(id);
    const allowed = ['no','tip','kurum','birim','tarih','durum','aciklama','notlar','klasor','raf_no','metadata'];
    const fields = Object.keys(data).filter(k => allowed.includes(k)).map(k => `${k} = @${k}`).join(', ');
    if (!fields) return null;
    state.db.prepare(`UPDATE evraklar SET ${fields}, updated_at = datetime('now') WHERE id = @id`).run({ ...data, id });
    state.db.prepare(`INSERT INTO hareketler (evrak_id, islem_tipi, kullanici, "not") VALUES (?, 'guncellendi', 'Kullanıcı', 'Evrak güncellendi')`).run(id);
    
    const doc = state.db.prepare('SELECT * FROM evraklar WHERE id = ?').get(id);
    try {
      evaluateRoutines(state.db, doc, prevDoc);
      // Alan rutinleri: şablonu bul
      try {
        const meta = JSON.parse(doc.metadata || '{}');
        const templateId = meta._templateId;
        if (templateId) {
          const appDb = getAppDb();
          const tmplRow = appDb.prepare('SELECT definition FROM templates WHERE id = ?').get(templateId);
          if (tmplRow) {
            const template = JSON.parse(tmplRow.definition);
            evaluateFieldRutinler(state.db, doc, prevDoc, template);
          }
        }
      } catch (ferr) {
        console.error('Error evaluating field rutins on update:', ferr);
      }
    } catch (err) {
      console.error('Error evaluating routines on update:', err);
    }

    return state.db.prepare('SELECT * FROM evraklar WHERE id = ?').get(id);
  });

  ipcMain.handle('db:evraklar:delete', (_e, id) => {
    if (!state.db) return false;
    state.db.prepare('DELETE FROM evraklar WHERE id = ?').run(id);
    return true;
  });

  // ── HAREKETLER ────────────────────────────────────────────────────────────
  ipcMain.handle('db:hareketler:list', (_e, evrakId) => {
    if (!state.db) return [];
    return state.db.prepare('SELECT * FROM hareketler WHERE evrak_id = ? ORDER BY tarih DESC').all(evrakId);
  });

  ipcMain.handle('db:hareketler:add', (_e, data) => {
    if (!state.db) return null;
    const res = state.db.prepare(`INSERT INTO hareketler (evrak_id, islem_tipi, kullanici, "not") VALUES (@evrak_id, @islem_tipi, @kullanici, @not)`).run(data);
    return state.db.prepare('SELECT * FROM hareketler WHERE id = ?').get(res.lastInsertRowid);
  });

  // ── EKLER ─────────────────────────────────────────────────────────────────
  ipcMain.handle('db:ekler:list', (_e, evrakId) => {
    if (!state.db) return [];
    return state.db.prepare('SELECT * FROM ekler WHERE evrak_id = ? ORDER BY id DESC').all(evrakId);
  });

  ipcMain.handle('db:ekler:add', (_e, evrakId, srcPath) => {
    if (!state.db || !state.tempDir) return null;
    const attachDir = path.join(state.tempDir, 'attachments');
    fs.mkdirSync(attachDir, { recursive: true });
    const fileName = `${Date.now()}_${path.basename(srcPath)}`;
    const destPath = path.join(attachDir, fileName);
    fs.copyFileSync(srcPath, destPath);
    const stat = fs.statSync(destPath);
    const hash = crypto.createHash('sha256').update(fs.readFileSync(destPath)).digest('hex');
    const res = state.db.prepare(`
      INSERT INTO ekler (evrak_id, dosya_yolu, orijinal_ad, boyut, mime_type, hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(evrakId, `attachments/${fileName}`, path.basename(srcPath), stat.size, getMimeType(srcPath), hash);
    state.db.prepare(`INSERT INTO hareketler (evrak_id, islem_tipi, kullanici, "not") VALUES (?, 'ek_eklendi', 'Kullanıcı', ?)`).run(evrakId, `"${path.basename(srcPath)}" eklendi`);
    return state.db.prepare('SELECT * FROM ekler WHERE id = ?').get(res.lastInsertRowid);
  });

  ipcMain.handle('db:ekler:remove', (_e, ekId) => {
    if (!state.db) return false;
    const ek = state.db.prepare('SELECT * FROM ekler WHERE id = ?').get(ekId);
    if (!ek) return false;
    const fp = path.join(state.tempDir, ek.dosya_yolu);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    state.db.prepare('DELETE FROM ekler WHERE id = ?').run(ekId);
    return true;
  });

  ipcMain.handle('db:ekler:open', async (_e, ekId) => {
    if (!state.db || !state.tempDir) return false;
    const ek = state.db.prepare('SELECT * FROM ekler WHERE id = ?').get(ekId);
    if (!ek) return false;
    // shell already imported at top level
    await shell.openPath(path.join(state.tempDir, ek.dosya_yolu));
    return true;
  });

  ipcMain.handle('db:ekler:download', async (_e, ekId) => {
    if (!state.db || !state.tempDir) return false;
    const ek = state.db.prepare('SELECT * FROM ekler WHERE id = ?').get(ekId);
    if (!ek) return false;
    // dialog already imported at top level
    const { filePath, canceled } = await dialog.showSaveDialog({ defaultPath: ek.orijinal_ad });
    if (canceled || !filePath) return false;
    fs.copyFileSync(path.join(state.tempDir, ek.dosya_yolu), filePath);
    return true;
  });

  // ── ETİKETLER ─────────────────────────────────────────────────────────────
  ipcMain.handle('db:etiketler:list', (_e, evrakId) => {
    if (!state.db) return [];
    return state.db.prepare('SELECT * FROM etiketler WHERE evrak_id = ? ORDER BY oncelik DESC').all(evrakId);
  });

  ipcMain.handle('db:etiketler:add', (_e, data) => {
    if (!state.db) return null;
    const res = state.db.prepare(`INSERT INTO etiketler (evrak_id, tag, renk, oncelik) VALUES (@evrak_id, @tag, @renk, @oncelik)`).run({ renk: '#3b82f6', oncelik: 0, ...data });
    return state.db.prepare('SELECT * FROM etiketler WHERE id = ?').get(res.lastInsertRowid);
  });

  ipcMain.handle('db:etiketler:remove', (_e, id) => {
    if (!state.db) return false;
    state.db.prepare('DELETE FROM etiketler WHERE id = ?').run(id);
    return true;
  });

  // ── STATS ─────────────────────────────────────────────────────────────────
  ipcMain.handle('db:stats', () => {
    if (!state.db) return {};
    return {
      total: state.db.prepare('SELECT COUNT(*) as c FROM evraklar').get().c,
      byDurum: state.db.prepare('SELECT durum, COUNT(*) as count FROM evraklar GROUP BY durum').all(),
      byTip: state.db.prepare('SELECT tip, COUNT(*) as count FROM evraklar GROUP BY tip').all(),
      lastWeek: state.db.prepare(`SELECT COUNT(*) as c FROM evraklar WHERE created_at >= datetime('now','-7 days')`).get().c,
    };
  });

  // ── AYARLAR ───────────────────────────────────────────────────────────────
  ipcMain.handle('db:ayarlar:get', (_e) => {
    if (!state.db) return {};
    const rows = state.db.prepare('SELECT key, value FROM ayarlar').all();
    return rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
  });

  ipcMain.handle('db:ayarlar:set', (_e, key, value) => {
    if (!state.db) return false;
    state.db.prepare('INSERT INTO ayarlar (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
    return true;
  });

  // ── ROUTINES ──────────────────────────────────────────────────────────────
  ipcMain.handle('db:routines:list', (_e) => {
    if (!state.db) return [];
    try {
      const routines = state.db.prepare('SELECT * FROM routines ORDER BY created_at DESC').all();
      for (const r of routines) {
        r.rules = state.db.prepare('SELECT * FROM routine_rules WHERE routine_id = ?').all(r.id);
        const actions = state.db.prepare('SELECT * FROM routine_actions WHERE routine_id = ?').all(r.id);
        r.actions = actions.map(act => {
          try {
            return { ...act, config: JSON.parse(act.config) };
          } catch (e) {
            return { ...act, config: {} };
          }
        });
      }
      return routines;
    } catch (err) {
      console.error('Error listing routines:', err);
      return [];
    }
  });

  ipcMain.handle('db:routines:save', (_e, routine) => {
    if (!state.db) return false;
    try {
      const transaction = state.db.transaction((r) => {
        state.db.prepare(`
          INSERT INTO routines (id, name, is_active)
          VALUES (?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET name = excluded.name, is_active = excluded.is_active
        `).run(r.id, r.name, r.is_active ? 1 : 0);

        state.db.prepare('DELETE FROM routine_rules WHERE routine_id = ?').run(r.id);
        state.db.prepare('DELETE FROM routine_actions WHERE routine_id = ?').run(r.id);

        const insertRule = state.db.prepare(`
          INSERT INTO routine_rules (id, routine_id, field_name, operator, value, logic)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const rule of r.rules) {
          insertRule.run(rule.id, r.id, rule.field_name, rule.operator, rule.value, rule.logic || 'AND');
        }

        const insertAction = state.db.prepare(`
          INSERT INTO routine_actions (id, routine_id, action_type, config)
          VALUES (?, ?, ?, ?)
        `);
        for (const action of r.actions) {
          const configStr = typeof action.config === 'string' ? action.config : JSON.stringify(action.config);
          insertAction.run(action.id, r.id, action.action_type, configStr);
        }
      });
      transaction(routine);
      return true;
    } catch (err) {
      console.error('Error saving routine:', err);
      return false;
    }
  });

  ipcMain.handle('db:routines:delete', (_e, id) => {
    if (!state.db) return false;
    try {
      state.db.prepare('DELETE FROM routines WHERE id = ?').run(id);
      return true;
    } catch (err) {
      console.error('Error deleting routine:', err);
      return false;
    }
  });

  // ── FIELD RUTINS SCAN ──────────────────────────────────────────────────
  ipcMain.handle('db:field:scan-rutins', () => {
    if (!state.db) return [];
    try {
      const appDb = getAppDb();
      const tmplRows = appDb.prepare('SELECT id, definition FROM templates').all();
      // templateId -> parsed definition map
      const templatesMap = {};
      for (const row of tmplRows) {
        try {
          templatesMap[row.id] = JSON.parse(row.definition);
        } catch {}
      }
      return scanAllFieldRutins(state.db, templatesMap);
    } catch (err) {
      console.error('Error scanning field rutins:', err);
      return [];
    }
  });
}

export { setupDbHandlers };
