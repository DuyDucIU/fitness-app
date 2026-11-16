import { describe, expect, it } from 'vitest';
import { HealthResponseSchema, MeResponseSchema } from './index';

describe('contract', () => {
  it('health: chấp nhận response hợp lệ', () => {
    const parsed = HealthResponseSchema.parse({
      status: 'ok',
      time: new Date().toISOString(),
    });
    expect(parsed.status).toBe('ok');
  });

  it('health: từ chối status lạ', () => {
    expect(
      HealthResponseSchema.safeParse({ status: 'down', time: 'x' }).success,
    ).toBe(false);
  });

  it('me: từ chối unitPref ngoài kg|lb', () => {
    const result = MeResponseSchema.safeParse({
      id: '6f1d2c0a-8d63-4a0e-9b1b-3f6c3d6c9b11',
      email: 'a@example.com',
      displayName: null,
      unitPref: 'stone',
      timezone: 'Asia/Ho_Chi_Minh',
      rpeEnabled: false,
    });
    expect(result.success).toBe(false);
  });
});
