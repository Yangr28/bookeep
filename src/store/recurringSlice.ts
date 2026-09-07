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

export const createRecurringSlice: StateCreator<RecurringSlice> = (set, get) => ({
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
      let shouldGenerate = false;

      switch (record.frequency) {
        case 'daily':
          shouldGenerate = !record.lastGenerated || 
            today.getTime() > new Date(record.lastGenerated).getTime();
          break;
        case 'weekly':
          shouldGenerate = record.dayOfWeek === today.getDay() &&
            (!record.lastGenerated || today.getTime() > new Date(record.lastGenerated).getTime());
          break;
        case 'monthly':
          shouldGenerate = record.dayOfMonth === today.getDate() &&
            (!record.lastGenerated || today.getTime() > new Date(record.lastGenerated).getTime());
          break;
        case 'yearly':
          shouldGenerate = record.dayOfMonth === today.getDate() &&
            !record.lastGenerated;
          break;
      }

      if (record.endDate) {
        const endDate = new Date(record.endDate);
        if (today > endDate) shouldGenerate = false;
      }

      if (shouldGenerate) {
        newTransactions.push({
          id: `rec_${Date.now()}_${Math.random()}`,
          type: record.type,
          amount: record.amount,
          categoryId: record.categoryId,
          note: record.note,
          accountId: record.accountId,
          createdAt: new Date().toISOString(),
        });

        get().updateRecurringRecord(record.id, {
          lastGenerated: new Date().toISOString(),
        });
      }
    });

    return newTransactions;
  },
});
