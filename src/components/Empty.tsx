import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export default function Empty({
  icon: Icon = null,
  title = '暂无数据',
  description = '',
  actionText = '',
  onAction = undefined,
  className = '',
}: EmptyProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 animate-fade-in">
        {Icon ? (
          <Icon size={36} className="text-gray-300 dark:text-gray-600" />
        ) : (
          <svg className="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
      </div>
      <h3 className="text-base font-semibold text-gray-600 dark:text-gray-400 mb-2">{title}</h3>
      {description && <p className="text-gray-400 dark:text-gray-500 text-sm text-center mb-6">{description}</p>}
      {actionText && onAction && (
        <button onClick={onAction} className="btn-primary px-6 py-2.5 text-sm">
          {actionText}
        </button>
      )}
    </div>
  );
}
