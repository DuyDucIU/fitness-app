import type {
  CatalogResponse,
  SyncEvent,
  SyncPullResponse,
} from '@fitness/contract';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { onTestFinished, vi } from 'vitest';

import { AuthContext } from '@/auth/auth-context';
import { createTestAuth } from '@/auth/testing';
import { createCatalogSync } from '@/catalog/catalog-sync';
import { ToastProvider } from '@/components/toast';
import { db } from '@/db/db';
import { ApiError } from '@/lib/errors';
import { createRoutes } from '@/router';
import { createOutboxPush } from '@/sync/outbox-push';
import { createSyncPull } from '@/sync/pull';

/**
 * Mở app ở `url` với router thật, Dexie thật (fake-indexeddb) và Supabase giả
 * (`createTestAuth`, cùng tuỳ chọn).
 * - `fetchCatalog`: GET /v1/catalog giả; mặc định như đang mất mạng.
 * - `pushEvents`: POST /v1/sync/push giả; mặc định như đang mất mạng (outbox giữ nguyên).
 * - `pullChanges`: GET /v1/sync/pull giả; mặc định như đang mất mạng.
 * - `reconnect()`: giả lập trình duyệt có mạng trở lại.
 * - `becomeVisible()`: giả lập user quay lại app (`visibilitychange` sang hiện).
 */
export async function openApp(
  url: string,
  options: Parameters<typeof createTestAuth>[0] & {
    fetchCatalog?: () => Promise<CatalogResponse>;
    pushEvents?: (events: SyncEvent[]) => Promise<unknown>;
    pullChanges?: (since?: string) => Promise<SyncPullResponse>;
  } = {},
) {
  const {
    fetchCatalog: fetchCatalogOption,
    pushEvents: pushEventsOption,
    pullChanges: pullChangesOption,
    ...authOptions
  } = options;
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
  const syncPull = createSyncPull({
    db,
    auth: ctx.auth,
    pullChanges:
      pullChangesOption ??
      (() => Promise.reject<SyncPullResponse>(new ApiError('network', 0))),
  });
  let pushReconnect = () => {};
  let pushVisible = () => {};
  const outboxPush = createOutboxPush({
    db,
    auth: ctx.auth,
    pushEvents:
      pushEventsOption ?? (() => Promise.reject(new ApiError('network', 0))),
    onReconnect: (listener) => {
      pushReconnect = listener;
      return () => {};
    },
    onVisible: (listener) => {
      pushVisible = listener;
      return () => {};
    },
    // Không tự thử lại theo giờ trong test.
    retryDelayMs: () => Infinity,
    afterDrain: syncPull.pull,
  });
  // Bộ đẩy theo dõi IndexedDB dùng chung: dừng khi hết test để không đẩy outbox của test sau.
  onTestFinished(() => outboxPush.stop());
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
      pushReconnect();
    },
    becomeVisible: () => pushVisible(),
  };
}
