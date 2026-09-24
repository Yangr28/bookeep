/**
 * 设备端智能推荐引擎（纯函数、确定性输出、零网络请求）。
 *
 * 数据来源完全是本地历史流水：
 *  - 高频分类（频次 + 近 30 天线性时间衰减）
 *  - 上下文分类预测（同商家 / 备注关键词 / 同时段星期 / 高频兜底）
 *  - 账户推荐（使用频次 + 最近使用）
 *  - 常用金额（重复金额优先，不足时以最近金额补位）
 *  - 备注补全候选（历史备注前缀匹配）
 *
 * 所有接受时间的函数均暴露可选 now 参数，便于单测与时区无关断言。
 */
import { Account, Transaction, TransactionType } from '../types';

/** 参与统计的最近流水条数上限（与 smartParser 历史扫描保持一致） */
export const HISTORY_SCAN_LIMIT = 500;
/** 近期加权窗口（天）：窗口内权重由 RECENCY_WEIGHT_MAX 线性衰减到 1 */
export const RECENT_WINDOW_DAYS = 30;
/** 当天发生时的最大权重，30 天前及更早为 1 */
export const RECENCY_WEIGHT_MAX = 3;

const MIN_MERCHANT_HITS = 2;
const MIN_NOTE_HITS = 2;
/** 备注词预测时，第一名相对第二名的领先倍数（避免 50/50 时乱猜） */
const NOTE_MARGIN_RATIO = 1.3;
const DAY_MS = 24 * 60 * 60 * 1000;

export type PredictionSource = 'merchant' | 'note' | 'time' | 'frequency' | 'none';

export interface CategoryPrediction {
  categoryId: string | null;
  confidence: number;
  source: PredictionSource;
}

export interface RankedCategory {
  categoryId: string;
  score: number;
  count: number;
  lastTs: number;
}

export interface PredictContext {
  transactions: Transaction[];
  /** 可选的有效分类 id 集合；不传则不限制（调用方一般传当前收支类型的分类） */
  validCategoryIds?: Set<string>;
  type: TransactionType;
  note?: string;
  merchant?: string;
  now?: Date;
}

const ageDays = (ts: number, now: number): number => Math.max(0, (now - ts) / DAY_MS);

/** 线性时间衰减权重：当天 RECENCY_WEIGHT_MAX，RECENT_WINDOW_DAYS 天前衰减为 1 */
export const recencyWeight = (ageInDays: number): number =>
  1 + (RECENCY_WEIGHT_MAX - 1) * Math.max(0, 1 - ageInDays / RECENT_WINDOW_DAYS);

/** 取最近 HISTORY_SCAN_LIMIT 条流水（按 createdAt 降序） */
const recentTransactions = (transactions: Transaction[], limit = HISTORY_SCAN_LIMIT): Transaction[] =>
  transactions
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

const isValid = (categoryId: string, validCategoryIds?: Set<string>): boolean =>
  !validCategoryIds || validCategoryIds.has(categoryId);

/** 取 Map 中得分最高的键；并列时按 lastTs、键名字典序确定性打破平局 */
const pickTop = (
  stats: Map<string, { score: number; count: number; lastTs: number }>,
): { id: string; score: number; count: number; lastTs: number } | null => {
  let top: { id: string; score: number; count: number; lastTs: number } | null = null;
  for (const [id, s] of stats) {
    if (
      !top ||
      s.score > top.score ||
      (s.score === top.score && s.count > top.count) ||
      (s.score === top.score && s.count === top.count && s.lastTs > top.lastTs) ||
      (s.score === top.score && s.count === top.count && s.lastTs === top.lastTs && id < top.id)
    ) {
      top = { id, ...s };
    }
  }
  return top;
};

/**
 * 高频分类排行（频次 + 近 30 天衰减加权）。
 */
