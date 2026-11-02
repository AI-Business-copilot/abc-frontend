import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { scrapApi } from "@/api/scrap";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { PermissionGate } from "@/components/common/permission-gate";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { CatalogHeader } from "@/pages/products/catalog-header";
import { OwnerReviewPanel } from "./components/owner-review-panel";
import { ScrapGallery } from "./components/scrap-gallery";
import {
  ScrapStatusBadge,
  formatDate,
  formatDateTime,
  formatMoney,
  rejectionReasonLabel,
} from "./components/scrap-ui";
import { useScrapOrder } from "./hooks/use-scrap-order";

export function ScrapDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { can, isOwner, isStaff } = usePermissions();
  const [keyword, setKeyword] = useState("");
  const { order, loading, error, refetch, refreshQuietly } = useScrapOrder(orderId);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editQty, setEditQty] = useState("");
  const [editReason, setEditReason] = useState("");
  const [saving, setSaving] = useState(false);

  const pending = order?.status === "PENDING";
  // Same rule as the server: only the staff member who created a PENDING order can change it.
  const isCreator = Boolean(order && profile && order.createdBy === profile.user.id);
  const canEdit = Boolean(pending && isStaff && isCreator && can("inventory.scrap.create"));
  const canReview = Boolean(pending && isOwner && can("inventory.scrap.approve"));

  const startEdit = () => {
    if (!order) return;
    setEditQty(String(order.scrapQty));
    setEditReason(order.scrapReason);
    setActionError(null);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!order) return;
    const qty = Number(editQty);
    if (!Number.isInteger(qty) || qty <= 0) {
      setActionError("Số lượng phải là số nguyên lớn hơn 0.");
      return;
    }
    if (!editReason.trim()) {
      setActionError("Vui lòng nhập lý do hủy hàng.");
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      await scrapApi.updateScrapOrder(order.id, { scrapQty: qty, scrapReason: editReason.trim() });
      setEditing(false);
      setMessage("Đã cập nhật phiếu hủy.");
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Không thể cập nhật phiếu hủy.");
    } finally {
      setSaving(false);
    }
  };

  const removeOrder = async () => {
    if (!order) return;
    if (!window.confirm("Xóa phiếu hủy này cùng toàn bộ ảnh? Lô hàng vẫn được giữ ở trạng thái cách ly.")) return;
    setSaving(true);
    setActionError(null);
    try {
      await scrapApi.deleteScrapOrder(order.id);
      navigate("/inventory/scrap", { replace: true });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Không thể xóa phiếu hủy.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-[#101828]">
      <CatalogHeader active="products" mode="inventory" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1180px] space-y-5 px-5 py-5">
        <PermissionGate permission="inventory.lot.read">
          <Link className="text-sm font-semibold text-violet-700 hover:underline" to="/inventory/scrap">
            ← Danh sách phiếu hủy
          </Link>

          {loading && !order ? (
            <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-violet-600" /></div>
          ) : error || !order ? (
            <Alert variant="destructive">{error || "Không tìm thấy phiếu hủy."}</Alert>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="font-mono text-3xl font-bold text-slate-900">{order.scrapCode}</h1>
                  <p className="mt-1 text-slate-600">
                    Tạo bởi {order.createdByUser?.fullName ?? "—"} · {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <ScrapStatusBadge status={order.status} />
              </div>

              {message && <Alert variant="success">{message}</Alert>}
              {actionError && <Alert variant="destructive">{actionError}</Alert>}

              {order.status === "COMPLETED" && (
                <Alert variant="success">
                  Đã duyệt bởi {order.approvedByUser?.fullName ?? "—"} lúc {formatDateTime(order.approvedAt)}.
                  Tổn thất ghi nhận: {formatMoney(order.totalLossValue)}.
                </Alert>
              )}
              {order.status === "REJECTED" && (
                <Alert variant="destructive">
                  Bị từ chối bởi {order.rejectedByUser?.fullName ?? "—"} lúc {formatDateTime(order.rejectedAt)}.
                  Lý do: {order.rejectionReasonCode ? rejectionReasonLabel[order.rejectionReasonCode] : "—"}
                  {order.rejectionNote ? ` — ${order.rejectionNote}` : ""}
                </Alert>
              )}

              <Card>
                <CardHeader><CardTitle>Thông tin phiếu</CardTitle></CardHeader>
                <CardContent>
                  {editing ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="edit-qty">Số lượng hủy</label>
                        <Input id="edit-qty" min={1} onChange={(e) => setEditQty(e.target.value)} type="number" value={editQty} />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="edit-reason">Lý do hủy</label>
                        <Input id="edit-reason" maxLength={255} onChange={(e) => setEditReason(e.target.value)} value={editReason} />
                      </div>
                      <div className="flex gap-2 sm:col-span-2">
                        <Button disabled={saving} onClick={() => void saveEdit()} type="button">
                          {saving && <Spinner className="h-4 w-4" />}Lưu
                        </Button>
                        <Button disabled={saving} onClick={() => setEditing(false)} type="button" variant="outline">Hủy</Button>
                      </div>
                    </div>
                  ) : (
                    <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                      {[
                        ["Sản phẩm", `${order.variant.template.name} (${order.variant.sku})`],
                        ["Số lô", order.lot?.lotNumber ?? "—"],
                        ["Hạn sử dụng", formatDate(order.lot?.expirationDate)],
                        ["Số lượng hủy", String(order.scrapQty)],
                        ["Nguồn tồn kho", order.scrapSource === "DAMAGED_STOCK" ? "Hàng hư hỏng" : "Hàng có thể bán"],
                        ["Giá vốn / sản phẩm", formatMoney(order.unitCost)],
                        ["Lý do hủy", order.scrapReason],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-slate-500">{label}</dt>
                          <dd className="font-semibold text-slate-900">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {canEdit && !editing && (
                    <div className="mt-4 flex gap-2">
                      <Button onClick={startEdit} size="sm" variant="outline">Sửa phiếu</Button>
                      <Button disabled={saving} onClick={() => void removeOrder()} size="sm" variant="destructive">Xóa phiếu</Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Ảnh bằng chứng ({order.images.length})</CardTitle></CardHeader>
                <CardContent>
                  <ScrapGallery
                    images={order.images}
                    onImageError={() => void refreshQuietly()}
                  />
                </CardContent>
              </Card>

              {canReview && (
                <OwnerReviewPanel
                  onFinished={(text) => {
                    setMessage(text);
                    void refetch();
                  }}
                  onReload={refreshQuietly}
                  order={order}
                />
              )}
            </>
          )}
        </PermissionGate>
      </main>
    </div>
  );
}
