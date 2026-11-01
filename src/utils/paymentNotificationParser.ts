import { TransactionType } from '../types';
import type { PaymentNotificationPayload } from '../plugins/paymentNotifications';

/** 解析后的支付通知（可直接用于首页「确认入账」浮层） */
export interface ParsedPaymentNotification {
  amount: number;
  type: TransactionType;
  /** 商户 / 付款对象，无法识别时回退为渠道名 */
  merchant: string;
  note: string;
  dateTime: Date;
}

const PACKAGE_WECHAT = 'com.tencent.mm';
const PACKAGE_ALIPAY = 'com.eg.android.AlipayGphone';

/** 收入类关键词：第一版只做支出，命中即跳过，避免把「收款」误记成消费 */
const INCOME_WORDS = ['收款', '已收', '到账', '收入', '转入', '退款'];

/** 支出类关键词：必须至少命中一个，避免把营销通知当账单 */
const EXPENSE_WORDS = ['支付成功', '付款成功', '成功付款', '成功支付', '已支付', '已付款', '支出', '消费', '扣款', '交易成功'];

const AMOUNT_PATTERNS = [
  /(?:¥|￥|RMB|CNY)\s*([0-9]+(?:[.,][0-9]{1,2})?)/i,
  /([0-9]+(?:[.,][0-9]{1,2})?)\s*元/,
];

const MERCHANT_PATTERNS = [
  /收款方[:：]\s*([^\s，,。；;|]+)/,
  /付款给[:：]?\s*([^\s，,。；;|]+)/,
  /向\s*([^\s，,。；;|]+)\s*付款/,
  /商户[:：]?\s*([^\s，,。；;|]+)/,
];

const extractAmount = (text: string): number | null => {
  for (const pattern of AMOUNT_PATTERNS) {
    const matched = text.match(pattern);
    if (matched) {
      const value = Number(matched[1].replace(',', '.'));
      if (Number.isFinite(value) && value > 0) return value;
    }
  }
  return null;
};

const extractMerchant = (text: string): string => {
  for (const pattern of MERCHANT_PATTERNS) {
    const matched = text.match(pattern);
    if (matched?.[1]) return matched[1].trim();
  }
  return '';
};

/** 通知时间戳异常（缺失、未来时间、过于久远）时回退到当前时间 */
const resolveTime = (time: number | undefined, now: Date): Date => {
  if (!time || !Number.isFinite(time)) return now;
  const date = new Date(time);
  const diff = now.getTime() - date.getTime();
  if (diff < -60 * 1000 || diff > 7 * 24 * 60 * 60 * 1000) return now;
  return date;
};

/**
 * 把一条通知解析成支出账单。仅支持微信 / 支付宝，且必须同时满足：
 * 命中支出关键词、不含收入关键词、能识别到金额。
 */
export const parsePaymentNotification = (
  notification: PaymentNotificationPayload | null | undefined,
  now: Date = new Date(),
): ParsedPaymentNotification | null => {
  if (!notification) return null;
  const { packageName } = notification;
  if (packageName !== PACKAGE_WECHAT && packageName !== PACKAGE_ALIPAY) return null;

  const text = `${notification.title ?? ''} ${notification.text ?? ''}`.replace(/\s+/g, ' ').trim();
  if (!text) return null;

  // 「收款方：xxx」是常见的支出凭证字段，判断收入前先剔除，避免误判为收款
  const incomeCheckText = text.replace(/收款方/g, '');
  if (INCOME_WORDS.some((word) => incomeCheckText.includes(word))) return null;
  if (!EXPENSE_WORDS.some((word) => text.includes(word))) return null;

  const amount = extractAmount(text);
  if (amount === null) return null;

  const channel = packageName === PACKAGE_WECHAT ? '微信支付' : '支付宝';
  const merchant = extractMerchant(text) || channel;

  return {
    amount,
    type: 'expense',
    merchant,
    note: merchant,
    dateTime: resolveTime(notification.time, now),
  };
};
