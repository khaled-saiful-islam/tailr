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
      path: "one",
      case: null,
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
      path: "two",
      case: null,
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
  cv_url: null,
  updated_at: "2026-10-04T00:00:00Z",
  hero_line: null,
  about: [],
  currently: null,
  interests: [],
  expertise: [],
  awards: [],
  testimonials: [],
  layout: "one_page",
  contact_form: true,
  whatsapp_url: null,
  form_token: null,
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

  it("shows unsaved portfolio words and case studies", () => {
    const draft = draftFrom(saved);
    const next = applyDraft(
      page,
      {
        ...draft,
        settings: {
          ...draft.settings,
          portfolio: {
            hero_line: "I build AI people use.",
            about: ["First.", ""],
            interests: ["Badminton"],
            expertise: [
              { title: "RAG", description: "I build it.", tools: ["Python"] },
            ],
            testimonials: [
              { quote: "Great.", name: "Wei", role: null, relationship: null },
            ],
            awards: [],
            case_studies: {
              p1: {
                overview: "A kit.",
                approach: ["Small first."],
                tools: [],
                gallery: ["img-9"],
              },
            },
            layout: "multi_page",
            contact_form: false,
            whatsapp: "+60 12 345 6789",
          },
        },
      },
      new Map([
        [
          "img-9",
          {
            id: "img-9",
            purpose: "project",
            url: "/x",
            width: 640,
            height: 400,
          },
        ],
      ]),
    );
    expect(next.hero_line).toBe("I build AI people use.");
    expect(next.about).toEqual(["First."]);
    expect(next.layout).toBe("multi_page");
    expect(next.contact_form).toBe(false);
    expect(next.whatsapp_url).toBe("https://wa.me/60123456789");
    expect(next.expertise[0]?.title).toBe("RAG");
    const project = next.projects.find((p) => p.id === "p1");
    expect(project?.case?.overview).toBe("A kit.");
    expect(project?.case?.gallery[0]).toEqual({
      url: "/api/v1/images/img-9.webp",
      width: 640,
      height: 400,
    });
  });
});
