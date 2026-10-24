import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Clock3, MailPlus, RefreshCw, Send, ShieldCheck, UserRound, UsersRound, X } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/common/form-field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { getPermissionLabel } from "@/lib/permission-label";
import { inviteEmployee, listBusinessMembers, listInvitations, revokeInvitation } from "@/services/business.service";
import type { BusinessInvitation, BusinessMember } from "@/types/auth.types";

export function TeamPage() {
  const { profile } = useAuth();
  const { can, isOwner } = usePermissions();
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [invitations, setInvitations] = useState<BusinessInvitation[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const memberResult = await listBusinessMembers();
      setMembers(memberResult.members);
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
      const result = await inviteEmployee(email);
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
              <div className="member-list">{members.map((member) => <div className="member-row" key={member.id}><span className="member-avatar">{member.user.fullName.slice(0, 1).toUpperCase()}</span><div className="member-main"><strong>{member.user.fullName}</strong><small>{member.user.email}</small></div><span className={`role-pill ${member.role.toLowerCase()}`}>{member.role === "OWNER" ? "Chủ doanh nghiệp" : "Nhân viên cửa hàng"}</span><span className={`member-status ${member.status.toLowerCase()}`}><i /> {member.status === "ACTIVE" ? "Đang hoạt động" : "Tạm khóa"}</span></div>)}</div>
            )}
          </CardContent></Card>
          {can("invitations.manage") && <Card className="mt-5"><CardHeader className="dashboard-card-header"><div><span className="eyebrow">THAM GIA DOANH NGHIỆP</span><CardTitle>Lời mời đã gửi</CardTitle></div><span className="pending-counter"><Clock3 size={14} /> {pendingCount} đang chờ</span></CardHeader><CardContent>
            {loading ? <div className="empty-state">Đang tải lời mời…</div> : invitations.length === 0 ? <div className="empty-state invite-empty"><span><Send size={19} /></span><strong>Chưa có lời mời nào</strong><small>Mời nhân viên tham gia để bắt đầu cộng tác.</small></div> : (
              <div className="invitation-list">{invitations.map((invitation) => <div className="invitation-row" key={invitation.id}><span className="invite-avatar"><MailPlus size={16} /></span><span className="invitation-main"><strong>{invitation.email}</strong><small>Nhân viên cửa hàng · Hết hạn {new Date(invitation.expiresAt).toLocaleDateString("vi-VN")}</small></span><span className={`invite-status ${invitation.status.toLowerCase()}`}>{invitation.status === "PENDING" ? "Đang chờ" : invitation.status === "ACCEPTED" ? "Đã tham gia" : invitation.status === "FAILED" ? "Chưa gửi được" : invitation.status === "REVOKED" ? "Đã thu hồi" : invitation.status === "EXPIRED" ? "Đã hết hạn" : invitation.status}</span>{invitation.status === "PENDING" && <Button aria-label={`Thu hồi lời mời cho ${invitation.email}`} onClick={() => void revoke(invitation.id, invitation.email)} size="icon" variant="ghost"><X size={16} /></Button>}</div>)}</div>
            )}
          </CardContent></Card>}
        </div>
        <aside className="team-aside">
          {isOwner && <Card className="invite-card"><CardHeader><div className="invite-card-icon"><MailPlus size={19} /></div><span className="eyebrow">MỜI ĐỒNG ĐỘI</span><CardTitle>Mời nhân viên</CardTitle><p className="card-subtitle">Nhân viên sẽ nhận thư mời qua email và tham gia bằng tài khoản của họ.</p></CardHeader><CardContent>
            <form className="auth-form" onSubmit={(event) => void submit(event)}><FormField id="invite-email" label="Email nhân viên"><Input autoComplete="email" id="invite-email" onChange={(event) => setEmail(event.target.value)} placeholder="nhanvien@doanhnghiep.vn" required type="email" value={email} /></FormField><div className="invited-role"><span className="role-avatar"><UserRound size={14} /></span><span><strong>Nhân viên cửa hàng</strong><small>Được cấp quyền phù hợp với công việc</small></span><ShieldCheck size={15} /></div><Button className="w-full" disabled={busy} type="submit">{busy ? "Đang gửi lời mời…" : "Gửi lời mời"} <ArrowRight size={15} /></Button></form>
          </CardContent></Card>}
          <Card className="permission-summary"><CardHeader><span className="eyebrow">QUYỀN ĐƯỢC CẤP</span><CardTitle>Vai trò của bạn</CardTitle></CardHeader><CardContent><div className="role-summary"><span className={`role-avatar large ${profile?.business?.role?.toLowerCase()}`}><ShieldCheck size={18} /></span><div><strong>{profile?.business?.role === "OWNER" ? "Chủ doanh nghiệp" : "Nhân viên cửa hàng"}</strong><small>{profile?.business?.name}</small></div></div><div className="permission-mini-list">{profile?.permissions.slice(0, 6).map((permission) => <span key={permission}><i />{getPermissionLabel(permission)}</span>)}{(profile?.permissions.length ?? 0) > 6 && <small>Và {((profile?.permissions.length ?? 0) - 6)} quyền khác</small>}</div></CardContent></Card>
        </aside>
      </div>
    </AppLayout>
  );
}
