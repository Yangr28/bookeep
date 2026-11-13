import { describe, it, expect } from 'vitest';
import { Account, TransactionType } from '../types';
import { parseSmartInput, findCategoryByIdentifier } from './smartParser';
import { toDateKey, addMonths } from './date';

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

describe('parseSmartInput 自定义分类名直命中（最高优先级）', () => {
  it('"剪辑收入500" + 收入分类"剪辑收入" → 命中该分类，不被兜底词"收入"抢先', () => {
    const cats = [
      ...makeCategories(),
      { id: 'i-剪辑收入', name: '剪辑收入', type: 'income' as TransactionType, color: '#000', icon: 'tag' },
    ];
    const r = parseSmartInput('剪辑收入500', accounts, cats);
    expect(r.type).toBe('income');
    expect(r.amount).toBe('500');
    expect(findCategoryByIdentifier(cats, r.type, r.categoryKeyword)).toBe('i-剪辑收入');
  });

  it('"剪辑费收入300"（无自定义分类）→ 归到工资', () => {
    const cats = makeCategories();
    const r = parseSmartInput('剪辑费收入300', accounts, cats);
    expect(r.type).toBe('income');
    expect(findCategoryByIdentifier(cats, r.type, r.categoryKeyword)).toBe('i-工资');
  });

  it('支出侧同类修复：自定义分类"水果捞"输入"水果捞20" → 不被"水果"抢到餐饮', () => {
    const cats = [
      ...makeCategories(),
      { id: 'e-水果捞', name: '水果捞', type: 'expense' as TransactionType, color: '#000', icon: 'tag' },
    ];
    const r = parseSmartInput('水果捞20', accounts, cats);
    expect(findCategoryByIdentifier(cats, r.type, r.categoryKeyword)).toBe('e-水果捞');
  });

  it('无收入词但命中收入分类名 → 纠正类型："二手闲置300" → income + 该分类', () => {
    const cats = [
      ...makeCategories(),
      { id: 'i-二手闲置', name: '二手闲置', type: 'income' as TransactionType, color: '#000', icon: 'tag' },
    ];
    const r = parseSmartInput('二手闲置300', accounts, cats);
    expect(r.type).toBe('income');
    expect(findCategoryByIdentifier(cats, r.type, r.categoryKeyword)).toBe('i-二手闲置');
  });

  it('有收入信号但命中支出分类名 → 以收入信号为准："退款50" → income', () => {
    const cats = makeCategories();
    const r = parseSmartInput('退款50', accounts, cats);
    expect(r.type).toBe('income');
    expect(findCategoryByIdentifier(cats, r.type, r.categoryKeyword)).toBe('i-退款');
  });

  it('回归："支付宝到账100" 仍归其他收入/红包', () => {
    const cats = makeCategories();
    const r = parseSmartInput('支付宝到账100', accounts, cats);
    expect(r.type).toBe('income');
    const id = findCategoryByIdentifier(cats, r.type, r.categoryKeyword);
    expect(['i-其他收入', 'i-红包']).toContain(id);
  });
});

