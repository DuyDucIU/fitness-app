import { describe, expect, it } from 'vitest';

import { thisWeek } from '@/workout/week';

const session = (startedAt: Date, deleted = false) => ({
  startedAt: startedAt.toISOString(),
  deletedAt: deleted ? startedAt.toISOString() : null,
});
/** Giờ trên máy: `day` là ngày trong tháng 11/2026 (thứ Hai 23/11 là đầu tuần). */
const at = (day: number, hour = 10) => new Date(2026, 10, day, hour);

describe('thisWeek', () => {
  it('Given các buổi trong và ngoài tuần, When xem tuần chứa hôm nay, Then đánh dấu ngày đã tập và đếm số buổi trong tuần', () => {
    const week = thisWeek(
      [
        session(at(22)), // Chủ nhật tuần trước
        session(at(23, 7)),
        session(at(23, 18)), // hai buổi cùng thứ Hai
        session(at(25)),
        session(at(26), true), // đã xoá
        session(at(30)), // thứ Hai tuần sau
      ],
      at(25, 20),
    );
    expect(week.days.map((d) => d.trained)).toEqual([
      true,
      false,
      true,
      false,
      false,
      false,
      false,
    ]);
    expect(week.days.map((d) => d.today)).toEqual([
      false,
      false,
      true,
      false,
      false,
      false,
      false,
    ]);
    expect(week.days[0].date).toEqual(new Date(2026, 10, 23));
    expect(week.count).toBe(3);
  });

  it('Given hôm nay là Chủ nhật, When xem tuần, Then tuần bắt đầu từ thứ Hai trước đó', () => {
    const week = thisWeek([session(at(23))], at(29));
    expect(week.days[0].date).toEqual(new Date(2026, 10, 23));
    expect(week.days[6].today).toBe(true);
    expect(week.count).toBe(1);
  });
});
