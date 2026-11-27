import type {
  Routine,
  SessionExercise,
  SetLog,
  WorkoutSession,
} from '@fitness/contract';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AN, clearDb } from '@/auth/testing';
import { BENCH, CATALOG, DUMBBELL_BENCH, SQUAT } from '@/catalog/testing';
import { db } from '@/db/db';
import { openApp } from '@/test/open-app';
import { openExercisePicker } from '@/test/open-picker';

const signedInAn = {
  stored: { kind: 'session', user: AN },
  owner: AN,
} as const;

const PUSH = '10000000-0000-4000-8000-000000000001';
const BENCH_ROW = '20000000-0000-4000-8000-000000000001';
const DB_BENCH_ROW = '20000000-0000-4000-8000-000000000002';
const BENCH_NAME = 'Barbell Bench Press - Medium Grip';

const target = {
  supersetGroup: null,
  targetDurationMinS: null,
  targetDurationMaxS: null,
  initialWeightKg: null,
  warmupEnabled: null,
};

/** Routine "Push" đang dùng: Bench 4 × 6–8 nghỉ 2:30, DB bench 3 × 8–12 nghỉ 1:30. */
const ROUTINE: Routine = {
  id: '30000000-0000-4000-8000-000000000001',
  name: 'Push only',
  source: 'manual',
  programId: null,
  isActive: true,
  createdAt: '2026-11-01T00:00:00.000Z',
  days: [
    {
      id: PUSH,
      name: 'Push',
      position: 0,
      exercises: [
        {
          ...target,
          id: BENCH_ROW,
          exerciseId: BENCH.id,
          position: 0,
          targetSets: 4,
          repMin: 6,
          repMax: 8,
          restSeconds: 150,
        },
        {
          ...target,
          id: DB_BENCH_ROW,
          exerciseId: DUMBBELL_BENCH.id,
          position: 1,
          targetSets: 3,
          repMin: 8,
          repMax: 12,
          restSeconds: 90,
        },
      ],
    },
  ],
};

beforeEach(async () => {
  // Catalog và routine đã nằm trên máy; giờ ở phòng gym, mất mạng.
  await db.exercises.bulkPut(CATALOG.exercises);
  await db.routines.put(structuredClone(ROUTINE));
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await clearDb();
});

type User = ReturnType<typeof userEvent.setup>;

/** Ghi thẳng vào máy một buổi tự do đã kết thúc, có một bài với các set [tạ, reps]. */
async function seedPast(
  startedAt: string,
  exerciseId: string,
  sets: [number, number][],
) {
  const session: WorkoutSession = {
    id: crypto.randomUUID(),
    routineDayId: null,
    startedAt,
    endedAt: new Date(Date.parse(startedAt) + 60 * 60_000).toISOString(),
    notes: null,
    deletedAt: null,
  };
  const row: SessionExercise = {
    id: crypto.randomUUID(),
    sessionId: session.id,
    exerciseId,
    routineExerciseId: null,
    loadInput: 'total',
    position: 0,
    supersetGroup: null,
    deletedAt: null,
  };
  await db.workoutSessions.put(session);
  await db.sessionExercises.put(row);
  await db.setLogs.bulkPut(
    sets.map(([weight, reps], setIndex): SetLog => ({
      id: crypto.randomUUID(),
      sessionExerciseId: row.id,
      setIndex,
      setType: 'working',
      weightValue: weight,
      inputUnit: 'kg',
      reps,
      durationS: null,
      distanceM: null,
      rpe: null,
      completedAt: startedAt,
      deletedAt: null,
    })),
  );
}

async function startPush(user: User) {
  await openApp('/', signedInAn);
  await user.click(await screen.findByRole('button', { name: 'Start Push' }));
  await screen.findByRole('heading', { name: 'Push' });
}

/** Menu "⋯" của bài hiện tại → Swap exercise → chọn bài mới bằng cách gõ tìm. */
async function swapTo(user: User, from: string, query: string, to: RegExp) {
  await user.click(screen.getByRole('button', { name: `Options for ${from}` }));
  const menu = await screen.findByRole('dialog', { name: from });
  await user.click(within(menu).getByRole('button', { name: /Swap exercise/ }));
  await screen.findByRole('dialog', { name: `Swap ${from} for…` });
  await user.keyboard(query);
  await user.click(await screen.findByRole('button', { name: to }));
}

function chips() {
  return within(
    screen.getByRole('navigation', { name: 'Exercises in this session' }),
  )
    .getAllByRole('button')
    .map((b) => b.getAttribute('aria-label'))
    .filter(Boolean);
}

/** Bài trong buổi đang mở theo vị trí (`deleted`: kể cả bài đã bỏ). */
async function openRows(deleted = false) {
  const open = (await db.workoutSessions.toArray()).find(
    (s) => s.endedAt === null,
  );
  return (await db.sessionExercises.toArray())
    .filter((r) => r.sessionId === open?.id && (deleted || !r.deletedAt))
    .sort((a, b) => a.position - b.position);
}

