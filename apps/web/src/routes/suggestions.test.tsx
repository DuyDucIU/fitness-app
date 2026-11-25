import type {
  Routine,
  SessionExercise,
  SetLog,
  Suggestion,
  WorkoutSession,
} from '@fitness/contract';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AN, clearDb } from '@/auth/testing';
import { BENCH, CATALOG, PUSH_UP } from '@/catalog/testing';
import { db } from '@/db/db';
import { openApp } from '@/test/open-app';

/** Gợi ý trước buổi (UC12: R1, R2, R4) trên Today và màn ghi set, từ góc nhìn user. */

const signedInAn = {
  stored: { kind: 'session', user: AN },
  owner: AN,
} as const;

const PUSH = '10000000-0000-4000-8000-000000000001';
const BENCH_ROW = '20000000-0000-4000-8000-000000000001';
const PUSH_UP_ROW = '20000000-0000-4000-8000-000000000002';

const target = {
  supersetGroup: null,
  targetDurationMinS: null,
  targetDurationMaxS: null,
  initialWeightKg: null,
  warmupEnabled: null,
  restSeconds: 120,
};

/** Routine đang dùng một ngày "Push": Bench 3 × 6–8, Push-up 2 × 10–15. */
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
          targetSets: 3,
          repMin: 6,
          repMax: 8,
        },
        {
          ...target,
          id: PUSH_UP_ROW,
          exerciseId: PUSH_UP.id,
          position: 1,
          targetSets: 2,
          repMin: 10,
          repMax: 15,
        },
      ],
    },
  ],
};

beforeEach(async () => {
  await db.exercises.bulkPut([...CATALOG.exercises, PUSH_UP]);
  await db.routines.put(structuredClone(ROUTINE));
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await clearDb();
});

/**
 * Ghi thẳng vào máy một buổi Push đã kết thúc, có một bài theo routine với các set
 * [tạ, reps]. Trả về id bài trong buổi (căn cứ của gợi ý dựa trên buổi này).
 */
async function seedPush(
  startedAt: string,
  routineExerciseId: string | null,
  exerciseId: string,
  sets: [number | null, number][],
): Promise<string> {
  const session: WorkoutSession = {
    id: crypto.randomUUID(),
    routineDayId: PUSH,
    startedAt,
    endedAt: new Date(Date.parse(startedAt) + 60 * 60_000).toISOString(),
    notes: null,
    deletedAt: null,
  };
  const row: SessionExercise = {
    id: crypto.randomUUID(),
    sessionId: session.id,
    exerciseId,
    routineExerciseId,
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
      inputUnit: weight === null ? null : 'kg',
      reps,
      durationS: null,
      distanceM: null,
      rpe: null,
      completedAt: startedAt,
      deletedAt: null,
    })),
  );
  return row.id;
}

const benchAt = (weight: number, reps: number[]) =>
  reps.map((r): [number, number] => [weight, r]);

/** Bản ghi gợi ý đã ghi qua outbox, bản mới nhất của mỗi gợi ý. */
async function suggestionsInOutbox(): Promise<Suggestion[]> {
  const latest = new Map<string, Suggestion>();
  for (const e of await db.outbox.orderBy('seq').toArray()) {
    if (e.entity === 'suggestions') {
      const s = e.payload as Suggestion;
      latest.set(s.id, s);
    }
  }
  return [...latest.values()];
}

const text = (el: HTMLElement) => el.textContent?.replace(/\s+/g, ' ').trim();

