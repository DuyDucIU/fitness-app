import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';

import './index.css';
import { AppUpdateProvider } from '@/components/app-update';
import { ToastProvider } from '@/components/toast';
import { applyDocumentLocale } from '@/lib/i18n';
import { requestPersistentStorage } from '@/lib/storage';
import { router } from '@/router';

const queryClient = new QueryClient();

applyDocumentLocale();
void requestPersistentStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AppUpdateProvider>
          <RouterProvider router={router} />
        </AppUpdateProvider>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
