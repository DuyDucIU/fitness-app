import type { CatalogExercise } from '@fitness/contract';
import { type ExerciseMatch, searchExercises } from '@fitness/engine';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';

import { exerciseNames } from '@/catalog/display';
import { db } from '@/db/db';
import { getLocale } from '@/lib/i18n';

/**
 * Catalog bài tập trên máy (cache chỉ đọc), sắp theo tên hiển thị. `undefined` khi đang
 * đọc IndexedDB; mảng rỗng khi catalog chưa từng tải về.
 */
export function useCatalog(): CatalogExercise[] | undefined {
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  return useMemo(() => {
    if (!exercises) return undefined;
    const locale = getLocale();
    const collator = new Intl.Collator(locale);
    return exercises
      .map((exercise) => ({
        exercise,
        name: exerciseNames(exercise, locale).name,
      }))
      .sort((a, b) => collator.compare(a.name, b.name))
      .map(({ exercise }) => exercise);
  }, [exercises]);
}

/** Kết quả tìm `query` trên catalog trên máy (khớp không dấu, chạy được khi offline). */
export function useExerciseSearch(query: string): {
  /** Catalog trên máy chưa có bài nào (chưa tải về lần nào). */
  empty: boolean;
  results: ExerciseMatch<CatalogExercise>[] | undefined;
} {
  const catalog = useCatalog();
  const results = useMemo(
    () => (catalog ? searchExercises(query, catalog) : undefined),
    [catalog, query],
  );
  return { empty: catalog?.length === 0, results };
}
