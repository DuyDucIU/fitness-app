import { supersetRuns } from '@fitness/engine';
import * as React from 'react';

import { LinkIcon, PlusIcon } from '@/components/icons';
import { ReorderHint } from '@/components/reorder-hint';
import { useSortable } from '@/components/sortable';
import { OrderNo } from '@/components/text';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { m } from '@/paraglide/messages.js';

/** Một bài trong buổi như hiện ở sheet "Session". */
export interface SessionSheetItem {
  id: string;
  supersetGroup: number | null;
  name: string;
  /** Số set đã ghi. */
  done: number;
  /** Số set dự định. */
  total: number;
  /** Bài ad hoc: thêm hay thay giữa buổi. */
  adHoc: boolean;
}

/**
 * Sheet "Session" (prototypes/workout-log › sessionSheet; UC09): các bài của buổi theo thứ
 * tự, kéo tay nắm để đổi thứ tự, nút mắt xích gộp / tách superset với bài kế, ngoặc nối
 * các bài cùng superset, và nút thêm bài. Mọi thay đổi chỉ đụng tới buổi đang tập.
 */
export function SessionSheet({
  open,
  onOpenChange,
  name,
  items,
  onMove,
  onToggle,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tên buổi. */
  name: string;
  items: SessionSheetItem[];
  /** Chuyển bài `id` tới vị trí `to` (từ 0). */
  onMove: (id: string, to: number) => Promise<unknown>;
  /** Gộp bài `id` với bài kế, hoặc tách nếu đang cùng superset. */
  onToggle: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        aria-describedby={undefined}
        // Esc khi đang nhấc một bài chỉ huỷ di chuyển, không đóng sheet.
        onEscapeKeyDown={(event) => {
          if (
            document.activeElement?.matches(
              '[data-sort-handle][aria-pressed="true"]',
            )
          )
            event.preventDefault();
        }}
      >
        <SheetHeader>
          <SheetTitle>{m.log_session_title({ name })}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <ExerciseOrder items={items} onMove={onMove} onToggle={onToggle} />
          <Button variant="ink" className="mt-3" onClick={onAdd}>
            <PlusIcon aria-hidden />
            {m.log_add_exercise()}
          </Button>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function ExerciseOrder({
  items,
  onMove,
  onToggle,
}: {
  items: SessionSheetItem[];
  onMove: (id: string, to: number) => Promise<unknown>;
  onToggle: (id: string) => void;
}) {
  const hintId = React.useId();
  const sortable = useSortable({
    items,
    name: (item) => item.name,
    onCommit: (ids, movedId) => onMove(movedId, ids.indexOf(movedId)),
  });
  const runs = supersetRuns(sortable.ordered).filter((run) => run.length > 1);
  const grouped = new Set(runs.flatMap((run) => run.map((item) => item.id)));
  // Bài nối với bài ngay sau nó: mọi bài của superset trừ bài cuối.
  const linked = new Set(
    runs.flatMap((run) => run.slice(0, -1).map((item) => item.id)),
  );

  return (
    <>
      <ol {...sortable.listProps}>
        {sortable.ordered.map((item, i) => (
          <li key={item.id} {...sortable.itemProps(item)}>
            {linked.has(item.id) && (
              // Ngoặc nối sang hàng kế (prototype › .order .ss).
              <span
                aria-hidden
                className="absolute top-3 -bottom-3 -left-2.5 w-1.5 rounded-l-[4px] border-2 border-r-0 border-ink"
              />
            )}
            {/* Nút đang bật (tay nắm đang nhấc, mắt xích đang nối) đảo sang nền mực. */}
            <div className="flex min-h-15 items-center gap-2.5 [&_button[aria-pressed=true]]:bg-ink [&_button[aria-pressed=true]]:text-tyvek">
              {sortable.handle(item, i, hintId)}
              <OrderNo n={i + 1} />
              <span className="min-w-0 flex-1 leading-[1.3] font-semibold">
                {item.name}
                <small className="block text-label font-normal">
                  {[
                    m.log_session_sets({ done: item.done, count: item.total }),
                    grouped.has(item.id) && m.log_session_in_superset(),
                    item.adHoc && m.log_session_added(),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              </span>
              <button
                type="button"
                className="grid size-11 flex-none place-items-center rounded-sm disabled:opacity-25"
                aria-pressed={linked.has(item.id)}
                aria-label={m.log_session_link({ name: item.name })}
                disabled={i === sortable.ordered.length - 1}
                onClick={() => onToggle(item.id)}
              >
                <LinkIcon className="size-5" aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ol>
      <ReorderHint id={hintId}>{m.log_session_reorder_hint()}</ReorderHint>
    </>
  );
}
