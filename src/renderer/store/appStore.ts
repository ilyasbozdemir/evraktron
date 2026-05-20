import { create } from 'zustand';
import type { Evrak, EvrakFilters, DbStats } from '../types/electron.d';

interface AppState {
  // File state
  isFileOpen: boolean;
  filePath: string | null;
  fileName: string | null;
  lastSaved: string | null;
  isDirty: boolean;

  // Theme
  theme: 'dark' | 'light';

  // Navigation
  activeView: 'welcome' | 'list' | 'detail';
  selectedEvrakId: number | null;

  // Data
  evraklar: Evrak[];
  isLoadingEvraklar: boolean;
  filters: EvrakFilters;
  searchQuery: string;
  stats: DbStats | null;

  // Toast notifications
  toast: { id: string; message: string; type: 'success' | 'error' | 'info' } | null;

  // Actions
  setFileOpen: (open: boolean, filePath?: string) => void;
  setLastSaved: (t: string) => void;
  setDirty: (v: boolean) => void;
  setTheme: (t: 'dark' | 'light') => void;
  setActiveView: (v: AppState['activeView']) => void;
  setSelectedEvrakId: (id: number | null) => void;
  setEvraklar: (rows: Evrak[]) => void;
  setLoadingEvraklar: (v: boolean) => void;
  setFilters: (f: Partial<EvrakFilters>) => void;
  setSearchQuery: (q: string) => void;
  setStats: (s: DbStats) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
  closeFile: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isFileOpen: false,
  filePath: null,
  fileName: null,
  lastSaved: null,
  isDirty: false,
  theme: 'dark',
  activeView: 'welcome',
  selectedEvrakId: null,
  evraklar: [],
  isLoadingEvraklar: false,
  filters: { orderBy: 'created_at', order: 'DESC' },
  searchQuery: '',
  stats: null,
  toast: null,

  setFileOpen: (open, filePath) => set({
    isFileOpen: open,
    filePath: filePath || null,
    fileName: filePath ? filePath.split(/[\\/]/).pop() || null : null,
    activeView: open ? 'list' : 'welcome',
  }),

  setLastSaved: (t) => set({ lastSaved: t, isDirty: false }),
  setDirty: (v) => set({ isDirty: v }),
  setTheme: (t) => {
    document.documentElement.classList.toggle('dark', t === 'dark');
    set({ theme: t });
  },
  setActiveView: (v) => set({ activeView: v }),
  setSelectedEvrakId: (id) => set({ selectedEvrakId: id }),
  setEvraklar: (rows) => set({ evraklar: rows }),
  setLoadingEvraklar: (v) => set({ isLoadingEvraklar: v }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setStats: (s) => set({ stats: s }),

  showToast: (message, type = 'info') => {
    const id = Date.now().toString();
    set({ toast: { id, message, type } });
    setTimeout(() => set((s) => s.toast?.id === id ? { toast: null } : s), 3500);
  },
  clearToast: () => set({ toast: null }),

  closeFile: () => set({
    isFileOpen: false, filePath: null, fileName: null, lastSaved: null,
    isDirty: false, activeView: 'welcome', selectedEvrakId: null,
    evraklar: [], stats: null, searchQuery: '',
  }),
}));
