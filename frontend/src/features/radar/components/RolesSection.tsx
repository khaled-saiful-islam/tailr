import { Plus, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ChipInput } from "@/components/ui/choice";
import { Panel } from "@/components/ui/controls";
import { useSuggestRoles, type CompleteSettings, type Seniority } from "../api";
import { SENIORITY_LABEL } from "../labels";

interface Props {
  settings: CompleteSettings;
  set: (patch: Partial<CompleteSettings>) => void;
}

/** The job titles to search for, with suggestions drawn from the CV. */
export function RolesSection({ settings, set }: Props) {
  const suggest = useSuggestRoles((message) => toast.error(message));
  const answer = suggest.result;
  const known = new Set(settings.roles.map((r) => r.toLowerCase()));
  const ideas = (answer?.roles ?? []).filter(
    (idea) => !known.has(idea.title.toLowerCase()),
  );
  const full = settings.roles.length >= 6;

  return (
    <Panel
      id="roles"
      title="What job?"
      description="The job titles Tailr searches for. Up to six."
      actions={
        <Button
          size="sm"
          variant="secondary"
          icon={<Sparkles className="size-4" />}
          loading={suggest.running}
          onClick={() => suggest.run()}
        >
          {suggest.running ? "Suggesting…" : "Suggest from my CV"}
        </Button>
      }
    >
      <ChipInput
        label="Job titles"
        value={settings.roles}
        onChange={(roles) => set({ roles })}
        placeholder="AI Engineer, Data Scientist"
        max={6}
        hint="Press Enter after each title. Leave out levels like Senior: set those under Pay and job type."
      />
      {suggest.running && (
        <p role="status" className="mt-4 text-[0.9375rem] text-ink-2">
          Reading your CV for job titles… You can keep editing.
        </p>
      )}
      <AnimatePresence>
        {ideas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5 rounded-[12px] border border-chalk/30 bg-chalk-soft/50 p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="type-label text-chalk">Suggested from your CV</p>
              <button
                type="button"
                onClick={suggest.dismiss}
                className="rounded-[6px] text-[0.875rem] font-semibold text-ink-2 hover:text-ink"
              >
                Hide suggestions
              </button>
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {ideas.map((idea) => (
                <li
                  key={idea.title}
                  className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1"
                >
                  <span className="min-w-[min(100%,14rem)] flex-1">
                    <span className="block font-semibold">{idea.title}</span>
                    <span className="block text-[0.875rem] text-ink-2">
                      {idea.reason}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Plus className="size-4" />}
                    disabled={full}
                    onClick={() =>
                      set({ roles: [...settings.roles, idea.title] })
                    }
                  >
                    Add
                  </Button>
                </li>
              ))}
            </ul>
            {answer && answer.seniority.length > 0 && (
              <p className="mt-4 text-[0.875rem] text-ink-2">
                Your experience suits{" "}
                {answer.seniority
                  .map((level: Seniority) =>
                    SENIORITY_LABEL[level].toLowerCase(),
                  )
                  .join(" and ")}{" "}
                roles.{" "}
                <button
                  type="button"
                  className="font-semibold text-chalk hover:underline"
                  onClick={() => set({ seniority: answer.seniority })}
                >
                  Use these levels
                </button>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mt-5">
        <ChipInput
          label="Must mention one of these (optional)"
          value={settings.must_have}
          onChange={(must_have) => set({ must_have })}
          placeholder="Python, LLM"
          hint="Only keep jobs whose ad mentions at least one. Leave empty to keep them all."
        />
      </div>
    </Panel>
  );
}
