import { useEffect, useMemo, memo } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatCurrencyShort } from '../utils/format';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Settings as SettingsIcon, ChevronRight, TrendingUp, TrendingDown, Wallet, Tags, Download, Upload, Moon, Sun, HelpCircle, Shield } from 'lucide-react';

interface ProfileProps {
  onGoToSettings: () => void;
  onGoToCategories: () => void;
  onGoToDateSelect: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  selectedDate: Date;
}

const CHART_COLORS = {
  income: '#2e85de',
  expense: '#e0684f',
  axis: '#8c8577',
  cursor: 'rgba(168, 142, 110, 0.12)',
};

const TOOLTIP_STYLE = {
  borderRadius: '14px',
  border: '1px solid var(--line)',
  background: 'var(--card)',
  color: 'var(--ink)',
  boxShadow: 'var(--shadow-card)',
};

const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

const ProfileComponent = ({ onGoToSettings, onGoToCategories, isDark, onToggleTheme, selectedDate }: ProfileProps) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const selectedMonth = selectedDate.getMonth();
  const selectedYear = selectedDate.getFullYear();

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

  const monthBalance = monthIncome - monthExpense;
  const totalAssets = useStore.getState().accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="page-root pb-nav page-enter">
      {/* 页头 */}
      <div className="safe-top px-4 pt-3 pb-1">
        <h1 className="page-title">我的</h1>
        <p className="page-subtitle">{selectedYear}年 {months[selectedMonth]} 财务概览</p>
      </div>

      <div className="px-4 mt-3 space-y-3">
        {/* 收支概览大卡片 */}
        <div className="card p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-4 rounded-button" style={{ background: 'var(--primary-soft)' }}>
              <TrendingUp size={20} className="mx-auto mb-2" style={{ color: 'var(--primary)' }} />
              <p className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>本月收入</p>
              <p className="text-2xl font-bold amount-num mt-1" style={{ color: 'var(--primary)' }}>
                {formatCurrencyShort(monthIncome)}
              </p>
            </div>
            <div className="text-center p-4 rounded-button" style={{ background: 'var(--expense-soft)' }}>
              <TrendingDown size={20} className="mx-auto mb-2" style={{ color: 'var(--expense)' }} />
              <p className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>本月支出</p>
              <p className="text-2xl font-bold amount-num mt-1" style={{ color: 'var(--expense)' }}>
                {formatCurrencyShort(monthExpense)}
              </p>
            </div>
          </div>
          <div className="mt-3 p-4 rounded-button text-center" style={{ background: monthBalance >= 0 ? 'var(--primary-soft)' : 'var(--expense-soft)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>本月结余</p>
            <p className="text-3xl font-bold amount-num mt-1" style={{ color: monthBalance >= 0 ? 'var(--primary)' : 'var(--expense)' }}>
              {formatCurrencyShort(monthBalance)}
            </p>
          </div>
        </div>

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
          <h2 className="section-title">本月支出分布</h2>
          {expenseData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={expenseData.map((item) => ({ name: item.category.name, value: item.total, color: item.category.color }))} cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={4} dataKey="value">
                    {expenseData.map((item, index) => (<Cell key={`cell-${index}`} fill={item.category.color} />))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`¥${formatCurrency(value)}`, '金额']} contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
                {expenseData.slice(0, 6).map((item, index) => (
                  <div key={`legend-${index}`} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.category.color }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{item.category.name}</span>
                    <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{monthExpense > 0 ? `${(item.total / monthExpense * 100).toFixed(0)}%` : '0%'}</span>
                  </div>
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
            <h2 className="section-title">本月收入分布</h2>
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={incomeData.map((item) => ({ name: item.category.name, value: item.total, color: item.category.color }))} cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={4} dataKey="value">
                    {incomeData.map((item, index) => (<Cell key={`cell-${index}`} fill={item.category.color} />))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`¥${formatCurrency(value)}`, '金额']} contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
                {incomeData.slice(0, 6).map((item, index) => (
                  <div key={`legend-${index}`} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.category.color }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{item.category.name}</span>
                    <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{monthIncome > 0 ? `${(item.total / monthIncome * 100).toFixed(0)}%` : '0%'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 快捷功能入口 */}
        <div className="card overflow-hidden">
          <div className="p-4" style={{ borderBottom: '1px solid var(--line)' }}>
            <h3 className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>快捷功能</h3>
          </div>
          <button onClick={onGoToCategories} className="w-full flex items-center gap-4 p-4 active:brightness-95">
            <div className="w-11 h-11 rounded-button flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
              <Tags size={21} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold" style={{ color: 'var(--ink)' }}>分类管理</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>自定义收入/支出分类</p>
            </div>
            <ChevronRight size={18} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
          </button>
          <button onClick={onToggleTheme} className="w-full flex items-center gap-4 p-4 active:brightness-95" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="w-11 h-11 rounded-button flex items-center justify-center flex-shrink-0" style={isDark ? { background: '#1e2c42', color: 'var(--primary)' } : { background: '#faf1dc', color: '#d9930f' }}>
              {isDark ? <Moon size={21} /> : <Sun size={21} />}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold" style={{ color: 'var(--ink)' }}>深色模式</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{isDark ? '已开启' : '已关闭'}</p>
            </div>
            <div className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0" style={{ background: isDark ? 'var(--primary)' : 'var(--paper-deep)' }}>
              <div className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform" style={{ transform: isDark ? 'translateX(28px)' : 'translateX(4px)' }} />
            </div>
          </button>
        </div>

        {/* 设置入口 */}
        <button onClick={onGoToSettings} className="card w-full flex items-center gap-4 p-4 active:brightness-95">
          <div className="w-11 h-11 rounded-button flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
            <SettingsIcon size={21} />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="font-semibold" style={{ color: 'var(--ink)' }}>设置</p>
            <p className="text-sm" style={{ color: 'var(--ink-2)' }}>数据备份/恢复、版本更新、帮助与反馈</p>
          </div>
          <ChevronRight size={18} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
        </button>
      </div>
    </div>
  );
};

export const Profile = memo(ProfileComponent);
