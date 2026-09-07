import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { TransactionCard } from '../components/TransactionCard';
import { formatCurrencyShort, formatDateTime } from '../utils/format';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, ArrowRightLeft, ArrowRight, Calendar } from 'lucide-react';
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
  
  const getAccount = useStore((state) => state.getAccountById);
  const getTransactions = useStore((state) => state.getTransactionsByAccount);
  const getTransfers = useStore((state) => state.getTransfersByAccount);
  const getIncome = useStore((state) => state.getAccountIncome);
  const getExpense = useStore((state) => state.getAccountExpense);
  const deleteTransaction = useStore((state) => state.deleteTransaction);
  const deleteTransfer = useStore((state) => state.deleteTransfer);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (accountId) {
      const account = getAccount(accountId);
      setCurrentAccount(account || null);
      setLoading(false);
    }
  }, [accountId, getAccount]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  if (!accountId || !currentAccount) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">账户不存在</p>
        <button
          onClick={onBack}
          className="px-6 py-2 bg-purple-500 text-white rounded-lg"
        >
          返回资产页面
        </button>
      </div>
    );
  }

  const transactions = getTransactions(accountId);
  const transfers = getTransfers(accountId);
  const accountIncome = getIncome(accountId);
  const accountExpense = getExpense(accountId);

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
    const dateStr = date.toISOString().split('T')[0];
    
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 pt-8 pb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 mb-4"
        >
          <ArrowLeft size={20} />
          <span className="text-sm">返回</span>
        </button>
        
        <div className="flex items-center gap-4">
          <div 
            className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center"
            style={{ color: currentAccount.color }}
          >
            <Wallet size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold">{currentAccount.name}</h1>
            <p className="text-sm text-white/70">
              {currentAccount.type === 'bank' ? '银行' : 
               currentAccount.type === 'alipay' ? '支付宝' : 
               currentAccount.type === 'wechat' ? '微信' : 
               currentAccount.type === 'cash' ? '现金' : '其他'}
            </p>
          </div>
        </div>
        
        <div className="mt-6">
          <p className="text-sm text-white/70 mb-1">账户余额</p>
          <p className="text-3xl font-bold">{formatCurrencyShort(currentAccount.balance)}</p>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-green-500" />
              <span className="text-sm text-gray-500">总收入</span>
            </div>
            <p className="text-lg font-bold text-green-600">+{formatCurrencyShort(accountIncome)}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={18} className="text-red-500" />
              <span className="text-sm text-gray-500">总支出</span>
            </div>
            <p className="text-lg font-bold text-red-500">-{formatCurrencyShort(accountExpense)}</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={18} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">日期筛选</span>
            {(startDate || endDate) && (
              <button
                onClick={handleResetFilter}
                className="ml-auto text-xs text-red-500 hover:text-red-600"
              >
                重置
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">开始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">结束日期</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-800 mb-3">交易记录</h2>
        {sortedRecords.length > 0 ? (
          <div className="space-y-3 pb-20">
            {sortedRecords.map((record) => {
              if (record.type === 'transaction' && record.transaction) {
                return (
                  <TransactionCard
                    key={record.id}
                    transaction={record.transaction}
                    onDelete={() => deleteTransaction(record.id)}
                    onEdit={onEditTransaction ? () => onEditTransaction(record.transaction) : undefined}
                  />
                );
              }
              
              return (
                <div
                  key={record.id}
                  className="bg-white rounded-xl p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          record.direction === 'in' ? 'bg-blue-100' : 'bg-indigo-100'
                        }`}
                      >
                        <ArrowRightLeft 
                          size={18} 
                          className={record.direction === 'in' ? 'text-blue-500' : 'text-indigo-500'} 
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">
                            {record.direction === 'in' ? '转入' : '转出'}
                          </span>
                          <ArrowRight size={12} className="text-gray-300" />
                          <span className="text-sm font-medium text-gray-800">
                            {record.relatedAccount?.name || '未知账户'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {record.transfer?.note || '转账'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        record.direction === 'in' ? 'text-blue-500' : 'text-indigo-500'
                      }`}>
                        {record.direction === 'in' ? '+' : '-'}{formatCurrencyShort(record.amount)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDateTime(record.createdAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTransfer(record.id)}
                    className="mt-2 text-xs text-red-500 hover:text-red-600"
                  >
                    删除
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Wallet size={28} className="text-gray-300" />
            </div>
            <p className="text-gray-500">该账户暂无交易记录</p>
          </div>
        )}
      </div>
    </div>
  );
};