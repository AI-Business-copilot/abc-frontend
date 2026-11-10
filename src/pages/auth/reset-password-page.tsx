import { useState, type FormEvent } from "react";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
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
    <AuthShell
      eyebrow="BẢO MẬT TÀI KHOẢN"
      title="Thiết lập mật khẩu mới ABC"
      description="Chọn mật khẩu an toàn và không dùng chung với các dịch vụ khác."
    >
      <div className="flex flex-col gap-3.5 w-full">
        {!session && (
          <Alert variant="destructive">
            Liên kết khôi phục không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại.
          </Alert>
        )}
        {error && <Alert variant="destructive">{error}</Alert>}

        {session && (
          <form className="flex flex-col gap-3.5" onSubmit={(event) => void submit(event)}>
            <div className="space-y-1 text-left">
              <label htmlFor="new-password" className="block text-xs font-semibold text-slate-700">
                Mật khẩu mới
              </label>
              <div className="relative">
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Tối thiểu 12 ký tự"
                  required
                  className="h-10.5 rounded-lg border-slate-200 bg-slate-50/60 pr-10 text-xs sm:text-sm focus:bg-white focus:border-[#0f4c3a] focus:ring-[#0f4c3a]"
                />
                <LockKeyhole className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={17} />
              </div>
            </div>

            <div className="space-y-1 text-left">
              <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-700">
                Nhập lại mật khẩu mới
              </label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Nhập lại chính xác mật khẩu"
                  required
                  className="h-10.5 rounded-lg border-slate-200 bg-slate-50/60 pr-10 text-xs sm:text-sm focus:bg-white focus:border-[#0f4c3a] focus:ring-[#0f4c3a]"
                />
                <LockKeyhole className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={17} />
              </div>
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-[#c1121f] hover:bg-[#a10e1a] !text-white font-bold py-2.5 sm:py-3 text-sm sm:text-base shadow-md shadow-red-950/20 active:scale-[0.99] transition-all cursor-pointer mt-1"
            >
              {busy ? "Đang lưu mật khẩu…" : "Cập nhật mật khẩu"}
            </Button>
          </form>
        )}

        <p className="text-center text-xs text-slate-500 mt-1">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-[#0f4c3a] hover:text-[#c1121f] font-semibold transition-colors">
            <ArrowLeft size={14} /> Quay lại đăng nhập
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
