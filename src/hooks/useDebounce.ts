import { useEffect, useState } from 'react';

/**
 * 防抖：返回延迟后才会更新的值。
 * 输入快速变化时只在停止变化后触发一次重算，避免每键都 filter/sort 大列表。
 */
export function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
