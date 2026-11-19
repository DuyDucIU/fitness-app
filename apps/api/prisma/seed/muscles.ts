/** 17 nhóm cơ trong free-exercise-db (đã đối chiếu với file đã ghim) -> tên tiếng Anh, tiếng Việt và nhóm lớn. */
export const MUSCLES: Record<
  string,
  { nameEn: string; nameVi: string; muscleGroup: string }
> = {
  abdominals: { nameEn: 'Abs', nameVi: 'Cơ bụng', muscleGroup: 'core' },
  abductors: {
    nameEn: 'Abductors',
    nameVi: 'Cơ dạng hông',
    muscleGroup: 'legs',
  },
  adductors: {
    nameEn: 'Adductors',
    nameVi: 'Cơ khép đùi',
    muscleGroup: 'legs',
  },
  biceps: { nameEn: 'Biceps', nameVi: 'Cơ tay trước', muscleGroup: 'arms' },
  calves: { nameEn: 'Calves', nameVi: 'Bắp chân', muscleGroup: 'legs' },
  chest: { nameEn: 'Chest', nameVi: 'Ngực', muscleGroup: 'chest' },
  forearms: { nameEn: 'Forearms', nameVi: 'Cẳng tay', muscleGroup: 'arms' },
  glutes: { nameEn: 'Glutes', nameVi: 'Cơ mông', muscleGroup: 'legs' },
  hamstrings: { nameEn: 'Hamstrings', nameVi: 'Đùi sau', muscleGroup: 'legs' },
  lats: { nameEn: 'Lats', nameVi: 'Cơ xô', muscleGroup: 'back' },
  'lower back': {
    nameEn: 'Lower back',
    nameVi: 'Lưng dưới',
    muscleGroup: 'back',
  },
  'middle back': {
    nameEn: 'Middle back',
    nameVi: 'Lưng giữa',
    muscleGroup: 'back',
  },
  neck: { nameEn: 'Neck', nameVi: 'Cổ', muscleGroup: 'neck' },
  quadriceps: { nameEn: 'Quads', nameVi: 'Đùi trước', muscleGroup: 'legs' },
  shoulders: { nameEn: 'Shoulders', nameVi: 'Vai', muscleGroup: 'shoulders' },
  traps: { nameEn: 'Traps', nameVi: 'Cơ thang', muscleGroup: 'back' },
  triceps: { nameEn: 'Triceps', nameVi: 'Cơ tay sau', muscleGroup: 'arms' },
};
