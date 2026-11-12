import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toDateKey } from '../utils/date';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';
import { CalendarPicker } from '../components/CalendarPicker';
import { formatCurrencyShort, formatDateTime } from '../utils/format';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, ArrowRightLeft, Trash2, Calendar, Scale, AlertTriangle, CheckCircle2, Wrench } from 'lucide-react';
import { Account, Transfer, Transaction } from '../types';

interface AccountDetailProps {
  onBack: () => void;
  accountId: string;
  onEditTransaction?: (transaction: Transaction) => void;
}

export const AccountDetail = ({ onBack, accountId, onEditTransaction }: AccountDetailProps) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);

  const getAccount = useStore((state) => state.getAccountById);
  const getTransactions = useStore((state) => state.getTransactionsByAccount);
  const getTransfers = useStore((state) => state.getTransfersByAccount);
  const getIncome = useStore((state) => state.getAccountIncome);
  const getExpense = useStore((state) => state.getAccountExpense);
  const getReconciliation = useStore((state) => state.getAccountReconciliation);
  const recalculateAllBalances = useStore((state) => state.recalculateAllBalances);
  const deleteTransaction = useStore((state) => state.deleteTransaction);
  const deleteTransfer = useStore((state) => state.deleteTransfer);

  const handleFixBalance = () => {
    recalculateAllBalances();
    const acc = getAccount(accountId);
    setCurrentAccount(acc || null);
  };

  useEffect(() => {
    // 滚动位置由 App.tsx 统一管理
    if (accountId) {
      const account = getAccount(accountId);
      setCurrentAccount(account || null);
      setLoading(false);
    }
  }, [accountId, getAccount]);

  if (loading) {
    return (
      <div className="page-root pb-6 flex flex-col items-center justify-center">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin mb-4"
          style={{ borderColor: 'var(--line)', borderTopColor: 'var(--primary)' }}
        />
        <p style={{ color: 'var(--ink-2)' }}>{t('common.loading')}</p>
      </div>
    );
  }

  if (!accountId || !currentAccount) {
    return (
      <div className="page-root pb-6 flex flex-col items-center justify-center p-4">
        <p className="mb-4" style={{ color: 'var(--ink-2)' }}>{t('accountDetail.accountNotFound')}</p>
        <button onClick={onBack} className="btn-primary px-6">
          {t('accountDetail.backToAssets')}
        </button>
      </div>
    );
  }

  const transactions = getTransactions(accountId);
  const transfers = getTransfers(accountId);
  const accountIncome = getIncome(accountId);
  const accountExpense = getExpense(accountId);
  const recon = getReconciliation(accountId);
  const hasDiff = Math.abs(recon.diff) >= 0.005;

  interface CombinedRecord {
    id: string;
    type: 'transaction' | 'transfer';
    amount: number;
    direction: 'in' | 'out';
    relatedAccount?: Account;
    transaction?: Transaction;
    transfer?: Transfer;
    createdAt: string;
  }

  const combinedRecords: CombinedRecord[] = [
    ...transactions.map((t) => ({
      id: t.id,
      type: 'transaction' as const,
      amount: t.amount,
      direction: t.type === 'income' ? 'in' as const : 'out' as const,
      transaction: t,
      createdAt: t.createdAt,
    })),
    ...transfers.map((t) => {
      const isOut = t.fromAccountId === accountId;
      const relatedAccountId = isOut ? t.toAccountId : t.fromAccountId;
      const relatedAccount = getAccount(relatedAccountId);
      return {
        id: t.id,
        type: 'transfer' as const,
        amount: t.amount,
        direction: isOut ? 'out' as const : 'in' as const,
        relatedAccount,
        transfer: t,
        createdAt: t.createdAt,
      };
    }),
  ];

  const filteredRecords = combinedRecords.filter((record) => {
    const dateStr = toDateKey(new Date(record.createdAt));

    if (startDate && dateStr < startDate) return false;
    if (endDate && dateStr > endDate) return false;
    return true;
  });

  const sortedRecords = filteredRecords.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  const accountTypeLabel = t('accountDetail.accountTypeLabel', {
    type: t(`accountDetail.type.${currentAccount.type}`),
  });

  return (
    <div className="page-root pb-6">
      {/* 页头 */}
      <div className="safe-top px-4 pt-2 pb-1 flex items-center gap-3">
        <button onClick={onBack} className="icon-btn flex-shrink-0" aria-label={t('accountDetail.ariaBack')}>
          <ArrowLeft size={20} />
        </button>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${currentAccount.color}30`, color: currentAccount.color }}
        >
          <Wallet size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="page-title truncate" style={{ fontSize: '1.35rem' }}>{currentAccount.name}</h1>
          <p className="page-subtitle">{accountTypeLabel}</p>
        </div>
      </div>

      {/* 账户余额 */}
      <div className="px-4 mt-3">
        <div className="card p-4">
          <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>{t('accountDetail.balance')}</p>
          <p className="text-3xl font-bold amount-num mt-1.5 truncate" style={{ color: 'var(--ink)' }}>
            {formatCurrencyShort(currentAccount.balance)}
          </p>
        </div>
      </div>

      {/* 收支概览 */}
      <div className="px-4 mt-3">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="card p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                <TrendingUp size={16} />
              </div>
              <span className="text-sm truncate min-w-0" style={{ color: 'var(--ink-2)' }}>{t('accountDetail.totalIncome')}</span>
            </div>
            <p className="text-lg font-bold amount-num truncate" style={{ color: 'var(--primary)' }}>+{formatCurrencyShort(accountIncome)}</p>
          </div>
          <div className="card p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--expense-soft)', color: 'var(--expense)' }}>
                <TrendingDown size={16} />
              </div>
              <span className="text-sm truncate min-w-0" style={{ color: 'var(--ink-2)' }}>{t('accountDetail.totalExpense')}</span>
            </div>
            <p className="text-lg font-bold amount-num truncate" style={{ color: 'var(--expense)' }}>-{formatCurrencyShort(accountExpense)}</p>
          </div>
        </div>
      </div>

      {/* 对账 */}
      <div className="px-4 mt-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Scale size={17} style={{ color: 'var(--ink-2)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{t('accountDetail.reconciliation')}</span>
            <span className="text-xs ml-auto" style={{ color: 'var(--ink-2)' }}>{t('accountDetail.reconFormula')}</span>
          </div>
          <div className="space-y-1.5 text-sm">
            {[
              { label: t('accountDetail.initialBalance'), value: recon.initialBalance },
              { label: t('common.income'), value: recon.income, prefix: '+', color: 'var(--primary)' },
              { label: t('common.expense'), value: recon.expense, prefix: '-', color: 'var(--expense)' },
              { label: t('accountDetail.transferIn'), value: recon.transfersIn, prefix: '+', color: 'var(--primary)' },
              { label: t('accountDetail.transferOut'), value: recon.transfersOut, prefix: '-', color: 'var(--expense)' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span style={{ color: 'var(--ink-2)' }}>{row.label}</span>
                <span className="amount-num" style={{ color: row.color || 'var(--ink)' }}>
                  {row.prefix || ''}{formatCurrencyShort(row.value)}
                </span>
              </div>
            ))}
          </div>
          <div className="my-3" style={{ borderTop: '1px dashed var(--line)' }} />
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--ink-2)' }}>{t('accountDetail.expectedBalance')}</span>
              <span className="amount-num font-semibold" style={{ color: 'var(--ink)' }}>{formatCurrencyShort(recon.expectedBalance)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--ink-2)' }}>{t('accountDetail.currentBalance')}</span>
              <span className="amount-num font-semibold" style={{ color: 'var(--ink)' }}>{formatCurrencyShort(recon.currentBalance)}</span>
            </div>
          </div>

          {hasDiff ? (
            <div className="mt-3 rounded-card p-3" style={{ background: 'var(--expense-soft)' }}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={16} style={{ color: 'var(--expense)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--expense)' }}>
                  {t('accountDetail.diffLabel')} {recon.diff > 0 ? '+' : '-'}{formatCurrencyShort(Math.abs(recon.diff))}
                </span>
              </div>
              <p className="text-xs mb-2.5" style={{ color: 'var(--expense)' }}>
                {t('accountDetail.diffHint')}
              </p>
              <button onClick={handleFixBalance} className="btn-primary w-full py-2 text-sm flex items-center justify-center gap-1.5">
                <Wrench size={15} />
                {t('accountDetail.fixBalance')}
              </button>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 rounded-card p-2.5" style={{ background: 'var(--primary-soft)' }}>
              <CheckCircle2 size={15} style={{ color: 'var(--primary)' }} />
              <span className="text-xs" style={{ color: 'var(--primary-ink)' }}>{t('accountDetail.balanced')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* 日期筛选 */}
        <div className="card p-3.5 mb-3">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={18} style={{ color: 'var(--ink-2)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{t('accountDetail.dateFilter')}</span>
            {(startDate || endDate) && (
              <button
                onClick={handleResetFilter}
                className="ml-auto text-xs font-medium"
                style={{ color: 'var(--expense)' }}
              >
                {t('accountDetail.reset')}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPicker('start')}
              className="input-field flex-1 py-2.5 px-3 text-left text-sm flex items-center gap-2"
            >
              <span className="amount-num" style={{ color: startDate ? 'var(--ink)' : 'var(--ink-3)' }}>
                {startDate || t('accountDetail.startDate')}
              </span>
            </button>
            <button
              onClick={() => setShowPicker('end')}
              className="input-field flex-1 py-2.5 px-3 text-left text-sm flex items-center gap-2"
            >
              <span className="amount-num" style={{ color: endDate ? 'var(--ink)' : 'var(--ink-2)' }}>
                {endDate || t('accountDetail.endDate')}
              </span>
            </button>
          </div>
        </div>

        {/* 交易记录：左列收入、右列支出，直观呈现资金双向变动 */}
        <h2 className="section-title">{t('accountDetail.transactions')}</h2>
        {sortedRecords.length > 0 ? (
          <div className="grid grid-cols-2 gap-2.5 pb-6">
            {([
              { key: 'in' as const, label: t('common.income'), color: 'var(--primary)' },
              { key: 'out' as const, label: t('common.expense'), color: 'var(--expense)' },
            ]).map((column) => {
              const columnRecords = sortedRecords.filter((r) => r.direction === column.key);
              const columnTotal = columnRecords.reduce((sum, r) => sum + r.amount, 0);
              return (
                <div key={column.key} className="min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-2 px-0.5">
                    <span className="text-xs font-semibold truncate min-w-0" style={{ color: column.color }}>
                      {column.label}
                    </span>
                    <span className="text-xs font-semibold amount-num truncate flex-shrink-0" style={{ color: column.color }}>
                      {column.key === 'in' ? '+' : '-'}{formatCurrencyShort(columnTotal)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {columnRecords.length === 0 ? (
                      <div className="card p-2.5 text-center text-[11px]" style={{ color: 'var(--ink-2)' }}>
                        —
                      </div>
                    ) : (
                      columnRecords.map((record) => {
                        const isIn = record.direction === 'in';
                        const amountColor = isIn ? 'var(--primary)' : 'var(--expense)';

                        if (record.type === 'transaction' && record.transaction) {
                          const tx = record.transaction;
                          const category = useStore.getState().getCategoryById(tx.categoryId);
                          return (
                            <div
                              key={record.id}
                              role="button"
                              tabIndex={0}
                              onClick={onEditTransaction ? () => onEditTransaction(tx) : undefined}
                              className="card p-2.5 active:brightness-95 transition-[filter]"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: category?.color || 'var(--ink-2)' }}
                                />
                                <span className="text-xs truncate min-w-0" style={{ color: 'var(--ink-2)' }}>
                                  {category?.name || t('common.unclassified')}
                                </span>
                              </div>
                              <p className="text-sm font-bold amount-num mt-1 truncate" style={{ color: amountColor }}>
                                {isIn ? '+' : '-'}{formatCurrencyShort(record.amount)}
                              </p>
                              <div className="flex items-center justify-between gap-1 mt-0.5">
                                <p className="text-[10px] truncate min-w-0" style={{ color: 'var(--ink-2)' }}>
                                  {tx.note || formatDateTime(record.createdAt)}
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTransaction(record.id);
                                  }}
                                  className="flex-shrink-0 p-0.5"
                                  aria-label={t('common.delete')}
                                >
                                  <Trash2 size={12} style={{ color: 'var(--expense)' }} />
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={record.id} className="card p-2.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <ArrowRightLeft size={12} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
                              <span className="text-xs truncate min-w-0" style={{ color: 'var(--ink-2)' }}>
                                {isIn ? t('accountDetail.transferIn') : t('accountDetail.transferOut')}
                                {' · '}
                                {record.relatedAccount?.name || t('accountDetail.unknownAccount')}
                              </span>
                            </div>
                            <p className="text-sm font-bold amount-num mt-1 truncate" style={{ color: amountColor }}>
                              {isIn ? '+' : '-'}{formatCurrencyShort(record.amount)}
                            </p>
                            <div className="flex items-center justify-between gap-1 mt-0.5">
                              <p className="text-[10px] truncate min-w-0" style={{ color: 'var(--ink-2)' }}>
                                {formatDateTime(record.createdAt)}
                              </p>
                              <button
                                onClick={() => deleteTransfer(record.id)}
                                className="flex-shrink-0 p-0.5"
                                aria-label={t('common.delete')}
                              >
                                <Trash2 size={12} style={{ color: 'var(--expense)' }} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
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
            <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{t('accountDetail.emptyRecords')}</p>
          </div>
        )}
      </div>

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
