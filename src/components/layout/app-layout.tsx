import {
  ArrowUpRight,
  Activity,
  BarChart3,
  Boxes,
  BriefcaseBusiness,
  CircleHelp,
  Command,
  CreditCard,
  LayoutDashboard,
  KeyRound,
  LogOut,
  Wallet,
  PackageSearch,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Tag,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";

import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";

interface NavigationItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  permission?: string;
  permissionGroups?: string[][];
  disabled?: boolean;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

const navigation: NavigationGroup[] = [
  { label: "TỔNG QUAN", items: [{ to: "/app", label: "Tổng quan", icon: LayoutDashboard, end: true }] },
  {
    label: "DOANH NGHIỆP",
    items: [
      { to: "/app/business", label: "Hồ sơ doanh nghiệp", icon: BriefcaseBusiness, permission: "business.read" },
      { to: "/app/team", label: "Thành viên", icon: UsersRound, permission: "invitations.manage" },
      { to: "/app/business/roles", label: "Vai trò & quyền", icon: KeyRound, permission: "business.roles.manage" },
      { to: "/app/activity", label: "Hoạt động thành viên", icon: ShieldCheck, permission: "business.audit.read" },
    ],
  },
  {
    label: "VẬN HÀNH",
    items: [
      { to: "/app/products", label: "Sản phẩm & tồn kho", icon: Boxes, permission: "products.read" },
      { to: "/app/cash-shifts", label: "Ca trực & tiền mặt", icon: Wallet, permission: "cash.shift.read" },
      { to: "/app/orders", label: "Đơn hàng & thanh toán", icon: CreditCard },
      { to: "/promotions", label: "Khuyến mãi", icon: Tag, permission: "promotions.manage" },
      {
        to: "/business-data",
        label: "Dữ liệu kinh doanh",
        icon: BarChart3,
        permissionGroups: [["business_data.manage"], ["analytics.read", "finance.read"]],
      },
      { to: "/returns", label: "Đổi trả hàng", icon: RotateCcw },
    ],
  },
  {
    label: "TRỢ LÝ KINH DOANH",
    items: [
      { to: "/app/insights", label: "Tư vấn kinh doanh", icon: Sparkles, disabled: true },
      { to: "/app/forecast", label: "Dự báo hàng hóa", icon: PackageSearch, disabled: true },
    ],
  },
];

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AppLayout({ children }: { children?: ReactNode }) {
  const { profile, logout } = useAuth();
  const { can, isSystemAdmin } = usePermissions();
  const platformItems: NavigationItem[] = [
    { to: "/app/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/app/admin/businesses", label: "Doanh nghiệp", icon: BriefcaseBusiness, permission: "platform.businesses.manage" },
    { to: "/app/admin/users", label: "Tài khoản", icon: UsersRound, permission: "platform.users.manage" },
    { to: "/app/admin/activity", label: "Audit log", icon: Activity, permission: "platform.audit.read" },
  ];
  const visiblePlatformItems = platformItems.filter(
    (item) => item.permission === undefined || can(item.permission),
  );
  const canAccessNavigationItem = (item: NavigationItem) =>
    item.permissionGroups
      ? item.permissionGroups.some((group) => group.every((permission) => can(permission)))
      : item.permission === undefined || can(item.permission);
  const canViewAdminDashboard =
    can("platform.users.manage") && can("platform.businesses.manage");
  const hasActiveBusinessContext =
    profile?.business?.status === "ACTIVE" && profile.business.membershipStatus === "ACTIVE";
  const visibleAdminItems = visiblePlatformItems.filter(
    (item) => item.to !== "/app/admin" || canViewAdminDashboard,
  );
  const displayName = profile?.user.fullName || profile?.user.email || "Người dùng";
  const roleLabel = isSystemAdmin
    ? profile?.canManageSystemAdmins ? "Quản trị viên gốc" : "Quản trị viên hệ thống"
    : profile?.business?.roleName || (profile?.business?.role === "OWNER"
      ? "Chủ doanh nghiệp"
      : "Nhân viên cửa hàng");

  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <div className="sidebar-brand"><Brand /><span className="sidebar-collapse"><Command size={14} /></span></div>
        <div className="branch-select">
          <span className="side-caption">{isSystemAdmin ? "KHÔNG GIAN QUẢN TRỊ" : "DOANH NGHIỆP"}</span>
          <div className="branch-chip">
            <span className="branch-icon">{isSystemAdmin ? <ShieldCheck size={15} /> : <BriefcaseBusiness size={15} />}</span>
            <span className="branch-name">{isSystemAdmin ? "Quản trị nền tảng ABC Copilot" : profile?.business?.name || "Chưa có doanh nghiệp"}</span>
          </div>
        </div>
        <nav className="side-nav" aria-label="Điều hướng chính">
          {navigation.map((group) => {
            if (isSystemAdmin && !hasActiveBusinessContext) return null;
            const visibleItems = group.items.filter(canAccessNavigationItem);
            if (visibleItems.length === 0) return null;
            return (
              <div className="nav-group" key={group.label}>
                <span className="side-caption">{group.label}</span>
                {visibleItems.map(({ to, label, icon: Icon, disabled, end }) =>
                  disabled ? (
                    <span aria-label={`${label}, sắp ra mắt`} className="side-link disabled" key={to} title={`${label} — sắp ra mắt`}>
                      <Icon size={16} />{label}<span className="coming-soon">Sắp ra mắt</span>
                    </span>
                  ) : (
                    <NavLink aria-label={label} className={({ isActive }) => `side-link${isActive ? " active" : ""}`} end={end} key={to} title={label} to={to}>
                      <Icon size={16} />{label}
                    </NavLink>
                  ),
                )}
              </div>
            );
          })}
          {visibleAdminItems.length > 0 && (
            <div className="nav-group">
              <span className="side-caption">QUẢN TRỊ</span>
              {visibleAdminItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink aria-label={label} className={({ isActive }) => `side-link${isActive ? " active" : ""}`} end={end} key={to} title={label} to={to}>
                  <Icon size={16} />{label}
                </NavLink>
              ))}
            </div>
          )}
        </nav>
        <div className="sidebar-bottom">
          <Link className="support-link" to="/"><CircleHelp size={16} />Trang giới thiệu<ArrowUpRight size={14} /></Link>
          <button aria-label="Đăng xuất" className="profile-menu" onClick={() => void logout()} title="Đăng xuất" type="button">
            <span className="avatar">{initials(displayName)}</span>
            <span className="profile-label"><strong>{displayName}</strong><small>{roleLabel}</small></span>
            <span className="profile-logout"><LogOut size={15} />Đăng xuất</span>
          </button>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-context"><span className="context-dot" />{isSystemAdmin ? "Quản trị nền tảng" : profile?.business?.name || "Không gian quản trị"}</div>
          <div className="topbar-right">
            <span className="topbar-date">{new Intl.DateTimeFormat("vi-VN", { dateStyle: "full" }).format(new Date())}</span>
            <span className="topbar-divider" />
            <div className="topbar-account"><span className="avatar small">{initials(displayName)}</span><span><strong>{displayName}</strong><small>{roleLabel}</small></span></div>
            <Button asChild className="topbar-logout" size="sm" variant="ghost"><Link to="/app/security"><Settings2 size={15} /> Tài khoản</Link></Button>
          </div>
        </header>
        <main className="app-content">{children ?? <Outlet />}</main>
        <footer className="app-footer"><span>© 2026 ABC Copilot</span><span>Thông tin được hiển thị theo vai trò của bạn</span><span><ShieldCheck size={13} /> Kết nối an toàn</span></footer>
      </div>
    </div>
  );
}
