import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toDateKey } from '../utils/date';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';
import { TransactionCard } from '../components/TransactionCard';
import { CalendarPicker } from '../components/CalendarPicker';
import { formatCurrencyShort, formatDateTime } from '../utils/format';
import { ArrowLeft, Calendar, ArrowRightLeft, Wallet, X, ChevronDown, ListChecks, FolderInput } from 'lucide-react';
import { Transaction, Transfer, Category } from '../types';
import { CategoryCard } from '../components/CategoryCard';

interface AllRecordsProps {
  isTab?: boolean;
  onBack?: () => void;
  onEditTransaction?: (transaction: Transaction) => void;
  onToast?: (message: string) => void;
}

export const AllRecords = ({ isTab = false, onBack, onEditTransaction, onToast }: AllRecordsProps) => {
  const { t } = useTranslation();

  const transactions = useStore((state) => state.transactions);
  const transfers = useStore((state) => state.transfers);
  const accounts = useStore((state) => state.accounts);
  const categories = useStore((state) => state.categories);
  const deleteTransaction = useStore((state) => state.deleteTransaction);
  const deleteTransfer = useStore((state) => state.deleteTransfer);
  const moveTransactionsToCategory = useStore((state) => state.moveTransactionsToCategory);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // 分类筛选：'all' 全部 | 'uncategorized' 未分类 | 分类 id
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  // 日期选择弹窗
  const [showDatePicker, setShowDatePicker] = useState<null | 'start' | 'end'>(null);

  // 批量管理：多选记录并批量移动到其他分类（转账无分类，不参与）
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const getAccountById = (id: string) => accounts.find((a) => a.id === id);

  interface Record {
    id: string;
    type: 'transaction' | 'transfer';
    amount: number;
    direction: 'in' | 'out' | 'transfer';
    categoryName?: string;
    relatedAccountName?: string;
    note?: string;
    createdAt: string;
    transaction?: Transaction;
    transfer?: Transfer;
  }

  const allRecords: Record[] = [
    ...transactions.map((tx) => {
      const category = useStore.getState().getCategoryById(tx.categoryId);
      return {
        id: tx.id,
        type: 'transaction' as const,
        amount: tx.amount,
        direction: tx.type === 'income' ? 'in' as const : 'out' as const,
        categoryName: category?.name || t('common.unclassified'),
        note: tx.note,
        createdAt: tx.createdAt,
        transaction: tx,
      };
    }),
    ...transfers.map((tr) => {
      const fromAccount = getAccountById(tr.fromAccountId);
      const toAccount = getAccountById(tr.toAccountId);
      return {
        id: tr.id,
        type: 'transfer' as const,
        amount: tr.amount,
        direction: 'transfer' as const,
        relatedAccountName: t('allRecords.transferPath', {
          from: fromAccount?.name || t('common.unknown'),
          to: toAccount?.name || t('common.unknown'),
        }),
        note: tr.note || t('allRecords.transfer'),
        createdAt: tr.createdAt,
        transfer: tr,
      };
    }),
  ];

  const filteredRecords = allRecords.filter((record) => {
    const dateStr = toDateKey(new Date(record.createdAt));

    if (startDate && dateStr < startDate) return false;
    if (endDate && dateStr > endDate) return false;

    // 分类筛选：转账无分类，筛选分类时隐藏
    if (categoryFilter !== 'all') {
      if (record.type !== 'transaction' || !record.transaction) return false;
      const recordCategory = categories.find((c) => c.id === record.transaction!.categoryId);
      if (categoryFilter === 'uncategorized') {
        if (recordCategory) return false;
      } else if (record.transaction.categoryId !== categoryFilter) {
        return false;
      }
    }
    return true;
  });

  const sortedRecords = filteredRecords.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalIncome = sortedRecords
    .filter((r) => r.type === 'transaction' && r.direction === 'in')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalExpense = sortedRecords
    .filter((r) => r.type === 'transaction' && r.direction === 'out')
    .reduce((sum, r) => sum + r.amount, 0);

  const hasFilter = !!(startDate || endDate || categoryFilter !== 'all');

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    setCategoryFilter('all');
  };

  // 当前筛选结果中可参与批量操作的记录（仅收支记录，转账无分类）
  const selectableIds = sortedRecords
    .filter((r) => r.type === 'transaction')
    .map((r) => r.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

  const enterBatchMode = () => {
    setBatchMode(true);
    setSelectedIds(new Set());
  };

  const exitBatchMode = () => {
    setBatchMode(false);
    setSelectedIds(new Set());
    setShowCategoryPicker(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableIds));
    }
  };

  const handleMoveToCategory = (category: Category) => {
    const ids = [...selectedIds];
    moveTransactionsToCategory(ids, category.id);
    onToast?.(t('app.toast.batchMoved', { count: ids.length, category: category.name }));
    exitBatchMode();
  };

  const categoryFilterChips = [
    { value: 'all', label: t('allRecords.filterAll') },
    ...categories.map((c) => ({ value: c.id, label: c.name, color: c.color })),
    { value: 'uncategorized', label: t('common.unclassified') },
  ];

  return (
    <div className={`page-root ${isTab ? 'pb-nav' : 'pb-24'}`}>
      {/* 头部 */}
      <div className="safe-top px-4 pt-2 pb-1 flex items-center gap-3">
        {batchMode ? (
          <button onClick={exitBatchMode} className="icon-btn" aria-label={t('allRecords.batchExit')}>
            <X size={20} />
          </button>
        ) : !isTab && onBack ? (
          <button onClick={onBack} className="icon-btn" aria-label={t('allRecords.back')}>
            <ArrowLeft size={20} />
          </button>
        ) : null}
        <div className="flex-1">
          <h1 className="page-title">
            {batchMode
              ? t('allRecords.selectedCount', { count: selectedIds.size })
              : isTab ? t('nav.records') : t('allRecords.title')}
          </h1>
          {!batchMode && (
            <p className="page-subtitle">{t('allRecords.recordCount', { count: sortedRecords.length })}</p>
          )}
        </div>
        {batchMode ? (
          <button
            onClick={toggleSelectAll}
            disabled={selectableIds.length === 0}
            className="text-sm font-medium px-1 py-1 disabled:opacity-40"
            style={{ color: 'var(--primary)' }}
          >
            {allSelected ? t('allRecords.deselectAll') : t('allRecords.selectAll')}
          </button>
        ) : (
          <button onClick={enterBatchMode} className="icon-btn" aria-label={t('allRecords.batchManage')}>
            <ListChecks size={20} />
          </button>
        )}
      </div>

      {/* 收支概览 */}
      <div className="px-4 mt-3">
        <div className="card p-4">
          <div className="flex items-center justify-around">
            <div className="text-center flex-1">
              <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('common.income')}</p>
              <p className="text-lg font-bold amount-num mt-1" style={{ color: 'var(--primary)' }}>
                +{formatCurrencyShort(totalIncome)}
              </p>
            </div>
            <div className="w-px self-stretch" style={{ background: 'var(--line)' }} />
            <div className="text-center flex-1">
              <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('common.expense')}</p>
              <p className="text-lg font-bold amount-num mt-1" style={{ color: 'var(--expense)' }}>
                -{formatCurrencyShort(totalExpense)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选 */}
      <div className="px-4 mt-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} style={{ color: 'var(--ink-2)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{t('allRecords.filter')}</span>
            {hasFilter && (
              <button onClick={handleResetFilter} className="ml-auto flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--expense)' }}>
                <X size={12} />
                {t('allRecords.reset')}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              { label: t('allRecords.presetToday'), days: 0 },
              { label: t('allRecords.presetLast7'), days: 7 },
              { label: t('allRecords.presetLast30'), days: 30 },
              { label: t('allRecords.presetThisMonth'), days: 'month' },
              { label: t('allRecords.presetLastMonth'), days: 'lastMonth' },
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
                className="chip chip-inactive"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'var(--ink-2)' }}>{t('allRecords.startDate')}</label>
              <button
                onClick={() => setShowDatePicker('start')}
                className="input-field w-full py-2 text-sm flex items-center justify-between"
                style={{ textAlign: 'left' }}
              >
                <span style={{ color: startDate ? 'var(--ink)' : 'var(--ink-2)' }}>
                  {startDate || t('allRecords.pleaseSelect')}
                </span>
                <ChevronDown size={16} style={{ color: 'var(--ink-2)' }} />
              </button>
            </div>
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'var(--ink-2)' }}>{t('allRecords.endDate')}</label>
              <button
                onClick={() => setShowDatePicker('end')}
                className="input-field w-full py-2 text-sm flex items-center justify-between"
                style={{ textAlign: 'left' }}
              >
                <span style={{ color: endDate ? 'var(--ink)' : 'var(--ink-2)' }}>
                  {endDate || t('allRecords.pleaseSelect')}
                </span>
                <ChevronDown size={16} style={{ color: 'var(--ink-2)' }} />
              </button>
            </div>
          </div>

          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
              {categoryFilterChips.map((chip) => {
                const active = categoryFilter === chip.value;
                return (
                  <button
                    key={chip.value}
                    onClick={() => setCategoryFilter(chip.value)}
                    className={`chip flex-shrink-0 ${active ? 'chip-active' : 'chip-inactive'}`}
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
        </div>
      </div>

      {/* 明细列表 */}
      <div className="px-4 mt-5">
        <h2 className="section-title">{t('allRecords.transactionDetails')}</h2>
        {sortedRecords.length > 0 ? (
          <div>
            {sortedRecords.map((record) => {
              if (record.type === 'transaction' && record.transaction) {
                return (
                  <TransactionCard
                    key={record.id}
                    transaction={record.transaction}
                    onDelete={() => deleteTransaction(record.id)}
                    onEdit={onEditTransaction ? () => onEditTransaction(record.transaction!) : undefined}
                    selectMode={batchMode}
                    selected={selectedIds.has(record.id)}
                    onToggleSelect={() => toggleSelect(record.id)}
                  />
                );
              }

              return (
                <div
                  key={record.id}
                  className="card p-3 mb-2"
                  style={batchMode ? { opacity: 0.45 } : undefined}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
                      >
                        <ArrowRightLeft size={17} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                            {record.relatedAccountName || t('allRecords.transfer')}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--ink-2)' }}>
                          {record.note || t('allRecords.transfer')} · {formatDateTime(record.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="font-semibold amount-num" style={{ color: 'var(--primary)' }}>
                        {formatCurrencyShort(record.amount)}
                      </p>
                      {!batchMode && (
                        <button
                          onClick={() => deleteTransfer(record.id)}
                          className="text-xs px-2 py-1 rounded-button"
                          style={{ color: 'var(--expense)', background: 'var(--expense-soft)' }}
                        >
                          {t('common.delete')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card flex flex-col items-center py-12">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--paper-deep)' }}>
              <Wallet size={28} style={{ color: 'var(--ink-2)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{t('allRecords.noRecords')}</p>
          </div>
        )}
      </div>

      {/* 批量操作底栏：覆盖在底部导航之上 */}
      {batchMode && createPortal(
        <div
          className="fixed bottom-0 left-0 right-0 z-[60] animate-slide-up"
          style={{ background: 'var(--card)', boxShadow: '0 -2px 12px rgba(0,0,0,0.10)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="px-4 py-3 flex items-center gap-3">
            <span className="text-sm font-medium flex-shrink-0" style={{ color: 'var(--ink-2)' }}>
              {t('allRecords.selectedCount', { count: selectedIds.size })}
            </span>
            <button
              onClick={() => setShowCategoryPicker(true)}
              disabled={selectedIds.size === 0}
              className="ml-auto flex items-center gap-1.5 px-4 py-2.5 rounded-button text-sm font-medium text-white disabled:opacity-40 active:scale-95 transition-transform"
              style={{ background: 'var(--primary)' }}
            >
              <FolderInput size={16} />
              {t('allRecords.moveToCategory')}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* 目标分类选择弹层 */}
      {showCategoryPicker && createPortal(
        <>
          <div
            className="fixed inset-0 z-[70]"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={() => setShowCategoryPicker(false)}
          />
          <div
            className="fixed left-0 right-0 bottom-0 z-[71] animate-slide-up rounded-t-card p-4"
            style={{
              background: 'var(--card)',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
              maxHeight: '75vh',
              overflowY: 'auto',
            }}
          >
            <div className="flex items-center mb-4">
              <h2 className="text-base font-semibold flex-1" style={{ color: 'var(--ink)' }}>
                {t('allRecords.pickCategoryTitle')}
              </h2>
              <button onClick={() => setShowCategoryPicker(false)} className="icon-btn" aria-label={t('allRecords.batchExit')}>
                <X size={20} />
              </button>
            </div>
            {([
              { type: 'expense' as const, label: t('common.expense') },
              { type: 'income' as const, label: t('common.income') },
            ]).map((group) => {
              const groupCategories = categories.filter((c) => c.type === group.type);
              if (groupCategories.length === 0) return null;
              return (
                <div key={group.type} className="mb-4">
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--ink-2)' }}>{group.label}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {groupCategories.map((category) => (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        onClick={() => handleMoveToCategory(category)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>,
        document.body
      )}

      {/* 日期选择弹窗 */}
      {showDatePicker && createPortal(
        <CalendarPicker
          selectedDate={new Date(showDatePicker === 'start' ? startDate || new Date() : endDate || new Date())}
          onDateChange={(date) => {
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            if (showDatePicker === 'start') {
              setStartDate(dateStr);
            } else {
              setEndDate(dateStr);
            }
            setShowDatePicker(null);
          }}
          onClose={() => setShowDatePicker(null)}
        />,
        document.body
      )}
    </div>
  );
};
