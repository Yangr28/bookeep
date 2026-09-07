import { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import { useStore } from '../store/useStore';
import { StatCard } from '../components/StatCard';
import { TransactionCard } from '../components/TransactionCard';
import { CategoryCard } from '../components/CategoryCard';
import { formatCurrencyShort } from '../utils/format';
import { parseSmartInput, findCategoryByIdentifier, parseSmartInputWithHistory, findAccountByKeyword } from '../utils/smartParser';
import { Wallet, Settings, PlusCircle, Sparkles, Calendar, Clock, Image, Search, PiggyBank, PieChart, X, CheckCircle, ChevronRight, Repeat, Bookmark, Globe } from 'lucide-react';
import { getIcon } from '../utils/iconMap';
import Empty from '../components/Empty';
import { TransactionType, Transaction } from '../types';
import { currencies, getCurrencySymbol, getRate, convertToCNY, getCurrencyName } from '../utils/currency';

// 仅首次启动进入首页时自动聚焦智能记账输入框；返回首页时不再弹出键盘
let hasAutoFocusedOnLaunch = false;

interface DashboardProps {
  onViewDetail: (filterType: 'today-income' | 'today-expense' | 'month-income' | 'month-expense' | 'total-balance' | 'month-balance') => void;
  onGoToAccounts?: () => void;
  onGoToBudgets?: () => void;
  onGoToStats?: () => void;
  onGoToTransfer?: () => void;
  onGoToRecurring?: () => void;
  onGoToTemplates?: () => void;
  onGoToCurrencyConverter?: () => void;
  onEditTransaction?: (transaction: Transaction) => void;
  onGoToSettings?: () => void;
  onGoToSearch?: () => void;
  onShowOCRModal?: () => void;
  quickRecordAmount: string;
  quickRecordCategoryId: string | null;
  quickRecordType: TransactionType;
  quickRecordNote: string;
  quickRecordAccountId: string | null;
  quickRecordDateTime: Date;
  quickRecordCurrency: string;
  onQuickRecordAmountChange: (amount: string) => void;
  onQuickRecordCategoryChange: (categoryId: string | null) => void;
  onQuickRecordTypeChange: (type: TransactionType) => void;
  onQuickRecordNoteChange: (note: string) => void;
  onQuickRecordAccountChange: (accountId: string | null) => void;
  onQuickRecordCurrencyChange: (currency: string) => void;
  onQuickRecordSubmit: () => void;
  onShowDatePicker: () => void;
  onShowTimePicker: () => void;
  widgetQuickInput?: string;
  onClearWidgetQuickInput?: () => void;
}

const DashboardComponent = ({
  onViewDetail,
  onGoToAccounts,
  onGoToBudgets,
  onGoToStats,
  onGoToTransfer,
  onGoToRecurring,
  onGoToTemplates,
  onGoToCurrencyConverter,
  onEditTransaction,
  onGoToSettings,
  onGoToSearch,
  onShowOCRModal,
  quickRecordAmount,
  quickRecordCategoryId,
  quickRecordType,
  quickRecordNote,
  quickRecordAccountId,
  quickRecordDateTime,
  quickRecordCurrency,
  onQuickRecordAmountChange,
  onQuickRecordCategoryChange,
  onQuickRecordTypeChange,
  onQuickRecordNoteChange,
  onQuickRecordAccountChange,
  onQuickRecordCurrencyChange,
  onQuickRecordSubmit,
  onShowDatePicker,
  onShowTimePicker,
  widgetQuickInput,
  onClearWidgetQuickInput,
  }: DashboardProps) => {
  const transactions = useStore((state) => state.transactions);
  const deleteTransaction = useStore((state) => state.deleteTransaction);
  const todayIncome = useStore((state) => state.getTodayIncome());
  const todayExpense = useStore((state) => state.getTodayExpense());
  const monthIncome = useStore((state) => state.getMonthIncome());
  const monthExpense = useStore((state) => state.getMonthExpense());
  const totalIncome = useStore((state) => state.getTotalIncome());
  const totalExpense = useStore((state) => state.getTotalExpense());
  const totalAssets = useStore((state) => state.getTotalAssets());
  const categories = useStore((state) => state.categories);
  const accounts = useStore((state) => state.accounts);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [displayOrder, setDisplayOrder] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showReminder, setShowReminder] = useState(true);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');

  // 当前货币符号
  const currentCurrencySymbol = getCurrencySymbol(quickRecordCurrency);
  // 当前汇率（外币→人民币）
  const currentRate = getRate(quickRecordCurrency);
  // 是否为外币
  const isForeignCurrency = quickRecordCurrency !== 'CNY';
  // 外币金额转人民币
  const convertedCNY = useMemo(() => {
    if (!isForeignCurrency && !quickRecordAmount) return 0;
    const amt = parseFloat(quickRecordAmount);
    if (isNaN(amt)) return 0;
    return convertToCNY(amt, quickRecordCurrency);
  }, [quickRecordAmount, quickRecordCurrency, isForeignCurrency]);

  const daysSinceLastRecord = useMemo(() => {
    if (transactions.length === 0) return 0;
    const lastDate = new Date(Math.max(...transactions.map(t => new Date(t.createdAt).getTime())));
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const lastDateStart = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
    const diffTime = todayStart.getTime() - lastDateStart.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }, [transactions]);

  useEffect(() => {
    if (daysSinceLastRecord === 0) {
      setShowReminder(true);
    }
  }, [daysSinceLastRecord]);
  const [smartInput, setSmartInput] = useState('');
  const smartInputRef = useRef<HTMLInputElement>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredCategories = categories.filter((c) => c.type === quickRecordType);

  useEffect(() => {
    window.scrollTo(0, 0);
    // 仅首次启动时自动聚焦，返回首页不弹键盘
    const shouldFocus = !hasAutoFocusedOnLaunch;
    hasAutoFocusedOnLaunch = true;
    const timer = setTimeout(() => {
      if (shouldFocus) {
        smartInputRef.current?.focus();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSmartSubmit = useCallback((text?: string) => {
    const inputText = text ?? smartInput;
    if (!inputText.trim()) return;

    const result = parseSmartInputWithHistory(inputText, transactions, accounts, categories);
    let autoCategoryId: string | null = null;

    if (result.categoryKeyword) {
      autoCategoryId = findCategoryByIdentifier(categories, result.type, result.categoryKeyword);
    }

    // 识别账户
    let autoAccountId: string | null = null;
    if (result.accountKeyword) {
      autoAccountId = findAccountByKeyword(accounts, result.accountKeyword);
    }

    onQuickRecordTypeChange(result.type);

    if (result.amount) {
      onQuickRecordAmountChange(result.amount);
    }

    // 识别币种
    if (result.currency) {
      onQuickRecordCurrencyChange(result.currency);
    }

    if (autoCategoryId) {
      onQuickRecordCategoryChange(autoCategoryId);
    }

    if (result.note) {
      onQuickRecordNoteChange(result.note);
    }

    if (autoAccountId) {
      onQuickRecordAccountChange(autoAccountId);
    }

    if (result.date || result.time) {
      const newDate = new Date();
      if (result.date) {
        const [y, m, d] = result.date.split('-').map(Number);
        newDate.setFullYear(y, m - 1, d);
      }
      if (result.time) {
        const [h, min] = result.time.split(':').map(Number);
        newDate.setHours(h, min, 0, 0);
      }
    }

    setSmartInput('');
  }, [smartInput, categories, transactions, accounts, onQuickRecordTypeChange, onQuickRecordAmountChange, onQuickRecordCategoryChange, onQuickRecordNoteChange, onQuickRecordAccountChange]);

  // 处理来自桌面小组件的快速输入
  useEffect(() => {
    if (widgetQuickInput && onClearWidgetQuickInput) {
      setSmartInput(widgetQuickInput);
      handleSmartSubmit(widgetQuickInput);
      onClearWidgetQuickInput();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetQuickInput]);

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const orderedTransactions = displayOrder.length > 0
    ? recentTransactions.filter(t => displayOrder.includes(t.id))
        .sort((a, b) => displayOrder.indexOf(a.id) - displayOrder.indexOf(b.id))
    : recentTransactions;

  const balance = monthIncome - monthExpense;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      const currentOrder = displayOrder.length > 0 ? [...displayOrder] : recentTransactions.map(t => t.id);
      const [removed] = currentOrder.splice(draggedIndex, 1);
      currentOrder.splice(toIndex, 0, removed);
      setDisplayOrder(currentOrder);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    startPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    longPressTimer.current = setTimeout(() => {
      setDraggedIndex(index);
      setIsDragging(true);
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
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
      const currentOrder = displayOrder.length > 0 ? [...displayOrder] : recentTransactions.map(t => t.id);
      const [removed] = currentOrder.splice(draggedIndex, 1);
      currentOrder.splice(toIndex, 0, removed);
      setDisplayOrder(currentOrder);
    }
    setDraggedIndex(null);
    setIsDragging(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 overflow-y-auto">
      <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white px-6 pt-8 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">财务概览</h1>
            <p className="text-emerald-100 text-sm mt-2 leading-relaxed">
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onGoToSearch}
              className="bg-white/20 p-3 rounded-full hover:bg-white/30 active:bg-white/35 transition-colors"
            >
              <Search size={24} />
            </button>
            <button
              onClick={() => onGoToCurrencyConverter?.()}
              className="bg-white/20 p-3 rounded-full hover:bg-white/30 active:bg-white/35 transition-colors"
              title="汇率转换"
            >
              <Globe size={24} />
            </button>
            <button
              onClick={onGoToSettings}
              className="bg-white/20 p-3 rounded-full hover:bg-white/30 active:bg-white/35 transition-colors"
            >
              <Settings size={24} />
            </button>
            <button
              onClick={onGoToAccounts}
              className="bg-white/20 p-3 rounded-full hover:bg-white/30 active:bg-white/35 transition-colors"
            >
              <Wallet size={28} />
            </button>
          </div>
        </div>
        <button
          onClick={() => onViewDetail('month-balance')}
          className="w-full bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-left hover:bg-white/20 active:bg-white/25 transition-colors"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-emerald-100 text-sm font-medium">本月余额</p>
              <p className="text-3xl font-bold mt-2 tracking-tight">{formatCurrencyShort(balance)}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right min-w-0">
                <p className="text-emerald-100 text-xs">本月收入</p>
                <p className="text-lg font-semibold text-green-300 mt-0.5">{formatCurrencyShort(monthIncome)}</p>
                <p className="text-emerald-100 text-xs mt-2">本月支出</p>
                <p className="text-lg font-semibold text-red-300 mt-0.5">{formatCurrencyShort(-monthExpense)}</p>
              </div>
              <span className="text-emerald-200 text-xl flex-shrink-0">→</span>
            </div>
          </div>
        </button>
      </div>

      {daysSinceLastRecord >= 3 && showReminder && (
        <div className="px-4 mt-4">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-full">
                  <Sparkles size={20} />
                </div>
                <div>
                  <p className="font-semibold">已{daysSinceLastRecord}天未记账</p>
                  <p className="text-sm text-white/80 mt-0.5">
                    {daysSinceLastRecord >= 7 ? '已经很久没记账了，快来补上吧！' : '定期记录有助于更好地管理财务'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReminder(false)}
                className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 mt-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm grid grid-cols-4 gap-2">
          <button
            onClick={() => onGoToRecurring?.()}
            className="flex flex-col items-center gap-1.5 py-1"
          >
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <Repeat size={18} className="text-indigo-500" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">周期记账</span>
          </button>
          <button
            onClick={() => onGoToTemplates?.()}
            className="flex flex-col items-center gap-1.5 py-1"
          >
            <div className="p-2 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
              <Bookmark size={18} className="text-pink-500" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">记账模板</span>
          </button>
          <button
            onClick={() => onGoToBudgets?.()}
            className="flex flex-col items-center gap-1.5 py-1"
          >
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <PiggyBank size={18} className="text-purple-500" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">预算</span>
          </button>
          <button
            onClick={() => onGoToStats?.()}
            className="flex flex-col items-center gap-1.5 py-1"
          >
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <PieChart size={18} className="text-orange-500" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">统计</span>
          </button>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
              <PlusCircle size={20} className="text-emerald-500" />
            </div>
            <h3 className="font-bold text-gray-800 dark:text-white">快速记账</h3>
          </div>

          <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 border-2 border-transparent focus-within:border-emerald-400 transition-colors mb-3">
            <Sparkles size={18} className="text-amber-500 mr-3 flex-shrink-0" />
            <input
              ref={smartInputRef}
              type="text"
              value={smartInput}
              onChange={(e) => setSmartInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSmartSubmit();
                }
              }}
              placeholder="智能记账（如：停车2元）"
              className="flex-1 bg-transparent outline-none text-gray-800 dark:text-white placeholder-gray-400 text-sm"
            />
            <button
              onClick={() => handleSmartSubmit()}
              disabled={!smartInput.trim()}
              className={`ml-2 p-2 rounded-lg transition-all ${
                smartInput.trim()
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
              }`}
            >
              <PlusCircle size={16} />
            </button>
          </div>

          <div className="flex gap-2 mb-3">
            <button
              onClick={() => onQuickRecordTypeChange('expense')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                quickRecordType === 'expense'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              支出
            </button>
            <button
              onClick={() => onQuickRecordTypeChange('income')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                quickRecordType === 'income'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              收入
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-3">
            {filteredCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                isSelected={quickRecordCategoryId === category.id}
                onClick={() => onQuickRecordCategoryChange(category.id)}
              />
            ))}
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400 text-sm">金额</span>
                <button
                  onClick={() => setShowCurrencyPicker(true)}
                  className="flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-gray-600 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors"
                >
                  <span className="text-sm">{currencies.find(c => c.code === quickRecordCurrency)?.flag}</span>
                  <span>{quickRecordCurrency}</span>
                  <ChevronRight size={12} className="rotate-90 text-gray-400" />
                </button>
              </div>
              <div className="flex items-center">
                <span className="text-lg text-gray-400 mr-1">{currentCurrencySymbol}</span>
                <input
                  type="number"
                  value={quickRecordAmount}
                  onChange={(e) => onQuickRecordAmountChange(e.target.value)}
                  placeholder="0.00"
                  className="text-2xl font-bold text-gray-800 dark:text-white bg-transparent outline-none text-right w-28"
                />
              </div>
            </div>
            {isForeignCurrency && quickRecordAmount && (
              <div className="mt-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between text-xs">
                <span className="text-gray-400">汇率 1{quickRecordCurrency} = ¥{currentRate.toFixed(4)}</span>
                <span className="text-emerald-500 font-medium">≈ ¥{convertedCNY.toFixed(2)} 人民币</span>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowAccountPicker(true)}
            className="w-full flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-xl p-3 mb-3 transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            <div className="flex items-center gap-2.5">
              {(() => {
                const selectedAccount = accounts.find((a) => a.id === quickRecordAccountId);
                if (selectedAccount) {
                  const IconComponent = getIcon(selectedAccount.icon);
                  return (
                    <>
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${selectedAccount.color}20`, color: selectedAccount.color }}
                      >
                        <IconComponent size={16} />
                      </div>
                      <span className="text-sm font-medium text-gray-800 dark:text-white">{selectedAccount.name}</span>
                    </>
                  );
                }
                return (
                  <>
                    <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                      <Wallet size={16} className="text-gray-400" />
                    </div>
                    <span className="text-sm text-gray-400">选择账户</span>
                  </>
                );
              })()}
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>

          <input
            type="text"
            value={quickRecordNote}
            onChange={(e) => onQuickRecordNoteChange(e.target.value)}
            placeholder="备注"
            className="w-full bg-gray-50 dark:bg-gray-700 rounded-xl px-3 py-2 mb-3 text-sm text-gray-800 dark:text-white placeholder-gray-400 outline-none"
          />

          <div className="flex gap-2 mb-3">
            <button
              onClick={onShowDatePicker}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-all"
            >
              <Calendar size={16} />
              <span className="text-sm font-medium">{quickRecordDateTime.getMonth() + 1}月{quickRecordDateTime.getDate()}日</span>
            </button>
            <button
              onClick={onShowTimePicker}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-all"
            >
              <Clock size={16} />
              <span className="text-sm font-medium">{quickRecordDateTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
            </button>
            <button
              onClick={onShowOCRModal}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-all"
            >
              <Image size={16} />
              <span className="text-sm font-medium">批量</span>
            </button>
          </div>

          <button
            onClick={onQuickRecordSubmit}
            disabled={!quickRecordAmount || !quickRecordCategoryId || !quickRecordAccountId}
            className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
              quickRecordAmount && quickRecordCategoryId && quickRecordAccountId
                ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/40'
                : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
            }`}
          >
            记一笔
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard type="income" title="今日收入" amount={todayIncome} onClick={() => onViewDetail('today-income')} />
          <StatCard type="expense" title="今日支出" amount={todayExpense} onClick={() => onViewDetail('today-expense')} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard type="income" title="本月收入" amount={monthIncome} onClick={() => onViewDetail('month-income')} />
          <StatCard type="expense" title="本月支出" amount={monthExpense} onClick={() => onViewDetail('month-expense')} />
        </div>

        <button
          onClick={() => onViewDetail('total-balance')}
          className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-4 text-white text-left hover:opacity-95 active:opacity-90 transition-opacity"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-purple-100 text-xs font-medium">总资产</p>
              <p className="text-2xl font-bold mt-1 tracking-tight">{formatCurrencyShort(totalAssets)}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right min-w-0">
                <p className="text-purple-100 text-xs">总收入</p>
                <p className="text-sm font-semibold text-green-300 mt-0.5">{formatCurrencyShort(totalIncome)}</p>
                <p className="text-purple-100 text-xs mt-1">总支出</p>
                <p className="text-sm font-semibold text-red-300 mt-0.5">{formatCurrencyShort(-totalExpense)}</p>
              </div>
              <span className="text-purple-200 text-lg flex-shrink-0">→</span>
            </div>
          </div>
        </button>
      </div>

      <div className="px-4 mt-6 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">最近记录</h2>
        </div>
        
        {orderedTransactions.length === 0 ? (
          <Empty
            icon={Wallet}
            title="暂无记录"
            description="使用上方快捷记账添加您的第一笔记录吧"
          />
        ) : (
          <div className="space-y-2">
            {orderedTransactions.map((transaction, index) => (
              <div
                key={transaction.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={() => handleTouchEnd(index)}
                className={`cursor-grab active:cursor-grabbing transition-all duration-300 ${
                  draggedIndex === index 
                    ? 'opacity-50 scale-95 shadow-xl shadow-gray-400/50 -translate-y-2 z-10' 
                    : ''
                } ${dragOverIndex === index ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}
              >
                <TransactionCard
                  transaction={transaction}
                  onDelete={() => deleteTransaction(transaction.id)}
                  onEdit={() => onEditTransaction?.(transaction)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {showAccountPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center pb-20" onClick={() => setShowAccountPicker(false)}>
          <div
            className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-2xl max-h-[65vh] overflow-hidden flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-800 dark:text-white">选择账户</h3>
              <button
                onClick={() => setShowAccountPicker(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-4">
              {accounts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet size={28} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500">还没有添加账户</p>
                </div>
              ) : (
                accounts.map((account) => {
                  const IconComponent = getIcon(account.icon);
                  const isSelected = quickRecordAccountId === account.id;
                  return (
                    <button
                      key={account.id}
                      onClick={() => {
                        onQuickRecordAccountChange(account.id);
                        setShowAccountPicker(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border-2 ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500'
                          : 'bg-gray-50 dark:bg-gray-700 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${account.color}20`, color: account.color }}
                      >
                        <IconComponent size={20} />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium text-gray-800 dark:text-white">{account.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">余额 ¥{account.balance.toLocaleString()}</p>
                      </div>
                      {isSelected && <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {showCurrencyPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center pb-20" onClick={() => { setShowCurrencyPicker(false); setCurrencySearch(''); }}>
          <div
            className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-2xl max-h-[70vh] overflow-hidden flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-800 dark:text-white">选择货币</h3>
              <button
                onClick={() => { setShowCurrencyPicker(false); setCurrencySearch(''); }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            {/* 搜索框 */}
            <div className="p-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  value={currencySearch}
                  onChange={(e) => setCurrencySearch(e.target.value)}
                  placeholder="搜索货币名称或代码"
                  className="flex-1 bg-transparent outline-none text-sm text-gray-800 dark:text-white placeholder-gray-400"
                  autoFocus
                />
                {currencySearch && (
                  <button onClick={() => setCurrencySearch('')}>
                    <X size={14} className="text-gray-400" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1 pb-4">
              {currencies
                .filter(c => {
                  if (!currencySearch) return true;
                  const q = currencySearch.toLowerCase();
                  return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
                })
                .map((currency) => {
                const isSelected = quickRecordCurrency === currency.code;
                return (
                  <button
                    key={currency.code}
                    onClick={() => {
                      onQuickRecordCurrencyChange(currency.code);
                      setShowCurrencyPicker(false);
                      setCurrencySearch('');
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border-2 ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500'
                        : 'bg-gray-50 dark:bg-gray-700 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span className="text-2xl flex-shrink-0">{currency.flag}</span>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-gray-800 dark:text-white">{currency.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {currency.code} · 1{currency.code} = ¥{getRate(currency.code).toFixed(currency.rateToCNY < 0.01 ? 6 : 4)}
                      </p>
                    </div>
                    <span className="text-gray-400 text-sm flex-shrink-0">{currency.symbol}</span>
                    {isSelected && <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const Dashboard = memo(DashboardComponent);