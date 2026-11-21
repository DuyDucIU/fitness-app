import { describe, expect, it } from 'vitest';
import { type SearchableExercise, searchExercises } from './search';

const bench: SearchableExercise = {
  id: 'bench',
  nameEn: 'Barbell Bench Press - Medium Grip',
  nameVi: 'Đẩy ngực ngang tạ đòn',
  isArchived: false,
  aliases: [
    { alias: 'bench press', mine: false },
    { alias: 'đẩy ngực', mine: false },
  ],
};

const ids = (results: { exercise: SearchableExercise }[]) =>
  results.map((r) => r.exercise.id);

describe('searchExercises', () => {
  it('Given bài có tên Việt có dấu, When gõ không dấu "day nguc", Then tìm ra bài', () => {
    expect(ids(searchExercises('day nguc', [bench]))).toEqual(['bench']);
  });

  it('Given user đặt alias "nguc phang" cho bài khác, When gõ "nguc", Then bài có alias của user đứng trước', () => {
    const dumbbell: SearchableExercise = {
      id: 'db-bench',
      nameEn: 'Dumbbell Bench Press',
      nameVi: 'Đẩy ngực ngang tạ đơn',
      isArchived: false,
      aliases: [{ alias: 'Ngực phẳng', mine: true }],
    };
    const results = searchExercises('nguc', [bench, dumbbell]);
    expect(ids(results)).toEqual(['db-bench', 'bench']);
    expect(results[0]?.ownAlias).toBe('Ngực phẳng');
    expect(results[1]?.ownAlias).toBeUndefined();
  });

  it('Given hai bài cùng khớp "bench press", When tìm, Then bài trùng hẳn alias đứng trước bài chỉ chứa cụm đó', () => {
    const closeGrip: SearchableExercise = {
      id: 'close-grip',
      nameEn: 'Close-Grip Barbell Bench Press',
      nameVi: 'Đẩy ngực tay hẹp tạ đòn',
      isArchived: false,
      aliases: [],
    };
    expect(ids(searchExercises('Bench Press', [closeGrip, bench]))).toEqual([
      'bench',
      'close-grip',
    ]);
  });

  it('Given tên tiếng Anh, When gõ chữ hoa lẫn dấu gạch, Then vẫn khớp', () => {
    const pullups: SearchableExercise = {
      id: 'pullups',
      nameEn: 'Pullups',
      nameVi: 'Kéo xà',
      isArchived: false,
      aliases: [{ alias: 'pull-up', mine: false }],
    };
    expect(ids(searchExercises('PULL UP', [pullups]))).toEqual(['pullups']);
    expect(ids(searchExercises('KÉO XÀ', [pullups]))).toEqual(['pullups']);
  });

  it('Given không bài nào khớp, When tìm, Then trả về rỗng', () => {
    expect(searchExercises('squat', [bench])).toEqual([]);
  });

  it('Given bài đã lưu trữ, When tìm, Then không hiện', () => {
    expect(searchExercises('bench', [{ ...bench, isArchived: true }])).toEqual(
      [],
    );
  });

  it('Given ô tìm trống, When tìm, Then trả mọi bài chưa lưu trữ theo thứ tự đầu vào', () => {
    const squat: SearchableExercise = {
      id: 'squat',
      nameEn: 'Barbell Squat',
      nameVi: 'Squat tạ đòn',
      isArchived: false,
      aliases: [],
    };
    const archived = { ...squat, id: 'old', isArchived: true };
    expect(ids(searchExercises('  ', [squat, archived, bench]))).toEqual([
      'squat',
      'bench',
    ]);
  });
});
