import type { components } from "@/lib/api/schema";

type Schemas = components["schemas"];

export type PublicPage = Schemas["PublicPage"];
export type TemplateKey = PublicPage["template"];
export type Highlight = Schemas["Highlight"];
export type PageProject = Schemas["PageProject"];
export type PageExperience = Schemas["PageExperience"];
export type Section = PublicPage["hidden_sections"][number];
export type Mode = "light" | "dark";

/** How a template is shown: on the real page, or inside the owner's live preview. */
export interface TemplateProps {
  page: PublicPage;
  mode: Mode;
  onToggleMode: () => void;
  /** In the owner's preview, actions that need a published page are inert. */
  preview?: boolean;
}
