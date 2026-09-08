import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrencyShort } from '../utils/format';
import { ArrowLeft, ArrowRight, Banknote } from 'lucide-react';


interface TransferProps {
  onBack: () => void;
  onSuccess?: () => void;
}

export const Transfer = ({ onBack, onSuccess }: TransferProps) => {

  const accounts = useStore((state) => state.accounts);
  const addTransfer = useStore((state) => state.addTransfer);

  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const fromAccount = accounts.find((a) => a.id === fromAccountId);

  const handleAmountChange = (value: string) => {
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
    }
  };

  const handleSubmit = () => {
    if (!fromAccountId || !toAccountId || !amount || parseFloat(amount) <= 0) {
      return;
    }

    if (fromAccountId === toAccountId) {
      return;
    }

    const fromAccount = accounts.find((a) => a.id === fromAccountId);
    if (fromAccount && fromAccount.balance < parseFloat(amount)) {
      return;
    }

    addTransfer({
      fromAccountId,
      toAccountId,
      amount: parseFloat(amount),
      note,
      createdAt: new Date().toISOString(),
    });

    if (onSuccess) {
      onSuccess();
    } else {
      onBack();
    }
  };

  const canSubmit =
    fromAccountId &&
    toAccountId &&
    amount &&
    parseFloat(amount) > 0 &&
    fromAccountId !== toAccountId &&
    (!fromAccount || fromAccount.balance >= parseFloat(amount));

  return (
    <div className="page-root pb-6">
      {/* 页头 */}
      <div className="safe-top px-4 pt-2 pb-1 flex items-center gap-3">
        <button onClick={onBack} className="icon-btn" aria-label="返回">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="page-title">转账</h1>
          <p className="page-subtitle">在账户之间划转资金</p>
        </div>
      </div>

      {/* 转账金额 */}
      <div className="px-4 mt-3">
        <div className="card p-5">
          <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>转账金额</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-semibold amount-num" style={{ color: 'var(--ink-2)' }}>¥</span>
            <input
              type="text"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
              className="bg-transparent text-4xl font-bold outline-none w-full amount-num placeholder:text-[color:var(--ink-2)] placeholder:opacity-60"
              style={{ color: 'var(--ink)' }}
              inputMode="decimal"
            />
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4 pb-28">
        {/* 转出账户 */}
        <div className="card p-4">
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--ink-2)' }}>转出账户</p>
          <div className="grid grid-cols-2 gap-2">
            {accounts.map((account) => {
              const selected = fromAccountId === account.id;
              return (
                <button
                  key={account.id}
                  onClick={() => setFromAccountId(account.id)}
                  className="flex items-center gap-2 p-3 rounded-button border-2 transition-all text-left w-full active:scale-[0.98]"
                  style={{
                    background: selected ? 'var(--expense-soft)' : 'var(--paper)',
                    borderColor: selected ? 'var(--expense)' : 'transparent',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${account.color}15`, color: account.color }}
                  >
                    <Banknote size={16} />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{account.name}</p>
                    <p className="text-xs amount-num truncate" style={{ color: 'var(--ink-2)' }}>{formatCurrencyShort(account.balance)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--paper-deep)', color: 'var(--ink-2)' }}>
            <ArrowRight size={18} className="rotate-90" />
          </div>
        </div>

        {/* 转入账户 */}
        <div className="card p-4">
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--ink-2)' }}>转入账户</p>
          <div className="grid grid-cols-2 gap-2">
            {accounts.map((account) => {
              const selected = toAccountId === account.id;
              return (
                <button
                  key={account.id}
                  onClick={() => setToAccountId(account.id)}
                  className="flex items-center gap-2 p-3 rounded-button border-2 transition-all text-left w-full active:scale-[0.98]"
                  style={{
                    background: selected ? 'var(--primary-soft)' : 'var(--paper)',
                    borderColor: selected ? 'var(--primary)' : 'transparent',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${account.color}15`, color: account.color }}
                  >
                    <Banknote size={16} />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{account.name}</p>
                    <p className="text-xs amount-num truncate" style={{ color: 'var(--ink-2)' }}>{formatCurrencyShort(account.balance)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 备注 */}
        <div className="card p-4">
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--ink-2)' }}>备注</p>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="添加备注（可选）"
            className="input-field py-2.5 text-sm"
          />
        </div>
      </div>

      {/* 底部提交按钮 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 safe-bottom z-40" style={{ background: 'var(--card)', borderTop: '1px solid var(--line)' }}>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="btn-primary w-full"
        >
          确认转账
        </button>
      </div>
    </div>
  );
};
