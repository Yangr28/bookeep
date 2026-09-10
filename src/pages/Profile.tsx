import { useEffect, useMemo, memo, useState } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatCurrencyShort } from '../utils/format';
import { PieChart, Pie, Cell, Sector, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { Settings as SettingsIcon, ChevronDown, TrendingUp, TrendingDown, Award, Target } from 'lucide-react';

interface ProfileProps {
  onGoToSettings: () => void;
  onGoToCategories: () => void;
  onGoToDateSelect: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  selectedDate: Date;
}

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

const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

const ProfileComponent = ({ onGoToSettings, selectedDate }: ProfileProps) => {
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
      useStore.getState().transactions.forEach((t) => {
        const tDate = new Date(t.createdAt);
        if (tDate.getMonth() === month && tDate.getFullYear() === year) {
          if (t.type === 'income') income += t.amount;
          else expense += t.amount;
        }
      });
      data.push({ month: months[month], income: income || 0, expense: expense || 0, fullMonth: `${year}年${month + 1}月` });
    }
    return data;
  }, [transactions]);

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
    const dailyData: { day: string; 本月: number; 上月: number }[] = [];
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
        本月: showThisMonth ? thisMonth : 0,
        上月: prevMonth,
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

  const getBudgetColor = (pct: number) =>
    pct >= 100 ? 'var(--expense)' : pct >= 80 ? 'var(--expense-ink)' : pct >= 50 ? 'var(--primary-ink)' : 'var(--primary)';

  return (
    <div className="page-root pb-nav page-enter">
      {/* 页头 */}
      <div className="safe-top px-4 pt-3 pb-1 flex items-center justify-between">
        <div>
          <h1 className="page-title">我的</h1>
          <p className="page-subtitle">{selectedYear}年 {months[selectedMonth]} 财务概览</p>
        </div>
        <button onClick={onGoToSettings} className="icon-btn" aria-label="设置">
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
              <span className="section-title mb-0">月度报表</span>
            </div>
            <ChevronDown
              size={20}
              className={`transition-transform ${showReport ? 'rotate-180' : ''}`}
              style={{ color: 'var(--ink-2)' }}
            />
          </button>

          {showReport && (
            <div className="mt-4 space-y-3 animate-stagger-in">
              {/* 环比变化：本月 vs 上月 直接对比 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-button" style={{ background: 'var(--paper)' }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <TrendingUp size={14} style={{ color: 'var(--primary)' }} />
                    <span className="text-xs" style={{ color: 'var(--ink-2)' }}>收入对比</span>
                  </div>
                  <p className="text-base font-bold amount-num" style={{ color: 'var(--primary)' }}>
                    {formatCurrencyShort(monthIncome)}
                  </p>
                  <div className="flex items-center justify-between mt-1.5 pt-1.5" style={{ borderTop: '1px solid var(--line)' }}>
                    <span className="text-xs" style={{ color: 'var(--ink-2)' }}>上月</span>
                    <span className="text-xs amount-num" style={{ color: 'var(--ink-2)' }}>
                      {formatCurrencyShort(reportData.prevIncome)}
                    </span>
                  </div>
                  {reportData.prevIncome > 0 && (
                    <p className="text-xs font-semibold mt-1 amount-num" style={{ color: reportData.incomeChangeColor }}>
                      {reportData.incomeChange >= 0 ? '+' : ''}{reportData.incomeChange.toFixed(1)}%
                    </p>
                  )}
                </div>
                <div className="p-3 rounded-button" style={{ background: 'var(--paper)' }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <TrendingDown size={14} style={{ color: 'var(--expense)' }} />
                    <span className="text-xs" style={{ color: 'var(--ink-2)' }}>支出对比</span>
                  </div>
                  <p className="text-base font-bold amount-num" style={{ color: 'var(--expense)' }}>
                    {formatCurrencyShort(monthExpense)}
                  </p>
                  <div className="flex items-center justify-between mt-1.5 pt-1.5" style={{ borderTop: '1px solid var(--line)' }}>
                    <span className="text-xs" style={{ color: 'var(--ink-2)' }}>上月</span>
                    <span className="text-xs amount-num" style={{ color: 'var(--ink-2)' }}>
                      {formatCurrencyShort(reportData.prevExpense)}
                    </span>
                  </div>
                  {reportData.prevExpense > 0 && (
                    <p className="text-xs font-semibold mt-1 amount-num" style={{ color: reportData.expenseChangeColor }}>
                      {reportData.expenseChange >= 0 ? '+' : ''}{reportData.expenseChange.toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>

              {/* 每日支出曲线（本月 vs 上月） */}
              <div className="p-3 rounded-button" style={{ background: 'var(--paper)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>每日支出趋势</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--expense)' }} />
                      <span style={{ color: 'var(--ink-2)' }}>本月</span>
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      <span className="w-2.5 h-0.5 rounded-full" style={{ background: 'var(--ink-2)' }} />
                      <span style={{ color: 'var(--ink-2)' }}>上月</span>
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
                      labelFormatter={(label) => `${selectedMonth + 1}月${label}日`}
                    />
                    <Line type="monotone" dataKey="上月" stroke="var(--ink-2)" strokeWidth={1.5} strokeDasharray="3 3" dot={false} connectNulls />
                    <Line type="monotone" dataKey="本月" stroke="var(--expense)" strokeWidth={2} dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 日均支出 + 最大单笔 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-button" style={{ background: 'var(--paper)' }}>
                  <p className="text-xs" style={{ color: 'var(--ink-2)' }}>日均支出</p>
                  <p className="text-base font-bold amount-num mt-1" style={{ color: 'var(--ink)' }}>
                    {formatCurrencyShort(reportData.avgDailyExpense)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
                    {reportData.elapsedDays}/{reportData.daysInMonth}天
                  </p>
                </div>
                <div className="p-3 rounded-button" style={{ background: 'var(--paper)' }}>
                  <p className="text-xs" style={{ color: 'var(--ink-2)' }}>最大单笔</p>
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
                    <span className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>支出 Top3</span>
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
                    <span className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>预算执行</span>
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
                    <span className="text-xs" style={{ color: 'var(--ink-2)' }}>已用 {reportData.budgetPercentage.toFixed(0)}%</span>
                    <span className="text-xs font-medium" style={{ color: getBudgetColor(reportData.budgetPercentage) }}>
                      {reportData.budgetPercentage >= 100 ? '已超支' : reportData.budgetPercentage >= 80 ? '接近上限' : '正常'}
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
            <h2 className="section-title mb-0">本月支出分布</h2>
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
                      <span className="text-xs" style={{ color: 'var(--ink-2)' }}>点击分类查看</span>
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
            <p className="text-center text-sm py-8" style={{ color: 'var(--ink-2)' }}>暂无支出数据</p>
          )}
        </div>

        {/* 收入分布 */}
        {incomeData.length > 0 && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="section-title mb-0">本月收入分布</h2>
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
                      <span className="text-xs" style={{ color: 'var(--ink-2)' }}>点击分类查看</span>
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
          <h2 className="section-title">近 6 个月收支趋势</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyChartData} barSize={24}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART_COLORS.axis }} tickLine={false} axisLine={{ stroke: 'var(--line)' }} />
              <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.axis }} tickLine={false} axisLine={false} />
              <Bar dataKey="income" name="收入" fill={CHART_COLORS.income} radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={700} animationEasing="ease-out">
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
              <Bar dataKey="expense" name="支出" fill={CHART_COLORS.expense} radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={700} animationEasing="ease-out">
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
                    <span style={{ color: 'var(--ink-2)' }}>收入</span>
                    <span className="amount-num font-semibold" style={{ color: 'var(--primary)' }}>+{formatCurrencyShort(monthlyChartData[trendSelected].income)}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-sm">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--expense)' }} />
                    <span style={{ color: 'var(--ink-2)' }}>支出</span>
                    <span className="amount-num font-semibold" style={{ color: 'var(--expense)' }}>-{formatCurrencyShort(monthlyChartData[trendSelected].expense)}</span>
                  </span>
                </div>
                <span className="text-xs mt-1" style={{
                  color: (monthlyChartData[trendSelected].income - monthlyChartData[trendSelected].expense) >= 0 ? 'var(--primary)' : 'var(--expense)'
                }}>
                  结余 {(monthlyChartData[trendSelected].income - monthlyChartData[trendSelected].expense) >= 0 ? '+' : ''}
                  {formatCurrencyShort(monthlyChartData[trendSelected].income - monthlyChartData[trendSelected].expense)}
                </span>
              </div>
            ) : (
              <p className="text-center text-xs" style={{ color: 'var(--ink-2)' }}>点击柱体或下方月份查看月度明细</p>
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
