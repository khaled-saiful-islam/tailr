import type { PortfolioKit } from "../../portfolio/PortfolioSite";
import { Frame } from "./Frame";
import { Project } from "./Project";
import {
  About,
  Achievements,
  Contact,
  Expertise,
  Hero,
  Testimonials,
  Timeline,
  Work,
} from "./sections";

/** Poster: bold and friendly. For graduates, interns and career switchers. */
export const poster: PortfolioKit = {
  Frame,
  Hero,
  About,
  Expertise,
  Achievements,
  Work,
  Timeline,
  Testimonials,
  Contact,
  Project,
};
