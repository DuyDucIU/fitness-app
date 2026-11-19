import * as React from 'react';

export const FieldContext = React.createContext<{
  id: string;
  describedBy?: string;
  invalid: boolean;
} | null>(null);

/** id, aria-describedby và aria-invalid cho control đặt trong `Field`. */
export function useFieldControl() {
  const ctx = React.useContext(FieldContext);
  return ctx
    ? {
        id: ctx.id,
        'aria-describedby': ctx.describedBy,
        'aria-invalid': ctx.invalid || undefined,
      }
    : {};
}
