import { useEffect, useMemo, memo, useState } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatCurrencyShort } from '../utils/format';
import { PieChart, Pie, Cell, Sector, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Settings as SettingsIcon } from 'lucide-react';

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
                      isAnimationActive={false}
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
                      isAnimationActive={false}
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
              <Bar dataKey="income" name="收入" fill={CHART_COLORS.income} radius={[6, 6, 0, 0]}>
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
              <Bar dataKey="expense" name="支出" fill={CHART_COLORS.expense} radius={[6, 6, 0, 0]}>
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
