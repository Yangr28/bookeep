import { useEffect, useState, useCallback, memo } from 'react';
import { useStore } from '../store/useStore';
import { CategoryCard } from '../components/CategoryCard';
import { TransactionType, Transaction } from '../types';
import { formatDateTime } from '../utils/format';
import { parseSmartInput, findCategoryByIdentifier } from '../utils/smartParser';
import { Check, Calendar, Clock, Wallet, Sparkles } from 'lucide-react';

interface RecordProps {
  editTransaction?: Transaction | null;
  selectedDateTime: Date;
  selectedAccountId: string | null;
  onShowDatePicker: () => void;
  onShowTimePicker: () => void;
  onShowAccountPicker: () => void;
  amount: string;
  note: string;
  onAmountChange: (amount: string) => void;
  onNoteChange: (note: string) => void;
  categoryId: string | null;
  type: TransactionType;
  onCategoryChange: (categoryId: string | null) => void;
  onTypeChange: (type: TransactionType) => void;
  onSubmit: () => void;
}

const RecordComponent = ({ editTransaction, selectedDateTime, selectedAccountId, onShowDatePicker, onShowTimePicker, onShowAccountPicker, amount, note, onAmountChange, onNoteChange, categoryId, type, onCategoryChange, onTypeChange, onSubmit }: RecordProps) => {
  const [smartInput, setSmartInput] = useState('');
  const [showSmartResult, setShowSmartResult] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (editTransaction) {
      onTypeChange(editTransaction.type);
      onCategoryChange(editTransaction.categoryId);
    } else {
      onTypeChange('expense');
      onCategoryChange(null);
    }
  }, [editTransaction, onTypeChange, onCategoryChange]);

  const isEditMode = !!editTransaction;

  const categories = useStore((state) => state.categories);
  const accounts = useStore((state) => state.accounts);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const filteredCategories = categories.filter((c) => c.type === type);

  const isToday = () => {
    const today = new Date();
    return selectedDateTime.toDateString() === today.toDateString();
  };

  const hasAmountError = amount !== '' && parseFloat(amount) <= 0;
  const hasCategoryError = !categoryId;
  const hasAccountError = !selectedAccountId;

  const handleSmartSubmit = useCallback(() => {
    if (!smartInput.trim()) return;

    const result = parseSmartInput(smartInput);
    let autoCategoryId: string | null = null;

    if (result.categoryKeyword) {
      autoCategoryId = findCategoryByIdentifier(categories, result.type, result.categoryKeyword);
    }

    onTypeChange(result.type);
    
    if (result.amount) {
      onAmountChange(result.amount);
    }
    
    if (autoCategoryId) {
      onCategoryChange(autoCategoryId);
    }
    
    if (result.note) {
      onNoteChange(result.note);
    }

    setShowSmartResult(true);
    setTimeout(() => setShowSmartResult(false), 2000);
    setSmartInput('');
  }, [smartInput, categories, onTypeChange, onAmountChange, onCategoryChange, onNoteChange]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="flex-1 overflow-y-auto pb-[100px]">
        <div className="bg-white dark:bg-gray-800 px-6 pt-8 pb-6">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white text-center mb-4 tracking-tight">
            {isEditMode ? '编辑记录' : '记账'}
          </h1>

          {!isEditMode && (
            <div className="relative mb-6">
              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-3">
                <Sparkles size={18} className="text-amber-500 mr-3 flex-shrink-0" />
                <input
                  type="text"
                  value={smartInput}
                  onChange={(e) => setSmartInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSmartSubmit();
                    }
                  }}
                  placeholder="智能记账（如：午饭28）"
                  className="flex-1 bg-transparent outline-none text-gray-800 dark:text-white placeholder-gray-400 text-sm"
                />
                <button
                  onClick={handleSmartSubmit}
                  disabled={!smartInput.trim()}
                  className={`ml-2 p-2 rounded-lg transition-all ${
                    smartInput.trim()
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Check size={16} />
                </button>
              </div>
              {showSmartResult && (
                <div className="absolute -bottom-8 left-0 right-0 text-center text-xs text-emerald-500 animate-fade-in">
                  ✓ 智能解析成功
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={() => {
                onTypeChange('expense');
                onCategoryChange(null);
              }}
              className={`px-8 py-2.5 rounded-full font-medium transition-all ${
                type === 'expense'
                  ? 'bg-red-500 text-white scale-105 shadow-lg shadow-red-500/30'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              支出
            </button>
            <button
              onClick={() => {
                onTypeChange('income');
                onCategoryChange(null);
              }}
              className={`px-8 py-2.5 rounded-full font-medium transition-all ${
                type === 'income'
                  ? 'bg-emerald-500 text-white scale-105 shadow-lg shadow-emerald-500/30'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              收入
            </button>
          </div>

          <div className={`bg-gray-50 dark:bg-gray-700 rounded-2xl p-5 mb-4 transition-all ${hasCategoryError ? 'ring-2 ring-red-200 bg-red-50/50 dark:bg-red-900/20' : ''}`}>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">选择分类</h3>
            <div className="grid grid-cols-4 gap-3">
              {filteredCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  isSelected={categoryId === category.id}
                  onClick={() => onCategoryChange(category.id)}
                />
              ))}
            </div>
            {hasCategoryError && (
              <p className="text-red-500 text-xs mt-3 text-center animate-pulse">请选择一个分类</p>
            )}
          </div>

          <div className={`bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 transition-all ${hasAccountError ? 'ring-2 ring-red-200' : ''}`}>
            <button
                onClick={onShowAccountPicker}
                className="flex items-center gap-4 w-full"
              >
              <div className={`p-3 rounded-xl transition-colors ${hasAccountError ? 'bg-red-50 dark:bg-red-900/30' : 'bg-green-50 dark:bg-green-900/30'}`}>
                <Wallet size={22} className={hasAccountError ? 'text-red-500' : 'text-green-600'} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">账户</p>
                <p className={`text-base font-semibold mt-0.5 transition-colors ${selectedAccount ? 'text-gray-800 dark:text-white' : 'text-red-500'}`}>
                  {selectedAccount ? selectedAccount.name : '请选择账户'}
                </p>
              </div>
              <span className="text-gray-400 text-xl">›</span>
            </button>
          </div>

          <div className={`bg-gray-50 dark:bg-gray-700 py-4 rounded-xl transition-colors ${hasAmountError ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
            <div className="flex items-center justify-center px-4">
              <span className={`text-4xl font-bold transition-colors flex-shrink-0 ${hasAmountError ? 'text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>¥</span>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9.]*"
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                placeholder="0.00"
                className={`text-5xl font-bold ml-2 tracking-tight transition-colors bg-transparent outline-none text-left flex-1 max-w-[200px] ${hasAmountError ? 'text-red-500' : 'text-gray-800 dark:text-white'}`}
              />
            </div>
            {hasAmountError && (
              <p className="text-red-500 text-xs mt-2 text-center animate-pulse">金额必须大于0</p>
            )}
          </div>
        </div>

        <div className="px-4 mt-3 pb-[120px]">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl">
            <button
              onClick={onShowDatePicker}
              className="flex items-center gap-4 w-full"
            >
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                <Calendar size={22} className="text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">日期</p>
                <p className="text-base font-semibold text-gray-800 dark:text-white mt-0.5">
                  {isToday() ? '今天' : formatDateTime(selectedDateTime.toISOString()).split(' ')[0]}
                </p>
              </div>
              <span className="text-gray-400 text-xl">›</span>
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 mt-3 p-5 rounded-2xl">
            <button
              onClick={onShowTimePicker}
              className="flex items-center gap-4 w-full"
            >
              <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                <Clock size={22} className="text-purple-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">时间</p>
                <p className="text-base font-semibold text-gray-800 dark:text-white mt-0.5">
                  {formatDateTime(selectedDateTime.toISOString()).split(' ')[1]}
                </p>
              </div>
              <span className="text-gray-400 text-xl">›</span>
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 mt-3 p-4 rounded-2xl">
            <input
              type="text"
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="添加备注"
              className="w-full bg-transparent outline-none text-gray-800 dark:text-white placeholder-gray-400 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-50 shadow-2xl">
      <button
        onClick={() => {
          if (amount && parseFloat(amount) > 0 && categoryId && selectedAccountId) {
            onSubmit();
          }
        }}
        disabled={!amount || parseFloat(amount) <= 0 || !categoryId || !selectedAccountId}
        className={`w-full py-3.5 rounded-xl font-bold text-white text-lg transition-all ${
          amount && parseFloat(amount) > 0 && categoryId && selectedAccountId
            ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/40 active:scale-95'
            : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
        }`}
      >
        {isEditMode ? '保存修改' : '确认记账'}
      </button>
    </div>
    </div>
  );
};

export const Record = memo(RecordComponent);