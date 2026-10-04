/**
 * Broadsheet: the front page of a quality paper, with you as the story. A masthead
 * name, a lead with a drop cap, "By the numbers" in the sidebar, roles as articles,
 * projects as features. For business, consulting and management.
 */
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import {
  availabilityText,
  currentRole,
  dateRange,
  host,
  initials,
  shows,
  SKILL_LABEL,
  yearRange,
  yearsOfWork,
} from "../format";
import { CountUp, DrawLine, Entrance, MaskRise, Reveal, Rise } from "../motion";
import {
  ContactAction,
  CvAction,
  MadeWithTailr,
  ModeAction,
  ShareAction,
} from "../parts/actions";
import { MobileBar } from "../parts/MobileBar";
import type { PageProject, TemplateProps } from "../types";

const ui = "font-pg-mono";
const textLink = `${ui} inline-flex items-center gap-1.5 text-[0.875rem] font-semibold underline decoration-pg-ink/30 underline-offset-4 hover:decoration-pg-accent hover:text-pg-accent`;

function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className={`${ui} text-[0.8125rem] font-semibold text-pg-accent`}>
      {children}
    </p>
  );
}

function SectionHead({
  id,
  kicker,
  title,
}: {
  id: string;
  kicker: string;
  title: string;
}) {
  return (
    <div className="mb-8">
      <div className="h-[3px] bg-pg-ink" aria-hidden />
      <DrawLine className="mt-[3px] h-px bg-pg-ink" />
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2
          id={id}
          className="font-pg-display text-[2rem] font-semibold leading-tight tracking-[-0.01em]"
        >
          {title}
        </h2>
        <span className={`${ui} text-[0.8125rem] text-pg-ink-3`}>{kicker}</span>
      </div>
    </div>
  );
}

