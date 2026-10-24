import { Building2, LockKeyhole, ShieldCheck, UsersRound } from "lucide-react";

import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { getPermissionLabel } from "@/lib/permission-label";

export function AdminPage() {
  const { profile } = useAuth();
  const { isSystemAdmin } = usePermissions();
  if (!isSystemAdmin) {
    return <AppLayout><div className="page-header"><div><span className="eyebrow">QUẢN TRỊ NỀN TẢNG</span><h1>Không thể mở trang này</h1><p>Trang quản trị chỉ dành cho người được cấp quyền quản trị nền tảng.</p></div></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="page-header"><div><span className="eyebrow">ABC COPILOT · QUẢN TRỊ</span><h1>Quản trị nền tảng</h1><p>Thông tin tài khoản và phạm vi quản trị của bạn.</p></div><span className="admin-role-pill"><ShieldCheck size={14} /> Quản trị viên</span></div>
      <div className="kpi-grid admin-kpi-grid">
        <Card className="kpi-card"><CardContent><div className="kpi-top"><span>TÀI KHOẢN</span><span className="kpi-icon violet"><UsersRound size={17} /></span></div><strong className="kpi-value">Đang hoạt động</strong><div className="kpi-foot"><span>{profile?.user.email}</span></div></CardContent></Card>
        <Card className="kpi-card"><CardContent><div className="kpi-top"><span>PHẠM VI QUẢN LÝ</span><span className="kpi-icon blue"><Building2 size={17} /></span></div><strong className="kpi-value">Nền tảng ABC Copilot</strong><div className="kpi-foot"><span>Không gian quản trị chung</span></div></CardContent></Card>
        <Card className="kpi-card"><CardContent><div className="kpi-top"><span>QUYỀN ĐƯỢC CẤP</span><span className="kpi-icon green"><ShieldCheck size={17} /></span></div><strong className="kpi-value">{profile?.permissions.length ?? 0} <small>quyền</small></strong><div className="kpi-foot"><span>Theo vai trò quản trị</span></div></CardContent></Card>
        <Card className="kpi-card"><CardContent><div className="kpi-top"><span>BẢO VỆ DỮ LIỆU</span><span className="kpi-icon amber"><LockKeyhole size={17} /></span></div><strong className="kpi-value">Phân quyền riêng</strong><div className="kpi-foot"><span>Dữ liệu cửa hàng được bảo vệ</span></div></CardContent></Card>
      </div>
      <Card className="admin-permissions"><CardHeader><span className="eyebrow">VAI TRÒ CỦA BẠN</span><CardTitle>Các quyền quản trị</CardTitle></CardHeader><CardContent><div className="admin-permission-list">{profile?.permissions.map((permission) => <span className="permission-chip" key={permission}><ShieldCheck size={13} />{getPermissionLabel(permission)}</span>)}</div><p className="form-help">Bạn chỉ có thể sử dụng những chức năng phù hợp với các quyền được cấp.</p></CardContent></Card>
    </AppLayout>
  );
}
