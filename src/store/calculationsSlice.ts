import { StateCreator } from 'zustand';
import { Transaction, Category, Account, FixedDeposit, Loan, Transfer } from '../types';

/** 单个账户对账结果 */
export interface AccountReconciliation {
  initialBalance: number;   // 初始余额
  income: number;           // 累计收入
  expense: number;          // 累计支出
  transfersIn: number;      // 从其他账户转入
  transfersOut: number;     // 转出到其他账户
  expectedBalance: number;  // 理论余额 = 初始 + 收入 - 支出 + 转入 - 转出
  currentBalance: number;   // 当前记录余额
  diff: number;             // 差额 = 当前 - 理论（≠0 即错账）
}

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
  /** 单账户对账：理论余额 vs 当前余额 */
  getAccountReconciliation: (accountId: string) => AccountReconciliation;
  /** 老账户迁移：为缺少 initialBalance 的账户回填（使对账差额归零） */
  ensureInitialBalances: () => void;
  /** 校正：按流水重算所有账户余额，返回有偏差的账户数 */
  recalculateAllBalances: () => number;
  getTransactionsGroupedByCategory: (type: 'income' | 'expense', month?: number, year?: number) => { category: Category; total: number }[];
}

interface CalculationsSliceDependencies {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  transfers: Transfer[];
  fixedDeposits: FixedDeposit[];
  loans: Loan[];
  getCategoryById: (id: string) => Category | undefined;
  setAccounts: (accounts: Account[]) => void;
}

/** 消除浮点精度误差 */
const round2 = (n: number) => Math.round(n * 100) / 100;

export const createCalculationsSlice: StateCreator<
  CalculationsSliceDependencies & CalculationsSlice,
  [],
  [],
  CalculationsSlice
> = (_, get) => ({
  getTotalAssets: () => {
    return round2(get().accounts.reduce((sum, a) => sum + a.balance, 0) + get().getTotalFixedDeposits());
  },

  getTotalFixedDeposits: () => {
    return round2(get().fixedDeposits.reduce((sum, d) => sum + d.principal, 0));
  },

  getTotalLoans: () => {
    return round2(get().loans.reduce((sum, l) => sum + l.remainingAmount, 0));
  },

  getTodayIncome: () => {
    const today = new Date().toISOString().split('T')[0];
    return round2(get().transactions
      .filter((t) => t.type === 'income' && t.createdAt.startsWith(today))
      .reduce((sum, t) => sum + t.amount, 0));
  },

  getTodayExpense: () => {
    const today = new Date().toISOString().split('T')[0];
    return round2(get().transactions
      .filter((t) => t.type === 'expense' && t.createdAt.startsWith(today))
      .reduce((sum, t) => sum + t.amount, 0));
  },

  getMonthIncome: (month?, year?) => {
    const now = new Date();
    const targetMonth = month !== undefined ? month : now.getMonth();
    const targetYear = year !== undefined ? year : now.getFullYear();
    return round2(get().transactions
      .filter((t) => {
        const date = new Date(t.createdAt);
        return t.type === 'income' && date.getMonth() === targetMonth && date.getFullYear() === targetYear;
      })
      .reduce((sum, t) => sum + t.amount, 0));
  },

  getMonthExpense: (month?, year?) => {
    const now = new Date();
    const targetMonth = month !== undefined ? month : now.getMonth();
    const targetYear = year !== undefined ? year : now.getFullYear();
    return round2(get().transactions
      .filter((t) => {
        const date = new Date(t.createdAt);
        return t.type === 'expense' && date.getMonth() === targetMonth && date.getFullYear() === targetYear;
      })
      .reduce((sum, t) => sum + t.amount, 0));
  },

  getTotalIncome: () => {
    return round2(get().transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0));
  },

  getTotalExpense: () => {
    return round2(get().transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0));
  },

  getTotalBalance: () => {
    return round2(get().getTotalIncome() - get().getTotalExpense());
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
    return round2(get().transactions
      .filter((t) => t.accountId === accountId && t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0));
  },

  getAccountExpense: (accountId) => {
    return round2(get().transactions
      .filter((t) => t.accountId === accountId && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0));
  },

  getAccountReconciliation: (accountId) => {
    const { transactions, transfers, accounts } = get();
    const account = accounts.find((a) => a.id === accountId);

    let income = 0, expense = 0, transfersIn = 0, transfersOut = 0;
    for (const t of transactions) {
      if (t.accountId === accountId) {
        if (t.type === 'income') income += t.amount;
        else expense += t.amount;
      }
    }
    for (const tr of transfers) {
      if (tr.toAccountId === accountId) transfersIn += tr.amount;
      if (tr.fromAccountId === accountId) transfersOut += tr.amount;
    }
    income = round2(income);
    expense = round2(expense);
    transfersIn = round2(transfersIn);
    transfersOut = round2(transfersOut);

    const netFlow = round2(income - expense + transfersIn - transfersOut);
    // 无初始余额记录时（老账户），以当前余额反推初始值，保证迁移当下差额为 0
    const initialBalance = account?.initialBalance !== undefined
      ? round2(account.initialBalance)
      : round2((account?.balance ?? 0) - netFlow);
    const expectedBalance = round2(initialBalance + netFlow);
    const currentBalance = round2(account?.balance ?? 0);

    return {
      initialBalance,
      income,
      expense,
      transfersIn,
      transfersOut,
      expectedBalance,
      currentBalance,
      diff: round2(currentBalance - expectedBalance),
    };
  },

  ensureInitialBalances: () => {
    const { accounts } = get();
    if (accounts.every((a) => a.initialBalance !== undefined)) return;
    const updated = accounts.map((a) => {
      if (a.initialBalance !== undefined) return a;
      const recon = get().getAccountReconciliation(a.id);
      return { ...a, initialBalance: recon.initialBalance };
    });
    get().setAccounts(updated);
  },

  recalculateAllBalances: () => {
    const { accounts } = get();
    let changed = 0;
    const updated = accounts.map((a) => {
      const recon = get().getAccountReconciliation(a.id);
      // 校正后初始余额取对账基准（理论初始值），余额重算为理论值
      if (Math.abs(recon.diff) < 0.005) return a;
      changed += 1;
      return { ...a, initialBalance: recon.initialBalance, balance: recon.expectedBalance };
    });
    if (changed > 0) get().setAccounts(updated);
    return changed;
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
      grouped[t.categoryId] = round2((grouped[t.categoryId] || 0) + t.amount);
    });

    return Object.entries(grouped)
      .map(([categoryId, total]) => ({
        category: get().getCategoryById(categoryId)!,
        total,
      }))
      .sort((a, b) => b.total - a.total);
  },
});