import { StateCreator } from 'zustand';
import { Loan } from '../types';
import { initialLoans } from '../data/initialData';
import { loadLoans, saveLoans } from '../utils/storage';

export interface LoansSlice {
  loans: Loan[];
  addLoan: (loan: Omit<Loan, 'id'>) => void;
  deleteLoan: (id: string) => void;
  updateLoan: (id: string, updates: Partial<Loan>) => void;
  /** 记录一期还款：增加 paidAmount、减少 remainingAmount，还清时自动标记为 paid */
  recordLoanPayment: (id: string, amount: number) => void;
  setLoans: (loans: Loan[]) => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/** 消除浮点精度误差 */
const round2 = (n: number) => Math.round(n * 100) / 100;

export const createLoansSlice: StateCreator<LoansSlice> = (set) => ({
  loans: loadLoans(initialLoans),

  setLoans: (loans) => {
    saveLoans(loans);
    set({ loans });
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

  recordLoanPayment: (id, amount) => {
    set((state) => {
      const updated = state.loans.map((l) => {
        if (l.id !== id) return l;
        const newPaid = round2(l.paidAmount + amount);
        const newRemaining = round2(l.remainingAmount - amount);
        const isPaidOff = newRemaining <= 0;
        return {
          ...l,
          paidAmount: Math.min(newPaid, l.principal),
          remainingAmount: Math.max(newRemaining, 0),
          status: isPaidOff ? 'paid' as const : l.status,
        };
      });
      saveLoans(updated);
      return { loans: updated };
    });
  },
});