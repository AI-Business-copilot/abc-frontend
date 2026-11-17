import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { getNotifications, readNotifications, type NotificationItem, type NotificationPage } from "@/api/notifications";
import "./notification-bell.css";

export function NotificationBell() {
  const { profile } = useAuth();
  if (!profile?.business || profile.business.status !== "ACTIVE" || profile.business.membershipStatus !== "ACTIVE") return null;
  return <MemberNotificationBell key={`${profile.user.id}:${profile.business.id}:${profile.permissions.join(",")}`} />;
}

function MemberNotificationBell() {
  const navigate = useNavigate();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationPage | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const page = useRef(1);
  const controller = useRef<AbortController | null>(null);
  const mutation = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const alive = useRef(true);
  const refresh = useCallback(async (targetPage = page.current) => {
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    setLoading(true);
    try {
      const result = await getNotifications(targetPage, next.signal);
      if (next.signal.aborted || !alive.current) return;
      if (targetPage > 1 && !result.items.length) {
        page.current = 1;
        const first = await getNotifications(1, next.signal);
        if (!next.signal.aborted && alive.current) setData(first);
      } else {
        page.current = targetPage;
        setData(result);
      }
      if (!next.signal.aborted && alive.current) setError("");
    } catch (err) {
      if (!next.signal.aborted && alive.current) setError(err instanceof Error ? err.message : "Không tải được thông báo.");
    } finally {
      if (!next.signal.aborted && alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void refresh();
    const update = () => {
      if (document.visibilityState === "visible" && !mutation.current) void refresh();
    };
    const timer = window.setInterval(update, 30000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      alive.current = false;
      controller.current?.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const markRead = async (items: NotificationItem[], href?: string) => {
    if (mutation.current) return;
    mutation.current = true;
    controller.current?.abort();
    setSaving(true);
    try {
      const ids = items.filter(item => !item.readAt).map(item => item.id);
      if (ids.length) await readNotifications(ids);
      if (!alive.current) return;
      await refresh(1);
      if (href && alive.current) { setOpen(false); navigate(href); }
    } catch (err) {
      if (alive.current) setError(err instanceof Error ? err.message : "Không lưu được trạng thái đã đọc.");
    } finally {
      mutation.current = false;
      if (alive.current) setSaving(false);
    }
  };
  const unread = !error ? data?.unreadCount : undefined;
  return <div className="notification-bell" ref={root}>
    <button ref={trigger} type="button" className="notification-trigger" aria-label={error ? "Thông báo: chưa tải được" : unread ? `Thông báo: ${unread} chưa đọc` : "Thông báo"}
      aria-expanded={open} aria-controls={panelId} onClick={() => {
        setOpen(value => !value);
        if (!open && !mutation.current) void refresh(1);
      }}>
      <Bell size={21} aria-hidden="true" />
      {unread !== undefined && unread > 0 && <span className="notification-badge">{unread > 99 ? "99+" : unread}</span>}
      {error && <span className="notification-unavailable" aria-hidden="true">!</span>}
    </button>
    {open && <section id={panelId} className="notification-panel" aria-label="Danh sách thông báo" aria-busy={loading || saving}>
      <div className="notification-heading"><strong>Thông báo</strong><button type="button" disabled={loading || saving} onClick={() => void refresh()}>Làm mới</button></div>
      <p className="notification-hint">Các việc cần xử lý · cập nhật mỗi 30 giây</p>
      {error && <div className="notification-error" role="alert">{error}<button type="button" disabled={loading || saving} onClick={() => void refresh()}>Thử lại</button></div>}
      {loading && !data && <p className="notification-empty" role="status">Đang tải thông báo…</p>}
      {!error && data && <>
        {data.items.length === 0 ? <p className="notification-empty">Không có thông báo cần xử lý.</p> : <>
          <div className="notification-summary"><span>{data.unreadCount} chưa đọc</span><button type="button" disabled={loading || saving || !data.items.some(item => !item.readAt)} onClick={() => void markRead(data.items)}>Đọc trang này</button></div>
          <ul className="notification-list">{data.items.map(item => <li key={item.id} className={item.readAt ? "" : "notification-unread"}>
            <button type="button" className="notification-item" disabled={saving || loading} onClick={() => void markRead([item], item.href)}>
              <span className="notification-item-title">{!item.readAt && <span className="notification-dot" />} {item.title}</span>
              <span className="notification-message">{item.message}</span>
              <span className="notification-action">Xem chi tiết</span>
            </button>
            {!item.readAt && <button className="notification-read" type="button" disabled={saving || loading} onClick={() => void markRead([item])}>Đánh dấu đã đọc</button>}
          </li>)}</ul>
          {data.total > data.pageSize && <div className="notification-pagination">
            <button type="button" disabled={data.page === 1 || loading || saving} onClick={() => void refresh(data.page - 1)}>Trước</button>
            <span>Trang {data.page}/{Math.ceil(data.total / data.pageSize)}</span>
            <button type="button" disabled={data.page * data.pageSize >= data.total || loading || saving} onClick={() => void refresh(data.page + 1)}>Sau</button>
          </div>}
        </>}
      </>}
    </section>}
  </div>;
}
