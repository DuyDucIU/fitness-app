// IndexedDB giả lập cho Dexie trong jsdom (jsdom không có IndexedDB).
import 'fake-indexeddb/auto';
// Chỉ lấy kiểu (khai báo matcher cho `expect`), không chạy gì lúc runtime.
import type {} from '@testing-library/jest-dom/vitest';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';

// Gắn matcher của jest-dom vào chính `expect` mà file test dùng. Không dùng
// `import '@testing-library/jest-dom/vitest'`: trên Windows, khi chạy từ thư mục `d:`
// (chữ thường) gói đó có thể nạp một bản `vitest` khác nên matcher không có hiệu lực.
// Kiểu của gói có khoá `default` nhưng lúc chạy thì không; chỉ lấy các matcher có tên.
expect.extend(
  Object.fromEntries(
    Object.entries(jestDomMatchers).filter(([name]) => name !== 'default'),
  ) as Parameters<typeof expect.extend>[0],
);

// Vitest không bật `globals`, nên Testing Library không tự dọn DOM sau mỗi test.
afterEach(() => {
  cleanup();
});
