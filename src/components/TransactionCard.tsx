import { useState, useRef, memo } from 'react';
import { Transaction } from '../types';
import { useStore } from '../store/useStore';
import { formatCurrencyShort, formatDateTime } from '../utils/format';
import { Trash2, Edit3 } from 'lucide-react';
import { getIcon } from '../utils/iconMap';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { getCurrencySymbol } from '../utils/currency';

interface TransactionCardProps {
  transaction: Transaction;
  onDelete?: () => void;
  onEdit?: () => void;
  disabled?: boolean;
}

const TransactionCardComponent = ({ transaction, onDelete, onEdit, disabled }: TransactionCardProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const axis = useRef<'x' | 'y' | null>(null);

  const handleDelete = () => setShowDeleteConfirm(true);
  const confirmDelete = () => { onDelete?.(); setShowDeleteConfirm(false); };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = translateX;
    axis.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (!axis.current) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { axis.current = 'y'; }
      else if (Math.abs(dx) > 8) { axis.current = 'x'; }
    }
    if (axis.current !== 'x') return;
    let newTranslate = currentX.current + dx;
    newTranslate = Math.max(-60, Math.min(60, newTranslate));
    setTranslateX(newTranslate);
  };

  const handleTouchEnd = () => {
    if (disabled) return;
    if (translateX > 40) { setTranslateX(60); }
    else if (translateX < -40) { setTranslateX(-60); }
    else { setTranslateX(0); }
    axis.current = null;
  };

  const category = useStore((state) => state.getCategoryById(transaction.categoryId));
  const IconComponent = getIcon(category?.icon || 'Circle');
  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? 'var(--primary)' : 'var(--expense)';

  return (
    <div className="relative overflow-hidden rounded-card mb-2">
      <div className="absolute inset-0 flex items-center">
        <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-16" style={{ background: 'var(--expense)' }}>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(); setTranslateX(0); }} className="w-full h-full flex flex-col items-center justify-center gap-1 text-white">
            <Trash2 size={20} />
            <span className="text-xs">删除</span>
          </button>
        </div>
        <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-16" style={{ background: 'var(--primary)' }}>
          <button onClick={(e) => { e.stopPropagation(); onEdit?.(); setTranslateX(0); }} className="w-full h-full flex flex-col items-center justify-center gap-1 text-white">
            <Edit3 size={20} />
            <span className="text-xs">编辑</span>
          </button>
        </div>
      </div>
      <div
        className="relative p-3 transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${translateX}px)`, background: 'var(--card)', boxShadow: 'var(--shadow-card)' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: category ? `${category.color}30` : 'var(--paper-deep)' }}>
            <IconComponent size={20} style={{ color: category?.color || 'var(--ink-2)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-medium truncate" style={{ color: 'var(--ink)' }}>{category?.name || '未分类'}</p>
              <span className="font-semibold amount-num flex-shrink-0 ml-2 truncate" style={{ color: amountColor }}>
                {isIncome ? '+' : '-'}{formatCurrencyShort(transaction.amount)}
                {transaction.currency && transaction.currency !== 'CNY' && transaction.originalAmount !== undefined && (
                  <span className="text-xs font-normal ml-1" style={{ color: 'var(--ink-2)' }}>({getCurrencySymbol(transaction.currency)}{transaction.originalAmount})</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {transaction.note && <p className="text-xs truncate flex-1 max-w-[120px]" style={{ color: 'var(--ink-2)' }}>{transaction.note}</p>}
              <span className="text-xs amount-num flex-shrink-0" style={{ color: 'var(--ink-2)' }}>{formatDateTime(transaction.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="确认删除交易"
        itemName={`${transaction.type === 'income' ? '收入' : '支出'} ¥${transaction.amount}`}
      />
    </div>
  );
};

export const TransactionCard = memo(TransactionCardComponent);
