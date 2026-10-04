import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { host } from "../../format";
import { Entrance, MaskRise, Reveal, Rise } from "../../motion";
import type { KitProps } from "../../portfolio/PortfolioSite";
import { PortfolioLink } from "../../portfolio/route";
import type { PageProject } from "../../types";
import { card, chip, outline, Pill, solid, Wrap } from "./shared";
import { STICKER_COLOURS } from "./stickers";

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Reveal>
      <section className="grid gap-4 py-8 @3xl:grid-cols-[14rem_minmax(0,1fr)] @3xl:gap-10">
        <h2 className="font-pg-display text-[1.5rem] font-extrabold leading-tight tracking-[-0.02em]">
          {title}
        </h2>
        <div className="max-w-[46rem] text-[1.125rem] leading-[1.7]">
          {children}
        </div>
      </section>
    </Reveal>
  );
}

/** A project as a case study, told plainly: the problem, how, and what happened. */
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
    <article aria-label={project.name} className="py-10 @3xl:py-14">
      <Wrap>
        <Entrance>
          <Rise>
            <PortfolioLink to={{ page: "work" }} className={outline}>
              <ArrowLeft className="size-5" aria-hidden /> All projects
            </PortfolioLink>
          </Rise>
          <h1
            data-fit
            className="mt-8 max-w-[60rem] font-pg-display text-[clamp(2.5rem,8cqi,6rem)] font-extrabold leading-[0.92] tracking-[-0.04em]"
          >
            <MaskRise text={project.name} delay={0.1} />
          </h1>
          {overview && (
            <Rise>
              <p className="mt-6 max-w-[46rem] text-[clamp(1.25rem,2.4cqi,1.625rem)] font-medium leading-snug text-pg-ink-2">
                {overview}
              </p>
            </Rise>
          )}
          {(info.length > 0 || project.url) && (
            <Rise>
              <ul className="mt-7 flex flex-wrap gap-2">
                {info.map((item) => (
                  <li key={item.label}>
                    <Pill>
                      <span className="text-pg-ink-3">{item.label}</span>
                      {item.value}
                    </Pill>
                  </li>
                ))}
                {project.url && (
                  <li>
                    <a
                      href={project.url}
                      target="_blank"
                      rel="nofollow ugc noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-pg-accent-3 px-4 py-2 font-semibold text-white hover:-translate-y-0.5"
                    >
                      {host(project.url)}{" "}
                      <ArrowUpRight className="size-4" aria-hidden />
                    </a>
                  </li>
                )}
              </ul>
            </Rise>
          )}
          {project.image_url && (
            <Rise className="mt-10">
              <img
                src={project.image_url}
                alt={project.name}
                className={`w-full overflow-hidden object-cover ${card}`}
              />
            </Rise>
          )}
        </Entrance>

        <div className="mt-8 divide-y-2 divide-pg-line">
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
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-full font-pg-display text-[1rem] font-bold ${STICKER_COLOURS[index % 3]}`}
                    >
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
                <p className="font-semibold">{study.outcome}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {project.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <span
                        className="mt-2.5 size-2.5 shrink-0 rounded-full bg-pg-accent"
                        aria-hidden
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
                  <li key={tool} className={chip}>
                    {tool}
                  </li>
                ))}
              </ul>
            </Part>
          )}
        </div>

        {gallery.length > 0 && (
          <div className="mt-6 grid gap-5 @3xl:grid-cols-2">
            {gallery.map((image, index) => (
              <Reveal key={image.url} delay={(index % 2) * 0.08}>
                <img
                  src={image.url}
                  alt={`${project.name}, picture ${index + 1}`}
                  width={image.width}
                  height={image.height}
                  loading="lazy"
                  className={`w-full overflow-hidden object-cover ${card}`}
                />
              </Reveal>
            ))}
          </div>
        )}

        {next && (
          <Reveal className="mt-14">
            <p className="text-[0.9375rem] font-bold text-pg-ink-3">
              Next project
            </p>
            <PortfolioLink
              to={{ page: "project", path: next.path }}
              className={`group mt-3 ${solid} min-h-16 px-8 text-[clamp(1.125rem,2.6cqi,1.5rem)]`}
            >
              {next.name}
              <ArrowRight
                className="size-6 transition-transform group-hover:translate-x-1"
                aria-hidden
              />
            </PortfolioLink>
          </Reveal>
        )}
      </Wrap>
    </article>
  );
}
