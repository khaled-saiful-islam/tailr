import { ArrowRight, ArrowUpRight, Quote } from "lucide-react";
import { host, initials, SKILL_LABEL } from "../../format";
import { CountUp, DrawLine, Entrance, Reveal, Rise } from "../../motion";
import { ContactAction, CvAction } from "../../parts/actions";
import { ContactForm } from "../../portfolio/ContactForm";
import { outcome, quickFacts, timeline } from "../../portfolio/data";
import type { KitProps } from "../../portfolio/PortfolioSite";
import { PortfolioLink } from "../../portfolio/route";
import type { PageProject } from "../../types";
import { outline, Section, SectionTitle, solid, Tag, Ticks } from "./shared";

export function Hero({ page, preview }: KitProps) {
  const line = page.hero_line ?? page.headline ?? page.name;
  return (
    <Section label="Introduction">
      <Entrance>
        <Rise>
          <p className="font-pg-mono text-[0.8125rem] text-pg-accent">
            // hello
          </p>
        </Rise>
        <Rise>
          <h1
            data-fit
            className="mt-4 max-w-[48rem] font-pg-display text-[clamp(2.4rem,6.4cqi,4.6rem)] font-extrabold leading-[0.98] tracking-[-0.025em] [font-stretch:122%]"
          >
            {line}
          </h1>
        </Rise>
        {page.currently && (
          <Rise>
            <p className="mt-6 inline-flex items-start gap-2 font-pg-mono text-[0.875rem] text-pg-ink-2">
              <span className="text-pg-accent" aria-hidden>
                &gt;
              </span>
              <span>
                <span className="text-pg-ink-3">currently: </span>
                {page.currently}
              </span>
            </p>
          </Rise>
        )}
        <Rise className="mt-8 flex flex-wrap gap-2">
          {page.projects.length > 0 && (
            <PortfolioLink to={{ page: "work" }} className={solid}>
              See my work <ArrowRight className="size-4" aria-hidden />
            </PortfolioLink>
          )}
          {page.cv_url && (
            <CvAction page={page} preview={preview} className={outline} />
          )}
          <ContactAction page={page} preview={preview} className={outline} />
        </Rise>
      </Entrance>
    </Section>
  );
}

