/**
 * Poster: bold and graphic. A huge name, big shapes, achievements as stickers that
 * settle into place. A short CV still looks confident. For graduates, interns and
 * career switchers.
 */
import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import {
  availabilityText,
  dateRange,
  host,
  initials,
  shows,
  SKILL_LABEL,
  yearRange,
} from "../format";
import { CountUp, EASE, Entrance, MaskRise, Reveal, Rise } from "../motion";
import {
  ContactAction,
  CvAction,
  MadeWithTailr,
  ModeAction,
  ShareAction,
} from "../parts/actions";
import { MobileBar } from "../parts/MobileBar";
import type { PublicPage, TemplateProps } from "../types";

const chunky =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[1rem] font-bold transition-transform active:scale-[0.97]";
const solid = `${chunky} bg-pg-ink text-pg hover:-translate-y-0.5`;
const outline = `${chunky} border-2 border-pg-ink hover:-translate-y-0.5`;

const STICKER_COLOURS = [
  "bg-pg-accent text-pg-accent-ink",
  "bg-pg-accent-2 text-[#111827]",
  "bg-pg-accent-3 text-white",
  "bg-pg-ink text-pg",
];
const TILTS = [-3, 2.5, -1.5, 3];

/** What goes on the stickers: chosen highlights, or honest counts from the profile. */
function stickers(page: PublicPage): { value: string; label: string }[] {
  if (shows(page, "highlights")) return page.highlights;
  const counts = [
    {
      value: String(page.projects.length),
      label: page.projects.length === 1 ? "project" : "projects",
    },
    {
      value: String(page.experiences.length),
      label: page.experiences.length === 1 ? "role" : "roles",
    },
    {
      value: String(
        page.skills.reduce((sum, group) => sum + group.names.length, 0),
      ),
      label: "skills",
    },
    {
      value: String(page.languages.length),
      label: page.languages.length === 1 ? "language" : "languages",
    },
  ];
  return counts.filter((count) => Number(count.value) > 0);
}

function Shapes() {
  const shape = (delay: number) => ({
    initial: { scale: 0, rotate: -20 },
    animate: { scale: 1, rotate: 0 },
    transition: { type: "spring" as const, stiffness: 120, damping: 14, delay },
  });
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <motion.span
        {...shape(0.1)}
        className="absolute -right-[12cqi] -top-[14cqi] size-[48cqi] rounded-full bg-pg-accent"
      />
      <motion.span
        {...shape(0.25)}
        className="absolute right-[24cqi] top-[18cqi] size-[12cqi] rounded-full bg-pg-accent-2"
      />
      <motion.span
        {...shape(0.4)}
        className="absolute -right-[4cqi] top-[34cqi] size-[16cqi] rounded-full border-[1.6cqi] border-pg-accent-3"
      />
    </div>
  );
}

