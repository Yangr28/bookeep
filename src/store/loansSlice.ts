import { StateCreator } from 'zustand';
import { Loan } from '../types';
import { initialLoans } from '../data/initialData';
import { loadLoans, saveLoans } from '../utils/storage';

export interface LoansSlice {
  loans: Loan[];
  addLoan: (loan: Omit<Loan, 'id'>) => void;
  deleteLoan: (id: string) => void;
  updateLoan: (id: string, updates: Partial<Loan>) => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const createLoansSlice: StateCreator<LoansSlice> = (set) => ({
  loans: loadLoans(initialLoans),

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
});