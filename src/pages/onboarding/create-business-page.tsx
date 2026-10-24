import { useState, type FormEvent } from "react";
import { ArrowRight, Building2, Check, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/common/form-field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { createBusiness } from "@/services/business.service";
import { signOut } from "@/services/auth.service";

export function CreateBusinessPage() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [industryType, setIndustryType] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createBusiness({ name, phone, industryType, address: address || undefined });
      await refreshProfile();
      navigate("/app", { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tạo doanh nghiệp.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await signOut();
    navigate("/login");
  }

  return (
    <main className="onboarding-page">
      <header className="onboarding-top"><Brand /><div><span>{profile?.user.email}</span><button onClick={() => void logout()} type="button"><LogOut size={15} /> Đăng xuất</button></div></header>
      <div className="onboarding-wrap">
        <div className="onboarding-progress"><span className="progress-step done"><Check size={13} /></span><i /><span className="progress-step current">02</span><i /><span className="progress-step">03</span><span className="progress-label">Tài khoản <b>›</b> Doanh nghiệp <b>›</b> Mời nhân viên</span></div>
        <section className="onboarding-card">
          <div className="onboarding-icon"><Building2 size={23} /></div>
          <span className="eyebrow">THIẾT LẬP CỬA HÀNG</span>
          <h1>Bắt đầu với<br /><span>doanh nghiệp của bạn.</span></h1>
          <p className="onboarding-intro">Tạo hồ sơ cửa hàng để quản lý đội ngũ và sử dụng các công cụ của ABC Copilot.</p>
          {error && <Alert className="mb-5" variant="destructive">{error}</Alert>}
          <form className="onboarding-form" onSubmit={(event) => void submit(event)}>
            <FormField id="business-name" label="Tên doanh nghiệp"><Input autoComplete="organization" id="business-name" maxLength={255} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Maison de Bloom" required value={name} /></FormField>
            <div className="form-grid-two"><FormField id="industry" label="Ngành hàng"><select id="industry" onChange={(event) => setIndustryType(event.target.value)} required value={industryType}><option disabled value="">Chọn ngành hàng</option><option value="FASHION">Thời trang</option><option value="COSMETICS">Mỹ phẩm & làm đẹp</option><option value="GROCERY">Thực phẩm & tạp hóa</option><option value="ELECTRONICS">Điện tử & công nghệ</option><option value="HOME_LIVING">Nhà cửa & đời sống</option><option value="OTHER">Khác</option></select></FormField><FormField id="phone" label="Số điện thoại"><Input autoComplete="tel" id="phone" maxLength={20} onChange={(event) => setPhone(event.target.value)} placeholder="090 123 4567" required value={phone} /></FormField></div>
            <FormField id="address" label="Địa chỉ" hint="Không bắt buộc"><Input autoComplete="street-address" id="address" onChange={(event) => setAddress(event.target.value)} placeholder="Số nhà, đường, quận, thành phố" value={address} /></FormField>
            <div className="owner-note"><span><ShieldCheck size={17} /></span><p><strong>Vai trò của bạn: Chủ doanh nghiệp</strong><br />Bạn sẽ có thể quản lý thông tin cửa hàng và mời nhân viên.</p><Sparkles size={16} /></div>
            <Button className="onboarding-submit" disabled={busy} size="lg" type="submit">{busy ? "Đang tạo hồ sơ…" : "Tạo hồ sơ doanh nghiệp"} <ArrowRight size={17} /></Button>
          </form>
        </section>
        <p className="onboarding-footnote"><ShieldCheck size={14} /> Thông tin doanh nghiệp chỉ hiển thị với những người được cấp quyền.</p>
      </div>
    </main>
  );
}
