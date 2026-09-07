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
      className={`w-full flex items-center justify-between p-4 rounded-xl transition-all hover:shadow-md ${
        isIncome
          ? 'bg-gradient-to-r from-emerald-50 to-green-50'
          : 'bg-gradient-to-r from-red-50 to-orange-50'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-gray-500 text-xs font-medium">{title}</p>
        <div className="flex items-baseline gap-0.5 mt-1">
          <span
            className={`text-base font-bold flex-shrink-0 ${
              isIncome ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {isIncome ? '+' : '-'}
          </span>
          <span
            className={`text-lg font-bold tracking-tight ${
              isIncome ? 'text-emerald-600' : 'text-red-500'
            }`}
            style={{ fontSize: amount >= 1000000 ? '14px' : 'inherit' }}
          >
            {formatCurrencyShort(amount)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <div
          className={`p-2.5 rounded-full ${
            isIncome ? 'bg-emerald-100' : 'bg-red-100'
          }`}
        >
          <Icon size={18} className={isIncome ? 'text-emerald-500' : 'text-red-500'} />
        </div>
        {onClick && (
          <ChevronRight size={16} className="text-gray-400" />
        )}
      </div>
    </button>
  );
};