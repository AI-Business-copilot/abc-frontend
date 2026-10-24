import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CircleCheck,
  CircleHelp,
  Clock3,
  LockKeyhole,
  MailPlus,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { AppLayout } from "@/components/layout/app-layout";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { getPermissionLabel } from "@/lib/permission-label";

const onboardingChecks = [
  { label: "Tài khoản đã xác minh", detail: "Email tài khoản đã được xác nhận.", icon: BadgeCheck },
  { label: "Doanh nghiệp đã khởi tạo", detail: "Thông tin cửa hàng và quyền chủ doanh nghiệp đã sẵn sàng.", icon: Building2 },
  { label: "Mời nhân viên", detail: "Mời đồng đội cùng tham gia cửa hàng.", icon: UsersRound },
];

export function DashboardPage() {
  const { profile, profileError, refreshProfile } = useAuth();
  const { isOwner, isSystemAdmin, isStaff, can } = usePermissions();
  const [searchParams] = useSearchParams();
  const roleLabel = isSystemAdmin ? "Quản trị viên hệ thống" : isOwner ? "Chủ doanh nghiệp" : "Nhân viên cửa hàng";

  return (
    <AppLayout>
      <div className="dashboard-breadcrumb"><span>Không gian làm việc</span><span>/</span><strong>Tổng quan</strong><span className="breadcrumb-live"><i /> Tài khoản đang hoạt động</span></div>
      {profileError && <Alert className="mb-5" variant="destructive">{profileError} <button className="inline-action" onClick={() => void refreshProfile()} type="button">Thử tải lại</button></Alert>}
      {searchParams.get("invitation") === "accepted" && <Alert className="mb-5" variant="success">Bạn đã tham gia doanh nghiệp với tư cách nhân viên.</Alert>}
      <section className="dashboard-welcome">
        <div><span className="eyebrow">{profile?.business ? "TỔNG QUAN CỬA HÀNG" : "QUẢN TRỊ NỀN TẢNG"}</span><h1>Xin chào, {profile?.user.fullName?.split(" ")[0] || "bạn"}.</h1><p>{profile?.business ? `Chào mừng bạn đến với ${profile.business.name}.` : "Quản lý tài khoản và hoạt động của nền tảng ABC Copilot."} Những thông tin bạn xem phụ thuộc vào vai trò được cấp.</p></div>
        <div className="welcome-actions">{isOwner && <Button asChild variant="outline"><Link to="/app/team"><MailPlus size={16} /> Mời nhân viên</Link></Button>}<Button asChild><Link to="/app/security"><LockKeyhole size={16} /> Tài khoản</Link></Button></div>
      </section>
      <div className="kpi-grid">
        <Card className="kpi-card"><CardContent><div className="kpi-top"><span>VAI TRÒ CỦA BẠN</span><span className="kpi-icon violet"><ShieldCheck size={17} /></span></div><strong className="kpi-value role-value">{roleLabel}</strong><div className="kpi-foot"><span className="status-inline"><i /> Đang hoạt động</span><span>Trong hệ thống</span></div></CardContent></Card>
        <Card className="kpi-card"><CardContent><div className="kpi-top"><span>DOANH NGHIỆP</span><span className="kpi-icon blue"><Building2 size={17} /></span></div><strong className="kpi-value">{profile?.business?.name || "Nền tảng"}</strong><div className="kpi-foot"><span>{profile?.business ? "Không gian làm việc" : "Quản trị nền tảng"}</span><span className="metric-dot" /></div></CardContent></Card>
        <Card className="kpi-card"><CardContent><div className="kpi-top"><span>QUYỀN TRUY CẬP</span><span className="kpi-icon green"><PackageCheck size={17} /></span></div><strong className="kpi-value">{profile?.permissions.length ?? 0} <small>quyền</small></strong><div className="kpi-foot"><span>Theo vai trò của bạn</span><ArrowUpRight size={15} /></div></CardContent></Card>
        <Card className="kpi-card"><CardContent><div className="kpi-top"><span>TÀI KHOẢN</span><span className="kpi-icon amber"><LockKeyhole size={17} /></span></div><strong className="kpi-value">Đã đăng nhập</strong><div className="kpi-foot"><span>Email {profile?.user.emailVerified ? "đã xác minh" : "chưa xác minh"}</span><CircleCheck size={15} /></div></CardContent></Card>
      </div>
      <div className="dashboard-content-grid">
        <Card className="onboarding-checklist">
          <CardHeader className="dashboard-card-header"><div><span className="eyebrow">BẮT ĐẦU VẬN HÀNH</span><CardTitle>{isOwner ? "Thiết lập doanh nghiệp" : isStaff ? "Không gian làm việc của bạn" : "Quản trị nền tảng"}</CardTitle></div><span className="progress-counter"><CheckMark /> {isOwner ? "2/3" : "SẴN SÀNG"}</span></CardHeader>
          <CardContent>
            {isOwner ? (
              <div className="checklist">{onboardingChecks.map(({ label, detail, icon: Icon }, index) => <div className={`checklist-row ${index < 2 ? "complete" : ""}`} key={label}><span className="checklist-icon">{index < 2 ? <CircleCheck size={18} /> : <Icon size={18} />}</span><span className="checklist-copy"><strong>{label}</strong><small>{detail}</small></span>{index < 2 ? <span className="done-label">Hoàn tất</span> : <Button asChild size="sm" variant="outline"><Link to="/app/team">Mời ngay <ArrowRight size={14} /></Link></Button>}</div>)}</div>
            ) : isStaff ? (
              <div className="staff-welcome"><span className="staff-welcome-icon"><UsersRound size={22} /></span><div><strong>Bạn đang tham gia {profile?.business?.name}</strong><p>Vai trò nhân viên cho phép bạn xem sản phẩm, ghi nhận hàng hóa và tạo đơn hàng theo quyền được cấp.</p><div className="permission-chip-row">{profile?.permissions.map((permission) => <span className="permission-chip" key={permission}>{getPermissionLabel(permission)}</span>)}</div></div></div>
            ) : (
              <div className="staff-welcome"><span className="staff-welcome-icon"><ShieldCheck size={22} /></span><div><strong>Tài khoản quản trị nền tảng</strong><p>Vai trò này hỗ trợ quản lý hoạt động chung của ABC Copilot, không bao gồm quyền sở hữu dữ liệu của từng doanh nghiệp.</p><Button asChild className="mt-4" size="sm" variant="outline"><Link to="/app/admin">Mở trang quản trị <ArrowRight size={14} /></Link></Button></div></div>
            )}
          </CardContent>
        </Card>
        <Card className="access-card">
          <CardHeader className="dashboard-card-header"><div><span className="eyebrow">TRUY CẬP TÀI KHOẢN</span><CardTitle>Danh tính & quyền hạn</CardTitle></div><span className="secure-badge"><LockKeyhole size={13} /> Bảo mật</span></CardHeader>
          <CardContent>
            <div className="identity-card"><span className="identity-avatar">{profile?.user.fullName?.slice(0, 1).toUpperCase() || "A"}</span><span className="identity-info"><strong>{profile?.user.fullName}</strong><small>{profile?.user.email}</small></span><span className="verified-badge"><BadgeCheck size={14} /> Xác thực</span></div>
            <div className="access-list"><div><span><ShieldCheck size={15} /> Vai trò hiện tại</span><strong>{roleLabel}</strong></div><div><span><Clock3 size={15} /> Không gian</span><strong>{profile?.business?.name || "Nền tảng ABC Copilot"}</strong></div><div><span><CircleHelp size={15} /> Quyền được cấp</span><strong>{profile?.permissions.length ?? 0} quyền</strong></div></div>
            <Button asChild className="access-link" variant="ghost"><Link to="/app/security">Cài đặt tài khoản <ArrowRight size={15} /></Link></Button>
          </CardContent>
        </Card>
      </div>
      <section className="coming-panel"><div className="coming-icon"><Sparkles size={18} /></div><div><span className="eyebrow">SẮP CÓ TRÊN ABC COPILOT</span><h2>Công cụ quản lý cửa hàng đang được hoàn thiện</h2><p>Báo cáo bán hàng, quản lý hàng hóa và phân tích kinh doanh sẽ được bổ sung trong các bản cập nhật tiếp theo.</p></div><span className="coming-tag">SẮP RA MẮT</span></section>
      {can("business.read") && profile?.business && <p className="dashboard-note">Các số liệu bán hàng và tồn kho sẽ xuất hiện tại đây khi cửa hàng bắt đầu sử dụng những công cụ tương ứng.</p>}
    </AppLayout>
  );
}

function CheckMark() {
  return <CircleCheck aria-hidden="true" size={13} />;
}
