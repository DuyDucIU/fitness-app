import { describe, expect, it } from 'vitest';

import { ApiError, errorMessage } from './errors';

describe('errorMessage', () => {
  it('dịch theo mã lỗi API', () => {
    expect(errorMessage(new ApiError('unauthorized', 401))).toBe(
      "You've been signed out. Sign in again to continue.",
    );
  });

  it('mã lạ thì dùng câu chung', () => {
    expect(errorMessage(new ApiError('teapot', 418))).toBe(
      'Something went wrong. Try again.',
    );
  });

  it('lỗi mạng của fetch', () => {
    expect(errorMessage(new TypeError('Failed to fetch'))).toBe(
      "Can't reach the server. Everything is saved on this device.",
    );
  });
});
