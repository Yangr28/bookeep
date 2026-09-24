import { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { useStore } from '../store/useStore';
import { StatCard } from '../components/StatCard';
import { TransactionCard } from '../components/TransactionCard';
import { Sparkline, StackedBar, ProgressRing } from '../components/MiniCharts';
import { formatCurrencyShort } from '../utils/format';
import { getMonthKey } from '../utils/date';
import { parseSmartInputWithHistory, parseSmartInput, findCategoryByIdentifier, findAccountByKeyword } from '../utils/smartParser';
import { Wallet, Settings, Plus, Sparkles, Image, Search, Repeat, Bookmark, PiggyBank, ArrowLeftRight, Globe, Check, Pencil, Tag, CreditCard as CreditCardIcon, AlertCircle, Mic, History } from 'lucide-react';
import Empty from '../components/Empty';
import { SpeechSheet } from '../components/SpeechSheet';
import { getNoteSuggestions } from '../utils/recommender';
import { useSpeechToText } from '../hooks/useSpeechToText';
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

/** 按时段返回问候语 key（文案在 i18n 资源中） */
const greetingKey = (): string => {
  const h = new Date().getHours();
  if (h < 6) return 'dashboard.greeting.night';
  if (h < 12) return 'dashboard.greeting.morning';
  if (h < 18) return 'dashboard.greeting.afternoon';
  return 'dashboard.greeting.evening';
};

const DashboardComponent = ({
  onViewDetail,
  onGoToBudgets,
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
  onSmartQuickSave,
  widgetQuickInput,
  onClearWidgetQuickInput,
  }: DashboardProps) => {
  const { t } = useTranslation();
  const transactions = useStore((state) => state.transactions);
  const deleteTransaction = useStore((state) => state.deleteTransaction);
  const getTodayIncome = useStore((state) => state.getTodayIncome);
  const getTodayExpense = useStore((state) => state.getTodayExpense);
  const getMonthIncome = useStore((state) => state.getMonthIncome);
  const getMonthExpense = useStore((state) => state.getMonthExpense);
  const getTotalIncome = useStore((state) => state.getTotalIncome);
  const getTotalExpense = useStore((state) => state.getTotalExpense);
  const getTotalAssets = useStore((state) => state.getTotalAssets);
  const getMonthlyAssetsTrend = useStore((state) => state.getMonthlyAssetsTrend);
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
  const currentMonth = getMonthKey(new Date());
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

  // 近 6 个月总资产趋势（用于 sparkline，仅 accounts/transactions 变化时重算）
  const assetsTrend = useMemo(() => getMonthlyAssetsTrend(6), [getMonthlyAssetsTrend, accounts, transactions]);

  const [smartInput, setSmartInput] = useState('');
  const smartInputRef = useRef<HTMLInputElement>(null);

  // 历史备注前缀补全候选（250ms 防抖，最多 5 条；无候选不显示）
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const smartAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = smartInput.trim();
    if (!q) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }
    const timer = setTimeout(() => {
      // 过滤与当前输入完全相同的候选（点击无变化）
      const list = getNoteSuggestions(transactions, q, 5).filter(
        (s) => s.trim().toLowerCase() !== q.toLowerCase(),
      );
      setSuggestions(list);
      setSuggestionsOpen(list.length > 0);
    }, 250);
    return () => clearTimeout(timer);
  }, [smartInput, transactions]);

  // 点击候选区外部或按 Esc 关闭下拉
  useEffect(() => {
    if (!suggestionsOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (smartAreaRef.current && !smartAreaRef.current.contains(e.target as Node)) {
        setSuggestionsOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSuggestionsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [suggestionsOpen]);

  const pickSuggestion = useCallback((text: string) => {
    setSmartInput(text);
    setSuggestionsOpen(false);
    smartInputRef.current?.focus();
  }, []);

  // 语音记账：仅探测设备能力以决定是否渲染麦克风；识别过程在 SpeechSheet 浮层内进行，
  // 确认后文本回填智能输入框（走 parseSmartInput 预填管道，不自动入账）
  const { available: speechAvailable } = useSpeechToText();
  const [speechSheetOpen, setSpeechSheetOpen] = useState(false);

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

  const quickTools = [
    { icon: ArrowLeftRight, labelKey: 'dashboard.toolTransfer', onClick: onGoToTransfer, color: 'var(--accent-transfer)', bg: 'var(--accent-transfer-soft)' },
    { icon: Repeat, labelKey: 'dashboard.toolRecurring', onClick: onGoToRecurring, color: 'var(--accent-recurring)', bg: 'var(--accent-recurring-soft)' },
    { icon: Bookmark, labelKey: 'dashboard.toolTemplates', onClick: onGoToTemplates, color: 'var(--accent-template)', bg: 'var(--accent-template-soft)' },
    { icon: PiggyBank, labelKey: 'dashboard.toolBudget', onClick: onGoToBudgets, color: 'var(--accent-budget)', bg: 'var(--accent-budget-soft)' },
  ];

  return (
    <div className="page-root pb-nav overflow-y-auto">
      {/* 头部：问候 + 快捷图标 */}
      <div className="safe-top px-5 pt-2 pb-1 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--ink)' }}>
            {t(greetingKey())}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-2)' }}>
            {new Date().toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onGoToSearch} className="icon-btn" aria-label={t('dashboard.search')}>
            <Search size={19} />
          </button>
          <button onClick={() => onGoToCurrencyConverter?.()} className="icon-btn" aria-label={t('dashboard.currencyConverter')}>
            <Globe size={19} />
          </button>
          <button onClick={onGoToSettings} className="icon-btn" aria-label={t('dashboard.settings')}>
            <Settings size={19} />
          </button>
        </div>
      </div>

      {/* 本月概览卡 */}
      <div className="px-4 mt-3">
        <button onClick={() => onViewDetail('month-balance')} className="card card-hover w-full p-5 text-left block">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>{t('dashboard.monthBalance')}</p>
              <p className="text-3xl font-bold mt-1.5 amount-num" style={{ color: 'var(--ink)' }}>
                {formatCurrencyShort(balance)}
              </p>
            </div>
            {/* 资产趋势 sparkline：近 6 个月总资产 mini 折线 */}
            <div className="flex flex-col items-end flex-shrink-0 mt-1">
              <Sparkline data={assetsTrend.map(d => d.assets)} width={72} height={24} />
              <span className="text-[10px] mt-1" style={{ color: 'var(--ink-2)' }}>{t('dashboard.trend6m')}</span>
            </div>
          </div>
          <div className="flex items-center gap-5 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }} />
              <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('dashboard.income')}</span>
              <span className="text-sm font-semibold amount-num" style={{ color: 'var(--primary)' }}>
                {formatCurrencyShort(monthIncome)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--expense)' }} />
              <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('dashboard.expense')}</span>
              <span className="text-sm font-semibold amount-num" style={{ color: 'var(--expense)' }}>
                {formatCurrencyShort(-monthExpense)}
              </span>
            </div>
          </div>
          {/* 收支对比堆叠条 + 结余率 */}
          <div className="mt-3">
            <StackedBar income={monthIncome} expense={monthExpense} height={6} />
          </div>
        </button>
        {/* 预算进度小条：仅当本月有设置预算时显示 */}
        {budgetSummary.totalBudget > 0 && (
          <button
            onClick={() => onGoToBudgets?.()}
            className="card card-hover w-full p-4 mt-2 text-left block animate-stagger-in"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>{t('dashboard.monthBudget')}</span>
                {budgetSummary.overCount > 0 && (
                  <span className="text-[11px] flex items-center gap-1 font-semibold" style={{ color: 'var(--expense)' }}>
                    <AlertCircle size={11} />
                    {t('dashboard.overCount', { n: budgetSummary.overCount })}
                  </span>
                )}
                {budgetSummary.overCount === 0 && (
                  <span className="text-[11px] amount-num" style={{ color: 'var(--ink-2)' }}>
                    {formatCurrencyShort(budgetSummary.totalSpent)} / {formatCurrencyShort(budgetSummary.totalBudget)}
                  </span>
                )}
              </div>
              {/* 预算进度环：超支时脉冲警告 */}
              <ProgressRing
                percentage={budgetSummary.percentage}
                size={36}
                stroke={3.5}
                pulse={budgetSummary.overCount > 0}
              />
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--paper-deep)' }}>
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${budgetSummary.percentage}%`, background: getBudgetColor(budgetSummary.percentage) }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs" style={{ color: 'var(--ink-2)' }}>
                {t('dashboard.used', { percent: budgetSummary.percentage.toFixed(0) })}
              </span>
              <span className="text-xs font-medium" style={{ color: getBudgetColor(budgetSummary.percentage) }}>
                {budgetSummary.percentage >= 100 ? t('dashboard.statusOver') : budgetSummary.percentage >= 80 ? t('dashboard.statusNearLimit') : t('dashboard.statusNormal')}
              </span>
            </div>
          </button>
        )}
      </div>

      {/* 记账区域（快捷入口，完整记账在独立页面） */}
      <div className="px-4 mt-4">
        <div className="card p-4">
          {/* 智能输入（含历史备注补全候选与语音入口） */}
          <div ref={smartAreaRef}>
            <div
              className="flex items-center rounded-button px-3 py-2.5 border-2 transition-colors"
              style={{ background: 'var(--paper)', borderColor: 'transparent' }}
            >
              <Sparkles size={16} className="mr-2 flex-shrink-0" style={{ color: 'var(--primary-ink)' }} />
              <input
                ref={smartInputRef}
                type="text"
                value={smartInput}
                onChange={(e) => setSmartInput(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter') handleSmartSubmit(); }}
                placeholder={t('dashboard.smartInputPlaceholder')}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: 'var(--ink)' }}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={suggestionsOpen}
                aria-controls="smart-suggestion-list"
              />
              {speechAvailable === true && (
                <button
                  type="button"
                  onClick={() => setSpeechSheetOpen(true)}
                  aria-label={t('speech.tapToSpeak')}
                  className="ml-2 w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 card-press"
                  style={{ background: 'var(--paper-deep)', color: 'var(--ink-2)' }}
                >
                  <Mic size={15} />
                </button>
              )}
              <button
                onClick={() => handleSmartSubmit()}
                aria-label={t('dashboard.save')}
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

            {/* 历史备注前缀补全候选 */}
            {suggestionsOpen && suggestions.length > 0 && (
              <div
                id="smart-suggestion-list"
                role="listbox"
                className="mt-1.5 mb-3 rounded-button overflow-hidden animate-fade-in divide-y divide-[color:var(--line)]"
                style={{ background: 'var(--card)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-card)' }}
              >
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => pickSuggestion(s)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors card-press hover:brightness-95"
                    style={{ color: 'var(--ink)' }}
                  >
                    <History size={14} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
                    <span className="truncate">{s}</span>
                  </button>
                ))}
              </div>
            )}
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
                  {preview.type === 'income' ? t('common.income') : t('common.expense')}
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
                    <Tag size={11} /> {t('dashboard.categoryNotFound')}
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
                    <CreditCardIcon size={11} /> {t('dashboard.accountNotFound')}
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
                  {preview.amount && preview.categoryId && preview.accountId ? t('dashboard.save') : t('dashboard.incomplete')}
                </button>
                <button
                  onClick={() => handleSmartSubmit()}
                  className="flex-1 py-1.5 rounded-button text-xs font-medium transition-all flex items-center justify-center gap-1"
                  style={{ background: 'var(--paper)', color: 'var(--ink)', border: '1px solid var(--line)' }}
                >
                  <Pencil size={13} />
                  {t('dashboard.edit')}
                </button>
              </div>
            </div>
          )}

          {/* 操作行：拍票 + 记一笔 */}
          <div className="flex gap-2">
            <button onClick={onShowOCRModal} className="btn-ghost px-4 py-2.5 text-sm flex-1">
              <Image size={16} />
              <span>{t('dashboard.ocrShot')}</span>
            </button>
            <button
              onClick={onFabRecord}
              className="btn-primary flex-[2] py-2.5 text-sm"
            >
              {t('dashboard.record')}
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
                key={tool.labelKey}
                onClick={tool.onClick}
                className="flex flex-col items-center gap-1.5 py-2 rounded-button transition-colors active:scale-95"
              >
                <div className="w-10 h-10 rounded-button flex items-center justify-center" style={{ background: tool.bg }}>
                  <Icon size={19} style={{ color: tool.color }} />
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--ink)' }}>{t(tool.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 今日收支 + 总资产 */}
      <div className="px-4 mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <StatCard type="income" title={t('dashboard.todayIncome')} amount={todayIncome} onClick={() => onViewDetail('today-income')} />
          <StatCard type="expense" title={t('dashboard.todayExpense')} amount={todayExpense} onClick={() => onViewDetail('today-expense')} />
        </div>

        <button onClick={() => onViewDetail('total-balance')} className="card card-hover w-full p-4 text-left block">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>{t('dashboard.totalAssets')}</p>
              <p className="text-2xl font-bold mt-1 amount-num" style={{ color: 'var(--ink)' }}>{formatCurrencyShort(totalAssets)}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs" style={{ color: 'var(--ink-2)' }}>
                {t('dashboard.income')} <span className="font-semibold amount-num" style={{ color: 'var(--primary)' }}>{formatCurrencyShort(totalIncome)}</span>
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--ink-2)' }}>
                {t('dashboard.expense')} <span className="font-semibold amount-num" style={{ color: 'var(--expense)' }}>{formatCurrencyShort(-totalExpense)}</span>
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* 最近记录 */}
      <div className="px-4 mt-6">
        <h2 className="section-title">{t('dashboard.recentRecords')}</h2>
        {recentTransactions.length === 0 ? (
          <Empty icon={Wallet} title={t('dashboard.noRecords')} description={t('dashboard.noRecordsHint')} />
        ) : (
          <div>
            {recentTransactions.map((transaction, index) => (
              <div key={transaction.id} className="animate-stagger-in" style={{ animationDelay: `${index * 50}ms` }}>
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

      <SpeechSheet
        open={speechSheetOpen}
        onClose={() => setSpeechSheetOpen(false)}
        onResult={(text) => setSmartInput(text)}
      />
    </div>
  );
};

export const Dashboard = memo(DashboardComponent);
