import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { Activity, Building2, Eye, Pencil, RefreshCw, Search, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import { AppLayout } from "@/components/layout/app-layout";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import {
  listAdminAuditLogs,
  listAdminBusinesses,
  listAdminUsers,
  setAdminBusinessStatus,
  setAdminUserStatus,
  setSystemAdminRole,
  updateAdminBusiness,
  type AdminAuditLog,
  type AdminBusiness,
  type AdminUser,
} from "@/services/admin.service";
import { listBusinessActivity } from "@/services/admin.service";
import { getBusinessActivityLabel } from "@/lib/business-activity-label";

function PlatformAdminOnly({ children, permission }: { children: ReactNode; permission: string }) {
  const { can } = usePermissions();
  if (!can(permission)) {
    return <AppLayout><div className="page-header"><div><span className="eyebrow">QUẢN TRỊ NỀN TẢNG</span><h1>Không thể mở trang này</h1><p>Bạn không có quyền truy cập chức năng quản trị nền tảng.</p></div></div></AppLayout>;
  }
  return <>{children}</>;
}

function StatusDialog({
  open,
  title,
  targetName,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  targetName: string;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const reasonId = useId();
  const [reason, setReason] = useState("");
  useEffect(() => { if (open) setReason(""); }, [open]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit(reason);
  }
  return <Modal open={open} onClose={onClose} title={title}><form className="grid gap-4" onSubmit={submit}>
    <p className="text-sm text-slate-600">Đối tượng: <strong>{targetName}</strong></p>
    <label className="grid gap-2 text-sm font-medium" htmlFor={reasonId}>Lý do thay đổi
      <textarea className="min-h-24 rounded-md border border-slate-300 p-3 text-sm" id={reasonId} maxLength={1000} minLength={5} onChange={(event) => setReason(event.target.value)} required value={reason} />
    </label>
    {error && <Alert variant="destructive">{error}</Alert>}
    <div className="flex justify-end gap-2"><Button onClick={onClose} type="button" variant="outline">Hủy</Button><Button disabled={saving || reason.trim().length < 5} type="submit">{saving ? "Đang lưu…" : "Xác nhận"}</Button></div>
  </form></Modal>;
}

export function AdminBusinessesPage() {
  const [detail, setDetail] = useState<AdminBusiness | null>(null);
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingStatus, setPendingStatus] = useState<{ business: AdminBusiness; status: AdminBusiness["status"] } | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [editing, setEditing] = useState<AdminBusiness | null>(null);
  const [editValues, setEditValues] = useState({ name: "", phone: "", address: "", industryType: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listAdminBusinesses({ search, status: statusFilter, page });
      setBusinesses(result.businesses);
      setTotal(result.total);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải doanh nghiệp.");
    } finally { setLoading(false); }
  }, [search, statusFilter, page]);
  useEffect(() => { void load(); }, [load]);

  function openEdit(business: AdminBusiness) {
    setEditValues({ name: business.name, phone: business.phone, address: business.address ?? "", industryType: business.industryType });
    setEditing(business);
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSavingEdit(true);
    setError("");
    try {
      await updateAdminBusiness(editing.id, { ...editValues, address: editValues.address || null });
      setEditing(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể cập nhật doanh nghiệp.");
    } finally { setSavingEdit(false); }
  }

  async function changeStatus(reason: string) {
    if (!pendingStatus) return;
    setSavingStatus(true);
    setStatusError("");
    try {
      await setAdminBusinessStatus(pendingStatus.business.id, pendingStatus.status, reason);
      setPendingStatus(null);
      await load();
    } catch (issue) {
      setStatusError(issue instanceof Error ? issue.message : "Không thể đổi trạng thái doanh nghiệp.");
    } finally { setSavingStatus(false); }
  }

  return <PlatformAdminOnly permission="platform.businesses.manage"><AppLayout>
    <div className="page-header admin-page-hero"><div><span className="admin-hero-kicker"><Building2 size={13} /> QUẢN TRỊ NỀN TẢNG</span><h1>Doanh nghiệp</h1><p>Quản lý thông tin, trạng thái và hồ sơ các doanh nghiệp trên ABC Copilot.</p></div><Button disabled={loading} onClick={() => void load()} variant="outline"><RefreshCw size={15} /> Làm mới</Button></div>
    {error && <Alert className="mb-4" variant="destructive">{error}</Alert>}
    <Card className="admin-panel"><CardHeader className="admin-panel-header"><div><span className="eyebrow">DANH SÁCH</span><CardTitle>Doanh nghiệp</CardTitle><p className="admin-panel-description">{total} doanh nghiệp trong hệ thống</p></div><form className="admin-toolbar" onSubmit={(event) => { event.preventDefault(); setPage(1); void load(); }}><Input aria-label="Tìm doanh nghiệp" onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Tên hoặc số điện thoại" value={search} /><select aria-label="Lọc trạng thái" className="admin-filter" onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} value={statusFilter}><option value="">Mọi trạng thái</option><option value="ACTIVE">Đang hoạt động</option><option value="SUSPENDED">Tạm khóa</option></select><Button size="sm" type="submit" variant="outline"><Search size={14} /> Tìm</Button></form></CardHeader><CardContent className="admin-panel-content">
      {loading ? <p className="admin-empty-state">Đang tải doanh nghiệp…</p> : businesses.length === 0 ? <p className="admin-empty-state">Không có doanh nghiệp phù hợp.</p> : <div className="admin-record-list">{businesses.map((business) => <div className="admin-record-row" key={business.id}>
        <div className="min-w-60 flex-1"><strong className="flex items-center gap-2 text-sm"><Building2 size={16} className="text-[#0f4c3a]" />{business.name}</strong><p className="mt-1 text-xs text-slate-500">{business.industryType} · {business.phone} · {business._count.memberships} thành viên</p><p className="mt-1 text-xs text-slate-500">Chủ sở hữu: {business.memberships.find((member) => member.role.code === "OWNER" && member.status !== "INACTIVE")?.user.email ?? business.memberships.find((member) => member.role.code === "OWNER")?.user.email ?? "Chưa có"}</p></div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${business.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{business.status === "ACTIVE" ? "Đang hoạt động" : "Tạm khóa"}</span>
        <div className="flex flex-wrap gap-2"><Button onClick={() => setDetail(business)} size="sm" variant="outline"><Eye size={14} /> Chi tiết</Button><Button onClick={() => openEdit(business)} size="sm" variant="outline"><Pencil size={14} /> Chỉnh sửa</Button><Button onClick={() => { setStatusError(""); setPendingStatus({ business, status: business.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }); }} size="sm" variant={business.status === "ACTIVE" ? "destructive" : "outline"}>{business.status === "ACTIVE" ? "Khóa" : "Mở khóa"}</Button></div>
      </div>)}</div>}
      <div className="mt-4 flex items-center justify-between text-sm text-slate-500"><span>{total} doanh nghiệp</span><div className="flex gap-2"><Button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} size="sm" variant="outline">Trước</Button><span className="self-center">Trang {page} / {Math.max(1, Math.ceil(total / 20))}</span><Button disabled={page >= Math.ceil(total / 20) || loading} onClick={() => setPage((value) => value + 1)} size="sm" variant="outline">Sau</Button></div></div>
    </CardContent></Card>
    <StatusDialog error={statusError} onClose={() => setPendingStatus(null)} onSubmit={changeStatus} open={Boolean(pendingStatus)} saving={savingStatus} targetName={pendingStatus?.business.name ?? ""} title={pendingStatus?.status === "SUSPENDED" ? "Tạm khóa doanh nghiệp" : "Mở khóa doanh nghiệp"} />
    <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Cập nhật doanh nghiệp"><form className="grid gap-4" onSubmit={(event) => void saveEdit(event)}>
      <label className="grid gap-1 text-sm font-medium">Tên doanh nghiệp<Input maxLength={255} onChange={(event) => setEditValues({ ...editValues, name: event.target.value })} required value={editValues.name} /></label>
      <label className="grid gap-1 text-sm font-medium">Số điện thoại<Input maxLength={20} onChange={(event) => setEditValues({ ...editValues, phone: event.target.value })} required value={editValues.phone} /></label>
      <label className="grid gap-1 text-sm font-medium">Ngành hàng<Input maxLength={50} onChange={(event) => setEditValues({ ...editValues, industryType: event.target.value })} required value={editValues.industryType} /></label>
      <label className="grid gap-1 text-sm font-medium">Địa chỉ<Input maxLength={10000} onChange={(event) => setEditValues({ ...editValues, address: event.target.value })} value={editValues.address} /></label>
      <div className="flex justify-end gap-2"><Button onClick={() => setEditing(null)} type="button" variant="outline">Hủy</Button><Button disabled={savingEdit} type="submit">{savingEdit ? "Đang lưu…" : "Lưu thay đổi"}</Button></div>
    </form></Modal>
    <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title="Chi tiết doanh nghiệp">
      {detail && <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <DetailField label="Tên doanh nghiệp" value={detail.name} />
        <DetailField label="Ngành hàng" value={detail.industryType} />
        <DetailField label="Số điện thoại" value={detail.phone} />
        <DetailField label="Địa chỉ" value={detail.address || "Chưa cập nhật"} />
        <DetailField label="Trạng thái" value={detail.status === "ACTIVE" ? "Đang hoạt động" : "Tạm khóa"} />
        <DetailField label="Số thành viên hiện tại" value={String(detail._count.memberships)} />
        <DetailField label="Chủ sở hữu" value={detail.memberships.find((member) => member.role.code === "OWNER")?.user.fullName ?? "Chưa có"} />
        <DetailField label="Email chủ sở hữu" value={detail.memberships.find((member) => member.role.code === "OWNER")?.user.email ?? "Chưa có"} />
        <DetailField label="Ngày tạo" value={detail.createdAt ? new Date(detail.createdAt).toLocaleString("vi-VN") : "Không rõ"} />
      </dl>}
    </Modal>
  </AppLayout></PlatformAdminOnly>;
}

export function AdminUsersPage() {
  const { profile } = useAuth();
  const { canManageSystemAdmins } = usePermissions();
  const [detail, setDetail] = useState<AdminUser | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingStatus, setPendingStatus] = useState<{ user: AdminUser; status: AdminUser["status"] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [roleTarget, setRoleTarget] = useState<{ user: AdminUser; enabled: boolean } | null>(null);
  const [savingRole, setSavingRole] = useState(false);
  const [roleError, setRoleError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listAdminUsers({ search, status: statusFilter, page });
      setUsers(result.users);
      setTotal(result.total);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải tài khoản.");
    } finally { setLoading(false); }
  }, [search, statusFilter, page]);
  useEffect(() => { void load(); }, [load]);

  async function changeStatus(reason: string) {
    if (!pendingStatus) return;
    setSaving(true);
    setStatusError("");
    try {
      await setAdminUserStatus(pendingStatus.user.id, pendingStatus.status, reason);
      setPendingStatus(null);
      await load();
    } catch (issue) {
      setStatusError(issue instanceof Error ? issue.message : "Không thể đổi trạng thái tài khoản.");
    } finally { setSaving(false); }
  }

  async function changeSystemAdminRole(reason: string) {
    if (!roleTarget) return;
    setSavingRole(true);
    setRoleError("");
    try {
      await setSystemAdminRole(roleTarget.user.id, roleTarget.enabled, reason);
      setRoleTarget(null);
      await load();
    } catch (issue) {
      setRoleError(issue instanceof Error ? issue.message : "Không thể cập nhật System Admin.");
    } finally { setSavingRole(false); }
  }

  return <PlatformAdminOnly permission="platform.users.manage"><AppLayout>
    <div className="page-header admin-page-hero"><div><span className="admin-hero-kicker"><UsersRound size={13} /> QUẢN TRỊ NỀN TẢNG</span><h1>Tài khoản</h1><p>Tra cứu người dùng, trạng thái tài khoản và quyền truy cập toàn hệ thống.</p>{canManageSystemAdmins && <p className="admin-root-note"><ShieldCheck size={14} /> Quản trị viên gốc: bạn có thể quản lý quyền System Admin.</p>}</div><Button disabled={loading} onClick={() => void load()} variant="outline"><RefreshCw size={15} /> Làm mới</Button></div>
    {error && <Alert className="mb-4" variant="destructive">{error}</Alert>}
    <Card className="admin-panel"><CardHeader className="admin-panel-header"><div><span className="eyebrow">DANH SÁCH</span><CardTitle>Tài khoản người dùng</CardTitle><p className="admin-panel-description">{total} tài khoản được đăng ký</p></div><form className="admin-toolbar" onSubmit={(event) => { event.preventDefault(); setPage(1); void load(); }}><Input aria-label="Tìm tài khoản" onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Tên hoặc email" value={search} /><select aria-label="Lọc trạng thái" className="admin-filter" onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} value={statusFilter}><option value="">Mọi trạng thái</option><option value="ACTIVE">Đang hoạt động</option><option value="SUSPENDED">Đã khóa</option></select><Button size="sm" type="submit" variant="outline"><Search size={14} /> Tìm</Button></form></CardHeader><CardContent className="admin-panel-content">
      {loading ? <p className="admin-empty-state">Đang tải tài khoản…</p> : users.length === 0 ? <p className="admin-empty-state">Không có tài khoản phù hợp.</p> : <div className="admin-record-list">{users.map((user) => {
        const membership = user.memberships.find((item) => item.status !== "INACTIVE") ?? user.memberships[0];
        const hasCurrentBusinessMembership = Boolean(membership && membership.status !== "INACTIVE");
        const systemAdmin = user.platformRoles.some(({ role }) => role.code === "SYSTEM_ADMIN");
        return <div className="admin-record-row" key={user.id}>
          <div className="min-w-60 flex-1"><strong className="flex items-center gap-2 text-sm"><UserRound size={16} className="text-[#0f4c3a]" />{user.fullName}</strong><p className="mt-1 text-xs text-slate-500">{user.email} · {membership ? `${membership.business.name} (${membership.role.displayName}; thành viên ${membership.status === "ACTIVE" ? "hoạt động" : membership.status === "SUSPENDED" ? "tạm khóa" : "vô hiệu hóa"}${membership.business.status === "SUSPENDED" ? "; doanh nghiệp tạm khóa" : ""})` : "Chưa thuộc doanh nghiệp"}</p>{systemAdmin && <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#0f4c3a]"><ShieldCheck size={12} /> {user.isBootstrapAdmin ? "System Admin gốc" : "System Admin"}</span>}</div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{user.status === "ACTIVE" ? "Đang hoạt động" : "Đã khóa"}</span>
          <div className="flex flex-wrap gap-2"><Button onClick={() => setDetail(user)} size="sm" variant="outline"><Eye size={14} /> Chi tiết</Button><Button disabled={user.id === profile?.user.id || (user.isBootstrapAdmin && user.status === "ACTIVE")} onClick={() => { setStatusError(""); setPendingStatus({ user, status: user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }); }} size="sm" variant={user.status === "ACTIVE" ? "destructive" : "outline"}>{user.status === "ACTIVE" ? "Khóa tài khoản" : "Mở khóa"}</Button>{canManageSystemAdmins && !user.isBootstrapAdmin && (systemAdmin || !hasCurrentBusinessMembership) && <Button onClick={() => { setRoleError(""); setRoleTarget({ user, enabled: !systemAdmin }); }} size="sm" variant="outline">{systemAdmin ? "Thu hồi System Admin" : "Cấp System Admin"}</Button>}</div>
        </div>;
      })}</div>}
      <div className="mt-4 flex items-center justify-between text-sm text-slate-500"><span>{total} tài khoản</span><div className="flex gap-2"><Button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} size="sm" variant="outline">Trước</Button><span className="self-center">Trang {page} / {Math.max(1, Math.ceil(total / 20))}</span><Button disabled={page >= Math.ceil(total / 20) || loading} onClick={() => setPage((value) => value + 1)} size="sm" variant="outline">Sau</Button></div></div>
    </CardContent></Card>
    <StatusDialog error={statusError} onClose={() => setPendingStatus(null)} onSubmit={changeStatus} open={Boolean(pendingStatus)} saving={saving} targetName={pendingStatus?.user.email ?? ""} title={pendingStatus?.status === "SUSPENDED" ? "Khóa tài khoản" : "Mở khóa tài khoản"} />
    <StatusDialog error={roleError} onClose={() => setRoleTarget(null)} onSubmit={changeSystemAdminRole} open={Boolean(roleTarget)} saving={savingRole} targetName={roleTarget?.user.email ?? ""} title={roleTarget?.enabled ? "Cấp quyền System Admin" : "Thu hồi quyền System Admin"} />
    <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title="Chi tiết tài khoản">
      {detail && <div className="grid gap-4">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <DetailField label="Họ và tên" value={detail.fullName} />
          <DetailField label="Email" value={detail.email} />
          <DetailField label="Trạng thái tài khoản" value={detail.status === "ACTIVE" ? "Đang hoạt động" : "Tạm khóa"} />
          <DetailField label="Ngày tạo" value={detail.createdAt ? new Date(detail.createdAt).toLocaleString("vi-VN") : "Không rõ"} />
          <DetailField label="Vai trò nền tảng" value={detail.platformRoles.map(({ role }) => role.displayName).join(", ") || "Không có"} />
          <DetailField label="Doanh nghiệp" value={detail.memberships[0]?.business.name ?? "Chưa thuộc doanh nghiệp"} />
          <DetailField label="Vai trò doanh nghiệp" value={detail.memberships[0]?.role.displayName ?? "Không có"} />
          <DetailField label="Trạng thái thành viên" value={detail.memberships[0]?.status ?? "Không có"} />
          {detail.isBootstrapAdmin && <DetailField label="Quyền quản trị" value="Tài khoản gốc — không thể thu hồi System Admin hoặc tạm khóa" />}
        </dl>
      </div>}
    </Modal>
  </AppLayout></PlatformAdminOnly>;
}

