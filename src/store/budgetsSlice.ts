import { StateCreator } from 'zustand';
import { Transaction } from '../types';

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  spent: number;
  month: string;
}

export interface BudgetsSlice {
  budgets: Budget[];
  addBudget: (categoryId: string, amount: number, month: string) => void;
  updateBudget: (id: string, updates: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  getBudgetByCategory: (categoryId: string, month: string) => Budget | undefined;
  calculateBudgetUsage: (categoryId: string, month: string, transactions: Transaction[]) => { budget: number; spent: number; percentage: number };
  setBudgets: (budgets: Budget[]) => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const createBudgetsSlice: StateCreator<BudgetsSlice> = (set, get) => ({
  budgets: [],

  addBudget: (categoryId, amount, month) => {
    const existing = get().getBudgetByCategory(categoryId, month);
    if (existing) {
      get().updateBudget(existing.id, { amount });
      return;
    }
    const newBudget: Budget = {
      id: generateId(),
      categoryId,
      amount,
      spent: 0,
      month,
    };
    set((state) => ({ budgets: [...state.budgets, newBudget] }));
  },

  updateBudget: (id, updates) => {
    set((state) => ({
      budgets: state.budgets.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    }));
  },

  deleteBudget: (id) => {
    set((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) }));
  },

  getBudgetByCategory: (categoryId, month) => {
    return get().budgets.find(
      (b) => b.categoryId === categoryId && b.month === month
    );
  },

  calculateBudgetUsage: (categoryId, month, transactions) => {
    const budget = get().getBudgetByCategory(categoryId, month);
    
    const spent = transactions
      .filter((t) => {
        const tMonth = new Date(t.createdAt).toISOString().slice(0, 7);
        return t.categoryId === categoryId && t.type === 'expense' && tMonth === month;
      })
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      budget: budget?.amount || 0,
      spent,
      percentage: budget?.amount ? Math.min((spent / budget.amount) * 100, 100) : 0,
    };
  },

  setBudgets: (budgets) => set({ budgets }),
});
