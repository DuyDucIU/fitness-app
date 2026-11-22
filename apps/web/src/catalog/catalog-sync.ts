import type { CatalogResponse } from '@fitness/contract';

import type { Auth } from '@/auth/auth';
import type { db as appDb } from '@/db/db';
import { createReadOnlyCache } from '@/lib/read-only-cache';

/**
 * Giữ cache chỉ đọc của catalog bài tập trên máy (ADR 0002, SDD 3.2): làm mới khi mở app,
 * sau khi đăng nhập, khi có mạng lại; gọi `refresh()` sau mỗi lần ghi thành công lên server
 * (vd tạo bài tuỳ chỉnh).
 */
export function createCatalogSync(deps: {
  db: typeof appDb;
  auth: Auth;
  /** GET /v1/catalog. */
  fetchCatalog: () => Promise<CatalogResponse>;
  onReconnect?: (listener: () => void) => () => void;
}): { refresh(): Promise<void> } {
  const { db } = deps;
  return createReadOnlyCache({
    db,
    auth: deps.auth,
    label: 'catalog bài tập',
    tables: [db.exercises],
    fetch: deps.fetchCatalog,
    replace: async (catalog) => {
      await db.exercises.clear();
      await db.exercises.bulkPut(catalog.exercises);
    },
    onReconnect: deps.onReconnect,
  });
}
