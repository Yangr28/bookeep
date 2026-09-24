import { useEffect, useMemo, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { formatCurrency, formatCurrencyShort } from '../utils/format';
import { generateInsights, Insight, InsightSeverity } from '../utils/insights';
import { PieChart, Pie, Cell, Sector, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Settings as SettingsIcon, ChevronDown, TrendingUp, TrendingDown, Award, Target, Sparkles, AlertTriangle, AlertOctagon, Zap, Repeat, Flame, ChevronRight } from 'lucide-react';

interface ProfileProps {
  onGoToSettings: () => void;
  onGoToCategories: () => void;
  onGoToDateSelect: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  selectedDate: Date;
  /** 洞察点击：带分类跳分类明细，否则跳当月支出明细 */
  onInsightClick: (payload: { categoryId?: string; transactionIds?: string[]; month?: string }) => void;
}

const SEVERITY_STYLE: Record<InsightSeverity, { bg: string; color: string }> = {
  danger: { bg: 'var(--expense-soft)', color: 'var(--expense)' },
  warning: { bg: 'var(--expense-soft)', color: 'var(--expense-ink)' },
  info: { bg: 'var(--primary-soft)', color: 'var(--primary)' },
};

/** 右侧展示关联金额的洞察类型 */
const AMOUNT_TYPES = new Set<Insight['type']>([
  'budget_overrun',
  'budget_warning',
  'forecast_overrun',
  'large_expense',
  'recurring',
]);

const InsightRow = memo(({ insight, index, onClick, t }: {
  insight: Insight;
  index: number;
  onClick: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) => {
  const severity = SEVERITY_STYLE[insight.severity];
  const clickable = !!insight.payload;

  let Icon = Sparkles;
  if (insight.type === 'anomaly_mom') {
    Icon = insight.titleParams?.direction === 'down' ? TrendingDown : TrendingUp;
  } else if (insight.type === 'budget_overrun') {
    Icon = AlertOctagon;
  } else if (insight.type === 'budget_warning' || insight.type === 'forecast_overrun') {
    Icon = AlertTriangle;
  } else if (insight.type === 'large_expense') {
    Icon = Zap;
  } else if (insight.type === 'recurring') {
    Icon = Repeat;
  } else if (insight.type === 'frequent') {
    Icon = Flame;
  }

  // direction 是引擎占位符（up/down），翻译为当前语言词汇后再插值
  const mapParams = (params?: Record<string, string | number>) => {
    if (!params) return undefined;
    return {
      ...params,
      ...(params.direction !== undefined
        ? { direction: t(params.direction === 'down' ? 'insights.directionDown' : 'insights.directionUp') }
        : {}),
    };
  };

  const content = (
    <>
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: severity.bg, color: severity.color }}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: 'var(--ink)' }}>
          {t(insight.titleKey, mapParams(insight.titleParams))}
        </p>
        <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--ink-2)' }}>
          {t(insight.descriptionKey, mapParams(insight.descriptionParams))}
        </p>
      </div>
      {insight.amount !== undefined && AMOUNT_TYPES.has(insight.type) && (
        <span className="text-xs font-semibold amount-num flex-shrink-0 ml-2" style={{ color: severity.color }}>
          {formatCurrency(insight.amount)}
        </span>
      )}
      {clickable && <ChevronRight size={15} className="flex-shrink-0 ml-1" style={{ color: 'var(--ink-2)' }} />}
    </>
  );

  const cls = 'w-full flex items-center gap-2.5 p-2.5 rounded-button text-left animate-fade-in';

  return clickable ? (
    <button type="button" onClick={onClick} className={`${cls} card-press`} style={{ animationDelay: `${index * 60}ms` }}>
      {content}
    </button>
  ) : (
    <div className={cls} style={{ animationDelay: `${index * 60}ms` }}>{content}</div>
  );
});

const CHART_COLORS = {
  income: 'var(--primary)',
  expense: 'var(--expense)',
  axis: 'var(--ink-2)',
  cursor: 'var(--shadow-card)',
};

const TOOLTIP_STYLE = {
  borderRadius: '14px',
  border: '1px solid var(--line)',
  background: 'var(--card)',
  color: 'var(--ink)',
  boxShadow: 'var(--shadow-card)',
};

