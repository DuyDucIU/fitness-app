import {
  type CatalogResponse,
  CatalogResponseSchema,
  ErrorResponseSchema,
  type HealthResponse,
  HealthResponseSchema,
  type MeResponse,
  MeResponseSchema,
  type SyncEvent,
  type SyncPushRequest,
  type SyncPushResponse,
  SyncPushResponseSchema,
} from '@fitness/contract';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';

import { env } from './env';
import { ApiError } from './errors';
import { getSupabase } from './supabase';

/**
 * Gọi API với JWT của phiên hiện tại và validate response bằng schema dùng chung.
 * Lỗi ném ra là `ApiError` mang mã lỗi; hiển thị bằng `errorMessage` (lib/errors).
 */
async function request<T>(
  path: string,
  parse: (data: unknown) => T,
  options: { auth: boolean; method?: 'GET' | 'POST'; body?: unknown },
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.auth) {
    const { data, error } = await getSupabase().auth.getSession();
    // Offline với token hết hạn: chưa refresh được, không phải mất phiên (SDD 9.1).
    if (isAuthRetryableFetchError(error)) throw new ApiError('network', 0);
    if (!data.session) throw new ApiError('unauthorized', 401);
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    // fetch chỉ ném khi không tới được server (mất mạng, server tắt, CORS).
    throw new ApiError('network', 0, String(error));
  }
  if (!response.ok) {
    const body = ErrorResponseSchema.safeParse(
      await response.json().catch(() => null),
    );
    throw body.success
      ? new ApiError(body.data.code, response.status, body.data.message)
      : new ApiError('unknown', response.status);
  }
  return parse(await response.json());
}

export const api = {
  health: (): Promise<HealthResponse> =>
    request('/health', (d) => HealthResponseSchema.parse(d), { auth: false }),
  me: (): Promise<MeResponse> =>
    request('/me', (d) => MeResponseSchema.parse(d), { auth: true }),
  catalog: (): Promise<CatalogResponse> =>
    request('/catalog', (d) => CatalogResponseSchema.parse(d), { auth: true }),
  syncPush: (events: SyncEvent[]): Promise<SyncPushResponse> =>
    request('/sync/push', (d) => SyncPushResponseSchema.parse(d), {
      auth: true,
      method: 'POST',
      body: { events } satisfies SyncPushRequest,
    }),
};
