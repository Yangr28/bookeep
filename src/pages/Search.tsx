import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { TransactionCard } from '../components/TransactionCard';
import { Search as SearchIcon, ArrowLeft, X, Filter, TrendingUp, TrendingDown } from 'lucide-react';
import { TransactionType, Transaction } from '../types';
import Empty from '../components/Empty';

interface SearchProps {
  onBack: () => void;
  onEditTransaction: (transaction: Transaction) => void;
  initialQuery?: string;
}

export const Search = ({ onBack, onEditTransaction, initialQuery }: SearchProps) => {
  const [query, setQuery] = useState(initialQuery || '');
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const transactions = useStore((state) => state.transactions);
  const deleteTransaction = useStore((state) => state.deleteTransaction);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const filteredTransactions = transactions.filter((t) => {
    const matchType = filterType === 'all' || t.type === filterType;
    
    const searchText = query.toLowerCase();
    const matchText = 
      (t.note && t.note.toLowerCase().includes(searchText)) ||
      t.amount.toString().includes(searchText);
    
    const category = useStore.getState().getCategoryById(t.categoryId);
    const matchCategory = category && category.name.toLowerCase().includes(searchText);
    
    return matchType && (matchText || matchCategory);
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const clearSearch = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <div className="bg-white dark:bg-gray-800 px-4 pt-8 pb-4 shadow-sm safe-top">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex-1 relative">
            <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索备注、金额、分类..."
              className="w-full bg-gray-100 dark:bg-gray-700 rounded-xl pl-10 pr-10 py-3 text-gray-800 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
              >
                <X size={16} className="text-gray-400" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-3">
          <Filter size={16} className="text-gray-400" />
          <div className="flex gap-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                filterType === 'expense'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <TrendingDown size={14} />
              支出
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                filterType === 'income'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <TrendingUp size={14} />
              收入
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        {filteredTransactions.length > 0 ? (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
              >
                <TransactionCard
                  transaction={transaction}
                  onDelete={() => deleteTransaction(transaction.id)}
                  onEdit={() => onEditTransaction(transaction)}
                />
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="未找到相关记录"
            description={query ? '尝试使用其他关键词搜索' : '输入关键词开始搜索'}
          />
        )}
      </div>
    </div>
  );
};
