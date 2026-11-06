import { useState } from "react";
import { Link } from "react-router-dom";
import { RotateCcw, Trash2, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  returnsApi,
  type LookupOrderResult,
} from "@/api/returns";
import { salesApi, type SaleVariant } from "@/api/sales";
import {
  money,
  date,
  useLoad,
  useAction,
  ErrorBox,
  Empty,
  Pager,
} from "@/pages/purchases/shared";
import "./returns.css";
import "@/pages/purchases/purchases.css";

export function ReturnsPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"f05" | "f06" | "history">("f05");
  const isOwner = profile?.business?.role === "OWNER";
  const isStaff = profile?.business?.role === "STAFF";

  return (
    <div className="purchase-workspace">
      <header className="catalog-header">
        <div className="catalog-title">
          <RotateCcw size={22} className="text-indigo-600" />
          <h1>Đổi trả hàng (F05 &amp; F06)</h1>
        </div>
      </header>

      <main className="purchases returns-container">
        <div className="purchase-breadcrumb">
          <Link to="/app/orders">Đơn hàng &amp; thanh toán</Link>
          <span>›</span>
          <strong>Đổi trả hàng</strong>
        </div>

        <div className="returns-tabs">
          <button
            type="button"
            className={`returns-tab-btn ${activeTab === "f05" ? "active" : ""}`}
            onClick={() => setActiveTab("f05")}
          >
            Khách trả &amp; Đổi hàng tại quầy (F05)
          </button>
          <button
            type="button"
            className={`returns-tab-btn ${activeTab === "f06" ? "active" : ""}`}
            onClick={() => setActiveTab("f06")}
          >
            Trả hàng Nhà cung cấp (F06)
          </button>
          <button
            type="button"
            className={`returns-tab-btn ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            Lịch sử phiếu trả
          </button>
        </div>

        {activeTab === "f05" && <CustomerReturnsTab isStaff={isStaff} />}
        {activeTab === "f06" && <VendorReturnsTab isOwner={isOwner} />}
        {activeTab === "history" && <ReturnsHistoryTab isStaff={isStaff} />}
      </main>
    </div>
  );
}

// ==========================================
// TAB 1: KHÁCH TRẢ & ĐỔI HÀNG TẠI QUẦY (F05)
// ==========================================
function CustomerReturnsTab({ isStaff: _isStaff }: { isStaff: boolean }) {
  const [searchOrderCode, setSearchOrderCode] = useState("");
  const [lookupData, setLookupData] = useState<LookupOrderResult | null>(null);
  const [returnItems, setReturnItems] = useState<
    Array<{
      orderItemId: string;
      variantId: string;
      lotId: string | null;
      name: string;
      sku: string;
      maxQty: number;
      returnQty: number;
      unitPrice: number;
      itemCondition: "RESTOCKABLE" | "DAMAGED_QUARANTINE";
      returnReason: string;
    }>
  >([]);

  // Exchange Items
  const [isExchange, setIsExchange] = useState(false);
  const [exchangeSearch, setExchangeSearch] = useState("");
  const [exchangeItems, setExchangeItems] = useState<
    Array<{
      variant: SaleVariant;
      quantity: number;
    }>
  >([]);

  const [refundMethod, setRefundMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH");
  const [successMsg, setSuccessMsg] = useState("");

  const shiftResult = useLoad(returnsApi.shift, []);
  const lookupAction = useAction();
  const submitAction = useAction();

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchOrderCode.trim()) return;
    setSuccessMsg("");
    await lookupAction.run(async () => {
      const res = await returnsApi.lookupOrder(searchOrderCode.trim());
      setLookupData(res);
      // Pre-select items with returnableQty > 0
      const initial = res.items
        .filter((i) => i.returnableQty > 0)
        .map((i) => ({
          orderItemId: i.id,
          variantId: i.variantId,
          lotId: i.lotId,
          name: i.variant.name,
          sku: i.variant.sku,
          maxQty: i.returnableQty,
          returnQty: 0,
          unitPrice: i.unitPrice,
          itemCondition: "RESTOCKABLE" as const,
          returnReason: "Khách đổi trả tại quầy",
        }));
      setReturnItems(initial);
    });
  };

  // Calculations
  const totalRefund = returnItems.reduce(
    (sum, item) => sum + item.returnQty * item.unitPrice,
    0,
  );

  const totalExchange = exchangeItems.reduce(
    (sum, item) => sum + item.quantity * Number(item.variant.basePrice),
    0,
  );

  const delta = totalExchange - totalRefund;

  const handleSubmit = async () => {
    const activeReturnLines = returnItems.filter((i) => i.returnQty > 0);
    if (activeReturnLines.length === 0) {
      submitAction.setError("Vui lòng chọn ít nhất một sản phẩm và nhập số lượng trả hợp lệ.");
      return;
    }

    if (refundMethod === "CASH" && !shiftResult.data && (totalRefund > 0 || delta < 0)) {
      submitAction.setError("Chưa có ca bán hàng nào đang mở. Hoàn tiền mặt yêu cầu ca bán mở.");
      return;
    }

    await submitAction.run(async () => {
      const body: Parameters<typeof returnsApi.createCustomerReturn>[0] = {
        orderCode: lookupData?.order.orderCode,
        originalOrderId: lookupData?.order.id,
        refundMethod: isExchange && delta >= 0 ? "EXCHANGE_OFFSET" : refundMethod,
        items: activeReturnLines.map((i) => ({
          orderItemId: i.orderItemId,
          variantId: i.variantId,
          lotId: i.lotId,
          returnQty: i.returnQty,
          refundUnitPrice: i.unitPrice,
          itemCondition: i.itemCondition,
          returnReason: i.returnReason,
        })),
        ...(isExchange && exchangeItems.length > 0
          ? {
              exchangeItems: exchangeItems.map((e) => ({
                variantId: e.variant.id,
                quantity: e.quantity,
              })),
            }
          : {}),
      };

      const result = await returnsApi.createCustomerReturn(body);
      setSuccessMsg(
        `Tạo phiếu trả thành công! Mã phiếu: ${result.returnCode}${
          result.exchangeOrder ? ` (Kèm đơn đổi mới: ${result.exchangeOrder.orderCode})` : ""
        }`,
      );
      setLookupData(null);
      setReturnItems([]);
      setExchangeItems([]);
      setIsExchange(false);
      setSearchOrderCode("");
    });
  };

  return (
    <div className="returns-grid">
      <div className="returns-left">
        <div className="returns-panel">
          <div className="returns-panel-header">
            <h3>Tra cứu hóa đơn gốc</h3>
            {shiftResult.data ? (
              <span className="condition-tag restock">
                ● Ca thu ngân: {shiftResult.data.status} ({date(shiftResult.data.openedAt)})
              </span>
            ) : (
              <span className="condition-tag damaged">
                ⚠ Chưa mở ca thu ngân
              </span>
            )}
          </div>

          <form className="returns-search-bar" onSubmit={handleLookup}>
            <input
              type="text"
              placeholder="Nhập mã hóa đơn gốc (ví dụ: ORD-...) hoặc SĐT khách..."
              value={searchOrderCode}
              onChange={(e) => setSearchOrderCode(e.target.value)}
            />
            <button
              type="submit"
              className="purchase-primary"
              disabled={lookupAction.busy || !searchOrderCode.trim()}
            >
              {lookupAction.busy ? "Đang tìm..." : "Tìm kiếm"}
            </button>
          </form>

          <ErrorBox error={lookupAction.error} />

          {lookupData && (
            <>
              <div className="returns-order-meta">
                <div>
                  <strong>Mã đơn bán:</strong>
                  <span>{lookupData.order.orderCode}</span>
                </div>
                <div>
                  <strong>Khách hàng:</strong>
                  <span>{lookupData.order.customer?.name || "Khách vãng lai"}</span>
                </div>
                <div>
                  <strong>Ngày mua:</strong>
                  <span>{date(lookupData.order.createdAt)}</span>
                </div>
                <div>
                  <strong>Tổng thanh toán:</strong>
                  <span>{money(lookupData.order.totalNetAmount)}</span>
                </div>
              </div>

              <h4>Danh sách mặt hàng có thể trả</h4>
              <table className="returns-table">
                <thead>
                  <tr>
                    <th>Sản phẩm / Lô</th>
                    <th>Đã mua</th>
                    <th>Đã trả</th>
                    <th>Còn được trả</th>
                    <th>Đơn giá hoàn</th>
                    <th>SL trả</th>
                    <th>Tình trạng</th>
                  </tr>
                </thead>
                <tbody>
                  {returnItems.map((item, index) => (
                    <tr key={item.orderItemId}>
                      <td>
                        <strong>{item.name}</strong>
                        <br />
                        <small>{item.sku}{item.lotId ? " (Có Lô)" : ""}</small>
                      </td>
                      <td>{lookupData.items.find((i) => i.id === item.orderItemId)?.quantity}</td>
                      <td>{lookupData.items.find((i) => i.id === item.orderItemId)?.previouslyReturnedQty}</td>
                      <td>
                        <strong>{item.maxQty}</strong>
                      </td>
                      <td>{money(item.unitPrice)}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max={item.maxQty}
                          value={item.returnQty || ""}
                          placeholder="0"
                          style={{ width: "70px", padding: "4px 8px" }}
                          onChange={(e) => {
                            const val = Math.min(item.maxQty, Math.max(0, Number(e.target.value) || 0));
                            const next = [...returnItems];
                            next[index].returnQty = val;
                            setReturnItems(next);
                          }}
                        />
                      </td>
                      <td>
                        <select
                          value={item.itemCondition}
                          onChange={(e) => {
                            const next = [...returnItems];
                            next[index].itemCondition = e.target.value as any;
                            setReturnItems(next);
                          }}
                        >
                          <option value="RESTOCKABLE">Nhập lại kệ bán</option>
                          <option value="DAMAGED_QUARANTINE">Cách ly hàng hỏng/lỗi</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: "16px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isExchange}
                    onChange={(e) => setIsExchange(e.target.checked)}
                  />
                  <span>Đổi hàng ngay tại quầy (Exchange)</span>
                </label>
              </div>

              {isExchange && (
                <div className="exchange-box">
                  <h4>Chọn sản phẩm đổi mới</h4>
                  <div className="returns-search-bar">
                    <input
                      type="text"
                      placeholder="Tìm SKU hoặc tên sản phẩm mới để đổi..."
                      value={exchangeSearch}
                      onChange={(e) => setExchangeSearch(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!exchangeSearch.trim()) return;
                        const res = await salesApi.variants(exchangeSearch.trim());
                        if (res.items.length > 0) {
                          const first = res.items[0];
                          if (!exchangeItems.some((e) => e.variant.id === first.id)) {
                            setExchangeItems([...exchangeItems, { variant: first, quantity: 1 }]);
                          }
                          setExchangeSearch("");
                        }
                      }}
                    >
                      + Thêm sản phẩm
                    </button>
                  </div>

                  {exchangeItems.length > 0 && (
                    <table className="returns-table">
                      <thead>
                        <tr>
                          <th>Sản phẩm mới</th>
                          <th>Tồn kho</th>
                          <th>Đơn giá</th>
                          <th>Số lượng đổi</th>
                          <th>Xóa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exchangeItems.map((item, idx) => (
                          <tr key={item.variant.id}>
                            <td>
                              <strong>{item.variant.productName}</strong>
                              <br />
                              <small>{item.variant.sku}</small>
                            </td>
                            <td>{item.variant.onHand}</td>
                            <td>{money(item.variant.basePrice)}</td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                style={{ width: "60px", padding: "4px" }}
                                onChange={(e) => {
                                  const val = Math.max(1, Number(e.target.value) || 1);
                                  const next = [...exchangeItems];
                                  next[idx].quantity = val;
                                  setExchangeItems(next);
                                }}
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => setExchangeItems(exchangeItems.filter((_, i) => i !== idx))}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="returns-right">
        <div className="returns-panel">
          <div className="returns-panel-header">
            <h3>Tổng kết đổi trả</h3>
          </div>

          <div className="returns-kpi-grid">
            <div className="returns-kpi-card refund">
              <span>Tiền hoàn hàng trả</span>
              <strong>{money(totalRefund)}</strong>
            </div>

            {isExchange && (
              <div className="returns-kpi-card exchange">
                <span>Tiền hàng đổi mới</span>
                <strong>{money(totalExchange)}</strong>
              </div>
            )}
          </div>

          {isExchange && (
            <div
              className={`returns-kpi-card ${
                delta > 0 ? "delta-positive" : delta < 0 ? "delta-negative" : "delta-zero"
              }`}
              style={{ marginBottom: "16px" }}
            >
              <span>Chênh lệch thanh toán</span>
              <strong>
                {delta > 0
                  ? `Khách trả thêm: +${money(delta)}`
                  : delta < 0
                    ? `Hoàn lại khách: ${money(Math.abs(delta))}`
                    : "Đổi ngang: 0 đ"}
              </strong>
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", fontSize: "13px" }}>
              Hình thức hoàn tiền / thanh toán
            </label>
            <select
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value as any)}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d0d5dd" }}
            >
              <option value="CASH">Tiền mặt (CASH)</option>
              <option value="BANK_TRANSFER">Chuyển khoản (BANK_TRANSFER)</option>
            </select>
          </div>

          <ErrorBox error={submitAction.error} />
          {successMsg && (
            <div style={{ background: "#ecfdf3", color: "#027a48", padding: "12px", borderRadius: "6px", marginBottom: "16px" }}>
              {successMsg}
            </div>
          )}

          <button
            type="button"
            className="purchase-primary"
            style={{ width: "100%", padding: "12px", fontSize: "15px" }}
            disabled={submitAction.busy || !lookupData}
            onClick={handleSubmit}
          >
            {submitAction.busy ? "Đang xử lý..." : "Xác nhận Đổi / Trả hàng"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// TAB 2: TRẢ HÀNG NHÀ CUNG CẤP (F06)
// ==========================================
function VendorReturnsTab({ isOwner }: { isOwner: boolean }) {
  const suppliersResult = useLoad(returnsApi.getSuppliers, []);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [receiptCode, setReceiptCode] = useState("");
  const [searchVariant, setSearchVariant] = useState("");
  const [items, setItems] = useState<
    Array<{
      variant: SaleVariant;
      returnQty: number;
      returnUnitPrice: number;
      source: "SELLABLE" | "DAMAGED_STOCK";
    }>
  >([]);

  const [successMsg, setSuccessMsg] = useState("");
  const submitAction = useAction();

  const selectedSupplier = suppliersResult.data?.find((s) => s.id === selectedSupplierId);

  const totalReturnValue = items.reduce(
    (sum, i) => sum + i.returnQty * i.returnUnitPrice,
    0,
  );

  const handleAddVariant = async () => {
    if (!searchVariant.trim()) return;
    const res = await salesApi.variants(searchVariant.trim());
    if (res.items.length > 0) {
      const v = res.items[0];
      if (!items.some((i) => i.variant.id === v.id)) {
        setItems([
          ...items,
          {
            variant: v,
            returnQty: 1,
            returnUnitPrice: Number(v.basePrice) * 0.7,
            source: "SELLABLE",
          },
        ]);
      }
      setSearchVariant("");
    }
  };

  const handleSubmit = async () => {
    if (!selectedSupplierId) {
      submitAction.setError("Vui lòng chọn nhà cung cấp.");
      return;
    }
    if (items.length === 0 || items.some((i) => i.returnQty <= 0)) {
      submitAction.setError("Vui lòng thêm sản phẩm và nhập số lượng trả lớn hơn 0.");
      return;
    }

    await submitAction.run(async () => {
      const res = await returnsApi.createVendorReturn({
        supplierId: selectedSupplierId,
        items: items.map((i) => ({
          variantId: i.variant.id,
          returnQty: i.returnQty,
          returnUnitPrice: i.returnUnitPrice,
          source: i.source,
        })),
      });

      setSuccessMsg(`Xuất trả NCC thành công! Mã phiếu: ${res.returnCode}`);
      setItems([]);
      setSelectedSupplierId("");
      setReceiptCode("");
    });
  };

  return (
    <div className="returns-grid">
      <div className="returns-left">
        <div className="returns-panel">
          <div className="returns-panel-header">
            <h3>Phiếu xuất trả hàng Nhà cung cấp</h3>
            {!isOwner && (
              <span className="condition-tag damaged">
                <Lock size={12} style={{ display: "inline", marginRight: "4px" }} />
                Chỉ Chủ cửa hàng (OWNER) có quyền
              </span>
            )}
          </div>

          {!isOwner && (
            <div style={{ background: "#fef3f2", color: "#b42318", padding: "12px", borderRadius: "6px", marginBottom: "16px" }}>
              Tài khoản hiện tại là Nhân viên (STAFF). Bạn không có quyền thực hiện xuất trả hàng cho Nhà cung cấp.
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", fontSize: "13px" }}>
                Nhà cung cấp (*)
              </label>
              <select
                disabled={!isOwner}
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d0d5dd" }}
              >
                <option value="">-- Chọn Nhà cung cấp --</option>
                {suppliersResult.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", fontSize: "13px" }}>
                Mã phiếu nhập gốc (Tùy chọn)
              </label>
              <input
                type="text"
                disabled={!isOwner}
                placeholder="Nhập mã phiếu nhập (REC-...)"
                value={receiptCode}
                onChange={(e) => setReceiptCode(e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d0d5dd" }}
              />
            </div>
          </div>

          {selectedSupplier && (
            <div className="returns-order-meta">
              <div>
                <strong>Điện thoại:</strong>
                <span>{selectedSupplier.phone}</span>
              </div>
              <div>
                <strong>Người liên hệ:</strong>
                <span>{selectedSupplier.contactPerson || "—"}</span>
              </div>
              <div>
                <strong>Công nợ hiện tại:</strong>
                <span>{money(selectedSupplier.debtAmount)}</span>
              </div>
            </div>
          )}

          <h4>Chọn mặt hàng xuất trả</h4>
          <div className="returns-search-bar">
            <input
              type="text"
              disabled={!isOwner}
              placeholder="Tìm kiếm sản phẩm theo tên hoặc SKU..."
              value={searchVariant}
              onChange={(e) => setSearchVariant(e.target.value)}
            />
            <button type="button" disabled={!isOwner} onClick={handleAddVariant}>
              + Thêm SKU
            </button>
          </div>

          {items.length > 0 && (
            <table className="returns-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Nguồn tồn kho</th>
                  <th>SL trả</th>
                  <th>Đơn giá trả</th>
                  <th>Thành tiền</th>
                  <th>Xóa</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.variant.id}>
                    <td>
                      <strong>{item.variant.productName}</strong>
                      <br />
                      <small>{item.variant.sku} · Tồn bán: {item.variant.onHand}</small>
                    </td>
                    <td>
                      <select
                        disabled={!isOwner}
                        value={item.source}
                        onChange={(e) => {
                          const next = [...items];
                          next[idx].source = e.target.value as any;
                          setItems(next);
                        }}
                      >
                        <option value="SELLABLE">Tồn bán được</option>
                        <option value="DAMAGED_STOCK">Hàng hỏng cách ly</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        disabled={!isOwner}
                        value={item.returnQty}
                        style={{ width: "60px", padding: "4px" }}
                        onChange={(e) => {
                          const val = Math.max(1, Number(e.target.value) || 1);
                          const next = [...items];
                          next[idx].returnQty = val;
                          setItems(next);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        disabled={!isOwner}
                        value={item.returnUnitPrice}
                        style={{ width: "100px", padding: "4px" }}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          const next = [...items];
                          next[idx].returnUnitPrice = val;
                          setItems(next);
                        }}
                      />
                    </td>
                    <td>{money(item.returnQty * item.returnUnitPrice)}</td>
                    <td>
                      <button
                        type="button"
                        disabled={!isOwner}
                        onClick={() => setItems(items.filter((_, i) => i !== idx))}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="returns-right">
        <div className="returns-panel">
          <div className="returns-panel-header">
            <h3>Tổng kết xuất trả NCC</h3>
          </div>

          <div className="returns-kpi-grid">
            <div className="returns-kpi-card refund">
              <span>Tổng giá trị hàng xuất trả</span>
              <strong>{money(totalReturnValue)}</strong>
            </div>
          </div>

          {selectedSupplier && (
            <div style={{ background: "#f8f9fc", padding: "12px", borderRadius: "6px", marginBottom: "16px", fontSize: "13px" }}>
              <p style={{ margin: "0 0 6px 0" }}>
                Công nợ ban đầu: <strong>{money(selectedSupplier.debtAmount)}</strong>
              </p>
              <p style={{ margin: "0", color: "#027a48" }}>
                Sau khi cấn trừ: <strong>{money(selectedSupplier.debtAmount - totalReturnValue)}</strong>
              </p>
            </div>
          )}

          <ErrorBox error={submitAction.error} />
          {successMsg && (
            <div style={{ background: "#ecfdf3", color: "#027a48", padding: "12px", borderRadius: "6px", marginBottom: "16px" }}>
              {successMsg}
            </div>
          )}

          <button
            type="button"
            className="purchase-primary"
            style={{ width: "100%", padding: "12px", fontSize: "15px" }}
            disabled={!isOwner || submitAction.busy || items.length === 0}
            onClick={handleSubmit}
          >
            {submitAction.busy ? "Đang xử lý..." : "Xác nhận Xuất trả NCC"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// TAB 3: LỊCH SỬ PHIẾU TRẢ (F05 & F06)
// ==========================================
function ReturnsHistoryTab({ isStaff }: { isStaff: boolean }) {
  const [subTab, setSubTab] = useState<"customer" | "vendor">("customer");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const customerReturns = useLoad(
    () => returnsApi.listCustomerReturns({ page, search, pageSize: 20 }),
    [subTab, page, search],
  );

  const vendorReturns = useLoad(
    () => returnsApi.listVendorReturns({ page, search, pageSize: 20 }),
    [subTab, page, search],
  );

  const customerList: any[] =
    (customerReturns.data as any)?.items ||
    (customerReturns.data as any)?.data ||
    [];
  const vendorList: any[] =
    (vendorReturns.data as any)?.items ||
    (vendorReturns.data as any)?.data ||
    [];

  return (
    <div className="returns-panel">
      <div className="returns-tabs" style={{ marginBottom: "16px" }}>
        <button
          type="button"
          className={`returns-tab-btn ${subTab === "customer" ? "active" : ""}`}
          onClick={() => {
            setSubTab("customer");
            setPage(1);
          }}
        >
          Phiếu Khách trả (F05)
        </button>
        <button
          type="button"
          className={`returns-tab-btn ${subTab === "vendor" ? "active" : ""}`}
          onClick={() => {
            setSubTab("vendor");
            setPage(1);
          }}
        >
          Phiếu Trả Nhà cung cấp (F06)
        </button>
      </div>

      <div className="returns-search-bar" style={{ maxWidth: "400px" }}>
        <input
          type="text"
          placeholder="Tìm kiếm mã phiếu, đơn hàng, khách/NCC..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {subTab === "customer" ? (
        customerReturns.loading ? (
          <Empty>Đang tải danh sách phiếu trả...</Empty>
        ) : (
          <>
            <table className="returns-table">
              <thead>
                <tr>
                  <th>Mã phiếu trả</th>
                  <th>Hóa đơn gốc</th>
                  <th>Khách hàng</th>
                  <th>Ngày tạo</th>
                  <th>Hình thức hoàn</th>
                  <th>Tổng tiền hoàn</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {customerList.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.returnCode}</strong></td>
                    <td>{r.originalOrder ? r.originalOrder.orderCode : "Không hóa đơn"}</td>
                    <td>{r.originalOrder?.customer?.name || "Khách lẻ"}</td>
                    <td>{date(r.createdAt)}</td>
                    <td>{r.refundMethod === "CASH" ? "Tiền mặt" : r.refundMethod === "BANK_TRANSFER" ? "Chuyển khoản" : "Cấn trừ đổi"}</td>
                    <td><strong>{money(r.totalRefundAmount)}</strong></td>
                    <td><span className="condition-tag restock">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {customerReturns.data && customerList.length === 0 && (
              <Empty>Chưa có phiếu trả hàng của khách.</Empty>
            )}
            {customerReturns.data?.pagination && (
              <Pager data={customerReturns.data} page={page} setPage={setPage} />
            )}
          </>
        )
      ) : vendorReturns.loading ? (
        <Empty>Đang tải danh sách phiếu trả NCC...</Empty>
      ) : (
        <>
          <table className="returns-table">
            <thead>
              <tr>
                <th>Mã phiếu trả</th>
                <th>Nhà cung cấp</th>
                <th>Người tạo</th>
                <th>Ngày tạo</th>
                {!isStaff && <th>Tổng giá trị trả</th>}
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {vendorList.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.returnCode}</strong></td>
                  <td>{r.supplier?.name}</td>
                  <td>{r.createdByUser?.fullName || r.createdByUser?.email}</td>
                  <td>{date(r.createdAt)}</td>
                  {!isStaff && <td><strong>{money(r.totalReturnValue ?? 0)}</strong></td>}
                  <td><span className="condition-tag restock">{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {vendorReturns.data && vendorList.length === 0 && (
            <Empty>Chưa có phiếu xuất trả hàng NCC.</Empty>
          )}
          {vendorReturns.data?.pagination && (
            <Pager data={vendorReturns.data} page={page} setPage={setPage} />
          )}
        </>
      )}
    </div>
  );
}
