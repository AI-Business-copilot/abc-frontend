import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { AppLayout } from '@/components/layout/app-layout';

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ profile: null, logout: vi.fn() }),
}));
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ can: () => true, isSystemAdmin: false }),
}));
vi.mock('@/components/layout/notification-bell', () => ({ NotificationBell: () => null }));

it('keeps POS navigation without online reports or the forecast placeholder', () => {
  render(<MemoryRouter><AppLayout>Content</AppLayout></MemoryRouter>);
  const nav = within(screen.getByRole('navigation', { name: 'Điều hướng chính' }));
  expect(nav.getByRole('link', { name: 'Dữ liệu kinh doanh' })).toBeInTheDocument();
  expect(nav.getByRole('link', { name: 'Nhận định tồn kho' })).toBeInTheDocument();
  expect(nav.queryByText('Báo cáo Shopee')).not.toBeInTheDocument();
  expect(nav.queryByText('BÁO CÁO BỔ SUNG')).not.toBeInTheDocument();
  expect(nav.queryByText('Dự báo hàng hóa')).not.toBeInTheDocument();
});
