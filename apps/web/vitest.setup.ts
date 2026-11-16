// IndexedDB giả lập cho Dexie trong jsdom (jsdom không có IndexedDB).
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
