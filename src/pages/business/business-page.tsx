import { useState, type FormEvent } from "react";
import { BadgeCheck, Building2, CalendarDays, MapPin, Phone, Store } from "lucide-react";

import { AppLayout } from "@/components/layout/app-layout";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/hooks/use-auth";
import { updateCurrentBusiness } from "@/services/business.service";

const industries: Record<string, string> = {
  FASHION: "Thời trang",
  COSMETICS: "Mỹ phẩm & làm đẹp",
  GROCERY: "Thực phẩm & tạp hóa",
  ELECTRONICS: "Điện tử & công nghệ",
  HOME_LIVING: "Nhà cửa & đời sống",
  OTHER: "Khác",
};

export function BusinessPage() {
  const { profile, refreshProfile } = useAuth();
  const business = profile?.business;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [values, setValues] = useState({ name: business?.name ?? "", phone: business?.phone ?? "", industryType: business?.industryType ?? "", address: business?.address ?? "" });

  function openEditor() {
    setValues({ name: business?.name ?? "", phone: business?.phone ?? "", industryType: business?.industryType ?? "", address: business?.address ?? "" });
    setError("");
    setEditing(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateCurrentBusiness(values);
      await refreshProfile();
      setEditing(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể cập nhật hồ sơ doanh nghiệp.");
    } finally { setSaving(false); }
  }

  return (
    <AppLayout>
      <div className="page-header"><div><span className="eyebrow">THÔNG TIN CỬA HÀNG</span><h1>Hồ sơ doanh nghiệp</h1><p>Xem và quản lý thông tin doanh nghiệp đang gắn với tài khoản của bạn.</p></div><div className="flex items-center gap-3"><span className={`verified-badge ${business?.status !== "ACTIVE" || business.membershipStatus !== "ACTIVE" ? "border-amber-200 bg-amber-50 text-amber-800" : ""}`}><BadgeCheck size={14} />{business?.status !== "ACTIVE" ? "Doanh nghiệp tạm khóa" : business?.membershipStatus !== "ACTIVE" ? "Thành viên không hoạt động" : "Đang hoạt động"}</span>{business?.role === "OWNER" && <Button onClick={openEditor} variant="outline">Chỉnh sửa</Button>}</div></div>
      <Card className="business-profile-card"><CardHeader className="business-cover"><span className="business-logo"><Store size={26} /></span><div><span className="eyebrow">DOANH NGHIỆP CỦA BẠN</span><CardTitle>{business?.name}</CardTitle><p>{industries[business?.industryType ?? ""] || "Ngành hàng chưa cập nhật"}</p></div><span className="role-pill owner">{business?.role === "OWNER" ? "Chủ doanh nghiệp" : "Thành viên"}</span></CardHeader><CardContent className="business-details"><div className="business-detail"><span><Building2 size={16} /> Ngành hàng</span><strong>{industries[business?.industryType ?? ""] || "Chưa cập nhật"}</strong></div><div className="business-detail"><span><Phone size={16} /> Số điện thoại</span><strong>{business?.phone || "Chưa cập nhật"}</strong></div><div className="business-detail"><span><MapPin size={16} /> Địa chỉ</span><strong>{business?.address || "Chưa cập nhật"}</strong></div><div className="business-detail"><span><CalendarDays size={16} /> Ngày tạo hồ sơ</span><strong>{business?.createdAt ? new Date(business.createdAt).toLocaleDateString("vi-VN") : "—"}</strong></div></CardContent></Card>
      <Modal open={editing} onClose={() => setEditing(false)} title="Chỉnh sửa doanh nghiệp"><form className="grid gap-4" onSubmit={(event) => void save(event)}>
        {error && <Alert variant="destructive">{error}</Alert>}
        <label className="grid gap-1 text-sm font-medium">Tên doanh nghiệp<Input maxLength={255} onChange={(event) => setValues({ ...values, name: event.target.value })} required value={values.name} /></label>
        <label className="grid gap-1 text-sm font-medium">Số điện thoại<Input maxLength={20} onChange={(event) => setValues({ ...values, phone: event.target.value })} required value={values.phone} /></label>
        <label className="grid gap-1 text-sm font-medium">Ngành hàng<Input maxLength={50} onChange={(event) => setValues({ ...values, industryType: event.target.value })} required value={values.industryType} /></label>
        <label className="grid gap-1 text-sm font-medium">Địa chỉ<Input maxLength={10000} onChange={(event) => setValues({ ...values, address: event.target.value })} value={values.address} /></label>
        <div className="flex justify-end gap-2"><Button onClick={() => setEditing(false)} type="button" variant="outline">Hủy</Button><Button disabled={saving} type="submit">{saving ? "Đang lưu…" : "Lưu thay đổi"}</Button></div>
      </form></Modal>
    </AppLayout>
  );
}
