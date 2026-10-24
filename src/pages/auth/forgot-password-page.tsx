import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { Link } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/common/form-field";
import { Input } from "@/components/ui/input";
import { sendPasswordReset } from "@/services/auth.service";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể gửi email đặt lại mật khẩu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell eyebrow="KHÔI PHỤC TÀI KHOẢN" title={sent ? "Kiểm tra email của bạn" : "Bạn quên mật khẩu?"} description={sent ? "Nếu email có tài khoản, bạn sẽ nhận được hướng dẫn tạo mật khẩu mới." : "Nhập email bạn dùng để đăng nhập. Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu."}>
      <div className="auth-stack">
        {error && <Alert variant="destructive">{error}</Alert>}
        {!sent && <form className="auth-form" onSubmit={(event) => void submit(event)}><FormField id="email" label="Địa chỉ email"><div className="input-with-icon"><Mail size={17} /><Input autoComplete="email" id="email" onChange={(event) => setEmail(event.target.value)} placeholder="ten@doanhnghiep.vn" required type="email" value={email} /></div></FormField><Button className="auth-submit" disabled={busy} type="submit">{busy ? "Đang gửi…" : "Gửi liên kết đặt lại"} <ArrowRight size={16} /></Button></form>}
        {sent && <Alert variant="success">Hãy mở email và làm theo hướng dẫn để tạo mật khẩu mới.</Alert>}
        <p className="auth-switch"><Link className="back-link" to="/login"><ArrowLeft size={15} /> Quay lại đăng nhập</Link></p>
      </div>
    </AuthShell>
  );
}
