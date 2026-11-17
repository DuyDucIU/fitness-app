import {
  type HealthResponse,
  HealthResponseSchema,
  type MeResponse,
  MeResponseSchema,
} from '@fitness/contract';

import { env } from './env';
import { getSupabase } from './supabase';

/** Gọi API với JWT của phiên hiện tại và validate response bằng schema dùng chung. */
async function request<T>(
  path: string,
  parse: (data: unknown) => T,
  options: { auth: boolean },
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.auth) {
    const { data } = await getSupabase().auth.getSession();
    if (!data.session) throw new Error('Chưa đăng nhập');
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const response = await fetch(`${env.apiUrl}${path}`, { headers });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return parse(await response.json());
}

export const api = {
  health: (): Promise<HealthResponse> =>
    request('/health', (d) => HealthResponseSchema.parse(d), { auth: false }),
  me: (): Promise<MeResponse> =>
    request('/me', (d) => MeResponseSchema.parse(d), { auth: true }),
};
