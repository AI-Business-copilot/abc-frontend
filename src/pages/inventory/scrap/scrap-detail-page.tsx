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
import { DisposalDossierPreviewModal } from "./components/dossier-preview-modal";
import { OwnerReviewPanel } from "./components/owner-review-panel";
import { ScrapGallery } from "./components/scrap-gallery";
import {
  ScrapStatusBadge,
  formatDate,
  formatDateTime,
  formatMoney,
  rejectionReasonLabel,
} from "./components/scrap-ui";
import {
  SCRAP_CAUSE_CODES,
  disposalMethodLabel,
  scrapCauseCodeLabel,
  type ScrapCauseCode,
} from "@/types/scrap";
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
  const [editCauseCode, setEditCauseCode] = useState<ScrapCauseCode | "">("");
  const [saving, setSaving] = useState(false);
  const [showDossier, setShowDossier] = useState(false);

  const pending = order?.status === "PENDING";
  // Same rule as the server: only the staff member who created a PENDING order can change it.
  const isCreator = Boolean(order && profile && order.createdBy === profile.user.id);
  const canEdit = Boolean(pending && isStaff && isCreator && can("inventory.scrap.create"));
  const canReview = Boolean(pending && isOwner && can("inventory.scrap.approve"));

  const startEdit = () => {
    if (!order) return;
    setEditQty(String(order.scrapQty));
    setEditCauseCode(order.causeCode ?? "");
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
    if (!editCauseCode) {
      setActionError("Vui lòng chọn nguyên nhân hủy hàng.");
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      await scrapApi.updateScrapOrder(order.id, { scrapQty: qty, causeCode: editCauseCode });
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
      <CatalogHeader active="scrap" mode="inventory" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1180px] space-y-5 px-5 py-5">
        <PermissionGate permission="inventory.lot.read">
          <Link className="text-sm font-semibold text-[#0f4c3a] hover:underline" to="/inventory/scrap">
            ← Danh sách phiếu hủy
          </Link>

          {loading && !order ? (
            <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-[#0f4c3a]" /></div>
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
                <div className="flex items-center gap-3">
                  {/* The dossier can only be written for an approved order. */}
                  {order.status === "COMPLETED" && (
                    <Button onClick={() => setShowDossier(true)} size="sm" variant="outline">
                      Xem & tải hồ sơ tiêu hủy
                    </Button>
                  )}
                  <ScrapStatusBadge status={order.status} />
                </div>
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
              {order.status === "CANCELLED" && (
                <Alert>
                  Đã hủy bởi {order.cancelledByUser?.fullName ?? "—"} lúc {formatDateTime(order.cancelledAt)}.
                  Tồn kho không thay đổi và {order.lotItemId ? "lô hàng" : "sản phẩm"} vẫn đang được cách ly.
                  {order.cancelledNote ? ` — ${order.cancelledNote}` : ""}
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
                        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="edit-cause">Nguyên nhân hủy hàng</label>
                        <select
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#0f4c3a] focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={saving}
                          id="edit-cause"
                          onChange={(e) => setEditCauseCode(e.target.value as ScrapCauseCode | "")}
                          value={editCauseCode}
                        >
                          <option value="">— Chọn nguyên nhân —</option>
                          {SCRAP_CAUSE_CODES.map((code) => (
                            <option key={code} value={code}>{scrapCauseCodeLabel[code]}</option>
                          ))}
                        </select>
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
                        // A product with no lot has no lot number and no expiry: the order was taken
                        // from the quantity that was quarantined on the variant itself.
                        ...(order.lotItemId
                          ? [
                            ["Số lô", order.lotItem?.lot.lotNumber ?? "—"],
                            ...(order.business?.industryType === "COSMETICS"
                              ? [["Hạn sử dụng", formatDate(order.lotItem?.expirationDate)]]
                              : []),
                          ]
                          : [["Cách ly", "Sản phẩm không có lô — hủy từ số lượng đã cách ly"]]),
                        ["Số lượng hủy", String(order.scrapQty)],

                        ["Giá vốn / sản phẩm", formatMoney(order.unitCost)],
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
                <CardHeader><CardTitle>Hồ sơ tiêu hủy</CardTitle></CardHeader>
                <CardContent>
                  <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                    {[
                      ["Nguyên nhân", order.causeCode ? scrapCauseCodeLabel[order.causeCode] : "Chưa ghi nhận"],
                      [
                        "Phương thức tiêu hủy",
                        order.disposalMethod ? disposalMethodLabel[order.disposalMethod] : "Chưa ghi nhận",
                      ],
                      ["Địa điểm tiêu hủy", order.disposalLocation ?? "Chưa ghi nhận"],
                      // The council is written when the Owner approves the order.
                      ["Thành viên hội đồng", order.witnessNames ?? "Chưa ghi nhận"],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-slate-500">{label}</dt>
                        <dd className="font-semibold text-slate-900">{value}</dd>
                      </div>
                    ))}
                  </dl>
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

              {showDossier && (
                <DisposalDossierPreviewModal onClose={() => setShowDossier(false)} orderId={order.id} />
              )}
            </>
          )}
        </PermissionGate>
      </main>
    </div>
  );
}
