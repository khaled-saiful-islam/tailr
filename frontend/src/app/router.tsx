import { lazy } from "react";
import { createBrowserRouter } from "react-router";
import { RedirectIfSignedIn, RequireAuth } from "./guards";
import { AppShell } from "./layouts/AppShell";
import { NotFound } from "./NotFound";
import { Page } from "./Page";

// Each page is its own chunk, so signing in doesn't download the whole app.
const SignInPage = lazy(() =>
  import("@/features/auth/SignInPage").then((m) => ({ default: m.SignInPage })),
);
const SignUpPage = lazy(() =>
  import("@/features/auth/SignUpPage").then((m) => ({ default: m.SignUpPage })),
);
const TodayPage = lazy(() =>
  import("@/features/today/TodayPage").then((m) => ({ default: m.TodayPage })),
);
const ProfilePage = lazy(() =>
  import("@/features/profile/pages/ProfilePage").then((m) => ({
    default: m.ProfilePage,
  })),
);
const ImportPage = lazy(() =>
  import("@/features/profile/pages/ImportPage").then((m) => ({
    default: m.ImportPage,
  })),
);
const JobsPage = lazy(() =>
  import("@/features/brief/JobsPage").then((m) => ({ default: m.JobsPage })),
);
const JobDetailPage = lazy(() =>
  import("@/features/brief/JobDetailPage").then((m) => ({
    default: m.JobDetailPage,
  })),
);
const KitPage = lazy(() =>
  import("@/features/kits/KitPage").then((m) => ({ default: m.KitPage })),
);
const RadarPage = lazy(() =>
  import("@/features/radar/RadarPage").then((m) => ({ default: m.RadarPage })),
);
const ImportProgressPage = lazy(() =>
  import("@/features/profile/pages/ImportProgressPage").then((m) => ({
    default: m.ImportProgressPage,
  })),
);

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
      {
        path: "profile",
        element: (
          <Page>
            <ProfilePage />
          </Page>
        ),
      },
      {
        path: "profile/import",
        element: (
          <Page>
            <ImportPage />
          </Page>
        ),
      },
      {
        path: "profile/import/:importId",
        element: (
          <Page>
            <ImportProgressPage />
          </Page>
        ),
      },
      {
        path: "jobs",
        element: (
          <Page>
            <JobsPage />
          </Page>
        ),
      },
      {
        path: "jobs/:matchId",
        element: (
          <Page>
            <JobDetailPage />
          </Page>
        ),
      },
      {
        path: "kits/:kitId",
        element: (
          <Page>
            <KitPage />
          </Page>
        ),
      },
      {
        path: "radar",
        element: (
          <Page>
            <RadarPage />
          </Page>
        ),
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
