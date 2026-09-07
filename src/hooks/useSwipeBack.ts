import { useEffect, useRef, useCallback, useState } from 'react';

interface UseSwipeBackOptions {
  onSwipeBack: () => void;
  enabled?: boolean;
  threshold?: number;
}

export const useSwipeBack = ({ onSwipeBack, enabled = true, threshold = 30 }: UseSwipeBackOptions) => {
  const startX = useRef(0);
  const startY = useRef(0);
  const isSwiping = useRef(false);
  const hasTriggered = useRef(false);
  const isHorizontalSwipe = useRef(false);
  
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isSwipingState, setIsSwipingState] = useState(false);
  const [showLeftIndicator, setShowLeftIndicator] = useState(false);
  const [showRightIndicator, setShowRightIndicator] = useState(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    const touchX = touch.clientX;
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
    const swipeZoneWidth = Math.min(screenWidth * 0.2, 150);
    
    const isFromLeft = touchX < swipeZoneWidth;
    const isFromRight = touchX > screenWidth - swipeZoneWidth;
    
    if (!isFromLeft && !isFromRight) return;
    
    startX.current = touchX;
    startY.current = touch.clientY;
    isSwiping.current = true;
    hasTriggered.current = false;
    isHorizontalSwipe.current = false;
    setIsSwipingState(true);
    setSwipeProgress(0);
    
    if (isFromLeft) setShowLeftIndicator(true);
    if (isFromRight) setShowRightIndicator(true);
  }, [enabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !isSwiping.current || hasTriggered.current) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - startX.current;
    const deltaY = touch.clientY - startY.current;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
    const swipeZoneWidth = Math.min(screenWidth * 0.2, 150);
    
    if (absDeltaX > 10 && absDeltaX > absDeltaY * 1.5) {
      isHorizontalSwipe.current = true;
      e.preventDefault();
      
      const isFromLeft = startX.current < swipeZoneWidth;
      const directionCorrect = isFromLeft ? deltaX > 0 : deltaX < 0;
      
      if (directionCorrect) {
        const progress = Math.min(absDeltaX / 100, 1);
        setSwipeProgress(isFromLeft ? progress : -progress);
        
        if (absDeltaX > threshold) {
          hasTriggered.current = true;
          isSwiping.current = false;
          setIsSwipingState(false);
          setSwipeProgress(0);
          setShowLeftIndicator(false);
          setShowRightIndicator(false);
          onSwipeBack();
        }
      }
    } else if (absDeltaY > 10 && !isHorizontalSwipe.current) {
      isSwiping.current = false;
      setIsSwipingState(false);
      setSwipeProgress(0);
      setShowLeftIndicator(false);
      setShowRightIndicator(false);
    }
  }, [enabled, threshold, onSwipeBack]);

  const handleTouchEnd = useCallback(() => {
    isSwiping.current = false;
    hasTriggered.current = false;
    isHorizontalSwipe.current = false;
    setIsSwipingState(false);
    setSwipeProgress(0);
    setShowLeftIndicator(false);
    setShowRightIndicator(false);
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

  return {
    swipeProgress,
    isSwiping: isSwipingState,
    showLeftIndicator,
    showRightIndicator,
  };
};