/** The editor's working copy of the page settings, and how it changes the preview. */
import type {
  ImageOut,
  PageSettings,
  PageSettingsOut,
  PublicPageData,
} from "./api";
import { EMPTY_PORTFOLIO, imageUrl, type PortfolioContent } from "./api";

export interface PageDraft {
  slug: string;
  visibility: PageSettingsOut["visibility"];
  template: PageSettingsOut["template"];
  appearance: PageSettingsOut["appearance"];
  settings: PageSettings;
}

export function draftFrom(saved: PageSettingsOut): PageDraft {
  return {
    slug: saved.slug,
    visibility: saved.visibility,
    template: saved.template,
    appearance: saved.appearance,
    settings: saved.settings,
  };
}

/** The server's preview with unsaved choices applied, so the preview never lags. */
export function applyDraft(
  page: PublicPageData,
  draft: PageDraft,
  images: Map<string, ImageOut>,
): PublicPageData {
  const settings = draft.settings;
  const projectImages = settings.project_images ?? {};
  const projects = page.projects.map((project) => {
    const imageId = projectImages[project.id];
    const known = imageId ? images.get(imageId) : undefined;
    return {
      ...project,
      image_url: imageId ? imageUrl(imageId) : null,
      image_width: known?.width ?? (imageId ? project.image_width : null),
      image_height: known?.height ?? (imageId ? project.image_height : null),
      featured: project.id === settings.featured_project_id,
    };
  });
  const portfolio = { ...EMPTY_PORTFOLIO, ...(settings.portfolio ?? {}) };
  const cases = portfolio.case_studies ?? {};
  const knownGallery = new Map(
    page.projects
      .flatMap((project) => project.case?.gallery ?? [])
      .map((image) => [image.url, image]),
  );
  const withCases = projects.map((project) => {
    const study = cases[project.id];
    if (!study) return { ...project, case: null };
    const gallery = (study.gallery ?? []).map((id) => {
      const url = imageUrl(id) ?? "";
      const known = images.get(id);
      const saved = knownGallery.get(url);
      return {
        url,
        width: known?.width ?? saved?.width ?? 1600,
        height: known?.height ?? saved?.height ?? 1000,
      };
    });
    return {
      ...project,
      case: {
        overview: study.overview ?? null,
        role: study.role ?? null,
        timeline: study.timeline ?? null,
        team: study.team ?? null,
        problem: study.problem ?? null,
        approach: study.approach ?? [],
        outcome: study.outcome ?? null,
        lessons: study.lessons ?? null,
        tools: study.tools ?? [],
        gallery,
      },
    };
  });
  const digits = (portfolio.whatsapp ?? "").replace(/\D/g, "");
  return {
    ...page,
    hero_line: portfolio.hero_line ?? null,
    about: (portfolio.about ?? []).filter((paragraph) => paragraph.trim()),
    currently: portfolio.currently ?? null,
    interests: portfolio.interests ?? [],
    expertise: portfolio.expertise ?? [],
    awards: portfolio.awards ?? [],
    testimonials: portfolio.testimonials ?? [],
    layout: portfolio.layout ?? "one_page",
    contact_form: portfolio.contact_form ?? true,
    whatsapp_url: digits.length >= 8 ? `https://wa.me/${digits}` : null,
    slug: draft.slug,
    url: page.url.replace(/\/(cv|p)\/[^/?#]+$/, `/$1/${draft.slug}`),
    template: draft.template,
    appearance: draft.appearance,
    photo_url: imageUrl(settings.photo_id),
    availability: settings.availability ?? "open",
    availability_note: settings.availability_note ?? null,
    has_contact: Boolean(settings.contact_email),
    highlights: settings.highlights ?? [],
    hidden_sections: settings.hidden_sections ?? [],
    location: settings.show_location === false ? null : page.location,
    projects: [...withCases].sort(
      (a, b) => Number(b.featured) - Number(a.featured),
    ),
  };
}

type Update = (recipe: (draft: PageDraft) => PageDraft) => void;
export type PortfolioUpdate = (
  recipe: (portfolio: PortfolioContent) => PortfolioContent,
) => void;

/** Edit just the portfolio's words inside the page draft. */
export function portfolioUpdater(update: Update): PortfolioUpdate {
  return (recipe) =>
    update((draft) => ({
      ...draft,
      settings: {
        ...draft.settings,
        portfolio: recipe({
          ...EMPTY_PORTFOLIO,
          ...(draft.settings.portfolio ?? {}),
        }),
      },
    }));
}

export function portfolioOf(draft: PageDraft): PortfolioContent {
  return { ...EMPTY_PORTFOLIO, ...(draft.settings.portfolio ?? {}) };
}

const WHATSAPP = /^\+?[0-9 ]{8,20}$/;

/** What gets saved: unfinished entries (an empty quote mid-typing) stay local. */
export function forSaving(draft: PageDraft): PageDraft {
  const portfolio = portfolioOf(draft);
  return {
    ...draft,
    settings: {
      ...draft.settings,
      portfolio: {
        ...portfolio,
        about: (portfolio.about ?? []).filter((paragraph) => paragraph.trim()),
        expertise: (portfolio.expertise ?? []).filter((area) =>
          area.title.trim(),
        ),
        awards: (portfolio.awards ?? []).filter((award) => award.title.trim()),
        testimonials: (portfolio.testimonials ?? []).filter(
          (item) => item.quote.trim() && item.name.trim(),
        ),
        whatsapp:
          portfolio.whatsapp && WHATSAPP.test(portfolio.whatsapp)
            ? portfolio.whatsapp
            : null,
      },
    },
  };
}
