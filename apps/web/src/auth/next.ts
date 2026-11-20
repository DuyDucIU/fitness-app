/**
 * Chỉ nhận đường dẫn trong app (`/...`), tránh chuyển hướng sang site khác. Phân tích
 * như trình duyệt (`/\evil.com` cũng là `//evil.com`) rồi so origin, thay vì so chuỗi.
 */
export function safeNext(next: string | null): string {
  if (!next?.startsWith('/')) return '/';
  const origin = window.location.origin;
  const url = new URL(next, origin);
  return url.origin === origin ? url.pathname + url.search + url.hash : '/';
}
