import { describe, expect, it } from 'vitest';
import {
  addRest,
  DEFAULT_REST_SECONDS,
  restLeft,
  restSecondsFor,
  startRest,
} from './rest';

const T0 = Date.parse('2026-11-22T10:00:00.000Z');

describe('restSecondsFor, startRest, addRest, restLeft', () => {
  it('Given bài trong routine có rest_seconds, When chọn thời lượng nghỉ, Then dùng rest_seconds của bài', () => {
    expect(restSecondsFor(90)).toBe(90);
  });

  it('Given bài không thuộc routine, When chọn thời lượng nghỉ, Then dùng mặc định 2 phút', () => {
    expect(DEFAULT_REST_SECONDS).toBe(120);
    expect(restSecondsFor(null)).toBe(120);
  });

  it('Given vừa bắt đầu nghỉ 90 giây, When 30 giây trôi qua, Then còn 60 giây và hai phần ba lớp nghỉ', () => {
    const timer = startRest(90, T0);
    expect(restLeft(timer, T0 + 30_000)).toEqual({
      seconds: 60,
      fraction: 2 / 3,
      done: false,
    });
  });

  it('Given còn chưa đủ một giây, When hiển thị, Then làm tròn lên để không hiện 0:00 khi timer chưa hết', () => {
    const timer = startRest(90, T0);
    expect(restLeft(timer, T0 + 89_400).seconds).toBe(1);
    expect(restLeft(timer, T0 + 89_400).done).toBe(false);
  });

  it('Given đồng hồ màn hình còn chậm hơn lúc bắt đầu nghỉ, When hiển thị, Then không vượt quá tổng thời lượng', () => {
    const timer = startRest(120, T0);
    expect(restLeft(timer, T0 - 800)).toEqual({
      seconds: 120,
      fraction: 1,
      done: false,
    });
  });

  it('Given app nằm nền quá mốc kết thúc, When mở lại, Then timer đã hết, còn 0 giây', () => {
    const timer = startRest(90, T0);
    expect(restLeft(timer, T0 + 10 * 60_000)).toEqual({
      seconds: 0,
      fraction: 0,
      done: true,
    });
  });

  it('Given đang nghỉ, When cộng thêm 30 giây, Then dời mốc kết thúc và tổng cùng lúc', () => {
    const timer = addRest(startRest(90, T0), 30);
    expect(restLeft(timer, T0 + 30_000)).toEqual({
      seconds: 90,
      fraction: 0.75,
      done: false,
    });
  });
});
