import { Category, Transaction, Account, FixedDeposit, Loan, Transfer } from '../types';

export const initialCategories: Category[] = [
  { id: 'inc-1', name: '工资', type: 'income', icon: 'Wallet', color: '#10B981' },
  { id: 'inc-2', name: '奖金', type: 'income', icon: 'Gift', color: '#34D399' },
  { id: 'inc-3', name: '投资收益', type: 'income', icon: 'TrendingUp', color: '#6EE7B7' },
  { id: 'inc-4', name: '其他收入', type: 'income', icon: 'Plus', color: '#A7F3D0' },
  { id: 'exp-1', name: '餐饮', type: 'expense', icon: 'UtensilsCrossed', color: '#EF4444' },
  { id: 'exp-2', name: '交通', type: 'expense', icon: 'Car', color: '#F97316' },
  { id: 'exp-3', name: '购物', type: 'expense', icon: 'ShoppingBag', color: '#F59E0B' },
  { id: 'exp-4', name: '娱乐', type: 'expense', icon: 'Gamepad2', color: '#EAB308' },
  { id: 'exp-5', name: '医疗', type: 'expense', icon: 'Heart', color: '#84CC16' },
  { id: 'exp-6', name: '教育', type: 'expense', icon: 'GraduationCap', color: '#22C55E' },
  { id: 'exp-7', name: '住房', type: 'expense', icon: 'Home', color: '#14B8A6' },
  { id: 'exp-8', name: '其他支出', type: 'expense', icon: 'MoreHorizontal', color: '#6366F1' },
];

export const initialTransactions: Transaction[] = [
  { id: 'txn-1', type: 'expense', amount: 35, categoryId: 'exp-1', accountId: 'acc-3', note: '午餐', createdAt: new Date().toISOString() },
  { id: 'txn-2', type: 'income', amount: 15000, categoryId: 'inc-1', accountId: 'acc-1', note: '1月工资', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'txn-3', type: 'expense', amount: 120, categoryId: 'exp-3', accountId: 'acc-2', note: '日用品', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'txn-4', type: 'expense', amount: 80, categoryId: 'exp-4', accountId: 'acc-3', note: '电影票', createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'txn-5', type: 'expense', amount: 2500, categoryId: 'exp-7', accountId: 'acc-1', note: '房租', createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'txn-6', type: 'income', amount: 2000, categoryId: 'inc-2', accountId: 'acc-1', note: '年终奖', createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() },
];

export const initialAccounts: Account[] = [
  { id: 'acc-1', name: '招商银行', type: 'bank', balance: 10000, color: '#10B981', icon: 'Building2' },
  { id: 'acc-2', name: '支付宝', type: 'alipay', balance: 5000, color: '#3B82F6', icon: 'Wallet' },
  { id: 'acc-3', name: '微信零钱', type: 'wechat', balance: 2000, color: '#22C55E', icon: 'MessageCircle' },
  { id: 'acc-4', name: '现金', type: 'cash', balance: 500, color: '#F59E0B', icon: 'Banknote' },
];

export const initialFixedDeposits: FixedDeposit[] = [
  { 
    id: 'fd-1', 
    name: '定期存款', 
    bank: '招商银行', 
    principal: 50000, 
    rate: 2.75, 
    term: 12, 
    startDate: '2026-01-15', 
    endDate: '2027-01-15', 
    maturityAmount: 51375, 
    status: 'active' 
  },
  { 
    id: 'fd-2', 
    name: '三年定期', 
    bank: '工商银行', 
    principal: 30000, 
    rate: 3.5, 
    term: 36, 
    startDate: '2025-06-01', 
    endDate: '2028-06-01', 
    maturityAmount: 33150, 
    status: 'active' 
  },
];

export const initialLoans: Loan[] = [
  {
    id: 'loan-1',
    name: '房贷',
    bank: '建设银行',
    principal: 800000,
    rate: 4.2,
    term: 360,
    startDate: '2023-01-01',
    monthlyPayment: 3891,
    paidAmount: 93384,
    remainingAmount: 706616,
    status: 'active'
  },
  {
    id: 'loan-2',
    name: '车贷',
    bank: '招商银行',
    principal: 100000,
    rate: 3.5,
    term: 60,
    startDate: '2025-01-01',
    monthlyPayment: 1810,
    paidAmount: 21720,
    remainingAmount: 78280,
    status: 'active'
  },
];

export const initialTransfers: Transfer[] = [];