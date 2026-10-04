import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { host } from "../../format";
import { DrawLine, Entrance, MaskRise, Reveal, Rise } from "../../motion";
import type { KitProps } from "../../portfolio/PortfolioSite";
import { PortfolioLink } from "../../portfolio/route";
import type { PageProject } from "../../types";
import { Kicker, outline, textLink, ui } from "./shared";

interface Part {
  id: string;
  title: string;
  body: ReactNode;
}

function scrollTo(id: string): void {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** A project told as a magazine feature: standfirst, byline, story, pictures. */
export function Project({
  project,
  next,
}: KitProps & { project: PageProject; next: PageProject | null }) {
  const study = project.case;
  const approach = study?.approach ?? [];
  const tools = study?.tools ?? [];
  const gallery = study?.gallery ?? [];
  const standfirst = study?.overview ?? project.summary;
  const byline = [
    study?.role ?? project.role,
    study?.timeline,
    study?.team,
  ].filter((item): item is string => Boolean(item));

  const parts: Part[] = [];
  if (study?.problem) {
    parts.push({
      id: "story-problem",
      title: "The problem",
      body: (
        <p className="first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:font-pg-display first-letter:text-[4.2rem] first-letter:font-semibold first-letter:leading-[0.78] first-letter:text-pg-accent">
          {study.problem}
        </p>
      ),
    });
  }
  if (approach.length > 0) {
    parts.push({
      id: "story-approach",
      title: "The approach",
      body: (
        <ol className="flex flex-col gap-5">
          {approach.map((step, index) => (
            <li key={step} className="flex gap-4">
              <span className="w-8 shrink-0 font-pg-display text-[2rem] font-semibold leading-none text-pg-accent">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      ),
    });
  }
  if (study?.outcome || project.bullets.length > 0) {
    parts.push({
      id: "story-outcome",
      title: "The outcome",
      body: study?.outcome ? (
        <blockquote className="border-y-[3px] border-pg-ink py-6 font-pg-display text-[clamp(1.5rem,3.2cqi,2.125rem)] font-medium italic leading-[1.3] tracking-[-0.01em]">
          {study.outcome}
        </blockquote>
      ) : (
        <div className="flex flex-col gap-3">
          {project.bullets.map((bullet) => (
            <p key={bullet}>{bullet}</p>
          ))}
        </div>
      ),
    });
  }
  if (study?.lessons) {
    parts.push({
      id: "story-lessons",
      title: "What I learned",
      body: <p>{study.lessons}</p>,
    });
  }
  if (tools.length > 0) {
    parts.push({
      id: "story-tools",
      title: "Built with",
      body: <p className={`${ui} text-[0.9375rem]`}>{tools.join(", ")}.</p>,
    });
  }
  if (gallery.length > 0) {
    parts.push({
      id: "story-pictures",
      title: "Pictures",
      body: (
        <div className="grid gap-6 @3xl:grid-cols-2">
          {gallery.map((image, index) => (
            <figure key={image.url}>
              <img
                src={image.url}
                alt={`${project.name}, picture ${index + 1}`}
                width={image.width}
                height={image.height}
                loading="lazy"
                className="w-full object-cover"
              />
              <figcaption
                className={`${ui} mt-2 text-[0.8125rem] text-pg-ink-3`}
              >
                {project.name}, picture {index + 1}.
              </figcaption>
            </figure>
          ))}
        </div>
      ),
    });
  }

  return (
    <article aria-label={project.name}>
      <Entrance>
        <Rise>
          <PortfolioLink to={{ page: "work" }} className={textLink}>
            <ArrowLeft className="size-4" aria-hidden /> All features
          </PortfolioLink>
        </Rise>
        <div className="mt-8 max-w-[52rem]">
          {(study?.role ?? project.role) && (
            <Rise>
              <Kicker>{study?.role ?? project.role}</Kicker>
            </Rise>
          )}
          <h1
            data-fit
            className="mt-2 font-pg-display text-[clamp(2.6rem,6cqi,4.4rem)] font-semibold leading-[1.02] tracking-[-0.02em]"
          >
            <MaskRise text={project.name} delay={0.05} />
          </h1>
          {standfirst && (
            <Rise>
              <p className="mt-5 font-pg-display text-[1.375rem] italic leading-[1.45] text-pg-ink-2">
                {standfirst}
              </p>
            </Rise>
          )}
        </div>
        {(byline.length > 0 || project.url) && (
          <Rise>
            <div
              className={`${ui} mt-8 flex flex-wrap items-center gap-y-2 border-y border-pg-ink py-3 text-[0.8125rem]`}
            >
              {byline.map((item, index) => (
                <span
                  key={item}
                  className={`px-4 first:pl-0 ${index > 0 ? "border-l border-pg-line" : ""}`}
                >
                  {item}
                </span>
              ))}
              {project.url && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="nofollow ugc noopener noreferrer"
                  className={`${textLink} px-4 first:pl-0 ${byline.length ? "border-l border-pg-line" : ""}`}
                >
                  {host(project.url)}{" "}
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              )}
            </div>
          </Rise>
        )}
        {project.image_url && (
          <Rise>
            <figure className="mt-10">
              <img
                src={project.image_url}
                alt={project.name}
                width={project.image_width ?? undefined}
                height={project.image_height ?? undefined}
                className="w-full object-cover"
              />
              <figcaption
                className={`${ui} mt-2 text-[0.8125rem] text-pg-ink-3`}
              >
                {project.name}.
              </figcaption>
            </figure>
          </Rise>
        )}
      </Entrance>

      {parts.length > 0 && (
        <div className="mt-12 grid gap-10 @5xl:grid-cols-[minmax(0,1fr)_14rem] @5xl:gap-14">
          <div className="min-w-0">
            {parts.map((part) => (
              <Reveal key={part.id}>
                <section
                  id={part.id}
                  aria-labelledby={`${part.id}-title`}
                  className="scroll-mt-24 pb-12"
                >
                  <h2
                    id={`${part.id}-title`}
                    className="font-pg-display text-[1.75rem] font-semibold leading-tight tracking-[-0.01em]"
                  >
                    {part.title}
                  </h2>
                  <DrawLine className="mb-5 mt-2 h-px bg-pg-ink" />
                  <div className="max-w-[44rem] text-[1.125rem] leading-[1.7]">
                    {part.body}
                  </div>
                </section>
              </Reveal>
            ))}
          </div>
          <aside className="hidden @5xl:block">
            <nav
              aria-label="In this story"
              className="sticky top-8 border-t-[3px] border-pg-ink pt-3"
            >
              <p className={`${ui} text-[0.875rem] font-bold`}>In this story</p>
              <ul className="mt-3 flex flex-col">
                {parts.map((part) => (
                  <li key={part.id} className="border-b border-pg-line">
                    <button
                      type="button"
                      onClick={() => scrollTo(part.id)}
                      className="w-full py-2.5 text-left font-pg-display text-[1.0625rem] hover:text-pg-accent"
                    >
                      {part.title}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        </div>
      )}

      {next && (
        <div className="mt-6 border-t-[3px] border-pg-ink pt-6">
          <Kicker>Next feature</Kicker>
          <PortfolioLink
            to={{ page: "project", path: next.path }}
            className="group mt-2 inline-flex items-center gap-3 font-pg-display text-[clamp(1.75rem,4cqi,2.5rem)] font-semibold leading-tight tracking-[-0.01em] hover:text-pg-accent"
          >
            <span data-fit className="min-w-0">
              {next.name}
            </span>
            <ArrowRight
              className="size-6 shrink-0 transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </PortfolioLink>
        </div>
      )}
      <div className="mt-10">
        <PortfolioLink to={{ page: "work" }} className={outline}>
          <ArrowLeft className="size-4" aria-hidden /> All features
        </PortfolioLink>
      </div>
    </article>
  );
}
