import { Link, NavLink } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { Icon } from "@/pages/products/ui-icon";

type CatalogHeaderProps = {
  active: "products" | "categories" | "attributes" | "orders" | "receipts" | "suppliers" | "sales" | "pos" | "customers";
  keyword: string;
  onKeywordChange: (value: string) => void;
  mode?: "catalog" | "inventory" | "purchases" | "sales";
  onSearch?: () => void;
};

const tabs = [
  { key: "products", label: "Sản phẩm", to: "/products" },
  { key: "categories", label: "Danh mục", to: "/products/categories" },
  { key: "attributes", label: "Thuộc tính", to: "/products/attributes" },
] as const;
const inventoryTabs = [
  { key: "inventory", label: "Nhập kho ban đầu", to: "/inventory" },
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
  const { profile } = useAuth();
  const { isOwner, isStaff, can } = usePermissions();

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

  return (
    <header className={`sticky top-0 z-40 bg-white border-b border-[#eaecf0]${mode === "purchases" || mode === "sales" ? " order-workspace-header" : ""}`}>
      <div className="h-16 pl-6 pr-5 flex items-center gap-6">
        <Link className="flex items-center gap-2.5 shrink-0" to={(mode === "purchases" || mode === "sales") ? "/app/orders" : "/products"}>
          <div className="w-9 h-9 rounded-lg bg-[#4f46e5] grid place-items-center text-white shadow-[0_4px_10px_rgba(79,70,229,0.35)]">
            <Icon name="auto_awesome" className="text-[19px]" />
          </div>
          <div className="leading-tight">
            <div className="flex items-baseline gap-2">
              <span className="text-[16px] font-extrabold tracking-tight">ABC Retail</span>
              <span className="text-[9px] font-bold tracking-[0.14em] text-[#4f46e5] bg-[#eef0ff] px-1.5 py-0.5 rounded">
                COPILOT
              </span>
            </div>
            <div className="text-[10.5px] font-medium text-[#98a2b3] mt-0.5">{(mode === "purchases" || mode === "sales") ? "ERP Đơn Hàng & Thanh Toán" : "ERP Tồn Kho & Mã Hàng"}</div>
          </div>
        </Link>

        <div className="flex-1 max-w-[720px]">
          <div className="h-10 rounded-lg bg-[#f2f4f7] flex items-center gap-2 px-3.5 text-[#667085] focus-within:ring-2 focus-within:ring-[#c7cbff]">
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#4f46e5] text-white grid place-items-center text-[12px] font-bold">
              {avatarText}
            </div>
            <div className="leading-tight">
              <div className="text-[12.5px] font-semibold">{displayName}</div>
              <div className="text-[10.5px] text-[#98a2b3]">
                {roleLabel}
                {business ? ` • ${business.name}` : ""}
              </div>
            </div>
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
                  ? "border-[#4f46e5] text-[#4f46e5] font-semibold"
                  : "border-transparent text-[#667085] font-medium hover:text-[#344054]"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
        {mode !== "purchases" && mode !== "sales" && (can("orders.read") || (can("inventory.read") && can("finance.read"))) && <NavLink to="/app/orders" className="h-12 inline-flex items-center text-[13px] font-medium text-[#667085] hover:text-[#4f46e5]">Đơn hàng &amp; thanh toán</NavLink>}
      </nav>
    </header>
  );
}
