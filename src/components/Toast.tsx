/**
 * 全局轻提示（居中浮层）。
 * 视觉沿用既有令牌：卡面 + 柔影 + bounce-in；按变体切换图标色。
 * 由 useToast 管理消息队列与自动消失，本组件只负责展示。
 * 支持可选 action 按钮（如"撤销"），点击后调用 onAction。
 */
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'info' | 'error';

export interface ToastData {
  message: string;
  variant?: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastProps extends ToastData {
  className?: string;
}

const VARIANT_ICON = {
  success: CheckCircle,
  info: Info,
  error: AlertCircle,
} as const;

const VARIANT_COLOR = {
  success: 'var(--primary)',
  info: 'var(--ink-2)',
  error: 'var(--expense)',
} as const;

export default function Toast({ message, variant = 'success', actionLabel, onAction, className }: ToastProps) {
  const Icon = VARIANT_ICON[variant];
  return (
    <div
      className="fixed inset-x-0 z-[110] flex justify-center px-3 pointer-events-none"
      style={{ top: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
    >
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'flex items-center gap-3 px-5 py-3.5 rounded-card animate-bounce-in pointer-events-auto',
          className,
        )}
        style={{
          // 水平居中由外层 flex 实现：动画的 transform(scale) 会覆盖行内 transform，
          // 若用 left-1/2 + translateX(-50%) 居中，动画期间会先偏右再回正
          background: 'var(--glass-strong)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
          backdropFilter: 'blur(24px) saturate(1.8)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--shadow-card-hover)',
          maxWidth: 'calc(100vw - 1.5rem)',
          whiteSpace: 'nowrap',
        }}
      >
        <Icon size={24} style={{ color: VARIANT_COLOR[variant] }} />
        <span className="font-bold" style={{ color: 'var(--ink)' }}>
          {message}
        </span>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="ml-1 px-3 py-1 rounded-full text-sm font-bold flex-shrink-0"
            style={{
              background: 'var(--primary-soft)',
              color: 'var(--primary)',
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
