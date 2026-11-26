import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  type BodyMetric,
  BodyMetricSchema,
  BodyMetricsResponseSchema,
  type CreateBodyMetricRequest,
} from '@fitness/contract';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import type { AuthContext } from '../src/auth/auth.types';
import { JOSE, JwtVerifierService } from '../src/auth/jwt-verifier.service';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Chỉ số cơ thể (UC18) qua HTTP với PostgreSQL thật. Token giả: chuỗi token chính là `sub`.
 * Mỗi test dùng user riêng để không phụ thuộc thứ tự chạy.
 */
describe('/v1/body-metrics (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const run = `e2e-body-${Date.now()}`;
  let n = 0;
  const newUser = () => `${run}-${n++}`;

  const http = () => request(app.getHttpServer() as App);
  const as = (sub: string) => ({
    get: () =>
      http().get('/v1/body-metrics').set('Authorization', `Bearer ${sub}`),
    post: (body: object) =>
      http()
        .post('/v1/body-metrics')
        .set('Authorization', `Bearer ${sub}`)
        .send(body),
    patch: (id: string, body: object) =>
      http()
        .patch(`/v1/body-metrics/${id}`)
        .set('Authorization', `Bearer ${sub}`)
        .send(body),
    delete: (id: string) =>
      http()
        .delete(`/v1/body-metrics/${id}`)
        .set('Authorization', `Bearer ${sub}`),
  });

  const list = async (sub: string) =>
    BodyMetricsResponseSchema.parse((await as(sub).get().expect(200)).body)
      .entries;

  const add = async (
    sub: string,
    over: Partial<CreateBodyMetricRequest> = {},
  ): Promise<BodyMetric> =>
    BodyMetricSchema.parse(
      (
        await as(sub)
          .post({
            metric: 'weight',
            value: 72.5,
            measuredAt: '2026-11-18T00:10:00.000Z',
            ...over,
          })
          .expect(201)
      ).body,
    );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(JOSE)
      .useValue({})
      .overrideProvider(JwtVerifierService)
      .useValue({
        verify: (token: string): Promise<AuthContext> =>
          Promise.resolve({
            sub: token,
            email: `${token}@example.com`,
            provider: 'email',
          }),
      })
      .compile();
    app = moduleRef.createNestApplication();
    setupApp(app, { swagger: false, corsOrigins: [] });
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { authSubject: { startsWith: run } },
    });
    await app.close();
  });

  it('không có token: 401', async () => {
    await http().get('/v1/body-metrics').expect(401);
  });

  it('user mới chưa có chỉ số nào', async () => {
    expect(await list(newUser())).toEqual([]);
  });

  it('nhập tay rồi đọc lại, mới đo trước', async () => {
    const sub = newUser();
    const older = await add(sub, {
      value: 73.2,
      measuredAt: '2026-11-11T00:05:00.000Z',
    });
    const waist = await add(sub, {
      metric: 'waist',
      value: 82.5,
      measuredAt: '2026-11-15T00:00:00.000Z',
    });
    const newer = await add(sub, {
      value: 72.5,
      measuredAt: '2026-11-18T00:10:00.000Z',
    });
    expect(newer).toMatchObject({
      metric: 'weight',
      value: 72.5,
      measuredAt: '2026-11-18T00:10:00.000Z',
      source: 'manual',
      edited: false,
    });
    expect((await list(sub)).map((e) => e.id)).toEqual([
      newer.id,
      waist.id,
      older.id,
    ]);
  });

  it('số ngoài khoảng của chỉ số: 400, không ghi gì', async () => {
    const sub = newUser();
    const bad = (metric: string, value: number) =>
      as(sub)
        .post({ metric, value, measuredAt: '2026-11-18T00:10:00.000Z' })
        .expect(400);
    await bad('weight', 10);
    await bad('waist', 32);
    await bad('body_fat', 0.18);
    expect(await list(sub)).toEqual([]);
  });

  it('sửa số và thời điểm thì đánh dấu đã sửa', async () => {
    const sub = newUser();
    const entry = await add(sub);
    const res = await as(sub)
      .patch(entry.id, { value: 71.8, measuredAt: '2026-11-17T23:00:00.000Z' })
      .expect(200);
    expect(BodyMetricSchema.parse(res.body)).toEqual({
      ...entry,
      value: 71.8,
      measuredAt: '2026-11-17T23:00:00.000Z',
      edited: true,
    });
    expect(await list(sub)).toEqual([BodyMetricSchema.parse(res.body)]);
  });

  it('sửa thành số ngoài khoảng của loại chỉ số đó: 400', async () => {
    const sub = newUser();
    const waist = await add(sub, { metric: 'waist', value: 82 });
    // 300 hợp lệ với cân nặng nhưng không với vòng eo.
    await as(sub).patch(waist.id, { value: 300 }).expect(400);
    expect((await list(sub))[0]).toEqual(waist);
  });

  it('xoá hẳn một chỉ số', async () => {
    const sub = newUser();
    const keep = await add(sub, { measuredAt: '2026-11-11T00:00:00.000Z' });
    const gone = await add(sub);
    await as(sub).delete(gone.id).expect(204);
    expect(await list(sub)).toEqual([keep]);
    await as(sub).delete(gone.id).expect(404);
  });

  it('chỉ số của user khác: 404 khi sửa hoặc xoá, không lộ khi đọc', async () => {
    const owner = newUser();
    const other = newUser();
    const entry = await add(owner);
    await as(other).patch(entry.id, { value: 70 }).expect(404);
    await as(other).delete(entry.id).expect(404);
    await as(other).patch(randomUUID(), { value: 70 }).expect(404);
    expect(await list(other)).toEqual([]);
    expect(await list(owner)).toEqual([entry]);
  });

  it('xoá user thì chỉ số của user xoá theo', async () => {
    const sub = newUser();
    const entry = await add(sub);
    await prisma.user.delete({ where: { authSubject: sub } });
    expect(await prisma.bodyMetric.count({ where: { id: entry.id } })).toBe(0);
  });
});
