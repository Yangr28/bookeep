import { useTranslation } from 'react-i18next';
import { Sparkline, StackedBar } from '../MiniCharts';
import { formatCurrencyShort } from '../../utils/format';

interface MonthOverviewCardProps {
  balance: number;
  animatedBalance: number;
  monthIncome: number;
  monthExpense: number;
  assetsTrend: { assets: number }[];
  onViewDetail: (filter: 'month-balance') => void;
  onTrendClick: () => void;
}

/** 本月概览卡：本月结余 + 收支柱 + 资产趋势 sparkline */
export const MonthOverviewCard = ({
  balance,
  animatedBalance,
  monthIncome,
  monthExpense,
  assetsTrend,
  onViewDetail,
  onTrendClick,
}: MonthOverviewCardProps) => {
  const { t } = useTranslation();
  const displayBalance = Math.abs(animatedBalance - balance) < 0.005 ? balance : animatedBalance;

  return (
    <div className="px-4 mt-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onViewDetail('month-balance')}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onViewDetail('month-balance'); } }}
        className="card card-hover w-full p-4 text-left block cursor-pointer"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>{t('dashboard.monthBalance')}</p>
            <p className="text-3xl font-bold mt-1 amount-num truncate" style={{ color: 'var(--ink)' }}>
              {formatCurrencyShort(displayBalance)}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onTrendClick(); }}
            className="flex flex-col items-end flex-shrink-0 mt-1 -mr-1 px-1 py-0.5 rounded-button card-press"
            aria-label={t('dashboard.trendTitle')}
          >
            <Sparkline data={assetsTrend.map(d => d.assets)} width={72} height={24} />
            <span className="text-[10px] mt-1" style={{ color: 'var(--ink-2)' }}>{t('dashboard.trend6m')}</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--primary)' }} />
            <span className="text-xs whitespace-nowrap" style={{ color: 'var(--ink-2)' }}>{t('dashboard.income')}</span>
            <span className="text-sm font-semibold amount-num truncate" style={{ color: 'var(--primary)' }}>
              {formatCurrencyShort(monthIncome)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--expense)' }} />
            <span className="text-xs whitespace-nowrap" style={{ color: 'var(--ink-2)' }}>{t('dashboard.expense')}</span>
            <span className="text-sm font-semibold amount-num truncate" style={{ color: 'var(--expense)' }}>
              {formatCurrencyShort(-monthExpense)}
            </span>
          </div>
        </div>
        <div className="mt-2.5">
          <StackedBar income={monthIncome} expense={monthExpense} height={6} />
        </div>
      </div>
    </div>
  );
};
