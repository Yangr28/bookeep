import { StateCreator } from 'zustand';
import { RecurringRecord, Transaction } from '../types';

export interface RecurringSlice {
  recurringRecords: RecurringRecord[];
  addRecurringRecord: (record: Omit<RecurringRecord, 'id' | 'createdAt'>) => void;
  updateRecurringRecord: (id: string, updates: Partial<RecurringRecord>) => void;
  deleteRecurringRecord: (id: string) => void;
  toggleRecurringRecord: (id: string) => void;
  generateRecurringTransactions: () => Transaction[];
  setRecurringRecords: (records: RecurringRecord[]) => void;
}

const STORAGE_KEY = 'bookeep_recurring_records';

type RecurringSliceDependencies = RecurringSlice & {
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
};

function loadFromStorage(): RecurringRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToStorage(records: RecurringRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error(`存储写入失败 [${STORAGE_KEY}]:`, e);
  }
}

export const createRecurringSlice: StateCreator<
  RecurringSliceDependencies,
  [],
  [],
  RecurringSlice
> = (set, get) => ({
  recurringRecords: loadFromStorage(),

  setRecurringRecords: (records) => {
    saveToStorage(records);
    set({ recurringRecords: records });
  },

  addRecurringRecord: (record) => {
    const newRecord: RecurringRecord = {
      ...record,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    set((state) => {
      const next = { recurringRecords: [...state.recurringRecords, newRecord] };
      saveToStorage(next.recurringRecords);
      return next;
    });
  },

  updateRecurringRecord: (id, updates) => {
    set((state) => {
      const next = {
        recurringRecords: state.recurringRecords.map((r) =>
          r.id === id ? { ...r, ...updates } : r
        ),
      };
      saveToStorage(next.recurringRecords);
      return next;
    });
  },

  deleteRecurringRecord: (id) => {
    set((state) => {
      const next = {
        recurringRecords: state.recurringRecords.filter((r) => r.id !== id),
      };
      saveToStorage(next.recurringRecords);
      return next;
    });
  },

  toggleRecurringRecord: (id) => {
    set((state) => {
      const next = {
        recurringRecords: state.recurringRecords.map((r) =>
          r.id === id ? { ...r, enabled: !r.enabled } : r
        ),
      };
      saveToStorage(next.recurringRecords);
      return next;
    });
  },

  generateRecurringTransactions: () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const records = get().recurringRecords.filter((r) => r.enabled);
    const newTransactions: Transaction[] = [];

    records.forEach((record) => {
      const startDate = parseLocalDate(record.startDate);
      if (today < startDate) return;

      let shouldGenerate = false;
      const lastGenerated = record.lastGenerated ? new Date(record.lastGenerated) : null;
      const generatedToday = lastGenerated &&
        lastGenerated.getFullYear() === today.getFullYear() &&
        lastGenerated.getMonth() === today.getMonth() &&
        lastGenerated.getDate() === today.getDate();

      switch (record.frequency) {
        case 'daily':
          shouldGenerate = !generatedToday;
          break;
        case 'weekly':
          shouldGenerate = record.dayOfWeek === today.getDay() &&
            !generatedToday;
          break;
        case 'monthly':
          shouldGenerate = record.dayOfMonth === today.getDate() &&
            !generatedToday;
          break;
        case 'yearly':
          shouldGenerate = record.dayOfMonth === today.getDate() &&
            startDate.getMonth() === today.getMonth() &&
            (!lastGenerated || lastGenerated.getFullYear() < today.getFullYear());
          break;
      }

      if (record.endDate) {
        const endDate = parseLocalDate(record.endDate);
        if (today > endDate) shouldGenerate = false;
      }

      if (shouldGenerate) {
        const transaction: Transaction = {
          id: `rec_${Date.now()}_${Math.random()}`,
          type: record.type,
          amount: record.amount,
          categoryId: record.categoryId,
          note: record.note,
          accountId: record.accountId,
          createdAt: new Date().toISOString(),
        };
        newTransactions.push(transaction);
        get().addTransaction({
          type: transaction.type,
          amount: transaction.amount,
          categoryId: transaction.categoryId,
          note: transaction.note,
          accountId: transaction.accountId,
          createdAt: transaction.createdAt,
        });

        get().updateRecurringRecord(record.id, {
          lastGenerated: new Date().toISOString(),
        });
      }
    });

    return newTransactions;
  },
});

function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}
