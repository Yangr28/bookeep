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
    <div className="page-root pb-nav">
      <div className="safe-top px-4 pt-2 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="icon-btn" aria-label="返回">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 relative">
            <SearchIcon
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--ink-2)' }}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索备注、金额、分类..."
              className="w-full rounded-button pl-10 pr-10 py-3 text-sm outline-none"
              style={{ background: 'var(--card)', color: 'var(--ink)', boxShadow: 'var(--shadow-card)' }}
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full"
              >
                <X size={16} style={{ color: 'var(--ink-2)' }} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Filter size={15} style={{ color: 'var(--ink-2)' }} />
          <div className="flex gap-1.5">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterType === 'all' ? 'chip-active' : 'chip-inactive'}`}
            >
              全部
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1"
              style={filterType === 'expense'
                ? { background: 'var(--expense)', color: '#fff' }
                : { background: 'var(--paper-deep)', color: 'var(--ink-2)' }}
            >
              <TrendingDown size={13} />
              支出
            </button>
            <button
              onClick={() => setFilterType('income')}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1"
              style={filterType === 'income'
                ? { background: 'var(--primary)', color: '#fff' }
                : { background: 'var(--paper-deep)', color: 'var(--ink-2)' }}
            >
              <TrendingUp size={13} />
              收入
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 mt-2">
        {filteredTransactions.length > 0 ? (
          <div>
            {filteredTransactions.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                onDelete={() => deleteTransaction(transaction.id)}
                onEdit={() => onEditTransaction(transaction)}
              />
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