export default function Poster(props: TemplateProps) {
  const { page, mode, onToggleMode, preview } = props;
  const available = availabilityText(page);
  const tags = stickers(page);

  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="relative">
        <Shapes />
        <div className="relative mx-auto max-w-[84rem] px-5 pb-12 pt-6 @3xl:px-10 @3xl:pb-16">
          <Entrance>
            <Rise className="flex items-center justify-between gap-4">
              {available ? (
                <span className="inline-flex -rotate-2 items-center gap-2 rounded-full bg-pg-accent-2 px-4 py-2 text-[0.875rem] font-bold text-[#111827] shadow-[0_6px_0_rgb(0_0_0/0.12)]">
                  <span
                    className="size-2 rounded-full bg-[#111827] animate-pg-pulse"
                    aria-hidden
                  />
                  {available}
                </span>
              ) : (
                <span />
              )}
              <ModeAction
                mode={mode}
                onToggle={onToggleMode}
                className="grid size-11 place-items-center rounded-full bg-pg-2 text-pg-ink shadow-[0_2px_0_rgb(0_0_0/0.1)]"
              />
            </Rise>

            <div className="mt-[10cqi] flex flex-wrap items-end gap-6">
              {page.photo_url && (
                <Rise>
                  <img
                    src={page.photo_url}
                    alt={page.name}
                    className="size-28 rounded-full border-4 border-pg-ink object-cover @3xl:size-36"
                  />
                </Rise>
              )}
            </div>
            <h1 className="mt-6 max-w-[95%] font-pg-display text-[clamp(2.75rem,12.5cqi,10.5rem)] font-extrabold leading-[0.86] tracking-[-0.045em]">
              <MaskRise text={page.name} delay={0.15} />
            </h1>
            {page.headline && (
              <Rise>
                <p className="mt-6 max-w-[42rem] text-[clamp(1.25rem,2.6cqi,1.875rem)] font-semibold leading-tight">
                  {page.headline}
                </p>
              </Rise>
            )}
            {page.location && (
              <Rise>
                <p className="mt-2 text-[1.0625rem] text-pg-ink-2">
                  {page.location}
                </p>
              </Rise>
            )}
            <Rise className="mt-8 hidden flex-wrap gap-3 @3xl:flex">
              <ContactAction page={page} preview={preview} className={solid} />
              <CvAction page={page} preview={preview} className={outline} />
              <ShareAction
                page={page}
                className={outline}
                menuClassName="rounded-3xl"
              />
            </Rise>
          </Entrance>
        </div>
      </header>

      <main className="mx-auto max-w-[84rem] px-5 pb-20 @3xl:px-10">
        {tags.length > 0 && (
          <section
            aria-label="Highlights"
            className="grid grid-cols-2 gap-4 @3xl:grid-cols-4"
          >
            {tags.map((tag, index) => (
              <motion.div
                key={`${tag.value}-${index}`}
                className={`flex flex-col justify-between rounded-[28px] p-5 @3xl:p-6 ${STICKER_COLOURS[index % 4]}`}
                initial={{
                  opacity: 0,
                  y: 30,
                  rotate: TILTS[index % 4]! * 2.5,
                  scale: 0.9,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  rotate: TILTS[index % 4],
                  scale: 1,
                }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{
                  type: "spring",
                  stiffness: 160,
                  damping: 16,
                  delay: index * 0.08,
                }}
              >
                <CountUp
                  value={tag.value}
                  className="block font-pg-display text-[clamp(2rem,6cqi,3.5rem)] font-extrabold leading-none tracking-[-0.03em]"
                />
                <p className="mt-6 text-[0.9375rem] font-semibold leading-snug opacity-90">
                  {tag.label}
                </p>
              </motion.div>
            ))}
          </section>
        )}

        {page.summary && (
          <section aria-label="About" className="mt-16">
            <Reveal>
              <p className="max-w-[56rem] text-[clamp(1.25rem,2.6cqi,2rem)] font-medium leading-[1.4]">
                {page.summary}
              </p>
            </Reveal>
            {page.links.length > 0 && (
              <Reveal>
                <ul className="mt-6 flex flex-wrap gap-2">
                  {page.links.map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="nofollow ugc noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-pg-2 px-4 py-2 font-semibold shadow-[0_2px_0_rgb(0_0_0/0.08)] hover:bg-pg-accent hover:text-pg-accent-ink"
                      >
                        {link.label || host(link.url)}
                        <ArrowUpRight className="size-4" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
          </section>
        )}

        {shows(page, "projects") && (
          <section aria-labelledby="poster-projects" className="mt-20">
            <h2
              id="poster-projects"
              className="font-pg-display text-[clamp(2rem,6cqi,3.75rem)] font-extrabold tracking-[-0.03em]"
            >
              Projects
            </h2>
            <div className="mt-8 grid gap-5 @3xl:grid-cols-2">
              {page.projects.map((project, index) => (
                <Reveal
                  key={project.id}
                  className={project.featured ? "@3xl:col-span-2" : undefined}
                  delay={(index % 2) * 0.08}
                >
                  <article className="group h-full overflow-hidden rounded-[28px] bg-pg-2 shadow-[0_2px_0_rgb(0_0_0/0.06)]">
                    {project.image_url ? (
                      <img
                        src={project.image_url}
                        alt={project.name}
                        loading="lazy"
                        width={project.image_width ?? undefined}
                        height={project.image_height ?? undefined}
                        className={`w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] ${project.featured ? "aspect-[21/9]" : "aspect-[16/10]"}`}
                      />
                    ) : (
                      <div
                        className={`h-3 ${STICKER_COLOURS[index % 3]!.split(" ")[0]}`}
                      />
                    )}
                    <div className="p-6 @3xl:p-7">
                      {project.role && (
                        <p className="text-[0.875rem] font-bold text-pg-accent">
                          {project.role}
                        </p>
                      )}
                      <h3 className="mt-1 font-pg-display text-[1.625rem] font-bold leading-[1.1] tracking-[-0.02em]">
                        {project.name}
                      </h3>
                      {project.summary && (
                        <p className="mt-3 leading-relaxed text-pg-ink-2">
                          {project.summary}
                        </p>
                      )}
                      {project.bullets.length > 0 && (
                        <ul className="mt-3 flex flex-col gap-1.5">
                          {project.bullets.slice(0, 3).map((bullet) => (
                            <li
                              key={bullet}
                              className="flex gap-2.5 leading-relaxed"
                            >
                              <span
                                className="mt-2 size-2 shrink-0 rounded-full bg-pg-accent"
                                aria-hidden
                              />
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      )}
                      {project.url && (
                        <a
                          href={project.url}
                          target="_blank"
                          rel="nofollow ugc noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-1 font-bold hover:text-pg-accent"
                        >
                          {host(project.url)}{" "}
                          <ArrowUpRight className="size-4" aria-hidden />
                        </a>
                      )}
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {shows(page, "education") && (
          <section aria-labelledby="poster-education" className="mt-20">
            <h2
              id="poster-education"
              className="font-pg-display text-[clamp(2rem,6cqi,3.75rem)] font-extrabold tracking-[-0.03em]"
            >
              Education
            </h2>
            <div className="mt-8 grid gap-5 @3xl:grid-cols-2">
              {page.education.map((item, index) => (
                <Reveal
                  key={`${item.institution}-${item.end_year}`}
                  delay={index * 0.08}
                >
                  <div className="flex h-full flex-col justify-between gap-6 rounded-[28px] border-2 border-pg-ink p-6 @3xl:p-7">
                    <div>
                      <p className="text-[0.9375rem] font-bold text-pg-ink-3">
                        {yearRange(item.start_year, item.end_year)}
                      </p>
                      <h3 className="mt-1 font-pg-display text-[1.5rem] font-bold leading-tight tracking-[-0.02em]">
                        {[item.qualification, item.field]
                          .filter(Boolean)
                          .join(", ") || item.institution}
                      </h3>
                      {(item.qualification || item.field) && (
                        <p className="mt-1 text-pg-ink-2">{item.institution}</p>
                      )}
                    </div>
                    {item.grade && (
                      <p className="self-start rounded-full bg-pg-accent-2 px-4 py-1.5 font-pg-display text-[1.125rem] font-bold text-[#111827]">
                        {item.grade}
                      </p>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {shows(page, "experience") && (
          <section aria-labelledby="poster-work" className="mt-20">
            <h2
              id="poster-work"
              className="font-pg-display text-[clamp(2rem,6cqi,3.75rem)] font-extrabold tracking-[-0.03em]"
            >
              Experience
            </h2>
            <ol className="mt-8 flex flex-col gap-5">
              {page.experiences.map((role, index) => (
                <Reveal key={`${role.company}-${index}`}>
                  <li className="grid gap-3 rounded-[28px] bg-pg-2 p-6 shadow-[0_2px_0_rgb(0_0_0/0.06)] @3xl:grid-cols-[12rem_minmax(0,1fr)] @3xl:gap-8 @3xl:p-7">
                    <p className="font-pg-display text-[1rem] font-bold text-pg-accent">
                      {dateRange(role.start, role.end, role.current)}
                    </p>
                    <div>
                      <h3 className="font-pg-display text-[1.375rem] font-bold leading-tight tracking-[-0.02em]">
                        {role.title}
                      </h3>
                      <p className="mt-0.5 font-semibold text-pg-ink-2">
                        {role.company}
                      </p>
                      {role.bullets.length > 0 && (
                        <ul className="mt-3 flex flex-col gap-1.5">
                          {role.bullets.map((bullet) => (
                            <li
                              key={bullet}
                              className="flex gap-2.5 leading-relaxed"
                            >
                              <span
                                className="mt-2 size-2 shrink-0 rounded-full bg-pg-accent-3"
                                aria-hidden
                              />
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
          </section>
        )}

        {shows(page, "skills") && (
          <section aria-labelledby="poster-skills" className="mt-20">
            <h2
              id="poster-skills"
              className="font-pg-display text-[clamp(2rem,6cqi,3.75rem)] font-extrabold tracking-[-0.03em]"
            >
              Skills
            </h2>
            <div className="mt-8 flex flex-col gap-6">
              {page.skills.map((group) => (
                <Reveal key={group.category}>
                  <h3 className="text-[0.9375rem] font-bold text-pg-ink-3">
                    {SKILL_LABEL[group.category]}
                  </h3>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {group.names.map((name) => (
                      <li
                        key={name}
                        className="rounded-full border-2 border-pg-ink px-4 py-1.5 font-semibold"
                      >
                        {name}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {(shows(page, "certifications") || shows(page, "languages")) && (
          <section
            aria-label="Certifications and languages"
            className="mt-20 grid gap-10 @3xl:grid-cols-2"
          >
            {shows(page, "certifications") && (
              <Reveal>
                <h2 className="font-pg-display text-[1.75rem] font-extrabold tracking-[-0.02em]">
                  Certifications
                </h2>
                <ul className="mt-4 flex flex-col gap-3">
                  {page.certifications.map((cert) => (
                    <li key={cert.name} className="flex items-start gap-3">
                      <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-pg-accent-3 text-[0.75rem] font-bold text-white">
                        {initials(cert.issuer || cert.name).slice(0, 1)}
                      </span>
                      <span>
                        <span className="block font-semibold">{cert.name}</span>
                        <span className="text-[0.9375rem] text-pg-ink-3">
                          {[cert.issuer, cert.year].filter(Boolean).join(", ")}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
            {shows(page, "languages") && (
              <Reveal>
                <h2 className="font-pg-display text-[1.75rem] font-extrabold tracking-[-0.02em]">
                  Languages
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {page.languages.map((language) => (
                    <li
                      key={language.name}
                      className="rounded-full bg-pg-2 px-4 py-2 font-semibold shadow-[0_2px_0_rgb(0_0_0/0.06)]"
                    >
                      {language.name}
                      {language.proficiency && (
                        <span className="font-normal text-pg-ink-3">
                          {" "}
                          {language.proficiency}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
          </section>
        )}

        <motion.section
          aria-label="Contact"
          className="mt-20 overflow-hidden rounded-[36px] bg-pg-accent p-8 text-pg-accent-ink @3xl:p-12"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <p className="font-pg-display text-[clamp(2rem,7cqi,4.5rem)] font-extrabold leading-[0.95] tracking-[-0.04em]">
            Let's talk.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ContactAction
              page={page}
              preview={preview}
              className={`${chunky} bg-pg-accent-ink text-pg-accent hover:-translate-y-0.5`}
            />
            <CvAction
              page={page}
              preview={preview}
              className={`${chunky} border-2 border-current hover:-translate-y-0.5`}
            />
          </div>
        </motion.section>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 text-[0.875rem] font-semibold text-pg-ink-3">
          <span>{page.name}</span>
          <MadeWithTailr className="hover:text-pg-ink" />
        </footer>
      </main>

      <MobileBar
        {...props}
        hideAt="@3xl:hidden"
        bar="border-t border-pg-line bg-pg/95 backdrop-blur"
        primary="rounded-full bg-pg-ink font-bold text-pg"
        secondary="rounded-full border-2 border-pg-ink font-bold"
        menu="rounded-3xl"
      />
    </div>
  );
}
