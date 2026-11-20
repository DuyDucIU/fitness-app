import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { AN, PASSWORD } from '@/auth/testing';
import { clearDb, openApp } from '@/test/open-app';

afterEach(clearDb);

describe('chặn route', () => {
  it('máy chưa có chủ: mở màn trong app thì sang đăng nhập, nhớ trang đang mở', async () => {
    const { router } = await openApp('/history');
    expect(
      await screen.findByRole('heading', { name: 'Sign in to keep your log' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/sign-in');
    expect(router.state.location.search).toBe('?next=%2Fhistory');
  });

  it('đăng nhập xong: quay về trang đã mở', async () => {
    const user = userEvent.setup();
    const { router } = await openApp('/sign-in?next=%2Fhistory');
    await user.type(await screen.findByLabelText('Email'), AN.email);
    await user.type(screen.getByLabelText('Password'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(
      await screen.findByRole('heading', { name: 'History' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/history');
  });

  it('đã đăng nhập mà mở màn đăng nhập: về Today', async () => {
    const { router } = await openApp('/sign-in', {
      stored: { kind: 'session', user: AN },
    });
    expect(
      await screen.findByRole('heading', { name: 'Today' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });

  it('mất phiên (máy có chủ): vẫn ở trong app, có banner đăng nhập lại về đúng trang', async () => {
    const { router } = await openApp('/history', {
      stored: { kind: 'none' },
      signedInBefore: true,
    });
    expect(
      await screen.findByRole('heading', { name: 'History' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Signed out on this device')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/sign-in?next=%2Fhistory',
    );
    expect(router.state.location.pathname).toBe('/history');
  });

  it('đang dùng app thì mất phiên: không bị đẩy ra khỏi màn đang mở', async () => {
    const { router, fake } = await openApp('/history', {
      stored: { kind: 'session', user: AN },
      signedInBefore: true,
    });
    await screen.findByRole('heading', { name: 'History' });
    fake.revokeSession();
    expect(
      await screen.findByText('Signed out on this device'),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/history');
  });
});
