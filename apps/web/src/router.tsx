import type { RouteObject } from 'react-router';

import type { Auth } from '@/auth/auth';
import { PublicOnly, RequireOwner } from '@/auth/guards';
import { SignInPage, SignUpPage } from '@/routes/auth/auth-screen';
import { ExerciseLibraryPage } from '@/routes/exercise-library';
import { AccountPage } from '@/routes/me-account';
import {
  HistoryPage,
  MePage,
  PlansPage,
  ProgressPage,
  TodayPage,
} from '@/routes/root-screens';
import { NotFoundPage, RouteError } from '@/routes/route-error';
import { WorkoutLogPage } from '@/routes/workout-log';
import { WORKOUT_PATH } from '@/workout/workout-resume-bar';

/** Route chỉ có khi dev: `import.meta.env.DEV` là hằng `false` ở bản build nên bị loại bỏ. */
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [{ path: '/dev/kit', lazy: () => import('@/routes/dev/kit') }]
  : [];

/**
 * Cây route của app (React Router Data mode, SPA thuần không SSR — SDD 3.1). Nhận module
 * auth để test dựng được router thật với Supabase giả.
 */
export function createRoutes(auth: Auth): RouteObject[] {
  return [
    {
      // Route gốc không có path: mọi route con dùng chung màn lỗi đã dịch, và chỉ render
      // sau khi đã biết trạng thái đăng nhập. Máy có chủ thì chỉ đọc IndexedDB, không chờ
      // mạng; máy chưa có chủ thì chờ đọc phiên (Auth.ready).
      ErrorBoundary: RouteError,
      loader: async () => {
        await auth.ready();
        return null;
      },
      HydrateFallback: () => null,
      children: [
        {
          Component: PublicOnly,
          children: [
            { path: '/sign-in', Component: SignInPage },
            { path: '/sign-up', Component: SignUpPage },
          ],
        },
        {
          Component: RequireOwner,
          children: [
            { path: '/', Component: TodayPage },
            { path: '/plans', Component: PlansPage },
            { path: '/plans/exercises', Component: ExerciseLibraryPage },
            { path: '/history', Component: HistoryPage },
            { path: '/progress', Component: ProgressPage },
            { path: '/me', Component: MePage },
            { path: '/me/account', Component: AccountPage },
            { path: WORKOUT_PATH, Component: WorkoutLogPage },
          ],
        },
        ...devRoutes,
        { path: '*', Component: NotFoundPage },
      ],
    },
  ];
}
