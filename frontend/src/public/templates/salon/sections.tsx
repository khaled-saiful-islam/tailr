import { ArrowRight, ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { useRef } from "react";
import { availabilityText, host, SKILL_LABEL } from "../../format";
import { CountUp, Entrance, MaskRise, Reveal, Rise } from "../../motion";
import { ContactAction, CvAction } from "../../parts/actions";
import { ContactForm } from "../../portfolio/ContactForm";
import { outcome, quickFacts, timeline } from "../../portfolio/data";
import type { KitProps } from "../../portfolio/PortfolioSite";
import { PortfolioLink } from "../../portfolio/route";
import { useRoute } from "../../portfolio/routing";
import type { PageProject } from "../../types";
import { Curtain, ghost, LabelSection, solid, ViewTag } from "./shared";

export function Hero({ page, preview }: KitProps) {
  const available = availabilityText(page);
  const line = page.hero_line ?? page.headline ?? page.name;
  return (
    <header className="grid gap-8 pb-14 pt-6 @4xl:grid-cols-[minmax(0,1fr)_auto] @4xl:items-end @4xl:pt-14">
      <Entrance className="min-w-0">
        {available && (
          <Rise>
            <p className="mb-6 inline-flex items-center gap-2 text-[0.9375rem] text-pg-ink-2">
              <span
                className="size-2 shrink-0 rounded-full bg-pg-accent animate-pg-pulse"
                aria-hidden
              />
              {available}
            </p>
          </Rise>
        )}
        <h1
          data-fit
          className="font-pg-display text-[clamp(2.75rem,9.5cqi,8.5rem)] font-extrabold leading-[0.9] tracking-[-0.035em]"
        >
          <MaskRise text={line} delay={0.1} />
        </h1>
        <Rise>
          <p className="mt-7 max-w-[40rem] text-[clamp(1.0625rem,2cqi,1.375rem)] leading-snug text-pg-ink-2">
            <span className="font-semibold text-pg-ink">{page.name}</span>
            {page.headline && line !== page.headline
              ? `, ${page.headline}`
              : ""}
            {page.location ? (
              <span className="text-pg-ink-3">, based in {page.location}</span>
            ) : null}
          </p>
        </Rise>
        <Rise className="mt-8 flex flex-wrap gap-2">
          {page.projects.length > 0 && (
            <PortfolioLink to={{ page: "work" }} className={solid}>
              View my work <ArrowRight className="size-4" aria-hidden />
            </PortfolioLink>
          )}
          {page.cv_url && (
            <CvAction page={page} preview={preview} className={ghost} />
          )}
          <ContactAction page={page} preview={preview} className={ghost} />
        </Rise>
      </Entrance>
      {page.photo_url && (
        <Entrance>
          <Rise>
            <img
              src={page.photo_url}
              alt={page.name}
              className="aspect-[3/4] w-44 object-cover @4xl:w-60"
            />
          </Rise>
        </Entrance>
      )}
    </header>
  );
}

function Piece({ project, index }: { project: PageProject; index: number }) {
  const line = outcome(project);
  return (
    <motion.li
      className="mb-8 break-inside-avoid"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.4, delay: (index % 3) * 0.08 }}
    >
      <PortfolioLink
        to={{ page: "project", path: project.path }}
        className="group block"
        ariaLabel={`${project.name}, open the project`}
      >
        <span data-view-tag className="block">
          {project.image_url ? (
            <Curtain
              src={project.image_url}
              alt={project.name}
              width={project.image_width}
              height={project.image_height}
              delay={(index % 3) * 0.1}
            />
          ) : (
            <span className="flex aspect-[4/3] items-end bg-pg-2 p-6 transition-colors group-hover:bg-pg-accent/10">
              <span
                data-fit
                className="min-w-0 font-pg-display text-[clamp(2rem,6cqi,3.5rem)] font-bold leading-[0.95] tracking-[-0.02em]"
              >
                {project.name}
              </span>
            </span>
          )}
        </span>
        <span className="mt-3 block font-semibold">{project.name}</span>
        {(project.role || line) && (
          <span className="mt-0.5 block text-[0.9375rem] leading-snug text-pg-ink-3">
            {[project.role, line].filter(Boolean).join(". ")}
          </span>
        )}
      </PortfolioLink>
    </motion.li>
  );
}

