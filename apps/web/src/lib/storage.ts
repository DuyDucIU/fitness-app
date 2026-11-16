/**
 * Xin trình duyệt giữ dữ liệu lâu dài (SRS 5.3, biện pháp 1). Trình duyệt tự quyết,
 * thường không hỏi user; kết quả chỉ để tham khảo, app không phụ thuộc vào nó.
 * @returns true/false theo kết quả, undefined nếu trình duyệt không có StorageManager.
 */
export async function requestPersistentStorage(): Promise<boolean | undefined> {
  if (!navigator.storage?.persist) return undefined;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}
