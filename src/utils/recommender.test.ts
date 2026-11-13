import { describe, it, expect } from 'vitest';
import { Account, Transaction, TransactionType } from '../types';
import {
  RECENCY_WEIGHT_MAX,
  getFrequentCategories,
  predictCategory,
  predictCategoryFromHistory,
  recommendAccount,
  getFrequentAmounts,
  getFrequentTags,
  getNoteSuggestions,
  recencyWeight,
} from './recommender';
import { parseSmartInputWithHistory } from './smartParser';

/**
 * 时区无关约定（CI 双时区矩阵）：一律用本地字段构造 Date，断言不依赖 UTC。
 */
const NOW = new Date(2026, 5, 15, 12, 30, 0);

let seq = 0;
const makeTx = (partial: Partial<Transaction> = {}): Transaction => ({
  id: `t${++seq}`,
  type: 'expense',
  amount: 10,
  categoryId: '',
  note: '',
  accountId: 'acc1',
  createdAt: NOW.toISOString(),
  ...partial,
});

/** n 天前 h 点的本地时间 ISO */
const daysAgo = (n: number, h = 12): string =>
  new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - n, h, 0, 0).toISOString();

const makeAccount = (partial: Partial<Account>): Account => ({
  id: 'acc',
  name: '账户',
  type: 'other',
  balance: 0,
  color: '#000',
  icon: 'Wallet',
  ...partial,
});

const categories = [
  { id: 'food', name: '餐饮', type: 'expense' as TransactionType },
  { id: 'transport', name: '交通', type: 'expense' as TransactionType },
  { id: 'salary', name: '工资', type: 'income' as TransactionType },
];

describe('recommender - recencyWeight', () => {
  it('当天权重最大，窗口外衰减为 1', () => {
    expect(recencyWeight(0)).toBe(RECENCY_WEIGHT_MAX);
    expect(recencyWeight(30)).toBe(1);
    expect(recencyWeight(100)).toBe(1);
  });
});

