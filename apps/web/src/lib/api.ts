import {
  ErrorResponseSchema,
  type HealthResponse,
  HealthResponseSchema,
  type MeResponse,
  MeResponseSchema,
} from '@fitness/contract';

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
  options: { auth: boolean },
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.auth) {
    const { data } = await getSupabase().auth.getSession();
    if (!data.session) throw new ApiError('unauthorized', 401);
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const response = await fetch(`${env.apiUrl}${path}`, { headers });
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
};
