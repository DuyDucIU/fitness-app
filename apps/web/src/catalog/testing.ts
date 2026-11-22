/** Catalog mẫu cho test: chỉ import từ file test. */
import type { CatalogExercise, CatalogResponse } from '@fitness/contract';

const chest = {
  code: 'chest',
  nameEn: 'Chest',
  nameVi: 'Ngực',
  muscleGroup: 'chest',
  role: 'primary',
} as const;
const triceps = {
  code: 'triceps',
  nameEn: 'Triceps',
  nameVi: 'Cơ tay sau',
  muscleGroup: 'arms',
  role: 'secondary',
} as const;
const quads = {
  code: 'quadriceps',
  nameEn: 'Quads',
  nameVi: 'Đùi trước',
  muscleGroup: 'legs',
  role: 'primary',
} as const;

export const BENCH: CatalogExercise = {
  id: '00000000-0000-4000-8000-000000000001',
  nameEn: 'Barbell Bench Press - Medium Grip',
  nameVi: 'Đẩy ngực ngang tạ đòn',
  equipment: 'barbell',
  mechanic: 'compound',
  metricType: 'weight_reps',
  mine: false,
  isArchived: false,
  muscles: [chest, triceps],
  aliases: [
    { alias: 'bench press', lang: 'en', mine: false },
    { alias: 'đẩy ngực', lang: 'vi', mine: false },
  ],
};

export const DUMBBELL_BENCH: CatalogExercise = {
  id: '00000000-0000-4000-8000-000000000002',
  nameEn: 'Dumbbell Bench Press',
  nameVi: 'Đẩy ngực ngang tạ đơn',
  equipment: 'dumbbell',
  mechanic: 'compound',
  metricType: 'weight_reps',
  mine: false,
  isArchived: false,
  muscles: [chest],
  aliases: [{ alias: 'ngực phẳng', lang: 'vi', mine: true }],
};

export const SQUAT: CatalogExercise = {
  id: '00000000-0000-4000-8000-000000000003',
  nameEn: 'Barbell Squat',
  nameVi: 'Squat tạ đòn',
  equipment: 'barbell',
  mechanic: 'compound',
  metricType: 'weight_reps',
  mine: false,
  isArchived: false,
  muscles: [quads],
  aliases: [{ alias: 'gánh tạ', lang: 'vi', mine: false }],
};

/** Bài tuỳ chỉnh của chủ máy: chưa có tên Việt, dụng cụ ngoài danh sách. */
export const SLED_PUSH: CatalogExercise = {
  id: '00000000-0000-4000-8000-000000000004',
  nameEn: 'Sled push',
  nameVi: null,
  equipment: 'sled',
  mechanic: null,
  metricType: 'distance',
  mine: true,
  isArchived: false,
  muscles: [],
  aliases: [],
};

/** Bài chỉ ghi reps, không nằm trong `CATALOG` (thêm thẳng vào cache khi cần). */
export const PUSH_UP: CatalogExercise = {
  id: '00000000-0000-4000-8000-000000000005',
  nameEn: 'Pushups',
  nameVi: 'Hít đất',
  equipment: 'body only',
  mechanic: 'compound',
  metricType: 'reps',
  mine: false,
  isArchived: false,
  muscles: [chest],
  aliases: [],
};

export const CATALOG: CatalogResponse = {
  exercises: [SQUAT, BENCH, DUMBBELL_BENCH, SLED_PUSH],
};
