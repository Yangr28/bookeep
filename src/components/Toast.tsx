/**
 * 全局轻提示（居中浮层）。
 * 视觉沿用既有令牌：卡面 + 柔影 + bounce-in；按变体切换图标色。
 * 由 useToast 管理消息队列与自动消失，本组件只负责展示。
 */
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'info' | 'error';

export interface ToastData {
  message: string;
  variant?: ToastVariant;
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

export default function Toast({ message, variant = 'success', className }: ToastProps) {
  const Icon = VARIANT_ICON[variant];
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed top-1/2 left-1/2 z-[110] flex items-center gap-3 px-6 py-4 rounded-card animate-bounce-in',
        className,
      )}
      style={{
        transform: 'translate(-50%, -50%)',
        background: 'var(--card)',
        boxShadow: 'var(--shadow-card-hover)',
        minWidth: 180,
        justifyContent: 'center',
      }}
    >
      <Icon size={24} style={{ color: VARIANT_COLOR[variant] }} />
      <span className="font-bold" style={{ color: 'var(--ink)' }}>
        {message}
      </span>
    </div>
  );
}
