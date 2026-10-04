import { Suspense, type ReactNode } from "react";
import { FullPageLoader } from "./FullPageLoader";

/** Wraps a lazily loaded page with its loading state. */
export function Page({ children }: { children: ReactNode }) {
  return <Suspense fallback={<FullPageLoader />}>{children}</Suspense>;
}
