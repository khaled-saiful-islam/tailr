/** The editor's working copy of the page settings, and how it changes the preview. */
import type {
  ImageOut,
  PageSettings,
  PageSettingsOut,
  PublicPageData,
} from "./api";
import { imageUrl } from "./api";

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
  return {
    ...page,
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
    projects: [...projects].sort(
      (a, b) => Number(b.featured) - Number(a.featured),
    ),
  };
}
