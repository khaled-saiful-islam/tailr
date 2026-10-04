import type { ReactNode } from "react";
import { Link } from "react-router";
import { Logo } from "@/components/brand/Logo";
import { AuthCanvas } from "./AuthCanvas";

interface AuthLayoutProps {
  title: string;
  intro: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}

/** Form on the left, the cutting table on the right (from large screens up). */
export function AuthLayout({
  title,
  intro,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <main className="flex flex-col px-5 py-6 sm:px-10 lg:px-14 xl:px-20">
        <Link to="/" className="w-fit rounded-control" aria-label="Tailr home">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center py-12">
          <div className="w-full max-w-[25rem]">
            <h1 className="type-title">{title}</h1>
            <div className="mt-3 text-ink-2">{intro}</div>
            <div className="mt-9">{children}</div>
            <div className="mt-8 text-[0.9375rem] text-ink-2">{footer}</div>
          </div>
        </div>
        <p className="text-[0.8125rem] text-ink-3">
          Your CV stays private. You choose which jobs to apply to, and you
          apply yourself.
        </p>
      </main>
      <aside className="hidden lg:block lg:p-3">
        <div className="h-full overflow-hidden rounded-sheet">
          <AuthCanvas />
        </div>
      </aside>
    </div>
  );
}
