import { useState, useRef, TouchEvent, DragEvent, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { todayKey, toDateKey, addMonths, parseDateKey } from '../utils/date';
import { createPortal } from 'react-dom';
import { Building2, Wallet, MessageCircle, Banknote, CreditCard, Plus, X, ChevronRight, Trash2, Edit3, Calendar, Clock, Percent, Palette, ArrowUpDown, Landmark, ArrowRight, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Account, AccountIcons } from '../types';
import { formatCurrencyShort } from '../utils/format';
import { CalendarPicker } from '../components/CalendarPicker';

import { VersionInfo } from '../components/VersionInfo';

const iconMap: Record<string, React.ReactNode> = {
  Building2: <Building2 size={24} />,
  Wallet: <Wallet size={24} />,
  MessageCircle: <MessageCircle size={24} />,
  Banknote: <Banknote size={24} />,
  CreditCard: <CreditCard size={24} />
};

const accountTypeOptions = [
  { value: 'bank', icon: 'Building2' },
  { value: 'alipay', icon: 'Wallet' },
  { value: 'wechat', icon: 'MessageCircle' },
  { value: 'cash', icon: 'Banknote' },
  { value: 'other', icon: 'CreditCard' }
];

const colorOptions = [
  '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

const termOptions = [
  { value: 3 },
  { value: 6 },
  { value: 12 },
  { value: 24 },
  { value: 36 },
  { value: 60 }
];

// 银行名为存量数据中的存储值，此处仅做展示名到 i18n key 的映射
const bankKeyMap: Record<string, string> = {
  '招商银行': 'cmb',
  '工商银行': 'icb',
  '建设银行': 'ccb',
  '农业银行': 'abc',
  '中国银行': 'boc',
  '交通银行': 'bcm',
  '其他银行': 'other'
};

const bankOptions = ['招商银行', '工商银行', '建设银行', '农业银行', '中国银行', '交通银行', '其他银行'];

interface AccountsProps {
  isTab?: boolean;
  onViewAccountDetail: (accountId: string) => void;
  onGoToBudgets?: () => void;
  onGoToRecurring?: () => void;
  onGoToTemplates?: () => void;
  onGoToCurrencyConverter?: () => void;
}

export const Accounts = ({
  onViewAccountDetail,
}: AccountsProps) => {
  const { t, i18n } = useTranslation();

  /** 预设银行名翻译为当前语言，自定义银行名原样显示 */
  const bankLabel = (name: string) => {
    const key = bankKeyMap[name];
    return key ? t(`accounts.banks.${key}`) : name;
  };

  /** 存期（月）本地化：不足 1 年显示月，否则显示年 */
  const termLabel = (months: number) =>
    months < 12
      ? t('accounts.term.months', { count: months })
      : t('accounts.term.years', { count: months / 12 });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { 
    accounts, 
    addAccount, 
    deleteAccount, 
    updateAccount, 
    reorderAccounts,
    getTotalAssets,
    fixedDeposits,
    addFixedDeposit,
    deleteFixedDeposit,
    getTotalFixedDeposits,
    loans,
    addLoan,
    deleteLoan,
    getTotalLoans,
    addTransfer,
    transfers,
    deleteTransfer
  } = useStore();

  const [activeTab, setActiveTab] = useState<'accounts' | 'transfer' | 'deposits' | 'loans'>('accounts');
  const [transferFromId, setTransferFromId] = useState<string>('');
  const [transferToId, setTransferToId] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showDepositDatePicker, setShowDepositDatePicker] = useState(false);
  const [showLoanDatePicker, setShowLoanDatePicker] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [displayOrder, setDisplayOrder] = useState<string[]>([]);
  const startPos = useRef({ x: 0, y: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const orderedAccounts = displayOrder.length > 0
    ? accounts.filter(a => displayOrder.includes(a.id))
        .sort((a, b) => displayOrder.indexOf(a.id) - displayOrder.indexOf(b.id))
    : accounts;

  const handleDragStart = (e: DragEvent, index: number) => {
    setDraggedIndex(index);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      const currentOrder = displayOrder.length > 0 ? [...displayOrder] : accounts.map(a => a.id);
      const [removed] = currentOrder.splice(draggedIndex, 1);
      currentOrder.splice(toIndex, 0, removed);
      setDisplayOrder(currentOrder);
      reorderAccounts(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setIsDragging(false);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setIsDragging(false);
  };

  const handleTouchStart = (e: TouchEvent, index: number) => {
    startPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    longPressTimer.current = setTimeout(() => {
      setDraggedIndex(index);
      setIsDragging(true);
    }, 500);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (longPressTimer.current && isDragging) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (toIndex: number) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isDragging && draggedIndex !== null && draggedIndex !== toIndex) {
      const currentOrder = displayOrder.length > 0 ? [...displayOrder] : accounts.map(a => a.id);
      const [removed] = currentOrder.splice(draggedIndex, 1);
      currentOrder.splice(toIndex, 0, removed);
      setDisplayOrder(currentOrder);
      reorderAccounts(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setIsDragging(false);
  };
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showCustomColorPicker, setShowCustomColorPicker] = useState(false);
  const [customColorValue, setCustomColorValue] = useState('#10B981');
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountFormData, setAccountFormData] = useState({
    name: '',
    type: 'bank' as Account['type'],
    balance: '',
    color: '#10B981'
  });
  const [depositFormData, setDepositFormData] = useState({
    name: '',
    bank: '招商银行',
    principal: '',
    rate: '',
    term: 12,
    startDate: todayKey()
  });
  const [loanFormData, setLoanFormData] = useState({
    name: '',
    bank: '招商银行',
    principal: '',
    rate: '',
    term: 36,
    startDate: todayKey()
  });
  const [showCustomBank, setShowCustomBank] = useState(false);

  const totalAssetsValue = getTotalAssets();
  const totalFixedDepositsValue = getTotalFixedDeposits();
  const totalLoansValue = getTotalLoans();
  const liquidAssets = accounts.reduce((sum, a) => sum + a.balance, 0);

  const calculateMaturityAmount = (principal: number, rate: number, term: number): number => {
    return Math.round(principal * (1 + rate / 100 * (term / 12)));
  };

  const calculateMonthlyPayment = (principal: number, rate: number, term: number): number => {
    const monthlyRate = rate / 100 / 12;
    const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, term);
    const denominator = Math.pow(1 + monthlyRate, term) - 1;
    return Math.round(numerator / denominator);
  };

  const calculateEndDate = (startDate: string, term: number): string => {
    // parseDateKey 本地正午构造,避免 new Date('YYYY-MM-DD') 的 UTC 解析偏差
    return toDateKey(addMonths(parseDateKey(startDate), term));
  };

  const handleOpenAddModal = () => {
    setAccountFormData({ name: '', type: 'bank', balance: '', color: '#10B981' });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (account: Account) => {
    setEditingAccount(account);
    setAccountFormData({
      name: account.name,
      type: account.type,
      balance: account.balance.toString(),
      color: account.color
    });
    setShowEditModal(true);
  };

  const handleLoanSubmit = () => {
    if (!loanFormData.name.trim() || !loanFormData.principal || !loanFormData.rate) return;
    
    const principal = parseFloat(loanFormData.principal);
    const rate = parseFloat(loanFormData.rate);
    const term = loanFormData.term;
    const monthlyPayment = calculateMonthlyPayment(principal, rate, term);

    addLoan({
      ...loanFormData,
      principal,
      rate,
      monthlyPayment,
      paidAmount: 0,
      remainingAmount: principal,
      status: 'active'
    });
    setShowLoanModal(false);
  };

  const handleLoanDelete = (id: string) => {
    if (confirm(t('accounts.loan.deleteConfirm'))) {
      deleteLoan(id);
    }
  };

  const handleAccountSubmit = () => {
    if (!accountFormData.name.trim() || accountFormData.balance === '') return;
    
    const icon = AccountIcons[accountFormData.type];
    
    if (editingAccount) {
      updateAccount(editingAccount.id, {
        ...accountFormData,
        balance: parseFloat(accountFormData.balance),
        icon
      });
      setShowEditModal(false);
    } else {
      addAccount({
        ...accountFormData,
        balance: parseFloat(accountFormData.balance),
        icon
      });
      setShowAddModal(false);
    }
  };

  const handleDepositSubmit = () => {
    if (!depositFormData.name.trim() || !depositFormData.principal || !depositFormData.rate) return;
    
    const principal = parseFloat(depositFormData.principal);
    const rate = parseFloat(depositFormData.rate);
    const term = depositFormData.term;
    const endDate = calculateEndDate(depositFormData.startDate, term);
    const maturityAmount = calculateMaturityAmount(principal, rate, term);
    const now = new Date();
    const end = new Date(endDate);
    const status = end < now ? 'mature' : 'active';

    addFixedDeposit({
      ...depositFormData,
      principal,
      rate,
      endDate,
      maturityAmount,
      status
    });
    setShowDepositModal(false);
  };

  const handleAccountDelete = (id: string) => {
    if (confirm(t('accounts.deleteAccountConfirm'))) {
      deleteAccount(id);
    }
  };

  const handleDepositDelete = (id: string) => {
    if (confirm(t('accounts.deposit.deleteConfirm'))) {
      deleteFixedDeposit(id);
    }
  };

  const formatDaysRemaining = (endDate: string): string => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return t('accounts.deposit.daysMatured');
    if (diffDays < 30) return t('accounts.deposit.daysRemaining', { count: diffDays });
    const months = Math.ceil(diffDays / 30);
    if (months < 12) return t('accounts.deposit.monthsRemaining', { count: months });
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return t('accounts.deposit.yearsRemaining', { count: years });
    return t('accounts.deposit.yearsMonthsRemaining', { years, months: remainingMonths });
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomColorValue(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      setAccountFormData({ ...accountFormData, color: value });
      setShowCustomColorPicker(false);
    }
  };

  const handleCustomColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^#0-9A-F]/g, '');
    setCustomColorValue(value);
  };

  return (
    <div className="page-root pb-nav">
      {/* 页头 */}
      <div className="safe-top px-4 pt-2 pb-1 flex items-center gap-3">
        <div className="flex-1">
          <h1 className="page-title">{t('accounts.title')}</h1>
          <p className="page-subtitle">{t('accounts.subtitle')}</p>
        </div>
      </div>

      {/* 总资产卡 */}
      <div className="px-4 mt-3">
        <div className="card p-5">
          <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>{t('accounts.totalAssets')}</p>
          <p className="text-3xl font-bold mt-2 amount-num truncate" style={{ color: 'var(--ink)' }}>
            {formatCurrencyShort(totalAssetsValue)}
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 text-sm">
            <span style={{ color: 'var(--ink-2)' }}>
              {t('accounts.liquid')} <span className="font-semibold amount-num" style={{ color: 'var(--ink)' }}>{formatCurrencyShort(liquidAssets)}</span>
            </span>
            <span style={{ color: 'var(--ink-2)' }}>
              {t('accounts.fixed')} <span className="font-semibold amount-num" style={{ color: 'var(--primary)' }}>{formatCurrencyShort(totalFixedDepositsValue)}</span>
            </span>
            <span style={{ color: 'var(--ink-2)' }}>
              {t('accounts.loansLabel')} <span className="font-semibold amount-num" style={{ color: 'var(--expense)' }}>{formatCurrencyShort(-totalLoansValue)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="px-4 mt-4">
        <div className="seg mb-4">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`seg-item text-xs ${activeTab === 'accounts' ? 'seg-item-active' : ''}`}
          >
            {t('accounts.tabs.accounts')}
          </button>
          <button
            onClick={() => setActiveTab('transfer')}
            className={`seg-item text-xs ${activeTab === 'transfer' ? 'seg-item-active' : ''}`}
          >
            {t('accounts.tabs.transfer')}
          </button>
          <button
            onClick={() => setActiveTab('deposits')}
            className={`seg-item text-xs ${activeTab === 'deposits' ? 'seg-item-active' : ''}`}
          >
            {t('accounts.tabs.deposits')}
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`seg-item text-xs ${activeTab === 'loans' ? 'seg-item-active' : ''}`}
          >
            {t('accounts.tabs.loans')}
          </button>
        </div>

        {activeTab === 'accounts' && (
          <>
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('accounts.dragHint')}</span>
              <ArrowUpDown size={16} style={{ color: 'var(--ink-2)' }} />
            </div>
            <div className="space-y-2">
              {orderedAccounts.map((account, index) => (
                <button
                  key={account.id}
                  onClick={() => onViewAccountDetail(account.id)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={(e) => handleTouchStart(e, index)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={() => handleTouchEnd(index)}
                  className={`card w-full p-3 flex items-center justify-between cursor-grab active:cursor-grabbing ${
                    draggedIndex === index ? 'opacity-50 scale-95' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${account.color}30`, color: account.color }}
                    >
                      {iconMap[account.icon]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-medium text-sm leading-tight truncate" style={{ color: 'var(--ink)' }}>{account.name}</h3>
                        {account.balance <= 0 && (
                          <span className="p-0.5 rounded-full flex items-center flex-shrink-0" style={{ background: 'var(--expense-soft)', color: 'var(--expense)' }}>
                            <AlertCircle size={10} />
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>{t(`accounts.type.${account.type}`)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <p className="font-semibold text-sm truncate amount-num mr-1" style={{ color: account.balance <= 0 ? 'var(--expense)' : 'var(--ink)' }}>
                      {formatCurrencyShort(account.balance)}
                    </p>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(account);
                      }}
                      className="p-1.5 rounded-full transition-colors cursor-pointer flex items-center justify-center hover:bg-[color:var(--paper-deep)]"
                      style={{ color: 'var(--ink-2)' }}
                    >
                      <Edit3 size={14} />
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAccountDelete(account.id);
                      }}
                      className="p-1.5 rounded-full transition-colors cursor-pointer flex items-center justify-center hover:bg-[color:var(--expense-soft)] hover:text-[color:var(--expense)]"
                      style={{ color: 'var(--ink-2)' }}
                    >
                      <Trash2 size={14} />
                    </span>
                    <ChevronRight size={16} className="opacity-40" style={{ color: 'var(--ink-2)' }} />
                  </div>
                </button>
              ))}
            </div>

            {accounts.length === 0 && (
              <div className="card flex flex-col items-center py-12 px-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--paper-deep)' }}>
                  <Wallet size={28} style={{ color: 'var(--ink-2)' }} />
                </div>
                <p className="text-sm mb-4" style={{ color: 'var(--ink-2)' }}>{t('accounts.emptyAccounts')}</p>
                <button
                  onClick={handleOpenAddModal}
                  className="btn-primary px-6 py-2.5 text-sm"
                >
                  {t('accounts.addFirstAccount')}
                </button>
              </div>
            )}

            {/* 底部空白区域，避免浮动按钮遮挡 */}
            <div className="h-24" />

            <button
              onClick={handleOpenAddModal}
              className="fixed bottom-24 right-6 w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition-all z-40"
              style={{ background: 'var(--card)', color: 'var(--primary)', border: '2px solid var(--primary)', boxShadow: 'var(--shadow-card)' }}
              aria-label={t('accounts.ariaAddAccount')}
            >
              <Plus size={24} />
            </button>
          </>
        )}

        {activeTab === 'transfer' && (
          <>
            <div className="space-y-4">
              <div className="card p-4">
                <label className="block text-sm font-medium mb-3" style={{ color: 'var(--ink-2)' }}>{t('accounts.transfer.from')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => setTransferFromId(account.id)}
                      className="flex items-center gap-2 p-3 rounded-button transition-all"
                      style={
                        transferFromId === account.id
                          ? { background: 'var(--primary-soft)', border: '2px solid var(--primary)', color: 'var(--primary-ink)' }
                          : { background: 'var(--paper)', border: '2px solid transparent', color: 'var(--ink)' }
                      }
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${account.color}30`, color: account.color }}
                      >
                        {iconMap[account.icon]}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium truncate">{account.name}</p>
                        <p className="text-xs amount-num truncate" style={{ color: 'var(--ink-2)' }}>{formatCurrencyShort(account.balance)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                  <ArrowRight size={20} />
                </div>
              </div>

              <div className="card p-4">
                <label className="block text-sm font-medium mb-3" style={{ color: 'var(--ink-2)' }}>{t('accounts.transfer.to')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => setTransferToId(account.id)}
                      className="flex items-center gap-2 p-3 rounded-button transition-all"
                      style={
                        transferToId === account.id
                          ? { background: 'var(--primary-soft)', border: '2px solid var(--primary)', color: 'var(--primary-ink)' }
                          : { background: 'var(--paper)', border: '2px solid transparent', color: 'var(--ink)' }
                      }
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${account.color}30`, color: account.color }}
                      >
                        {iconMap[account.icon]}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium truncate">{account.name}</p>
                        <p className="text-xs amount-num truncate" style={{ color: 'var(--ink-2)' }}>{formatCurrencyShort(account.balance)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card p-4">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-2)' }}>{t('accounts.transfer.amount')}</label>
                <div className="rounded-button p-3 flex items-baseline gap-2" style={{ background: 'var(--paper)' }}>
                  <span className="text-2xl font-semibold amount-num" style={{ color: 'var(--ink-2)' }}>¥</span>
                  <input
                    type="text"
                    value={transferAmount}
                    onChange={(e) => {
                      if (/^\d*\.?\d{0,2}$/.test(e.target.value)) {
                        setTransferAmount(e.target.value);
                      }
                    }}
                    placeholder="0.00"
                    className="flex-1 bg-transparent text-3xl font-bold outline-none w-full amount-num placeholder:text-[color:var(--ink-2)] placeholder:opacity-60"
                    style={{ color: 'var(--ink)' }}
                    inputMode="decimal"
                  />
                </div>
              </div>

              <div className="card p-4">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-2)' }}>{t('accounts.transfer.note')}</label>
                <input
                  type="text"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder={t('accounts.transfer.notePlaceholder')}
                  className="input-field w-full text-sm"
                />
              </div>

              <button
                onClick={() => {
                  if (!transferFromId || !transferToId || !transferAmount || parseFloat(transferAmount) <= 0) return;
                  if (transferFromId === transferToId) return;
                  const fromAccount = accounts.find((a) => a.id === transferFromId);
                  if (fromAccount && fromAccount.balance < parseFloat(transferAmount)) return;
                  
                  addTransfer({
                    fromAccountId: transferFromId,
                    toAccountId: transferToId,
                    amount: parseFloat(transferAmount),
                    note: transferNote,
                    createdAt: new Date().toISOString(),
                  });
                  
                  setTransferFromId('');
                  setTransferToId('');
                  setTransferAmount('');
                  setTransferNote('');
                }}
                disabled={!transferFromId || !transferToId || !transferAmount || parseFloat(transferAmount) <= 0 || transferFromId === transferToId}
                className="btn-primary w-full py-3.5"
              >
                {t('accounts.transfer.submit')}
              </button>

              <div className="pt-4" style={{ borderTop: '1px solid var(--line)' }}>
                <h3 className="font-bold text-base mb-3" style={{ color: 'var(--ink)' }}>{t('accounts.transfer.recordsTitle')}</h3>
                <div className="space-y-2">
                  {transfers.length > 0 ? (
                    [...transfers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((transfer) => {
                      const fromAccount = accounts.find((a) => a.id === transfer.fromAccountId);
                      const toAccount = accounts.find((a) => a.id === transfer.toAccountId);
                      return (
                        <div
                          key={transfer.id}
                          className="card p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                                <ArrowRightLeft size={17} />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{fromAccount?.name || t('common.unknown')}</span>
                                  <ArrowRight size={12} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
                                  <span className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{toAccount?.name || t('common.unknown')}</span>
                                </div>
                                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--ink-2)' }}>{transfer.note || t('accounts.transfer.defaultNote')}</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-semibold amount-num" style={{ color: 'var(--primary)' }}>{formatCurrencyShort(transfer.amount)}</p>
                              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
                                {new Date(transfer.createdAt).toLocaleString(i18n.language, {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteTransfer(transfer.id)}
                            className="mt-2 text-xs px-2 py-1 rounded-button font-medium"
                            style={{ color: 'var(--expense)', background: 'var(--expense-soft)' }}
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="card flex flex-col items-center py-10">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--paper-deep)' }}>
                        <ArrowRightLeft size={24} style={{ color: 'var(--ink-2)' }} />
                      </div>
                      <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{t('accounts.transfer.empty')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'deposits' && (
          <>
            <div className="space-y-3">
              {fixedDeposits.map((deposit) => (
                <div
                  key={deposit.id}
                  className="card card-hover p-5"
                >
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate" style={{ color: 'var(--ink)' }}>{deposit.name}</h3>
                        <span
                          className="px-2 py-0.5 text-xs rounded-full font-medium flex-shrink-0"
                          style={
                            deposit.status === 'active'
                              ? { background: 'var(--primary-soft)', color: 'var(--primary)' }
                              : { background: 'var(--paper-deep)', color: 'var(--ink-2)' }
                          }
                        >
                          {deposit.status === 'active' ? t('accounts.deposit.statusActive') : t('accounts.deposit.statusMatured')}
                        </span>
                      </div>
                      <p className="text-sm mt-1" style={{ color: 'var(--ink-2)' }}>{bankLabel(deposit.bank)}</p>
                    </div>
                    <button
                      onClick={() => handleDepositDelete(deposit.id)}
                      className="p-2 rounded-full transition-colors flex-shrink-0 hover:bg-[color:var(--expense-soft)] hover:text-[color:var(--expense)]"
                      style={{ color: 'var(--ink-2)' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="rounded-button p-3" style={{ background: 'var(--paper)' }}>
                      <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('accounts.deposit.principal')}</p>
                      <p className="font-semibold mt-1 truncate amount-num" style={{ color: 'var(--ink)' }}>{formatCurrencyShort(deposit.principal)}</p>
                    </div>
                    <div className="rounded-button p-3" style={{ background: 'var(--paper)' }}>
                      <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('accounts.deposit.maturityAmount')}</p>
                      <p className="font-semibold mt-1 truncate amount-num" style={{ color: 'var(--primary)' }}>{formatCurrencyShort(deposit.maturityAmount)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm gap-2" style={{ color: 'var(--ink-2)' }}>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Percent size={14} />
                        <span>{deposit.rate}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{termLabel(deposit.term)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span className="truncate">{formatDaysRemaining(deposit.endDate)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {fixedDeposits.length === 0 && (
              <div className="card flex flex-col items-center py-12 px-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--paper-deep)' }}>
                  <Banknote size={28} style={{ color: 'var(--ink-2)' }} />
                </div>
                <p className="text-sm mb-4" style={{ color: 'var(--ink-2)' }}>{t('accounts.deposit.empty')}</p>
                <button
                  onClick={() => setShowDepositModal(true)}
                  className="btn-primary px-6 py-2.5 text-sm"
                >
                  {t('accounts.deposit.addButton')}
                </button>
              </div>
            )}

            {/* 底部空白区域，避免浮动按钮遮挡 */}
            <div className="h-24" />

            <button
              onClick={() => setShowDepositModal(true)}
              className="fixed bottom-24 right-6 w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition-all z-40"
              style={{ background: 'var(--card)', color: 'var(--primary)', border: '2px solid var(--primary)', boxShadow: 'var(--shadow-card)' }}
              aria-label={t('accounts.deposit.ariaAdd')}
            >
              <Plus size={24} />
            </button>
          </>
        )}

        {activeTab === 'loans' && (
          <>
            <div className="space-y-3">
              {loans.map((loan) => (
                <div
                  key={loan.id}
                  className="card card-hover p-5"
                >
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate" style={{ color: 'var(--ink)' }}>{loan.name}</h3>
                        <span
                          className="px-2 py-0.5 text-xs rounded-full font-medium flex-shrink-0"
                          style={
                            loan.status === 'active'
                              ? { background: 'var(--expense-soft)', color: 'var(--expense)' }
                              : { background: 'var(--paper-deep)', color: 'var(--ink-2)' }
                          }
                        >
                          {loan.status === 'active' ? t('accounts.loan.statusActive') : t('accounts.loan.statusPaid')}
                        </span>
                      </div>
                      <p className="text-sm mt-1" style={{ color: 'var(--ink-2)' }}>{bankLabel(loan.bank)}</p>
                    </div>
                    <button
                      onClick={() => handleLoanDelete(loan.id)}
                      className="p-2 rounded-full transition-colors flex-shrink-0 hover:bg-[color:var(--expense-soft)] hover:text-[color:var(--expense)]"
                      style={{ color: 'var(--ink-2)' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="rounded-button p-3" style={{ background: 'var(--paper)' }}>
                      <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('accounts.loan.principalTotal')}</p>
                      <p className="font-semibold mt-1 truncate amount-num" style={{ color: 'var(--ink)' }}>{formatCurrencyShort(loan.principal)}</p>
                    </div>
                    <div className="rounded-button p-3" style={{ background: 'var(--paper)' }}>
                      <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('accounts.loan.remainingPrincipal')}</p>
                      <p className="font-semibold mt-1 truncate amount-num" style={{ color: 'var(--expense)' }}>{formatCurrencyShort(loan.remainingAmount)}</p>
                    </div>
                  </div>

                  <div className="rounded-button p-3 mb-3" style={{ background: 'var(--paper)' }}>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span style={{ color: 'var(--ink-2)' }}>{t('accounts.loan.progress')}</span>
                      <span className="font-medium amount-num" style={{ color: 'var(--ink)' }}>{((loan.paidAmount / loan.principal) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--paper-deep)' }}>
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(loan.paidAmount / loan.principal) * 100}%`, background: 'var(--expense)' }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm gap-2" style={{ color: 'var(--ink-2)' }}>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Percent size={14} />
                        <span>{loan.rate}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{termLabel(loan.term)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Landmark size={14} />
                      <span className="font-medium truncate amount-num" style={{ color: 'var(--expense)' }}>{formatCurrencyShort(loan.monthlyPayment)}{t('accounts.loan.perMonthUnit')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {loans.length === 0 && (
              <div className="card flex flex-col items-center py-12 px-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--paper-deep)' }}>
                  <Landmark size={28} style={{ color: 'var(--ink-2)' }} />
                </div>
                <p className="text-sm mb-4" style={{ color: 'var(--ink-2)' }}>{t('accounts.loan.empty')}</p>
                <button
                  onClick={() => setShowLoanModal(true)}
                  className="btn-primary px-6 py-2.5 text-sm"
                >
                  {t('accounts.loan.addButton')}
                </button>
              </div>
            )}

            {/* 底部空白区域，避免浮动按钮遮挡 */}
            <div className="h-24" />

            <button
              onClick={() => setShowLoanModal(true)}
              className="fixed bottom-24 right-6 w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition-all z-40"
              style={{ background: 'var(--card)', color: 'var(--expense)', border: '2px solid var(--expense)', boxShadow: 'var(--shadow-card)' }}
              aria-label={t('accounts.loan.ariaAdd')}
            >
              <Plus size={24} />
            </button>
          </>
        )}
      </div>

      {/* 添加账户弹层 */}
      {showAddModal && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center animate-fade-in" style={{ background: 'rgba(43,41,37,0.45)' }} onClick={() => setShowAddModal(false)}>
          <div className="sheet w-full max-w-md max-h-[85vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)', background: 'var(--card)' }}>
              <h3 className="font-bold" style={{ color: 'var(--ink)' }}>{t('accounts.form.addTitle')}</h3>
              <button onClick={() => setShowAddModal(false)} className="icon-btn w-9 h-9">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-2)' }}>{t('accounts.form.nameLabel')}</label>
                <input
                  type="text"
                  value={accountFormData.name}
                  onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })}
                  placeholder={t('accounts.form.namePlaceholder')}
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-2)' }}>{t('accounts.form.typeLabel')}</label>
                <div className="grid grid-cols-5 gap-2">
                  {accountTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setAccountFormData({ ...accountFormData, type: option.value as Account['type'], color: colorOptions[accountTypeOptions.indexOf(option)] });
                      }}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-button transition-all"
                      style={
                        accountFormData.type === option.value
                          ? { background: 'var(--primary-soft)', border: '2px solid var(--primary)', color: 'var(--primary-ink)' }
                          : { background: 'var(--paper)', border: '2px solid transparent', color: 'var(--ink)' }
                      }
                    >
                      <span className="flex items-center justify-center">{iconMap[option.icon]}</span>
                      <span className="text-xs font-medium">{t(`accounts.type.${option.value}`)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-2)' }}>{t('accounts.form.balanceLabel')}</label>
                <input
                  type="number"
                  value={accountFormData.balance}
                  onChange={(e) => setAccountFormData({ ...accountFormData, balance: e.target.value })}
                  placeholder="0.00"
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-2)' }}>{t('accounts.form.colorLabel')}</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAccountFormData({ ...accountFormData, color })}
                      className={`w-10 h-10 rounded-full transition-transform ${
                        accountFormData.color === color ? 'scale-110' : 'hover:scale-110'
                      }`}
                      style={{
                        backgroundColor: color,
                        boxShadow: accountFormData.color === color ? '0 0 0 2px var(--card), 0 0 0 4px var(--primary)' : undefined
                      }}
                    />
                  ))}
                  <button
                    onClick={() => {
                      setCustomColorValue(accountFormData.color);
                      setShowCustomColorPicker(true);
                    }}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                    style={{ border: '2px dashed var(--line)', color: 'var(--ink-2)' }}
                  >
                    <Palette size={18} />
                  </button>
                </div>
              </div>

              <div className="safe-bottom pt-2">
                <button
                  onClick={handleAccountSubmit}
                  disabled={!accountFormData.name.trim() || accountFormData.balance === ''}
                  className="btn-primary w-full"
                >
                  {t('accounts.form.submitAdd')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 编辑账户弹层 */}
      {showEditModal && editingAccount && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center animate-fade-in" style={{ background: 'rgba(43,41,37,0.45)' }} onClick={() => setShowEditModal(false)}>
          <div className="sheet w-full max-w-md max-h-[85vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)', background: 'var(--card)' }}>
              <h3 className="font-bold" style={{ color: 'var(--ink)' }}>{t('accounts.form.editTitle')}</h3>
              <button onClick={() => setShowEditModal(false)} className="icon-btn w-9 h-9">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-2)' }}>{t('accounts.form.nameLabel')}</label>
                <input
                  type="text"
                  value={accountFormData.name}
                  onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })}
                  placeholder={t('accounts.form.namePlaceholder')}
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-2)' }}>{t('accounts.form.typeLabel')}</label>
                <div className="grid grid-cols-5 gap-2">
                  {accountTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setAccountFormData({ ...accountFormData, type: option.value as Account['type'], color: colorOptions[accountTypeOptions.indexOf(option)] });
                      }}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-button transition-all"
                      style={
                        accountFormData.type === option.value
                          ? { background: 'var(--primary-soft)', border: '2px solid var(--primary)', color: 'var(--primary-ink)' }
                          : { background: 'var(--paper)', border: '2px solid transparent', color: 'var(--ink)' }
                      }
                    >
                      <span className="flex items-center justify-center">{iconMap[option.icon]}</span>
                      <span className="text-xs font-medium">{t(`accounts.type.${option.value}`)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-2)' }}>{t('accounts.form.balanceLabel')}</label>
                <input
                  type="number"
                  value={accountFormData.balance}
                  onChange={(e) => setAccountFormData({ ...accountFormData, balance: e.target.value })}
                  placeholder="0.00"
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-2)' }}>{t('accounts.form.colorLabel')}</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAccountFormData({ ...accountFormData, color })}
                      className={`w-10 h-10 rounded-full transition-transform ${
                        accountFormData.color === color ? 'scale-110' : 'hover:scale-110'
                      }`}
                      style={{
                        backgroundColor: color,
                        boxShadow: accountFormData.color === color ? '0 0 0 2px var(--card), 0 0 0 4px var(--primary)' : undefined
                      }}
                    />
                  ))}
                  <button
                    onClick={() => {
                      setCustomColorValue(accountFormData.color);
                      setShowCustomColorPicker(true);
                    }}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                    style={{ border: '2px dashed var(--line)', color: 'var(--ink-2)' }}
                  >
                    <Palette size={18} />
                  </button>
                </div>
              </div>

              <div className="safe-bottom pt-2">
                <button
                  onClick={handleAccountSubmit}
                  disabled={!accountFormData.name.trim() || accountFormData.balance === ''}
                  className="btn-primary w-full"
                >
                  {t('accounts.form.saveEdit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 添加定期存款弹层 */}
      {showDepositModal && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center animate-fade-in" style={{ background: 'rgba(43,41,37,0.45)' }} onClick={() => setShowDepositModal(false)}>
          <div className="sheet w-full max-w-md max-h-[85vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)', background: 'var(--card)' }}>
              <h3 className="font-bold" style={{ color: 'var(--ink)' }}>{t('accounts.deposit.formTitle')}</h3>
              <button onClick={() => setShowDepositModal(false)} className="icon-btn w-9 h-9">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-2)' }}>{t('accounts.deposit.nameLabel')}</label>
                <input
                  type="text"
                  value={depositFormData.name}
                  onChange={(e) => setDepositFormData({ ...depositFormData, name: e.target.value })}
                  placeholder={t('accounts.deposit.namePlaceholder')}
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-2)' }}>{t('accounts.deposit.bankLabel')}</label>
                {showCustomBank ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={depositFormData.bank}
                      onChange={(e) => setDepositFormData({ ...depositFormData, bank: e.target.value })}
                      placeholder={t('accounts.deposit.bankPlaceholder')}
                      className="input-field w-full"
                    />
                    <button
                      onClick={() => {
                        setShowCustomBank(false);
                        setDepositFormData({ ...depositFormData, bank: '招商银行' });
                      }}
                      className="text-sm font-medium"
                      style={{ color: 'var(--primary)' }}
                    >
                      {t('accounts.deposit.presetBank')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {bankOptions.filter(b => b !== '其他银行').map((bank) => (
                        <button
                          key={bank}
                          onClick={() => setDepositFormData({ ...depositFormData, bank })}
                          className="py-2 px-3 rounded-button text-sm font-medium transition-all"
                          style={
                            depositFormData.bank === bank
                              ? { background: 'var(--primary-soft)', border: '2px solid var(--primary)', color: 'var(--primary-ink)' }
                              : { background: 'var(--paper)', border: '2px solid transparent', color: 'var(--ink)' }
                          }
                        >
                          {bankLabel(bank)}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setShowCustomBank(true);
                        setDepositFormData({ ...depositFormData, bank: '' });
                      }}
                      className="w-full py-2 px-3 rounded-button text-sm font-medium transition-colors hover:border-[color:var(--primary)] hover:text-[color:var(--primary)]"
                      style={{ border: '1.5px dashed var(--line)', color: 'var(--ink-2)' }}
                    >
                      {t('accounts.deposit.customBank')}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-2)' }}>{t('accounts.deposit.amountLabel')}</label>
                <input
                  type="number"
                  value={depositFormData.principal}
                  onChange={(e) => setDepositFormData({ ...depositFormData, principal: e.target.value })}
                  placeholder="0.00"
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-2)' }}>{t('accounts.deposit.rateLabel')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={depositFormData.rate}
                  onChange={(e) => setDepositFormData({ ...depositFormData, rate: e.target.value })}
                  placeholder="2.75"
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-2)' }}>{t('accounts.deposit.termLabel')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {termOptions.map((term) => (
                    <button
                      key={term.value}
                      onClick={() => setDepositFormData({ ...depositFormData, term: term.value })}
                      className="py-2 rounded-button text-sm font-medium transition-all"
                      style={
                        depositFormData.term === term.value
                          ? { background: 'var(--primary)', color: '#fff' }
                          : { background: 'var(--paper)', color: 'var(--ink)' }
                      }
                    >
                      {termLabel(term.value)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-2)' }}>{t('accounts.deposit.startDateLabel')}</label>
                <button
                  onClick={() => setShowDepositDatePicker(true)}
                  className="input-field w-full py-2.5 px-3 text-left text-sm flex items-center"
                >
                  <span className="amount-num" style={{ color: 'var(--ink)' }}>
                    {depositFormData.startDate || t('accounts.deposit.selectDate')}
                  </span>
                </button>
              </div>

              {depositFormData.principal && depositFormData.rate && (
                <div className="rounded-button p-4" style={{ background: 'var(--paper)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--ink-2)' }}>{t('accounts.deposit.maturityAmount')}</span>
                    <span className="font-semibold amount-num" style={{ color: 'var(--primary)' }}>
                      {calculateMaturityAmount(
                        parseFloat(depositFormData.principal),
                        parseFloat(depositFormData.rate),
                        depositFormData.term
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm" style={{ color: 'var(--ink-2)' }}>{t('accounts.deposit.maturityDate')}</span>
                    <span className="text-sm" style={{ color: 'var(--ink)' }}>
                      {calculateEndDate(depositFormData.startDate, depositFormData.term)}
                    </span>
                  </div>
                </div>
              )}

              <div className="safe-bottom pt-2">
                <button
                  onClick={handleDepositSubmit}
                  disabled={!depositFormData.name.trim() || !depositFormData.principal || !depositFormData.rate}
                  className="btn-primary w-full"
                >
                  {t('accounts.deposit.submit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 添加贷款弹层 */}
      {showLoanModal && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center animate-fade-in" style={{ background: 'rgba(43,41,37,0.45)' }} onClick={() => setShowLoanModal(false)}>
          <div className="sheet w-full max-w-md max-h-[85vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)', background: 'var(--card)' }}>
              <h3 className="font-bold" style={{ color: 'var(--ink)' }}>{t('accounts.loan.formTitle')}</h3>
              <button onClick={() => setShowLoanModal(false)} className="icon-btn w-9 h-9">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-2)' }}>{t('accounts.loan.nameLabel')}</label>
                <input
                  type="text"
                  value={loanFormData.name}
                  onChange={(e) => setLoanFormData({ ...loanFormData, name: e.target.value })}
                  placeholder={t('accounts.loan.namePlaceholder')}
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-2)' }}>{t('accounts.loan.bankLabel')}</label>
                {!showCustomBank ? (
                  <div className="grid grid-cols-4 gap-2">
                    {bankOptions.map((bank) => (
                      <button
                        key={bank}
                        onClick={() => setLoanFormData({ ...loanFormData, bank })}
                        className="py-2 rounded-button text-sm font-medium transition-all"
                        style={
                          loanFormData.bank === bank
                            ? { background: 'var(--primary-soft)', border: '2px solid var(--primary)', color: 'var(--primary-ink)' }
                            : { background: 'var(--paper)', border: '2px solid transparent', color: 'var(--ink)' }
                        }
                      >
                        {bankLabel(bank)}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setShowCustomBank(true);
                        setLoanFormData({ ...loanFormData, bank: '' });
                      }}
                      className="py-2 rounded-button text-sm font-medium transition-colors hover:border-[color:var(--expense)] hover:text-[color:var(--expense)]"
                      style={{ border: '1.5px dashed var(--line)', color: 'var(--ink-2)' }}
                    >
                      {t('accounts.loan.custom')}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={loanFormData.bank}
                      onChange={(e) => setLoanFormData({ ...loanFormData, bank: e.target.value })}
                      placeholder={t('accounts.loan.bankPlaceholder')}
                      className="input-field flex-1"
                    />
                    <button
                      onClick={() => {
                        setShowCustomBank(false);
                        setLoanFormData({ ...loanFormData, bank: '招商银行' });
                      }}
                      className="btn-ghost px-4"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-2)' }}>{t('accounts.loan.amountLabel')}</label>
                <input
                  type="number"
                  value={loanFormData.principal}
                  onChange={(e) => setLoanFormData({ ...loanFormData, principal: e.target.value })}
                  placeholder="0.00"
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-2)' }}>{t('accounts.loan.rateLabel')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={loanFormData.rate}
                  onChange={(e) => setLoanFormData({ ...loanFormData, rate: e.target.value })}
                  placeholder="4.2"
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-2)' }}>{t('accounts.loan.termLabel')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {termOptions.map((term) => (
                    <button
                      key={term.value}
                      onClick={() => setLoanFormData({ ...loanFormData, term: term.value })}
                      className="py-2 rounded-button text-sm font-medium transition-all"
                      style={
                        loanFormData.term === term.value
                          ? { background: 'var(--expense)', color: '#fff' }
                          : { background: 'var(--paper)', color: 'var(--ink)' }
                      }
                    >
                      {termLabel(term.value)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-2)' }}>{t('accounts.loan.startDateLabel')}</label>
                <button
                  onClick={() => setShowLoanDatePicker(true)}
                  className="input-field w-full py-2.5 px-3 text-left text-sm flex items-center"
                >
                  <span className="amount-num" style={{ color: 'var(--ink)' }}>
                    {loanFormData.startDate || t('accounts.loan.selectDate')}
                  </span>
                </button>
              </div>

              {loanFormData.principal && loanFormData.rate && (
                <div className="rounded-button p-4" style={{ background: 'var(--paper)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--ink-2)' }}>{t('accounts.loan.monthlyPayment')}</span>
                    <span className="font-semibold amount-num" style={{ color: 'var(--expense)' }}>
                      {calculateMonthlyPayment(
                        parseFloat(loanFormData.principal),
                        parseFloat(loanFormData.rate),
                        loanFormData.term
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="safe-bottom pt-2">
                <button
                  onClick={handleLoanSubmit}
                  disabled={!loanFormData.name.trim() || !loanFormData.principal || !loanFormData.rate}
                  className="btn-danger w-full"
                >
                  {t('accounts.loan.submit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 自定义颜色弹层 */}
      {showCustomColorPicker && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center animate-fade-in" style={{ background: 'rgba(43,41,37,0.45)' }} onClick={() => setShowCustomColorPicker(false)}>
          <div className="w-full max-w-sm mx-4 rounded-card p-5 animate-bounce-in" style={{ background: 'var(--card)', boxShadow: 'var(--shadow-card)' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-4" style={{ color: 'var(--ink)' }}>{t('accounts.form.customColorTitle')}</h3>
            <div className="flex items-center gap-3 mb-4">
              <input
                type="color"
                value={customColorValue}
                onChange={handleCustomColorChange}
                className="w-16 h-16 rounded-button cursor-pointer flex-shrink-0"
                style={{ border: 'none', background: 'var(--paper)', padding: '4px' }}
              />
              <input
                type="text"
                value={customColorValue}
                onChange={handleCustomColorInput}
                placeholder="#10B981"
                maxLength={7}
                className="input-field flex-1 uppercase"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCustomColorPicker(false)}
                className="btn-ghost flex-1"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  if (/^#[0-9A-Fa-f]{6}$/.test(customColorValue)) {
                    setAccountFormData({ ...accountFormData, color: customColorValue });
                  }
                  setShowCustomColorPicker(false);
                }}
                className="btn-primary flex-1"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      <VersionInfo />

      {showDepositDatePicker && createPortal(
        <CalendarPicker
          selectedDate={(() => {
            const [y, m, d] = (depositFormData.startDate || todayKey()).split('-').map(Number);
            return new Date(y, m - 1, d);
          })()}
          onDateChange={(date) => {
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            setDepositFormData({ ...depositFormData, startDate: dateStr });
            setShowDepositDatePicker(false);
          }}
          onClose={() => setShowDepositDatePicker(false)}
        />,
        document.body
      )}

      {showLoanDatePicker && createPortal(
        <CalendarPicker
          selectedDate={(() => {
            const [y, m, d] = (loanFormData.startDate || todayKey()).split('-').map(Number);
            return new Date(y, m - 1, d);
          })()}
          onDateChange={(date) => {
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            setLoanFormData({ ...loanFormData, startDate: dateStr });
            setShowLoanDatePicker(false);
          }}
          onClose={() => setShowLoanDatePicker(false)}
        />,
        document.body
      )}
    </div>
  );
};
