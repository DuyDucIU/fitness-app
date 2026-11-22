import type { CatalogResponse } from '@fitness/contract';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AN, BINH, clearDb, PASSWORD } from '@/auth/testing';
import {
  BENCH,
  CATALOG,
  DUMBBELL_BENCH,
  SLED_PUSH,
  SQUAT,
} from '@/catalog/testing';
import { ApiError } from '@/lib/errors';
import { openApp } from '@/test/open-app';

afterEach(clearDb);

const signedInAn = {
  stored: { kind: 'session', user: AN },
  owner: AN,
} as const;

const offline = () => Promise.reject(new ApiError('network', 0));

/** Tên các bài trong danh sách kết quả, theo thứ tự hiển thị. */
async function resultNames() {
  const list = await screen.findByRole('list', { name: 'Exercises' });
  return within(list)
    .getAllByRole('listitem')
    .map(
      (item) => item.querySelector('[data-slot=exercise-name]')?.textContent,
    );
}

/** Mở app có mạng một lần để catalog nạp về máy, rồi đóng app. */
async function loadCatalogOnce(catalog: CatalogResponse = CATALOG) {
  await openApp('/plans/exercises', {
    ...signedInAn,
    fetchCatalog: async () => catalog,
  });
  await screen.findByText(BENCH.nameEn);
  cleanup();
}

describe('thư viện bài tập', () => {
  it('có mạng: từ Plans mở thư viện, catalog nạp về và hiện nhóm cơ, dụng cụ, tên Việt ở dòng phụ', async () => {
    const user = userEvent.setup();
    await openApp('/plans', {
      ...signedInAn,
      fetchCatalog: async () => CATALOG,
    });
    await user.click(
      await screen.findByRole('link', {
        name: /Exercise library.*4 exercises/,
      }),
    );
    // sắp theo tên hiển thị
    expect(await resultNames()).toEqual([
      BENCH.nameEn,
      SQUAT.nameEn,
      DUMBBELL_BENCH.nameEn,
      SLED_PUSH.nameEn,
    ]);
    const bench = screen.getByText(BENCH.nameEn).closest('li')!;
    expect(
      within(bench).getByText('Đẩy ngực ngang tạ đòn'),
    ).toBeInTheDocument();
    expect(within(bench).getByText(/Barbell · Chest/)).toBeInTheDocument();
    const sled = screen.getByText(SLED_PUSH.nameEn).closest('li')!;
    expect(within(sled).getByText('sled')).toBeInTheDocument();
    expect(within(sled).getByText('Yours')).toBeInTheDocument();
  });

  it('mất mạng: tìm "day nguc" ra "Đẩy ngực ngang tạ đòn" từ catalog trên máy', async () => {
    await loadCatalogOnce();
    const user = userEvent.setup();
    const { fetchCatalog } = await openApp('/plans/exercises', {
      ...signedInAn,
      fetchCatalog: offline,
    });

    await user.type(
      await screen.findByRole('searchbox', { name: 'Search exercises' }),
      'day nguc',
    );

    expect((await resultNames())[0]).toBe(BENCH.nameEn);
    expect(screen.getByText('Đẩy ngực ngang tạ đòn')).toBeInTheDocument();
    expect(screen.queryByText(SQUAT.nameEn)).not.toBeInTheDocument();
    expect(fetchCatalog).toHaveBeenCalled();
  });

  it('alias của user đứng trước và hiện tên user đã đặt', async () => {
    await loadCatalogOnce();
    const user = userEvent.setup();
    await openApp('/plans/exercises', { ...signedInAn, fetchCatalog: offline });

    await user.type(await screen.findByRole('searchbox'), 'nguc');

    expect(await resultNames()).toEqual([DUMBBELL_BENCH.nameEn, BENCH.nameEn]);
    expect(screen.getByText(/your name “ngực phẳng”/)).toBeInTheDocument();
  });

  it('không khớp bài nào: báo không có kết quả', async () => {
    await loadCatalogOnce();
    const user = userEvent.setup();
    await openApp('/plans/exercises', { ...signedInAn, fetchCatalog: offline });

    await user.type(await screen.findByRole('searchbox'), 'deadlift');

    expect(
      await screen.findByText('No exercise matches “deadlift”.'),
    ).toBeInTheDocument();
  });

  it('chưa nạp catalog lần nào và đang mất mạng: báo cần có mạng', async () => {
    await openApp('/plans/exercises', { ...signedInAn, fetchCatalog: offline });

    expect(
      await screen.findByText(/hasn’t downloaded yet/),
    ).toBeInTheDocument();
  });

  it('có mạng lại: catalog được làm mới', async () => {
    const fetchCatalog = vi
      .fn<() => Promise<CatalogResponse>>()
      .mockResolvedValueOnce({ exercises: [BENCH] })
      .mockResolvedValue(CATALOG);
    const { reconnect } = await openApp('/plans/exercises', {
      ...signedInAn,
      fetchCatalog,
    });
    expect(await resultNames()).toEqual([BENCH.nameEn]);

    reconnect();

    await waitFor(async () =>
      expect(await resultNames()).toContain(SQUAT.nameEn),
    );
  });

  it('đăng xuất khi catalog đang tải dở: user đăng nhập sau không thấy bài của chủ cũ', async () => {
    let deliver: (catalog: CatalogResponse) => void = () => {};
    const fetchCatalog = vi
      .fn<() => Promise<CatalogResponse>>()
      .mockImplementationOnce(
        () => new Promise((resolve) => (deliver = resolve)),
      )
      .mockImplementation(offline);
    const { auth, router } = await openApp('/plans', {
      ...signedInAn,
      fetchCatalog,
    });
    await waitFor(() => expect(fetchCatalog).toHaveBeenCalledTimes(1));

    await auth.signOut();
    deliver(CATALOG);
    await auth.signIn(BINH.email, PASSWORD);
    // Màn đăng nhập tự chuyển về Today; chờ xong rồi mới mở thư viện.
    await screen.findByRole('heading', { name: 'Today' });
    await router.navigate('/plans/exercises');

    expect(
      await screen.findByText(/hasn’t downloaded yet/),
    ).toBeInTheDocument();
    expect(screen.queryByText(SLED_PUSH.nameEn)).not.toBeInTheDocument();
  });
});
