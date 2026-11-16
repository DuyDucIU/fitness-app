import { Dexie, type EntityTable } from 'dexie';

/**
 * Sự kiện đồng bộ (SDD 3.2): mỗi thay đổi dữ liệu phiên tập ghi một sự kiện vào outbox,
 * trong cùng transaction với bản ghi gốc; đẩy lên server theo thứ tự `seq` (POST /sync/push).
 */
export interface OutboxEvent {
  /** Khoá tự tăng = thứ tự đẩy lên server. */
  seq: number;
  /** Bảng gốc của sự kiện, vd "set_logs". */
  entity: string;
  /** UUID sinh ở client của bản ghi. */
  entityId: string;
  op: 'upsert' | 'delete';
  /** Bản ghi tại thời điểm thay đổi. */
  payload: unknown;
  createdAt: number;
  attempts: number;
}

/** Trạng thái đồng bộ dạng key-value, vd cursor của GET /sync/pull?since=<cursor>. */
export interface SyncStateEntry {
  key: string;
  value: string;
}

/**
 * IndexedDB cục bộ qua Dexie: nguồn dữ liệu tạm thời khi offline.
 * Đổi schema = thêm db.version(n + 1) (SDD 11.5), không sửa version cũ.
 * Các bảng WORKOUT_SESSIONS / SESSION_EXERCISES / SET_LOGS thêm cùng tính năng ghi buổi tập.
 */
export const db = new Dexie('fitness') as Dexie & {
  outbox: EntityTable<OutboxEvent, 'seq'>;
  syncState: EntityTable<SyncStateEntry, 'key'>;
};

db.version(1).stores({
  outbox: '++seq, [entity+entityId]',
  syncState: 'key',
});
