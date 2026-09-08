import { useState, useRef, TouchEvent, DragEvent, useEffect } from 'react';
import { Building2, Wallet, MessageCircle, Banknote, CreditCard, Plus, X, ChevronRight, Trash2, Edit3, Calendar, Clock, Percent, Palette, ArrowUpDown, Landmark, ArrowRight, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Account, AccountIcons, AccountTypeNames } from '../types';
import { formatCurrencyShort } from '../utils/format';

import { VersionInfo } from '../components/VersionInfo';

const iconMap: Record<string, React.ReactNode> = {
  Building2: <Building2 size={24} />,
  Wallet: <Wallet size={24} />,
  MessageCircle: <MessageCircle size={24} />,
  Banknote: <Banknote size={24} />,
  CreditCard: <CreditCard size={24} />
};

const accountTypeOptions = [
  { value: 'bank', label: '银行', icon: 'Building2' },
  { value: 'alipay', label: '支付宝', icon: 'Wallet' },
  { value: 'wechat', label: '微信', icon: 'MessageCircle' },
  { value: 'cash', label: '现金', icon: 'Banknote' },
  { value: 'other', label: '其他', icon: 'CreditCard' }
];

const colorOptions = [
  '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

const termOptions = [
  { value: 3, label: '3个月' },
  { value: 6, label: '6个月' },
  { value: 12, label: '1年' },
  { value: 24, label: '2年' },
  { value: 36, label: '3年' },
  { value: 60, label: '5年' }
];

const bankOptions = ['招商银行', '工商银行', '建设银行', '农业银行', '中国银行', '交通银行', '其他银行'];

export const Accounts = ({ onViewAccountDetail }: { onViewAccountDetail: (accountId: string) => void }) => {
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
    startDate: new Date().toISOString().split('T')[0]
  });
  const [loanFormData, setLoanFormData] = useState({
    name: '',
    bank: '招商银行',
    principal: '',
    rate: '',
    term: 36,
    startDate: new Date().toISOString().split('T')[0]
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
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + term);
    return date.toISOString().split('T')[0];
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
    if (confirm('确定要删除这笔贷款吗？')) {
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
    if (confirm('确定要删除这个账户吗？')) {
      deleteAccount(id);
    }
  };

  const handleDepositDelete = (id: string) => {
    if (confirm('确定要删除这笔定期存款吗？')) {
      deleteFixedDeposit(id);
    }
  };

  const formatDaysRemaining = (endDate: string): string => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return '已到期';
    if (diffDays < 30) return `${diffDays}天后到期`;
    const months = Math.ceil(diffDays / 30);
    if (months < 12) return `${months}个月后到期`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return `${years}年后到期`;
    return `${years}年${remainingMonths}个月后到期`;
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 page-enter">
      <div className="p-6 pt-8 safe-top">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">资产</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">管理您的所有账户</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-3xl p-6 text-white mb-6 shadow-lg">
          <p className="text-white/80 text-sm">总资产</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-bold truncate">{formatCurrencyShort(totalAssetsValue)}</span>
          </div>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-white/80">
            <span className="truncate">活期: {formatCurrencyShort(liquidAssets)}</span>
            <span className="truncate">定期: {formatCurrencyShort(totalFixedDepositsValue)}</span>
            <span className="text-red-200 truncate">贷款: {formatCurrencyShort(-totalLoansValue)}</span>
          </div>
        </div>

        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-card p-1 mb-4">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'accounts'
                ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            活期账户
          </button>
          <button
            onClick={() => setActiveTab('transfer')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'transfer'
                ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            转账
          </button>
          <button
            onClick={() => setActiveTab('deposits')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'deposits'
                ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            定期存款
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'loans'
                ? 'bg-white dark:bg-gray-700 shadow-sm text-red-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            贷款还款
          </button>
        </div>

        {activeTab === 'accounts' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">长按拖动排序</span>
              <ArrowUpDown size={18} className="text-gray-400" />
            </div>
            <div className="space-y-3">
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
                  className={`w-full bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex items-center justify-between ${
                    draggedIndex === index ? 'opacity-50 scale-95' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${account.color}15`, color: account.color }}
                    >
                      {iconMap[account.icon]}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-medium text-gray-800 dark:text-white text-xs leading-tight">{account.name}</h3>
                        {account.balance <= 0 && (
                          <span className="p-0.5 bg-red-100 text-red-500 rounded-full">
                            <AlertCircle size={10} />
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-[10px] mt-0.5">{AccountTypeNames[account.type]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="text-right min-w-0">
                      <p className={`font-semibold text-sm truncate ${account.balance <= 0 ? 'text-red-500' : 'text-gray-800 dark:text-white'}`}>
                        {formatCurrencyShort(account.balance)}
                      </p>
                    </div>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(account);
                      }}
                      className="p-1.25 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors cursor-pointer"
                    >
                      <Edit3 size={14} />
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAccountDelete(account.id);
                      }}
                      className="p-1.25 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </span>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </button>
              ))}
            </div>

            {/* 底部空白区域，避免浮动按钮遮挡 */}
            <div className="h-24" />

            {accounts.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet size={32} className="text-gray-400" />
                </div>
                <p className="text-gray-500 mb-4">还没有添加账户</p>
                <button
                  onClick={handleOpenAddModal}
                  className="bg-primary-500 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-primary-600 transition-colors"
                >
                  添加第一个账户
                </button>
              </div>
            )}

            <button
              onClick={handleOpenAddModal}
              className="fixed bottom-24 right-6 bg-primary-500 text-white p-4 rounded-full shadow-lg hover:bg-primary-600 active:scale-95 transition-all"
            >
              <Plus size={24} />
            </button>
          </>
        )}

        {activeTab === 'transfer' && (
          <>
            <div className="space-y-4">
              <div className="card p-4">
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-3">转出账户</label>
                <div className="grid grid-cols-2 gap-2">
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => setTransferFromId(account.id)}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        transferFromId === account.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 bg-white dark:bg-gray-700'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${account.color}15`, color: account.color }}
                      >
                        {iconMap[account.icon]}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-800 dark:text-white">{account.name}</p>
                        <p className="text-xs text-gray-400">{formatCurrencyShort(account.balance)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-center">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <ArrowRight size={20} className="text-blue-500" />
                </div>
              </div>

              <div className="card p-4">
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-3">转入账户</label>
                <div className="grid grid-cols-2 gap-2">
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => setTransferToId(account.id)}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        transferToId === account.id
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                          : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 bg-white dark:bg-gray-700'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${account.color}15`, color: account.color }}
                      >
                        {iconMap[account.icon]}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-800 dark:text-white">{account.name}</p>
                        <p className="text-xs text-gray-400">{formatCurrencyShort(account.balance)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card p-4">
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">转账金额</label>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-gray-800 dark:text-white">¥</span>
                  <input
                    type="text"
                    value={transferAmount}
                    onChange={(e) => {
                      if (/^\d*\.?\d{0,2}$/.test(e.target.value)) {
                        setTransferAmount(e.target.value);
                      }
                    }}
                    placeholder="0.00"
                    className="bg-transparent text-3xl font-bold outline-none w-full placeholder-gray-300 text-gray-800 dark:text-white"
                    inputMode="decimal"
                  />
                </div>
              </div>

              <div className="card p-4">
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">备注</label>
                <input
                  type="text"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="添加备注（可选）"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white placeholder-gray-400"
                />
              </div>

              <div className="pb-24">
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
                  className={`w-full py-3.5 rounded-card font-semibold text-white transition-all ${
                    transferFromId && transferToId && transferAmount && parseFloat(transferAmount) > 0 && transferFromId !== transferToId
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90'
                      : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                  }`}
                >
                  确认转账
                </button>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-3">转账记录</h3>
                <div className="space-y-3">
                  {transfers.length > 0 ? (
                    [...transfers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((transfer) => {
                      const fromAccount = accounts.find((a) => a.id === transfer.fromAccountId);
                      const toAccount = accounts.find((a) => a.id === transfer.toAccountId);
                      return (
                        <div
                          key={transfer.id}
                          className="card p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <ArrowRightLeft size={18} className="text-blue-500" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1">
                                  <span className="text-sm font-medium text-gray-800 dark:text-white">{fromAccount?.name || '未知'}</span>
                                  <ArrowRight size={12} className="text-gray-300" />
                                  <span className="text-sm font-medium text-gray-800 dark:text-white">{toAccount?.name || '未知'}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">{transfer.note || '转账'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-blue-500">{formatCurrencyShort(transfer.amount)}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {new Date(transfer.createdAt).toLocaleString('zh-CN', {
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
                            className="mt-2 text-xs text-red-500 hover:text-red-600"
                          >
                            删除
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <p>暂无转账记录</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'deposits' && (
          <>
            <div className="space-y-4">
              {fixedDeposits.map((deposit) => (
                <div
                  key={deposit.id}
                  className="card p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-800 dark:text-white">{deposit.name}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          deposit.status === 'active' 
                            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700'
                        }`}>
                          {deposit.status === 'active' ? '存期中' : '已到期'}
                        </span>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{deposit.bank}</p>
                    </div>
                    <button
                      onClick={() => handleDepositDelete(deposit.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-card p-3">
                      <p className="text-gray-500 dark:text-gray-400 text-xs">本金</p>
                      <p className="font-semibold text-gray-800 dark:text-white mt-1 truncate">{formatCurrencyShort(deposit.principal)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-card p-3">
                      <p className="text-gray-500 dark:text-gray-400 text-xs">到期金额</p>
                      <p className="font-semibold text-primary-600 mt-1 truncate">{formatCurrencyShort(deposit.maturityAmount)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Percent size={14} />
                        <span>{deposit.rate}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{deposit.term}个月</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>{formatDaysRemaining(deposit.endDate)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 底部空白区域，避免浮动按钮遮挡 */}
            <div className="h-24" />

            {fixedDeposits.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Banknote size={32} className="text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-4">还没有添加定期存款</p>
                <button
                  onClick={() => setShowDepositModal(true)}
                  className="bg-primary-500 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-primary-600 transition-colors"
                >
                  添加定期存款
                </button>
              </div>
            )}

            <button
              onClick={() => setShowDepositModal(true)}
              className="fixed bottom-24 right-6 bg-primary-500 text-white p-4 rounded-full shadow-lg hover:bg-primary-600 active:scale-95 transition-all"
            >
              <Plus size={24} />
            </button>
          </>
        )}

        {activeTab === 'loans' && (
          <>
            <div className="space-y-4">
              {loans.map((loan) => (
                <div
                  key={loan.id}
                  className="card p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-800 dark:text-white">{loan.name}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          loan.status === 'active' 
                            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700'
                        }`}>
                          {loan.status === 'active' ? '还款中' : '已还清'}
                        </span>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{loan.bank}</p>
                    </div>
                    <button
                      onClick={() => handleLoanDelete(loan.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-card p-3">
                      <p className="text-gray-500 dark:text-gray-400 text-xs">贷款总额</p>
                      <p className="font-semibold text-gray-800 dark:text-white mt-1 truncate">{formatCurrencyShort(loan.principal)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-card p-3">
                      <p className="text-gray-500 dark:text-gray-400 text-xs">剩余本金</p>
                      <p className="font-semibold text-red-500 mt-1 truncate">{formatCurrencyShort(loan.remainingAmount)}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-card p-3 mb-3">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-500 dark:text-gray-400">还款进度</span>
                      <span className="text-gray-700 dark:text-white font-medium">{((loan.paidAmount / loan.principal) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500 rounded-full transition-all"
                        style={{ width: `${(loan.paidAmount / loan.principal) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Percent size={14} />
                        <span>{loan.rate}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{loan.term}个月</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Landmark size={14} />
                      <span className="text-red-500 font-medium truncate">{formatCurrencyShort(loan.monthlyPayment)}/月</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 底部空白区域，避免浮动按钮遮挡 */}
            <div className="h-24" />

            {loans.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Landmark size={32} className="text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-4">还没有添加贷款</p>
                <button
                  onClick={() => setShowLoanModal(true)}
                  className="bg-primary-500 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-primary-600 transition-colors"
                >
                  添加贷款
                </button>
              </div>
            )}

            <button
              onClick={() => setShowLoanModal(true)}
              className="fixed bottom-24 right-6 bg-red-500 text-white p-4 rounded-full shadow-lg hover:bg-red-600 active:scale-95 transition-all"
            >
              <Plus size={24} />
            </button>
          </>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white w-full rounded-t-3xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">添加账户</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 pb-24 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">账户名称</label>
                <input
                  type="text"
                  value={accountFormData.name}
                  onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })}
                  placeholder="例如：招商银行"
                  className="w-full px-4 py-3 rounded-card border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">账户类型</label>
                <div className="grid grid-cols-5 gap-2">
                  {accountTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setAccountFormData({ ...accountFormData, type: option.value as Account['type'], color: colorOptions[accountTypeOptions.indexOf(option)] });
                      }}
                      className={`flex flex-col items-center gap-2 p-3 rounded-card transition-all ${
                        accountFormData.type === option.value
                          ? 'bg-primary-50 border-2 border-primary-500'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-gray-600">{iconMap[option.icon]}</span>
                      <span className="text-xs font-medium text-gray-600">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">账户余额</label>
                <input
                  type="number"
                  value={accountFormData.balance}
                  onChange={(e) => setAccountFormData({ ...accountFormData, balance: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-card border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">颜色</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAccountFormData({ ...accountFormData, color })}
                      className={`w-10 h-10 rounded-full transition-transform ${
                        accountFormData.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <button
                    onClick={() => {
                      setCustomColorValue(accountFormData.color);
                      setShowCustomColorPicker(true);
                    }}
                    className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-primary-400 transition-colors"
                  >
                    <Palette size={18} className="text-gray-400" />
                  </button>
                </div>
              </div>

              <button
                onClick={handleAccountSubmit}
                disabled={!accountFormData.name.trim() || accountFormData.balance === ''}
                className="w-full bg-primary-500 text-white py-3 rounded-card font-medium hover:bg-primary-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed mt-6"
              >
                添加账户
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white w-full rounded-t-3xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">编辑账户</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 pb-24 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">账户名称</label>
                <input
                  type="text"
                  value={accountFormData.name}
                  onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })}
                  placeholder="例如：招商银行"
                  className="w-full px-4 py-3 rounded-card border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">账户类型</label>
                <div className="grid grid-cols-5 gap-2">
                  {accountTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setAccountFormData({ ...accountFormData, type: option.value as Account['type'], color: colorOptions[accountTypeOptions.indexOf(option)] });
                      }}
                      className={`flex flex-col items-center gap-2 p-3 rounded-card transition-all ${
                        accountFormData.type === option.value
                          ? 'bg-primary-50 border-2 border-primary-500'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-gray-600">{iconMap[option.icon]}</span>
                      <span className="text-xs font-medium text-gray-600">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">账户余额</label>
                <input
                  type="number"
                  value={accountFormData.balance}
                  onChange={(e) => setAccountFormData({ ...accountFormData, balance: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-card border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">颜色</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAccountFormData({ ...accountFormData, color })}
                      className={`w-10 h-10 rounded-full transition-transform ${
                        accountFormData.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <button
                    onClick={() => {
                      setCustomColorValue(accountFormData.color);
                      setShowCustomColorPicker(true);
                    }}
                    className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-primary-400 transition-colors"
                  >
                    <Palette size={18} className="text-gray-400" />
                  </button>
                </div>
              </div>

              <button
                onClick={handleAccountSubmit}
                disabled={!accountFormData.name.trim() || accountFormData.balance === ''}
                className="w-full bg-primary-500 text-white py-3 rounded-card font-medium hover:bg-primary-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed mt-6"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white w-full rounded-t-3xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">添加定期存款</h2>
              <button
                onClick={() => setShowDepositModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 pb-32">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">存款名称</label>
                  <input
                    type="text"
                    value={depositFormData.name}
                    onChange={(e) => setDepositFormData({ ...depositFormData, name: e.target.value })}
                    placeholder="例如：一年定期"
                    className="w-full px-4 py-3 rounded-card border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">开户银行</label>
                  {showCustomBank ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={depositFormData.bank}
                        onChange={(e) => setDepositFormData({ ...depositFormData, bank: e.target.value })}
                        placeholder="输入银行名称"
                        className="w-full px-4 py-3 rounded-card border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                      />
                      <button
                        onClick={() => {
                          setShowCustomBank(false);
                          setDepositFormData({ ...depositFormData, bank: '招商银行' });
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        选择预设银行
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {bankOptions.filter(b => b !== '其他银行').map((bank) => (
                          <button
                            key={bank}
                            onClick={() => setDepositFormData({ ...depositFormData, bank })}
                            className={`py-2 px-3 rounded-card text-sm font-medium transition-all border ${
                              depositFormData.bank === bank
                                ? 'bg-primary-50 border-primary-500 text-primary-700'
                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {bank}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          setShowCustomBank(true);
                          setDepositFormData({ ...depositFormData, bank: '' });
                        }}
                        className="w-full py-2 px-3 rounded-card text-sm font-medium border border-dashed border-gray-300 text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
                      >
                        + 自定义银行
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">存款金额</label>
                  <input
                    type="number"
                    value={depositFormData.principal}
                    onChange={(e) => setDepositFormData({ ...depositFormData, principal: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-card border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">年利率 (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={depositFormData.rate}
                    onChange={(e) => setDepositFormData({ ...depositFormData, rate: e.target.value })}
                    placeholder="2.75"
                    className="w-full px-4 py-3 rounded-card border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">存期</label>
                  <div className="grid grid-cols-3 gap-2">
                    {termOptions.map((term) => (
                      <button
                        key={term.value}
                        onClick={() => setDepositFormData({ ...depositFormData, term: term.value })}
                        className={`py-2 rounded-card text-sm font-medium transition-all ${
                          depositFormData.term === term.value
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {term.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">起存日期</label>
                  <input
                    type="date"
                    value={depositFormData.startDate}
                    onChange={(e) => setDepositFormData({ ...depositFormData, startDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-card border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                  />
                </div>

                {depositFormData.principal && depositFormData.rate && (
                  <div className="bg-gray-50 rounded-card p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-sm">到期金额</span>
                      <span className="font-semibold text-primary-600">
                        {calculateMaturityAmount(
                          parseFloat(depositFormData.principal),
                          parseFloat(depositFormData.rate),
                          depositFormData.term
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-gray-500 text-sm">到期日期</span>
                      <span className="text-gray-700 text-sm">
                        {calculateEndDate(depositFormData.startDate, depositFormData.term)}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleDepositSubmit}
                  disabled={!depositFormData.name.trim() || !depositFormData.principal || !depositFormData.rate}
                  className="w-full bg-primary-500 text-white py-3 rounded-card font-medium hover:bg-primary-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed mt-6"
                >
                  添加定期存款
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLoanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white w-full rounded-t-3xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">添加贷款</h2>
              <button
                onClick={() => setShowLoanModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 pb-24 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">贷款名称</label>
                <input
                  type="text"
                  value={loanFormData.name}
                  onChange={(e) => setLoanFormData({ ...loanFormData, name: e.target.value })}
                  placeholder="例如：房贷"
                  className="w-full px-4 py-3 rounded-card border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">贷款银行</label>
                {!showCustomBank ? (
                  <div className="grid grid-cols-4 gap-2">
                    {bankOptions.map((bank) => (
                      <button
                        key={bank}
                        onClick={() => setLoanFormData({ ...loanFormData, bank })}
                        className={`py-2 rounded-card text-sm font-medium transition-all ${
                          loanFormData.bank === bank
                            ? 'bg-red-50 border-2 border-red-500 text-red-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {bank}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setShowCustomBank(true);
                        setLoanFormData({ ...loanFormData, bank: '' });
                      }}
                      className="py-2 rounded-card text-sm font-medium border border-dashed border-gray-300 text-gray-500 hover:border-red-400 hover:text-red-600 transition-colors"
                    >
                      自定义
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={loanFormData.bank}
                      onChange={(e) => setLoanFormData({ ...loanFormData, bank: e.target.value })}
                      placeholder="输入银行名称"
                      className="flex-1 px-4 py-3 rounded-card border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                    />
                    <button
                      onClick={() => {
                        setShowCustomBank(false);
                        setLoanFormData({ ...loanFormData, bank: '招商银行' });
                      }}
                      className="px-4 py-3 rounded-card border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">贷款金额</label>
                <input
                  type="number"
                  value={loanFormData.principal}
                  onChange={(e) => setLoanFormData({ ...loanFormData, principal: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-card border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">年利率 (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={loanFormData.rate}
                  onChange={(e) => setLoanFormData({ ...loanFormData, rate: e.target.value })}
                  placeholder="4.2"
                  className="w-full px-4 py-3 rounded-card border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">贷款期限</label>
                <div className="grid grid-cols-3 gap-2">
                  {termOptions.map((term) => (
                    <button
                      key={term.value}
                      onClick={() => setLoanFormData({ ...loanFormData, term: term.value })}
                      className={`py-2 rounded-card text-sm font-medium transition-all ${
                        loanFormData.term === term.value
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {term.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">开始日期</label>
                <input
                  type="date"
                  value={loanFormData.startDate}
                  onChange={(e) => setLoanFormData({ ...loanFormData, startDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-card border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                />
              </div>

              {loanFormData.principal && loanFormData.rate && (
                <div className="bg-gray-50 rounded-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-sm">每月还款</span>
                    <span className="font-semibold text-red-500">
                      {calculateMonthlyPayment(
                        parseFloat(loanFormData.principal),
                        parseFloat(loanFormData.rate),
                        loanFormData.term
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleLoanSubmit}
                disabled={!loanFormData.name.trim() || !loanFormData.principal || !loanFormData.rate}
                className="w-full bg-red-500 text-white py-3 rounded-card font-medium hover:bg-red-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed mt-6"
              >
                添加贷款
              </button>
            </div>
          </div>
        </div>
      )}

      {showCustomColorPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-card p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">自定义颜色</h3>
            <div className="flex items-center gap-3 mb-4">
              <input
                type="color"
                value={customColorValue}
                onChange={handleCustomColorChange}
                className="w-16 h-16 rounded-lg cursor-pointer border-0"
              />
              <input
                type="text"
                value={customColorValue}
                onChange={handleCustomColorInput}
                placeholder="#10B981"
                maxLength={7}
                className="flex-1 px-4 py-3 rounded-card border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all uppercase"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCustomColorPicker(false)}
                className="flex-1 py-3 rounded-card border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (/^#[0-9A-Fa-f]{6}$/.test(customColorValue)) {
                    setAccountFormData({ ...accountFormData, color: customColorValue });
                  }
                  setShowCustomColorPicker(false);
                }}
                className="flex-1 py-3 rounded-card bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      <VersionInfo />
    </div>
  );
};