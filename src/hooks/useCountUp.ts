import { useEffect, useRef, useState } from 'react';

/**
 * 数字滚动动画：目标值变化时从旧值平滑滚动到新值（easeOutCubic）。
 * 首次挂载从 0 滚动到目标值，作为入场动画。
 * 尊重系统"减弱动态效果"设置：直接显示目标值。
 */
export function useCountUp(target: number, duration = 650): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  const currentRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = Number.isFinite(target) ? target : 0;

    if (from === to) {
      setValue(to);
      return;
    }

    // 无障碍：用户偏好减少动画时直接跳到目标值
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      fromRef.current = to;
      currentRef.current = to;
      setValue(to);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = from + (to - from) * eased;
      currentRef.current = v;
      setValue(v);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      // 中断时从当前值继续，而不是跳变
      fromRef.current = currentRef.current;
    };
  }, [target, duration]);

  return value;
}
