import { useState, useEffect, memo } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatCurrencyShort } from '../utils/format';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, ChevronDown, CircleDot } from 'lucide-react';
interface StatisticsProps {
  onBack?: () => void;
  selectedDate: Date;
  onShowCalendar: () => void;
  onDateChange?: (date: Date) => void;
}

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white px-6 pt-8 pb-6 rounded-b-3xl">
        <h1 className="text-2xl font-bold tracking-tight">统计报表</h1>
        <p className="text-emerald-100 text-sm mt-2 leading-relaxed">查看您的财务数据</p>
      </div>

      <div className="px-4 -mt-5">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
          <button
            onClick={onShowCalendar}
            className="flex items-center justify-start gap-3 w-full mb-5"
          >
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <Calendar size={20} className="text-blue-600" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-gray-800 dark:text-white">
                {selectedYear}年 {months[selectedMonth]}
              </span>
              <ChevronDown size={20} className="text-gray-400" />
            </div>
          </button>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-5 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-green-900/30 rounded-2xl shadow-sm">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">本月收入</p>
              <p className="text-2xl font-bold text-emerald-600 mt-2">
                {formatCurrencyShort(monthIncome)}
              </p>
            </div>
            <div className="text-center p-5 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-orange-900/30 rounded-2xl shadow-sm">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">本月支出</p>
              <p className="text-2xl font-bold text-red-500 mt-2">
                {formatCurrencyShort(monthExpense)}
              </p>
            </div>
          </div>

          <div className="mt-5 p-5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center font-medium">本月结余</p>
            <p className={`text-3xl font-bold text-center mt-2 ${
              monthIncome - monthExpense >= 0 ? 'text-emerald-600' : 'text-red-500'
            }`}>
              {formatCurrencyShort(monthIncome - monthExpense)}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 mt-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-5">支出分布</h2>
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
                  >
                    {expenseData.map((item, index) => (
                      <Cell key={`cell-${index}`} fill={item.category.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`¥${formatCurrency(value)}`, '金额']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full mt-4 flex flex-wrap justify-center gap-4">
                {expenseData.map((item, index) => (
                  <div key={`legend-${index}`} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.category.color }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                      {item.category.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {monthExpense > 0 ? `(${(item.total / monthExpense * 100).toFixed(0)}%)` : '(0%)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <CircleDot size={28} className="text-gray-300" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">暂无支出数据</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 mt-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-5">收入分布</h2>
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
                  >
                    {incomeData.map((item, index) => (
                      <Cell key={`cell-${index}`} fill={item.category.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`¥${formatCurrency(value)}`, '金额']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full mt-4 flex flex-wrap justify-center gap-4">
                {incomeData.map((item, index) => (
                  <div key={`legend-${index}`} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.category.color }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                      {item.category.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {monthIncome > 0 ? `(${(item.total / monthIncome * 100).toFixed(0)}%)` : '(0%)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <CircleDot size={28} className="text-gray-300" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">暂无收入数据</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 mt-4 mb-4">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">收支趋势</h2>
            <button
              onClick={() => setShowFullYear(!showFullYear)}
              className="px-4 py-2 text-emerald-500 text-sm font-medium bg-emerald-50 dark:bg-emerald-900/30 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-800/30 active:bg-emerald-200 transition-all flex items-center gap-1"
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
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value: string) => value.replace(/^\d+年/, '')}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value: number) => [`¥${formatCurrency(value)}`, '']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: 10 }} />
                  <Bar dataKey="income" name="收入" fill="#10B981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expense" name="支出" fill="#EF4444" radius={[6, 6, 0, 0]} />
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