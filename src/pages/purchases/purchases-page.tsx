import { useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { CatalogHeader } from "@/pages/products/catalog-header";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/hooks/use-auth";
import { OrderList, OrderEditor, OrderDetail } from "./orders";
import { ReceiptList, ReceiptView } from "./receipts";
import { Suppliers } from "./suppliers";
import "./purchases.css";

export function PurchasesPage() {
  const { can } = usePermissions();
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const active = location.pathname.startsWith("/purchases/receipts") ? "receipts" : location.pathname.startsWith("/purchases/suppliers") ? "suppliers" : "orders";
  const allowed = can("inventory.read") && can("finance.read");
  const search = () => {
    const target = active === "orders" ? "/purchases" : `/purchases/${active}`;
    navigate(`${target}${keyword.trim() ? `?${new URLSearchParams({ search: keyword.trim() })}` : ""}`);
  };

  return (
    <div className="purchase-workspace" key={profile?.business?.id}>
      <CatalogHeader active={active} mode="purchases" keyword={keyword} onKeywordChange={setKeyword} onSearch={search} />
      <main className="purchases">
        <div className="purchase-breadcrumb"><Link to="/app/orders">Đơn hàng &amp; thanh toán</Link><span>›</span><strong>Mua hàng NCC</strong></div>
        {!allowed ? <div className="purchase-error" role="alert">Bạn cần quyền xem tồn kho và xem tài chính để sử dụng luồng mua hàng.</div> : (
          <Routes key={`${profile?.business?.id}:${location.search}`}>
            <Route index element={<OrderList />} />
            <Route path="new" element={<OrderList initialCreate />} />
            <Route path=":id/edit" element={<OrderEditor />} />
            <Route path=":id" element={<OrderDetail />} />
            <Route path="receipts" element={<ReceiptList />} />
            <Route path="receipts/:id" element={<ReceiptView />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="*" element={<p>Không tìm thấy trang mua hàng. <Link to="/purchases">Về danh sách đơn đặt mua</Link></p>} />
          </Routes>
        )}
      </main>
    </div>
  );
}
