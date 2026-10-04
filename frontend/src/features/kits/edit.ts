/** Immutable edits to a kit's resume and cover letter. */
import type {
  CoverLetter,
  FactRef,
  TailoredBullet,
  TailoredResume,
} from "./api";

export interface SectionKey {
  kind: "role" | "project";
  id: string;
}

function mapBullets(
  resume: TailoredResume,
  section: SectionKey,
  change: (bullets: TailoredBullet[]) => TailoredBullet[],
): TailoredResume {
  if (section.kind === "role") {
    return {
      ...resume,
      roles: (resume.roles ?? []).map((role) =>
        role.experience_id === section.id
          ? { ...role, bullets: change(role.bullets ?? []) }
          : role,
      ),
    };
  }
  return {
    ...resume,
    projects: (resume.projects ?? []).map((project) =>
      project.project_id === section.id
        ? { ...project, bullets: change(project.bullets ?? []) }
        : project,
    ),
  };
}

export function setBullet(
  resume: TailoredResume,
  section: SectionKey,
  index: number,
  text: string,
): TailoredResume {
  return mapBullets(resume, section, (bullets) =>
    bullets.map((b, i) => (i === index ? { ...b, text } : b)),
  );
}

export function removeBullet(
  resume: TailoredResume,
  section: SectionKey,
  index: number,
): TailoredResume {
  return mapBullets(resume, section, (bullets) =>
    bullets.filter((_, i) => i !== index),
  );
}

export function setParagraph(
  letter: CoverLetter,
  index: number,
  text: string,
): CoverLetter {
  return {
    ...letter,
    paragraphs: (letter.paragraphs ?? []).map((p, i) =>
      i === index ? text : p,
    ),
  };
}

export function letterWordCount(letter: CoverLetter): number {
  return (letter.paragraphs ?? []).join(" ").split(/\s+/).filter(Boolean)
    .length;
}

export function letterAsText(letter: CoverLetter, name: string): string {
  return [
    letter.greeting,
    ...(letter.paragraphs ?? []),
    `${letter.closing}\n${name}`,
  ]
    .join("\n\n")
    .trim();
}

/** The profile facts a line cites, in the order it cites them. */
export function sourcesFor(
  factIds: string[] | undefined,
  facts: FactRef[],
): FactRef[] {
  const byId = new Map(facts.map((fact) => [fact.id, fact]));
  return (factIds ?? []).flatMap((id) => {
    const fact = byId.get(id);
    return fact ? [fact] : [];
  });
}
