/**
 * 统一的本地时区日期工具。
 *
 * 背景:此前散落各处的 `new Date().toISOString().split('T')[0]`、
 * `toISOString().slice(0, 7)`、`new Date('YYYY-MM-DD')` 等"UTC 反推日期键"写法,
 * 在 UTC+8 早 8 点前(UTC-5 晚 7 点后等)会把日期/月份键算错一天,导致
 * 今日收支、月度统计、周期记账、连续记账天数全部偏移。
 *
 * 规则:
 *  - 存储:createdAt 保持完整 UTC ISO 字符串不变(迁移成本为零)
 *  - 派生:一切"日期键/月份键"一律经由本工具在本地时区计算
 *  - 解析:'YYYY-MM-DD' 字符串一律用 parseDateKey(本地正午),禁止 new Date(key)
 */

/** 取零填充数字 */
const pad2 = (n: number): string => n.toString().padStart(2, '0');

/**
 * Date → 本地日期键 'YYYY-MM-DD'
 * 替代 d.toISOString().split('T')[0](后者按 UTC 取日期,时区偏移会错天)
 */
export const toDateKey = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/**
 * 日期键 'YYYY-MM-DD' → 本地 Date(当天正午 12:00)
 * 正午避开任何时区的日界与 DST 切换边界;替代 new Date('YYYY-MM-DD')(按 UTC 解析)
 */
export const parseDateKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d, 12, 0, 0, 0);
};

/** 今天的本地日期键 */
export const todayKey = (): string => toDateKey(new Date());

/** Date → 本地月份键 'YYYY-MM' */
export const getMonthKey = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

/** 加 n 天(跨月/跨年安全) */
export const addDays = (d: Date, n: number): Date => {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
};

/**
 * 加 n 个月,日超出目标月天数时钳制到月末(1/31 + 1月 → 2/28)
 */
export const addMonths = (d: Date, n: number): Date => {
  const result = new Date(d);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + n);
  const daysInMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, daysInMonth));
  return result;
};

/** 本月第一天(00:00) */
export const monthStart = (d: Date = new Date()): Date =>
  new Date(d.getFullYear(), d.getMonth(), 1);

/** 本月最后一天(23:59:59.999) */
export const monthEnd = (d: Date = new Date()): Date =>
  new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

/** 判断两个 Date 是否为同一本地日期 */
export const isSameLocalDate = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
