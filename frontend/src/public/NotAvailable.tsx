/** Shown for an address that doesn't exist, or a page its owner has switched off. */
export function NotAvailable() {
  return (
    <main
      data-template="broadsheet"
      data-mode="light"
      className="grid min-h-dvh place-items-center px-5 py-16 text-center"
    >
      <div className="max-w-[32rem]">
        <p className="font-pg-mono text-[0.875rem] text-pg-ink-3">404</p>
        <h1 className="mt-3 font-pg-display text-[2.25rem] font-semibold leading-tight">
          This page isn't available.
        </h1>
        <p className="mt-4 text-[1.0625rem] text-pg-ink-2">
          The address may be mistyped, or its owner has taken the page down.
        </p>
        <a
          href="/"
          className="mt-8 inline-flex rounded-full border border-pg-ink px-5 py-2.5 font-pg-mono text-[0.9375rem] font-semibold hover:bg-pg-ink hover:text-pg"
        >
          Make your own page with Tailr
        </a>
      </div>
    </main>
  );
}
