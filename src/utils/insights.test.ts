import { describe, it, expect } from 'vitest';
import { Transaction } from '../types';
import {
  generateInsights,
  InsightBudget,
  InsightCategory,
} from './insights';

/**
 * 时区无关约定（CI 双时区矩阵）：用本地字段构造 Date，
 * 月份键/日期键一律由 date.ts 派生，断言不依赖 UTC 偏移。
 */
const NOW = new Date(2026, 5, 15, 12, 30, 0); // 本地时区 2026-06-15 12:30
const CURRENT_MONTH = '2026-06';
const PREV_MONTH = '2026-05';
const TWO_MONTHS_AGO = '2026-04';
// June 30 天；elapsedDays=15

let seq = 0;
const makeTx = (partial: Partial<Transaction> = {}): Transaction => ({
  id: `t${++seq}`,
  type: 'expense',
  amount: 10,
  categoryId: 'food',
  note: '',
  accountId: 'acc1',
  createdAt: NOW.toISOString(),
  ...partial,
});

/** 'YYYY-MM-DD' → 本地正午 ISO（避免日界/DST 边界） */
const onDate = (dateKey: string, hour = 12): string => {
  const [y, m, d] = dateKey.split('-').map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d, hour, 0, 0).toISOString();
};

const makeCategory = (partial: Partial<InsightCategory>): InsightCategory => ({
  id: 'food',
  name: '餐饮',
  type: 'expense',
  ...partial,
});

const makeBudget = (partial: Partial<InsightBudget>): InsightBudget => ({
  id: 'b1',
  categoryId: 'food',
  amount: 1000,
  spent: 0,
  month: CURRENT_MONTH,
  ...partial,
});

const baseCategories: InsightCategory[] = [
  makeCategory({ id: 'food', name: '餐饮' }),
  makeCategory({ id: 'sub', name: '订阅' }),
  makeCategory({ id: 'tr', name: '交通' }),
];