describe('recommender - getFrequentCategories', () => {
  it('空数据返回空数组', () => {
    expect(getFrequentCategories([], 'expense', 5, NOW)).toEqual([]);
  });

  it('按收支类型过滤', () => {
    const txs = [
      makeTx({ categoryId: 'food', type: 'expense' }),
      makeTx({ categoryId: 'salary', type: 'income' }),
    ];
    const ranked = getFrequentCategories(txs, 'expense', 5, NOW);
    expect(ranked.map((r) => r.categoryId)).toEqual(['food']);
  });

  it('近期高频分类（3 笔今天）胜过更多笔但久远（6 笔 45 天前）', () => {
    const txs = [
      ...Array.from({ length: 6 }, () =>
        makeTx({ categoryId: 'food', createdAt: daysAgo(45) }),
      ),
      ...Array.from({ length: 3 }, () =>
        makeTx({ categoryId: 'transport', createdAt: daysAgo(0) }),
      ),
    ];
    const ranked = getFrequentCategories(txs, 'expense', 5, NOW);
    expect(ranked[0].categoryId).toBe('transport');
    expect(ranked[1].categoryId).toBe('food');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it('同分时次数多的优先', () => {
    const txs = [
      makeTx({ categoryId: 'food', createdAt: daysAgo(10) }),
      makeTx({ categoryId: 'food', createdAt: daysAgo(10) }),
      makeTx({ categoryId: 'transport', createdAt: daysAgo(10) }),
    ];
    const ranked = getFrequentCategories(txs, 'expense', 5, NOW);
    expect(ranked[0].categoryId).toBe('food');
    expect(ranked[0].count).toBe(2);
  });
});

describe('recommender - predictCategoryFromHistory', () => {
  const validIds = new Set(['food', 'transport']);

  it('商家历史命中 ≥2 次返回该分类', () => {
    const txs = [
      makeTx({ categoryId: 'food', note: '咕叽店 30', createdAt: daysAgo(1) }),
      makeTx({ categoryId: 'food', note: '咕叽店 35', createdAt: daysAgo(3) }),
      makeTx({ categoryId: 'food', note: '咕叽店 32', createdAt: daysAgo(5) }),
      makeTx({ categoryId: 'transport', note: '地铁', createdAt: daysAgo(0) }),
    ];
    const p = predictCategoryFromHistory(txs, 'expense', validIds, '', '咕叽店', NOW);
    expect(p.categoryId).toBe('food');
    expect(p.source).toBe('merchant');
    expect(p.confidence).toBeGreaterThanOrEqual(0.75);
  });

  it('备注词命中且领先第二名 1.3 倍时返回该分类', () => {
    const txs = [
      makeTx({ categoryId: 'food', note: '团建晚餐' }),
      makeTx({ categoryId: 'food', note: '团建火锅' }),
      makeTx({ categoryId: 'food', note: '团建烧烤' }),
      makeTx({ categoryId: 'transport', note: '地铁出行' }),
    ];
    const p = predictCategoryFromHistory(txs, 'expense', validIds, '团建', '', NOW);
    expect(p.categoryId).toBe('food');
    expect(p.source).toBe('note');
    expect(p.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('历史势均力敌（2:2）时不乱猜', () => {
    const txs = [
      makeTx({ categoryId: 'food', note: '咕叽店' }),
      makeTx({ categoryId: 'food', note: '咕叽店' }),
      makeTx({ categoryId: 'transport', note: '咕叽店' }),
      makeTx({ categoryId: 'transport', note: '咕叽店' }),
    ];
    const p = predictCategoryFromHistory(txs, 'expense', validIds, '', '咕叽店', NOW);
    expect(p.categoryId).toBeNull();
  });

  it('仅命中 1 次不满足阈值', () => {
    const txs = [makeTx({ categoryId: 'food', note: '咕叽店' })];
    const p = predictCategoryFromHistory(txs, 'expense', validIds, '', '咕叽店', NOW);
    expect(p.categoryId).toBeNull();
  });

  it('已删除/类型不符的分类 id 不返回', () => {
    const txs = [
      makeTx({ categoryId: 'deleted', note: '咕叽店' }),
      makeTx({ categoryId: 'deleted', note: '咕叽店' }),
    ];
    const p = predictCategoryFromHistory(txs, 'expense', validIds, '', '咕叽店', NOW);
    expect(p.categoryId).toBeNull();
  });

  it('无商家无备注词直接返回空', () => {
    const p = predictCategoryFromHistory(
      [makeTx({ categoryId: 'food' })],
      'expense',
      validIds,
      ' ',
      '',
      NOW,
    );
    expect(p).toEqual({ categoryId: null, confidence: 0, source: 'none' });
  });
});

describe('recommender - predictCategory', () => {
  it('历史信号优先于高频兜底', () => {
    const txs = [
      ...Array.from({ length: 5 }, () => makeTx({ categoryId: 'transport', note: '地铁' })),
      makeTx({ categoryId: 'food', note: '咕叽店' }),
      makeTx({ categoryId: 'food', note: '咕叽店' }),
    ];
    const p = predictCategory({
      transactions: txs,
      validCategoryIds: new Set(['food', 'transport']),
      type: 'expense',
      merchant: '咕叽店',
      now: NOW,
    });
    expect(p.categoryId).toBe('food');
    expect(p.source).toBe('merchant');
  });

  it('无上下文时以高频分类兜底', () => {
    // 故意把流水分散到不同星期/时段，确保 predictCategoryByTime 不出信号
    const txs = [
      makeTx({ categoryId: 'food', createdAt: daysAgo(10, 9) }),
      makeTx({ categoryId: 'food', createdAt: daysAgo(5, 18) }),
      makeTx({ categoryId: 'transport', createdAt: daysAgo(3, 15) }),
    ];
    const p = predictCategory({
      transactions: txs,
      validCategoryIds: new Set(['food', 'transport']),
      type: 'expense',
      now: NOW,
    });
    expect(p.categoryId).toBe('food');
    expect(p.source).toBe('frequency');
    expect(p.confidence).toBe(0.35);
  });

  it('有效分类集合为空时返回 null', () => {
    const p = predictCategory({
      transactions: [makeTx({ categoryId: 'food' })],
      validCategoryIds: new Set(),
      type: 'expense',
      now: NOW,
    });
    expect(p.categoryId).toBeNull();
  });
});

describe('recommender - recommendAccount', () => {
  it('空账户列表返回 null', () => {
    expect(recommendAccount([makeTx()], [], NOW)).toBeNull();
  });

  it('高频使用账户胜出，已删除账户不参与', () => {
    const accA = makeAccount({ id: 'a', name: '支付宝' });
    const accB = makeAccount({ id: 'b', name: '现金' });
    const txs = [
      makeTx({ accountId: 'deleted' }),
      makeTx({ accountId: 'deleted' }),
      makeTx({ accountId: 'a' }),
      makeTx({ accountId: 'a' }),
      makeTx({ accountId: 'a' }),
      makeTx({ accountId: 'b' }),
    ];
    expect(recommendAccount(txs, [accA, accB], NOW)?.id).toBe('a');
  });
});

describe('recommender - getFrequentAmounts', () => {
  it('重复金额优先（次数、最近使用排序）', () => {
    const txs = [
      makeTx({ amount: 30, createdAt: daysAgo(10) }),
      makeTx({ amount: 30, createdAt: daysAgo(9) }),
      makeTx({ amount: 30, createdAt: daysAgo(8) }),
      makeTx({ amount: 25, createdAt: daysAgo(1) }),
      makeTx({ amount: 25, createdAt: daysAgo(2) }),
      makeTx({ amount: 99, createdAt: daysAgo(0) }),
    ];
    expect(getFrequentAmounts(txs, 'expense', 3)).toEqual([30, 25, 99]);
  });

  it('无重复金额时以最近金额补位', () => {
    const txs = [
      makeTx({ amount: 10, createdAt: daysAgo(3) }),
      makeTx({ amount: 20, createdAt: daysAgo(2) }),
      makeTx({ amount: 30, createdAt: daysAgo(1) }),
    ];
    expect(getFrequentAmounts(txs, 'expense', 2)).toEqual([30, 20]);
  });

  it('按收支类型过滤', () => {
    const txs = [
      makeTx({ amount: 50, type: 'income' }),
      makeTx({ amount: 50, type: 'income' }),
      makeTx({ amount: 12, type: 'expense' }),
    ];
    expect(getFrequentAmounts(txs, 'expense', 4)).toEqual([12]);
  });
});

describe('recommender - getNoteSuggestions', () => {
  it('前缀匹配、按频次排序、大小写不敏感', () => {
    const txs = [
      makeTx({ note: '星巴克咖啡' }),
      makeTx({ note: '星巴克咖啡' }),
      makeTx({ note: 'StarBuck' }),
      makeTx({ note: '地铁通勤' }),
    ];
    expect(getNoteSuggestions(txs, '星')).toEqual(['星巴克咖啡']);
    expect(getNoteSuggestions(txs, 'star')).toEqual(['StarBuck']);
  });

  it('空前缀返回空数组；纯数字备注不参与', () => {
    const txs = [makeTx({ note: '星巴克' }), makeTx({ note: '35' })];
    expect(getNoteSuggestions(txs, '')).toEqual([]);
    expect(getNoteSuggestions(txs, '35')).toEqual([]);
  });

  it('前缀候选优先于包含候选', () => {
    const txs = [
      makeTx({ note: '地铁通勤' }),
      makeTx({ note: '打地铁上班' }),
    ];
    const r = getNoteSuggestions(txs, '地铁', 5);
    expect(r[0]).toBe('地铁通勤');
    expect(r).toContain('打地铁上班');
  });
});

describe('smartParser.parseSmartInputWithHistory - 历史分类写回', () => {
  it('文本无分类关键词时，历史商家命中把分类名写回 categoryKeyword（回归旧 bug）', () => {
    const txs = [
      makeTx({ categoryId: 'food', note: '在咕叽店消费', createdAt: daysAgo(1) }),
      makeTx({ categoryId: 'food', note: '在咕叽店消费', createdAt: daysAgo(2) }),
      makeTx({ categoryId: 'food', note: '在咕叽店消费', createdAt: daysAgo(3) }),
    ];
    const r = parseSmartInputWithHistory('在咕叽店花了 30', txs, [], categories);
    expect(r.amount).toBe('30');
    expect(r.merchant).toContain('咕叽店');
    expect(r.categoryKeyword).toBe('餐饮');
    expect(r.confidence).toBeGreaterThanOrEqual(0.75);
  });

  it('文本已显式命中分类关键词时，历史不覆盖结果仅增强置信度', () => {
    const txs = [
      makeTx({ categoryId: 'food', note: '滴滴' }),
      makeTx({ categoryId: 'food', note: '滴滴' }),
      makeTx({ categoryId: 'food', note: '滴滴' }),
    ];
    const r = parseSmartInputWithHistory('滴滴 20', txs, [], categories);
    expect(r.categoryKeyword).toBe('滴滴');
    expect(r.confidence).toBeGreaterThanOrEqual(0.7);
  });
});

describe('recommender - 标签统计', () => {
  it('按使用次数排序，次数相同按最近使用', () => {
    const txs = [
      makeTx({ tags: ['出差', '报销'], createdAt: daysAgo(10) }),
      makeTx({ tags: ['出差'], createdAt: daysAgo(2) }),
      makeTx({ tags: ['家庭'], createdAt: daysAgo(0) }),
    ];
    const result = getFrequentTags(txs, 5);
    expect(result.map((r) => r.tag)).toEqual(['出差', '家庭', '报销']);
    expect(result[0].count).toBe(2);
  });

  it('无标签/空白标签不计入，limit 生效', () => {
    const txs = [
      makeTx({ tags: [''] }),
      makeTx({ tags: ['  '] }),
      makeTx({ tags: ['A', 'B', 'C'] }),
    ];
    expect(getFrequentTags(txs, 2).map((r) => r.tag)).toEqual(['A', 'B']);
    expect(getFrequentTags([makeTx({})], 5)).toEqual([]);
  });
});

describe('recommender - 备注记忆自动归类', () => {
  it('只有一条历史也能记住：相同备注直接返回上次分类', () => {
    const txs = [makeTx({ categoryId: 'food', note: '楼下便利店关东煮', createdAt: daysAgo(3) })];
    const r = predictCategory({
      transactions: txs,
      type: 'expense',
      note: '楼下便利店关东煮',
      now: NOW,
    });
    expect(r.categoryId).toBe('food');
    expect(r.source).toBe('memory');
  });

  it('忽略大小写/空白/标点差异，视为同一备注', () => {
    const txs = [makeTx({ categoryId: 'food', note: 'Starbucks 咖啡', createdAt: daysAgo(3) })];
    const r = predictCategory({
      transactions: txs,
      type: 'expense',
      note: ' starbucks咖啡 ',
      now: NOW,
    });
    expect(r.categoryId).toBe('food');
    expect(r.source).toBe('memory');
  });

  it('用户后续纠正会覆盖旧记忆：最近一次分类胜出', () => {
    const txs = [
      makeTx({ categoryId: 'food', note: '买花', createdAt: daysAgo(10) }),
      makeTx({ categoryId: 'transport', note: '买花', createdAt: daysAgo(1) }),
    ];
    const r = predictCategory({ transactions: txs, type: 'expense', note: '买花', now: NOW });
    expect(r.categoryId).toBe('transport');
    expect(r.source).toBe('memory');
  });

  it('收支类型不同不串用记忆', () => {
    const txs = [makeTx({ type: 'income', categoryId: 'salary', note: '外快', createdAt: daysAgo(1) })];
    const r = predictCategory({ transactions: txs, type: 'expense', note: '外快', now: NOW });
    expect(r.source).not.toBe('memory');
  });

  it('过短备注（1 字）不建立记忆', () => {
    const txs = [makeTx({ categoryId: 'food', note: '饭', createdAt: daysAgo(1) })];
    const r = predictCategory({ transactions: txs, type: 'expense', note: '饭', now: NOW });
    expect(r.source).not.toBe('memory');
  });

  it('智能输入链路生效：无分类关键词时用备注记忆补上分类名', () => {
    const cats = [
      ...categories,
      { id: 'shopping', name: '购物', type: 'expense' as TransactionType },
    ];
    const txs = [makeTx({ categoryId: 'shopping', note: '老王', createdAt: daysAgo(1) })];
    const r = parseSmartInputWithHistory('老王 15', txs, [], cats);
    expect(r.amount).toBe('15');
    expect(r.categoryKeyword).toBe('购物');
  });
});
