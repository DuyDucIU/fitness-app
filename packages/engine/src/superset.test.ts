import { describe, expect, it } from 'vitest';
import {
  afterSupersetSet,
  leaveSuperset,
  moveExercise,
  supersetRuns,
  swapInSuperset,
  toggleSupersetWithNext,
} from './superset';

/** "A B1 C1 D": chữ là bài, số là `superset_group`. */
function list(spec: string) {
  return spec.split(' ').map((token) => ({
    id: token[0]!,
    supersetGroup: token.length > 1 ? Number(token.slice(1)) : null,
  }));
}

/** Thứ tự và nhóm dạng "A [B C] D", để không phụ thuộc số nhóm cụ thể. */
const shape = (items: { id: string; supersetGroup: number | null }[]) =>
  supersetRuns(items)
    .map((run) =>
      run.length > 1
        ? `[${run.map((e) => e.id).join(' ')}]`
        : run[0]!.supersetGroup === null
          ? run[0]!.id
          : `${run[0]!.id}!`,
    )
    .join(' ');

describe('supersetRuns', () => {
  it('Given các bài liền kề cùng số nhóm, When chia nhóm, Then mỗi superset là một đoạn, bài lẻ đứng riêng', () => {
    expect(
      supersetRuns(list('A B1 C1 D E2')).map((run) => run.map((e) => e.id)),
    ).toEqual([['A'], ['B', 'C'], ['D'], ['E']]);
  });
});

describe('moveExercise (UC09: đổi thứ tự trong buổi)', () => {
  it('Given ba bài lẻ, When kéo bài cuối lên đầu, Then thứ tự đổi, không có superset', () => {
    expect(shape(moveExercise(list('A B C'), 'C', 0))).toBe('C A B');
  });

  it('Given superset A B, When kéo B ra sau C, Then B rời nhóm và nhóm còn một bài thì hết superset', () => {
    expect(shape(moveExercise(list('A1 B1 C'), 'B', 2))).toBe('A C B');
  });

  it('Given superset ba bài, When kéo một bài ra ngoài, Then hai bài còn lại vẫn là superset', () => {
    expect(shape(moveExercise(list('A1 B1 C1 D'), 'A', 3))).toBe('[B C] D A');
  });

  it('Given superset A B, When kéo bài ngoài thả vào giữa, Then bài đó nhập nhóm', () => {
    expect(shape(moveExercise(list('A1 B1 C'), 'C', 1))).toBe('[A C B]');
  });

  it('Given superset, When đổi chỗ hai bài trong nhóm, Then vẫn nguyên nhóm', () => {
    expect(shape(moveExercise(list('A1 B1 C'), 'B', 0))).toBe('[B A] C');
  });

  it('Given superset A B, When kéo bài ngoài tới ngay trước nhóm, Then bài đó không nhập nhóm', () => {
    expect(shape(moveExercise(list('A1 B1 C'), 'C', 0))).toBe('C [A B]');
  });

  it('Given hai superset, When kéo một bài của nhóm này vào giữa nhóm kia, Then bài đó sang nhóm kia', () => {
    expect(shape(moveExercise(list('A1 B1 C1 D2 E2'), 'A', 3))).toBe(
      '[B C] [D A E]',
    );
  });

  it('Given hai superset đứng cạnh nhau, When thả bài lẻ vào ranh giới, Then không nhóm nào nhận', () => {
    expect(shape(moveExercise(list('A1 B1 C2 D2 E'), 'E', 2))).toBe(
      '[A B] E [C D]',
    );
  });
});

describe('toggleSupersetWithNext (UC09: gộp / tách hai bài liền nhau)', () => {
  it('Given hai bài lẻ liền nhau, When gộp, Then thành một superset', () => {
    expect(shape(toggleSupersetWithNext(list('A B C'), 'A'))).toBe('[A B] C');
  });

  it('Given superset A B đứng trước C, When gộp B với C, Then thành superset ba bài', () => {
    expect(shape(toggleSupersetWithNext(list('A1 B1 C'), 'B'))).toBe('[A B C]');
  });

  it('Given hai superset liền nhau, When gộp ở ranh giới, Then thành một nhóm', () => {
    expect(shape(toggleSupersetWithNext(list('A1 B1 C2 D2'), 'B'))).toBe(
      '[A B C D]',
    );
  });

  it('Given superset hai bài, When tách, Then cả hai thành bài lẻ', () => {
    expect(shape(toggleSupersetWithNext(list('A1 B1'), 'A'))).toBe('A B');
  });

  it('Given superset bốn bài, When tách ở giữa, Then thành hai superset riêng', () => {
    expect(shape(toggleSupersetWithNext(list('A1 B1 C1 D1'), 'B'))).toBe(
      '[A B] [C D]',
    );
  });

  it('Given bài cuối buổi, When gộp với bài kế, Then không đổi gì', () => {
    expect(shape(toggleSupersetWithNext(list('A B'), 'B'))).toBe('A B');
  });
});

