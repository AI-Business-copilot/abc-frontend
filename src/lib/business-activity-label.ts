import { getPermissionLabel } from "@/lib/permission-label";

const activityLabels: Record<string, string> = {
  "business.role.create": "Tạo vai trò",
  "business.role.update": "Cập nhật vai trò và quyền",
  "business.role.archive": "Lưu trữ vai trò",
  "business.role.restore": "Khôi phục vai trò",
  "membership.role.update": "Thay đổi vai trò thành viên",
  "membership.status.update": "Cập nhật trạng thái thành viên",
  "membership.invitation.create": "Mời nhân viên",
  "membership.invitation.revoke": "Thu hồi lời mời",
  "membership.invitation.accept": "Chấp nhận lời mời",
  "membership.invitation.delivery_failed": "Gửi lời mời thất bại",
  "business.profile.update": "Cập nhật hồ sơ doanh nghiệp",
  "business.create": "Tạo doanh nghiệp",
};

function displayPermissionList(value: unknown) {
  if (!Array.isArray(value)) return null;
  return value
    .filter((permission): permission is string => typeof permission === "string")
    .map(getPermissionLabel)
    .join(", ");
}

export function getBusinessActivityLabel(action: string) {
  return activityLabels[action] ?? "Hoạt động khác";
}

export function getBusinessActivitySummary(action: string, changes: Record<string, unknown> | null) {
  if (!changes) return "";
  const displayName = typeof changes.displayName === "string" ? changes.displayName : "";

  if (action === "business.role.create") {
    const permissions = displayPermissionList(changes.permissionCodes);
    return `Đã tạo vai trò "${displayName}"${permissions ? ` với ${permissions}.` : "."}`;
  }
  if (action === "business.role.update") {
    const nameChange = changes.displayName as { from?: unknown; to?: unknown } | undefined;
    const permissionChange = changes.permissionCodes as { from?: unknown; to?: unknown } | undefined;
    const parts: string[] = [];
    if (nameChange && nameChange.from !== nameChange.to) {
      parts.push(`Đổi tên "${String(nameChange.from ?? "")}" thành "${String(nameChange.to ?? "")}"`);
    } else if (typeof nameChange?.to === "string") {
      parts.push(`Vai trò "${nameChange.to}"`);
    }
    if (permissionChange) {
      const before = displayPermissionList(permissionChange.from) || "không có quyền";
      const after = displayPermissionList(permissionChange.to) || "không có quyền";
      parts.push(`Thay đổi quyền từ (${before}) thành (${after})`);
    }
    return parts.join(". ") + (parts.length ? "." : "");
  }
  if (action === "business.role.archive" || action === "business.role.restore") {
    return `${action.endsWith("archive") ? "Đã lưu trữ" : "Đã khôi phục"} vai trò "${displayName}".`;
  }
  if (action === "membership.role.update") {
    const roleChange = changes.role as { from?: unknown; to?: unknown } | undefined;
    if (roleChange) {
      return `Đổi vai trò từ "${String(roleChange.from ?? "không rõ")}" thành "${String(roleChange.to ?? "không rõ")}".`;
    }
  }
  return "";
}
