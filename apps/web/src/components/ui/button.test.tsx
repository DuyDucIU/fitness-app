import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './button';

describe('Button busy', () => {
  it('không gọi onClick khi đang busy, kể cả bấm Enter', async () => {
    const onClick = vi.fn();
    render(
      <Button busy onClick={onClick}>
        Update
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Update' });
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-disabled')).toBe('true');

    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('gọi onClick khi không busy', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Update</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
