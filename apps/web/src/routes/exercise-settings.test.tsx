import type { ExerciseSetting } from '@fitness/contract';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AN, clearDb } from '@/auth/testing';
import { BENCH, CATALOG } from '@/catalog/testing';
import { db } from '@/db/db';
import { fakeRoutinesServer } from '@/routines/testing';
import { openApp } from '@/test/open-app';

/**
 * Cài đặt riêng từng bài (UC08, UC14): mở từ menu bài trên màn ghi set và từ chi tiết bài
 * trong thư viện; ghi cả dòng qua outbox nên chỉnh được khi offline.
 */

const signedInAn = {
  stored: { kind: 'session', user: AN },
  owner: AN,
} as const;

beforeEach(async () => {
  await db.exercises.bulkPut(CATALOG.exercises);
  // Ở phòng gym, mất mạng.
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await clearDb();
});

type User = ReturnType<typeof userEvent.setup>;

const BENCH_NAME = /Barbell Bench Press - Medium Grip/;

/** Today → tập tự do → thêm Bench; tấm số áo là của Bench. */
async function startBench(user: User) {
  await openApp('/', signedInAn);
  await user.click(
    await screen.findByRole('button', { name: 'Start freestyle' }),
  );
  await screen.findByRole('heading', { name: 'Freestyle' });
  await addBench(user);
}

async function addBench(user: User) {
  await user.click(screen.getByRole('button', { name: 'Add exercise' }));
  await screen.findByRole('dialog', { name: 'Add an exercise' });
  await user.keyboard('bench');
  await user.click(await screen.findByRole('button', { name: BENCH_NAME }));
  await screen.findByRole('region', { name: BENCH_NAME });
}

async function type(user: User, label: string | RegExp, value: string) {
  const input = screen.getByRole('textbox', { name: label });
  await user.clear(input);
  await user.type(input, value);
}

/** Mở menu "⋯" của bài hiện tại; trả về sheet. */
async function openMenu(user: User) {
  await user.click(
    screen.getByRole('button', {
      name: 'Options for Barbell Bench Press - Medium Grip',
    }),
  );
  return screen.findByRole('dialog', {
    name: 'Barbell Bench Press - Medium Grip',
  });
}

async function settingEvents(): Promise<ExerciseSetting[]> {
  return (await db.outbox.toArray())
    .filter((e) => e.entity === 'user_exercise_settings')
    .map((e) => e.payload as ExerciseSetting);
}

/** Một mức trong ô trọng lượng đòn (chờ ô hiện ra). */
async function barRadio(name: string) {
  const group = await screen.findByRole('radiogroup', { name: 'Bar weight' });
  return within(group).getByRole('radio', { name });
}

const weightBox = (load = 'total') =>
  screen.getByRole('textbox', { name: `Weight (${load})` });

describe('nút −/+ của ô tạ', () => {
  it('tạ đòn ghi tổng ở đúng mức đòn: nút − tắt', async () => {
    const user = userEvent.setup();
    await startBench(user);
    await type(user, 'Weight (total)', '25');
    await user.click(screen.getByRole('button', { name: 'Decrease by 5 kg' }));
    expect(weightBox()).toHaveValue('20');
    expect(
      screen.getByRole('button', { name: 'Decrease by 5 kg' }),
    ).toBeDisabled();
  });

  it('đòn đặt 15 kg: nút − xuống tới 15 kg và back-off cũng dừng ở 15 kg', async () => {
    await db.exerciseSettings.put({
      exerciseId: BENCH.id,
      weightStepKg: 5,
      loadInput: 'total',
      barWeightKg: 15,
      restAutoStart: true,
    });
    const user = userEvent.setup();
    await startBench(user);
    await type(user, 'Weight (total)', '20');
    await user.click(screen.getByRole('button', { name: 'Decrease by 5 kg' }));
    expect(weightBox()).toHaveValue('15');
    expect(
      screen.getByRole('button', { name: 'Decrease by 5 kg' }),
    ).toBeDisabled();
  });
});

