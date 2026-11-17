import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Đặt cache ngoài thư mục package: một node_modules rỗng trong workspace làm npm (arborist) lỗi.
  cacheDir: '../../node_modules/.vite/templates',
  test: { include: ['src/**/*.test.ts'] },
});
