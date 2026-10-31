import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { formatCurrencyShort, formatDate } from '../utils/format';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Award, Zap } from 'lucide-react';
import type { Transaction, Category } from '../types';

interface YearReviewProps {
  onBack?: () => void;
}

const TOOLTIP_STYLE = {
  borderRadius: '14px',
  border: '1px solid var(--line)',
  background: 'var(--card)',
  color: 'var(--ink)',
  boxShadow: 'var(--shadow-card)',
};

const CHART_COLORS = {
  income: 'var(--primary)',
  expense: 'var(--expense)',
  axis: 'var(--ink-2)',
  grid: 'var(--line)',
};

export const YearReview = ({ onBack }: YearReviewProps) => {
  const { t } = useTranslation();
  const transactions = useStore((s) => s.transactions);
  const getCategoryById = useStore((s) => s.getCategoryById);

  // 可选年份：所有交易涉及的年份
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    transactions.forEach((tx) => {
      const y = new Date(tx.createdAt).getFullYear();
      if (!Number.isNaN(y)) years.add(y);
    });
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  const [year, setYear] = useState(new Date().getFullYear());

  const yearIdx = availableYears.indexOf(year);
  const canPrev = yearIdx < availableYears.length - 1;
  const canNext = yearIdx > 0;

  const goPrev = () => canPrev && setYear(availableYears[yearIdx + 1]);
  const goNext = () => canNext && setYear(availableYears[yearIdx - 1]);

  // 当年交易
  const yearTx = useMemo(
    () => transactions.filter((tx) => new Date(tx.createdAt).getFullYear() === year),
    [transactions, year],
  );

  // 12 个月收支
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, m) => ({
      month: m,
      monthLabel: t(`calendar.month${m + 1}`),
      income: 0,
      expense: 0,
    }));
    yearTx.forEach((tx) => {
      const m = new Date(tx.createdAt).getMonth();
      if (m >= 0 && m < 12) {
        if (tx.type === 'income') months[m].income += tx.amount;
        else months[m].expense += tx.amount;
      }
    });
    return months;
  }, [yearTx, t]);

  const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0);
  const totalExpense = monthlyData.reduce((s, m) => s + m.expense, 0);
  const balance = totalIncome - totalExpense;
  const avgMonthlyExpense = totalExpense / 12;

  // Top 支出分类（全年）
  const topExpenseCategories = useMemo<{ category: Category; total: number }[]>(() => {
    const map = new Map<string, number>();
    yearTx
      .filter((tx) => tx.type === 'expense')
      .forEach((tx) => {
        map.set(tx.categoryId, (map.get(tx.categoryId) || 0) + tx.amount);
      });
    return Array.from(map.entries())
      .map(([cid, total]) => ({
        category:
          getCategoryById(cid) ??
          ({ id: cid || 'uncategorized', name: t('yearReview.uncategorized'), type: 'expense', icon: 'HelpCircle', color: '#9ca3af' } as Category),
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [yearTx, getCategoryById, t]);

  // 最大单笔支出
  const maxExpenseTx = useMemo<Transaction | null>(
    () =>
      yearTx
        .filter((tx) => tx.type === 'expense')
        .reduce<Transaction | null>((max, tx) => (tx.amount > (max?.amount ?? 0) ? tx : max), null),
    [yearTx],
  );

  // 最大单笔收入
  const maxIncomeTx = useMemo<Transaction | null>(
    () =>
      yearTx
        .filter((tx) => tx.type === 'income')
        .reduce<Transaction | null>((max, tx) => (tx.amount > (max?.amount ?? 0) ? tx : max), null),
    [yearTx],
  );

  const noData = yearTx.length === 0;

  return (
    <div className="page-root pb-nav">
      {/* 页头 */}
      <div className="safe-top px-4 pt-2 pb-1 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="icon-btn" aria-label={t('settings.back')}>
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="page-title">{t('yearReview.title')}</h1>
          <p className="page-subtitle">{t('yearReview.subtitle', { year })}</p>
        </div>
        {/* 年份切换 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={goPrev}
            disabled={!canPrev}
            className="icon-btn disabled:opacity-30"
            aria-label={t('yearReview.prevYear')}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold w-12 text-center" style={{ color: 'var(--ink)' }}>{year}</span>
          <button
            onClick={goNext}
            disabled={!canNext}
            className="icon-btn disabled:opacity-30"
            aria-label={t('yearReview.nextYear')}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="px-4 mt-3 space-y-3">
        {/* 年度概览 */}
        <div className="card p-4">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="text-center p-2 rounded-button" style={{ background: 'var(--paper)' }}>
              <p className="text-xs font-medium truncate" style={{ color: 'var(--ink-2)' }}>{t('yearReview.income')}</p>
              <p className="text-lg font-bold amount-num mt-1 truncate" style={{ color: 'var(--primary)' }}>
                {formatCurrencyShort(totalIncome)}
              </p>
            </div>
            <div className="text-center p-2 rounded-button" style={{ background: 'var(--paper)' }}>
              <p className="text-xs font-medium truncate" style={{ color: 'var(--ink-2)' }}>{t('yearReview.expense')}</p>
              <p className="text-lg font-bold amount-num mt-1 truncate" style={{ color: 'var(--expense)' }}>
                {formatCurrencyShort(totalExpense)}
              </p>
            </div>
            <div className="text-center p-2 rounded-button" style={{ background: 'var(--paper)' }}>
              <p className="text-xs font-medium truncate" style={{ color: 'var(--ink-2)' }}>{t('yearReview.balance')}</p>
              <p
                className="text-lg font-bold amount-num mt-1 truncate"
                style={{ color: balance >= 0 ? 'var(--primary)' : 'var(--expense)' }}
              >
                {formatCurrencyShort(balance)}
              </p>
            </div>
          </div>
        </div>

        {/* 月均消费 + 交易笔数 */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="card p-3.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap size={14} style={{ color: 'var(--expense)' }} />
              <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('yearReview.avgMonthly')}</span>
            </div>
            <p className="text-xl font-bold amount-num" style={{ color: 'var(--ink)' }}>
              {formatCurrencyShort(avgMonthlyExpense)}
            </p>
          </div>
          <div className="card p-3.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Award size={14} style={{ color: 'var(--primary)' }} />
              <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('yearReview.txCount')}</span>
            </div>
            <p className="text-xl font-bold amount-num" style={{ color: 'var(--ink)' }}>{yearTx.length}</p>
          </div>
        </div>

        {noData ? (
          <div className="card p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{t('yearReview.noData')}</p>
          </div>
        ) : (
          <>
            {/* 月度收支对比柱状图 */}
            <div className="card p-4">
              <h2 className="section-title">{t('yearReview.monthlyTrend')}</h2>
              <div className="overflow-x-auto pb-2 mt-2">
                <div className="min-w-[420px] px-1">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyData} barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                      <XAxis
                        dataKey="monthLabel"
                        tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                        interval={0}
                        tickLine={false}
                        axisLine={{ stroke: CHART_COLORS.grid }}
                      />
                      <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.axis }} tickLine={false} axisLine={false} />
                      <Tooltip
                        formatter={(value: number) => [`¥${value.toFixed(2)}`, '']}
                        contentStyle={TOOLTIP_STYLE}
                        cursor={{ fill: 'var(--shadow-card)' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12, color: 'var(--ink-2)' }} />
                      <Bar dataKey="income" name={t('common.income')} fill={CHART_COLORS.income} radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700} animationEasing="ease-out" />
                      <Bar dataKey="expense" name={t('common.expense')} fill={CHART_COLORS.expense} radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700} animationEasing="ease-out" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Top 支出分类 */}
            {topExpenseCategories.length > 0 && (
              <div className="card p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <TrendingDown size={16} style={{ color: 'var(--expense)' }} />
                  <h2 className="section-title mb-0">{t('yearReview.topCategories')}</h2>
                </div>
                <div className="space-y-2.5">
                  {topExpenseCategories.map((item, idx) => {
                    const pct = totalExpense > 0 ? (item.total / totalExpense) * 100 : 0;
                    return (
                      <div key={item.category.id} className="flex items-center gap-2">
                        <span className="text-xs font-bold w-5 text-center flex-shrink-0" style={{ color: 'var(--ink-2)' }}>
                          {idx + 1}
                        </span>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.category.color }} />
                        <span className="text-sm flex-1 truncate min-w-0" style={{ color: 'var(--ink)' }}>
                          {item.category.name}
                        </span>
                        <span className="text-sm font-semibold amount-num flex-shrink-0" style={{ color: 'var(--ink)' }}>
                          {formatCurrencyShort(item.total)}
                        </span>
                        <span className="text-xs amount-num w-11 text-right flex-shrink-0" style={{ color: 'var(--ink-2)' }}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 最大单笔 */}
            <div className="card p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <TrendingUp size={16} style={{ color: 'var(--primary)' }} />
                <h2 className="section-title mb-0">{t('yearReview.maxSingle')}</h2>
              </div>
              <div className="space-y-2.5">
                {maxExpenseTx && (
                  <div className="p-3 rounded-button" style={{ background: 'var(--paper)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('yearReview.maxExpense')}</span>
                      <span className="text-lg font-bold amount-num" style={{ color: 'var(--expense)' }}>
                        {formatCurrencyShort(maxExpenseTx.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getCategoryById(maxExpenseTx.categoryId)?.color ?? '#9ca3af' }} />
                      <span className="text-sm truncate flex-1 min-w-0" style={{ color: 'var(--ink)' }}>
                        {getCategoryById(maxExpenseTx.categoryId)?.name ?? t('yearReview.uncategorized')}
                      </span>
                      <span className="text-xs flex-shrink-0" style={{ color: 'var(--ink-2)' }}>
                        {formatDate(maxExpenseTx.createdAt)}
                      </span>
                    </div>
                    {maxExpenseTx.note && (
                      <p className="text-xs mt-1 truncate" style={{ color: 'var(--ink-2)' }}>{maxExpenseTx.note}</p>
                    )}
                  </div>
                )}
                {maxIncomeTx && (
                  <div className="p-3 rounded-button" style={{ background: 'var(--paper)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('yearReview.maxIncome')}</span>
                      <span className="text-lg font-bold amount-num" style={{ color: 'var(--primary)' }}>
                        {formatCurrencyShort(maxIncomeTx.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getCategoryById(maxIncomeTx.categoryId)?.color ?? '#9ca3af' }} />
                      <span className="text-sm truncate flex-1 min-w-0" style={{ color: 'var(--ink)' }}>
                        {getCategoryById(maxIncomeTx.categoryId)?.name ?? t('yearReview.uncategorized')}
                      </span>
                      <span className="text-xs flex-shrink-0" style={{ color: 'var(--ink-2)' }}>
                        {formatDate(maxIncomeTx.createdAt)}
                      </span>
                    </div>
                    {maxIncomeTx.note && (
                      <p className="text-xs mt-1 truncate" style={{ color: 'var(--ink-2)' }}>{maxIncomeTx.note}</p>
                    )}
                  </div>
                )}
                {!maxExpenseTx && !maxIncomeTx && (
                  <p className="text-sm text-center py-2" style={{ color: 'var(--ink-2)' }}>{t('yearReview.noData')}</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