describe('Today: gợi ý trên tấm ngày tập', () => {
  it('R1: mọi set lần trước đạt trần thì gợi ý nên tăng, thay câu "Nothing to change"; Got it ghi accepted qua outbox, offline', async () => {
    const basis = await seedPush(
      '2026-11-20T10:00:00.000Z',
      BENCH_ROW,
      BENCH.id,
      benchAt(80, [8, 8, 9]),
    );
    const user = userEvent.setup();
    await openApp('/', signedInAn);

    const push = await screen.findByRole('region', { name: /Push/ });
    const tip = await within(push).findByRole('note', {
      name: /all three sets hit 8 reps/,
    });
    expect(text(tip)).toContain(
      'Barbell Bench Press - Medium Grip: all three sets hit 8 reps last time. Add weight or reps today, your call.',
    );
    expect(text(tip)).toContain(
      'Every working set reached the top of your 6–8 range.',
    );
    expect(within(push).queryByText(/Nothing to change/)).toBeNull();

    await user.click(within(tip).getByRole('button', { name: 'Got it' }));

    expect(
      await within(push).findByText(/Nothing to change/),
    ).toBeInTheDocument();
    expect(await suggestionsInOutbox()).toEqual([
      expect.objectContaining({
        exerciseId: BENCH.id,
        routineExerciseId: BENCH_ROW,
        sessionExerciseId: null,
        basedOnSessionExerciseId: basis,
        kind: 'increase',
        reason: 'all_sets_top',
        payload: { sets: 3, min: 6, top: 8 },
        status: 'accepted',
        respondedAt: expect.any(String),
      }),
    ]);

    // Vào buổi: gợi ý đã trả lời không hiện lại, không tạo bản ghi thứ hai.
    await user.click(screen.getByRole('button', { name: 'Start Push' }));
    await screen.findByRole('heading', { name: 'Push' });
    expect(screen.queryByRole('button', { name: 'Got it' })).toBeNull();
    expect(await suggestionsInOutbox()).toHaveLength(1);
  });

  it('R2: hai buổi liền cùng mức tạ đều đạt trần thì chúc mừng và nhắc lại', async () => {
    await seedPush(
      '2026-11-17T10:00:00.000Z',
      BENCH_ROW,
      BENCH.id,
      benchAt(80, [8, 8, 8]),
    );
    await seedPush(
      '2026-11-20T10:00:00.000Z',
      BENCH_ROW,
      BENCH.id,
      benchAt(80, [8, 8, 8]),
    );
    await openApp('/', signedInAn);

    const tip = await screen.findByRole('note', { name: /on every set again/ });
    expect(text(tip)).toContain(
      'Barbell Bench Press - Medium Grip: 8 on every set again. Nice. Ready to go up?',
    );
    expect(text(tip)).toContain('Second session in a row at the top of 6–8.');
  });

  it('không có gì để gợi ý: giữ câu "Nothing to change"', async () => {
    await seedPush(
      '2026-11-20T10:00:00.000Z',
      BENCH_ROW,
      BENCH.id,
      benchAt(80, [8, 7, 6]),
    );
    await openApp('/', signedInAn);
    const push = await screen.findByRole('region', { name: /Push/ });
    expect(
      await within(push).findByText(/Nothing to change/),
    ).toBeInTheDocument();
    expect(within(push).queryByRole('button', { name: 'Got it' })).toBeNull();
  });
});

