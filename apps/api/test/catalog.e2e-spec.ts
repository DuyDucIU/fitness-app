import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { type CatalogResponse, CatalogResponseSchema } from '@fitness/contract';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import type { AuthContext } from '../src/auth/auth.types';
import { JOSE, JwtVerifierService } from '../src/auth/jwt-verifier.service';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * GET /v1/catalog qua HTTP với PostgreSQL thật. Token giả: chuỗi token chính là `sub`
 * (verify JWT thật đã có unit test). Dữ liệu tự tạo vì CI không chạy seed.
 */
describe('GET /v1/catalog (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const run = `e2e-catalog-${Date.now()}`;
  const subA = `${run}-a`;
  const subB = `${run}-b`;
  const subNew = `${run}-new`;
  let globalId: string;
  let customAId: string;
  let customBId: string;

  const get = (sub: string) =>
    request(app.getHttpServer() as App)
      .get('/v1/catalog')
      .set('Authorization', `Bearer ${sub}`)
      .expect(200)
      .then((res) => CatalogResponseSchema.parse(res.body));

  const byId = (catalog: CatalogResponse, id: string) =>
    catalog.exercises.find((e) => e.id === id);

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

    const [userA, userB] = await Promise.all(
      [subA, subB].map((sub) =>
        prisma.user.create({
          data: {
            authSubject: sub,
            email: `${sub}@example.com`,
            authProvider: 'email',
          },
        }),
      ),
    );
    const chest = await prisma.muscle.upsert({
      where: { code: 'chest' },
      create: {
        code: 'chest',
        nameEn: 'Chest',
        nameVi: 'Ngực',
        muscleGroup: 'chest',
      },
      update: {},
    });

    const global = await prisma.exercise.create({
      data: {
        nameEn: 'E2E Bench Press',
        nameVi: 'Đẩy ngực E2E',
        equipment: 'barbell',
        mechanic: 'compound',
        source: 'curated',
        sourceRef: run,
        muscles: { create: { muscleId: chest.id, role: 'primary' } },
        aliases: {
          create: [
            { alias: 'đẩy ngực', aliasNormalized: 'day nguc', lang: 'vi' },
            {
              alias: 'ngực phẳng',
              aliasNormalized: 'nguc phang',
              lang: 'vi',
              ownerId: userA.id,
            },
            {
              alias: 'bí mật của B',
              aliasNormalized: 'bi mat cua b',
              lang: 'vi',
              ownerId: userB.id,
            },
          ],
        },
      },
    });
    globalId = global.id;
    customAId = (
      await prisma.exercise.create({
        data: { nameEn: 'A custom move', source: 'user', ownerId: userA.id },
      })
    ).id;
    customBId = (
      await prisma.exercise.create({
        data: { nameEn: 'B custom move', source: 'user', ownerId: userB.id },
      })
    ).id;
  });

  afterAll(async () => {
    // Xoá user thì bài tuỳ chỉnh và alias của user xoá theo (cascade).
    await prisma.user.deleteMany({
      where: { authSubject: { in: [subA, subB, subNew] } },
    });
    await prisma.exercise.deleteMany({ where: { id: globalId } });
    await app.close();
  });

  it('không có token: 401', async () => {
    await request(app.getHttpServer() as App)
      .get('/v1/catalog')
      .expect(401);
  });

  it('trả bài chung kèm nhóm cơ, alias chung và alias của chính user', async () => {
    const catalog = await get(subA);
    const global = byId(catalog, globalId);
    expect(global).toMatchObject({
      nameEn: 'E2E Bench Press',
      nameVi: 'Đẩy ngực E2E',
      equipment: 'barbell',
      mine: false,
      isArchived: false,
      muscles: [
        {
          code: 'chest',
          nameEn: 'Chest',
          nameVi: 'Ngực',
          role: 'primary',
        },
      ],
    });
    expect(global?.aliases).toEqual(
      expect.arrayContaining([
        { alias: 'đẩy ngực', lang: 'vi', mine: false },
        { alias: 'ngực phẳng', lang: 'vi', mine: true },
      ]),
    );
    expect(byId(catalog, customAId)).toMatchObject({
      nameEn: 'A custom move',
      nameVi: null,
      mine: true,
    });
  });

  it('không lộ bài tuỳ chỉnh và alias của user khác', async () => {
    const catalog = await get(subA);
    expect(byId(catalog, customBId)).toBeUndefined();
    expect(byId(catalog, globalId)?.aliases.map((a) => a.alias)).not.toContain(
      'bí mật của B',
    );

    const other = await get(subB);
    expect(byId(other, customAId)).toBeUndefined();
    expect(byId(other, customBId)?.mine).toBe(true);
  });

  it('user chưa có bản ghi (chưa gọi /me): vẫn nhận catalog chung', async () => {
    const catalog = await get(subNew);
    expect(byId(catalog, globalId)?.aliases).toEqual([
      { alias: 'đẩy ngực', lang: 'vi', mine: false },
    ]);
    expect(byId(catalog, customAId)).toBeUndefined();
  });
});
