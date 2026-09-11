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
      // 开户时录入的余额即初始余额（对账基准）
      initialBalance: account.initialBalance !== undefined ? account.initialBalance : account.balance,
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
      const updated = state.accounts.map((a) => {
        if (a.id !== id) return a;
        const merged = { ...a, ...updates };
        // 手动修改余额（盘点现金/调整账户）时，差额计入初始余额，
        // 保持「余额 = 初始 + 收入 - 支出 + 转入 - 转出」对账恒等式成立
        if (updates.balance !== undefined && updates.balance !== a.balance) {
          const base = a.initialBalance !== undefined ? a.initialBalance : a.balance;
          merged.initialBalance = Math.round((base + (updates.balance - a.balance)) * 100) / 100;
        }
        return merged;
      });
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