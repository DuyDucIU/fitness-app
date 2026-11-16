import { createBrowserRouter } from 'react-router';

import { HomePage } from '@/routes/home';

/** React Router Data mode, SPA thuần không SSR (SDD 3.1). */
export const router = createBrowserRouter([
  {
    path: '/',
    Component: HomePage,
  },
]);
