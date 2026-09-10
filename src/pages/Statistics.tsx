import { useState, useEffect, useMemo, memo } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatCurrencyShort } from '../utils/format';
import { PieChart, Pie, Cell, Sector, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, ChevronDown, CircleDot, TrendingUp, TrendingDown, Award, Target } from 'lucide-react';
interface StatisticsProps {
  onBack?: () => void;
  selectedDate: Date;
  onShowCalendar: () => void;
  onDateChange?: (date: Date) => void;
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

const StatisticsComponent = ({ selectedDate, onShowCalendar }: StatisticsProps) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const selectedMonth = selectedDate.getMonth();
  const selectedYear = selectedDate.getFullYear();

  const monthIncome = useStore((state) => state.getMonthIncome(selectedMonth, selectedYear));
  const monthExpense = useStore((state) => state.getMonthExpense(selectedMonth, selectedYear));
  const getTransactionsGroupedByCategory = useStore((state) => state.getTransactionsGroupedByCategory);

  const expenseData = getTransactionsGroupedByCategory('expense', selectedMonth, selectedYear);
  const incomeData = getTransactionsGroupedByCategory('income', selectedMonth, selectedYear);

  const months = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  const generateMonthlyData = () => {
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth();
      const year = date.getFullYear();

      let income = 0;
      let expense = 0;

      useStore.getState().transactions.forEach((t) => {
        const tDate = new Date(t.createdAt);
        if (tDate.getMonth() === month && tDate.getFullYear() === year) {
          if (t.type === 'income') {
            income += t.amount;
          } else {
            expense += t.amount;
          }
        }
      });

      data.push({
        month: months[month],
        income: income || 0,
        expense: expense || 0,
        fullMonth: `${year}年${month + 1}月`,
      });
    }
    return data;
  };

  const [showFullYear, setShowFullYear] = useState(false);

  const monthlyChartData = generateMonthlyData();
  const displayedChartData = showFullYear ? monthlyChartData : monthlyChartData.slice(-6);

  const monthBalance = monthIncome - monthExpense;

  // === 月度报表数据 ===
  const transactions = useStore((state) => state.transactions);
  const budgets = useStore((state) => state.budgets);
  const calculateBudgetUsage = useStore((state) => state.calculateBudgetUsage);
  const categories = useStore((state) => state.categories);

  const reportData = useMemo(() => {
    // 上月数据（环比）
    const prevDate = new Date(selectedYear, selectedMonth - 1, 1);
    const prevMonth = prevDate.getMonth();
    const prevYear = prevDate.getFullYear();
    let prevIncome = 0;
    let prevExpense = 0;
    transactions.forEach((t) => {
      const td = new Date(t.createdAt);
      if (td.getMonth() === prevMonth && td.getFullYear() === prevYear) {
        if (t.type === 'income') prevIncome += t.amount;
        else prevExpense += t.amount;
      }
    });

    // 本月交易明细
    const monthTx = transactions.filter((t) => {
      const td = new Date(t.createdAt);
      return td.getMonth() === selectedMonth && td.getFullYear() === selectedYear;
    });

    // 日均支出
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

    return {
      prevIncome, prevExpense,
      incomeChange: prevIncome ? ((monthIncome - prevIncome) / prevIncome) * 100 : 0,
      expenseChange: prevExpense ? ((monthExpense - prevExpense) / prevExpense) * 100 : 0,
      avgDailyExpense, maxExpense, top3Expense,
      totalBudget, totalBudgetSpent, budgetPercentage,
      daysInMonth, elapsedDays,
    };
  }, [transactions, selectedMonth, selectedYear, monthIncome, monthExpense, expenseData, categories, budgets, calculateBudgetUsage]);

  const [showReport, setShowReport] = useState(false);

  const getBudgetColor = (pct: number) =>
    pct >= 100 ? 'var(--expense)' : pct >= 80 ? 'var(--expense-ink)' : pct >= 50 ? 'var(--primary-ink)' : 'var(--primary)';

  return (
    <div className="page-root pb-nav">
      {/* 页头 */}
      <div className="safe-top px-4 pt-2 pb-1 flex items-center gap-3">
        <div className="flex-1">
          <h1 className="page-title">统计报表</h1>
          <p className="page-subtitle">查看您的财务数据</p>
        </div>
      </div>

      <div className="px-4 mt-3">
        {/* 月份选择 + 收支概览 */}
        <div className="card p-5">
          <button
            onClick={onShowCalendar}
            className="flex items-center justify-start gap-3 w-full mb-5"
          >
            <div className="p-2.5 rounded-button" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
              <Calendar size={20} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                {selectedYear}年 {months[selectedMonth]}
              </span>
              <ChevronDown size={20} style={{ color: 'var(--ink-2)' }} />
            </div>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-4 rounded-button" style={{ background: 'var(--paper)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>本月收入</p>
              <p className="text-2xl font-bold amount-num mt-2" style={{ color: 'var(--primary)' }}>
                {formatCurrencyShort(monthIncome)}
              </p>
            </div>
            <div className="text-center p-4 rounded-button" style={{ background: 'var(--paper)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>本月支出</p>
              <p className="text-2xl font-bold amount-num mt-2" style={{ color: 'var(--expense)' }}>
                {formatCurrencyShort(monthExpense)}
              </p>
            </div>
          </div>

          <div className="mt-3 p-4 rounded-button" style={{ background: 'var(--paper)' }}>
            <p className="text-sm text-center font-medium" style={{ color: 'var(--ink-2)' }}>本月结余</p>
            <p
              className="text-3xl font-bold text-center amount-num mt-2"
              style={{ color: monthBalance >= 0 ? 'var(--primary)' : 'var(--expense)' }}
            >
              {formatCurrencyShort(monthBalance)}
            </p>
          </div>
        </div>

        {/* 月度报表（可展开/收起） */}
        <div className="card p-4 mt-3">
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
              {/* 环比变化 */}
              {(() => {
                const incomeColor = reportData.incomeChange >= 0 ? 'var(--primary)' : 'var(--expense)';
                const expenseColor = reportData.expenseChange > 0 ? 'var(--expense)' : 'var(--primary)';
                return (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-button" style={{ background: 'var(--paper)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp size={14} style={{ color: 'var(--primary)' }} />
                    <span className="text-xs" style={{ color: 'var(--ink-2)' }}>收入环比</span>
                  </div>
                  <p className="text-lg font-bold amount-num" style={{ color: incomeColor }}>
                    {reportData.prevIncome > 0
                      ? `${reportData.incomeChange >= 0 ? '+' : ''}${reportData.incomeChange.toFixed(1)}%`
                      : '新建月'}
                  </p>
                  <p className="text-xs mt-0.5 amount-num" style={{ color: 'var(--ink-2)' }}>
                    上月 ¥{formatCurrencyShort(reportData.prevIncome)}
                  </p>
                </div>
                <div className="p-3 rounded-button" style={{ background: 'var(--paper)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingDown size={14} style={{ color: 'var(--expense)' }} />
                    <span className="text-xs" style={{ color: 'var(--ink-2)' }}>支出环比</span>
                  </div>
                  <p className="text-lg font-bold amount-num" style={{ color: expenseColor }}>
                    {reportData.prevExpense > 0
                      ? `${reportData.expenseChange >= 0 ? '+' : ''}${reportData.expenseChange.toFixed(1)}%`
                      : '新建月'}
                  </p>
                  <p className="text-xs mt-0.5 amount-num" style={{ color: 'var(--ink-2)' }}>
                    上月 ¥{formatCurrencyShort(reportData.prevExpense)}
                  </p>
                </div>
              </div>
                );
              })()}

              {/* 日均支出 + 最大单笔 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-button" style={{ background: 'var(--paper)' }}>
                  <p className="text-xs" style={{ color: 'var(--ink-2)' }}>日均支出</p>
                  <p className="text-lg font-bold amount-num mt-1" style={{ color: 'var(--ink)' }}>
                    ¥{formatCurrencyShort(reportData.avgDailyExpense)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
                    {reportData.elapsedDays}/{reportData.daysInMonth}天
                  </p>
                </div>
                <div className="p-3 rounded-button" style={{ background: 'var(--paper)' }}>
                  <p className="text-xs" style={{ color: 'var(--ink-2)' }}>最大单笔</p>
                  <p className="text-lg font-bold amount-num mt-1" style={{ color: 'var(--expense)' }}>
                    ¥{formatCurrencyShort(reportData.maxExpense)}
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
                          ¥{formatCurrencyShort(item.total)}
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
                      ¥{formatCurrencyShort(reportData.totalBudgetSpent)} / ¥{formatCurrencyShort(reportData.totalBudget)}
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
        <div className="card p-4 mt-3">
          <h2 className="section-title">支出分布</h2>
          {expenseData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={expenseData.map((item) => ({
                      name: item.category.name,
                      value: item.total,
                      color: item.category.color,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    activeShape={(props) => <Sector {...props} stroke="none" strokeWidth={0} />}
                    isAnimationActive={true}
                    animationDuration={700}
                    animationEasing="ease-out"
                  >
                    {expenseData.map((item, index) => (
                      <Cell key={`cell-${index}`} fill={item.category.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`¥${formatCurrency(value)}`, '金额']}
                    contentStyle={TOOLTIP_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full mt-2 flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
                {expenseData.map((item, index) => (
                  <div key={`legend-${index}`} className="flex items-center gap-1.5 px-2 py-1 rounded-full">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.category.color }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--ink)' }}>{item.category.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--paper-deep)' }}>
                <CircleDot size={28} style={{ color: 'var(--ink-2)' }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>暂无支出数据</p>
            </div>
          )}
        </div>

        {/* 收入分布 */}
        <div className="card p-4 mt-3">
          <h2 className="section-title">收入分布</h2>
          {incomeData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={incomeData.map((item) => ({
                      name: item.category.name,
                      value: item.total,
                      color: item.category.color,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    activeShape={(props) => <Sector {...props} stroke="none" strokeWidth={0} />}
                    isAnimationActive={true}
                    animationDuration={700}
                    animationEasing="ease-out"
                  >
                    {incomeData.map((item, index) => (
                      <Cell key={`cell-${index}`} fill={item.category.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`¥${formatCurrency(value)}`, '金额']}
                    contentStyle={TOOLTIP_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full mt-2 flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
                {incomeData.map((item, index) => (
                  <div key={`legend-${index}`} className="flex items-center gap-1.5 px-2 py-1 rounded-full">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.category.color }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--ink)' }}>{item.category.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--paper-deep)' }}>
                <CircleDot size={28} style={{ color: 'var(--ink-2)' }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>暂无收入数据</p>
            </div>
          )}
        </div>

        {/* 收支趋势 */}
        <div className="card p-4 mt-3 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">收支趋势</h2>
            <button
              onClick={() => setShowFullYear(!showFullYear)}
              className="chip text-xs"
              style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
            >
              {showFullYear ? '收起' : '查看全年'}
              <ChevronDown
                size={16}
                className={`transition-transform ${showFullYear ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
          <div className="overflow-x-auto pb-2">
            <div className="min-w-max px-1">
              <ResponsiveContainer width={showFullYear ? 520 : 320} height={240}>
                <BarChart data={displayedChartData} barSize={showFullYear ? 22 : 30}>
                  <XAxis
                    dataKey="fullMonth"
                    tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                    tickFormatter={(value: string) => value.replace(/^\d+年/, '')}
                    interval={0}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--line)' }}
                  />
                  <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.axis }} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value: number) => [`¥${formatCurrency(value)}`, '']}
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: CHART_COLORS.cursor }}
                  />
                  <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12, color: 'var(--ink-2)' }} />
                  <Bar dataKey="income" name="收入" fill={CHART_COLORS.income} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expense" name="支出" fill={CHART_COLORS.expense} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Statistics = memo(StatisticsComponent);
