import { describe, it, expect } from 'vitest';
import { Account, TransactionType } from '../types';
import { parseSmartInput, findCategoryByIdentifier } from './smartParser';

/**
 * 智能输入解析测试：口语金额（块/毛/分）与分类识别。
 */
const makeCategories = (overrides: Record<string, { id: string; name: string; type: TransactionType }> = {}) => {
  const expenseNames = ['餐饮', '交通', '购物', '娱乐', '医疗', '教育', '通讯', '住房', '转账', '其他'];
  const incomeNames = ['工资', '红包', '退款', '理财', '其他收入'];
  const cats = [
    ...expenseNames.map((name) => ({ id: `e-${name}`, name, type: 'expense' as TransactionType })),
    ...incomeNames.map((name) => ({ id: `i-${name}`, name, type: 'income' as TransactionType })),
  ];
  // 允许用自定义分类替换标准分类（如把"餐饮"改名为"食物"）
  for (const [id, c] of Object.entries(overrides)) {
    const idx = cats.findIndex((x) => x.id === id);
    if (idx >= 0) cats[idx] = { ...cats[idx], ...c };
  }
  return cats.map((c) => ({ ...c, color: '#000', icon: 'tag' }));
};

const accounts: Account[] = [
  { id: 'a-alipay', name: '支付宝', type: 'alipay', balance: 0, color: '#1677ff', icon: 'wallet' },
];

describe('parseSmartInput 口语金额', () => {
  it('"2块钱" 识别为 2 且备注不残留"钱"', () => {
    const r = parseSmartInput('2块钱', accounts, makeCategories());
    expect(r.amount).toBe('2');
    expect(r.note).toBe('');
  });

  it('"2块2毛钱" 识别为 2.2 且备注完全干净', () => {
    const r = parseSmartInput('2块2毛钱', accounts, makeCategories());
    expect(r.amount).toBe('2.2');
    expect(r.note).toBe('');
  });

  it('"2块2毛" 识别为 2.2', () => {
    const r = parseSmartInput('2块2毛', accounts, makeCategories());
    expect(r.amount).toBe('2.2');
    expect(r.note).toBe('');
  });

  it('"2元2角5分" 识别为 2.25', () => {
    const r = parseSmartInput('2元2角5分', accounts, makeCategories());
    expect(r.amount).toBe('2.25');
  });

  it('"2块5分" 识别为 2.05', () => {
    const r = parseSmartInput('2块5分', accounts, makeCategories());
    expect(r.amount).toBe('2.05');
  });

  it('"5毛钱" 识别为 0.5', () => {
    const r = parseSmartInput('5毛钱', accounts, makeCategories());
    expect(r.amount).toBe('0.5');
  });

  it('"2角5分" 识别为 0.25', () => {
    const r = parseSmartInput('2角5分', accounts, makeCategories());
    expect(r.amount).toBe('0.25');
  });

  it('"5分钱" 识别为 0.05', () => {
    const r = parseSmartInput('5分钱', accounts, makeCategories());
    expect(r.amount).toBe('0.05');
  });

  it('中文数字 "三块五" 识别为 3.5', () => {
    const r = parseSmartInput('三块五', accounts, makeCategories());
    expect(r.amount).toBe('3.5');
  });

  it('中文数字 "二十块钱" 识别为 20', () => {
    const r = parseSmartInput('二十块钱', accounts, makeCategories());
    expect(r.amount).toBe('20');
  });

  it('中文数字 "两块五毛钱" 识别为 2.5', () => {
    const r = parseSmartInput('两块五毛钱', accounts, makeCategories());
    expect(r.amount).toBe('2.5');
  });

  it('省略角单位 "2块2" 识别为 2.2', () => {
    const r = parseSmartInput('2块2', accounts, makeCategories());
    expect(r.amount).toBe('2.2');
  });

  it('量词边界保护："2块2个包子" 不识别为 2.2', () => {
    const r = parseSmartInput('2块2个包子', accounts, makeCategories());
    expect(r.amount).toBe('2');
  });

  it('"3角色" 不识别为 0.3', () => {
    const r = parseSmartInput('3角色', accounts, makeCategories());
    expect(r.amount).not.toBe('0.3');
  });

  it('"2毛豆" 不识别为 0.2', () => {
    const r = parseSmartInput('2毛豆', accounts, makeCategories());
    expect(r.amount).not.toBe('0.2');
  });

  it('"30分钟" 不识别为 0.3', () => {
    const r = parseSmartInput('30分钟', accounts, makeCategories());
    expect(r.amount).not.toBe('0.3');
  });

  it('"2块2毛钱买包子" 金额 2.2 且备注保留商品、无金额残留', () => {
    const r = parseSmartInput('2块2毛钱买包子', accounts, makeCategories());
    expect(r.amount).toBe('2.2');
    expect(r.note).toBe('买包子');
  });

  it('"¥30.5" 识别为 30.5', () => {
    const r = parseSmartInput('¥30.5', accounts, makeCategories());
    expect(r.amount).toBe('30.5');
  });

  it('"花了88" 动词引导识别为 88', () => {
    const r = parseSmartInput('花了88', accounts, makeCategories());
    expect(r.amount).toBe('88');
  });
});