describe('insights - anomaly_mom', () => {
  it('上升 ≥50% 触发 warning，>80% 触发 danger', () => {
    // 当月 8 笔 ×200 = 1600（vs 上月 1000 → +60%）
    const current = Array.from({ length: 8 }, (_, i) =>
      makeTx({
        id: `c${i}`,
        amount: 200,
        categoryId: 'food',
        createdAt: onDate(`2026-06-${10 + i}`),
      }),
    );
    const prev = Array.from({ length: 5 }, (_, i) =>
      makeTx({
        id: `p${i}`,
        amount: 50 + i * 50, // 50,100,150,200,250 → sum=750
        categoryId: 'tr', // 用不同分类避免固定订阅误触发
        createdAt: onDate(`2026-05-${10 + i}`),
      }),
    );
    // 调整 prev 总和为 1000
    prev[4].amount = 500; // 50+100+150+200+500=1000

    const r = generateInsights({
      currentMonthTransactions: current,
      allTransactions: prev, // allTransactions 仅含上月 → 不触发固定订阅
      categories: baseCategories,
      now: NOW,
    });
    const anomaly = r.filter((x) => x.type === 'anomaly_mom');
    expect(anomaly).toHaveLength(1);
    expect(anomaly[0].severity).toBe('warning');
    expect(anomaly[0].titleParams!.pct).toBe(60);
    expect(anomaly[0].titleParams!.direction).toBe('up');
  });

  it('上升 ≥80% 触发 danger', () => {
    const current = Array.from({ length: 8 }, (_, i) =>
      makeTx({
        id: `c${i}`,
        amount: 60,
        categoryId: 'food',
        createdAt: onDate(`2026-06-${10 + i}`),
      }),
    );
    // 8 笔 60 = 480，上月 5 笔 tr 分类各 20 = 100 → +380%
    const prev = Array.from({ length: 5 }, () =>
      makeTx({
        amount: 20,
        categoryId: 'tr',
        createdAt: onDate('2026-05-10'),
      }),
    );
    const r = generateInsights({
      currentMonthTransactions: current,
      allTransactions: prev,
      categories: baseCategories,
      now: NOW,
    });
    const anomaly = r.filter((x) => x.type === 'anomaly_mom');
    expect(anomaly).toHaveLength(1);
    expect(anomaly[0].severity).toBe('danger');
  });

  it('下降 ≥50% 触发 info', () => {
    // 当月 8 笔 ×20 = 160 vs 上月 1000 → -84%
    const current = Array.from({ length: 8 }, () =>
      makeTx({
        amount: 20,
        categoryId: 'food',
        createdAt: onDate('2026-06-10'),
      }),
    );
    const prev = Array.from({ length: 5 }, (_, i) =>
      makeTx({
        id: `p${i}`,
        amount: 50 + i * 50,
        categoryId: 'tr',
        createdAt: onDate(`2026-05-${10 + i}`),
      }),
    );
    prev[4].amount = 500;
    const r = generateInsights({
      currentMonthTransactions: current,
      allTransactions: prev,
      categories: baseCategories,
      now: NOW,
    });
    const anomaly = r.filter((x) => x.type === 'anomaly_mom');
    expect(anomaly).toHaveLength(1);
    expect(anomaly[0].severity).toBe('info');
    expect(anomaly[0].titleParams!.direction).toBe('down');
  });

  it('数据不足（当月支出 < 8 笔）静默', () => {
    const current = Array.from({ length: 7 }, () =>
      makeTx({ amount: 1000, createdAt: onDate('2026-06-10') }),
    );
    const prev = Array.from({ length: 5 }, () =>
      makeTx({ amount: 20, categoryId: 'tr', createdAt: onDate('2026-05-10') }),
    );
    const r = generateInsights({
      currentMonthTransactions: current,
      allTransactions: prev,
      categories: baseCategories,
      now: NOW,
    });
    expect(r.filter((x) => x.type === 'anomaly_mom')).toHaveLength(0);
  });

  it('上月支出为 0 静默', () => {
    const current = Array.from({ length: 8 }, () =>
      makeTx({ amount: 100, createdAt: onDate('2026-06-10') }),
    );
    const r = generateInsights({
      currentMonthTransactions: current,
      allTransactions: [],
      categories: baseCategories,
      now: NOW,
    });
    expect(r.filter((x) => x.type === 'anomaly_mom')).toHaveLength(0);
  });

  it('变化 < 50% 不触发', () => {
    const current = Array.from({ length: 8 }, (_, i) =>
      makeTx({
        amount: 100,
        categoryId: 'food',
        createdAt: onDate(`2026-06-${10 + i}`),
      }),
    );
    const prev = Array.from({ length: 8 }, (_, i) =>
      makeTx({
        amount: 110,
        categoryId: 'tr',
        createdAt: onDate(`2026-05-${10 + i}`),
      }),
    );
    const r = generateInsights({
      currentMonthTransactions: current, // 800
      allTransactions: prev, // 880 → -9%
      categories: baseCategories,
      now: NOW,
    });
    expect(r.filter((x) => x.type === 'anomaly_mom')).toHaveLength(0);
  });
});

describe('insights - budget_overrun / budget_warning', () => {
  it('ratio ≥ 100% danger', () => {
    // 1 笔 1000，预算 1000 → ratio=1.0
    const current = [makeTx({ amount: 1000, categoryId: 'food', createdAt: onDate('2026-06-10') })];
    const r = generateInsights({
      currentMonthTransactions: current,
      allTransactions: [],
      budgets: [makeBudget({ amount: 1000 })],
      categories: baseCategories,
      now: NOW,
    });
    const overrun = r.filter((x) => x.type === 'budget_overrun');
    expect(overrun).toHaveLength(1);
    expect(overrun[0].severity).toBe('danger');
    expect(overrun[0].titleParams!.category).toBe('餐饮');
    expect(overrun[0].titleParams).toBeDefined();
  });

  it('ratio ≥ 80% warning', () => {
    // 1 笔 800，预算 1000 → ratio=0.8
    const current = [makeTx({ amount: 800, categoryId: 'food', createdAt: onDate('2026-06-10') })];
    const r = generateInsights({
      currentMonthTransactions: current,
      allTransactions: [],
      budgets: [makeBudget({ amount: 1000 })],
      categories: baseCategories,
      now: NOW,
    });
    const warn = r.filter((x) => x.type === 'budget_warning');
    expect(warn).toHaveLength(1);
    expect(warn[0].severity).toBe('warning');
    // 尚未超支 → 不应有 overrun
    expect(r.filter((x) => x.type === 'budget_overrun')).toHaveLength(0);
  });

  it('ratio < 80% 不触发预算类', () => {
    const current = [makeTx({ amount: 700, categoryId: 'food', createdAt: onDate('2026-06-10') })];
    const r = generateInsights({
      currentMonthTransactions: current,
      allTransactions: [],
      budgets: [makeBudget({ amount: 1000 })],
      categories: baseCategories,
      now: NOW,
    });
    expect(
      r.filter((x) => x.type === 'budget_overrun' || x.type === 'budget_warning'),
    ).toHaveLength(0);
  });

  it('无预算静默', () => {
    const current = Array.from({ length: 5 }, () =>
      makeTx({ amount: 1000, createdAt: onDate('2026-06-10') }),
    );
    const r = generateInsights({
      currentMonthTransactions: current,
      allTransactions: [],
      categories: baseCategories,
      now: NOW,
    });
    expect(
      r.filter(
        (x) =>
          x.type === 'budget_overrun' ||
          x.type === 'budget_warning' ||
          x.type === 'forecast_overrun',
      ),
    ).toHaveLength(0);
  });
});

