import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  productsListApi,
  type CategoryOption,
  type ProductItem,
  type ProductListResponse,
  type ProductSku,
} from '@/api/products-list';
import { useAuth } from '@/hooks/use-auth';
import { CatalogHeader } from '@/pages/products/catalog-header';
import { Icon } from '@/pages/products/ui-icon';
import { getPrimaryImage } from '@/lib/image-utils';

const vnd = (value: number) => new Intl.NumberFormat('vi-VN').format(Math.round(value || 0)) + ' đ';
const compactVnd = (value: number) => {
  if (!value) return '0 đ';
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2).replace('.', ',') + ' tỷ';
  return new Intl.NumberFormat('vi-VN').format(Math.round(value)) + ' đ';
};

function StatCard({
  label,
  value,
  suffix,
  icon,
  children,
  tone = 'default',
}: {
  label: string;
  value: string;
  suffix?: string;
  icon: string;
  children?: React.ReactNode;
  tone?: 'default' | 'warning';
}) {
  const warning = tone === 'warning';
  return (
    <div
      className={[
        'rounded-xl border p-4 flex flex-col justify-between min-h-[126px]',
        warning ? 'bg-[#fff6f6] border-[#fbd5d5]' : 'bg-white border-[#e8eaf0]',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={[
              'text-[10px] font-semibold tracking-[0.08em] uppercase',
              warning ? 'text-[#b42318]' : 'text-[#8a90a2]',
            ].join(' ')}
          >
            {label}
          </p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={['text-[26px] leading-none font-bold', warning ? 'text-[#d92d20]' : 'text-[#111827]'].join(' ')}>
              {value}
            </span>
            {suffix && <span className={['text-[12px]', warning ? 'text-[#b42318]' : 'text-[#8a90a2]'].join(' ')}>{suffix}</span>}
          </div>
        </div>
        <span
          className={[
            'w-10 h-10 shrink-0 rounded-lg grid place-items-center',
            warning ? 'bg-[#fee4e2] text-[#d92d20]' : 'bg-[#eef0ff] text-[#4f46e5]',
          ].join(' ')}
        >
          <Icon name={icon} className="text-[20px]" />
        </span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ProductCard({ product, onView }: { product: ProductItem; onView: (p: ProductItem) => void }) {
  const missingCategory = !product.categoryId;
  return (
    <article className="bg-white rounded-xl border border-[#e8eaf0] overflow-hidden flex flex-col shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_6px_18px_rgba(16,24,40,0.08)] transition-shadow">
      <div className="relative h-[186px] bg-[#f2f4f7]">
        {getPrimaryImage(product.imageUrl) ? (
          <img src={getPrimaryImage(product.imageUrl)} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full grid place-items-center text-[#98a2b3]">
            <Icon name="image" className="text-[40px]" />
          </div>
        )}

        <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur px-2.5 h-[22px] rounded-md text-[11px] font-semibold text-[#344054] shadow-sm">
          <span className={['w-1.5 h-1.5 rounded-full', product.isActive ? 'bg-[#16a34a]' : 'bg-[#98a2b3]'].join(' ')} />
          {product.isActive ? 'Active' : 'Ngừng bán'}
        </span>

        <span className="absolute top-2.5 right-2.5 inline-flex items-center h-[22px] px-2.5 rounded-md bg-[#4f46e5] text-white text-[11px] font-semibold shadow-sm">
          {product.variantCount} Biến thể SKU
        </span>

        <span className="absolute bottom-2.5 left-2.5 inline-flex items-center h-[22px] px-2 rounded bg-[#101828]/85 text-white text-[10.5px] font-semibold tracking-wide font-mono">
          {product.code}
        </span>
      </div>

      <div className="p-3.5 flex flex-col flex-1">
        {missingCategory ? (
          <div className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#b54708]">
            <Icon name="error" className="text-[15px] text-[#f04438]" />
            Chưa phân loại category_id
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#4f46e5]">
            <Icon name="sell" className="text-[15px]" />
            {product.categoryPath}
          </div>
        )}

        <h3 className="mt-1.5 text-[15.5px] leading-snug font-bold text-[#101828] line-clamp-2">{product.name}</h3>
        <p className="mt-1 text-[11.5px] leading-[1.55] text-[#667085] line-clamp-2 min-h-[36px]">{product.description}</p>

        <div className="mt-2.5 rounded-lg bg-[#f6f7ff] px-3 py-2">
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-[#667085]">Giá vốn (AVCO):</span>
            <span className="font-semibold text-[#344054]">{vnd(product.avgCost)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11.5px]">
            <span className="text-[#667085]">Giá bán lẻ niêm yết:</span>
            <span className="font-bold text-[#4f46e5]">{vnd(product.avgPrice)}</span>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
          <span className="inline-flex items-center gap-1 text-[11.5px] text-[#667085] whitespace-nowrap">
            <Icon name="inventory_2" className="text-[14px]" />
            Tồn kho: <b className="font-semibold text-[#344054]">{new Intl.NumberFormat('vi-VN').format(product.stockQty)}</b> {product.unitOfMeasure}
          </span>

          <div className="flex items-center gap-1.5 ml-auto">
            {missingCategory ? (
              <button className="h-8 px-2.5 inline-flex items-center justify-center gap-1 rounded-md bg-[#eef0ff] text-[#4f46e5] text-[12px] font-semibold whitespace-nowrap hover:bg-[#e2e5ff]">
                <Icon name="sell" className="text-[15px]" />
                Gán Danh Mục
              </button>
            ) : (
              <button
                onClick={() => onView(product)}
                className="h-8 px-2.5 inline-flex items-center justify-center gap-1 rounded-md bg-white border border-[#d7d9e6] text-[#4f46e5] text-[12px] font-semibold whitespace-nowrap hover:bg-[#f6f7ff]"
              >
                <Icon name="sell" className="text-[15px]" />
                Xem {product.variantCount} SKU
              </button>
            )}

            <button className="w-8 h-8 grid place-items-center rounded-md border border-[#d7d9e6] text-[#475467] hover:bg-[#f9fafb]">
              <Icon name="edit" className="text-[15px]" />
            </button>
            <button className="w-8 h-8 grid place-items-center rounded-md border border-[#d7d9e6] text-[#475467] hover:bg-[#fef3f2] hover:text-[#d92d20]">
              <Icon name="delete" className="text-[15px]" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function SkuModal({ product, onClose }: { product: ProductItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-[#101828]/45 backdrop-blur-[2px] grid place-items-center p-6" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[#eaecf0] flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-[#4f46e5] uppercase">{product.code}</p>
            <h3 className="text-[17px] font-bold text-[#101828] mt-0.5">{product.name}</h3>
            <p className="text-[12px] text-[#667085] mt-0.5">{product.categoryPath || 'Chưa phân loại'} • {product.variantCount} biến thể</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-md hover:bg-[#f2f4f7] text-[#667085]">
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>

        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-[#f9fafb] sticky top-0">
              <tr className="text-[#667085]">
                <th className="text-left font-medium px-5 py-2.5">SKU</th>
                <th className="text-left font-medium px-3 py-2.5">Barcode</th>
                <th className="text-right font-medium px-3 py-2.5">Giá vốn</th>
                <th className="text-right font-medium px-3 py-2.5">Giá bán</th>
                <th className="text-right font-medium px-5 py-2.5">Tồn kho</th>
              </tr>
            </thead>
            <tbody>
              {product.skus.map((sku: ProductSku) => (
                <tr key={sku.id} className="border-t border-[#f2f4f7]">
                  <td className="px-5 py-2.5 font-mono text-[11.5px] font-semibold text-[#344054]">{sku.sku}</td>
                  <td className="px-3 py-2.5 font-mono text-[11.5px] text-[#667085]">{sku.barcode}</td>
                  <td className="px-3 py-2.5 text-right text-[#475467]">{vnd(sku.costPrice)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-[#4f46e5]">{vnd(sku.basePrice)}</td>
                  <td className="px-5 py-2.5 text-right font-semibold text-[#101828]">{sku.stockQty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 bg-[#f9fafb] border-t border-[#eaecf0] flex items-center justify-between text-[12px] text-[#667085]">
          <span>Tồn kho tổng: <b className="text-[#101828]">{new Intl.NumberFormat('vi-VN').format(product.stockQty)} {product.unitOfMeasure}</b></span>
          <span>Giá trị tồn (AVCO): <b className="text-[#101828]">{compactVnd(product.stockValue)}</b></span>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const { profile } = useAuth();
  const business = profile?.business ?? null;

  const [data, setData] = useState<ProductListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [selected, setSelected] = useState<ProductItem | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 350);
    return () => clearTimeout(t);
  }, [keyword]);

  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword, categoryId, status, pageSize]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    productsListApi
      .list({ q: debouncedKeyword, categoryId, status, page, pageSize })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Không tải được dữ liệu');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedKeyword, categoryId, status, page, pageSize]);

  const stats = data?.stats;
  const categories: CategoryOption[] = data?.categories ?? [];
  const items = data?.items ?? [];
  const pagination = data?.pagination ?? { page: 1, pageSize, total: 0, totalPages: 1 };

  const rangeFrom = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const rangeTo = Math.min(pagination.page * pagination.pageSize, pagination.total);

  const pageNumbers = useMemo(() => {
    const total = pagination.totalPages;
    const current = pagination.page;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | '…')[] = [1];
    if (current > 3) pages.push('…');
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
    if (current < total - 2) pages.push('…');
    pages.push(total);
    return pages;
  }, [pagination.page, pagination.totalPages]);

  return (
    <div className="abc-products min-h-screen bg-[#f5f6fa] text-[#101828]">
      <CatalogHeader active="products" keyword={keyword} onKeywordChange={setKeyword} />

      <main className="max-w-[1560px] mx-auto px-6 py-5">
        {/* Title */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <nav className="mb-1 flex items-center gap-1.5 text-[11.5px] text-[#98a2b3]" aria-label="Breadcrumb">
              <Link className="hover:text-[#4f46e5]" to="/app/products">Vận hành</Link>
              <span>/</span>
              <span className="font-semibold text-[#475467]">Sản phẩm</span>
              {business && <><span>•</span><span>{business.name}</span></>}
            </nav>
            <h1 className="text-[26px] leading-tight font-extrabold tracking-tight">Quản lý Sản phẩm &amp; Biến thể</h1>
            <p className="mt-1 text-[12.5px] text-[#667085]">
              Quản lý danh sách product_templates và theo dõi số lượng biến thể SKU liên kết thời gian thực.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-10 px-3.5 inline-flex items-center gap-1.5 rounded-lg border border-[#cfd2ff] bg-white text-[#4f46e5] text-[12.5px] font-semibold hover:bg-[#f6f7ff]">
              <Icon name="qr_code_scanner" className="text-[18px]" />
              Quét mã vạch
            </button>
            <button className="h-10 px-3.5 inline-flex items-center gap-1.5 rounded-lg border border-[#d0d5dd] bg-white text-[#344054] text-[12.5px] font-semibold hover:bg-[#f9fafb]">
              <Icon name="download" className="text-[18px]" />
              Nhập/Xuất Excel
              <Icon name="expand_more" className="text-[17px] text-[#98a2b3]" />
            </button>
            <button onClick={() => navigate('/products/new')} className="h-10 px-4 inline-flex items-center gap-1.5 rounded-lg bg-[#4f46e5] text-white text-[12.5px] font-semibold shadow-[0_4px_12px_rgba(79,70,229,0.3)] hover:bg-[#4338ca]">
              <Icon name="add_circle" className="text-[18px]" />
              Thêm sản phẩm mới
            </button>
          </div>
        </div>

        {notice && (
          <div className="mt-4 rounded-lg bg-[#ecfdf3] border border-[#abefc6] text-[#067647] text-[12.5px] px-4 py-2.5">
            {notice}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg bg-[#fef3f2] border border-[#fecdca] text-[#b42318] text-[12.5px] px-4 py-2.5">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Tổng sản phẩm cha" value={String(stats?.totalTemplates ?? 0)} suffix="mẫu hàng" icon="inventory_2">
            <div className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#4f46e5] bg-[#eef0ff] rounded-md px-2.5 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4f46e5]" />
              {stats?.totalVariants ?? 0} Biến thể SKU
            </div>
          </StatCard>

          <StatCard label="Cơ cấu danh mục" value={String(stats?.totalCategories ?? 0)} suffix="Danh mục cấp 1 & 2" icon="category">
            <div className="flex items-center justify-between gap-2 text-[11.5px]">
              <span className="inline-flex items-center gap-1 text-[#667085] truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4f46e5]" />
                {(stats?.topCategories ?? []).map((c) => `${c.name} (${c.count})`).join(' • ') || 'Chưa có danh mục'}
              </span>
              <span className="font-bold text-[#101828] whitespace-nowrap">{stats?.activePercent ?? 0}% Active</span>
            </div>
          </StatCard>

          <StatCard label="Tổng giá vốn tồn kho (AVCO)" value={vnd(stats?.totalStockValue ?? 0)} icon="payments">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#667085]">Bình quân gia quyền thực tế</span>
              <span className="text-[11px] font-semibold text-[#067647] bg-[#ecfdf3] rounded px-2 py-1 whitespace-nowrap">
                Lợi nhuận gộp ~{stats?.grossMarginPercent ?? 0}%
              </span>
            </div>
          </StatCard>

          <StatCard label="Cảnh báo" value={String(stats?.missingCategoryCount ?? 0)} suffix="Sản phẩm chưa có Category" icon="warning" tone="warning">
            <button className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-[#d92d20] bg-[#fee4e2] rounded-md px-2.5 py-1.5 hover:bg-[#fdd8d5]">
              Gán ngay
              <Icon name="arrow_forward" className="text-[12px]" />
            </button>
          </StatCard>
        </div>

        {/* Filters */}
        <div className="mt-4 bg-white rounded-xl border border-[#e8eaf0] p-3 flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[260px]">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#98a2b3]" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm kiếm sản phẩm theo tên, mã sản phẩm hoặc SKU..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#e4e7ec] text-[12.5px] outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#e0e2ff] placeholder:text-[#98a2b3]"
            />
          </div>

          <div className="relative">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-10 min-w-[190px] appearance-none pl-9 pr-9 rounded-lg border border-[#e4e7ec] bg-white text-[12.5px] font-medium text-[#344054] outline-none focus:border-[#4f46e5]"
            >
              <option value="">Tất cả danh mục ({stats?.totalCategories ?? 0})</option>
              {categories
                .filter((c) => !c.parentId)
                .map((parent) => (
                  <optgroup key={parent.id} label={parent.name}>
                    <option value={parent.id}>{parent.name} (tất cả)</option>
                    {categories
                      .filter((c) => c.parentId === parent.id)
                      .map((child) => (
                        <option key={child.id} value={child.id}>
                          {child.name} ({child.count})
                        </option>
                      ))}
                  </optgroup>
                ))}
            </select>
            <Icon name="filter_alt" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[17px] text-[#98a2b3] pointer-events-none" />
            <Icon name="expand_more" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[17px] text-[#98a2b3] pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 min-w-[175px] appearance-none pl-9 pr-9 rounded-lg border border-[#e4e7ec] bg-white text-[12.5px] font-medium text-[#344054] outline-none focus:border-[#4f46e5]"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang bán (Active)</option>
              <option value="inactive">Ngừng bán</option>
              <option value="missing-category">Chưa phân loại</option>
            </select>
            <Icon name="toggle_on" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[17px] text-[#98a2b3] pointer-events-none" />
            <Icon name="expand_more" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[17px] text-[#98a2b3] pointer-events-none" />
          </div>

          <div className="ml-auto flex items-center gap-1 bg-white rounded-lg border border-[#e4e7ec] p-1">
            <button
              onClick={() => setView('grid')}
              className={[
                'h-8 px-3 inline-flex items-center gap-1.5 rounded-md text-[12px] font-semibold',
                view === 'grid' ? 'bg-[#eef0ff] text-[#4f46e5]' : 'text-[#667085] hover:bg-[#f9fafb]',
              ].join(' ')}
            >
              <Icon name="grid_view" className="text-[16px]" />
              Lưới thẻ
            </button>
            <button
              onClick={() => setView('table')}
              className={[
                'h-8 px-3 inline-flex items-center gap-1.5 rounded-md text-[12px] font-semibold',
                view === 'table' ? 'bg-[#eef0ff] text-[#4f46e5]' : 'text-[#667085] hover:bg-[#f9fafb]',
              ].join(' ')}
            >
              <Icon name="table_rows" className="text-[16px]" />
              Bảng danh sách
            </button>
          </div>
        </div>

        {/* Content */}
        {loading && !data ? (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#e8eaf0] h-[390px] animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-4 bg-white rounded-xl border border-[#e8eaf0] py-20 text-center">
            <Icon name="inventory_2" className="text-[44px] text-[#d0d5dd]" />
            <p className="mt-2 text-[13.5px] font-semibold text-[#344054]">Không tìm thấy sản phẩm phù hợp</p>
            <p className="text-[12px] text-[#98a2b3]">Thử đổi từ khóa hoặc bộ lọc danh mục.</p>
          </div>
        ) : view === 'grid' ? (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} onView={setSelected} />
            ))}
          </div>
        ) : (
          <div className="mt-4 bg-white rounded-xl border border-[#e8eaf0] overflow-hidden">
            <table className="w-full text-[12.5px]">
              <thead className="bg-[#f9fafb] text-[#667085]">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Mã sản phẩm</th>
                  <th className="text-left font-medium px-4 py-3">Tên sản phẩm</th>
                  <th className="text-left font-medium px-4 py-3">Danh mục</th>
                  <th className="text-right font-medium px-4 py-3">Giá vốn</th>
                  <th className="text-right font-medium px-4 py-3">Giá bán</th>
                  <th className="text-right font-medium px-4 py-3">Biến thể</th>
                  <th className="text-right font-medium px-4 py-3">Tồn kho</th>
                  <th className="text-center font-medium px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {items.map((product) => (
                  <tr key={product.id} className="border-t border-[#f2f4f7] hover:bg-[#f9fafb]">
                    <td className="px-4 py-3 font-mono text-[11.5px] font-semibold text-[#4f46e5]">{product.code}</td>
                    <td className="px-4 py-3 font-semibold text-[#101828]">{product.name}</td>
                    <td className="px-4 py-3 text-[#667085]">{product.categoryPath || '—'}</td>
                    <td className="px-4 py-3 text-right text-[#475467]">{vnd(product.avgCost)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#4f46e5]">{vnd(product.avgPrice)}</td>
                    <td className="px-4 py-3 text-right">{product.variantCount}</td>
                    <td className="px-4 py-3 text-right">{product.stockQty}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={[
                          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold',
                          product.isActive ? 'bg-[#ecfdf3] text-[#067647]' : 'bg-[#f2f4f7] text-[#667085]',
                        ].join(' ')}
                      >
                        <span className={['w-1.5 h-1.5 rounded-full', product.isActive ? 'bg-[#12b76a]' : 'bg-[#98a2b3]'].join(' ')} />
                        {product.isActive ? 'Active' : 'Ngừng bán'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="mt-4 bg-white rounded-xl border border-[#e8eaf0] px-4 py-3 flex flex-wrap items-center gap-4">
          <div className="text-[12px] text-[#667085]">
            Hiển thị <b className="text-[#344054]">{rangeFrom}–{rangeTo}</b> trong tổng số{' '}
            <b className="text-[#344054]">{pagination.total}</b> sản phẩm cha ({stats?.totalVariants ?? 0} SKU)
          </div>

          <div className="flex items-center gap-2 text-[12px] text-[#667085]">
            Hiển thị mỗi trang:
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-8 px-2 rounded-md border border-[#e4e7ec] bg-white text-[12px] font-semibold text-[#344054] outline-none"
            >
              {[6, 12, 24, 48].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="w-8 h-8 grid place-items-center rounded-md text-[#667085] hover:bg-[#f2f4f7] disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <Icon name="chevron_left" className="text-[18px]" />
            </button>
            {pageNumbers.map((p, idx) =>
              p === '…' ? (
                <span key={`e${idx}`} className="w-8 h-8 grid place-items-center text-[#98a2b3]">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={[
                    'min-w-8 h-8 px-2 rounded-md text-[12.5px] font-semibold',
                    p === pagination.page ? 'bg-[#4f46e5] text-white' : 'text-[#475467] hover:bg-[#f2f4f7]',
                  ].join(' ')}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="w-8 h-8 grid place-items-center rounded-md text-[#667085] hover:bg-[#f2f4f7] disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <Icon name="chevron_right" className="text-[18px]" />
            </button>
          </div>
        </div>
      
      </main>

      {selected && <SkuModal product={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
