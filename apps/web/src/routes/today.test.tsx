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

const signedInAn = {
  stored: { kind: 'session', user: AN },
  owner: AN,
} as const;

const PUSH = '10000000-0000-4000-8000-000000000001';
const LEGS = '10000000-0000-4000-8000-000000000002';
const BENCH_ROW = '20000000-0000-4000-8000-000000000001';
const DB_BENCH_ROW = '20000000-0000-4000-8000-000000000002';
const SQUAT_ROW = '20000000-0000-4000-8000-000000000003';

const target = {
  supersetGroup: null,
  targetDurationMinS: null,
  targetDurationMaxS: null,
  initialWeightKg: null,
  warmupEnabled: null,
};

/** Routine "PPL" đang dùng: Push (Bench 4 × 6–8, DB bench 3 × 8–12 từ 24 kg), Legs (Squat 5 × 3–5 từ 60 kg). */
const PPL: Routine = {
  id: '30000000-0000-4000-8000-000000000001',
  name: 'PPL',
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
          initialWeightKg: 24,
          restSeconds: 90,
        },
      ],
    },
    {
      id: LEGS,
      name: 'Legs',
      position: 1,
      exercises: [
        {
          ...target,
          id: SQUAT_ROW,
          exerciseId: SQUAT.id,
          position: 0,
          targetSets: 5,
          repMin: 3,
          repMax: 5,
          initialWeightKg: 60,
          restSeconds: 180,
        },
      ],
    },
  ],
};

beforeEach(async () => {
  // Catalog và routine đã nằm trên máy từ lần mở app trước; giờ ở phòng gym, mất mạng.
  await db.exercises.bulkPut(CATALOG.exercises);
  await db.routines.put(structuredClone(PPL));
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await clearDb();
});

/**
 * Ghi thẳng vào máy một buổi đã kết thúc (60 phút) theo ngày `dayId` (`null`: tự do),
 * tuỳ chọn kèm một bài với các set [tạ, reps].
 */
