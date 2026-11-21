import type * as React from 'react';

/**
 * Logo Google một màu (prototypes/shared/kit.js › google): lucide không có logo thương
 * hiệu. Tô bằng `currentColor`, các mảng đậm nhạt khác nhau để vẫn nhận ra chữ G.
 */
export function GoogleIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.5Z" />
      <path
        d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.6c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.6A10 10 0 0 0 12 22Z"
        opacity=".75"
      />
      <path
        d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3a10 10 0 0 0 0 9Z"
        opacity=".55"
      />
      <path
        d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3 7.5l3.4 2.6C7.2 7.8 9.4 6 12 6Z"
        opacity=".9"
      />
    </svg>
  );
}
