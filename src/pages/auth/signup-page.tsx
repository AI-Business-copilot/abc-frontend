import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/common/form-field";
import { Input } from "@/components/ui/input";
import { isStrongPassword } from "@/lib/password-policy";
import { signUpWithEmail } from "@/services/auth.service";

export function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isStrongPassword(password)) {
      setError("Hãy dùng mật khẩu từ 12 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await signUpWithEmail(email, password, name);

      setSent(!data.session);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tạo tài khoản.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell eyebrow="TẠO TÀI KHOẢN" title={sent ? "Kiểm tra hộp thư của bạn" : "Bắt đầu sử dụng ABC Copilot"} description={sent ? "Mở email xác nhận để kích hoạt tài khoản và tiếp tục thiết lập cửa hàng." : "Tạo tài khoản để thiết lập cửa hàng và mời đội ngũ của bạn."}>
      <div className="auth-stack">
        {error && <Alert variant="destructive">{error}</Alert>}
        {sent ? (
          <div className="success-panel"><span className="success-check">✓</span><strong>Email xác nhận đã được gửi</strong><p>Mở liên kết trong email để xác nhận địa chỉ và tiếp tục.</p><Button asChild variant="outline"><Link to="/login">Quay lại đăng nhập</Link></Button></div>
        ) : (
          <>
            <form className="auth-form" onSubmit={(event) => void submit(event)}>
              <FormField id="full-name" label="Họ và tên"><div className="input-with-icon"><UserRound size={17} /><Input autoComplete="name" id="full-name" onChange={(event) => setName(event.target.value)} placeholder="Nguyễn Minh Anh" required value={name} /></div></FormField>
              <FormField id="email" label="Địa chỉ email"><div className="input-with-icon"><Mail size={17} /><Input autoComplete="email" id="email" onChange={(event) => setEmail(event.target.value)} placeholder="ten@doanhnghiep.vn" required type="email" value={email} /></div></FormField>
              <FormField id="password" label="Mật khẩu" hint="Ít nhất 12 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt."><div className="input-with-icon"><LockKeyhole size={17} /><Input autoComplete="new-password" id="password" minLength={12} onChange={(event) => setPassword(event.target.value)} placeholder="Tạo mật khẩu mạnh" required type={showPassword ? "text" : "password"} value={password} /><button aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} className="input-trailing" onClick={() => setShowPassword((value) => !value)} type="button">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></FormField>
              <Button className="auth-submit" disabled={busy} type="submit">{busy ? "Đang tạo tài khoản…" : "Tạo tài khoản"} <ArrowRight size={16} /></Button>
            </form>
            <p className="auth-switch">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
          </>
        )}
      </div>
    </AuthShell>
  );
}
