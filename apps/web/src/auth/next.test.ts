import { describe, expect, it } from 'vitest';

import { safeNext } from './next';

describe('safeNext', () => {
  it('giữ đường dẫn trong app, cả query và hash', () => {
    expect(safeNext('/history?week=2#top')).toBe('/history?week=2#top');
  });

  it.each([
    null,
    '',
    'history',
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
  ])('về Today với %j', (next) => {
    expect(safeNext(next)).toBe('/');
  });
});