describe('leaveSuperset (UC09: bỏ một bài khỏi superset)', () => {
  it('Given superset ba bài, When bài giữa rời nhóm, Then bài đó ra ngay sau nhóm, hai bài kia vẫn superset', () => {
    expect(shape(leaveSuperset(list('A1 B1 C1 D'), 'B'))).toBe('[A C] B D');
  });

  it('Given superset ba bài, When bài đầu rời nhóm, Then bài đó giữ chỗ', () => {
    expect(shape(leaveSuperset(list('A1 B1 C1'), 'A'))).toBe('A [B C]');
  });

  it('Given superset ba bài, When bài cuối rời nhóm, Then bài đó giữ chỗ', () => {
    expect(shape(leaveSuperset(list('A1 B1 C1'), 'C'))).toBe('[A B] C');
  });

  it('Given superset hai bài, When một bài rời nhóm, Then cả hai thành bài lẻ, giữ thứ tự', () => {
    expect(shape(leaveSuperset(list('A1 B1 C'), 'B'))).toBe('A B C');
  });
});

describe('swapInSuperset (UC09: thay bài trong buổi)', () => {
  const swap = (spec: string, id: string) =>
    shape(swapInSuperset(list(spec), id, { id: 'N', supersetGroup: null }));

  it('Given bài lẻ đã ghi set, When thay, Then bài mới chèn ngay sau', () => {
    expect(swap('A B C', 'B')).toBe('A B N C');
  });

  it('Given bài đầu superset đã ghi set, When thay, Then bài cũ rời nhóm, bài mới ngay sau và vào nhóm', () => {
    expect(swap('A1 B1', 'A')).toBe('A [N B]');
  });

  it('Given bài cuối superset đã ghi set, When thay, Then bài cũ lên trước nhóm, bài mới thế chỗ trong nhóm', () => {
    expect(swap('X A1 B1 C', 'B')).toBe('X B [A N] C');
  });

  it('Given bài giữa superset đã ghi set, When thay, Then bài cũ lên trước nhóm, nhóm giữ thứ tự', () => {
    expect(swap('A1 B1 C1', 'B')).toBe('B [A N C]');
  });
});

describe('afterSupersetSet (UC09: tập xen kẽ, chỉ nghỉ sau mỗi vòng)', () => {
  /** "A1:2": bài A, nhóm 1, còn 2 set chờ tập. */
  const left = (spec: string) =>
    spec.split(' ').map((token) => {
      const [item, remaining] = token.split(':');
      return { ...list(item!)[0]!, remaining: Number(remaining) };
    });

  it('Given bài đầu nhóm vừa ghi set, When bài sau còn set chờ, Then sang bài đó, chưa nghỉ', () => {
    expect(afterSupersetSet(left('A1:2 B1:3'), 'A')).toEqual({
      nextId: 'B',
      roundOver: false,
    });
  });

  it('Given bài cuối nhóm vừa ghi set, When còn set chờ, Then hết vòng: về bài đầu còn set chờ', () => {
    expect(afterSupersetSet(left('A1:2 B1:2 C'), 'B')).toEqual({
      nextId: 'A',
      roundOver: true,
    });
  });

  it('Given bài giữa nhóm đã hết set chờ, When ghi set bài trước nó, Then bỏ qua nó', () => {
    expect(afterSupersetSet(left('A1:1 B1:0 C1:2'), 'A')).toEqual({
      nextId: 'C',
      roundOver: false,
    });
  });

  it('Given chỉ bài vừa ghi còn set chờ, When ghi set, Then hết vòng và ở lại bài đó', () => {
    expect(afterSupersetSet(left('A1:0 B1:1'), 'B')).toEqual({
      nextId: 'B',
      roundOver: true,
    });
  });

  it('Given cả nhóm hết set chờ, When ghi set cuối, Then hết vòng và ở lại bài vừa ghi', () => {
    expect(afterSupersetSet(left('A1:0 B1:0 C:3'), 'B')).toEqual({
      nextId: 'B',
      roundOver: true,
    });
  });

  it('Given bài không thuộc superset, When ghi set, Then không có luật superset', () => {
    expect(afterSupersetSet(left('A:2 B1:1 C1:1'), 'A')).toBeNull();
  });
});