function AuditList({ logs, loading, onSelect, emptyMessage = "Chưa có hoạt động nào." }: {
  logs: AdminAuditLog[];
  loading: boolean;
  onSelect?: (log: AdminAuditLog) => void;
  emptyMessage?: string;
}) {
  const labels: Record<string, string> = {
    "user.suspend": "Khóa tài khoản", "user.restore": "Mở khóa tài khoản",
    "business.suspend": "Khóa doanh nghiệp", "business.restore": "Mở khóa doanh nghiệp",
    "business.update": "Cập nhật doanh nghiệp", "business.profile.update": "Cập nhật hồ sơ doanh nghiệp", "membership.status.update": "Cập nhật trạng thái thành viên",
    "membership.invitation.create": "Mời nhân viên", "membership.invitation.revoke": "Thu hồi lời mời",
    "business.create": "Tạo doanh nghiệp", "membership.invitation.accept": "Chấp nhận lời mời",
    "membership.invitation.delivery_failed": "Gửi lời mời thất bại",
    "user.system_admin.grant": "Cấp quyền System Admin", "user.system_admin.revoke": "Thu hồi quyền System Admin",
    "business.role.create": "Tạo vai trò",
    "business.role.update": "Cập nhật vai trò và quyền",
    "business.role.archive": "Lưu trữ vai trò",
    "business.role.restore": "Khôi phục vai trò",
    "membership.role.update": "Thay đổi vai trò thành viên",
  };
  if (loading) return <p className="py-8 text-center text-sm text-slate-500">Đang tải hoạt động…</p>;
  if (!logs.length) return <p className="py-8 text-center text-sm text-slate-500">{emptyMessage}</p>;
  return <div className="admin-record-list">{logs.map((log) => <div className="admin-record-row admin-audit-record" key={log.id}>
    <div className="admin-audit-copy"><strong className="flex items-center gap-2 text-sm"><Activity size={15} className="text-[#0f4c3a]" />{labels[log.action] ?? log.action}</strong><p className="mt-1 text-xs text-slate-500">{log.actor.fullName} · {log.actor.email}{log.business ? ` · ${log.business.name}` : ""}</p>{log.reason && <small>Lý do: {log.reason}</small>}</div>
    <div className="flex items-center gap-3"><time className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString("vi-VN")}</time>{onSelect && <Button onClick={() => onSelect(log)} size="sm" variant="outline"><Eye size={14} /> Chi tiết</Button>}</div>
  </div>)}</div>;
}

