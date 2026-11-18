# F04 — Giao diện bán hàng tại quầy

Vào **Đơn hàng & thanh toán** (`/app/orders`), chọn **Bán lẻ & thanh toán**, nằm cạnh **Mua hàng & thanh toán NCC**.

## Các màn hình

| Đường dẫn | Chức năng |
| --- | --- |
| `/sales/new` | Mở ca, tìm SKU, giỏ hàng, chọn/tạo khách và tạo đơn nháp |
| `/sales` | Tìm đơn theo mã, lọc trạng thái/ngày và phân trang |
| `/sales/:id` | Xem sản phẩm/lô, xác nhận thu tiền, hủy nháp và xem lịch sử thanh toán |
| `/sales/customers` | Tạo/tìm khách theo tên hoặc số điện thoại, phân trang |

Dùng cùng header và phong cách với F03; chọn liên kết **Đơn hàng & thanh toán** để quay lại nhóm nghiệp vụ. API sử dụng Bearer token qua `apiRequest`, cấu hình `VITE_API_URL` giống các màn hình hiện có.

## Quyền và hành vi

- `orders.read`: xem đơn và khách hàng. `orders.create`: mở ca, tạo khách/đơn và thao tác thanh toán/hủy. `inventory.read`: tìm SKU để bán.
- Chỉ người tạo đơn được thanh toán/hủy nháp; thanh toán cần ca gốc của người đó vẫn OPEN.
- Mở ca sử dụng chung ca OPEN với F03. Tạo đơn không giữ hàng hoặc trừ kho.
- Giá hiển thị trong giỏ là dự kiến từ danh mục; giá chính thức lấy từ response tạo đơn. Người bán kiểm tra tổng trên màn hình thanh toán trước khi thu tiền.
- Chỉ thu đủ một lần qua tiền mặt hoặc chuyển khoản. Nút xác nhận chỉ bật sau khi tích **đã nhận đủ tiền**. Chuyển khoản cần kiểm tra tài khoản thực tế; giao diện không tạo QR hoặc xác minh ngân hàng.
- Lô FEFO được backend phân bổ khi thanh toán; chi tiết đơn hoàn tất hiển thị lô/hạn dùng.
- Nếu thao tác báo lỗi/mất kết nối, tải lại đơn để kiểm tra trạng thái trước khi thử lại. Nếu tạo đơn bị mất kết nối, tra mã đơn đã dùng trước khi tạo lại.
- UI không hiển thị giá vốn/lợi nhuận. Việc bảo vệ các trường tài chính ở backend vẫn là vấn đề riêng đã được ghi nhận trong rà soát F04.

## Kiểm tra thủ công

1. Vào nhóm Đơn hàng & thanh toán; cả Đặt mua và Bán lẻ đều có liên kết hoạt động. Kiểm tra hai nhóm bằng tài khoản đủ quyền và tài khoản chỉ đọc.
2. Bán tại quầy: mở ca, tìm SKU theo tên/mã, thêm một SKU nhiều lần và sửa số lượng. Tổng dự kiến cập nhật, xóa dòng được. SKU hết tồn tổng không thêm được; backend kiểm tra phần tồn bán được.
3. Chọn khách cũ hoặc thêm khách ngay trong giỏ; xác nhận giỏ không mất khi thêm khách. Khách vãng lai không cần tạo khách.
4. Tạo nháp, kiểm tra mã, giá/tổng chính thức và khách hàng. Trước thanh toán tồn chưa giảm.
5. Chọn tiền mặt, xác nhận đã nhận đủ tiền rồi thanh toán. Đơn chuyển Đã thanh toán, tồn giảm đúng; tải lại không xuất hiện nút thu lần nữa.
6. Với đơn mới, chọn chuyển khoản, nhập mã giao dịch nếu có, kiểm tra tiền nhận thực tế rồi xác nhận. Lịch sử hiển thị phương thức/tham chiếu đúng.
7. Bán SKU nhiều lô, kiểm tra chi tiết đơn hoàn tất có các dòng FEFO đúng lô/số lượng/hạn dùng.
8. Hủy nháp qua bước xác nhận; đơn hủy không còn nút thanh toán, tồn giữ nguyên.
9. Tìm/lọc/phân trang đơn và khách hàng. Search ở header trên màn hình bán chỉ thay kết quả SKU, không xóa giỏ.
10. Kiểm tra thiếu quyền, ca gốc đã đóng, người khác mở đơn nháp, thiếu tồn sau khi tạo nháp, API lỗi và mất mạng. Nút ghi không gửi lặp khi đang xử lý; lỗi hiển thị và có đường tải lại/tra cứu.
11. Kiểm tra bố cục trên màn hình hẹp: sản phẩm và giỏ xếp dọc; bảng chi tiết cuộn ngang.

Kiểm tra build: `npm run build`. Test validation dùng chung F03: `node --test --test-isolation=none tests/purchases.test.mjs`. Kiểm thử nghiệp vụ backend và hướng dẫn Swagger: `abc-backend/docs/f04-sales.md`.
