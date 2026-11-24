import { describe, expect, it } from 'vitest';
import { lastDayIndex, nextDayIndex, type RotationSession } from './rotation';

const days = ['push', 'pull', 'legs'];

const session = (
  routineDayId: string | null,
  startedAt: string,
  deleted = false,
): RotationSession => ({
  routineDayId,
  startedAt,
  deletedAt: deleted ? startedAt : null,
});

describe('nextDayIndex', () => {
  it('Given chưa tập buổi nào, When chọn ngày kế tiếp, Then là ngày đầu', () => {
    expect(nextDayIndex(days, [])).toBe(0);
  });

  it('Given buổi gần nhất là Push, When chọn ngày kế tiếp, Then là Pull', () => {
    expect(
      nextDayIndex(days, [
        session('legs', '2026-11-16T10:00:00.000Z'),
        session('push', '2026-11-18T10:00:00.000Z'),
      ]),
    ).toBe(1);
  });

  it('Given buổi gần nhất là ngày cuối, When chọn ngày kế tiếp, Then quay về ngày đầu', () => {
    expect(
      nextDayIndex(days, [session('legs', '2026-11-18T10:00:00.000Z')]),
    ).toBe(0);
  });

  it('Given tập Push rồi tập tự do, When chọn ngày kế tiếp, Then bỏ qua buổi tự do: là Pull', () => {
    expect(
      nextDayIndex(days, [
        session('push', '2026-11-16T10:00:00.000Z'),
        session(null, '2026-11-17T10:00:00.000Z'),
      ]),
    ).toBe(1);
  });

  it('Given buổi gần nhất thuộc routine khác hoặc ngày đã xoá, When chọn ngày kế tiếp, Then bỏ qua buổi đó', () => {
    expect(
      nextDayIndex(days, [
        session('pull', '2026-11-16T10:00:00.000Z'),
        session('other-routine-day', '2026-11-17T10:00:00.000Z'),
      ]),
    ).toBe(2);
  });

  it('Given buổi gần nhất đã xoá, When chọn ngày kế tiếp, Then không tính buổi đó', () => {
    expect(
      nextDayIndex(days, [
        session('push', '2026-11-16T10:00:00.000Z'),
        session('pull', '2026-11-17T10:00:00.000Z', true),
      ]),
    ).toBe(1);
  });

  it('Given routine không có ngày nào, When chọn ngày kế tiếp, Then không có ngày (-1)', () => {
    expect(
      nextDayIndex([], [session('push', '2026-11-16T10:00:00.000Z')]),
    ).toBe(-1);
  });
});

describe('lastDayIndex', () => {
  it('Given tập Pull rồi tập tự do, When tìm ngày vừa tập, Then là Pull', () => {
    expect(
      lastDayIndex(days, [
        session('pull', '2026-11-16T10:00:00.000Z'),
        session(null, '2026-11-17T10:00:00.000Z'),
      ]),
    ).toBe(1);
  });

  it('Given chưa tập buổi nào theo routine, When tìm ngày vừa tập, Then không có (null)', () => {
    expect(
      lastDayIndex(days, [session(null, '2026-11-17T10:00:00.000Z')]),
    ).toBeNull();
  });
});
