/**
 * 月度智能洞察引擎（纯函数、确定性、零网络）。
 *
 * 输入当月流水 + 历史流水（环比/近 3 月固定订阅识别） + 预算 + 分类映射，
 * 输出结构化 Insight[]，由 UI 层翻译为 i18n 文案与跳转。
 *
 * 六类规则（首版经验阈值在常量集中，便于调参）：
 *  1. 支出环比异常   |Δ| ≥ 30%（上月为 0 跳过，方向决定 severity）
 *  2. 预算超支/临超支 ≥ 100% danger / ≥ 80% warning
 *  3. 预计月末超支   日均 × 当月天数 > 预算（仅在未超支时报告，避免与规则 2 重复）
 *  4. 大额支出       单笔 ≥ 当月支出日均的 5 倍，最多列 3 笔
 *  5. 固定/订阅支出  同分类 + 金额 ±5% + 近 3 月至少 2 月出现
 *  6. 高频消费       单分类当月笔数 ≥ 8
 *
 * 数据不足保护：当月支出笔数 < 5 时，环比 / 大额 / 高频 / 预计超支静默；
 * 无预算时预算类与预计超支静默；上月支出为 0 时环比静默。
 *
 * 所有时间派生（月份键、当月天数、已过天数）一律走 `src/utils/date.ts` 本地时区工具。
 */
import { Transaction, TransactionType } from '../types';
import { addMonths, getMonthKey, monthStart } from './date';

export type InsightType =
  | 'anomaly_mom'
  | 'budget_overrun'
  | 'budget_warning'
  | 'forecast_overrun'
  | 'large_expense'
  | 'recurring'
  | 'frequent';

export type InsightSeverity = 'info' | 'warning' | 'danger';

export interface Insight {
  type: InsightType;
  severity: InsightSeverity;
  /** i18n key，UI 层用 t(titleKey, titleParams) 渲染 */
  titleKey: string;
  titleParams?: Record<string, string | number>;
  /** i18n key，描述文案 */
  descriptionKey: string;
  descriptionParams?: Record<string, string | number>;
  /** 关联金额（人民币），UI 用 formatCurrency 渲染 */
  amount?: number;
  /** 跳转所需的最小载荷 */
  payload?: {
    categoryId?: string;
    transactionIds?: string[];
    month?: string;
  };
}

/** 复用 budgetsSlice 的 Budget 形状，避免循环依赖 */
export interface InsightBudget {
  id: string;
  categoryId: string;
  amount: number;
  spent: number;
  month: string;
}

export interface InsightCategory {
  id: string;
  name: string;
  type: TransactionType;
}

export interface InsightContext {
  /** 当月流水（用于笔数/总额/高频/大额/预算已花） */
  currentMonthTransactions: Transaction[];
  /** 全部历史流水（函数内部按需筛选近 3 月、上月；用于环比与固定订阅识别） */
  allTransactions: Transaction[];
  /** 预算列表，可选；为空时预算类与预计超支规则静默 */
  budgets?: InsightBudget[];
  /** 分类映射，用于把 categoryId 翻译为名称塞进 titleParams */
  categories: InsightCategory[];
  /** 当前时间，单测与时区无关断言用；默认 new Date() */
  now?: Date;
}

// ───────── 阈值常量（首版经验值，便于调参） ─────────
export const ANOMALY_THRESHOLD = 0.30;
export const ANOMALY_DANGER_THRESHOLD = 0.50;
export const BUDGET_WARNING_RATIO = 0.80;
export const BUDGET_DANGER_RATIO = 1.00;
export const LARGE_EXPENSE_MULTIPLE = 5;
export const RECURRING_AMOUNT_TOLERANCE = 0.05;
export const RECURRING_WINDOW_MONTHS = 3;
export const RECURRING_MIN_MONTHS = 2;
export const FREQUENT_TX_THRESHOLD = 8;
export const MIN_TX_FOR_RULES = 5;
export const LARGE_EXPENSE_MAX_ITEMS = 3;

const txMonth = (tx: Transaction): string => getMonthKey(new Date(tx.createdAt));
const daysInMonth = (d: Date): number =>
  new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
const formatAmount = (n: number): string => n.toFixed(2);

/**
 * 生成当月洞察列表。规则间相互独立，数据不足时静默（不输出对应类型）。
 */
