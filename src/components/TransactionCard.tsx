import { useState, useRef, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Transaction } from '../types';
import { useStore } from '../store/useStore';
import { formatCurrencyShort, formatDateTime } from '../utils/format';
import { Trash2, Edit3, Check } from 'lucide-react';
import { getIcon } from '../utils/iconMap';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { getCurrencySymbol } from '../utils/currency';

interface TransactionCardProps {
  transaction: Transaction;
  onDelete?: () => void;
  onEdit?: () => void;
  disabled?: boolean;
  /** 多选模式：禁用滑动/编辑，整卡点击切换选中，左侧显示勾选圈 */
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

const TransactionCardComponent = ({ transaction, onDelete, onEdit, disabled, selectMode = false, selected = false, onToggleSelect }: TransactionCardProps) => {
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const axis = useRef<'x' | 'y' | null>(null);

  // 多选模式下禁用滑动手势
  const gestureDisabled = disabled || selectMode;

  const handleDelete = () => setShowDeleteConfirm(true);
  const confirmDelete = () => { onDelete?.(); setShowDeleteConfirm(false); };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (gestureDisabled) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = translateX;
    axis.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (gestureDisabled) return;
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
    if (gestureDisabled) return;
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
      {!selectMode && (
        <div className="absolute inset-0 flex items-center">
          <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-16" style={{ background: 'var(--expense)' }}>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(); setTranslateX(0); }} className="w-full h-full flex flex-col items-center justify-center gap-1 text-white" aria-label={t('common.delete')}>
              <Trash2 size={20} />
              <span className="text-xs">{t('common.delete')}</span>
            </button>
          </div>
          <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-16" style={{ background: 'var(--primary)' }}>
            <button onClick={(e) => { e.stopPropagation(); onEdit?.(); setTranslateX(0); }} className="w-full h-full flex flex-col items-center justify-center gap-1 text-white" aria-label={t('common.edit')}>
              <Edit3 size={20} />
              <span className="text-xs">{t('common.edit')}</span>
            </button>
          </div>
        </div>
      )}
      <div
        role={selectMode ? 'button' : undefined}
        aria-pressed={selectMode ? selected : undefined}
        onClick={selectMode ? onToggleSelect : undefined}
        className={`relative p-3 transition-transform duration-200 ease-out ${selectMode ? 'cursor-pointer active:opacity-80' : ''}`}
        style={{
          transform: `translateX(${selectMode ? 0 : translateX}px)`,
          background: 'var(--card)',
          boxShadow: selected ? '0 0 0 2px var(--primary), var(--shadow-card)' : 'var(--shadow-card)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center gap-3">
          {selectMode && (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors"
              style={{
                borderColor: selected ? 'var(--primary)' : 'var(--ink-2)',
                background: selected ? 'var(--primary)' : 'transparent',
              }}
            >
              {selected && <Check size={12} color="#fff" strokeWidth={3} />}
            </div>
          )}
          <div className="p-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: category ? `${category.color}30` : 'var(--paper-deep)' }}>
            <IconComponent size={20} style={{ color: category?.color || 'var(--ink-2)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-medium truncate" style={{ color: 'var(--ink)' }}>{category?.name || t('common.unclassified')}</p>
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
        title={t('common.deleteTransactionTitle')}
        itemName={`${isIncome ? t('common.income') : t('common.expense')} ¥${transaction.amount}`}
      />
    </div>
  );
};

export const TransactionCard = memo(TransactionCardComponent);