describe('insights - forecast_overrun', () => {
  it('预计月末超支触发 warning（且未超支不重复报）', () => {
    // 8 笔 90 = 720，预算 1000，elapsedDays=15/totalDays=30
    // catDailyAvg=48，forecast=1440 > 1000 → 触发；ratio=0.72 < 0.8 不触发临超支
    const current = Array.from({ length: 8 }, (_, i) =>
      makeTx({
        amount: 90,
        categoryId: 'food',
        createdAt: onDate(`2026-06-${(i % 14) + 1}`),
      }),
    );
    const r = generateInsights({
      currentMonthTransactions: current,
      allTransactions: [],
      budgets: [makeBudget({ amount: 1000 })],
      categories: baseCategories,
      now: NOW,
    });
    const fc = r.filter((x) => x.type === 'forecast_overrun');
    expect(fc).toHaveLength(1);
    expect(fc[0].severity).toBe('warning');
    expect(fc[0].titleParams!.category).toBe('餐饮');
    // 同时不应有 budget_overrun/budget_warning
    expect(r.filter((x) => x.type === 'budget_overrun' || x.type === 'budget_warning')).toHaveLength(0);
  });

  it('数据不足（<8 笔）静默 forecast', () => {
    const current = Array.from({ length: 7 }, () =>
      makeTx({ amount: 200, categoryId: 'food', createdAt: onDate('2026-06-10') }),
    );
    const r = generateInsights({
      currentMonthTransactions: current,
      allTransactions: [],
      budgets: [makeBudget({ amount: 100 })],
      categories: baseCategories,
      now: NOW,
    });
    expect(r.filter((x) => x.type === 'forecast_overrun')).toHaveLength(0);
  });

  it('预计未超支不触发', () => {
    // 8 笔 100 = 800，预算 2000，forecast=1600 < 2000
    const current = Array.from({ length: 8 }, () =>
      makeTx({ amount: 100, categoryId: 'food', createdAt: onDate('2026-06-10') }),
    );
    const r = generateInsights({
      currentMonthTransactions: current,
      allTransactions: [],
      budgets: [makeBudget({ amount: 2000 })],
      categories: baseCategories,
      now: NOW,
    });
    expect(r.filter((x) => x.type === 'forecast_overrun')).toHaveLength(0);
  });
});