describe('màn ghi set: gợi ý trước buổi', () => {
  async function startPush() {
    const user = userEvent.setup();
    await openApp('/', signedInAn);
    await user.click(await screen.findByRole('button', { name: 'Start Push' }));
    await screen.findByRole('heading', { name: 'Push' });
    return user;
  }

  it('vào buổi ghi gợi ý pending; R1 thay cuống lần trước nhưng không đổi ô nhập; Got it ghi accepted rồi hiện lại số lần trước', async () => {
    await seedPush(
      '2026-11-20T10:00:00.000Z',
      BENCH_ROW,
      BENCH.id,
      benchAt(80, [8, 8, 8]),
    );
    const user = await startPush();

    expect(await suggestionsInOutbox()).toEqual([
      expect.objectContaining({ kind: 'increase', status: 'pending' }),
    ]);
    const tip = await screen.findByRole('note', {
      name: /All three sets hit 8 reps/,
    });
    expect(text(tip)).toContain(
      'All three sets hit 8 reps last time. Time to add weight or reps, your call.',
    );
    // R1 chỉ nêu hướng: ô nhập vẫn điền đúng lần trước.
    expect(screen.getByRole('textbox', { name: 'Weight (total)' })).toHaveValue(
      '80',
    );
    expect(screen.getByRole('textbox', { name: 'Reps' })).toHaveValue('8');
    expect(screen.queryByRole('note', { name: /^Last time/ })).toBeNull();

    await user.click(within(tip).getByRole('button', { name: 'Got it' }));

    const last = await screen.findByRole('note', { name: /^Last time/ });
    expect(text(last)).toContain('You topped out on every set last time.');
    expect(await suggestionsInOutbox()).toEqual([
      expect.objectContaining({ status: 'accepted' }),
    ]);
  });

  it('ghi set đầu mà chưa trả lời: gợi ý thành dismissed và ẩn đi', async () => {
    await seedPush(
      '2026-11-20T10:00:00.000Z',
      BENCH_ROW,
      BENCH.id,
      benchAt(80, [8, 8, 8]),
    );
    const user = await startPush();
    await screen.findByRole('note', { name: /All three sets hit 8 reps/ });

    await user.click(screen.getByRole('button', { name: 'Log set 1' }));

    await screen.findByRole('button', { name: 'Log set 2' });
    expect(screen.queryByRole('button', { name: 'Got it' })).toBeNull();
    expect(await suggestionsInOutbox()).toEqual([
      expect.objectContaining({
        status: 'dismissed',
        respondedAt: expect.any(String),
      }),
    ]);
  });

  it('kết thúc buổi mà gợi ý chưa trả lời: expired', async () => {
    await seedPush('2026-11-20T10:00:00.000Z', PUSH_UP_ROW, PUSH_UP.id, [
      [null, 15],
      [null, 15],
    ]);
    const user = await startPush();
    expect(await suggestionsInOutbox()).toEqual([
      expect.objectContaining({ exerciseId: PUSH_UP.id, status: 'pending' }),
    ]);

    await user.click(screen.getByRole('button', { name: 'Finish' }));
    await user.click(
      await screen.findByRole('button', { name: 'Finish workout' }),
    );

    await screen.findByRole('button', { name: 'Start Push' });
    expect(await suggestionsInOutbox()).toEqual([
      expect.objectContaining({ status: 'expired', respondedAt: null }),
    ]);
  });

  it('bài chỉ reps đạt trần: gợi ý tăng reps hoặc cầm thêm tạ', async () => {
    await seedPush('2026-11-20T10:00:00.000Z', PUSH_UP_ROW, PUSH_UP.id, [
      [null, 15],
      [null, 16],
    ]);
    const user = await startPush();
    await user.click(screen.getByRole('button', { name: /^Pushups,/ }));
    const tip = await screen.findByRole('note', {
      name: /All two sets hit 15 reps/,
    });
    expect(text(tip)).toContain(
      'All two sets hit 15 reps last time. Add reps or hold a weight, your call.',
    );
  });

  it('R4: lần trước các set khác mức tạ thì không gợi ý tăng, nhắc làm lại đúng từng set, điền sẵn đúng từng set', async () => {
    await seedPush('2026-11-20T10:00:00.000Z', BENCH_ROW, BENCH.id, [
      [85, 8],
      [80, 8],
      [80, 8],
    ]);
    await startPush();

    const last = await screen.findByRole('note', { name: /^Last time/ });
    expect(text(last)).toContain(
      'Weights changed across sets last time. Match them set by set.',
    );
    expect(screen.queryByRole('button', { name: 'Got it' })).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Weight (total)' })).toHaveValue(
      '85',
    );
    expect(await suggestionsInOutbox()).toEqual([]);
  });

  it('chưa đạt trần: nhắc giữ mức tạ và lên dần tới trần', async () => {
    await seedPush(
      '2026-11-20T10:00:00.000Z',
      BENCH_ROW,
      BENCH.id,
      benchAt(80, [8, 7, 6]),
    );
    await startPush();
    const last = await screen.findByRole('note', { name: /^Last time/ });
    expect(text(last)).toContain('Stay at 80 kg and build to 8 reps a set.');
  });

  it('bài ad hoc: rep range lấy từ lần gần nhất có rep range, dù cách nhiều buổi ad hoc', async () => {
    await seedPush(
      '2026-11-10T10:00:00.000Z',
      BENCH_ROW,
      BENCH.id,
      benchAt(80, [7, 7, 7]),
    );
    await seedPush(
      '2026-11-14T10:00:00.000Z',
      null,
      BENCH.id,
      benchAt(80, [6, 6, 6]),
    );
    await seedPush(
      '2026-11-17T10:00:00.000Z',
      null,
      BENCH.id,
      benchAt(80, [7, 6, 6]),
    );
    await seedPush(
      '2026-11-20T10:00:00.000Z',
      null,
      BENCH.id,
      benchAt(80, [8, 8, 8]),
    );
    const user = userEvent.setup();
    await openApp('/', signedInAn);
    await user.click(await screen.findByRole('tab', { name: 'Freestyle' }));
    await user.click(screen.getByRole('button', { name: 'Start freestyle' }));
    await screen.findByRole('heading', { name: 'Freestyle' });
    await user.click(screen.getByRole('button', { name: 'Add exercise' }));
    await user.keyboard('bench');
    await user.click(
      await screen.findByRole('button', {
        name: /Barbell Bench Press - Medium Grip/,
      }),
    );
    expect(
      await screen.findByRole('note', { name: /All three sets hit 8 reps/ }),
    ).toBeInTheDocument();
    expect(await suggestionsInOutbox()).toEqual([
      expect.objectContaining({ routineExerciseId: null, status: 'pending' }),
    ]);
  });

  it('gợi ý pending còn đó sau khi đóng rồi mở lại app', async () => {
    await seedPush(
      '2026-11-20T10:00:00.000Z',
      BENCH_ROW,
      BENCH.id,
      benchAt(80, [8, 8, 8]),
    );
    await startPush();
    await screen.findByRole('note', { name: /All three sets hit 8 reps/ });
    cleanup();
    await openApp('/workout', signedInAn);
    expect(
      await screen.findByRole('note', { name: /All three sets hit 8 reps/ }),
    ).toBeInTheDocument();
    expect(await suggestionsInOutbox()).toHaveLength(1);
  });
});

