import type {
  SessionExercise,
  SetLog,
  SyncEvent,
  SyncPullResponse,
  WorkoutSession,
} from '@fitness/contract';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AN, clearDb, PASSWORD } from '@/auth/testing';
import { BENCH, CATALOG, SQUAT } from '@/catalog/testing';
import { db, type SyncReject } from '@/db/db';
import { updateSet } from '@/workout/session';
import { openApp } from '@/test/open-app';

beforeEach(async () => {
  await db.exercises.bulkPut(CATALOG.exercises);
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await clearDb();
});

const signedInAn = {
  stored: { kind: 'session', user: AN },
  owner: AN,
} as const;

let nextId = 1;
const uuid = () =>
  `00000000-0000-4000-9000-${String(nextId++).padStart(12, '0')}`;

const change = {
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
};

/**
 * Một buổi tự do đã kết thúc trên server: mỗi bài một danh sách set [tạ, reps].
 * Trả về bản ghi và các thay đổi theo thứ tự ghi.
 */
function serverWorkout(
  startedAt: string,
  exercises: { exerciseId: string; sets: [number, number][] }[],
) {
  const session: WorkoutSession = {
    id: uuid(),
    routineDayId: null,
    startedAt,
    endedAt: new Date(Date.parse(startedAt) + 45 * 60_000).toISOString(),
    notes: null,
    deletedAt: null,
  };
  const changes: SyncEvent[] = [change.session(session)];
  const sets: SetLog[] = [];
  exercises.forEach(({ exerciseId, sets: values }, position) => {
    const row: SessionExercise = {
      id: uuid(),
      sessionId: session.id,
      exerciseId,
      routineExerciseId: null,
      loadInput: 'total',
      position,
      supersetGroup: null,
      deletedAt: null,
    };
    changes.push(change.exercise(row));
    values.forEach(([weight, reps], setIndex) => {
      const set: SetLog = {
        id: uuid(),
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
      };
      sets.push(set);
      changes.push(change.set(set));
    });
  });
  return { session, sets, changes };
}

/**
 * GET /sync/pull giả: trả các thay đổi đã `publish` theo thứ tự, mỗi trang 2 thay đổi;
 * cursor là số thay đổi đã trả. Ghi lại các `since` đã nhận.
 */
function fakePullServer(initial: SyncEvent[] = []) {
  const log = [...initial];
  const pullChanges = vi.fn(
    async (since?: string): Promise<SyncPullResponse> => {
      const from = since ? Number(since) : 0;
      const changes = log.slice(from, from + 2);
      const to = from + changes.length;
      return {
        changes,
        cursor: to ? String(to) : null,
        hasMore: to < log.length,
      };
    },
  );
  return {
    pullChanges,
    /** Server có thêm thay đổi (vd từ máy khác). */
    publish: (...changes: SyncEvent[]) => log.push(...changes),
    sinces: () => pullChanges.mock.calls.map(([since]) => since),
  };
}

/** Các tuần trong History: tên danh sách và nội dung từng dòng. */
const historyWeeks = () =>
  screen.queryAllByRole('list', { name: /^Week of/ }).map((list) => ({
    week: list.getAttribute('aria-label'),
    rows: within(list)
      .getAllByRole('link')
      .map((row) => row.textContent),
  }));
const historyRows = () =>
  screen
    .queryAllByRole('list', { name: /^Week of/ })
    .flatMap((list) => within(list).getAllByRole('link'));

/** Các hàng set của một bài trong chi tiết buổi. */
const setRows = (exercise: string) =>
  within(screen.getByRole('list', { name: exercise }))
    .getAllByRole('listitem')
    .map((item) => item.textContent);

/** Buổi đã có sẵn trên máy (đã kéo về trước đó), không còn gì chờ đẩy. */
async function seedLocal(w: ReturnType<typeof serverWorkout>) {
  for (const { entity, payload } of w.changes) {
    if (entity === 'workout_sessions')
      await db.workoutSessions.put(payload as WorkoutSession);
    if (entity === 'session_exercises')
      await db.sessionExercises.put(payload as SessionExercise);
    if (entity === 'set_logs') await db.setLogs.put(payload as SetLog);
  }
}

