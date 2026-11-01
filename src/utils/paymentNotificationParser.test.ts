import { describe, it, expect } from 'vitest';
import { parsePaymentNotification } from './paymentNotificationParser';

const WECHAT = 'com.tencent.mm';
const ALIPAY = 'com.eg.android.AlipayGphone';
const NOW = new Date('2026-11-01T12:00:00+08:00');

describe('parsePaymentNotification', () => {
  it('解析微信支付通知（¥ 金额 + 收款方）', () => {
    const result = parsePaymentNotification(
      {
        packageName: WECHAT,
        title: '微信支付',
        text: '已支付¥38.50，收款方：瑞幸咖啡',
        time: NOW.getTime() - 60 * 1000,
      },
      NOW,
    );
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(38.5);
    expect(result?.type).toBe('expense');
    expect(result?.merchant).toBe('瑞幸咖啡');
  });

  it('解析支付宝通知（元 + 成功付款）', () => {
    const result = parsePaymentNotification(
      {
        packageName: ALIPAY,
        title: '支付宝',
        text: '你已成功付款 25.00 元，付款给：美团',
        time: NOW.getTime(),
      },
      NOW,
    );
    expect(result?.amount).toBe(25);
    expect(result?.merchant).toBe('美团');
  });

  it('无法识别商户时回退为渠道名', () => {
    const result = parsePaymentNotification(
      { packageName: ALIPAY, title: '支付宝', text: '支付成功 12.34元', time: NOW.getTime() },
      NOW,
    );
    expect(result?.merchant).toBe('支付宝');
    expect(result?.note).toBe('支付宝');
  });

  it('收入类通知不记账（收款 / 退款）', () => {
    expect(
      parsePaymentNotification(
        { packageName: WECHAT, title: '微信支付', text: '微信支付收款 20.00 元', time: NOW.getTime() },
        NOW,
      ),
    ).toBeNull();
    expect(
      parsePaymentNotification(
        { packageName: ALIPAY, title: '支付宝', text: '退款成功 9.90 元已到账', time: NOW.getTime() },
        NOW,
      ),
    ).toBeNull();
  });

  it('缺少关键词或金额时跳过', () => {
    expect(
      parsePaymentNotification(
        { packageName: WECHAT, title: '微信', text: '你有 3 条新消息', time: NOW.getTime() },
        NOW,
      ),
    ).toBeNull();
    expect(
      parsePaymentNotification(
        { packageName: ALIPAY, title: '支付宝', text: '支付成功', time: NOW.getTime() },
        NOW,
      ),
    ).toBeNull();
  });

  it('非白名单应用的通知不处理', () => {
    expect(
      parsePaymentNotification(
        { packageName: 'com.example.app', title: '某应用', text: '支付成功 ¥10.00', time: NOW.getTime() },
        NOW,
      ),
    ).toBeNull();
  });

  it('时间戳异常时回退为当前时间', () => {
    const result = parsePaymentNotification(
      { packageName: WECHAT, title: '微信支付', text: '已支付¥10.00', time: 0 },
      NOW,
    );
    expect(result?.dateTime.getTime()).toBe(NOW.getTime());
  });
});
