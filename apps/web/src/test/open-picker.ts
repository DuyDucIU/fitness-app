import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

/**
 * Mở picker thêm bài trên màn ghi set. Buổi chưa có bài thì nút "Add exercise" nằm ngay
 * trên tấm số áo; đã có bài thì nằm trong sheet "Session".
 */
export async function openExercisePicker(user: UserEvent) {
  if (!screen.queryByRole('button', { name: 'Add exercise' })) {
    await user.click(screen.getByRole('button', { name: 'Session' }));
    await screen.findByRole('dialog', { name: /^Session ·/ });
  }
  await user.click(screen.getByRole('button', { name: 'Add exercise' }));
  await screen.findByRole('dialog', { name: 'Add an exercise' });
}
