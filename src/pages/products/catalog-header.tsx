import { Link, NavLink } from "react-router-dom";

import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { Icon } from "@/pages/products/ui-icon";

type CatalogHeaderProps = {
  active: "products" | "categories" | "attributes";
  keyword: string;
  onKeywordChange: (value: string) => void;
  mode?: "catalog" | "inventory";
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

export function CatalogHeader({ active, keyword, onKeywordChange, mode = "catalog" }: CatalogHeaderProps) {
  const { profile } = useAuth();
  const { isOwner, isStaff } = usePermissions();

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
    <header className="sticky top-0 z-40 bg-white border-b border-[#eaecf0]">
      <div className="h-16 pl-6 pr-5 flex items-center gap-6">
        <Link className="flex items-center gap-2.5 shrink-0" to="/products">
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
            <div className="text-[10.5px] font-medium text-[#98a2b3] mt-0.5">ERP Tồn Kho &amp; Mã Hàng</div>
          </div>
        </Link>

        <div className="flex-1 max-w-[720px]">
          <div className="h-10 rounded-lg bg-[#f2f4f7] flex items-center gap-2 px-3.5 text-[#667085] focus-within:ring-2 focus-within:ring-[#c7cbff]">
            <Icon name="search" className="text-[19px]" />
            <input
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="Tra cứu nhanh SKU, mã vạch, tên hàng hóa, danh mục..."
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

      <nav className="h-12 px-6 flex items-end gap-6" aria-label="Danh mục chính">
        {(mode === "inventory" ? inventoryTabs : tabs).map((tab) => (
          <NavLink
            key={tab.key}
            to={tab.to}
            end={tab.key === "products" || tab.key === "inventory"}
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
      </nav>
    </header>
  );
}
