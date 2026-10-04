import { ArrowRight, Award as AwardIcon, BadgeCheck } from "lucide-react";
import { motion } from "motion/react";
import { availabilityText, currentRole, initials } from "../../format";
import { CountUp, Entrance, Reveal, Rise } from "../../motion";
import { ContactAction, CvAction } from "../../parts/actions";
import { figures, quickFacts } from "../../portfolio/data";
import type { KitProps } from "../../portfolio/PortfolioSite";
import { PortfolioLink } from "../../portfolio/route";
import type { PublicPage } from "../../types";
import { Section, Stamped, Sticker } from "./shared";
import { box, PAPER, PASTELS, plain, red, tag, TILTS } from "./styles";

/** The red panel: skills as stickers that drop into place, and a card about now. */
function Board({ page }: { page: PublicPage }) {
  const skills = page.skills.flatMap((group) => group.names).slice(0, 10);
  const role = currentRole(page);
  const now =
    page.currently ?? (role ? `${role.title} at ${role.company}` : null);
  return (
    <div
      className={`relative flex flex-col justify-center gap-10 px-5 py-14 @3xl:px-10 @5xl:py-16 @5xl:pl-[13%] @5xl:[clip-path:polygon(9%_0,100%_0,100%_100%,0_100%)] ${PAPER.red}`}
    >
      {skills.length > 0 && (
        <ul
          aria-label="Skills"
          className="flex max-w-[34rem] flex-wrap gap-x-3.5 gap-y-4"
        >
          {skills.map((skill, index) => (
            <motion.li
              key={skill}
              initial={{ opacity: 0, y: -36, rotate: 0 }}
              animate={{
                opacity: 1,
                y: 0,
                rotate: TILTS[index % TILTS.length],
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 18,
                delay: 0.35 + index * 0.06,
              }}
              className={`border-[3px] border-pg-line px-4 py-2 text-[0.875rem] font-bold uppercase tracking-[0.12em] text-pg-ink shadow-[4px_4px_0_var(--stamp-shadow)] ${PASTELS[index % PASTELS.length]}`}
            >
              {skill}
            </motion.li>
          ))}
        </ul>
      )}
      <motion.div
        initial={{ opacity: 0, y: 40, rotate: 0 }}
        animate={{ opacity: 1, y: 0, rotate: -1.5 }}
        transition={{ type: "spring", stiffness: 140, damping: 16, delay: 0.5 }}
        className={`flex max-w-[30rem] items-center gap-5 bg-(--stamp-cream) p-5 text-pg-ink @3xl:p-6 ${box} shadow-[10px_10px_0_var(--stamp-shadow)]`}
      >
        {page.photo_url ? (
          <img
            src={page.photo_url}
            alt={page.name}
            className="size-24 shrink-0 border-[3px] border-pg-line object-cover @3xl:size-28"
          />
        ) : (
          <span
            aria-hidden
            className="grid size-24 shrink-0 place-items-center bg-pg-ink font-pg-display text-[2.25rem] font-extrabold text-pg @3xl:size-28"
          >
            {initials(page.name)}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-pg-accent">
            {now ? "Right now" : "Hello, I'm"}
          </p>
          <p
            data-fit
            className="mt-1 font-pg-display text-[clamp(1.25rem,2.4cqi,1.75rem)] font-extrabold uppercase leading-[1.02] tracking-[-0.03em]"
          >
            {now ?? page.name}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export function Hero({ page, preview }: KitProps) {
  const available = availabilityText(page);
  const line = page.hero_line ?? page.headline ?? page.name;
  const under = [page.hero_line ? page.headline : null, page.location]
    .filter(Boolean)
    .join(", ");
  return (
    <section
      aria-label="Introduction"
      className="@5xl:grid @5xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
    >
      <div className="px-5 pb-14 pt-12 @3xl:px-10 @3xl:pt-16 @5xl:pb-20 @5xl:pl-[max(2.5rem,calc((100cqi-82rem)/2+2.5rem))] @5xl:pt-20">
        <Entrance>
          <Rise>
            <Sticker>{page.name}</Sticker>
          </Rise>
          <h1
            data-fit
            className="mt-8 font-pg-display text-[clamp(2.75rem,7.6cqi,6.75rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.05em]"
          >
            <Stamped text={line} delay={0.1} />
          </h1>
          {under && (
            <Rise>
              <p className="mt-7 max-w-[36rem] text-[clamp(1.0625rem,1.7cqi,1.25rem)] font-medium leading-relaxed text-pg-ink-2">
                {under}
              </p>
            </Rise>
          )}
          <Rise className="mt-9 flex flex-wrap gap-4">
            {page.projects.length > 0 && (
              <PortfolioLink to={{ page: "work" }} className={red}>
                See my work <ArrowRight className="size-5" aria-hidden />
              </PortfolioLink>
            )}
            <CvAction page={page} preview={preview} className={plain} />
            <ContactAction page={page} preview={preview} className={plain} />
          </Rise>
          {available && (
            <Rise>
              <p className="mt-9 flex items-center gap-2.5 text-[0.8125rem] font-bold uppercase tracking-[0.12em]">
                <span
                  aria-hidden
                  className="size-2.5 animate-pg-pulse bg-pg-accent"
                />
                {available}
              </p>
            </Rise>
          )}
        </Entrance>
      </div>
      <Board page={page} />
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
  const facts = teaser ? [] : quickFacts(page);
  return (
    <Section
      label="Who I am"
      title="About"
      accent="me"
      paper={teaser ? "plain" : "cream"}
    >
      <div className="grid gap-10 @4xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] @4xl:gap-14">
        <Reveal>
          <div className="flex flex-col gap-5 text-[clamp(1.1875rem,2cqi,1.4375rem)] font-medium leading-[1.55]">
            {shown.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          {teaser && (
            <PortfolioLink to={{ page: "about" }} className={`mt-9 ${plain}`}>
              More about me <ArrowRight className="size-5" aria-hidden />
            </PortfolioLink>
          )}
          {!teaser && page.interests.length > 0 && (
            <div className="mt-10">
              <p className="text-[0.8125rem] font-bold uppercase tracking-[0.14em]">
                Outside work
              </p>
              <ul className="mt-4 flex flex-wrap gap-3.5">
                {page.interests.map((interest, index) => (
                  <li
                    key={interest}
                    style={{ rotate: `${TILTS[index % TILTS.length]}deg` }}
                    className={`border-[3px] border-pg-line px-4 py-2 text-[0.875rem] font-bold uppercase tracking-[0.1em] shadow-[4px_4px_0_var(--stamp-shadow)] ${PASTELS[(index + 1) % PASTELS.length]}`}
                  >
                    {interest}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Reveal>
        {facts.length > 0 && (
          <Reveal delay={0.1}>
            <dl className="flex flex-col gap-4">
              {facts.map((fact, index) => (
                <div
                  key={fact.label}
                  className={`bg-pg p-4 @3xl:p-5 ${box}`}
                  style={{ rotate: `${index % 2 ? 0.6 : -0.6}deg` }}
                >
                  <dt className="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-pg-accent">
                    {fact.label}
                  </dt>
                  <dd className="mt-1 text-[1.0625rem] font-bold leading-snug">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        )}
      </div>
    </Section>
  );
}

export function Expertise({ page }: KitProps) {
  const cards = ["bg-pg", ...PASTELS.filter((_, i) => i !== 2)];
  return (
    <Section
      label="Expertise"
      title="What I"
      accent="do"
      note="Where I'm most useful, and the tools I use there."
      paper="mint"
    >
      <div className="grid gap-8 @3xl:grid-cols-2 @6xl:grid-cols-3">
        {page.expertise.map((area, index) => (
          <Reveal key={area.title} delay={(index % 3) * 0.07}>
            <article
              className={`relative flex h-full flex-col p-6 @3xl:p-7 ${box} ${cards[index % cards.length]}`}
            >
              <span
                aria-hidden
                style={{ rotate: `${index % 2 ? -6 : 6}deg` }}
                className="absolute -right-3 -top-4 grid size-10 place-items-center bg-pg-ink font-pg-display text-[1.125rem] font-extrabold text-pg shadow-[3px_3px_0_var(--pg-accent)]"
              >
                {index + 1}
              </span>
              <h3
                data-fit
                className="pr-6 font-pg-display text-[clamp(1.375rem,2.6cqi,1.75rem)] font-extrabold uppercase leading-[1.02] tracking-[-0.03em]"
              >
                {area.title}
              </h3>
              <div aria-hidden className="mt-4 h-[3px] bg-pg-line" />
              {area.description && (
                <p className="mt-4 text-[1.0625rem] leading-relaxed">
                  {area.description}
                </p>
              )}
              {(area.tools ?? []).length > 0 && (
                <ul className="mt-auto flex flex-wrap gap-2 pt-6">
                  {(area.tools ?? []).map((tool) => (
                    <li key={tool} className={tag}>
                      {tool}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

export function Achievements({ page }: KitProps) {
  const numbers = figures(page);
  const badges = [
    ...page.awards.map((award) => ({
      key: `award-${award.title}`,
      title: award.title,
      tags: [award.issuer, award.year ? String(award.year) : null],
      detail: award.detail ?? null,
      award: true,
    })),
    ...page.certifications.map((cert) => ({
      key: `cert-${cert.name}`,
      title: cert.name,
      tags: [cert.issuer, cert.year ? String(cert.year) : null],
      detail: null,
      award: false,
    })),
  ];
  return (
    <Section label="Track record" title="Proud" accent="of" paper="night">
      {numbers.length > 0 && (
        <div className="grid grid-cols-2 gap-5 @4xl:grid-cols-4">
          {numbers.map((number, index) => (
            <Reveal key={`${number.value}-${index}`} delay={index * 0.06}>
              <div
                style={{ rotate: `${TILTS[index % TILTS.length]! / 2}deg` }}
                className="flex h-full flex-col justify-between border-[3px] border-pg-line bg-pg p-5 text-pg-ink shadow-[6px_6px_0_var(--pg-accent)] @3xl:p-6"
              >
                <CountUp
                  value={number.value}
                  className="block font-pg-display text-[clamp(2.25rem,5.5cqi,3.75rem)] font-extrabold leading-none tracking-[-0.04em]"
                />
                <p className="mt-5 text-[0.8125rem] font-bold uppercase leading-snug tracking-[0.12em] text-pg-accent">
                  {number.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      )}
      {badges.length > 0 && (
        <ul
          className={`grid gap-5 @3xl:grid-cols-2 ${numbers.length ? "mt-12" : ""}`}
        >
          {badges.map((badge, index) => (
            <li key={badge.key}>
              <Reveal
                delay={(index % 2) * 0.06}
                className="flex h-full items-start gap-4 border-[3px] border-pg-line bg-pg p-5 text-pg-ink shadow-[6px_6px_0_var(--stamp-night-shadow)]"
              >
                <span className="grid size-12 shrink-0 place-items-center border-[3px] border-pg-line bg-pg-ink text-pg">
                  {badge.award ? (
                    <AwardIcon className="size-5" aria-hidden />
                  ) : (
                    <BadgeCheck className="size-5" aria-hidden />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block font-pg-display text-[1.1875rem] font-extrabold uppercase leading-snug tracking-[-0.01em]">
                    {badge.title}
                  </span>
                  {badge.tags.some(Boolean) && (
                    <span className="mt-2 flex flex-wrap gap-2">
                      {badge.tags.filter(Boolean).map((label) => (
                        <span key={label} className={tag}>
                          {label}
                        </span>
                      ))}
                    </span>
                  )}
                  {badge.detail && (
                    <span className="mt-2 block text-pg-ink-2">
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
