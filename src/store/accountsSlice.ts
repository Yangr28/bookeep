import { StateCreator } from 'zustand';
import { Account } from '../types';
import { initialAccounts } from '../data/initialData';
import { loadAccounts, saveAccounts } from '../utils/storage';

export interface AccountsSlice {
  accounts: Account[];
  addAccount: (account: Omit<Account, 'id'>) => void;
  deleteAccount: (id: string) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  reorderAccounts: (fromIndex: number, toIndex: number) => void;
  getAccountById: (id: string) => Account | undefined;
  setAccounts: (accounts: Account[]) => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const createAccountsSlice: StateCreator<AccountsSlice> = (set, get) => ({
  accounts: loadAccounts(initialAccounts),

  addAccount: (account) => {
    const newAccount: Account = {
      ...account,
      id: generateId(),
    };
    set((state) => {
      const updated = [...state.accounts, newAccount];
      saveAccounts(updated);
      return { accounts: updated };
    });
  },

  deleteAccount: (id) => {
    set((state) => {
      const updated = state.accounts.filter((a) => a.id !== id);
      saveAccounts(updated);
      return { accounts: updated };
    });
  },

  updateAccount: (id, updates) => {
    set((state) => {
      const updated = state.accounts.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      );
      saveAccounts(updated);
      return { accounts: updated };
    });
  },

  reorderAccounts: (fromIndex, toIndex) => {
    set((state) => {
      const updated = [...state.accounts];
      const [removed] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, removed);
      saveAccounts(updated);
      return { accounts: updated };
    });
  },

  getAccountById: (id) => {
    return get().accounts.find((a) => a.id === id);
  },

  setAccounts: (accounts) => {
    saveAccounts(accounts);
    set({ accounts });
  },
});