import { Eye, FileUp, X } from "lucide-react";
import { ProfileTabs } from "@/features/profile/components/ProfileTabs";
import { motion } from "motion/react";
import { Dialog } from "radix-ui";
import { useMemo } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ResumePreview } from "../components/ResumePreview";
import { SaveIndicator } from "../components/SaveIndicator";
import {
  BasicsSection,
  SummarySection,
} from "../components/sections/BasicsSection";
import {
  ExperienceSection,
  ProjectsSection,
} from "../components/sections/ExperienceSection";
import {
  CertificationsSection,
  EducationSection,
  LanguagesSection,
} from "../components/sections/OtherSections";
import { SkillsSection } from "../components/sections/SkillsSection";
import { StrengthPanel } from "../components/StrengthPanel";
import { useProfileEditor } from "../hooks/useProfileEditor";
import { scrollToSection } from "../strength";
import type { BulletIssue, ProfileDoc } from "../types";

const SECTIONS: {
  id: string;
  label: string;
  count?: (doc: ProfileDoc) => number;
}[] = [
  { id: "basics", label: "About you" },
  { id: "summary", label: "Summary" },
  { id: "experience", label: "Experience", count: (d) => d.experiences.length },
  { id: "projects", label: "Projects", count: (d) => d.projects.length },
  { id: "education", label: "Education", count: (d) => d.education.length },
  { id: "skills", label: "Skills", count: (d) => d.skills.length },
  {
    id: "certifications",
    label: "Certifications",
    count: (d) => d.certifications.length,
  },
  { id: "languages", label: "Languages", count: (d) => d.languages.length },
];

export function ProfilePage() {
  const editor = useProfileEditor();
  const { doc, strength } = editor;

  const issues = useMemo(
    () =>
      new Map<string, BulletIssue[]>(
        (strength?.bullet_issues ?? []).map((i) => [i.bullet_id, i.issues]),
      ),
    [strength],
  );

  if (editor.error) {
    return <p className="p-10 text-pin">{editor.error.message}</p>;
  }
  if (!doc || !strength) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner className="size-7 text-ink-3" />
      </div>
    );
  }

  const isBlank = !editor.exists && doc.experiences.length === 0;
  const sectionProps = { doc, update: editor.update, issues };

  return (
    <div className="mx-auto w-full max-w-[100rem] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <ProfileTabs />
      <header className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-[min(100%,20rem)] flex-1">
          <h1 className="type-title">Your profile</h1>
          <p className="mt-2 max-w-[40rem] text-ink-2">
            Everything Tailr knows about your career. Every tailored resume is
            built from it. Changes save as you type.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SaveIndicator
            status={editor.status}
            onRetry={editor.retry}
            onReload={() => void editor.reload()}
          />
          <Button
            variant="secondary"
            icon={<FileUp className="size-4" />}
            asChild
          >
            <Link to="/profile/import">Import a CV</Link>
          </Button>
          <PreviewDialog doc={doc} />
        </div>
      </header>

      {isBlank && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-panel border border-tape/60 bg-[color-mix(in_oklab,var(--tape)_10%,var(--surface))] p-5"
        >
          <div className="min-w-[min(100%,18rem)] flex-1">
            <p className="font-semibold">The fastest start: import your CV</p>
            <p className="mt-1 text-[0.9375rem] text-ink-2">
              Tailr fills in every section for you. You can still edit anything.
            </p>
          </div>
          <Button variant="tape" asChild>
            <Link to="/profile/import">Import a CV</Link>
          </Button>
        </motion.div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] 2xl:grid-cols-[16rem_minmax(0,1fr)_27rem]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <StrengthPanel strength={strength} />
          <nav aria-label="Profile sections" className="mt-4 hidden lg:block">
            <ul className="flex flex-col">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className="flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left text-[0.9375rem] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    {section.label}
                    {section.count && (
                      <span className="text-[0.8125rem] text-ink-3">
                        {section.count(doc)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          <BasicsSection {...sectionProps} />
          <SummarySection {...sectionProps} />
          <ExperienceSection {...sectionProps} />
          <ProjectsSection {...sectionProps} />
          <EducationSection {...sectionProps} />
          <SkillsSection {...sectionProps} />
          <CertificationsSection {...sectionProps} />
          <LanguagesSection {...sectionProps} />
        </div>

        <aside className="hidden 2xl:block">
          <div className="pattern-paper sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-sheet border border-line p-5">
            <p className="type-label mb-3 text-ink-2">Live preview</p>
            <ResumePreview doc={doc} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function PreviewDialog({ doc }: { doc: ProfileDoc }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button
          variant="secondary"
          icon={<Eye className="size-4" />}
          className="2xl:hidden"
        >
          Preview
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay backdrop-blur-[2px]" />
        <Dialog.Content className="pattern-paper fixed inset-y-0 right-0 z-50 flex w-full max-w-[44rem] flex-col border-l border-line shadow-sheet focus:outline-none">
          <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-3">
            <Dialog.Title className="type-heading">Resume preview</Dialog.Title>
            <Dialog.Close
              className="grid size-9 place-items-center rounded-[9px] text-ink-3 hover:bg-surface-2 hover:text-ink"
              aria-label="Close preview"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            How your profile looks as a one-column resume.
          </Dialog.Description>
          <div className="flex-1 overflow-y-auto p-5 sm:p-8">
            <ResumePreview doc={doc} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
