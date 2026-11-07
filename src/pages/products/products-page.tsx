import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  productsListApi,
  type CategoryOption,
  type ProductItem,
  type ProductListResponse,
  type ProductSku,
} from '@/api/products-list';
import { productWizardApi } from '@/api/product-wizard';
import { useAuth } from '@/hooks/use-auth';
import { CatalogHeader } from '@/pages/products/catalog-header';
import { Icon } from '@/pages/products/ui-icon';
import { getAllImages } from '@/lib/image-utils';
import { inventoryApi } from '@/api/inventory';
import { BarcodeScannerModal, stopAllGlobalMediaStreams } from '@/pages/products/barcode-scanner-modal';
import { BarcodePrintModal, type PrintableVariant } from '@/pages/products/barcode-print-modal';
import { ProductEditModal } from '@/pages/products/product-edit-modal';

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

function ProductCard({
  product,
  onView,
  onEdit,
  onDelete,
  onQuickCategory,
  onPrintBarcode,
}: {
  product: ProductItem;
  onView: (p: ProductItem) => void;
  onEdit: (p: ProductItem) => void;
  onDelete: (p: ProductItem) => void;
  onQuickCategory: (p: ProductItem) => void;
  onPrintBarcode: (p: ProductItem) => void;
}) {
  const missingCategory = !product.categoryId;
  const images = useMemo(() => getAllImages(product.imageUrl), [product.imageUrl]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Hiệu ứng tự động lướt qua các ảnh biến thể / góc chụp khi hover
  useEffect(() => {
    if (!isHovered || images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % images.length);
    }, 1200);
    return () => clearInterval(timer);
  }, [isHovered, images.length]);

  return (
    <article
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setCurrentIdx(0);
      }}
      className="bg-white rounded-xl border border-[#e8eaf0] overflow-hidden flex flex-col shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_8px_24px_rgba(16,24,40,0.1)] transition-all duration-300 group"
    >
      <div className="relative h-[200px] bg-[#f2f4f7] overflow-hidden">
        {images.length > 0 && images[currentIdx] ? (
          <img
            src={images[currentIdx]}
            alt={product.name}
            className="w-full h-full object-cover transition-all duration-500 transform group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-[#f2f4f7] text-[#98a2b3]"><span class="material-symbols-outlined text-[40px]">image</span></div>';
              }
            }}
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-[#98a2b3]">
            <Icon name="image" className="text-[40px]" />
          </div>
        )}

        {/* Thanh chấm tròn chuyển góc chụp / màu sắc biến thể */}
        {images.length > 1 && (
          <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-1.5 z-10 pointer-events-auto">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIdx(idx);
                }}
                className={[
                  "h-1.5 rounded-full transition-all duration-300 shadow",
                  idx === currentIdx ? "w-5 bg-white" : "w-1.5 bg-white/60 hover:bg-white",
                ].join(" ")}
                title={`Góc chụp / Màu #${idx + 1}`}
              />
            ))}
          </div>
        )}

        <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur px-2.5 h-[22px] rounded-md text-[11px] font-semibold text-[#344054] shadow-sm">
          <span className={['w-1.5 h-1.5 rounded-full', product.isActive ? 'bg-[#16a34a]' : 'bg-[#98a2b3]'].join(' ')} />
          {product.isActive ? 'Active' : 'Ngừng bán'}
        </span>

        {/* Cảnh báo tồn kho thấp hoặc hết hàng */}
        {product.stockQty === 0 ? (
          <span className="absolute top-9 left-2.5 inline-flex items-center gap-1 bg-red-600/95 text-white px-2 h-[20px] rounded-md text-[10.5px] font-bold shadow-sm">
            Hết hàng
          </span>
        ) : product.stockQty <= 10 ? (
          <span className="absolute top-9 left-2.5 inline-flex items-center gap-1 bg-amber-500/95 text-white px-2 h-[20px] rounded-md text-[10.5px] font-bold shadow-sm">
            <Icon name="warning" className="text-[12px]" /> Tồn thấp ({product.stockQty})
          </span>
        ) : null}

        <span className="absolute top-2.5 right-2.5 inline-flex items-center h-[22px] px-2.5 rounded-md bg-[#4f46e5] text-white text-[11px] font-semibold shadow-sm">
          {product.variantCount} Biến thể SKU
        </span>

        <span className="absolute bottom-2.5 left-2.5 inline-flex items-center h-[22px] px-2 rounded bg-[#101828]/85 text-white text-[10.5px] font-semibold tracking-wide font-mono z-10">
          {product.code}
        </span>
      </div>

      <div className="p-3.5 flex flex-col flex-1">
        {missingCategory ? (
          <button
            type="button"
            onClick={() => onQuickCategory(product)}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#b54708] bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded transition-colors"
            title="Bấm để gán danh mục cho sản phẩm này"
          >
            <Icon name="error" className="text-[15px] text-[#f04438]" />
            <span>Chưa phân loại danh mục</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onQuickCategory(product)}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#4f46e5] bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors"
            title="Bấm để thay đổi hoặc gỡ danh mục này"
          >
            <Icon name="sell" className="text-[15px]" />
            <span>{product.categoryPath}</span>
            <Icon name="edit" className="text-[12px] opacity-70" />
          </button>
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
              <button
                type="button"
                onClick={() => onQuickCategory(product)}
                className="h-8 px-2.5 inline-flex items-center justify-center gap-1 rounded-md bg-[#eef0ff] text-[#4f46e5] text-[12px] font-bold whitespace-nowrap hover:bg-[#e2e5ff] shadow-2xs"
              >
                <Icon name="sell" className="text-[15px]" />
                Gán Danh Mục Nhanh
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

            {/* Nút In tem mã vạch Barcode */}
            <button
              type="button"
              onClick={() => onPrintBarcode(product)}
              title="In tem mã vạch Barcode cho sản phẩm này"
              className="w-8 h-8 grid place-items-center rounded-md border border-[#d7d9e6] text-[#475467] hover:bg-[#eef2ff] hover:text-[#4f46e5] transition-colors"
            >
              <Icon name="print" className="text-[15px]" />
            </button>

            {/* Nút Chỉnh sửa hoạt động */}
            <button
              onClick={() => onEdit(product)}
              title="Chỉnh sửa sản phẩm"
              className="w-8 h-8 grid place-items-center rounded-md border border-[#d7d9e6] text-[#475467] hover:bg-[#eef2ff] hover:text-[#4f46e5] transition-colors"
            >
              <Icon name="edit" className="text-[15px]" />
            </button>

            {/* Nút Xóa hoạt động */}
            <button
              onClick={() => onDelete(product)}
              title="Xóa sản phẩm"
              className="w-8 h-8 grid place-items-center rounded-md border border-[#d7d9e6] text-[#475467] hover:bg-[#fef3f2] hover:text-[#d92d20] transition-colors"
            >
              <Icon name="delete" className="text-[15px]" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function SkuModal({
  product,
  onClose,
  onPrintVariants,
  onOpenLots,
}: {
  product: ProductItem;
  onClose: () => void;
  onPrintVariants: (variants: PrintableVariant[]) => void;
  onOpenLots?: (sku: ProductSku, product: ProductItem) => void;
}) {
  const images = useMemo(() => getAllImages(product.imageUrl), [product.imageUrl]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Ánh xạ ảnh biến thể cụ thể đã gán (lấy từ localStorage hoặc mặc định)
  const [variantImages, setVariantImages] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const sku of product.skus) {
      const saved = localStorage.getItem(`variant_img_${sku.id}`) || localStorage.getItem(`variant_img_${sku.sku}`);
      if (saved) map[sku.id] = saved;
    }
    return map;
  });

  const [assigningSku, setAssigningSku] = useState<ProductSku | null>(null);

  const handleAssignImage = (skuId: string, imgUrl: string) => {
    setVariantImages((prev) => {
      const next = { ...prev, [skuId]: imgUrl };
      if (imgUrl) {
        localStorage.setItem(`variant_img_${skuId}`, imgUrl);
      } else {
        localStorage.removeItem(`variant_img_${skuId}`);
      }
      return next;
    });
    setAssigningSku(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#101828]/50 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#eaecf0] flex items-start justify-between gap-4 bg-gray-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold tracking-wide text-[#4f46e5] uppercase bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                {product.code}
              </span>
              <span className="text-[11px] text-[#667085]">{product.categoryPath || 'Chưa phân loại'}</span>
            </div>
            <h3 className="text-[18px] font-extrabold text-[#101828] mt-1">{product.name}</h3>
            <p className="text-[12px] text-[#667085] mt-0.5">
              Danh sách {product.variantCount} biến thể SKU • Có ảnh chụp theo nhiều góc và mã vạch riêng biệt
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                const printable: PrintableVariant[] = product.skus.map((s, i) => ({
                  id: s.id,
                  sku: s.sku,
                  barcode: s.barcode || s.sku,
                  templateName: product.name,
                  attributeText: `Biến thể #${i + 1}`,
                  price: s.basePrice,
                }));
                onPrintVariants(printable);
              }}
              className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg bg-[#4f46e5] text-white text-[12px] font-bold shadow-xs hover:bg-[#4338ca] transition-colors"
            >
              <Icon name="print" className="text-[16px]" />
              In {product.variantCount} tem mã vạch
            </button>
            <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-[#f2f4f7] text-[#667085]">
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>
        </div>

        {/* Thư viện góc chụp đa chiều (Multi-angle photos) */}
        {images.length > 0 && (
          <div className="px-6 py-2.5 bg-indigo-50/30 border-b border-gray-100 flex items-center gap-3 overflow-x-auto">
            <span className="text-[11.5px] font-bold text-gray-700 shrink-0 flex items-center gap-1">
              <Icon name="photo_camera" className="text-[15px] text-[#4f46e5]" />
              Các góc chụp ({images.length}):
            </span>
            <div className="flex items-center gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPreviewImage(img)}
                  className="w-10 h-10 rounded-lg border-2 border-white shadow-xs overflow-hidden hover:border-[#4f46e5] transition-all hover:scale-105 shrink-0"
                  title={`Bấm để xem ảnh phóng to góc chụp #${i + 1}`}
                >
                  <img src={img} alt={`Góc chụp #${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-h-[460px] overflow-auto p-4">
          <table className="w-full text-[12.5px]">
            <thead className="bg-[#f9fafb] sticky top-0 border-b border-gray-200">
              <tr className="text-[#667085]">
                <th className="text-left font-semibold px-3 py-2.5 w-16">Ảnh</th>
                <th className="text-left font-semibold px-3 py-2.5">Mã SKU</th>
                <th className="text-left font-semibold px-3 py-2.5">Mã vạch Barcode</th>
                <th className="text-right font-semibold px-3 py-2.5">Giá vốn</th>
                <th className="text-right font-semibold px-3 py-2.5">Giá bán</th>
                <th className="text-right font-semibold px-4 py-2.5">Tồn kho</th>
                <th className="text-center font-semibold px-3 py-2.5 w-16">In tem</th>
              </tr>
            </thead>
            <tbody>
              {product.skus.map((sku: ProductSku, idx: number) => {
                const rawImg = variantImages[sku.id] || images[0] || "";
                const variantImg = typeof rawImg === "string" && rawImg.trim().length > 5 ? rawImg.trim() : null;
                const safetyLimit = typeof sku.safetyStockQty === "number" ? sku.safetyStockQty : 0;
                const isLowStock = product.isActive && safetyLimit > 0 && sku.stockQty <= safetyLimit;
                return (
                  <tr key={sku.id} className="border-b border-[#f2f4f7] hover:bg-[#fafbff] transition-colors">
                    <td className="px-3 py-2">
                      <div className="relative group w-10 h-10">
                        {variantImg ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(variantImg)}
                            className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 hover:border-[#4f46e5] shadow-xs block transition-transform group-hover:scale-105"
                            title="Bấm để xem ảnh phóng to"
                          >
                            <img
                              src={variantImg}
                              alt={sku.sku}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.style.display = "none";
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400"><span class="material-symbols-outlined text-[18px]">image</span></div>';
                                }
                              }}
                            />
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 grid place-items-center text-gray-400">
                            <Icon name="image" className="text-[18px]" />
                          </div>
                        )}
                        {/* Nút gán ảnh cho biến thể trên hover */}
                        <button
                          type="button"
                          onClick={() => setAssigningSku(sku)}
                          className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center text-white text-[10px]"
                          title="Đổi/Gán ảnh đúng góc chụp cho biến thể này"
                        >
                          <Icon name="photo_camera" className="text-[15px]" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-mono text-[12px] font-bold text-gray-900">{sku.sku}</div>
                      <div className="text-[11px] text-gray-500">Biến thể #{idx + 1}</div>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11.5px] text-[#4f46e5] font-semibold">
                      {sku.barcode ? (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="qr_code" className="text-[14px]" />
                          {sku.barcode}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-[#475467]">{vnd(sku.costPrice)}</td>
                    <td className="px-3 py-2 text-right font-bold text-[#4f46e5]">{vnd(sku.basePrice)}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex flex-col items-end">
                        <span className={["font-bold", isLowStock ? "text-red-600 bg-red-50 px-2 py-0.5 rounded text-[11.5px]" : "text-gray-900"].join(" ")}>
                          {sku.stockQty} {product.unitOfMeasure}
                        </span>
                        {product.hasLotTracking && (
                          <button
                            type="button"
                            onClick={() => onOpenLots?.(sku, product)}
                            className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-bold text-[#4f46e5] hover:text-[#4338ca] bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded transition-colors"
                            title="Xem chi tiết phân bổ tồn kho theo từng Lô (FEFO)"
                          >
                            <Icon name="inventory" className="text-[12px]" />
                            <span>Xem lô</span>
                          </button>
                        )}
                        {isLowStock && (
                          <span className="block text-[10px] text-amber-600 font-semibold mt-0.5">
                            Tồn an toàn (≤ {safetyLimit})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          onPrintVariants([{
                            id: sku.id,
                            sku: sku.sku,
                            barcode: sku.barcode || sku.sku,
                            templateName: product.name,
                            attributeText: `Biến thể #${idx + 1}`,
                            price: sku.basePrice,
                          }]);
                        }}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-[#4f46e5] hover:bg-indigo-50 transition-colors"
                        title="In tem mã vạch cho riêng biến thể này"
                      >
                        <Icon name="print" className="text-[16px]" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal con gán ảnh cho biến thể trong SkuModal */}
        {assigningSku && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-[15px] font-bold text-gray-900">
                    Chọn ảnh cho biến thể
                  </h3>
                  <p className="font-mono text-[12px] text-[#4f46e5] font-bold mt-0.5">{assigningSku.sku}</p>
                </div>
                <button
                  onClick={() => setAssigningSku(null)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100"
                >
                  <Icon name="close" className="text-[20px]" />
                </button>
              </div>

              <div className="mt-3">
                <p className="text-[12px] text-gray-600">Chọn ảnh góc chụp tương ứng với biến thể này:</p>
                <div className="mt-2.5 grid grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1">
                  {images.map((img, i) => {
                    const isSelected = variantImages[assigningSku.id] === img;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleAssignImage(assigningSku.id, img)}
                        className={["relative h-18 w-full rounded-xl border-2 overflow-hidden hover:scale-105 transition-all", isSelected ? "border-[#4f46e5] shadow-md ring-2 ring-indigo-200" : "border-gray-200"].join(" ")}
                      >
                        <img src={img} alt={`Góc #${i + 1}`} className="w-full h-full object-cover" />
                        {isSelected && (
                          <span className="absolute top-1 right-1 bg-[#4f46e5] text-white rounded-full p-0.5">
                            <Icon name="check" className="text-[12px]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <button
                  type="button"
                  onClick={() => handleAssignImage(assigningSku.id, "")}
                  className="text-[12px] text-gray-500 hover:text-gray-800"
                >
                  Dùng ảnh chính sản phẩm
                </button>
                <button
                  type="button"
                  onClick={() => setAssigningSku(null)}
                  className="rounded-lg bg-gray-200 px-3.5 py-1.5 text-[12px] font-bold text-gray-700 hover:bg-gray-300"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Phóng to ảnh biến thể */}
        {previewImage && (
          <div
            className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 text-white grid place-items-center hover:bg-black"
              >
                <Icon name="close" className="text-[18px]" />
              </button>
              <img src={previewImage} alt="Preview" className="w-full max-h-[70vh] object-contain rounded-xl" />
            </div>
          </div>
        )}

        <div className="px-6 py-3 bg-[#f9fafb] border-t border-[#eaecf0] flex items-center justify-between text-[12px] text-[#667085]">
          <span>Tồn kho tổng: <b className="text-[#101828]">{new Intl.NumberFormat('vi-VN').format(product.stockQty)} {product.unitOfMeasure}</b></span>
          <span>Giá trị tồn (AVCO): <b className="text-[#101828]">{compactVnd(product.stockValue)}</b></span>
        </div>
      </div>
    </div>
  );
}

function VariantLotsModal({
  sku,
  product,
  onClose,
}: {
  sku: ProductSku;
  product: ProductItem;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [lots, setLots] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const fetchLots = async () => {
      setLoading(true);
      try {
        const res = await inventoryApi.getVariantLots(sku.id);
        if (active) setLots(res.lots || (res as any).items || []);
      } catch (err: any) {
        if (active) setError(err?.message || 'Không thể tải thông tin lô');
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchLots();
    return () => {
      active = false;
    };
  }, [sku.id]);

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600"><Icon name="inventory" className="text-[20px]" /></span>
            <div>
              <h3 className="text-[16px] font-bold text-gray-900">Chi tiết tồn kho theo Lô (FEFO)</h3>
              <p className="text-[11.5px] text-gray-500 font-mono">{sku.sku} • {product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        {error && <div className="mt-3 text-[12px] text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">{error}</div>}

        <div className="mt-4">
          {loading ? (
            <div className="py-8 text-center text-[13px] text-gray-500">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent mb-2" />
              <p>Đang truy vấn số dư theo lô...</p>
            </div>
          ) : lots.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-gray-400">
              Chưa có thông tin lô cụ thể nào cho biến thể này. Dữ liệu lô được khởi tạo ở phiếu Nạp tồn (F02) hoặc Nhập mua PO.
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-gray-50 text-[10.5px] uppercase font-bold text-gray-500 border-b">
                  <tr>
                    <th className="px-3.5 py-2">Số Lô</th>
                    <th className="px-3 py-2">Hạn sử dụng (HSD)</th>
                    <th className="px-3 py-2 text-right">Tồn kho</th>
                    <th className="px-3.5 py-2 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lots.map((lot) => {
                    const expiry = lot.expirationDate ? new Date(lot.expirationDate).toLocaleDateString("vi-VN") : "Không hạn dùng";
                    const isExpired = lot.expirationDate && new Date(lot.expirationDate) < new Date();
                    return (
                      <tr key={lot.id} className="hover:bg-purple-50/20">
                        <td className="px-3.5 py-2 font-mono font-bold text-purple-700">{lot.lotNumber}</td>
                        <td className="px-3 py-2 text-gray-700">{expiry}</td>
                        <td className="px-3 py-2 text-right font-bold text-gray-900">{Number(lot.quantityOnHand || 0).toLocaleString("vi-VN")} {product.unitOfMeasure}</td>
                        <td className="px-3.5 py-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${isExpired ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                            {isExpired ? "Hết hạn" : "Khả dụng"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[12.5px] font-semibold text-gray-700">Đóng</button>
        </div>
      </div>
    </div>
  );
}

function QuickCategoryModal({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: ProductItem;
  categories: CategoryOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedId, setSelectedId] = useState(product.categoryId || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setBusy(true);
    try {
      await productWizardApi.updateTemplate(product.id, { categoryId: selectedId ? selectedId : null });
      onSaved();
    } catch (err: any) {
      setError(err?.message || 'Lỗi khi gán danh mục');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-50 text-[#4f46e5]"><Icon name="sell" className="text-[20px]" /></span>
            <div>
              <h3 className="text-[16px] font-bold text-gray-900">Gán / Gỡ danh mục sản phẩm</h3>
              <p className="text-[11.5px] text-gray-500 truncate max-w-[240px]">{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        {error && <div className="mt-3 text-[12px] text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">{error}</div>}

        <div className="mt-4">
          <label className="text-[12.5px] font-semibold text-gray-700 mb-1.5 block">Chọn danh mục sản phẩm:</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-gray-300 bg-white text-[13.5px] font-medium text-gray-800 outline-none focus:border-[#4f46e5]"
          >
            <option value="">-- Bỏ gán / Xóa danh mục hiện tại (Không gán) --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parentName ? `${c.parentName} > ` : ''}{c.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-gray-500">
            Chọn danh mục mới để thay đổi, hoặc chọn &quot;Bỏ gán&quot; để gỡ danh mục khỏi sản phẩm này.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50">Hủy</button>
          <button disabled={busy} onClick={() => void handleSave()} className="px-5 py-2 rounded-xl bg-[#4f46e5] text-white text-[13px] font-bold shadow-md hover:bg-[#4338ca] disabled:opacity-50">
            {busy ? 'Đang lưu...' : selectedId ? 'Lưu thay đổi danh mục' : 'Xác nhận gỡ danh mục'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [notice, setNotice] = useState((location.state as { notice?: string } | null)?.notice || '');
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

  // Modal Xóa sản phẩm
  const [deletingProduct, setDeletingProduct] = useState<ProductItem | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [quickCategoryProduct, setQuickCategoryProduct] = useState<ProductItem | null>(null);
  const [barcodeVariants, setBarcodeVariants] = useState<PrintableVariant[] | null>(null);
  const [viewingLots, setViewingLots] = useState<{ sku: ProductSku; product: ProductItem } | null>(null);

  // Debounce gọi server ở mức thấp (100ms) để không spam network
  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 100);
    return () => clearTimeout(t);
  }, [keyword]);

  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword, categoryId, status, pageSize]);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await productsListApi.list({ q: debouncedKeyword, categoryId, status, page, pageSize });
      setData(res.data);
    } catch (err: any) {
      setError(err?.message || 'Không tải được dữ liệu sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProducts();
  }, [debouncedKeyword, categoryId, status, page, pageSize]);

  const stats = data?.stats;
  const categories: CategoryOption[] = data?.categories ?? [];
  const rawItems = data?.items ?? [];
  const pagination = data?.pagination ?? { page: 1, pageSize, total: 0, totalPages: 1 };

  // ==========================================
  // MỤC 11: INSTANT IN-MEMORY FILTERING (< 15ms)
  // Thực thi tức thì 0-2ms ngay khi người dùng gõ
  // ==========================================
  const filteredItems = useMemo(() => {
    if (!rawItems.length) return [];
    const kw = keyword.trim().toLowerCase();
    if (!kw && !categoryId && !status) return rawItems;

    return rawItems.filter((p) => {
      const matchesKeyword =
        !kw ||
        p.name.toLowerCase().includes(kw) ||
        p.code.toLowerCase().includes(kw) ||
        (p.categoryPath && p.categoryPath.toLowerCase().includes(kw)) ||
        p.skus.some(
          (s) =>
            s.sku.toLowerCase().includes(kw) ||
            (s.barcode && s.barcode.toLowerCase().includes(kw)),
        );

      const matchesCat = !categoryId || p.categoryId === categoryId;
      const matchesStatus =
        !status ||
        (status === 'active' && p.isActive) ||
        (status === 'inactive' && !p.isActive) ||
        (status === 'missing-category' && !p.categoryId);

      return matchesKeyword && matchesCat && matchesStatus;
    });
  }, [rawItems, keyword, categoryId, status]);

  const items = filteredItems;

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

  // ==========================================
  // MỤC 9: HÀNH ĐỘNG CHỈNH SỬA & XÓA SẢN PHẨM
  // ==========================================
  const handleEditProduct = (product: ProductItem) => {
    setEditingProduct(product);
  };

  const handleOpenDelete = (product: ProductItem) => {
    setDeletingProduct(product);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setDeleteBusy(true);
    setError('');
    try {
      const result = await productsListApi.delete(deletingProduct.id);
      setNotice(result.message || `Đã xóa sản phẩm “${deletingProduct.name}”.`);
      setDeletingProduct(null);
      await fetchProducts();
    } catch (err: any) {
      setError(err?.message || 'Lỗi khi xóa sản phẩm');
    } finally {
      setDeleteBusy(false);
    }
  };

  const handlePrintAll = () => {
    const allVariants: PrintableVariant[] = items.flatMap((p) =>
      p.skus.map((s, idx) => ({
        id: s.id,
        sku: s.sku,
        barcode: s.barcode || s.sku,
        templateName: p.name,
        attributeText: `Biến thể #${idx + 1}`,
        price: s.basePrice,
      })),
    );
    if (allVariants.length === 0) {
      setError('Chưa có sản phẩm hoặc biến thể nào để in tem mã vạch.');
      return;
    }
    setBarcodeVariants(allVariants);
  };

  const handlePrintProduct = (product: ProductItem) => {
    const printable: PrintableVariant[] = product.skus.map((s, idx) => ({
      id: s.id,
      sku: s.sku,
      barcode: s.barcode || s.sku,
      templateName: product.name,
      attributeText: `Biến thể #${idx + 1}`,
      price: s.basePrice,
    }));
    if (printable.length === 0) {
      setError(`Sản phẩm “${product.name}” chưa có biến thể nào.`);
      return;
    }
    setBarcodeVariants(printable);
  };

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
              Quản lý danh sách product_templates, chỉnh sửa thông tin, xóa an toàn và tra cứu tức thì dưới 15ms.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/inventory"
              className="h-10 px-3.5 inline-flex items-center gap-1.5 rounded-lg border border-[#cfd2ff] bg-white text-[#4f46e5] text-[12.5px] font-semibold hover:bg-[#eef0ff] shadow-sm transition-colors"
            >
              <Icon name="receipt_long" className="text-[18px]" />
              Phiếu kiểm kê kho
            </Link>
            <button
              type="button"
              onClick={handlePrintAll}
              className="h-10 px-3.5 inline-flex items-center gap-1.5 rounded-lg border border-[#cfd2ff] bg-white text-[#4f46e5] text-[12.5px] font-semibold hover:bg-[#eef0ff] shadow-sm transition-colors"
            >
              <Icon name="print" className="text-[18px]" />
              In tem mã vạch
            </button>
            <button
              type="button"
              onClick={() => setShowScannerModal(true)}
              className="h-10 px-3.5 inline-flex items-center gap-1.5 rounded-lg border border-[#cfd2ff] bg-white text-[#4f46e5] text-[12.5px] font-semibold hover:bg-[#eef0ff] shadow-sm transition-colors"
            >
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
          <div className="mt-4 rounded-lg bg-[#ecfdf3] border border-[#abefc6] text-[#067647] text-[12.5px] px-4 py-2.5 flex items-center justify-between">
            <span>{notice}</span>
            <button onClick={() => setNotice('')} className="text-[#067647] hover:opacity-75">✕</button>
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
            <button
              onClick={() => setStatus('missing-category')}
              className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-[#d92d20] bg-[#fee4e2] rounded-md px-2.5 py-1.5 hover:bg-[#fdd8d5]"
            >
              Gán ngay
              <Icon name="arrow_forward" className="text-[12px]" />
            </button>
          </StatCard>
        </div>

        {/* Filters */}
        <div className="mt-4 bg-white rounded-xl border border-[#e8eaf0] p-3 flex flex-wrap items-center gap-2.5 shadow-sm">
          <div className="relative flex-1 min-w-[260px]">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#98a2b3]" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm kiếm sản phẩm theo tên, mã sản phẩm hoặc SKU (Tra cứu tức thì < 15ms)..."
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
              <ProductCard
                key={product.id}
                product={product}
                onView={setSelected}
                onEdit={handleEditProduct}
                onDelete={handleOpenDelete}
                onQuickCategory={(p) => setQuickCategoryProduct(p)}
                onPrintBarcode={handlePrintProduct}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 bg-white rounded-xl border border-[#e8eaf0] overflow-hidden shadow-sm">
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
                  <th className="text-right font-medium px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((product) => (
                  <tr key={product.id} className="border-t border-[#f2f4f7] hover:bg-[#fafbff]">
                    <td className="px-4 py-3 font-mono text-[11.5px] font-semibold text-[#4f46e5]">{product.code}</td>
                    <td className="px-4 py-3 font-semibold text-[#101828]">
                      <button
                        onClick={() => setSelected(product)}
                        className="text-left hover:text-[#4f46e5]"
                      >
                        {product.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[#667085]">
                      {product.categoryPath ? (
                        product.categoryPath
                      ) : (
                        <button
                          type="button"
                          onClick={() => setQuickCategoryProduct(product)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#e64a19] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded hover:bg-orange-100 transition-colors"
                        >
                          <Icon name="sell" className="text-[13px]" /> Gán ngay
                        </button>
                      )}
                    </td>
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
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handlePrintProduct(product)}
                          title="In tem mã vạch Barcode"
                          className="w-7 h-7 grid place-items-center rounded border border-[#d7d9e6] text-[#475467] hover:bg-[#eef2ff] hover:text-[#4f46e5]"
                        >
                          <Icon name="print" className="text-[14px]" />
                        </button>
                        <button
                          onClick={() => handleEditProduct(product)}
                          title="Chỉnh sửa sản phẩm"
                          className="w-7 h-7 grid place-items-center rounded border border-[#d7d9e6] text-[#475467] hover:bg-[#eef2ff] hover:text-[#4f46e5]"
                        >
                          <Icon name="edit" className="text-[14px]" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(product)}
                          title="Xóa sản phẩm"
                          className="w-7 h-7 grid place-items-center rounded border border-[#d7d9e6] text-[#475467] hover:bg-[#fef3f2] hover:text-[#d92d20]"
                        >
                          <Icon name="delete" className="text-[14px]" />
                        </button>
                      </div>
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

      {selected && (
        <SkuModal
          product={selected}
          onClose={() => setSelected(null)}
          onPrintVariants={(v) => setBarcodeVariants(v)}
          onOpenLots={(sku, prod) => setViewingLots({ sku, product: prod })}
        />
      )}

      {viewingLots && (
        <VariantLotsModal
          sku={viewingLots.sku}
          product={viewingLots.product}
          onClose={() => setViewingLots(null)}
        />
      )}

      {/* MODAL IN TEM MÃ VẠCH TẬP TRUNG */}
      {barcodeVariants && (
        <BarcodePrintModal
          shopName={business?.name || "CỬA HÀNG ERP"}
          variants={barcodeVariants}
          onClose={() => setBarcodeVariants(null)}
        />
      )}

      {showScannerModal && (
        <BarcodeScannerModal
          products={rawItems}
          onClose={() => {
            stopAllGlobalMediaStreams();
            setShowScannerModal(false);
          }}
          onSelectProduct={(p) => setSelected(p)}
        />
      )}

      {/* MODAL CHỈNH SỬA NHANH SẢN PHẨM & BIẾN THỂ */}
      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          categories={categories}
          onClose={() => setEditingProduct(null)}
          onSaved={() => {
            setNotice(`Đã cập nhật thông tin sản phẩm “${editingProduct.name}”.`);
            setEditingProduct(null);
            void fetchProducts();
          }}
        />
      )}

      {/* MODAL GÁN NHANH DANH MỤC (1-CLICK KHÔNG CẦN QUA WIZARD) */}
      {quickCategoryProduct && (
        <QuickCategoryModal
          product={quickCategoryProduct}
          categories={categories}
          onClose={() => setQuickCategoryProduct(null)}
          onSaved={() => {
            setNotice(`Đã gán danh mục thành công cho “${quickCategoryProduct.name}”.`);
            setQuickCategoryProduct(null);
            void fetchProducts();
          }}
        />
      )}

      {/* MODAL XÁC NHẬN XÓA SẢN PHẨM CHA */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
              <Icon name="delete_forever" className="text-[26px]" />
            </div>
            <h3 className="text-[18px] font-bold text-gray-900">Xóa sản phẩm</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-gray-600">
              Bạn có chắc chắn muốn xóa sản phẩm <b className="text-gray-900 font-semibold">“{deletingProduct.name}”</b> ({deletingProduct.code})?
            </p>
            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-[12px] text-amber-800">
              <b>Lưu ý:</b> Nếu sản phẩm chưa có giao dịch kho, hệ thống sẽ xóa hoàn toàn cả {deletingProduct.variantCount} biến thể. Nếu đã phát sinh giao dịch, hệ thống sẽ tự động chuyển sang trạng thái <b>Ngừng bán</b> để đảm bảo toàn vẹn số liệu kế toán.
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => setDeletingProduct(null)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => void handleConfirmDelete()}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteBusy ? 'Đang xử lý...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
