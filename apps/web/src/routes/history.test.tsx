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

const historyRows = () =>
  within(screen.getByRole('list', { name: 'Workouts' })).getAllByRole('link');

describe('lịch sử buổi tập', () => {
  it('máy trống: đăng nhập xong, History hiện lại các buổi trên server, mới nhất trước', async () => {
    const user = userEvent.setup();
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
    const server = fakePullServer([...older.changes, ...newer.changes]);
    const app = await openApp('/sign-in', {
      pullChanges: server.pullChanges,
    });

    await user.type(await screen.findByLabelText('Email'), AN.email);
    await user.type(screen.getByLabelText('Password'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByRole('heading', { name: 'Today' });
    await app.router.navigate('/history');

    await screen.findByRole('list', { name: 'Workouts' });
    expect(historyRows().map((row) => row.textContent)).toEqual([
      expect.stringMatching(/Freestyle.*Thursday, Nov 19.*3 sets/),
      expect.stringMatching(/Freestyle.*Tuesday, Nov 17.*1 set/),
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
    await screen.findByText(/Nov 19/);
    expect(historyRows()).toHaveLength(2);

    // Máy khác xoá buổi (tombstone); user quay lại app.
    server.publish(
      change.session({
        ...gone.session,
        deletedAt: '2026-11-20T08:00:00.000Z',
      }),
    );
    app.becomeVisible();

    await waitFor(() => expect(screen.queryByText(/Nov 19/)).toBeNull());
    expect(historyRows()).toHaveLength(1);
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
});
