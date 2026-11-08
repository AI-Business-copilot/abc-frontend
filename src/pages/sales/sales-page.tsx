import { useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { salesApi, type Sale } from "@/api/sales";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/hooks/use-auth";
import { CatalogHeader } from "@/pages/products/catalog-header";
import { Empty, ErrorBox, Field, Heading, Pager, date, money, total, useAction, useLoad } from "@/pages/purchases/shared";
import "@/pages/purchases/purchases.css";
import "./sales.css";
import { SaleEditor } from "./sale-editor";
import { SaleDetail } from "./sale-detail";

const labels = { DRAFT: "Chờ thanh toán", COMPLETED: "Đã thanh toán", CANCELLED: "Đã hủy" };

function SaleStatus({ value }: { value: Sale["status"] }) {
  return <span className={`purchase-status ${value.toLowerCase()}`}>{labels[value]}</span>;
}

export function SalesPage() {
  const { can } = usePermissions();
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const active = location.pathname === "/sales/new"
    ? "pos"
    : location.pathname.startsWith("/sales/customers")
      ? "customers"
      : "sales";

  return <div className="purchase-workspace" key={profile?.business?.id}>
    <CatalogHeader
      mode="sales"
      active={active}
      keyword={keyword}
      onKeywordChange={setKeyword}
      onSearch={() => navigate(`/sales${active === "customers" ? "/customers" : active === "pos" ? "/new" : ""}?${new URLSearchParams({ search: keyword.trim() })}`)}
    />
    <main className="purchases sales">
      <div className="purchase-breadcrumb"><Link to="/app/orders">Đơn hàng &amp; thanh toán</Link><span>›</span><strong>Bán lẻ &amp; thanh toán</strong></div>
      {!can("orders.read") ? <ErrorBox error="Bạn cần quyền xem đơn bán để sử dụng chức năng này." /> : <Routes key={`${profile?.business?.id}:${location.pathname}${active === "pos" ? "" : location.search}`}>
        <Route index element={<SaleList />} />
        <Route path="new" element={<SaleEditor />} />
        <Route path="customers" element={<Customers />} />
        <Route path=":id" element={<SaleDetail />} />
        <Route path="*" element={<Empty>Không tìm thấy trang. <Link to="/sales">Về đơn bán</Link></Empty>} />
      </Routes>}
    </main>
  </div>;
}

function SaleList() {
  const { can } = usePermissions();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") || "");
  const page = Math.max(1, Number(params.get("page")) || 1);
  const result = useLoad(
    () => salesApi.orders({ page, search: params.get("search") || "", status: params.get("status") || "", from: params.get("from") || "", to: params.get("to") || "" }),
    [params.toString()],
  );
  const filter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    next.delete("page");
    setParams(next);
  };
  const paymentLabel = (method: string) => method === "CASH" ? "Tiền mặt" : method === "PROMOTION" ? "Khuyến mãi 100%" : "Chuyển khoản";

  return <>
    <Heading title="Đơn bán hàng" description="Theo dõi đơn tại quầy, đơn chờ thanh toán và lịch sử thu tiền.">
      {can("orders.create") && <Link className="purchase-primary" to="/sales/new">+ Bán tại quầy</Link>}
    </Heading>
    {result.data && <div className="sales-stats">
      <div className="sales-stat"><span>Đơn phù hợp bộ lọc</span><strong>{result.data.pagination.total}</strong></div>
      <div className="sales-stat"><span>Chờ thu · trang hiện tại</span><strong>{money(total(result.data.items.filter(o => o.status === "DRAFT").map(o => ({ qty: "1", price: o.totalNetAmount }))))}</strong></div>
      <div className="sales-stat"><span>Đã thu · trang hiện tại</span><strong>{money(total(result.data.items.filter(o => o.status === "COMPLETED").map(o => ({ qty: "1", price: o.totalNetAmount }))))}</strong></div>
    </div>}
    <p className="purchase-hint">Tổng thanh toán bao gồm tiền mặt, chuyển khoản và đơn được khuyến mãi thanh toán toàn bộ; đây không phải số dư tiền mặt trong ca. Nhấn mã đơn để xem chi tiết.</p>
    <form className="purchase-filters" onSubmit={e => { e.preventDefault(); filter("search", search); }}>
      <Field label="Tìm đơn bán"><input value={search} maxLength={255} onChange={e => setSearch(e.target.value)} placeholder="Nhập mã đơn bán…" /></Field>
      <Field label="Trạng thái"><select value={params.get("status") || ""} onChange={e => filter("status", e.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      <Field label="Từ ngày"><input type="date" value={params.get("from") || ""} onChange={e => filter("from", e.target.value)} /></Field>
      <Field label="Đến ngày"><input type="date" min={params.get("from") || undefined} value={params.get("to") || ""} onChange={e => filter("to", e.target.value)} /></Field>
      <button>Tìm kiếm</button>
    </form>
    <ErrorBox error={result.error} />
    {result.error && <button onClick={result.reload}>Thử lại</button>}
    {result.loading ? <Empty>Đang tải đơn bán…</Empty> : result.data && <>
      <div className="purchase-table"><table>
        <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày tạo</th><th>Trạng thái</th><th>Tổng tiền</th><th>Thanh toán</th></tr></thead>
        <tbody>{result.data.items.map(order => <tr key={order.id}>
          <td><Link to={`/sales/${order.id}`}>{order.orderCode}</Link></td>
          <td>{order.customer?.name || "Khách vãng lai"}</td>
          <td>{date(order.createdAt)}</td>
          <td><SaleStatus value={order.status} /></td>
          <td>{money(order.totalNetAmount)}</td>
          <td>{order.orderPayments.map(p => paymentLabel(p.paymentMethod)).join(", ") || "—"}</td>
        </tr>)}</tbody>
      </table>
      {!result.data.items.length && <Empty><ShoppingBag size={30} className="sales-empty-icon" />Chưa có đơn bán phù hợp.</Empty>}
      </div>
      <Pager data={result.data} page={page} setPage={value => {
        const next = new URLSearchParams(params);
        next.set("page", String(value));
        setParams(next);
      }} />
    </>}
  </>;
}

function Customers() {
  const { can } = usePermissions();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") || "");
  const [term, setTerm] = useState(params.get("search") || "");
  const [page, setPage] = useState(1);
  const result = useLoad(() => salesApi.customers({ search: term, page, pageSize: 20 }), [term, page]);
  const action = useAction();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  return <>
    <Heading title="Khách hàng" description="Lưu thông tin khách để gắn vào đơn bán tại quầy." />
    <ErrorBox error={action.error} />
    {can("orders.create") && <section className="purchase-panel">
      <h3>Thêm khách hàng</h3>
      <form onSubmit={e => {
        e.preventDefault();
        void action.run(async () => {
          await salesApi.createCustomer(name, phone);
          setName("");
          setPhone("");
          setPage(1);
          setTerm("");
          setSearch("");
          result.reload();
        });
      }}>
        <fieldset className="purchase-filters" disabled={action.busy}>
          <Field label="Tên khách hàng"><input required maxLength={150} value={name} onChange={e => setName(e.target.value)} /></Field>
          <Field label="Số điện thoại"><input required type="tel" maxLength={20} value={phone} onChange={e => setPhone(e.target.value)} /></Field>
          <button className="purchase-primary">{action.busy ? "Đang lưu…" : "Thêm khách hàng"}</button>
        </fieldset>
      </form>
    </section>}
    <form className="purchase-filters" onSubmit={e => { e.preventDefault(); setTerm(search); setPage(1); }}>
      <Field label="Tìm khách hàng"><input maxLength={255} value={search} onChange={e => setSearch(e.target.value)} placeholder="Tên hoặc số điện thoại" /></Field>
      <button>Tìm kiếm</button>
    </form>
    <ErrorBox error={result.error} />
    {result.error && <button onClick={result.reload}>Thử lại</button>}
    {result.loading ? <Empty>Đang tải khách hàng…</Empty> : result.data && <>
      <div className="purchase-table"><table>
        <thead><tr><th>Tên khách hàng</th><th>Số điện thoại</th></tr></thead>
        <tbody>{result.data.items.map(customer => <tr key={customer.id}><td>{customer.name}</td><td>{customer.phone}</td></tr>)}</tbody>
      </table>
      {!result.data.items.length && <Empty>Chưa có khách hàng phù hợp.</Empty>}
      </div>
      <Pager data={result.data} page={page} setPage={setPage} />
    </>}
  </>;
}
