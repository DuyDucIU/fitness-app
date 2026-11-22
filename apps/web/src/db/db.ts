import type {
  CatalogExercise,
  Routine,
  SessionExercise,
  SetLog,
  SyncEntity,
  WorkoutSession,
} from '@fitness/contract';
import { Dexie, type EntityTable } from 'dexie';

/**
 * Sự kiện đồng bộ (SDD 3.2): mỗi thay đổi dữ liệu phiên tập ghi một sự kiện vào outbox,
 * trong cùng transaction với bản ghi gốc; đẩy lên server theo thứ tự `seq` (POST /sync/push).
 */
export interface OutboxEvent {
  /** Khoá tự tăng = thứ tự đẩy lên server. */
  seq: number;
  /** Bảng gốc của sự kiện, vd "set_logs". */
  entity: SyncEntity;
  /** UUID sinh ở client của bản ghi. */
  entityId: string;
  /** Xoá là tombstone `deletedAt`, nên mọi sự kiện đều là upsert. */
  op: 'upsert';
  /** Bản ghi tại thời điểm thay đổi. */
  payload: unknown;
  createdAt: number;
  attempts: number;
}

/**
 * Sự kiện outbox server từ chối hẳn (vd 400, 403): bỏ khỏi outbox để không chặn các thay
 * đổi sau, nhưng giữ lại trên máy (cùng bản ghi gốc) thay vì xoá.
 */
export interface SyncReject {
  id: number;
  event: OutboxEvent;
  /** Mã lỗi API (SDD 8.1), vd "forbidden". */
  code: string;
  rejectedAt: number;
}

/** Trạng thái đồng bộ dạng key-value, vd cursor của GET /sync/pull?since=<cursor>. */
export interface SyncStateEntry {
  key: string;
  value: string;
}

/** Thông tin về chính máy này dạng key-value, vd chủ máy (`owner`, ADR 0001). */
export interface MetaEntry {
  key: string;
  value: unknown;
}

/**
 * IndexedDB cục bộ qua Dexie: nguồn dữ liệu tạm thời khi offline.
 * Đổi schema = thêm db.version(n + 1) (SDD 11.5), không sửa version cũ.
 */
export const db = new Dexie('fitness') as Dexie & {
  outbox: EntityTable<OutboxEvent, 'seq'>;
  syncRejects: EntityTable<SyncReject, 'id'>;
  syncState: EntityTable<SyncStateEntry, 'key'>;
  meta: EntityTable<MetaEntry, 'key'>;
  /**
   * Cache chỉ đọc của catalog bài tập (ADR 0002): bản sao GET /v1/catalog, chỉ
   * `catalog-sync` thay cả bảng khi làm mới, không sửa từng bài.
   */
  exercises: EntityTable<CatalogExercise, 'id'>;
  /**
   * Cache chỉ đọc của routine (ADR 0002): bản sao GET /v1/routines, mỗi dòng là cả routine
   * kèm ngày tập và bài. Chỉ `routine-sync` thay cả bảng; sửa routine đi qua REST.
   */
  routines: EntityTable<Routine, 'id'>;
  /**
   * Dữ liệu buổi tập (SDD 3.2), local-first qua outbox: chỉ ghi qua `workout/session`,
   * mỗi lần ghi kèm một sự kiện outbox trong cùng transaction. Xoá bằng tombstone.
   */
  workoutSessions: EntityTable<WorkoutSession, 'id'>;
  sessionExercises: EntityTable<SessionExercise, 'id'>;
  setLogs: EntityTable<SetLog, 'id'>;
};

db.version(1).stores({
  outbox: '++seq, [entity+entityId]',
  syncState: 'key',
});
db.version(2).stores({
  meta: 'key',
});
db.version(3).stores({
  exercises: 'id',
});
db.version(4).stores({
  workoutSessions: 'id, startedAt',
  sessionExercises: 'id, sessionId',
  setLogs: 'id, sessionExerciseId',
});
db.version(5).stores({
  syncRejects: '++id',
});
// Index `exerciseId` cho truy vấn "lần trước" của một bài (UC07 bước 2, SDD 7.1).
db.version(6).stores({
  sessionExercises: 'id, sessionId, exerciseId',
});
// Cache chỉ đọc của routine (UC05, ADR 0002).
db.version(7).stores({
  routines: 'id',
});
