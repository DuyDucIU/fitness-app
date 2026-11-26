import {
  type AddRoutineExerciseRequest,
  type BodyMetric,
  BodyMetricSchema,
  type BodyMetricsResponse,
  BodyMetricsResponseSchema,
  type CreateBodyMetricRequest,
  type UpdateBodyMetricRequest,
  type CatalogResponse,
  CatalogResponseSchema,
  ErrorResponseSchema,
  type HealthResponse,
  HealthResponseSchema,
  type MeResponse,
  MeResponseSchema,
  type ProgressResponse,
  ProgressResponseSchema,
  type CreateRoutineDayRequest,
  type CreateRoutineRequest,
  type Routine,
  RoutineSchema,
  type RoutinesResponse,
  RoutinesResponseSchema,
  type SyncEvent,
  type SyncPullResponse,
  SyncPullResponseSchema,
  type SyncPushRequest,
  type SyncPushResponse,
  SyncPushResponseSchema,
  type UpdateRoutineDayRequest,
  type UpdateRoutineExerciseRequest,
  type UpdateRoutineRequest,
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
  options: {
    auth: boolean;
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    body?: unknown;
  },
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
  // 204 No Content (vd xoá routine): không có body để đọc.
  return parse(response.status === 204 ? undefined : await response.json());
}

const routine = (d: unknown): Routine => RoutineSchema.parse(d);
const write = (
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<Routine> => request(path, routine, { auth: true, method, body });

/** REST routine (UC05), cần mạng (ADR 0002). Mỗi thao tác ghi trả lại cả routine bị sửa. */
export const routinesApi = {
  list: (): Promise<RoutinesResponse> =>
    request('/routines', (d) => RoutinesResponseSchema.parse(d), {
      auth: true,
    }),
  create: (body: CreateRoutineRequest) => write('POST', '/routines', body),
  update: (id: string, body: UpdateRoutineRequest) =>
    write('PATCH', `/routines/${id}`, body),
  archive: (id: string): Promise<void> =>
    request(`/routines/${id}`, () => undefined, {
      auth: true,
      method: 'DELETE',
    }),
  addDay: (routineId: string, body: CreateRoutineDayRequest) =>
    write('POST', `/routines/${routineId}/days`, body),
  reorderDays: (routineId: string, ids: string[]) =>
    write('PUT', `/routines/${routineId}/day-order`, { ids }),
  updateDay: (dayId: string, body: UpdateRoutineDayRequest) =>
    write('PATCH', `/routine-days/${dayId}`, body),
  deleteDay: (dayId: string) => write('DELETE', `/routine-days/${dayId}`),
  addExercise: (dayId: string, body: AddRoutineExerciseRequest) =>
    write('POST', `/routine-days/${dayId}/exercises`, body),
  reorderExercises: (dayId: string, ids: string[]) =>
    write('PUT', `/routine-days/${dayId}/exercise-order`, { ids }),
  updateExercise: (id: string, body: UpdateRoutineExerciseRequest) =>
    write('PATCH', `/routine-exercises/${id}`, body),
  deleteExercise: (id: string) => write('DELETE', `/routine-exercises/${id}`),
};
export type RoutinesApi = typeof routinesApi;

const bodyMetric = (d: unknown): BodyMetric => BodyMetricSchema.parse(d);

/** REST chỉ số cơ thể (UC18), cần mạng cả khi đọc lẫn ghi (ADR 0002). */
export const bodyMetricsApi = {
  list: (): Promise<BodyMetricsResponse> =>
    request('/body-metrics', (d) => BodyMetricsResponseSchema.parse(d), {
      auth: true,
    }),
  create: (body: CreateBodyMetricRequest): Promise<BodyMetric> =>
    request('/body-metrics', bodyMetric, { auth: true, method: 'POST', body }),
  update: (id: string, body: UpdateBodyMetricRequest): Promise<BodyMetric> =>
    request(`/body-metrics/${id}`, bodyMetric, {
      auth: true,
      method: 'PATCH',
      body,
    }),
  remove: (id: string): Promise<void> =>
    request(`/body-metrics/${id}`, () => undefined, {
      auth: true,
      method: 'DELETE',
    }),
};
export type BodyMetricsApi = typeof bodyMetricsApi;

export const api = {
  health: (): Promise<HealthResponse> =>
    request('/health', (d) => HealthResponseSchema.parse(d), { auth: false }),
  me: (): Promise<MeResponse> =>
    request('/me', (d) => MeResponseSchema.parse(d), { auth: true }),
  /** Biểu đồ tiến độ (UC19), cần mạng. */
  progress: (): Promise<ProgressResponse> =>
    request('/progress', (d) => ProgressResponseSchema.parse(d), {
      auth: true,
    }),
  catalog: (): Promise<CatalogResponse> =>
    request('/catalog', (d) => CatalogResponseSchema.parse(d), { auth: true }),
  syncPush: (events: SyncEvent[]): Promise<SyncPushResponse> =>
    request('/sync/push', (d) => SyncPushResponseSchema.parse(d), {
      auth: true,
      method: 'POST',
      body: { events } satisfies SyncPushRequest,
    }),
  syncPull: (since?: string): Promise<SyncPullResponse> =>
    request(
      `/sync/pull${since ? `?since=${encodeURIComponent(since)}` : ''}`,
      (d) => SyncPullResponseSchema.parse(d),
      { auth: true },
    ),
};
