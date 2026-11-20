/** Chỉ nhận đường dẫn trong app (`/...`), tránh mở chuyển hướng sang site khác (`//evil`). */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}
