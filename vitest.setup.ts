/**
 * vitest node 环境没有 localStorage。
 * budgetsSlice / recurringSlice 等会通过 utils/storage 读写 localStorage,
 * 这里提供一个基于 Map 的内存桩。
 */
const store = new Map<string, string>();

const localStorageStub = {
  getItem: (key: string): string | null => (store.has(key) ? (store.get(key) as string) : null),
  setItem: (key: string, value: string): void => {
    store.set(key, String(value));
  },
  removeItem: (key: string): void => {
    store.delete(key);
  },
  clear: (): void => {
    store.clear();
  },
  key: (index: number): string | null => Array.from(store.keys())[index] ?? null,
  get length(): number {
    return store.size;
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageStub,
  configurable: true,
  writable: true,
});
