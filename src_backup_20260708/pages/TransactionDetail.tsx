import { useStore } from '../store/useStore';
import { TransactionCard } from '../components/TransactionCard';
import { formatCurrencyShort } from '../utils/format';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { SwipeBackIndicator } from '../components/SwipeBackIndicator';

interface TransactionDetailProps {
  onBack: () => void;
  filterType: 'today-income' | 'today-expense' | 'month-income' | 'month-expense' | 'total-balance' | 'month-balance';
  categoryId?: string | null;
  onEditTransaction?: (transaction: any) => void;
}

export const TransactionDetail = ({ onBack, filterType, categoryId, onEditTransaction }: TransactionDetailProps) => {
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

  const filteredTransactions = [...transactions]
    .filter((t) => {
      const tDate = new Date(t.createdAt);
      const isToday = tDate >= todayStart && tDate < todayEnd;
      const isThisMonth = tDate >= monthStart && tDate < monthEnd;
      const isIncome = t.type === 'income';
      const isCategoryMatch = !categoryId || t.categoryId === categoryId;

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
    <div className="min-h-screen bg-gray-50 pb-24">
      <SwipeBackIndicator />
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
        <div className="flex items-center gap-2 mb-4">
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

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet size={32} className="text-gray-300" />
            </div>
            <p>暂无{config.period}{isIncome ? '收入' : '支出'}记录</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                onDelete={() => deleteTransaction(transaction.id)}
                onEdit={() => onEditTransaction?.(transaction)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
