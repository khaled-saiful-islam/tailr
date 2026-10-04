/**
 * Salon: a gallery wall. The work leads, words are the museum labels. Pictures
 * reveal behind a curtain, open into a detail view, and a small "View" tag follows
 * the pointer. For designers, architects and creatives.
 */
import { ArrowUpRight, X } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  availabilityText,
  currentRole,
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
import type { PageProject, TemplateProps } from "../types";

const pill =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[0.9375rem] font-semibold transition-colors";
const solid = `${pill} bg-pg-ink text-pg hover:bg-pg-accent hover:text-pg-accent-ink`;
const ghost = `${pill} border border-pg-ink/20 hover:border-pg-ink`;

function Piece({
  project,
  onOpen,
  index,
}: {
  project: PageProject;
  onOpen: () => void;
  index: number;
}) {
  return (
    <motion.li
      className="mb-8 break-inside-avoid"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.4, delay: (index % 3) * 0.08 }}
    >
      <button
        type="button"
        onClick={onOpen}
        data-view-tag
        className="group block w-full text-left"
        aria-label={`Open ${project.name}`}
      >
        {project.image_url ? (
          <motion.div
            className="overflow-hidden bg-pg-2"
            initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
            whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 1, ease: EASE, delay: (index % 3) * 0.1 }}
          >
            <motion.img
              layoutId={`salon-image-${project.id}`}
              src={project.image_url}
              alt={project.name}
              loading="lazy"
              width={project.image_width ?? undefined}
              height={project.image_height ?? undefined}
              className="w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              initial={{ scale: 1.08 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: EASE }}
            />
          </motion.div>
        ) : (
          <div className="flex aspect-[4/3] items-end bg-pg-2 p-6 transition-colors group-hover:bg-pg-accent/10">
            <span className="font-pg-display text-[clamp(2rem,6cqi,3.5rem)] font-bold leading-[0.95] tracking-[-0.02em]">
              {project.name}
            </span>
          </div>
        )}
        <span className="mt-3 block font-semibold">{project.name}</span>
        {(project.role || project.summary) && (
          <span className="mt-0.5 block text-[0.9375rem] leading-snug text-pg-ink-3">
            {[project.role, project.summary].filter(Boolean).join(". ")}
          </span>
        )}
      </button>
    </motion.li>
  );
}

function Detail({
  project,
  onClose,
}: {
  project: PageProject;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-y-auto bg-pg/95 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={project.name}
    >
      <div
        className="mx-auto grid max-w-[72rem] gap-8 px-5 py-16 @4xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @4xl:px-10"
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          {project.image_url ? (
            <motion.img
              layoutId={`salon-image-${project.id}`}
              src={project.image_url}
              alt={project.name}
              className="w-full object-contain"
            />
          ) : (
            <div className="grid aspect-[4/3] place-items-center bg-pg-2 font-pg-display text-[6rem] font-bold text-pg-accent">
              {initials(project.name)}
            </div>
          )}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: EASE }}
        >
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-pg-ink/20 px-4 py-2 text-[0.875rem] font-semibold hover:border-pg-ink"
          >
            <X className="size-4" aria-hidden /> Close
          </button>
          {project.role && (
            <p className="text-[0.9375rem] text-pg-ink-3">{project.role}</p>
          )}
          <h2 className="mt-1 font-pg-display text-[2.5rem] font-bold leading-[1.02] tracking-[-0.02em]">
            {project.name}
          </h2>
          {project.summary && (
            <p className="mt-4 text-[1.125rem] leading-relaxed text-pg-ink-2">
              {project.summary}
            </p>
          )}
          {project.bullets.length > 0 && (
            <ul className="mt-5 flex flex-col gap-2.5 border-t border-pg-line pt-5">
              {project.bullets.map((bullet) => (
                <li key={bullet} className="leading-relaxed">
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
              className="mt-6 inline-flex items-center gap-1.5 font-semibold text-pg-accent hover:underline"
            >
              {host(project.url)}{" "}
              <ArrowUpRight className="size-4" aria-hidden />
            </a>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

/** On mouse and trackpad only: a small "View" label that follows the pointer over the work. */
function ViewTag({ area }: { area: React.RefObject<HTMLElement | null> }) {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40 });
  const sy = useSpring(y, { stiffness: 500, damping: 40 });
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const element = area.current;
    if (!element || !matchMedia("(pointer: fine)").matches) return;
    const move = (event: PointerEvent) => {
      const box = element.getBoundingClientRect();
      x.set(event.clientX - box.left + 14);
      y.set(event.clientY - box.top + 14);
      setShown(
        Boolean((event.target as HTMLElement).closest("[data-view-tag]")),
      );
    };
    const leave = () => setShown(false);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerleave", leave);
    return () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", leave);
    };
  }, [area, x, y]);

  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-10 rounded-full bg-pg-accent px-3 py-1 text-[0.8125rem] font-semibold text-pg-accent-ink"
      style={{ x: sx, y: sy }}
      animate={{ opacity: shown ? 1 : 0, scale: shown ? 1 : 0.6 }}
      transition={{ duration: 0.18 }}
    >
      View
    </motion.span>
  );
}

