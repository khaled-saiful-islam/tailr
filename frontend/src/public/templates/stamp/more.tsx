import { ArrowRight, ArrowUpRight, MessageCircle } from "lucide-react";
import { motion } from "motion/react";
import { availabilityText, host, initials, SKILL_LABEL } from "../../format";
import { EASE, Reveal } from "../../motion";
import { ContactAction, CvAction } from "../../parts/actions";
import { ContactForm } from "../../portfolio/ContactForm";
import { outcome, timeline } from "../../portfolio/data";
import type { KitProps } from "../../portfolio/PortfolioSite";
import { PortfolioLink } from "../../portfolio/route";
import { Section, Sticker, Wrap } from "./shared";
import { box, lift, PAPER, PASTELS, plain, red, tag, TILTS } from "./styles";

export function Work({ page, limit }: KitProps & { limit?: number }) {
  const projects = limit ? page.projects.slice(0, limit) : page.projects;
  const more = limit !== undefined && page.projects.length > limit;
  return (
    <Section
      label="Selected work"
      title="Things I"
      accent="built"
      note="Each one opens as a case study: the problem, the decisions, what happened."
      paper="cream"
      aside={
        more ? (
          <PortfolioLink to={{ page: "work" }} className={plain}>
            All {page.projects.length} projects{" "}
            <ArrowRight className="size-5" aria-hidden />
          </PortfolioLink>
        ) : undefined
      }
    >
      <div
        className={`grid gap-8 @3xl:grid-cols-2 ${projects.length > 2 ? "@6xl:grid-cols-3" : ""}`}
      >
        {projects.map((project, index) => {
          const line = outcome(project);
          const tools = (project.case?.tools ?? []).slice(0, 3);
          return (
            <Reveal key={project.id} delay={(index % 3) * 0.07}>
              <PortfolioLink
                to={{ page: "project", path: project.path }}
                className={`group flex h-full flex-col bg-pg ${box} ${lift}`}
              >
                {project.image_url ? (
                  <img
                    src={project.image_url}
                    alt={project.name}
                    loading="lazy"
                    width={project.image_width ?? undefined}
                    height={project.image_height ?? undefined}
                    className="aspect-[16/10] w-full border-b-[3px] border-pg-line object-cover"
                  />
                ) : (
                  <span
                    className={`flex aspect-[16/10] items-end border-b-[3px] border-pg-line p-6 ${PASTELS[index % PASTELS.length]}`}
                  >
                    <span
                      data-fit
                      className="font-pg-display text-[clamp(1.75rem,4cqi,2.5rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.04em]"
                    >
                      {project.name}
                    </span>
                  </span>
                )}
                <span className="flex flex-1 flex-col p-6">
                  {(project.role || tools.length > 0) && (
                    <span className="flex flex-wrap gap-2">
                      {project.role && (
                        <span className="bg-pg-ink px-2.5 py-1 text-[0.75rem] font-bold uppercase tracking-[0.08em] text-pg shadow-[3px_3px_0_var(--pg-accent)]">
                          {project.role}
                        </span>
                      )}
                      {tools.map((tool) => (
                        <span key={tool} className={tag}>
                          {tool}
                        </span>
                      ))}
                    </span>
                  )}
                  <span
                    data-fit
                    className="mt-5 block font-pg-display text-[clamp(1.375rem,2.4cqi,1.75rem)] font-extrabold uppercase leading-[1.02] tracking-[-0.03em]"
                  >
                    {project.name}
                  </span>
                  {line && (
                    <span className="mt-3 block leading-relaxed text-pg-ink-2">
                      {line}
                    </span>
                  )}
                  <span aria-hidden className="block min-h-6 flex-1" />
                  <span aria-hidden className="block h-[3px] bg-pg-line" />
                  <span className="mt-5 flex items-center justify-between gap-3">
                    <span className="border-2 border-pg-line bg-pg-accent px-2.5 py-1 text-[0.8125rem] font-extrabold uppercase tracking-[0.1em] text-pg-accent-ink">
                      Case study
                    </span>
                    <span className="grid size-10 place-items-center border-[3px] border-pg-line shadow-[3px_3px_0_var(--stamp-shadow)] transition-transform group-hover:translate-x-1">
                      <ArrowRight className="size-5" aria-hidden />
                    </span>
                  </span>
                </span>
              </PortfolioLink>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

export function Timeline({ page }: KitProps) {
  const items = timeline(page);
  return (
    <Section label="Experience" title="Career" accent="path">
      <ol className="flex flex-col gap-8">
        {items.map((item, index) => {
          const education = item.kind === "education";
          return (
            <li
              key={`${item.title}-${index}`}
              className="grid gap-4 @4xl:grid-cols-[13rem_minmax(0,1fr)] @4xl:gap-10"
            >
              <div className="flex flex-wrap items-start gap-3 @4xl:flex-col">
                <Sticker tilt={index % 2 ? 1.5 : -1.5}>{item.period}</Sticker>
                <span className={tag}>
                  {education ? "Education" : item.current ? "Now" : "Work"}
                </span>
              </div>
              <Reveal
                className={`p-6 @3xl:p-7 ${box} ${education ? "bg-(--stamp-mint)" : "bg-pg"}`}
              >
                <h3 className="font-pg-display text-[clamp(1.375rem,2.4cqi,1.75rem)] font-extrabold uppercase leading-[1.05] tracking-[-0.03em]">
                  {item.title}
                </h3>
                {item.org && (
                  <p className="mt-1 text-[1.0625rem] font-bold text-pg-ink-2">
                    {item.org}
                  </p>
                )}
                {item.lines.length > 0 && (
                  <ul className="mt-4 flex flex-col gap-2 border-t-[3px] border-pg-line pt-4">
                    {item.lines.map((line) => (
                      <li key={line} className="flex gap-3 leading-relaxed">
                        <span
                          aria-hidden
                          className="mt-2 size-2.5 shrink-0 bg-pg-accent"
                        />
                        {line}
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
        <div className="mt-16 grid gap-8 @3xl:grid-cols-2">
          {page.skills.map((group) => (
            <Reveal key={group.category}>
              <h3 className="inline-block border-b-[4px] border-pg-accent pb-1 text-[0.875rem] font-bold uppercase tracking-[0.14em]">
                {SKILL_LABEL[group.category]}
              </h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {group.names.map((name) => (
                  <li key={name} className={tag}>
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
  const cards = [PASTELS[0], PASTELS[1], PASTELS[3]];
  return (
    <Section label="Recommendations" title="Kind" accent="words" paper="mint">
      <div className="grid gap-10 @3xl:grid-cols-2">
        {page.testimonials.map((item, index) => (
          <Reveal key={item.name} delay={(index % 2) * 0.07}>
            <figure
              style={{ rotate: `${index % 2 ? 0.8 : -0.8}deg` }}
              className={`flex h-full flex-col p-6 @3xl:p-8 ${box} ${cards[index % cards.length]}`}
            >
              <span
                aria-hidden
                className="font-pg-display text-[4.5rem] font-extrabold leading-[0.6] text-pg-accent"
              >
                &ldquo;
              </span>
              <blockquote className="mt-3 text-[clamp(1.125rem,1.9cqi,1.3125rem)] font-medium leading-relaxed">
                {item.quote}
              </blockquote>
              <span aria-hidden className="block min-h-6 flex-1" />
              <figcaption className="flex items-center gap-3 border-t-[3px] border-pg-line pt-5">
                <span className="grid size-11 shrink-0 place-items-center bg-pg-ink font-bold text-pg">
                  {initials(item.name)}
                </span>
                <span>
                  <span className="block font-bold uppercase tracking-[0.06em]">
                    {item.name}
                  </span>
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
  "min-h-12 w-full border-[3px] border-pg-line bg-pg px-4 py-3 text-[1rem] outline-none transition-shadow focus:shadow-[4px_4px_0_var(--pg-accent)]";

export function Contact({ page, preview }: KitProps) {
  const available = availabilityText(page);
  const facts = [
    available ? { label: "Status", value: available } : null,
    page.location ? { label: "Based in", value: page.location } : null,
    page.languages.length
      ? { label: "Speaks", value: page.languages.map((l) => l.name).join(", ") }
      : null,
  ].filter((fact): fact is { label: string; value: string } => fact !== null);
  return (
    <section
      aria-label="Contact"
      className={`border-t-[3px] border-pg-line py-16 @3xl:py-24 ${PAPER.red}`}
    >
      <Wrap className="grid gap-12 @5xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] @5xl:items-start">
        <motion.div
          initial={{ opacity: 0, y: 30, rotate: 0 }}
          whileInView={{ opacity: 1, y: 0, rotate: -0.6 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="relative border-[3px] border-pg-line bg-pg p-6 text-pg-ink shadow-[12px_12px_0_var(--pg-ink)] @3xl:p-10"
        >
          <Sticker className="absolute -top-5 left-6" tilt={-3}>
            Say hello
          </Sticker>
          <h2
            data-fit
            className="mt-4 font-pg-display text-[clamp(3rem,9cqi,6.5rem)] font-extrabold uppercase leading-[0.88] tracking-[-0.05em]"
          >
            Let&apos;s <span className="text-pg-accent">talk.</span>
          </h2>
          <div aria-hidden className="mt-7 h-[5px] bg-pg-line" />
          <div className="mt-8">
            {page.contact_form ? (
              <ContactForm
                page={page}
                preview={preview}
                styles={{
                  label:
                    "text-[0.8125rem] font-bold uppercase tracking-[0.12em]",
                  input: field,
                  chip: "border-[3px] border-pg-line bg-pg px-4 py-2 text-[0.8125rem] font-bold uppercase tracking-[0.08em] hover:bg-(--stamp-cream)",
                  chipOn:
                    "border-[3px] border-pg-line bg-pg-ink px-4 py-2 text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-pg shadow-[3px_3px_0_var(--pg-accent)]",
                  submit: red,
                  note: "text-[0.8125rem] text-pg-ink-3",
                  success: `bg-(--stamp-mint) p-6 ${box}`,
                }}
              />
            ) : (
              <p className="max-w-[32rem] text-[1.25rem] font-semibold">
                Write to me any way you like: the buttons are right here.
              </p>
            )}
          </div>
        </motion.div>

        <div className="flex flex-col gap-6">
          {facts.map((fact, index) => (
            <Reveal key={fact.label} delay={index * 0.06}>
              <div
                style={{ rotate: `${TILTS[index % TILTS.length]! / 2}deg` }}
                className={`p-5 text-pg-ink ${PASTELS[index % PASTELS.length]} border-[3px] border-pg-line shadow-[6px_6px_0_var(--pg-ink)]`}
              >
                <p className="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-pg-accent">
                  {fact.label}
                </p>
                <p className="mt-1 font-pg-display text-[1.25rem] font-extrabold uppercase leading-snug tracking-[-0.02em]">
                  {fact.value}
                </p>
              </div>
            </Reveal>
          ))}
          <div className="flex flex-col items-start gap-4 pt-2">
            <ContactAction page={page} preview={preview} className={plain} />
            {page.whatsapp_url && (
              <a
                href={page.whatsapp_url}
                target="_blank"
                rel="noopener noreferrer"
                className={plain}
              >
                <MessageCircle className="size-5" aria-hidden />
                Chat on WhatsApp
              </a>
            )}
            <CvAction page={page} preview={preview} className={plain} />
          </div>
          {page.links.length > 0 && (
            <ul className="flex flex-wrap gap-x-6 gap-y-3 pt-2">
              {page.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="nofollow ugc noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[0.875rem] font-bold uppercase tracking-[0.12em] underline decoration-[3px] underline-offset-[6px]"
                  >
                    {link.label || host(link.url)}
                    <ArrowUpRight className="size-4" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Wrap>
    </section>
  );
}