const adminAuditActionLabels: Record<string, string> = {
  "user.suspend": "Khóa tài khoản",
  "user.restore": "Mở khóa tài khoản",
  "business.suspend": "Khóa doanh nghiệp",
  "business.restore": "Mở khóa doanh nghiệp",
  "business.update": "Cập nhật doanh nghiệp",
  "business.profile.update": "Cập nhật hồ sơ doanh nghiệp",
  "business.create": "Tạo doanh nghiệp",
  "membership.status.update": "Cập nhật trạng thái thành viên",
  "membership.role.update": "Thay đổi vai trò thành viên",
  "membership.invitation.create": "Mời nhân viên",
  "membership.invitation.revoke": "Thu hồi lời mời",
  "membership.invitation.accept": "Chấp nhận lời mời",
  "membership.invitation.delivery_failed": "Gửi lời mời thất bại",
  "business.role.create": "Tạo vai trò",
  "business.role.update": "Cập nhật vai trò và quyền",
  "business.role.archive": "Lưu trữ vai trò",
  "business.role.restore": "Khôi phục vai trò",
  "user.system_admin.grant": "Cấp quyền quản trị hệ thống",
  "user.system_admin.revoke": "Thu hồi quyền quản trị hệ thống",
};

export function AdminAuditPage() {
  const [detail, setDetail] = useState<AdminAuditLog | null>(null);
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pageSize = 20;
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listAdminAuditLogs({ search, action, from, to, sort, page, pageSize });
      setLogs(result.logs);
      setActions(result.actions);
      setTotal(result.total);
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể tải audit log."); }
    finally { setLoading(false); }
  }, [action, from, page, pageSize, search, sort, to]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  function resetFilters() {
    setSearchDraft("");
    setSearch("");
    setAction("");
    setFrom("");
    setTo("");
    setSort("newest");
    setPage(1);
  }

  return <PlatformAdminOnly permission="platform.audit.read"><AppLayout>
    <div className="page-header admin-page-hero"><div><span className="admin-hero-kicker"><Activity size={13} /> QUẢN TRỊ NỀN TẢNG</span><h1>Audit log</h1><p>Lịch sử thay đổi và hoạt động quản trị trên toàn hệ thống.</p></div></div>
    {error && <Alert className="mb-4" variant="destructive">{error}</Alert>}
    <Card className="admin-panel">
      <CardHeader className="admin-panel-header"><div><span className="eyebrow">NHẬT KÝ KIỂM TOÁN</span><CardTitle>Hoạt động hệ thống</CardTitle><p className="admin-panel-description">{total} hoạt động phù hợp</p></div></CardHeader>
      <CardContent className="admin-panel-content">
        <form className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 md:grid-cols-2 xl:grid-cols-6" onSubmit={(event) => { event.preventDefault(); setSearch(searchDraft.trim()); setPage(1); }}>
          <label className="grid gap-1 text-xs font-semibold text-slate-600 xl:col-span-2" htmlFor="admin-audit-search">Tìm kiếm hoạt động, người thực hiện, doanh nghiệp
            <Input id="admin-audit-search" onChange={(event) => setSearchDraft(event.target.value)} placeholder="Nhập từ khóa..." value={searchDraft} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600" htmlFor="admin-audit-action">Loại hoạt động
            <select className="admin-filter w-full" id="admin-audit-action" onChange={(event) => { setAction(event.target.value); setPage(1); }} value={action}>
              <option value="">Tất cả hoạt động</option>
              {actions.map((actionName) => <option key={actionName} value={actionName}>{adminAuditActionLabels[actionName] ?? actionName}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600" htmlFor="admin-audit-from">Từ ngày
            <Input id="admin-audit-from" onChange={(event) => { setFrom(event.target.value); setPage(1); }} type="date" value={from} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600" htmlFor="admin-audit-to">Đến ngày
            <Input id="admin-audit-to" onChange={(event) => { setTo(event.target.value); setPage(1); }} type="date" value={to} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600" htmlFor="admin-audit-sort">Sắp xếp theo thời gian
            <select className="admin-filter w-full" id="admin-audit-sort" onChange={(event) => { setSort(event.target.value as "newest" | "oldest"); setPage(1); }} value={sort}>
              <option value="newest">Mới nhất trước</option>
              <option value="oldest">Cũ nhất trước</option>
            </select>
          </label>
          <div className="flex items-end gap-2 xl:col-span-6">
            <Button size="sm" type="submit"><Search size={14} /> Tìm kiếm</Button>
            <Button onClick={resetFilters} size="sm" type="button" variant="outline">Xóa bộ lọc</Button>
          </div>
        </form>
        <AuditList emptyMessage="Không tìm thấy hoạt động phù hợp với bộ lọc." loading={loading} logs={logs} onSelect={setDetail} />
        <div className="admin-pagination">
          <span>{total} hoạt động · Hiển thị tối đa {pageSize} hoạt động mỗi trang</span>
          <div className="flex items-center gap-2">
            <Button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} size="sm" variant="outline">Trước</Button>
            <span>Trang {page} / {Math.max(1, Math.ceil(total / pageSize))}</span>
            <Button disabled={page >= Math.ceil(total / pageSize) || loading} onClick={() => setPage((value) => value + 1)} size="sm" variant="outline">Sau</Button>
          </div>
        </div>
      </CardContent>
    </Card>
    <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title="Chi tiết audit log">
      {detail && <div className="grid gap-4 text-sm">
        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailField label="Hành động" value={detail.action} />
          <DetailField label="Đối tượng" value={`${detail.targetType} · ${detail.targetId}`} />
          <DetailField label="Người thực hiện" value={`${detail.actor.fullName} · ${detail.actor.email}`} />
          <DetailField label="Doanh nghiệp" value={detail.business?.name ?? "Toàn hệ thống"} />
          <DetailField label="Thời gian" value={new Date(detail.createdAt).toLocaleString("vi-VN")} />
          <DetailField label="Lý do" value={detail.reason ?? "Không có"} />
        </dl>
        <div><strong className="text-xs uppercase tracking-wide text-slate-500">Thay đổi</strong><pre className="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs">{detail.changes ? JSON.stringify(detail.changes, null, 2) : "Không có dữ liệu thay đổi"}</pre></div>
      </div>}
    </Modal>
  </AppLayout></PlatformAdminOnly>;
}