export const getFrequentCategories = (
  transactions: Transaction[],
  type: TransactionType,
  limit = 8,
  now: Date = new Date(),
): RankedCategory[] => {
  const nowTs = now.getTime();
  const stats = new Map<string, { score: number; count: number; lastTs: number }>();

  for (const tx of recentTransactions(transactions)) {
    if (tx.type !== type || !tx.categoryId) continue;
    const ts = new Date(tx.createdAt).getTime();
    const w = recencyWeight(ageDays(ts, nowTs));
    const prev = stats.get(tx.categoryId) ?? { score: 0, count: 0, lastTs: 0 };
    prev.score += w;
    prev.count += 1;
    prev.lastTs = Math.max(prev.lastTs, ts);
    stats.set(tx.categoryId, prev);
  }

  return [...stats.entries()]
    .map(([categoryId, s]) => ({ categoryId, ...s }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.count - a.count ||
        b.lastTs - a.lastTs ||
        a.categoryId.localeCompare(b.categoryId),
    )
    .slice(0, limit);
};

/**
 * 基于历史商家 / 备注词的分类预测（供 smartParser 与 UI 复用）。
 * - merchant：历史备注包含该商家的流水分类统计（强信号，需 ≥2 次）
 * - note：备注词（长度 ≥2）在历史备注中出现的分类统计（需领先第二名 1.3 倍）
 */
export const predictCategoryFromHistory = (
  transactions: Transaction[],
  type: TransactionType,
  validCategoryIds: Set<string> | undefined,
  note: string,
  merchant: string,
  now: Date = new Date(),
): CategoryPrediction => {
  const nowTs = now.getTime();
  const merchantKey = merchant.trim().toLowerCase();
  const words = note
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  if (!merchantKey && words.length === 0) {
    return { categoryId: null, confidence: 0, source: 'none' };
  }

  const merchantStats = new Map<string, { score: number; count: number; lastTs: number }>();
  const noteStats = new Map<string, { score: number; count: number; lastTs: number }>();

  for (const tx of recentTransactions(transactions)) {
    if (tx.type !== type || !isValid(tx.categoryId, validCategoryIds)) continue;
    const ts = new Date(tx.createdAt).getTime();
    const w = recencyWeight(ageDays(ts, nowTs));
    const txNote = tx.note?.toLowerCase() ?? '';

    if (merchantKey && txNote.includes(merchantKey)) {
      const prev = merchantStats.get(tx.categoryId) ?? { score: 0, count: 0, lastTs: 0 };
      prev.score += w;
      prev.count += 1;
      prev.lastTs = Math.max(prev.lastTs, ts);
      merchantStats.set(tx.categoryId, prev);
    }

    if (words.length > 0 && txNote) {
      // 一条流水内多个词同时命中只计一次，避免长备注刷权重
      if (words.some((word) => txNote.includes(word))) {
        const prev = noteStats.get(tx.categoryId) ?? { score: 0, count: 0, lastTs: 0 };
        prev.score += w;
        prev.count += 1;
        prev.lastTs = Math.max(prev.lastTs, ts);
        noteStats.set(tx.categoryId, prev);
      }
    }
  }

  const topMerchant = pickTop(merchantStats);
  if (topMerchant && topMerchant.count >= MIN_MERCHANT_HITS) {
    // 势均力敌（如 2:2 同分）时不乱猜：要求 top 领先第二名 ≥NOTE_MARGIN_RATIO 倍
    const merchantSecond = [...merchantStats.entries()]
      .filter(([id]) => id !== topMerchant.id)
      .reduce((max, [, s]) => Math.max(max, s.score), 0);
    if (topMerchant.score >= merchantSecond * NOTE_MARGIN_RATIO) {
      return {
        categoryId: topMerchant.id,
        confidence: Math.min(0.95, 0.75 + 0.05 * (topMerchant.count - MIN_MERCHANT_HITS)),
        source: 'merchant',
      };
    }
  }

  if (noteStats.size > 0) {
    const sorted = [...noteStats.entries()].sort((a, b) => b[1].score - a[1].score);
    const [topId, top] = sorted[0];
    const second = sorted[1]?.[1].score ?? 0;
    if (top.count >= MIN_NOTE_HITS && top.score >= second * NOTE_MARGIN_RATIO) {
      return {
        categoryId: topId,
        confidence: Math.min(0.85, 0.6 + 0.05 * (top.count - MIN_NOTE_HITS)),
        source: 'note',
      };
    }
  }

  return { categoryId: null, confidence: 0, source: 'none' };
};

/**
 * 时段/星期预测：当前为工作餐、通勤、周末娱乐等周期性场景提供弱信号。
 * 同一星期几发生记 1 分，同一时段（±2 小时）发生记 2 分，总分需 ≥3。
 */
const predictCategoryByTime = (
  transactions: Transaction[],
  type: TransactionType,
  validCategoryIds: Set<string> | undefined,
  now: Date,
): CategoryPrediction => {
  const stats = new Map<string, { score: number; count: number; lastTs: number }>();
  const dow = now.getDay();
  const hour = now.getHours();

  for (const tx of recentTransactions(transactions)) {
    if (tx.type !== type || !isValid(tx.categoryId, validCategoryIds)) continue;
    const d = new Date(tx.createdAt);
    let add = 0;
    if (d.getDay() === dow) add += 1;
    if (Math.abs(d.getHours() - hour) <= 2) add += 2;
    if (add === 0) continue;
    const prev = stats.get(tx.categoryId) ?? { score: 0, count: 0, lastTs: 0 };
    prev.score += add;
    prev.count += 1;
    prev.lastTs = Math.max(prev.lastTs, d.getTime());
    stats.set(tx.categoryId, prev);
  }

  const top = pickTop(stats);
  if (top && top.score >= 3) {
    return { categoryId: top.id, confidence: 0.5, source: 'time' };
  }
  return { categoryId: null, confidence: 0, source: 'none' };
};

/**
 * 上下文分类预测主入口：商家历史 > 备注词历史 > 同时段星期 > 高频兜底。
 */
export const predictCategory = (ctx: PredictContext): CategoryPrediction => {
  const { transactions, validCategoryIds, type, note = '', merchant = '', now = new Date() } = ctx;

  if (validCategoryIds && validCategoryIds.size === 0) {
    return { categoryId: null, confidence: 0, source: 'none' };
  }

  const fromHistory = predictCategoryFromHistory(
    transactions,
    type,
    validCategoryIds,
    note,
    merchant,
    now,
  );
  if (fromHistory.categoryId) return fromHistory;

  const fromTime = predictCategoryByTime(transactions, type, validCategoryIds, now);
  if (fromTime.categoryId) return fromTime;

  const [top] = getFrequentCategories(transactions, type, 1, now).filter((c) =>
    isValid(c.categoryId, validCategoryIds),
  );
  if (top) {
    return { categoryId: top.categoryId, confidence: 0.35, source: 'frequency' };
  }

  return { categoryId: null, confidence: 0, source: 'none' };
};

/**
 * 账户推荐：使用频次（近期加权）最高的账户优先；无使用记录时回退最近使用。
 * 仅从传入的现存账户中选择，已删除账户不会被推荐。
 */
export const recommendAccount = (
  transactions: Transaction[],
  accounts: Account[],
  now: Date = new Date(),
): Account | null => {
  if (accounts.length === 0) return null;
  const nowTs = now.getTime();
  const accountIds = new Set(accounts.map((a) => a.id));
  const stats = new Map<string, { score: number; count: number; lastTs: number }>();

  for (const tx of recentTransactions(transactions)) {
    if (!tx.accountId || !accountIds.has(tx.accountId)) continue;
    const ts = new Date(tx.createdAt).getTime();
    const prev = stats.get(tx.accountId) ?? { score: 0, count: 0, lastTs: 0 };
    prev.score += recencyWeight(ageDays(ts, nowTs));
    prev.count += 1;
    prev.lastTs = Math.max(prev.lastTs, ts);
    stats.set(tx.accountId, prev);
  }

  const top = pickTop(stats);
  return accounts.find((a) => a.id === top?.id) ?? null;
};

/**
 * 常用金额：重复出现的金额优先（次数、最近使用排序）；
 * 若无任何重复金额，以最近使用过的不同金额补位，保证新用户也有快捷项。
 */
export const getFrequentAmounts = (
  transactions: Transaction[],
  type: TransactionType = 'expense',
  limit = 4,
): number[] => {
  const stats = new Map<number, { count: number; lastTs: number }>();

  for (const tx of recentTransactions(transactions)) {
    if (tx.type !== type || !(tx.amount > 0)) continue;
    const ts = new Date(tx.createdAt).getTime();
    const prev = stats.get(tx.amount) ?? { count: 0, lastTs: 0 };
    prev.count += 1;
    prev.lastTs = Math.max(prev.lastTs, ts);
    stats.set(tx.amount, prev);
  }

  const entries = [...stats.entries()].sort(
    (a, b) =>
      b[1].count - a[1].count ||
      b[1].lastTs - a[1].lastTs ||
      b[0] - a[0],
  );

  const repeated = entries.filter(([, s]) => s.count >= 2).map(([amount]) => amount);
  if (repeated.length >= limit) return repeated.slice(0, limit);

  const picked = new Set(repeated);
  const result = [...repeated];
  for (const [amount] of entries) {
    if (result.length >= limit) break;
    if (!picked.has(amount)) result.push(amount);
  }
  return result.slice(0, limit);
};

/**
 * 备注/商家补全候选：历史备注按前缀（大小写不敏感）匹配，
 * 按出现次数、最近使用排序。纯数字备注不参与。
 */
export const getNoteSuggestions = (
  transactions: Transaction[],
  prefix: string,
  limit = 5,
): string[] => {
  const q = prefix.trim().toLowerCase();
  if (!q) return [];

  const stats = new Map<string, { display: string; count: number; lastTs: number }>();
  for (const tx of recentTransactions(transactions)) {
    const note = tx.note?.trim();
    if (!note || note.length < 2 || /^\d+(\.\d+)?$/.test(note)) continue;
    const key = note.toLowerCase();
    if (!key.startsWith(q)) continue;
    const ts = new Date(tx.createdAt).getTime();
    const prev = stats.get(key) ?? { display: note, count: 0, lastTs: 0 };
    prev.count += 1;
    prev.lastTs = Math.max(prev.lastTs, ts);
    stats.set(key, prev);
  }

  return [...stats.values()]
    .sort((a, b) => b.count - a.count || b.lastTs - a.lastTs || a.display.localeCompare(b.display))
    .slice(0, limit)
    .map((s) => s.display);
};
