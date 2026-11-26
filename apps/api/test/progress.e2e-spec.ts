import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  MUSCLE_GROUPS,
  type ProgressResponse,
  ProgressResponseSchema,
  type SetLog,
  type SyncEvent,
} from '@fitness/contract';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import type { AuthContext } from '../src/auth/auth.types';
import { JOSE, JwtVerifierService } from '../src/auth/jwt-verifier.service';
import { PrismaService } from '../src/prisma/prisma.service';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Asia/Ho_Chi_Minh (múi giờ mặc định của user) là UTC+7, không đổi giờ mùa hè. */
const HCM_OFFSET = 7 * HOUR;

/** Ngày lịch theo giờ Việt Nam của một mốc thời gian. */
const hcmDate = (ms: number) =>
  new Date(ms + HCM_OFFSET).toISOString().slice(0, 10);

/** 00:00 thứ Hai đầu tuần này theo giờ Việt Nam, dạng mốc UTC. */
function hcmMondayMs(now: number): number {
  const local = new Date(now + HCM_OFFSET);
  const weekday = (local.getUTCDay() + 6) % 7;
  const midnight = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
  );
  return midnight - weekday * DAY - HCM_OFFSET;
}

/**
 * Biểu đồ tiến độ (UC19) qua HTTP với PostgreSQL thật. Dữ liệu ghi qua POST /v1/sync/push
 * như app thật; thời điểm tính lùi từ lúc chạy test. Token giả: chuỗi token chính là `sub`.
 */
