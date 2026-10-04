import { motion } from "motion/react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { SaveIndicator } from "@/features/profile/components/SaveIndicator";
import { useRadarOptions, useSaveRadar, type CompleteSettings } from "./api";
import { PreviewPanel } from "./components/PreviewPanel";
import { RolesSection } from "./components/RolesSection";
import {
  BriefSection,
  DealBreakersSection,
  FreshnessSection,
  LevelSection,
  PaySection,
  SourcesSection,
  WhereSection,
} from "./components/SettingsSections";
import { useRadarEditor } from "./hooks/useRadarEditor";

function formatNextBrief(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-MY", { weekday: "long", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export function RadarPage() {
  const editor = useRadarEditor();
  const options = useRadarOptions();
  const firstSave = useSaveRadar();
  const navigate = useNavigate();
  const { settings } = editor;

  if (editor.error) return <p className="p-10 text-pin">{editor.error.message}</p>;
  if (!settings) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner className="size-7 text-ink-3" />
      </div>
    );
  }

  const set = (patch: Partial<CompleteSettings>) => editor.update((current) => ({ ...current, ...patch }));
  const start = () => {
    if (settings.roles.length === 0) {
      toast.error("Add at least one role first.");
      return;
    }
    firstSave.mutate(
      { settings, version: 0 },
      {
        onSuccess: () => {
          toast.success("Your radar is on.");
          navigate("/");
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <div className="mx-auto w-full max-w-[90rem] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-[min(100%,20rem)] flex-1">
          <h1 className="type-title">Job radar</h1>
          <p className="mt-2 max-w-[40rem] text-ink-2">
            What Tailr looks for every morning. The preview scans LinkedIn and JobStreet as you change things.
          </p>
        </div>
        {editor.exists && (
          <SaveIndicator status={editor.status} onRetry={editor.retry} onReload={() => void editor.reload()} />
        )}
      </header>

      {!editor.exists && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-panel border border-tape/60 bg-[color-mix(in_oklab,var(--tape)_10%,var(--surface))] p-5"
        >
          <div className="min-w-[min(100%,18rem)] flex-1">
            <p className="font-semibold">We've set this up from your profile</p>
            <p className="mt-1 text-[0.9375rem] text-ink-2">
              Check the roles and places, then start your radar. You can change anything later.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" asChild>
              <Link to="/profile">Back to profile</Link>
            </Button>
            <Button variant="tape" onClick={start} loading={firstSave.isPending}>
              Start my radar
            </Button>
          </div>
        </motion.div>
      )}

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <RolesSection settings={settings} set={set} />
          <WhereSection settings={settings} set={set} options={options.data} />
          <LevelSection settings={settings} set={set} />
          <PaySection settings={settings} set={set} />
          <DealBreakersSection settings={settings} set={set} />
          <FreshnessSection settings={settings} set={set} />
          <SourcesSection settings={settings} set={set} options={options.data} />
          <BriefSection settings={settings} set={set} nextBrief={formatNextBrief(editor.radar?.next_brief_at)} />
        </div>
        <aside className="order-first xl:order-none">
          <div className="xl:sticky xl:top-6">
            <PreviewPanel
              preview={editor.preview}
              scanning={editor.scanning}
              error={editor.previewError}
              freshness={settings.freshness_days}
              options={options.data}
              hasRoles={settings.roles.length > 0}
              onRescan={editor.scan}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
