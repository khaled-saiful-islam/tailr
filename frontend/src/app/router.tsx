import { lazy } from "react";
import { createBrowserRouter, Navigate, type RouteObject } from "react-router";
import { RedirectIfSignedIn, RequireAuth } from "./guards";
import { AppShell } from "./layouts/AppShell";
import { NotFound } from "./NotFound";
import { RouteError } from "./RouteError";
import { Page } from "./Page";
import { Moved } from "./Moved";

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
const TrackerPage = lazy(() =>
  import("@/features/tracker/TrackerPage").then((m) => ({
    default: m.TrackerPage,
  })),
);
const ApplicationPage = lazy(() =>
  import("@/features/tracker/ApplicationPage").then((m) => ({
    default: m.ApplicationPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@/features/settings/SettingsPage").then((m) => ({
    default: m.SettingsPage,
  })),
);
const AdminPage = lazy(() =>
  import("@/features/admin/AdminPage").then((m) => ({ default: m.AdminPage })),
);
const KitPage = lazy(() =>
  import("@/features/kits/KitPage").then((m) => ({ default: m.KitPage })),
);
const PublicPageEditor = lazy(() =>
  import("@/features/public-page/PublicPageEditor").then((m) => ({
    default: m.PublicPageEditor,
  })),
);
const CvStudio = lazy(() =>
  import("@/features/cv/CvStudio").then((m) => ({ default: m.CvStudio })),
);
const RadarPage = lazy(() =>
  import("@/features/radar/RadarPage").then((m) => ({ default: m.RadarPage })),
);
const ImportProgressPage = lazy(() =>
  import("@/features/profile/pages/ImportProgressPage").then((m) => ({
    default: m.ImportProgressPage,
  })),
);

const routes: RouteObject[] = [
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
        path: "applications",
        element: (
          <Page>
            <TrackerPage />
          </Page>
        ),
      },
      {
        path: "applications/:applicationId",
        element: (
          <Page>
            <ApplicationPage />
          </Page>
        ),
      },
      {
        path: "settings",
        element: (
          <Page>
            <SettingsPage />
          </Page>
        ),
      },
      {
        path: "admin",
        element: (
          <Page>
            <AdminPage />
          </Page>
        ),
      },
      {
        path: "apply/:kitId",
        element: (
          <Page>
            <KitPage />
          </Page>
        ),
      },
      {
        path: "profile/cv",
        element: (
          <Page>
            <CvStudio />
          </Page>
        ),
      },
      {
        path: "profile/website",
        element: (
          <Page>
            <PublicPageEditor />
          </Page>
        ),
      },
      {
        path: "preferences",
        element: (
          <Page>
            <RadarPage />
          </Page>
        ),
      },
      // Old addresses (bookmarks, links in earlier notifications) still work.
      { path: "radar", element: <Navigate to="/preferences" replace /> },
      { path: "tracker", element: <Moved to="/applications" /> },
      { path: "kits/:kitId", element: <Moved to="/apply/:kitId" /> },
      { path: "profile/portfolio", element: <Moved to="/profile/website" /> },
      { path: "*", element: <NotFound /> },
    ],
  },
];

// Any page that fails to open shows a plain message (and a fresh build reloads itself).
export const router = createBrowserRouter(
  routes.map((route) => ({ ...route, errorElement: <RouteError /> })),
);
