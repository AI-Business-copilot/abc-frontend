import { ToastContainer } from "react-toastify";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function PurchaseDialog({ title, description, busy = false, onClose, children, compact = false, toastContainerId }: { title: string; description?: string; busy?: boolean; onClose: () => void; children: ReactNode; compact?: boolean; toastContainerId?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current!;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  return <dialog ref={dialog} className={`purchase-create-dialog${compact ? " purchase-compact-dialog" : ""}`} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    {toastContainerId && <ToastContainer containerId={toastContainerId} position="top-right" autoClose={5000} closeOnClick pauseOnHover pauseOnFocusLoss newestOnTop limit={3} />}
    <div className="purchase-dialog-header"><div><h2 id={titleId}>{title}</h2>{description && <p>{description}</p>}</div><button type="button" className="purchase-dialog-close" aria-label="Đóng cửa sổ" disabled={busy} onClick={onClose}><X size={20} aria-hidden="true" /></button></div>
    <div className="purchase-dialog-body">{children}<div className="purchase-actions purchase-dialog-footer"><button type="button" disabled={busy} onClick={onClose}>Đóng</button></div></div>
  </dialog>;
}
