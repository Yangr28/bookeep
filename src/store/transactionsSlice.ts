import { StateCreator } from 'zustand';
import { Transaction, Account } from '../types';
import { initialTransactions } from '../data/initialData';
import { loadTransactions, saveTransactions, saveAccounts, isFirstLaunch } from '../utils/storage';

export interface TransactionsSlice {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, transaction: Omit<Transaction, 'id'>) => void;
  /** 批量把多条记录移动到指定分类（仅改分类，不影响账户余额） */
  moveTransactionsToCategory: (ids: string[], categoryId: string) => void;
  deleteTransaction: (id: string) => void;
  /** 撤销删除：用原 ID 与原 createdAt 恢复交易并还原账户余额 */
  restoreTransaction: (transaction: Transaction) => void;
  /** 批量删除多条交易并扣减账户余额 */
  deleteTransactionsBatch: (ids: string[]) => void;
  reorderTransactions: (fromIndex: number, toIndex: number) => void;
  setTransactions: (transactions: Transaction[]) => void;
}

interface TransactionsSliceDependencies {
  accounts: Account[];
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/** 消除浮点精度误差：0.1+0.2 → 0.3 */
const round2 = (n: number) => Math.round(n * 100) / 100;

export const createTransactionsSlice: StateCreator<
  TransactionsSliceDependencies & TransactionsSlice,
  [],
  [],
  TransactionsSlice
> = (set) => ({
  // 首次启动不自动写入示例流水（用户可在新手引导中选择"加载示例"）
  transactions: isFirstLaunch() ? [] : loadTransactions(initialTransactions),

  addTransaction: (transaction) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: generateId(),
    };
    set((state) => {
      const updatedTransactions = [...state.transactions, newTransaction];
      saveTransactions(updatedTransactions);

      let updatedAccounts = state.accounts;
      if (transaction.accountId) {
        updatedAccounts = state.accounts.map((account) => {
          if (account.id === transaction.accountId) {
            return {
              ...account,
              balance: transaction.type === 'income'
                ? round2(account.balance + transaction.amount)
                : round2(account.balance - transaction.amount),
            };
          }
          return account;
        });
        saveAccounts(updatedAccounts);
      }

      return { transactions: updatedTransactions, accounts: updatedAccounts };
    });
  },

  updateTransaction: (id, transaction) => {
    set((state) => {
      const oldTransaction = state.transactions.find((t) => t.id === id);
      const updatedTransactions = state.transactions.map((t) =>
        t.id === id ? { ...t, ...transaction } : t
      );
      saveTransactions(updatedTransactions);

      let updatedAccounts = state.accounts;

      if (oldTransaction && oldTransaction.accountId) {
        updatedAccounts = updatedAccounts.map((account) => {
          if (account.id === oldTransaction.accountId) {
            return {
              ...account,
              balance: oldTransaction.type === 'income'
                ? round2(account.balance - oldTransaction.amount)
                : round2(account.balance + oldTransaction.amount),
            };
          }
          return account;
        });
      }

      if (transaction.accountId) {
        updatedAccounts = updatedAccounts.map((account) => {
          if (account.id === transaction.accountId) {
            return {
              ...account,
              balance: transaction.type === 'income'
                ? round2(account.balance + transaction.amount)
                : round2(account.balance - transaction.amount),
            };
          }
          return account;
        });
        saveAccounts(updatedAccounts);
      }

      return { transactions: updatedTransactions, accounts: updatedAccounts };
    });
  },

  moveTransactionsToCategory: (ids, categoryId) => {
    if (ids.length === 0) return;
    set((state) => {
      const idSet = new Set(ids);
      const updatedTransactions = state.transactions.map((t) =>
        idSet.has(t.id) ? { ...t, categoryId } : t
      );
      saveTransactions(updatedTransactions);
      return { transactions: updatedTransactions };
    });
  },

  deleteTransaction: (id) => {
    set((state) => {
      const transactionToDelete = state.transactions.find((t) => t.id === id);
      const updatedTransactions = state.transactions.filter((t) => t.id !== id);
      saveTransactions(updatedTransactions);

      let updatedAccounts = state.accounts;
      if (transactionToDelete && transactionToDelete.accountId) {
        updatedAccounts = state.accounts.map((account) => {
          if (account.id === transactionToDelete.accountId) {
            return {
              ...account,
              balance: transactionToDelete.type === 'income'
                ? round2(account.balance - transactionToDelete.amount)
                : round2(account.balance + transactionToDelete.amount),
            };
          }
          return account;
        });
        saveAccounts(updatedAccounts);
      }

      return { transactions: updatedTransactions, accounts: updatedAccounts };
    });
  },

  restoreTransaction: (transaction) => {
    set((state) => {
      // 已存在同 ID（极少发生）则跳过
      if (state.transactions.some((t) => t.id === transaction.id)) {
        return state;
      }
      const updatedTransactions = [...state.transactions, transaction];
      saveTransactions(updatedTransactions);

      let updatedAccounts = state.accounts;
      if (transaction.accountId) {
        updatedAccounts = state.accounts.map((account) => {
          if (account.id === transaction.accountId) {
            return {
              ...account,
              balance: transaction.type === 'income'
                ? round2(account.balance + transaction.amount)
                : round2(account.balance - transaction.amount),
            };
          }
          return account;
        });
        saveAccounts(updatedAccounts);
      }

      return { transactions: updatedTransactions, accounts: updatedAccounts };
    });
  },

  deleteTransactionsBatch: (ids) => {
    if (ids.length === 0) return;
    set((state) => {
      const idSet = new Set(ids);
      const toDelete = state.transactions.filter((t) => idSet.has(t.id));
      const updatedTransactions = state.transactions.filter((t) => !idSet.has(t.id));
      saveTransactions(updatedTransactions);

      let updatedAccounts = state.accounts;
      // 累计每账户的净变更（收入减余额，支出加余额）
      const deltaByAccount = new Map<string, number>();
      for (const t of toDelete) {
        if (!t.accountId) continue;
        const delta = t.type === 'income' ? -t.amount : t.amount;
        deltaByAccount.set(t.accountId, round2((deltaByAccount.get(t.accountId) ?? 0) + delta));
      }
      if (deltaByAccount.size > 0) {
        updatedAccounts = state.accounts.map((account) => {
          const delta = deltaByAccount.get(account.id);
          if (delta === undefined) return account;
          return { ...account, balance: round2(account.balance + delta) };
        });
        saveAccounts(updatedAccounts);
      }

      return { transactions: updatedTransactions, accounts: updatedAccounts };
    });
  },

  reorderTransactions: (fromIndex, toIndex) => {
    set((state) => {
      const updated = [...state.transactions];
      const [removed] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, removed);
      saveTransactions(updated);
      return { transactions: updated };
    });
  },

  setTransactions: (transactions) => {
    saveTransactions(transactions);
    set({ transactions });
  },
});