export function About({ page, teaser }: KitProps & { teaser?: boolean }) {
  const paragraphs = page.about.length
    ? page.about
    : page.summary
      ? [page.summary]
      : [];
  const facts = quickFacts(page);
  return (
    <Section label="About">
      <SectionTitle index="/about">About</SectionTitle>
      <div className="grid gap-10 @4xl:grid-cols-[minmax(0,1fr)_17rem]">
        <Reveal>
          <div className="flex max-w-[42rem] flex-col gap-4 text-[1.125rem] leading-[1.7]">
            {(teaser ? paragraphs.slice(0, 1) : paragraphs).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          {teaser && (
            <PortfolioLink
              to={{ page: "about" }}
              className="mt-6 inline-flex items-center gap-1.5 font-pg-mono text-[0.875rem] font-semibold text-pg-accent hover:underline"
            >
              More about me <ArrowRight className="size-4" aria-hidden />
            </PortfolioLink>
          )}
        </Reveal>
        {!teaser && (facts.length > 0 || page.interests.length > 0) && (
          <Reveal delay={0.1}>
            <dl className="grid gap-3 border-l border-dashed border-pg-line pl-5 font-pg-mono text-[0.8125rem]">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-pg-ink-3">{fact.label.toLowerCase()}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
              {page.interests.length > 0 && (
                <div>
                  <dt className="text-pg-ink-3">outside work</dt>
                  <dd>{page.interests.join(", ")}</dd>
                </div>
              )}
            </dl>
          </Reveal>
        )}
      </div>
    </Section>
  );
}

export function Expertise({ page }: KitProps) {
  return (
    <Section label="What I do">
      <SectionTitle index="/expertise">What I do</SectionTitle>
      <div className="grid gap-4 @3xl:grid-cols-2">
        {page.expertise.map((area, index) => (
          <Reveal key={area.title} delay={index * 0.06}>
            <article className="relative h-full border border-pg-line bg-pg-2/70 p-6">
              <p className="font-pg-mono text-[0.75rem] text-pg-accent">
                module {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-2 text-[1.25rem] font-bold [font-stretch:110%]">
                {area.title}
              </h3>
              {area.description && (
                <p className="mt-2 leading-relaxed text-pg-ink-2">
                  {area.description}
                </p>
              )}
              {(area.tools ?? []).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(area.tools ?? []).map((tool) => (
                    <Tag key={tool}>{tool}</Tag>
                  ))}
                </div>
              )}
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

export function Achievements({ page }: KitProps) {
  return (
    <Section label="Achievements">
      <SectionTitle index="/achievements">Achievements</SectionTitle>
      {page.highlights.length > 0 && (
        <div className="grid gap-4 @xl:grid-cols-2">
          {page.highlights.map((highlight, index) => (
            <Reveal key={`${highlight.value}-${index}`} delay={index * 0.08}>
              <div className="h-full border border-pg-line bg-pg-2/70 p-5">
                <CountUp
                  value={highlight.value}
                  className="block font-pg-display text-[2.75rem] font-extrabold leading-none tracking-[-0.02em] text-pg-accent [font-stretch:125%]"
                />
                <div aria-hidden className="mt-4 flex items-center">
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
      )}
      {(page.awards.length > 0 || page.certifications.length > 0) && (
        <Reveal>
          <ul className="mt-8 divide-y divide-dashed divide-pg-line border-y border-dashed border-pg-line">
            {page.awards.map((award) => (
              <li
                key={award.title}
                className="grid gap-1 py-3 @2xl:grid-cols-[6rem_minmax(0,1fr)]"
              >
                <span className="font-pg-mono text-[0.75rem] text-pg-accent">
                  {award.year ?? "award"}
                </span>
                <span>
                  <span className="font-semibold">{award.title}</span>
                  {award.issuer && (
                    <span className="text-pg-ink-2">, {award.issuer}</span>
                  )}
                  {award.detail && (
                    <span className="block text-[0.9375rem] text-pg-ink-2">
                      {award.detail}
                    </span>
                  )}
                </span>
              </li>
            ))}
            {page.certifications.map((cert) => (
              <li
                key={cert.name}
                className="grid gap-1 py-3 @2xl:grid-cols-[6rem_minmax(0,1fr)]"
              >
                <span className="font-pg-mono text-[0.75rem] text-pg-ink-3">
                  {cert.year ?? "cert"}
                </span>
                <span>
                  <span className="font-semibold">{cert.name}</span>
                  {cert.issuer && (
                    <span className="text-pg-ink-2">, {cert.issuer}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      )}
    </Section>
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
  const line = outcome(project);
  const tools = project.case?.tools ?? [];
  return (
    <Reveal className={wide ? "@3xl:col-span-2" : undefined}>
      <PortfolioLink
        to={{ page: "project", path: project.path }}
        className="group block"
      >
        <div className="relative">
          <Ticks />
          {project.image_url ? (
            <img
              src={project.image_url}
              alt=""
              loading="lazy"
              className={`w-full border border-pg-line bg-pg-2 object-cover transition-[filter] duration-500 group-hover:brightness-105 ${wide ? "aspect-[16/8]" : "aspect-[16/10]"}`}
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
        <h3 className="mt-1.5 inline-flex items-center gap-2 text-[1.25rem] font-bold leading-snug [font-stretch:110%]">
          {project.name}
          <ArrowUpRight
            className="size-4 text-pg-accent transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            aria-hidden
          />
        </h3>
        {line && <p className="mt-2 leading-relaxed text-pg-ink-2">{line}</p>}
        {tools.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tools.slice(0, 5).map((tool) => (
              <Tag key={tool}>{tool}</Tag>
            ))}
          </div>
        )}
      </PortfolioLink>
    </Reveal>
  );
}

export function Work({ page, limit }: KitProps & { limit?: number }) {
  const projects = limit ? page.projects.slice(0, limit) : page.projects;
  return (
    <Section label="Work">
      <SectionTitle index="/work">Work</SectionTitle>
      <div className="grid gap-x-8 gap-y-12 @3xl:grid-cols-2">
        {projects.map((project, index) => (
          <Figure
            key={project.id}
            project={project}
            number={index + 1}
            wide={project.featured && !limit}
          />
        ))}
      </div>
      {limit && page.projects.length > limit && (
        <PortfolioLink to={{ page: "work" }} className={`mt-10 ${outline}`}>
          All {page.projects.length} projects{" "}
          <ArrowRight className="size-4" aria-hidden />
        </PortfolioLink>
      )}
    </Section>
  );
}

export function Timeline({ page }: KitProps) {
  const items = timeline(page);
  const roles = items.filter((item) => item.kind === "role").length;
  let version = roles + 1;
  return (
    <Section label="Experience">
      <SectionTitle index="/experience">Experience</SectionTitle>
      <ol className="relative">
        <DrawLine
          vertical
          className="absolute bottom-2 left-[7px] top-2 w-[2px] bg-pg-line"
        />
        {items.map((item, index) => {
          if (item.kind === "role") version -= 1;
          return (
            <li
              key={`${item.title}-${index}`}
              className="relative pb-9 pl-10 last:pb-0"
            >
              <Reveal>
                <span
                  aria-hidden
                  className={`absolute left-0 top-1.5 size-4 ${item.kind === "education" ? "rotate-45 border-2 border-pg-accent-3 bg-pg" : item.current ? "rounded-full border-2 border-pg-accent bg-pg-accent" : "rounded-full border-2 border-pg-ink-3 bg-pg"}`}
                />
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-pg-mono text-[0.75rem] text-pg-accent">
                    {item.kind === "role" ? `v${version}.0` : "education"}
                    {item.current && (
                      <span className="text-pg-ink-3"> / current</span>
                    )}
                  </p>
                  <p className="font-pg-mono text-[0.75rem] text-pg-ink-3">
                    {item.period}
                  </p>
                </div>
                <h3 className="mt-1.5 text-[1.2rem] font-bold leading-snug [font-stretch:110%]">
                  {item.title}
                </h3>
                {item.org && <p className="text-pg-ink-2">{item.org}</p>}
                {item.lines.length > 0 && (
                  <ul className="mt-2.5 flex max-w-[44rem] flex-col gap-1.5">
                    {item.lines.map((line) => (
                      <li key={line} className="flex gap-3 leading-relaxed">
                        <span
                          className="font-pg-mono text-pg-accent"
                          aria-hidden
                        >
                          +
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Reveal>
            </li>
          );
        })}
      </ol>
      {page.skills.length > 0 && (
        <Reveal>
          <div className="mt-12 flex flex-col gap-4 border-t border-dashed border-pg-line pt-8">
            {page.skills.map((group) => (
              <div
                key={group.category}
                className="grid gap-2 @2xl:grid-cols-[9rem_minmax(0,1fr)]"
              >
                <p className="pt-1 font-pg-mono text-[0.75rem] text-pg-ink-3">
                  {SKILL_LABEL[group.category]}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.names.map((name) => (
                    <Tag key={name}>{name}</Tag>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      )}
    </Section>
  );
}

export function Testimonials({ page }: KitProps) {
  return (
    <Section label="What people say">
      <SectionTitle index="/testimonials">What people say</SectionTitle>
      <div className="grid gap-4 @4xl:grid-cols-2">
        {page.testimonials.map((item, index) => (
          <Reveal key={item.name} delay={index * 0.08}>
            <figure className="h-full border border-pg-line bg-pg-2/70 p-6">
              <Quote className="size-6 text-pg-accent" aria-hidden />
              <blockquote className="mt-3 text-[1.0625rem] leading-relaxed">
                {item.quote}
              </blockquote>
              <figcaption className="mt-4 font-pg-mono text-[0.8125rem]">
                <span className="font-semibold">{item.name}</span>
                {item.role && (
                  <span className="text-pg-ink-3">, {item.role}</span>
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
  "min-h-11 w-full rounded-[6px] border border-pg-line bg-pg-2 px-3 py-2.5 text-[0.9375rem] outline-none transition-[border-color,box-shadow] focus:border-pg-accent focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--pg-accent)_22%,transparent)]";

export function Contact({ page, preview }: KitProps) {
  return (
    <Section label="Contact">
      <SectionTitle index="/contact">Contact</SectionTitle>
      <div className="grid gap-10 @4xl:grid-cols-[minmax(0,1fr)_16rem]">
        {page.contact_form ? (
          <Reveal>
            <ContactForm
              page={page}
              preview={preview}
              styles={{
                label: "font-pg-mono text-[0.75rem] text-pg-ink-3",
                input: field,
                chip: "rounded-[6px] border border-pg-line px-3 py-1.5 font-pg-mono text-[0.8125rem] text-pg-ink-2 hover:border-pg-ink",
                chipOn:
                  "rounded-[6px] border border-pg-accent bg-pg-accent px-3 py-1.5 font-pg-mono text-[0.8125rem] text-pg-accent-ink",
                submit: solid,
                success:
                  "border border-pg-accent/40 bg-pg-accent/[0.06] p-6 text-pg-ink",
              }}
            />
          </Reveal>
        ) : (
          <p className="text-[1.125rem] text-pg-ink-2">
            The best way to reach me is below.
          </p>
        )}
        <Reveal delay={0.1}>
          <div className="flex flex-col gap-3 font-pg-mono text-[0.875rem]">
            <ContactAction page={page} preview={preview} className={outline}>
              Email me
            </ContactAction>
            {page.whatsapp_url && (
              <a
                href={page.whatsapp_url}
                target="_blank"
                rel="noopener noreferrer"
                className={outline}
              >
                Chat on WhatsApp
              </a>
            )}
            {page.cv_url && (
              <CvAction page={page} preview={preview} className={outline} />
            )}
            {page.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="nofollow ugc noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-pg-accent hover:underline"
              >
                {link.label || host(link.url)}{" "}
                <ArrowUpRight className="size-3.5" aria-hidden />
              </a>
            ))}
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
