import { ArrowRight, ArrowUpRight } from "lucide-react";
import {
  availabilityText,
  host,
  initials,
  SKILL_LABEL,
  yearsOfWork,
} from "../../format";
import { CountUp, Entrance, MaskRise, Reveal, Rise } from "../../motion";
import { ContactAction, CvAction } from "../../parts/actions";
import { ContactForm } from "../../portfolio/ContactForm";
import { outcome, quickFacts, timeline } from "../../portfolio/data";
import type { KitProps } from "../../portfolio/PortfolioSite";
import { PortfolioLink } from "../../portfolio/route";
import type { PageProject } from "../../types";
import {
  Kicker,
  outline,
  Section,
  SectionHead,
  solid,
  textLink,
  ui,
} from "./shared";

const dropCap =
  "first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:font-pg-display first-letter:text-[4.6rem] first-letter:font-semibold first-letter:leading-[0.78] first-letter:text-pg-accent";

export function Hero({ page, preview }: KitProps) {
  const years = yearsOfWork(page);
  const available = availabilityText(page);
  const deck = page.hero_line ?? page.headline;
  return (
    <section aria-label="Introduction">
      <Entrance>
        <div className="h-[5px] bg-pg-ink" aria-hidden />
        <h1
          data-fit
          className="py-6 text-center font-pg-display text-[clamp(2.75rem,11cqi,8rem)] font-semibold leading-[0.92] tracking-[-0.025em] @3xl:py-9"
        >
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
              {years ? `${years}+ years of experience` : (page.headline ?? " ")}
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
                " "
              )}
            </p>
          </Rise>
        </div>
      </Entrance>

      <div
        className={`mt-10 grid gap-10 @4xl:gap-12 ${page.photo_url ? "@4xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : ""}`}
      >
        <Reveal>
          {page.currently && <Kicker>Currently: {page.currently}</Kicker>}
          {deck && (
            <p className="mt-3 max-w-[46rem] font-pg-display text-[clamp(1.75rem,4.2cqi,3rem)] font-medium italic leading-[1.15] tracking-[-0.01em]">
              {deck}
            </p>
          )}
          {page.hero_line && page.headline && (
            <p className={`${ui} mt-4 text-[0.9375rem] text-pg-ink-2`}>
              {page.headline}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            {page.projects.length > 0 && (
              <PortfolioLink to={{ page: "work" }} className={solid}>
                See my work <ArrowRight className="size-4" aria-hidden />
              </PortfolioLink>
            )}
            {page.cv_url && (
              <CvAction page={page} preview={preview} className={outline} />
            )}
            <ContactAction page={page} preview={preview} className={outline} />
          </div>
        </Reveal>
        {page.photo_url && (
          <Reveal delay={0.1}>
            <figure className="@4xl:border-l @4xl:border-pg-line @4xl:pl-10">
              <img
                src={page.photo_url}
                alt={page.name}
                className="aspect-[4/5] w-full object-cover grayscale contrast-[1.05]"
              />
              <figcaption
                className={`${ui} mt-2 text-[0.8125rem] leading-snug text-pg-ink-3`}
              >
                {page.name}
                {page.headline ? `, ${page.headline}` : ""}.
              </figcaption>
            </figure>
          </Reveal>
        )}
      </div>
    </section>
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
  const interests = page.interests ?? [];
  const sidebar = !teaser && (facts.length > 0 || interests.length > 0);
  return (
    <Section label="The story">
      <SectionHead title="The story" kicker="About" />
      <div
        className={`grid gap-10 @4xl:gap-12 ${sidebar ? "@4xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : ""}`}
      >
        <Reveal>
          <div
            className={`text-[1.125rem] leading-[1.7] ${teaser ? "max-w-[46rem]" : "@3xl:columns-2 @3xl:gap-10"}`}
          >
            {shown.map((paragraph, index) => (
              <p
                key={paragraph}
                className={`mb-4 ${index === 0 ? dropCap : ""}`}
              >
                {paragraph}
              </p>
            ))}
          </div>
          {teaser && (
            <PortfolioLink
              to={{ page: "about" }}
              className={`mt-2 ${textLink}`}
            >
              Read the full story <ArrowRight className="size-4" aria-hidden />
            </PortfolioLink>
          )}
        </Reveal>
        {sidebar && (
          <Reveal delay={0.1}>
            <aside className="border-t-[3px] border-pg-ink pt-3 @4xl:border-l @4xl:border-t-0 @4xl:border-pg-line @4xl:pl-10 @4xl:pt-0">
              <h3 className={`${ui} text-[0.875rem] font-bold`}>In brief</h3>
              <dl className="mt-3 flex flex-col">
                {facts.map((fact) => (
                  <div
                    key={fact.label}
                    className="border-b border-pg-line py-2.5 last:border-b-0"
                  >
                    <dt className={`${ui} text-[0.8125rem] text-pg-ink-3`}>
                      {fact.label}
                    </dt>
                    <dd className="text-[1.0625rem]">{fact.value}</dd>
                  </div>
                ))}
                {interests.length > 0 && (
                  <div className="border-t border-pg-line py-2.5">
                    <dt className={`${ui} text-[0.8125rem] text-pg-ink-3`}>
                      Outside work
                    </dt>
                    <dd className="text-[1.0625rem] italic">
                      {interests.join(", ")}
                    </dd>
                  </div>
                )}
              </dl>
            </aside>
          </Reveal>
        )}
      </div>
    </Section>
  );
}

const COLUMNS: Record<number, string> = {
  1: "",
  2: "@3xl:grid-cols-2",
  3: "@3xl:grid-cols-2 @5xl:grid-cols-3",
  4: "@3xl:grid-cols-2 @5xl:grid-cols-4",
};

export function Expertise({ page }: KitProps) {
  const areas = page.expertise ?? [];
  return (
    <Section label="What I do">
      <SectionHead title="What I do" kicker="Expertise" />
      <div
        className={`grid gap-x-8 gap-y-8 ${COLUMNS[Math.min(areas.length, 4)] ?? ""}`}
      >
        {areas.map((area, index) => {
          const tools = area.tools ?? [];
          return (
            <Reveal key={area.title} delay={index * 0.06}>
              <article className="h-full border-t border-pg-ink pt-4">
                <h3 className="font-pg-display text-[1.5rem] font-semibold leading-[1.15] tracking-[-0.01em]">
                  {area.title}
                </h3>
                {area.description && (
                  <p className="mt-2 text-[1.0625rem] leading-relaxed text-pg-ink-2">
                    {area.description}
                  </p>
                )}
                {tools.length > 0 && (
                  <p className={`${ui} mt-3 text-[0.8125rem] text-pg-ink-3`}>
                    <span className="font-semibold text-pg-ink">Tools: </span>
                    {tools.join(", ")}
                  </p>
                )}
              </article>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

export function Achievements({ page }: KitProps) {
  const awards = page.awards ?? [];
  const notices = awards.length + page.certifications.length > 0;
  return (
    <Section label="By the numbers">
      <SectionHead title="By the numbers" kicker="Achievements" />
      {page.highlights.length > 0 && (
        <ul className="grid gap-x-8 gap-y-6 @2xl:grid-cols-2 @5xl:grid-cols-4">
          {page.highlights.map((highlight, index) => (
            <li
              key={`${highlight.value}-${index}`}
              className="border-t border-pg-line pt-4"
            >
              <Reveal delay={index * 0.08}>
                <CountUp
                  value={highlight.value}
                  className="block font-pg-display text-[3rem] font-semibold leading-none tracking-[-0.02em] text-pg-accent"
                />
                <p className="mt-2 text-[1.0625rem] leading-snug text-pg-ink-2">
                  {highlight.label}
                </p>
              </Reveal>
            </li>
          ))}
        </ul>
      )}
      {notices && (
        <Reveal>
          <div className={page.highlights.length > 0 ? "mt-12" : ""}>
            <h3 className={`${ui} text-[0.875rem] font-bold`}>Notices</h3>
            <ul className="mt-3 border-t border-pg-ink">
              {awards.map((award) => (
                <li
                  key={award.title}
                  className="grid gap-1 border-b border-pg-line py-3.5 @2xl:grid-cols-[7rem_minmax(0,1fr)] @2xl:gap-6"
                >
                  <span
                    className={`${ui} text-[0.8125rem] font-semibold text-pg-accent`}
                  >
                    {award.year ?? "Award"}
                  </span>
                  <span>
                    <span className="font-pg-display text-[1.25rem] font-semibold">
                      {award.title}
                    </span>
                    {award.issuer && (
                      <span className="text-pg-ink-2">, {award.issuer}</span>
                    )}
                    {award.detail && (
                      <span className="block italic text-pg-ink-2">
                        {award.detail}
                      </span>
                    )}
                  </span>
                </li>
              ))}
              {page.certifications.map((cert) => (
                <li
                  key={cert.name}
                  className="grid gap-1 border-b border-pg-line py-3.5 @2xl:grid-cols-[7rem_minmax(0,1fr)] @2xl:gap-6"
                >
                  <span className={`${ui} text-[0.8125rem] text-pg-ink-3`}>
                    {cert.year ?? "Certified"}
                  </span>
                  <span>
                    <span className="font-pg-display text-[1.125rem] font-semibold">
                      {cert.name}
                    </span>
                    {cert.issuer && (
                      <span className="text-pg-ink-2">, {cert.issuer}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      )}
    </Section>
  );
}

function Cover({ project, lead }: { project: PageProject; lead: boolean }) {
  return project.image_url ? (
    <div className="overflow-hidden">
      <img
        src={project.image_url}
        alt={project.name}
        loading="lazy"
        width={project.image_width ?? undefined}
        height={project.image_height ?? undefined}
        className={`w-full object-cover grayscale-[35%] transition-[filter,transform] duration-700 group-hover:scale-[1.02] group-hover:grayscale-0 ${lead ? "aspect-[16/10]" : "aspect-[4/3]"}`}
      />
    </div>
  ) : (
    <div
      className={`grid place-items-center border-y border-pg-line bg-pg-2 font-pg-display text-[5rem] font-semibold italic text-pg-ink-3/50 ${lead ? "aspect-[16/10]" : "aspect-[4/3]"}`}
    >
      {initials(project.name)}
    </div>
  );
}

function Lead({ project }: { project: PageProject }) {
  const line = outcome(project);
  return (
    <Reveal>
      <PortfolioLink
        to={{ page: "project", path: project.path }}
        className="group grid gap-6 @4xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @4xl:gap-10"
      >
        <Cover project={project} lead />
        <div>
          {project.role && <Kicker>{project.role}</Kicker>}
          <h3
            data-fit
            className="mt-1 font-pg-display text-[clamp(1.875rem,4cqi,2.75rem)] font-semibold leading-[1.08] tracking-[-0.015em] group-hover:text-pg-accent"
          >
            {project.name}
          </h3>
          {line && (
            <p className="mt-3 text-[1.125rem] italic leading-relaxed text-pg-ink-2">
              {line}
            </p>
          )}
          <span className={`mt-4 ${textLink}`}>
            Read the story <ArrowRight className="size-4" aria-hidden />
          </span>
        </div>
      </PortfolioLink>
    </Reveal>
  );
}

function Feature({ project, index }: { project: PageProject; index: number }) {
  const line = outcome(project);
  return (
    <Reveal delay={(index % 3) * 0.06}>
      <PortfolioLink
        to={{ page: "project", path: project.path }}
        className="group block"
      >
        <Cover project={project} lead={false} />
        <div className="mt-4">
          {project.role && <Kicker>{project.role}</Kicker>}
          <h3 className="mt-1 font-pg-display text-[1.5rem] font-semibold leading-[1.15] tracking-[-0.01em] group-hover:text-pg-accent">
            {project.name}
          </h3>
          {line && (
            <p className="mt-2 text-[1.0625rem] italic leading-relaxed text-pg-ink-2">
              {line}
            </p>
          )}
        </div>
      </PortfolioLink>
    </Reveal>
  );
}

export function Work({ page, limit }: KitProps & { limit?: number }) {
  const ordered = [...page.projects].sort(
    (a, b) => Number(b.featured) - Number(a.featured),
  );
  const shown = limit ? ordered.slice(0, limit) : ordered;
  const [lead, ...rest] = shown;
  return (
    <Section label="Features">
      <SectionHead title="Features" kicker="Selected work" />
      {lead && <Lead project={lead} />}
      {rest.length > 0 && (
        <div className="mt-12 grid gap-x-10 gap-y-12 border-t border-pg-line pt-10 @3xl:grid-cols-2 @5xl:grid-cols-3">
          {rest.map((project, index) => (
            <Feature key={project.id} project={project} index={index} />
          ))}
        </div>
      )}
      {limit && page.projects.length > limit && (
        <PortfolioLink to={{ page: "work" }} className={`mt-10 ${outline}`}>
          All {page.projects.length} features{" "}
          <ArrowRight className="size-4" aria-hidden />
        </PortfolioLink>
      )}
    </Section>
  );
}

export function Timeline({ page }: KitProps) {
  const items = timeline(page);
  const roles = items.filter((item) => item.kind === "role").length;
  return (
    <Section label="Career">
      <SectionHead
        title="Career"
        kicker={`${roles} ${roles === 1 ? "role" : "roles"}`}
      />
      <div className="grid gap-x-10 gap-y-10 @3xl:grid-cols-2">
        {items.map((item, index) => (
          <Reveal key={`${item.title}-${index}`}>
            <article className="border-t border-pg-line pt-4">
              <Kicker>
                {item.kind === "education"
                  ? `Education, ${item.period}`
                  : item.period}
              </Kicker>
              <h3 className="mt-1 font-pg-display text-[1.625rem] font-semibold leading-[1.15] tracking-[-0.01em]">
                {item.title}
              </h3>
              {item.org && (
                <p className={`${ui} mt-1 text-[0.875rem] text-pg-ink-3`}>
                  {item.org}
                </p>
              )}
              {item.lines.length > 0 && (
                <div className="mt-3 flex flex-col gap-2 text-[1.0625rem] leading-relaxed">
                  {item.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              )}
            </article>
          </Reveal>
        ))}
      </div>
      {page.skills.length > 0 && (
        <Reveal>
          <div className="mt-12">
            <h3 className={`${ui} text-[0.875rem] font-bold`}>Index</h3>
            <dl className="mt-3 grid gap-x-10 gap-y-4 border-t border-pg-ink pt-4 @3xl:grid-cols-2">
              {page.skills.map((group) => (
                <div
                  key={group.category}
                  className="border-b border-pg-line pb-4"
                >
                  <dt className={`${ui} text-[0.8125rem] font-bold`}>
                    {SKILL_LABEL[group.category]}
                  </dt>
                  <dd className="mt-1 text-[1.0625rem] leading-relaxed">
                    {group.names.join(", ")}.
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      )}
    </Section>
  );
}

export function Testimonials({ page }: KitProps) {
  return (
    <Section label="What people say">
      <SectionHead title="What people say" kicker="Testimonials" />
      <div className="flex flex-col gap-10">
        {(page.testimonials ?? []).map((item, index) => (
          <Reveal key={item.name} delay={index * 0.08}>
            <figure className="border-b border-pg-line pb-8 last:border-b-0">
              <blockquote className="max-w-[52rem] font-pg-display text-[clamp(1.5rem,3.2cqi,2.25rem)] font-medium italic leading-[1.3] tracking-[-0.01em]">
                <span className="text-pg-accent" aria-hidden>
                  {"“"}
                </span>
                {item.quote}
                <span className="text-pg-accent" aria-hidden>
                  {"”"}
                </span>
              </blockquote>
              <figcaption className={`${ui} mt-4 text-[0.875rem]`}>
                <span className="font-semibold">{item.name}</span>
                {item.role && (
                  <span className="text-pg-ink-2">, {item.role}</span>
                )}
                {item.relationship && (
                  <span className="block text-pg-ink-3">
                    {item.relationship}
                  </span>
                )}
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

const field =
  "w-full border-0 border-b border-pg-ink/40 bg-transparent px-0 py-2 font-pg-body text-[1.125rem] outline-none transition-[border-color,box-shadow] focus:border-pg-accent focus:shadow-[0_1px_0_0_var(--pg-accent)]";

export function Contact({ page, preview }: KitProps) {
  return (
    <Section label="Write to me">
      <SectionHead title="Write to me" kicker="Contact" />
      <div className="grid gap-10 @4xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] @4xl:gap-12">
        {page.contact_form ? (
          <Reveal>
            <ContactForm
              page={page}
              preview={preview}
              styles={{
                label: `${ui} text-[0.8125rem] font-bold`,
                input: field,
                textarea: `${field} min-h-32 resize-y`,
                chip: `${ui} border border-pg-line px-3 py-1.5 text-[0.8125rem] text-pg-ink-2 hover:border-pg-ink hover:text-pg-ink`,
                chipOn: `${ui} border border-pg-ink bg-pg-ink px-3 py-1.5 text-[0.8125rem] text-pg`,
                submit: solid,
                note: `${ui} text-[0.8125rem] text-pg-ink-3`,
                success:
                  "border-t-[3px] border-pg-ink pt-5 font-pg-display text-[1.25rem]",
              }}
            />
          </Reveal>
        ) : (
          <p className="font-pg-display text-[1.5rem] italic leading-snug text-pg-ink-2">
            The best ways to reach me are alongside.
          </p>
        )}
        <Reveal delay={0.1}>
          <aside className="border-t-[3px] border-pg-ink pt-3 @4xl:border-l @4xl:border-t-0 @4xl:border-pg-line @4xl:pl-10 @4xl:pt-0">
            <h3 className={`${ui} text-[0.875rem] font-bold`}>Elsewhere</h3>
            <ul className="mt-3 flex flex-col gap-3">
              {page.has_contact && (
                <li>
                  <ContactAction
                    page={page}
                    preview={preview}
                    className={textLink}
                  />
                </li>
              )}
              {page.whatsapp_url && (
                <li>
                  <a
                    href={page.whatsapp_url}
                    target="_blank"
                    rel="nofollow ugc noopener noreferrer"
                    className={textLink}
                  >
                    Chat on WhatsApp{" "}
                    <ArrowUpRight className="size-3.5" aria-hidden />
                  </a>
                </li>
              )}
              {page.cv_url && (
                <li>
                  <CvAction
                    page={page}
                    preview={preview}
                    className={textLink}
                  />
                </li>
              )}
              {page.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="nofollow ugc noopener noreferrer"
                    className={textLink}
                  >
                    {link.label || host(link.url)}{" "}
                    <ArrowUpRight className="size-3.5" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        </Reveal>
      </div>
    </Section>
  );
}
