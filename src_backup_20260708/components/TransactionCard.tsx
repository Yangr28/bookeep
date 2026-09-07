import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Transaction } from '../types';
import { useStore } from '../store/useStore';
import { formatCurrency, formatCurrencyShort, formatDateTime } from '../utils/format';
import { Trash2, Edit3 } from 'lucide-react';

interface TransactionCardProps {
  transaction: Transaction;
  onDelete?: () => void;
  onEdit?: () => void;
}

const iconMap: Record<string, LucideIcon> = Icons as unknown as Record<string, LucideIcon>;

export const TransactionCard = ({ transaction, onDelete, onEdit }: TransactionCardProps) => {
  const category = useStore((state) => state.getCategoryById(transaction.categoryId));
  const IconComponent = category
    ? iconMap[category.icon] || Icons.Circle
    : Icons.Circle;

  const isIncome = transaction.type === 'income';

  return (
    <div className="flex-1">
      <div className="flex items-center gap-3">
        <div
          className="p-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: category ? `${category.color}20` : '#f3f4f6' }}
        >
          <IconComponent
            size={20}
            style={{ color: category?.color || '#9ca3af' }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-800 truncate">{category?.name || '未知'}</p>
            <span
              className={`font-semibold flex-shrink-0 ml-2 truncate ${
                isIncome ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {isIncome ? '+' : '-'}{formatCurrencyShort(transaction.amount)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            {transaction.note && (
              <p className="text-xs text-gray-400 truncate">{transaction.note}</p>
            )}
            <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
              {formatDateTime(transaction.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2 text-gray-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <Edit3 size={16} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};