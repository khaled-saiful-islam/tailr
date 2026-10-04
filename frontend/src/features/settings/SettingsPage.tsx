import { Spinner } from "@/components/ui/Spinner";
import { useMe } from "@/features/auth/api";
import { PreferencesPanel, YouPanel } from "./components/AccountPanels";
import { DataPanel } from "./components/DataPanel";
import { SecurityPanel } from "./components/SecurityPanel";
import { UsagePanel } from "./components/UsagePanel";

const SECTIONS = [
  { id: "you", label: "You" },
  { id: "preferences", label: "Preferences" },
  { id: "ai", label: "AI use" },
  { id: "security", label: "Security" },
  { id: "data", label: "Your data" },
];

/** Your account: name, preferences, AI use, security and your data. */
export function SettingsPage() {
  const { data: user, isPending } = useMe();

  return (
    <div className="mx-auto w-full max-w-[72rem] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header>
        <h1 className="type-title">Account settings</h1>
        <p className="mt-2 max-w-[40rem] text-ink-2">
          Your account, how Tailr reaches you, and your data.
        </p>
      </header>

      {isPending || !user ? (
        <div className="grid min-h-[40vh] place-items-center">
          <Spinner className="size-7 text-ink-3" />
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-12">
          <nav
            aria-label="Settings sections"
            className="hidden lg:block lg:self-start lg:sticky lg:top-8"
          >
            <ul className="flex flex-col gap-1 border-l border-line">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-[0.9375rem] text-ink-2 hover:border-ink-3 hover:text-ink"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex min-w-0 flex-col gap-6">
            {user.is_demo && (
              <p
                role="note"
                className="rounded-panel border border-tape-deep/40 bg-tape/15 px-5 py-4 text-[0.9375rem]"
              >
                <span className="font-semibold">
                  This is a shared demo account.
                </span>{" "}
                Look around freely. Changing its password, signing others out
                and deleting it are switched off, so the next person finds it as
                you did.
              </p>
            )}
            <YouPanel user={user} />
            <PreferencesPanel user={user} />
            <UsagePanel />
            <SecurityPanel />
            <DataPanel />
          </div>
        </div>
      )}
    </div>
  );
}
