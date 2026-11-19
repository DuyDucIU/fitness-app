import { cn } from '@/lib/utils';

import { OfflineIcon } from '@/components/icons';
import { type SyncStatus, useSyncStatus } from '@/hooks/use-sync-status';
import { m } from '@/paraglide/messages.js';

/**
 * Chip đồng bộ, hiện trên mọi màn (PRODUCT.md). Xanh = đã đồng bộ; viền mực = còn thay
 * đổi chưa đẩy; nền mực = ngoại tuyến (kèm số thay đổi đang chờ trên máy).
 */
export function SyncPillView({
  online,
  pending,
  syncing,
}: SyncStatus & { syncing?: boolean }) {
  const base =
    'flex h-8 min-w-0 flex-none items-center gap-1.5 overflow-hidden rounded-full border-[1.5px] border-ink px-2.5 text-label font-semibold whitespace-nowrap';

  if (!online) {
    return (
      <span
        role="status"
        title={
          pending
            ? m.sync_offline_pending_hint({ count: pending })
            : m.sync_offline_hint()
        }
        className={cn(base, 'bg-ink text-tyvek')}
      >
        <OfflineIcon className="size-3.5 flex-none" aria-hidden />
        <span>
          {pending
            ? m.sync_offline_pending({ count: pending })
            : m.sync_offline()}
        </span>
      </span>
    );
  }

  const dot = 'size-2.25 flex-none rounded-full';
  if (pending) {
    return (
      <span role="status" className={base}>
        <span aria-hidden className={cn(dot, 'border-2 border-ink')} />
        <span>
          {syncing ? m.sync_syncing() : m.sync_pending({ count: pending })}
        </span>
      </span>
    );
  }

  return (
    <span role="status" className={base}>
      <span aria-hidden className={cn(dot, 'bg-green')} />
      <span>{m.sync_synced()}</span>
    </span>
  );
}

/** Chip đồng bộ nối với trạng thái thật (mạng + outbox). */
export function SyncPill() {
  return <SyncPillView {...useSyncStatus()} />;
}
