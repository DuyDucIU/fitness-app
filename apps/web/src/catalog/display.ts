import type { CatalogExercise } from '@fitness/contract';

import type { Locale } from '@/lib/i18n';
import { m } from '@/paraglide/messages.js';

/**
 * Tên bài theo ngôn ngữ UI, tên còn lại để hiện ở dòng phụ (SDD 3.5). Bài chưa có tên
 * Việt thì dùng tên tiếng Anh, không có dòng phụ.
 */
export function exerciseNames(
  exercise: Pick<CatalogExercise, 'nameEn' | 'nameVi'>,
  locale: Locale,
): { name: string; other?: string } {
  const { nameEn, nameVi } = exercise;
  if (!nameVi) return { name: nameEn };
  return locale === 'vi'
    ? { name: nameVi, other: nameEn }
    : { name: nameEn, other: nameVi };
}

/**
 * Tên dụng cụ đã dịch theo mã free-exercise-db. Ánh xạ viết tường minh để Paraglide
 * tree-shake được; mã lạ (vd bài tuỳ chỉnh) hiện nguyên văn.
 */
export function equipmentLabel(code: string): string {
  switch (code) {
    case 'barbell':
      return m.equipment_barbell();
    case 'dumbbell':
      return m.equipment_dumbbell();
    case 'cable':
      return m.equipment_cable();
    case 'machine':
      return m.equipment_machine();
    case 'body only':
      return m.equipment_body_only();
    case 'kettlebells':
      return m.equipment_kettlebells();
    case 'bands':
      return m.equipment_bands();
    case 'e-z curl bar':
      return m.equipment_ez_bar();
    case 'medicine ball':
      return m.equipment_medicine_ball();
    case 'exercise ball':
      return m.equipment_exercise_ball();
    case 'foam roll':
      return m.equipment_foam_roll();
    case 'other':
      return m.equipment_other();
    default:
      return code;
  }
}

/** Tên các nhóm cơ chính của bài theo ngôn ngữ UI. */
export function primaryMuscles(
  exercise: Pick<CatalogExercise, 'muscles'>,
  locale: Locale,
): string[] {
  return exercise.muscles
    .filter((muscle) => muscle.role === 'primary')
    .map((muscle) => (locale === 'vi' ? muscle.nameVi : muscle.nameEn));
}
