import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { Icon } from "@/pages/products/ui-icon";
import { signOut } from "@/services/auth.service";

type CatalogHeaderProps = {
  active:
    | "products"
    | "categories"
    | "attributes"
    | "inventory"
    | "stock-audit"
    | "stock-log"
    | "lots"
    | "scrap"
    | "orders"
    | "receipts"
    | "suppliers"
    | "sales"
    | "pos"
    | "customers";
  keyword: string;
  onKeywordChange: (value: string) => void;
  mode?: "catalog" | "inventory" | "purchases" | "sales";
  onSearch?: () => void;
};

const tabs = [
  { key: "products", label: "Sản phẩm", to: "/products" },
  { key: "categories", label: "Danh mục", to: "/products/categories" },
  { key: "attributes", label: "Thuộc tính", to: "/products/attributes" },
  { key: "inventory", label: "Phiếu kiểm kê kho", to: "/inventory" },
] as const;
const inventoryTabs = [
  { key: "products", label: "← Quay lại Sản phẩm", to: "/products" },
  { key: "inventory", label: "Phiếu kiểm kê & Nạp tồn", to: "/inventory" },
  { key: "stock-audit", label: "Kiểm kê tồn kho", to: "/inventory/audit" },
  { key: "stock-log", label: "Nhật ký biến động kho", to: "/inventory/stock-log" },
  { key: "lots", label: "Lô hàng & hạn sử dụng", to: "/inventory/lots" },
  { key: "scrap", label: "Phiếu hủy hàng", to: "/inventory/scrap" },
] as const;

const purchaseTabs = [
  { key: "orders", label: "Đơn đặt mua", to: "/purchases" },
  { key: "receipts", label: "Phiếu nhận & thanh toán NCC", to: "/purchases/receipts" },
  { key: "suppliers", label: "Nhà cung cấp & công nợ", to: "/purchases/suppliers" },
] as const;

const salesTabs = [
  { key: "pos", label: "Bán tại quầy", to: "/sales/new" },
  { key: "sales", label: "Đơn bán hàng", to: "/sales" },
  { key: "customers", label: "Khách hàng", to: "/sales/customers" },
] as const;

