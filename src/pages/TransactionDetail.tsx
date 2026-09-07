import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { TransactionCard } from '../components/TransactionCard';
import { formatCurrencyShort } from '../utils/format';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Calendar, CheckSquare, Square, Trash2 } from 'lucide-react';
import { Transaction } from '../types';

import Empty from '../components/Empty';

interface TransactionDetailProps {
  onBack: () => void;
  filterType: 'today-income' | 'today-expense' | 'month-income' | 'month-expense' | 'total-balance' | 'month-balance';
  categoryId?: string | null;
  onEditTransaction?: (transaction: Transaction) => void;
}

export const TransactionDetail = ({ onBack, filterType, categoryId, onEditTransaction }: TransactionDetailProps) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMultiSelect, setIsMultiSelect] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map((t) => t.id));
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach((id) => deleteTransaction(id));
    setSelectedIds([]);
    setIsMultiSelect(false);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const transactions = useStore((state) => state.transactions);
  const deleteTransaction = useStore((state) => state.deleteTransaction);
  const getCategoryById = useStore((state) => state.getCategoryById);
  const totalIncome = useStore((state) => state.getTotalIncome());
  const totalExpense = useStore((state) => state.getTotalExpense());
  const monthIncome = useStore((state) => state.getMonthIncome());
  const monthExpense = useStore((state) => state.getMonthExpense());

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const resetDateFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  const filteredTransactions = [...transactions]
    .filter((t) => {
      const tDate = new Date(t.createdAt);
      const dateStr = tDate.toISOString().split('T')[0];
      const isToday = tDate >= todayStart && tDate < todayEnd;
      const isThisMonth = tDate >= monthStart && tDate < monthEnd;
      const isIncome = t.type === 'income';
      const isCategoryMatch = !categoryId || t.categoryId === categoryId;

      if (startDate && dateStr < startDate) return false;
      if (endDate && dateStr > endDate) return false;

      if (categoryId) {
        return isCategoryMatch;
      }

      switch (filterType) {
        case 'today-income':
          return isToday && isIncome;
        case 'today-expense':
          return isToday && !isIncome;
        case 'month-income':
          return isThisMonth && isIncome;
        case 'month-expense':
          return isThisMonth && !isIncome;
        case 'month-balance':
          return isThisMonth;
        case 'total-balance':
          return true;
        default:
          return false;
      }
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const selectedCategory = categoryId ? getCategoryById(categoryId) : null;

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

  const pageConfig = {
    'today-income': { title: '今日收入', type: 'income' as const, period: '今日', color: 'emerald' },
    'today-expense': { title: '今日支出', type: 'expense' as const, period: '今日', color: 'red' },
    'month-income': { title: '本月收入', type: 'income' as const, period: '本月', color: 'emerald' },
    'month-expense': { title: '本月支出', type: 'expense' as const, period: '本月', color: 'red' },
    'month-balance': { title: '本月余额', type: 'income' as const, period: '本月', color: 'emerald' },
    'total-balance': { title: '总资产', type: 'income' as const, period: '全部', color: 'purple' },
  };

  const config = pageConfig[filterType];
  const isIncome = config.type === 'income';
  const isTotalBalance = filterType === 'total-balance';
  const isMonthBalance = filterType === 'month-balance';
  const isCategoryDetail = !!selectedCategory;

  const gradientClass = isCategoryDetail && selectedCategory
    ? `bg-gradient-to-br ${selectedCategory.type === 'income' ? 'from-emerald-500 to-green-600' : 'from-red-500 to-orange-500'}`
    : isTotalBalance 
      ? 'bg-gradient-to-br from-purple-500 to-indigo-600' 
      : isIncome 
        ? 'bg-gradient-to-br from-emerald-500 to-green-600' 
        : 'bg-gradient-to-br from-red-500 to-orange-500';

  const pageTitle = isCategoryDetail && selectedCategory 
    ? `${selectedCategory.name}明细` 
    : config.title;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <div className={`p-6 ${gradientClass} text-white`}>
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">{pageTitle}</h1>
        </div>
        {isCategoryDetail && selectedCategory ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
            <p className="text-white/80 text-sm">累计{selectedCategory.type === 'income' ? '收入' : '支出'}</p>
            <p className="text-3xl font-bold mt-1">
              {selectedCategory.type === 'income' ? '+' : ''}{formatCurrencyShort(totalAmount)}
            </p>
            <p className="text-white/60 text-sm mt-2">共{filteredTransactions.length}笔记录</p>
          </div>
        ) : isTotalBalance ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
            <p className="text-white/80 text-sm">资产总计</p>
            <p className="text-3xl font-bold mt-1">{formatCurrencyShort(totalIncome - totalExpense)}</p>
            <div className="flex justify-between mt-4 text-sm">
              <div>
                <p className="text-white/60">总收入</p>
                <p className="text-green-300 font-semibold">+{formatCurrencyShort(totalIncome)}</p>
              </div>
              <div className="text-right">
                <p className="text-white/60">总支出</p>
                <p className="text-red-300 font-semibold">{formatCurrencyShort(-totalExpense)}</p>
              </div>
            </div>
          </div>
        ) : isMonthBalance ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
            <p className="text-white/80 text-sm">本月余额</p>
            <p className="text-3xl font-bold mt-1">{formatCurrencyShort(monthIncome - monthExpense)}</p>
            <div className="flex justify-between mt-4 text-sm">
              <div>
                <p className="text-white/60">本月收入</p>
                <p className="text-green-300 font-semibold">+{formatCurrencyShort(monthIncome)}</p>
              </div>
              <div className="text-right">
                <p className="text-white/60">本月支出</p>
                <p className="text-red-300 font-semibold">{formatCurrencyShort(-monthExpense)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
            <p className="text-white/80 text-sm">{config.period}总计</p>
            <p className="text-3xl font-bold mt-1">
              {isIncome ? '+' : ''}{formatCurrencyShort(totalAmount)}
            </p>
          </div>
        )}
      </div>

      <div className="px-4 mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={18} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">日期筛选</span>
            {(startDate || endDate) && (
              <button
                onClick={resetDateFilter}
                className="ml-auto text-xs text-red-500 hover:text-red-600"
              >
                重置
              </button>
            )}
          </div>
          {(filterType === 'total-balance' || categoryId) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { label: '今日', days: 0 },
                { label: '近7天', days: 7 },
                { label: '近30天', days: 30 },
                { label: '本月', days: 'month' },
                { label: '上月', days: 'lastMonth' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    let start = new Date(today);
                    let end = new Date(today);
                    
                    if (typeof preset.days === 'number') {
                      start.setDate(today.getDate() - preset.days);
                    } else if (preset.days === 'month') {
                      start = new Date(today.getFullYear(), today.getMonth(), 1);
                      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    } else if (preset.days === 'lastMonth') {
                      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                      end = new Date(today.getFullYear(), today.getMonth(), 0);
                    }
                    
                    setStartDate(start.toISOString().split('T')[0]);
                    setEndDate(end.toISOString().split('T')[0]);
                  }}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">开始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">结束日期</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${isIncome ? 'bg-emerald-100' : 'bg-red-100'}`}>
              {isIncome ? (
                <TrendingUp size={20} className="text-emerald-500" />
              ) : (
                <TrendingDown size={20} className="text-red-500" />
              )}
            </div>
            <h2 className="font-semibold text-gray-800">交易明细</h2>
            <span className="text-gray-400 text-sm">({filteredTransactions.length}笔)</span>
          </div>
          <button
            onClick={() => setIsMultiSelect(!isMultiSelect)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isMultiSelect
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isMultiSelect ? <CheckSquare size={16} /> : <Square size={16} />}
            {isMultiSelect ? '退出多选' : '批量选择'}
          </button>
        </div>

        {filteredTransactions.length === 0 ? (
          <Empty
            icon={Wallet}
            title={`暂无${config.period}${isIncome ? '收入' : '支出'}记录`}
            description={`点击下方按钮添加您的${isIncome ? '第一笔收入' : '第一笔支出'}吧`}
          />
        ) : (
          <>
            {isMultiSelect && (
              <div className="flex items-center justify-between mb-3 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  {selectedIds.length === filteredTransactions.length ? (
                    <CheckSquare size={18} className="text-blue-500" />
                  ) : (
                    <Square size={18} />
                  )}
                  全选
                </button>
                <span className="text-sm text-gray-500">
                  已选 {selectedIds.length} 项
                </span>
              </div>
            )}
            <div className="space-y-2">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={`flex items-start gap-2 p-1 rounded-lg transition-colors ${
                    selectedIds.includes(transaction.id) ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                  }`}
                >
                  {isMultiSelect && (
                    <button
                      onClick={() => toggleSelect(transaction.id)}
                      className="mt-2 flex-shrink-0"
                    >
                      {selectedIds.includes(transaction.id) ? (
                        <CheckSquare size={20} className="text-blue-500" />
                      ) : (
                        <Square size={20} className="text-gray-300" />
                      )}
                    </button>
                  )}
                  <div className="flex-1">
                    <TransactionCard
                      transaction={transaction}
                      onDelete={() => deleteTransaction(transaction.id)}
                      onEdit={() => onEditTransaction?.(transaction)}
                      disabled={isMultiSelect}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {isMultiSelect && selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              已选择 {selectedIds.length} 条记录
            </span>
            <button
              onClick={handleBatchDelete}
              className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
            >
              <Trash2 size={18} />
              批量删除
            </button>
          </div>
        </div>
      )}
    </div>
  );
};