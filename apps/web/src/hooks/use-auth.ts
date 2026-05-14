import { useEffect, useState } from "react";
import { formatHeaders } from "@/lib/api";
import { useConnectionStore } from "@/stores/connection-store";

interface AuthState {
  loading: boolean;
  authEnabled: boolean;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  role: string | null;
  permissions: string[];
  analyticsEnabled: boolean | null;
  analyticsConsentShownAt: number | null;
  analyticsConsentRemindAt: number | null;
  oidcEnabled: boolean;
  oidcProviderName: string | null;
  loginMethod: string | null;
  hasLocalPassword: boolean;
}

const USER_PERMISSIONS = [
  "tools:use",
  "files:own",
  "apikeys:own",
  "pipelines:own",
  "settings:read",
];

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    loading: true,
    authEnabled: false,
    isAuthenticated: false,
    mustChangePassword: false,
    role: null,
    permissions: [],
    analyticsEnabled: null,
    analyticsConsentShownAt: null,
    analyticsConsentRemindAt: null,
    oidcEnabled: false,
    oidcProviderName: null,
    loginMethod: null,
    hasLocalPassword: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const configRes = await fetch("/api/v1/config/auth");
        const config = await configRes.json();

        if (!config.authEnabled) {
          if (!cancelled)
            setState({
              loading: false,
              authEnabled: false,
              isAuthenticated: true,
              mustChangePassword: false,
              role: "user",
              permissions: USER_PERMISSIONS,
              analyticsEnabled: null,
              analyticsConsentShownAt: null,
              analyticsConsentRemindAt: null,
              oidcEnabled: false,
              oidcProviderName: null,
              loginMethod: null,
              hasLocalPassword: false,
            });
          return;
        }

        // Always call /api/auth/session -- OIDC users have a session cookie
        // (not a localStorage token), so we cannot skip based on token absence.
        const sessionRes = await fetch("/api/auth/session", {
          headers: formatHeaders(),
        });

        if (sessionRes.ok) {
          const session = await sessionRes.json();
          const mustChange = session.user?.mustChangePassword === true;
          if (!cancelled)
            setState({
              loading: false,
              authEnabled: true,
              isAuthenticated: true,
              mustChangePassword: mustChange,
              role: session.user?.role ?? null,
              permissions: session.user?.permissions ?? [],
              analyticsEnabled: session.user?.analyticsEnabled ?? null,
              analyticsConsentShownAt: session.user?.analyticsConsentShownAt ?? null,
              analyticsConsentRemindAt: session.user?.analyticsConsentRemindAt ?? null,
              oidcEnabled: config.oidcEnabled ?? false,
              oidcProviderName: config.oidcProviderName ?? null,
              loginMethod: session.user?.loginMethod ?? null,
              hasLocalPassword: session.user?.hasLocalPassword ?? false,
            });
        } else {
          localStorage.removeItem("snapotter-token");
          if (!cancelled)
            setState({
              loading: false,
              authEnabled: true,
              isAuthenticated: false,
              mustChangePassword: false,
              role: null,
              permissions: [],
              analyticsEnabled: null,
              analyticsConsentShownAt: null,
              analyticsConsentRemindAt: null,
              oidcEnabled: config.oidcEnabled ?? false,
              oidcProviderName: config.oidcProviderName ?? null,
              loginMethod: null,
              hasLocalPassword: false,
            });
        }
      } catch {
        // API unreachable — stay in loading state.
        // ConnectionBanner explains the outage. AuthGuard shows spinner.
      }
    }

    checkAuth();

    const unsubscribe = useConnectionStore.subscribe((curr, prev) => {
      if (prev.status !== "reconnected" && curr.status === "reconnected") {
        checkAuth();
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const hasPermission = (permission: string) => state.permissions.includes(permission);

  return { ...state, hasPermission };
}
