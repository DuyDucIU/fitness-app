import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Banner giữa thanh trên và vùng cuộn (prototypes/shared/base.css › .banner): nền Trắng Tyvek
 * viền mực 1.5px, icon đầu dòng, dòng đầu đậm rồi câu giải thích, hành động bên phải.
 * Dùng cho: có bản cập nhật, đang deload, đang có buổi tập, đang ngoại tuyến.
 */
export function Banner({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mx-3 mb-2 flex flex-none items-start gap-3 rounded-md bg-tyvek py-3 pr-2 pl-3.5 shadow-[inset_0_0_0_1.5px_var(--color-ink)] [&>svg]:size-5 [&>svg]:flex-none',
        className,
      )}
    >
      {icon}
      <p className="flex-1 leading-[1.4]">
        <b className="block">{title}</b>
        {children}
      </p>
      {action}
    </div>
  );
}
