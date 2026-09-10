import { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import { useStore } from '../store/useStore';
import { StatCard } from '../components/StatCard';
import { TransactionCard } from '../components/TransactionCard';
import { formatCurrencyShort } from '../utils/format';
import { parseSmartInputWithHistory, parseSmartInput, findCategoryByIdentifier, findAccountByKeyword } from '../utils/smartParser';
import { Wallet, Settings, Plus, Sparkles, Image, Search, Repeat, Bookmark, PiggyBank, ArrowLeftRight, Globe, Check, Pencil, Tag, CreditCard as CreditCardIcon, AlertCircle } from 'lucide-react';
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
  onSmartQuickSave: (parsed: {
    type: TransactionType;
    amount: string;
    categoryId: string;
    accountId: string;
    note: string;
    currency?: string;
    dateTime?: Date;
  }) => void;
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
  onSmartQuickSave,
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
  const budgets = useStore((state) => state.budgets);
  const calculateBudgetUsage = useStore((state) => state.calculateBudgetUsage);

  // 计算函数缓存：仅 transactions/accounts 变化时重算
  const todayIncome = useMemo(() => getTodayIncome(), [getTodayIncome, transactions]);
  const todayExpense = useMemo(() => getTodayExpense(), [getTodayExpense, transactions]);
  const monthIncome = useMemo(() => getMonthIncome(), [getMonthIncome, transactions]);
  const monthExpense = useMemo(() => getMonthExpense(), [getMonthExpense, transactions]);
  const totalIncome = useMemo(() => getTotalIncome(), [getTotalIncome, transactions]);
  const totalExpense = useMemo(() => getTotalExpense(), [getTotalExpense, transactions]);
  const totalAssets = useMemo(() => getTotalAssets(), [getTotalAssets, accounts, transactions]);

  // 当月预算汇总（总预算/已用/超支项数），仅 budgets 或 transactions 变化时重算
  const currentMonth = new Date().toISOString().slice(0, 7);
  const budgetSummary = useMemo(() => {
    const expenseCategoryIds = categories.filter(c => c.type === 'expense').map(c => c.id);
    let totalBudget = 0;
    let totalSpent = 0;
    let overCount = 0;
    for (const cid of expenseCategoryIds) {
      const u = calculateBudgetUsage(cid, currentMonth, transactions);
      if (u.budget > 0) {
        totalBudget += u.budget;
        totalSpent += u.spent;
        if (u.spent >= u.budget) overCount++;
      }
    }
    const percentage = totalBudget ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
    return { totalBudget, totalSpent, percentage, overCount };
  }, [categories, budgets, transactions, calculateBudgetUsage, currentMonth]);

  const getBudgetColor = (pct: number) =>
    pct >= 100 ? 'var(--expense)' : pct >= 80 ? 'var(--expense-ink)' : pct >= 50 ? 'var(--primary-ink)' : 'var(--primary)';

  const [smartInput, setSmartInput] = useState('');
  const smartInputRef = useRef<HTMLInputElement>(null);

  // 实时解析预览（轻量 parseSmartInput + 账户/分类反查，不走历史匹配避免输入卡顿）
  const [preview, setPreview] = useState<null | {
    amount: string;
    type: TransactionType;
    categoryId: string | null;
    categoryName: string | null;
    accountId: string | null;
    accountName: string | null;
    note: string;
    currency: string;
  }>(null);

  useEffect(() => {
    const text = smartInput.trim();
    if (!text) { setPreview(null); return; }
    const timer = setTimeout(() => {
      const r = parseSmartInput(text, accounts, categories);
      let categoryId: string | null = null;
      let accountId: string | null = null;
      if (r.categoryKeyword) categoryId = findCategoryByIdentifier(categories, r.type, r.categoryKeyword);
      if (r.accountKeyword) accountId = findAccountByKeyword(accounts, r.accountKeyword);
      const category = categoryId ? categories.find(c => c.id === categoryId) : null;
      const account = accountId ? accounts.find(a => a.id === accountId) : null;
      setPreview({
        amount: r.amount,
        type: r.type,
        categoryId,
        categoryName: category?.name ?? null,
        accountId,
        accountName: account?.name ?? null,
        note: r.note,
        currency: r.currency,
      });
    }, 280);
    return () => clearTimeout(timer);
  }, [smartInput, accounts, categories]);

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

    // ★ 快速识别：金额、分类、账户三者齐全且用户提供了金额，直接在首页保存，不跳页
    if (result.amount && autoCategoryId && autoAccountId) {
      onSmartQuickSave({
        type: result.type,
        amount: result.amount,
        categoryId: autoCategoryId,
        accountId: autoAccountId,
        note: result.note,
        currency: result.currency || undefined,
        dateTime: parsedDateTime,
      });
      setSmartInput('');
      setPreview(null);
      return;
    }

    // 任一关键字段未识别：跳转到记账页并预填已解析结果，继续编辑
    onGoToRecord?.({
      type: result.type,
      amount: result.amount,
      categoryId: autoCategoryId,
      note: result.note,
      accountId: autoAccountId,
      dateTime: parsedDateTime,
    });

    setSmartInput('');
    setPreview(null);
  }, [smartInput, categories, transactions, accounts, onGoToRecord, onFabRecord, onSmartQuickSave]);

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
    { icon: ArrowLeftRight, label: '转账', onClick: onGoToTransfer, color: 'var(--accent-transfer)', bg: 'var(--accent-transfer-soft)' },
    { icon: Repeat, label: '周期记账', onClick: onGoToRecurring, color: 'var(--accent-recurring)', bg: 'var(--accent-recurring-soft)' },
    { icon: Bookmark, label: '模板', onClick: onGoToTemplates, color: 'var(--accent-template)', bg: 'var(--accent-template-soft)' },
    { icon: PiggyBank, label: '预算', onClick: onGoToBudgets, color: 'var(--accent-budget)', bg: 'var(--accent-budget-soft)' },
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
        {/* 预算进度小条：仅当本月有设置预算时显示 */}
        {budgetSummary.totalBudget > 0 && (
          <button
            onClick={() => onGoToBudgets?.()}
            className="card card-hover w-full p-4 mt-2 text-left block animate-stagger-in"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>本月预算</span>
              {budgetSummary.overCount > 0 ? (
                <span className="text-xs flex items-center gap-1 font-semibold" style={{ color: 'var(--expense)' }}>
                  <AlertCircle size={12} />
                  {budgetSummary.overCount} 项超支
                </span>
              ) : (
                <span className="text-xs amount-num" style={{ color: 'var(--ink-2)' }}>
                  {formatCurrencyShort(budgetSummary.totalSpent)} / {formatCurrencyShort(budgetSummary.totalBudget)}
                </span>
              )}
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--paper-deep)' }}>
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${budgetSummary.percentage}%`, background: getBudgetColor(budgetSummary.percentage) }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs" style={{ color: 'var(--ink-2)' }}>
                已用 {budgetSummary.percentage.toFixed(0)}%
              </span>
              <span className="text-xs font-medium" style={{ color: getBudgetColor(budgetSummary.percentage) }}>
                {budgetSummary.percentage >= 100 ? '已超支' : budgetSummary.percentage >= 80 ? '接近上限' : '正常'}
              </span>
            </div>
          </button>
        )}
      </div>

      {/* 记账区域（快捷入口，完整记账在独立页面） */}
      <div className="px-4 mt-4">
        <div className="card p-4">
          {/* 智能输入 */}
          <div
            className="flex items-center rounded-button px-3 py-2.5 border-2 transition-colors mb-3"
            style={{ background: 'var(--paper)', borderColor: 'transparent' }}
          >
            <Sparkles size={16} className="mr-2 flex-shrink-0" style={{ color: 'var(--primary-ink)' }} />
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

          {/* 智能解析预览：输入时实时显示识别到的金额/分类/账户，可直接保存 */}
          {preview && (preview.amount || preview.categoryName || preview.accountName) && (
            <div
              className="rounded-button px-3 py-2.5 mb-3 animate-stagger-in"
              style={{ background: 'var(--paper-deep)', border: '1px solid var(--line)' }}
            >
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {/* 金额 + 类型 */}
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: preview.type === 'income' ? 'var(--primary-soft)' : 'var(--expense-soft)',
                    color: preview.type === 'income' ? 'var(--primary)' : 'var(--expense)',
                  }}
                >
                  {preview.type === 'income' ? '收入' : '支出'}
                  {preview.amount && (
                    <span className="amount-num">¥{preview.amount}</span>
                  )}
                  {preview.currency && preview.currency !== 'CNY' && (
                    <span className="opacity-70">{preview.currency}</span>
                  )}
                </span>
                {/* 分类 */}
                {preview.categoryName ? (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--card)', color: 'var(--ink)' }}
                  >
                    <Tag size={11} style={{ color: 'var(--ink-2)' }} />
                    {preview.categoryName}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full opacity-60" style={{ color: 'var(--ink-2)' }}>
                    <Tag size={11} /> 分类未识别
                  </span>
                )}
                {/* 账户 */}
                {preview.accountName ? (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--card)', color: 'var(--ink)' }}
                  >
                    <CreditCardIcon size={11} style={{ color: 'var(--ink-2)' }} />
                    {preview.accountName}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full opacity-60" style={{ color: 'var(--ink-2)' }}>
                    <CreditCardIcon size={11} /> 账户未识别
                  </span>
                )}
                {/* 备注 */}
                {preview.note && (
                  <span className="px-2 py-0.5 rounded-full truncate max-w-[10rem]" style={{ color: 'var(--ink-2)' }}>
                    {preview.note}
                  </span>
                )}
              </div>
              {/* 操作按钮 */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleSmartSubmit()}
                  disabled={!(preview.amount && preview.categoryId && preview.accountId)}
                  className="flex-1 py-1.5 rounded-button text-xs font-semibold transition-all flex items-center justify-center gap-1"
                  style={
                    preview.amount && preview.categoryId && preview.accountId
                      ? { background: 'var(--primary)', color: '#fff' }
                      : { background: 'var(--paper)', color: 'var(--ink-2)' }
                  }
                >
                  <Check size={13} />
                  {preview.amount && preview.categoryId && preview.accountId ? '保存' : '信息不全'}
                </button>
                <button
                  onClick={() => handleSmartSubmit()}
                  className="flex-1 py-1.5 rounded-button text-xs font-medium transition-all flex items-center justify-center gap-1"
                  style={{ background: 'var(--paper)', color: 'var(--ink)', border: '1px solid var(--line)' }}
                >
                  <Pencil size={13} />
                  编辑
                </button>
              </div>
            </div>
          )}

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
