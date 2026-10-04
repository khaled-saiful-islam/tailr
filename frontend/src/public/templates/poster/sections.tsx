import {
  ArrowRight,
  ArrowUpRight,
  Award as AwardIcon,
  BadgeCheck,
} from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import {
  availabilityText,
  currentRole,
  host,
  initials,
  SKILL_LABEL,
} from "../../format";
import { CountUp, EASE, Entrance, MaskRise, Reveal, Rise } from "../../motion";
import { ContactAction, CvAction } from "../../parts/actions";
import { ContactForm } from "../../portfolio/ContactForm";
import { outcome, quickFacts, timeline } from "../../portfolio/data";
import type { KitProps } from "../../portfolio/PortfolioSite";
import { PortfolioLink } from "../../portfolio/route";
import type { PublicPage } from "../../types";
import {
  card,
  chip,
  chunky,
  outline,
  Pill,
  Section,
  Shapes,
  solid,
  Wrap,
} from "./shared";
import { STICKER_COLOURS, stickers, TILTS } from "./stickers";

const tileMotion = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1 },
};

function Tile({
  children,
  className,
  index,
  bare = false,
}: {
  children: ReactNode;
  className?: string;
  index: number;
  /** Edge to edge: the content brings its own padding. */
  bare?: boolean;
}) {
  return (
    <motion.div
      className={`rounded-[28px] ${bare ? "" : "p-5 @3xl:p-6"} ${className ?? ""}`}
      variants={tileMotion}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        type: "spring",
        stiffness: 170,
        damping: 20,
        delay: 0.1 + index * 0.07,
      }}
    >
      {children}
    </motion.div>
  );
}

function TileLabel({ children }: { children: ReactNode }) {
  return <p className="text-[0.875rem] font-bold opacity-75">{children}</p>;
}

/** At a glance: photo, what I'm doing now, latest project, languages, skills. */
function Bento({ page }: { page: PublicPage }) {
  const now = currentRole(page);
  const skills = page.skills.flatMap((group) => group.names).slice(0, 6);
  const latest = page.projects[0];
  const nowText =
    page.currently ?? (now ? `${now.title} at ${now.company}` : null);
  let index = 0;
  return (
    <div className="mt-12 grid grid-flow-dense gap-4 @2xl:grid-cols-2 @4xl:grid-cols-4">
      <Tile
        index={index++}
        bare
        className={`relative overflow-hidden @4xl:row-span-2 ${page.photo_url ? "min-h-[16rem] bg-pg-2" : "min-h-[9rem] bg-pg-accent-3 text-white @2xl:min-h-[16rem]"}`}
      >
        {page.photo_url ? (
          <img
            src={page.photo_url}
            alt={page.name}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center font-pg-display text-[5rem] font-extrabold tracking-[-0.04em]">
            {initials(page.name)}
          </span>
        )}
      </Tile>
      {nowText && (
        <Tile
          index={index++}
          className={`${card} @2xl:col-span-2 @4xl:col-span-2`}
        >
          <TileLabel>Now</TileLabel>
          <p className="mt-2 font-pg-display text-[clamp(1.25rem,2.4cqi,1.75rem)] font-bold leading-tight tracking-[-0.02em]">
            {nowText}
          </p>
        </Tile>
      )}
      {latest && (
        <Tile
          index={index++}
          bare
          className="overflow-hidden bg-pg-accent text-pg-accent-ink"
        >
          <PortfolioLink
            to={{ page: "project", path: latest.path }}
            className="group flex h-full flex-col justify-between gap-4 p-5 @3xl:p-6"
          >
            <TileLabel>Latest project</TileLabel>
            <span className="flex items-end justify-between gap-3">
              <span className="font-pg-display text-[1.25rem] font-bold leading-tight tracking-[-0.02em]">
                {latest.name}
              </span>
              <ArrowUpRight
                className="size-6 shrink-0 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
                aria-hidden
              />
            </span>
          </PortfolioLink>
        </Tile>
      )}
      {page.languages.length > 0 && (
        <Tile
          index={index++}
          className={`${card} @2xl:col-span-2 @4xl:col-span-1`}
        >
          <TileLabel>I speak</TileLabel>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {page.languages.map((language) => (
              <li
                key={language.name}
                className="rounded-full bg-pg px-3 py-1 font-semibold"
              >
                {language.name}
              </li>
            ))}
          </ul>
        </Tile>
      )}
      {skills.length > 0 && (
        <Tile index={index++} className={`${card} @2xl:col-span-2`}>
          <TileLabel>Good at</TileLabel>
          <ul className="mt-3 flex flex-wrap gap-2">
            {skills.map((name) => (
              <li key={name} className={chip}>
                {name}
              </li>
            ))}
          </ul>
        </Tile>
      )}
    </div>
  );
}

