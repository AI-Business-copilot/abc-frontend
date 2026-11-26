export function SyntheticDemoNotice({ items }: { items: readonly { sku: string }[] }) {
  if (!items.some((item) => item.sku.startsWith("DEMO-"))) return null;

  return (
    <div className="bd-notice warning" role="status">
      Mặt hàng có SKU bắt đầu bằng “DEMO-” dùng dữ liệu giả lập phục vụ trình diễn. Các kết quả liên quan không phản ánh nhu cầu thực tế và không chứng minh độ chính xác của dự báo.
    </div>
  );
}
