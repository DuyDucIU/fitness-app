import type {
  CatalogResponse,
  ProgressResponse,
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
import type { BodyMetricsApi, RoutinesApi } from '@/lib/api';
import { ApiError } from '@/lib/errors';
import { fakeBodyMetricsServer } from '@/progress/testing';
import { BodyMetricsApiContext } from '@/progress/use-body-metrics';
import { ProgressFetchContext } from '@/progress/use-progress';

/** REST chỉ số cơ thể như đang mất mạng. */
function offlineBodyMetrics(): BodyMetricsApi {
  const server = fakeBodyMetricsServer();
  server.online = false;
  return server.api;
}
import { createRoutes } from '@/router';
import { RoutineSyncContext } from '@/routines/routine-context';
import { createRoutineSync } from '@/routines/routine-sync';
import { createOutboxPush } from '@/sync/outbox-push';
import { createSyncPull } from '@/sync/pull';

/**
 * Mở app ở `url` với router thật, Dexie thật (fake-indexeddb) và Supabase giả
 * (`createTestAuth`, cùng tuỳ chọn).
 * - `fetchCatalog`: GET /v1/catalog giả; mặc định như đang mất mạng.
 * - `pushEvents`: POST /v1/sync/push giả; mặc định như đang mất mạng (outbox giữ nguyên).
 * - `pullChanges`: GET /v1/sync/pull giả; mặc định như đang mất mạng.
 * - `routinesApi`: REST routine giả (thường là `fakeRoutinesServer().api`); hàm không truyền
 *   thì như đang mất mạng.
 * - `fetchProgress`: GET /v1/progress giả; mặc định như đang mất mạng. `online`: trình duyệt có mạng không (mặc định có).
 * - `bodyMetricsApi`: REST chỉ số cơ thể giả (thường là `fakeBodyMetricsServer().api`);
 *   mặc định như đang mất mạng.
 * - `reconnect()`: giả lập trình duyệt có mạng trở lại.
 * - `becomeVisible()`: giả lập user quay lại app (`visibilitychange` sang hiện).
 */
export async function openApp(
  url: string,
  options: Parameters<typeof createTestAuth>[0] & {
    fetchCatalog?: () => Promise<CatalogResponse>;
    pushEvents?: (events: SyncEvent[]) => Promise<unknown>;
    pullChanges?: (since?: string) => Promise<SyncPullResponse>;
    routinesApi?: Partial<RoutinesApi>;
    fetchProgress?: () => Promise<ProgressResponse>;
    bodyMetricsApi?: BodyMetricsApi;
    online?: () => boolean;
  } = {},
) {
  const {
    fetchCatalog: fetchCatalogOption,
    pushEvents: pushEventsOption,
    pullChanges: pullChangesOption,
    routinesApi: routinesApiOption,
    bodyMetricsApi = offlineBodyMetrics(),
    fetchProgress = () =>
      Promise.reject<ProgressResponse>(new ApiError('network', 0)),
    online,
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
  let routineReconnect = () => {};
  const offline = () => Promise.reject(new ApiError('network', 0));
  const routineSync = createRoutineSync({
    db,
    auth: ctx.auth,
    api: new Proxy({} as RoutinesApi, {
      get: (_, key: keyof RoutinesApi) => routinesApiOption?.[key] ?? offline,
    }),
    onReconnect: (listener) => {
      routineReconnect = listener;
      return () => {};
    },
    isOnline: online ?? (() => true),
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
      <RoutineSyncContext value={routineSync}>
        <ProgressFetchContext value={fetchProgress}>
          <BodyMetricsApiContext value={bodyMetricsApi}>
            <ToastProvider>
              <RouterProvider router={router} />
            </ToastProvider>
          </BodyMetricsApiContext>
        </ProgressFetchContext>
      </RoutineSyncContext>
    </AuthContext>,
  );
  return {
    ...ctx,
    router,
    fetchCatalog,
    reconnect: () => {
      ctx.reconnect();
      catalogReconnect();
      routineReconnect();
      pushReconnect();
    },
    becomeVisible: () => pushVisible(),
  };
}
