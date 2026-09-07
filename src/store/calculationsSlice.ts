import { StateCreator } from 'zustand';
import { Transaction, Category, Account, FixedDeposit, Loan } from '../types';

export interface CalculationsSlice {
  getTotalAssets: () => number;
  getTotalFixedDeposits: () => number;
  getTotalLoans: () => number;
  getTodayIncome: () => number;
  getTodayExpense: () => number;
  getMonthIncome: (month?: number, year?: number) => number;
  getMonthExpense: (month?: number, year?: number) => number;
  getTotalIncome: () => number;
  getTotalExpense: () => number;
  getTotalBalance: () => number;
  getTransactionsByMonth: (month: number, year: number) => Transaction[];
  getTransactionsByAccount: (accountId: string) => Transaction[];
  getAccountIncome: (accountId: string) => number;
  getAccountExpense: (accountId: string) => number;
  getTransactionsGroupedByCategory: (type: 'income' | 'expense', month?: number, year?: number) => { category: Category; total: number }[];
}

interface CalculationsSliceDependencies {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  fixedDeposits: FixedDeposit[];
  loans: Loan[];
  getCategoryById: (id: string) => Category | undefined;
}

export const createCalculationsSlice: StateCreator<
  CalculationsSliceDependencies & CalculationsSlice,
  [],
  [],
  CalculationsSlice
> = (_, get) => ({
  getTotalAssets: () => {
    return get().accounts.reduce((sum, a) => sum + a.balance, 0) + get().getTotalFixedDeposits();
  },

  getTotalFixedDeposits: () => {
    return get().fixedDeposits.reduce((sum, d) => sum + d.principal, 0);
  },

  getTotalLoans: () => {
    return get().loans.reduce((sum, l) => sum + l.remainingAmount, 0);
  },

  getTodayIncome: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().transactions
      .filter((t) => t.type === 'income' && t.createdAt.startsWith(today))
      .reduce((sum, t) => sum + t.amount, 0);
  },

  getTodayExpense: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().transactions
      .filter((t) => t.type === 'expense' && t.createdAt.startsWith(today))
      .reduce((sum, t) => sum + t.amount, 0);
  },

  getMonthIncome: (month?, year?) => {
    const now = new Date();
    const targetMonth = month !== undefined ? month : now.getMonth();
    const targetYear = year !== undefined ? year : now.getFullYear();
    return get().transactions
      .filter((t) => {
        const date = new Date(t.createdAt);
        return t.type === 'income' && date.getMonth() === targetMonth && date.getFullYear() === targetYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  },

  getMonthExpense: (month?, year?) => {
    const now = new Date();
    const targetMonth = month !== undefined ? month : now.getMonth();
    const targetYear = year !== undefined ? year : now.getFullYear();
    return get().transactions
      .filter((t) => {
        const date = new Date(t.createdAt);
        return t.type === 'expense' && date.getMonth() === targetMonth && date.getFullYear() === targetYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  },

  getTotalIncome: () => {
    return get().transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  },

  getTotalExpense: () => {
    return get().transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  },

  getTotalBalance: () => {
    return get().getTotalIncome() - get().getTotalExpense();
  },

  getTransactionsByMonth: (month, year) => {
    return get().transactions.filter((t) => {
      const date = new Date(t.createdAt);
      return date.getMonth() === month && date.getFullYear() === year;
    });
  },

  getTransactionsByAccount: (accountId: string) => {
    return get().transactions.filter((t) => t.accountId === accountId);
  },

  getAccountIncome: (accountId: string) => {
    return get().transactions
      .filter((t) => t.accountId === accountId && t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  },

  getAccountExpense: (accountId: string) => {
    return get().transactions
      .filter((t) => t.accountId === accountId && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  },

  getTransactionsGroupedByCategory: (type, month?, year?) => {
    let transactions = get().transactions.filter((t) => t.type === type);

    if (month !== undefined && year !== undefined) {
      transactions = transactions.filter((t) => {
        const date = new Date(t.createdAt);
        return date.getMonth() === month && date.getFullYear() === year;
      });
    }

    const grouped: Record<string, number> = {};

    transactions.forEach((t) => {
      grouped[t.categoryId] = (grouped[t.categoryId] || 0) + t.amount;
    });

    return Object.entries(grouped)
      .map(([categoryId, total]) => ({
        category: get().getCategoryById(categoryId)!,
        total,
      }))
      .sort((a, b) => b.total - a.total);
  },
});