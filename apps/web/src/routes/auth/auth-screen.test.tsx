import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { AN, PASSWORD } from '@/auth/testing';
import { clearDb, openApp } from '@/test/open-app';

afterEach(clearDb);

async function fillSignUp(fields: {
  email: string;
  password: string;
  confirm: string;
}) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Email'), fields.email);
  await user.type(screen.getByLabelText('Password'), fields.password);
  await user.type(screen.getByLabelText('Confirm password'), fields.confirm);
  await user.click(screen.getByRole('button', { name: 'Create account' }));
}

describe('đăng nhập', () => {
  it('email sai định dạng: báo lỗi ở ô email, không đăng nhập', async () => {
    const user = userEvent.setup();
    const { auth } = await openApp('/sign-in');
    await user.type(await screen.findByLabelText('Email'), 'an@');
    await user.type(screen.getByLabelText('Password'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByText('Enter an email like name@example.com.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(auth.getState()).toEqual({ status: 'signed-out' });
  });

  it('sai mật khẩu: báo lỗi đã dịch, ở lại màn đăng nhập', async () => {
    const user = userEvent.setup();
    await openApp('/sign-in');
    await user.type(await screen.findByLabelText('Email'), AN.email);
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t sign in');
    expect(alert).toHaveTextContent('Wrong email or password.');
  });

  it('nút chưa làm (Google, quên mật khẩu): báo Coming soon', async () => {
    const user = userEvent.setup();
    await openApp('/sign-in');
    await user.click(
      await screen.findByRole('button', { name: 'Continue with Google' }),
    );
    expect(await screen.findByText('Coming soon.')).toBeInTheDocument();
  });
});

describe('đăng ký', () => {
  it('mật khẩu dưới 8 ký tự: báo lỗi, không tạo tài khoản', async () => {
    const { auth } = await openApp('/sign-up');
    await fillSignUp({
      email: 'chi@example.com',
      password: 'short',
      confirm: 'short',
    });
    expect(
      await screen.findByText('Use at least 8 characters.'),
    ).toBeInTheDocument();
    expect(auth.getState()).toEqual({ status: 'signed-out' });
  });

  it('nhập lại mật khẩu không khớp: báo lỗi ở ô nhập lại', async () => {
    const { auth } = await openApp('/sign-up');
    await fillSignUp({
      email: 'chi@example.com',
      password: PASSWORD,
      confirm: 'password2',
    });
    expect(
      await screen.findByText('Passwords don’t match.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(auth.getState()).toEqual({ status: 'signed-out' });
  });

  it('hợp lệ: tạo tài khoản và vào Today', async () => {
    await openApp('/sign-up');
    await fillSignUp({
      email: 'chi@example.com',
      password: PASSWORD,
      confirm: PASSWORD,
    });
    expect(
      await screen.findByRole('heading', { name: 'Today' }),
    ).toBeInTheDocument();
  });

  it('email đã có tài khoản: báo lỗi đã dịch', async () => {
    await openApp('/sign-up');
    await fillSignUp({
      email: AN.email,
      password: PASSWORD,
      confirm: PASSWORD,
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account with this email already exists. Sign in instead.',
    );
  });
});
