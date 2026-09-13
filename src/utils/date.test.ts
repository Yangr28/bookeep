import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  toDateKey,
  parseDateKey,
  todayKey,
  getMonthKey,
  addDays,
  addMonths,
  monthStart,
  monthEnd,
  isSameLocalDate,
} from './date';

/**
 * 时区无关性约定(CI 以 TZ=UTC 与 TZ=Asia/Shanghai 双矩阵跑本文件):
 *  - 一律用本地构造器 new Date(y, m, d, hh, mm) 构造时间,断言字符串键
 *  - 任意时区下本地字段一致,断言结果一致
 *  - 旧实现(new Date().toISOString().split('T')[0])在 UTC+8 早 8 点前会错一天,
 *    本文件用例同时作为该 bug 的回归验证
 */
describe('date utils(时区无关)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('toDateKey', () => {
    it('本地字段生成键:本地 03-08 早 7:30 应得 2026-03-08(旧实现在 UTC+8 会错成 03-07)', () => {
      const d = new Date(2026, 2, 8, 7, 30);
      expect(toDateKey(d)).toBe('2026-03-08');
    });

    it('月份与日期补零', () => {
      expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    });

    it('本地 23:59 与次日 00:00 属于不同键', () => {
      expect(toDateKey(new Date(2026, 2, 8, 23, 59))).toBe('2026-03-08');
      expect(toDateKey(new Date(2026, 2, 9, 0, 0))).toBe('2026-03-09');
    });
  });

  describe('todayKey', () => {
    it('跟随本地日期字段(本地凌晨 3 点仍算当天)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 2, 8, 3, 0));
      expect(todayKey()).toBe('2026-03-08');
    });

    it('本地深夜 23 点仍算当天(UTC+8 下旧实现会错成明天)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 2, 8, 23, 0));
      expect(todayKey()).toBe('2026-03-08');
    });
  });

  describe('parseDateKey', () => {
    it('按本地字段解析,年月日与键一致', () => {
      const d = parseDateKey('2026-01-31');
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(0);
      expect(d.getDate()).toBe(31);
    });

    it('解析为本地正午,避开 UTC 解析陷阱', () => {
      const d = parseDateKey('2026-03-08');
      expect(d.getHours()).toBe(12);
    });
  });

  describe('getMonthKey', () => {
    it('生成 YYYY-MM 键并补零', () => {
      expect(getMonthKey(new Date(2026, 2, 8))).toBe('2026-03');
      expect(getMonthKey(new Date(2026, 10, 1))).toBe('2026-11');
    });

    it('交易时间转月份键:本地正午时间在任意时区均不跨月', () => {
      // 用本地正午构造 createdAt,再转 ISO 存储,两个矩阵时区下月份键一致
      const createdAt = new Date(2026, 2, 8, 12, 0).toISOString();
      expect(getMonthKey(new Date(createdAt))).toBe('2026-03');
    });
  });

  describe('addDays', () => {
    it('跨月', () => {
      expect(toDateKey(addDays(new Date(2026, 2, 31), 1))).toBe('2026-04-01');
    });

    it('负数回退', () => {
      expect(toDateKey(addDays(new Date(2026, 2, 1), -1))).toBe('2026-02-28');
    });

    it('跨年', () => {
      expect(toDateKey(addDays(new Date(2026, 11, 31), 1))).toBe('2027-01-01');
    });
  });

  describe('addMonths', () => {
    it('1/31 + 1 个月钳制到 2/28(2026 平年)', () => {
      expect(toDateKey(addMonths(parseDateKey('2026-01-31'), 1))).toBe('2026-02-28');
    });

    it('闰年 1/31 + 1 个月钳制到 2/29(2028)', () => {
      expect(toDateKey(addMonths(parseDateKey('2028-01-31'), 1))).toBe('2028-02-29');
    });

    it('跨年', () => {
      expect(toDateKey(addMonths(parseDateKey('2026-11-15'), 3))).toBe('2027-02-15');
    });

    it('普通日期不动日', () => {
      expect(toDateKey(addMonths(parseDateKey('2026-04-30'), 1))).toBe('2026-05-30');
    });
  });

  describe('monthStart / monthEnd', () => {
    it('monthStart 为本月 1 号 0 点', () => {
      const s = monthStart(new Date(2026, 2, 15));
      expect(s.getDate()).toBe(1);
      expect(s.getHours()).toBe(0);
    });

    it('monthEnd 为本月最后一天 23:59:59.999', () => {
      const e = monthEnd(new Date(2026, 1, 10));
      expect(e.getDate()).toBe(28);
      expect(e.getHours()).toBe(23);
      expect(e.getMinutes()).toBe(59);
    });

    it('闰年 2 月 monthEnd 为 29 号', () => {
      expect(monthEnd(new Date(2028, 1, 10)).getDate()).toBe(29);
    });
  });

  describe('isSameLocalDate', () => {
    it('同日不同时刻为 true', () => {
      expect(isSameLocalDate(new Date(2026, 2, 8, 0, 0), new Date(2026, 2, 8, 23, 59))).toBe(true);
    });

    it('不同日为 false', () => {
      expect(isSameLocalDate(new Date(2026, 2, 8, 12, 0), new Date(2026, 2, 9, 12, 0))).toBe(false);
    });
  });
});
