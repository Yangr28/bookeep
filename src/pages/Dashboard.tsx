import { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import { useStore } from '../store/useStore';
import { StatCard } from '../components/StatCard';
import { TransactionCard } from '../components/TransactionCard';
import { CategoryCard } from '../components/CategoryCard';
import { formatCurrencyShort } from '../utils/format';
import { parseSmartInputWithHistory, findCategoryByIdentifier, findAccountByKeyword } from '../utils/smartParser';
import { Wallet, Settings, Plus, Sparkles, Calendar, Clock, Image, Search, X, CheckCircle, ChevronRight, Repeat, Bookmark, PiggyBank, ArrowLeftRight, Globe } from 'lucide-react';
import { getIcon } from '../utils/iconMap';
import Empty from '../components/Empty';
import { TransactionType, Transaction } from '../types';
import { currencies, getCurrencySymbol, getRate, convertToCNY } from '../utils/currency';

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

const greeting = () => {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '早上好';
  if (h < 18) return '下午好';
  return '晚上好';
};

const DashboardComponent = ({
  onViewDetail,
  onGoToAccounts: _onGoToAccounts,
  onGoToBudgets,
  onGoToStats: _onGoToStats,
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
  const getTodayIncome = useStore((state) => state.getTodayIncome);
  const getTodayExpense = useStore((state) => state.getTodayExpense);
  const getMonthIncome = useStore((state) => state.getMonthIncome);
  const getMonthExpense = useStore((state) => state.getMonthExpense);
  const getTotalIncome = useStore((state) => state.getTotalIncome);
  const getTotalExpense = useStore((state) => state.getTotalExpense);
  const getTotalAssets = useStore((state) => state.getTotalAssets);
  const categories = useStore((state) => state.categories);
  const accounts = useStore((state) => state.accounts);

  // 计算函数缓存：仅 transactions/accounts 变化时重算
  const todayIncome = useMemo(() => getTodayIncome(), [getTodayIncome, transactions]);
  const todayExpense = useMemo(() => getTodayExpense(), [getTodayExpense, transactions]);
  const monthIncome = useMemo(() => getMonthIncome(), [getMonthIncome, transactions]);
  const monthExpense = useMemo(() => getMonthExpense(), [getMonthExpense, transactions]);
  const totalIncome = useMemo(() => getTotalIncome(), [getTotalIncome, transactions]);
  const totalExpense = useMemo(() => getTotalExpense(), [getTotalExpense, transactions]);
  const totalAssets = useMemo(() => getTotalAssets(), [getTotalAssets, accounts, transactions]);

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

  const [smartInput, setSmartInput] = useState('');
  const smartInputRef = useRef<HTMLInputElement>(null);

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

  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [transactions],
  );

  const balance = monthIncome - monthExpense;
  const canSubmit = !!(quickRecordAmount && quickRecordCategoryId && quickRecordAccountId);

  const quickTools = [
    { icon: ArrowLeftRight, label: '转账', onClick: onGoToTransfer, color: 'var(--primary)', bg: 'var(--primary-soft)' },
    { icon: Repeat, label: '周期记账', onClick: onGoToRecurring, color: '#7c6ef0', bg: '#eeecfd' },
    { icon: Bookmark, label: '模板', onClick: onGoToTemplates, color: '#e0684f', bg: 'var(--expense-soft)' },
    { icon: PiggyBank, label: '预算', onClick: onGoToBudgets, color: '#d9930f', bg: '#faf1dc' },
  ];

  return (
    <div className="page-root pb-nav overflow-y-auto">
      {/* 头部：问候 + 快捷图标 */}
      <div className="safe-top px-5 pt-2 pb-1 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--ink)' }}>
            {greeting()}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-2)' }}>
            {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onGoToSearch} className="icon-btn" aria-label="搜索">
            <Search size={19} />
          </button>
          <button onClick={() => onGoToCurrencyConverter?.()} className="icon-btn" aria-label="汇率转换">
            <Globe size={19} />
          </button>
          <button onClick={onGoToSettings} className="icon-btn" aria-label="设置">
            <Settings size={19} />
          </button>
        </div>
      </div>

      {/* 本月概览卡 */}
      <div className="px-4 mt-3">
        <button onClick={() => onViewDetail('month-balance')} className="card card-hover w-full p-5 text-left block">
          <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>本月余额</p>
          <p className="text-3xl font-bold mt-1.5 amount-num" style={{ color: 'var(--ink)' }}>
            {formatCurrencyShort(balance)}
          </p>
          <div className="flex items-center gap-5 mt-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }} />
              <span className="text-xs" style={{ color: 'var(--ink-2)' }}>收入</span>
              <span className="text-sm font-semibold amount-num" style={{ color: 'var(--primary)' }}>
                {formatCurrencyShort(monthIncome)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--expense)' }} />
              <span className="text-xs" style={{ color: 'var(--ink-2)' }}>支出</span>
              <span className="text-sm font-semibold amount-num" style={{ color: 'var(--expense)' }}>
                {formatCurrencyShort(-monthExpense)}
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* 记账区域 */}
      <div className="px-4 mt-4">
        <div className="card p-4">
          {/* 智能输入 */}
          <div
            className="flex items-center rounded-button px-3 py-2.5 border-2 transition-colors mb-3"
            style={{ background: 'var(--paper)', borderColor: 'transparent' }}
          >
            <Sparkles size={16} className="mr-2 flex-shrink-0" style={{ color: '#d9930f' }} />
            <input
              ref={smartInputRef}
              type="text"
              value={smartInput}
              onChange={(e) => setSmartInput(e.target.value)}
              onKeyPress={(e) => { if (e.key === 'Enter') handleSmartSubmit(); }}
              placeholder="记一笔？试试输入「午餐30」"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--ink)' }}
            />
            <button
              onClick={() => handleSmartSubmit()}
              disabled={!smartInput.trim()}
              className="ml-2 w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0"
              style={
                smartInput.trim()
                  ? { background: 'var(--primary)', color: '#fff' }
                  : { background: 'var(--paper-deep)', color: 'var(--ink-2)' }
              }
            >
              <Plus size={16} />
            </button>
          </div>

          {/* 支出/收入切换 */}
          <div className="seg mb-3">
            <button
              onClick={() => onQuickRecordTypeChange('expense')}
              className="seg-item"
              style={
                quickRecordType === 'expense'
                  ? { background: 'var(--expense)', color: '#fff', fontWeight: 600, boxShadow: '0 4px 12px rgba(224,104,79,0.3)' }
                  : undefined
              }
            >
              支出
            </button>
            <button
              onClick={() => onQuickRecordTypeChange('income')}
              className="seg-item"
              style={
                quickRecordType === 'income'
                  ? { background: 'var(--primary)', color: '#fff', fontWeight: 600, boxShadow: '0 4px 12px rgba(46,133,222,0.3)' }
                  : undefined
              }
            >
              收入
            </button>
          </div>

          {/* 分类网格 */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {filteredCategories.map((category) => (
              <CategoryCard key={category.id} category={category} isSelected={quickRecordCategoryId === category.id} onClick={() => onQuickRecordCategoryChange(category.id)} />
            ))}
          </div>

          {/* 金额行 */}
          <div className="rounded-button p-3 mb-3" style={{ background: 'var(--paper)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--ink-2)' }}>金额</span>
                <button
                  onClick={() => setShowCurrencyPicker(true)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-chip text-xs font-medium"
                  style={{ background: 'var(--card)', color: 'var(--ink)' }}
                >
                  <span className="text-sm">{currencies.find(c => c.code === quickRecordCurrency)?.flag}</span>
                  <span>{quickRecordCurrency}</span>
                  <ChevronRight size={12} className="rotate-90" style={{ color: 'var(--ink-2)' }} />
                </button>
              </div>
              <div className="flex items-center">
                <span className="text-lg mr-1 amount-num" style={{ color: 'var(--ink-2)' }}>{currentCurrencySymbol}</span>
                <input
                  type="number"
                  value={quickRecordAmount}
                  onChange={(e) => onQuickRecordAmountChange(e.target.value)}
                  placeholder="0.00"
                  inputMode="decimal"
                  className="text-2xl font-bold bg-transparent outline-none text-right w-28 amount-num"
                  style={{ color: 'var(--ink)' }}
                />
              </div>
            </div>
            {isForeignCurrency && quickRecordAmount && (
              <div className="mt-1.5 pt-1.5 flex items-center justify-between text-xs" style={{ borderTop: '1px solid var(--line)' }}>
                <span style={{ color: 'var(--ink-2)' }}>汇率 1{quickRecordCurrency} = ¥{currentRate.toFixed(4)}</span>
                <span className="font-medium" style={{ color: 'var(--primary)' }}>≈ ¥{convertedCNY.toFixed(2)} 人民币</span>
              </div>
            )}
          </div>

          {/* 账户选择 */}
          <button
            onClick={() => setShowAccountPicker(true)}
            className="w-full flex items-center justify-between rounded-button p-2.5 mb-2.5 transition-all"
            style={{ background: 'var(--paper)' }}
          >
            <div className="flex items-center gap-2.5">
              {(() => {
                const selectedAccount = accounts.find((a) => a.id === quickRecordAccountId);
                if (selectedAccount) {
                  const IconComponent = getIcon(selectedAccount.icon);
                  return (
                    <>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: `${selectedAccount.color}20`, color: selectedAccount.color }}>
                        <IconComponent size={16} />
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{selectedAccount.name}</span>
                    </>
                  );
                }
                return (
                  <>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--paper-deep)' }}>
                      <Wallet size={16} style={{ color: 'var(--ink-2)' }} />
                    </div>
                    <span className="text-sm" style={{ color: 'var(--ink-2)' }}>选择账户</span>
                  </>
                );
              })()}
            </div>
            <ChevronRight size={18} style={{ color: 'var(--ink-2)' }} />
          </button>

          {/* 备注+日期时间行 */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={quickRecordNote}
              onChange={(e) => onQuickRecordNoteChange(e.target.value)}
              placeholder="备注"
              className="flex-1 rounded-button px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--paper)', color: 'var(--ink)' }}
            />
            <button onClick={onShowDatePicker} className="flex items-center gap-1 px-3 py-2 rounded-button text-sm transition-all" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>
              <Calendar size={15} style={{ color: 'var(--primary)' }} />
              <span className="font-medium">{quickRecordDateTime.getMonth() + 1}/{quickRecordDateTime.getDate()}</span>
            </button>
            <button onClick={onShowTimePicker} className="flex items-center gap-1 px-3 py-2 rounded-button text-sm transition-all" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>
              <Clock size={15} style={{ color: 'var(--primary)' }} />
              <span className="font-medium">{quickRecordDateTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
            </button>
          </div>

          {/* 操作行 */}
          <div className="flex gap-2">
            <button onClick={onShowOCRModal} className="btn-ghost px-4 py-2.5 text-sm flex-1">
              <Image size={16} />
              <span>拍票</span>
            </button>
            <button
              onClick={onQuickRecordSubmit}
              disabled={!canSubmit}
              className="btn-primary flex-[2] py-2.5 text-sm"
            >
              记一笔
            </button>
          </div>
        </div>
      </div>

      {/* 快捷工具 */}
      <div className="px-4 mt-4">
        <div className="card p-3 grid grid-cols-4 gap-1">
          {quickTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.label}
                onClick={tool.onClick}
                className="flex flex-col items-center gap-1.5 py-2 rounded-button transition-colors active:scale-95"
              >
                <div className="w-10 h-10 rounded-button flex items-center justify-center" style={{ background: tool.bg }}>
                  <Icon size={19} style={{ color: tool.color }} />
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--ink)' }}>{tool.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 今日收支 + 总资产 */}
      <div className="px-4 mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <StatCard type="income" title="今日收入" amount={todayIncome} onClick={() => onViewDetail('today-income')} />
          <StatCard type="expense" title="今日支出" amount={todayExpense} onClick={() => onViewDetail('today-expense')} />
        </div>

        <button onClick={() => onViewDetail('total-balance')} className="card card-hover w-full p-4 text-left block">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>总资产</p>
              <p className="text-2xl font-bold mt-1 amount-num" style={{ color: 'var(--ink)' }}>{formatCurrencyShort(totalAssets)}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs" style={{ color: 'var(--ink-2)' }}>
                收入 <span className="font-semibold amount-num" style={{ color: 'var(--primary)' }}>{formatCurrencyShort(totalIncome)}</span>
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--ink-2)' }}>
                支出 <span className="font-semibold amount-num" style={{ color: 'var(--expense)' }}>{formatCurrencyShort(-totalExpense)}</span>
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* 最近记录 */}
      <div className="px-4 mt-6">
        <h2 className="section-title">最近记录</h2>
        {recentTransactions.length === 0 ? (
          <Empty icon={Wallet} title="暂无记录" description="使用上方智能记账添加第一笔吧" />
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                onDelete={() => deleteTransaction(transaction.id)}
                onEdit={() => onEditTransaction?.(transaction)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 账户选择弹窗 */}
      {showAccountPicker && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center" style={{ background: 'rgba(43,41,37,0.45)' }} onClick={() => setShowAccountPicker(false)}>
          <div className="sheet w-full max-w-md max-h-[65vh] overflow-hidden flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--line)' }}>
              <h3 className="font-bold" style={{ color: 'var(--ink)' }}>选择账户</h3>
              <button onClick={() => setShowAccountPicker(false)} className="icon-btn w-9 h-9">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-6">
              {accounts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--paper-deep)' }}>
                    <Wallet size={28} style={{ color: 'var(--ink-2)' }} />
                  </div>
                  <p style={{ color: 'var(--ink-2)' }}>还没有添加账户</p>
                </div>
              ) : (
                accounts.map((account) => {
                  const IconComponent = getIcon(account.icon);
                  const isSelected = quickRecordAccountId === account.id;
                  return (
                    <button
                      key={account.id}
                      onClick={() => { onQuickRecordAccountChange(account.id); setShowAccountPicker(false); }}
                      className="w-full flex items-center gap-3 p-3 rounded-button transition-all"
                      style={{
                        background: isSelected ? 'var(--primary-soft)' : 'var(--paper)',
                        border: `2px solid ${isSelected ? 'var(--primary)' : 'transparent'}`,
                      }}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${account.color}20`, color: account.color }}>
                        <IconComponent size={20} />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium" style={{ color: 'var(--ink)' }}>{account.name}</p>
                        <p className="text-xs amount-num" style={{ color: 'var(--ink-2)' }}>余额 ¥{account.balance.toLocaleString()}</p>
                      </div>
                      {isSelected && <CheckCircle size={20} className="flex-shrink-0" style={{ color: 'var(--primary)' }} />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 货币选择弹窗 */}
      {showCurrencyPicker && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center" style={{ background: 'rgba(43,41,37,0.45)' }} onClick={() => { setShowCurrencyPicker(false); setCurrencySearch(''); }}>
          <div className="sheet w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--line)' }}>
              <h3 className="font-bold" style={{ color: 'var(--ink)' }}>选择货币</h3>
              <button onClick={() => { setShowCurrencyPicker(false); setCurrencySearch(''); }} className="icon-btn w-9 h-9">
                <X size={18} />
              </button>
            </div>
            <div className="p-3" style={{ borderBottom: '1px solid var(--line)' }}>
              <div className="flex items-center gap-2 rounded-button px-3 py-2" style={{ background: 'var(--paper)' }}>
                <Search size={16} style={{ color: 'var(--ink-2)' }} />
                <input type="text" value={currencySearch} onChange={(e) => setCurrencySearch(e.target.value)} placeholder="搜索货币名称或代码" className="flex-1 bg-transparent outline-none text-sm" style={{ color: 'var(--ink)' }} autoFocus />
                {currencySearch && <button onClick={() => setCurrencySearch('')}><X size={14} style={{ color: 'var(--ink-2)' }} /></button>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1 pb-6">
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
                      onClick={() => { onQuickRecordCurrencyChange(currency.code); setShowCurrencyPicker(false); setCurrencySearch(''); }}
                      className="w-full flex items-center gap-3 p-3 rounded-button transition-all"
                      style={{
                        background: isSelected ? 'var(--primary-soft)' : 'var(--paper)',
                        border: `2px solid ${isSelected ? 'var(--primary)' : 'transparent'}`,
                      }}
                    >
                      <span className="text-2xl flex-shrink-0">{currency.flag}</span>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium" style={{ color: 'var(--ink)' }}>{currency.name}</p>
                        <p className="text-xs amount-num" style={{ color: 'var(--ink-2)' }}>{currency.code} · 1{currency.code} = ¥{getRate(currency.code).toFixed(currency.rateToCNY < 0.01 ? 6 : 4)}</p>
                      </div>
                      <span className="text-sm flex-shrink-0" style={{ color: 'var(--ink-2)' }}>{currency.symbol}</span>
                      {isSelected && <CheckCircle size={20} className="flex-shrink-0" style={{ color: 'var(--primary)' }} />}
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
