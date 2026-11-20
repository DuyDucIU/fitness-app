/** User của phiên đăng nhập, theo Supabase Auth (`id` = `USERS.auth_subject`). */
export interface AuthUser {
  id: string;
  email: string;
  /** "email" hoặc "google" (app_metadata.provider của Supabase). */
  provider: string;
}

/**
 * Kết quả đọc phiên đã lưu trên máy:
 * - `session`: có phiên dùng được.
 * - `none`: không có phiên (chưa đăng nhập, hoặc server đã từ chối refresh token).
 * - `unreachable`: access token đã hết hạn và không refresh được vì mất mạng; phiên có
 *   thể vẫn còn, refresh lại khi có mạng (SDD 9.1, Q5).
 */
export type SessionLookup =
  | { kind: 'session'; user: AuthUser }
  | { kind: 'none' }
  | { kind: 'unreachable' };

/** Mã lỗi đăng nhập/đăng ký mà UI dịch thành câu hiển thị (`authErrorMessage`). */
export type AuthFailureCode =
  | 'invalid_credentials'
  | 'user_already_exists'
  | 'weak_password'
  | 'email_not_confirmed'
  | 'rate_limited'
  | 'network'
  /** Máy còn thay đổi chưa đồng bộ của chủ máy khác (ADR 0001). */
  | 'owner_has_unsynced'
  | 'unknown';

export class AuthFailure extends Error {
  readonly code: AuthFailureCode;
  /** Với `owner_has_unsynced`: email của chủ máy hiện tại. */
  readonly ownerEmail?: string;

  constructor(code: AuthFailureCode, options?: { ownerEmail?: string }) {
    super(code);
    this.name = 'AuthFailure';
    this.code = code;
    this.ownerEmail = options?.ownerEmail;
  }
}

/**
 * Cổng tới nhà cung cấp auth (Supabase). Mọi lỗi ném ra là `AuthFailure`.
 * Bản thật: `createSupabaseGateway`; test dùng bản giả.
 */
export interface AuthGateway {
  getSession(): Promise<SessionLookup>;
  signIn(email: string, password: string): Promise<AuthUser>;
  /** `null` khi project bật xác nhận email: chưa có phiên cho tới khi user bấm link. */
  signUp(email: string, password: string): Promise<AuthUser | null>;
  /** Chỉ xoá phiên trên máy này (`scope: 'local'`). */
  signOut(): Promise<void>;
  /** Gọi `listener` mỗi khi phiên trên máy biến mất (kể cả do chính `signOut`). */
  onSessionEnded(listener: () => void): () => void;
}
