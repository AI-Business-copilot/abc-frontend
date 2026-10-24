import { useState, type FormEvent } from "react";
import { ArrowRight, Check, KeyRound, ShieldCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/common/form-field";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { isStrongPassword } from "@/lib/password-policy";
import { updatePassword } from "@/services/auth.service";

export function SecurityPage() {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const providerNames = [...new Set(session?.user.identities?.map((identity) => identity.provider) ?? [])];
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(searchParams.get("password") === "updated");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(false);
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (!isStrongPassword(password)) {
      setError("Hãy dùng mật khẩu từ 12 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.");
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password, currentPassword || undefined);
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setSuccess(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể cập nhật mật khẩu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppLayout>
      <div className="page-header"><div><span className="eyebrow">CÀI ĐẶT TÀI KHOẢN</span><h1>Đăng nhập & bảo mật</h1><p>Quản lý cách đăng nhập và bảo vệ tài khoản của bạn.</p></div><span className="status-pill"><span className="pulse-dot" /> Đang hoạt động</span></div>
      <div className="security-grid">
        <Card><CardHeader><div className="card-heading-icon"><ShieldCheck size={18} /></div><CardTitle>Tài khoản đăng nhập</CardTitle></CardHeader><CardContent><div className="identity-row"><span className="identity-g">{providerNames.includes("google") ? "G" : "@"}</span><span><strong>{providerNames.length ? providerNames.map((provider) => provider === "google" ? "Google" : provider === "email" ? "Email và mật khẩu" : provider).join(" · ") : "Tài khoản ABC Copilot"}</strong><small>Phương thức đăng nhập</small></span><span className="verified-badge"><Check size={13} /> Đã kết nối</span></div><div className="identity-email">{session?.user.email}</div><p className="form-help">Email và phương thức đăng nhập giúp bảo vệ quyền truy cập vào không gian làm việc của bạn.</p></CardContent></Card>
        <Card><CardHeader><div className="card-heading-icon"><KeyRound size={18} /></div><CardTitle>Tạo hoặc đổi mật khẩu</CardTitle><p className="card-subtitle">Nếu bạn thường đăng nhập bằng Google, có thể tạo mật khẩu để đăng nhập bằng email. Nếu đã có mật khẩu, hãy nhập mật khẩu hiện tại để thay đổi.</p></CardHeader><CardContent>
          {error && <Alert className="mb-4" variant="destructive">{error}</Alert>}
          {success && <Alert className="mb-4" variant="success">Mật khẩu đã được cập nhật thành công.</Alert>}
          <form className="auth-form" onSubmit={(event) => void submit(event)}>
            <FormField id="current-password" label="Mật khẩu hiện tại (nếu đã có)"><Input autoComplete="current-password" id="current-password" onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Để trống nếu bạn chưa từng tạo mật khẩu" type="password" value={currentPassword} /></FormField>
            <FormField id="new-password" label="Mật khẩu mới"><Input autoComplete="new-password" id="new-password" minLength={12} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></FormField>
            <FormField id="confirm-password" label="Xác nhận mật khẩu"><Input autoComplete="new-password" id="confirm-password" minLength={12} onChange={(event) => setConfirmPassword(event.target.value)} required type="password" value={confirmPassword} /></FormField>
            <p className="form-help">Dùng ít nhất 12 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</p>
            <Button disabled={busy} type="submit">{busy ? "Đang cập nhật…" : "Lưu mật khẩu"} <ArrowRight size={15} /></Button>
          </form>
        </CardContent></Card>
      </div>
    </AppLayout>
  );
}
