import type {
  BodyMetric,
  CreateBodyMetricRequest,
  UpdateBodyMetricRequest,
} from '@fitness/contract';
import * as React from 'react';

import { useToast } from '@/components/toast-context';
import { type BodyMetricsApi, bodyMetricsApi } from '@/lib/api';
import { ApiError, errorMessage } from '@/lib/errors';
import { m } from '@/paraglide/messages.js';

/** REST chỉ số cơ thể; test thay bằng bản giả qua context này. */
export const BodyMetricsApiContext =
  React.createContext<BodyMetricsApi>(bodyMetricsApi);

export type BodyMetricsState =
  | { status: 'loading' }
  | { status: 'ready'; entries: BodyMetric[] }
  /** Không tới được server: chỉ số chỉ có trên server (không cache trên máy). */
  | { status: 'offline' }
  | { status: 'error' };

/** Mới đo trước, như server trả về. */
const newestFirst = (a: BodyMetric, b: BodyMetric) =>
  b.measuredAt.localeCompare(a.measuredAt);

/**
 * Chỉ số cơ thể của user (UC18). Không cache trên máy (ADR 0002): offline thì báo cần mạng,
 * có mạng lại (sự kiện `online`) thì tự tải lại. Ghi lỗi thì hiện toast (mất mạng: báo cần
 * có mạng) và trả `undefined`; ghi xong thì sửa luôn danh sách đang hiện.
 */
export function useBodyMetrics() {
  const api = React.useContext(BodyMetricsApiContext);
  const toast = useToast();
  const [state, setState] = React.useState<BodyMetricsState>({
    status: 'loading',
  });
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    api.list().then(
      ({ entries }) => {
        if (!cancelled) setState({ status: 'ready', entries });
      },
      (error: unknown) => {
        if (cancelled) return;
        const offline = error instanceof ApiError && error.code === 'network';
        setState({ status: offline ? 'offline' : 'error' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api, attempt]);

  const ready = state.status === 'ready';
  React.useEffect(() => {
    if (ready) return;
    const onOnline = () => setAttempt((a) => a + 1);
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [ready]);

  const edit = React.useCallback(
    (change: (entries: BodyMetric[]) => BodyMetric[]) =>
      setState((s) =>
        s.status === 'ready'
          ? { status: 'ready', entries: change(s.entries).sort(newestFirst) }
          : s,
      ),
    [],
  );

  const write = React.useCallback(
    async <T>(call: () => Promise<T>): Promise<T | undefined> => {
      try {
        return await call();
      } catch (error) {
        toast.show(
          error instanceof ApiError && error.code === 'network'
            ? m.body_needs_network()
            : errorMessage(error),
        );
        return undefined;
      }
    },
    [toast],
  );

  const add = React.useCallback(
    async (body: CreateBodyMetricRequest) => {
      const entry = await write(() => api.create(body));
      if (entry) edit((list) => [...list, entry]);
      return entry;
    },
    [api, write, edit],
  );

  const update = React.useCallback(
    async (id: string, body: UpdateBodyMetricRequest) => {
      const entry = await write(() => api.update(id, body));
      if (entry) edit((list) => list.map((e) => (e.id === id ? entry : e)));
      return entry;
    },
    [api, write, edit],
  );

  const remove = React.useCallback(
    async (id: string) => {
      const done = await write(async () => {
        await api.remove(id);
        return true;
      });
      if (done) edit((list) => list.filter((e) => e.id !== id));
      return done === true;
    },
    [api, write, edit],
  );

  return {
    state,
    retry: () => setAttempt((a) => a + 1),
    add,
    update,
    remove,
  };
}