export function Work({ page, limit }: KitProps & { limit?: number }) {
  const gallery = useRef<HTMLElement>(null);
  const { route } = useRoute();
  const projects = limit ? page.projects.slice(0, limit) : page.projects;
  return (
    <section
      ref={gallery}
      aria-labelledby="salon-work"
      className="relative border-t border-pg-line pt-10"
    >
      <ViewTag area={gallery} />
      <h2
        id="salon-work"
        className={
          route.page === "work"
            ? "mb-10 font-pg-display text-[clamp(2.5rem,8cqi,6rem)] font-extrabold leading-[0.92] tracking-[-0.035em]"
            : "mb-8 font-pg-display text-[1.25rem] font-bold"
        }
      >
        Work
      </h2>
      <ul
        className={`columns-1 gap-8 @2xl:columns-2 ${projects.length > 2 ? "@5xl:columns-3" : ""}`}
      >
        {projects.map((project, index) => (
          <Piece key={project.id} project={project} index={index} />
        ))}
      </ul>
      {limit && page.projects.length > limit && (
        <PortfolioLink to={{ page: "work" }} className={`mt-2 ${ghost}`}>
          All work <ArrowRight className="size-4" aria-hidden />
        </PortfolioLink>
      )}
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
  return (
    <LabelSection label="About" id="salon-about">
      <Reveal>
        <div className="flex max-w-[48rem] flex-col gap-5 text-[clamp(1.25rem,2.4cqi,1.75rem)] leading-[1.45]">
          {shown.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        {teaser ? (
          <PortfolioLink to={{ page: "about" }} className={`mt-8 ${ghost}`}>
            More about me <ArrowRight className="size-4" aria-hidden />
          </PortfolioLink>
        ) : (
          <>
            {page.currently && (
              <p className="mt-8 text-[1.0625rem] text-pg-ink-2">
                <span className="text-pg-ink-3">Currently: </span>
                {page.currently}
              </p>
            )}
            {facts.length > 0 && (
              <dl className="mt-8 grid gap-x-10 gap-y-4 text-[0.9375rem] @2xl:grid-cols-2">
                {facts.map((fact) => (
                  <div key={fact.label}>
                    <dt className="text-pg-ink-3">{fact.label}</dt>
                    <dd className="mt-0.5">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {page.interests.length > 0 && (
              <p className="mt-6 text-[0.9375rem] text-pg-ink-2">
                <span className="text-pg-ink-3">Outside work: </span>
                {page.interests.join(", ")}
              </p>
            )}
          </>
        )}
      </Reveal>
    </LabelSection>
  );
}

export function Expertise({ page }: KitProps) {
  return (
    <LabelSection label="What I do" id="salon-expertise">
      <ul className="divide-y divide-pg-line">
        {page.expertise.map((area, index) => (
          <li key={area.title} className="py-6 first:pt-0">
            <Reveal delay={index * 0.05}>
              <div className="grid gap-2 @3xl:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] @3xl:gap-8">
                <h3 className="font-pg-display text-[1.5rem] font-bold leading-tight tracking-[-0.01em]">
                  {area.title}
                </h3>
                <div>
                  {area.description && (
                    <p className="text-[1.0625rem] leading-relaxed">
                      {area.description}
                    </p>
                  )}
                  {(area.tools ?? []).length > 0 && (
                    <p className="mt-2 text-[0.9375rem] text-pg-ink-3">
                      {(area.tools ?? []).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </LabelSection>
  );
}

export function Achievements({ page }: KitProps) {
  return (
    <LabelSection label="Achievements" id="salon-achievements">
      {page.highlights.length > 0 && (
        <div className="grid gap-x-10 gap-y-8 @2xl:grid-cols-2 @5xl:grid-cols-4">
          {page.highlights.map((highlight, index) => (
            <Reveal key={`${highlight.value}-${index}`} delay={index * 0.08}>
              <CountUp
                value={highlight.value}
                className="block font-pg-display text-[clamp(2.5rem,5cqi,3.75rem)] font-bold leading-none tracking-[-0.03em] text-pg-accent"
              />
              <p className="mt-3 max-w-[18rem] leading-snug text-pg-ink-2">
                {highlight.label}
              </p>
            </Reveal>
          ))}
        </div>
      )}
      {(page.awards.length > 0 || page.certifications.length > 0) && (
        <Reveal>
          <ul
            className={`divide-y divide-pg-line ${page.highlights.length ? "mt-10" : ""}`}
          >
            {page.awards.map((award) => (
              <li
                key={award.title}
                className="grid gap-1 py-4 first:pt-0 @3xl:grid-cols-[6rem_minmax(0,1fr)]"
              >
                <span className="text-[0.9375rem] text-pg-ink-3">
                  {award.year ?? ""}
                </span>
                <span>
                  <span className="font-semibold">{award.title}</span>
                  {award.issuer && (
                    <span className="text-pg-ink-2">, {award.issuer}</span>
                  )}
                  {award.detail && (
                    <span className="mt-0.5 block text-[0.9375rem] text-pg-ink-3">
                      {award.detail}
                    </span>
                  )}
                </span>
              </li>
            ))}
            {page.certifications.map((cert) => (
              <li
                key={cert.name}
                className="grid gap-1 py-4 first:pt-0 @3xl:grid-cols-[6rem_minmax(0,1fr)]"
              >
                <span className="text-[0.9375rem] text-pg-ink-3">
                  {cert.year ?? ""}
                </span>
                <span>
                  {cert.url ? (
                    <a
                      href={cert.url}
                      target="_blank"
                      rel="nofollow ugc noopener noreferrer"
                      className="font-semibold hover:text-pg-accent"
                    >
                      {cert.name}
                    </a>
                  ) : (
                    <span className="font-semibold">{cert.name}</span>
                  )}
                  {cert.issuer && (
                    <span className="text-pg-ink-2">, {cert.issuer}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      )}
    </LabelSection>
  );
}

export function Timeline({ page }: KitProps) {
  const items = timeline(page);
  return (
    <LabelSection label="Experience" id="salon-experience">
      <ul className="divide-y divide-pg-line">
        {items.map((item, index) => (
          <li key={`${item.title}-${index}`} className="py-5 first:pt-0">
            <Reveal>
              <div className="grid gap-1 @3xl:grid-cols-[10rem_minmax(0,1fr)] @3xl:gap-6">
                <p className="text-[0.9375rem] text-pg-ink-3">
                  {item.period}
                  {item.kind === "education" && (
                    <span className="block text-pg-accent">Education</span>
                  )}
                </p>
                <div>
                  <p className="text-[1.125rem] font-semibold">
                    {item.title}
                    {item.org && (
                      <span className="font-normal text-pg-ink-2">
                        , {item.org}
                      </span>
                    )}
                  </p>
                  {item.lines[0] && (
                    <p className="mt-1.5 text-pg-ink-2">{item.lines[0]}</p>
                  )}
                </div>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
      {page.skills.length > 0 && (
        <Reveal>
          <div className="mt-10 grid gap-x-10 gap-y-5 @3xl:grid-cols-2">
            {page.skills.map((group) => (
              <div key={group.category}>
                <h3 className="text-[0.9375rem] text-pg-ink-3">
                  {SKILL_LABEL[group.category]}
                </h3>
                <p className="mt-1 text-[1.0625rem] leading-relaxed">
                  {group.names.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      )}
    </LabelSection>
  );
}

export function Testimonials({ page }: KitProps) {
  return (
    <LabelSection label="Kind words" id="salon-testimonials">
      <div className="divide-y divide-pg-line">
        {page.testimonials.map((item, index) => (
          <Reveal key={item.name} delay={index * 0.06}>
            <figure className="py-8 first:pt-0">
              <blockquote className="max-w-[52rem] font-pg-display text-[clamp(1.5rem,3.2cqi,2.4rem)] font-semibold leading-[1.2] tracking-[-0.015em]">
                <span className="text-pg-accent" aria-hidden>
                  &ldquo;
                </span>
                {item.quote}
                <span className="text-pg-accent" aria-hidden>
                  &rdquo;
                </span>
              </blockquote>
              <figcaption className="mt-5 text-[0.9375rem] text-pg-ink-3">
                <span className="font-semibold text-pg-ink">{item.name}</span>
                {item.role && `, ${item.role}`}
                {item.relationship && (
                  <span className="block">{item.relationship}</span>
                )}
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </LabelSection>
  );
}

const underline =
  "w-full border-0 border-b border-pg-ink/25 bg-transparent px-0 py-2.5 text-[1.0625rem] outline-none transition-colors placeholder:text-pg-ink-3 focus:border-pg-accent";

export function Contact({ page, preview }: KitProps) {
  return (
    <section
      aria-labelledby="salon-contact"
      className="mt-20 border-t border-pg-line pt-12"
    >
      <Reveal>
        <h2
          id="salon-contact"
          className="font-pg-display text-[clamp(2.5rem,8cqi,6rem)] font-extrabold leading-[0.92] tracking-[-0.035em]"
        >
          Say hello.
        </h2>
      </Reveal>
      <div className="mt-10 grid gap-12 @4xl:grid-cols-[minmax(0,1fr)_18rem]">
        {page.contact_form ? (
          <Reveal>
            <ContactForm
              page={page}
              preview={preview}
              styles={{
                form: "flex max-w-[44rem] flex-col gap-6",
                label: "text-[0.875rem] text-pg-ink-3",
                input: underline,
                textarea: `${underline} resize-y`,
                chip: "rounded-full border border-pg-ink/20 px-4 py-1.5 text-[0.875rem] text-pg-ink-2 hover:border-pg-ink",
                chipOn:
                  "rounded-full border border-pg-ink bg-pg-ink px-4 py-1.5 text-[0.875rem] text-pg",
                submit: solid,
                success: "rounded-[2px] border border-pg-line bg-pg-2 p-8",
              }}
            />
          </Reveal>
        ) : (
          <p className="max-w-[36rem] text-[1.25rem] text-pg-ink-2">
            The quickest way to reach me is right here.
          </p>
        )}
        <Reveal delay={0.1}>
          <div className="flex flex-col items-start gap-3">
            <ContactAction page={page} preview={preview} className={ghost}>
              Email me
            </ContactAction>
            {page.whatsapp_url && (
              <a
                href={page.whatsapp_url}
                target="_blank"
                rel="noopener noreferrer"
                className={ghost}
              >
                Chat on WhatsApp
              </a>
            )}
            {page.cv_url && (
              <CvAction page={page} preview={preview} className={ghost} />
            )}
            {page.links.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2">
                {page.links.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="nofollow ugc noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[1.0625rem] font-semibold hover:text-pg-accent"
                    >
                      {link.label || host(link.url)}
                      <ArrowUpRight className="size-4" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
