/**
 * Quy ước ghi tạ (SRS Phụ lục B — Load input): con số user nhập là tổng tạ, mỗi bên,
 * mỗi quả, số trên cột tạ hay tạ đeo thêm.
 */
export const LOAD_INPUTS = [
  'total',
  'per_side',
  'per_dumbbell',
  'stack',
  'added_weight',
] as const;
export type LoadInput = (typeof LOAD_INPUTS)[number];

/** Mặc định ghi tạ của một bài khi user chưa chỉnh riêng (USER_EXERCISE_SETTINGS, UC14). */
export interface EquipmentDefaults {
  /** Bậc tạ (kg) cho nút −/+ và ladder. */
  stepKg: number;
  loadInput: LoadInput;
  /** Trọng lượng đòn (kg), chỉ có với tạ đòn; R5 không gợi ý khởi động thấp hơn mức này. */
  barWeightKg: number | null;
}

const FALLBACK: EquipmentDefaults = {
  stepKg: 2.5,
  loadInput: 'total',
  barWeightKg: null,
};

/** Bảng mặc định theo mã dụng cụ của free-exercise-db; mã không có ở đây dùng FALLBACK. */
const BY_EQUIPMENT = new Map<string, EquipmentDefaults>([
  ['barbell', { stepKg: 2.5, loadInput: 'total', barWeightKg: 20 }],
  ['dumbbell', { stepKg: 2, loadInput: 'per_dumbbell', barWeightKg: null }],
  ['kettlebells', { stepKg: 4, loadInput: 'per_dumbbell', barWeightKg: null }],
  ['cable', { stepKg: 5, loadInput: 'stack', barWeightKg: null }],
  ['machine', { stepKg: 5, loadInput: 'stack', barWeightKg: null }],
  ['body only', { stepKg: 2.5, loadInput: 'added_weight', barWeightKg: null }],
]);

/**
 * Mặc định ghi tạ theo loại dụng cụ (SDD 7.1 › USER_EXERCISE_SETTINGS: `load_input`
 * mặc định theo dụng cụ, `bar_weight_kg` chỉ cho tạ đòn, mặc định 20). Dùng chung cho
 * việc chụp quy ước ghi tạ vào bài trong buổi và cho các luật gợi ý.
 *
 * Hàm thuần: không đọc đồng hồ, không gọi mạng.
 */
export function equipmentDefaults(equipment: string | null): EquipmentDefaults {
  return (equipment !== null && BY_EQUIPMENT.get(equipment)) || FALLBACK;
}
