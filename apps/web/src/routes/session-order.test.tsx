import type {
  Routine,
  SessionExercise,
  SetLog,
  WorkoutSession,
} from '@fitness/contract';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
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
const BENCH_NAME = 'Barbell Bench Press - Medium Grip';
const DB_NAME = 'Dumbbell Bench Press';
const SQUAT_NAME = 'Barbell Squat';

/** Routine "Push" đang dùng: Bench 2 set nghỉ 2:30, DB bench 2 set nghỉ 1:30, Squat 2 set. */
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
        [BENCH.id, 150],
        [DUMBBELL_BENCH.id, 90],
        [SQUAT.id, 180],
      ].map(([exerciseId, restSeconds], position) => ({
        id: `20000000-0000-4000-8000-00000000000${position + 1}`,
        exerciseId: exerciseId as string,
        position,
        supersetGroup: null,
        targetSets: 2,
        repMin: 6,
        repMax: 8,
        restSeconds: restSeconds as number,
        targetDurationMinS: null,
        targetDurationMaxS: null,
        initialWeightKg: 40,
        warmupEnabled: null,
      })),
    },
  ],
};

beforeEach(async () => {
  // Catalog và routine đã nằm trên máy; giờ ở phòng gym, mất mạng.
  await db.exercises.bulkPut(CATALOG.exercises);
  await db.routines.put(structuredClone(ROUTINE));
  // Lần trước của mỗi bài, để set kế tiếp có sẵn số và ghi được ngay.
  for (const { exerciseId } of ROUTINE.days[0]!.exercises) {
    await seedPast(exerciseId);
  }
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await clearDb();
});

type User = ReturnType<typeof userEvent.setup>;

