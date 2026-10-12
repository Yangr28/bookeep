import { useEffect, useRef, useState } from 'react';

/**
 * 列表增量加载：列表数据变化或筛选条件变化时重置为初始页大小，
 * 滚动接近底部时按 pageSize 增量加载更多，避免一次性渲染上千条 DOM。
 *
 * 用法：
 *   const { visibleItems, sentinelRef, hasMore } = useInfiniteList(items, 30);
 *   <div ref={sentinelRef} />  // 放在列表末尾，进入视口即加载下一页
 *
 * 注意：依赖项 deps 变化（如筛选条件）会重置 visibleItems 到初始页。
 */
export function useInfiniteList<T>(
  items: T[],
  pageSize = 30,
  deps: unknown[] = [],
): { visibleItems: T[]; sentinelRef: React.RefObject<HTMLDivElement>; hasMore: boolean } {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 列表变化或筛选变化时重置
  useEffect(() => {
    setVisibleCount(pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + pageSize, items.length));
        }
      },
      { rootMargin: '300px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [items.length, pageSize]);

  return {
    visibleItems: items.slice(0, visibleCount),
    sentinelRef,
    hasMore: visibleCount < items.length,
  };
}
