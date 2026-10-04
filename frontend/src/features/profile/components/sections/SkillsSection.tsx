import { Check, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { DropdownMenu } from "radix-ui";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Panel, Select } from "@/components/ui/controls";
import { inputClass } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { removeById, updateById } from "@/lib/list";
import {
  newId,
  skillCategoryLabel,
  skillLevelLabel,
  type Skill,
  type SkillCategory,
  type SkillLevel,
} from "../../types";
import type { SectionProps } from "./types";

const CATEGORIES = Object.keys(skillCategoryLabel) as SkillCategory[];
const LEVELS = Object.keys(skillLevelLabel) as SkillLevel[];

export function SkillsSection({ doc, update }: SectionProps) {
  const skills = doc.skills;
  const [draft, setDraft] = useState("");
  const [category, setCategory] = useState<SkillCategory>("tool");
  const set = (next: Skill[]) => update((d) => ({ ...d, skills: next }));

  const add = (event: FormEvent) => {
    event.preventDefault();
    const known = new Set(skills.map((s) => s.name.toLowerCase()));
    const fresh = draft
      .split(/[,;\n]/)
      .map((name) => name.trim())
      .filter((name) => name && !known.has(name.toLowerCase()))
      .filter(
        (name, index, all) =>
          all.findIndex((n) => n.toLowerCase() === name.toLowerCase()) ===
          index,
      )
      .map((name): Skill => ({
        id: newId(),
        name: name.slice(0, 60),
        category,
        level: null,
      }));
    if (fresh.length) set([...skills, ...fresh]);
    setDraft("");
  };

  return (
    <Panel
      id="skills"
      title="Skills"
      description="Tailr matches jobs on these. Add every tool and skill you'd be happy to be asked about."
    >
      <form
        onSubmit={add}
        className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_auto]"
      >
        <label htmlFor="add-skill" className="sr-only">
          Add skills
        </label>
        <input
          id="add-skill"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Python, Docker, Kubernetes"
          className={cn(inputClass, "h-11 px-3.5")}
          autoComplete="off"
        />
        <Select
          aria-label="Skill type"
          value={category}
          onChange={(e) => setCategory(e.target.value as SkillCategory)}
        >
          {CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {skillCategoryLabel[value]}
            </option>
          ))}
        </Select>
        <Button type="submit" disabled={!draft.trim()}>
          Add
        </Button>
      </form>
      <p className="mt-2 text-[0.8125rem] text-ink-3">
        Separate several with commas. Select a skill to set your level.
      </p>

      <div className="mt-6 flex flex-col gap-5">
        {skills.length === 0 && (
          <p className="text-[0.9375rem] text-ink-3">No skills yet.</p>
        )}
        {CATEGORIES.map((group) => {
          const inGroup = skills.filter((s) => s.category === group);
          if (!inGroup.length) return null;
          return (
            <div key={group}>
              <h3 className="type-label text-ink-2">
                {skillCategoryLabel[group]}{" "}
                <span className="text-ink-3">({inGroup.length})</span>
              </h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                <AnimatePresence initial={false}>
                  {inGroup.map((skill) => (
                    <motion.li
                      key={skill.id}
                      layout
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 28,
                      }}
                    >
                      <SkillChip
                        skill={skill}
                        onChange={(patch) =>
                          set(updateById(skills, skill.id, patch))
                        }
                        onRemove={() => set(removeById(skills, skill.id))}
                      />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function LevelDots({ level }: { level: SkillLevel | null }) {
  const filled = level ? LEVELS.indexOf(level) + 1 : 0;
  return (
    <span aria-hidden className="flex gap-[3px]">
      {LEVELS.map((_, index) => (
        <span
          key={index}
          className={cn(
            "h-2.5 w-[3px] rounded-full",
            index < filled ? "bg-ink" : "bg-line-strong",
          )}
        />
      ))}
    </span>
  );
}

function SkillChip({
  skill,
  onChange,
  onRemove,
}: {
  skill: Skill;
  onChange: (patch: Partial<Skill>) => void;
  onRemove: () => void;
}) {
  const itemClass =
    "flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[0.875rem] outline-none data-[highlighted]:bg-surface-2";
  return (
    <span className="flex items-center rounded-full border border-line-strong bg-surface pl-1 text-[0.875rem] transition-colors hover:border-ink-3">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          className="flex items-center gap-2 rounded-full py-1.5 pl-2.5 pr-1.5 font-medium data-[state=open]:bg-surface-2"
          aria-label={`${skill.name}${skill.level ? `, ${skillLevelLabel[skill.level]}` : ""}. Change level or type`}
        >
          {skill.name}
          <LevelDots level={skill.level} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            sideOffset={6}
            align="start"
            className="z-50 w-56 animate-pop rounded-panel border border-line bg-surface p-1.5 text-ink shadow-sheet"
          >
            <DropdownMenu.Label className="px-2.5 pb-1 pt-1.5 text-[0.75rem] font-semibold text-ink-3">
              Level
            </DropdownMenu.Label>
            <DropdownMenu.RadioGroup
              value={skill.level ?? ""}
              onValueChange={(value) =>
                onChange({ level: (value || null) as SkillLevel | null })
              }
            >
              {LEVELS.map((level) => (
                <DropdownMenu.RadioItem
                  key={level}
                  value={level}
                  className={itemClass}
                >
                  <LevelDots level={level} />
                  <span className="flex-1">{skillLevelLabel[level]}</span>
                  <DropdownMenu.ItemIndicator>
                    <Check className="size-4" />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
            <DropdownMenu.Separator className="my-1 h-px bg-line" />
            <DropdownMenu.Label className="px-2.5 pb-1 pt-1.5 text-[0.75rem] font-semibold text-ink-3">
              Type
            </DropdownMenu.Label>
            <DropdownMenu.RadioGroup
              value={skill.category}
              onValueChange={(value) =>
                onChange({ category: value as SkillCategory })
              }
            >
              {CATEGORIES.map((category) => (
                <DropdownMenu.RadioItem
                  key={category}
                  value={category}
                  className={itemClass}
                >
                  <span className="flex-1">{skillCategoryLabel[category]}</span>
                  <DropdownMenu.ItemIndicator>
                    <Check className="size-4" />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${skill.name}`}
        className="mr-1 grid size-6 place-items-center rounded-full text-ink-3 hover:bg-pin-soft hover:text-pin"
      >
        <X className="size-3.5" />
      </button>
    </span>
  );
}