describe('insights - large_expense', () => {
  it('单笔 ≥ 日均 5 倍触发，列出最多 3 笔', () => {
    // 7 笔 50 = 350 + 1 笔 300 = 650；dailyAvg=650/15≈43.3；threshold≈216.7
    // 300 ≥ 216.7 → 触发；300 < 216.7*2≈433.3 → warning
    const current = [
      ...Array.from({ length: 7 }, () =>
        makeTx({ amount: 50, categoryId: 'food', createdAt: onDate('2026-06-10') }),
      ),
      makeTx({ id: 'big1', amount: 300, categoryId: 'food', createdAt: onDate('2026-06-11') }),
    ];
    const r = generateInsights({
      currentMonthTransactions: current,
      allTransactions: [],
      categories: baseCategories,
      now: NOW,
    });
    const large = r.filter((x) => x.type === 'large_expense');
    expect(large).toHaveLength(1);
    expect(large[0].severity).toBe('warning');
    expect(large[0].titleParams!.count).toBe(1);
    expect(large[0].payload!.transactionIds).toEqual(['big1']);
  });

  it('≥ 日均 10 倍触发 danger', () => {
    // 7 笔 10 = 70 + 1 笔 200 = 270；dailyAvg=270/15=18；threshold=90
    // 200 ≥ 90 → 触发；200 ≥ 180 → danger
    const current = [
      ...Array.from({ length: 7 }, () =>
        makeTx({ amount: 10, categoryId: 'food', createdAt: onDate('2026-06-10') }),
      ),
      makeTx({ id: 'big1', amount: 200, categoryId: 'food', createdAt: onDate('2026-06-11') }),
    ];
    const r = generateInsights({
      currentMonthTransactions: current,
      allTransactions: [],
      categories: baseCategories,
      now: NOW,
    });
    const large = r.filter((x) => x.type === 'large_expense');
    expect(large).toHaveLength(1);
    expect(large[0].severity).toBe('danger');
  });

  it('数据不足（<8 笔）静默', () => {
    // 4 笔（<8）→ sufficient=false，即使有大额也不触发
    const current = [
      ...Array.from({ length: 3 }, () =>
        makeTx({ amount: 10, categoryId: 'food', createdAt: onDate('2026-06-10') }),
      ),
      makeTx({ amount: 1000, categoryId: 'food', createdAt: onDate('2026-06-11') }),
    ];
    const r = generateInsights({
      currentMonthTransactions: current,
      allTransactions: [],
      categories: baseCategories,
      now: NOW,
    });
    expect(r.filter((x) => x.type === 'large_expense')).toHaveLength(0);
  });

  it('无大额支出时不触发', () => {
    // 8 笔 50 = 400；dailyAvg=400/15≈26.7；threshold≈133.3 → 50 < 133.3
    const current = Array.from({ length: 8 }, () =>
      makeTx({ amount: 50, categoryId: 'food', createdAt: onDate('2026-06-10') }),
    );
    const r = generateInsights({
      currentMonthTransactions: current,
      allTransactions: [],
      categories: baseCategories,
      now: NOW,
    });
    expect(r.filter((x) => x.type === 'large_expense')).toHaveLength(0);
  });
});

describe('insights - recurring', () => {
  it('同分类同金额近 3 月 ≥2 月出现触发 info', () => {
    // 'sub' 分类，金额 25，分别在 4/5/6 月各 1 笔
    const txs: Transaction[] = [
      makeTx({ id: 'r1', amount: 25, categoryId: 'sub', createdAt: onDate('2026-04-10') }),
      makeTx({ id: 'r2', amount: 25, categoryId: 'sub', createdAt: onDate('2026-05-10') }),
      makeTx({ id: 'r3', amount: 25, categoryId: 'sub', createdAt: onDate('2026-06-10') }),
    ];
    const r = generateInsights({
      currentMonthTransactions: [txs[2]],
      allTransactions: txs,
      categories: baseCategories,
      now: NOW,
    });
    const rec = r.filter((x) => x.type === 'recurring');
    expect(rec).toHaveLength(1);
    expect(rec[0].severity).toBe('info');
    expect(rec[0].titleParams!.category).toBe('订阅');
    expect(rec[0].amount).toBe(25);
  });

  it('金额 ±5% 视为同一订阅', () => {
    // 100 / 105 / 105 → 105-100=5，5/max(100,105)=5/105≈0.0476 ≤ 0.05 → 同簇
    const txs: Transaction[] = [
      makeTx({ id: 'r1', amount: 100, categoryId: 'sub', createdAt: onDate('2026-04-10') }),
      makeTx({ id: 'r2', amount: 105, categoryId: 'sub', createdAt: onDate('2026-05-10') }),
      makeTx({ id: 'r3', amount: 105, categoryId: 'sub', createdAt: onDate('2026-06-10') }),
    ];
    const r = generateInsights({
      currentMonthTransactions: [txs[2]],
      allTransactions: txs,
      categories: baseCategories,
      now: NOW,
    });
    const rec = r.filter((x) => x.type === 'recurring');
    expect(rec).toHaveLength(1);
    // 簇首是 100（按金额升序后第一个）
    expect(rec[0].amount).toBe(100);
  });

  it('近 3 月仅 1 月出现不触发', () => {
    const txs: Transaction[] = [
      makeTx({ id: 'r1', amount: 25, categoryId: 'sub', createdAt: onDate('2026-04-10') }),
      makeTx({ id: 'r2', amount: 25, categoryId: 'sub', createdAt: onDate('2026-04-15') }),
      makeTx({ id: 'r3', amount: 25, categoryId: 'sub', createdAt: onDate('2026-04-20') }),
    ];
    const r = generateInsights({
      currentMonthTransactions: [],
      allTransactions: txs,
      categories: baseCategories,
      now: NOW,
    });
    expect(r.filter((x) => x.type === 'recurring')).toHaveLength(0);
  });

  it('超出近 3 月窗口的历史不参与', () => {
    // 2026-03 不在窗口（窗口为 4/5/6），仅 4 月有匹配 → 不触发
    const txs: Transaction[] = [
      makeTx({ id: 'r1', amount: 25, categoryId: 'sub', createdAt: onDate('2026-03-10') }),
      makeTx({ id: 'r2', amount: 25, categoryId: 'sub', createdAt: onDate('2026-04-10') }),
    ];
    const r = generateInsights({
      currentMonthTransactions: [],
      allTransactions: txs,
      categories: baseCategories,
      now: NOW,
    });
    expect(r.filter((x) => x.type === 'recurring')).toHaveLength(0);
  });
});

