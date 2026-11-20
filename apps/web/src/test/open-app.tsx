import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { AuthContext } from '@/auth/auth-context';
import { createTestAuth } from '@/auth/testing';
import { ToastProvider } from '@/components/toast';
import { createRoutes } from '@/router';

/**
 * Mở app ở `url` với router thật, Dexie thật (fake-indexeddb) và Supabase giả
 * (`createTestAuth`, cùng tuỳ chọn).
 */
export async function openApp(
  url: string,
  options: Parameters<typeof createTestAuth>[0] = {},
) {
  const ctx = await createTestAuth(options);
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
  return { ...ctx, router };
}
