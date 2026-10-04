import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router";
import { FullPageLoader } from "./FullPageLoader";
import { RedirectIfSignedIn, RequireAuth } from "./guards";
import { AppShell } from "./layouts/AppShell";
import { NotFound } from "./NotFound";

// Each page is its own chunk, so signing in doesn't download the whole app.
const SignInPage = lazy(() => import("@/features/auth/SignInPage").then((m) => ({ default: m.SignInPage })));
const SignUpPage = lazy(() => import("@/features/auth/SignUpPage").then((m) => ({ default: m.SignUpPage })));
const TodayPage = lazy(() => import("@/features/today/TodayPage").then((m) => ({ default: m.TodayPage })));

function Page({ children }: { children: ReactNode }) {
  return <Suspense fallback={<FullPageLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: "/sign-in",
    element: (
      <RedirectIfSignedIn>
        <Page>
          <SignInPage />
        </Page>
      </RedirectIfSignedIn>
    ),
  },
  {
    path: "/sign-up",
    element: (
      <RedirectIfSignedIn>
        <Page>
          <SignUpPage />
        </Page>
      </RedirectIfSignedIn>
    ),
  },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: (
          <Page>
            <TodayPage />
          </Page>
        ),
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
