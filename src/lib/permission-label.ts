const permissionLabels: Record<string, string> = {
  "business.read": "Xem thông tin doanh nghiệp",
  "business.update": "Cập nhật thông tin doanh nghiệp",
  "employees.read": "Xem danh sách nhân viên",
  "employees.manage": "Quản lý nhân viên",
  "invitations.manage": "Gửi và quản lý lời mời",
  "products.read": "Xem sản phẩm và giá bán",
  "products.manage": "Quản lý sản phẩm và giá bán",
  "inventory.read": "Xem hàng tồn kho",
  "inventory.receive": "Ghi nhận hàng nhập",
  "inventory.adjust": "Điều chỉnh số lượng hàng hóa",
  "orders.read": "Xem đơn hàng",
  "orders.create": "Tạo đơn hàng",
  "finance.read": "Xem thông tin tài chính",
  "analytics.read": "Xem báo cáo kinh doanh",
  "copilot.use": "Sử dụng trợ lý kinh doanh",
  "platform.users.manage": "Quản lý tài khoản người dùng",
  "platform.businesses.manage": "Quản lý doanh nghiệp",
  "platform.roles.manage": "Quản lý vai trò và quyền hạn",
  "platform.audit.read": "Xem lịch sử hoạt động hệ thống",
  "platform.settings.manage": "Quản lý cài đặt nền tảng",
};

export function getPermissionLabel(code: string) {
  return permissionLabels[code] ?? "Quyền truy cập khác";
}