describe('menu bài trên màn ghi set', () => {
  it('đổi đòn ngay trong buổi: nút − dừng ở đòn mới, ghi cả dòng qua outbox', async () => {
    const user = userEvent.setup();
    await startBench(user);
    const sheet = await openMenu(user);
    const bar = within(sheet).getByRole('radiogroup', { name: 'Bar weight' });
    expect(within(bar).getByRole('radio', { name: '20 kg' })).toBeChecked();
    await user.click(within(bar).getByRole('radio', { name: '15 kg' }));
    await user.keyboard('{Escape}');

    await type(user, 'Weight (total)', '20');
    await user.click(screen.getByRole('button', { name: 'Decrease by 5 kg' }));
    expect(weightBox()).toHaveValue('15');
    expect(
      screen.getByRole('button', { name: 'Decrease by 5 kg' }),
    ).toBeDisabled();
    expect((await settingEvents()).at(-1)?.barWeightKg).toBe(15);
  });

  it('ô đòn theo cách ghi tạ bài đang tập đã chụp: đổi sang Per side giữa buổi vẫn còn ô đòn', async () => {
    const user = userEvent.setup();
    await startBench(user);
    const sheet = await openMenu(user);
    await user.click(within(sheet).getByRole('radio', { name: 'Per side' }));
    await within(sheet).findByText(/applies from your next session/i);
    expect(
      within(sheet).getByRole('radiogroup', { name: 'Bar weight' }),
    ).toBeInTheDocument();
  });

  it('đổi bậc tạ khi offline: nút −/+ theo bậc mới, ghi cả dòng qua outbox', async () => {
    const user = userEvent.setup();
    await startBench(user);
    const sheet = await openMenu(user);
    // Mặc định tạ đòn: bậc 5 kg.
    expect(within(sheet).getByRole('radio', { name: '5 kg' })).toBeChecked();
    await user.click(within(sheet).getByRole('radio', { name: '2.5 kg' }));
    await user.keyboard('{Escape}');

    await type(user, 'Weight (total)', '60');
    await user.click(
      screen.getByRole('button', { name: 'Increase by 2.5 kg' }),
    );
    expect(weightBox()).toHaveValue('62.5');
    expect(await settingEvents()).toEqual([
      {
        exerciseId: BENCH.id,
        weightStepKg: 2.5,
        loadInput: 'total',
        barWeightKg: 20,
        restAutoStart: true,
      },
    ]);
  });

  it('tắt tự chạy rest timer: ghi set xong timer chờ user bấm', async () => {
    const user = userEvent.setup();
    await startBench(user);
    const sheet = await openMenu(user);
    await user.click(
      within(sheet).getByRole('switch', {
        name: 'Start rest timer after each set',
      }),
    );
    await user.keyboard('{Escape}');

    await type(user, 'Weight (total)', '60');
    await type(user, 'Reps', '8');
    await user.click(screen.getByRole('button', { name: 'Log set 1' }));
    await screen.findByRole('button', { name: 'Log set 2' });
    expect(screen.queryByRole('timer', { name: 'Rest' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Start 2:00 rest' }));
    expect(
      await screen.findByRole('timer', { name: 'Rest' }),
    ).toBeInTheDocument();
    expect((await settingEvents()).at(-1)?.restAutoStart).toBe(false);
  });

  it('đổi quy ước ghi tạ: bài đang tập giữ quy ước cũ, buổi sau mới ghi theo quy ước mới', async () => {
    const user = userEvent.setup();
    await startBench(user);
    const sheet = await openMenu(user);
    await user.click(within(sheet).getByRole('radio', { name: 'Per side' }));
    expect(
      await within(sheet).findByText(/applies from your next session/i),
    ).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(weightBox('total')).toBeInTheDocument();

    // Thêm lại bài trong buổi khác: chụp quy ước mới.
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    await user.click(
      await screen.findByRole('button', { name: 'Finish workout' }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Start freestyle' }),
    );
    await screen.findByRole('heading', { name: 'Freestyle' });
    await addBench(user);
    expect(weightBox('per side')).toBeInTheDocument();
  });

  it('thời gian nghỉ của bài trong buổi: chỉnh ±15 giây, ghi set xong nghỉ theo số mới', async () => {
    const user = userEvent.setup();
    await startBench(user);
    const sheet = await openMenu(user);
    await user.click(
      within(sheet).getByRole('button', { name: '15 seconds more' }),
    );
    expect(within(sheet).getByText('2:15')).toBeInTheDocument();
    await user.keyboard('{Escape}');

    await type(user, 'Weight (total)', '60');
    await type(user, 'Reps', '8');
    await user.click(screen.getByRole('button', { name: 'Log set 1' }));
    await waitFor(() =>
      expect(screen.getByRole('timer', { name: 'Rest' })).toHaveTextContent(
        '2:15',
      ),
    );
  });

  it('bỏ bài chưa ghi set khỏi buổi: bài biến mất khỏi buổi, ghi tombstone qua outbox', async () => {
    const user = userEvent.setup();
    await startBench(user);
    const sheet = await openMenu(user);
    await user.click(
      within(sheet).getByRole('button', { name: /Remove from this session/ }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: BENCH_NAME })).toBeNull(),
    );
    const rows = await db.sessionExercises.toArray();
    expect(rows).toEqual([
      expect.objectContaining({
        exerciseId: BENCH.id,
        deletedAt: expect.any(String),
      }),
    ]);
  });

  it('bỏ bài đã ghi set: set đã ghi giữ lại, các set chờ tập không còn', async () => {
    const user = userEvent.setup();
    await startBench(user);
    await type(user, 'Weight (total)', '60');
    await type(user, 'Reps', '8');
    await user.click(screen.getByRole('button', { name: 'Log set 1' }));
    await screen.findByRole('button', { name: 'Log set 2' });
    const sheet = await openMenu(user);
    await user.click(
      within(sheet).getByRole('button', { name: /Remove from this session/ }),
    );
    // Bài còn trong buổi với đúng một set đã ghi.
    await screen.findByRole('button', {
      name: /Barbell Bench Press - Medium Grip, 1 of 1 sets/,
    });
    const rows = await db.sessionExercises.toArray();
    expect(rows[0]?.deletedAt).toBeNull();
  });
});

describe('chi tiết bài trong thư viện', () => {
  it('mở bài từ thư viện, đổi đòn khi offline: lưu cả dòng qua outbox; ghi mỗi bên thì không có ô đòn', async () => {
    const user = userEvent.setup();
    await openApp('/plans/exercises', signedInAn);
    await user.type(
      await screen.findByRole('searchbox', { name: /search/i }),
      'bench',
    );
    await user.click(await screen.findByRole('link', { name: BENCH_NAME }));

    expect(
      await screen.findByRole('heading', { level: 1, name: BENCH.nameEn }),
    ).toBeInTheDocument();
    expect(await barRadio('20 kg')).toBeChecked();
    await user.click(await barRadio('15 kg'));
    await waitFor(async () =>
      expect(await settingEvents()).toEqual([
        {
          exerciseId: BENCH.id,
          weightStepKg: 5,
          loadInput: 'total',
          barWeightKg: 15,
          restAutoStart: true,
        },
      ]),
    );

    // Ghi tạ mỗi bên thì không có đòn.
    await user.click(screen.getByRole('radio', { name: 'Per side' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('radiogroup', { name: 'Bar weight' }),
      ).toBeNull(),
    );
  });

  it('sheet bài trong ngày tập mở được cài đặt của đúng bài đó', async () => {
    const server = fakeRoutinesServer();
    const routine = await server.api.create({
      name: 'PPL',
      isActive: true,
      days: [{ name: 'Push' }],
    });
    await server.api.addExercise(routine.days[0].id, {
      exerciseId: BENCH.id,
      targetSets: 3,
      repMin: 8,
      repMax: 12,
      targetDurationMinS: null,
      targetDurationMaxS: null,
      initialWeightKg: null,
      warmupEnabled: false,
      restSeconds: 90,
    });
    const user = userEvent.setup();
    await openApp(`/plans/${routine.id}/days/${routine.days[0].id}`, {
      ...signedInAn,
      fetchCatalog: async () => CATALOG,
      routinesApi: server.api,
    });
    await user.click(
      await screen.findByRole('button', { name: /Barbell Bench Press.*8–12/ }),
    );
    const sheet = await screen.findByRole('dialog', { name: BENCH.nameEn });
    await user.click(
      within(sheet).getByRole('link', { name: /Exercise settings/ }),
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: BENCH.nameEn }),
    ).toBeInTheDocument();
    expect(await barRadio('20 kg')).toBeChecked();
  });
});

describe('đồng bộ cài đặt bài', () => {
  const fromServer = (barWeightKg: number) => ({
    changes: [
      {
        entity: 'user_exercise_settings' as const,
        op: 'upsert' as const,
        payload: {
          exerciseId: BENCH.id,
          weightStepKg: 5,
          loadInput: 'total' as const,
          barWeightKg,
          restAutoStart: true,
        },
      },
    ],
    cursor: '1',
    hasMore: false,
  });

  it('kéo cài đặt từ server về máy: chi tiết bài hiện đúng đòn đã đặt', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    await openApp(`/plans/exercises/${BENCH.id}`, {
      ...signedInAn,
      pullChanges: async () => fromServer(15),
    });
    await waitFor(async () => expect(await barRadio('15 kg')).toBeChecked());
  });

  it('cài đặt còn chờ đẩy trên máy không bị bản trên server ghi đè', async () => {
    const user = userEvent.setup();
    await openApp(`/plans/exercises/${BENCH.id}`, signedInAn);
    await user.click(await barRadio('10 kg'));
    await waitFor(async () => expect(await settingEvents()).toHaveLength(1));
    cleanup();

    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    await openApp(`/plans/exercises/${BENCH.id}`, {
      ...signedInAn,
      // Đẩy chưa xong (lỗi mạng) nên sự kiện vẫn trong outbox.
      pushEvents: async () => {
        throw new TypeError('Failed to fetch');
      },
      pullChanges: async () => fromServer(15),
    });
    await waitFor(async () => expect(await barRadio('10 kg')).toBeChecked());
    expect((await db.exerciseSettings.get(BENCH.id))?.barWeightKg).toBe(10);
  });
});