describe('màn ghi set: back-off trong buổi (R3)', () => {
  /** Lần trước Bench 80 × 8 · 8 · 7: không có gợi ý trước buổi, ô nhập điền 80 × 8. */
  async function startPushAfterBench() {
    await seedPush(
      '2026-11-20T10:00:00.000Z',
      BENCH_ROW,
      BENCH.id,
      benchAt(80, [8, 8, 7]),
    );
    const user = userEvent.setup();
    await openApp('/', signedInAn);
    await user.click(await screen.findByRole('button', { name: 'Start Push' }));
    await screen.findByRole('heading', { name: 'Push' });
    return user;
  }

  async function logReps(
    user: ReturnType<typeof userEvent.setup>,
    reps: number,
    n: number,
  ) {
    const input = screen.getByRole('textbox', { name: 'Reps' });
    await user.clear(input);
    await user.type(input, String(reps));
    await user.click(screen.getByRole('button', { name: `Log set ${n}` }));
    await screen.findByRole('button', { name: `Log set ${n + 1}` });
  }

  const weightBox = () =>
    screen.getByRole('textbox', { name: 'Weight (total)' });
  const backOffs = async () =>
    (await suggestionsInOutbox()).filter((s) => s.kind === 'back_off');

  it('set dưới sàn: gợi ý giảm một step ngay sau khi ghi, offline, điền sẵn các set còn lại; ghi pending qua outbox', async () => {
    const user = await startPushAfterBench();
    expect(weightBox()).toHaveValue('80');

    await logReps(user, 4, 1);

    const tip = await screen.findByRole('note', {
      name: /under your 6 minimum/,
    });
    expect(text(tip)).toContain(
      'That set was 4 reps, under your 6 minimum. Drop to 77.5 kg for the last 2 sets and keep your form tight.',
    );
    expect(
      within(tip).getByRole('button', { name: 'OK, 77.5 kg' }),
    ).toBeInTheDocument();
    expect(
      within(tip).getByRole('button', { name: 'Keep 80 kg' }),
    ).toBeInTheDocument();
    expect(weightBox()).toHaveValue('77.5');
    const sets = screen.getByRole('list', { name: 'Working sets' });
    expect(text(within(sets).getAllByRole('listitem')[2]!)).toContain('77.5');
    expect(await backOffs()).toEqual([
      expect.objectContaining({
        exerciseId: BENCH.id,
        routineExerciseId: BENCH_ROW,
        sessionExerciseId: expect.any(String),
        kind: 'back_off',
        strength: 'strong',
        reason: 'under_min',
        payload: { reps: 4, min: 6, from: 80, to: 77.5, sets: 2 },
        status: 'pending',
        respondedAt: null,
      }),
    ]);
  });

  it('set trong rep range: không gợi ý back-off', async () => {
    const user = await startPushAfterBench();
    await logReps(user, 6, 1);
    expect(screen.queryByRole('note', { name: /minimum/ })).toBeNull();
    expect(weightBox()).toHaveValue('80');
    expect(await backOffs()).toEqual([]);
  });

  it('OK: accepted, gợi ý ẩn, các set sau vẫn ở mức back-off', async () => {
    const user = await startPushAfterBench();
    await logReps(user, 4, 1);
    const tip = await screen.findByRole('note', {
      name: /under your 6 minimum/,
    });

    await user.click(within(tip).getByRole('button', { name: 'OK, 77.5 kg' }));

    await screen.findByRole('note', { name: /^Last time/ });
    expect(weightBox()).toHaveValue('77.5');
    expect(await backOffs()).toEqual([
      expect.objectContaining({
        status: 'accepted',
        respondedAt: expect.any(String),
      }),
    ]);
    await logReps(user, 6, 2);
    expect(weightBox()).toHaveValue('77.5');
  });

  it('Keep: dismissed, ô tạ trở về mức cũ', async () => {
    const user = await startPushAfterBench();
    await logReps(user, 4, 1);
    const tip = await screen.findByRole('note', {
      name: /under your 6 minimum/,
    });

    await user.click(within(tip).getByRole('button', { name: 'Keep 80 kg' }));

    await screen.findByRole('note', { name: /^Last time/ });
    expect(weightBox()).toHaveValue('80');
    expect(await backOffs()).toEqual([
      expect.objectContaining({ status: 'dismissed' }),
    ]);
  });

  it('ghi set kế khi chưa trả lời: ghi đúng mức back-off là accepted', async () => {
    const user = await startPushAfterBench();
    await logReps(user, 4, 1);
    await screen.findByRole('note', { name: /under your 6 minimum/ });

    await logReps(user, 6, 2);

    expect(await backOffs()).toEqual([
      expect.objectContaining({ status: 'accepted' }),
    ]);
  });

  it('ghi set kế khi chưa trả lời ở mức khác: dismissed', async () => {
    const user = await startPushAfterBench();
    await logReps(user, 4, 1);
    await screen.findByRole('note', { name: /under your 6 minimum/ });
    await user.clear(weightBox());
    await user.type(weightBox(), '80');

    await logReps(user, 6, 2);

    expect(await backOffs()).toEqual([
      expect.objectContaining({ status: 'dismissed' }),
    ]);
  });

  it('set cuối của bài dưới sàn: không còn set nào nên không gợi ý', async () => {
    const user = await startPushAfterBench();
    await logReps(user, 8, 1);
    await logReps(user, 8, 2);
    const input = screen.getByRole('textbox', { name: 'Reps' });
    await user.clear(input);
    await user.type(input, '4');
    await user.click(screen.getByRole('button', { name: 'Log set 3' }));
    // Xong bài thì màn chuyển sang bài kế.
    await screen.findByRole('button', { name: 'Log set 1' });
    expect(await backOffs()).toEqual([]);
  });

  it('kết thúc buổi khi back-off chưa trả lời: expired', async () => {
    const user = await startPushAfterBench();
    await logReps(user, 4, 1);
    await screen.findByRole('note', { name: /under your 6 minimum/ });

    await user.click(screen.getByRole('button', { name: 'Finish' }));
    await user.click(
      await screen.findByRole('button', { name: 'Finish workout' }),
    );

    await screen.findByRole('button', { name: 'Start Push' });
    expect(await backOffs()).toEqual([
      expect.objectContaining({ status: 'expired', respondedAt: null }),
    ]);
  });

  it('đóng rồi mở lại app: back-off pending vẫn hiện, ô tạ vẫn ở mức back-off', async () => {
    const user = await startPushAfterBench();
    await logReps(user, 4, 1);
    await screen.findByRole('note', { name: /under your 6 minimum/ });
    cleanup();
    await openApp('/workout', signedInAn);
    expect(
      await screen.findByRole('note', { name: /under your 6 minimum/ }),
    ).toBeInTheDocument();
    expect(weightBox()).toHaveValue('77.5');
  });

  it('bài chỉ reps dưới sàn: không back-off', async () => {
    const user = await startPushAfterBench();
    await user.click(screen.getByRole('button', { name: /^Pushups,/ }));
    const input = await screen.findByRole('textbox', { name: 'Reps' });
    await user.clear(input);
    await user.type(input, '5');
    await user.click(screen.getByRole('button', { name: 'Log set 1' }));
    await screen.findByRole('button', { name: 'Log set 2' });
    expect(await backOffs()).toEqual([]);
  });
});
