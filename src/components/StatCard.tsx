import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import { formatCurrencyShort } from '../utils/format';
import { useCountUp } from '../hooks/useCountUp';

interface StatCardProps {
  type: 'income' | 'expense';
  title: string;
  amount: number;
  onClick?: () => void;
}

export const StatCard = ({ type, title, amount, onClick }: StatCardProps) => {
  const isIncome = type === 'income';
  const Icon = isIncome ? TrendingUp : TrendingDown;
  const color = isIncome ? 'var(--primary)' : 'var(--expense)';
  const softBg = isIncome ? 'var(--primary-soft)' : 'var(--expense-soft)';
  const animatedAmount = useCountUp(amount);
  const displayAmount = Math.abs(animatedAmount - amount) < 0.005 ? amount : animatedAmount;

  return (
    <button
      onClick={onClick}
      className="card card-hover w-full flex items-center gap-3 p-3.5 text-left"
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: softBg, color }}
      >
        <Icon size={19} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>{title}</p>
        <p
          className="font-bold amount-num mt-0.5 truncate"
          style={{ color, fontSize: amount >= 1000000 ? '13px' : '15px' }}
        >
          {isIncome ? '+' : '-'}{formatCurrencyShort(displayAmount)}
        </p>
      </div>
      {onClick && <ChevronRight size={16} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />}
    </button>
  );
};