describe('parseSmartInput 口语日期时间', () => {
  /** 期望日期键：今天偏移 offsetDays 天（本地时区安全） */
  const expectDateKey = (offsetDays: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return toDateKey(d);
  };
  /** 期望日期键：最近过去的周 target（0=周日），weeksBack=1 再往前推一周 */
  const expectRecentWeekday = (target: number, weeksBack = 0): string => {
    const now = new Date();
    const diff = (now.getDay() - target + 7) % 7;
    const d = new Date();
    d.setDate(d.getDate() - (diff + weeksBack * 7));
    return toDateKey(d);
  };

  it('"昨天打车32" → 昨天日期 + 金额 32（回归）', () => {
    const r = parseSmartInput('昨天打车32', accounts, makeCategories());
    expect(r.date).toBe(expectDateKey(-1));
    expect(r.amount).toBe('32');
    expect(r.note).not.toContain('昨天');
  });

  it('"前天打车32" → 前天日期，备注不残留', () => {
    const r = parseSmartInput('前天打车32', accounts, makeCategories());
    expect(r.date).toBe(expectDateKey(-2));
    expect(r.amount).toBe('32');
    expect(r.note).not.toContain('前天');
  });

  it('"大前天吃饭25" → 大前天日期', () => {
    const r = parseSmartInput('大前天吃饭25', accounts, makeCategories());
    expect(r.date).toBe(expectDateKey(-3));
    expect(r.amount).toBe('25');
  });

  it('"3天前购物100" → 3天前日期', () => {
    const r = parseSmartInput('3天前购物100', accounts, makeCategories());
    expect(r.date).toBe(expectDateKey(-3));
    expect(r.amount).toBe('100');
    expect(r.note).not.toContain('3天前');
  });

  it('"十天前打车45"（中文数字）→ 10天前日期', () => {
    const r = parseSmartInput('十天前打车45', accounts, makeCategories());
    expect(r.date).toBe(expectDateKey(-10));
    expect(r.amount).toBe('45');
  });

  it('"上周三打车" → 上周三日期', () => {
    const r = parseSmartInput('上周三打车', accounts, makeCategories());
    expect(r.date).toBe(expectRecentWeekday(3, 1));
    expect(r.note).not.toContain('周三');
  });

  it('"周日买菜50" → 最近过去的周日', () => {
    const r = parseSmartInput('周日买菜50', accounts, makeCategories());
    expect(r.date).toBe(expectRecentWeekday(0));
    expect(r.amount).toBe('50');
  });

  it('"上个月买衣服200" → 上个月同日（月末钳制）', () => {
    const r = parseSmartInput('上个月买衣服200', accounts, makeCategories());
    expect(r.date).toBe(toDateKey(addMonths(new Date(), -1)));
    expect(r.amount).toBe('200');
    expect(r.note).not.toContain('上个月');
  });

  it('"下午3点开会" → 15:00', () => {
    const r = parseSmartInput('下午3点开会', accounts, makeCategories());
    expect(r.time).toBe('15:00');
  });

  it('"晚上8点半买夜宵" → 20:30', () => {
    const r = parseSmartInput('晚上8点半买夜宵', accounts, makeCategories());
    expect(r.time).toBe('20:30');
  });

  it('"昨天晚上8点30打车45" → 20:30 + 金额 45', () => {
    const r = parseSmartInput('昨天晚上8点30打车45', accounts, makeCategories());
    expect(r.time).toBe('20:30');
    expect(r.amount).toBe('45');
  });

  it('"8点半买早餐" → 08:30 且 8 不再被当成金额', () => {
    const r = parseSmartInput('8点半买早餐', accounts, makeCategories());
    expect(r.time).toBe('08:30');
    expect(r.amount).toBe('');
    expect(r.note).not.toContain('点半');
  });

  it('"上午9点买咖啡25" → 09:00 + 金额 25', () => {
    const r = parseSmartInput('上午9点买咖啡25', accounts, makeCategories());
    expect(r.time).toBe('09:00');
    expect(r.amount).toBe('25');
  });

  it('"中午12点吃饭30" → 12:00（不误加12小时）', () => {
    const r = parseSmartInput('中午12点吃饭30', accounts, makeCategories());
    expect(r.time).toBe('12:00');
    expect(r.amount).toBe('30');
  });

  it('"2点5块买奶茶" → 口语小数 2.5，不当作时间', () => {
    const r = parseSmartInput('2点5块买奶茶', accounts, makeCategories());
    expect(r.amount).toBe('2.5');
    expect(r.time).toBe('');
  });

  it('"8点5分买早餐6块" → 08:05 + 金额 6', () => {
    const r = parseSmartInput('8点5分买早餐6块', accounts, makeCategories());
    expect(r.time).toBe('08:05');
    expect(r.amount).toBe('6');
  });
});
