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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 pt-8 pb-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">转账</h1>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
          <p className="text-white/80 text-sm mb-1">转账金额</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold">¥</span>
            <input
              type="text"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
              className="bg-transparent text-4xl font-bold outline-none w-full placeholder-white/40"
              inputMode="decimal"
            />
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm text-gray-500 mb-3">转出账户</label>
          <div className="grid grid-cols-2 gap-2">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => setFromAccountId(account.id)}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  fromAccountId === account.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${account.color}15`, color: account.color }}
                >
                  <Banknote size={16} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">{account.name}</p>
                  <p className="text-xs text-gray-400">{formatCurrencyShort(account.balance)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <ArrowRight size={20} className="text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm text-gray-500 mb-3">转入账户</label>
          <div className="grid grid-cols-2 gap-2">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => setToAccountId(account.id)}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  toAccountId === account.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${account.color}15`, color: account.color }}
                >
                  <Banknote size={16} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">{account.name}</p>
                  <p className="text-xs text-gray-400">{formatCurrencyShort(account.balance)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm text-gray-500 mb-2">备注</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="添加备注（可选）"
            className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all ${
            canSubmit
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          确认转账
        </button>
      </div>
    </div>
  );
};