export const generateInsights = (ctx: InsightContext): Insight[] => {
  const now = ctx.now ?? new Date();
  const currentMonth = getMonthKey(now);
  const prevMonth = getMonthKey(addMonths(monthStart(now), -1));

  const categoryMap = new Map(ctx.categories.map((c) => [c.id, c]));
  const categoryName = (id: string): string => categoryMap.get(id)?.name ?? '';

  const currentExpenses = ctx.currentMonthTransactions.filter((t) => t.type === 'expense');
  const currentSpent = currentExpenses.reduce((sum, t) => sum + t.amount, 0);
  const prevSpent = ctx.allTransactions
    .filter((t) => t.type === 'expense' && txMonth(t) === prevMonth)
    .reduce((sum, t) => sum + t.amount, 0);

  const sufficient = currentExpenses.length >= MIN_TX_FOR_RULES;
  const totalDays = daysInMonth(now);
  const elapsedDays = Math.max(1, now.getDate());
  const dailyAvg = currentSpent / elapsedDays;

  const insights: Insight[] = [];

  // ── 1. 支出环比异常 ──
  if (sufficient && prevSpent > 0) {
    const change = (currentSpent - prevSpent) / prevSpent;
    if (Math.abs(change) >= ANOMALY_THRESHOLD) {
      const up = change > 0;
      const pct = Math.round(Math.abs(change) * 100);
      insights.push({
        type: 'anomaly_mom',
        // 上升超 50% danger，30-50% warning；下降一律 info（少花钱不算坏）
        severity: up
          ? Math.abs(change) >= ANOMALY_DANGER_THRESHOLD
            ? 'danger'
            : 'warning'
          : 'info',
        titleKey: 'insights.anomaly_mom.title',
        titleParams: { pct, direction: up ? 'up' : 'down' },
        descriptionKey: 'insights.anomaly_mom.description',
        descriptionParams: {
          current: formatAmount(currentSpent),
          prev: formatAmount(prevSpent),
          direction: up ? 'up' : 'down',
        },
        amount: currentSpent - prevSpent,
        payload: { month: currentMonth },
      });
    }
  }

  // ── 2 & 3. 预算超支/临超支 + 预计月末超支（per-budget） ──
  if (ctx.budgets && ctx.budgets.length > 0) {
    for (const budget of ctx.budgets) {
      if (budget.month !== currentMonth || budget.amount <= 0) continue;
      const catTxs = currentExpenses.filter((t) => t.categoryId === budget.categoryId);
      const spent = catTxs.reduce((sum, t) => sum + t.amount, 0);
      const ratio = spent / budget.amount;
      const cat = categoryName(budget.categoryId);
      const catTxIds = catTxs.map((t) => t.id);

      // 2. 已超支 / 临超支
      if (ratio >= BUDGET_DANGER_RATIO) {
        insights.push({
          type: 'budget_overrun',
          severity: 'danger',
          titleKey: 'insights.budget_overrun.title',
          titleParams: { category: cat },
          descriptionKey: 'insights.budget_overrun.description',
          descriptionParams: {
            spent: formatAmount(spent),
            budget: formatAmount(budget.amount),
            pct: Math.round(ratio * 100),
          },
          amount: spent - budget.amount,
          payload: { categoryId: budget.categoryId, month: currentMonth, transactionIds: catTxIds },
        });
      } else if (ratio >= BUDGET_WARNING_RATIO) {
        insights.push({
          type: 'budget_warning',
          severity: 'warning',
          titleKey: 'insights.budget_warning.title',
          titleParams: { category: cat },
          descriptionKey: 'insights.budget_warning.description',
          descriptionParams: {
            spent: formatAmount(spent),
            budget: formatAmount(budget.amount),
            pct: Math.round(ratio * 100),
          },
          amount: spent,
          payload: { categoryId: budget.categoryId, month: currentMonth, transactionIds: catTxIds },
        });
      }

      // 3. 预计月末超支（仅在尚未超支时报告，避免与规则 2 重复）
      if (sufficient && ratio < BUDGET_DANGER_RATIO) {
        const catDailyAvg = spent / elapsedDays;
        const forecast = catDailyAvg * totalDays;
        if (forecast > budget.amount) {
          insights.push({
            type: 'forecast_overrun',
            severity: 'warning',
            titleKey: 'insights.forecast_overrun.title',
            titleParams: { category: cat },
            descriptionKey: 'insights.forecast_overrun.description',
            descriptionParams: {
              forecast: formatAmount(forecast),
              budget: formatAmount(budget.amount),
            },
            amount: forecast - budget.amount,
            payload: { categoryId: budget.categoryId, month: currentMonth, transactionIds: catTxIds },
          });
        }
      }
    }
  }

  // ── 4. 大额支出 ──
  if (sufficient && currentSpent > 0) {
    const threshold = dailyAvg * LARGE_EXPENSE_MULTIPLE;
    const large = currentExpenses
      .filter((t) => t.amount >= threshold)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, LARGE_EXPENSE_MAX_ITEMS);
    if (large.length > 0) {
      insights.push({
        type: 'large_expense',
        severity: large[0].amount >= dailyAvg * LARGE_EXPENSE_MULTIPLE * 2 ? 'danger' : 'warning',
        titleKey: 'insights.large_expense.title',
        titleParams: { count: large.length },
        descriptionKey: 'insights.large_expense.description',
        descriptionParams: {
          amount: formatAmount(large[0].amount),
          count: large.length,
        },
        amount: large[0].amount,
        payload: { transactionIds: large.map((t) => t.id), month: currentMonth },
      });
    }
  }

  // ── 5. 固定 / 订阅类支出识别（近 3 月含当月） ──
  const windowMonths = new Set<string>();
  for (let i = 0; i < RECURRING_WINDOW_MONTHS; i++) {
    windowMonths.add(getMonthKey(addMonths(monthStart(now), -i)));
  }

  const recentByCategory = new Map<string, Transaction[]>();
  for (const tx of ctx.allTransactions) {
    if (tx.type !== 'expense') continue;
    if (!windowMonths.has(txMonth(tx))) continue;
    const list = recentByCategory.get(tx.categoryId);
    if (list) list.push(tx);
    else recentByCategory.set(tx.categoryId, [tx]);
  }

  recurring: for (const [categoryId, txs] of recentByCategory) {
    // 同分类按金额升序，贪心聚类：与簇首金额相差 ±5% 视为同一订阅
    const sorted = txs.slice().sort((a, b) => a.amount - b.amount);
    const clusters: { amount: number; months: Set<string>; count: number; ids: string[] }[] = [];
    for (const tx of sorted) {
      let placed = false;
      for (const c of clusters) {
        const denom = Math.max(c.amount, tx.amount);
        if (denom > 0 && Math.abs(tx.amount - c.amount) / denom <= RECURRING_AMOUNT_TOLERANCE) {
          c.months.add(txMonth(tx));
          c.count += 1;
          c.ids.push(tx.id);
          placed = true;
          break;
        }
      }
      if (!placed) {
        clusters.push({
          amount: tx.amount,
          months: new Set([txMonth(tx)]),
          count: 1,
          ids: [tx.id],
        });
      }
    }
    for (const c of clusters) {
      if (c.months.size >= RECURRING_MIN_MONTHS) {
        insights.push({
          type: 'recurring',
          severity: 'info',
          titleKey: 'insights.recurring.title',
          titleParams: { category: categoryName(categoryId) },
          descriptionKey: 'insights.recurring.description',
          descriptionParams: {
            amount: formatAmount(c.amount),
            months: c.months.size,
          },
          amount: c.amount,
          payload: { categoryId, month: currentMonth, transactionIds: c.ids },
        });
        // 一个分类只取首个命中簇，避免噪声
        continue recurring;
      }
    }
  }

  // ── 6. 高频消费 ──
  if (sufficient) {
    const counts = new Map<string, string[]>();
    for (const tx of currentExpenses) {
      const ids = counts.get(tx.categoryId);
      if (ids) ids.push(tx.id);
      else counts.set(tx.categoryId, [tx.id]);
    }
    // 同分类只输出一条；按 count 降序保证 UI 渲染稳定
    const sortedCounts = [...counts.entries()].sort((a, b) => b[1].length - a[1].length);
    for (const [categoryId, ids] of sortedCounts) {
      if (ids.length >= FREQUENT_TX_THRESHOLD) {
        insights.push({
          type: 'frequent',
          severity: 'info',
          titleKey: 'insights.frequent.title',
          titleParams: { category: categoryName(categoryId), count: ids.length },
          descriptionKey: 'insights.frequent.description',
          descriptionParams: { count: ids.length },
          payload: { categoryId, month: currentMonth, transactionIds: ids },
        });
      }
    }
  }

  return insights;
};
