import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import './index.css';
import { createAuth } from '@/auth/auth';
import { AuthContext } from '@/auth/auth-context';
import { createSupabaseGateway } from '@/auth/supabase-gateway';
import { createCatalogSync } from '@/catalog/catalog-sync';
import { AppUpdateProvider } from '@/components/app-update';
import { ToastProvider } from '@/components/toast';
import { db } from '@/db/db';
import { api } from '@/lib/api';
import { applyDocumentLocale } from '@/lib/i18n';
import { requestPersistentStorage } from '@/lib/storage';
import { getSupabase } from '@/lib/supabase';
import { createRoutes } from '@/router';
import { createOutboxPush } from '@/sync/outbox-push';
import { createSyncPull } from '@/sync/pull';

const queryClient = new QueryClient();

const auth = createAuth({
  gateway: createSupabaseGateway(getSupabase),
  db,
  fetchMe: api.me,
  // Cache ở key ['me'] để màn hình sau dùng lại bằng useQuery (chỉ kết quả của phiên hiện tại).
  onMe: (me) => queryClient.setQueryData(['me'], me),
  clearCaches: () => queryClient.clear(),
});
// Cache catalog bài tập trên máy: tự làm mới khi có phiên và khi có mạng lại.
createCatalogSync({ db, auth, fetchCatalog: api.catalog });
// Đẩy outbox lên server sau mỗi lần ghi, khi mở app, khi có mạng lại và khi quay lại app;
// đẩy hết thì kéo thay đổi từ server về.
const syncPull = createSyncPull({ db, auth, pullChanges: api.syncPull });
createOutboxPush({
  db,
  auth,
  pushEvents: api.syncPush,
  afterDrain: syncPull.pull,
});
const router = createBrowserRouter(createRoutes(auth));

applyDocumentLocale();
void requestPersistentStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthContext value={auth}>
        <ToastProvider>
          <AppUpdateProvider>
            <RouterProvider router={router} />
          </AppUpdateProvider>
        </ToastProvider>
      </AuthContext>
    </QueryClientProvider>
  </StrictMode>,
);
