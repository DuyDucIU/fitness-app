import * as React from 'react';
import { cn } from '@/lib/utils';
import { Dialog as SheetPrimitive } from 'radix-ui';

import { CloseIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { m } from '@/paraglide/messages.js';

/**
 * Bottom sheet theo DESIGN.md (prototypes/shared/base.css › .sheet). Sinh bằng shadcn CLI
 * (`sheet`, nền Radix Dialog) rồi chỉnh chỉ còn dạng trượt từ dưới lên trong cột 440px,
 * bo 16px hai góc trên, có tay nắm, lớp phủ mực 42%, không đổ bóng.
 */
function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        'fixed inset-0 z-40 mx-auto max-w-[440px] bg-ink/42 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Phần tử được focus khi mở sheet (kit.js › openSheet): ô có `data-autofocus`, nếu không có
 * thì nút đóng. Dùng `data-autofocus` vì React không render thuộc tính `autofocus` ra DOM.
 */
function focusOnOpen(event: Event) {
  const content = event.currentTarget as HTMLElement | null;
  const target =
    content?.querySelector<HTMLElement>('[data-autofocus]') ??
    content?.querySelector<HTMLElement>('[data-slot="sheet-close"]');
  if (target) {
    event.preventDefault();
    target.focus({ preventScroll: true });
  }
}

function SheetContent({
  className,
  children,
  onOpenAutoFocus,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content>) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        onOpenAutoFocus={(event) => {
          onOpenAutoFocus?.(event);
          if (!event.defaultPrevented) focusOnOpen(event);
        }}
        className={cn(
          'fixed inset-x-0 bottom-0 z-41 mx-auto flex max-h-[88dvh] w-full max-w-[440px] flex-col rounded-t-sheet bg-tyvek pb-(--safe-bottom) text-ink outline-none ease-snap data-open:animate-in data-open:duration-280 data-open:slide-in-from-bottom data-closed:animate-out data-closed:duration-280 data-closed:slide-out-to-bottom',
          className,
        )}
        {...props}
      >
        <div
          aria-hidden
          className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-rule"
        />
        {children}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

/**
 * Đầu sheet (.sheet .hd): tiêu đề rồi nút đóng, nên nút đóng đứng trước thân sheet trong
 * thứ tự Tab như prototype.
 */
function SheetHeader({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<'div'> & { showCloseButton?: boolean }) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex items-center gap-2 pt-4 pr-2 pb-2 pl-4', className)}
      {...props}
    >
      {/* Tiêu đề và mô tả xếp dọc; nút đóng đứng riêng bên phải */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">{children}</div>
      {showCloseButton && (
        <SheetPrimitive.Close data-slot="sheet-close" asChild>
          <Button variant="ghost" size="icon" aria-label={m.common_close()}>
            <CloseIcon />
          </Button>
        </SheetPrimitive.Close>
      )}
    </div>
  );
}

/** Thân sheet cuộn được; nội dung dài không đẩy tay nắm và nút đóng ra khỏi màn hình. */
function SheetBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-body"
      className={cn('overflow-y-auto overscroll-contain px-4 pb-4', className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        'mt-auto flex flex-col gap-2 border-t border-rule-soft px-4 py-3',
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-read leading-[1.3] font-bold', className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-label font-semibold', className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
