import { ArrowRight, Boxes, LockKeyhole, Warehouse } from "lucide-react";
import { Link } from "react-router-dom";

import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";

export function OperationsPage() {
  const { profile } = useAuth();
  const { can } = usePermissions();
  const canReadProducts = can("products.read");

  return (
    <AppLayout>
      <div className="dashboard-breadcrumb">
        <span>Không gian làm việc</span>
        <span>/</span>
        <span>Vận hành</span>
        <span>/</span>
        <strong>Sản phẩm &amp; tồn kho</strong>
      </div>

      <section className="dashboard-welcome">
        <div>
          <span className="eyebrow">VẬN HÀNH CỬA HÀNG</span>
          <h1>Quản lý hàng hóa</h1>
          <p>
            {profile?.business
              ? `Chọn nhóm chức năng để làm việc với dữ liệu của ${profile.business.name}.`
              : "Chọn nhóm chức năng để làm việc với dữ liệu cửa hàng."}
          </p>
        </div>
      </section>

      <div className="ops-grid">
        {canReadProducts ? (
          <Link className="ops-tile" to="/products">
            <span className="ops-tile-icon violet"><Boxes size={22} /></span>
            <span className="ops-tile-body">
              <strong>Sản phẩm</strong>
              <small>Danh mục, biến thể, SKU, giá vốn và giá bán.</small>
            </span>
            <span className="ops-tile-arrow"><ArrowRight size={17} /></span>
          </Link>
        ) : (
          <span className="ops-tile disabled" title="Bạn không có quyền xem sản phẩm">
            <span className="ops-tile-icon slate"><LockKeyhole size={22} /></span>
            <span className="ops-tile-body">
              <strong>Sản phẩm</strong>
              <small>Bạn không có quyền xem sản phẩm của cửa hàng.</small>
            </span>
          </span>
        )}

        <Link className="ops-tile" to="/inventory">
          <span className="ops-tile-icon slate"><Warehouse size={22} /></span>
          <span className="ops-tile-body">
            <strong>Tồn kho</strong>
            <small>Nhập hàng, kiểm kê và điều chỉnh tồn kho.</small>
          </span>
          <span className="ops-tile-arrow"><ArrowRight size={17} /></span>
        </Link>
      </div>
    </AppLayout>
  );
}
