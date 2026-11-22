import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AN, clearDb } from '@/auth/testing';
import { BENCH, CATALOG, SLED_PUSH, SQUAT } from '@/catalog/testing';
import { ApiError } from '@/lib/errors';
import { fakeRoutinesServer } from '@/routines/testing';
import { openApp } from '@/test/open-app';

afterEach(clearDb);

const signedInAn = {
  stored: { kind: 'session', user: AN },
  owner: AN,
} as const;

describe('tạo routine (UC05)', () => {
  it('tạo routine 2 ngày và đặt làm routine đang dùng: Plans hiện nó nổi bật với 2 ngày', async () => {
    const server = fakeRoutinesServer();
    const user = userEvent.setup();
    await openApp('/plans', {
      ...signedInAn,
      fetchCatalog: async () => CATALOG,
      routinesApi: server.api,
    });

    await user.click(
      await screen.findByRole('link', { name: 'Write my routine' }),
    );
    await user.type(
      await screen.findByLabelText('Routine name'),
      'Upper / lower',
    );
    await user.click(screen.getByRole('radio', { name: '2' }));
    expect(
      screen.getByRole('switch', { name: /Make it my active routine/ }),
    ).toBeChecked();
    await user.click(
      screen.getByRole('button', { name: 'Create and add exercises' }),
    );

    // Tạo xong thì vào ngày đầu để thêm bài.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Day 1' }),
    ).toBeInTheDocument();
    expect(server.api.create).toHaveBeenCalledWith({
      name: 'Upper / lower',
      isActive: true,
      days: [{ name: 'Day 1' }, { name: 'Day 2' }],
    });

    await user.click(screen.getByRole('link', { name: 'Back' }));
    await user.click(await screen.findByRole('link', { name: 'Back' }));
    const active = await screen.findByRole('region', {
      name: 'Active routine',
    });
    expect(within(active).getByText('Upper / lower · active')).toBeVisible();
    expect(
      within(active)
        .getAllByRole('link', { name: /^Day \d/ })
        .map((a) => a.textContent),
    ).toEqual(['Day 1', 'Day 2']);
    await waitFor(() =>
      expect(server.routines[0]).toMatchObject({ isActive: true }),
    );
  });
});

