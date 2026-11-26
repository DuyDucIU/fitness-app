import {
  MUSCLE_GROUPS,
  type MuscleGroup,
  type ProgressResponse,
} from '@fitness/contract';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AN, clearDb } from '@/auth/testing';
import { BENCH, CATALOG, DUMBBELL_BENCH, SQUAT } from '@/catalog/testing';
import { db } from '@/db/db';
import { ApiError } from '@/lib/errors';
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

const SESSION = (n: number) =>
  `00000000-0000-4000-9000-${String(n).padStart(12, '0')}`;

/** Thứ Hai của 16 tuần, tuần cuối 16/11/2026 (hôm nay 18/11). */
const WEEK_STARTS = Array.from({ length: 16 }, (_, i) =>
  new Date(Date.UTC(2026, 10, 16) - (15 - i) * 7 * 86_400_000)
    .toISOString()
    .slice(0, 10),
);
const MONTH_STARTS = Array.from(
  { length: 12 },
  (_, i) =>
    `${new Date(Date.UTC(2025, 11 + i, 1)).toISOString().slice(0, 7)}-01`,
);

const sets = (values: Partial<Record<MuscleGroup, number>> = {}) =>
  Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, values[g] ?? 0])) as Record<
    MuscleGroup,
    number
  >;

/** Server trả rỗng: chưa có buổi nào. */
function emptyProgress(): ProgressResponse {
  return {
    today: '2026-11-18',
    weeks: WEEK_STARTS.map((start) => ({ start, workouts: 0, sets: sets() })),
    months: MONTH_STARTS.map((start) => ({ start, workouts: 0 })),
    e1rm: [],
  };
}

/**
 * Tuần này: 1 buổi, ngực 3 set, tay 1,5. Bốn tuần trước đó mỗi tuần ngực 4 set (trung bình 4).
 * Bench (ghi tổng) có e1RM ở tuần trước và tuần này; bench tạ đơn có hai cách ghi; squat chỉ
 * có điểm cũ hơn 12 tuần.
 */
function sampleProgress(): ProgressResponse {
  const progress = emptyProgress();
  progress.weeks = progress.weeks.map((w, i) =>
    i === 15
      ? { ...w, workouts: 1, sets: sets({ chest: 3, arms: 1.5 }) }
      : i >= 11
        ? { ...w, workouts: 2, sets: sets({ chest: 4, legs: 6 }) }
        : w,
  );
  progress.months[11] = { start: MONTH_STARTS[11], workouts: 5 };
  progress.months[10] = { start: MONTH_STARTS[10], workouts: 7 };
  progress.e1rm = [
    {
      exerciseId: BENCH.id,
      loadInput: 'total',
      points: [
        {
          sessionId: SESSION(1),
          date: '2026-11-10',
          e1rmKg: 101.33,
          weightKg: 80,
          reps: 8,
        },
        {
          sessionId: SESSION(2),
          date: '2026-11-17',
          e1rmKg: 104.5,
          weightKg: 95,
          reps: 3,
        },
      ],
    },
    {
      exerciseId: DUMBBELL_BENCH.id,
      loadInput: 'per_dumbbell',
      points: [
        {
          sessionId: SESSION(3),
          date: '2026-11-11',
          e1rmKg: 40,
          weightKg: 30,
          reps: 10,
        },
      ],
    },
    {
      exerciseId: DUMBBELL_BENCH.id,
      loadInput: 'total',
      points: [
        {
          sessionId: SESSION(4),
          date: '2026-11-12',
          e1rmKg: 80,
          weightKg: 60,
          reps: 10,
        },
      ],
    },
    {
      exerciseId: SQUAT.id,
      loadInput: 'total',
      points: [
        {
          sessionId: SESSION(5),
          date: '2026-07-01',
          e1rmKg: 120,
          weightKg: 100,
          reps: 6,
        },
      ],
    },
  ];
  return progress;
}

const openProgress = (fetchProgress: () => Promise<ProgressResponse>) =>
  openApp('/progress', { ...signedInAn, fetchProgress });

/** Hàng của một nhóm cơ trong bảng số set. */
const muscleRow = (name: string) =>
  within(
    screen.getByRole('table', { name: 'Working sets per muscle group' }),
  ).getByRole('row', { name: new RegExp(`^${name}`) });

