import * as React from 'react';
import { cn } from '@/lib/utils';

import { FieldContext, useFieldControl } from '@/components/field-context';
import { AlertIcon, EyeIcon, SearchIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatNumber, parseDecimal } from '@/lib/format';
import { m } from '@/paraglide/messages.js';

/**
 * Trường nhập trong sheet (prototypes/shared/base.css › .field): nhãn 12px chữ hoa,
 * control, dòng hướng dẫn hoặc dòng lỗi đỏ. Tự nối nhãn, hướng dẫn và lỗi với control.
 */
export function Field({
  label,
  help,
  error,
  className,
  children,
}: {
  label: React.ReactNode;
  help?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const id = React.useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy =
    [error ? errorId : null, help ? helpId : null].filter(Boolean).join(' ') ||
    undefined;

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: !!error }}>
      <div
        className={cn(
          'border-t border-rule-soft py-3 first:border-t-0',
          className,
        )}
      >
        <label htmlFor={id} className="mb-2 block label-caps">
          {label}
        </label>
        {children}
        {help && (
          <p
            id={helpId}
            className="mt-1.5 text-label leading-[1.4] font-semibold"
          >
            {help}
          </p>
        )}
        {error && (
          <p
            id={errorId}
            className="mt-1.5 flex items-center gap-1.5 text-label font-bold text-danger"
          >
            <AlertIcon className="size-4" aria-hidden />
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

/** Ô nhập chữ nối sẵn với `Field`. */
export function TextInput(props: React.ComponentProps<typeof Input>) {
  return <Input {...useFieldControl()} {...props} />;
}

/** Ô mật khẩu nối sẵn với `Field`, có nút hiện/ẩn (prototypes/start › .pw). */
export function PasswordInput(
  props: Omit<React.ComponentProps<typeof Input>, 'type'>,
) {
  const [shown, setShown] = React.useState(false);
  return (
    <div className="relative">
      <TextInput
        {...props}
        type={shown ? 'text' : 'password'}
        className={cn('pr-13', props.className)}
      />
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-0.5 right-0.5"
        // Nhãn đổi theo trạng thái nên không dùng thêm aria-pressed (đọc thành "Hide, pressed").
        aria-label={shown ? m.auth_hide_password() : m.auth_show_password()}
        onClick={() => setShown((s) => !s)}
      >
        <EyeIcon />
      </Button>
    </div>
  );
}

/**
 * Ô nhập số theo ngôn ngữ đang dùng (SDD 3.5): gõ được cả "77,5" lẫn "77.5";
 * rời ô thì hiển thị lại theo định dạng của ngôn ngữ (77.5 / 77,5).
 * `onValueChange` nhận số đã đọc được, hoặc `null` khi ô rỗng / không hợp lệ.
 */
export function NumberInput({
  value,
  onValueChange,
  maxFractionDigits = 2,
  className,
  ...props
}: Omit<
  React.ComponentProps<typeof Input>,
  'value' | 'onChange' | 'type' | 'inputMode'
> & {
  value: number | null;
  onValueChange: (value: number | null) => void;
  maxFractionDigits?: number;
}) {
  const shown =
    value === null
      ? ''
      : formatNumber(value, { maxFractionDigits, grouping: false });
  const [text, setText] = React.useState(shown);
  const [editing, setEditing] = React.useState(false);

  return (
    <Input
      {...useFieldControl()}
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={editing ? text : shown}
      onFocus={(e) => {
        setText(shown);
        setEditing(true);
        props.onFocus?.(e);
      }}
      onChange={(e) => {
        setText(e.target.value);
        onValueChange(parseDecimal(e.target.value));
      }}
      onBlur={(e) => {
        setEditing(false);
        props.onBlur?.(e);
      }}
      className={cn(
        'w-24 text-center text-num leading-none numeral',
        className,
      )}
    />
  );
}

/**
 * Ô tìm kiếm có icon kính lúp (prototypes/shared/base.css › .search). Bọc bằng `<label>`
 * như prototype để chạm vào cả ô cũng focus. Thêm viền dày khi focus vì ô bên trong tắt
 * outline (prototype không có trạng thái focus nào, thiếu cho người dùng bàn phím).
 */
export function SearchInput({
  className,
  ...props
}: Omit<React.ComponentProps<'input'>, 'type'>) {
  return (
    <label
      className={cn(
        'flex h-12 items-center gap-2.5 rounded-sm border-[1.5px] border-ink bg-white px-3 focus-within:shadow-[inset_0_0_0_1.5px_var(--color-ink)]',
        className,
      )}
    >
      <SearchIcon className="size-5 flex-none" aria-hidden />
      <input
        type="search"
        className="min-w-0 flex-1 bg-transparent text-read outline-none placeholder:text-[#6b6b66]"
        {...useFieldControl()}
        {...props}
      />
    </label>
  );
}

/** Ô chọn gốc của trình duyệt, cùng kiểu với ô nhập và có mũi tên mực (select.in). */
export function Select({
  className,
  ...props
}: React.ComponentProps<'select'>) {
  return (
    <select
      {...useFieldControl()}
      className={cn(
        'h-12 w-full appearance-none rounded-sm border-[1.5px] border-ink bg-white pr-10 pl-3 text-read outline-none select-chevron disabled:cursor-not-allowed disabled:opacity-40 focus:shadow-[inset_0_0_0_1.5px_var(--color-ink)] aria-invalid:border-danger aria-invalid:shadow-[inset_0_0_0_1.5px_var(--color-danger)]',
        className,
      )}
      {...props}
    />
  );
}

/** Hàng ô nhập + nhãn/nút đứng cạnh nhau (.inrow), vd ô số kèm đơn vị. */
export function InputRow({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex items-center gap-2', className)} {...props} />
  );
}
