import { createCn } from 'cn/config';

/**
 * `cn` (clsx + tailwind-merge) biết token riêng trong `src/index.css`. Không khai báo thì
 * `text-read` (cỡ chữ) và `text-tyvek` (màu chữ) bị coi là cùng nhóm, class sau xoá class
 * trước, và nút nền mực mất màu chữ. Thêm token mới vào `@theme` thì thêm vào đây.
 *
 * Luôn import `cn` từ `@/lib/utils`, không import thẳng từ package `cn` (ESLint chặn).
 */
export const cn = createCn({
  extend: {
    theme: {
      color: [
        'ground',
        'tyvek',
        'ink',
        'rule',
        'rule-soft',
        'orange',
        'orange-tint',
        'blue',
        'blue-deep',
        'green',
        'on-signal',
        'danger',
      ],
      text: ['label', 'read', 'num', 'bib', 'bib-lg', 'bib-md', 'bib-sm'],
      radius: ['sheet'],
      ease: ['snap'],
    },
  },
});
