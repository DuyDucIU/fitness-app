import {
  type BodyMetric,
  CreateBodyMetricRequestSchema,
  isBodyMetricValueValid,
} from '@fitness/contract';

import type { BodyMetricsApi } from '@/lib/api';
import { ApiError } from '@/lib/errors';

/**
 * Server chỉ số cơ thể giả trong bộ nhớ, cùng luật với API thật: kiểm khoảng hợp lệ, sửa thì
 * đánh dấu `edited`, id lạ thì 404. `online = false` thì mọi lời gọi như mất mạng.
 */
export function fakeBodyMetricsServer(initial: BodyMetric[] = []) {
  let entries = [...initial];
  let seq = 0;
  const server = {
    online: true,
    get entries() {
      return entries;
    },
    api: {} as BodyMetricsApi,
  };
  const reachable = () => {
    if (!server.online) throw new ApiError('network', 0);
  };
  const sorted = () =>
    [...entries].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));
  const find = (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) throw new ApiError('not_found', 404);
    return entry;
  };
  server.api = {
    list: () =>
      Promise.resolve().then(() => {
        reachable();
        return { entries: sorted() };
      }),
    create: (body) =>
      Promise.resolve().then(() => {
        reachable();
        if (!CreateBodyMetricRequestSchema.safeParse(body).success) {
          throw new ApiError('validation_failed', 400);
        }
        const entry: BodyMetric = {
          id: `00000000-0000-4000-a000-${String(++seq).padStart(12, '0')}`,
          ...body,
          source: 'manual',
          edited: false,
        };
        entries = [...entries, entry];
        return entry;
      }),
    update: (id, body) =>
      Promise.resolve().then(() => {
        reachable();
        const old = find(id);
        if (
          body.value !== undefined &&
          !isBodyMetricValueValid(old.metric, body.value)
        ) {
          throw new ApiError('bad_request', 400);
        }
        const entry: BodyMetric = { ...old, ...body, edited: true };
        entries = entries.map((e) => (e.id === id ? entry : e));
        return entry;
      }),
    remove: (id) =>
      Promise.resolve().then(() => {
        reachable();
        find(id);
        entries = entries.filter((e) => e.id !== id);
      }),
  };
  return server;
}