export default function Salon(props: TemplateProps) {
  const { page, mode, onToggleMode, preview } = props;
  const [open, setOpen] = useState<PageProject | null>(null);
  const gallery = useRef<HTMLElement>(null);
  const now = currentRole(page);
  const available = availabilityText(page);

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-[88rem] px-5 pb-20 @3xl:px-10">
        <Entrance>
          <Rise className="flex items-center justify-between gap-4 py-5">
            <span className="text-[0.9375rem] font-semibold">
              {page.name.split(" ")[0]}
            </span>
            <ModeAction
              mode={mode}
              onToggle={onToggleMode}
              className="grid size-10 place-items-center rounded-full text-pg-ink-2 hover:bg-pg-ink/[0.06] hover:text-pg-ink"
            />
          </Rise>

          <header className="grid gap-8 pb-14 pt-6 @4xl:grid-cols-[minmax(0,1fr)_auto] @4xl:items-end @4xl:pt-14">
            <div className="min-w-0">
              {available && (
                <Rise>
                  <p className="mb-6 inline-flex items-center gap-2 text-[0.9375rem] text-pg-ink-2">
                    <span
                      className="size-2 rounded-full bg-pg-accent animate-pg-pulse"
                      aria-hidden
                    />
                    {available}
                  </p>
                </Rise>
              )}
              <h1 className="font-pg-display text-[clamp(3rem,11.5cqi,9.5rem)] font-extrabold leading-[0.86] tracking-[-0.035em]">
                <MaskRise text={page.name} delay={0.1} />
              </h1>
              {(page.headline || page.location) && (
                <Rise>
                  <p className="mt-6 max-w-[40rem] text-[clamp(1.125rem,2.2cqi,1.5rem)] leading-snug text-pg-ink-2">
                    {page.headline}
                    {page.headline && page.location ? (
                      <span className="text-pg-ink-3">
                        , based in {page.location}
                      </span>
                    ) : (
                      page.location
                    )}
                  </p>
                </Rise>
              )}
              <Rise className="mt-8 hidden flex-wrap gap-2 @3xl:flex">
                <ContactAction
                  page={page}
                  preview={preview}
                  className={solid}
                />
                <CvAction page={page} preview={preview} className={ghost} />
                <ShareAction
                  page={page}
                  className={ghost}
                  menuClassName="rounded-2xl"
                />
              </Rise>
            </div>
            {page.photo_url && (
              <Rise>
                <img
                  src={page.photo_url}
                  alt={page.name}
                  className="aspect-[3/4] w-40 object-cover @4xl:w-56"
                />
              </Rise>
            )}
          </header>
        </Entrance>

        {shows(page, "projects") && (
          <section
            ref={gallery}
            aria-label="Work"
            className="relative border-t border-pg-line pt-10"
          >
            <ViewTag area={gallery} />
            <ul className="columns-1 gap-8 @2xl:columns-2 @5xl:columns-3">
              {page.projects.map((project, index) => (
                <Piece
                  key={project.id}
                  project={project}
                  index={index}
                  onOpen={() => setOpen(project)}
                />
              ))}
            </ul>
          </section>
        )}

        {shows(page, "highlights") && (
          <section
            aria-label="By the numbers"
            className="mt-16 grid gap-x-10 gap-y-8 border-t border-pg-line pt-10 @2xl:grid-cols-2 @5xl:grid-cols-4"
          >
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
          </section>
        )}

        {page.summary && (
          <section
            aria-labelledby="salon-about"
            className="mt-16 grid gap-6 border-t border-pg-line pt-10 @4xl:grid-cols-[14rem_minmax(0,1fr)]"
          >
            <h2
              id="salon-about"
              className="font-pg-display text-[1.25rem] font-bold"
            >
              About
            </h2>
            <Reveal>
              <p className="max-w-[48rem] text-[clamp(1.25rem,2.4cqi,1.75rem)] leading-[1.45]">
                {page.summary}
              </p>
            </Reveal>
          </section>
        )}

        {shows(page, "experience") && (
          <section
            aria-labelledby="salon-work"
            className="mt-16 grid gap-6 border-t border-pg-line pt-10 @4xl:grid-cols-[14rem_minmax(0,1fr)]"
          >
            <h2
              id="salon-work"
              className="font-pg-display text-[1.25rem] font-bold"
            >
              Experience
            </h2>
            <ul className="divide-y divide-pg-line">
              {page.experiences.map((role, index) => (
                <li
                  key={`${role.company}-${index}`}
                  className="py-5 first:pt-0"
                >
                  <Reveal>
                    <div className="grid gap-1 @3xl:grid-cols-[10rem_minmax(0,1fr)] @3xl:gap-6">
                      <p className="text-[0.9375rem] text-pg-ink-3">
                        {dateRange(role.start, role.end, role.current)}
                      </p>
                      <div>
                        <p className="text-[1.125rem] font-semibold">
                          {role.title}
                          <span className="font-normal text-pg-ink-2">
                            , {role.company}
                          </span>
                        </p>
                        {role.bullets.length > 0 && (
                          <ul className="mt-2 flex flex-col gap-1.5 text-pg-ink-2">
                            {role.bullets.map((bullet) => (
                              <li key={bullet}>{bullet}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(shows(page, "skills") ||
          shows(page, "education") ||
          shows(page, "certifications") ||
          shows(page, "languages")) && (
          <section
            aria-labelledby="salon-more"
            className="mt-16 grid gap-6 border-t border-pg-line pt-10 @4xl:grid-cols-[14rem_minmax(0,1fr)]"
          >
            <h2
              id="salon-more"
              className="font-pg-display text-[1.25rem] font-bold"
            >
              Skills and studies
            </h2>
            <div className="grid gap-x-10 gap-y-8 @3xl:grid-cols-2">
              {shows(page, "skills") &&
                page.skills.map((group) => (
                  <Reveal key={group.category}>
                    <h3 className="text-[0.9375rem] text-pg-ink-3">
                      {SKILL_LABEL[group.category]}
                    </h3>
                    <p className="mt-1 text-[1.0625rem] leading-relaxed">
                      {group.names.join(", ")}
                    </p>
                  </Reveal>
                ))}
              {shows(page, "education") && (
                <Reveal>
                  <h3 className="text-[0.9375rem] text-pg-ink-3">Education</h3>
                  {page.education.map((item) => (
                    <p
                      key={`${item.institution}-${item.end_year}`}
                      className="mt-1 text-[1.0625rem] leading-relaxed"
                    >
                      {[item.qualification, item.field]
                        .filter(Boolean)
                        .join(", ") || item.institution}
                      <span className="text-pg-ink-3">
                        {item.qualification || item.field
                          ? `, ${item.institution}`
                          : ""}
                        , {yearRange(item.start_year, item.end_year)}
                      </span>
                    </p>
                  ))}
                </Reveal>
              )}
              {shows(page, "certifications") && (
                <Reveal>
                  <h3 className="text-[0.9375rem] text-pg-ink-3">
                    Certifications
                  </h3>
                  {page.certifications.map((cert) => (
                    <p
                      key={cert.name}
                      className="mt-1 text-[1.0625rem] leading-relaxed"
                    >
                      {cert.name}
                      {cert.year && (
                        <span className="text-pg-ink-3">, {cert.year}</span>
                      )}
                    </p>
                  ))}
                </Reveal>
              )}
              {shows(page, "languages") && (
                <Reveal>
                  <h3 className="text-[0.9375rem] text-pg-ink-3">Languages</h3>
                  <p className="mt-1 text-[1.0625rem] leading-relaxed">
                    {page.languages.map((language) => language.name).join(", ")}
                  </p>
                </Reveal>
              )}
            </div>
          </section>
        )}

        <section
          aria-labelledby="salon-contact"
          className="mt-20 border-t border-pg-line pt-12"
        >
          <Reveal>
            <h2
              id="salon-contact"
              className="font-pg-display text-[clamp(2.25rem,7cqi,5rem)] font-extrabold leading-[0.95] tracking-[-0.03em]"
            >
              {now?.current ? "Say hello." : "Let's talk."}
            </h2>
            <div className="mt-8 flex flex-wrap gap-2">
              <ContactAction page={page} preview={preview} className={solid} />
              <CvAction page={page} preview={preview} className={ghost} />
              <ShareAction
                page={page}
                up
                className={ghost}
                menuClassName="rounded-2xl"
              />
            </div>
            {page.links.length > 0 && (
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
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
          </Reveal>
        </section>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 text-[0.875rem] text-pg-ink-3">
          <span>{page.name}</span>
          <MadeWithTailr className="hover:text-pg-ink" />
        </footer>
      </div>

      <AnimatePresence>
        {open && <Detail project={open} onClose={() => setOpen(null)} />}
      </AnimatePresence>

      <MobileBar
        {...props}
        hideAt="@3xl:hidden"
        bar="border-t border-pg-line bg-pg/95 backdrop-blur"
        primary="rounded-full bg-pg-ink text-[0.875rem] font-semibold text-pg"
        secondary="rounded-full border border-pg-ink/25 text-[0.875rem] font-semibold"
        menu="rounded-2xl"
      />
    </div>
  );
}
