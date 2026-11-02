# F03 — Giao diện đặt mua và thanh toán NCC

Truy cập **Đơn hàng & thanh toán** ở menu (`/app/orders`), chọn **Mua hàng & thanh toán NCC** (`/purchases`).
Trang chọn nhóm có **Bán lẻ & thanh toán** cho F04: `/sales/new` để bán tại quầy, `/sales` để xem đơn, `/sales/customers` để quản lý khách. Xem thêm [hướng dẫn giao diện F04](f04-sales-ui.md). F03 dùng chung header/tab ngang với Sản phẩm & Tồn kho. Các liên kết chi tiết cũ `/app/orders/...` tự chuyển sang `/purchases/...`.

Các trang F03: `/purchases`, `/purchases/new`, `/purchases/:id`, `/purchases/:id/edit`, `/purchases/receipts`, `/purchases/receipts/:id`, `/purchases/suppliers`. Ô tìm trên header dùng Enter để tra cứu danh sách theo tab hiện tại.
Đây là mua hàng từ NCC; tồn đầu kỳ vẫn ở `/inventory`.

Nút **Tạo đơn đặt mua** mở popup ngay trên danh sách. Popup có nút Đóng/Hủy và phím Esc, chặn đóng khi đang lưu. Lưu thành công sẽ đóng popup, tải lại danh sách và hiện liên kết xem đơn vừa tạo. Đường dẫn `/purchases/new` cũng mở popup trên nền danh sách; sửa đơn vẫn dùng trang riêng.

## Điều kiện

- FE cấu hình `VITE_API_URL` trỏ tới backend có F03, đăng nhập và thuộc cửa hàng.
- Xem F03: `inventory.read` + `finance.read`.
- Tạo NCC, tạo/sửa/hủy/đóng PO, nhận hàng, mở ca, thanh toán và áp dụng đối soát: thêm `inventory.receive`.
- Sửa lượng/giá phiếu nhận: thêm `inventory.adjust`.
- Kiểm đếm xem trước cần backend có `PURCHASE_DRAFT_SECRET` tối thiểu 32 ký tự. Nút **Nhận hàng ngay** dùng API nhận trực tiếp.
- Có SKU đang hoạt động; mở ca của chính người thao tác trước khi trả tiền NCC. Không cần ca nếu trả 0.

## Màn hình và API

| Màn hình | API |
| --- | --- |
| Đơn đặt mua | GET/POST `/purchases/orders`, GET/PATCH `/purchases/orders/:id`, POST `cancel`, `close` |
| Kiểm đếm, nhận hàng trong chi tiết PO | POST `/purchases/orders/:id/receipts`, `receipt-drafts`, `receipt-drafts/confirm` |
| Phiếu nhận và thanh toán | GET `/purchases/receipts`, GET `/purchases/receipts/:id`, PATCH `items`, PATCH `payment`, GET `payments` |
| Ca thanh toán | GET `/purchases/cash-shifts/current`, POST `/purchases/cash-shifts` |
| Nhà cung cấp | GET/POST `/purchases/suppliers`, GET/POST `/purchases/suppliers/:id/debt-reconciliation` |
| Chọn SKU | GET `/inventory/variants?search=...&limit=50` |

Danh sách PO/phiếu nhận có tìm kiếm, trạng thái, khoảng ngày và phân trang. Danh sách NCC có tìm kiếm và phân trang. Khi tạo PO, tìm NCC/SKU theo tên hoặc mã cụ thể nếu chưa có trong kết quả đầu.

## Kiểm tra thủ công với DB thử nghiệm

1. Vào NCC, tạo NCC mới; vào Đơn đặt mua, tạo PO 10 SKU không quản lý lô × 50.000đ. Xác nhận đơn ORDERED, chưa tăng kho/nợ. Sửa giá/ngày khi chưa nhận.
2. Mở chi tiết PO → Nhận hàng → mở ca tiền đầu ca 0 → nhập thực nhận 4, giá 50.000đ, trả ngay 100.000đ → xem trước → xác nhận. PO thành nhận một phần, tồn tăng 4, nợ tăng 100.000đ.
3. Vào phiếu nhận, nhập **tổng đã trả mới 150.000đ**. Xác nhận khoản chi thêm 50.000đ; lịch sử có hai khoản chi, còn nợ 50.000đ.
4. Quay lại PO nhận 6 còn lại, trả 0. PO nhận đủ; tổng tiền nhận 500.000đ, tổng trả 150.000đ, nợ 350.000đ. Tải lại danh sách sản phẩm để đối chiếu tồn.
5. Với SKU quản lý lô: thêm hai dòng cùng SKU, khác lô/HSD. Tổng hai dòng không vượt còn thiếu; để 0 cho dòng chưa giao. Kiểm tra lỗi thiếu lô, sai ngày và nhận vượt số đặt.
6. Dùng PO khác để kiểm tra hủy khi chưa nhận, đóng phần thiếu khi nhận một phần. Đơn đã đóng/hủy/hoàn tất không có nút nhận thêm.
7. Sửa lượng/giá phiếu khi chưa có giao dịch kho tiếp theo. Xác nhận tồn, giá vốn, PO, nợ và ledger được cập nhật. Nếu có giao dịch sau hoặc dữ liệu thay đổi, backend phải từ chối; tải lại trước khi sửa lại.
8. Đối soát NCC: xem nợ đang lưu, nợ theo phiếu nhận, giá trị trả NCC và nợ tính lại. Chỉ áp dụng khi đã kiểm tra cơ sở tính không gồm nợ đầu kỳ/điều chỉnh ngoài chứng từ.
9. Thử tài khoản thiếu `finance.read` hoặc `inventory.read`: không gọi API F03. Chỉ có quyền đọc: không có thao tác ghi. Thiếu `inventory.adjust`: không sửa phiếu.
10. Kiểm tra danh sách rỗng, tìm không thấy, API lỗi và tải lại. Khi mất kết nối lúc lưu PO/nhận hàng, tra cứu mã cũ trước khi gửi lại. Bản xem trước nằm trong bộ nhớ trang và mất khi tải lại/chuyển trang; token hết hạn sau 1 giờ.

Kiểm tra tự động: `node --test tests/purchases.test.mjs`; kiểm tra biên dịch và bundle: `npm run build`.
