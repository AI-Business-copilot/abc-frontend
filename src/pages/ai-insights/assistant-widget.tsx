import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MessageCircle, X } from "lucide-react";
import { Workspace } from "./assistant-page";
import "./assistant-widget.css";

export function AssistantWidget({ isOwner }: { isOwner: boolean }) {
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  const { pathname } = useLocation();
  const onAssistantPage = pathname === "/app/assistant";
  return <div className="assistant-widget" hidden={onAssistantPage}>
    <section className="assistant-widget-panel" aria-label="Trợ lý kinh doanh" hidden={!open}>
      <header className="assistant-widget-header">
        <strong>Hỏi đáp kinh doanh</strong>
        <div><Link to="/app/assistant">Mở trang đầy đủ</Link>
          <button type="button" aria-label="Đóng trợ lý" onClick={() => setOpen(false)}><X size={19} /></button></div>
      </header>
      <div className="assistant-widget-body">{visited && <Workspace isOwner={isOwner} compact />}</div>
    </section>
    <button className="assistant-widget-toggle" type="button" aria-expanded={open} onClick={() => { setVisited(true); setOpen(!open); }}>
      <MessageCircle size={20} aria-hidden="true" /> {open ? "Thu gọn trợ lý" : "Hỏi trợ lý"}
    </button>
  </div>;
}