const ProfileComponent = ({ onGoToSettings, selectedDate, onInsightClick }: ProfileProps) => {
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const selectedMonth = selectedDate.getMonth();
  const selectedYear = selectedDate.getFullYear();

  // 饼图选中状态（点击切片时高亮中心区域）
  const [expenseSelected, setExpenseSelected] = useState<number | null>(null);
  const [incomeSelected, setIncomeSelected] = useState<number | null>(null);
  // 柱状图选中状态（点击某月柱状时高亮，淡化其他）
  const [trendSelected, setTrendSelected] = useState<number | null>(null);

  const transactions = useStore((state) => state.transactions);
  const monthIncome = useStore((state) => state.getMonthIncome(selectedMonth, selectedYear));
  const monthExpense = useStore((state) => state.getMonthExpense(selectedMonth, selectedYear));
  const getTransactionsGroupedByCategory = useStore((state) => state.getTransactionsGroupedByCategory);

  const expenseData = useMemo(() => getTransactionsGroupedByCategory('expense', selectedMonth, selectedYear), [getTransactionsGroupedByCategory, selectedMonth, selectedYear]);
  const incomeData = useMemo(() => getTransactionsGroupedByCategory('income', selectedMonth, selectedYear), [getTransactionsGroupedByCategory, selectedMonth, selectedYear]);

  const monthlyChartData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth();
      const year = date.getFullYear();
      let income = 0;
      let expense = 0;
      useStore.getState().transactions.forEach((tx) => {
        const tDate = new Date(tx.createdAt);
        if (tDate.getMonth() === month && tDate.getFullYear() === year) {
          if (tx.type === 'income') income += tx.amount;
          else expense += tx.amount;
        }
      });
      data.push({
        month: t(`calendar.month${month + 1}`),
        income: income || 0,
        expense: expense || 0,
        fullMonth: t('profile.fullMonth', { year, month: month + 1 }),
      });
    }
    return data;
  }, [transactions, t]);

  // === 月度报表数据 ===
  const categories = useStore((state) => state.categories);
  const budgets = useStore((state) => state.budgets);
  const calculateBudgetUsage = useStore((state) => state.calculateBudgetUsage);
  const [showReport, setShowReport] = useState(false);

  const reportData = useMemo(() => {
    // 上月数据（环比）
    const prevDate = new Date(selectedYear, selectedMonth - 1, 1);
    let prevIncome = 0;
    let prevExpense = 0;
    transactions.forEach((t) => {
      const td = new Date(t.createdAt);
      if (td.getMonth() === prevDate.getMonth() && td.getFullYear() === prevDate.getFullYear()) {
        if (t.type === 'income') prevIncome += t.amount;
        else prevExpense += t.amount;
      }
    });

    // 本月交易明细
    const monthTx = transactions.filter((t) => {
      const td = new Date(t.createdAt);
      return td.getMonth() === selectedMonth && td.getFullYear() === selectedYear;
    });

    // 日均支出（当月按已过天数，历史月按全月）
    const now = new Date();
    const isCurrentMonth = now.getMonth() === selectedMonth && now.getFullYear() === selectedYear;
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const elapsedDays = isCurrentMonth ? now.getDate() : daysInMonth;
    const avgDailyExpense = elapsedDays > 0 ? monthExpense / elapsedDays : 0;

    // 最大单笔支出
    const maxExpense = monthTx
      .filter((t) => t.type === 'expense')
      .reduce((max, t) => (t.amount > max ? t.amount : max), 0);

    // Top3 支出分类
    const top3Expense = [...expenseData].sort((a, b) => b.total - a.total).slice(0, 3);

    // 预算汇总
    const currentMonthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    let totalBudget = 0;
    let totalBudgetSpent = 0;
    categories.filter(c => c.type === 'expense').forEach(c => {
      const u = calculateBudgetUsage(c.id, currentMonthStr, transactions);
      if (u.budget > 0) {
        totalBudget += u.budget;
        totalBudgetSpent += u.spent;
      }
    });
    const budgetPercentage = totalBudget ? Math.min((totalBudgetSpent / totalBudget) * 100, 100) : 0;

    // 每日支出曲线（本月 + 上月对比）
    const dailyData: { day: string; thisMonth: number; prevMonth: number }[] = [];
    const prevDaysInMonth = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).getDate();
    const maxDays = Math.max(daysInMonth, prevDaysInMonth);
    for (let d = 1; d <= maxDays; d++) {
      let thisMonth = 0;
      let prevMonth = 0;
      monthTx.forEach((t) => {
        if (t.type === 'expense' && new Date(t.createdAt).getDate() === d) thisMonth += t.amount;
      });
      if (d <= prevDaysInMonth) {
        transactions.forEach((t) => {
          const td = new Date(t.createdAt);
          if (t.type === 'expense' && td.getMonth() === prevDate.getMonth() && td.getFullYear() === prevDate.getFullYear() && td.getDate() === d) {
            prevMonth += t.amount;
          }
        });
      }
      // 当月未到的天数不显示本月数据（设为 null 占位但 recharts 需要数字，用 0 但只显示到 elapsedDays）
      const showThisMonth = d <= elapsedDays;
      dailyData.push({
        day: `${d}`,
        thisMonth: showThisMonth ? thisMonth : 0,
        prevMonth,
      });
    }

    return {
      prevIncome, prevExpense,
      incomeChange: prevIncome ? ((monthIncome - prevIncome) / prevIncome) * 100 : 0,
      expenseChange: prevExpense ? ((monthExpense - prevExpense) / prevExpense) * 100 : 0,
      incomeChangeColor: (prevIncome ? (monthIncome - prevIncome) : 0) >= 0 ? 'var(--primary)' : 'var(--expense)',
      expenseChangeColor: (prevExpense ? (monthExpense - prevExpense) : 0) > 0 ? 'var(--expense)' : 'var(--primary)',
      avgDailyExpense, maxExpense, top3Expense,
      totalBudget, totalBudgetSpent, budgetPercentage,
      daysInMonth, elapsedDays, dailyData,
    };
  }, [transactions, selectedMonth, selectedYear, monthIncome, monthExpense, expenseData, categories, budgets, calculateBudgetUsage]);

  // === 智能洞察（引擎口径为当前自然月；查看历史月份时不渲染，避免口径错位） ===
  const isViewingCurrentMonth = (() => {
    const now = new Date();
    return selectedYear === now.getFullYear() && selectedMonth === now.getMonth();
  })();

  const insightList = useMemo(() => {
    if (!isViewingCurrentMonth) return [];
    const monthTx = transactions.filter((t) => {
      const td = new Date(t.createdAt);
      return td.getMonth() === selectedMonth && td.getFullYear() === selectedYear;
    });
    const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    const insightBudgets = budgets
      .filter((b) => b.month === monthKey && b.amount > 0)
      .map((b) => ({ id: b.id, categoryId: b.categoryId, amount: b.amount, spent: b.spent, month: b.month }));
    return generateInsights({
      currentMonthTransactions: monthTx,
      allTransactions: transactions,
      budgets: insightBudgets,
      categories: categories.map((c) => ({ id: c.id, name: c.name, type: c.type })),
    });
  }, [transactions, budgets, categories, selectedMonth, selectedYear, isViewingCurrentMonth]);

  const getBudgetColor = (pct: number) =>
    pct >= 100 ? 'var(--expense)' : pct >= 80 ? 'var(--expense-ink)' : pct >= 50 ? 'var(--primary-ink)' : 'var(--primary)';

  return (
    <div className="page-root pb-nav page-enter">
      {/* 页头 */}
      <div className="safe-top px-4 pt-3 pb-1 flex items-center justify-between">
        <div>
          <h1 className="page-title">{t('nav.profile')}</h1>
          <p className="page-subtitle">{t('profile.headerSubtitle', { year: selectedYear, month: t(`calendar.month${selectedMonth + 1}`) })}</p>
        </div>
        <button onClick={onGoToSettings} className="icon-btn" aria-label={t('dashboard.settings')}>
          <SettingsIcon size={22} />
        </button>
      </div>

      <div className="px-4 mt-3 space-y-3">
        {/* 月度报表（可展开/收起）——财务概览前置 */}
        <div className="card p-4">
          <button
            onClick={() => setShowReport(!showReport)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-button" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                <Target size={18} />
              </div>
              <span className="section-title mb-0">{t('profile.monthReport')}</span>
            </div>
            <ChevronDown
              size={20}
              className={`transition-transform ${showReport ? 'rotate-180' : ''}`}
              style={{ color: 'var(--ink-2)' }}
            />
          </button>

          {showReport && (
            <div className="mt-4 space-y-3 animate-stagger-in">
              {/* 智能洞察（仅当前自然月） */}
              {isViewingCurrentMonth && (
                <div className="p-3 rounded-button" style={{ background: 'var(--paper)' }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles size={14} style={{ color: 'var(--primary)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>{t('insights.title')}</span>
                  </div>
                  {insightList.length > 0 ? (
                    <div className="space-y-1">
                      {insightList.map((insight, idx) => (
                        <InsightRow
                          key={`${insight.type}-${insight.payload?.categoryId ?? idx}`}
                          insight={insight}
                          index={idx}
                          onClick={() => insight.payload && onInsightClick(insight.payload)}
                          t={t}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="empty-inline">{t('insights.empty')}</p>
                  )}
                </div>
              )}

              {/* 收入/支出环比：环比百分比置顶，本月与上月在下方左右对齐对比 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-button flex flex-col" style={{ background: 'var(--paper)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp size={14} style={{ color: 'var(--primary)' }} />
                    <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('profile.incomeMom')}</span>
                  </div>
                  <p className="text-lg font-bold amount-num leading-tight" style={{ color: reportData.prevIncome > 0 ? reportData.incomeChangeColor : 'var(--ink-2)' }}>
                    {reportData.prevIncome > 0
                      ? `${reportData.incomeChange >= 0 ? '+' : ''}${reportData.incomeChange.toFixed(1)}%`
                      : t('profile.newMonth')}
                  </p>
                  <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('profile.thisMonth')}</span>
                      <span className="text-sm font-semibold amount-num" style={{ color: 'var(--ink)' }}>
                        {formatCurrencyShort(monthIncome)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('profile.lastMonth')}</span>
                      <span className="text-sm font-semibold amount-num" style={{ color: 'var(--ink-2)' }}>
                        {formatCurrencyShort(reportData.prevIncome)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-button flex flex-col" style={{ background: 'var(--paper)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingDown size={14} style={{ color: 'var(--expense)' }} />
                    <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('profile.expenseMom')}</span>
                  </div>
                  <p className="text-lg font-bold amount-num leading-tight" style={{ color: reportData.prevExpense > 0 ? reportData.expenseChangeColor : 'var(--ink-2)' }}>
                    {reportData.prevExpense > 0
                      ? `${reportData.expenseChange >= 0 ? '+' : ''}${reportData.expenseChange.toFixed(1)}%`
                      : t('profile.newMonth')}
                  </p>
                  <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('profile.thisMonth')}</span>
                      <span className="text-sm font-semibold amount-num" style={{ color: 'var(--ink)' }}>
                        {formatCurrencyShort(monthExpense)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('profile.lastMonth')}</span>
                      <span className="text-sm font-semibold amount-num" style={{ color: 'var(--ink-2)' }}>
                        {formatCurrencyShort(reportData.prevExpense)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 每日支出曲线（本月 vs 上月） */}
              <div className="p-3 rounded-button" style={{ background: 'var(--paper)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>{t('profile.dailyTrend')}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--expense)' }} />
                      <span style={{ color: 'var(--ink-2)' }}>{t('profile.thisMonth')}</span>
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      <span className="w-2.5 h-0.5 rounded-full" style={{ background: 'var(--ink-2)' }} />
                      <span style={{ color: 'var(--ink-2)' }}>{t('profile.lastMonth')}</span>
                    </span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={reportData.dailyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'var(--ink-2)' }} tickLine={false} axisLine={false} interval={4} />
                    <YAxis tick={{ fontSize: 9, fill: 'var(--ink-2)' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelStyle={{ fontSize: 11 }}
                      formatter={(value: number) => [formatCurrencyShort(value), '']}
                      labelFormatter={(label) => t('profile.dailyTooltipDay', { month: selectedMonth + 1, day: String(label) })}
                    />
                    <Line type="monotone" dataKey="prevMonth" stroke="var(--ink-2)" strokeWidth={1.5} strokeDasharray="3 3" dot={false} connectNulls />
                    <Line type="monotone" dataKey="thisMonth" stroke="var(--expense)" strokeWidth={2} dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 日均支出 + 最大单笔 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-button" style={{ background: 'var(--paper)' }}>
                  <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('profile.avgDaily')}</p>
                  <p className="text-base font-bold amount-num mt-1" style={{ color: 'var(--ink)' }}>
                    {formatCurrencyShort(reportData.avgDailyExpense)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
                    {t('profile.dayProgress', { elapsed: reportData.elapsedDays, total: reportData.daysInMonth })}
                  </p>
                </div>
                <div className="p-3 rounded-button" style={{ background: 'var(--paper)' }}>
                  <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('profile.maxSingle')}</p>
                  <p className="text-base font-bold amount-num mt-1" style={{ color: 'var(--expense)' }}>
                    {formatCurrencyShort(reportData.maxExpense)}
                  </p>
                </div>
              </div>

              {/* Top3 支出分类 */}
              {reportData.top3Expense.length > 0 && (
                <div className="p-3 rounded-button" style={{ background: 'var(--paper)' }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Award size={14} style={{ color: 'var(--expense)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>{t('profile.top3')}</span>
                  </div>
                  <div className="space-y-2">
                    {reportData.top3Expense.map((item, idx) => (
                      <div key={item.category.id} className="flex items-center gap-2">
                        <span className="text-xs font-bold w-4" style={{ color: 'var(--ink-2)' }}>{idx + 1}</span>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.category.color }} />
                        <span className="text-sm flex-1 truncate" style={{ color: 'var(--ink)' }}>{item.category.name}</span>
                        <span className="text-sm font-semibold amount-num" style={{ color: 'var(--ink)' }}>
                          {formatCurrencyShort(item.total)}
                        </span>
                        <span className="text-xs amount-num w-12 text-right" style={{ color: 'var(--ink-2)' }}>
                          {monthExpense > 0 ? `${((item.total / monthExpense) * 100).toFixed(0)}%` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 预算执行进度 */}
              {reportData.totalBudget > 0 && (
                <div className="p-3 rounded-button" style={{ background: 'var(--paper)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>{t('profile.budgetExecution')}</span>
                    <span className="text-xs amount-num" style={{ color: 'var(--ink-2)' }}>
                      {formatCurrencyShort(reportData.totalBudgetSpent)} / {formatCurrencyShort(reportData.totalBudget)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--paper-deep)' }}>
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${reportData.budgetPercentage}%`, background: getBudgetColor(reportData.budgetPercentage) }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('profile.usedPct', { pct: reportData.budgetPercentage.toFixed(0) })}</span>
                    <span className="text-xs font-medium" style={{ color: getBudgetColor(reportData.budgetPercentage) }}>
                      {reportData.budgetPercentage >= 100 ? t('profile.statusOver') : reportData.budgetPercentage >= 80 ? t('profile.statusNearLimit') : t('profile.statusNormal')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 支出分布 */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="section-title mb-0">{t('profile.expenseDistribution')}</h2>
            <span className="text-sm font-semibold amount-num" style={{ color: 'var(--expense)' }}>{formatCurrencyShort(monthExpense)}</span>
          </div>
          {expenseData.length > 0 ? (
            <div className="flex flex-col items-center">
              <div className="relative w-full" style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseData.map((item) => ({ name: item.category.name, value: item.total, color: item.category.color }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={true}
                      animationDuration={700}
                      animationEasing="ease-out"
                      activeShape={(props) => <Sector {...props} stroke="none" strokeWidth={0} />}
                      onMouseDown={(_entry, index) => setExpenseSelected((prev) => (prev === index ? null : index))}
                    >
                      {expenseData.map((item, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={item.category.color}
                          opacity={expenseSelected === null || expenseSelected === index ? 1 : 0.35}
                          style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* 中心显示区 */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  {expenseSelected !== null && expenseData[expenseSelected] ? (
                    <>
                      <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{expenseData[expenseSelected].category.name}</span>
                      <span className="text-lg font-bold amount-num mt-0.5" style={{ color: 'var(--ink)' }}>
                        {formatCurrencyShort(expenseData[expenseSelected].total)}
                      </span>
                      <span className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
                        {monthExpense > 0 ? `${(expenseData[expenseSelected].total / monthExpense * 100).toFixed(1)}%` : '0%'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('profile.tapCategory')}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="w-full mt-2 flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
                {expenseData.slice(0, 8).map((item, index) => (
                  <button
                    key={`legend-${index}`}
                    onClick={() => setExpenseSelected((prev) => (prev === index ? null : index))}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-colors ${expenseSelected === index ? 'bg-[var(--paper-deep)]' : ''}`}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.category.color }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--ink)' }}>{item.category.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-sm py-8" style={{ color: 'var(--ink-2)' }}>{t('profile.noExpenseData')}</p>
          )}
        </div>

        {/* 收入分布 */}
        {incomeData.length > 0 && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="section-title mb-0">{t('profile.incomeDistribution')}</h2>
              <span className="text-sm font-semibold amount-num" style={{ color: 'var(--primary)' }}>{formatCurrencyShort(monthIncome)}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="relative w-full" style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incomeData.map((item) => ({ name: item.category.name, value: item.total, color: item.category.color }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={true}
                      animationDuration={700}
                      animationEasing="ease-out"
                      activeShape={(props) => <Sector {...props} stroke="none" strokeWidth={0} />}
                      onMouseDown={(_entry, index) => setIncomeSelected((prev) => (prev === index ? null : index))}
                    >
                      {incomeData.map((item, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={item.category.color}
                          opacity={incomeSelected === null || incomeSelected === index ? 1 : 0.35}
                          style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* 中心显示区 */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  {incomeSelected !== null && incomeData[incomeSelected] ? (
                    <>
                      <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{incomeData[incomeSelected].category.name}</span>
                      <span className="text-lg font-bold amount-num mt-0.5" style={{ color: 'var(--ink)' }}>
                        {formatCurrencyShort(incomeData[incomeSelected].total)}
                      </span>
                      <span className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
                        {monthIncome > 0 ? `${(incomeData[incomeSelected].total / monthIncome * 100).toFixed(1)}%` : '0%'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('profile.tapCategory')}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="w-full mt-2 flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
                {incomeData.slice(0, 8).map((item, index) => (
                  <button
                    key={`legend-${index}`}
                    onClick={() => setIncomeSelected((prev) => (prev === index ? null : index))}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-colors ${incomeSelected === index ? 'bg-[var(--paper-deep)]' : ''}`}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.category.color }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--ink)' }}>{item.category.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 6个月收支趋势 */}
        <div className="card p-4">
          <h2 className="section-title">{t('profile.trend6m')}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyChartData} barSize={24}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART_COLORS.axis }} tickLine={false} axisLine={{ stroke: 'var(--line)' }} />
              <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.axis }} tickLine={false} axisLine={false} />
              <Bar dataKey="income" name={t('common.income')} fill={CHART_COLORS.income} radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={700} animationEasing="ease-out">
                {monthlyChartData.map((_, index) => (
                  <Cell
                    key={`income-${index}`}
                    fill={CHART_COLORS.income}
                    opacity={trendSelected === null || trendSelected === index ? 1 : 0.3}
                    style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                    onMouseDown={() => setTrendSelected((prev) => (prev === index ? null : index))}
                  />
                ))}
              </Bar>
              <Bar dataKey="expense" name={t('common.expense')} fill={CHART_COLORS.expense} radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={700} animationEasing="ease-out">
                {monthlyChartData.map((_, index) => (
                  <Cell
                    key={`expense-${index}`}
                    fill={CHART_COLORS.expense}
                    opacity={trendSelected === null || trendSelected === index ? 1 : 0.3}
                    style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                    onMouseDown={() => setTrendSelected((prev) => (prev === index ? null : index))}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* 月度明细 + 月份胶囊 */}
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
            {trendSelected !== null && monthlyChartData[trendSelected] ? (
              <div className="flex flex-col items-center text-center">
                <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{monthlyChartData[trendSelected].fullMonth}</span>
                <div className="flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1.5 text-sm">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--primary)' }} />
                    <span style={{ color: 'var(--ink-2)' }}>{t('common.income')}</span>
                    <span className="amount-num font-semibold" style={{ color: 'var(--primary)' }}>+{formatCurrencyShort(monthlyChartData[trendSelected].income)}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-sm">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--expense)' }} />
                    <span style={{ color: 'var(--ink-2)' }}>{t('common.expense')}</span>
                    <span className="amount-num font-semibold" style={{ color: 'var(--expense)' }}>-{formatCurrencyShort(monthlyChartData[trendSelected].expense)}</span>
                  </span>
                </div>
                <span className="text-xs mt-1" style={{
                  color: (monthlyChartData[trendSelected].income - monthlyChartData[trendSelected].expense) >= 0 ? 'var(--primary)' : 'var(--expense)'
                }}>
                  {t('profile.balance')} {(monthlyChartData[trendSelected].income - monthlyChartData[trendSelected].expense) >= 0 ? '+' : ''}
                  {formatCurrencyShort(monthlyChartData[trendSelected].income - monthlyChartData[trendSelected].expense)}
                </span>
              </div>
            ) : (
              <p className="text-center text-xs" style={{ color: 'var(--ink-2)' }}>{t('profile.tapBarHint')}</p>
            )}
            {/* 月份胶囊 */}
            <div className="flex flex-wrap gap-x-2 gap-y-1 justify-center mt-2">
              {monthlyChartData.map((item, index) => (
                <button
                  key={`month-${index}`}
                  onClick={() => setTrendSelected((prev) => (prev === index ? null : index))}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${trendSelected === index ? 'bg-[var(--paper-deep)]' : ''}`}
                  style={{ color: 'var(--ink)' }}
                >
                  {item.month}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Profile = memo(ProfileComponent);
