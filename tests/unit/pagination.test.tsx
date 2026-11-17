import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Pagination } from '@/components/ui/pagination';

describe('pagination', () => {
  it('hides pagination when there are no results', () => {
    const { container } = render(<Pagination page={1} totalPages={0} total={0} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('prevents going before page one and emits the next page', async () => {
    const change = vi.fn();
    render(<Pagination page={1} totalPages={3} total={30} onPageChange={change} />);
    const user = userEvent.setup();
    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Trang trước' }));
    expect(change).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect(change).toHaveBeenCalledExactlyOnceWith(2);
  });
  it('prevents going beyond the last page and emits the previous page', async () => {
    const change = vi.fn();
    render(<Pagination page={3} totalPages={3} total={30} onPageChange={change} />);
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Trang trước' }));
    expect(change).toHaveBeenCalledExactlyOnceWith(2);
  });
});
