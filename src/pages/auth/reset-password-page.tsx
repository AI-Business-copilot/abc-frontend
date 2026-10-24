import { useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/common/form-field";
import { Input } from "@/components/ui/input";
import { isStrongPassword } from "@/lib/password-policy";
import { useAuth } from "@/hooks/use-auth";
import { updatePassword } from "@/services/auth.service";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
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
      await updatePassword(password);
      navigate("/app/security?password=updated", { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể cập nhật mật khẩu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell eyebrow="BẢO MẬT TÀI KHOẢN" title="Tạo mật khẩu mới" description="Chọn mật khẩu khó đoán và không dùng lại mật khẩu ở dịch vụ khác.">
      <div className="auth-stack">
        {!session && <Alert variant="destructive">Liên kết khôi phục không hợp lệ hoặc đã hết hạn. Hãy yêu cầu liên kết mới.</Alert>}
        {error && <Alert variant="destructive">{error}</Alert>}
        {session && <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <FormField id="new-password" label="Mật khẩu mới" hint="Ít nhất 12 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt."><div className="input-with-icon"><LockKeyhole size={17} /><Input autoComplete="new-password" id="new-password" minLength={12} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></div></FormField>
          <FormField id="confirm-password" label="Nhập lại mật khẩu"><div className="input-with-icon"><LockKeyhole size={17} /><Input autoComplete="new-password" id="confirm-password" minLength={12} onChange={(event) => setConfirmPassword(event.target.value)} required type="password" value={confirmPassword} /></div></FormField>
          <Button className="auth-submit" disabled={busy} type="submit">{busy ? "Đang lưu…" : "Cập nhật mật khẩu"} <ArrowRight size={16} /></Button>
        </form>}
        <p className="auth-switch"><Link to="/login">Quay lại đăng nhập</Link></p>
      </div>
    </AuthShell>
  );
}
