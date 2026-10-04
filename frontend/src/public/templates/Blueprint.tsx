/**
 * Blueprint: a technical spec sheet. A sticky spec card, the career drawn as a
 * commit graph (each achievement a "+" line), projects as numbered figures.
 * For engineers and data people.
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

const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] px-4 font-pg-mono text-[0.8125rem] font-semibold transition-colors";
const solid = `${button} bg-pg-accent text-pg-accent-ink hover:brightness-110`;
const outline = `${button} border border-pg-ink/30 text-pg-ink hover:border-pg-ink hover:bg-pg-ink/[0.04]`;

/** Corner marks around a frame, like crop marks on a drawing. */
function Ticks() {
  const corner = "absolute size-3 border-pg-accent";
  return (
    <span aria-hidden className="pointer-events-none absolute -inset-[5px]">
      <span className={`${corner} left-0 top-0 border-l-2 border-t-2`} />
      <span className={`${corner} right-0 top-0 border-r-2 border-t-2`} />
      <span className={`${corner} bottom-0 left-0 border-b-2 border-l-2`} />
      <span className={`${corner} bottom-0 right-0 border-b-2 border-r-2`} />
    </span>
  );
}

function SectionTitle({
  index,
  children,
}: {
  index: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-7">
      <div className="flex items-baseline gap-4">
        <span className="font-pg-mono text-[0.75rem] text-pg-accent">
          {index}
        </span>
        <h2 className="font-pg-display text-[1.5rem] font-bold leading-tight [font-stretch:115%]">
          {children}
        </h2>
      </div>
      <DrawLine className="mt-3 h-px bg-pg-line" />
    </div>
  );
}

function SpecCard({ page, mode, onToggleMode, preview }: TemplateProps) {
  const now = currentRole(page);
  const years = yearsOfWork(page);
  const available = availabilityText(page);
  return (
    <Entrance className="flex flex-col">
      <Rise className="flex items-center justify-between">
        <span className="font-pg-mono text-[0.75rem] text-pg-ink-3">
          spec sheet / {page.slug}
        </span>
        <ModeAction
          mode={mode}
          onToggle={onToggleMode}
          className="grid size-10 place-items-center rounded-[6px] text-pg-ink-2 hover:bg-pg-ink/[0.06] hover:text-pg-ink"
        />
      </Rise>

      <Rise className="relative mt-6 w-36 @5xl:w-44">
        <Ticks />
        {page.photo_url ? (
          <img
            src={page.photo_url}
            alt={page.name}
            className="aspect-square w-full border border-pg-line object-cover"
          />
        ) : (
          <div className="grid aspect-square w-full place-items-center bg-pg-accent-2 font-pg-display text-[3.25rem] font-black text-[#0b1e3a] [font-stretch:125%]">
            {initials(page.name)}
          </div>
        )}
      </Rise>

      <h1 className="mt-8 font-pg-display text-[clamp(2.25rem,9cqi,3.1rem)] font-extrabold leading-[0.98] tracking-[-0.02em] [font-stretch:125%] @5xl:text-[2.6rem]">
        <MaskRise text={page.name} delay={0.15} />
      </h1>
      {page.headline && (
        <Rise>
          <p className="mt-4 text-[1.0625rem] leading-snug text-pg-ink-2">
            {page.headline}
          </p>
        </Rise>
      )}
      {available && (
        <Rise>
          <p className="mt-5 inline-flex items-center gap-2.5 rounded-[6px] border border-pg-accent/40 bg-pg-accent/[0.08] px-3 py-1.5 font-pg-mono text-[0.75rem] font-medium text-pg-ink">
            <span
              className="size-2 shrink-0 rounded-full bg-pg-accent animate-pg-pulse"
              aria-hidden
            />
            {available}
          </p>
        </Rise>
      )}

      <Rise>
        <dl className="mt-7 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-2.5 border-t border-dashed border-pg-line pt-5 font-pg-mono text-[0.8125rem]">
          {page.location && (
            <>
              <dt className="text-pg-ink-3">based in</dt>
              <dd>{page.location}</dd>
            </>
          )}
          {now && (
            <>
              <dt className="text-pg-ink-3">
                {now.current ? "now" : "latest"}
              </dt>
              <dd>
                {now.title}, {now.company}
              </dd>
            </>
          )}
          {years && (
            <>
              <dt className="text-pg-ink-3">experience</dt>
              <dd>{years}+ years</dd>
            </>
          )}
        </dl>
      </Rise>

      {page.links.length > 0 && (
        <Rise>
          <ul className="mt-5 flex flex-col gap-1.5 font-pg-mono text-[0.8125rem]">
            {page.links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="nofollow ugc noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 text-pg-accent hover:underline"
                >
                  {link.label || host(link.url)}
                  <span className="text-pg-ink-3">{host(link.url)}</span>
                  <ArrowUpRight
                    className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </a>
              </li>
            ))}
          </ul>
        </Rise>
      )}

      <Rise className="mt-7 hidden flex-wrap gap-2 @5xl:flex">
        <ContactAction page={page} preview={preview} className={solid} />
        <CvAction page={page} preview={preview} className={outline} />
        <ShareAction
          page={page}
          className={outline}
          menuClassName="rounded-[6px]"
        />
      </Rise>
    </Entrance>
  );
}

