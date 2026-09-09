import { useEffect, useMemo, memo, useState } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatCurrencyShort } from '../utils/format';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
        {/* 6个月收支趋势 */}
        <div className="card p-4">
          <h2 className="section-title">近 6 个月收支趋势</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyChartData} barSize={24}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART_COLORS.axis }} tickLine={false} axisLine={{ stroke: 'var(--line)' }} />
              <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.axis }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value: number) => [`¥${formatCurrency(value)}`, '']} contentStyle={TOOLTIP_STYLE} cursor={{ fill: CHART_COLORS.cursor }} />
              <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12, color: 'var(--ink-2)' }} />
              <Bar dataKey="income" name="收入" fill={CHART_COLORS.income} radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" name="支出" fill={CHART_COLORS.expense} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
                      onClick={(_entry, index) => setExpenseSelected((prev) => (prev === index ? null : index))}
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
                        ¥{formatCurrencyShort(expenseData[expenseSelected].total)}
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
              <div className="w-full mt-2 space-y-1.5">
                {expenseData.slice(0, 6).map((item, index) => (
                  <button
                    key={`legend-${index}`}
                    onClick={() => setExpenseSelected((prev) => (prev === index ? null : index))}
                    className={`w-full flex items-center gap-2.5 py-1 rounded-button transition-colors ${expenseSelected === index ? 'bg-[var(--paper-deep)]' : ''}`}
                  >
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.category.color }} />
                    <span className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--ink)' }}>{item.category.name}</span>
                    <span className="text-sm amount-num flex-shrink-0" style={{ color: 'var(--ink-2)' }}>¥{formatCurrencyShort(item.total)}</span>
                    <span className="text-xs w-10 text-right flex-shrink-0" style={{ color: 'var(--ink-2)' }}>{monthExpense > 0 ? `${(item.total / monthExpense * 100).toFixed(0)}%` : '0%'}</span>
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
                      onClick={(_entry, index) => setIncomeSelected((prev) => (prev === index ? null : index))}
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
                        ¥{formatCurrencyShort(incomeData[incomeSelected].total)}
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
              <div className="w-full mt-2 space-y-1.5">
                {incomeData.slice(0, 6).map((item, index) => (
                  <button
                    key={`legend-${index}`}
                    onClick={() => setIncomeSelected((prev) => (prev === index ? null : index))}
                    className={`w-full flex items-center gap-2.5 py-1 rounded-button transition-colors ${incomeSelected === index ? 'bg-[var(--paper-deep)]' : ''}`}
                  >
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.category.color }} />
                    <span className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--ink)' }}>{item.category.name}</span>
                    <span className="text-sm amount-num flex-shrink-0" style={{ color: 'var(--ink-2)' }}>¥{formatCurrencyShort(item.total)}</span>
                    <span className="text-xs w-10 text-right flex-shrink-0" style={{ color: 'var(--ink-2)' }}>{monthIncome > 0 ? `${(item.total / monthIncome * 100).toFixed(0)}%` : '0%'}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const Profile = memo(ProfileComponent);