describe('insights - frequent', () => {
  it('单分类当月 ≥12 笔触发 info', () => {
    const current = Array.from({ length: 12 }, (_, i) =>
      makeTx({
        id: `f${i}`,
        amount: 20,
        categoryId: 'food',
        createdAt: onDate(`2026-06-${(i % 14) + 1}`),
      }),
    );
    const r = generateInsights({
      currentMonthTransactions: current,
      allTransactions: current,
      categories: baseCategories,
      now: NOW,
    });
    const freq = r.filter((x) => x.type === 'frequent');
    expect(freq).toHaveLength(1);
    expect(freq[0].severity).toBe('info');
    expect(freq[0].titleParams!.category).toBe('餐饮');
    expect(freq[0].titleParams!.count).toBe(12);
  });

  it('单分类当月 11 笔不触发', () => {
    const current = Array.from({ length: 11 }, (_, i) =>
      makeTx({
        id: `f${i}`,
        amount: 20,
        categoryId: 'food',
        createdAt: onDate(`2026-06-${(i % 14) + 1}`),
      }),
    );
    const r = generateInsights({
      currentMonthTransactions: current,
      allTransactions: current,
      categories: baseCategories,
      now: NOW,
    });
    expect(r.filter((x) => x.type === 'frequent')).toHaveLength(0);
  });

  it('数据不足（<8 笔）静默', () => {
    const current = Array.from({ length: 4 }, (_, i) =>
      makeTx({
        id: `f${i}`,
        amount: 20,
        categoryId: 'food',
        createdAt: onDate(`2026-06-${(i % 14) + 1}`),
      }),
    );
    const r = generateInsights({
      currentMonthTransactions: current,
      allTransactions: current,
      categories: baseCategories,
      now: NOW,
    });
    expect(r.filter((x) => x.type === 'frequent')).toHaveLength(0);
  });
});

describe('insights - 性能', () => {
  it('5000 笔流水规模单次生成 < 100ms（中端机目标 20ms，CI 容差）', () => {
    const cats = Array.from({ length: 50 }, (_, i) =>
      makeCategory({ id: `c${i}`, name: `分类${i}` }),
    );
    const txs: Transaction[] = [];
    for (let i = 0; i < 5000; i++) {
      const monthIdx = i % 3; // 0→4月, 1→5月, 2→6月
      const month = monthIdx === 0 ? TWO_MONTHS_AGO : monthIdx === 1 ? PREV_MONTH : CURRENT_MONTH;
      const monthNum = parseInt(month.slice(5, 7), 10);
      const day = (i % 28) + 1;
      txs.push({
        id: `t${i}`,
        type: 'expense',
        amount: 10 + (i % 100),
        categoryId: `c${i % 50}`,
        note: '',
        accountId: 'a',
        createdAt: new Date(2026, monthNum - 1, day, 12, 0, 0).toISOString(),
      });
    }
    // 预热（JIT 优化）后再计时
    generateInsights({
      currentMonthTransactions: txs.slice(0, 100),
      allTransactions: txs,
      categories: cats,
      now: NOW,
    });
    const start = performance.now();
    const r = generateInsights({
      currentMonthTransactions: txs.filter((t) =>
        t.createdAt.includes(CURRENT_MONTH),
      ),
      allTransactions: txs,
      categories: cats,
      now: NOW,
    });
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
    expect(r.length).toBeGreaterThan(0);
  });
});
