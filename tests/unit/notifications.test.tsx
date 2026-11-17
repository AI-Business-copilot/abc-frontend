import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationBell } from '@/components/layout/notification-bell';

const mocks = vi.hoisted(() => ({ get: vi.fn(), read: vi.fn(), navigate: vi.fn(), profile: {
  user: { id: 'user-a' }, business: { id: 'store-a', status: 'ACTIVE', membershipStatus: 'ACTIVE' }, permissions: ['inventory.read'],
} as any }));
vi.mock('@/hooks/use-auth', () => ({ useAuth: () => ({ profile: mocks.profile }) }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('@/api/notifications', () => ({ getNotifications: mocks.get, readNotifications: mocks.read }));
const item = { id: 'scrap:a', type: 'SCRAP_PENDING', title: 'Phiếu hủy chờ duyệt', message: 'H01 chờ duyệt', href: '/inventory/scrap/a', occurredAt: '2026-11-17T00:00:00Z', readAt: null };
const page = { items: [item], total: 1, unreadCount: 1, page: 1, pageSize: 20 };
beforeEach(() => {
  mocks.get.mockReset().mockResolvedValue(page);
  mocks.read.mockReset().mockResolvedValue(undefined);
  mocks.navigate.mockReset();
});
afterEach(cleanup);

describe('notification bell', () => {
  it('uses the API count and persists read before opening the source', async () => {
    render(<NotificationBell />);
    const trigger = await screen.findByRole('button', { name: 'Thông báo: 1 chưa đọc' });
    const user = userEvent.setup();
    await user.click(trigger);
    const source = await screen.findByRole('button', { name: /Phiếu hủy chờ duyệt/ });
    await waitFor(() => expect(source).toBeEnabled());
    await user.click(source);
    await waitFor(() => expect(mocks.read).toHaveBeenCalledWith(['scrap:a']));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/inventory/scrap/a'));
  });
  it('shows a true empty state with no invented badge', async () => {
    mocks.get.mockResolvedValue({ ...page, items: [], total: 0, unreadCount: 0 });
    render(<NotificationBell />);
    await waitFor(() => expect(mocks.get).toHaveBeenCalled());
    await userEvent.setup().click(screen.getByRole('button', { name: 'Thông báo' }));
    expect(await screen.findByText('Không có thông báo cần xử lý.')).toBeInTheDocument();
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });
  it('shows a retryable failure instead of treating API failure as an empty inbox', async () => {
    mocks.get.mockRejectedValue(new Error('Mất kết nối'));
    render(<NotificationBell />);
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Thông báo: chưa tải được' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối');
    expect(screen.queryByText('Không có thông báo cần xử lý.')).not.toBeInTheDocument();
    mocks.get.mockResolvedValue(page);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('H01 chờ duyệt')).toBeInTheDocument();
  });
  it('keeps unread state when saving fails', async () => {
    mocks.read.mockRejectedValue(new Error('Không lưu được'));
    render(<NotificationBell />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Thông báo: 1 chưa đọc' }));
    const read = await screen.findByRole('button', { name: 'Đánh dấu đã đọc' });
    await waitFor(() => expect(read).toBeEnabled());
    await user.click(read);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không lưu được');
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it('clears the previous member data when identity changes', async () => {
    const { rerender } = render(<NotificationBell />);
    await screen.findByRole('button', { name: 'Thông báo: 1 chưa đọc' });
    mocks.get.mockImplementation(() => new Promise(() => {}));
    const previous = mocks.profile;
    mocks.profile = { ...previous, user: { id: 'user-b' } };
    rerender(<NotificationBell />);
    expect(screen.queryByRole('button', { name: 'Thông báo: 1 chưa đọc' })).not.toBeInTheDocument();
    mocks.profile = previous;
  });
});
