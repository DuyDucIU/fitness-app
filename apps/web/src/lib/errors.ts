import { m } from '@/paraglide/messages.js';

/**
 * Lỗi từ API (`code = 'network'` khi không tới được server): giữ `code` của response lỗi thống nhất (SDD 8.1) để client hiển thị
 * message đã dịch; `message` của server chỉ để debug.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message?: string) {
    super(message ?? code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Câu hiển thị cho một lỗi, theo ngôn ngữ đang dùng. Mỗi mã lỗi API có một message
 * `error_<code>`; ánh xạ viết tường minh để Paraglide tree-shake được và lint bắt được
 * key sai (không truy cập `m[...]` động).
 */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'validation_failed':
        return m.error_validation_failed();
      case 'unauthorized':
        return m.error_unauthorized();
      case 'not_found':
        return m.error_not_found();
      case 'internal_server_error':
        return m.error_internal_server_error();
      case 'network':
        return m.error_network();
      default:
        return m.error_unknown();
    }
  }
  return m.error_unknown();
}
