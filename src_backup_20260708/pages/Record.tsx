import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { CategoryCard } from '../components/CategoryCard';
import { TransactionType, Account, AccountTypeNames, Transaction } from '../types';
import { formatCurrency, formatDateTime } from '../utils/format';
import { Check, Calendar, Clock, ChevronUp, Wallet } from 'lucide-react';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
const iconMap: Record<string, LucideIcon> = Icons as unknown as Record<string, LucideIcon>;

interface RecordProps {
  onSuccess: () => void;
  onBack: () => void;
  editTransaction?: Transaction | null;
  selectedDateTime: Date;
  onDateTimeChange: (date: Date) => void;
  selectedAccountId: string | null;
  onShowDatePicker: () => void;
  onShowTimePicker: () => void;
  onShowAccountPicker: () => void;
  amount: string;
  note: string;
  showKeypad: boolean;
  onShowKeypad: () => void;
  onHideKeypad: () => void;
  onAmountChange: (amount: string) => void;
  onNoteChange: (note: string) => void;
  categoryId: string | null;
  type: TransactionType;
  onCategoryChange: (categoryId: string | null) => void;
  onTypeChange: (type: TransactionType) => void;
}

export const Record = ({ onSuccess, onBack, editTransaction, selectedDateTime, onDateTimeChange, selectedAccountId, onShowDatePicker, onShowTimePicker, onShowAccountPicker, amount, note, showKeypad, onShowKeypad, onHideKeypad, onAmountChange, onNoteChange, categoryId, type, onCategoryChange, onTypeChange }: RecordProps) => {
  useEffect(() => {
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className={`flex-1 overflow-y-auto transition-all duration-300 ${showKeypad ? 'pb-[480px]' : 'pb-24'}`}>
        <div className="bg-white px-6 pt-8 pb-6">
          <h1 className="text-xl font-bold text-gray-800 text-center mb-6 tracking-tight">
            {isEditMode ? '编辑记录' : '记账'}
          </h1>

          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={() => {
                onTypeChange('expense');
                onCategoryChange(null);
              }}
              className={`px-8 py-2.5 rounded-full font-medium transition-all ${
                type === 'expense'
                  ? 'bg-red-500 text-white scale-105 shadow-lg shadow-red-500/30'
                  : 'bg-gray-100 text-gray-500'
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
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              收入
            </button>
          </div>

          <div className="bg-gray-50 rounded-2xl p-5 mb-4">
            <h3 className="text-sm font-medium text-gray-500 mb-4">选择分类</h3>
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
          </div>

          <div className="bg-white rounded-2xl p-4 mb-4">
            <button
              onClick={() => { onShowAccountPicker(); onHideKeypad(); }}
              className="flex items-center gap-4 w-full"
            >
              <div className="p-3 bg-green-50 rounded-xl">
                <Wallet size={22} className="text-green-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm text-gray-500 font-medium">账户</p>
                <p className="text-base font-semibold text-gray-800 mt-0.5">
                  {selectedAccount ? selectedAccount.name : '选择账户'}
                </p>
              </div>
              <span className="text-gray-400 text-xl">›</span>
            </button>
          </div>

          <button
            onClick={onShowKeypad}
            className="w-full text-center py-4 hover:bg-gray-50 -mx-6 px-6 rounded-xl transition-colors"
          >
            <span className="text-gray-400 text-2xl">¥</span>
            <span className="text-5xl font-bold text-gray-800 ml-2 tracking-tight">
              {amount || '0.00'}
            </span>
          </button>
        </div>

        <div className="px-4 mt-3 pb-4">
          <div className="bg-white p-5 rounded-2xl">
            <button
              onClick={() => { onShowDatePicker(); onHideKeypad(); }}
              className="flex items-center gap-4 w-full"
            >
              <div className="p-3 bg-blue-50 rounded-xl">
                <Calendar size={22} className="text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm text-gray-500 font-medium">日期</p>
                <p className="text-base font-semibold text-gray-800 mt-0.5">
                  {isToday() ? '今天' : formatDateTime(selectedDateTime.toISOString()).split(' ')[0]}
                </p>
              </div>
              <span className="text-gray-400 text-xl">›</span>
            </button>
          </div>

          <div className="bg-white mt-3 p-5 rounded-2xl">
            <button
              onClick={() => { onShowTimePicker(); onHideKeypad(); }}
              className="flex items-center gap-4 w-full"
            >
              <div className="p-3 bg-purple-50 rounded-xl">
                <Clock size={22} className="text-purple-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm text-gray-500 font-medium">时间</p>
                <p className="text-base font-semibold text-gray-800 mt-0.5">
                  {formatDateTime(selectedDateTime.toISOString()).split(' ')[1]}
                </p>
              </div>
              <span className="text-gray-400 text-xl">›</span>
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={onShowKeypad}
        className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-3 flex items-center justify-center gap-2 z-20 transition-all duration-300 ${showKeypad ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <span className="text-sm text-gray-500">点击展开键盘</span>
        <ChevronUp size={18} className="text-gray-400" />
      </button>
    </div>
  );
};