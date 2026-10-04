import { Check, Copy, ExternalLink, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/choice";
import { Panel } from "@/components/ui/controls";
import { inputClass } from "@/components/ui/styles";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/cn";
import { checkSlug, type PageSettingsOut } from "../api";
import type { PageDraft } from "../draft";

const VISIBILITY = [
  { value: "off", label: "Off" },
  { value: "link", label: "Anyone with the link" },
  { value: "public", label: "Public" },
] as const;

const EXPLAIN: Record<PageDraft["visibility"], string> = {
  off: "Only you can see it. The address shows a 'page not available' message.",
  link: "Anyone with the link can see it. Search engines are asked not to list it.",
  public: "Anyone can see it, and search engines can list it.",
};

interface Props {
  draft: PageDraft;
  saved: PageSettingsOut;
  update: (recipe: (draft: PageDraft) => PageDraft) => void;
}

/** Who can see the page, and where it lives. */
export function PublishPanel({ draft, saved, update }: Props) {
  const live = saved.visibility !== "off";
  const pageUrl = saved.url;
  return (
    <Panel
      title="Publish"
      description="Choose who can see your website. You can switch it off at any time."
    >
      <Segmented
        label="Who can see your website"
        options={[...VISIBILITY]}
        value={draft.visibility}
        onChange={(visibility) => {
          if (visibility !== "off" && saved.missing.length) {
            toast.error(
              `Add ${saved.missing.join(" and ")} to your profile first.`,
            );
            return;
          }
          update((d) => ({ ...d, visibility }));
        }}
      />
      <p className="mt-3 text-[0.9375rem] text-ink-2">
        {EXPLAIN[draft.visibility]}
      </p>
      {saved.missing.length > 0 && (
        <p className="mt-3 rounded-control bg-surface-2 px-3.5 py-2.5 text-[0.9375rem]">
          Before publishing, add {saved.missing.join(" and ")} to{" "}
          <Link
            to="/profile"
            className="font-semibold text-chalk hover:underline"
          >
            your profile
          </Link>
          .
        </p>
      )}

      <AddressField
        path="p"
        current={draft.slug}
        onSave={(slug) => update((d) => ({ ...d, slug }))}
      />

      {live && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={<Copy className="size-3.5" />}
            onClick={() => void copyText(pageUrl, "Link")}
          >
            Copy link
          </Button>
          <Button size="sm" variant="secondary" asChild>
            <a href={pageUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" aria-hidden />
              Open page
            </a>
          </Button>
          <Button size="sm" variant="secondary" asChild>
            <a href="/api/v1/public-profile/qr.svg" download>
              <QrCode className="size-3.5" aria-hidden />
              QR code
            </a>
          </Button>
        </div>
      )}
    </Panel>
  );
}

type Check =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "ok"; slug: string }
  | { state: "bad"; reason: string };

/** tailr.app/<path>/<address>, checked as you type; saved only when it's free. */
export function AddressField({
  path,
  current,
  onSave,
}: {
  /** "cv" or "p": the page's place in the address. */
  path: string;
  current: string;
  onSave: (slug: string) => void;
}) {
  const [value, setValue] = useState(current);
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const changed = value.trim().toLowerCase() !== current;

  useEffect(() => setValue(current), [current]);

  useEffect(() => {
    if (!changed || !value.trim()) {
      setCheck({ state: "idle" });
      return;
    }
    setCheck({ state: "checking" });
    const timer = window.setTimeout(() => {
      checkSlug(value)
        .then((result) =>
          setCheck(
            result.available
              ? { state: "ok", slug: result.slug }
              : {
                  state: "bad",
                  reason: result.reason ?? "That address can't be used.",
                },
          ),
        )
        .catch(() =>
          setCheck({
            state: "bad",
            reason: "Couldn't check that address. Try again.",
          }),
        );
    }, 350);
    return () => window.clearTimeout(timer);
  }, [value, changed]);

  const origin = typeof window === "undefined" ? "" : window.location.host;
  return (
    <div className="mt-6">
      <label htmlFor="page-address" className="type-label">
        Address
      </label>
      <div className="mt-1.5 flex flex-wrap items-stretch gap-2">
        <div
          className={cn(
            inputClass,
            "flex min-h-11 min-w-[min(100%,16rem)] flex-1 items-center gap-0 px-3.5",
            check.state === "bad" && "border-pin",
          )}
        >
          <span className="shrink-0 text-ink-3">
            {origin}/{path}/
          </span>
          <input
            id="page-address"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent py-2 outline-none"
            aria-describedby="page-address-hint"
          />
        </div>
        {changed && (
          <Button
            disabled={check.state !== "ok"}
            loading={check.state === "checking"}
            onClick={() => check.state === "ok" && onSave(check.slug)}
          >
            Use this address
          </Button>
        )}
      </div>
      <p
        id="page-address-hint"
        className={cn(
          "mt-1.5 text-[0.8125rem]",
          check.state === "bad" ? "font-medium text-pin" : "text-ink-3",
        )}
      >
        {check.state === "bad" ? (
          check.reason
        ) : check.state === "ok" ? (
          <span className="inline-flex items-center gap-1 text-fit-strong">
            <Check className="size-3.5" aria-hidden /> Free to use
          </span>
        ) : (
          "Lowercase letters, numbers and hyphens. Shared by your online CV and website; changing it breaks links you've already shared."
        )}
      </p>
    </div>
  );
}