function updatedLine(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : `Updated ${date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;
}

function Feature({ project, lead }: { project: PageProject; lead: boolean }) {
  return (
    <Reveal className={lead ? "@3xl:col-span-2" : undefined}>
      <article className="group">
        {project.image_url ? (
          <div className="overflow-hidden">
            <img
              src={project.image_url}
              alt={project.name}
              loading="lazy"
              width={project.image_width ?? undefined}
              height={project.image_height ?? undefined}
              className={`w-full object-cover grayscale-[35%] transition-[filter,transform] duration-700 group-hover:scale-[1.02] group-hover:grayscale-0 ${lead ? "aspect-[16/9]" : "aspect-[4/3]"}`}
            />
          </div>
        ) : (
          <div
            className={`grid place-items-center border-y border-pg-line bg-pg-2 font-pg-display text-[5rem] font-semibold italic text-pg-ink-3/50 ${lead ? "aspect-[16/9]" : "aspect-[4/3]"}`}
          >
            {initials(project.name)}
          </div>
        )}
        <div className="mt-4">
          {project.role && <Kicker>{project.role}</Kicker>}
          <h3
            className={`mt-1 font-pg-display font-semibold leading-[1.15] tracking-[-0.01em] ${lead ? "text-[2rem]" : "text-[1.5rem]"}`}
          >
            {project.name}
          </h3>
          {project.summary && (
            <p className="mt-2 text-[1.0625rem] italic leading-relaxed text-pg-ink-2">
              {project.summary}
            </p>
          )}
          {project.bullets.length > 0 && (
            <div
              className={`mt-3 text-[1rem] leading-relaxed ${lead ? "@3xl:columns-2 @3xl:gap-8" : ""}`}
            >
              {project.bullets.slice(0, lead ? 4 : 2).map((bullet) => (
                <p key={bullet} className="mb-2 break-inside-avoid">
                  {bullet}
                </p>
              ))}
            </div>
          )}
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="nofollow ugc noopener noreferrer"
              className={`mt-2 ${textLink}`}
            >
              {host(project.url)}
              <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          )}
        </div>
      </article>
    </Reveal>
  );
}

export default function Broadsheet(props: TemplateProps) {
  const { page, mode, onToggleMode, preview } = props;
  const now = currentRole(page);
  const available = availabilityText(page);
  const years = yearsOfWork(page);
  const sidebar = Boolean(page.photo_url) || shows(page, "highlights");
  const [firstLetter, rest] = page.summary
    ? [page.summary.slice(0, 1), page.summary.slice(1)]
    : ["", ""];

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-[76rem] px-5 pb-16 @3xl:px-10">
        <Entrance>
          {/* Top line: date and actions, like the strip above a nameplate. */}
          <Rise className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
            <p className={`${ui} text-[0.8125rem] text-pg-ink-3`}>
              {updatedLine(page.updated_at)}
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="hidden flex-wrap items-center gap-x-5 gap-y-2 @3xl:flex">
                <ContactAction
                  page={page}
                  preview={preview}
                  className={textLink}
                />
                <CvAction page={page} preview={preview} className={textLink} />
                <ShareAction
                  page={page}
                  className={textLink}
                  menuClassName="rounded-none"
                />
              </span>
              <ModeAction
                mode={mode}
                onToggle={onToggleMode}
                className="grid size-10 place-items-center rounded-full text-pg-ink-2 hover:bg-pg-ink/[0.06] hover:text-pg-ink"
              />
            </div>
          </Rise>

          <div className="h-[5px] bg-pg-ink" aria-hidden />
          <h1 className="py-6 text-center font-pg-display text-[clamp(2.75rem,11cqi,8rem)] font-semibold leading-[0.92] tracking-[-0.025em] @3xl:py-9">
            <MaskRise text={page.name} delay={0.1} />
          </h1>
          <div className="border-y border-pg-ink">
            <Rise className="grid divide-y divide-pg-line @3xl:grid-cols-3 @3xl:divide-x @3xl:divide-y-0">
              <p
                className={`${ui} px-1 py-2.5 text-center text-[0.8125rem] @3xl:px-4`}
              >
                {page.location ?? " "}
              </p>
              <p
                className={`${ui} px-1 py-2.5 text-center text-[0.8125rem] font-semibold @3xl:px-4`}
              >
                {years
                  ? `${years}+ years of experience`
                  : (now?.company ?? " ")}
              </p>
              <p
                className={`${ui} flex items-center justify-center gap-2 px-1 py-2.5 text-center text-[0.8125rem] @3xl:px-4`}
              >
                {available ? (
                  <>
                    <span
                      className="size-1.5 shrink-0 rounded-full bg-pg-accent animate-pg-pulse"
                      aria-hidden
                    />
                    {available}
                  </>
                ) : (
                  (now?.company ?? " ")
                )}
              </p>
            </Rise>
          </div>
        </Entrance>

        {/* The lead story */}
        <div
          className={`mt-10 grid gap-10 @4xl:gap-12 ${sidebar ? "@4xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : ""}`}
        >
          <div className="min-w-0">
            {page.headline && (
              <Reveal>
                <p className="font-pg-display text-[clamp(1.6rem,3.6cqi,2.4rem)] font-medium italic leading-[1.2] tracking-[-0.01em]">
                  {page.headline}
                  {now
                    ? `, ${now.current ? "now at" : "most recently at"} ${now.company}.`
                    : "."}
                </p>
              </Reveal>
            )}
            {page.summary && (
              <Reveal delay={0.1}>
                <p className="mt-6 text-[1.125rem] leading-[1.7] @3xl:columns-2 @3xl:gap-10">
                  <span className="float-left mr-2 mt-1 font-pg-display text-[4.6rem] font-semibold leading-[0.78] text-pg-accent">
                    {firstLetter}
                  </span>
                  {rest}
                </p>
              </Reveal>
            )}
            {page.links.length > 0 && (
              <Reveal>
                <p
                  className={`${ui} mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[0.875rem]`}
                >
                  {page.links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="nofollow ugc noopener noreferrer"
                      className={textLink}
                    >
                      {link.label || host(link.url)}
                      <ArrowUpRight className="size-3.5" aria-hidden />
                    </a>
                  ))}
                </p>
              </Reveal>
            )}
          </div>

          {sidebar && (
            <aside className="flex flex-col gap-8 @4xl:border-l @4xl:border-pg-line @4xl:pl-10">
              {page.photo_url && (
                <Reveal>
                  <figure>
                    <img
                      src={page.photo_url}
                      alt={page.name}
                      className="aspect-[4/5] w-full object-cover grayscale contrast-[1.05]"
                    />
                    <figcaption
                      className={`${ui} mt-2 text-[0.8125rem] leading-snug text-pg-ink-3`}
                    >
                      {page.name}
                      {now ? `, ${now.title} at ${now.company}` : ""}.
                    </figcaption>
                  </figure>
                </Reveal>
              )}
              {shows(page, "highlights") && (
                <section aria-labelledby="bs-numbers">
                  <div className="h-[3px] bg-pg-ink" aria-hidden />
                  <h2
                    id="bs-numbers"
                    className={`${ui} mt-3 text-[0.875rem] font-bold`}
                  >
                    By the numbers
                  </h2>
                  <ul className="mt-2">
                    {page.highlights.map((highlight, index) => (
                      <li
                        key={`${highlight.value}-${index}`}
                        className="border-b border-pg-line py-4 last:border-b-0"
                      >
                        <Reveal delay={index * 0.08}>
                          <CountUp
                            value={highlight.value}
                            className="block font-pg-display text-[2.75rem] font-semibold leading-none tracking-[-0.02em] text-pg-accent"
                          />
                          <p className="mt-1.5 text-[1rem] leading-snug text-pg-ink-2">
                            {highlight.label}
                          </p>
                        </Reveal>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          )}
        </div>

        {shows(page, "experience") && (
          <section aria-labelledby="bs-career" className="mt-16">
            <SectionHead
              id="bs-career"
              title="Career"
              kicker={`${page.experiences.length} ${page.experiences.length === 1 ? "role" : "roles"}`}
            />
            <div className="grid gap-x-10 gap-y-12 @3xl:grid-cols-2">
              {page.experiences.map((role, index) => (
                <Reveal key={`${role.company}-${role.title}-${index}`}>
                  <article
                    className={
                      index > 0 || page.experiences.length === 1
                        ? ""
                        : "@3xl:col-span-1"
                    }
                  >
                    <Kicker>
                      {dateRange(role.start, role.end, role.current)}
                    </Kicker>
                    <h3 className="mt-1 font-pg-display text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.01em]">
                      {role.title}
                    </h3>
                    <p className={`${ui} mt-1 text-[0.875rem] text-pg-ink-3`}>
                      {role.company}
                      {role.location ? `, ${role.location}` : ""}
                    </p>
                    {role.summary && (
                      <p className="mt-3 text-[1.0625rem] italic leading-relaxed text-pg-ink-2">
                        {role.summary}
                      </p>
                    )}
                    <div className="mt-3 flex flex-col gap-2.5 text-[1.0625rem] leading-relaxed">
                      {role.bullets.map((bullet) => (
                        <p key={bullet}>{bullet}</p>
                      ))}
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {shows(page, "projects") && (
          <section aria-labelledby="bs-features" className="mt-16">
            <SectionHead
              id="bs-features"
              title="Features"
              kicker="Selected projects"
            />
            <div className="grid gap-x-10 gap-y-12 @3xl:grid-cols-3">
              {page.projects.map((project, index) => (
                <Feature
                  key={project.id}
                  project={project}
                  lead={
                    project.featured ||
                    (index === 0 && page.projects.length > 2)
                  }
                />
              ))}
            </div>
          </section>
        )}

        {shows(page, "skills") && (
          <section aria-labelledby="bs-index" className="mt-16">
            <SectionHead id="bs-index" title="Index" kicker="Skills" />
            <dl className="grid gap-x-10 gap-y-5 @3xl:grid-cols-2">
              {page.skills.map((group) => (
                <Reveal key={group.category}>
                  <div className="border-b border-pg-line pb-4">
                    <dt className={`${ui} text-[0.8125rem] font-bold`}>
                      {SKILL_LABEL[group.category]}
                    </dt>
                    <dd className="mt-1 text-[1.0625rem] leading-relaxed">
                      {group.names.join(", ")}.
                    </dd>
                  </div>
                </Reveal>
              ))}
            </dl>
          </section>
        )}

        {(shows(page, "education") ||
          shows(page, "certifications") ||
          shows(page, "languages")) && (
          <section aria-labelledby="bs-notices" className="mt-16">
            <SectionHead
              id="bs-notices"
              title="Notices"
              kicker="Education and more"
            />
            <div className="grid gap-8 @3xl:grid-cols-3 @3xl:divide-x @3xl:divide-pg-line">
              {shows(page, "education") && (
                <Reveal className="@3xl:pr-8">
                  <h3 className={`${ui} text-[0.8125rem] font-bold`}>
                    Education
                  </h3>
                  <ul className="mt-3 flex flex-col gap-4">
                    {page.education.map((item) => (
                      <li key={`${item.institution}-${item.end_year}`}>
                        <p className="font-pg-display text-[1.25rem] font-semibold leading-snug">
                          {[item.qualification, item.field]
                            .filter(Boolean)
                            .join(", ") || item.institution}
                        </p>
                        <p className="text-pg-ink-2">
                          {item.qualification || item.field
                            ? item.institution
                            : ""}
                          {item.grade
                            ? `${item.qualification || item.field ? ". " : ""}${item.grade}`
                            : ""}
                        </p>
                        <p className={`${ui} text-[0.8125rem] text-pg-ink-3`}>
                          {yearRange(item.start_year, item.end_year)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              )}
              {shows(page, "certifications") && (
                <Reveal className="@3xl:px-8">
                  <h3 className={`${ui} text-[0.8125rem] font-bold`}>
                    Certifications
                  </h3>
                  <ul className="mt-3 flex flex-col gap-3">
                    {page.certifications.map((cert) => (
                      <li key={cert.name}>
                        <p className="font-pg-display text-[1.125rem] font-semibold leading-snug">
                          {cert.name}
                        </p>
                        <p className={`${ui} text-[0.8125rem] text-pg-ink-3`}>
                          {[cert.issuer, cert.year].filter(Boolean).join(", ")}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              )}
              {shows(page, "languages") && (
                <Reveal className="@3xl:pl-8">
                  <h3 className={`${ui} text-[0.8125rem] font-bold`}>
                    Languages
                  </h3>
                  <ul className="mt-3 flex flex-col gap-2">
                    {page.languages.map((language) => (
                      <li key={language.name} className="text-[1.0625rem]">
                        {language.name}
                        {language.proficiency && (
                          <span className="italic text-pg-ink-3">
                            , {language.proficiency}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              )}
            </div>
          </section>
        )}

        <footer
          className={`${ui} mt-16 flex flex-wrap items-center justify-between gap-3 border-t-[3px] border-pg-ink pt-4 text-[0.8125rem] text-pg-ink-3`}
        >
          <span>
            {page.name}
            {page.location ? `, ${page.location}` : ""}
          </span>
          <MadeWithTailr className="hover:text-pg-ink" />
        </footer>
      </div>
      <MobileBar
        {...props}
        hideAt="@3xl:hidden"
        bar="border-t-[3px] border-pg-ink bg-pg/95 backdrop-blur"
        primary="bg-pg-ink font-pg-mono text-[0.8125rem] font-semibold text-pg"
        secondary="border border-pg-ink font-pg-mono text-[0.8125rem] font-semibold"
        menu="rounded-none"
      />
    </div>
  );
}
