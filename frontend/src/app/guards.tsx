import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useMe } from "@/features/auth/api";
import { FullPageLoader } from "./FullPageLoader";

/** Only for signed-in users; others go to sign-in and come back afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const me = useMe();
  const location = useLocation();
  if (me.isPending) return <FullPageLoader />;
  if (!me.data) return <Navigate to="/sign-in" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

/** Sign-in and sign-up pages: skip them if already signed in. */
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const me = useMe();
  if (me.isPending) return <FullPageLoader />;
  if (me.data) return <Navigate to="/" replace />;
  return children;
}
