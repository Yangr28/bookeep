import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { toDateKey } from '../utils/date';
import { useStore } from '../store/useStore';
import { TransactionCard } from '../components/TransactionCard';
import { formatCurrencyShort } from '../utils/format';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Calendar, CheckSquare, Square, Trash2 } from 'lucide-react';
import { Transaction } from '../types';
import { CalendarPicker } from '../components/CalendarPicker';

import Empty from '../components/Empty';

interface TransactionDetailProps {
  onBack: () => void;
  filterType: 'today-income' | 'today-expense' | 'month-income' | 'month-expense' | 'total-balance' | 'month-balance';
  categoryId?: string | null;
  /** 智能洞察精准定位：非空时仅显示这些 id 对应的记录（优先于其他筛选） */
  insightTransactionIds?: string[] | null;
  onEditTransaction?: (transaction: Transaction) => void;
}

export const TransactionDetail = ({ onBack, filterType, categoryId, insightTransactionIds, onEditTransaction }: TransactionDetailProps) => {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map((t) => t.id));
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach((id) => deleteTransaction(id));
    setSelectedIds([]);
    setIsMultiSelect(false);
  };

  useEffect(() => {
    // 滚动位置由 App.tsx 统一管理；这里仅清除多选状态
    setSelectedIds([]);
    setIsMultiSelect(false);
  }, []);

  const transactions = useStore((state) => state.transactions);
  const deleteTransaction = useStore((state) => state.deleteTransaction);
  const getCategoryById = useStore((state) => state.getCategoryById);
  const categories = useStore((state) => state.categories);
  const totalIncome = useStore((state) => state.getTotalIncome());
  const totalExpense = useStore((state) => state.getTotalExpense());
  const monthIncome = useStore((state) => state.getMonthIncome());
  const monthExpense = useStore((state) => state.getMonthExpense());

  // 分类筛选：'all' 全部 | 'uncategorized' 未分类 | 分类 id（分类明细页内不再重复筛选）
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const resetDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setCategoryFilter('all');
  };

  const filteredTransactions = [...transactions]
    .filter((t) => {
      const tDate = new Date(t.createdAt);
      const dateStr = toDateKey(tDate);
      const isToday = tDate >= todayStart && tDate < todayEnd;
      const isThisMonth = tDate >= monthStart && tDate < monthEnd;
      const isIncome = t.type === 'income';
      const isCategoryMatch = !categoryId || t.categoryId === categoryId;

      if (startDate && dateStr < startDate) return false;
      if (endDate && dateStr > endDate) return false;

      // 分类筛选（转出转入等无分类的记录仅在"全部"下显示）
      if (categoryFilter !== 'all') {
        const recordCategory = categories.find((c) => c.id === t.categoryId);
        if (categoryFilter === 'uncategorized') {
          if (recordCategory) return false;
        } else if (t.categoryId !== categoryFilter) {
          return false;
        }
      }

      if (categoryId) {
        return isCategoryMatch;
      }

      // 智能洞察精准定位：仅显示洞察携带的交易（可跨月，如固定订阅聚类）
      if (insightTransactionIds) {
        return insightTransactionIds.includes(t.id);
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
    'today-income': { titleKey: 'transactionDetail.todayIncome', periodKey: 'transactionDetail.periodToday', type: 'income' as const, color: 'emerald' },
    'today-expense': { titleKey: 'transactionDetail.todayExpense', periodKey: 'transactionDetail.periodToday', type: 'expense' as const, color: 'red' },
    'month-income': { titleKey: 'transactionDetail.monthIncome', periodKey: 'transactionDetail.periodThisMonth', type: 'income' as const, color: 'emerald' },
    'month-expense': { titleKey: 'transactionDetail.monthExpense', periodKey: 'transactionDetail.periodThisMonth', type: 'expense' as const, color: 'red' },
    'month-balance': { titleKey: 'transactionDetail.monthBalance', periodKey: 'transactionDetail.periodThisMonth', type: 'income' as const, color: 'emerald' },
    'total-balance': { titleKey: 'transactionDetail.totalAssets', periodKey: 'transactionDetail.periodAll', type: 'income' as const, color: 'purple' },
  };

  const config = pageConfig[filterType];
  const isIncome = config.type === 'income';
  const isTotalBalance = filterType === 'total-balance';
  const isMonthBalance = filterType === 'month-balance';
  const isCategoryDetail = !!selectedCategory;

  const pageTitle = isCategoryDetail && selectedCategory
    ? t('transactionDetail.categoryDetail', { name: selectedCategory.name })
    : insightTransactionIds
      ? t('transactionDetail.relatedRecords')
      : t(config.titleKey);

  const categoryFilterChips = [
    { value: 'all', label: t('transactionDetail.filterAll') },
    ...categories.map((c) => ({ value: c.id, label: c.name, color: c.color })),
    { value: 'uncategorized', label: t('common.unclassified') },
  ];

  return (
    <div className="page-root pb-6">
      {/* 页头 */}
      <div className="safe-top px-4 pt-2 pb-1 flex items-center gap-3">
        <button onClick={onBack} className="icon-btn flex-shrink-0" aria-label={t('transactionDetail.back')}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="page-title truncate">{pageTitle}</h1>
          <p className="page-subtitle">{t('transactionDetail.recordCount', { count: filteredTransactions.length })}</p>
        </div>
      </div>

      {/* 汇总卡片 */}
      <div className="px-4 mt-3">
        {isCategoryDetail && selectedCategory ? (
          <div className="card p-5">
            <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
              {t('transactionDetail.totalByType', { type: t(`common.${selectedCategory.type}`) })}
            </p>
            <p
              className="text-3xl font-bold amount-num mt-1.5"
              style={{ color: selectedCategory.type === 'income' ? 'var(--primary)' : 'var(--expense)' }}
            >
              {selectedCategory.type === 'income' ? '+' : ''}{formatCurrencyShort(totalAmount)}
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--ink-2)' }}>{t('transactionDetail.recordCountCompact', { count: filteredTransactions.length })}</p>
          </div>
        ) : isTotalBalance ? (
          <div className="card p-5">
            <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>{t('transactionDetail.assetsTotal')}</p>
            <p className="text-3xl font-bold amount-num mt-1.5" style={{ color: 'var(--ink)' }}>
              {formatCurrencyShort(totalIncome - totalExpense)}
            </p>
            <div className="flex justify-between mt-4 pt-3 text-sm" style={{ borderTop: '1px solid var(--line)' }}>
              <div>
                <p style={{ color: 'var(--ink-2)' }}>{t('transactionDetail.totalIncome')}</p>
                <p className="font-semibold amount-num" style={{ color: 'var(--primary)' }}>+{formatCurrencyShort(totalIncome)}</p>
              </div>
              <div className="text-right">
                <p style={{ color: 'var(--ink-2)' }}>{t('transactionDetail.totalExpense')}</p>
                <p className="font-semibold amount-num" style={{ color: 'var(--expense)' }}>{formatCurrencyShort(-totalExpense)}</p>
              </div>
            </div>
          </div>
        ) : isMonthBalance ? (
          <div className="card p-5">
            <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>{t('transactionDetail.monthBalance')}</p>
            <p
              className="text-3xl font-bold amount-num mt-1.5"
              style={{ color: monthIncome - monthExpense >= 0 ? 'var(--primary)' : 'var(--expense)' }}
            >
              {formatCurrencyShort(monthIncome - monthExpense)}
            </p>
            <div className="flex justify-between mt-4 pt-3 text-sm" style={{ borderTop: '1px solid var(--line)' }}>
              <div>
                <p style={{ color: 'var(--ink-2)' }}>{t('transactionDetail.monthIncome')}</p>
                <p className="font-semibold amount-num" style={{ color: 'var(--primary)' }}>+{formatCurrencyShort(monthIncome)}</p>
              </div>
              <div className="text-right">
                <p style={{ color: 'var(--ink-2)' }}>{t('transactionDetail.monthExpense')}</p>
                <p className="font-semibold amount-num" style={{ color: 'var(--expense)' }}>{formatCurrencyShort(-monthExpense)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-5">
            <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>{t('transactionDetail.periodTotal', { period: t(config.periodKey) })}</p>
            <p
              className="text-3xl font-bold amount-num mt-1.5"
              style={{ color: isIncome ? 'var(--primary)' : 'var(--expense)' }}
            >
              {isIncome ? '+' : ''}{formatCurrencyShort(totalAmount)}
            </p>
          </div>
        )}
      </div>

      <div className={`px-4 mt-4 ${isMultiSelect ? 'pb-28' : 'pb-6'}`}>
        {/* 筛选 */}
        <div className="card p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={18} style={{ color: 'var(--ink-2)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{t('transactionDetail.dateFilter')}</span>
            {(startDate || endDate) && (
              <button
                onClick={resetDateFilter}
                className="ml-auto text-xs font-medium"
                style={{ color: 'var(--expense)' }}
              >
                {t('transactionDetail.reset')}
              </button>
            )}
          </div>
          {(filterType === 'total-balance' || categoryId) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { label: t('transactionDetail.presetToday'), days: 0 },
                { label: t('transactionDetail.presetLast7'), days: 7 },
                { label: t('transactionDetail.presetLast30'), days: 30 },
                { label: t('transactionDetail.presetThisMonth'), days: 'month' },
                { label: t('transactionDetail.presetLastMonth'), days: 'lastMonth' },
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

                    setStartDate(toDateKey(start));
                    setEndDate(toDateKey(end));
                  }}
                  className="chip chip-inactive text-xs"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'var(--ink-2)' }}>{t('transactionDetail.startDate')}</label>
              <button
                onClick={() => setShowPicker('start')}
                className="input-field py-2 px-3 text-left text-sm w-full"
              >
                <span className="amount-num" style={{ color: startDate ? 'var(--ink)' : 'var(--ink-2)' }}>
                  {startDate || t('transactionDetail.selectDate')}
                </span>
              </button>
            </div>
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'var(--ink-2)' }}>{t('transactionDetail.endDate')}</label>
              <button
                onClick={() => setShowPicker('end')}
                className="input-field py-2 px-3 text-left text-sm w-full"
              >
                <span className="amount-num" style={{ color: endDate ? 'var(--ink)' : 'var(--ink-2)' }}>
                  {endDate || t('transactionDetail.selectDate')}
                </span>
              </button>
            </div>
          </div>

          {!categoryId && (
            <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
              <span className="text-sm font-medium flex-shrink-0" style={{ color: 'var(--ink)' }}>{t('common.category')}</span>
              <div className="flex-1 flex gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
                {categoryFilterChips.map((chip) => {
                  const active = categoryFilter === chip.value;
                  return (
                    <button
                      key={chip.value}
                      onClick={() => setCategoryFilter(chip.value)}
                      className={`chip flex-shrink-0 text-xs ${active ? 'chip-active' : 'chip-inactive'}`}
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
          )}
        </div>

        {/* 明细标题 + 多选 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={isIncome
                ? { background: 'var(--primary-soft)', color: 'var(--primary)' }
                : { background: 'var(--expense-soft)', color: 'var(--expense)' }}
            >
              {isIncome ? (
                <TrendingUp size={18} />
              ) : (
                <TrendingDown size={18} />
              )}
            </div>
            <h2 className="font-semibold text-base" style={{ color: 'var(--ink)' }}>{t('transactionDetail.transactionDetails')}</h2>
            <span className="text-sm" style={{ color: 'var(--ink-2)' }}>{t('transactionDetail.countParen', { count: filteredTransactions.length })}</span>
          </div>
          <button
            onClick={() => setIsMultiSelect(!isMultiSelect)}
            className="chip text-xs"
            style={isMultiSelect
              ? { background: 'var(--primary)', color: '#fff' }
              : { background: 'var(--paper-deep)', color: 'var(--ink-2)' }}
          >
            {isMultiSelect ? <CheckSquare size={15} /> : <Square size={15} />}
            {isMultiSelect ? t('transactionDetail.exitMultiSelect') : t('transactionDetail.batchSelect')}
          </button>
        </div>

        {filteredTransactions.length === 0 ? (
          <Empty
            icon={Wallet}
            title={t('transactionDetail.emptyTitle', { period: t(config.periodKey), type: t(isIncome ? 'common.income' : 'common.expense') })}
            description={t(isIncome ? 'transactionDetail.emptyAddIncome' : 'transactionDetail.emptyAddExpense')}
          />
        ) : (
          <>
            {isMultiSelect && (
              <div className="flex items-center justify-between mb-3 rounded-button p-3" style={{ background: 'var(--paper)' }}>
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm"
                  style={{ color: 'var(--ink-2)' }}
                >
                  {selectedIds.length === filteredTransactions.length ? (
                    <CheckSquare size={18} style={{ color: 'var(--primary)' }} />
                  ) : (
                    <Square size={18} />
                  )}
                  {t('transactionDetail.selectAll')}
                </button>
                <span className="text-sm" style={{ color: 'var(--ink-2)' }}>
                  {t('transactionDetail.selectedCount', { count: selectedIds.length })}
                </span>
              </div>
            )}
            <div className="space-y-2">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-start gap-2 p-1 rounded-button transition-colors"
                  style={selectedIds.includes(transaction.id) ? { background: 'var(--primary-soft)' } : undefined}
                >
                  {isMultiSelect && (
                    <button
                      onClick={() => toggleSelect(transaction.id)}
                      className="mt-2 flex-shrink-0"
                      aria-label={t('transactionDetail.ariaSelectRecord')}
                    >
                      {selectedIds.includes(transaction.id) ? (
                        <CheckSquare size={20} style={{ color: 'var(--primary)' }} />
                      ) : (
                        <Square size={20} style={{ color: 'var(--ink-2)' }} />
                      )}
                    </button>
                  )}
                  <div className="flex-1">
                    <TransactionCard
                      transaction={transaction}
                      onDelete={() => deleteTransaction(transaction.id)}
                      onEdit={() => onEditTransaction?.(transaction)}
                      disabled={isMultiSelect}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 底部批量删除条 */}
      {isMultiSelect && selectedIds.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 p-4 safe-bottom z-40"
          style={{ background: 'var(--card)', borderTop: '1px solid var(--line)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm amount-num" style={{ color: 'var(--ink-2)' }}>
              {t('transactionDetail.selectedRecords', { count: selectedIds.length })}
            </span>
            <button
              onClick={handleBatchDelete}
              className="btn-danger px-5 py-2.5 text-sm"
            >
              <Trash2 size={16} />
              {t('transactionDetail.batchDelete')}
            </button>
          </div>
        </div>
      )}

      {showPicker && createPortal(
        <CalendarPicker
          selectedDate={(() => {
            const raw = showPicker === 'start' ? startDate : endDate;
            if (raw) {
              const [y, m, d] = raw.split('-').map(Number);
              return new Date(y, m - 1, d);
            }
            return new Date();
          })()}
          onDateChange={(date) => {
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            if (showPicker === 'start') setStartDate(dateStr);
            else setEndDate(dateStr);
            setShowPicker(null);
          }}
          onClose={() => setShowPicker(null)}
        />,
        document.body
      )}
    </div>
  );
};
