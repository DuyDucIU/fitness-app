import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  type ExerciseSetting,
  type SessionExercise,
  type SetLog,
  type Suggestion,
  type SyncEvent,
  type SyncPullResponse,
  SyncPullResponseSchema,
  SyncPushResponseSchema,
  syncKeyOf,
  type WorkoutSession,
} from '@fitness/contract';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import type { AuthContext } from '../src/auth/auth.types';
import { JOSE, JwtVerifierService } from '../src/auth/jwt-verifier.service';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * POST /v1/sync/push và GET /v1/sync/pull qua HTTP với PostgreSQL thật. Token giả: chuỗi
 * token chính là `sub`. Test push kiểm dữ liệu đã lưu bằng Prisma.
 */
describe('/v1/sync (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const run = `e2e-sync-${Date.now()}`;
  const subA = `${run}-a`;
  const subB = `${run}-b`;
  let benchId: string;
  /** Bài tuỳ chỉnh của A. */
  let sledId: string;

  const push = (sub: string, events: SyncEvent[]) =>
    request(app.getHttpServer() as App)
      .post('/v1/sync/push')
      .set('Authorization', `Bearer ${sub}`)
      .send({ events });

  const session = (over: Partial<WorkoutSession> = {}): WorkoutSession => ({
    id: randomUUID(),
    routineDayId: null,
    startedAt: '2026-11-22T10:00:00.000Z',
    endedAt: null,
    notes: null,
    deletedAt: null,
    ...over,
  });
  const exercise = (
    sessionId: string,
    over: Partial<SessionExercise> = {},
  ): SessionExercise => ({
    id: randomUUID(),
    sessionId,
    exerciseId: benchId,
    routineExerciseId: null,
    loadInput: 'total',
    position: 0,
    supersetGroup: null,
    deletedAt: null,
    ...over,
  });
  const set = (
    sessionExerciseId: string,
    over: Partial<SetLog> = {},
  ): SetLog => ({
    id: randomUUID(),
    sessionExerciseId,
    setIndex: 0,
    setType: 'working',
    weightValue: 80,
    inputUnit: 'kg',
    reps: 8,
    durationS: null,
    distanceM: null,
    rpe: null,
    completedAt: '2026-11-22T10:05:00.000Z',
    deletedAt: null,
    ...over,
  });
  const events = {
    session: (payload: WorkoutSession): SyncEvent => ({
      entity: 'workout_sessions',
      op: 'upsert',
      payload,
    }),
    exercise: (payload: SessionExercise): SyncEvent => ({
      entity: 'session_exercises',
      op: 'upsert',
      payload,
    }),
    set: (payload: SetLog): SyncEvent => ({
      entity: 'set_logs',
      op: 'upsert',
      payload,
    }),
    suggestion: (payload: Suggestion): SyncEvent => ({
      entity: 'suggestions',
      op: 'upsert',
      payload,
    }),
  };
  const suggestion = (over: Partial<Suggestion> = {}): Suggestion => ({
    id: randomUUID(),
    exerciseId: benchId,
    routineExerciseId: null,
    sessionExerciseId: null,
    basedOnSessionExerciseId: randomUUID(),
    kind: 'increase',
    strength: 'soft',
    reason: 'all_sets_top',
    payload: { sets: 3, min: 6, top: 10 },
    status: 'pending',
    createdAt: '2026-11-24T08:00:00.000Z',
    respondedAt: null,
    deletedAt: null,
    ...over,
  });

  const pull = (sub: string, query: { since?: string; limit?: number } = {}) =>
    request(app.getHttpServer() as App)
      .get('/v1/sync/pull')
      .query(query)
      .set('Authorization', `Bearer ${sub}`);

  /**
   * Kéo hết các trang từ `since` với trang `limit` thay đổi. Giới hạn số trang để lỗi
   * cursor (vd trả lại mãi cùng một bản ghi) làm test hỏng thay vì treo.
   */
  async function pullAll(sub: string, since?: string, limit = 2) {
    const pages: SyncPullResponse[] = [];
    let cursor = since;
    for (let i = 0; i < 50; i++) {
      const res = await pull(sub, { since: cursor, limit }).expect(200);
      const page = SyncPullResponseSchema.parse(res.body);
      pages.push(page);
      cursor = page.cursor ?? undefined;
      if (!page.hasMore) {
        return { changes: pages.flatMap((p) => p.changes), cursor, pages };
      }
    }
    throw new Error('pull không dừng sau 50 trang');
  }

  /** Buổi của `sub` gồm một bài và một set; trả về bản ghi và các sự kiện theo thứ tự ghi. */
  function workout(over: { exerciseId?: string } = {}) {
    const s = session();
    const e = exercise(s.id, over);
    const st = set(e.id);
    return {
      session: s,
      exercise: e,
      set: st,
      events: [events.session(s), events.exercise(e), events.set(st)],
    };
  }

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

    benchId = (
      await prisma.exercise.create({
        data: { nameEn: 'E2E Sync Bench', source: 'curated', sourceRef: run },
      })
    ).id;
    // A đã gọi /me (có bản ghi) và có bài tuỳ chỉnh; B chưa từng gọi /me.
    const userA = await prisma.user.create({
      data: {
        authSubject: subA,
        email: `${subA}@example.com`,
        authProvider: 'email',
      },
    });
    sledId = (
      await prisma.exercise.create({
        data: { nameEn: 'Sled push', source: 'user', ownerId: userA.id },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { authSubject: { startsWith: run } },
    });
    await prisma.exercise.deleteMany({ where: { id: benchId } });
    await app.close();
  });

  it('không có token: 401', async () => {
    await request(app.getHttpServer() as App)
      .post('/v1/sync/push')
      .send({ events: [] })
      .expect(401);
  });

  it('lưu buổi, bài và set cho chính user; gửi lại cùng batch không tạo bản ghi trùng', async () => {
    const w = workout();
    const first = await push(subA, w.events).expect(200);
    expect(SyncPushResponseSchema.parse(first.body)).toEqual({ applied: 3 });
    await push(subA, w.events).expect(200);

    const sessions = await prisma.workoutSession.findMany({
      where: { id: w.session.id },
      include: { user: true, exercises: { include: { sets: true } } },
    });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].user.authSubject).toBe(subA);
    expect(sessions[0].exercises).toHaveLength(1);
    expect(sessions[0].exercises[0]).toMatchObject({
      exerciseId: benchId,
      loadInput: 'total',
    });
    expect(sessions[0].exercises[0].sets).toHaveLength(1);
    expect(sessions[0].exercises[0].sets[0]).toMatchObject({
      reps: 8,
      inputUnit: 'kg',
      setType: 'working',
    });
    expect(Number(sessions[0].exercises[0].sets[0].weightValue)).toBe(80);
  });

  it('sửa set và xoá set (tombstone) đẩy lên bằng upsert; server đặt lại updated_at', async () => {
    const w = workout();
    await push(subA, w.events).expect(200);
    const before = await prisma.setLog.findUniqueOrThrow({
      where: { id: w.set.id },
    });

    await push(subA, [
      events.set({ ...w.set, weightValue: 82.5, reps: 6 }),
      events.set({
        ...w.set,
        weightValue: 82.5,
        reps: 6,
        deletedAt: '2026-11-22T10:07:00.000Z',
      }),
      events.session({ ...w.session, endedAt: '2026-11-22T11:00:00.000Z' }),
    ]).expect(200);

    const after = await prisma.setLog.findUniqueOrThrow({
      where: { id: w.set.id },
    });
    expect(Number(after.weightValue)).toBe(82.5);
    expect(after.reps).toBe(6);
    expect(after.deletedAt?.toISOString()).toBe('2026-11-22T10:07:00.000Z');
    expect(after.updatedAt.getTime()).toBeGreaterThan(
      before.updatedAt.getTime(),
    );
    const ended = await prisma.workoutSession.findUniqueOrThrow({
      where: { id: w.session.id },
    });
    expect(ended.endedAt?.toISOString()).toBe('2026-11-22T11:00:00.000Z');
  });

  it('user chưa gọi /me: lần đẩy đầu tạo bản ghi user', async () => {
    const w = workout();
    await push(subB, w.events).expect(200);
    const stored = await prisma.workoutSession.findUniqueOrThrow({
      where: { id: w.session.id },
      include: { user: true },
    });
    expect(stored.user.authSubject).toBe(subB);
  });

  describe('dữ liệu của user khác bị từ chối', () => {
    let a: ReturnType<typeof workout>;

    beforeAll(async () => {
      a = workout();
      await push(subA, a.events).expect(200);
    });

    /** Bản ghi của A vẫn nguyên như A đã đẩy. */
    async function expectAUnchanged() {
      const stored = await prisma.workoutSession.findUniqueOrThrow({
        where: { id: a.session.id },
        include: {
          user: true,
          exercises: { include: { sets: true } },
        },
      });
      expect(stored.user.authSubject).toBe(subA);
      expect(stored.notes).toBeNull();
      expect(stored.exercises.map((e) => e.id)).toEqual([a.exercise.id]);
      expect(stored.exercises[0].sets.map((s) => [s.id, s.reps])).toEqual([
        [a.set.id, 8],
      ]);
    }

    it('ghi đè buổi của A bằng id của A: 403', async () => {
      const res = await push(subB, [
        events.session({ ...a.session, notes: 'của B' }),
      ]).expect(403);
      expect(res.body).toMatchObject({ code: 'forbidden' });
      await expectAUnchanged();
    });

    it('thêm bài hay set vào buổi của A: 403', async () => {
      await push(subB, [events.exercise(exercise(a.session.id))]).expect(403);
      await push(subB, [events.set(set(a.exercise.id))]).expect(403);
      await expectAUnchanged();
    });

    it('dùng lại id bài/set của A dưới buổi của B: 403', async () => {
      const b = workout();
      await push(subB, b.events).expect(200);
      await push(subB, [
        events.exercise({ ...a.exercise, sessionId: b.session.id }),
      ]).expect(403);
      await push(subB, [
        events.set({ ...a.set, sessionExerciseId: b.exercise.id, reps: 1 }),
      ]).expect(403);
      await expectAUnchanged();
    });

    it('dùng bài tuỳ chỉnh của A: 403', async () => {
      await push(subB, workout({ exerciseId: sledId }).events).expect(403);
    });

    it('một sự kiện bị từ chối thì cả batch không được lưu', async () => {
      const b = workout();
      await push(subB, [
        ...b.events,
        events.session({ ...a.session, notes: 'của B' }),
      ]).expect(403);
      expect(
        await prisma.workoutSession.findUnique({ where: { id: b.session.id } }),
      ).toBeNull();
      await expectAUnchanged();
    });
  });

  it('xoá user thì buổi tập của user xoá theo, kể cả buổi dùng bài tuỳ chỉnh của user', async () => {
    const sub = `${run}-gone`;
    const w = workout();
    await push(sub, w.events).expect(200);
    const user = await prisma.user.findUniqueOrThrow({
      where: { authSubject: sub },
    });
    const custom = await prisma.exercise.create({
      data: { nameEn: 'Gone move', source: 'user', ownerId: user.id },
    });
    const withCustom = workout({ exerciseId: custom.id });
    await push(sub, withCustom.events).expect(200);

    await prisma.user.delete({ where: { id: user.id } });

    expect(
      await prisma.workoutSession.count({
        where: { id: { in: [w.session.id, withCustom.session.id] } },
      }),
    ).toBe(0);
    expect(
      await prisma.setLog.count({
        where: { id: { in: [w.set.id, withCustom.set.id] } },
      }),
    ).toBe(0);
    expect(
      await prisma.exercise.findUnique({ where: { id: custom.id } }),
    ).toBeNull();
  });

  describe('gợi ý', () => {
    it('lưu gợi ý và lần trả lời; gửi lại không tạo bản ghi trùng; kéo về đúng bản mới nhất', async () => {
      const sub = `${run}-sug`;
      const pending = suggestion();
      await push(sub, [events.suggestion(pending)]).expect(200);
      const accepted = {
        ...pending,
        status: 'accepted' as const,
        respondedAt: '2026-11-24T08:01:00.000Z',
      };
      await push(sub, [events.suggestion(accepted)]).expect(200);
      await push(sub, [events.suggestion(accepted)]).expect(200);

      expect(await prisma.suggestion.count({ where: { id: pending.id } })).toBe(
        1,
      );
      const { changes } = await pullAll(sub);
      expect(changes).toEqual([events.suggestion(accepted)]);
    });

    it('ghi đè gợi ý của A: 403, gợi ý của A giữ nguyên', async () => {
      const mine = suggestion();
      await push(subA, [events.suggestion(mine)]).expect(200);
      await push(subB, [
        events.suggestion({ ...mine, status: 'dismissed' }),
      ]).expect(403);
      const stored = await prisma.suggestion.findUniqueOrThrow({
        where: { id: mine.id },
        include: { user: true },
      });
      expect(stored.user.authSubject).toBe(subA);
      expect(stored.status).toBe('pending');
    });

    it('gợi ý cho bài tuỳ chỉnh của A: 403', async () => {
      await push(subB, [
        events.suggestion(suggestion({ exerciseId: sledId })),
      ]).expect(403);
    });

    it('xoá user thì gợi ý của user xoá theo', async () => {
      const sub = `${run}-sug-gone`;
      const mine = suggestion();
      await push(sub, [events.suggestion(mine)]).expect(200);
      await prisma.user.delete({ where: { authSubject: sub } });
      expect(await prisma.suggestion.count({ where: { id: mine.id } })).toBe(0);
    });
  });

  describe('cài đặt bài tập', () => {
    const setting = (over: Partial<ExerciseSetting> = {}): ExerciseSetting => ({
      exerciseId: benchId,
      weightStepKg: 2.5,
      loadInput: 'total',
      barWeightKg: 15,
      restAutoStart: false,
      ...over,
    });
    const settingEvent = (payload: ExerciseSetting): SyncEvent => ({
      entity: 'user_exercise_settings',
      op: 'upsert',
      payload,
    });

    it('lưu cả dòng theo user × bài; lần ghi sau thắng; gửi lại không tạo dòng trùng; kéo về đúng bản mới nhất', async () => {
      const sub = `${run}-set`;
      await push(sub, [settingEvent(setting())]).expect(200);
      const later = setting({ weightStepKg: 1.25, barWeightKg: null });
      await push(sub, [settingEvent(later)]).expect(200);
      await push(sub, [settingEvent(later)]).expect(200);

      const user = await prisma.user.findUniqueOrThrow({
        where: { authSubject: sub },
      });
      const rows = await prisma.userExerciseSetting.findMany({
        where: { userId: user.id },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]?.weightStepKg.toNumber()).toBe(1.25);
      expect(rows[0]?.barWeightKg).toBeNull();

      const { changes } = await pullAll(sub);
      expect(changes).toEqual([settingEvent(later)]);
    });

    it('cùng một bài, mỗi user một dòng riêng: cài đặt của B không đè của A', async () => {
      await push(subA, [settingEvent(setting({ weightStepKg: 5 }))]).expect(
        200,
      );
      await push(subB, [settingEvent(setting({ weightStepKg: 1 }))]).expect(
        200,
      );
      const a = await prisma.userExerciseSetting.findFirstOrThrow({
        where: { exerciseId: benchId, user: { authSubject: subA } },
      });
      expect(a.weightStepKg.toNumber()).toBe(5);
    });

    it('cài đặt cho bài tuỳ chỉnh của A từ B: 403', async () => {
      await push(subB, [settingEvent(setting({ exerciseId: sledId }))]).expect(
        403,
      );
    });

    it('xoá user thì cài đặt của user xoá theo', async () => {
      const sub = `${run}-set-gone`;
      await push(sub, [settingEvent(setting())]).expect(200);
      const user = await prisma.user.findUniqueOrThrow({
        where: { authSubject: sub },
      });
      await prisma.user.delete({ where: { id: user.id } });
      expect(
        await prisma.userExerciseSetting.count({ where: { userId: user.id } }),
      ).toBe(0);
    });
  });

  describe('GET /v1/sync/pull', () => {
    it('không có token: 401', async () => {
      await request(app.getHttpServer() as App)
        .get('/v1/sync/pull')
        .expect(401);
    });

    it('user chưa có dữ liệu: không có thay đổi, cursor null', async () => {
      const res = await pull(`${run}-empty`).expect(200);
      expect(SyncPullResponseSchema.parse(res.body)).toEqual({
        changes: [],
        cursor: null,
        hasMore: false,
      });
    });

    it('cursor không hợp lệ: 400', async () => {
      await pull(subA, { since: 'không-phải-cursor' }).expect(400);
    });

    describe('phân trang theo cursor', () => {
      const sub = `${run}-pull`;
      let w: ReturnType<typeof workout>;
      let second: SessionExercise;
      let secondSet: SetLog;

      beforeAll(async () => {
        // Một batch = một transaction: mọi bản ghi cùng `updated_at`, trang 2 bản ghi cắt
        // ngang giữa các bản ghi trùng thời điểm.
        w = workout();
        second = exercise(w.session.id, { position: 1 });
        secondSet = set(second.id, { weightValue: 22.5, reps: 12 });
        await push(sub, [
          ...w.events,
          events.exercise(second),
          events.set(secondSet),
        ]).expect(200);
        // Batch sau: kết thúc buổi và xoá một set (tombstone).
        await push(sub, [
          events.set({ ...secondSet, deletedAt: '2026-11-22T10:30:00.000Z' }),
          events.session({ ...w.session, endedAt: '2026-11-22T11:00:00.000Z' }),
        ]).expect(200);
      });

      it('kéo từ đầu: đủ mọi bản ghi, mỗi bản ghi một lần, bản mới nhất, kể cả tombstone; không có dữ liệu user khác', async () => {
        const { changes, pages } = await pullAll(sub);

        expect(pages.length).toBeGreaterThan(2);
        expect(pages.every((p) => p.changes.length <= 2)).toBe(true);
        const byId = new Map(changes.map((c) => [syncKeyOf(c), c]));
        expect(changes).toHaveLength(byId.size);
        expect([...byId.keys()].sort()).toEqual(
          [
            w.session.id,
            w.exercise.id,
            w.set.id,
            second.id,
            secondSet.id,
          ].sort(),
        );
        expect(byId.get(w.session.id)).toEqual(
          events.session({ ...w.session, endedAt: '2026-11-22T11:00:00.000Z' }),
        );
        expect(byId.get(second.id)).toEqual(events.exercise(second));
        expect(byId.get(w.set.id)).toEqual(events.set(w.set));
        expect(byId.get(secondSet.id)).toEqual(
          events.set({ ...secondSet, deletedAt: '2026-11-22T10:30:00.000Z' }),
        );
      });

      it('sửa và xoá buổi cũ (UC11): sửa sau thắng; tombstone buổi, bài, set đi qua pull; Undo cũng đi qua pull', async () => {
        const sub = `${run}-uc11`;
        const old = workout();
        const ended = {
          ...old.session,
          endedAt: '2026-11-22T11:00:00.000Z',
        };
        await push(sub, [...old.events, events.session(ended)]).expect(200);
        const { cursor } = await pullAll(sub);

        // Sửa set hai lần (vd hai lần lưu offline đẩy cùng lúc): lần sau thắng.
        await push(sub, [
          events.set({ ...old.set, reps: 9 }),
          events.set({ ...old.set, weightValue: 82.5, reps: 7 }),
        ]).expect(200);
        const edited = await pullAll(sub, cursor);
        expect(edited.changes).toEqual([
          events.set({ ...old.set, weightValue: 82.5, reps: 7 }),
        ]);

        const at = '2026-11-25T08:00:00.000Z';
        const removed = [
          events.set({
            ...old.set,
            weightValue: 82.5,
            reps: 7,
            deletedAt: at,
          }),
          events.exercise({ ...old.exercise, deletedAt: at }),
          events.session({ ...ended, deletedAt: at }),
        ];
        await push(sub, removed).expect(200);
        const deleted = await pullAll(sub, edited.cursor);
        expect(deleted.changes).toHaveLength(3);
        expect(deleted.changes).toEqual(expect.arrayContaining(removed));

        const restored = [
          events.session(ended),
          events.exercise(old.exercise),
          events.set({ ...old.set, weightValue: 82.5, reps: 7 }),
        ];
        await push(sub, restored).expect(200);
        const undone = await pullAll(sub, deleted.cursor);
        expect(undone.changes).toHaveLength(3);
        expect(undone.changes).toEqual(expect.arrayContaining(restored));
      });

      it('since: chỉ trả thay đổi sau cursor; không có gì mới thì giữ nguyên cursor', async () => {
        const { cursor } = await pullAll(sub);
        expect(cursor).toEqual(expect.any(String));

        const idle = SyncPullResponseSchema.parse(
          (await pull(sub, { since: cursor }).expect(200)).body,
        );
        expect(idle).toEqual({ changes: [], cursor, hasMore: false });

        const renamed = { ...w.session, notes: 'Chân yếu' };
        await push(sub, [events.session(renamed)]).expect(200);
        const next = await pullAll(sub, cursor);
        expect(next.changes).toEqual([events.session(renamed)]);
        expect(next.cursor).not.toBe(cursor);
      });
    });
  });
});
