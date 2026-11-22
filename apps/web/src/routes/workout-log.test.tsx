import type {
  LoadInput,
  SessionExercise,
  SetLog,
  WorkoutSession,
} from '@fitness/contract';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from 'vitest';

import { AN, clearDb } from '@/auth/testing';
import { BENCH, CATALOG, PUSH_UP } from '@/catalog/testing';
import { db } from '@/db/db';
import { openApp } from '@/test/open-app';

const signedInAn = {
  stored: { kind: 'session', user: AN },
  owner: AN,
} as const;

beforeEach(async () => {
  // Catalog đã nằm trên máy từ lần mở app trước; giờ đang ở phòng gym, mất mạng.
  await db.exercises.bulkPut(CATALOG.exercises);
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await clearDb();
});

type User = ReturnType<typeof userEvent.setup>;

/** Today → bắt đầu tập tự do → màn ghi buổi tập. */
async function startFreestyle(user: User) {
  await user.click(
    await screen.findByRole('button', { name: 'Start freestyle' }),
  );
  await screen.findByRole('heading', { name: 'Freestyle' });
}

/** Thêm bài qua picker bằng cách gõ tìm. */
async function addExercise(user: User, query: string, name: RegExp) {
  await user.click(screen.getByRole('button', { name: 'Add exercise' }));
  await screen.findByRole('dialog', { name: 'Add an exercise' });
  await user.keyboard(query);
  await user.click(await screen.findByRole('button', { name }));
  // Bài vừa thêm thành bài hiện tại: tấm số áo mang tên bài.
  await screen.findByRole('region', { name });
}

/** Gõ số vào ô (xoá số cũ). */
async function type(user: User, label: string, value: string) {
  const input = screen.getByRole('textbox', { name: label });
  await user.clear(input);
  await user.type(input, value);
}

/** Các hàng set (đã ghi và đang chờ), dạng chữ "Set 1 80 × 8". */
function setRows() {
  const list = screen.getByRole('list', { name: 'Working sets' });
  return within(list)
    .queryAllByRole('listitem')
    .map((item) => item.textContent?.replace(/\s+/g, ' ').trim());
}

/** Các hàng set đã ghi (có dấu ✓ "Logged"). */
function loggedSets() {
  const list = screen.getByRole('list', { name: 'Working sets' });
  return within(list)
    .queryAllByRole('listitem')
    .filter((item) => within(item).queryByRole('img', { name: 'Logged' }))
    .map((item) => item.textContent?.replace(/\s+/g, ' ').trim());
}

/** Một set trong buổi cũ: [tạ, reps], tuỳ chọn loại set và đã xoá. */
interface PastSetSeed {
  weight: number | null;
  reps: number;
  setType?: SetLog['setType'];
  deleted?: boolean;
}

/**
 * Ghi thẳng vào máy một buổi cũ có một bài (lịch sử giả). Mặc định đã kết thúc 45 phút
 * sau khi bắt đầu, chưa xoá, ghi tổng tạ.
 */
async function seedPastWorkout(
  startedAt: string,
  exerciseId: string,
  sets: PastSetSeed[],
  {
    loadInput = 'total',
    deleted = false,
  }: { loadInput?: LoadInput; deleted?: boolean } = {},
) {
  const session: WorkoutSession = {
    id: crypto.randomUUID(),
    routineDayId: null,
    startedAt,
    endedAt: new Date(Date.parse(startedAt) + 45 * 60_000).toISOString(),
    notes: null,
    deletedAt: deleted ? startedAt : null,
  };
  const row: SessionExercise = {
    id: crypto.randomUUID(),
    sessionId: session.id,
    exerciseId,
    routineExerciseId: null,
    loadInput,
    position: 0,
    supersetGroup: null,
    deletedAt: null,
  };
  await db.workoutSessions.put(session);
  await db.sessionExercises.put(row);
  await db.setLogs.bulkPut(
    sets.map((s, setIndex) => ({
      id: crypto.randomUUID(),
      sessionExerciseId: row.id,
      setIndex,
      setType: s.setType ?? 'working',
      weightValue: s.weight,
      inputUnit: s.weight === null ? null : 'kg',
      reps: s.reps,
      durationS: null,
      distanceM: null,
      rpe: null,
      completedAt: startedAt,
      deletedAt: s.deleted ? startedAt : null,
    })),
  );
}

