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

/** Salon: a gallery wall where the work leads. For designers, architects and creatives. */
export const salon: PortfolioKit = {
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
