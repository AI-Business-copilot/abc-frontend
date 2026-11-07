import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/common/form-field";
import { Input } from "@/components/ui/input";
import { AUTH_NOTICE_EVENT, consumeAuthNotice, SESSION_EXPIRED_MESSAGE } from "@/lib/api-client";
import {
  getAuthErrorMessage,
  signInWithEmail,
  signInWithGoogle,
} from "@/services/auth.service";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() =>
    searchParams.get("session") === "expired"
      ? SESSION_EXPIRED_MESSAGE
      : consumeAuthNotice(),
  );

  useEffect(() => {
    // The session can expire while this page is already mounted, so listen for
    // the notice and also pick up anything written before the listener attached.
    const pending = consumeAuthNotice();
    if (pending) setError(pending);

    const onNotice = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      if (message) setError(message);
    };
    window.addEventListener(AUTH_NOTICE_EVENT, onNotice);
    return () => window.removeEventListener(AUTH_NOTICE_EVENT, onNotice);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signInWithEmail(email, password);
      navigate("/auth/callback", { replace: true });
    } catch (reason) {
      setError(getAuthErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function googleLogin() {
    setBusy(true);
    setError("");
    try {
      await signInWithGoogle();
    } catch (reason) {
      setError(getAuthErrorMessage(reason, "Không thể đăng nhập với Google."));
      setBusy(false);
    }
  }

  return (
    <AuthShell eyebrow="CHÀO MỪNG BẠN TRỞ LẠI" title="Đăng nhập vào tài khoản" description="Đăng nhập để tiếp tục quản lý cửa hàng và đội ngũ của bạn.">
      <div className="auth-stack">
        {error && <Alert variant="destructive">{error}</Alert>}
        <Button className="google-button" onClick={() => void googleLogin()} disabled={busy} variant="outline" type="button">
          <GoogleMark /> Tiếp tục với Google
        </Button>
        <div className="form-divider"><span>hoặc đăng nhập bằng email</span></div>
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <FormField id="email" label="Địa chỉ email">
            <div className="input-with-icon"><Mail size={17} /><Input autoComplete="email" id="email" onChange={(event) => setEmail(event.target.value)} placeholder="ten@doanhnghiep.vn" required type="email" value={email} /></div>
          </FormField>
          <FormField id="password" label="Mật khẩu">
            <div className="input-with-icon"><LockKeyhole size={17} /><Input autoComplete="current-password" id="password" onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" required type={showPassword ? "text" : "password"} value={password} /><button aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} className="input-trailing" onClick={() => setShowPassword((value) => !value)} type="button">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          </FormField>
          <div className="form-options"><span>Giữ bảo mật tài khoản của bạn</span><Link to="/forgot-password">Quên mật khẩu?</Link></div>
          <Button className="auth-submit" disabled={busy} type="submit">{busy ? "Đang đăng nhập…" : "Đăng nhập"} <ArrowRight size={16} /></Button>
        </form>
        <p className="auth-switch">Chưa có tài khoản? <Link to="/signup">Tạo tài khoản miễn phí</Link></p>
      </div>
    </AuthShell>
  );
}

function GoogleMark() {
  return <svg aria-hidden="true" height="18" viewBox="0 0 48 48" width="18"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4)" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.9c-.58 2.96-2.25 5.48-4.72 7.18l7.63 5.92c4.45-4.1 7.17-10.14 7.17-17.57Z" transform="translate(0 0)" /><path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.2a23.9 23.9 0 0 0 0 21.58l7.98-6.2Z" transform="translate(0 4)" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.63-5.92c-2.12 1.42-4.83 2.26-8.27 2.26-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.2C6.51 42.62 14.62 48 24 48Z" transform="translate(0 0)" /></svg>;
}
