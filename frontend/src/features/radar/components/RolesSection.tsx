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

/** What to search for, with AI suggestions drawn from the profile. */
export function RolesSection({ settings, set }: Props) {
  const suggest = useSuggestRoles();
  const known = new Set(settings.roles.map((r) => r.toLowerCase()));
  const ideas = (suggest.data?.roles ?? []).filter(
    (idea) => !known.has(idea.title.toLowerCase()),
  );
  const full = settings.roles.length >= 6;

  return (
    <Panel
      id="roles"
      title="Roles"
      description="The job titles Tailr searches for every morning. Up to six."
      actions={
        <Button
          size="sm"
          variant="secondary"
          icon={<Sparkles className="size-4" />}
          loading={suggest.isPending}
          onClick={() =>
            suggest.mutate(undefined, {
              onError: (error) => toast.error(error.message),
            })
          }
        >
          Suggest from my profile
        </Button>
      }
    >
      <ChipInput
        label="Job titles"
        value={settings.roles}
        onChange={(roles) => set({ roles })}
        placeholder="AI Engineer, Data Scientist"
        max={6}
        hint="Press Enter after each title. Leave out levels like Senior; set those below."
      />
      <AnimatePresence>
        {ideas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5 rounded-[12px] border border-chalk/30 bg-chalk-soft/50 p-4"
          >
            <p className="type-label text-chalk">Suggested from your profile</p>
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
            {suggest.data && suggest.data.seniority.length > 0 && (
              <p className="mt-4 text-[0.875rem] text-ink-2">
                Your experience fits{" "}
                {suggest.data.seniority
                  .map((level: Seniority) =>
                    SENIORITY_LABEL[level].toLowerCase(),
                  )
                  .join(" and ")}{" "}
                roles.{" "}
                <button
                  type="button"
                  className="font-semibold text-chalk hover:underline"
                  onClick={() => set({ seniority: suggest.data.seniority })}
                >
                  Use these levels
                </button>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  );
}
