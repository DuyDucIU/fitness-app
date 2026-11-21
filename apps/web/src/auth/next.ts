/**
 * Chỉ nhận đường dẫn trong app (`/...`), tránh chuyển hướng sang site khác. Phân tích
 * như trình duyệt (`/\evil.com` cũng là `//evil.com`) rồi so origin; kết quả vẫn phải
 * không bắt đầu bằng `//` (vd `/.//evil.com` chuẩn hoá thành `//evil.com`), vì router
 * coi `//...` là URL tuyệt đối.
 */
export function safeNext(next: string | null): string {
  if (!next?.startsWith('/')) return '/';
  const origin = window.location.origin;
  let url: URL;
  try {
    url = new URL(next, origin);
  } catch {
    return '/';
  }
  const path = url.pathname + url.search + url.hash;
  return url.origin === origin && !path.startsWith('//') ? path : '/';
}
