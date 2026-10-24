import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { LoadingScreen } from "@/components/common/loading-screen";
import { acceptInvitation } from "@/services/business.service";
import { getApplicationProfile } from "@/services/auth.service";
import { supabase } from "@/lib/supabase";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function CallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function finishAuthentication() {
      try {
        const authError = searchParams.get("error_description") ?? searchParams.get("error");
        if (authError) throw new Error(authError);

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) throw new Error("Không tìm thấy phiên đăng nhập. Liên kết có thể đã hết hạn.");

        if (searchParams.get("mode") === "recovery") {
          navigate("/reset-password", { replace: true });
          return;
        }

        const invitationToken = searchParams.get("invitation_token");
        if (invitationToken) {
          await acceptInvitation(invitationToken);
          navigate("/app?invitation=accepted", { replace: true });
          return;
        }

        const profile = await getApplicationProfile();
        navigate(profile.onboardingRequired ? "/onboarding" : "/app", { replace: true });
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Không thể hoàn tất đăng nhập.");
      }
    }

    void finishAuthentication();
    return () => {
      active = false;
    };
  }, [navigate, searchParams]);

  if (error) {
    return <main className="callback-error"><div className="callback-error-card"><span className="eyebrow">CHƯA THỂ HOÀN TẤT</span><h1>Có vấn đề với liên kết</h1><Alert variant="destructive">{error}</Alert><div className="button-row"><Button onClick={() => navigate("/login")}>Về trang đăng nhập</Button><Button onClick={() => window.location.reload()} variant="outline">Thử lại</Button></div></div></main>;
  }
  return <LoadingScreen label="Đang xác thực tài khoản và thiết lập quyền…" />;
}