function Figure({
  project,
  number,
  wide,
}: {
  project: PageProject;
  number: number;
  wide: boolean;
}) {
  return (
    <Reveal className={wide ? "@3xl:col-span-2" : undefined}>
      <article className="group">
        <div className="relative">
          <Ticks />
          {project.image_url ? (
            <img
              src={project.image_url}
              alt={project.name}
              loading="lazy"
              width={project.image_width ?? undefined}
              height={project.image_height ?? undefined}
              className={`w-full border border-pg-line bg-pg-2 object-cover ${wide ? "aspect-[16/8]" : "aspect-[16/10]"}`}
            />
          ) : (
            <div
              className={`grid w-full place-items-center border border-pg-line bg-pg-2 [background-image:linear-gradient(var(--pg-grid)_1px,transparent_1px),linear-gradient(90deg,var(--pg-grid)_1px,transparent_1px)] [background-size:16px_16px] ${wide ? "aspect-[16/8]" : "aspect-[16/10]"}`}
            >
              <span className="font-pg-display text-[4rem] font-black text-pg-accent/70 [font-stretch:125%]">
                {initials(project.name)}
              </span>
            </div>
          )}
        </div>
        <p className="mt-4 font-pg-mono text-[0.75rem] text-pg-accent">
          fig. {number}
          {project.role ? (
            <span className="text-pg-ink-3"> / {project.role}</span>
          ) : null}
        </p>
        <h3 className="mt-1.5 text-[1.1875rem] font-bold leading-snug [font-stretch:110%]">
          {project.name}
        </h3>
        {project.summary && (
          <p className="mt-2 leading-relaxed text-pg-ink-2">
            {project.summary}
          </p>
        )}
        {project.bullets.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5 text-[0.9375rem] text-pg-ink-2">
            {project.bullets.slice(0, wide ? 4 : 2).map((bullet) => (
              <li key={bullet} className="flex gap-2.5">
                <span className="font-pg-mono text-pg-accent" aria-hidden>
                  +
                </span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}
        {project.url && (
          <a
            href={project.url}
            target="_blank"
            rel="nofollow ugc noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 font-pg-mono text-[0.8125rem] font-semibold text-pg-accent hover:underline"
          >
            {host(project.url)}
            <ArrowUpRight className="size-3.5" aria-hidden />
          </a>
        )}
      </article>
    </Reveal>
  );
}

export default function Blueprint(props: TemplateProps) {
  const { page } = props;
  let section = 0;
  const next = () => String(++section).padStart(2, "0");
  return (
    <div className="min-h-dvh [background-image:linear-gradient(var(--pg-grid)_1px,transparent_1px),linear-gradient(90deg,var(--pg-grid)_1px,transparent_1px)] [background-size:32px_32px]">
      <div className="mx-auto max-w-[80rem] px-5 py-8 @3xl:px-10 @3xl:py-14 @5xl:grid @5xl:grid-cols-[19rem_minmax(0,1fr)] @5xl:gap-16 @6xl:grid-cols-[21rem_minmax(0,1fr)]">
        <aside className="@5xl:sticky @5xl:top-10 @5xl:self-start">
          <SpecCard {...props} />
        </aside>

        <main className="mt-14 flex flex-col gap-16 @5xl:mt-0 @5xl:pt-2">
          {page.summary && (
            <section aria-label="Summary">
              <SectionTitle index={next()}>Summary</SectionTitle>
              <Reveal>
                <p className="max-w-[42rem] text-[1.25rem] leading-[1.6] text-pg-ink @3xl:text-[1.375rem]">
                  {page.summary}
                </p>
              </Reveal>
            </section>
          )}

          {shows(page, "highlights") && (
            <section aria-labelledby="bp-numbers">
              <SectionTitle index={next()}>
                <span id="bp-numbers">By the numbers</span>
              </SectionTitle>
              <div className="grid gap-4 @xl:grid-cols-2">
                {page.highlights.map((highlight, index) => (
                  <Reveal
                    key={`${highlight.value}-${index}`}
                    delay={index * 0.08}
                  >
                    <div className="relative h-full border border-pg-line bg-pg-2/70 p-5 backdrop-blur-[1px]">
                      <CountUp
                        value={highlight.value}
                        className="block font-pg-display text-[2.75rem] font-extrabold leading-none tracking-[-0.02em] text-pg-accent [font-stretch:125%]"
                      />
                      <div aria-hidden className="mt-4 flex items-center gap-0">
                        <span className="h-2.5 w-px bg-pg-ink-3" />
                        <DrawLine
                          className="h-px flex-1 bg-pg-ink-3/60"
                          delay={0.2 + index * 0.08}
                        />
                        <span className="h-2.5 w-px bg-pg-ink-3" />
                      </div>
                      <p className="mt-3 text-[0.9375rem] leading-snug text-pg-ink-2">
                        {highlight.label}
                      </p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </section>
          )}

          {shows(page, "experience") && (
            <section aria-labelledby="bp-work">
              <SectionTitle index={next()}>
                <span id="bp-work">Experience</span>
              </SectionTitle>
              <ol className="relative">
                <DrawLine
                  vertical
                  className="absolute bottom-2 left-[7px] top-2 w-[2px] bg-pg-line"
                />
                {page.experiences.map((role, index) => (
                  <li
                    key={`${role.company}-${role.title}-${index}`}
                    className="relative pb-10 pl-10 last:pb-0"
                  >
                    <Reveal>
                      <span
                        aria-hidden
                        className={`absolute left-0 top-1.5 grid size-4 place-items-center rounded-full border-2 ${role.current ? "border-pg-accent bg-pg-accent" : "border-pg-ink-3 bg-pg"}`}
                      />
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <p className="font-pg-mono text-[0.75rem] text-pg-accent">
                          v{page.experiences.length - index}.0
                          {role.current && (
                            <span className="text-pg-ink-3"> / current</span>
                          )}
                        </p>
                        <p className="font-pg-mono text-[0.75rem] text-pg-ink-3">
                          {dateRange(role.start, role.end, role.current)}
                        </p>
                      </div>
                      <h3 className="mt-1.5 text-[1.25rem] font-bold leading-snug [font-stretch:110%]">
                        {role.title}
                      </h3>
                      <p className="text-pg-ink-2">
                        {role.company}
                        {role.location ? `, ${role.location}` : ""}
                      </p>
                      {role.summary && (
                        <p className="mt-2 text-pg-ink-2">{role.summary}</p>
                      )}
                      {role.bullets.length > 0 && (
                        <ul className="mt-3 flex max-w-[44rem] flex-col gap-2">
                          {role.bullets.map((bullet) => (
                            <li
                              key={bullet}
                              className="flex gap-3 leading-relaxed"
                            >
                              <span
                                className="font-pg-mono text-pg-accent"
                                aria-hidden
                              >
                                +
                              </span>
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Reveal>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {shows(page, "projects") && (
            <section aria-labelledby="bp-projects">
              <SectionTitle index={next()}>
                <span id="bp-projects">Projects</span>
              </SectionTitle>
              <div className="grid gap-x-8 gap-y-12 @3xl:grid-cols-2">
                {page.projects.map((project, index) => (
                  <Figure
                    key={project.id}
                    project={project}
                    number={index + 1}
                    wide={project.featured}
                  />
                ))}
              </div>
            </section>
          )}

          {shows(page, "skills") && (
            <section aria-labelledby="bp-stack">
              <SectionTitle index={next()}>
                <span id="bp-stack">Stack</span>
              </SectionTitle>
              <div className="flex flex-col gap-5">
                {page.skills.map((group) => (
                  <Reveal key={group.category}>
                    <div className="grid gap-2 @2xl:grid-cols-[9rem_minmax(0,1fr)] @2xl:gap-4">
                      <p className="pt-1 font-pg-mono text-[0.75rem] text-pg-ink-3">
                        {SKILL_LABEL[group.category]}
                      </p>
                      <ul className="flex flex-wrap gap-1.5">
                        {group.names.map((name) => (
                          <li
                            key={name}
                            className="rounded-[4px] border border-pg-line bg-pg-2/80 px-2 py-1 font-pg-mono text-[0.8125rem]"
                          >
                            {name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Reveal>
                ))}
              </div>
            </section>
          )}

          {(shows(page, "education") ||
            shows(page, "certifications") ||
            shows(page, "languages")) && (
            <section aria-labelledby="bp-more">
              <SectionTitle index={next()}>
                <span id="bp-more">Education and more</span>
              </SectionTitle>
              <div className="grid gap-10 @3xl:grid-cols-2">
                {shows(page, "education") && (
                  <Reveal>
                    <h3 className="font-pg-mono text-[0.75rem] text-pg-ink-3">
                      education
                    </h3>
                    <ul className="mt-3 flex flex-col gap-4">
                      {page.education.map((item) => (
                        <li key={`${item.institution}-${item.end_year}`}>
                          <p className="font-semibold">
                            {[item.qualification, item.field]
                              .filter(Boolean)
                              .join(", ") || item.institution}
                          </p>
                          <p className="text-[0.9375rem] text-pg-ink-2">
                            {item.qualification || item.field
                              ? item.institution
                              : null}
                            {item.grade
                              ? `${item.qualification || item.field ? ", " : ""}${item.grade}`
                              : null}
                          </p>
                          <p className="font-pg-mono text-[0.75rem] text-pg-ink-3">
                            {yearRange(item.start_year, item.end_year)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                )}
                <div className="flex flex-col gap-10">
                  {shows(page, "certifications") && (
                    <Reveal>
                      <h3 className="font-pg-mono text-[0.75rem] text-pg-ink-3">
                        certifications
                      </h3>
                      <ul className="mt-3 flex flex-col gap-3">
                        {page.certifications.map((cert) => (
                          <li key={cert.name}>
                            <p className="font-semibold">
                              {cert.url ? (
                                <a
                                  href={cert.url}
                                  target="_blank"
                                  rel="nofollow ugc noopener noreferrer"
                                  className="hover:underline"
                                >
                                  {cert.name}
                                </a>
                              ) : (
                                cert.name
                              )}
                            </p>
                            <p className="font-pg-mono text-[0.75rem] text-pg-ink-3">
                              {[cert.issuer, cert.year]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </Reveal>
                  )}
                  {shows(page, "languages") && (
                    <Reveal>
                      <h3 className="font-pg-mono text-[0.75rem] text-pg-ink-3">
                        languages
                      </h3>
                      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                        {page.languages.map((language) => (
                          <li key={language.name}>
                            {language.name}
                            {language.proficiency && (
                              <span className="font-pg-mono text-[0.75rem] text-pg-ink-3">
                                {" "}
                                {language.proficiency}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </Reveal>
                  )}
                </div>
              </div>
            </section>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-pg-line pt-6 font-pg-mono text-[0.75rem] text-pg-ink-3">
            <span>rev. {page.updated_at.slice(0, 10)}</span>
            <MadeWithTailr className="hover:text-pg-ink" />
          </footer>
        </main>
      </div>
      <MobileBar
        {...props}
        bar="border-t border-pg-line bg-pg-2/95 backdrop-blur"
        primary="rounded-[6px] bg-pg-accent font-pg-mono text-[0.75rem] font-semibold text-pg-accent-ink"
        secondary="rounded-[6px] border border-pg-ink/25 font-pg-mono text-[0.75rem] font-semibold"
        menu="rounded-[6px]"
      />
    </div>
  );
}
