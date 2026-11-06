import { useCallback, useEffect, useState } from "react";
import { Activity, ArrowUpRight, Building2, ShieldCheck, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { AppLayout } from "@/components/layout/app-layout";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermissions } from "@/hooks/use-permissions";
import { getAdminDashboard, type AdminAuditLog } from "@/services/admin.service";

function formatAction(action: string) {
  const labels: Record<string, string> = {
    "user.suspend": "Khóa tài khoản",
    "user.restore": "Mở khóa tài khoản",
    "business.suspend": "Khóa doanh nghiệp",
    "business.restore": "Mở khóa doanh nghiệp",
    "business.update": "Cập nhật doanh nghiệp",
    "business.profile.update": "Cập nhật hồ sơ doanh nghiệp",
    "business.create": "Tạo doanh nghiệp",
    "membership.status.update": "Cập nhật thành viên",
    "membership.invitation.create": "Mời nhân viên",
    "membership.invitation.revoke": "Thu hồi lời mời",
    "membership.invitation.accept": "Chấp nhận lời mời",
    "membership.invitation.delivery_failed": "Gửi lời mời thất bại",
    "user.system_admin.grant": "Cấp quyền System Admin",
    "user.system_admin.revoke": "Thu hồi quyền System Admin",
  };
  return labels[action] ?? action;
}

export function AdminPage() {
  const { can, canManageSystemAdmins } = usePermissions();
  const canViewDashboard = can("platform.users.manage") && can("platform.businesses.manage");
  const canViewAudit = can("platform.audit.read");
  const [totals, setTotals] = useState<{
    users: number;
    activeUsers: number;
    suspendedUsers: number;
    businesses: number;
    activeBusinesses: number;
    suspendedBusinesses: number;
    newBusinesses30d: number;
  } | null>(null);
  const [recentActivity, setRecentActivity] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getAdminDashboard();
      setTotals(result.totals);
      setRecentActivity(result.recentActivity);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải dashboard quản trị.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (!canViewDashboard) {
    return <AppLayout><div className="page-header"><div><span className="eyebrow">QUẢN TRỊ NỀN TẢNG</span><h1>Không thể mở trang này</h1><p>Trang quản trị chỉ dành cho người được cấp quyền quản trị nền tảng.</p></div></div></AppLayout>;
  }

  const cards = [
    { label: "TÀI KHOẢN", value: totals?.users, detail: `${totals?.activeUsers ?? 0} đang hoạt động · ${totals?.suspendedUsers ?? 0} tạm khóa`, icon: UsersRound, color: "violet" },
    { label: "DOANH NGHIỆP", value: totals?.businesses, detail: `${totals?.activeBusinesses ?? 0} hoạt động · ${totals?.suspendedBusinesses ?? 0} tạm khóa`, icon: Building2, color: "blue" },
    { label: "DOANH NGHIỆP MỚI", value: totals?.newBusinesses30d, detail: "Trong 30 ngày gần đây", icon: Activity, color: "green" },
  ];

  return (
    <AppLayout>
      <div className="page-header admin-page-hero"><div><span className="admin-hero-kicker"><ShieldCheck size={13} /> ABC COPILOT · QUẢN TRỊ</span><h1>Dashboard quản trị</h1><p>Tổng quan vận hành và sức khỏe nền tảng của bạn.</p></div><span className="admin-role-pill"><ShieldCheck size={14} />{canManageSystemAdmins ? "Quản trị viên gốc" : "Quản trị viên"}</span></div>
      {error && <Alert className="mb-5" variant="destructive">{error}</Alert>}
      <div className="kpi-grid admin-kpi-grid admin-stat-grid">
        {cards.map(({ label, value, detail, icon: Icon, color }) => (
          <Card className="kpi-card admin-stat-card" key={label}><CardContent><div className="kpi-top"><span>{label}</span><span className={`kpi-icon ${color}`}><Icon size={17} /></span></div><strong className="kpi-value">{loading ? "…" : value ?? 0}</strong><div className="kpi-foot"><span>{detail}</span></div></CardContent></Card>
        ))}
      </div>
      <div className="admin-dashboard-grid">
        {canViewAudit && <Card className="admin-panel"><CardHeader className="dashboard-card-header"><div><span className="eyebrow">THEO DÕI NỀN TẢNG</span><CardTitle>Hoạt động gần đây</CardTitle></div><Link className="admin-inline-link" to="/app/admin/activity">Xem tất cả <ArrowUpRight size={14} /></Link></CardHeader><CardContent>
          {loading ? <p className="py-6 text-sm text-slate-500">Đang tải hoạt động…</p> : recentActivity.length === 0 ? <p className="py-6 text-sm text-slate-500">Chưa có hoạt động nào được ghi nhận.</p> : <div className="divide-y divide-slate-100">{recentActivity.map((item) => <AuditRow item={item} key={item.id} />)}</div>}
        </CardContent></Card>}
        <Card className="admin-panel"><CardHeader><span className="eyebrow">TRUY CẬP NHANH</span><CardTitle>Công cụ quản trị</CardTitle></CardHeader><CardContent className="admin-quick-links">
          {can("platform.businesses.manage") && <AdminLink to="/app/admin/businesses" icon={Building2} title="Doanh nghiệp" description="Xem, cập nhật, khóa hoặc mở khóa doanh nghiệp." />}
          {can("platform.users.manage") && <AdminLink to="/app/admin/users" icon={UsersRound} title="Tài khoản" description="Tra cứu và kiểm soát trạng thái tài khoản." />}
          {can("platform.audit.read") && <AdminLink to="/app/admin/activity" icon={Activity} title="Audit log" description="Tra cứu lịch sử thay đổi trên nền tảng." />}
        </CardContent></Card>
      </div>
    </AppLayout>
  );
}

function AuditRow({ item }: { item: AdminAuditLog }) {
  return <div className="admin-audit-row"><span className="admin-audit-icon"><Activity size={15} /></span><div className="admin-audit-copy"><strong>{formatAction(item.action)}</strong><span>{item.actor.fullName} · {item.actor.email}{item.business ? ` · ${item.business.name}` : ""}</span>{item.reason && <small>Lý do: {item.reason}</small>}</div><time>{new Date(item.createdAt).toLocaleString("vi-VN")}</time></div>;
}

function AdminLink({ to, icon: Icon, title, description }: { to: string; icon: LucideIcon; title: string; description: string }) {
  return <Link className="admin-quick-link" to={to}><span className="admin-quick-icon"><Icon size={18} /></span><span><strong>{title}</strong><small>{description}</small></span><ArrowUpRight className="admin-quick-arrow" size={16} /></Link>;
}
