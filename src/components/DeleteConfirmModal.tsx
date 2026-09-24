import { Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  itemName?: string;
}

export const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName = '',
}: DeleteConfirmModalProps) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center animate-fade-in"
      style={{ background: 'rgba(43,41,37,0.45)' }}
      onClick={onClose}
    >
      <div
        className="card relative w-full max-w-sm mx-4 p-5 animate-bounce-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="icon-btn w-9 h-9 absolute top-4 right-4" aria-label={t('common.cancel')}>
          <X size={18} />
        </button>
        <div className="text-center pt-2">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--expense-soft)', color: 'var(--expense)' }}
          >
            <Trash2 size={28} />
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--ink)' }}>
            {title ?? t('common.deleteConfirmTitle')}
          </h3>
          {itemName && (
            <p className="text-sm font-medium mb-1 amount-num" style={{ color: 'var(--ink)' }}>{itemName}</p>
          )}
          <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            {message ?? t('common.deleteConfirmMessage')}
          </p>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-ghost flex-1">{t('common.cancel')}</button>
          <button onClick={onConfirm} className="btn-danger flex-1">{t('common.delete')}</button>
        </div>
      </div>
    </div>
  );
};
