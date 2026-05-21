import { dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import AdmZip from 'adm-zip';
import Database from 'better-sqlite3';

const MANIFEST_VERSION = '1.0';
const APP_VERSION = '1.0.0';

function createManifest(extra = {}) {
  return {
    schema_version: MANIFEST_VERSION,
    app_version: APP_VERSION,
    created_at: new Date().toISOString(),
    last_modified: new Date().toISOString(),
    ...extra,
  };
}

function createTempDir() {
  const tmpBase = path.join(os.tmpdir(), 'evraktron');
  fs.mkdirSync(tmpBase, { recursive: true });
  const dir = fs.mkdtempSync(path.join(tmpBase, 'file-'));
  return dir;
}

function acquireLock(filePath) {
  const lockPath = filePath + '.lock';
  if (fs.existsSync(lockPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
      return { locked: true, by: data.pid, at: data.at };
    } catch {
      // Stale lock — remove it
      fs.unlinkSync(lockPath);
    }
  }
  fs.writeFileSync(lockPath, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
  return { locked: false };
}

function releaseLock(filePath) {
  const lockPath = filePath + '.lock';
  if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
}

function openEvrakFile(filePath, state, setState) {
  // Check lock
  const lockResult = acquireLock(filePath);
  if (lockResult.locked) {
    return { success: false, error: `Dosya başka bir süreç tarafından kilitlendi (PID: ${lockResult.by})` };
  }

  const tempDir = createTempDir();
  
  const stat = fs.statSync(filePath);
  if (stat.size === 0) {
    // ShellNew ile oluşturulmuş boş dosya, ilk kurulumu yap
    const attachmentsDir = path.join(tempDir, 'attachments');
    fs.mkdirSync(attachmentsDir, { recursive: true });
    const manifest = createManifest();
    fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  } else {
    try {
      const zip = new AdmZip(filePath);
      zip.extractAllTo(tempDir, true);
    } catch (err) {
      if (state.lockAcquired) releaseLock(filePath);
      return { success: false, error: 'Dosya formatı okunamadı veya bozuk' };
    }
  }

  // Read manifest
  const manifestPath = path.join(tempDir, 'manifest.json');
  let manifest = {};
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  }

  // Open SQLite
  // Database already imported at top level
  const dbPath = path.join(tempDir, 'database.sqlite');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  ensureSchema(db);

  if (state.currentFilePath && state.lockAcquired) {
    releaseLock(state.currentFilePath);
  }
  if (state.db) {
    try { state.db.close(); } catch (_) {}
  }

  setState({ currentFilePath: filePath, tempDir, db, lockAcquired: true, isUnsaved: false });

  return {
    success: true,
    filePath,
    manifest,
    tempDir,
  };
}

function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS evraklar (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      no          TEXT NOT NULL,
      tip         TEXT NOT NULL DEFAULT 'gelen',
      kurum       TEXT,
      tarih       TEXT,
      durum       TEXT NOT NULL DEFAULT 'beklemede',
      aciklama    TEXT,
      notlar      TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hareketler (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      evrak_id    INTEGER NOT NULL REFERENCES evraklar(id) ON DELETE CASCADE,
      tarih       TEXT NOT NULL DEFAULT (datetime('now')),
      islem_tipi  TEXT NOT NULL,
      kullanici   TEXT DEFAULT 'Sistem',
      "not"       TEXT
    );

    CREATE TABLE IF NOT EXISTS ekler (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      evrak_id     INTEGER NOT NULL REFERENCES evraklar(id) ON DELETE CASCADE,
      dosya_yolu   TEXT NOT NULL,
      orijinal_ad  TEXT NOT NULL,
      boyut        INTEGER,
      mime_type    TEXT,
      hash         TEXT
    );

    CREATE TABLE IF NOT EXISTS etiketler (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      evrak_id  INTEGER NOT NULL REFERENCES evraklar(id) ON DELETE CASCADE,
      tag       TEXT NOT NULL,
      renk      TEXT DEFAULT '#3b82f6',
      oncelik   INTEGER DEFAULT 0
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS evraklar_fts USING fts5(
      no, aciklama, notlar, kurum,
      content='evraklar',
      content_rowid='id'
    );

    CREATE TRIGGER IF NOT EXISTS evraklar_ai AFTER INSERT ON evraklar BEGIN
      INSERT INTO evraklar_fts(rowid, no, aciklama, notlar, kurum)
      VALUES (new.id, new.no, new.aciklama, new.notlar, new.kurum);
    END;

    CREATE TRIGGER IF NOT EXISTS evraklar_ad AFTER DELETE ON evraklar BEGIN
      INSERT INTO evraklar_fts(evraklar_fts, rowid, no, aciklama, notlar, kurum)
      VALUES ('delete', old.id, old.no, old.aciklama, old.notlar, old.kurum);
    END;

    CREATE TRIGGER IF NOT EXISTS evraklar_au AFTER UPDATE ON evraklar BEGIN
      INSERT INTO evraklar_fts(evraklar_fts, rowid, no, aciklama, notlar, kurum)
      VALUES ('delete', old.id, old.no, old.aciklama, old.notlar, old.kurum);
      INSERT INTO evraklar_fts(rowid, no, aciklama, notlar, kurum)
      VALUES (new.id, new.no, new.aciklama, new.notlar, new.kurum);
    END;
  `);
}

function packEvrakFile(filePath, tempDir, state) {
  // Update manifest
  const manifestPath = path.join(tempDir, 'manifest.json');
  let manifest = {};
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  }
  manifest.last_modified = new Date().toISOString();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // Ensure .lock placeholder (internal)
  fs.writeFileSync(path.join(tempDir, '.lock'), '');

  // Repack to ZIP
  const zip = new AdmZip();
  zip.addLocalFolder(tempDir);
  zip.writeZip(filePath);
}

function setupFileHandlers(ipcMain, state, setState) {
  // ── New file ──────────────────────────────────────────────────────────────
  // Kaydetme dialogu açmadan direkt geçici konumda yeni dosya oluştur.
  // İlk Ctrl+S'de save-as dialogu tetiklenir (isUnsaved flag).
  ipcMain.handle('file:new', async () => {
    // Eğer zaten açık/kaydedilmemiş dosya varsa önce kilidi bırak
    if (state.currentFilePath && state.lockAcquired) {
      releaseLock(state.currentFilePath);
    }
    if (state.db) {
      try { state.db.close(); } catch (_) {}
    }

    const tempDir = createTempDir();
    const attachmentsDir = path.join(tempDir, 'attachments');
    fs.mkdirSync(attachmentsDir, { recursive: true });

    const manifest = createManifest();
    fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    const dbPath = path.join(tempDir, 'database.sqlite');
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    ensureSchema(db);

    // isUnsaved=true → henüz diske kaydedilmedi, Ctrl+S ilk kaydetmede dialog açar
    setState({ currentFilePath: null, tempDir, db, lockAcquired: false, isUnsaved: true });

    // Renderer'a sanal bir yol döndür — kullanıcıya "Yeni Dosya" göstermek için
    return { success: true, filePath: '__new__', manifest };
  });

  // ── Open dialog ───────────────────────────────────────────────────────────
  ipcMain.handle('file:open-dialog', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Evrak Takip App Dosyası Aç',
      filters: [{ name: 'Evrak Takip App Dosyası', extensions: ['etapp'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths.length) return { success: false };
    return openEvrakFile(filePaths[0], state, setState);
  });

  // ── Open by path (file association) ───────────────────────────────────────
  ipcMain.handle('file:open', async (_e, filePath) => {
    if (!filePath || !fs.existsSync(filePath)) return { success: false, error: 'Dosya bulunamadı' };
    return openEvrakFile(filePath, state, setState);
  });

  // ── Save (repack) ─────────────────────────────────────────────────────────
  // Eğer dosya henüz kaydedilmemişse (yeni dosya) → save-as dialogunu aç
  ipcMain.handle('file:save', async () => {
    if (!state.tempDir) return { success: false, error: 'Açık dosya yok' };

    if (state.isUnsaved || !state.currentFilePath) {
      // İlk kaydetme — dosya adını kullanıcıdan al
      const { filePath: savePath, canceled } = await dialog.showSaveDialog({
        title: 'Dosyayı Kaydet',
        defaultPath: 'yeni-dosya.etapp',
        filters: [{ name: 'Evrak Takip App Dosyası', extensions: ['etapp'] }],
      });
      if (canceled || !savePath) return { success: false };

      const lockResult = acquireLock(savePath);
      if (lockResult.locked) return { success: false, error: 'Hedef dosya kilitli' };

      packEvrakFile(savePath, state.tempDir, state);
      setState({ currentFilePath: savePath, lockAcquired: true, isUnsaved: false });
      return { success: true, filePath: savePath, savedAt: new Date().toISOString() };
    }

    try {
      packEvrakFile(state.currentFilePath, state.tempDir, state);
      return { success: true, savedAt: new Date().toISOString() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ── Save As ───────────────────────────────────────────────────────────────
  ipcMain.handle('file:save-as', async () => {
    if (!state.tempDir) return { success: false, error: 'Açık dosya yok' };
    const { filePath: savePath, canceled } = await dialog.showSaveDialog({
      title: 'Farklı Kaydet',
      defaultPath: 'dosya.etapp',
      filters: [{ name: 'Evrak Takip App Dosyası', extensions: ['etapp'] }],
    });
    if (canceled || !savePath) return { success: false };

    // Release old lock
    if (state.currentFilePath && state.lockAcquired) releaseLock(state.currentFilePath);

    const lockResult = acquireLock(savePath);
    if (lockResult.locked) return { success: false, error: 'Hedef dosya kilitli' };

    packEvrakFile(savePath, state.tempDir, state);
    setState({ currentFilePath: savePath, lockAcquired: true });
    return { success: true, filePath: savePath };
  });

  // ── File info ─────────────────────────────────────────────────────────────
  ipcMain.handle('file:get-info', () => {
    if (!state.currentFilePath) return null;
    const stat = fs.statSync(state.currentFilePath);
    const manifest = (() => {
      try {
        return JSON.parse(fs.readFileSync(path.join(state.tempDir, 'manifest.json'), 'utf-8'));
      } catch { return {}; }
    })();
    return {
      filePath: state.currentFilePath,
      fileName: path.basename(state.currentFilePath),
      size: stat.size,
      manifest,
    };
  });

  // ── Shell helpers ─────────────────────────────────────────────────────────
  ipcMain.handle('shell:open-external', (_e, url) => shell.openExternal(url));
  ipcMain.handle('shell:show-in-folder', (_e, fp) => shell.showItemInFolder(fp));
}

export { setupFileHandlers, ensureSchema, packEvrakFile };