export function BusinessActivityPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [detail, setDetail] = useState<AdminAuditLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listBusinessActivity({ search, action, from, to, sort, page, pageSize });
      setLogs(result.logs);
      setActions(result.actions);
      setTotal(result.total);
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể tải hoạt động doanh nghiệp."); }
    finally { setLoading(false); }
  }, [action, from, page, pageSize, search, sort, to]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  function resetFilters() {
    setSearchDraft("");
    setSearch("");
    setAction("");
    setFrom("");
    setTo("");
    setSort("newest");
    setPage(1);
  }

  return <AppLayout>
    <div className="page-header admin-page-hero"><div><span className="admin-hero-kicker"><Activity size={13} /> DOANH NGHIỆP</span><h1>Hoạt động thành viên</h1><p>Theo dõi lời mời, trạng thái thành viên, thay đổi vai trò và quyền trong doanh nghiệp.</p></div><Button disabled={loading} onClick={() => void load()} variant="outline"><RefreshCw size={15} /> Làm mới</Button></div>
    {error && <Alert className="mb-4" variant="destructive">{error}</Alert>}
    <Card className="admin-panel">
      <CardHeader className="admin-panel-header">
        <div><span className="eyebrow">NHẬT KÝ HOẠT ĐỘNG</span><CardTitle>Hoạt động trong doanh nghiệp</CardTitle><p className="admin-panel-description">{total} hoạt động phù hợp</p></div>
      </CardHeader>
      <CardContent className="admin-panel-content">
        <form className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 md:grid-cols-2 xl:grid-cols-6" onSubmit={(event) => { event.preventDefault(); setSearch(searchDraft.trim()); setPage(1); }}>
          <label className="grid gap-1 text-xs font-semibold text-slate-600 xl:col-span-2" htmlFor="business-activity-search">Tìm kiếm hoạt động, người thực hiện, lý do
            <Input id="business-activity-search" onChange={(event) => setSearchDraft(event.target.value)} placeholder="Nhập từ khóa..." value={searchDraft} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600" htmlFor="business-activity-action">Loại hoạt động
            <select className="admin-filter w-full" id="business-activity-action" onChange={(event) => { setAction(event.target.value); setPage(1); }} value={action}>
              <option value="">Tất cả hoạt động</option>
              {actions.map((actionName) => <option key={actionName} value={actionName}>{getBusinessActivityLabel(actionName)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600" htmlFor="business-activity-from">Từ ngày
            <Input id="business-activity-from" onChange={(event) => { setFrom(event.target.value); setPage(1); }} type="date" value={from} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600" htmlFor="business-activity-to">Đến ngày
            <Input id="business-activity-to" onChange={(event) => { setTo(event.target.value); setPage(1); }} type="date" value={to} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600" htmlFor="business-activity-sort">Sắp xếp theo thời gian
            <select className="admin-filter w-full" id="business-activity-sort" onChange={(event) => { setSort(event.target.value as "newest" | "oldest"); setPage(1); }} value={sort}>
              <option value="newest">Mới nhất trước</option>
              <option value="oldest">Cũ nhất trước</option>
            </select>
          </label>
          <div className="flex items-end gap-2 xl:col-span-6">
            <Button size="sm" type="submit"><Search size={14} /> Tìm kiếm</Button>
            <Button onClick={resetFilters} size="sm" type="button" variant="outline">Xóa bộ lọc</Button>
          </div>
        </form>
        <AuditList emptyMessage="Không tìm thấy hoạt động phù hợp với bộ lọc." loading={loading} logs={logs} onSelect={setDetail} />
        <div className="admin-pagination">
          <span>{total} hoạt động · Hiển thị tối đa {pageSize} hoạt động mỗi trang</span>
          <div className="flex items-center gap-2">
            <Button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} size="sm" variant="outline">Trước</Button>
            <span>Trang {page} / {Math.max(1, Math.ceil(total / pageSize))}</span>
            <Button disabled={page >= Math.ceil(total / pageSize) || loading} onClick={() => setPage((value) => value + 1)} size="sm" variant="outline">Sau</Button>
          </div>
        </div>
      </CardContent>
    </Card>
    <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title="Chi tiết hoạt động">
      {detail && <div className="grid gap-4 text-sm">
        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailField label="Hoạt động" value={getBusinessActivityLabel(detail.action)} />
          <DetailField label="Đối tượng" value={`${detail.targetType} · ${detail.targetId}`} />
          <DetailField label="Người thực hiện" value={`${detail.actor.fullName} · ${detail.actor.email}`} />
          <DetailField label="Thời gian" value={new Date(detail.createdAt).toLocaleString("vi-VN")} />
          <DetailField label="Lý do" value={detail.reason ?? "Không có"} />
        </dl>
      </div>}
    </Modal>
  </AppLayout>;
}

function DetailField({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-words font-medium text-slate-900">{value}</dd></div>;
}
