import { validateEnv } from './env';

describe('validateEnv', () => {
  it('áp dụng giá trị mặc định', () => {
    const env = validateEnv({ DATABASE_URL: 'postgresql://x' });
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.CORS_ORIGINS).toEqual([
      'http://localhost:5173',
      'http://localhost:4173',
    ]);
  });

  it('tách CORS_ORIGINS theo dấu phẩy, bỏ khoảng trắng', () => {
    const env = validateEnv({
      DATABASE_URL: 'postgresql://x',
      CORS_ORIGINS: 'http://localhost:5173, https://demo.example.com ',
    });
    expect(env.CORS_ORIGINS).toEqual([
      'http://localhost:5173',
      'https://demo.example.com',
    ]);
  });

  it('từ chối CORS_ORIGINS không phải URL', () => {
    expect(() =>
      validateEnv({ DATABASE_URL: 'x', CORS_ORIGINS: 'localhost' }),
    ).toThrow(/CORS_ORIGINS/);
  });

  it('coi chuỗi rỗng của biến Supabase là chưa đặt', () => {
    const env = validateEnv({
      DATABASE_URL: 'postgresql://x',
      SUPABASE_URL: '',
      SUPABASE_JWT_SECRET: '',
    });
    expect(env.SUPABASE_URL).toBeUndefined();
    expect(env.SUPABASE_JWT_SECRET).toBeUndefined();
  });

  it('báo lỗi rõ khi thiếu DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('từ chối SUPABASE_URL không phải URL', () => {
    expect(() =>
      validateEnv({ DATABASE_URL: 'x', SUPABASE_URL: 'not-a-url' }),
    ).toThrow(/SUPABASE_URL/);
  });
});
