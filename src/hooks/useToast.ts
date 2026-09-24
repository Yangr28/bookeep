/**
 * 全局 Toast 状态管理：
 *  - show(message, variant?, duration?) 展示并计时自动消失；
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

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = 'success', duration?: number) => {
      clearTimer();
      setToast({ message, variant });
      timerRef.current = setTimeout(() => {
        setToast(null);
        timerRef.current = null;
      }, duration ?? defaultDuration);
    },
    [clearTimer, defaultDuration],
  );

  const dismiss = useCallback(() => {
    clearTimer();
    setToast(null);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return { toast, show, dismiss };
}
