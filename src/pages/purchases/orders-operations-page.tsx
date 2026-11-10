import { ArrowRight, LockKeyhole, RotateCcw, ShoppingCart, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";

export function OrdersOperationsPage() {
  const { profile } = useAuth();
  const { can } = usePermissions();
  const canReadPurchases = can("inventory.read") && can("finance.read");
  return (
    <AppLayout>
      <div className="dashboard-breadcrumb">
        <span>Không gian làm việc</span>
        <span>/</span>
        <span>Vận hành</span>
        <span>/</span>
        <strong>Đơn hàng &amp; thanh toán</strong>
      </div>
      <section className="dashboard-welcome">
        <div>
          <span className="eyebrow">VẬN HÀNH CỬA HÀNG</span>
          <h1>Đơn hàng &amp; thanh toán</h1>
          <p>
            Chọn nghiệp vụ mua hàng, bán lẻ hoặc đổi trả hàng
            {profile?.business ? ` tại ${profile.business.name}` : " của cửa hàng"}.
          </p>
        </div>
      </section>
      <div className="ops-grid">
        {canReadPurchases ? (
          <Link className="ops-tile" to="/purchases">
            <span className="ops-tile-icon violet">
              <ShoppingCart size={22} />
            </span>
            <span className="ops-tile-body">
              <strong>Mua hàng &amp; thanh toán NCC</strong>
              <small>Đặt mua, nhận hàng vào kho, thanh toán và công nợ nhà cung cấp.</small>
            </span>
            <span className="ops-tile-arrow">
              <ArrowRight size={17} />
            </span>
          </Link>
        ) : (
          <span className="ops-tile disabled">
            <span className="ops-tile-icon slate">
              <LockKeyhole size={22} />
            </span>
            <span className="ops-tile-body">
              <strong>Mua hàng &amp; thanh toán NCC</strong>
              <small>Bạn cần quyền xem tồn kho và tài chính để sử dụng mua hàng.</small>
            </span>
          </span>
        )}

        {can("orders.read") ? (
          <Link className="ops-tile" to={can("orders.create") ? "/sales/new" : "/sales"}>
            <span className="ops-tile-icon violet">
              <Store size={22} />
            </span>
            <span className="ops-tile-body">
              <strong>Bán lẻ &amp; thanh toán</strong>
              <small>Bán hàng tại quầy, quản lý đơn bán và thanh toán khách hàng.</small>
            </span>
            <span className="ops-tile-arrow">
              <ArrowRight size={17} />
            </span>
          </Link>
        ) : (
          <span className="ops-tile disabled">
            <span className="ops-tile-icon slate">
              <LockKeyhole size={22} />
            </span>
            <span className="ops-tile-body">
              <strong>Bán lẻ &amp; thanh toán</strong>
              <small>Bạn cần quyền xem đơn bán để sử dụng chức năng này.</small>
            </span>
          </span>
        )}

        <Link className="ops-tile" to="/returns">
          <span className="ops-tile-icon violet">
            <RotateCcw size={22} />
          </span>
          <span className="ops-tile-body">
            <strong>Đổi &amp; Trả hàng (F05 &amp; F06)</strong>
            <small>Khách trả &amp; đổi hàng tại quầy, xuất trả hàng lỗi/hỏng cho Nhà cung cấp.</small>
          </span>
          <span className="ops-tile-arrow">
            <ArrowRight size={17} />
          </span>
        </Link>
      </div>
    </AppLayout>
  );
}
