import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';
import { TransactionCard } from '../components/TransactionCard';
import { CalendarPicker } from '../components/CalendarPicker';
import { formatCurrencyShort, formatDateTime } from '../utils/format';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, ArrowRightLeft, ArrowRight, Calendar, Scale, AlertTriangle, CheckCircle2, Wrench } from 'lucide-react';
import { Account, Transfer, Transaction } from '../types';

interface AccountDetailProps {
  onBack: () => void;
  accountId: string;
  onEditTransaction?: (transaction: Transaction) => void;
}

export const AccountDetail = ({ onBack, accountId, onEditTransaction }: AccountDetailProps) => {
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
    window.scrollTo(0, 0);
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
        <p style={{ color: 'var(--ink-2)' }}>加载中...</p>
      </div>
    );
  }

  if (!accountId || !currentAccount) {
    return (
      <div className="page-root pb-6 flex flex-col items-center justify-center p-4">
        <p className="mb-4" style={{ color: 'var(--ink-2)' }}>账户不存在</p>
        <button onClick={onBack} className="btn-primary px-6">
          返回资产页面
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
    const date = new Date(record.createdAt);
     const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

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

  const accountTypeLabel =
    currentAccount.type === 'bank' ? '银行' :
    currentAccount.type === 'alipay' ? '支付宝' :
    currentAccount.type === 'wechat' ? '微信' :
    currentAccount.type === 'cash' ? '现金' : '其他';

  return (
    <div className="page-root pb-6">
      {/* 页头 */}
      <div className="safe-top px-4 pt-2 pb-1 flex items-center gap-3">
        <button onClick={onBack} className="icon-btn flex-shrink-0" aria-label="返回">
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
          <p className="page-subtitle">{accountTypeLabel}账户</p>
        </div>
      </div>

      {/* 账户余额 */}
      <div className="px-4 mt-3">
        <div className="card p-5">
          <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>账户余额</p>
          <p className="text-3xl font-bold amount-num mt-1.5" style={{ color: 'var(--ink)' }}>
            {formatCurrencyShort(currentAccount.balance)}
          </p>
        </div>
      </div>

      {/* 收支概览 */}
      <div className="px-4 mt-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                <TrendingUp size={16} />
              </div>
              <span className="text-sm" style={{ color: 'var(--ink-2)' }}>总收入</span>
            </div>
            <p className="text-lg font-bold amount-num" style={{ color: 'var(--primary)' }}>+{formatCurrencyShort(accountIncome)}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--expense-soft)', color: 'var(--expense)' }}>
                <TrendingDown size={16} />
              </div>
              <span className="text-sm" style={{ color: 'var(--ink-2)' }}>总支出</span>
            </div>
            <p className="text-lg font-bold amount-num" style={{ color: 'var(--expense)' }}>-{formatCurrencyShort(accountExpense)}</p>
          </div>
        </div>
      </div>

      {/* 对账 */}
      <div className="px-4 mt-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Scale size={17} style={{ color: 'var(--ink-2)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>对账</span>
            <span className="text-xs ml-auto" style={{ color: 'var(--ink-2)' }}>初始 + 收入 - 支出 + 转入 - 转出</span>
          </div>
          <div className="space-y-1.5 text-sm">
            {[
              { label: '初始余额', value: recon.initialBalance },
              { label: '收入', value: recon.income, prefix: '+', color: 'var(--primary)' },
              { label: '支出', value: recon.expense, prefix: '-', color: 'var(--expense)' },
              { label: '转入', value: recon.transfersIn, prefix: '+', color: 'var(--primary)' },
              { label: '转出', value: recon.transfersOut, prefix: '-', color: 'var(--expense)' },
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
              <span style={{ color: 'var(--ink-2)' }}>理论余额</span>
              <span className="amount-num font-semibold" style={{ color: 'var(--ink)' }}>{formatCurrencyShort(recon.expectedBalance)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--ink-2)' }}>当前余额</span>
              <span className="amount-num font-semibold" style={{ color: 'var(--ink)' }}>{formatCurrencyShort(recon.currentBalance)}</span>
            </div>
          </div>

          {hasDiff ? (
            <div className="mt-3 rounded-card p-3" style={{ background: 'var(--expense-soft)' }}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={16} style={{ color: 'var(--expense)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--expense)' }}>
                  账目差额 {recon.diff > 0 ? '+' : '-'}{formatCurrencyShort(Math.abs(recon.diff))}
                </span>
              </div>
              <p className="text-xs mb-2.5" style={{ color: 'var(--expense)' }}>
                余额与流水对不上，可能是记录被误删或编辑异常。校正后余额将按流水重算。
              </p>
              <button onClick={handleFixBalance} className="btn-primary w-full py-2 text-sm flex items-center justify-center gap-1.5">
                <Wrench size={15} />
                一键校正为理论余额
              </button>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 rounded-card p-2.5" style={{ background: 'var(--primary-soft)' }}>
              <CheckCircle2 size={15} style={{ color: 'var(--primary)' }} />
              <span className="text-xs" style={{ color: 'var(--primary-ink)' }}>账目平衡，余额与流水一致</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* 日期筛选 */}
        <div className="card p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={18} style={{ color: 'var(--ink-2)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>日期筛选</span>
            {(startDate || endDate) && (
              <button
                onClick={handleResetFilter}
                className="ml-auto text-xs font-medium"
                style={{ color: 'var(--expense)' }}
              >
                重置
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPicker('start')}
              className="input-field flex-1 py-2.5 px-3 text-left text-sm flex items-center gap-2"
            >
              <span className="amount-num" style={{ color: startDate ? 'var(--ink)' : 'var(--ink-3)' }}>
                {startDate || '开始日期'}
              </span>
            </button>
            <button
              onClick={() => setShowPicker('end')}
              className="input-field flex-1 py-2.5 px-3 text-left text-sm flex items-center gap-2"
            >
              <span className="amount-num" style={{ color: endDate ? 'var(--ink)' : 'var(--ink-2)' }}>
                {endDate || '结束日期'}
              </span>
            </button>
          </div>
        </div>

        {/* 交易记录 */}
        <h2 className="section-title">交易记录</h2>
        {sortedRecords.length > 0 ? (
          <div className="space-y-2 pb-6">
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

              const isIn = record.direction === 'in';
              return (
                <div key={record.id} className="card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={isIn
                          ? { background: 'var(--primary-soft)', color: 'var(--primary)' }
                          : { background: 'var(--expense-soft)', color: 'var(--expense)' }}
                      >
                        <ArrowRightLeft size={17} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs flex-shrink-0" style={{ color: 'var(--ink-2)' }}>
                            {isIn ? '转入' : '转出'}
                          </span>
                          <ArrowRight size={12} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                            {record.relatedAccount?.name || '未知账户'}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--ink-2)' }}>
                          {record.transfer?.note || '转账'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p
                        className="font-semibold amount-num"
                        style={{ color: isIn ? 'var(--primary)' : 'var(--expense)' }}
                      >
                        {isIn ? '+' : '-'}{formatCurrencyShort(record.amount)}
                      </p>
                      <p className="text-xs mt-0.5 amount-num" style={{ color: 'var(--ink-2)' }}>
                        {formatDateTime(record.createdAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTransfer(record.id)}
                    className="mt-2 text-xs font-medium"
                    style={{ color: 'var(--expense)' }}
                  >
                    删除
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card flex flex-col items-center py-12">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--paper-deep)' }}>
              <Wallet size={28} style={{ color: 'var(--ink-2)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--ink-2)' }}>该账户暂无交易记录</p>
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