/** Các sự kiện outbox chờ đẩy: bảng, id và bản ghi. */
const outboxEvents = async () =>
  (await db.outbox.orderBy('seq').toArray()).map(
    ({ entity, entityId, payload }) => ({ entity, entityId, payload }),
  );

describe('lịch sử buổi tập', () => {
  it('máy trống: đăng nhập xong, History hiện lại các buổi trên server, nhóm theo tuần, mới nhất trước', async () => {
    const user = userEvent.setup();
    const lastWeek = serverWorkout('2026-11-10T10:00:00.000Z', [
      { exerciseId: SQUAT.id, sets: [[100, 5]] },
    ]);
    const older = serverWorkout('2026-11-17T10:00:00.000Z', [
      { exerciseId: SQUAT.id, sets: [[100, 5]] },
    ]);
    const newer = serverWorkout('2026-11-19T10:00:00.000Z', [
      {
        exerciseId: BENCH.id,
        sets: [
          [80, 8],
          [80, 7],
        ],
      },
      { exerciseId: SQUAT.id, sets: [[100, 5]] },
    ]);
    const server = fakePullServer([
      ...lastWeek.changes,
      ...older.changes,
      ...newer.changes,
    ]);
    const app = await openApp('/sign-in', {
      pullChanges: server.pullChanges,
    });

    await user.type(await screen.findByLabelText('Email'), AN.email);
    await user.type(screen.getByLabelText('Password'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByRole('heading', { name: 'Today' });
    await app.router.navigate('/history');

    await waitFor(() => expect(historyRows()).toHaveLength(3));
    expect(historyWeeks()).toEqual([
      {
        week: 'Week of Nov 16 to Nov 22',
        rows: [
          '19ThuFreestyle3 working sets · 45 min',
          '17TueFreestyle1 working set · 45 min',
        ],
      },
      {
        week: 'Week of Nov 9 to Nov 15',
        rows: ['10TueFreestyle1 working set · 45 min'],
      },
    ]);

    await user.click(historyRows()[0]);
    expect(
      await screen.findByRole('heading', { name: 'Freestyle' }),
    ).toBeInTheDocument();
    const bench = screen.getByRole('list', {
      name: 'Barbell Bench Press - Medium Grip',
    });
    expect(
      within(bench)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Set 180 × 8', 'Set 280 × 7']);
    expect(
      within(screen.getByRole('list', { name: 'Barbell Squat' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Set 1100 × 5']);
  });

  it('chưa có buổi nào kết thúc: báo trống, dẫn về Today', async () => {
    const user = userEvent.setup();
    await openApp('/history', {
      ...signedInAn,
      pullChanges: fakePullServer().pullChanges,
    });

    expect(await screen.findByText('No workouts yet')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Go to Today' }));
    expect(
      await screen.findByRole('heading', { name: 'Today' }),
    ).toBeInTheDocument();
  });

  it('buổi bị xoá trên server biến mất trên máy; lần kéo sau đi tiếp từ cursor đã lưu', async () => {
    const kept = serverWorkout('2026-11-17T10:00:00.000Z', [
      { exerciseId: SQUAT.id, sets: [[100, 5]] },
    ]);
    const gone = serverWorkout('2026-11-19T10:00:00.000Z', [
      { exerciseId: BENCH.id, sets: [[80, 8]] },
    ]);
    const server = fakePullServer([...kept.changes, ...gone.changes]);
    const app = await openApp('/history', {
      ...signedInAn,
      pullChanges: server.pullChanges,
    });
    await waitFor(() => expect(historyRows()).toHaveLength(2));

    // Máy khác xoá buổi (tombstone); user quay lại app.
    server.publish(
      change.session({
        ...gone.session,
        deletedAt: '2026-11-20T08:00:00.000Z',
      }),
    );
    app.becomeVisible();

    await waitFor(() => expect(historyRows()).toHaveLength(1));
    expect(historyRows()[0]).toHaveTextContent(/^17Tue/);
    // Lần kéo đầu đi hết 3 trang từ đầu; lần sau đi tiếp từ cursor, không kéo lại từ đầu.
    expect(server.sinces()).toEqual([undefined, '2', '4', '6']);
  });

  it('kéo không ghi đè thay đổi trên máy còn chờ đẩy hay bị server từ chối', async () => {
    const w = serverWorkout('2026-11-19T10:00:00.000Z', [
      {
        exerciseId: BENCH.id,
        sets: [
          [80, 8],
          [80, 7],
        ],
      },
    ]);
    const [first, second] = w.sets;
    // Trên máy đã có buổi; set 2 sửa thành 80 × 6 nhưng server từ chối (syncRejects).
    const rejected = { ...second, reps: 6 };
    await db.workoutSessions.put(w.session);
    await db.sessionExercises.put(w.changes[1].payload as SessionExercise);
    await db.setLogs.bulkPut([first, rejected]);
    await db.syncRejects.add({
      event: {
        seq: 1,
        entity: 'set_logs',
        entityId: rejected.id,
        op: 'upsert',
        payload: rejected,
        createdAt: 0,
        attempts: 0,
      },
      code: 'forbidden',
      rejectedAt: 0,
    } as SyncReject);
    // Server vẫn có bản cũ của cả hai set. Trong lúc chờ server trả lần kéo đầu, user sửa
    // set 1 thành 82,5 × 8 (vào outbox, chưa kịp đẩy).
    const server = fakePullServer(w.changes);
    const pullChanges = server.pullChanges.getMockImplementation()!;
    server.pullChanges.mockImplementationOnce(async (since) => {
      await updateSet(first.id, { weight: 82.5, reps: 8 });
      return pullChanges(since);
    });
    const pushEvents = vi.fn(async () => {});
    await openApp(`/history/${w.session.id}`, {
      ...signedInAn,
      pullChanges: server.pullChanges,
      pushEvents,
    });

    // Kéo xong rồi đẩy thay đổi mới; hai set vẫn là bản trên máy.
    await waitFor(() => expect(pushEvents).toHaveBeenCalled());
    await waitFor(async () => expect(await db.outbox.count()).toBe(0));
    const bench = await screen.findByRole('list', {
      name: 'Barbell Bench Press - Medium Grip',
    });
    expect(
      within(bench)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Set 182.5 × 8', 'Set 280 × 6']);
  });

  it('buổi còn thay đổi chưa lên server: dòng báo "not synced yet"', async () => {
    const user = userEvent.setup();
    // Đẩy lỗi mạng: buổi vừa tập còn nằm trong outbox.
    await openApp('/', signedInAn);
    await user.click(
      await screen.findByRole('button', { name: 'Start freestyle' }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Add exercise' }),
    );
    await user.keyboard('bench');
    await user.click(
      await screen.findByRole('button', {
        name: /Barbell Bench Press - Medium Grip/,
      }),
    );
    await user.type(
      await screen.findByRole('textbox', { name: 'Weight (total)' }),
      '80',
    );
    await user.type(screen.getByRole('textbox', { name: 'Reps' }), '8');
    await user.click(screen.getByRole('button', { name: 'Log set 1' }));
    await screen.findByRole('button', { name: 'Log set 2' });
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Finish workout?',
    });
    await user.click(
      within(dialog).getByRole('button', { name: 'Finish workout' }),
    );
    await screen.findByRole('button', { name: 'Start freestyle' });
    await user.click(screen.getByRole('link', { name: 'History' }));

    await waitFor(() => expect(historyRows()).toHaveLength(1));
    expect(historyRows()[0]).toHaveTextContent(
      /Freestyle1 working set · \d+ min · not synced yet$/,
    );
  });

  it('tính năng chưa có (tab PR, bộ lọc, lịch sử bài) báo Coming soon', async () => {
    const user = userEvent.setup();
    const w = serverWorkout('2026-11-19T10:00:00.000Z', [
      { exerciseId: BENCH.id, sets: [[80, 8]] },
    ]);
    await openApp('/history', {
      ...signedInAn,
      pullChanges: fakePullServer(w.changes).pullChanges,
    });
    await waitFor(() => expect(historyRows()).toHaveLength(1));
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    for (const name of ['Exercise', '4 weeks', '3 months']) {
      await user.click(screen.getByRole('button', { name }));
      expect(await screen.findByText('Coming soon.')).toBeInTheDocument();
    }
    await user.click(screen.getByRole('tab', { name: 'PRs' }));
    expect(screen.getByRole('tab', { name: 'Workouts' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await user.click(historyRows()[0]);
    await user.click(
      await screen.findByRole('button', {
        name: /Barbell Bench Press - Medium Grip/,
      }),
    );
    expect(await screen.findByText('Coming soon.')).toBeInTheDocument();
  });
});

describe('sửa và xoá buổi cũ (UC11)', () => {
  const BENCH_NAME = 'Barbell Bench Press - Medium Grip';

  it('offline: sửa một set rồi lưu, số mới hiện ra và chỉ set đã đổi vào outbox', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const w = serverWorkout('2026-11-19T10:00:00.000Z', [
      {
        exerciseId: BENCH.id,
        sets: [
          [80, 8],
          [80, 7],
        ],
      },
    ]);
    await seedLocal(w);
    await openApp(`/history/${w.session.id}`, signedInAn);

    await user.click(
      await screen.findByRole('button', { name: 'Workout options' }),
    );
    const menu = await screen.findByRole('dialog', { name: 'This workout' });
    await user.click(within(menu).getByRole('button', { name: /Edit sets/ }));
    expect(await screen.findByText(/^Editing · Freestyle/)).toBeInTheDocument();
    const reps = screen.getByRole('textbox', {
      name: `${BENCH_NAME} set 2 reps`,
    });
    await user.clear(reps);
    await user.type(reps, '8');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByText(
        'Saved on this device. It syncs when you’re back online.',
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(setRows(BENCH_NAME)).toEqual(['Set 180 × 8', 'Set 280 × 8']),
    );
    expect(await outboxEvents()).toEqual([
      {
        entity: 'set_logs',
        entityId: w.sets[1].id,
        payload: { ...w.sets[1], reps: 8 },
      },
    ]);
  });

  /** Mở chi tiết buổi rồi vào chế độ sửa set. */
  async function openEditor(user: ReturnType<typeof userEvent.setup>) {
    await user.click(
      await screen.findByRole('button', { name: 'Workout options' }),
    );
    const menu = await screen.findByRole('dialog', { name: 'This workout' });
    await user.click(within(menu).getByRole('button', { name: /Edit sets/ }));
    await screen.findByText(/^Editing · /);
  }

  /** Mở menu buổi, chọn xoá buổi rồi xác nhận; trả về sheet xác nhận trước khi bấm. */
  async function deleteWorkout(user: ReturnType<typeof userEvent.setup>) {
    await user.click(
      await screen.findByRole('button', { name: 'Workout options' }),
    );
    const menu = await screen.findByRole('dialog', { name: 'This workout' });
    await user.click(
      within(menu).getByRole('button', { name: /Delete workout/ }),
    );
    const confirm = await screen.findByRole('dialog', {
      name: 'Delete this workout?',
    });
    const text = confirm.textContent;
    await user.click(
      within(confirm).getByRole('button', { name: 'Delete workout' }),
    );
    return text;
  }

  const twoBenchSets = () =>
    serverWorkout('2026-11-19T10:00:00.000Z', [
      {
        exerciseId: BENCH.id,
        sets: [
          [80, 8],
          [80, 7],
        ],
      },
    ]);

  it('xoá set rồi Cancel: không ghi gì, set vẫn còn; ô reps sai khoá nút lưu', async () => {
    const user = userEvent.setup();
    const w = twoBenchSets();
    await seedLocal(w);
    await openApp(`/history/${w.session.id}`, signedInAn);
    await openEditor(user);

    await user.click(screen.getByRole('button', { name: 'Delete set 1' }));
    // Set còn lại đánh số lại.
    const reps = screen.getByRole('textbox', {
      name: `${BENCH_NAME} set 1 reps`,
    });
    expect(reps).toHaveValue('7');
    expect(
      screen.queryByRole('textbox', { name: `${BENCH_NAME} set 2 reps` }),
    ).not.toBeInTheDocument();

    await user.clear(reps);
    expect(reps).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    await user.type(reps, '0');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText(/^Editing · /)).not.toBeInTheDocument();
    expect(setRows(BENCH_NAME)).toEqual(['Set 180 × 8', 'Set 280 × 7']);
    expect(await outboxEvents()).toEqual([]);
  });

  it('lưu set đã xoá: set thành tombstone trong outbox, set còn lại không đổi', async () => {
    const user = userEvent.setup();
    const w = twoBenchSets();
    await seedLocal(w);
    await openApp(`/history/${w.session.id}`, signedInAn);
    await openEditor(user);

    await user.click(screen.getByRole('button', { name: 'Delete set 2' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(setRows(BENCH_NAME)).toEqual(['Set 180 × 8']));
    expect(await outboxEvents()).toEqual([
      {
        entity: 'set_logs',
        entityId: w.sets[1].id,
        payload: { ...w.sets[1], deletedAt: expect.any(String) },
      },
    ]);
  });

  it('xoá buổi: hỏi lại, buổi rời History, buổi, bài và set thành tombstone; Undo đem buổi về, set đã xoá từ trước vẫn là đã xoá', async () => {
    const user = userEvent.setup();
    const kept = serverWorkout('2026-11-17T10:00:00.000Z', [
      { exerciseId: SQUAT.id, sets: [[100, 5]] },
    ]);
    const gone = twoBenchSets();
    await seedLocal(kept);
    await seedLocal(gone);
    // Set 2 đã bị xoá ngay trong buổi tập.
    const earlier = '2026-11-19T10:20:00.000Z';
    await db.setLogs.put({ ...gone.sets[1], deletedAt: earlier });
    const exerciseRow = gone.changes[1].payload as SessionExercise;
    await openApp(`/history/${gone.session.id}`, signedInAn);

    expect(await deleteWorkout(user)).toContain(
      'Freestyle on Nov 19 goes from your history.',
    );

    expect(await screen.findByText('Deleted Freestyle.')).toBeInTheDocument();
    await waitFor(() => expect(historyRows()).toHaveLength(1));
    expect(historyRows()[0]).toHaveTextContent(/^17Tue/);
    const events = await outboxEvents();
    expect(events.map((e) => [e.entity, e.entityId])).toEqual([
      ['set_logs', gone.sets[0].id],
      ['session_exercises', exerciseRow.id],
      ['workout_sessions', gone.session.id],
    ]);
    const at = (events[2].payload as WorkoutSession).deletedAt;
    expect(at).toEqual(expect.any(String));
    expect(
      events.map((e) => (e.payload as { deletedAt: string | null }).deletedAt),
    ).toEqual([at, at, at]);

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(historyRows()).toHaveLength(2));
    expect(historyRows()[0]).toHaveTextContent(/^19ThuFreestyle1 working set/);
    expect(await db.workoutSessions.get(gone.session.id)).toMatchObject({
      deletedAt: null,
    });
    expect(await db.sessionExercises.get(exerciseRow.id)).toMatchObject({
      deletedAt: null,
    });
    expect(await db.setLogs.get(gone.sets[0].id)).toMatchObject({
      deletedAt: null,
    });
    expect(await db.setLogs.get(gone.sets[1].id)).toMatchObject({
      deletedAt: earlier,
    });
  });

  it('"lần trước" bỏ qua buổi vừa xoá trong History', async () => {
    const user = userEvent.setup();
    const older = serverWorkout('2026-11-17T10:00:00.000Z', [
      { exerciseId: BENCH.id, sets: [[75, 9]] },
    ]);
    const newer = serverWorkout('2026-11-19T10:00:00.000Z', [
      { exerciseId: BENCH.id, sets: [[80, 8]] },
    ]);
    await seedLocal(older);
    await seedLocal(newer);
    const app = await openApp(`/history/${newer.session.id}`, signedInAn);
    await deleteWorkout(user);
    await waitFor(() => expect(historyRows()).toHaveLength(1));

    await app.router.navigate('/');
    await user.click(
      await screen.findByRole('button', { name: 'Start freestyle' }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Add exercise' }),
    );
    await user.keyboard('bench');
    await user.click(
      await screen.findByRole('button', { name: new RegExp(BENCH_NAME) }),
    );
    const last = await screen.findByRole('note', { name: /^Last time/ });
    expect(last.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Last time · Nov 17 75×9',
    );
  });
});