export function CatalogHeader({ active, keyword, onKeywordChange, mode = "catalog", onSearch }: CatalogHeaderProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isOwner, isStaff, can } = usePermissions();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const business = profile?.business ?? null;
  const displayName = profile?.user.fullName || profile?.user.email || "Người dùng";
  const avatarText =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";
  const roleLabel = isOwner ? "Chủ cửa hàng" : isStaff ? "Nhân viên" : "Quản trị viên";

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch {
      window.location.assign("/login");
    }
  };

  return (
    <header className={`sticky top-0 z-40 bg-white border-b border-[#eaecf0]${mode === "purchases" || mode === "sales" ? " order-workspace-header" : ""}`}>
      <div className="h-16 pl-6 pr-5 flex items-center gap-6">
        <Link className="flex items-center gap-2.5 shrink-0" to={(mode === "purchases" || mode === "sales") ? "/app/orders" : "/products"}>
          <div className="w-9 h-9 rounded-lg bg-[#0f4c3a] grid place-items-center text-white shadow-[0_4px_10px_rgba(79,70,229,0.35)]">
            <Icon name="auto_awesome" className="text-[19px]" />
          </div>
          <div className="leading-tight">
            <div className="flex items-baseline gap-2">
              <span className="text-[16px] font-extrabold tracking-tight">ABC Retail</span>
              <span className="text-[9px] font-bold tracking-[0.14em] text-[#0f4c3a] bg-[#ecfdf5] px-1.5 py-0.5 rounded">
                COPILOT
              </span>
            </div>
            <div className="text-[10.5px] font-medium text-[#98a2b3] mt-0.5">{(mode === "purchases" || mode === "sales") ? "ERP Đơn Hàng & Thanh Toán" : "ERP Tồn Kho & Mã Hàng"}</div>
          </div>
        </Link>

        <div className="flex-1 max-w-[720px]">
          <div className="h-10 rounded-lg bg-[#f2f4f7] flex items-center gap-2 px-3.5 text-[#667085] focus-within:ring-2 focus-within:ring-[#a7f3d0]">
            <Icon name="search" className="text-[19px]" />
            <input
              value={keyword}
              maxLength={(mode === "purchases" || mode === "sales") ? 255 : undefined}
              onChange={(event) => onKeywordChange(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") onSearch?.(); }}
              aria-label={mode === "sales" ? "Tra cứu đơn bán hoặc khách hàng" : mode === "purchases" ? "Tra cứu chứng từ hoặc nhà cung cấp" : "Tra cứu hàng hóa"}
              placeholder={mode === "sales" ? "Tìm sản phẩm, đơn bán hoặc khách hàng… Nhấn Enter để tìm" : mode === "purchases" ? "Tìm mã chứng từ, nhà cung cấp, SKU… Nhấn Enter để tìm" : "Tra cứu nhanh SKU, mã vạch, tên hàng hóa, danh mục..."}
              className="flex-1 bg-transparent outline-none text-[13px] text-[#101828] placeholder:text-[#98a2b3]"
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3.5">
          <span className="w-2 h-2 rounded-full bg-[#12b76a]" />
          <button
            type="button"
            className="relative w-8 h-8 grid place-items-center rounded-md hover:bg-[#f2f4f7] text-[#475467]"
            aria-label="Thông báo"
          >
            <Icon name="notifications" className="text-[21px]" />
            <span className="absolute -top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#f04438] text-white text-[9.5px] font-bold grid place-items-center">
              3
            </span>
          </button>
          {/* Dropdown Menu Tài Khoản Người Dùng */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1.5 -mr-1 rounded-xl hover:bg-[#f2f4f7] transition-colors text-left"
              title="Tài khoản & Thiết lập"
            >
              <div className="w-8 h-8 rounded-full bg-[#0f4c3a] text-white grid place-items-center text-[12px] font-bold shadow-xs">
                {avatarText}
              </div>
              <div className="leading-tight hidden sm:block">
                <div className="text-[12.5px] font-semibold text-gray-900 flex items-center gap-1">
                  {displayName}
                  <Icon name="expand_more" className="text-[16px] text-gray-400" />
                </div>
                <div className="text-[10.5px] text-[#98a2b3]">
                  {roleLabel}
                  {business ? ` • ${business.name}` : ""}
                </div>
              </div>
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white border border-[#eaecf0] shadow-xl p-1.5 z-50 text-[13px] animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2.5 border-b border-gray-100 mb-1">
                    <p className="font-bold text-gray-900 truncate">{displayName}</p>
                    <p className="text-[11px] text-gray-500 truncate">{profile?.user.email}</p>
                    {business && (
                      <span className="mt-1.5 inline-block text-[10px] font-bold text-[#0f4c3a] bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                        {business.name} ({business.industryType || "RETAIL"})
                      </span>
                    )}
                  </div>

                  <Link
                    to="/app"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Icon name="dashboard" className="text-[18px] text-[#0f4c3a]" />
                    <span>Không gian làm việc</span>
                  </Link>

                  <Link
                    to="/app/security"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Icon name="person" className="text-[18px] text-gray-500" />
                    <span>Thông tin cá nhân &amp; Bảo mật</span>
                  </Link>

                  <Link
                    to="/inventory"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Icon name="receipt_long" className="text-[18px] text-emerald-600" />
                    <span>Sổ phiếu kiểm kê kho A4</span>
                  </Link>

                  <div className="border-t border-gray-100 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      void handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors text-left font-semibold"
                  >
                    <Icon name="logout" className="text-[18px]" />
                    <span>Đăng xuất tài khoản</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <nav className="h-12 px-6 flex items-end gap-6 overflow-x-auto whitespace-nowrap" aria-label="Danh mục chính">
        {(mode === "purchases" || mode === "sales") && <div className="flex h-12 shrink-0 items-center gap-5"><Link className="workspace-back" to="/app/orders" aria-label="Quay lại Đơn hàng và thanh toán" title="Quay lại Đơn hàng & thanh toán"><ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" /><span>Quay lại</span></Link><span className="h-5 w-px bg-[#e4e7ec]" aria-hidden="true" /></div>}
        {(mode === "sales" ? salesTabs : mode === "inventory" ? inventoryTabs : mode === "purchases" ? purchaseTabs : tabs).map((tab) => (
          <NavLink
            key={tab.key}
            to={tab.to}
            end={tab.key === "products" || tab.key === "inventory" || tab.key === "orders" || tab.key === "sales"}
            className={({ isActive }) =>
              `h-12 inline-flex items-center border-b-2 text-[13px] transition-colors ${
                isActive || active === tab.key
                  ? "border-[#0f4c3a] text-[#0f4c3a] font-semibold"
                  : "border-transparent text-[#667085] font-medium hover:text-[#344054]"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
        {mode !== "purchases" && mode !== "sales" && (can("orders.read") || (can("inventory.read") && can("finance.read"))) && <NavLink to="/app/orders" className="h-12 inline-flex items-center text-[13px] font-medium text-[#667085] hover:text-[#0f4c3a]">Đơn hàng &amp; thanh toán</NavLink>}
      </nav>
    </header>
  );
}
