import type { CatalogExercise } from '@fitness/contract';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearDb } from '@/auth/testing';
import { ExercisePicker } from '@/catalog/exercise-search';
import { CATALOG, SQUAT } from '@/catalog/testing';
import { db } from '@/db/db';

afterEach(clearDb);

/** Màn dùng picker: một nút mở sheet, hiện tên bài đã chọn. */
function Harness({ onPick }: { onPick: (e: CatalogExercise) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Add
      </button>
      <ExercisePicker open={open} onOpenChange={setOpen} onPick={onPick} />
    </>
  );
}

describe('ExercisePicker', () => {
  it('gõ alias tiếng Việt rồi chạm kết quả: trả về bài đã chọn và đóng sheet', async () => {
    // Given: catalog đã nằm trong cache trên máy.
    await db.exercises.bulkPut(CATALOG.exercises);
    const onPick = vi.fn();
    const user = userEvent.setup();
    render(<Harness onPick={onPick} />);

    await user.click(screen.getByRole('button', { name: 'Add' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Add an exercise',
    });
    expect(screen.getByRole('searchbox')).toHaveFocus();
    await user.keyboard('ganh ta');
    await user.click(
      await screen.findByRole('button', { name: /Barbell Squat/ }),
    );

    expect(onPick).toHaveBeenCalledWith(SQUAT);
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  });
});
