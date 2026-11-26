import { type SyncEvent, syncKeyOf } from '@fitness/contract';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AN, clearDb, PASSWORD } from '@/auth/testing';
import { CATALOG } from '@/catalog/testing';
import { db } from '@/db/db';
import { ApiError } from '@/lib/errors';
import { openApp } from '@/test/open-app';

const signedInAn = {
  stored: { kind: 'session', user: AN },
  owner: AN,
} as const;

beforeEach(async () => {
  await db.exercises.bulkPut(CATALOG.exercises);
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await clearDb();
});

type User = ReturnType<typeof userEvent.setup>;

/**
 * POST /sync/push giả: ghi lại các batch; `failing` = mất mạng; batch chứa bản ghi có
 * reps trong `rejectReps` bị từ chối cả batch (403), như server thật.
 */
function fakeServer(options: { rejectReps?: number[] } = {}) {
  const batches: SyncEvent[][] = [];
  let failing = false;
  const pushEvents = vi.fn(async (events: SyncEvent[]) => {
    if (failing) throw new ApiError('network', 0);
    if (
      events.some(
        (e) =>
          e.entity === 'set_logs' &&
          options.rejectReps?.includes(e.payload.reps ?? -1),
      )
    ) {
      throw new ApiError('forbidden', 403);
    }
    batches.push(events);
  });
  return {
    pushEvents,
    /** Mọi sự kiện server đã nhận, theo thứ tự nhận. */
    received: () => batches.flat(),
    setFailing: (value: boolean) => {
      failing = value;
    },
  };
}

/** Today → tập tự do → thêm bench → ghi set 1 (80 × `reps`): 3 thay đổi. */
async function logOneSet(user: User, reps = 8) {
  await user.click(
    await screen.findByRole('button', { name: 'Start freestyle' }),
  );
  await screen.findByRole('heading', { name: 'Freestyle' });
  await user.click(screen.getByRole('button', { name: 'Add exercise' }));
  await screen.findByRole('dialog', { name: 'Add an exercise' });
  await user.keyboard('bench');
  await user.click(
    await screen.findByRole('button', {
      name: /Barbell Bench Press - Medium Grip/,
    }),
  );
  const weight = await screen.findByRole('textbox', { name: 'Weight (total)' });
  await user.type(weight, '80');
  await user.type(screen.getByRole('textbox', { name: 'Reps' }), String(reps));
  await user.click(screen.getByRole('button', { name: 'Log set 1' }));
  await screen.findByRole('button', { name: 'Log set 2' });
}

/** Bản ghi trên máy theo đúng thứ tự ghi: buổi, bài, set. */
async function localRecords() {
  const [session] = await db.workoutSessions.toArray();
  const [exercise] = await db.sessionExercises.toArray();
  const [set] = await db.setLogs.toArray();
  return [
    { entity: 'workout_sessions', op: 'upsert', payload: session },
    { entity: 'session_exercises', op: 'upsert', payload: exercise },
    { entity: 'set_logs', op: 'upsert', payload: set },
  ];
}

describe('đẩy outbox lên server', () => {
  it('có mạng: mỗi thay đổi được đẩy theo thứ tự ghi, chip về "Synced"', async () => {
    const user = userEvent.setup();
    const server = fakeServer();
    await openApp('/', { ...signedInAn, pushEvents: server.pushEvents });

    await logOneSet(user);

    expect(await screen.findByText('Synced')).toBeInTheDocument();
    await waitFor(async () => expect(await db.outbox.count()).toBe(0));
    expect(server.received()).toEqual(await localRecords());
  });

  it('lỗi mạng: giữ thay đổi trên máy, có mạng lại thì đẩy đủ và đúng thứ tự', async () => {
    const user = userEvent.setup();
    const server = fakeServer();
    server.setFailing(true);
    const app = await openApp('/', {
      ...signedInAn,
      pushEvents: server.pushEvents,
    });

    await logOneSet(user);
    expect(await screen.findByText('3 pending')).toBeInTheDocument();
    expect(server.pushEvents).toHaveBeenCalled();
    expect(await db.outbox.count()).toBe(3);

    server.setFailing(false);
    app.reconnect();

    expect(await screen.findByText('Synced')).toBeInTheDocument();
    expect(server.received()).toEqual(await localRecords());
  });

  it('lỗi mạng rồi quay lại app (visibilitychange): đẩy tiếp', async () => {
    const user = userEvent.setup();
    const server = fakeServer();
    server.setFailing(true);
    const app = await openApp('/', {
      ...signedInAn,
      pushEvents: server.pushEvents,
    });

    await logOneSet(user);
    expect(await screen.findByText('3 pending')).toBeInTheDocument();

    server.setFailing(false);
    app.becomeVisible();

    expect(await screen.findByText('Synced')).toBeInTheDocument();
    expect(server.received()).toEqual(await localRecords());
  });

  it('server từ chối một thay đổi: giữ riêng trên máy, các thay đổi sau vẫn được đẩy, chip báo', async () => {
    const user = userEvent.setup();
    // Server không nhận set 7 reps (vd dữ liệu lỗi), nhận mọi thứ khác.
    const server = fakeServer({ rejectReps: [7] });
    server.setFailing(true);
    const app = await openApp('/', {
      ...signedInAn,
      pushEvents: server.pushEvents,
    });

    // Offline ghi set 7 reps rồi set 9 reps: cả hai nằm chung một batch khi có mạng lại.
    await logOneSet(user, 7);
    await user.clear(screen.getByRole('textbox', { name: 'Reps' }));
    await user.type(screen.getByRole('textbox', { name: 'Reps' }), '9');
    await user.click(screen.getByRole('button', { name: 'Log set 2' }));
    expect(await screen.findByText('4 pending')).toBeInTheDocument();

    server.setFailing(false);
    app.reconnect();

    expect(await screen.findByText('1 not synced')).toBeInTheDocument();
    expect(await db.outbox.count()).toBe(0);
    const sets = (await db.setLogs.toArray()).sort(
      (a, b) => a.setIndex - b.setIndex,
    );
    expect(server.received().map(syncKeyOf)).toEqual([
      (await db.workoutSessions.toCollection().first())?.id,
      (await db.sessionExercises.toCollection().first())?.id,
      sets[1].id,
    ]);
    // Set bị từ chối vẫn còn nguyên trên máy.
    expect(sets.map((s) => s.reps)).toEqual([7, 9]);
  });

  it('cần đăng nhập lại: ngừng đẩy; đăng nhập lại thì đẩy tiếp', async () => {
    const user = userEvent.setup();
    const server = fakeServer();
    // Máy có chủ nhưng phiên đã mất.
    const app = await openApp('/', {
      owner: AN,
      pushEvents: server.pushEvents,
    });

    await logOneSet(user);
    expect(await screen.findByText('3 pending')).toBeInTheDocument();
    app.reconnect();
    app.becomeVisible();
    expect(server.pushEvents).not.toHaveBeenCalled();

    // Banner "Session ended" ở Today: đăng nhập lại.
    await app.router.navigate('/');
    await user.click(await screen.findByRole('link', { name: 'Sign in' }));
    await user.type(await screen.findByLabelText('Email'), AN.email);
    await user.type(screen.getByLabelText('Password'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Synced')).toBeInTheDocument();
    expect(server.received()).toEqual(await localRecords());
  });
});
