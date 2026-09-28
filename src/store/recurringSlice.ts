import { StateCreator } from 'zustand';
import { RecurringRecord, Transaction } from '../types';
import { parseDateKey } from '../utils/date';

export interface RecurringSlice {
  recurringRecords: RecurringRecord[];
  addRecurringRecord: (record: Omit<RecurringRecord, 'id' | 'createdAt'>) => void;
  updateRecurringRecord: (id: string, updates: Partial<RecurringRecord>) => void;
  deleteRecurringRecord: (id: string) => void;
  toggleRecurringRecord: (id: string) => void;
  /** 检查所有启用的周期规则，为到期或错过的周期生成交易并更新 lastGenerated */
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

/** 将 Date 规范化到本地时区当日 00:00，用于纯日期比较 */
function toDateMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * 计算规则在 `today`（含）之前最近的触发日。
 * - daily：今天
 * - weekly：本周匹配 dayOfWeek 的那天（可能是今天或更早）
 * - monthly：本月或上月 dayOfMonth 那天（dayOfMonth 大于本月天数时钳到月末）
 * - yearly：今年或去年 startDate 月日对应的周年
 * 返回 null 表示规则配置异常无法计算。
 */
function getMostRecentTriggerDay(record: RecurringRecord, today: Date): Date | null {
  switch (record.frequency) {
    case 'daily':
      return today;
    case 'weekly': {
      const targetDow = record.dayOfWeek ?? 0;
      const diff = (today.getDay() - targetDow + 7) % 7;
      return new Date(today.getFullYear(), today.getMonth(), today.getDate() - diff);
    }
    case 'monthly': {
      const dom = record.dayOfMonth ?? 1;
      if (today.getDate() >= dom) {
        const days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        return new Date(today.getFullYear(), today.getMonth(), Math.min(dom, days));
      }
      const m = today.getMonth() - 1;
      const y = m < 0 ? today.getFullYear() - 1 : today.getFullYear();
      const mm = m < 0 ? 11 : m;
      const days = new Date(y, mm + 1, 0).getDate();
      return new Date(y, mm, Math.min(dom, days));
    }
    case 'yearly': {
      const start = parseDateKey(record.startDate);
      const m = start.getMonth();
      const d = start.getDate();
      const thisYear = new Date(today.getFullYear(), m, d);
      if (today >= thisYear) return thisYear;
      return new Date(today.getFullYear() - 1, m, d);
    }
    default:
      return null;
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
    const today = toDateMidnight(now);
    const records = get().recurringRecords.filter((r) => r.enabled);
    const newTransactions: Transaction[] = [];

    records.forEach((record) => {
      const triggerDay = getMostRecentTriggerDay(record, today);
      if (!triggerDay) return;

      // 规则尚未开始生效（startDate 在触发日之后）：跳过本次，等待 startDate 到来后再生成
      const startDate = parseDateKey(record.startDate);
      if (triggerDay < startDate) return;

      // 已为该触发日生成过：lastGenerated >= triggerDay 表示已记录
      const lastGen = record.lastGenerated
        ? toDateMidnight(new Date(record.lastGenerated))
        : null;
      if (lastGen && lastGen.getTime() >= triggerDay.getTime()) return;

      // 超过结束日期：不再生成（触发日 > endDate 才算过期，触发日 == endDate 仍生成）
      if (record.endDate) {
        // endDate 为 'YYYY-MM-DD' 键，必须按本地时区解析；new Date(key) 按 UTC 解析会导致
        // 西半球时区在截止日当天被误判为已过期
        const endDate = parseDateKey(record.endDate);
        if (triggerDay > endDate) return;
      }

      // 生成的交易日期取触发日当天（补账时落在实际发生日，便于按月统计）
      newTransactions.push({
        id: `rec_${Date.now()}_${Math.random()}`,
        type: record.type,
        amount: record.amount,
        categoryId: record.categoryId,
        note: record.note,
        accountId: record.accountId,
        createdAt: triggerDay.toISOString(),
      });

      // lastGenerated 记录为触发日，避免同日重复生成；错过多期只补最近一期
      get().updateRecurringRecord(record.id, {
        lastGenerated: triggerDay.toISOString(),
      });
    });

    return newTransactions;
  },
});
