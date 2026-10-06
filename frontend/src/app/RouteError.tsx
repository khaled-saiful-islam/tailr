import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { Button } from "@/components/ui/Button";
import { isStaleBuildError, reloadForUpdate } from "@/lib/staleBuild";
import { NotFound } from "./NotFound";

/** What a page shows when it can't open, instead of a developer error screen. */
export function RouteError() {
  const error = useRouteError();
  const stale = isStaleBuildError(error);

  useEffect(() => {
    if (stale) reloadForUpdate();
  }, [stale]);

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;

  return (
    <div className="grid min-h-[70dvh] place-items-center px-6 text-center">
      <div className="max-w-[28rem]">
        <h1 className="type-title">
          {stale ? "Tailr was just updated" : "Something went wrong"}
        </h1>
        <p className="mt-3 text-ink-2">
          {stale
            ? "Loading the new version. If this page stays, reload it."
            : "This page didn't open. Reload it; if it keeps happening, go back to Home."}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button
            icon={<RefreshCw className="size-4" aria-hidden />}
            onClick={() => window.location.reload()}
          >
            Reload the page
          </Button>
          {!stale && (
            <Button asChild variant="secondary">
              <Link to="/">Go to Home</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
