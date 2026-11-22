import type { CatalogResponse } from '@fitness/contract';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { vi } from 'vitest';

import { AuthContext } from '@/auth/auth-context';
import { createTestAuth } from '@/auth/testing';
import { createCatalogSync } from '@/catalog/catalog-sync';
import { ToastProvider } from '@/components/toast';
import { db } from '@/db/db';
import { ApiError } from '@/lib/errors';
import { createRoutes } from '@/router';

/**
 * Mở app ở `url` với router thật, Dexie thật (fake-indexeddb) và Supabase giả
 * (`createTestAuth`, cùng tuỳ chọn).
 * - `fetchCatalog`: GET /v1/catalog giả; mặc định như đang mất mạng.
 * - `reconnect()`: giả lập trình duyệt có mạng trở lại.
 */
export async function openApp(
  url: string,
  options: Parameters<typeof createTestAuth>[0] & {
    fetchCatalog?: () => Promise<CatalogResponse>;
  } = {},
) {
  const { fetchCatalog: fetchCatalogOption, ...authOptions } = options;
  const ctx = await createTestAuth(authOptions);
  const fetchCatalog = vi.fn(
    fetchCatalogOption ??
      (() => Promise.reject<CatalogResponse>(new ApiError('network', 0))),
  );
  let catalogReconnect = () => {};
  createCatalogSync({
    db,
    auth: ctx.auth,
    fetchCatalog,
    onReconnect: (listener) => {
      catalogReconnect = listener;
      return () => {};
    },
  });
  const router = createMemoryRouter(createRoutes(ctx.auth), {
    initialEntries: [url],
  });
  render(
    <AuthContext value={ctx.auth}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthContext>,
  );
  return {
    ...ctx,
    router,
    fetchCatalog,
    reconnect: () => {
      ctx.reconnect();
      catalogReconnect();
    },
  };
}
