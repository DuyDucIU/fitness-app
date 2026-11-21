/**
 * Tìm bài tập trên catalog đã cache ở máy (UC03, ADR 0002): khớp không dấu, không phân
 * biệt hoa thường, theo tên EN, tên VI và alias.
 */

/** Phần của một bài tập mà việc tìm cần đọc. */
export interface SearchableExercise {
  id: string;
  nameEn: string;
  nameVi: string | null;
  isArchived: boolean;
  /** `mine`: alias user tự đặt (ưu tiên trước alias chung). */
  aliases: readonly { alias: string; mine: boolean }[];
}

/** Không dấu, chữ thường, bỏ dấu câu, gộp khoảng trắng: "Đẩy-ngực  Ngang" → "day nguc ngang". */
export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export interface ExerciseMatch<T extends SearchableExercise> {
  exercise: T;
  /** Alias của user đã khớp (để hiện "tên bạn đặt"); không có nếu khớp tên hay alias chung. */
  ownAlias?: string;
}

/** Mức khớp, nhỏ hơn là tốt hơn: trùng hẳn, khớp đầu, khớp đầu một từ, chứa. */
function matchRank(term: string, q: string): number | undefined {
  if (term === q) return 0;
  if (term.startsWith(q)) return 1;
  if (term.includes(` ${q}`)) return 2;
  if (term.includes(q)) return 3;
  return undefined;
}

/**
 * Bài khớp `query`, xếp theo: khớp alias của user trước, rồi mức khớp; cùng mức thì giữ
 * thứ tự đầu vào (người gọi tự sắp, vd theo tên hiển thị). Bài đã lưu trữ không hiện.
 * Ô tìm trống thì trả mọi bài.
 */
export function searchExercises<T extends SearchableExercise>(
  query: string,
  exercises: readonly T[],
): ExerciseMatch<T>[] {
  const q = normalizeSearchText(query);
  const active = exercises.filter((exercise) => !exercise.isArchived);
  if (!q) return active.map((exercise) => ({ exercise }));
  const ranked: { match: ExerciseMatch<T>; own: boolean; rank: number }[] = [];
  for (const exercise of active) {
    let best: { own: boolean; rank: number; ownAlias?: string } | undefined;
    const consider = (text: string, ownAlias?: string) => {
      const rank = matchRank(normalizeSearchText(text), q);
      if (rank === undefined) return;
      const own = ownAlias !== undefined;
      // Alias của user luôn đứng trên tên và alias chung (UC03 bước 2).
      if (
        !best ||
        (own && !best.own) ||
        (own === best.own && rank < best.rank)
      ) {
        best = { own, rank, ownAlias };
      }
    };
    for (const { alias, mine } of exercise.aliases) {
      consider(alias, mine ? alias : undefined);
    }
    consider(exercise.nameEn);
    if (exercise.nameVi) consider(exercise.nameVi);
    if (best) {
      ranked.push({
        match:
          best.ownAlias === undefined
            ? { exercise }
            : { exercise, ownAlias: best.ownAlias },
        own: best.own,
        rank: best.rank,
      });
    }
  }
  // Array.sort ổn định: cùng mức thì giữ thứ tự đầu vào.
  ranked.sort((a, b) => Number(b.own) - Number(a.own) || a.rank - b.rank);
  return ranked.map((r) => r.match);
}
