import { BadgeCheck, Building2, CalendarDays, MapPin, Phone, Store } from "lucide-react";

import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

const industries: Record<string, string> = {
  FASHION: "Thời trang",
  COSMETICS: "Mỹ phẩm & làm đẹp",
  GROCERY: "Thực phẩm & tạp hóa",
  ELECTRONICS: "Điện tử & công nghệ",
  HOME_LIVING: "Nhà cửa & đời sống",
  OTHER: "Khác",
};

export function BusinessPage() {
  const { profile } = useAuth();
  const business = profile?.business;
  return (
    <AppLayout>
      <div className="page-header"><div><span className="eyebrow">THÔNG TIN CỬA HÀNG</span><h1>Hồ sơ doanh nghiệp</h1><p>Xem thông tin doanh nghiệp đang gắn với tài khoản của bạn.</p></div><span className="verified-badge"><BadgeCheck size={14} /> Đang hoạt động</span></div>
      <Card className="business-profile-card"><CardHeader className="business-cover"><span className="business-logo"><Store size={26} /></span><div><span className="eyebrow">DOANH NGHIỆP CỦA BẠN</span><CardTitle>{business?.name}</CardTitle><p>{industries[business?.industryType ?? ""] || "Ngành hàng chưa cập nhật"}</p></div><span className="role-pill owner">{business?.role === "OWNER" ? "Chủ doanh nghiệp" : "Thành viên"}</span></CardHeader><CardContent className="business-details"><div className="business-detail"><span><Building2 size={16} /> Ngành hàng</span><strong>{industries[business?.industryType ?? ""] || "Chưa cập nhật"}</strong></div><div className="business-detail"><span><Phone size={16} /> Số điện thoại</span><strong>{business?.phone || "Chưa cập nhật"}</strong></div><div className="business-detail"><span><MapPin size={16} /> Địa chỉ</span><strong>{business?.address || "Chưa cập nhật"}</strong></div><div className="business-detail"><span><CalendarDays size={16} /> Ngày tạo hồ sơ</span><strong>{business?.createdAt ? new Date(business.createdAt).toLocaleDateString("vi-VN") : "—"}</strong></div></CardContent></Card>
    </AppLayout>
  );
}
