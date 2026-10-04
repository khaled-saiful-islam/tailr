/**
 * Puts a portfolio together from a template's parts.
 *
 * One page: every section on home, the nav scrolls. Several pages: home (hero,
 * achievements, a few projects, a short about), /about, /work, /contact. Every
 * project has its own page either way. Templates decide how each part looks;
 * big type they mark `data-fit` shrinks rather than split a word (see fit.ts).
 */
import { useRef, type ComponentType, type ReactNode } from "react";
import type { PageProject, TemplateProps } from "../types";
import { visible } from "./data";
import { useFitWords } from "./fit";
import { PortfolioLink, PortfolioRouter } from "./route";
import { useRoute } from "./routing";

export type KitProps = TemplateProps;

export interface PortfolioKit {
  /** Background, navigation, footer and the phone action bar around every page. */
  Frame: ComponentType<KitProps & { children: ReactNode }>;
  Hero: ComponentType<KitProps>;
  About: ComponentType<KitProps & { teaser?: boolean }>;
  Expertise: ComponentType<KitProps>;
  Achievements: ComponentType<KitProps>;
  Work: ComponentType<KitProps & { limit?: number }>;
  Timeline: ComponentType<KitProps>;
  Testimonials: ComponentType<KitProps>;
  Contact: ComponentType<KitProps>;
  Project: ComponentType<
    KitProps & { project: PageProject; next: PageProject | null }
  >;
}

function Anchor({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div id={id} className="scroll-mt-20">
      {children}
    </div>
  );
}

function Pages({ kit, props }: { kit: PortfolioKit; props: KitProps }) {
  const { route, onePage } = useRoute();
  const { page } = props;
  const show = {
    about: visible(page, "about"),
    expertise: visible(page, "expertise"),
    achievements: visible(page, "achievements"),
    work: visible(page, "projects"),
    timeline: visible(page, "experience"),
    testimonials: visible(page, "testimonials"),
    contact: visible(page, "contact"),
  };

  if (route.page === "project") {
    const index = page.projects.findIndex((p) => p.path === route.path);
    const project = page.projects[index];
    if (!project) {
      return (
        <div className="py-24 text-center">
          <p className="text-[1.25rem] font-semibold">
            That project isn't here.
          </p>
          <PortfolioLink
            to={{ page: "work" }}
            className="mt-4 inline-block underline"
          >
            See all work
          </PortfolioLink>
        </div>
      );
    }
    const next = page.projects[(index + 1) % page.projects.length] ?? null;
    return (
      <kit.Project
        {...props}
        project={project}
        next={next?.id === project.id ? null : next}
      />
    );
  }
  if (route.page === "about") {
    return (
      <>
        {show.about && <kit.About {...props} />}
        {show.expertise && <kit.Expertise {...props} />}
        {show.timeline && <kit.Timeline {...props} />}
        {show.testimonials && <kit.Testimonials {...props} />}
      </>
    );
  }
  if (route.page === "work") return show.work ? <kit.Work {...props} /> : null;
  if (route.page === "contact") return <kit.Contact {...props} />;

  if (onePage) {
    return (
      <>
        <kit.Hero {...props} />
        {show.about && (
          <Anchor id="about">
            <kit.About {...props} />
          </Anchor>
        )}
        {show.expertise && <kit.Expertise {...props} />}
        {show.achievements && <kit.Achievements {...props} />}
        {show.work && (
          <Anchor id="work">
            <kit.Work {...props} />
          </Anchor>
        )}
        {show.timeline && (
          <Anchor id="experience">
            <kit.Timeline {...props} />
          </Anchor>
        )}
        {show.testimonials && <kit.Testimonials {...props} />}
        {show.contact && (
          <Anchor id="contact">
            <kit.Contact {...props} />
          </Anchor>
        )}
      </>
    );
  }
  return (
    <>
      <kit.Hero {...props} />
      {show.achievements && <kit.Achievements {...props} />}
      {show.work && <kit.Work {...props} limit={3} />}
      {show.about && <kit.About {...props} teaser />}
    </>
  );
}

export function PortfolioSite({
  kit,
  ...props
}: KitProps & { kit: PortfolioKit }) {
  const root = useRef<HTMLDivElement>(null);
  useFitWords(root);
  return (
    <PortfolioRouter page={props.page} preview={Boolean(props.preview)}>
      <div ref={root}>
        <kit.Frame {...props}>
          <Pages kit={kit} props={props} />
        </kit.Frame>
      </div>
    </PortfolioRouter>
  );
}
