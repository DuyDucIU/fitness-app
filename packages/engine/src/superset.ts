/**
 * Thứ tự và superset của các bài trong một buổi tập (UC09). Danh sách luôn theo thứ tự tập;
 * một superset là đoạn từ hai bài liền kề trở lên có cùng `supersetGroup`, mỗi đoạn một số
 * riêng. Các hàm ở đây trả về danh sách mới đúng luật đó, không sửa danh sách đưa vào.
 */

export interface SupersetItem {
  id: string;
  supersetGroup: number | null;
}

/** Cắt danh sách thành các đoạn: superset là đoạn nhiều bài, bài lẻ là đoạn một bài. */
export function supersetRuns<T extends SupersetItem>(items: T[]): T[][] {
  const runs: T[][] = [];
  for (const item of items) {
    const run = runs.at(-1);
    if (
      run &&
      item.supersetGroup !== null &&
      run[0]!.supersetGroup === item.supersetGroup
    ) {
      run.push(item);
    } else runs.push([item]);
  }
  return runs;
}

/** Số nhóm chưa bài nào dùng. */
function unusedGroup(items: SupersetItem[]): number {
  return Math.max(0, ...items.map((item) => item.supersetGroup ?? 0)) + 1;
}

/** Đoạn còn một bài thì hết superset; hai đoạn tách rời trùng số thì đoạn sau lấy số mới. */
export function normalizeSupersets<T extends SupersetItem>(items: T[]): T[] {
  const used = new Set<number>();
  let next = unusedGroup(items);
  return supersetRuns(items).flatMap((run) => {
    let group = run.length > 1 ? run[0]!.supersetGroup : null;
    if (group !== null) {
      if (used.has(group)) group = next++;
      used.add(group);
    }
    return run.map((item) =>
      item.supersetGroup === group ? item : { ...item, supersetGroup: group },
    );
  });
}

/**
 * Chuyển bài `id` tới vị trí `to` (tính từ 0, trong danh sách kết quả). Thả vào giữa hai bài
 * cùng superset thì nhập nhóm đó; ra khỏi chỗ kề nhóm của mình thì rời nhóm.
 */
export function moveExercise<T extends SupersetItem>(
  items: T[],
  id: string,
  to: number,
): T[] {
  const list = normalizeSupersets(items);
  const from = list.findIndex((item) => item.id === id);
  if (from < 0) return list;
  const [moved] = list.splice(from, 1);
  list.splice(to, 0, moved!);
  const before = list[to - 1]?.supersetGroup ?? null;
  const after = list[to + 1]?.supersetGroup ?? null;
  let group = moved!.supersetGroup;
  if (before !== null && before === after) group = before;
  else if (group !== before && group !== after) group = null;
  list[to] = { ...moved!, supersetGroup: group };
  return normalizeSupersets(list);
}

/**
 * Gộp bài `id` với bài ngay sau (cả nhóm của hai bài thành một), hoặc tách tại đó nếu hai
 * bài đang cùng superset. Bài cuối buổi thì không đổi.
 */
export function toggleSupersetWithNext<T extends SupersetItem>(
  items: T[],
  id: string,
): T[] {
  const list = normalizeSupersets(items);
  const index = list.findIndex((item) => item.id === id);
  const item = list[index];
  const next = list[index + 1];
  if (!item || !next) return list;
  const fresh = unusedGroup(list);
  const joined = item.supersetGroup;
  if (joined !== null && joined === next.supersetGroup) {
    return normalizeSupersets(
      list.map((x, i) =>
        i > index && x.supersetGroup === joined
          ? { ...x, supersetGroup: fresh }
          : x,
      ),
    );
  }
  const group = joined ?? next.supersetGroup ?? fresh;
  return list.map((x, i) =>
    i === index ||
    i === index + 1 ||
    (x.supersetGroup !== null &&
      (x.supersetGroup === joined || x.supersetGroup === next.supersetGroup))
      ? { ...x, supersetGroup: group }
      : x,
  );
}

/**
 * Bỏ bài `id` khỏi superset của nó; đang ở giữa nhóm thì chuyển ra ngay sau nhóm để các bài
 * còn lại vẫn liền nhau. Bài không thuộc superset thì không đổi.
 */
export function leaveSuperset<T extends SupersetItem>(
  items: T[],
  id: string,
): T[] {
  const list = normalizeSupersets(items);
  const run = supersetRuns(list).find((r) => r.some((x) => x.id === id));
  if (!run || run.length < 2) return list;
  const index = list.findIndex((x) => x.id === id);
  const first = list.indexOf(run[0]!);
  const last = list.indexOf(run.at(-1)!);
  const alone = { ...list[index]!, supersetGroup: null };
  list.splice(index, 1);
  // Bỏ bài ra thì cuối nhóm lùi một chỗ, nên chèn tại `last` là ngay sau nhóm.
  list.splice(index > first && index < last ? last : index, 0, alone);
  return normalizeSupersets(list);
}

/**
 * Thay bài `oldId` bằng `added` (chưa có trong danh sách); bài mới nhận superset của bài cũ.
 * - Không giữ bài cũ (chưa ghi set): bài mới thế đúng chỗ.
 * - Giữ bài cũ (đã ghi set): bài cũ rời superset, bài mới ngay sau. Bài cũ không đứng đầu
 *   nhóm thì chuyển lên trước nhóm, bài mới thế chỗ của nó, để nhóm không bị cắt đôi.
 */
export function swapInSuperset<T extends SupersetItem>(
  items: T[],
  oldId: string,
  added: T,
  keepOld: boolean,
): T[] {
  const list = normalizeSupersets(items);
  const index = list.findIndex((x) => x.id === oldId);
  const old = list[index];
  if (!old) return list;
  const replacement = { ...added, supersetGroup: old.supersetGroup };
  if (!keepOld) {
    list[index] = replacement;
    return normalizeSupersets(list);
  }
  const run = supersetRuns(list).find((r) => r.includes(old))!;
  const first = list.indexOf(run[0]!);
  list.splice(index + 1, 0, replacement);
  list.splice(index, 1);
  list.splice(first, 0, { ...old, supersetGroup: null });
  return normalizeSupersets(list);
}

/** Bài kế tiếp sau khi ghi một set trong superset. */
export interface SupersetStep {
  nextId: string;
  /** Hết một vòng của nhóm: lúc này mới nghỉ. */
  roundOver: boolean;
}

/**
 * Tập xen kẽ (UC09): sau một set của bài `loggedId`, sang bài sau trong nhóm còn set chờ;
 * không còn bài sau thì hết vòng, về bài đầu còn set chờ (cả nhóm xong thì ở lại).
 * `remaining` là số set chờ tính cả set vừa ghi. `null`: bài không thuộc superset.
 */
export function afterSupersetSet(
  items: (SupersetItem & { remaining: number })[],
  loggedId: string,
): SupersetStep | null {
  const run = supersetRuns(items).find((r) => r.some((x) => x.id === loggedId));
  if (!run || run.length < 2) return null;
  const index = run.findIndex((x) => x.id === loggedId);
  const later = run.slice(index + 1).find((x) => x.remaining > 0);
  if (later) return { nextId: later.id, roundOver: false };
  const first = run.find((x) => x.remaining > 0);
  return { nextId: first?.id ?? loggedId, roundOver: true };
}
