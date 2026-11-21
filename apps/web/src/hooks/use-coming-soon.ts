import { useToast } from '@/components/toast-context';
import { m } from '@/paraglide/messages.js';

/**
 * `onClick` cho nút của tính năng chưa làm (Google, quên mật khẩu, xoá tài khoản…):
 * hiện toast "Coming soon" để nút không trông như bị hỏng. Làm xong tính năng thì bỏ
 * chỗ gọi; tìm `useComingSoon` để biết còn nút giả nào.
 */
export function useComingSoon(): () => void {
  const toast = useToast();
  return () => toast.show(m.common_coming_soon());
}
