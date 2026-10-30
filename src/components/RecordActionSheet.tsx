import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Copy, Bookmark, Edit3, Trash2 } from 'lucide-react';
import { Transaction } from '../types';
import { useStore } from '../store/useStore';
import { formatCurrencyShort, formatDateTime } from '../utils/format';

interface RecordActionSheetProps {
  transaction: Transaction | null;
  onClose: () => void;
  onEdit?: (transaction: Transaction) => void;
  onDuplicate?: (transaction: Transaction) => void;
  onCreateTemplate?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
}

/** 记录操作菜单：编辑 / 复制记一笔 / 存为模板 / 删除（首页与账单页共用） */
export const RecordActionSheet = ({ transaction, onClose, onEdit, onDuplicate, onCreateTemplate, onDelete }: RecordActionSheetProps) => {
  const { t } = useTranslation();
  const categories = useStore((state) => state.categories);

  if (!transaction) return null;

  const category = categories.find((c) => c.id === transaction.categoryId);
  const isIncome = transaction.type === 'income';

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[100] animate-fade-in"
        style={{ background: 'rgba(43,41,37,0.45)' }}
        onClick={onClose}
      />
      <div
        className="fixed left-0 right-0 bottom-0 z-[101] animate-slide-up rounded-t-card px-4 pt-4"
        style={{
          background: 'var(--card-solid)',
          boxShadow: '0 -8px 40px rgba(15,17,24,0.25)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0">
            <p className="font-semibold truncate" style={{ color: 'var(--ink)' }}>
              {category?.name || t('common.unclassified')}
            </p>
            <p className="text-xs mt-0.5 amount-num" style={{ color: 'var(--ink-2)' }}>
              {formatDateTime(transaction.createdAt)}
            </p>
          </div>
          <p
            className="font-bold amount-num flex-shrink-0 ml-3"
            style={{ color: isIncome ? 'var(--primary)' : 'var(--expense)' }}
          >
            {isIncome ? '+' : '-'}{formatCurrencyShort(transaction.amount)}
          </p>
        </div>

        <div className="space-y-1.5">
          {onDuplicate && (
            <button
              onClick={() => { onDuplicate(transaction); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-button text-sm font-medium text-left active:scale-[0.99] transition-transform"
              style={{ background: 'var(--paper-deep)', color: 'var(--ink)' }}
            >
              <Copy size={18} style={{ color: 'var(--primary)' }} />
              {t('allRecords.copyRecord')}
            </button>
          )}
          {onCreateTemplate && (
            <button
              onClick={() => { onCreateTemplate(transaction); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-button text-sm font-medium text-left active:scale-[0.99] transition-transform"
              style={{ background: 'var(--paper-deep)', color: 'var(--ink)' }}
            >
              <Bookmark size={18} style={{ color: 'var(--primary)' }} />
              {t('allRecords.saveAsTemplate')}
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => { onEdit(transaction); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-button text-sm font-medium text-left active:scale-[0.99] transition-transform"
              style={{ background: 'var(--paper-deep)', color: 'var(--ink)' }}
            >
              <Edit3 size={18} style={{ color: 'var(--ink-2)' }} />
              {t('common.edit')}
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => { onDelete(transaction); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-button text-sm font-medium text-left active:scale-[0.99] transition-transform"
              style={{ background: 'var(--expense-soft)', color: 'var(--expense)' }}
            >
              <Trash2 size={18} />
              {t('common.delete')}
            </button>
          )}
        </div>

        <button onClick={onClose} className="btn-ghost w-full mt-3">
          {t('common.cancel')}
        </button>
      </div>
    </>,
    document.body
  );
};
