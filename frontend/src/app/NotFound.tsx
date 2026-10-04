import { Link } from "react-router";
import { Button } from "@/components/ui/Button";

export function NotFound() {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-6 text-center">
      <div>
        <p className="type-figure text-[4rem] leading-none text-ink-3">404</p>
        <h1 className="type-title mt-4">This page doesn't fit anywhere</h1>
        <p className="mt-3 text-ink-2">
          The link may be old, or the page has moved.
        </p>
        <Button asChild className="mt-8">
          <Link to="/">Go to Today</Link>
        </Button>
      </div>
    </div>
  );
}
