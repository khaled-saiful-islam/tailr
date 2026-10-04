import { describe, expect, it } from "vitest";
import type { PageSettingsOut, PublicPageData } from "../api";
import { applyDraft, draftFrom } from "../draft";

const page: PublicPageData = {
  slug: "aina",
  url: "https://tailr.app/p/aina",
  template: "blueprint",
  appearance: "auto",
  name: "Aina",
  headline: "AI Engineer",
  summary: null,
  location: "Kuala Lumpur, Malaysia",
  photo_url: null,
  availability: "open",
  availability_note: null,
  has_contact: false,
  links: [],
  highlights: [],
  experiences: [],
  projects: [
    {
      id: "p1",
      name: "One",
      role: null,
      url: null,
      summary: null,
      bullets: [],
      image_url: null,
      image_width: null,
      image_height: null,
      featured: false,
    },
    {
      id: "p2",
      name: "Two",
      role: null,
      url: null,
      summary: null,
      bullets: [],
      image_url: null,
      image_width: null,
      image_height: null,
      featured: false,
    },
  ],
  education: [],
  certifications: [],
  skills: [],
  languages: [],
  hidden_sections: [],
  cv_url: "/api/v1/public/profiles/aina/cv.pdf",
  updated_at: "2026-10-04T00:00:00Z",
};

const saved: PageSettingsOut = {
  slug: "aina",
  url: "https://tailr.app/p/aina",
  visibility: "off",
  template: "blueprint",
  appearance: "auto",
  settings: {
    photo_id: null,
    availability: "open",
    availability_note: null,
    contact_email: null,
    highlights: [],
    project_images: {},
    featured_project_id: null,
    hidden_sections: [],
    show_location: true,
  },
  version: 3,
  published_at: null,
  stats: { last_30_days: 0, days: [], sources: {} },
  missing: [],
};

describe("applyDraft", () => {
  it("shows unsaved choices at once", () => {
    const draft = draftFrom(saved);
    const next = applyDraft(
      page,
      {
        ...draft,
        slug: "aina-builds",
        template: "salon",
        appearance: "dark",
        settings: {
          ...draft.settings,
          photo_id: "img-1",
          contact_email: "hi@aina.dev",
          availability: "casual",
          availability_note: "KL or remote",
          project_images: { p2: "img-2" },
          featured_project_id: "p2",
          hidden_sections: ["skills"],
          show_location: false,
        },
      },
      new Map([
        [
          "img-2",
          {
            id: "img-2",
            purpose: "project",
            url: "/x",
            width: 800,
            height: 500,
          },
        ],
      ]),
    );
    expect(next.template).toBe("salon");
    expect(next.appearance).toBe("dark");
    expect(next.url).toBe("https://tailr.app/p/aina-builds");
    expect(next.photo_url).toBe("/api/v1/images/img-1.webp");
    expect(next.has_contact).toBe(true);
    expect(next.availability_note).toBe("KL or remote");
    expect(next.location).toBeNull();
    expect(next.hidden_sections).toEqual(["skills"]);
    expect(next.projects.map((p) => p.id)).toEqual(["p2", "p1"]);
    expect(next.projects[0]).toMatchObject({
      featured: true,
      image_url: "/api/v1/images/img-2.webp",
      image_width: 800,
    });
    expect(page.template).toBe("blueprint"); // never mutates
  });

  it("keeps everything else from the server", () => {
    const next = applyDraft(page, draftFrom(saved), new Map());
    expect(next.location).toBe("Kuala Lumpur, Malaysia");
    expect(next.projects).toEqual(page.projects);
  });
});
