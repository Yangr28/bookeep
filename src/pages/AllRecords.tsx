import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { TransactionCard } from '../components/TransactionCard';
import { formatCurrencyShort, formatDateTime } from '../utils/format';
import { ArrowLeft, Calendar, ArrowRightLeft, ArrowRight, Wallet } from 'lucide-react';
import { Transaction, Transfer } from '../types';

interface AllRecordsProps {
  onBack: () => void;
  onEditTransaction?: (transaction: Transaction) => void;
}

export const AllRecords = ({ onBack, onEditTransaction }: AllRecordsProps) => {
  
  const transactions = useStore((state) => state.transactions);
  const transfers = useStore((state) => state.transfers);
  const accounts = useStore((state) => state.accounts);
  const categories = useStore((state) => state.categories);
  const deleteTransaction = useStore((state) => state.deleteTransaction);
  const deleteTransfer = useStore((state) => state.deleteTransfer);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // 分类筛选：'all' 全部 | 'uncategorized' 未分类 | 分类 id
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const getAccountById = (id: string) => accounts.find((a) => a.id === id);

  interface Record {
    id: string;
    type: 'transaction' | 'transfer';
    amount: number;
    direction: 'in' | 'out' | 'transfer';
    categoryName?: string;
    relatedAccountName?: string;
    note?: string;
    createdAt: string;
    transaction?: Transaction;
    transfer?: Transfer;
  }

  const allRecords: Record[] = [
    ...transactions.map((t) => {
      const category = useStore.getState().getCategoryById(t.categoryId);
      return {
        id: t.id,
        type: 'transaction' as const,
        amount: t.amount,
        direction: t.type === 'income' ? 'in' as const : 'out' as const,
        categoryName: category?.name || '未分类',
        note: t.note,
        createdAt: t.createdAt,
        transaction: t,
      };
    }),
    ...transfers.map((t) => {
      const fromAccount = getAccountById(t.fromAccountId);
      const toAccount = getAccountById(t.toAccountId);
      return {
        id: t.id,
        type: 'transfer' as const,
        amount: t.amount,
        direction: 'transfer' as const,
        relatedAccountName: `${fromAccount?.name || '未知'} → ${toAccount?.name || '未知'}`,
        note: t.note || '转账',
        createdAt: t.createdAt,
        transfer: t,
      };
    }),
  ];

  const filteredRecords = allRecords.filter((record) => {
    const date = new Date(record.createdAt);
    const dateStr = date.toISOString().split('T')[0];

    if (startDate && dateStr < startDate) return false;
    if (endDate && dateStr > endDate) return false;

    // 分类筛选：转账无分类，筛选分类时隐藏
    if (categoryFilter !== 'all') {
      if (record.type !== 'transaction' || !record.transaction) return false;
      const recordCategory = categories.find((c) => c.id === record.transaction!.categoryId);
      if (categoryFilter === 'uncategorized') {
        if (recordCategory) return false;
      } else if (record.transaction.categoryId !== categoryFilter) {
        return false;
      }
    }
    return true;
  });

  const sortedRecords = filteredRecords.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalIncome = sortedRecords
    .filter((r) => r.type === 'transaction' && r.direction === 'in')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalExpense = sortedRecords
    .filter((r) => r.type === 'transaction' && r.direction === 'out')
    .reduce((sum, r) => sum + r.amount, 0);

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    setCategoryFilter('all');
  };

  const categoryFilterChips = [
    { value: 'all', label: '全部' },
    ...categories.map((c) => ({ value: c.id, label: c.name, color: c.color })),
    { value: 'uncategorized', label: '未分类' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 pt-8 pb-6 safe-top">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">全部记录</h1>
        </div>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-white/80 text-sm">总收入</p>
              <p className="text-xl font-bold text-green-300">+{formatCurrencyShort(totalIncome)}</p>
            </div>
            <div className="text-right">
              <p className="text-white/80 text-sm">总支出</p>
              <p className="text-xl font-bold text-red-300">-{formatCurrencyShort(totalExpense)}</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-white/60 text-sm">共 {sortedRecords.length} 条记录</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={18} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">日期筛选</span>
            {(startDate || endDate || categoryFilter !== 'all') && (
              <button
                onClick={handleResetFilter}
                className="ml-auto text-xs text-red-500 hover:text-red-600"
              >
                重置
              </button>
            )}
          </div>
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
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">开始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">结束日期</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">分类</span>
            <div className="flex-1 flex gap-1.5 overflow-x-auto pb-1 -mb-1">
              {categoryFilterChips.map((chip) => {
                const active = categoryFilter === chip.value;
                return (
                  <button
                    key={chip.value}
                    onClick={() => setCategoryFilter(chip.value)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      active
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {'color' in chip && chip.color && (
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: chip.color }}
                      />
                    )}
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-800 mb-3">交易明细</h2>
        {sortedRecords.length > 0 ? (
          <div className="space-y-3">
            {sortedRecords.map((record) => {
              if (record.type === 'transaction' && record.transaction) {
                return (
                  <TransactionCard
                    key={record.id}
                    transaction={record.transaction}
                    onDelete={() => deleteTransaction(record.id)}
                    onEdit={onEditTransaction ? () => onEditTransaction(record.transaction) : undefined}
                  />
                );
              }
              
              return (
                <div
                  key={record.id}
                  className="bg-white rounded-xl p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                        <ArrowRightLeft size={18} className="text-blue-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <ArrowRight size={12} className="text-gray-300" />
                          <span className="text-sm font-medium text-gray-800">
                            {record.relatedAccountName || '转账'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {record.note || '转账'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-blue-500">
                        {formatCurrencyShort(record.amount)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDateTime(record.createdAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTransfer(record.id)}
                    className="mt-2 text-xs text-red-500 hover:text-red-600"
                  >
                    删除
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Wallet size={28} className="text-gray-300" />
            </div>
            <p className="text-gray-500">暂无记录</p>
          </div>
        )}
      </div>
    </div>
  );
};