describe('Progress › Training (UC19)', () => {
  it('chưa có buổi nào: báo chưa đủ dữ liệu và dẫn về Today', async () => {
    await openProgress(async () => emptyProgress());
    expect(await screen.findByText('Not enough data yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Today' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('số working set theo nhóm cơ của tuần này, so với trung bình 4 tuần trước; xem tuần trước', async () => {
    const user = userEvent.setup();
    await openProgress(async () => sampleProgress());

    expect(await screen.findByText('This week')).toBeInTheDocument();
    expect(muscleRow('Chest')).toHaveTextContent('3');
    expect(
      within(muscleRow('Chest')).getByLabelText('3 sets, 4-week average 4'),
    ).toBeInTheDocument();
    expect(muscleRow('Arms')).toHaveTextContent('1.5');
    expect(muscleRow('Legs')).toHaveTextContent('0');
    expect(screen.getByText(/4\.5 sets so far/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Previous week' }));
    expect(screen.getByText('Week of Nov 9')).toBeInTheDocument();
    expect(muscleRow('Legs')).toHaveTextContent('6');
    expect(screen.getByRole('button', { name: 'Next week' })).toBeEnabled();
  });

  it('khoảng 4 tuần: không lùi quá 4 tuần', async () => {
    const user = userEvent.setup();
    await openProgress(async () => sampleProgress());
    await screen.findByText('This week');
    await user.click(screen.getByRole('radio', { name: '4 weeks' }));
    for (let i = 0; i < 3; i += 1) {
      await user.click(screen.getByRole('button', { name: 'Previous week' }));
    }
    expect(screen.getByText('Week of Oct 26')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Previous week' }),
    ).toBeDisabled();
  });

  it('số buổi theo tuần, chuyển sang theo tháng; xem dạng bảng', async () => {
    const user = userEvent.setup();
    await openProgress(async () => sampleProgress());
    const block = (
      await screen.findByRole('heading', { name: /Workouts per week/ })
    ).closest('section')!;

    await user.click(
      within(block).getByRole('button', { name: 'Show as table' }),
    );
    const weekTable = within(block).getByRole('table');
    expect(within(weekTable).getAllByRole('row')).toHaveLength(13);
    expect(
      within(weekTable).getByRole('row', { name: /Nov 16/ }),
    ).toHaveTextContent('1 workout');

    await user.click(within(block).getByRole('radio', { name: 'Month' }));
    expect(
      within(block).getByRole('heading', { name: /Workouts per month/ }),
    ).toBeInTheDocument();
    const monthTable = within(block).getByRole('table');
    expect(within(monthTable).getAllByRole('row')).toHaveLength(13);
    expect(
      within(monthTable).getByRole('row', { name: /Nov 2026/ }),
    ).toHaveTextContent('5 workouts');
  });

  it('e1RM: mỗi bài × cách ghi tạ một mục; bài có hai cách ghi thì ghi rõ cách ghi', async () => {
    const user = userEvent.setup();
    await openProgress(async () => sampleProgress());
    const select = await screen.findByRole('combobox', { name: 'Exercise' });
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual([
      'Barbell Bench Press - Medium Grip',
      'Barbell Squat',
      'Dumbbell Bench Press · per dumbbell',
      'Dumbbell Bench Press · total',
    ]);
    // Mặc định là đường có buổi gần nhất: bench, e1RM mới nhất 104,5 → 105.
    const block = select.closest('section')!;
    expect(within(block).getByText('105')).toBeInTheDocument();

    await user.click(
      within(block).getByRole('button', { name: 'Show as table' }),
    );
    expect(
      within(within(block).getByRole('table')).getByRole('row', {
        name: /Nov 10/,
      }),
    ).toHaveTextContent('101.3 kg');

    await user.selectOptions(select, 'Barbell Squat');
    expect(
      within(block).getByText('No Barbell Squat sets in this range.'),
    ).toBeInTheDocument();
  });

  it('Body và "All records" chưa có (#35, #33): báo Coming soon', async () => {
    const user = userEvent.setup();
    await openProgress(async () => sampleProgress());
    await screen.findByText('This week');
    await user.click(screen.getByRole('tab', { name: 'Body' }));
    expect(await screen.findByText('Coming soon.')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', {
        name: 'All Barbell Bench Press - Medium Grip records',
      }),
    );
    expect(screen.getAllByText('Coming soon.').length).toBeGreaterThan(0);
  });
});

describe('Progress cần mạng', () => {
  it('offline: báo cần mạng; có mạng lại thì tải biểu đồ', async () => {
    let online = false;
    const fetchProgress = vi.fn(async () => {
      if (!online) throw new ApiError('network', 0);
      return sampleProgress();
    });
    const app = await openProgress(fetchProgress);
    expect(
      await screen.findByText('Progress needs a connection'),
    ).toBeInTheDocument();

    online = true;
    app.reconnect();
    window.dispatchEvent(new Event('online'));
    expect(await screen.findByText('This week')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText('Progress needs a connection')).toBeNull(),
    );
  });

  it('buổi vừa xong còn trong outbox: đẩy lên xong thì tải lại biểu đồ', async () => {
    await db.outbox.add({
      entity: 'workout_sessions',
      entityId: SESSION(9),
      op: 'upsert',
      payload: {
        id: SESSION(9),
        routineDayId: null,
        startedAt: '2026-11-18T10:00:00.000Z',
        endedAt: '2026-11-18T11:00:00.000Z',
        notes: null,
        deletedAt: null,
      },
      createdAt: Date.now(),
      attempts: 0,
    });
    let release = () => {};
    const pushed = new Promise<void>((resolve) => (release = resolve));
    const fetchProgress = vi
      .fn<() => Promise<ProgressResponse>>()
      .mockResolvedValueOnce(emptyProgress())
      .mockResolvedValue(sampleProgress());
    await openApp('/progress', {
      ...signedInAn,
      fetchProgress,
      pushEvents: () => pushed,
    });
    expect(await screen.findByText('Not enough data yet')).toBeInTheDocument();

    release();
    expect(await screen.findByText('This week')).toBeInTheDocument();
    expect(fetchProgress).toHaveBeenCalledTimes(2);
  });

  it('server lỗi: báo lỗi và thử lại được', async () => {
    const user = userEvent.setup();
    const fetchProgress = vi
      .fn<() => Promise<ProgressResponse>>()
      .mockRejectedValueOnce(new ApiError('internal', 500))
      .mockResolvedValue(sampleProgress());
    await openProgress(fetchProgress);
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('This week')).toBeInTheDocument();
  });
});
