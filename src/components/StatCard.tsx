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
  const absAmount = Math.abs(amount);
  // 金额单独占一行，按量级缩小字号，避免被截断成省略号
  const amountFontSize = absAmount >= 1000000 ? '13px' : absAmount >= 100000 ? '14px' : '17px';

  return (
    <button
      onClick={onClick}
      className="card card-hover w-full p-3 text-left flex flex-col gap-1.5"
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: softBg, color }}
        >
          <Icon size={15} />
        </div>
        <p className="flex-1 min-w-0 text-xs font-medium truncate" style={{ color: 'var(--ink-2)' }}>{title}</p>
        {onClick && <ChevronRight size={14} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />}
      </div>
      <p
        className="font-bold amount-num whitespace-nowrap truncate"
        style={{ color, fontSize: amountFontSize }}
      >
        {isIncome ? '+' : '-'}{formatCurrencyShort(displayAmount)}
      </p>
    </button>
  );
};