/** Ô "lần trước" dưới tấm số áo. */
function lastTime() {
  return screen
    .queryByRole('note', { name: /^Last time/ })
    ?.textContent?.replace(/\s+/g, ' ')
    .trim();
}

describe('tập tự do ghi trên máy', () => {
  it('ghi 3 set khi offline, reload: buổi và set còn nguyên, outbox đủ sự kiện theo thứ tự', async () => {
    const user = userEvent.setup();
    await openApp('/', signedInAn);

    await startFreestyle(user);
    await addExercise(user, 'bench', /Barbell Bench Press - Medium Grip/);

    // Bài ad hoc có sẵn 3 set chờ tập; set đầu chưa có gì để điền sẵn (R8).
    expect(
      await screen.findByRole('textbox', { name: 'Weight (total)' }),
    ).toHaveValue('');
    expect(screen.getByText('Set 1/3')).toBeInTheDocument();
    expect(setRows()).toEqual([
      'Set 1 – × – now',
      'Set 2 – × –',
      'Set 3 – × –',
    ]);
    await type(user, 'Weight (total)', '80');
    await type(user, 'Reps', '8');
    await user.click(screen.getByRole('button', { name: 'Log set 1' }));

    // Set sau điền sẵn số của set vừa ghi.
    expect(
      await screen.findByRole('button', { name: 'Log set 2' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Reps' })).toHaveValue('8');
    await user.click(screen.getByRole('button', { name: 'Log set 2' }));
    const logSet3 = await screen.findByRole('button', { name: 'Log set 3' });
    await user.click(screen.getByRole('button', { name: 'One rep fewer' }));
    await user.click(logSet3);
    // Hết set dự định: tấm số áo báo xong, nút đáy mời kết thúc buổi.
    expect(
      await screen.findByText(
        'Every set of Barbell Bench Press - Medium Grip is done.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Finish workout' }),
    ).toBeInTheDocument();

    expect(loggedSets()).toEqual([
      'Set 1 80 × 8',
      'Set 2 80 × 8',
      'Set 3 80 × 7',
    ]);
    expect(screen.getByText('Offline · 5 changes')).toBeInTheDocument();

    // Đóng tab rồi mở lại.
    cleanup();
    await openApp('/', signedInAn);

    const resume = await screen.findByRole('link', {
      name: /Workout in progress: Freestyle/,
    });
    expect(resume).toHaveTextContent('3 sets logged');
    await user.click(resume);
    await screen.findByRole('heading', { name: 'Freestyle' });
    expect(
      screen.getByRole('button', { name: /Barbell Bench Press/ }),
    ).toBeInTheDocument();
    expect(loggedSets()).toEqual([
      'Set 1 80 × 8',
      'Set 2 80 × 8',
      'Set 3 80 × 7',
    ]);

    // Outbox: tạo buổi, thêm bài, 3 set, đúng thứ tự ghi, payload là bản ghi đầy đủ.
    const events = await db.outbox.orderBy('seq').toArray();
    expect(events.map((e) => e.entity)).toEqual([
      'workout_sessions',
      'session_exercises',
      'set_logs',
      'set_logs',
      'set_logs',
    ]);
    expect(events[1].payload).toMatchObject({
      exerciseId: BENCH.id,
      loadInput: 'total',
      routineExerciseId: null,
    });
    expect(events[4].payload).toMatchObject({
      weightValue: 80,
      inputUnit: 'kg',
      reps: 7,
      setIndex: 2,
    });
  });

  it('sửa rồi xoá set trong buổi đang mở: mỗi thay đổi một sự kiện outbox, xoá là tombstone', async () => {
    const user = userEvent.setup();
    await openApp('/', signedInAn);
    await startFreestyle(user);
    await addExercise(user, 'squat', /Barbell Squat/);
    await type(user, 'Weight (total)', '100');
    await type(user, 'Reps', '5');
    await user.click(screen.getByRole('button', { name: 'Log set 1' }));
    await user.click(await screen.findByRole('button', { name: 'Log set 2' }));
    await screen.findByRole('button', { name: 'Log set 3' });

    // Sửa set 1: 100 × 5 → 102,5 × 5 bằng nút +. Chỉ có một nút lưu ở đáy.
    await user.click(screen.getByRole('button', { name: /^Set 1/ }));
    expect(
      await screen.findByText('Edit set 1 · Barbell Squat'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cancel' }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Increase by 2.5 kg' }),
    );
    await user.click(screen.getByRole('button', { name: 'Save set 1' }));
    await waitFor(() =>
      expect(loggedSets()).toEqual(['Set 1 102.5 × 5', 'Set 2 100 × 5']),
    );

    // Chạm hàng chờ thì thoát sửa mà không lưu.
    await user.click(screen.getByRole('button', { name: /^Set 2/ }));
    await user.click(screen.getByRole('button', { name: 'One rep fewer' }));
    await user.click(screen.getByRole('button', { name: /^Set 3/ }));
    expect(
      await screen.findByRole('button', { name: 'Log set 3' }),
    ).toBeInTheDocument();
    expect(loggedSets()).toEqual(['Set 1 102.5 × 5', 'Set 2 100 × 5']);

    // Xoá set 2.
    await user.click(screen.getByRole('button', { name: /^Set 2/ }));
    await user.click(screen.getByRole('button', { name: 'Delete set 2' }));
    await screen.findByRole('button', { name: 'Log set 2' });
    await waitFor(() => expect(loggedSets()).toEqual(['Set 1 102.5 × 5']));

    const events = await db.outbox.orderBy('seq').toArray();
    expect(events.map((e) => e.entity)).toEqual([
      'workout_sessions',
      'session_exercises',
      'set_logs',
      'set_logs',
      'set_logs',
      'set_logs',
    ]);
    const [, , first, second, edited, deleted] = events;
    expect(edited.entityId).toBe(first.entityId);
    expect(edited.payload).toMatchObject({ weightValue: 102.5, reps: 5 });
    expect(deleted.entityId).toBe(second.entityId);
    expect(deleted.op).toBe('upsert');
    expect(deleted.payload).toMatchObject({ deletedAt: expect.any(String) });
  });

  it('xoá set rồi Undo: set quay lại, outbox có sự kiện xoá và khôi phục', async () => {
    const user = userEvent.setup();
    await openApp('/', signedInAn);
    await startFreestyle(user);
    await addExercise(user, 'squat', /Barbell Squat/);
    await type(user, 'Weight (total)', '100');
    await type(user, 'Reps', '5');
    await user.click(screen.getByRole('button', { name: 'Log set 1' }));
    await screen.findByRole('button', { name: 'Log set 2' });

    await user.click(screen.getByRole('button', { name: /^Set 1/ }));
    await user.click(
      await screen.findByRole('button', { name: 'Delete set 1' }),
    );
    expect(await screen.findByText('Set 1 deleted.')).toBeInTheDocument();
    await waitFor(() => expect(loggedSets()).toEqual([]));

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(loggedSets()).toEqual(['Set 1 100 × 5']));

    const sets = (await db.outbox.orderBy('seq').toArray()).filter(
      (e) => e.entity === 'set_logs',
    );
    expect(
      sets.map((e) => (e.payload as { deletedAt: unknown }).deletedAt),
    ).toEqual([null, expect.any(String), null]);
  });

  it('sửa set cũ: set chuẩn bị tập giữ nguyên số đã điền sẵn và số user vừa chỉnh', async () => {
    const user = userEvent.setup();
    await openApp('/', signedInAn);
    await startFreestyle(user);
    await addExercise(user, 'squat', /Barbell Squat/);
    await type(user, 'Weight (total)', '100');
    await type(user, 'Reps', '5');
    await user.click(screen.getByRole('button', { name: 'Log set 1' }));
    await screen.findByRole('button', { name: 'Log set 2' });
    // Chỉnh trước số cho set 2 rồi mới quay lại sửa set 1.
    await user.click(screen.getByRole('button', { name: 'One rep fewer' }));

    await user.click(screen.getByRole('button', { name: /^Set 1/ }));
    await screen.findByText('Edit set 1 · Barbell Squat');
    expect(screen.getByRole('textbox', { name: 'Reps' })).toHaveValue('5');
    expect(setRows()[1]).toBe('Set 2 100 × 4');

    // Thoát sửa: ô nhập về đúng số đã chỉnh cho set 2.
    await user.click(screen.getByRole('button', { name: /^Set 2/ }));
    await screen.findByRole('button', { name: 'Log set 2' });
    expect(screen.getByRole('textbox', { name: 'Reps' })).toHaveValue('4');
  });

  it('thêm set ngoài 3 set có sẵn', async () => {
    const user = userEvent.setup();
    await openApp('/', signedInAn);
    await startFreestyle(user);
    await addExercise(user, 'bench', /Barbell Bench Press - Medium Grip/);
    await type(user, 'Weight (total)', '60');
    await type(user, 'Reps', '10');
    for (const n of [1, 2, 3]) {
      await user.click(
        await screen.findByRole('button', { name: `Log set ${n}` }),
      );
    }
    await screen.findByText(/is done/);

    await user.click(screen.getAllByRole('button', { name: 'Add set' })[0]);
    expect(
      await screen.findByRole('button', { name: 'Log set 4' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Set 4/4')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Reps' })).toHaveValue('10');
  });

  it('bài chỉ reps: chỉ có ô reps, set ghi không có tạ và đơn vị', async () => {
    await db.exercises.put(PUSH_UP);
    const user = userEvent.setup();
    await openApp('/', signedInAn);
    await startFreestyle(user);
    await addExercise(user, 'hit dat', /Pushups/);

    await type(user, 'Reps', '15');
    expect(
      screen.queryByRole('textbox', { name: /Weight/ }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Log set 1' }));
    await waitFor(() => expect(loggedSets()).toEqual(['Set 1 15 reps']));

    const [, exercise, set] = await db.outbox.orderBy('seq').toArray();
    expect(exercise.payload).toMatchObject({ loadInput: 'added_weight' });
    expect(set.payload).toMatchObject({
      weightValue: null,
      inputUnit: null,
      reps: 15,
    });
  });

  it('kết thúc buổi: ghi endedAt, về Today, không còn thanh tiếp tục', async () => {
    const user = userEvent.setup();
    await openApp('/', signedInAn);
    await startFreestyle(user);
    await addExercise(user, 'bench', /Barbell Bench Press - Medium Grip/);
    await type(user, 'Weight (total)', '60');
    await type(user, 'Reps', '10');
    await user.click(screen.getByRole('button', { name: 'Log set 1' }));
    await screen.findByRole('button', { name: 'Log set 2' });

    await user.click(screen.getByRole('button', { name: 'Finish' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Finish workout?',
    });
    expect(dialog).toHaveTextContent('1 set logged');
    await user.click(
      within(dialog).getByRole('button', { name: 'Finish workout' }),
    );

    expect(
      await screen.findByRole('button', { name: 'Start freestyle' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Workout in progress/ }),
    ).not.toBeInTheDocument();
    const last = (await db.outbox.orderBy('seq').last())!;
    expect(last.entity).toBe('workout_sessions');
    expect(last.payload).toMatchObject({ endedAt: expect.any(String) });
  });

  it('không có buổi đang mở: vào thẳng màn ghi buổi thì về Today', async () => {
    await openApp('/workout', signedInAn);
    expect(
      await screen.findByRole('button', { name: 'Start freestyle' }),
    ).toBeInTheDocument();
  });
});

describe('số liệu lần trước', () => {
  it('hiện các working set của buổi gần nhất có bài, điền sẵn từng set theo lần trước', async () => {
    await seedPastWorkout('2026-11-12T10:00:00.000Z', BENCH.id, [
      { weight: 70, reps: 10 },
    ]);
    await seedPastWorkout('2026-11-19T10:00:00.000Z', BENCH.id, [
      { weight: 40, reps: 8, setType: 'warmup' },
      { weight: 80, reps: 8 },
      { weight: 80, reps: 8 },
      { weight: 80, reps: 7 },
    ]);
    const user = userEvent.setup();
    await openApp('/', signedInAn);
    await startFreestyle(user);
    await addExercise(user, 'bench', /Barbell Bench Press - Medium Grip/);

    expect(lastTime()).toBe('Last time · Nov 19 80×8 · 8 · 7');
    expect(screen.getByRole('textbox', { name: 'Weight (total)' })).toHaveValue(
      '80',
    );
    expect(screen.getByRole('textbox', { name: 'Reps' })).toHaveValue('8');
    expect(setRows()).toEqual([
      'Set 1 80 × 8 now',
      'Set 2 80 × 8',
      'Set 3 80 × 7',
    ]);

    // User sửa set đầu; set sau vẫn điền theo đúng set đó của lần trước.
    await type(user, 'Weight (total)', '82.5');
    await user.click(screen.getByRole('button', { name: 'Log set 1' }));
    await user.click(await screen.findByRole('button', { name: 'Log set 2' }));
    await screen.findByRole('button', { name: 'Log set 3' });
    expect(screen.getByRole('textbox', { name: 'Reps' })).toHaveValue('7');
    expect(loggedSets()).toEqual(['Set 1 82.5 × 8', 'Set 2 80 × 8']);
    // Buổi đang mở không thành "lần trước" dù vừa có set mới hơn.
    expect(lastTime()).toBe('Last time · Nov 19 80×8 · 8 · 7');
  });

  it('bỏ qua buổi đã xoá, set đã xoá và buổi không còn working set', async () => {
    await seedPastWorkout('2026-11-10T10:00:00.000Z', BENCH.id, [
      { weight: 75, reps: 9 },
      { weight: 75, reps: 6, deleted: true },
      { weight: 75, reps: 8 },
    ]);
    await seedPastWorkout('2026-11-15T10:00:00.000Z', BENCH.id, [
      { weight: 40, reps: 8, setType: 'warmup' },
      { weight: 80, reps: 8, deleted: true },
    ]);
    await seedPastWorkout(
      '2026-11-18T10:00:00.000Z',
      BENCH.id,
      [{ weight: 90, reps: 5 }],
      { deleted: true },
    );
    const user = userEvent.setup();
    await openApp('/', signedInAn);
    await startFreestyle(user);
    await addExercise(user, 'bench', /Barbell Bench Press - Medium Grip/);

    expect(lastTime()).toBe('Last time · Nov 10 75×9 · 8');
    expect(setRows()).toEqual([
      'Set 1 75 × 9 now',
      'Set 2 75 × 8',
      'Set 3 75 × 8',
    ]);
  });

  it('lần trước ghi tạ theo quy ước khác: hiện kèm quy ước đó, không điền sẵn', async () => {
    await seedPastWorkout(
      '2026-11-19T10:00:00.000Z',
      BENCH.id,
      [
        { weight: 30, reps: 10 },
        { weight: 32.5, reps: 8 },
      ],
      { loadInput: 'per_side' },
    );
    const user = userEvent.setup();
    await openApp('/', signedInAn);
    await startFreestyle(user);
    await addExercise(user, 'bench', /Barbell Bench Press - Medium Grip/);

    expect(lastTime()).toBe('Last time · Nov 19 · per side 30×10 · 32.5×8');
    expect(screen.getByRole('textbox', { name: 'Weight (total)' })).toHaveValue(
      '',
    );
    expect(screen.getByRole('textbox', { name: 'Reps' })).toHaveValue('');
    expect(setRows()).toEqual([
      'Set 1 – × – now',
      'Set 2 – × –',
      'Set 3 – × –',
    ]);
  });

  it('lần trước nhiều mức tạ: chỉ ghi lại mức tạ khi đổi so với set trước', async () => {
    await seedPastWorkout('2026-11-19T10:00:00.000Z', BENCH.id, [
      { weight: 100, reps: 3 },
      { weight: 95, reps: 4 },
      { weight: 80, reps: 10 },
      { weight: 80, reps: 8 },
    ]);
    const user = userEvent.setup();
    await openApp('/', signedInAn);
    await startFreestyle(user);
    await addExercise(user, 'bench', /Barbell Bench Press - Medium Grip/);

    expect(lastTime()).toBe('Last time · Nov 19 100×3 · 95×4 · 80×10 · 8');
  });

  it('bài chỉ reps: hiện và điền sẵn reps của lần trước', async () => {
    await db.exercises.put(PUSH_UP);
    await seedPastWorkout(
      '2026-11-19T10:00:00.000Z',
      PUSH_UP.id,
      [
        { weight: null, reps: 15 },
        { weight: null, reps: 12 },
      ],
      { loadInput: 'added_weight' },
    );
    const user = userEvent.setup();
    await openApp('/', signedInAn);
    await startFreestyle(user);
    await addExercise(user, 'pushups', /Pushups/);

    expect(lastTime()).toBe('Last time · Nov 19 15 · 12');
    expect(screen.getByRole('textbox', { name: 'Reps' })).toHaveValue('15');
    expect(setRows()).toEqual([
      'Set 1 15 reps now',
      'Set 2 12 reps',
      'Set 3 12 reps',
    ]);
  });

  it('bài chưa có lịch sử: không hiện lần trước', async () => {
    const user = userEvent.setup();
    await openApp('/', signedInAn);
    await startFreestyle(user);
    await addExercise(user, 'bench', /Barbell Bench Press - Medium Grip/);

    expect(lastTime()).toBeUndefined();
  });
});

describe('đồng hồ nghỉ', () => {
  const T0 = Date.parse('2026-11-22T10:00:00.000Z');

  beforeEach(() => {
    // Chỉ làm giả đồng hồ ngày giờ; Dexie và userEvent vẫn chạy timer thật.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Giả lập user đưa app xuống nền rồi mở lại sau `ms`. */
  function comeBackAfter(ms: number) {
    vi.setSystemTime(Date.now() + ms);
    document.dispatchEvent(new Event('visibilitychange'));
  }

  function restClock() {
    return screen.queryByRole('timer', { name: 'Rest' })?.textContent;
  }

  /** Mở buổi tự do có bench press, ghi set 1 là 80 × 8. */
  async function logFirstSet(user: User) {
    await openApp('/', signedInAn);
    await startFreestyle(user);
    await addExercise(user, 'bench', /Barbell Bench Press - Medium Grip/);
    await type(user, 'Weight (total)', '80');
    await type(user, 'Reps', '8');
    await user.click(screen.getByRole('button', { name: 'Log set 1' }));
  }

  it('ghi set xong tự nghỉ 2:00; xuống nền rồi mở lại vẫn đúng giờ còn lại; ghi set tiếp được khi đang nghỉ', async () => {
    const user = userEvent.setup();
    await logFirstSet(user);

    // Bài ad hoc không có rest_seconds của routine: nghỉ mặc định 2 phút.
    await waitFor(() => expect(restClock()).toBe('2:00'));

    comeBackAfter(45_000);
    await waitFor(() => expect(restClock()).toBe('1:15'));

    // Timer không chặn việc ghi set tiếp theo.
    const logSet2 = screen.getByRole('button', { name: 'Log set 2' });
    expect(logSet2).toBeEnabled();
    await user.click(logSet2);
    await screen.findByRole('button', { name: 'Log set 3' });
    // Ghi set mới thì bắt đầu lượt nghỉ mới.
    await waitFor(() => expect(restClock()).toBe('2:00'));
  });

  it('cộng thêm 30 giây rồi bỏ qua nghỉ bất cứ lúc nào', async () => {
    const user = userEvent.setup();
    await logFirstSet(user);
    await waitFor(() => expect(restClock()).toBe('2:00'));

    comeBackAfter(20_000);
    await user.click(screen.getByRole('button', { name: '+30 sec' }));
    await waitFor(() => expect(restClock()).toBe('2:10'));

    await user.click(screen.getByRole('button', { name: 'Skip' }));
    await waitFor(() => expect(restClock()).toBeUndefined());
    expect(
      screen.queryByRole('button', { name: 'Skip' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Set 2/3')).toBeInTheDocument();
  });

  it('hết giờ khi app đang mở: báo hết giờ, rung trên máy có Vibration API, dải về set kế tiếp', async () => {
    const vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrate,
      configurable: true,
    });
    onTestFinished(() => {
      Reflect.deleteProperty(navigator, 'vibrate');
    });
    const user = userEvent.setup();
    await logFirstSet(user);
    await waitFor(() => expect(restClock()).toBe('2:00'));

    comeBackAfter(120_000);
    expect(await screen.findByText('Rest is over.')).toBeInTheDocument();
    expect(restClock()).toBeUndefined();
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Set 2/3')).toBeInTheDocument();
  });

  it('máy không có Vibration API (iOS): vẫn báo hết giờ', async () => {
    expect('vibrate' in navigator).toBe(false);
    const user = userEvent.setup();
    await logFirstSet(user);
    await waitFor(() => expect(restClock()).toBe('2:00'));

    comeBackAfter(121_000);
    expect(await screen.findByText('Rest is over.')).toBeInTheDocument();
    expect(restClock()).toBeUndefined();
  });

  it('set cuối của cả buổi không nghỉ; lưu set đang sửa không bắt đầu nghỉ', async () => {
    const user = userEvent.setup();
    await logFirstSet(user);
    await user.click(await screen.findByRole('button', { name: 'Log set 2' }));
    await user.click(await screen.findByRole('button', { name: 'Log set 3' }));

    await screen.findByRole('button', { name: 'Finish workout' });
    await waitFor(() => expect(restClock()).toBeUndefined());

    await user.click(screen.getByRole('button', { name: /^Set 1/ }));
    await user.click(await screen.findByRole('button', { name: 'Save set 1' }));
    await screen.findByRole('button', { name: 'Finish workout' });
    expect(restClock()).toBeUndefined();
  });

  it('tạm dừng: đồng hồ đứng yên kể cả khi đóng app; chạy tiếp thì đếm tiếp; ghi set mới thì bỏ tạm dừng', async () => {
    const user = userEvent.setup();
    await logFirstSet(user);
    await waitFor(() => expect(restClock()).toBe('2:00'));

    comeBackAfter(30_000);
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    await waitFor(() => expect(restClock()).toBe('1:30'));

    // Đang dừng: 10 phút sau vẫn còn 1:30, cộng thêm vẫn được.
    comeBackAfter(10 * 60_000);
    await user.click(screen.getByRole('button', { name: '+30 sec' }));
    await waitFor(() => expect(restClock()).toBe('2:00'));

    // Hệ điều hành đóng app khi đang dừng: mở lại vẫn dừng ở 2:00.
    cleanup();
    vi.setSystemTime(Date.now() + 60_000);
    await openApp('/', signedInAn);
    await user.click(
      await screen.findByRole('link', { name: /Workout in progress/ }),
    );
    await waitFor(() => expect(restClock()).toBe('2:00'));

    await user.click(screen.getByRole('button', { name: 'Resume' }));
    comeBackAfter(15_000);
    await waitFor(() => expect(restClock()).toBe('1:45'));

    await user.click(screen.getByRole('button', { name: 'Pause' }));
    await user.click(screen.getByRole('button', { name: 'Log set 2' }));
    await screen.findByRole('button', { name: 'Log set 3' });
    await waitFor(() => expect(restClock()).toBe('2:00'));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('app bị đóng giữa lúc nghỉ: mở lại buổi vẫn đúng giờ nghỉ còn lại', async () => {
    const user = userEvent.setup();
    await logFirstSet(user);
    await waitFor(() => expect(restClock()).toBe('2:00'));

    // Hệ điều hành đóng app khi đang ở nền; 50 giây sau user mở lại.
    cleanup();
    vi.setSystemTime(Date.now() + 50_000);
    await openApp('/', signedInAn);
    await user.click(
      await screen.findByRole('link', { name: /Workout in progress/ }),
    );
    await waitFor(() => expect(restClock()).toBe('1:10'));
  });

  it('quay lại app lâu sau khi hết giờ: không báo muộn, dải về set kế tiếp', async () => {
    const vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrate,
      configurable: true,
    });
    onTestFinished(() => {
      Reflect.deleteProperty(navigator, 'vibrate');
    });
    const user = userEvent.setup();
    await logFirstSet(user);
    await waitFor(() => expect(restClock()).toBe('2:00'));

    comeBackAfter(10 * 60_000);
    await waitFor(() => expect(restClock()).toBeUndefined());
    expect(screen.getByText('Set 2/3')).toBeInTheDocument();
    expect(vibrate).not.toHaveBeenCalled();
    expect(screen.queryByText('Rest is over.')).not.toBeInTheDocument();
  });
});

describe('giữ màn hình sáng', () => {
  it('xin Screen Wake Lock khi vào buổi tập, xin lại khi quay lại app, nhả khi kết thúc buổi', async () => {
    const locks: { released: boolean; release: () => Promise<void> }[] = [];
    const request = vi.fn(() => {
      const lock = {
        released: false,
        release: vi.fn(() => {
          lock.released = true;
          return Promise.resolve();
        }),
      };
      locks.push(lock);
      return Promise.resolve(lock);
    });
    Object.defineProperty(navigator, 'wakeLock', {
      value: { request },
      configurable: true,
    });
    onTestFinished(() => {
      Reflect.deleteProperty(navigator, 'wakeLock');
    });
    const visibility = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('visible');

    const user = userEvent.setup();
    await openApp('/', signedInAn);
    expect(request).not.toHaveBeenCalled();
    await startFreestyle(user);
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(request).toHaveBeenCalledWith('screen');

    // Xuống nền: trình duyệt tự nhả khoá. Quay lại app: xin lại.
    visibility.mockReturnValue('hidden');
    locks[0].released = true;
    document.dispatchEvent(new Event('visibilitychange'));
    visibility.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));

    await user.click(screen.getByRole('button', { name: 'Finish' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Finish workout?',
    });
    await user.click(
      within(dialog).getByRole('button', { name: 'Finish workout' }),
    );
    await screen.findByRole('button', { name: 'Start freestyle' });
    expect(locks[1].release).toHaveBeenCalledTimes(1);
  });
});
