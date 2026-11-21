import type * as React from 'react';
import {
  isRouteErrorResponse,
  useRevalidator,
  useRouteError,
} from 'react-router';

import { AppShell, Foot } from '@/components/app-shell';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { m } from '@/paraglide/messages.js';

/** Khung chung cho màn lỗi: khối trống + thanh tab để quay về các màn gốc. */
function ErrorScreen({
  message,
  action,
}: {
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <AppShell
      // Không có thanh trên: vẫn chừa vùng an toàn iOS ở đỉnh.
      top={<div aria-hidden className="h-(--safe-top) flex-none" />}
      foot={<Foot tabs />}
    >
      <EmptyState heading action={action}>
        {message}
      </EmptyState>
    </AppShell>
  );
}

/** URL không có trong app (route `*`). */
export function NotFoundPage() {
  return <ErrorScreen message={m.error_not_found()} />;
}

/**
 * `errorElement` của router: thay màn lỗi mặc định (tiếng Anh, không dịch) của React Router.
 * Lỗi khác 404 (vd không đọc được IndexedDB lúc mở app) có nút chạy lại loader.
 */
export function RouteError() {
  const error = useRouteError();
  const revalidator = useRevalidator();
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <ErrorScreen message={m.error_not_found()} />;
  }
  return (
    <ErrorScreen
      message={m.error_unknown()}
      action={
        <Button
          size="wide"
          busy={revalidator.state === 'loading'}
          onClick={() => void revalidator.revalidate()}
        >
          {m.common_retry()}
        </Button>
      }
    />
  );
}
