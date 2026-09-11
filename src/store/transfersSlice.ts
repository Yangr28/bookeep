import { StateCreator } from 'zustand';
import { Transfer, Account } from '../types';
import { initialTransfers } from '../data/initialData';
import { loadTransfers, saveTransfers, saveAccounts } from '../utils/storage';

export interface TransfersSlice {
  transfers: Transfer[];
  addTransfer: (transfer: Omit<Transfer, 'id'>) => void;
  deleteTransfer: (id: string) => void;
  getTransfersByAccount: (accountId: string) => Transfer[];
  setTransfers: (transfers: Transfer[]) => void;
}

interface TransfersSliceDependencies {
  accounts: Account[];
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/** 消除浮点精度误差：0.1+0.2 → 0.3 */
const round2 = (n: number) => Math.round(n * 100) / 100;

export const createTransfersSlice: StateCreator<
  TransfersSliceDependencies & TransfersSlice,
  [],
  [],
  TransfersSlice
> = (set, get) => ({
  transfers: loadTransfers(initialTransfers),

  setTransfers: (transfers) => {
    saveTransfers(transfers);
    set({ transfers });
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
          return { ...account, balance: round2(account.balance - transfer.amount) };
        }
        if (account.id === transfer.toAccountId) {
          return { ...account, balance: round2(account.balance + transfer.amount) };
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
            return { ...account, balance: round2(account.balance + transferToDelete.amount) };
          }
          if (account.id === transferToDelete.toAccountId) {
            return { ...account, balance: round2(account.balance - transferToDelete.amount) };
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
});