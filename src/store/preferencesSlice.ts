import { StateCreator } from 'zustand';

export interface PreferencesSlice {
  lastUsedAccountId: string | null;
  lastUsedCategoryId: string | null;
  lastUsedType: 'expense' | 'income' | null;
  quickAmounts: string[];
  setLastUsedAccountId: (id: string | null) => void;
  setLastUsedCategoryId: (id: string | null) => void;
  setLastUsedType: (type: 'expense' | 'income' | null) => void;
  addQuickAmount: (amount: string) => void;
  removeQuickAmount: (amount: string) => void;
  setPreferences: (preferences: Partial<PreferencesSlice>) => void;
}

export const createPreferencesSlice: StateCreator<PreferencesSlice> = (set) => ({
  lastUsedAccountId: null,
  lastUsedCategoryId: null,
  lastUsedType: null,
  quickAmounts: ['5', '10', '20', '50', '100', '500'],

  setLastUsedAccountId: (id) => set({ lastUsedAccountId: id }),
  
  setLastUsedCategoryId: (id) => set({ lastUsedCategoryId: id }),
  
  setLastUsedType: (type) => set({ lastUsedType: type }),
  
  addQuickAmount: (amount) => set((state) => ({
    quickAmounts: [...new Set([amount, ...state.quickAmounts])].slice(0, 10)
  })),
  
  removeQuickAmount: (amount) => set((state) => ({
    quickAmounts: state.quickAmounts.filter(a => a !== amount)
  })),
  
  setPreferences: (preferences) => set(preferences),
});
