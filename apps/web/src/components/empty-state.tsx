import type * as React from 'react';

/**
 * Khối trống (prototypes/shared/base.css › .empty): số lớn tuỳ chọn, một câu ngắn
 * (tối đa 30ch) và một hành động.
 */
export function EmptyState({
  stat,
  children,
  action,
}: {
  /** Số lớn kiểu số áo (vd "0"). */
  stat?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-5 pt-7 pb-6 text-center">
      {stat !== undefined && (
        <span className="mb-2 block text-bib numeral">{stat}</span>
      )}
      <p className="mx-auto mb-3.5 max-w-[30ch]">{children}</p>
      {action}
    </div>
  );
}

/** Thông báo lỗi trong màn (viền đỏ, không đổ bóng). */
export function Alert({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-md bg-tyvek px-4 py-3.5 shadow-[inset_0_0_0_2px_var(--color-danger)]"
    >
      {icon && <span className="mt-0.5 text-danger">{icon}</span>}
      <p>
        <b className="block">{title}</b>
        {children}
      </p>
    </div>
  );
}