/** Server có sẵn một routine "PPL" đang dùng gồm Push (Bench) và Legs (rỗng). */
function pplServer() {
  const server = fakeRoutinesServer();
  return {
    server,
    async seed() {
      const r = await server.api.create({
        name: 'PPL',
        isActive: true,
        days: [{ name: 'Push' }, { name: 'Legs' }],
      });
      await server.api.addExercise(r.days[0].id, {
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
      vi.clearAllMocks();
      return structuredClone(server.routines[0]);
    },
  };
}

describe('sửa routine', () => {
  it('thêm bài vào ngày tập bằng picker, chỉnh số set trong sheet: lưu một lần khi đóng sheet', async () => {
    const { server, seed } = pplServer();
    const routine = await seed();
    const user = userEvent.setup();
    await openApp(`/plans/${routine.id}/days/${routine.days[1].id}`, {
      ...signedInAn,
      fetchCatalog: async () => CATALOG,
      routinesApi: server.api,
    });

    await user.click(
      await screen.findByRole('button', { name: 'Add exercise' }),
    );
    await user.keyboard('ganh ta');
    await user.click(
      await screen.findByRole('button', { name: /Barbell Squat/ }),
    );
    const row = await screen.findByRole('button', {
      name: /Barbell Squat.*3 × 8–12.*1:30 rest/,
    });
    expect(server.api.addExercise).toHaveBeenCalledWith(
      routine.days[1].id,
      expect.objectContaining({ exerciseId: SQUAT.id, targetSets: 3 }),
    );

    await user.click(row);
    const sheet = await screen.findByRole('dialog', { name: SQUAT.nameEn });
    await user.click(
      within(sheet).getByRole('button', { name: 'One set more' }),
    );
    await user.click(
      within(sheet).getByRole('button', { name: '15 seconds more' }),
    );
    expect(server.api.updateExercise).not.toHaveBeenCalled();
    await user.click(within(sheet).getByRole('button', { name: 'Close' }));

    await waitFor(() =>
      expect(server.api.updateExercise).toHaveBeenCalledTimes(1),
    );
    expect(server.api.updateExercise).toHaveBeenCalledWith(
      server.routines[0].days[1].exercises[0].id,
      { targetSets: 4, restSeconds: 105 },
    );
    expect(
      await screen.findByRole('button', {
        name: /Barbell Squat.*4 × 8–12.*1:45 rest/,
      }),
    ).toBeInTheDocument();
  });

  it('đổi sang bài đo quãng đường: bỏ rep range, chỉ còn số set; bài mới thêm theo mặc định khởi động của user', async () => {
    const { server, seed } = pplServer();
    const routine = await seed();
    const user = userEvent.setup();
    await openApp(`/plans/${routine.id}/days/${routine.days[0].id}`, {
      ...signedInAn,
      fetchCatalog: async () => CATALOG,
      routinesApi: server.api,
    });

    await user.click(
      await screen.findByRole('button', { name: /^Barbell Bench Press/ }),
    );
    const sheet = await screen.findByRole('dialog', { name: BENCH.nameEn });
    await user.click(
      within(sheet).getByRole('button', { name: /Change exercise/ }),
    );
    await user.keyboard('sled');
    await user.click(await screen.findByRole('button', { name: /Sled push/ }));

    expect(
      await screen.findByRole('button', { name: /^Sled push.*3 sets/ }),
    ).toBeInTheDocument();
    expect(server.routines[0].days[0].exercises[0]).toMatchObject({
      exerciseId: SLED_PUSH.id,
      repMin: null,
      repMax: null,
      targetDurationMinS: null,
      targetDurationMaxS: null,
    });

    await user.click(screen.getByRole('button', { name: 'Add exercise' }));
    await user.keyboard('ganh ta');
    await user.click(
      await screen.findByRole('button', { name: /Barbell Squat/ }),
    );
    await waitFor(() =>
      expect(server.api.addExercise).toHaveBeenCalledWith(
        routine.days[0].id,
        expect.objectContaining({ exerciseId: SQUAT.id, warmupEnabled: null }),
      ),
    );
  });

  it('đổi thứ tự ngày tập bằng bàn phím: Space nhấc, ↓, Space thả', async () => {
    const { server, seed } = pplServer();
    const routine = await seed();
    const user = userEvent.setup();
    await openApp(`/plans/${routine.id}`, {
      ...signedInAn,
      fetchCatalog: async () => CATALOG,
      routinesApi: server.api,
    });

    const grip = await screen.findByRole('button', { name: 'Reorder Push' });
    grip.focus();
    await user.keyboard(' ');
    expect(grip).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{ArrowDown}');
    await user.keyboard(' ');

    await waitFor(() =>
      expect(server.api.reorderDays).toHaveBeenCalledWith(routine.id, [
        routine.days[1].id,
        routine.days[0].id,
      ]),
    );
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('link', { name: /exercise/ })
          .map((a) => a.textContent),
      ).toEqual([
        expect.stringMatching(/^Legs/),
        expect.stringMatching(/^Push/),
      ]),
    );
  });

  it('thêm ngày tập mới: chưa lưu cho tới khi chạm Done, Done thêm cả ngày kèm bài', async () => {
    const { server, seed } = pplServer();
    const routine = await seed();
    const user = userEvent.setup();
    await openApp(`/plans/${routine.id}`, {
      ...signedInAn,
      fetchCatalog: async () => CATALOG,
      routinesApi: server.api,
    });

    await user.click(await screen.findByRole('button', { name: 'Add a day' }));
    const name = await screen.findByLabelText('Day name');
    expect(name).toHaveValue('Day 3');
    await user.clear(name);
    await user.type(name, 'Pull');
    await user.click(screen.getByRole('button', { name: 'Add exercise' }));
    await user.keyboard('day nguc');
    await user.click(
      await screen.findByRole('button', { name: /Barbell Bench Press/ }),
    );
    expect(server.api.addExercise).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(
      await screen.findByRole('link', { name: /^Pull.*1 exercise/ }),
    ).toBeInTheDocument();
    expect(server.api.addDay).toHaveBeenCalledWith(routine.id, {
      name: 'Pull',
      exercises: [expect.objectContaining({ exerciseId: BENCH.id })],
    });
  });

  it('xoá routine: xác nhận rồi về Plans, routine không còn', async () => {
    const { server, seed } = pplServer();
    const routine = await seed();
    const user = userEvent.setup();
    await openApp(`/plans/${routine.id}`, {
      ...signedInAn,
      fetchCatalog: async () => CATALOG,
      routinesApi: server.api,
    });

    await user.click(
      await screen.findByRole('button', { name: /Delete routine/ }),
    );
    const sheet = await screen.findByRole('dialog', {
      name: 'Delete this routine?',
    });
    await user.click(
      within(sheet).getByRole('button', { name: 'Delete routine' }),
    );
    expect(
      await screen.findByRole('link', { name: 'Write my routine' }),
    ).toBeInTheDocument();
    expect(server.api.archive).toHaveBeenCalledWith(routine.id);
  });
});

describe('offline (ADR 0002)', () => {
  it('xem routine từ cache được; đổi tên hay đặt routine đang dùng thì báo cần có mạng', async () => {
    const { server, seed } = pplServer();
    const routine = await seed();
    // Lần mở có mạng nạp routine về máy.
    await openApp('/plans', {
      ...signedInAn,
      fetchCatalog: async () => CATALOG,
      routinesApi: server.api,
    });
    await screen.findByRole('region', { name: 'Active routine' });
    cleanup();

    const user = userEvent.setup();
    const offline = vi.fn(() => Promise.reject(new ApiError('network', 0)));
    await openApp(`/plans/${routine.id}`, {
      ...signedInAn,
      online: () => false,
      routinesApi: { list: offline },
    });
    const name = await screen.findByLabelText('Routine name');
    expect(name).toHaveValue('PPL');
    expect(screen.getByRole('link', { name: /^Push/ })).toBeInTheDocument();

    await user.clear(name);
    await user.type(name, 'Bro split');
    await user.tab();
    expect(
      await screen.findByText(
        'Changing a routine needs a connection. You can still view it offline.',
      ),
    ).toBeInTheDocument();
    // Lưu không được thì ô quay về tên đang có.
    expect(name).toHaveValue('PPL');
    expect(server.routines[0].name).toBe('PPL');
  });
});
