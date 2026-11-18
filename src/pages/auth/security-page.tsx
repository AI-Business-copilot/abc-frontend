import { useState, type FormEvent } from "react";
import { ArrowRight, Check, KeyRound, ShieldCheck, Trash2, AlertTriangle } from "lucide-react";
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
import { apiJson } from "@/lib/api-client";
import { supabase } from "@/lib/supabase";

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

  // Xóa tài khoản
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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

  async function handleDeleteAccount() {
    if (deleteConfirmation !== "XOA TAI KHOAN") {
      setDeleteError('Vui lòng gõ chính xác cụm từ "XOA TAI KHOAN" để xác nhận.');
      return;
    }
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await apiJson("/auth/me", { method: "DELETE" });
      await supabase.auth.signOut();
      window.location.assign("/login");
    } catch (err: any) {
      setDeleteError(err?.message || "Lỗi khi xóa tài khoản.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <span className="eyebrow">CÀI ĐẶT TÀI KHOẢN</span>
          <h1>Đăng nhập &amp; bảo mật</h1>
          <p>Quản lý cách đăng nhập và bảo vệ tài khoản của bạn.</p>
        </div>
        <span className="status-pill">
          <span className="pulse-dot" /> Đang hoạt động
        </span>
      </div>

      <div className="security-grid">
        <Card>
          <CardHeader>
            <div className="card-heading-icon">
              <ShieldCheck size={18} />
            </div>
            <CardTitle>Tài khoản đăng nhập</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="identity-row">
              <span className="identity-g">{providerNames.includes("google") ? "G" : "@"}</span>
              <span>
                <strong>
                  {providerNames.length
                    ? providerNames
                        .map((provider) =>
                          provider === "google"
                            ? "Google"
                            : provider === "email"
                            ? "Email và mật khẩu"
                            : provider
                        )
                        .join(" · ")
                    : "Tài khoản ABC Copilot"}
                </strong>
                <small>Phương thức đăng nhập</small>
              </span>
              <span className="verified-badge">
                <Check size={13} /> Đã kết nối
              </span>
            </div>
            <div className="identity-email">{session?.user.email}</div>
            <p className="form-help">
              Email và phương thức đăng nhập giúp bảo vệ quyền truy cập vào không gian làm việc của bạn.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="card-heading-icon">
              <KeyRound size={18} />
            </div>
            <CardTitle>Tạo hoặc đổi mật khẩu</CardTitle>
            <p className="card-subtitle">
              Nếu bạn thường đăng nhập bằng Google, có thể tạo mật khẩu để đăng nhập bằng email. Nếu đã có mật khẩu, hãy nhập mật khẩu hiện tại để thay đổi.
            </p>
          </CardHeader>
          <CardContent>
            {error && <Alert className="mb-4" variant="destructive">{error}</Alert>}
            {success && <Alert className="mb-4" variant="success">Mật khẩu đã được cập nhật thành công.</Alert>}
            <form className="auth-form" onSubmit={(event) => void submit(event)}>
              <FormField id="current-password" label="Mật khẩu hiện tại (nếu đã có)">
                <Input
                  autoComplete="current-password"
                  id="current-password"
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Để trống nếu bạn chưa từng tạo mật khẩu"
                  type="password"
                  value={currentPassword}
                />
              </FormField>
              <FormField id="new-password" label="Mật khẩu mới">
                <Input
                  autoComplete="new-password"
                  id="new-password"
                  minLength={12}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </FormField>
              <FormField id="confirm-password" label="Xác nhận mật khẩu">
                <Input
                  autoComplete="new-password"
                  id="confirm-password"
                  minLength={12}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  type="password"
                  value={confirmPassword}
                />
              </FormField>
              <p className="form-help">Dùng ít nhất 12 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</p>
              <Button disabled={busy} type="submit">
                {busy ? "Đang cập nhật…" : "Lưu mật khẩu"} <ArrowRight size={15} />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* KHU VỰC NGUY HIỂM: XÓA TÀI KHOẢN */}
        <Card className="border-red-200">
          <CardHeader>
            <div className="card-heading-icon text-red-600 bg-red-50">
              <Trash2 size={18} />
            </div>
            <CardTitle className="text-red-700">Khu vực nguy hiểm</CardTitle>
            <p className="card-subtitle text-gray-600">
              Xóa tài khoản cá nhân và hủy tư cách thành viên trong tất cả không gian làm việc.
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
              <p className="text-[13px] text-red-800">
                Khi xóa tài khoản, bạn sẽ mất toàn bộ quyền truy cập và dữ liệu phiên làm việc. Hành động này không thể hoàn tác.
              </p>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="mt-3.5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-red-700 transition-colors shadow-xs"
              >
                <Trash2 size={15} />
                Yêu cầu xóa tài khoản của tôi
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Xác nhận Xóa Tài khoản */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-red-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-[18px] font-black text-gray-900">Xác nhận xóa vĩnh viễn tài khoản</h3>
            <p className="mt-2 text-[13.5px] text-gray-600 leading-relaxed">
              Bạn đang thực hiện thao tác xóa tài khoản <b className="text-gray-900">{session?.user.email}</b>.
              Vui lòng gõ chính xác cụm từ <code className="bg-red-50 text-red-700 font-bold px-1.5 py-0.5 rounded">XOA TAI KHOAN</code> để xác nhận:
            </p>

            {deleteError && (
              <div className="mt-3 text-[12.5px] text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {deleteError}
              </div>
            )}

            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Gõ XOA TAI KHOAN..."
              className="mt-4 w-full h-11 px-3.5 rounded-xl border border-gray-300 bg-white font-mono text-[13px] outline-none focus:border-red-600"
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation("");
                  setDeleteError("");
                }}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deleteBusy || deleteConfirmation !== "XOA TAI KHOAN"}
                onClick={() => void handleDeleteAccount()}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteBusy ? "Đang xử lý..." : "Xác nhận xóa ngay"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
