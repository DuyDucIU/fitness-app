import { describe, expect, it } from 'vitest';

import { ApiError, errorMessage } from './errors';

describe('errorMessage', () => {
  it('dịch theo mã lỗi API', () => {
    expect(errorMessage(new ApiError('unauthorized', 401))).toBe(
      'Signed out. Sign in again any time to pick up where you left off.',
    );
  });

  it('mã lạ thì dùng câu chung', () => {
    expect(errorMessage(new ApiError('teapot', 418))).toBe(
      'Something went wrong. Try again.',
    );
  });

  it('không tới được server', () => {
    expect(errorMessage(new ApiError('network', 0))).toBe(
      'No connection. Try again when you’re connected.',
    );
  });

  it('lỗi lập trình không bị báo là mất mạng', () => {
    expect(errorMessage(new TypeError('x is undefined'))).toBe(
      'Something went wrong. Try again.',
    );
  });
});
