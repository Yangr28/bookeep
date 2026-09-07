import { StateCreator } from 'zustand';
import { FixedDeposit } from '../types';
import { initialFixedDeposits } from '../data/initialData';
import { loadFixedDeposits, saveFixedDeposits } from '../utils/storage';

export interface FixedDepositsSlice {
  fixedDeposits: FixedDeposit[];
  addFixedDeposit: (deposit: Omit<FixedDeposit, 'id'>) => void;
  deleteFixedDeposit: (id: string) => void;
  updateFixedDeposit: (id: string, updates: Partial<FixedDeposit>) => void;
  setFixedDeposits: (deposits: FixedDeposit[]) => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const createFixedDepositsSlice: StateCreator<FixedDepositsSlice> = (set) => ({
  fixedDeposits: loadFixedDeposits(initialFixedDeposits),

  setFixedDeposits: (deposits) => {
    saveFixedDeposits(deposits);
    set({ fixedDeposits: deposits });
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
});