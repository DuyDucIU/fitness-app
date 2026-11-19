import { createBrowserRouter, type RouteObject } from 'react-router';

import {
  HistoryPage,
  MePage,
  PlansPage,
  ProgressPage,
  TodayPage,
} from '@/routes/root-screens';

/** Route chỉ có khi dev: `import.meta.env.DEV` là hằng `false` ở bản build nên bị loại bỏ. */
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [{ path: '/dev/kit', lazy: () => import('@/routes/dev/kit') }]
  : [];

/** React Router Data mode, SPA thuần không SSR (SDD 3.1). */
export const router = createBrowserRouter([
  { path: '/', Component: TodayPage },
  { path: '/plans', Component: PlansPage },
  { path: '/history', Component: HistoryPage },
  { path: '/progress', Component: ProgressPage },
  { path: '/me', Component: MePage },
  ...devRoutes,
]);
