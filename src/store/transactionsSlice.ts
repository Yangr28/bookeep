import { StateCreator } from 'zustand';
import { Transaction, Account } from '../types';
import { initialTransactions } from '../data/initialData';
import { loadTransactions, saveTransactions, saveAccounts } from '../utils/storage';

export interface TransactionsSlice {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
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
  transactions: loadTransactions(initialTransactions),

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