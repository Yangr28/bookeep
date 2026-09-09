import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';
import { TransactionCard } from '../components/TransactionCard';
import { CalendarPicker } from '../components/CalendarPicker';
import { formatCurrencyShort, formatDateTime } from '../utils/format';
import { ArrowLeft, Calendar, ArrowRightLeft, Wallet, X, ChevronDown } from 'lucide-react';
import { Transaction, Transfer } from '../types';

interface AllRecordsProps {
  isTab?: boolean;
  onBack?: () => void;
  onEditTransaction?: (transaction: Transaction) => void;
}

export const AllRecords = ({ isTab = false, onBack, onEditTransaction }: AllRecordsProps) => {

  const transactions = useStore((state) => state.transactions);
  const transfers = useStore((state) => state.transfers);
  const accounts = useStore((state) => state.accounts);
  const categories = useStore((state) => state.categories);
  const deleteTransaction = useStore((state) => state.deleteTransaction);
  const deleteTransfer = useStore((state) => state.deleteTransfer);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // 分类筛选：'all' 全部 | 'uncategorized' 未分类 | 分类 id
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  // 日期选择弹窗
  const [showDatePicker, setShowDatePicker] = useState<null | 'start' | 'end'>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
    ...transactions.map((t) => {
      const category = useStore.getState().getCategoryById(t.categoryId);
      return {
        id: t.id,
        type: 'transaction' as const,
        amount: t.amount,
        direction: t.type === 'income' ? 'in' as const : 'out' as const,
        categoryName: category?.name || '未分类',
        note: t.note,
        createdAt: t.createdAt,
        transaction: t,
      };
    }),
    ...transfers.map((t) => {
      const fromAccount = getAccountById(t.fromAccountId);
      const toAccount = getAccountById(t.toAccountId);
      return {
        id: t.id,
        type: 'transfer' as const,
        amount: t.amount,
        direction: 'transfer' as const,
        relatedAccountName: `${fromAccount?.name || '未知'} → ${toAccount?.name || '未知'}`,
        note: t.note || '转账',
        createdAt: t.createdAt,
        transfer: t,
      };
    }),
  ];

  const filteredRecords = allRecords.filter((record) => {
    const date = new Date(record.createdAt);
    const dateStr = date.toISOString().split('T')[0];

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

  const categoryFilterChips = [
    { value: 'all', label: '全部' },
    ...categories.map((c) => ({ value: c.id, label: c.name, color: c.color })),
    { value: 'uncategorized', label: '未分类' },
  ];

  return (
    <div className={`page-root ${isTab ? 'pb-nav' : 'pb-24'}`}>
      {/* 头部 */}
      <div className="safe-top px-4 pt-2 pb-1 flex items-center gap-3">
        {!isTab && onBack && (
          <button onClick={onBack} className="icon-btn" aria-label="返回">
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="flex-1">
          <h1 className="page-title">{isTab ? '账单' : '全部记录'}</h1>
          <p className="page-subtitle">共 {sortedRecords.length} 条记录</p>
        </div>
      </div>

      {/* 收支概览 */}
      <div className="px-4 mt-3">
        <div className="card p-4">
          <div className="flex items-center justify-around">
            <div className="text-center flex-1">
              <p className="text-xs" style={{ color: 'var(--ink-2)' }}>收入</p>
              <p className="text-lg font-bold amount-num mt-1" style={{ color: 'var(--primary)' }}>
                +{formatCurrencyShort(totalIncome)}
              </p>
            </div>
            <div className="w-px self-stretch" style={{ background: 'var(--line)' }} />
            <div className="text-center flex-1">
              <p className="text-xs" style={{ color: 'var(--ink-2)' }}>支出</p>
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
            <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>筛选</span>
            {hasFilter && (
              <button onClick={handleResetFilter} className="ml-auto flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--expense)' }}>
                <X size={12} />
                重置
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              { label: '今日', days: 0 },
              { label: '近7天', days: 7 },
              { label: '近30天', days: 30 },
              { label: '本月', days: 'month' },
              { label: '上月', days: 'lastMonth' },
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

                  setStartDate(start.toISOString().split('T')[0]);
                  setEndDate(end.toISOString().split('T')[0]);
                }}
                className="chip chip-inactive"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'var(--ink-2)' }}>开始日期</label>
              <button
                onClick={() => setShowDatePicker('start')}
                className="input-field w-full py-2 text-sm flex items-center justify-between"
                style={{ textAlign: 'left' }}
              >
                <span style={{ color: startDate ? 'var(--ink)' : 'var(--ink-2)' }}>
                  {startDate || '请选择'}
                </span>
                <ChevronDown size={16} style={{ color: 'var(--ink-2)' }} />
              </button>
            </div>
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'var(--ink-2)' }}>结束日期</label>
              <button
                onClick={() => setShowDatePicker('end')}
                className="input-field w-full py-2 text-sm flex items-center justify-between"
                style={{ textAlign: 'left' }}
              >
                <span style={{ color: endDate ? 'var(--ink)' : 'var(--ink-2)' }}>
                  {endDate || '请选择'}
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
        <h2 className="section-title">交易明细</h2>
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
                  />
                );
              }

              return (
                <div key={record.id} className="card p-3 mb-2">
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
                            {record.relatedAccountName || '转账'}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--ink-2)' }}>
                          {record.note || '转账'} · {formatDateTime(record.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="font-semibold amount-num" style={{ color: 'var(--primary)' }}>
                        {formatCurrencyShort(record.amount)}
                      </p>
                      <button
                        onClick={() => deleteTransfer(record.id)}
                        className="text-xs px-2 py-1 rounded-button"
                        style={{ color: 'var(--expense)', background: 'var(--expense-soft)' }}
                      >
                        删除
                      </button>
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
            <p className="text-sm" style={{ color: 'var(--ink-2)' }}>暂无记录</p>
          </div>
        )}
      </div>

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
