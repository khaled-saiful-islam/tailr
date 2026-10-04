import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { host } from "../../format";
import { Entrance, MaskRise, Reveal, Rise } from "../../motion";
import type { KitProps } from "../../portfolio/PortfolioSite";
import { PortfolioLink } from "../../portfolio/route";
import type { PageProject } from "../../types";
import { Curtain, ghost } from "./shared";

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Reveal>
      <section className="grid gap-4 border-t border-pg-line py-10 @4xl:grid-cols-[14rem_minmax(0,1fr)]">
        <h2 className="font-pg-display text-[1.25rem] font-bold">{label}</h2>
        <div className="max-w-[48rem] text-[1.1875rem] leading-[1.6]">
          {children}
        </div>
      </section>
    </Reveal>
  );
}

/** A project told as a case study, with the work leading. */
export function Project({
  project,
  next,
}: KitProps & { project: PageProject; next: PageProject | null }) {
  const study = project.case;
  const meta = [
    { label: "Role", value: study?.role ?? project.role },
    { label: "Timeline", value: study?.timeline },
    { label: "Team", value: study?.team },
  ].filter((item): item is { label: string; value: string } =>
    Boolean(item.value),
  );
  const overview = study?.overview ?? project.summary;
  const approach = study?.approach ?? [];
  const tools = study?.tools ?? [];
  const gallery = study?.gallery ?? [];

  return (
    <article aria-label={project.name} className="pt-6">
      <Entrance>
        <Rise>
          <PortfolioLink
            to={{ page: "work" }}
            className="inline-flex items-center gap-1.5 text-[0.9375rem] text-pg-ink-2 hover:text-pg-ink"
          >
            <ArrowLeft className="size-4" aria-hidden /> All work
          </PortfolioLink>
        </Rise>
        <h1
          data-fit
          className="mt-8 font-pg-display text-[clamp(2.75rem,9cqi,7.5rem)] font-extrabold leading-[0.9] tracking-[-0.035em]"
        >
          <MaskRise text={project.name} delay={0.05} />
        </h1>
        {overview && (
          <Rise>
            <p className="mt-7 max-w-[44rem] text-[clamp(1.25rem,2.4cqi,1.625rem)] leading-[1.45] text-pg-ink-2">
              {overview}
            </p>
          </Rise>
        )}
        {(meta.length > 0 || project.url) && (
          <Rise>
            <dl className="mt-10 grid gap-x-10 gap-y-4 border-t border-pg-line pt-6 text-[0.9375rem] @2xl:grid-cols-4">
              {meta.map((item) => (
                <div key={item.label}>
                  <dt className="text-pg-ink-3">{item.label}</dt>
                  <dd className="mt-1">{item.value}</dd>
                </div>
              ))}
              {project.url && (
                <div>
                  <dt className="text-pg-ink-3">Link</dt>
                  <dd className="mt-1">
                    <a
                      href={project.url}
                      target="_blank"
                      rel="nofollow ugc noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold hover:text-pg-accent"
                    >
                      {host(project.url)}{" "}
                      <ArrowUpRight className="size-4" aria-hidden />
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </Rise>
        )}
      </Entrance>

      {project.image_url && (
        <div className="mt-12">
          <Curtain
            src={project.image_url}
            alt={project.name}
            width={project.image_width}
            height={project.image_height}
          />
        </div>
      )}

      <div className="mt-12">
        {study?.problem && (
          <Block label="The problem">
            <p>{study.problem}</p>
          </Block>
        )}
        {approach.length > 0 && (
          <Block label="The approach">
            <ol className="flex flex-col gap-5">
              {approach.map((step, index) => (
                <li
                  key={step}
                  className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2"
                >
                  <span className="font-pg-display font-bold text-pg-accent">
                    {index + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Block>
        )}
        {(study?.outcome || project.bullets.length > 0) && (
          <Block label="The outcome">
            {study?.outcome ? (
              <p>{study.outcome}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {project.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
          </Block>
        )}
        {study?.lessons && (
          <Block label="What I learned">
            <p>{study.lessons}</p>
          </Block>
        )}
        {tools.length > 0 && (
          <Block label="Tools">
            <p className="text-pg-ink-2">{tools.join(", ")}</p>
          </Block>
        )}
      </div>

      {gallery.length > 0 && (
        <section aria-label="Gallery" className="border-t border-pg-line pt-10">
          <ul className="columns-1 gap-8 @2xl:columns-2">
            {gallery.map((image, index) => (
              <li key={image.url} className="mb-8 break-inside-avoid">
                <Curtain
                  src={image.url}
                  alt={`${project.name}, picture ${index + 1}`}
                  width={image.width}
                  height={image.height}
                  delay={(index % 2) * 0.1}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {next && (
        <Reveal>
          <PortfolioLink
            to={{ page: "project", path: next.path }}
            className="group mt-10 grid items-end gap-6 border-t border-pg-line pt-10 @3xl:grid-cols-[minmax(0,1fr)_16rem]"
          >
            <span>
              <span className="block text-[0.9375rem] text-pg-ink-3">Next</span>
              <span className="mt-2 inline-flex items-center gap-3 font-pg-display text-[clamp(2rem,6cqi,4.5rem)] font-extrabold leading-[0.95] tracking-[-0.03em] group-hover:text-pg-accent">
                <span data-fit className="min-w-0">
                  {next.name}
                </span>
                <ArrowRight
                  className="size-8 shrink-0 transition-transform group-hover:translate-x-1"
                  aria-hidden
                />
              </span>
            </span>
            {next.image_url && (
              <img
                src={next.image_url}
                alt=""
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              />
            )}
          </PortfolioLink>
        </Reveal>
      )}
      <div className="mt-12">
        <PortfolioLink to={{ page: "work" }} className={ghost}>
          <ArrowLeft className="size-4" aria-hidden /> All work
        </PortfolioLink>
      </div>
    </article>
  );
}
