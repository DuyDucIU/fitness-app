import type * as React from 'react';
import { cn } from '@/lib/utils';
import { Link, NavLink } from 'react-router';

import {
  BackIcon,
  HistoryIcon,
  MeIcon,
  PlansIcon,
  ProgressIcon,
  TodayIcon,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import { m } from '@/paraglide/messages.js';

/**
 * Khung màn hình (DESIGN.md › Layout): một cột điện thoại rộng tối đa 440px, cao 100dvh,
 * gồm thanh trên, vùng cuộn giữa và vùng đáy cố định. Vùng an toàn iOS cộng vào đỉnh và đáy.
 */
export function AppShell({
  top,
  banner,
  foot,
  children,
  className,
}: {
  top?: React.ReactNode;
  /** Thanh tiếp tục buổi / banner, nằm giữa thanh trên và vùng cuộn. */
  banner?: React.ReactNode;
  foot?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-dvh justify-center">
      <div
        className={cn(
          'relative flex h-dvh w-full max-w-[440px] flex-col overflow-clip bg-ground',
          className,
        )}
      >
        {top}
        {banner}
        <main className="flex-1 overflow-y-auto overscroll-contain px-3 pb-6 [&>*+*]:mt-3">
          {children}
        </main>
        {foot}
      </div>
    </div>
  );
}

/**
 * Thanh trên: tiêu đề 16px đậm, dòng phụ 12px, phần bên phải (chip đồng bộ, nút).
 * `backTo` hiện nút quay lại cho màn đi sâu.
 */
export function TopBar({
  title,
  sub,
  backTo,
  right,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  backTo?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex min-h-16 items-center gap-2.5 px-4 pt-[calc(var(--safe-top)+12px)] pb-2">
      {backTo !== undefined && (
        <Button asChild variant="ghost" size="icon" className="-ml-2.5">
          <Link to={backTo} aria-label={m.common_back()}>
            <BackIcon />
          </Link>
        </Button>
      )}
      <div className="min-w-0">
        <h1 className="truncate text-read leading-[1.2] font-bold">{title}</h1>
        {sub && <p className="text-label font-semibold">{sub}</p>}
      </div>
      {right && (
        <div className="ml-auto flex flex-none items-center gap-2">{right}</div>
      )}
    </header>
  );
}

/** Tiêu đề nhóm trong vùng cuộn. */
export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="px-1 pt-3 text-read leading-[1.3] font-bold [&+*]:mt-2!">
      {children}
    </h2>
  );
}

/**
 * Vùng đáy: nút chính 64px (`dock`) nằm trên thanh tab. Màn gốc truyền `tabs`;
 * màn đi sâu và màn trong buổi tập không có tab.
 */
export function Foot({
  dock,
  tabs,
}: {
  dock?: React.ReactNode;
  tabs?: boolean;
}) {
  return (
    <footer
      className={cn(
        'border-t border-rule-soft bg-ground px-3 pt-2.5',
        tabs
          ? 'pb-[calc(var(--safe-bottom)+2px)]'
          : 'pb-[calc(var(--safe-bottom)+12px)]',
      )}
    >
      {dock && <div className={cn('flex gap-2', tabs && 'mb-1.5')}>{dock}</div>}
      {tabs && <TabBar />}
    </footer>
  );
}

const TABS = [
  { to: '/', label: () => m.nav_today(), Icon: TodayIcon },
  { to: '/plans', label: () => m.nav_plans(), Icon: PlansIcon },
  { to: '/history', label: () => m.nav_history(), Icon: HistoryIcon },
  { to: '/progress', label: () => m.nav_progress(), Icon: ProgressIcon },
  { to: '/me', label: () => m.nav_me(), Icon: MeIcon },
] as const;

/** Thanh tab 5 mục của các màn gốc (không bao giờ hiện trong buổi tập). */
export function TabBar() {
  return (
    <nav aria-label={m.nav_main()} className="-mx-2 grid grid-cols-5">
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className="relative flex min-h-13 flex-col items-center justify-center gap-0.75 rounded-sm text-label font-semibold active:bg-rule-soft aria-[current=page]:font-bold aria-[current=page]:before:absolute aria-[current=page]:before:inset-x-[30%] aria-[current=page]:before:-top-px aria-[current=page]:before:h-0.75 aria-[current=page]:before:rounded-b-[3px] aria-[current=page]:before:bg-ink"
        >
          <Icon className="size-5.5" aria-hidden />
          <span>{label()}</span>
        </NavLink>
      ))}
    </nav>
  );
}
