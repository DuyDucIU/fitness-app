import { fireEvent, render, screen } from '@testing-library/react';
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
    expect(button.getAttribute('aria-disabled')).toBeNull();

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

  it('busy với asChild: chặn cả handler của phần tử con', () => {
    const onClick = vi.fn();
    render(
      <Button asChild busy>
        <a href="#next" onClick={onClick}>
          Go
        </a>
      </Button>,
    );
    fireEvent.click(screen.getByRole('link', { name: 'Go' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
