import { useQuery } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';

import { db } from '@/db/db';
import { api } from '@/lib/api';

/** Màn hình tạm để kiểm tra hạ tầng: gọi API qua CORS và đọc IndexedDB. Thay khi có design. */
export function HomePage() {
  const health = useQuery({ queryKey: ['health'], queryFn: api.health });
  const pending = useLiveQuery(() => db.outbox.count(), [], 0);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <h1 className="pt-6 text-2xl font-semibold">Fitness Tracking</h1>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">API</dt>
        <dd>
          {health.isPending
            ? 'Đang kiểm tra…'
            : health.isError
              ? `Lỗi: ${health.error.message}`
              : `OK (${health.data.status})`}
        </dd>
        <dt className="text-muted-foreground">Chưa đồng bộ</dt>
        <dd>{pending} sự kiện</dd>
      </dl>
    </main>
  );
}
