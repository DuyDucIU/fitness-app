import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import './index.css';
import { createAuth } from '@/auth/auth';
import { AuthContext } from '@/auth/auth-context';
import { createSupabaseGateway } from '@/auth/supabase-gateway';
import { AppUpdateProvider } from '@/components/app-update';
import { ToastProvider } from '@/components/toast';
import { db } from '@/db/db';
import { api } from '@/lib/api';
import { applyDocumentLocale } from '@/lib/i18n';
import { requestPersistentStorage } from '@/lib/storage';
import { getSupabase } from '@/lib/supabase';
import { createRoutes } from '@/router';

const queryClient = new QueryClient();

const auth = createAuth({
  gateway: createSupabaseGateway(getSupabase),
  db,
  // Cache kết quả ở key ['me'] để màn hình sau dùng lại bằng useQuery.
  fetchMe: () => queryClient.fetchQuery({ queryKey: ['me'], queryFn: api.me }),
  clearCaches: () => queryClient.clear(),
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
