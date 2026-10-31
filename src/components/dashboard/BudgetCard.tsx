import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { ProgressRing } from '../MiniCharts';
import { formatCurrencyShort } from '../../utils/format';

interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  percentage: number;
  overCount: number;
}

interface BudgetCardProps {
  budgetSummary: BudgetSummary;
  onGoToBudgets: () => void;
}

const getBudgetColor = (pct: number) =>
  pct >= 100 ? 'var(--expense)' : pct >= 80 ? 'var(--expense-ink)' : pct >= 50 ? 'var(--primary-ink)' : 'var(--primary)';

/** 预算进度卡：仅当本月设置了预算时渲染 */
export const BudgetCard = ({ budgetSummary, onGoToBudgets }: BudgetCardProps) => {
  const { t } = useTranslation();
  if (budgetSummary.totalBudget <= 0) return null;

  return (
    <div className="px-4 mt-3">
      <button
        onClick={onGoToBudgets}
        className="card card-hover w-full p-3.5 text-left block animate-stagger-in"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>{t('dashboard.monthBudget')}</span>
            {budgetSummary.overCount > 0 && (
              <span className="text-[11px] flex items-center gap-1 font-semibold" style={{ color: 'var(--expense)' }}>
                <AlertCircle size={11} />
                {t('dashboard.overCount', { n: budgetSummary.overCount })}
              </span>
            )}
            {budgetSummary.overCount === 0 && (
              <span className="text-[11px] amount-num" style={{ color: 'var(--ink-2)' }}>
                {formatCurrencyShort(budgetSummary.totalSpent)} / {formatCurrencyShort(budgetSummary.totalBudget)}
              </span>
            )}
          </div>
          <ProgressRing
            percentage={budgetSummary.percentage}
            size={36}
            stroke={3.5}
            pulse={budgetSummary.overCount > 0}
          />
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--paper-deep)' }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${budgetSummary.percentage}%`, background: getBudgetColor(budgetSummary.percentage) }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs" style={{ color: 'var(--ink-2)' }}>
            {t('dashboard.used', { percent: budgetSummary.percentage.toFixed(0) })}
          </span>
          <span className="text-xs font-medium" style={{ color: getBudgetColor(budgetSummary.percentage) }}>
            {budgetSummary.percentage >= 100 ? t('dashboard.statusOver') : budgetSummary.percentage >= 80 ? t('dashboard.statusNearLimit') : t('dashboard.statusNormal')}
          </span>
        </div>
      </button>
    </div>
  );
};
