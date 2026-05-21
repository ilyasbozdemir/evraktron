import { shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

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
    return state.db.prepare(`
      SELECT e.* FROM evraklar_fts
      JOIN evraklar e ON e.id = evraklar_fts.rowid
      WHERE evraklar_fts MATCH ? ORDER BY rank
    `).all(`${query}*`);
  });

  ipcMain.handle('db:evraklar:create', (_e, data) => {
    if (!state.db) return null;
    const res = state.db.prepare(`
      INSERT INTO evraklar (no, tip, kurum, tarih, durum, aciklama, notlar, klasor, raf_no)
      VALUES (@no, @tip, @kurum, @tarih, @durum, @aciklama, @notlar, @klasor, @raf_no)
    `).run({ no:'', tip:'gelen', kurum:'', tarih: new Date().toISOString().split('T')[0],
              durum:'beklemede', aciklama:'', notlar:'', klasor: '', raf_no: '', ...data });
    state.db.prepare(`INSERT INTO hareketler (evrak_id, islem_tipi, kullanici, "not") VALUES (?, 'olusturuldu', 'Kullanıcı', 'Evrak oluşturuldu')`).run(res.lastInsertRowid);
    return state.db.prepare('SELECT * FROM evraklar WHERE id = ?').get(res.lastInsertRowid);
  });

  ipcMain.handle('db:evraklar:update', (_e, id, data) => {
    if (!state.db) return null;
    const allowed = ['no','tip','kurum','tarih','durum','aciklama','notlar','klasor','raf_no'];
    const fields = Object.keys(data).filter(k => allowed.includes(k)).map(k => `${k} = @${k}`).join(', ');
    if (!fields) return null;
    state.db.prepare(`UPDATE evraklar SET ${fields}, updated_at = datetime('now') WHERE id = @id`).run({ ...data, id });
    state.db.prepare(`INSERT INTO hareketler (evrak_id, islem_tipi, kullanici, "not") VALUES (?, 'guncellendi', 'Kullanıcı', 'Evrak güncellendi')`).run(id);
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
}

export { setupDbHandlers };
