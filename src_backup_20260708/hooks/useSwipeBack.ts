import { useEffect, useRef, useCallback } from 'react';

interface UseSwipeBackOptions {
  onSwipeBack: () => void;
  enabled?: boolean;
  threshold?: number;
}

export const useSwipeBack = ({ onSwipeBack, enabled = true, threshold = 50 }: UseSwipeBackOptions) => {
  const startX = useRef(0);
  const startY = useRef(0);
  const isSwiping = useRef(false);
  const hasTriggered = useRef(false);
  const isHorizontalSwipe = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    isSwiping.current = true;
    hasTriggered.current = false;
    isHorizontalSwipe.current = false;
  }, [enabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !isSwiping.current || hasTriggered.current) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - startX.current;
    const deltaY = touch.clientY - startY.current;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    const screenWidth = window.innerWidth;
    
    if (absDeltaX > 10 && absDeltaX > absDeltaY * 1.5) {
      isHorizontalSwipe.current = true;
      
      if ((deltaX > threshold && touch.clientX < 80) || 
          (deltaX < -threshold && touch.clientX > screenWidth - 80)) {
        hasTriggered.current = true;
        isSwiping.current = false;
        e.preventDefault();
        onSwipeBack();
      }
    } else if (absDeltaY > 10 && !isHorizontalSwipe.current) {
      isSwiping.current = false;
    }
  }, [enabled, threshold, onSwipeBack]);

  const handleTouchEnd = useCallback(() => {
    isSwiping.current = false;
    hasTriggered.current = false;
    isHorizontalSwipe.current = false;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);
};
