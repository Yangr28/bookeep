import { describe, it, expect } from 'vitest';
import { extractTransactionsFromText } from './ocrParser';
import { Category } from '../types';

// 最小分类集：餐饮/购物/娱乐/工资
const categories = [
  { id: 'food', type: 'expense', name: '餐饮', color: '#f00', icon: 'utensils' },
  { id: 'shop', type: 'expense', name: '购物', color: '#0f0', icon: 'shopping-bag' },
  { id: 'fun', type: 'expense', name: '娱乐', color: '#00f', icon: 'gamepad' },
  { id: 'salary', type: 'income', name: '工资', color: '#0ff', icon: 'wallet' },
] as unknown as Category[];

describe('extractTransactionsFromText 小票批量解析', () => {
  it('典型超市小票：逐笔识别商品，排除店名/合计/支付方式', () => {
    const text = [
      '好邻居超市 欢迎光临',
      '2026-09-28 12:11',
      '午餐            30.00',
      '可乐             3.50',
      '电影票          80.00',
      '日用品         120.00',
      '合计           233.50',
      '微信支付       233.50',
      '谢谢惠顾',
    ].join('\n');

    const results = extractTransactionsFromText(text, categories);

    expect(results).toHaveLength(4);
    expect(results.map((r) => r.amount)).toEqual(['30', '3.5', '80', '120']);
    expect(results.map((r) => r.note)).toEqual(['午餐', '可乐', '电影票', '日用品']);
    // 全部为支出，共享小票日期
    expect(results.every((r) => r.type === 'expense')).toBe(true);
    expect(results[0].date.getFullYear()).toBe(2026);
    expect(results[0].date.getMonth()).toBe(8);
    expect(results[0].date.getDate()).toBe(28);
    expect(results[0].date.getHours()).toBe(12);
  });

  it('名称与金额被拆成两行（OCR 常见排版）时配对成一笔', () => {
    const text = ['餐厅小票', '2026/09/28', '红烧肉套餐', '45元', '橙汁', '8元'].join('\n');

    const results = extractTransactionsFromText(text, categories);

    expect(results).toHaveLength(2);
    expect(results[0].note).toBe('红烧肉套餐');
    expect(results[0].amount).toBe('45');
    expect(results[1].note).toBe('橙汁');
    expect(results[1].amount).toBe('8');
  });

  it('¥ 符号 + 正负号：负号支出、正号收入（工资）', () => {
    const text = ['账单明细', '午餐 -¥30.00', '电影票 -¥80.00', '工资 +¥15000.00'].join('\n');

    const results = extractTransactionsFromText(text, categories);

    expect(results).toHaveLength(3);
    expect(results[0].type).toBe('expense');
    expect(results[1].type).toBe('expense');
    expect(results[2].type).toBe('income');
    expect(results[2].amount).toBe('15000');
    expect(results[2].categoryId).toBe('salary');
  });

  it('行首带日期时间的流水行：剥离时间戳后识别', () => {
    const text = [
      '09-28 12:11 午餐 30.00',
      '09-27 12:11 电影票 80.00',
    ].join('\n');

    const results = extractTransactionsFromText(text, categories);

    expect(results).toHaveLength(2);
    expect(results[0].note).toBe('午餐');
    expect(results[0].amount).toBe('30');
    expect(results[1].note).toBe('电影票');
  });

  it('单张支付成功截图（整页一笔）走兜底解析', () => {
    const text = ['支付成功', '2026年09月28日 12:11:30', '餐饮 午餐', '¥30.00'].join('\n');

    const results = extractTransactionsFromText(text, categories);

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].amount).toBe('30');
  });

  it('纯数量×单价行与序号不会误判为交易', () => {
    const text = [
      '便利店',
      '1 矿泉水 2.00',
      '2 x 3.00',
      '② 口香糖  6.00',
      '小计 8.00',
    ].join('\n');

    const results = extractTransactionsFromText(text, categories);

    // 矿泉水 + 口香糖 两笔；数量行与小计被排除
    expect(results.map((r) => r.note)).toEqual(['矿泉水', '口香糖']);
  });
});
