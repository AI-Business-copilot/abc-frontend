import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  Building2,
  CircleCheck,
  LockKeyhole,
  MailPlus,
  PackageCheck,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Wallet,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { AppLayout } from "@/components/layout/app-layout";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";

export function DashboardPage() {
  const { profile, profileError, refreshProfile } = useAuth();
  const { isOwner, isSystemAdmin, can } = usePermissions();
  const [searchParams] = useSearchParams();
  const roleLabel = isSystemAdmin
    ? "Quản trị viên hệ thống"
    : isOwner
      ? "Chủ doanh nghiệp"
      : "Nhân viên cửa hàng";

  const firstName = profile?.user.fullName?.split(" ").slice(-1)[0] || "bạn";

  const coreOperations = [
    {
      title: "POS Bán hàng & Thu ngân",
      desc: "Thao tác tính tiền quầy 3 giây, quét barcode, VietQR động và chốt ca thu ngân.",
      icon: ShoppingCart,
      to: "/sales",
      actionText: "Mở POS",
      accent: "text-emerald-700 bg-emerald-50",
    },
    {
      title: "Sản phẩm & Quản trị kho FEFO",
      desc: "Theo dõi tồn kho theo lô date (EXP/MFG), cảnh báo cận hạn và ma trận biến thể.",
      icon: Boxes,
      to: "/products",
      actionText: "Kho hàng",
      accent: "text-[#0f4c3a] bg-[#ecfdf5]",
    },
    {
      title: "Đơn mua hàng & Nhập kho NCC",
      desc: "Quản trị đơn đặt hàng PO, nhận hàng theo lô và kiểm soát công nợ nhà cung cấp.",
      icon: Truck,
      to: "/purchases",
      actionText: "Đơn PO",
      accent: "text-amber-700 bg-amber-50",
    },
    {
      title: "Quản lý ca trực & Két tiền",
      desc: "Mở ca đầu ngày, ghi nhận phiếu thu/chi và chốt ca tiền mặt minh bạch chống thất thoát.",
      icon: Wallet,
      to: "/app/cash-shifts",
      actionText: "Ca trực",
      accent: "text-blue-700 bg-blue-50",
    },
  ];

  return (
    <AppLayout>
      {/* Breadcrumb thoáng đãng, tự nhiên */}
      <div className="dashboard-breadcrumb">
        <span>Không gian vận hành</span>
        <span className="text-slate-400">/</span>
        <strong>Bảng điều khiển</strong>
        <span className="breadcrumb-live">
          <i /> Cửa hàng đang hoạt động
        </span>
      </div>

      {profileError && (
        <Alert className="mb-5" variant="destructive">
          {profileError}{" "}
          <button className="inline-action ml-2 underline font-semibold" onClick={() => void refreshProfile()} type="button">
            Thử tải lại
          </button>
        </Alert>
      )}

      {searchParams.get("invitation") === "accepted" && (
        <Alert className="mb-5" variant="success">
          Bạn đã tham gia doanh nghiệp với tư cách nhân viên.
        </Alert>
      )}

      {/* Banner chào mừng: Nhã nhặn, tự nhiên, chuẩn phong cách SaaS cao cấp */}
      <section className="dashboard-welcome">
        <div>
          <span className="eyebrow">
            {profile?.business ? "HỆ THỐNG QUẢN TRỊ BÁN LẺ & KHO FEFO" : "QUẢN TRỊ NỀN TẢNG"}
          </span>
          <h1>Xin chào, {firstName}.</h1>
          <p>
            {profile?.business ? (
              <>
                Không gian làm việc: <strong className="text-slate-800 font-semibold">{profile.business.name}</strong> · Vai trò: <strong className="text-slate-800 font-semibold">{roleLabel}</strong>.
              </>
            ) : (
              "Không gian quản trị tài khoản và hoạt động toàn nền tảng ABC Copilot."
            )}
          </p>
        </div>
        <div className="welcome-actions">
          <Button asChild className="bg-[#0f4c3a] hover:bg-[#0a3528] !text-white font-semibold shadow-xs">
            <Link to="/sales">
              <ShoppingCart size={16} /> Mở POS Bán hàng
            </Link>
          </Button>
          {isOwner && (
            <Button asChild variant="outline">
              <Link to="/app/team">
                <MailPlus size={16} /> Đội ngũ
              </Link>
            </Button>
          )}
        </div>
      </section>

      {/* Dải 4 KPI chỉ số nghiệp vụ thiết thực */}
      <div className="kpi-grid">
        <Link to="/sales" className="kpi-card group cursor-pointer">
          <CardContent>
            <div className="kpi-top">
              <span>BÁN HÀNG TẠI QUẦY</span>
              <span className="kpi-icon violet group-hover:scale-110 transition-transform">
                <ShoppingCart size={17} />
              </span>
            </div>
            <strong className="kpi-value">POS Thu Ngân</strong>
            <div className="kpi-foot">
              <span className="status-inline">
                <i /> Vào bán hàng ngay
              </span>
              <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </CardContent>
        </Link>

        <Link to="/products" className="kpi-card group cursor-pointer">
          <CardContent>
            <div className="kpi-top">
              <span>KHO HÀNG & LÔ DATE</span>
              <span className="kpi-icon green group-hover:scale-110 transition-transform">
                <Boxes size={17} />
              </span>
            </div>
            <strong className="kpi-value">Kho FEFO</strong>
            <div className="kpi-foot">
              <span>Quản lý date & tồn kho</span>
              <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </CardContent>
        </Link>

        <Link to="/purchases" className="kpi-card group cursor-pointer">
          <CardContent>
            <div className="kpi-top">
              <span>MUA HÀNG & NCC</span>
              <span className="kpi-icon amber group-hover:scale-110 transition-transform">
                <Truck size={17} />
              </span>
            </div>
            <strong className="kpi-value">Đơn Nhập PO</strong>
            <div className="kpi-foot">
              <span>Kiểm đếm & công nợ</span>
              <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </CardContent>
        </Link>

        <Link to="/app/team" className="kpi-card group cursor-pointer">
          <CardContent>
            <div className="kpi-top">
              <span>ĐỘI NGŨ & PHÂN QUYỀN</span>
              <span className="kpi-icon blue group-hover:scale-110 transition-transform">
                <ShieldCheck size={17} />
              </span>
            </div>
            <strong className="kpi-value role-value">{profile?.permissions.length ?? 0} quyền hạn</strong>
            <div className="kpi-foot">
              <span>{roleLabel}</span>
              <CircleCheck size={15} />
            </div>
          </CardContent>
        </Link>
      </div>

      {/* Khung nội dung chính: Phân hệ vận hành & Thông tin danh tính */}
      <div className="dashboard-content-grid">
        {/* Cột trái: Phân hệ nghiệp vụ cốt lõi sẵn sàng sử dụng */}
        <Card className="onboarding-checklist">
          <CardHeader className="dashboard-card-header">
            <div>
              <span className="eyebrow">QUY TRÌNH VẬN HÀNH</span>
              <CardTitle>Phân hệ nghiệp vụ cốt lõi</CardTitle>
            </div>
            <span className="progress-counter">
              <CircleCheck aria-hidden="true" size={13} /> SẴN SÀNG HOẠT ĐỘNG
            </span>
          </CardHeader>
          <CardContent>
            <div className="checklist">
              {coreOperations.map((op) => {
                const Icon = op.icon;
                return (
                  <div className="checklist-row group hover:bg-slate-50/70 px-2 rounded-xl transition-colors" key={op.title}>
                    <span className={`checklist-icon ${op.accent}`}>
                      <Icon size={18} />
                    </span>
                    <span className="checklist-copy">
                      <strong>{op.title}</strong>
                      <small>{op.desc}</small>
                    </span>
                    <Button asChild size="sm" variant="outline" className="border-slate-200 hover:border-[#0f4c3a] hover:text-[#0f4c3a] group-hover:bg-white transition-all">
                      <Link to={op.to}>
                        {op.actionText} <ArrowRight size={14} className="ml-1" />
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Cột phải: Thông tin tài khoản & Không gian làm việc */}
        <Card className="access-card">
          <CardHeader className="dashboard-card-header">
            <div>
              <span className="eyebrow">TÀI KHOẢN VẬN HÀNH</span>
              <CardTitle>Danh tính & Quyền hạn</CardTitle>
            </div>
            <span className="secure-badge">
              <LockKeyhole size={13} /> Bảo mật
            </span>
          </CardHeader>
          <CardContent>
            <div className="identity-card">
              <span className="identity-avatar">
                {profile?.user.fullName?.slice(0, 1).toUpperCase() || "A"}
              </span>
              <span className="identity-info">
                <strong>{profile?.user.fullName || "Người dùng"}</strong>
                <small>{profile?.user.email}</small>
              </span>
              <span className="verified-badge">
                <BadgeCheck size={14} /> Đã xác thực
              </span>
            </div>

            <div className="access-list">
              <div>
                <span>
                  <ShieldCheck size={15} /> Vai trò tài khoản
                </span>
                <strong>{roleLabel}</strong>
              </div>
              <div>
                <span>
                  <Building2 size={15} /> Cửa hàng trực thuộc
                </span>
                <strong>{profile?.business?.name || "Chưa gán cửa hàng"}</strong>
              </div>
              <div>
                <span>
                  <PackageCheck size={15} /> Quyền thao tác
                </span>
                <strong>{profile?.permissions.length ?? 0} quyền được cấp</strong>
              </div>
            </div>

            <Button asChild className="access-link mt-4" variant="ghost">
              <Link to="/app/security" className="flex items-center justify-between w-full font-semibold text-[#0f4c3a]">
                <span>Cài đặt bảo mật tài khoản</span>
                <ArrowRight size={15} />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {can("business.read") && profile?.business && (
        <p className="dashboard-note">
          Dữ liệu bán hàng và kho hàng được đồng bộ tự động theo thời gian thực giữa POS thu ngân và kho hàng trung tâm.
        </p>
      )}
    </AppLayout>
  );
}
