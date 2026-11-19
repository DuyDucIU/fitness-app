import * as React from 'react';

import { MinusIcon, PlusIcon } from '@/components/icons';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatNumber } from '@/lib/format';
import { m } from '@/paraglide/messages.js';

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  /** Dòng phụ, chỉ hiện ở dạng xếp chồng. */
  sub?: React.ReactNode;
}

/**
 * Nhóm chọn một (prototypes/shared/base.css › .seg), dựng trên ToggleGroup của Radix.
 * Không cho bỏ chọn: bấm lại lựa chọn đang chọn thì giữ nguyên.
 */
export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  stack,
  'aria-label': ariaLabel,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  stack?: boolean;
  'aria-label'?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      variant={stack ? 'stack' : 'default'}
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next as T);
      }}
      aria-label={ariaLabel}
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value}>
          {o.label}
          {stack && o.sub && (
            <small className="block text-label font-normal">{o.sub}</small>
          )}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** Hàng công tắc: nhãn 600 kèm dòng phụ bên trái, công tắc bên phải. */
export function SwitchRow({
  label,
  sub,
  checked,
  onCheckedChange,
}: {
  label: React.ReactNode;
  sub?: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = React.useId();
  return (
    <div className="flex items-center justify-between gap-3 font-semibold">
      <label htmlFor={id}>
        {label}
        {sub && <small className="block text-label font-normal">{sub}</small>}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

/** Bộ tăng giảm −/giá trị/+ (prototypes/shared/base.css › .stepper). */
export function Stepper({
  value,
  onValueChange,
  step = 1,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  maxFractionDigits = 2,
  'aria-label': ariaLabel,
}: {
  value: number;
  onValueChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  maxFractionDigits?: number;
  'aria-label': string;
}) {
  // Làm tròn để cộng dồn bước 2.5 không sinh 7.499999.
  const clamp = (v: number) =>
    Math.min(max, Math.max(min, Math.round(v * 1000) / 1000));
  const button =
    'grid size-11 place-items-center rounded-sm border-[1.5px] border-ink active:bg-ink active:text-tyvek disabled:opacity-40';

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex items-center gap-2.5"
    >
      <button
        type="button"
        className={button}
        aria-label={m.common_decrease()}
        disabled={value <= min}
        onClick={() => onValueChange(clamp(value - step))}
      >
        <MinusIcon className="size-5" aria-hidden />
      </button>
      <output
        aria-live="polite"
        className="min-w-16 text-center text-num leading-none numeral"
      >
        {formatNumber(value, { maxFractionDigits })}
      </output>
      <button
        type="button"
        className={button}
        aria-label={m.common_increase()}
        disabled={value >= max}
        onClick={() => onValueChange(clamp(value + step))}
      >
        <PlusIcon className="size-5" aria-hidden />
      </button>
    </div>
  );
}
