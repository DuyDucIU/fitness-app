/// <reference types="vitest/config" />
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Đường dẫn tuyệt đối theo đúng cách viết trên đĩa. Trên Windows, `import.meta.dirname`
 * mang chữ ổ đĩa của thư mục đang đứng (VS Code hay dùng `d:`), còn Vite resolve
 * node_modules ra `D:`; lệch chữ hoa/thường làm một package bị nạp hai bản
 * (vd hai context của react-router, hai bản React → lỗi hook `null`).
 */
const fromRoot = (relative: string) =>
  realpathSync.native(path.resolve(import.meta.dirname, relative));

// https://vite.dev/config/
export default defineConfig({
  // Gốc dự án theo cách viết trên đĩa (xem fromRoot): Vitest chạy từ thư mục `d:` cũng
  // nạp `vitest` một bản duy nhất, matcher của jest-dom mới gắn đúng `expect`.
  root: fromRoot('.'),
  plugins: [
    // Song ngữ (SDD 3.5): tuỳ chọn compiler nằm ở project.inlang/paraglide.config.ts.
    paraglideVitePlugin({ project: './project.inlang' }),
    react(),
    tailwindcss(),
    // PWA (SDD 3.3): service worker Workbox (generateSW) chỉ precache app shell;
    // dữ liệu offline nằm ở IndexedDB, request API không đi qua cache.
    VitePWA({
      // Bản mới chỉ kích hoạt khi user đồng ý, để không reload giữa buổi tập.
      registerType: 'prompt',
      workbox: {
        // App shell gồm cả font và icon để mở offline không bị đổi font.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      // Icon/favicon sinh từ public/favicon.svg (logo tạm, thay khi chốt design).
      pwaAssets: {
        image: 'public/favicon.svg',
      },
      manifest: {
        name: 'Fitness Tracking',
        short_name: 'Fitness',
        // Tiếng Anh là ngôn ngữ mặc định (D27, SDD 3.5).
        description: 'Log your workouts and get progression suggestions',
        lang: 'en',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        // Xám Tyvek (DESIGN.md › ground)
        theme_color: '#e6e6e1',
        background_color: '#e6e6e1',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fromRoot('./src'),
      // Package dùng chung build ra CommonJS cho NestJS; web đọc thẳng mã nguồn TS (ESM)
      // để Vite tree-shake được zod và không cần build package trước khi chạy dev.
      '@fitness/contract': fromRoot('../../packages/contract/src/index.ts'),
      '@fitness/engine': fromRoot('../../packages/engine/src/index.ts'),
    },
  },
  // Port cố định, trùng CORS_ORIGINS của API: bị chiếm thì báo lỗi thay vì lặng lẽ đổi port.
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  test: {
    environment: 'jsdom',
    // fake-indexeddb + matcher của jest-dom (SDD 11.7).
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      'virtual:pwa-register/react': fromRoot('./src/test/pwa-register-stub.ts'),
    },
  },
});
