/**
 * 全局 Toast 状态管理：
 *  - show(message, variant?, duration?) 展示并计时自动消失；
 *  - showWithAction(message, actionLabel, onAction, variant?, duration?) 展示带操作按钮的 Toast（用于"撤销"等）；
 *  - 连续触发时清理上一个计时器，避免旧定时器提前关掉新提示；
 *  - 组件卸载时清理计时器。
 *
 * 替代此前散落在 App.tsx 的 setToastMessage + setTimeout 重复模式。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ToastData, ToastVariant } from '../components/Toast';

const DEFAULT_DURATION_MS = 2000;

export function useToast(defaultDuration: number = DEFAULT_DURATION_MS) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 撤销回调独立存储：超时后清空，确保过期后调用无效
  const actionRef = useRef<(() => void) | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = 'success', duration?: number) => {
      clearTimer();
      actionRef.current = null;
      setToast({ message, variant });
      timerRef.current = setTimeout(() => {
        setToast(null);
        timerRef.current = null;
        actionRef.current = null;
      }, duration ?? defaultDuration);
    },
    [clearTimer, defaultDuration],
  );

  /** 展示带操作按钮的 Toast（如"撤销"）。duration 后自动消失且 onAction 失效。 */
  const showWithAction = useCallback(
    (message: string, actionLabel: string, onAction: () => void, variant: ToastVariant = 'info', duration = 5000) => {
      clearTimer();
      actionRef.current = onAction;
      setToast({ message, variant, actionLabel });
      timerRef.current = setTimeout(() => {
        setToast(null);
        timerRef.current = null;
        actionRef.current = null;
      }, duration);
    },
    [clearTimer],
  );

  /** 用户点击 Toast 内的操作按钮：触发回调并立即关闭 */
  const triggerAction = useCallback(() => {
    const cb = actionRef.current;
    if (cb) {
      clearTimer();
      actionRef.current = null;
      setToast(null);
      cb();
    }
  }, [clearTimer]);

  const dismiss = useCallback(() => {
    clearTimer();
    actionRef.current = null;
    setToast(null);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return { toast, show, showWithAction, triggerAction, dismiss };
}