async function seedSession(
  startedAt: string,
  dayId: string | null,
  exercise?: { exerciseId: string; sets: [number, number][] },
) {
  const session: WorkoutSession = {
    id: crypto.randomUUID(),
    routineDayId: dayId,
    startedAt,
    endedAt: new Date(Date.parse(startedAt) + 60 * 60_000).toISOString(),
    notes: null,
    deletedAt: null,
  };
  await db.workoutSessions.put(session);
  if (!exercise) return;
  const row: SessionExercise = {
    id: crypto.randomUUID(),
    sessionId: session.id,
    exerciseId: exercise.exerciseId,
    routineExerciseId: null,
    loadInput: 'total',
    position: 0,
    supersetGroup: null,
    deletedAt: null,
  };
  await db.sessionExercises.put(row);
  await db.setLogs.bulkPut(
    exercise.sets.map(([weight, reps], setIndex): SetLog => ({
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

/** Các sự kiện outbox theo thứ tự, dạng [bảng, payload]. */
async function outbox() {
  return (await db.outbox.orderBy('seq').toArray()).map(
    (e) => [e.entity, e.payload] as const,
  );
}

describe('bắt đầu buổi từ ngày tập (UC06)', () => {
  it('offline: ngày kế tiếp sau Push là Legs dù đã tập tự do xen giữa; Start mở buổi đúng bài và target', async () => {
    await seedSession('2026-11-16T10:00:00.000Z', PUSH);
    await seedSession('2026-11-17T10:00:00.000Z', null);
    const user = userEvent.setup();
    await openApp('/', signedInAn);

    const next = await screen.findByRole('region', {
      name: 'Legs, next up',
    });
    expect(within(next).getByText('Legs · next up')).toBeVisible();
    expect(await within(next).findByText('Barbell Squat')).toBeVisible();
    expect(within(next).getByText('5 × 3–5')).toBeVisible();
    expect(within(next).getByText(/Not done yet/)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Start Legs' }));

    expect(
      await screen.findByRole('heading', { name: 'Legs' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Set 1/5')).toBeInTheDocument();
    // Bài chưa có lịch sử: tạ khởi điểm của routine điền sẵn cho set đầu, reps tự nhập (R8).
    expect(screen.getByRole('textbox', { name: 'Weight (total)' })).toHaveValue(
      '60',
    );
    expect(screen.getByRole('textbox', { name: 'Reps' })).toHaveValue('');
    expect(
      screen.getByText('Barbell · incl. 20 kg bar · step 2.5 kg · 3–5 reps'),
    ).toBeInTheDocument();
    expect(screen.getByText('0/5 · 3–5 reps')).toBeInTheDocument();

    const events = await outbox();
    const session = events.find(([e]) => e === 'workout_sessions')?.[1];
    expect(session).toMatchObject({ routineDayId: LEGS, endedAt: null });
    expect(
      events.filter(([e]) => e === 'session_exercises').map(([, p]) => p),
    ).toEqual([
      expect.objectContaining({
        exerciseId: SQUAT.id,
        routineExerciseId: SQUAT_ROW,
        loadInput: 'total',
        position: 0,
      }),
    ]);
  });

  it('chọn ngày khác bằng hàng chấm: bài theo thứ tự ngày tập, lịch sử thắng tạ khởi điểm, nghỉ theo routine', async () => {
    await seedSession('2026-11-16T10:00:00.000Z', PUSH, {
      exerciseId: BENCH.id,
      sets: [
        [80, 8],
        [80, 7],
      ],
    });
    const user = userEvent.setup();
    await openApp('/', signedInAn);

    // Vừa tập Push nên Legs đứng đầu; Push đứng sau, kèm lần tập gần nhất.
    const push = await screen.findByRole('region', { name: 'Push' });
    expect(
      screen.getAllByRole('tab').map((t) => t.getAttribute('aria-label')),
    ).toEqual(['Legs', 'Push', 'Freestyle']);
    expect(within(push).getByText(/Last:/).textContent).toMatch(
      /Last: Nov 16 · 60 min/,
    );
    expect(within(push).getByText('7')).toBeVisible();

    await user.click(screen.getByRole('tab', { name: 'Push' }));
    expect(screen.getByRole('tab', { name: 'Push' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Start Push' }));

    expect(
      await screen.findByRole('heading', { name: 'Push' }),
    ).toBeInTheDocument();
    const chips = within(
      screen.getByRole('navigation', { name: 'Exercises in this session' }),
    )
      .getAllByRole('button')
      .map((b) => b.getAttribute('aria-label'));
    expect(chips.slice(0, 2)).toEqual([
      'Barbell Bench Press - Medium Grip, 0 of 4 sets',
      'Dumbbell Bench Press, 0 of 3 sets',
    ]);

    // Buổi mở ở bài 1. Bench có lịch sử: điền theo lần trước; ghi set thì nghỉ 2:30.
    expect(
      screen.getByRole('region', { name: 'Barbell Bench Press - Medium Grip' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Weight (total)' })).toHaveValue(
      '80',
    );
    expect(screen.getByRole('textbox', { name: 'Reps' })).toHaveValue('8');
    await user.click(screen.getByRole('button', { name: 'Log set 1' }));
    expect(
      await screen.findByRole('timer', { name: 'Rest' }),
    ).toHaveTextContent('2:30');

    // DB bench chưa có lịch sử: set đầu lấy tạ khởi điểm 24 kg, reps để trống (R8).
    await user.click(
      screen.getByRole('button', { name: /^Dumbbell Bench Press,/ }),
    );
    expect(
      screen.getByRole('textbox', { name: 'Weight (per dumbbell)' }),
    ).toHaveValue('24');
    expect(screen.getByRole('textbox', { name: 'Reps' })).toHaveValue('');
  });

  it('chọn tấm tập tự do: vẫn bắt đầu được buổi trống', async () => {
    const user = userEvent.setup();
    await openApp('/', signedInAn);

    await user.click(await screen.findByRole('tab', { name: 'Freestyle' }));
    await user.click(screen.getByRole('button', { name: 'Start freestyle' }));

    expect(
      await screen.findByRole('heading', { name: 'Freestyle' }),
    ).toBeInTheDocument();
    const [[, session]] = await outbox();
    expect(session).toMatchObject({ routineDayId: null });
  });

  it('có routine nhưng không cái nào đang dùng: dẫn sang Plans, vẫn tập tự do được', async () => {
    await db.routines.put({ ...structuredClone(PPL), isActive: false });
    const user = userEvent.setup();
    await openApp('/', signedInAn);

    expect(await screen.findByText('No active routine')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Open Plans' })).toHaveAttribute(
      'href',
      '/plans',
    );
    await user.click(
      await screen.findByRole('button', { name: 'Start freestyle' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Freestyle' }),
    ).toBeInTheDocument();
  });

  it('ngày tập bị xoá khỏi routine giữa buổi: buổi coi như tập tự do, bài như bài ad hoc', async () => {
    const user = userEvent.setup();
    await openApp('/', signedInAn);
    await user.click(await screen.findByRole('button', { name: 'Start Push' }));
    expect(
      await screen.findByRole('heading', { name: 'Push' }),
    ).toBeInTheDocument();

    // Có mạng ở máy khác, xoá ngày Push; cache trên máy làm mới theo.
    await db.routines.put({
      ...structuredClone(PPL),
      days: PPL.days.filter((d) => d.id !== PUSH),
    });

    expect(
      await screen.findByRole('heading', { name: 'Freestyle' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Set 1/3')).toBeInTheDocument();
  });
});

describe('bắt đầu từ tab Plans', () => {
  it('cuống Next up hiện ngày sau ngày của buổi gần nhất; Start một ngày mở buổi đúng bài', async () => {
    await seedSession('2026-11-16T10:00:00.000Z', PUSH);
    await seedSession('2026-11-17T10:00:00.000Z', null);
    const user = userEvent.setup();
    await openApp('/plans', signedInAn);

    const active = await screen.findByRole('region', {
      name: 'Active routine',
    });
    const next = within(active).getByRole('note', { name: 'Next up' });
    expect(next).toHaveTextContent('Legs comes after Push.');
    expect(within(next).getByText('Legs')).toBeVisible();

    await user.click(
      within(active).getByRole('button', { name: 'Start Push' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Push' }),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('navigation', { name: 'Exercises in this session' }),
      )
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label'))
        .slice(0, 2),
    ).toEqual([
      'Barbell Bench Press - Medium Grip, 0 of 4 sets',
      'Dumbbell Bench Press, 0 of 3 sets',
    ]);
  });

  it('chưa tập buổi nào theo routine: Next up là ngày đầu, không nói "comes after"', async () => {
    await openApp('/plans', signedInAn);
    const next = await screen.findByRole('note', { name: 'Next up' });
    expect(next).not.toHaveTextContent('comes after');
    expect(within(next).getByText('Push')).toBeVisible();
  });
});

describe('Plans khi đang có buổi dở', () => {
  it('các nút Start bị tắt; tiếp tục buổi bằng thanh Resume', async () => {
    await db.workoutSessions.put({
      id: crypto.randomUUID(),
      routineDayId: PUSH,
      startedAt: new Date().toISOString(),
      endedAt: null,
      notes: null,
      deletedAt: null,
    });
    await openApp('/plans', signedInAn);

    const active = await screen.findByRole('region', {
      name: 'Active routine',
    });
    await waitFor(() =>
      expect(
        within(active).getByRole('button', { name: 'Start Legs' }),
      ).toBeDisabled(),
    );
    expect(
      within(active).getByRole('button', { name: 'Start Push' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('link', { name: /^Workout in progress: Push,/ }),
    ).toBeInTheDocument();
  });
});
