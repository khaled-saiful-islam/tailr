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

/** Broadsheet: the front page of a quality paper. For business, consulting and product people. */
export const broadsheet: PortfolioKit = {
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
