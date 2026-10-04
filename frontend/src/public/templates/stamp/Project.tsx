import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { host } from "../../format";
import { Entrance, Reveal, Rise } from "../../motion";
import type { KitProps } from "../../portfolio/PortfolioSite";
import { PortfolioLink } from "../../portfolio/route";
import type { PageProject } from "../../types";
import { Stamped, Sticker, Wrap } from "./shared";
import { box, lift, PAPER, plain, tag } from "./styles";

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Reveal>
      <section className="grid gap-5 border-t-[3px] border-pg-line py-10 @4xl:grid-cols-[15rem_minmax(0,1fr)] @4xl:gap-12">
        <h2 className="font-pg-display text-[1.625rem] font-extrabold uppercase leading-[1] tracking-[-0.03em]">
          {title}
        </h2>
        <div className="max-w-[46rem] text-[1.125rem] leading-[1.7]">
          {children}
        </div>
      </section>
    </Reveal>
  );
}

/** One project as a case study: what was wrong, the decisions, and what happened. */
export function Project({
  project,
  next,
}: KitProps & { project: PageProject; next: PageProject | null }) {
  const study = project.case;
  const overview = study?.overview ?? project.summary;
  const info = [
    { label: "Role", value: study?.role ?? project.role },
    { label: "When", value: study?.timeline },
    { label: "Team", value: study?.team },
  ].filter((item): item is { label: string; value: string } =>
    Boolean(item.value),
  );
  const steps = study?.approach ?? [];
  const tools = study?.tools ?? [];
  const gallery = study?.gallery ?? [];

  return (
    <article aria-label={project.name}>
      <header
        className={`border-b-[3px] border-pg-line py-12 @3xl:py-16 ${PAPER.cream}`}
      >
        <Wrap>
          <Entrance>
            <Rise>
              <PortfolioLink to={{ page: "work" }} className={plain}>
                <ArrowLeft className="size-5" aria-hidden /> All work
              </PortfolioLink>
            </Rise>
            <Rise className="mt-10">
              <Sticker>Case study</Sticker>
            </Rise>
            <h1
              data-fit
              className="mt-6 max-w-[64rem] font-pg-display text-[clamp(2.75rem,8.5cqi,7rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.05em]"
            >
              <Stamped text={project.name} delay={0.1} />
            </h1>
            {overview && (
              <Rise>
                <p className="mt-7 max-w-[46rem] text-[clamp(1.1875rem,2cqi,1.5rem)] font-medium leading-snug">
                  {overview}
                </p>
              </Rise>
            )}
            {(info.length > 0 || project.url) && (
              <Rise>
                <dl className="mt-9 flex flex-wrap gap-4">
                  {info.map((item) => (
                    <div key={item.label} className={`bg-pg px-4 py-3 ${box}`}>
                      <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-pg-accent">
                        {item.label}
                      </dt>
                      <dd className="mt-0.5 font-bold">{item.value}</dd>
                    </div>
                  ))}
                  {project.url && (
                    <div className={`bg-pg-ink px-4 py-3 text-pg ${box}`}>
                      <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] opacity-80">
                        Link
                      </dt>
                      <dd className="mt-0.5">
                        <a
                          href={project.url}
                          target="_blank"
                          rel="nofollow ugc noopener noreferrer"
                          className="inline-flex items-center gap-1 font-bold underline decoration-2 underline-offset-4"
                        >
                          {host(project.url)}
                          <ArrowUpRight className="size-4" aria-hidden />
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </Rise>
            )}
          </Entrance>
        </Wrap>
      </header>

      <Wrap className="py-12 @3xl:py-16">
        {project.image_url && (
          <Reveal className="mb-12">
            <img
              src={project.image_url}
              alt={project.name}
              className={`w-full object-cover ${box} shadow-[12px_12px_0_var(--stamp-shadow)]`}
            />
          </Reveal>
        )}

        {study?.problem && (
          <Part title="The problem">
            <p>{study.problem}</p>
          </Part>
        )}
        {steps.length > 0 && (
          <Part title="How I did it">
            <ol className="flex flex-col gap-5">
              {steps.map((step, index) => (
                <li key={step} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center bg-pg-ink font-pg-display text-[1.0625rem] font-extrabold text-pg shadow-[3px_3px_0_var(--pg-accent)]">
                    {index + 1}
                  </span>
                  <span className="pt-1.5">{step}</span>
                </li>
              ))}
            </ol>
          </Part>
        )}
        {(study?.outcome || project.bullets.length > 0) && (
          <Part title="What happened">
            {study?.outcome ? (
              <p
                className={`bg-pg-accent p-6 text-[clamp(1.1875rem,2cqi,1.4375rem)] font-bold leading-snug text-pg-accent-ink ${box}`}
              >
                {study.outcome}
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {project.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-2.5 size-2.5 shrink-0 bg-pg-accent"
                    />
                    {bullet}
                  </li>
                ))}
              </ul>
            )}
          </Part>
        )}
        {study?.lessons && (
          <Part title="What I learned">
            <p>{study.lessons}</p>
          </Part>
        )}
        {tools.length > 0 && (
          <Part title="Tools">
            <ul className="flex flex-wrap gap-2">
              {tools.map((tool) => (
                <li key={tool} className={tag}>
                  {tool}
                </li>
              ))}
            </ul>
          </Part>
        )}

        {gallery.length > 0 && (
          <div className="mt-6 grid gap-8 border-t-[3px] border-pg-line pt-12 @3xl:grid-cols-2">
            {gallery.map((image, index) => (
              <Reveal key={image.url} delay={(index % 2) * 0.07}>
                <img
                  src={image.url}
                  alt={`${project.name}, picture ${index + 1}`}
                  width={image.width}
                  height={image.height}
                  loading="lazy"
                  className={`w-full object-cover ${box}`}
                />
              </Reveal>
            ))}
          </div>
        )}

        {next && (
          <Reveal className="mt-16">
            <PortfolioLink
              to={{ page: "project", path: next.path }}
              className={`group flex flex-wrap items-center justify-between gap-6 bg-(--stamp-cream) p-6 @3xl:p-8 ${box} ${lift}`}
            >
              <span className="min-w-0">
                <span className="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-pg-accent">
                  Next project
                </span>
                <span
                  data-fit
                  className="mt-2 block font-pg-display text-[clamp(1.75rem,4.5cqi,3.25rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.04em]"
                >
                  {next.name}
                </span>
              </span>
              <span className="grid size-14 shrink-0 place-items-center border-[3px] border-pg-line bg-pg-accent text-pg-accent-ink shadow-[4px_4px_0_var(--stamp-shadow)] transition-transform group-hover:translate-x-1">
                <ArrowRight className="size-6" aria-hidden />
              </span>
            </PortfolioLink>
          </Reveal>
        )}
      </Wrap>
    </article>
  );
}
