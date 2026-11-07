import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Archive, KeyRound, Plus, RefreshCw, ShieldCheck, UsersRound } from "lucide-react";

import { AppLayout } from "@/components/layout/app-layout";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/common/form-field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { getPermissionDescription, getPermissionLabel } from "@/lib/permission-label";
import {
  archiveBusinessRole,
  createBusinessRole,
  listBusinessRoles,
  restoreBusinessRole,
  updateBusinessRole,
  type BusinessPermission,
  type BusinessRole,
} from "@/services/business.service";

const permissionGroupLabels: Record<string, string> = {
  business: "Doanh nghiệp",
  employees: "Nhân sự",
  products: "Sản phẩm",
  inventory: "Kho vận",
  orders: "Đơn hàng",
  promotions: "Khuyến mãi",
  business_data: "Dữ liệu kinh doanh",
  cash: "Ca trực & tiền mặt",
  vendor_returns: "Trả hàng nhà cung cấp",
  finance: "Tài chính",
  analytics: "Báo cáo",
  copilot: "Trợ lý kinh doanh",
};

export function BusinessRolesPage() {
  const [roles, setRoles] = useState<BusinessRole[]>([]);
  const [permissions, setPermissions] = useState<BusinessPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editorRole, setEditorRole] = useState<BusinessRole | null | undefined>(undefined);
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [actionTarget, setActionTarget] = useState<{ role: BusinessRole; action: "archive" | "restore" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listBusinessRoles();
      setRoles(result.roles);
      setPermissions(result.permissions);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải vai trò.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const permissionGroups = useMemo(() => {
    const groups = new Map<string, BusinessPermission[]>();
    for (const permission of permissions) {
      const group = permission.code.split(".")[0] ?? "other";
      groups.set(group, [...(groups.get(group) ?? []), permission]);
    }
    return [...groups.entries()];
  }, [permissions]);
  const defaultStaffPermissions = useMemo(
    () => new Set(roles.find((role) => role.isDefault)?.permissionCodes ?? []),
    [roles],
  );

  function openCreate() {
    setEditorRole(null);
    setDisplayName("");
    setDescription("");
    setSelectedPermissions([]);
    setReason("");
    setError("");
  }

  function openEdit(role: BusinessRole) {
    setEditorRole(role);
    setDisplayName(role.displayName);
    setDescription(role.description ?? "");
    setSelectedPermissions(role.permissionCodes);
    setReason("");
    setError("");
  }

  async function saveRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const input = {
        displayName: displayName.trim(),
        description: description.trim() || null,
        permissionCodes: selectedPermissions,
        reason: reason.trim(),
      };
      if (editorRole?.id) {
        await updateBusinessRole(editorRole.id, input);
        setNotice(`Đã cập nhật vai trò "${input.displayName}".`);
      } else {
        await createBusinessRole(input);
        setNotice(`Đã tạo vai trò "${input.displayName}".`);
      }
      setEditorRole(undefined);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không thể lưu vai trò.");
    } finally {
      setBusy(false);
    }
  }

  async function runRoleAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!actionTarget) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (actionTarget.action === "archive") {
        await archiveBusinessRole(actionTarget.role.id, reason.trim());
        setNotice(`Đã lưu trữ vai trò "${actionTarget.role.displayName}".`);
      } else {
        await restoreBusinessRole(actionTarget.role.id, reason.trim());
        setNotice(`Đã khôi phục vai trò "${actionTarget.role.displayName}".`);
      }
      setActionTarget(null);
      setReason("");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không thể cập nhật vai trò.");
    } finally {
      setBusy(false);
    }
  }

  function togglePermission(code: string) {
    setSelectedPermissions((current) =>
      current.includes(code) ? current.filter((value) => value !== code) : [...current, code],
    );
  }

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <span className="eyebrow">PHÂN QUYỀN DOANH NGHIỆP</span>
          <h1>Vai trò &amp; quyền hạn</h1>
          <p>Tạo vai trò theo công việc và kiểm soát quyền truy cập của từng nhân viên.</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> Tạo vai trò</Button>
      </div>
      {error && <Alert className="mb-5" variant="destructive">{error}</Alert>}
      {notice && <Alert className="mb-5" variant="success">{notice}</Alert>}
      <Card className="mb-5 border-violet-100 bg-violet-50/60">
        <CardContent className="flex items-start gap-3 py-4 text-sm text-violet-950">
          <ShieldCheck className="mt-0.5 shrink-0 text-violet-700" size={18} />
          <p className="m-0">Quyền quản trị doanh nghiệp, xem nhật ký hoạt động và các thao tác duyệt chỉ dành cho Owner luôn được giữ riêng. Thay đổi vai trò được ghi nhận trong nhật ký kiểm toán.</p>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? <Card><CardContent className="empty-state"><span className="loading-bar" />Đang tải vai trò…</CardContent></Card>
          : roles.map((role) => (
            <Card className={role.isArchived ? "opacity-70" : ""} key={role.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><KeyRound size={18} /></span>
                    <div><CardTitle>{role.displayName}</CardTitle><p className="mt-1 text-sm text-slate-500">{role.isDefault ? "Vai trò nhân viên mặc định" : role.description || "Vai trò tùy chỉnh"}</p></div>
                  </div>
                  {role.isArchived && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Đã lưu trữ</span>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex gap-4 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1.5"><UsersRound size={15} /> {role.memberCount} thành viên</span>
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} /> {role.permissionCodes.length} quyền</span>
                </div>
                <div className="mb-4 flex min-h-12 flex-wrap gap-1.5">
                  {role.permissionCodes.slice(0, 5).map((code) => <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700" key={code}>{getPermissionLabel(code)}</span>)}
                  {role.permissionCodes.length > 5 && <span className="px-1 py-1 text-xs text-slate-500">+{role.permissionCodes.length - 5} quyền</span>}
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                  {role.isArchived
                    ? <Button disabled={busy} onClick={() => { setReason(""); setActionTarget({ role, action: "restore" }); }} size="sm" variant="outline">Khôi phục</Button>
                    : <>
                      <Button disabled={busy} onClick={() => openEdit(role)} size="sm" variant="outline">Chỉnh sửa</Button>
                      {!role.isDefault && <Button disabled={busy} onClick={() => { setReason(""); setActionTarget({ role, action: "archive" }); }} size="sm" variant="ghost"><Archive size={14} /> Lưu trữ</Button>}
                    </>}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
      {!loading && roles.length === 0 && <Card><CardContent className="empty-state">Chưa có vai trò nào. Tạo vai trò đầu tiên để cấp quyền phù hợp cho nhân viên.</CardContent></Card>}
      <div className="mt-5 flex justify-end"><Button disabled={loading} onClick={() => void load()} size="sm" variant="outline"><RefreshCw size={14} /> Làm mới</Button></div>

      <Modal open={editorRole !== undefined} onClose={() => setEditorRole(undefined)} title={editorRole?.id ? "Chỉnh sửa vai trò" : "Tạo vai trò"}>
        <form className="grid gap-4" onSubmit={(event) => void saveRole(event)}>
          <FormField id="role-display-name" label="Tên vai trò">
            <Input id="role-display-name" maxLength={100} onChange={(event) => setDisplayName(event.target.value)} required value={displayName} />
          </FormField>
          <label className="grid gap-2 text-sm font-medium" htmlFor="role-description">Mô tả
            <textarea className="min-h-20 rounded-md border border-slate-300 p-3 text-sm" id="role-description" maxLength={1000} onChange={(event) => setDescription(event.target.value)} value={description} />
          </label>
          <fieldset className="grid gap-3">
            <legend className="mb-2 text-sm font-semibold">Quyền nghiệp vụ ({selectedPermissions.length} đã chọn)</legend>
            <div className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900">
              <span className="h-3 w-3 rounded-sm border border-violet-500 bg-violet-200" aria-hidden="true" />
              Được tô màu và gắn nhãn là quyền đang có trong vai trò Nhân viên mặc định.
            </div>
            <div className="grid max-h-72 gap-4 overflow-y-auto rounded-xl border border-slate-200 p-3">
              {permissionGroups.map(([group, groupPermissions]) => <div key={group}>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{permissionGroupLabels[group] ?? "Nhóm quyền khác"}</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {groupPermissions.map((permission) => {
                    const isDefaultStaffPermission = defaultStaffPermissions.has(permission.code);
                    return (
                      <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm transition-colors ${isDefaultStaffPermission ? "border-violet-200 bg-violet-50/80 hover:bg-violet-100" : "border-transparent hover:bg-slate-50"}`} key={permission.code}>
                        <input checked={selectedPermissions.includes(permission.code)} className="mt-1 accent-violet-600" onChange={() => togglePermission(permission.code)} type="checkbox" />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="font-medium text-slate-800">{getPermissionLabel(permission.code)}</span>
                            {isDefaultStaffPermission && <span className="rounded-full bg-violet-200 px-2 py-0.5 text-[10px] font-semibold text-violet-900">Mặc định Nhân viên</span>}
                          </span>
                          <span className="mt-1 block text-xs leading-relaxed text-slate-600">{getPermissionDescription(permission.code)}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>)}
            </div>
          </fieldset>
          <label className="grid gap-2 text-sm font-medium" htmlFor="role-reason">Lý do thay đổi
            <textarea className="min-h-20 rounded-md border border-slate-300 p-3 text-sm" id="role-reason" maxLength={1000} minLength={5} onChange={(event) => setReason(event.target.value)} required value={reason} />
          </label>
          <div className="flex justify-end gap-2"><Button onClick={() => setEditorRole(undefined)} type="button" variant="outline">Hủy</Button><Button disabled={busy || selectedPermissions.length === 0} type="submit">{busy ? "Đang lưu…" : "Lưu vai trò"}</Button></div>
        </form>
      </Modal>

      <Modal open={Boolean(actionTarget)} onClose={() => setActionTarget(null)} title={actionTarget?.action === "archive" ? "Lưu trữ vai trò" : "Khôi phục vai trò"}>
        <form className="grid gap-4" onSubmit={(event) => void runRoleAction(event)}>
          <p className="text-sm text-slate-600">Vai trò: <strong>{actionTarget?.role.displayName}</strong></p>
          <label className="grid gap-2 text-sm font-medium" htmlFor="role-action-reason">Lý do thay đổi
            <textarea className="min-h-24 rounded-md border border-slate-300 p-3 text-sm" id="role-action-reason" maxLength={1000} minLength={5} onChange={(event) => setReason(event.target.value)} required value={reason} />
          </label>
          <div className="flex justify-end gap-2"><Button onClick={() => setActionTarget(null)} type="button" variant="outline">Hủy</Button><Button disabled={busy} type="submit">{busy ? "Đang cập nhật…" : "Xác nhận"}</Button></div>
        </form>
      </Modal>
    </AppLayout>
  );
}
