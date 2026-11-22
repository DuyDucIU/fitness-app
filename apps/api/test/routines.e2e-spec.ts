import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  type AddRoutineExerciseRequest,
  type Routine,
  RoutineSchema,
  RoutinesResponseSchema,
  SyncPullResponseSchema,
} from '@fitness/contract';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import type { AuthContext } from '../src/auth/auth.types';
import { JOSE, JwtVerifierService } from '../src/auth/jwt-verifier.service';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * REST routine (UC05) qua HTTP với PostgreSQL thật. Token giả: chuỗi token chính là `sub`.
 * Mỗi test dùng user riêng để không phụ thuộc thứ tự chạy.
 */
describe('/v1/routines (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const run = `e2e-routines-${Date.now()}`;
  let n = 0;
  /** User mới cho mỗi test (chưa có bản ghi: lần gọi đầu tạo lười). */
  const newUser = () => `${run}-${n++}`;
  let benchId: string;
  let squatId: string;
  let plankId: string;

  const http = () => request(app.getHttpServer() as App);
  const as = (sub: string) => ({
    get: (path: string) =>
      http().get(`/v1${path}`).set('Authorization', `Bearer ${sub}`),
    post: (path: string, body: object) =>
      http()
        .post(`/v1${path}`)
        .set('Authorization', `Bearer ${sub}`)
        .send(body),
    patch: (path: string, body: object) =>
      http()
        .patch(`/v1${path}`)
        .set('Authorization', `Bearer ${sub}`)
        .send(body),
    put: (path: string, body: object) =>
      http().put(`/v1${path}`).set('Authorization', `Bearer ${sub}`).send(body),
    delete: (path: string) =>
      http().delete(`/v1${path}`).set('Authorization', `Bearer ${sub}`),
  });

  const list = async (sub: string) =>
    RoutinesResponseSchema.parse(
      (await as(sub).get('/routines').expect(200)).body,
    ).routines;

  const create = async (
    sub: string,
    over: { name?: string; isActive?: boolean; days?: number } = {},
  ): Promise<Routine> => {
    const res = await as(sub)
      .post('/routines', {
        name: over.name ?? 'Upper / lower',
        isActive: over.isActive ?? true,
        days: Array.from({ length: over.days ?? 2 }, (_, i) => ({
          name: `Day ${i + 1}`,
        })),
      })
      .expect(201);
    return RoutineSchema.parse(res.body);
  };

  const target = (
    over: Partial<AddRoutineExerciseRequest> = {},
  ): AddRoutineExerciseRequest => ({
    exerciseId: benchId,
    targetSets: 3,
    repMin: 8,
    repMax: 12,
    targetDurationMinS: null,
    targetDurationMaxS: null,
    initialWeightKg: null,
    warmupEnabled: false,
    restSeconds: 90,
    ...over,
  });

  const addExercise = async (
    sub: string,
    dayId: string,
    over: Partial<AddRoutineExerciseRequest> = {},
  ) =>
    RoutineSchema.parse(
      (
        await as(sub)
          .post(`/routine-days/${dayId}/exercises`, target(over))
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

    const make = (nameEn: string, metricType: 'weight_reps' | 'duration') =>
      prisma.exercise
        .create({
          data: {
            nameEn,
            metricType,
            source: 'curated',
            sourceRef: `${run}-${nameEn}`,
          },
        })
        .then((e) => e.id);
    benchId = await make('E2E Routine Bench', 'weight_reps');
    squatId = await make('E2E Routine Squat', 'weight_reps');
    plankId = await make('E2E Routine Plank', 'duration');
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { authSubject: { startsWith: run } },
    });
    await prisma.exercise.deleteMany({
      where: { id: { in: [benchId, squatId, plankId] } },
    });
    await app.close();
  });

  it('không có token: 401', async () => {
    await http().get('/v1/routines').expect(401);
  });

  it('tạo routine với các ngày tập rỗng theo thứ tự, đọc lại được', async () => {
    const sub = newUser();
    const routine = await create(sub, { name: '  PPL ', days: 3 });
    expect(routine).toMatchObject({
      name: 'PPL',
      source: 'manual',
      programId: null,
      isActive: true,
      days: [
        { name: 'Day 1', position: 0, exercises: [] },
        { name: 'Day 2', position: 1, exercises: [] },
        { name: 'Day 3', position: 2, exercises: [] },
      ],
    });
    expect(await list(sub)).toEqual([routine]);
  });

  describe('routine đang dùng: mỗi user tối đa một', () => {
    it('tạo routine đang dùng mới thì routine cũ thôi dùng', async () => {
      const sub = newUser();
      const first = await create(sub, { name: 'A' });
      const second = await create(sub, { name: 'B' });
      expect((await list(sub)).map((r) => [r.id, r.isActive])).toEqual([
        [first.id, false],
        [second.id, true],
      ]);
    });

    it('đặt một routine làm đang dùng; được phép không có routine nào đang dùng', async () => {
      const sub = newUser();
      const first = await create(sub, { name: 'A', isActive: false });
      const second = await create(sub, { name: 'B', isActive: false });
      expect((await list(sub)).every((r) => !r.isActive)).toBe(true);

      await as(sub)
        .patch(`/routines/${first.id}`, { isActive: true })
        .expect(200);
      const res = await as(sub)
        .patch(`/routines/${second.id}`, { isActive: true, name: 'B2' })
        .expect(200);
      expect(RoutineSchema.parse(res.body)).toMatchObject({
        name: 'B2',
        isActive: true,
      });
      expect((await list(sub)).filter((r) => r.isActive)).toHaveLength(1);
    });

    it('routine đang dùng của user khác không bị đụng tới', async () => {
      const a = newUser();
      const b = newUser();
      const ofA = await create(a);
      await create(b);
      expect((await list(a))[0]).toMatchObject({ id: ofA.id, isActive: true });
    });
  });

  describe('ngày tập và bài trong ngày', () => {
    it('thêm bài với target, sửa từng trường, đổi bài, xoá bài', async () => {
      const sub = newUser();
      const routine = await create(sub);
      const dayId = routine.days[0].id;

      let r = await addExercise(sub, dayId, { initialWeightKg: 60.5 });
      r = await addExercise(sub, dayId, {
        exerciseId: plankId,
        repMin: null,
        repMax: null,
        targetDurationMinS: 30,
        targetDurationMaxS: 60,
      });
      const [bench, plank] = r.days[0].exercises;
      expect(bench).toMatchObject({
        exerciseId: benchId,
        position: 0,
        targetSets: 3,
        repMin: 8,
        repMax: 12,
        initialWeightKg: 60.5,
        warmupEnabled: false,
        restSeconds: 90,
        supersetGroup: null,
      });
      expect(plank).toMatchObject({ position: 1, targetDurationMaxS: 60 });

      r = RoutineSchema.parse(
        (
          await as(sub)
            .patch(`/routine-exercises/${bench.id}`, {
              targetSets: 4,
              repMax: 10,
              exerciseId: squatId,
            })
            .expect(200)
        ).body,
      );
      expect(r.days[0].exercises[0]).toMatchObject({
        id: bench.id,
        exerciseId: squatId,
        targetSets: 4,
        repMin: 8,
        repMax: 10,
        initialWeightKg: 60.5,
      });

      r = RoutineSchema.parse(
        (await as(sub).delete(`/routine-exercises/${bench.id}`).expect(200))
          .body,
      );
      expect(r.days[0].exercises).toEqual([{ ...plank, position: 0 }]);
    });

    it('sửa một đầu của rep range làm khoảng bị ngược: 400', async () => {
      const sub = newUser();
      const routine = await create(sub);
      const r = await addExercise(sub, routine.days[0].id);
      const res = await as(sub)
        .patch(`/routine-exercises/${r.days[0].exercises[0].id}`, {
          repMin: 15,
        })
        .expect(400);
      expect(res.body).toMatchObject({ code: 'bad_request' });
    });

    it('thêm bài ở vị trí cho trước, giữ id client gửi (hoàn tác xoá)', async () => {
      const sub = newUser();
      const routine = await create(sub);
      const dayId = routine.days[0].id;
      await addExercise(sub, dayId);
      await addExercise(sub, dayId, { exerciseId: squatId });
      const id = randomUUID();
      const r = await addExercise(sub, dayId, {
        id,
        exerciseId: plankId,
        position: 1,
      });
      expect(
        r.days[0].exercises.map((e) => [e.exerciseId, e.position]),
      ).toEqual([
        [benchId, 0],
        [plankId, 1],
        [squatId, 2],
      ]);
      expect(r.days[0].exercises[1].id).toBe(id);
      // Gửi lại cùng id: 409, không tạo bản trùng.
      await as(sub)
        .post(`/routine-days/${dayId}/exercises`, target({ id }))
        .expect(409);
    });

    it('sắp lại thứ tự bài; danh sách phải gồm đúng mọi bài trong ngày', async () => {
      const sub = newUser();
      const routine = await create(sub);
      const dayId = routine.days[0].id;
      await addExercise(sub, dayId);
      const r = await addExercise(sub, dayId, { exerciseId: squatId });
      const [a, b] = r.days[0].exercises.map((e) => e.id);

      const res = await as(sub)
        .put(`/routine-days/${dayId}/exercise-order`, { ids: [b, a] })
        .expect(200);
      expect(
        RoutineSchema.parse(res.body).days[0].exercises.map((e) => e.id),
      ).toEqual([b, a]);
      await as(sub)
        .put(`/routine-days/${dayId}/exercise-order`, { ids: [b] })
        .expect(400);
    });

    it('thêm ngày tập kèm bài, đổi tên, sắp lại, xoá; không xoá được ngày cuối cùng', async () => {
      const sub = newUser();
      const routine = await create(sub, { days: 1 });
      const [day1] = routine.days;

      let r = RoutineSchema.parse(
        (
          await as(sub)
            .post(`/routines/${routine.id}/days`, {
              name: 'Leg day',
              exercises: [target({ exerciseId: squatId })],
            })
            .expect(201)
        ).body,
      );
      const legs = r.days[1];
      expect(legs).toMatchObject({
        name: 'Leg day',
        position: 1,
        exercises: [{ exerciseId: squatId, position: 0 }],
      });

      await as(sub)
        .patch(`/routine-days/${day1.id}`, { name: 'Push A' })
        .expect(200);
      r = RoutineSchema.parse(
        (
          await as(sub)
            .put(`/routines/${routine.id}/day-order`, {
              ids: [legs.id, day1.id],
            })
            .expect(200)
        ).body,
      );
      expect(r.days.map((d) => [d.name, d.position])).toEqual([
        ['Leg day', 0],
        ['Push A', 1],
      ]);

      r = RoutineSchema.parse(
        (await as(sub).delete(`/routine-days/${legs.id}`).expect(200)).body,
      );
      expect(r.days.map((d) => [d.name, d.position])).toEqual([['Push A', 0]]);
      const res = await as(sub).delete(`/routine-days/${day1.id}`).expect(409);
      expect(res.body).toMatchObject({ code: 'conflict' });
    });
  });

  describe('quyền sở hữu', () => {
    it('routine, ngày tập và bài của user khác: 404 với mọi thao tác', async () => {
      const owner = newUser();
      const other = newUser();
      const routine = await create(owner);
      const dayId = routine.days[0].id;
      const exId = (await addExercise(owner, dayId)).days[0].exercises[0].id;
      await create(other);

      const o = as(other);
      await o.patch(`/routines/${routine.id}`, { name: 'x' }).expect(404);
      await o.patch(`/routines/${routine.id}`, { isActive: true }).expect(404);
      await o.delete(`/routines/${routine.id}`).expect(404);
      await o
        .post(`/routines/${routine.id}/days`, { name: 'x', exercises: [] })
        .expect(404);
      await o
        .put(`/routines/${routine.id}/day-order`, { ids: [dayId] })
        .expect(404);
      await o.patch(`/routine-days/${dayId}`, { name: 'x' }).expect(404);
      await o.delete(`/routine-days/${dayId}`).expect(404);
      await o.post(`/routine-days/${dayId}/exercises`, target()).expect(404);
      await o
        .put(`/routine-days/${dayId}/exercise-order`, { ids: [exId] })
        .expect(404);
      await o
        .patch(`/routine-exercises/${exId}`, { targetSets: 5 })
        .expect(404);
      await o.delete(`/routine-exercises/${exId}`).expect(404);

      expect(await list(other)).not.toContainEqual(
        expect.objectContaining({ id: routine.id }),
      );
      // Routine của chủ vẫn nguyên vẹn.
      const [mine] = await list(owner);
      expect(mine).toMatchObject({ id: routine.id, isActive: true });
      expect(mine.days[0]).toMatchObject({
        id: dayId,
        exercises: [{ id: exId, targetSets: 3 }],
      });
    });

    it('không thêm được bài tuỳ chỉnh của user khác vào ngày tập', async () => {
      const owner = newUser();
      const other = newUser();
      await create(owner);
      const ownerRow = await prisma.user.findUniqueOrThrow({
        where: { authSubject: owner },
      });
      const secret = await prisma.exercise.create({
        data: { nameEn: 'Secret move', source: 'user', ownerId: ownerRow.id },
      });
      const routine = await create(other);
      await as(other)
        .post(
          `/routine-days/${routine.days[0].id}/exercises`,
          target({ exerciseId: secret.id }),
        )
        .expect(404);
      await as(other)
        .post(`/routines/${routine.id}/days`, {
          name: 'x',
          exercises: [target({ exerciseId: secret.id })],
        })
        .expect(404);
    });

    it('id không phải UUID: 400', async () => {
      const sub = newUser();
      await as(sub).patch('/routines/abc', { name: 'x' }).expect(400);
    });
  });

  describe('xoá routine', () => {
    it('routine biến khỏi danh sách và thôi dùng; buổi tập đã ghi theo ngày đó vẫn còn', async () => {
      const sub = newUser();
      const routine = await create(sub);
      const sessionId = randomUUID();
      await as(sub)
        .post('/sync/push', {
          events: [
            {
              entity: 'workout_sessions',
              op: 'upsert',
              payload: {
                id: sessionId,
                routineDayId: routine.days[0].id,
                startedAt: '2026-11-22T10:00:00.000Z',
                endedAt: '2026-11-22T11:00:00.000Z',
                notes: null,
                deletedAt: null,
              },
            },
          ],
        })
        .expect(200);

      await as(sub).delete(`/routines/${routine.id}`).expect(204);
      expect(await list(sub)).toEqual([]);
      await as(sub).patch(`/routines/${routine.id}`, { name: 'x' }).expect(404);
      // Tạo routine đang dùng mới không vướng routine đã xoá.
      await create(sub);

      const pulled = SyncPullResponseSchema.parse(
        (await as(sub).get('/sync/pull').expect(200)).body,
      );
      const pulledSession = pulled.changes.find(
        (c) => c.entity === 'workout_sessions' && c.payload.id === sessionId,
      );
      expect(pulledSession?.payload).toMatchObject({
        routineDayId: routine.days[0].id,
        deletedAt: null,
      });
    });
  });

  it('xoá user thì routine (kể cả dùng bài tuỳ chỉnh của user) xoá theo', async () => {
    const sub = newUser();
    const routine = await create(sub);
    const user = await prisma.user.findUniqueOrThrow({
      where: { authSubject: sub },
    });
    const own = await prisma.exercise.create({
      data: { nameEn: 'My sled', source: 'user', ownerId: user.id },
    });
    await addExercise(sub, routine.days[0].id, { exerciseId: own.id });

    await prisma.user.delete({ where: { id: user.id } });
    expect(await prisma.routine.count({ where: { id: routine.id } })).toBe(0);
    expect(
      await prisma.routineDay.count({ where: { routineId: routine.id } }),
    ).toBe(0);
  });
});
