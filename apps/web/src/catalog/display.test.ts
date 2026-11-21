import { describe, expect, it } from 'vitest';

import { exerciseNames, primaryMuscles } from '@/catalog/display';
import { BENCH, SLED_PUSH } from '@/catalog/testing';

describe('tên bài theo ngôn ngữ UI', () => {
  it('vi: tên Việt là tên chính, tên Anh ở dòng phụ', () => {
    expect(exerciseNames(BENCH, 'vi')).toEqual({
      name: 'Đẩy ngực ngang tạ đòn',
      other: 'Barbell Bench Press - Medium Grip',
    });
    expect(primaryMuscles(BENCH, 'vi')).toEqual(['Ngực']);
  });

  it('en: tên Anh là tên chính, tên Việt ở dòng phụ', () => {
    expect(exerciseNames(BENCH, 'en')).toEqual({
      name: 'Barbell Bench Press - Medium Grip',
      other: 'Đẩy ngực ngang tạ đòn',
    });
    expect(primaryMuscles(BENCH, 'en')).toEqual(['Chest']);
  });

  it('bài chưa có tên Việt: dùng tên Anh ở cả hai ngôn ngữ, không có dòng phụ', () => {
    expect(exerciseNames(SLED_PUSH, 'vi')).toEqual({ name: 'Sled push' });
  });
});
