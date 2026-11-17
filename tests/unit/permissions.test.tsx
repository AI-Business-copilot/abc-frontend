import { render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePermissions } from '@/hooks/use-permissions';
import { PermissionGate } from '@/components/common/permission-gate';

const auth = vi.hoisted(() => ({ profile: null as null | {
  permissions: string[]; platformRoles: { code: string }[];
  business: null | { role: string }; canManageSystemAdmins?: boolean;
} }));
vi.mock('@/hooks/use-auth', () => ({ useAuth: () => auth }));

describe('permissions', () => {
  beforeEach(() => { auth.profile = null; });
  it('denies permissions and roles without a profile', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('sales.create')).toBe(false);
    expect(Boolean(result.current.isOwner)).toBe(false);
    expect(result.current.isStaff).toBe(false);
    expect(result.current.isSystemAdmin).toBe(false);
  });
  it('updates permissions when the current profile changes', () => {
    const { result, rerender } = renderHook(() => usePermissions());
    auth.profile = { permissions: ['sales.create'], platformRoles: [], business: { role: 'CASHIER' } };
    rerender();
    expect(result.current.can('sales.create')).toBe(true);
    expect(result.current.can('sales.delete')).toBe(false);
    expect(result.current.isStaff).toBe(true);
    expect(result.current.isOwner).toBe(false);
  });
  it('identifies an owner and platform admin without granting unlisted permissions', () => {
    auth.profile = { permissions: [], platformRoles: [{ code: 'SYSTEM_ADMIN' }], business: { role: 'OWNER' }, canManageSystemAdmins: true };
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isOwner).toBe(true);
    expect(result.current.isStaff).toBe(false);
    expect(result.current.isSystemAdmin).toBe(true);
    expect(result.current.canManageSystemAdmins).toBe(true);
    expect(result.current.can('sales.create')).toBe(false);
  });
  it('renders the protected content only when the permission is present', () => {
    auth.profile = { permissions: ['sales.create'], platformRoles: [], business: null };
    render(<PermissionGate permission="sales.create"><button>Create sale</button></PermissionGate>);
    expect(screen.getByRole('button', { name: 'Create sale' })).toBeInTheDocument();
  });
  it('shows the denied permission by default', () => {
    render(<PermissionGate permission="sales.create"><button>Create sale</button></PermissionGate>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('sales.create')).toBeInTheDocument();
  });
  it('supports custom and explicitly empty fallbacks', () => {
    const { rerender, container } = render(<PermissionGate permission="sales.create" fallback={<p>Denied</p>}>Secret</PermissionGate>);
    expect(screen.getByText('Denied')).toBeInTheDocument();
    rerender(<PermissionGate permission="sales.create" fallback={null}>Secret</PermissionGate>);
    expect(container).toBeEmptyDOMElement();
  });
});