export function Hero({ page, preview }: KitProps) {
  const available = availabilityText(page);
  const line = page.hero_line ?? page.headline;
  return (
    <header className="relative">
      <Shapes />
      <Wrap className="relative pb-10 pt-[7cqi] @3xl:pb-14">
        <Entrance>
          {available && (
            <Rise>
              <span className="inline-flex -rotate-2 items-center gap-2 rounded-full bg-pg-accent-2 px-4 py-2 text-[0.875rem] font-bold text-[#111827] shadow-[0_6px_0_rgb(0_0_0/0.12)]">
                <span
                  className="size-2 rounded-full bg-[#111827] animate-pg-pulse"
                  aria-hidden
                />
                {available}
              </span>
            </Rise>
          )}
          <h1
            data-fit
            className="mt-8 max-w-[95%] font-pg-display text-[clamp(2.75rem,12.5cqi,10.5rem)] font-extrabold leading-[0.86] tracking-[-0.045em]"
          >
            <MaskRise text={page.name} delay={0.15} />
          </h1>
          {line && (
            <Rise>
              <p
                data-fit
                className="mt-7 max-w-[44rem] text-[clamp(1.375rem,3cqi,2.25rem)] font-semibold leading-[1.15] tracking-[-0.01em]"
              >
                {line}
              </p>
            </Rise>
          )}
          {(page.hero_line && page.headline) || page.location ? (
            <Rise>
              <p className="mt-3 text-[1.0625rem] text-pg-ink-2">
                {[page.hero_line ? page.headline : null, page.location]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </Rise>
          ) : null}
          <Rise className="mt-8 flex flex-wrap gap-3">
            {page.projects.length > 0 && (
              <PortfolioLink to={{ page: "work" }} className={solid}>
                See my work <ArrowRight className="size-5" aria-hidden />
              </PortfolioLink>
            )}
            {page.cv_url && (
              <CvAction page={page} preview={preview} className={outline} />
            )}
            <ContactAction page={page} preview={preview} className={outline} />
          </Rise>
        </Entrance>
        <Bento page={page} />
      </Wrap>
    </header>
  );
}

export function Achievements({ page }: KitProps) {
  const tags = stickers(page);
  const badges = [
    ...page.awards.map((award) => ({
      key: `award-${award.title}`,
      title: award.title,
      sub: [award.issuer, award.year].filter(Boolean).join(", "),
      detail: award.detail ?? null,
      kind: "award" as const,
    })),
    ...page.certifications.map((cert) => ({
      key: `cert-${cert.name}`,
      title: cert.name,
      sub: [cert.issuer, cert.year].filter(Boolean).join(", "),
      detail: null,
      kind: "cert" as const,
    })),
  ];
  return (
    <Section label="Achievements" title="Proud of">
      {tags.length > 0 && (
        <div className="grid grid-cols-2 gap-4 @3xl:grid-cols-4">
          {tags.map((tag, index) => (
            <motion.div
              key={`${tag.value}-${index}`}
              className={`flex flex-col justify-between rounded-[28px] p-5 @3xl:p-6 ${STICKER_COLOURS[index % 4]}`}
              initial={{
                opacity: 0,
                y: 30,
                rotate: (TILTS[index % 4] ?? 0) * 2.5,
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
        </div>
      )}
      {badges.length > 0 && (
        <ul className={`flex flex-col gap-3 ${tags.length ? "mt-10" : ""}`}>
          {badges.map((badge, index) => (
            <li key={badge.key}>
              <Reveal
                delay={index * 0.05}
                className={`flex items-start gap-4 p-4 @3xl:p-5 ${card}`}
              >
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-full ${badge.kind === "award" ? "bg-pg-accent-2 text-[#111827]" : "bg-pg-accent-3 text-white"}`}
                >
                  {badge.kind === "award" ? (
                    <AwardIcon className="size-5" aria-hidden />
                  ) : (
                    <BadgeCheck className="size-5" aria-hidden />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block font-pg-display text-[1.125rem] font-bold leading-snug tracking-[-0.01em]">
                    {badge.title}
                  </span>
                  {badge.sub && (
                    <span className="block text-[0.9375rem] text-pg-ink-2">
                      {badge.sub}
                    </span>
                  )}
                  {badge.detail && (
                    <span className="mt-1 block text-pg-ink-2">
                      {badge.detail}
                    </span>
                  )}
                </span>
              </Reveal>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function About({ page, teaser }: KitProps & { teaser?: boolean }) {
  const paragraphs = page.about.length
    ? page.about
    : page.summary
      ? [page.summary]
      : [];
  const shown = teaser ? paragraphs.slice(0, 1) : paragraphs;
  const facts = quickFacts(page);
  return (
    <Section label="About me" title="About me">
      <Reveal>
        <div className="flex max-w-[56rem] flex-col gap-5 text-[clamp(1.25rem,2.4cqi,1.75rem)] font-medium leading-[1.45]">
          {shown.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </Reveal>
      {teaser ? (
        <PortfolioLink to={{ page: "about" }} className={`mt-8 ${outline}`}>
          More about me <ArrowRight className="size-5" aria-hidden />
        </PortfolioLink>
      ) : (
        <>
          {facts.length > 0 && (
            <Reveal delay={0.1}>
              <ul className="mt-10 flex flex-wrap gap-2">
                {facts.map((fact) => (
                  <li key={fact.label}>
                    <Pill>
                      <span className="shrink-0 text-pg-ink-3">
                        {fact.label}
                      </span>
                      {fact.value}
                    </Pill>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
          {page.interests.length > 0 && (
            <Reveal delay={0.15}>
              <p className="mt-8 text-[0.9375rem] font-bold text-pg-ink-3">
                Outside work
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {page.interests.map((interest, index) => (
                  <li
                    key={interest}
                    className={`rounded-full px-4 py-2 font-bold ${STICKER_COLOURS[(index + 1) % 3]}`}
                  >
                    {interest}
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </>
      )}
    </Section>
  );
}

export function Expertise({ page }: KitProps) {
  return (
    <Section label="What I do" title="What I do">
      <div className="grid gap-5 @3xl:grid-cols-2">
        {page.expertise.map((area, index) => {
          const colours = STICKER_COLOURS[index % 4];
          return (
            <Reveal key={area.title} delay={(index % 2) * 0.08}>
              <article
                className={`flex h-full flex-col rounded-[28px] p-7 @3xl:p-8 ${colours}`}
              >
                <h3
                  data-fit
                  className="font-pg-display text-[clamp(1.5rem,3cqi,2rem)] font-extrabold leading-[1.05] tracking-[-0.02em]"
                >
                  {area.title}
                </h3>
                {area.description && (
                  <p className="mt-3 text-[1.0625rem] leading-relaxed opacity-90">
                    {area.description}
                  </p>
                )}
                {(area.tools ?? []).length > 0 && (
                  <ul className="mt-auto flex flex-wrap gap-2 pt-6">
                    {(area.tools ?? []).map((tool) => (
                      <li
                        key={tool}
                        className="rounded-full border-2 border-current/40 px-3 py-1 text-[0.875rem] font-bold"
                      >
                        {tool}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

export function Work({ page, limit }: KitProps & { limit?: number }) {
  const projects = limit ? page.projects.slice(0, limit) : page.projects;
  return (
    <Section label="Projects" title="Projects">
      <div className="grid gap-5 @3xl:grid-cols-2">
        {projects.map((project, index) => {
          // Full width only when the rest still pair up, so no card sits alone.
          const wide = project.featured && !limit && projects.length % 2 === 1;
          const line = outcome(project);
          const tools = (project.case?.tools ?? []).slice(0, 4);
          return (
            <Reveal
              key={project.id}
              className={wide ? "@3xl:col-span-2" : undefined}
              delay={(index % 2) * 0.08}
            >
              <PortfolioLink
                to={{ page: "project", path: project.path }}
                className={`group flex h-full flex-col overflow-hidden ${card} transition-transform hover:-translate-y-1`}
              >
                {project.image_url ? (
                  <img
                    src={project.image_url}
                    alt={project.name}
                    loading="lazy"
                    width={project.image_width ?? undefined}
                    height={project.image_height ?? undefined}
                    className={`w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] ${wide ? "aspect-[21/9]" : "aspect-[16/10]"}`}
                  />
                ) : (
                  <div
                    className={`h-3 ${(STICKER_COLOURS[index % 3] ?? "").split(" ")[0]}`}
                  />
                )}
                <div className="flex flex-1 flex-col p-6 @3xl:p-7">
                  {project.role && (
                    <p className="text-[0.875rem] font-bold text-pg-accent">
                      {project.role}
                    </p>
                  )}
                  <h3 className="mt-1 flex items-start justify-between gap-3 font-pg-display text-[1.625rem] font-bold leading-[1.1] tracking-[-0.02em]">
                    <span data-fit className="min-w-0">
                      {project.name}
                    </span>
                    <ArrowUpRight
                      className="mt-1 size-6 shrink-0 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
                      aria-hidden
                    />
                  </h3>
                  {line && (
                    <p className="mt-3 leading-relaxed text-pg-ink-2">{line}</p>
                  )}
                  {tools.length > 0 && (
                    <ul className="mt-auto flex flex-wrap gap-1.5 pt-5">
                      {tools.map((tool) => (
                        <li
                          key={tool}
                          className="rounded-full bg-pg px-3 py-1 text-[0.8125rem] font-semibold"
                        >
                          {tool}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </PortfolioLink>
            </Reveal>
          );
        })}
      </div>
      {limit !== undefined && page.projects.length > limit && (
        <PortfolioLink to={{ page: "work" }} className={`mt-8 ${solid}`}>
          See all {page.projects.length} projects{" "}
          <ArrowRight className="size-5" aria-hidden />
        </PortfolioLink>
      )}
    </Section>
  );
}

export function Timeline({ page }: KitProps) {
  const items = timeline(page);
  return (
    <Section label="Experience and education" title="My journey">
      <ol className="flex flex-col gap-4">
        {items.map((item, index) => {
          const education = item.kind === "education";
          const grade = education ? item.lines[0] : undefined;
          return (
            <li key={`${item.title}-${index}`}>
              <Reveal
                className={`grid gap-3 rounded-[28px] p-6 @3xl:grid-cols-[12rem_minmax(0,1fr)] @3xl:gap-8 @3xl:p-7 ${
                  education ? "border-2 border-pg-ink" : card
                }`}
              >
                <div>
                  <p className="font-pg-display text-[1rem] font-bold text-pg-accent">
                    {item.period}
                  </p>
                  <p className="mt-1 text-[0.875rem] font-bold text-pg-ink-3">
                    {education ? "Studies" : item.current ? "Now" : "Work"}
                  </p>
                </div>
                <div>
                  <h3 className="font-pg-display text-[1.375rem] font-bold leading-tight tracking-[-0.02em]">
                    {item.title}
                  </h3>
                  {item.org && (
                    <p className="mt-0.5 font-semibold text-pg-ink-2">
                      {item.org}
                    </p>
                  )}
                  {grade && (
                    <p className="mt-4 inline-block rounded-full bg-pg-accent-2 px-5 py-2 font-pg-display text-[1.25rem] font-bold text-[#111827]">
                      {grade}
                    </p>
                  )}
                  {!education && item.lines.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-1.5">
                      {item.lines.map((line) => (
                        <li key={line} className="flex gap-2.5 leading-relaxed">
                          <span
                            className="mt-2 size-2 shrink-0 rounded-full bg-pg-accent-3"
                            aria-hidden
                          />
                          {line}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Reveal>
            </li>
          );
        })}
      </ol>
      {page.skills.length > 0 && (
        <div className="mt-14 flex flex-col gap-6">
          {page.skills.map((group) => (
            <Reveal key={group.category}>
              <h3 className="text-[0.9375rem] font-bold text-pg-ink-3">
                {SKILL_LABEL[group.category]}
              </h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {group.names.map((name) => (
                  <li key={name} className={chip}>
                    {name}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      )}
    </Section>
  );
}

export function Testimonials({ page }: KitProps) {
  return (
    <Section label="What people say" title="Kind words">
      <div className="grid gap-8 @3xl:grid-cols-2">
        {page.testimonials.map((item, index) => (
          <Reveal key={item.name} delay={(index % 2) * 0.08}>
            <figure>
              <blockquote
                className={`relative rounded-[28px] p-6 text-[1.125rem] font-medium leading-relaxed @3xl:p-7 ${index % 2 ? "bg-pg-accent-3 text-white" : "bg-pg-2"}`}
              >
                {item.quote}
                <span
                  aria-hidden
                  className={`absolute -bottom-2 left-10 size-5 rotate-45 rounded-[4px] ${index % 2 ? "bg-pg-accent-3" : "bg-pg-2"}`}
                />
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3 pl-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-pg-ink font-bold text-pg">
                  {initials(item.name)}
                </span>
                <span>
                  <span className="block font-bold">{item.name}</span>
                  {(item.role || item.relationship) && (
                    <span className="block text-[0.9375rem] text-pg-ink-2">
                      {[item.role, item.relationship]
                        .filter(Boolean)
                        .join(". ")}
                    </span>
                  )}
                </span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

const field =
  "min-h-12 w-full rounded-2xl border-2 border-pg-line bg-pg px-4 py-3 text-[1rem] outline-none transition-[border-color] focus:border-pg-accent";

export function Contact({ page, preview }: KitProps) {
  return (
    <section aria-label="Contact" className="py-14 @3xl:py-20">
      <Wrap>
        <motion.div
          className="overflow-hidden rounded-[36px] bg-pg-accent p-6 text-pg-accent-ink @3xl:p-12"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <h2 className="font-pg-display text-[clamp(2.25rem,7cqi,4.75rem)] font-extrabold leading-[0.95] tracking-[-0.04em]">
            Let&apos;s talk.
          </h2>
          <div className="mt-8 grid gap-8 @4xl:grid-cols-[minmax(0,1fr)_16rem] @4xl:items-start">
            {page.contact_form ? (
              <div className="rounded-[28px] bg-pg-2 p-5 text-pg-ink @3xl:p-7">
                <ContactForm
                  page={page}
                  preview={preview}
                  styles={{
                    label: "text-[0.875rem] font-bold",
                    input: field,
                    chip: "rounded-full border-2 border-pg-line px-4 py-2 text-[0.875rem] font-bold hover:border-pg-ink",
                    chipOn:
                      "rounded-full border-2 border-pg-ink bg-pg-ink px-4 py-2 text-[0.875rem] font-bold text-pg",
                    submit: `${chunky} bg-pg-accent text-pg-accent-ink hover:-translate-y-0.5`,
                    note: "text-[0.8125rem] text-pg-ink-3",
                    success: "rounded-[24px] bg-pg-accent-2 p-6 text-[#111827]",
                  }}
                />
              </div>
            ) : (
              <p className="max-w-[32rem] text-[1.25rem] font-semibold">
                Say hello any way you like.
              </p>
            )}
            <div className="flex flex-col gap-3">
              <ContactAction
                page={page}
                preview={preview}
                className={`${chunky} bg-pg-accent-ink text-pg-accent hover:-translate-y-0.5`}
              >
                Email me
              </ContactAction>
              {page.whatsapp_url && (
                <a
                  href={page.whatsapp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${chunky} border-2 border-current hover:-translate-y-0.5`}
                >
                  Chat on WhatsApp
                </a>
              )}
              {page.cv_url && (
                <CvAction
                  page={page}
                  preview={preview}
                  className={`${chunky} border-2 border-current hover:-translate-y-0.5`}
                />
              )}
              {page.links.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                  {page.links.map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="nofollow ugc noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold underline decoration-2 underline-offset-4 hover:decoration-current"
                      >
                        {link.label || host(link.url)}
                        <ArrowUpRight className="size-4" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </motion.div>
      </Wrap>
    </section>
  );
}
