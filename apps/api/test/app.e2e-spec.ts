import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { HealthResponseSchema } from '@fitness/contract';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { JOSE } from '../src/auth/jwt-verifier.service';

/**
 * Integration test: cần PostgreSQL đang chạy (docker compose up -d) và đã migrate.
 * `jose` là ESM nên được thay bằng bản giả (Jest chạy CommonJS); phần verify thật đã có unit test.
 */
describe('API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(JOSE)
      .useValue({})
      .compile();
    app = moduleRef.createNestApplication();
    setupApp(app, {
      swagger: true,
      corsOrigins: ['http://localhost:5173'],
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/health: công khai, đúng schema trong contract', async () => {
    const response = await request(app.getHttpServer() as App)
      .get('/v1/health')
      .expect(200);
    expect(HealthResponseSchema.safeParse(response.body).success).toBe(true);
  });

  it('CORS: cho phép origin trong CORS_ORIGINS, không cho origin lạ', async () => {
    const allowed = await request(app.getHttpServer() as App)
      .options('/v1/me')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization');
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );

    const denied = await request(app.getHttpServer() as App)
      .get('/v1/health')
      .set('Origin', 'https://evil.example.com');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('GET /v1/me không có token: 401 với body lỗi thống nhất', async () => {
    const response = await request(app.getHttpServer() as App)
      .get('/v1/me')
      .expect(401);
    expect(response.body as unknown).toEqual({
      code: 'unauthorized',
      message: expect.any(String) as unknown,
    });
  });

  it('GET /api-json: OpenAPI sinh từ Zod có /v1/health và /v1/me', async () => {
    const response = await request(app.getHttpServer() as App)
      .get('/api-json')
      .expect(200);
    const body = response.body as { paths: Record<string, unknown> };
    expect(Object.keys(body.paths)).toEqual(
      expect.arrayContaining(['/v1/health', '/v1/me']),
    );
  });
});
