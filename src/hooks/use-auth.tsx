import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { getApplicationProfile, signOut } from "@/services/auth.service";
import { supabase } from "@/lib/supabase";
import type { AuthProfile } from "@/types/auth.types";

interface AuthContextValue {
  session: Session | null;
  profile: AuthProfile | null;
  loading: boolean;
  profileError: string | null;
  refreshProfile: () => Promise<AuthProfile>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    const nextProfile = await getApplicationProfile();
    setProfile(nextProfile);
    setProfileError(null);
    return nextProfile;
  }, []);

  useEffect(() => {
    let active = true;
    const loadProfile = async (nextSession: Session | null) => {
      setSession(nextSession);
      setProfile(null);
      setProfileError(null);
      if (!nextSession) {
        if (active) setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const nextProfile = await getApplicationProfile();
        if (active) setProfile(nextProfile);
      } catch (error) {
        if (active) {
          setProfileError(
            error instanceof Error ? error.message : "Không tải được hồ sơ.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void loadProfile(nextSession);
    });
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        return loadProfile(data.session);
      })
      .catch((error: unknown) => {
        if (active) {
          setProfileError(
            error instanceof Error ? error.message : "Không khởi tạo được phiên.",
          );
          setLoading(false);
        }
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ session, profile, loading, profileError, refreshProfile, logout }),
    [session, profile, loading, profileError, refreshProfile, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
