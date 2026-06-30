"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, setUnauthorizedHandler, type User } from "@/lib/api";

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (
    username: string,
    password: string,
    totpCode?: string,
  ) => Promise<{ ok: boolean; message?: string; totpRequired?: boolean }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const refresh = useCallback(async () => {
    const res = await api.self();
    setUser(res.success && res.data ? res.data : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // 401-Auto-Logout: nur wenn eine Session bestand → ausloggen + zur Login-Seite.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (userRef.current) {
        userRef.current = null;
        setUser(null);
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      }
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(
    async (username: string, password: string, totpCode?: string) => {
      const res = await api.login(username, password, totpCode);
      if (res.success && res.data) {
        // Vollständige Daten (z. B. echtes Kontingent) von /self nachladen.
        await refresh();
        return { ok: true };
      }
      if (res.message === "totp_required" || res.data?.totp_required) {
        return { ok: false, totpRequired: true };
      }
      return { ok: false, message: res.message };
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
