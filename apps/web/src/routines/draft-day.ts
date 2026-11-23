import type { RoutineExercise } from '@fitness/contract';
import { useSyncExternalStore } from 'react';

/**
 * Ngày tập mới chưa lưu (prototypes/plans › day/…/new): chỉ nằm trong bộ nhớ, thêm vào
 * routine một lần khi chạm Done. Rời màn thì giữ lại để "Keep editing" quay về được; bắt
 * đầu ngày mới khác thì thay.
 */
export interface DraftDay {
  routineId: string;
  name: string;
  exercises: RoutineExercise[];
  /** User đã sửa gì đó (tên, bài): rời màn thì báo ngày chưa được thêm. */
  touched: boolean;
}

let draft: DraftDay | null = null;
const listeners = new Set<() => void>();

export function getDraftDay(): DraftDay | null {
  return draft;
}

export function setDraftDay(next: DraftDay | null): void {
  draft = next;
  listeners.forEach((listener) => listener());
}

/** Sửa ngày đang soạn (và đánh dấu đã sửa). */
export function updateDraftDay(change: (day: DraftDay) => DraftDay): void {
  if (draft) setDraftDay({ ...change(draft), touched: true });
}

export function useDraftDay(): DraftDay | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => draft,
  );
}
