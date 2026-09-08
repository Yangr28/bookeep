import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import { formatCurrencyShort } from '../utils/format';

interface StatCardProps {
  type: 'income' | 'expense';
  title: string;
  amount: number;
  onClick?: () => void;
}

export const StatCard = ({ type, title, amount, onClick }: StatCardProps) => {
  const isIncome = type === 'income';
  const Icon = isIncome ? TrendingUp : TrendingDown;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3 rounded-card shadow-card card-hover transition-all ${
        isIncome
          ? 'bg-gradient-to-r from-primary-50 to-green-50 dark:from-primary-900/20 dark:to-green-900/20'
          : 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">{title}</p>
        <div className="flex items-baseline gap-0.5 mt-0.5">
          <span className={`text-sm font-bold flex-shrink-0 ${isIncome ? 'text-primary-600 dark:text-primary-400' : 'text-red-500 dark:text-red-400'}`}>
            {isIncome ? '+' : '-'}
          </span>
          <span
            className={`text-base font-bold tracking-tight ${isIncome ? 'text-primary-600 dark:text-primary-400' : 'text-red-500 dark:text-red-400'}`}
            style={{ fontSize: amount >= 1000000 ? '13px' : 'inherit' }}
          >
            {formatCurrencyShort(amount)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 ml-1">
        <div className={`p-1.5 rounded-full ${isIncome ? 'bg-primary-100 dark:bg-primary-800/50' : 'bg-red-100 dark:bg-red-800/50'}`}>
          <Icon size={14} className={isIncome ? 'text-primary-500' : 'text-red-500'} />
        </div>
        {onClick && <ChevronRight size={14} className="text-gray-400" />}
      </div>
    </button>
  );
};