/** Ghi thẳng vào máy một buổi tự do đã kết thúc, có hai set 40 × 6 của bài. */
async function seedPast(exerciseId: string) {
  const startedAt = '2026-11-20T10:00:00.000Z';
  const session: WorkoutSession = {
    id: crypto.randomUUID(),
    routineDayId: null,
    startedAt,
    endedAt: '2026-11-20T11:00:00.000Z',
    notes: null,
    deletedAt: null,
  };
  const row: SessionExercise = {
    id: crypto.randomUUID(),
    sessionId: session.id,
    exerciseId,
    routineExerciseId: null,
    // Cùng quy ước đang áp của bài, để số lần trước điền được vào ô nhập.
    loadInput: exerciseId === DUMBBELL_BENCH.id ? 'per_dumbbell' : 'total',
    position: 0,
    supersetGroup: null,
    deletedAt: null,
  };
  await db.workoutSessions.put(session);
  await db.sessionExercises.put(row);
  await db.setLogs.bulkPut(
    [0, 1].map((setIndex): SetLog => ({
      id: crypto.randomUUID(),
      sessionExerciseId: row.id,
      setIndex,
      setType: 'working',
      weightValue: 40,
      inputUnit: 'kg',
      reps: 6,
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

const strip = () =>
  screen.getByRole('navigation', { name: 'Exercises in this session' });

/** Dải chip theo thứ tự, superset trong ngoặc vuông: ["[Bench", "DB]", "Squat"]. */
function chips() {
  return within(strip())
    .getAllByRole('button')
    .flatMap((button) => {
      const label = button.getAttribute('aria-label');
      if (!label) return [];
      const name = label.slice(0, label.lastIndexOf(', '));
      const group = button.closest('[role="group"][aria-label="Superset"]');
      if (!group) return [name];
      const members = within(group as HTMLElement).getAllByRole('button');
      const open = members[0] === button ? '[' : '';
      const close = members.at(-1) === button ? ']' : '';
      return [`${open}${name}${close}`];
    });
}

/** Bài còn trong buổi đang mở theo vị trí: [tên ngắn, vị trí, nhóm superset]. */
async function layout() {
  const open = (await db.workoutSessions.toArray()).find(
    (s) => s.endedAt === null,
  );
  const names = new Map([
    [BENCH.id, 'bench'],
    [DUMBBELL_BENCH.id, 'db'],
    [SQUAT.id, 'squat'],
  ]);
  return (await db.sessionExercises.toArray())
    .filter((r) => r.sessionId === open?.id && !r.deletedAt)
    .sort((a, b) => a.position - b.position)
    .map((r) => [names.get(r.exerciseId), r.position, r.supersetGroup]);
}

/** Bản ghi bài trong buổi của các sự kiện outbox ghi sau sự kiện `after`. */
async function pushedRows(after: number) {
  return (await db.outbox.orderBy('seq').toArray())
    .filter((e) => e.seq > after && e.entity === 'session_exercises')
    .map((e) => e.payload);
}

const lastSeq = async () => (await db.outbox.orderBy('seq').last())?.seq ?? 0;

async function openMenu(user: User, name: string) {
  await user.click(screen.getByRole('button', { name: `Options for ${name}` }));
  return screen.findByRole('dialog', { name });
}

async function pickMenu(user: User, name: string, item: RegExp) {
  const menu = await openMenu(user, name);
  await user.click(within(menu).getByRole('button', { name: item }));
}

/** Tổng số set đã ghi theo nhãn các chip. */
function loggedOnStrip() {
  return within(strip())
    .getAllByRole('button')
    .reduce((sum, button) => {
      const label = button.getAttribute('aria-label') ?? '';
      return sum + Number(/, (\d+) of/.exec(label)?.[1] ?? 0);
    }, 0);
}

/** Ghi set `n` của bài đang tập và chờ màn hiện set đó đã ghi. */
async function logSet(user: User, n: number) {
  const before = loggedOnStrip();
  await user.click(screen.getByRole('button', { name: `Log set ${n}` }));
  await waitFor(() => expect(loggedOnStrip()).toBe(before + 1));
}

async function openSessionSheet(user: User) {
  await user.click(within(strip()).getByRole('button', { name: 'Session' }));
  return screen.findByRole('dialog', { name: 'Session · Push' });
}

describe('superset trong buổi (UC09)', () => {
  it('gộp với bài kế từ menu bài rồi tách: chip có nhãn superset, đồng bộ qua outbox, routine không đổi', async () => {
    const user = userEvent.setup();
    await startPush(user);
    const before = await lastSeq();

    await pickMenu(user, BENCH_NAME, /Superset with next exercise/);

    await waitFor(() =>
      expect(chips()).toEqual([`[${BENCH_NAME}`, `${DB_NAME}]`, SQUAT_NAME]),
    );
    expect(await layout()).toEqual([
      ['bench', 0, 1],
      ['db', 1, 1],
      ['squat', 2, null],
    ]);
    // Chỉ hai bài đổi mới đi qua outbox.
    expect(await pushedRows(before)).toEqual([
      expect.objectContaining({ exerciseId: BENCH.id, supersetGroup: 1 }),
      expect.objectContaining({
        exerciseId: DUMBBELL_BENCH.id,
        supersetGroup: 1,
      }),
    ]);

    await pickMenu(user, BENCH_NAME, /Remove from superset/);

    await waitFor(() =>
      expect(chips()).toEqual([BENCH_NAME, DB_NAME, SQUAT_NAME]),
    );
    expect(await layout()).toEqual([
      ['bench', 0, null],
      ['db', 1, null],
      ['squat', 2, null],
    ]);
    expect(await db.routines.get(ROUTINE.id)).toEqual(ROUTINE);
  });

  it('bài cuối buổi không gộp được với bài kế', async () => {
    const user = userEvent.setup();
    await startPush(user);
    await user.click(
      within(strip()).getByRole('button', { name: /^Barbell Squat/ }),
    );

    const menu = await openMenu(user, SQUAT_NAME);

    expect(
      within(menu).getByRole('button', { name: /Superset with next exercise/ }),
    ).toBeDisabled();
  });

  it('tập xen kẽ: ghi set thì sang bài kế trong nhóm, chỉ nghỉ khi hết vòng, theo bài ghi cuối vòng', async () => {
    const user = userEvent.setup();
    await startPush(user);
    await pickMenu(user, BENCH_NAME, /Superset with next exercise/);
    await waitFor(() => expect(chips()[0]).toBe(`[${BENCH_NAME}`));
    const log = (n: number) => logSet(user, n);
    const onBib = (name: string) => screen.findByRole('region', { name });

    // Bench set 1 → DB bench, chưa nghỉ.
    await log(1);
    await onBib(DB_NAME);
    expect(screen.queryByRole('timer', { name: 'Rest' })).toBeNull();

    // DB bench set 1: hết vòng → về Bench, nghỉ 1:30 của DB bench.
    await log(1);
    await onBib(BENCH_NAME);
    expect(
      await screen.findByRole('timer', { name: 'Rest' }),
    ).toHaveTextContent('1:30');

    // Vòng 2: sang DB bench thì bỏ đồng hồ nghỉ của vòng trước.
    await log(2);
    await onBib(DB_NAME);
    await waitFor(() =>
      expect(screen.queryByRole('timer', { name: 'Rest' })).toBeNull(),
    );

    // Set cuối của nhóm: ở lại bài đó, còn Squat nên vẫn nghỉ.
    await log(2);
    expect(
      await screen.findByRole('button', { name: `Next: ${SQUAT_NAME}` }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('timer', { name: 'Rest' }),
    ).toHaveTextContent('1:30');
  });

  it('bỏ một trong hai bài khỏi buổi: bài còn lại hết superset', async () => {
    const user = userEvent.setup();
    await startPush(user);
    await pickMenu(user, BENCH_NAME, /Superset with next exercise/);
    await waitFor(() => expect(chips()[0]).toBe(`[${BENCH_NAME}`));

    await pickMenu(user, BENCH_NAME, /Remove from this session/);

    await waitFor(() => expect(chips()).toEqual([DB_NAME, SQUAT_NAME]));
    expect(await layout()).toEqual([
      ['db', 1, null],
      ['squat', 2, null],
    ]);
  });

  it('thay bài đã ghi set ở cuối nhóm: bài cũ lên trước nhóm, bài mới thế chỗ trong nhóm', async () => {
    await db.routines.put({
      ...ROUTINE,
      days: [
        {
          ...ROUTINE.days[0]!,
          exercises: ROUTINE.days[0]!.exercises.slice(0, 2),
        },
      ],
    });
    const user = userEvent.setup();
    await startPush(user);
    await pickMenu(user, BENCH_NAME, /Superset with next exercise/);
    await waitFor(() => expect(chips()[0]).toBe(`[${BENCH_NAME}`));
    // Bench set 1 → tự sang DB bench → ghi set 1 → về Bench.
    await logSet(user, 1);
    await screen.findByRole('region', { name: DB_NAME });
    await logSet(user, 1);
    await screen.findByRole('region', { name: BENCH_NAME });
    await user.click(
      within(strip()).getByRole('button', { name: /^Dumbbell Bench Press/ }),
    );

    await pickMenu(user, DB_NAME, /Swap exercise/);
    await screen.findByRole('dialog', { name: `Swap ${DB_NAME} for…` });
    await user.keyboard('squat');
    await user.click(
      await screen.findByRole('button', { name: /Barbell Squat/ }),
    );

    await waitFor(() =>
      expect(chips()).toEqual([DB_NAME, `[${BENCH_NAME}`, `${SQUAT_NAME}]`]),
    );
    expect(await layout()).toEqual([
      ['db', 0, null],
      ['bench', 1, 1],
      ['squat', 2, 1],
    ]);
  });
});

describe('đổi thứ tự trong buổi (UC09)', () => {
  it('đổi bằng bàn phím trong sheet Session: thứ tự đổi, bài đang tập giữ nguyên, routine không đổi', async () => {
    const user = userEvent.setup();
    await startPush(user);
    const sheet = await openSessionSheet(user);
    const before = await lastSeq();
    const grip = within(sheet).getByRole('button', {
      name: `Reorder ${SQUAT_NAME}`,
    });

    grip.focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowUp}{ArrowUp}');
    await user.keyboard(' ');

    await waitFor(async () =>
      expect(await layout()).toEqual([
        ['squat', 0, null],
        ['bench', 1, null],
        ['db', 2, null],
      ]),
    );
    expect(await pushedRows(before)).toHaveLength(3);
    await user.click(within(sheet).getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(chips()).toEqual([SQUAT_NAME, BENCH_NAME, DB_NAME]),
    );
    expect(
      screen.getByRole('region', { name: BENCH_NAME }),
    ).toBeInTheDocument();
    expect(await db.routines.get(ROUTINE.id)).toEqual(ROUTINE);
  });

  it('Esc khi đang nhấc một bài: huỷ di chuyển, sheet vẫn mở', async () => {
    const user = userEvent.setup();
    await startPush(user);
    const sheet = await openSessionSheet(user);
    const grip = within(sheet).getByRole('button', {
      name: `Reorder ${SQUAT_NAME}`,
    });

    grip.focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowUp}');
    await user.keyboard('{Escape}');

    expect(grip).toHaveAttribute('aria-pressed', 'false');
    expect(sheet).toBeInTheDocument();
    expect(await layout()).toEqual([
      ['bench', 0, null],
      ['db', 1, null],
      ['squat', 2, null],
    ]);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('nút superset trên từng hàng gộp với bài kế; kéo một bài ra khỏi nhóm thì báo toast', async () => {
    const user = userEvent.setup();
    await startPush(user);
    const sheet = await openSessionSheet(user);
    const link = (name: string) =>
      within(sheet).getByRole('button', {
        name: `Superset ${name} with the next exercise`,
      });
    const rowTexts = () =>
      within(sheet)
        .getAllByRole('listitem')
        .map((li) => li.textContent);
    expect(link(SQUAT_NAME)).toBeDisabled();

    await user.click(link(BENCH_NAME));

    await waitFor(() =>
      expect(link(BENCH_NAME)).toHaveAttribute('aria-pressed', 'true'),
    );
    expect(rowTexts()).toEqual([
      `1${BENCH_NAME}0/2 sets · superset`,
      `2${DB_NAME}0/2 sets · superset`,
      `3${SQUAT_NAME}0/2 sets`,
    ]);

    // Kéo Bench xuống cuối: ra khỏi nhóm.
    within(sheet)
      .getByRole('button', { name: `Reorder ${BENCH_NAME}` })
      .focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    await user.keyboard(' ');

    expect(
      await screen.findByText(`${BENCH_NAME} left its superset.`),
    ).toBeInTheDocument();
    expect(await layout()).toEqual([
      ['db', 0, null],
      ['squat', 1, null],
      ['bench', 2, null],
    ]);
  });

  it('thêm bài từ sheet Session: bài ad hoc vào cuối buổi, ghi "added today"', async () => {
    const user = userEvent.setup();
    await startPush(user);
    const sheet = await openSessionSheet(user);

    await user.click(
      within(sheet).getByRole('button', { name: 'Add exercise' }),
    );
    await screen.findByRole('dialog', { name: 'Add an exercise' });
    await user.keyboard('squat');
    await user.click(
      await screen.findByRole('button', { name: /Barbell Squat/ }),
    );
    await waitFor(() => expect(chips()).toHaveLength(4));
    const again = await openSessionSheet(user);

    expect(within(again).getAllByRole('listitem').at(-1)).toHaveTextContent(
      '0/3 sets · added today',
    );
  });

  it('mở lại app giữa buổi (offline): thứ tự và superset còn nguyên', async () => {
    const user = userEvent.setup();
    await startPush(user);
    await pickMenu(user, BENCH_NAME, /Superset with next exercise/);
    await waitFor(() => expect(chips()[0]).toBe(`[${BENCH_NAME}`));
    cleanup();

    await openApp('/workout', signedInAn);

    await screen.findByRole('heading', { name: 'Push' });
    expect(chips()).toEqual([`[${BENCH_NAME}`, `${DB_NAME}]`, SQUAT_NAME]);
  });
});