describe('parseSmartInput 分类识别', () => {
  it('"中午吃面15" → 餐饮', () => {
    const cats = makeCategories();
    const r = parseSmartInput('中午吃面15', accounts, cats);
    expect(findCategoryByIdentifier(cats, r.type, r.categoryKeyword)).toBe('e-餐饮');
  });

  it('"霸王茶姬18" → 餐饮', () => {
    const cats = makeCategories();
    const r = parseSmartInput('霸王茶姬18', accounts, cats);
    expect(findCategoryByIdentifier(cats, r.type, r.categoryKeyword)).toBe('e-餐饮');
  });

  it('"肯德基30" → 餐饮', () => {
    const cats = makeCategories();
    const r = parseSmartInput('肯德基30', accounts, cats);
    expect(findCategoryByIdentifier(cats, r.type, r.categoryKeyword)).toBe('e-餐饮');
  });

  it('"买苹果20" 水果苹果 → 餐饮', () => {
    const cats = makeCategories();
    const r = parseSmartInput('买苹果20', accounts, cats);
    expect(findCategoryByIdentifier(cats, r.type, r.categoryKeyword)).toBe('e-餐饮');
  });

  it('"苹果手机8000" 长词优先 → 购物', () => {
    const cats = makeCategories();
    const r = parseSmartInput('苹果手机8000', accounts, cats);
    expect(findCategoryByIdentifier(cats, r.type, r.categoryKeyword)).toBe('e-购物');
  });

  it('"便利店买水5块" → 购物（便利店不再误归餐饮）', () => {
    const cats = makeCategories();
    const r = parseSmartInput('便利店买水5块', accounts, cats);
    expect(findCategoryByIdentifier(cats, r.type, r.categoryKeyword)).toBe('e-购物');
  });

  it('"买菜25" → 购物', () => {
    const cats = makeCategories();
    const r = parseSmartInput('买菜25', accounts, cats);
    expect(findCategoryByIdentifier(cats, r.type, r.categoryKeyword)).toBe('e-购物');
  });

  it('"猫粮100" → 购物', () => {
    const cats = makeCategories();
    const r = parseSmartInput('猫粮100', accounts, cats);
    expect(findCategoryByIdentifier(cats, r.type, r.categoryKeyword)).toBe('e-购物');
  });

  it('"地铁6块" → 交通', () => {
    const cats = makeCategories();
    const r = parseSmartInput('地铁6块', accounts, cats);
    expect(findCategoryByIdentifier(cats, r.type, r.categoryKeyword)).toBe('e-交通');
  });

  it('"话费充值50" → 通讯', () => {
    const cats = makeCategories();
    const r = parseSmartInput('话费充值50', accounts, cats);
    expect(findCategoryByIdentifier(cats, r.type, r.categoryKeyword)).toBe('e-通讯');
  });

  it('"发工资10000" → 收入/工资', () => {
    const cats = makeCategories();
    const r = parseSmartInput('发工资10000', accounts, cats);
    expect(r.type).toBe('income');
    expect(findCategoryByIdentifier(cats, r.type, r.categoryKeyword)).toBe('i-工资');
  });

  it('"退款到账50" → 收入/退款（长词优先于"到账"）', () => {
    const cats = makeCategories();
    const r = parseSmartInput('退款到账50', accounts, cats);
    expect(r.type).toBe('income');
    expect(findCategoryByIdentifier(cats, r.type, r.categoryKeyword)).toBe('i-退款');
  });

  it('"支付宝到账100" → 收入，不被"支付宝"误判为支出转账', () => {
    const cats = makeCategories();
    const r = parseSmartInput('支付宝到账100', accounts, cats);
    expect(r.type).toBe('income');
    expect(r.accountKeyword).toBe('支付宝');
    const id = findCategoryByIdentifier(cats, r.type, r.categoryKeyword);
    expect(['i-其他收入', 'i-红包']).toContain(id);
  });

  it('用户分类名为"食物"时，"吃面15" 仍能映射到该分类', () => {
    const cats = makeCategories({ 'e-餐饮': { id: 'e-餐饮', name: '食物', type: 'expense' } });
    const r = parseSmartInput('吃面15', accounts, cats);
    expect(findCategoryByIdentifier(cats, r.type, r.categoryKeyword)).toBe('e-餐饮');
  });

  it('用户分类名为"美食"时，"肯德基30" 仍能映射到该分类', () => {
    const cats = makeCategories({ 'e-餐饮': { id: 'e-餐饮', name: '美食', type: 'expense' } });
    const r = parseSmartInput('肯德基30', accounts, cats);
    expect(findCategoryByIdentifier(cats, r.type, r.categoryKeyword)).toBe('e-餐饮');
  });
});