describe('thay bài giữa buổi (UC09)', () => {
  it('bài đã ghi set: set cũ giữ nguyên, bài mới ad hoc chèn ngay sau, lần trước theo lịch sử bài mới, nghỉ theo bài cũ', async () => {
    await seedPast('2026-11-20T10:00:00.000Z', BENCH.id, [[80, 8]]);
    await seedPast('2026-11-21T10:00:00.000Z', SQUAT.id, [
      [100, 5],
      [100, 5],
    ]);
    const user = userEvent.setup();
    await startPush(user);

    await user.click(screen.getByRole('button', { name: 'Log set 1' }));
    await screen.findByRole('button', { name: 'Log set 2' });
    await swapTo(user, BENCH_NAME, 'squat', /Barbell Squat/);

    expect(
      await screen.findByText(
        'Swapped to Barbell Squat. Last-time numbers now come from this exercise.',
      ),
    ).toBeInTheDocument();
    await screen.findByRole('region', { name: 'Barbell Squat' });
    // Bench giữ 1 set đã ghi, bỏ 3 set chờ; Squat nhận 3 set chờ còn lại, chèn trước DB bench.
    expect(chips()).toEqual([
      `${BENCH_NAME}, 1 of 1 sets`,
      'Barbell Squat, 0 of 3 sets',
      'Dumbbell Bench Press, 0 of 3 sets',
    ]);
    // Lần trước của Squat, không phải của Bench; không có rep range của Bench.
    expect(screen.getByRole('note', { name: /^Last time/ }).textContent).toBe(
      'Last time · Nov 21 100×5 · 5',
    );
    expect(screen.getByRole('textbox', { name: 'Weight (total)' })).toHaveValue(
      '100',
    );
    expect(screen.queryByText(/6–8 reps/)).toBeNull();

    // Nghỉ theo bài cũ (2:30), không phải mặc định của bài ad hoc.
    await user.click(screen.getByRole('button', { name: 'Log set 1' }));
    await waitFor(() =>
      expect(screen.getByRole('timer', { name: 'Rest' })).toHaveTextContent(
        '2:30',
      ),
    );

    const rows = await openRows();
    expect(
      rows.map((r) => [r.exerciseId, r.routineExerciseId, r.position]),
    ).toEqual([
      [BENCH.id, BENCH_ROW, 0],
      [SQUAT.id, null, 1],
      [DUMBBELL_BENCH.id, DB_BENCH_ROW, 2],
    ]);
    // Set đã ghi của Bench vẫn thuộc Bench.
    const benchSets = await db.setLogs
      .where('sessionExerciseId')
      .equals(rows[0]!.id)
      .toArray();
    expect(benchSets.map((s) => [s.weightValue, s.reps])).toEqual([[80, 8]]);
    // Đổi vị trí DB bench cũng đi qua outbox để đồng bộ.
    const events = await db.outbox.orderBy('seq').toArray();
    expect(events.at(-1)?.entity).toBe('set_logs');
    expect(
      events
        .filter((e) => e.entity === 'session_exercises')
        .map((e) => e.payload)
        .slice(-2),
    ).toEqual([
      expect.objectContaining({ exerciseId: DUMBBELL_BENCH.id, position: 2 }),
      expect.objectContaining({
        exerciseId: SQUAT.id,
        routineExerciseId: null,
        position: 1,
      }),
    ]);
    // Routine gốc không đổi.
    expect(await db.routines.get(ROUTINE.id)).toEqual(ROUTINE);
  });

  it('bài chưa ghi set: bài cũ bỏ hẳn (tombstone), bài mới thế chỗ với đủ số set chờ', async () => {
    const user = userEvent.setup();
    await startPush(user);

    await swapTo(user, BENCH_NAME, 'squat', /Barbell Squat/);

    await screen.findByRole('region', { name: 'Barbell Squat' });
    // Squat nhận cả 4 set chờ của Bench (không phải 3 như bài thêm mới).
    expect(chips()).toEqual([
      'Barbell Squat, 0 of 4 sets',
      'Dumbbell Bench Press, 0 of 3 sets',
    ]);
    // Bài mới chưa có lịch sử: không có lần trước, không kế thừa tạ hay rep range của bài cũ.
    expect(screen.queryByRole('note', { name: /^Last time/ })).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Weight (total)' })).toHaveValue(
      '',
    );
    expect(screen.queryByText(/6–8 reps/)).toBeNull();

    const rows = await openRows(true);
    expect(
      rows.map((r) => [
        r.exerciseId,
        r.routineExerciseId,
        r.position,
        !!r.deletedAt,
      ]),
    ).toEqual(
      expect.arrayContaining([
        [BENCH.id, BENCH_ROW, 0, true],
        [SQUAT.id, null, 0, false],
        [DUMBBELL_BENCH.id, DB_BENCH_ROW, 1, false],
      ]),
    );
    expect(rows).toHaveLength(3);
    expect(await db.routines.get(ROUTINE.id)).toEqual(ROUTINE);
  });

  it('thêm bài ad hoc vào buổi theo routine: vào cuối buổi, lần trước theo lịch sử của bài', async () => {
    await seedPast('2026-11-21T10:00:00.000Z', SQUAT.id, [[100, 5]]);
    const user = userEvent.setup();
    await startPush(user);

    await openExercisePicker(user);
    await user.keyboard('squat');
    await user.click(
      await screen.findByRole('button', { name: /Barbell Squat/ }),
    );

    await screen.findByRole('region', { name: 'Barbell Squat' });
    expect(chips()).toEqual([
      `${BENCH_NAME}, 0 of 4 sets`,
      'Dumbbell Bench Press, 0 of 3 sets',
      'Barbell Squat, 0 of 3 sets',
    ]);
    expect(screen.getByRole('note', { name: /^Last time/ }).textContent).toBe(
      'Last time · Nov 21 100×5',
    );
    const rows = await openRows();
    expect(rows.at(-1)).toMatchObject({
      exerciseId: SQUAT.id,
      routineExerciseId: null,
      position: 2,
    });
  });
});
