import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Clock3, MailPlus, RefreshCw, Send, ShieldCheck, UserRound, UsersRound, X } from "lucide-react";
import { Link } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/common/form-field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { getPermissionLabel } from "@/lib/permission-label";
import { setBusinessMemberStatus } from "@/services/admin.service";
import {
  inviteEmployee,
  listBusinessMembers,
  listBusinessRoles,
  listInvitations,
  revokeInvitation,
  updateBusinessMemberRole,
  type BusinessRole,
} from "@/services/business.service";
import type { BusinessInvitation, BusinessMember } from "@/types/auth.types";

export function TeamPage() {
  const { profile } = useAuth();
  const { can, isOwner } = usePermissions();
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [invitations, setInvitations] = useState<BusinessInvitation[]>([]);
  const [roles, setRoles] = useState<BusinessRole[]>([]);
  const [email, setEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [memberTarget, setMemberTarget] = useState<{ member: BusinessMember; status: BusinessMember["status"] } | null>(null);
  const [memberReason, setMemberReason] = useState("");
  const [memberBusy, setMemberBusy] = useState(false);
  const [roleTarget, setRoleTarget] = useState<BusinessMember | null>(null);
  const [memberRoleId, setMemberRoleId] = useState("");
  const [roleReason, setRoleReason] = useState("");
  const [roleBusy, setRoleBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const memberResult = await listBusinessMembers();
      setMembers(memberResult.members);
      if (can("business.roles.manage")) {
        const roleResult = await listBusinessRoles();
        const activeRoles = roleResult.roles.filter((role) => !role.isArchived);
        setRoles(activeRoles);
        setInviteRoleId((current) => current || activeRoles.find((role) => role.isDefault)?.id || "");
      }
      if (can("invitations.manage")) {
        const inviteResult = await listInvitations();
        setInvitations(inviteResult.invitations);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải danh sách thành viên.");
    } finally {
      setLoading(false);
    }
  }, [can]);

  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await inviteEmployee(email, inviteRoleId || undefined);
      setNotice(`Lời mời đã được gửi đến ${result.invitation.email}.`);
      setEmail("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể gửi lời mời.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string, inviteEmail: string) {
    setError("");
    setNotice("");
    try {
      await revokeInvitation(id);
      setNotice(`Đã thu hồi lời mời gửi đến ${inviteEmail}.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể thu hồi lời mời.");
    }
  }

  async function updateMemberStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memberTarget) return;
    setMemberBusy(true);
    setError("");
    setNotice("");
    try {
      await setBusinessMemberStatus(memberTarget.member.id, memberTarget.status, memberReason);
      setMemberTarget(null);
      setMemberReason("");
      setNotice(`Đã cập nhật trạng thái của ${memberTarget.member.user.fullName}.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể cập nhật trạng thái thành viên.");
    } finally {
      setMemberBusy(false);
    }
  }

  async function updateMemberRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roleTarget || !memberRoleId) return;
    setRoleBusy(true);
    setError("");
    setNotice("");
    try {
      await updateBusinessMemberRole(roleTarget.id, memberRoleId, roleReason.trim());
      setRoleTarget(null);
      setRoleReason("");
      setNotice(`Đã cập nhật vai trò của ${roleTarget.user.fullName}.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể thay đổi vai trò thành viên.");
    } finally {
      setRoleBusy(false);
    }
  }

  const pendingCount = invitations.filter((invitation) => invitation.status === "PENDING").length;

  return (
    <AppLayout>
      <div className="page-header"><div><span className="eyebrow">ĐỘI NGŨ CỬA HÀNG</span><h1>Thành viên</h1><p>Quản lý những người đang làm việc cùng {profile?.business?.name || "doanh nghiệp"}.</p></div><span className="status-pill"><UsersRound size={14} /> {members.length} thành viên</span></div>
      {error && <Alert className="mb-5" variant="destructive">{error}</Alert>}
      {notice && <Alert className="mb-5" variant="success">{notice}</Alert>}
      <div className="team-layout">
        <div className="team-main-column">
          <Card><CardHeader className="dashboard-card-header"><div><span className="eyebrow">ĐỘI NGŨ</span><CardTitle>Danh sách thành viên</CardTitle></div><Button disabled={loading} onClick={() => void load()} size="sm" variant="outline"><RefreshCw size={14} /> Làm mới</Button></CardHeader><CardContent>
            {loading ? <div className="empty-state"><span className="loading-bar" />Đang tải danh sách…</div> : members.length === 0 ? <div className="empty-state">Chưa có thành viên nào trong doanh nghiệp.</div> : (
              <div className="member-list">{members.map((member) => <div className="member-row" key={member.id}><span className="member-avatar">{member.user.fullName.slice(0, 1).toUpperCase()}</span><div className="member-main"><strong>{member.user.fullName}</strong><small>{member.user.email}</small>{member.user.status === "SUSPENDED" && <small className="text-amber-700">Tài khoản bị khóa ở cấp hệ thống</small>}</div><span className={`role-pill ${member.role.toLowerCase()}`}>{member.role === "OWNER" ? "Chủ doanh nghiệp" : member.roleName}</span><span className={`member-status ${member.status.toLowerCase()}`}><i /> {member.status === "ACTIVE" ? "Đang hoạt động" : member.status === "SUSPENDED" ? "Tạm khóa" : "Đã vô hiệu hóa"}</span>{member.role !== "OWNER" && <div className="flex flex-wrap gap-1">{can("business.roles.manage") && <Button onClick={() => { setRoleTarget(member); setMemberRoleId(member.roleId ?? ""); setRoleReason(""); }} size="sm" variant="outline">Đổi vai trò</Button>}{can("business.memberships.manage") && (member.status === "ACTIVE" ? <><Button onClick={() => { setMemberReason(""); setMemberTarget({ member, status: "SUSPENDED" }); }} size="sm" variant="outline">Tạm khóa</Button><Button onClick={() => { setMemberReason(""); setMemberTarget({ member, status: "INACTIVE" }); }} size="sm" variant="ghost">Vô hiệu hóa</Button></> : <Button onClick={() => { setMemberReason(""); setMemberTarget({ member, status: "ACTIVE" }); }} size="sm" variant="outline">Kích hoạt lại</Button>)}</div>}</div>)}</div>
            )}
          </CardContent></Card>
          {can("invitations.manage") && <Card className="mt-5"><CardHeader className="dashboard-card-header"><div><span className="eyebrow">THAM GIA DOANH NGHIỆP</span><CardTitle>Lời mời đã gửi</CardTitle></div><span className="pending-counter"><Clock3 size={14} /> {pendingCount} đang chờ</span></CardHeader><CardContent>
            {loading ? <div className="empty-state">Đang tải lời mời…</div> : invitations.length === 0 ? <div className="empty-state invite-empty"><span><Send size={19} /></span><strong>Chưa có lời mời nào</strong><small>Mời nhân viên tham gia để bắt đầu cộng tác.</small></div> : (
              <div className="invitation-list">{invitations.map((invitation) => <div className="invitation-row" key={invitation.id}><span className="invite-avatar"><MailPlus size={16} /></span><span className="invitation-main"><strong>{invitation.email}</strong><small>{invitation.roleName || "Nhân viên cửa hàng"} · Hết hạn {new Date(invitation.expiresAt).toLocaleDateString("vi-VN")}</small></span><span className={`invite-status ${invitation.status.toLowerCase()}`}>{invitation.status === "PENDING" ? "Đang chờ" : invitation.status === "ACCEPTED" ? "Đã tham gia" : invitation.status === "FAILED" ? "Chưa gửi được" : invitation.status === "REVOKED" ? "Đã thu hồi" : invitation.status === "EXPIRED" ? "Đã hết hạn" : invitation.status}</span>{invitation.status === "PENDING" && <Button aria-label={`Thu hồi lời mời cho ${invitation.email}`} onClick={() => void revoke(invitation.id, invitation.email)} size="icon" variant="ghost"><X size={16} /></Button>}</div>)}</div>
            )}
          </CardContent></Card>}
        </div>
        <aside className="team-aside">
          {isOwner && <Card className="invite-card"><CardHeader><div className="invite-card-icon"><MailPlus size={19} /></div><span className="eyebrow">MỜI ĐỒNG ĐỘI</span><CardTitle>Mời nhân viên</CardTitle><p className="card-subtitle">Nhân viên sẽ nhận thư mời qua email và tham gia bằng tài khoản của họ.</p></CardHeader><CardContent>
            <form className="auth-form" onSubmit={(event) => void submit(event)}><FormField id="invite-email" label="Email nhân viên"><Input autoComplete="email" id="invite-email" onChange={(event) => setEmail(event.target.value)} placeholder="nhanvien@doanhnghiep.vn" required type="email" value={email} /></FormField><label className="grid gap-2 text-sm font-medium" htmlFor="invite-role">Vai trò<select className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm" id="invite-role" onChange={(event) => setInviteRoleId(event.target.value)} value={inviteRoleId}>{roles.filter((role) => !role.isArchived).map((role) => <option key={role.id} value={role.id}>{role.displayName}{role.isDefault ? " (mặc định)" : ""}</option>)}</select></label><div className="invited-role"><span className="role-avatar"><UserRound size={14} /></span><span><strong>{roles.find((role) => role.id === inviteRoleId)?.displayName || "Nhân viên cửa hàng"}</strong><small>Quyền truy cập được cấp theo vai trò đã chọn</small></span><ShieldCheck size={15} /></div><Button className="w-full" disabled={busy || (can("business.roles.manage") && roles.length === 0)} type="submit">{busy ? "Đang gửi lời mời…" : "Gửi lời mời"} <ArrowRight size={15} /></Button></form>
          </CardContent></Card>}
          {can("business.audit.read") && <Card><CardContent className="py-4"><Link className="text-sm font-semibold text-[#0f4c3a] hover:underline" to="/app/activity">Xem hoạt động thành viên →</Link></CardContent></Card>}
          {can("business.roles.manage") && <Card><CardContent className="py-4"><Link className="text-sm font-semibold text-[#0f4c3a] hover:underline" to="/app/business/roles">Quản lý vai trò và quyền →</Link></CardContent></Card>}
          <Card className="permission-summary"><CardHeader><span className="eyebrow">QUYỀN ĐƯỢC CẤP</span><CardTitle>Vai trò của bạn</CardTitle></CardHeader><CardContent><div className="role-summary"><span className={`role-avatar large ${profile?.business?.role?.toLowerCase()}`}><ShieldCheck size={18} /></span><div><strong>{profile?.business?.roleName || (profile?.business?.role === "OWNER" ? "Chủ doanh nghiệp" : "Nhân viên cửa hàng")}</strong><small>{profile?.business?.name}</small></div></div><div className="permission-mini-list">{profile?.permissions.slice(0, 6).map((permission) => <span key={permission}><i />{getPermissionLabel(permission)}</span>)}{(profile?.permissions.length ?? 0) > 6 && <small>Và {((profile?.permissions.length ?? 0) - 6)} quyền khác</small>}</div></CardContent></Card>
        </aside>
      </div>
      <Modal open={Boolean(memberTarget)} onClose={() => setMemberTarget(null)} title={memberTarget?.status === "SUSPENDED" ? "Tạm khóa thành viên" : memberTarget?.status === "INACTIVE" ? "Vô hiệu hóa thành viên" : "Kích hoạt lại thành viên"}>
        <form className="grid gap-4" onSubmit={(event) => void updateMemberStatus(event)}>
          <p className="text-sm text-slate-600">Thành viên: <strong>{memberTarget?.member.user.fullName}</strong></p>
          <label className="grid gap-2 text-sm font-medium" htmlFor="membership-status-reason">Lý do thay đổi
            <textarea className="min-h-24 rounded-md border border-slate-300 p-3 text-sm" id="membership-status-reason" maxLength={1000} minLength={5} onChange={(event) => setMemberReason(event.target.value)} required value={memberReason} />
          </label>
          <div className="flex justify-end gap-2"><Button onClick={() => setMemberTarget(null)} type="button" variant="outline">Hủy</Button><Button disabled={memberBusy || memberReason.trim().length < 5} type="submit">{memberBusy ? "Đang lưu…" : "Xác nhận"}</Button></div>
        </form>
      </Modal>
      <Modal open={Boolean(roleTarget)} onClose={() => setRoleTarget(null)} title="Thay đổi vai trò thành viên">
        <form className="grid gap-4" onSubmit={(event) => void updateMemberRole(event)}>
          <p className="text-sm text-slate-600">Thành viên: <strong>{roleTarget?.user.fullName}</strong></p>
          <label className="grid gap-2 text-sm font-medium" htmlFor="member-role">Vai trò mới
            <select className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm" id="member-role" onChange={(event) => setMemberRoleId(event.target.value)} required value={memberRoleId}>{roles.map((role) => <option key={role.id} value={role.id}>{role.displayName}</option>)}</select>
          </label>
          <label className="grid gap-2 text-sm font-medium" htmlFor="member-role-reason">Lý do thay đổi
            <textarea className="min-h-24 rounded-md border border-slate-300 p-3 text-sm" id="member-role-reason" maxLength={1000} minLength={5} onChange={(event) => setRoleReason(event.target.value)} required value={roleReason} />
          </label>
          <div className="flex justify-end gap-2"><Button onClick={() => setRoleTarget(null)} type="button" variant="outline">Hủy</Button><Button disabled={roleBusy || roleReason.trim().length < 5} type="submit">{roleBusy ? "Đang lưu…" : "Xác nhận"}</Button></div>
        </form>
      </Modal>
    </AppLayout>
  );
}
