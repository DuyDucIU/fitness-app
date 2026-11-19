import { isRouteErrorResponse, useRouteError } from 'react-router';

import { AppShell, Foot } from '@/components/app-shell';
import { EmptyState } from '@/components/empty-state';
import { m } from '@/paraglide/messages.js';

/** Khung chung cho màn lỗi: khối trống + thanh tab để quay về các màn gốc. */
function ErrorScreen({ message }: { message: string }) {
  return (
    <AppShell
      // Không có thanh trên: vẫn chừa vùng an toàn iOS ở đỉnh.
      top={<div aria-hidden className="h-(--safe-top) flex-none" />}
      foot={<Foot tabs />}
    >
      <EmptyState heading>{message}</EmptyState>
    </AppShell>
  );
}

/** URL không có trong app (route `*`). */
export function NotFoundPage() {
  return <ErrorScreen message={m.error_not_found()} />;
}

/**
 * `errorElement` của router: thay màn lỗi mặc định (tiếng Anh, không dịch) của React Router.
 */
export function RouteError() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <ErrorScreen message={notFound ? m.error_not_found() : m.error_unknown()} />
  );
}
