import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    await user.click(
      await screen.findByRole('button', { name: 'One rep fewer' }),
    );
    await user.click(screen.getByRole('button', { name: 'Log set 3' }));
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
