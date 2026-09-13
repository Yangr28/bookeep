import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 本版只测纯逻辑(store slices 与 utils),node 环境即可,localStorage 由 setup 桩提供
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
