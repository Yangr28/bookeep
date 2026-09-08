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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-card w-full max-w-sm shadow-xl animate-bounce-in">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
          <X size={20} className="text-gray-400" />
        </button>
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 size={28} className="text-red-500" />
          </div>
          <h3 className="text-title text-gray-800 dark:text-white mb-2">{title}</h3>
          {itemName && <p className="text-gray-500 dark:text-gray-400 mb-2">{itemName}</p>}
          <p className="text-gray-500 dark:text-gray-400">{message}</p>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1">取消</button>
          <button onClick={onConfirm} className="btn-danger flex-1">删除</button>
        </div>
      </div>
    </div>
  );
};