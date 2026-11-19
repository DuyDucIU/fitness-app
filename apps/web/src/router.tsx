import { createBrowserRouter, type RouteObject } from 'react-router';

import {
  HistoryPage,
  MePage,
  PlansPage,
  ProgressPage,
  TodayPage,
} from '@/routes/root-screens';
import { NotFoundPage, RouteError } from '@/routes/route-error';

/** Route chỉ có khi dev: `import.meta.env.DEV` là hằng `false` ở bản build nên bị loại bỏ. */
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [{ path: '/dev/kit', lazy: () => import('@/routes/dev/kit') }]
  : [];

/** React Router Data mode, SPA thuần không SSR (SDD 3.1). */
export const router = createBrowserRouter([
  {
    // Route gốc không có path: chỉ để mọi route con dùng chung màn lỗi đã dịch.
    ErrorBoundary: RouteError,
    children: [
      { path: '/', Component: TodayPage },
      { path: '/plans', Component: PlansPage },
      { path: '/history', Component: HistoryPage },
      { path: '/progress', Component: ProgressPage },
      { path: '/me', Component: MePage },
      ...devRoutes,
      { path: '*', Component: NotFoundPage },
    ],
  },
]);
