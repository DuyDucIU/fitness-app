import type { AuthFailure } from '@/auth/gateway';
import { m } from '@/paraglide/messages.js';

/**
 * Câu hiển thị cho lỗi đăng nhập/đăng ký. Viết tường minh từng mã (giống `errorMessage`)
 * để Paraglide tree-shake được và lint bắt được key sai.
 */
export function authErrorMessage(failure: AuthFailure): string {
  switch (failure.code) {
    case 'invalid_credentials':
      return m.auth_error_invalid_credentials();
    case 'user_already_exists':
      return m.auth_error_user_already_exists();
    case 'weak_password':
      return m.auth_error_weak_password();
    case 'email_not_confirmed':
      return m.auth_error_email_not_confirmed();
    case 'rate_limited':
      return m.auth_error_rate_limited();
    case 'network':
      return m.error_network();
    case 'owner_has_unsynced':
      return m.auth_error_owner_has_unsynced({
        email: failure.ownerEmail ?? '',
      });
    case 'unknown':
      return m.error_unknown();
  }
}
