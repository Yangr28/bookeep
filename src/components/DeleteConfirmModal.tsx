import { Trash2, X } from 'lucide-react';

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
  title = '确认删除',
  message = '删除后无法恢复，确定要继续吗？',
  itemName = '',
}: DeleteConfirmModalProps) => {
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
        <button onClick={onClose} className="icon-btn w-9 h-9 absolute top-4 right-4">
          <X size={18} />
        </button>
        <div className="text-center pt-2">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--expense-soft)', color: 'var(--expense)' }}
          >
            <Trash2 size={28} />
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--ink)' }}>{title}</h3>
          {itemName && (
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>{itemName}</p>
          )}
          <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>{message}</p>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-ghost flex-1">取消</button>
          <button onClick={onConfirm} className="btn-danger flex-1">删除</button>
        </div>
      </div>
    </div>
  );
};
