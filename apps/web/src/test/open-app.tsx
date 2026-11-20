import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { vi } from 'vitest';

import { createAuth } from '@/auth/auth';
import { AuthContext } from '@/auth/auth-context';
import type { SessionLookup } from '@/auth/gateway';
import { AN, fakeGateway } from '@/auth/testing';
import { ToastProvider } from '@/components/toast';
import { db } from '@/db/db';
import { createRoutes } from '@/router';

/**
 * Mở app ở `url` với router thật, Dexie thật (fake-indexeddb) và Supabase giả
 * (`@/auth/testing`). `signedInBefore`: máy đã có chủ là AN.
 */
export async function openApp(
  url: string,
  options: { stored?: SessionLookup; signedInBefore?: boolean } = {},
) {
  if (options.signedInBefore) {
    await db.meta.put({ key: 'owner', value: AN });
  }
  const fake = fakeGateway({ stored: options.stored });
  const auth = createAuth({
    gateway: fake.gateway,
    db,
    fetchMe: async () => ({}),
    clearCaches: vi.fn(),
  });
  const router = createMemoryRouter(createRoutes(auth), {
    initialEntries: [url],
  });
  render(
    <AuthContext value={auth}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthContext>,
  );
  return { router, auth, fake };
}

/** Xoá IndexedDB giữa các test. */
export async function clearDb() {
  await Promise.all(db.tables.map((table) => table.clear()));
}