describe('/v1/progress (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const run = `e2e-progress-${Date.now()}`;
  let n = 0;
  const newUser = () => `${run}-${n++}`;
  let benchId: string;
  let squatId: string;
  let plankId: string;
  const muscleIds: number[] = [];

  const http = () => request(app.getHttpServer() as App);
  const progress = async (sub: string): Promise<ProgressResponse> =>
    ProgressResponseSchema.parse(
      (
        await http()
          .get('/v1/progress')
          .set('Authorization', `Bearer ${sub}`)
          .expect(200)
      ).body,
    );
  const push = (sub: string, events: SyncEvent[]) =>
    http()
      .post('/v1/sync/push')
      .set('Authorization', `Bearer ${sub}`)
      .send({ events })
      .expect(200);

  type SetSpec = [number | null, number | null, Partial<SetLog>?];
  interface ExerciseSpec {
    exerciseId: string;
    loadInput?: 'total' | 'per_dumbbell';
    sets: SetSpec[];
    deleted?: boolean;
  }

  /** Một buổi kết thúc lúc `endedMs` (bắt đầu trước đó một giờ), kèm bài và set. */
  function workout(
    endedMs: number | null,
    exercises: ExerciseSpec[],
    over: { deleted?: boolean; startedMs?: number } = {},
  ): { id: string; events: SyncEvent[] } {
    const id = randomUUID();
    const startedMs = over.startedMs ?? (endedMs ?? Date.now()) - HOUR;
    const events: SyncEvent[] = [
      {
        entity: 'workout_sessions',
        op: 'upsert',
        payload: {
          id,
          routineDayId: null,
          startedAt: new Date(startedMs).toISOString(),
          endedAt: endedMs === null ? null : new Date(endedMs).toISOString(),
          notes: null,
          deletedAt: over.deleted ? new Date(startedMs).toISOString() : null,
        },
      },
    ];
    exercises.forEach((ex, position) => {
      const rowId = randomUUID();
      events.push({
        entity: 'session_exercises',
        op: 'upsert',
        payload: {
          id: rowId,
          sessionId: id,
          exerciseId: ex.exerciseId,
          routineExerciseId: null,
          loadInput: ex.loadInput ?? 'total',
          position,
          supersetGroup: null,
          deletedAt: ex.deleted ? new Date(startedMs).toISOString() : null,
        },
      });
      ex.sets.forEach(([weightValue, reps, extra], setIndex) =>
        events.push({
          entity: 'set_logs',
          op: 'upsert',
          payload: {
            id: randomUUID(),
            sessionExerciseId: rowId,
            setIndex,
            setType: 'working',
            weightValue,
            inputUnit: weightValue === null ? null : 'kg',
            reps,
            durationS: reps === null ? 45 : null,
            distanceM: null,
            rpe: null,
            completedAt: new Date(startedMs + setIndex * 60_000).toISOString(),
            deletedAt: null,
            ...extra,
          },
        }),
      );
    });
    return { id, events };
  }

  const zeroSets = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0]));

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

    // Cơ riêng của test (không phụ thuộc seed), mỗi cơ một nhóm lớn.
    const muscle = async (name: string, muscleGroup: string) => {
      const m = await prisma.muscle.create({
        data: {
          code: `${run}-${name}`,
          nameEn: name,
          nameVi: name,
          muscleGroup,
        },
      });
      muscleIds.push(m.id);
      return m.id;
    };
    const chest = await muscle('chest', 'chest');
    const triceps = await muscle('triceps', 'arms');
    const delts = await muscle('shoulders', 'shoulders');
    const quads = await muscle('quads', 'legs');
    const glutes = await muscle('glutes', 'legs');
    const lowerBack = await muscle('lower back', 'back');
    const abs = await muscle('abs', 'core');

    const make = async (
      nameEn: string,
      metricType: 'weight_reps' | 'duration',
      muscles: [number, 'primary' | 'secondary'][],
    ) =>
      (
        await prisma.exercise.create({
          data: {
            nameEn,
            metricType,
            source: 'curated',
            sourceRef: `${run}-${nameEn}`,
            muscles: {
              create: muscles.map(([muscleId, role]) => ({ muscleId, role })),
            },
          },
        })
      ).id;
    benchId = await make('E2E Progress Bench', 'weight_reps', [
      [chest, 'primary'],
      [triceps, 'secondary'],
      [delts, 'secondary'],
    ]);
    squatId = await make('E2E Progress Squat', 'weight_reps', [
      [quads, 'primary'],
      [glutes, 'secondary'],
      [lowerBack, 'secondary'],
    ]);
    plankId = await make('E2E Progress Plank', 'duration', [[abs, 'primary']]);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { authSubject: { startsWith: run } },
    });
    await prisma.exercise.deleteMany({
      where: { id: { in: [benchId, squatId, plankId] } },
    });
    await prisma.muscle.deleteMany({ where: { id: { in: muscleIds } } });
    await app.close();
  });

  it('không có token: 401', async () => {
    await http().get('/v1/progress').expect(401);
  });

  it('user chưa có dữ liệu: 16 tuần và 12 tháng rỗng, không có đường e1RM', async () => {
    const now = Date.now();
    const res = await progress(newUser());
    expect(res.today).toBe(hcmDate(now));
    expect(res.weeks).toHaveLength(16);
    expect(res.weeks.at(-1)).toEqual({
      start: hcmDate(hcmMondayMs(now)),
      workouts: 0,
      sets: zeroSets,
    });
    expect(res.months).toHaveLength(12);
    expect(res.months.at(-1)).toEqual({
      start: `${hcmDate(now).slice(0, 7)}-01`,
      workouts: 0,
    });
    expect(res.e1rm).toEqual([]);
  });

  it('đếm buổi và working set theo nhóm cơ (cơ phụ nửa set); chỉ buổi đã kết thúc, chưa xoá', async () => {
    const sub = newUser();
    const now = Date.now();
    const done = workout(now - 60_000, [
      {
        exerciseId: benchId,
        sets: [
          [80, 8],
          [80, 8],
          [80, 7],
          // Set khởi động không tính.
          [40, 8, { setType: 'warmup' }],
          // Set đã xoá không tính.
          [80, 8, { deletedAt: new Date(now).toISOString() }],
        ],
      },
      { exerciseId: squatId, sets: [[100, 5]] },
      { exerciseId: plankId, sets: [[null, null]] },
      // Bài đã xoá khỏi buổi không tính.
      { exerciseId: squatId, sets: [[100, 5]], deleted: true },
    ]);
    const open = workout(null, [{ exerciseId: squatId, sets: [[100, 5]] }]);
    const gone = workout(
      now - 60_000,
      [{ exerciseId: squatId, sets: [[100, 5]] }],
      { deleted: true },
    );
    await push(sub, [...done.events, ...open.events, ...gone.events]);

    const res = await progress(sub);
    expect(res.weeks.at(-1)).toMatchObject({
      workouts: 1,
      sets: {
        ...zeroSets,
        chest: 3,
        arms: 1.5,
        shoulders: 1.5,
        legs: 1,
        back: 0.5,
        core: 1,
      },
    });
    expect(res.months.at(-1)?.workouts).toBe(1);
  });

  it('tuần theo múi giờ của user: buổi kết thúc 00:30 thứ Hai giờ Việt Nam thuộc tuần này', async () => {
    const sub = newUser();
    const monday = hcmMondayMs(Date.now());
    const early = workout(monday + 30 * 60_000, [
      { exerciseId: benchId, sets: [[60, 5]] },
    ]);
    const lastWeek = workout(monday - 30 * 60_000, [
      { exerciseId: benchId, sets: [[60, 5]] },
    ]);
    await push(sub, [...early.events, ...lastWeek.events]);

    const { weeks } = await progress(sub);
    expect(weeks.at(-1)?.workouts).toBe(1);
    expect(weeks.at(-2)?.workouts).toBe(1);
  });

  it('e1RM mỗi buổi từ set tốt nhất ≤ 12 reps, quy lb về kg, tách theo cách ghi tạ', async () => {
    const sub = newUser();
    const now = Date.now();
    const older = workout(now - 8 * DAY, [
      {
        exerciseId: benchId,
        sets: [
          [80, 8],
          [85, 5],
          // Quá 12 reps: không làm điểm e1RM.
          [70, 15],
        ],
      },
    ]);
    const newer = workout(now - 60_000, [
      // 220,462 lb ≈ 100 kg.
      { exerciseId: benchId, sets: [[220.462, 3, { inputUnit: 'lb' }]] },
      {
        exerciseId: benchId,
        loadInput: 'per_dumbbell',
        sets: [[30, 10]],
      },
      // Bài bấm giờ không có đường e1RM.
      { exerciseId: plankId, sets: [[null, null]] },
    ]);
    await push(sub, [...older.events, ...newer.events]);

    const { e1rm } = await progress(sub);
    expect(e1rm).toHaveLength(2);
    const total = e1rm.find((s) => s.loadInput === 'total');
    expect(total?.exerciseId).toBe(benchId);
    const round = (v: number) => Math.round(v * 100) / 100;
    expect(
      total?.points.map((p) => ({
        ...p,
        e1rmKg: round(p.e1rmKg),
        weightKg: round(p.weightKg),
      })),
    ).toEqual([
      {
        sessionId: older.id,
        date: hcmDate(now - 8 * DAY),
        e1rmKg: 101.33,
        weightKg: 80,
        reps: 8,
      },
      {
        sessionId: newer.id,
        date: hcmDate(now - 60_000),
        e1rmKg: 110,
        weightKg: 100,
        reps: 3,
      },
    ]);
    expect(e1rm.find((s) => s.loadInput === 'per_dumbbell')?.points).toEqual([
      expect.objectContaining({ sessionId: newer.id, weightKg: 30, reps: 10 }),
    ]);
  });

  it('chỉ thấy dữ liệu của chính mình', async () => {
    const owner = newUser();
    const other = newUser();
    await push(
      owner,
      workout(Date.now() - 60_000, [{ exerciseId: benchId, sets: [[60, 5]] }])
        .events,
    );
    await progress(other); // tạo user `other`
    const res = await progress(other);
    expect(res.weeks.every((w) => w.workouts === 0)).toBe(true);
    expect(res.e1rm).toEqual([]);
  });
});
