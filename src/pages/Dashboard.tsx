import { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { useStore } from '../store/useStore';
import { SmartConfirmSheet, SmartConfirmData } from '../components/SmartConfirmSheet';
import { TrendDetailSheet } from '../components/TrendDetailSheet';
import { MonthOverviewCard } from '../components/dashboard/MonthOverviewCard';
import { BudgetCard } from '../components/dashboard/BudgetCard';
import { QuickToolsCard } from '../components/dashboard/QuickToolsCard';
import { TodayOverviewCard } from '../components/dashboard/TodayOverviewCard';
import { RecentRecordsCard } from '../components/dashboard/RecentRecordsCard';
import { getMonthKey } from '../utils/date';
import { parseSmartInputWithHistory, parseSmartInput, findCategoryByIdentifier, findAccountByKeyword } from '../utils/smartParser';
import { Settings, Plus, Sparkles, Search, Repeat, Bookmark, PiggyBank, ArrowLeftRight, Globe, Check, Pencil, Tag, CreditCard as CreditCardIcon, History } from 'lucide-react';
import { RecordActionSheet } from '../components/RecordActionSheet';
import { getNoteSuggestions } from '../utils/recommender';
import { useCountUp } from '../hooks/useCountUp';
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
  onDeleteTransaction?: (transaction: Transaction) => void;
  /** 复制记一笔（预填跳转记账页） */
  onDuplicateTransaction?: (transaction: Transaction) => void;
  /** 将记录保存为模板 */
  onCreateTemplate?: (transaction: Transaction) => void;
  /** 无缝上拉展开：跳转账单页，并携带首页最后一条记录及其在视口中的位置，用于同屏对齐 */
  onGoToRecords?: (anchor?: { id: string; offsetY: number }) => void;
  onGoToSettings?: () => void;
  onGoToSearch?: () => void;
  onGoToRecord?: (parsed: {
    type: TransactionType;
    amount?: string;
    categoryId?: string | null;
    note?: string;
    accountId?: string | null;
    currency?: string;
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
  onDeleteTransaction,
  onDuplicateTransaction,
  onCreateTemplate,
  onGoToRecords,
  onGoToSettings,
  onGoToSearch,
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
  const homeCards = useStore((state) => state.homeCards);

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
    // 滚动位置由 App.tsx 统一管理；仅首次启动时自动聚焦，返回首页不弹键盘
    const shouldFocus = !hasAutoFocusedOnLaunch;
    hasAutoFocusedOnLaunch = true;
    const timer = setTimeout(() => {
      if (shouldFocus) {
        smartInputRef.current?.focus();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // 智能记账核对浮层数据（完全识别时先弹核对，不再直接入账）
  const [confirmData, setConfirmData] = useState<SmartConfirmData | null>(null);
  const [trendDetailOpen, setTrendDetailOpen] = useState(false);

  const handleSmartSubmit = useCallback((text?: string, opts?: { forceEdit?: boolean }) => {
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

    // ★ 识别到金额即弹核对浮层（分类/账户缺失时浮层内补选），避免直接记错账
    if (result.amount && !opts?.forceEdit) {
      setConfirmData({
        type: result.type,
        amount: result.amount,
        categoryId: autoCategoryId,
        accountId: autoAccountId,
        note: result.note,
        currency: result.currency || undefined,
        dateTime: parsedDateTime,
      });
      return;
    }

    // 金额无法识别或用户要求再改改：跳转到记账页并预填已解析结果，继续编辑
    onGoToRecord?.({
      type: result.type,
      amount: result.amount,
      categoryId: autoCategoryId,
      note: result.note,
      accountId: autoAccountId,
      currency: result.currency || undefined,
      dateTime: parsedDateTime,
    });

    setSmartInput('');
    setPreview(null);
  }, [smartInput, categories, transactions, accounts, onGoToRecord, onFabRecord]);

  // 核对浮层确认：真正入账（浮层已保证分类/账户非空）
  const handleConfirmSave = useCallback((d: SmartConfirmData) => {
    if (!d.categoryId || !d.accountId) return;
    onSmartQuickSave({
      type: d.type,
      amount: d.amount,
      categoryId: d.categoryId,
      accountId: d.accountId,
      note: d.note,
      currency: d.currency,
      dateTime: d.dateTime,
    });
    setConfirmData(null);
    setSmartInput('');
    setPreview(null);
  }, [onSmartQuickSave]);

  // 核对浮层「再改改」：携带（可能已调整的）预填数据跳完整记账页
  const handleConfirmEdit = useCallback((d: SmartConfirmData) => {
    onGoToRecord?.({
      type: d.type,
      amount: d.amount,
      categoryId: d.categoryId,
      note: d.note,
      accountId: d.accountId,
      currency: d.currency,
      dateTime: d.dateTime,
    });
    setConfirmData(null);
    setSmartInput('');
    setPreview(null);
  }, [onGoToRecord]);

  // 处理来自桌面小组件的快速输入
  useEffect(() => {
    if (widgetQuickInput && onClearWidgetQuickInput) {
      setSmartInput(widgetQuickInput);
      handleSmartSubmit(widgetQuickInput);
      onClearWidgetQuickInput();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetQuickInput]);

  // 近三日记录（今天/昨天/前天），按时间倒序
  const recentTransactions = useMemo(() => {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - 2);
    return [...transactions]
      .filter((tx) => new Date(tx.createdAt).getTime() >= cutoff.getTime())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [transactions]);
  // 是否还有更早的记录：有则显示「上拉展开全部账单」提示并启用手势
  const hasOlderRecords = useMemo(
    () => transactions.length > recentTransactions.length,
    [transactions, recentTransactions],
  );

  // 记录操作菜单
  const [actionTransaction, setActionTransaction] = useState<Transaction | null>(null);

  // 上拉展开手势：页面滚动到底后继续上拉，无缝跳转账单页
  const pullIndicatorRef = useRef<HTMLDivElement>(null);
  const pullStateRef = useRef<{ startY: number; pull: number; active: boolean }>({ startY: 0, pull: 0, active: false });
  const PULL_THRESHOLD = 72;
  const onGoToRecordsRef = useRef(onGoToRecords);
  onGoToRecordsRef.current = onGoToRecords;
  // 首页最后一条记录 id：上拉进入账单页时作为定位锚点，令两页内容无缝衔接
  const lastRecordIdRef = useRef<string | null>(null);
  lastRecordIdRef.current = recentTransactions.length
    ? recentTransactions[recentTransactions.length - 1].id
    : null;
  const hasOlderRef = useRef(hasOlderRecords);
  hasOlderRef.current = hasOlderRecords;
  // 弹窗（操作菜单/智能核对/趋势明细）打开时禁用上拉跳转，避免误触
  const modalOpenRef = useRef(false);
  modalOpenRef.current = actionTransaction !== null || confirmData !== null || trendDetailOpen;
  // 提示条文案随语言切换
  const pullTextsRef = useRef({ pull: '', release: '' });
  pullTextsRef.current = {
    pull: t('dashboard.pullToAllRecords'),
    release: t('dashboard.releaseToAllRecords'),
  };

  useEffect(() => {
    if (!hasOlderRecords) return;
    const atBottom = () =>
      window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;

    const onTouchStart = (e: TouchEvent) => {
      pullStateRef.current = { startY: e.touches[0].clientY, pull: 0, active: !modalOpenRef.current && atBottom() };
    };
    const onTouchMove = (e: TouchEvent) => {
      const s = pullStateRef.current;
      if (!s.active) return;
      // 是否到底只在 touchstart 判定一次：拖动时指示器撑高会改变 scrollHeight，重复判断会抖动
      const dy = s.startY - e.touches[0].clientY;
      s.pull = dy > 0 ? Math.min(dy, 140) : 0;
      const el = pullIndicatorRef.current;
      if (el) {
        el.style.transition = 'none';
        el.style.height = `${Math.min(s.pull, 72)}px`;
        el.style.opacity = `${Math.min(s.pull / 40, 1)}`;
        el.dataset.ready = s.pull >= PULL_THRESHOLD ? '1' : '0';
        const arrow = el.firstElementChild as HTMLElement | null;
        if (arrow) arrow.style.transform = s.pull >= PULL_THRESHOLD ? 'rotate(180deg)' : 'rotate(0deg)';
        const label = el.lastElementChild as HTMLElement | null;
        if (label) label.textContent = s.pull >= PULL_THRESHOLD ? pullTextsRef.current.release : pullTextsRef.current.pull;
      }
    };
    const onTouchEnd = () => {
      const s = pullStateRef.current;
      const el = pullIndicatorRef.current;
      if (s.pull >= PULL_THRESHOLD && hasOlderRef.current) {
        // 携带最后一条记录及其在当前视口中的位置：账单页据此把同一条记录放到同样的高度
        const id = lastRecordIdRef.current;
        if (id) {
          const cardEl = document.querySelector<HTMLElement>(`[data-record-id="${id}"]`);
          onGoToRecordsRef.current?.({ id, offsetY: cardEl ? cardEl.getBoundingClientRect().top : 0 });
        } else {
          onGoToRecordsRef.current?.();
        }
      }
      s.pull = 0;
      s.active = false;
      if (el) {
        el.style.transition = '';
        el.style.height = '0px';
        el.style.opacity = '0';
        el.dataset.ready = '0';
        const arrow = el.firstElementChild as HTMLElement | null;
        if (arrow) arrow.style.transform = 'rotate(0deg)';
      }
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [hasOlderRecords]);

  const balance = monthIncome - monthExpense;
  const animatedBalance = useCountUp(balance);
  const animatedTotalAssets = useCountUp(totalAssets);

  const quickTools = [
    { icon: ArrowLeftRight, labelKey: 'dashboard.toolTransfer', onClick: onGoToTransfer, color: 'var(--accent-transfer)', bg: 'var(--accent-transfer-soft)' },
    { icon: Repeat, labelKey: 'dashboard.toolRecurring', onClick: onGoToRecurring, color: 'var(--accent-recurring)', bg: 'var(--accent-recurring-soft)' },
    { icon: Bookmark, labelKey: 'dashboard.toolTemplates', onClick: onGoToTemplates, color: 'var(--accent-template)', bg: 'var(--accent-template-soft)' },
    { icon: PiggyBank, labelKey: 'dashboard.toolBudget', onClick: onGoToBudgets, color: 'var(--accent-budget)', bg: 'var(--accent-budget-soft)' },
  ];

  // 首页可配置卡片：仅渲染可见的，按 order 升序
  const sortedHomeCards = useMemo(
    () => homeCards.filter((c) => c.visible).sort((a, b) => a.order - b.order),
    [homeCards],
  );

  const renderHomeCard = (id: string) => {
    switch (id) {
      case 'monthOverview':
        return (
          <MonthOverviewCard
            key={id}
            balance={balance}
            animatedBalance={animatedBalance}
            monthIncome={monthIncome}
            monthExpense={monthExpense}
            assetsTrend={assetsTrend}
            onViewDetail={(f) => onViewDetail(f)}
            onTrendClick={() => setTrendDetailOpen(true)}
          />
        );
      case 'budget':
        return (
          <BudgetCard
            key={id}
            budgetSummary={budgetSummary}
            onGoToBudgets={() => onGoToBudgets?.()}
          />
        );
      case 'quickTools':
        return <QuickToolsCard key={id} tools={quickTools} />;
      case 'today':
        return (
          <TodayOverviewCard
            key={id}
            todayIncome={todayIncome}
            todayExpense={todayExpense}
            totalAssets={totalAssets}
            animatedTotalAssets={animatedTotalAssets}
            totalIncome={totalIncome}
            totalExpense={totalExpense}
            onViewDetail={(f) => onViewDetail(f)}
          />
        );
      case 'recent':
        return (
          <RecentRecordsCard
            key={id}
            transactions={recentTransactions}
            hasOlderRecords={hasOlderRecords}
            pullIndicatorRef={pullIndicatorRef}
            onEdit={(tx) => onEditTransaction?.(tx)}
            onDelete={(tx) => (onDeleteTransaction ?? ((t: Transaction) => deleteTransaction(t.id)))(tx)}
            onAction={(tx) => setActionTransaction(tx)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="page-root pb-nav overflow-y-auto">
      {/* 头部：问候 + 快捷图标 */}
      <div className="safe-top px-5 pt-2 pb-1 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight truncate" style={{ color: 'var(--ink)' }}>
            {t(greetingKey())}
          </h1>
          <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--ink-2)' }}>
            {new Date().toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
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

      {/* 首页可配置卡片：按 homeCards 的 order/visible 动态渲染 */}
      {sortedHomeCards.map((card) => renderHomeCard(card.id))}

      {/* 记账区域（快捷入口，完整记账在独立页面） */}
      <div className="px-4 mt-3">
        <div className="card p-3">
          {/* 智能输入（含历史备注补全候选与语音入口） */}
          <div ref={smartAreaRef} className="mb-2">
            <div
              className="flex items-center rounded-button px-2.5 py-2 border-2 transition-colors"
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
                className="flex-1 min-w-0 bg-transparent outline-none text-sm"
                style={{ color: 'var(--ink)' }}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={suggestionsOpen}
                aria-controls="smart-suggestion-list"
              />
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
                className="mt-1 mb-2 rounded-button overflow-hidden animate-fade-in divide-y divide-[color:var(--line)]"
                style={{ background: 'var(--card)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-card)' }}
              >
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => pickSuggestion(s)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm text-left transition-colors card-press hover:brightness-95"
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
              className="rounded-button px-2.5 py-2 mb-2 animate-stagger-in"
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
              <div className="flex gap-2 mt-1.5">
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
                  onClick={() => handleSmartSubmit(undefined, { forceEdit: true })}
                  className="flex-1 py-1.5 rounded-button text-xs font-medium transition-all flex items-center justify-center gap-1"
                  style={{ background: 'var(--paper)', color: 'var(--ink)', border: '1px solid var(--line)' }}
                >
                  <Pencil size={13} />
                  {t('dashboard.edit')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 智能记账核对浮层：确认后才入账，或跳完整记账页再改 */}
      <SmartConfirmSheet
        open={confirmData !== null}
        data={confirmData}
        categories={categories}
        accounts={accounts}
        onClose={() => setConfirmData(null)}
        onConfirm={handleConfirmSave}
        onEdit={handleConfirmEdit}
      />

      {/* 近 6 月资产趋势明细 */}
      <TrendDetailSheet
        open={trendDetailOpen}
        data={assetsTrend}
        onClose={() => setTrendDetailOpen(false)}
      />

      {/* 记录操作菜单：编辑 / 复制记一笔 / 存为模板 / 删除 */}
      <RecordActionSheet
        transaction={actionTransaction}
        onClose={() => setActionTransaction(null)}
        onEdit={onEditTransaction}
        onDuplicate={onDuplicateTransaction}
        onCreateTemplate={onCreateTemplate}
        onDelete={onDeleteTransaction}
      />
    </div>
  );
};

export const Dashboard = memo(DashboardComponent);
