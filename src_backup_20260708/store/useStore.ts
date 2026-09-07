import { create } from 'zustand';
import { Category, Transaction, Account, FixedDeposit, Loan, Transfer } from '../types';
import { initialCategories, initialTransactions, initialAccounts, initialFixedDeposits, initialLoans, initialTransfers } from '../data/initialData';
import { loadTransactions, saveTransactions, loadCategories, saveCategories, loadAccounts, saveAccounts, loadFixedDeposits, saveFixedDeposits, loadLoans, saveLoans, loadTransfers, saveTransfers } from '../utils/storage';

interface Store {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  fixedDeposits: FixedDeposit[];
  loans: Loan[];
  transfers: Transfer[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  reorderTransactions: (fromIndex: number, toIndex: number) => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  deleteCategory: (id: string) => void;
  getCategoryById: (id: string) => Category | undefined;
  addAccount: (account: Omit<Account, 'id'>) => void;
  deleteAccount: (id: string) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  reorderAccounts: (fromIndex: number, toIndex: number) => void;
  getAccountById: (id: string) => Account | undefined;
  addFixedDeposit: (deposit: Omit<FixedDeposit, 'id'>) => void;
  deleteFixedDeposit: (id: string) => void;
  updateFixedDeposit: (id: string, updates: Partial<FixedDeposit>) => void;
  addLoan: (loan: Omit<Loan, 'id'>) => void;
  deleteLoan: (id: string) => void;
  updateLoan: (id: string, updates: Partial<Loan>) => void;
  addTransfer: (transfer: Omit<Transfer, 'id'>) => void;
  deleteTransfer: (id: string) => void;
  getTransfersByAccount: (accountId: string) => Transfer[];
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

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useStore = create<Store>((set, get) => ({
  transactions: loadTransactions(initialTransactions),
  categories: loadCategories(initialCategories),
  accounts: loadAccounts(initialAccounts),
  fixedDeposits: loadFixedDeposits(initialFixedDeposits),
  loans: loadLoans(initialLoans),
  transfers: loadTransfers(initialTransfers),

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
                ? account.balance + transaction.amount
                : account.balance - transaction.amount,
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
      
      // 先减去旧交易的影响
      if (oldTransaction && oldTransaction.accountId) {
        updatedAccounts = updatedAccounts.map((account) => {
          if (account.id === oldTransaction.accountId) {
            return {
              ...account,
              balance: oldTransaction.type === 'income'
                ? account.balance - oldTransaction.amount
                : account.balance + oldTransaction.amount,
            };
          }
          return account;
        });
      }
      
      // 再加上新交易的影响
      if (transaction.accountId) {
        updatedAccounts = updatedAccounts.map((account) => {
          if (account.id === transaction.accountId) {
            return {
              ...account,
              balance: transaction.type === 'income'
                ? account.balance + transaction.amount
                : account.balance - transaction.amount,
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
                ? account.balance - transactionToDelete.amount
                : account.balance + transactionToDelete.amount,
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

  addCategory: (category) => {
    const newCategory: Category = {
      ...category,
      id: generateId(),
    };
    set((state) => {
      const updated = [...state.categories, newCategory];
      saveCategories(updated);
      return { categories: updated };
    });
  },

  deleteCategory: (id) => {
    set((state) => {
      const updated = state.categories.filter((c) => c.id !== id);
      saveCategories(updated);
      return { categories: updated };
    });
  },

  getCategoryById: (id) => {
    return get().categories.find((c) => c.id === id);
  },

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

  addFixedDeposit: (deposit) => {
    const newDeposit: FixedDeposit = {
      ...deposit,
      id: generateId(),
    };
    set((state) => {
      const updated = [...state.fixedDeposits, newDeposit];
      saveFixedDeposits(updated);
      return { fixedDeposits: updated };
    });
  },

  deleteFixedDeposit: (id) => {
    set((state) => {
      const updated = state.fixedDeposits.filter((d) => d.id !== id);
      saveFixedDeposits(updated);
      return { fixedDeposits: updated };
    });
  },

  updateFixedDeposit: (id, updates) => {
    set((state) => {
      const updated = state.fixedDeposits.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      );
      saveFixedDeposits(updated);
      return { fixedDeposits: updated };
    });
  },

  addLoan: (loan) => {
    const newLoan: Loan = {
      ...loan,
      id: generateId(),
    };
    set((state) => {
      const updated = [...state.loans, newLoan];
      saveLoans(updated);
      return { loans: updated };
    });
  },

  deleteLoan: (id) => {
    set((state) => {
      const updated = state.loans.filter((l) => l.id !== id);
      saveLoans(updated);
      return { loans: updated };
    });
  },

  updateLoan: (id, updates) => {
    set((state) => {
      const updated = state.loans.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      );
      saveLoans(updated);
      return { loans: updated };
    });
  },

  addTransfer: (transfer) => {
    const newTransfer: Transfer = {
      ...transfer,
      id: generateId(),
    };
    set((state) => {
      const updatedTransfers = [...state.transfers, newTransfer];
      saveTransfers(updatedTransfers);

      const updatedAccounts = state.accounts.map((account) => {
        if (account.id === transfer.fromAccountId) {
          return { ...account, balance: account.balance - transfer.amount };
        }
        if (account.id === transfer.toAccountId) {
          return { ...account, balance: account.balance + transfer.amount };
        }
        return account;
      });
      saveAccounts(updatedAccounts);

      return { transfers: updatedTransfers, accounts: updatedAccounts };
    });
  },

  deleteTransfer: (id) => {
    set((state) => {
      const transferToDelete = state.transfers.find((t) => t.id === id);
      const updatedTransfers = state.transfers.filter((t) => t.id !== id);
      saveTransfers(updatedTransfers);

      let updatedAccounts = state.accounts;
      if (transferToDelete) {
        updatedAccounts = state.accounts.map((account) => {
          if (account.id === transferToDelete.fromAccountId) {
            return { ...account, balance: account.balance + transferToDelete.amount };
          }
          if (account.id === transferToDelete.toAccountId) {
            return { ...account, balance: account.balance - transferToDelete.amount };
          }
          return account;
        });
        saveAccounts(updatedAccounts);
      }

      return { transfers: updatedTransfers, accounts: updatedAccounts };
    });
  },

  getTransfersByAccount: (accountId) => {
    return get().transfers.filter(
      (t) => t.fromAccountId === accountId || t.toAccountId === accountId
    );
  },

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
    
    // 如果指定了月份和年份，则筛选
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
}));