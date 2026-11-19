import type * as React from 'react';
import { Link, type LinkProps } from 'react-router';

import { cn } from '@/lib/utils';

/**
 * Danh sách hành động trong sheet (prototypes/shared/base.css › .menu): mỗi mục cao 52px,
 * icon đầu dòng, tên 600 kèm dòng phụ 12px, ngăn nhau bằng đường `rule-soft`.
 */
export function Menu({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col', className)} {...props} />;
}

interface MenuItemContent {
  icon?: React.ReactNode;
  sub?: React.ReactNode;
  danger?: boolean;
}

const itemClass = (danger?: boolean, className?: string) =>
  cn(
    'flex min-h-13 w-full items-center gap-3.5 border-t border-rule-soft text-left font-semibold no-underline first:border-t-0 [&>svg]:size-5 [&>svg]:flex-none',
    danger && 'text-danger',
    className,
  );

function Content({
  icon,
  sub,
  children,
}: MenuItemContent & { children: React.ReactNode }) {
  return (
    <>
      {icon}
      <span>
        {children}
        {sub && <small className="block text-label font-normal">{sub}</small>}
      </span>
    </>
  );
}

/** Mục hành động (nút). */
export function MenuItem({
  icon,
  sub,
  danger,
  className,
  children,
  ...props
}: React.ComponentProps<'button'> & MenuItemContent) {
  return (
    <button type="button" className={itemClass(danger, className)} {...props}>
      <Content icon={icon} sub={sub}>
        {children}
      </Content>
    </button>
  );
}

/** Mục điều hướng (link trong app). */
export function MenuLink({
  icon,
  sub,
  danger,
  className,
  children,
  ...props
}: LinkProps & MenuItemContent) {
  return (
    <Link className={itemClass(danger, className)} {...props}>
      <Content icon={icon} sub={sub}>
        {children}
      </Content>
    </Link>
  );
}
