import * as React from 'react';

import { useAnnounce } from '@/components/toast-context';
import { GripIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';

function moved<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const reduceMotion = () =>
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Drag {
  id: number;
  from: number;
  to: number;
  y0: number;
  scrollTop0: number;
  height: number;
  rects: DOMRect[];
  nodes: HTMLElement[];
  scroller: HTMLElement;
}

/**
 * Kéo để sắp xếp (DESIGN.md › Kéo để sắp xếp; port prototypes/shared/sortable.js): tay
 * nắm 44px đầu hàng. Chạm/chuột: nhấn tay nắm rồi kéo, hàng đang kéo nổi theo ngón tay
 * với viền inset mực, các hàng khác trượt nhường chỗ. Bàn phím: Space nhấc/thả, ↑/↓ di
 * chuyển, Esc huỷ.
 *
 * Thứ tự mới chỉ gửi đi một lần khi thả (`onCommit`); trong lúc chờ, danh sách hiện thứ tự
 * mới. `onCommit` lỗi thì quay về thứ tự từ `items`.
 */
export function useSortable<T extends { id: string }>({
  items,
  name,
  onCommit,
}: {
  items: T[];
  /** Tên mục để đọc cho trình đọc màn hình. */
  name: (item: T) => string;
  onCommit: (ids: string[]) => Promise<unknown>;
}) {
  const announce = useAnnounce();
  const [order, setOrder] = React.useState<string[] | null>(null);
  const [held, setHeld] = React.useState<{ id: string; start: number } | null>(
    null,
  );
  const [dragging, setDragging] = React.useState<string | null>(null);
  const listRef = React.useRef<HTMLOListElement>(null);
  const drag = React.useRef<Drag | null>(null);
  const focusId = React.useRef<string | null>(null);

  const ordered = React.useMemo(() => {
    if (!order) return items;
    const byId = new Map(items.map((item) => [item.id, item]));
    const kept = order.flatMap((id) => byId.get(id) ?? []);
    // Danh sách đổi khác (vd thêm/xoá từ chỗ khác) thì bỏ thứ tự tạm.
    return kept.length === items.length ? kept : items;
  }, [items, order]);

  // Giữ focus trên tay nắm của mục đang nhấc sau mỗi lần di chuyển bằng phím.
  React.useLayoutEffect(() => {
    if (!focusId.current) return;
    listRef.current
      ?.querySelector<HTMLElement>(
        `[data-sort-handle="${CSS.escape(focusId.current)}"]`,
      )
      ?.focus();
    focusId.current = null;
  });

  const commit = (ids: string[]) => {
    setOrder(ids);
    void onCommit(ids).finally(() => setOrder(null));
  };

  const nodes = () =>
    [
      ...(listRef.current?.querySelectorAll<HTMLElement>(
        ':scope > [data-sort-item]',
      ) ?? []),
    ];

  function onPointerDown(event: React.PointerEvent, index: number) {
    if (event.button > 0 || held) return;
    const all = nodes();
    const list = listRef.current;
    if (!list || !all[index]) return;
    event.preventDefault();
    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      // jsdom và vài trình duyệt cũ không có pointer capture.
    }
    const scroller =
      list.closest<HTMLElement>('main') ??
      (document.scrollingElement as HTMLElement);
    const rects = all.map((node) => node.getBoundingClientRect());
    drag.current = {
      id: event.pointerId,
      from: index,
      to: index,
      y0: event.clientY,
      scrollTop0: scroller.scrollTop,
      height: rects[index].height,
      rects,
      nodes: all,
      scroller,
    };
    const transition = reduceMotion()
      ? 'none'
      : 'transform .18s cubic-bezier(.16,1,.3,1)';
    all.forEach((node, i) => {
      if (i !== index) node.style.transition = transition;
    });
    setDragging(ordered[index].id);
    try {
      navigator.vibrate?.(8);
    } catch {
      // Không rung được thì thôi.
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    const d = drag.current;
    if (!d || event.pointerId !== d.id) return;
    event.preventDefault();
    const dy = event.clientY - d.y0 + (d.scroller.scrollTop - d.scrollTop0);
    d.nodes[d.from].style.transform = `translateY(${dy}px)`;
    const start = d.rects[d.from];
    const mid = start.top + start.height / 2 + dy;
    let to = 0;
    d.rects.forEach((rect, i) => {
      if (i !== d.from && mid > rect.top + rect.height / 2) to++;
    });
    d.to = to;
    d.nodes.forEach((node, i) => {
      if (i === d.from) return;
      const shift =
        d.from < to && i > d.from && i <= to
          ? -d.height
          : d.from > to && i >= to && i < d.from
            ? d.height
            : 0;
      node.style.transform = shift ? `translateY(${shift}px)` : '';
    });
  }

  function onPointerEnd(event: React.PointerEvent) {
    const d = drag.current;
    if (!d || event.pointerId !== d.id) return;
    drag.current = null;
    d.nodes.forEach((node) => {
      node.style.transform = '';
      node.style.transition = '';
    });
    setDragging(null);
    if (d.from === d.to) return;
    const next = moved(ordered, d.from, d.to);
    commit(next.map((item) => item.id));
    announce(
      m.sort_moved({
        name: name(next[d.to]),
        n: d.to + 1,
        total: next.length,
      }),
    );
  }

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const item = ordered[index];
    const total = ordered.length;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!held) {
        setHeld({ id: item.id, start: index });
        setOrder(ordered.map((x) => x.id));
        announce(m.sort_picked({ name: name(item), n: index + 1, total }));
      } else {
        setHeld(null);
        announce(m.sort_dropped({ n: index + 1 }));
        if (index !== held.start) commit(ordered.map((x) => x.id));
        else setOrder(null);
      }
    } else if (held && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      const to = index + (event.key === 'ArrowUp' ? -1 : 1);
      if (to < 0 || to >= total) return;
      setOrder(moved(ordered, index, to).map((x) => x.id));
      focusId.current = item.id;
      announce(m.sort_position({ n: to + 1, total }));
    } else if (held && event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setHeld(null);
      setOrder(null);
      focusId.current = item.id;
      announce(m.sort_cancelled());
    }
  }

  return {
    /** Mục theo thứ tự đang hiển thị (gồm thứ tự tạm khi đang kéo hay chờ lưu). */
    ordered,
    listProps: {
      ref: listRef,
      className: cn('list-none', dragging && 'select-none'),
    },
    /** Props của hàng: nền Trắng Tyvek, viền mực khi đang kéo, viền đôi khi đang nhấc. */
    itemProps: (item: T) => ({
      'data-sort-item': '',
      className: cn(
        'relative bg-tyvek',
        dragging === item.id &&
          'z-[5] rounded-sm shadow-[inset_0_0_0_2px_var(--color-ink)] [transition:none!important] [&_[data-sort-handle]]:bg-ink [&_[data-sort-handle]]:text-tyvek',
        dragging &&
          dragging !== item.id &&
          '[&_a]:pointer-events-none [&_button]:pointer-events-none',
        held?.id === item.id &&
          'shadow-[inset_0_0_0_2px_var(--color-ink),inset_0_0_0_4px_var(--color-tyvek),inset_0_0_0_5px_var(--color-ink)]',
      ),
    }),
    handle: (item: T, index: number, describedBy?: string) => (
      <button
        type="button"
        data-sort-handle={item.id}
        aria-label={m.sort_reorder({ name: name(item) })}
        aria-pressed={held?.id === item.id}
        aria-describedby={describedBy}
        className="-ml-2 grid size-11 flex-none cursor-grab touch-none place-items-center self-center rounded-sm active:cursor-grabbing"
        onPointerDown={(event) => onPointerDown(event, index)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={(event) => onKeyDown(event, index)}
        onBlur={(event) => {
          // Rời khỏi mọi tay nắm khi đang nhấc: thả về chỗ cũ.
          // Bỏ qua blur do chính lần di chuyển (React dời nút trong DOM).
          const next = event.relatedTarget as HTMLElement | null;
          if (focusId.current) return;
          if (held && !next?.closest('[data-sort-handle]')) {
            setHeld(null);
            setOrder(null);
          }
        }}
      >
        <GripIcon className="size-5.5" aria-hidden />
      </button>
    ),
  };
}
