import { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import { useStore } from '../store/useStore';
import { StatCard } from '../components/StatCard';
import { TransactionCard } from '../components/TransactionCard';
import { formatCurrencyShort } from '../utils/format';
import { parseSmartInputWithHistory, findCategoryByIdentifier, findAccountByKeyword } from '../utils/smartParser';
import { Wallet, Settings, Plus, Sparkles, Image, Search, Repeat, Bookmark, PiggyBank, ArrowLeftRight, Globe } from 'lucide-react';
import Empty from '../components/Empty';
import { TransactionType, Transaction } from '../types';

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
  onGoToRecord?: (parsed: {
    type: TransactionType;
    amount?: string;
    categoryId?: string | null;
    note?: string;
    accountId?: string | null;
    dateTime?: Date;
  }) => void;
  onFabRecord?: () => void;
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
  onGoToRecord,
  onFabRecord,
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

  const [smartInput, setSmartInput] = useState('');
  const smartInputRef = useRef<HTMLInputElement>(null);

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
    if (!inputText.trim()) {
      // 空输入直接进入记账页
      onFabRecord?.();
      return;
    }

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

    // 解析日期时间
    let parsedDateTime: Date | undefined;
    if (result.date || result.time) {
      parsedDateTime = new Date();
      if (result.date) {
        const [y, m, d] = result.date.split('-').map(Number);
        parsedDateTime.setFullYear(y, m - 1, d);
      }
      if (result.time) {
        const [h, min] = result.time.split(':').map(Number);
        parsedDateTime.setHours(h, min, 0, 0);
      }
    }

    // 跳转到记账页并预填解析结果
    onGoToRecord?.({
      type: result.type,
      amount: result.amount,
      categoryId: autoCategoryId,
      note: result.note,
      accountId: autoAccountId,
      dateTime: parsedDateTime,
    });

    setSmartInput('');
  }, [smartInput, categories, transactions, accounts, onGoToRecord, onFabRecord]);

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

      {/* 记账区域（快捷入口，完整记账在独立页面） */}
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

          {/* 操作行：拍票 + 记一笔 */}
          <div className="flex gap-2">
            <button onClick={onShowOCRModal} className="btn-ghost px-4 py-2.5 text-sm flex-1">
              <Image size={16} />
              <span>拍票</span>
            </button>
            <button
              onClick={onFabRecord}
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
    </div>
  );
};

export const Dashboard = memo(DashboardComponent);
