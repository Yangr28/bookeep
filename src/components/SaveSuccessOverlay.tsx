import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface SaveSuccessOverlayProps {
  /** 递增触发键：每次 +1 重放一次动画，0 时不显示 */
  triggerKey: number;
}

/**
 * 记账保存成功后的全屏对勾动画（约 0.9s）。
 * pointer-events-none 不阻挡操作，仅作视觉正反馈；尊重系统减弱动效设置。
 */
export const SaveSuccessOverlay = ({ triggerKey }: SaveSuccessOverlayProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!triggerKey) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 900);
    return () => clearTimeout(timer);
  }, [triggerKey]);

  if (!visible) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none save-overlay">
      <div className="save-check-circle">
        <svg viewBox="0 0 52 52" className="w-12 h-12" aria-hidden="true">
          <path className="save-check-path" fill="none" d="M14 27l8 8 16-17" />
        </svg>
      </div>
    </div>,
    document.body,
  );
};
