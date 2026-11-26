import type { BodyMetric } from '@fitness/contract';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AN, clearDb } from '@/auth/testing';
import { fakeBodyMetricsServer } from '@/progress/testing';
import { openApp } from '@/test/open-app';

beforeEach(() => {
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

let seq = 0;
/** Giữa trưa UTC để ngày hiển thị giống nhau ở mọi múi giờ chạy test. */
function entry(
  metric: BodyMetric['metric'],
  value: number,
  date: string,
  over: Partial<BodyMetric> = {},
): BodyMetric {
  return {
    id: `00000000-0000-4000-b000-${String(++seq).padStart(12, '0')}`,
    metric,
    value,
    measuredAt: `${date}T12:00:00.000Z`,
    source: 'manual',
    edited: false,
    ...over,
  };
}

const WEIGHTS = [
  entry('weight', 73.2, '2026-11-11'),
  entry('weight', 72.9, '2026-11-14', { edited: true }),
  entry('weight', 72.5, '2026-11-18'),
];

async function openBody(initial: BodyMetric[] = WEIGHTS) {
  const server = fakeBodyMetricsServer(initial);
  const app = await openApp('/progress/body', {
    ...signedInAn,
    bodyMetricsApi: server.api,
  });
  await screen.findByRole('heading', { name: 'Weight' });
  return { server, app };
}

const entries = () => screen.getByRole('region', { name: 'Entries' });

describe('Progress › Body (UC18)', () => {
  it('mở từ tab Body của Progress', async () => {
    const server = fakeBodyMetricsServer(WEIGHTS);
    const { router } = await openApp('/progress', {
      ...signedInAn,
      bodyMetricsApi: server.api,
    });
    await userEvent.click(await screen.findByRole('tab', { name: 'Body' }));
    expect(router.state.location.pathname).toBe('/progress/body');
    expect(
      await screen.findByRole('heading', { name: 'Weight' }),
    ).toBeInTheDocument();
  });

  it('hiện số mới nhất, biểu đồ và danh sách mới đo trước', async () => {
    await openBody();
    expect(screen.getByRole('img', { name: /Weight.*72\.5 kg/ })).toBeVisible();
    const rows = within(entries()).getAllByRole('button');
    expect(rows.map((r) => r.getAttribute('aria-label'))).toEqual([
      'Edit weight from Nov 18, 72.5 kg',
      'Edit weight from Nov 14, 72.9 kg',
      'Edit weight from Nov 11, 73.2 kg',
    ]);
    expect(rows[0]).toHaveTextContent('entered by hand');
    expect(rows[1]).toHaveTextContent('edited');
  });

  it('nhập một lần cân mới thì lưu lên server và hiện trong danh sách', async () => {
    const { server } = await openBody();
    await userEvent.type(screen.getByLabelText('New entry · kg'), '71,8');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Saved 71.8 kg.')).toBeInTheDocument();
    expect(server.entries.map((e) => e.value)).toContain(71.8);
    expect(
      within(entries()).getByRole('button', { name: /71\.8 kg/ }),
    ).toBeInTheDocument();
  });

  it('số không đọc được hay sai đơn vị thì báo ngay, không lưu', async () => {
    const { server } = await openBody();
    const input = screen.getByLabelText('New entry · kg');
    await userEvent.type(input, 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText('Enter a number, like 72.5.'),
    ).toBeInTheDocument();
    await userEvent.clear(input);
    await userEvent.type(input, '10');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText(
        'That doesn’t look like a weight in kg. Check the unit.',
      ),
    ).toBeInTheDocument();
    expect(server.entries).toHaveLength(3);
  });

  it('vòng eo và body fat có danh sách riêng, ít số đo thì báo thay biểu đồ', async () => {
    await openBody([...WEIGHTS, entry('waist', 82.5, '2026-11-15')]);
    await userEvent.click(screen.getByRole('radio', { name: 'Waist' }));
    expect(
      await screen.findByText('One entry so far. Add another to see a line.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('New entry · cm')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Body fat' }));
    expect(
      await screen.findByText('No body fat entries yet.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
  });

  it('sửa số của một lần đo', async () => {
    const { server } = await openBody();
    await userEvent.click(
      screen.getByRole('button', { name: 'Edit weight from Nov 18, 72.5 kg' }),
    );
    const sheet = await screen.findByRole('dialog', {
      name: 'Edit weight · Nov 18',
    });
    const value = within(sheet).getByLabelText('Weight · kg');
    await userEvent.clear(value);
    await userEvent.type(value, '72');
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Save changes' }),
    );
    expect(await screen.findByText('Updated to 72 kg.')).toBeInTheDocument();
    expect(server.entries.find((e) => e.id === WEIGHTS[2].id)).toMatchObject({
      value: 72,
      edited: true,
    });
    expect(
      screen.getByRole('button', { name: 'Edit weight from Nov 18, 72 kg' }),
    ).toHaveTextContent('edited');
  });

  it('xoá một lần đo rồi hoàn tác', async () => {
    const { server } = await openBody();
    await userEvent.click(
      screen.getByRole('button', { name: 'Edit weight from Nov 14, 72.9 kg' }),
    );
    const sheet = await screen.findByRole('dialog');
    await userEvent.click(
      within(sheet).getByRole('button', { name: /Delete this entry/ }),
    );
    expect(
      await screen.findByText('Deleted 72.9 kg from Nov 14.'),
    ).toBeInTheDocument();
    expect(server.entries).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(server.entries).toHaveLength(3));
    expect(
      await screen.findByRole('button', {
        name: 'Edit weight from Nov 14, 72.9 kg',
      }),
    ).toBeInTheDocument();
  });

  it('mất mạng khi mở thì báo cần mạng, có mạng lại thì tải', async () => {
    const server = fakeBodyMetricsServer(WEIGHTS);
    server.online = false;
    await openApp('/progress/body', {
      ...signedInAn,
      bodyMetricsApi: server.api,
    });
    expect(
      await screen.findByText('Measurements need a connection'),
    ).toBeInTheDocument();
    server.online = true;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', { name: 'Weight' }),
    ).toBeInTheDocument();
  });

  it('mất mạng khi lưu thì báo cần mạng, không xếp hàng chờ', async () => {
    const { server } = await openBody();
    server.online = false;
    await userEvent.type(screen.getByLabelText('New entry · kg'), '71');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText(
        'Saving a measurement needs a connection. Try again when you’re online.',
      ),
    ).toBeInTheDocument();
    server.online = true;
    expect(server.entries).toHaveLength(3);
  });
});
