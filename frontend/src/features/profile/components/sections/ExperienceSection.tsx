import { useState } from "react";
import { Panel, Select, Switch, TextArea } from "@/components/ui/controls";
import { moveById, removeById, updateById } from "@/lib/list";
import {
  emptyExperience,
  emptyProject,
  employmentTypeLabel,
  formatRange,
  type EmploymentType,
  type Experience,
  type Project,
} from "../../types";
import { BulletList } from "../editor/BulletList";
import {
  AddButton,
  EmptyHint,
  ItemCard,
  MonthField,
  TextField,
} from "../editor/primitives";
import type { SectionProps } from "./types";

export function ExperienceSection({ doc, update, issues }: SectionProps) {
  const [opened, setOpened] = useState<string | null>(null);
  const items = doc.experiences;
  const set = (experiences: Experience[]) =>
    update((d) => ({ ...d, experiences }));
  const patch = (id: string, value: Partial<Experience>) =>
    set(updateById(items, id, value));

  return (
    <Panel
      id="experience"
      title="Experience"
      description="Newest first. Your achievements here are what Tailr tailors from."
    >
      {items.length === 0 && (
        <EmptyHint>
          No roles yet. Add your current or most recent job first.
        </EmptyHint>
      )}
      <div className="flex flex-col gap-3">
        {items.map((item, index) => (
          <ItemCard
            key={item.id}
            title={item.title}
            subtitle={item.company}
            meta={[
              formatRange(item.start, item.end, item.current),
              `${item.bullets.length} achievements`,
            ]
              .filter(Boolean)
              .join(", ")}
            defaultOpen={
              opened === item.id || (index === 0 && items.length === 1)
            }
            onMoveUp={
              index > 0 ? () => set(moveById(items, item.id, -1)) : undefined
            }
            onMoveDown={
              index < items.length - 1
                ? () => set(moveById(items, item.id, 1))
                : undefined
            }
            onRemove={() => set(removeById(items, item.id))}
            removeLabel={`Remove ${item.title || "this role"}`}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                label="Job title"
                value={item.title}
                required
                onChange={(v) => patch(item.id, { title: v })}
              />
              <TextField
                label="Company"
                value={item.company}
                required
                onChange={(v) => patch(item.id, { company: v })}
              />
              <TextField
                label="Location"
                value={item.location}
                onChange={(v) => patch(item.id, { location: v })}
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`type-${item.id}`} className="type-label">
                  Type
                </label>
                <Select
                  id={`type-${item.id}`}
                  value={item.employment_type ?? ""}
                  onChange={(e) =>
                    patch(item.id, {
                      employment_type: (e.target.value ||
                        null) as EmploymentType | null,
                    })
                  }
                >
                  <option value="">Not specified</option>
                  {Object.entries(employmentTypeLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <MonthField
                label="Started"
                value={item.start}
                onChange={(v) => patch(item.id, { start: v })}
              />
              <MonthField
                label="Ended"
                value={item.current ? null : item.end}
                disabled={item.current}
                onChange={(v) => patch(item.id, { end: v })}
              />
              <div className="sm:col-span-2">
                <Switch
                  label="I work here now"
                  checked={item.current}
                  onCheckedChange={(current) =>
                    patch(item.id, { current, end: current ? null : item.end })
                  }
                />
              </div>
            </div>
            <div className="mt-6">
              <BulletList
                bullets={item.bullets}
                issues={issues}
                context={{ title: item.title, company: item.company }}
                onChange={(bullets) => patch(item.id, { bullets })}
              />
            </div>
          </ItemCard>
        ))}
        <AddButton
          onClick={() => {
            const fresh = emptyExperience();
            set([fresh, ...items]);
            setOpened(fresh.id);
          }}
        >
          Add a role
        </AddButton>
      </div>
    </Panel>
  );
}

export function ProjectsSection({ doc, update, issues }: SectionProps) {
  const [opened, setOpened] = useState<string | null>(null);
  const items = doc.projects;
  const set = (projects: Project[]) => update((d) => ({ ...d, projects }));
  const patch = (id: string, value: Partial<Project>) =>
    set(updateById(items, id, value));

  return (
    <Panel
      id="projects"
      title="Projects"
      description="Side projects, open source, research: anything that shows your work."
    >
      {items.length === 0 && (
        <EmptyHint>
          Optional, but great for showing skills your jobs don't.
        </EmptyHint>
      )}
      <div className="flex flex-col gap-3">
        {items.map((item, index) => (
          <ItemCard
            key={item.id}
            title={item.name}
            subtitle={item.role ?? undefined}
            meta={`${item.bullets.length} achievements`}
            defaultOpen={opened === item.id}
            onMoveUp={
              index > 0 ? () => set(moveById(items, item.id, -1)) : undefined
            }
            onMoveDown={
              index < items.length - 1
                ? () => set(moveById(items, item.id, 1))
                : undefined
            }
            onRemove={() => set(removeById(items, item.id))}
            removeLabel={`Remove ${item.name || "this project"}`}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                label="Project name"
                value={item.name}
                required
                onChange={(v) => patch(item.id, { name: v })}
              />
              <TextField
                label="Your role"
                value={item.role}
                onChange={(v) => patch(item.id, { role: v })}
              />
              <TextField
                label="Link"
                value={item.url}
                onChange={(v) => patch(item.id, { url: v })}
                className="sm:col-span-2"
              />
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor={`summary-${item.id}`} className="type-label">
                  What it is
                </label>
                <TextArea
                  id={`summary-${item.id}`}
                  value={item.summary ?? ""}
                  onChange={(e) => patch(item.id, { summary: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-6">
              <BulletList
                bullets={item.bullets}
                issues={issues}
                context={{ title: item.role, company: item.name }}
                onChange={(bullets) => patch(item.id, { bullets })}
              />
            </div>
          </ItemCard>
        ))}
        <AddButton
          onClick={() => {
            const fresh = emptyProject();
            set([...items, fresh]);
            setOpened(fresh.id);
          }}
        >
          Add a project
        </AddButton>
      </div>
    </Panel>
  );
}
