import { dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

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
      ['ID', 'No', 'Tip', 'Kurum', 'Tarih', 'Durum', 'Açıklama', 'Notlar', 'Oluşturulma', 'Güncellenme'],
      ...rows.map(r => [r.id, r.no, r.tip, r.kurum, r.tarih, r.durum, r.aciklama, r.notlar, r.created_at, r.updated_at]),
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

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 297, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('EVRAKTRON - Evrak Listesi Raporu', 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Oluşturulma: ${new Date().toLocaleString('tr-TR')}  |  Toplam: ${stats.c} evrak`, 14, 22);

    doc.autoTable({
      startY: 30,
      head: [['ID', 'No', 'Tip', 'Kurum', 'Tarih', 'Durum', 'Açıklama']],
      body: rows.map(r => [r.id, r.no, r.tip, r.kurum || '-', r.tarih || '-', r.durum, (r.aciklama || '').substring(0, 60)]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 12 }, 1: { cellWidth: 25 }, 2: { cellWidth: 18 },
        3: { cellWidth: 35 }, 4: { cellWidth: 22 }, 5: { cellWidth: 22 }, 6: { cellWidth: 'auto' },
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
