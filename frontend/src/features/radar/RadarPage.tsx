import { Search } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { SaveIndicator } from "@/features/profile/components/SaveIndicator";
import { useRadarOptions, type CompleteSettings } from "./api";
import { PreviewPanel } from "./components/PreviewPanel";
import { RolesSection } from "./components/RolesSection";
import {
  LeaveOutSection,
  PayAndTypeSection,
  SourcesSection,
  WhereSection,
} from "./components/SettingsSections";
import {
  DailyUpdateSection,
  MinimumMatchSection,
} from "./components/UpdateSections";
import { useRadarEditor } from "./hooks/useRadarEditor";
import { useSaveAndFind } from "./hooks/useSaveAndFind";

function formatNextUpdate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-MY", {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Job preferences: what Tailr searches for, and when. */
export function RadarPage() {
  const editor = useRadarEditor();
  const options = useRadarOptions();
  const saveAndFind = useSaveAndFind(editor);
  const { settings } = editor;

  if (editor.error)
    return <p className="p-10 text-pin">{editor.error.message}</p>;
  if (!settings) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner className="size-7 text-ink-3" />
      </div>
    );
  }

  const set = (patch: Partial<CompleteSettings>) =>
    editor.update((current) => ({ ...current, ...patch }));
  const findButton = (
    <Button
      variant="tape"
      icon={<Search className="size-4" />}
      onClick={saveAndFind.start}
      loading={saveAndFind.busy}
    >
      Save and find jobs
    </Button>
  );

  return (
    <div className="mx-auto w-full max-w-[90rem] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-[min(100%,20rem)] flex-1">
          <h1 className="type-title">Job preferences</h1>
          <p className="mt-2 max-w-[42rem] text-ink-2">
            Tell Tailr what job you want. It searches LinkedIn and JobStreet
            every morning and puts every job on your Jobs page, best match
            first.
          </p>
        </div>
        {editor.exists && (
          <div className="flex flex-wrap items-center gap-3">
            <SaveIndicator
              status={editor.status}
              onRetry={editor.retry}
              onReload={() => void editor.reload()}
            />
            {findButton}
          </div>
        )}
      </header>

      {!editor.exists && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-panel border border-tape/60 bg-[color-mix(in_oklab,var(--tape)_10%,var(--surface))] p-5"
        >
          <div className="min-w-[min(100%,18rem)] flex-1">
            <p className="font-semibold">We filled this in from your CV</p>
            <p className="mt-1 text-[0.9375rem] text-ink-2">
              Check the job titles and places, then press Save and find jobs.
              You can change anything later.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" asChild>
              <Link to="/profile">Back to my profile</Link>
            </Button>
            {findButton}
          </div>
        </motion.div>
      )}

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <RolesSection settings={settings} set={set} />
          <WhereSection settings={settings} set={set} options={options.data} />
          <PayAndTypeSection settings={settings} set={set} />
          <LeaveOutSection settings={settings} set={set} />
          <DailyUpdateSection
            settings={settings}
            set={set}
            nextUpdate={formatNextUpdate(editor.radar?.next_brief_at)}
          />
          <MinimumMatchSection settings={settings} set={set} />
          <SourcesSection
            settings={settings}
            set={set}
            options={options.data}
          />
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-line bg-surface p-5">
            <p className="min-w-[min(100%,18rem)] flex-1 text-[0.9375rem] text-ink-2">
              {editor.exists
                ? "Changes save as you make them. Search now to see the results on your Jobs page."
                : "Happy with these? Save them and Tailr starts searching right away."}
            </p>
            {findButton}
          </div>
        </div>
        <aside>
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
