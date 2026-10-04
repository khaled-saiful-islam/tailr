import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { host } from "../../format";
import { Entrance, Reveal, Rise } from "../../motion";
import type { KitProps } from "../../portfolio/PortfolioSite";
import { PortfolioLink } from "../../portfolio/route";
import type { PageProject } from "../../types";
import { outline, Tag, Ticks } from "./shared";

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Reveal>
      <section className="grid gap-3 border-t border-dashed border-pg-line py-8 @3xl:grid-cols-[10rem_minmax(0,1fr)] @3xl:gap-8">
        <h2 className="font-pg-mono text-[0.8125rem] text-pg-accent">
          {label}
        </h2>
        <div className="max-w-[44rem] text-[1.0625rem] leading-[1.7]">
          {children}
        </div>
      </section>
    </Reveal>
  );
}

/** A project told as a case study: what, why, how, and what came of it. */
export function Project({
  project,
  next,
}: KitProps & { project: PageProject; next: PageProject | null }) {
  const study = project.case;
  const meta = [
    { label: "role", value: study?.role ?? project.role },
    { label: "timeline", value: study?.timeline },
    { label: "team", value: study?.team },
  ].filter((item): item is { label: string; value: string } =>
    Boolean(item.value),
  );
  return (
    <article aria-label={project.name}>
      <Entrance>
        <Rise>
          <PortfolioLink
            to={{ page: "work" }}
            className="inline-flex items-center gap-1.5 font-pg-mono text-[0.8125rem] text-pg-ink-2 hover:text-pg-accent"
          >
            <ArrowLeft className="size-4" aria-hidden /> all work
          </PortfolioLink>
        </Rise>
        <Rise>
          <h1
            data-fit
            className="mt-6 max-w-[46rem] font-pg-display text-[clamp(2.2rem,5.6cqi,3.8rem)] font-extrabold leading-[1] tracking-[-0.02em] [font-stretch:120%]"
          >
            {project.name}
          </h1>
        </Rise>
        {(study?.overview ?? project.summary) && (
          <Rise>
            <p className="mt-5 max-w-[42rem] text-[1.25rem] leading-relaxed text-pg-ink-2">
              {study?.overview ?? project.summary}
            </p>
          </Rise>
        )}
        {(meta.length > 0 || (study?.tools.length ?? 0) > 0 || project.url) && (
          <Rise>
            <dl className="mt-8 grid gap-4 border-y border-pg-line py-5 font-pg-mono text-[0.8125rem] @2xl:grid-cols-4">
              {meta.map((item) => (
                <div key={item.label}>
                  <dt className="text-pg-ink-3">{item.label}</dt>
                  <dd className="mt-1">{item.value}</dd>
                </div>
              ))}
              {project.url && (
                <div>
                  <dt className="text-pg-ink-3">link</dt>
                  <dd className="mt-1">
                    <a
                      href={project.url}
                      target="_blank"
                      rel="nofollow ugc noopener noreferrer"
                      className="inline-flex items-center gap-1 text-pg-accent hover:underline"
                    >
                      {host(project.url)}{" "}
                      <ArrowUpRight className="size-3.5" aria-hidden />
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </Rise>
        )}
        {project.image_url && (
          <Rise className="relative mt-10">
            <Ticks />
            <img
              src={project.image_url}
              alt={project.name}
              className="w-full border border-pg-line object-cover"
            />
          </Rise>
        )}
      </Entrance>

      <div className="mt-6">
        {study?.problem && (
          <Block label="the problem">
            <p>{study.problem}</p>
          </Block>
        )}
        {study && study.approach.length > 0 && (
          <Block label="the approach">
            <ol className="flex flex-col gap-4">
              {study.approach.map((step, index) => (
                <li key={step} className="flex gap-4">
                  <span className="w-7 shrink-0 font-pg-mono text-[0.875rem] text-pg-accent">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Block>
        )}
        {(study?.outcome || project.bullets.length > 0) && (
          <Block label="the outcome">
            {study?.outcome && <p>{study.outcome}</p>}
            {!study?.outcome && project.bullets.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2">
                {project.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <span className="font-pg-mono text-pg-accent" aria-hidden>
                      +
                    </span>
                    {bullet}
                  </li>
                ))}
              </ul>
            )}
          </Block>
        )}
        {study?.lessons && (
          <Block label="what I learned">
            <p>{study.lessons}</p>
          </Block>
        )}
        {study && study.tools.length > 0 && (
          <Block label="built with">
            <div className="flex flex-wrap gap-1.5">
              {study.tools.map((tool) => (
                <Tag key={tool}>{tool}</Tag>
              ))}
            </div>
          </Block>
        )}
        {study && study.gallery.length > 0 && (
          <Reveal>
            <div className="grid gap-4 border-t border-dashed border-pg-line pt-8 @3xl:grid-cols-2">
              {study.gallery.map((image, index) => (
                <figure key={image.url} className="relative">
                  <img
                    src={image.url}
                    alt=""
                    width={image.width}
                    height={image.height}
                    loading="lazy"
                    className="w-full border border-pg-line object-cover"
                  />
                  <figcaption className="mt-2 font-pg-mono text-[0.75rem] text-pg-ink-3">
                    fig. {index + 1}
                  </figcaption>
                </figure>
              ))}
            </div>
          </Reveal>
        )}
      </div>

      {next && (
        <div className="mt-14 border-t border-pg-line pt-8">
          <p className="font-pg-mono text-[0.75rem] text-pg-ink-3">
            next project
          </p>
          <PortfolioLink
            to={{ page: "project", path: next.path }}
            className="group mt-2 inline-flex items-center gap-3 text-[1.75rem] font-extrabold [font-stretch:115%] hover:text-pg-accent"
          >
            {next.name}
            <ArrowRight
              className="size-6 transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </PortfolioLink>
        </div>
      )}
      <div className="mt-10">
        <PortfolioLink to={{ page: "work" }} className={outline}>
          <ArrowLeft className="size-4" aria-hidden /> All work
        </PortfolioLink>
      </div>
    </article>
  );
}
