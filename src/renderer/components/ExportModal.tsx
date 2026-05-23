import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, FileSpreadsheet, FileText, Download } from 'lucide-react';
import { useAppStore } from '../store/appStore';

interface ExportModalProps {
  onClose: () => void;
}

export function ExportModal({ onClose }: ExportModalProps) {
  const { filters, showToast } = useAppStore();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type: 'excel' | 'pdf' | 'csv' | 'json') => {
    setIsExporting(true);
    try {
      let result;
      if (type === 'excel') {
        result = await window.evraktron.export.toExcel(filters);
      } else if (type === 'pdf') {
        result = await window.evraktron.export.toPdf(filters);
      } else {
        result = await window.evraktron.export.toCsv(filters);
      }

      if (result.success && result.filePath) {
        showToast('Dışa aktarma başarıyla tamamlandı', 'success');
        onClose();
      } else if (!result.success && result.error) {
        showToast(result.error, 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Dışa aktarma başarısız', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog.Root defaultOpen onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-surface-950/80 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-surface-800 border border-surface-700/60 rounded-xl shadow-glass p-6 z-50 animate-scale-in focus:outline-none">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-semibold text-surface-100 flex items-center gap-2">
              <Download className="w-5 h-5 text-brand-400" />
              Verileri Dışa Aktar
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="btn-ghost p-1 h-8 w-8 flex items-center justify-center rounded-lg" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-surface-400">
              Veritabanındaki evrak kayıtlarını istediğiniz formatta dışa aktarabilirsiniz. Dışa aktarma işlemi dosya kaydetme penceresini açacaktır.
            </p>

            <div className="grid grid-cols-1 gap-3 mt-4">
              <button
                disabled={isExporting}
                onClick={() => handleExport('excel')}
                className="group w-full card-hover p-4 flex items-center gap-4 text-left border border-surface-700/40 bg-surface-900/30"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-all duration-200">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-surface-200 group-hover:text-emerald-400 transition-colors text-sm">Excel Tablosu (.xlsx)</p>
                  <p className="text-xs text-surface-500 mt-0.5">Tüm tabloları içeren detaylı çalışma kitabı</p>
                </div>
              </button>

              <button
                disabled={isExporting}
                onClick={() => handleExport('pdf')}
                className="group w-full card-hover p-4 flex items-center gap-4 text-left border border-surface-700/40 bg-surface-900/30"
              >
                <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:bg-rose-500/20 transition-all duration-200">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-surface-200 group-hover:text-rose-400 transition-colors text-sm">PDF Raporu (.pdf)</p>
                  <p className="text-xs text-surface-500 mt-0.5">A4 yatay düzende basılabilir evrak listesi</p>
                </div>
              </button>

              <button
                disabled={isExporting}
                onClick={() => handleExport('csv')}
                className="group w-full card-hover p-4 flex items-center gap-4 text-left border border-surface-700/40 bg-surface-900/30"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 group-hover:bg-brand-500/20 transition-all duration-200">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-surface-200 group-hover:text-brand-400 transition-colors text-sm">Virgülle Ayrılmış Değerler (.csv)</p>
                  <p className="text-xs text-surface-500 mt-0.5">Diğer programlar ile uyumlu basit veri formatı</p>
                </div>
              </button>

              <button
                disabled={isExporting}
                onClick={() => handleExport('json')}
                className="group w-full card-hover p-4 flex items-center gap-4 text-left border border-surface-700/40 bg-surface-900/30"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 transition-all duration-200">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-surface-200 group-hover:text-amber-400 transition-colors text-sm">JSON Veri Formatı (.json)</p>
                  <p className="text-xs text-surface-500 mt-0.5">Programatik erişim için yapılandırılmış veri</p>
                </div>
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
