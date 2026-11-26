import type * as React from 'react';

import { Subtabs } from '@/components/controls';
import { EmptyState } from '@/components/empty-state';
import { m } from '@/paraglide/messages.js';

/** Training | Body (prototypes/progress). */
export function ProgressTabs() {
  return (
    <Subtabs
      aria-label={m.progress_tabs_label()}
      items={[
        { to: '/progress', label: m.progress_tab_training() },
        { to: '/progress/body', label: m.progress_tab_body() },
      ]}
    />
  );
}

/** Khối kiểu số áo có dải viền rỗng và câu ở giữa: chưa có dữ liệu, hay cần mạng. */
export function NoticeBib({
  title,
  children,
  stat,
  action,
}: {
  title: string;
  children: React.ReactNode;
  stat?: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-md bg-tyvek">
      <h2 className="flex min-h-14 items-center px-4 py-1.5 label-caps shadow-[inset_0_0_0_2px_var(--color-ink)]">
        {title}
      </h2>
      <EmptyState stat={stat} action={action}>
        {children}
      </EmptyState>
    </section>
  );
}

/** Tiêu đề khối (.chd): tiêu đề 16px 700, dòng phụ 12px, số lớn tuỳ chọn bên phải. */
export function BlockHeading({
  title,
  sub,
  value,
}: {
  title: string;
  sub?: string;
  value?: string;
}) {
  return (
    <div className="flex items-start gap-2 px-4 pt-3.5">
      <h2 className="flex-1 text-read leading-[1.3] font-bold">
        {title}
        {sub && <small className="block text-label font-semibold">{sub}</small>}
      </h2>
      {value && <b className="text-num leading-none numeral">{value}</b>}
    </div>
  );
}
