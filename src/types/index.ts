export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;           // 人民币金额（记账金额）
  categoryId: string;
  note: string;
  createdAt: string;
  accountId: string;
  currency?: string;        // 原始货币代码（如 'USD', 'JPY'），默认 'CNY'
  originalAmount?: number;  // 原始货币金额
  exchangeRate?: number;    // 记账时汇率（1外币 = ?人民币）
}

export interface RecurringRecord {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  note: string;
  accountId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  dayOfMonth?: number;
  dayOfWeek?: number;
  startDate: string;
  endDate?: string;
  lastGenerated?: string;
  enabled: boolean;
  createdAt: string;
}

export interface RecordTemplate {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  note: string;
  accountId: string;
  name: string;
  icon: string;
  color: string;
  createdAt: string;
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  note: string;
  createdAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'alipay' | 'wechat' | 'cash' | 'other';
  balance: number;
  color: string;
  icon: string;
}

export interface FixedDeposit {
  id: string;
  name: string;
  bank: string;
  principal: number;
  rate: number;
  term: number;
  startDate: string;
  endDate: string;
  maturityAmount: number;
  status: 'active' | 'mature';
}

export interface Loan {
  id: string;
  name: string;
  bank: string;
  principal: number;
  rate: number;
  term: number;
  startDate: string;
  monthlyPayment: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'active' | 'paid';
}

export const AccountTypeNames: Record<string, string> = {
  bank: '银行',
  alipay: '支付宝',
  wechat: '微信',
  cash: '现金',
  other: '其他'
};

export const AccountIcons: Record<string, string> = {
  bank: 'Building2',
  alipay: 'Wallet',
  wechat: 'MessageCircle',
  cash: 'Banknote',
  other: 'CreditCard'
};