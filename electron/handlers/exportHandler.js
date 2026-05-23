import { dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { RobotoRegularBase64 } from './Roboto-Regular.js';

function setupExportHandlers(ipcMain, state, setState) {
  // ── Excel ─────────────────────────────────────────────────────────────────
  ipcMain.handle('export:excel', async (_e, filters = {}) => {
    if (!state.db) return { success: false, error: 'Veritabanı açık değil' };
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Excel Olarak Dışa Aktar',
      defaultPath: `evraklar_${Date.now()}.xlsx`,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    });
    if (canceled || !filePath) return { success: false };

    // XLSX already imported at top level
    const rows = state.db.prepare('SELECT * FROM evraklar ORDER BY created_at DESC').all();

    const data = [
      ['No', 'Tip', 'Kurum', 'Tarih', 'Durum', 'Açıklama', 'Notlar', 'Oluşturulma', 'Güncellenme'],
      ...rows.map(r => [r.no, r.tip, r.kurum, r.tarih, r.durum, r.aciklama, r.notlar, r.created_at, r.updated_at]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [8,14,10,20,12,14,30,30,18,18].map(w => ({ wch: w }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Evraklar');

    // Add stats sheet
    const stats = state.db.prepare('SELECT durum, COUNT(*) as count FROM evraklar GROUP BY durum').all();
    const statsData = [['Durum', 'Adet'], ...stats.map(s => [s.durum, s.count])];
    const wsStats = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, wsStats, 'İstatistikler');

    XLSX.writeFile(wb, filePath);
    return { success: true, filePath };
  });

  // ── CSV ───────────────────────────────────────────────────────────────────
  ipcMain.handle('export:csv', async (_e, filters = {}) => {
    if (!state.db) return { success: false, error: 'Veritabanı açık değil' };
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'CSV Olarak Dışa Aktar',
      defaultPath: `evraklar_${Date.now()}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (canceled || !filePath) return { success: false };

    const rows = state.db.prepare('SELECT * FROM evraklar ORDER BY created_at DESC').all();
    const headers = 'ID,No,Tip,Kurum,Tarih,Durum,Açıklama,Notlar,Oluşturulma,Güncellenme';
    const csvRows = rows.map(r =>
      [r.id, r.no, r.tip, r.kurum, r.tarih, r.durum,
       `"${(r.aciklama||'').replace(/"/g,'""')}"`,
       `"${(r.notlar||'').replace(/"/g,'""')}"`,
       r.created_at, r.updated_at].join(',')
    );
    fs.writeFileSync(filePath, [headers, ...csvRows].join('\n'), 'utf-8');
    return { success: true, filePath };
  });

  // ── JSON ───────────────────────────────────────────────────────────────────
  ipcMain.handle('export:json', async (_e, filters = {}) => {
    if (!state.db) return { success: false, error: 'Veritabanı açık değil' };
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'JSON Olarak Dışa Aktar',
      defaultPath: `evraklar_${Date.now()}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (canceled || !filePath) return { success: false };

    const rows = state.db.prepare('SELECT * FROM evraklar ORDER BY created_at DESC').all();
    fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), 'utf-8');
    return { success: true, filePath };
  });

  // ── PDF ───────────────────────────────────────────────────────────────────
  ipcMain.handle('export:pdf', async (_e, filters = {}) => {
    if (!state.db) return { success: false, error: 'Veritabanı açık değil' };
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'PDF Raporu Dışa Aktar',
      defaultPath: `evrak_raporu_${Date.now()}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (canceled || !filePath) return { success: false };

    // jsPDF already imported at top level

    const rows = state.db.prepare('SELECT * FROM evraklar ORDER BY created_at DESC').all();
    const stats = state.db.prepare('SELECT COUNT(*) as c FROM evraklar').get();

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegularBase64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto');

    // Header (Official Protocol Format)
    doc.setTextColor(0, 0, 0); // Siyah metin
    doc.setFontSize(14);
    doc.text('EVRAK KAYIT VE TAKİP RAPORU', 148, 16, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Rapor Tarihi: ${new Date().toLocaleString('tr-TR')}`, 14, 24);
    doc.text(`Toplam Evrak Sayısı: ${stats.c}`, 280, 24, { align: 'right' });
    
    // Çizgi
    doc.setLineWidth(0.5);
    doc.line(14, 27, 280, 27);

    doc.autoTable({
      startY: 32,
      head: [['Evrak No', 'Evrak Tipi', 'Kurum / Birim', 'Tarih', 'Durum', 'Açıklama']],
      body: rows.map(r => [
        r.no, 
        r.tip.toUpperCase(), 
        r.kurum ? `${r.kurum}${r.birim ? ` - ${r.birim}` : ''}` : '-', 
        r.tarih || '-', 
        r.durum.toUpperCase(), 
        (r.aciklama || '')
      ]),
      styles: { font: 'Roboto', fontSize: 9, cellPadding: 3, textColor: [0, 0, 0], lineColor: [200, 200, 200], lineWidth: 0.1 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
      bodyStyles: { valign: 'middle' },
      alternateRowStyles: { fillColor: [252, 252, 252] },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' }, 
        1: { cellWidth: 30 }, 
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 45 }, 
        4: { cellWidth: 25, halign: 'center' }, 
        5: { cellWidth: 25, halign: 'center' }, 
        6: { cellWidth: 'auto' },
      },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Sayfa ${i} / ${pageCount}`, 280, 205, { align: 'right' });
    }

    doc.save(filePath);
    return { success: true, filePath };
  });
}

export { setupExportHandlers };
