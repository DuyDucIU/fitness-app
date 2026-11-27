import { GripIcon } from '@/components/icons';
import { Note } from '@/components/text';
import { cn } from '@/lib/utils';

/** Dòng gợi ý dưới danh sách kéo thả, kèm biểu tượng tay nắm (.reorder-hint). */
export function ReorderHint({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: string;
}) {
  return (
    <Note id={id} className={cn('mt-2! flex items-center gap-1.5', className)}>
      <GripIcon className="size-4 flex-none" aria-hidden />
      {children}
    </Note>
  );
}
