import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  activeModal: 'none' | 'upload' | 'settings';
  setActiveModal: (modal: 'none' | 'upload' | 'settings') => void;
  theme: 'sandstone' | 'charcoal';
  toggleTheme: () => void;
  activeUsers: { id: string; email: string }[];
  setActiveUsers: (users: { id: string; email: string }[]) => void;
  aiPreferences: {
    model: 'flash' | 'pro';
    tone: 'direct' | 'detailed';
  };
  setAIPreferences: (prefs: Partial<{ model: 'flash' | 'pro'; tone: 'direct' | 'detailed' }>) => void;
  toast: { message: string | null; type: 'success' | 'info' | 'error' };
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  activeModal: 'none',
  setActiveModal: (modal) => set({ activeModal: modal }),
  theme: 'sandstone',
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'sandstone' ? 'charcoal' : 'sandstone';
    if (typeof document !== 'undefined') {
      if (newTheme === 'charcoal') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    return { theme: newTheme };
  }),
  activeUsers: [],
  setActiveUsers: (users) => set({ activeUsers: users }),
  aiPreferences: {
    model: 'flash',
    tone: 'direct',
  },
  setAIPreferences: (prefs) => set((state) => ({
    aiPreferences: { ...state.aiPreferences, ...prefs },
  })),
  toast: { message: null, type: 'info' },
  showToast: (message, type = 'info') => {
    set({ toast: { message, type } });
    setTimeout(() => {
      set((state) => {
        // Only clear if it's the same message to avoid clearing a newer toast
        if (state.toast.message === message) {
          return { toast: { message: null, type: 'info' } };
        }
        return state;
      });
    }, 3000);
  },
}));
