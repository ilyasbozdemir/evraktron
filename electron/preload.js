import { contextBridge, ipcRenderer } from 'electron';

// ─── Expose safe API to renderer ──────────────────────────────────────────────
contextBridge.exposeInMainWorld('evraktron', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    onMaximized: (cb) => ipcRenderer.on('window:maximized', (_e, v) => cb(v)),
  },

  // File operations
  file: {
    new: () => ipcRenderer.invoke('file:new'),
    open: (filePath) => ipcRenderer.invoke('file:open', filePath),
    openDialog: () => ipcRenderer.invoke('file:open-dialog'),
    save: () => ipcRenderer.invoke('file:save'),
    saveAs: () => ipcRenderer.invoke('file:save-as'),
    getInfo: () => ipcRenderer.invoke('file:get-info'),
    onOpenRequest: (cb) => ipcRenderer.on('file:open-request', (_e, fp) => cb(fp)),
  },

  // Database – Evraklar
  db: {
    // CRUD
    getEvraklar: (filters) => ipcRenderer.invoke('db:evraklar:list', filters),
    getEvrak: (id) => ipcRenderer.invoke('db:evraklar:get', id),
    createEvrak: (data) => ipcRenderer.invoke('db:evraklar:create', data),
    updateEvrak: (id, data) => ipcRenderer.invoke('db:evraklar:update', id, data),
    deleteEvrak: (id) => ipcRenderer.invoke('db:evraklar:delete', id),
    searchEvrak: (query) => ipcRenderer.invoke('db:evraklar:search', query),

    // Hareketler
    getHareketler: (evrakId) => ipcRenderer.invoke('db:hareketler:list', evrakId),
    addHareket: (data) => ipcRenderer.invoke('db:hareketler:add', data),

    // Ekler (Attachments)
    getEkler: (evrakId) => ipcRenderer.invoke('db:ekler:list', evrakId),
    addEk: (evrakId, filePath) => ipcRenderer.invoke('db:ekler:add', evrakId, filePath),
    removeEk: (ekId) => ipcRenderer.invoke('db:ekler:remove', ekId),
    openEk: (ekId) => ipcRenderer.invoke('db:ekler:open', ekId),
    downloadEk: (ekId) => ipcRenderer.invoke('db:ekler:download', ekId),

    // Etiketler
    getEtiketler: (evrakId) => ipcRenderer.invoke('db:etiketler:list', evrakId),
    addEtiket: (data) => ipcRenderer.invoke('db:etiketler:add', data),
    removeEtiket: (id) => ipcRenderer.invoke('db:etiketler:remove', id),

    // Ayarlar
    getAyarlar: () => ipcRenderer.invoke('db:ayarlar:get'),
    setAyar: (key, value) => ipcRenderer.invoke('db:ayarlar:set', key, value),

    // Stats
    getStats: () => ipcRenderer.invoke('db:stats'),
  },

  // Export
  export: {
    toExcel: (filters) => ipcRenderer.invoke('export:excel', filters),
    toPdf: (filters) => ipcRenderer.invoke('export:pdf', filters),
    toCsv: (filters) => ipcRenderer.invoke('export:csv', filters),
  },

  // Shell
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
    showInFolder: (filePath) => ipcRenderer.invoke('shell:show-in-folder', filePath),
  },
});
