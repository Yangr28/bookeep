import { useTranslation } from 'react-i18next';
import { StatCard } from '../StatCard';
import { formatCurrencyShort } from '../../utils/format';

interface TodayOverviewCardProps {
  todayIncome: number;
  todayExpense: number;
  totalAssets: number;
  animatedTotalAssets: number;
  totalIncome: number;
  totalExpense: number;
  onViewDetail: (filter: 'today-income' | 'today-expense' | 'total-balance') => void;
}

/** 今日收支 + 总资产卡 */
export const TodayOverviewCard = ({
  todayIncome,
  todayExpense,
  totalAssets,
  animatedTotalAssets,
  totalIncome,
  totalExpense,
  onViewDetail,
}: TodayOverviewCardProps) => {
  const { t } = useTranslation();
  const displayAssets = Math.abs(animatedTotalAssets - totalAssets) < 0.005 ? totalAssets : animatedTotalAssets;

  return (
    <div className="px-4 mt-3 space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard type="income" title={t('dashboard.todayIncome')} amount={todayIncome} onClick={() => onViewDetail('today-income')} />
        <StatCard type="expense" title={t('dashboard.todayExpense')} amount={todayExpense} onClick={() => onViewDetail('today-expense')} />
      </div>

      <button onClick={() => onViewDetail('total-balance')} className="card card-hover w-full p-3.5 text-left block">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>{t('dashboard.totalAssets')}</p>
            <p className="text-2xl font-bold mt-1 amount-num" style={{ color: 'var(--ink)' }}>{formatCurrencyShort(displayAssets)}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs" style={{ color: 'var(--ink-2)' }}>
              {t('dashboard.income')} <span className="font-semibold amount-num" style={{ color: 'var(--primary)' }}>{formatCurrencyShort(totalIncome)}</span>
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-2)' }}>
              {t('dashboard.expense')} <span className="font-semibold amount-num" style={{ color: 'var(--expense)' }}>{formatCurrencyShort(-totalExpense)}</span>
            </p>
          </div>
        </div>
      </button>
    </div>
  );
};
