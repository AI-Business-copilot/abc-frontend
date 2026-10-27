import { Navigate, Outlet, createBrowserRouter, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import { LoadingScreen } from "@/components/common/loading-screen";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { AdminPage } from "@/pages/admin/admin-page";
import { BusinessPage } from "@/pages/business/business-page";
import { TeamPage } from "@/pages/business/team-page";
import { CallbackPage } from "@/pages/auth/callback-page";
import { ForgotPasswordPage } from "@/pages/auth/forgot-password-page";
import { LoginPage } from "@/pages/auth/login-page";
import { ResetPasswordPage } from "@/pages/auth/reset-password-page";
import { SecurityPage } from "@/pages/auth/security-page";
import { SignupPage } from "@/pages/auth/signup-page";
import { DashboardPage } from "@/pages/dashboard/dashboard-page";
import { CreateBusinessPage } from "@/pages/onboarding/create-business-page";
import { HomePage } from "@/pages/public/home-page";
import ProductsPage from "@/pages/products/products-page";
import CategoriesPage from "@/pages/products/categories-page";
import { OperationsPage } from "@/pages/products/operations-page";
import { ProductCreatePage } from "@/pages/products/product-create-page";
import { ProductAttributesPage } from "@/pages/products/product-attributes-page";
import { ProductVariantsPage } from "@/pages/products/product-variants-page";

function RequireSession({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  return <>{children}</>;
}

function RequireProfile() {
  const { session, profile, loading, profileError, refreshProfile } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  if (profileError) {
    return (
      <main className="callback-error">
        <div className="callback-error-card">
          <span className="eyebrow">KHÔNG THỂ TẢI HỒ SƠ</span>
          <h1>Kết nối không thành công</h1>
          <Alert className="mb-5" variant="destructive">{profileError}</Alert>
          <p className="form-help">Vui lòng thử lại sau. Nếu sự cố tiếp tục, hãy liên hệ người quản lý cửa hàng.</p>
          <Button onClick={() => void refreshProfile()}>Thử lại</Button>
        </div>
      </main>
    );
  }
  if (!profile) return <LoadingScreen label="Đang đồng bộ hồ sơ tài khoản…" />;
  return <Outlet />;
}

function RequireOnboarding() {
  const { profile } = useAuth();
  if (!profile?.onboardingRequired) return <Navigate replace to="/app" />;
  return <CreateBusinessPage />;
}

function RequireBusiness({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  if (!profile) return <LoadingScreen />;
  if (profile.onboardingRequired || !profile.business) {
    return <Navigate replace to="/app" />;
  }
  return <>{children}</>;
}

function AppIndex() {
  const { profile } = useAuth();
  if (!profile) return <LoadingScreen />;
  if (profile.onboardingRequired) return <Navigate replace to="/onboarding" />;
  if (profile.platformRoles.some((role) => role.code === "SYSTEM_ADMIN") && !profile.business) {
    return <Navigate replace to="/app/admin" />;
  }
  return <DashboardPage />;
}

function NotFoundPage() {
  return <main className="not-found-page"><span className="eyebrow">404 · KHÔNG TÌM THẤY</span><h1>Trang này không tồn tại.</h1><p>Liên kết có thể đã cũ hoặc không đúng.</p><Button onClick={() => window.location.assign("/")}>Về trang chủ</Button></main>;
}

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <RequireSession><ResetPasswordPage /></RequireSession> },
  { path: "/auth/callback", element: <CallbackPage /> },
  {
    element: <RequireProfile />,
    children: [
      { path: "/onboarding", element: <RequireOnboarding /> },
      {
        path: "/products",
        element: (
          <RequireBusiness>
            <ProductsPage />
          </RequireBusiness>
        ),
      },
      {
        path: "/products/new",
        element: (
          <RequireBusiness>
            <ProductCreatePage />
          </RequireBusiness>
        ),
      },
      {
        path: "/products/new/attributes",
        element: (
          <RequireBusiness>
            <ProductAttributesPage />
          </RequireBusiness>
        ),
      },
      {
        path: "/products/new/variants",
        element: (
          <RequireBusiness>
            <ProductVariantsPage />
          </RequireBusiness>
        ),
      },
      {
        path: "/products/categories",
        element: (
          <RequireBusiness>
            <CategoriesPage />
          </RequireBusiness>
        ),
      },
      {
        path: "/app",
        children: [
          { index: true, element: <AppIndex /> },
          { path: "products", element: <OperationsPage /> },
          { path: "team", element: <TeamPage /> },
          { path: "business", element: <BusinessPage /> },
          { path: "security", element: <SecurityPage /> },
          { path: "admin", element: <AdminPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
